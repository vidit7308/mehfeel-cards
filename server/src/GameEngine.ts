import {
  GameState, GamePhase, Player, Spectator, SeatIndex, Card, Suit,
  BidState, TrickState, RoundState, TeamScores, EV, MatchSettings
} from './types';
import { createDeck, shuffle, deal } from './Deck';
import {
  createFirstBidState, createLateBidState,
  advanceSkip, applyBid, seatToTeam
} from './BidManager';
import { isValidPlay, getValidCardIds, resolveTrick, isTrumpBreak } from './TrickManager';
import { scoreRound, resolveShuffler, getWinnerByScore } from './ScoreManager';
import { Server } from 'socket.io';

const SEATS: SeatIndex[] = [0, 1, 2, 3];

export class GameEngine {
  public state: GameState;
  private io: Server;
  private roomCode: string;
  private bidTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private matchTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private turnTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private deck: Card[] = [];

  constructor(io: Server, roomCode: string, hostSocketId: string, matchTimeLimitMs: number) {
    this.io = io;
    this.roomCode = roomCode;
    this.state = {
      roomCode,
      hostSocketId,
      settings: {
        matchTimeLimitMs,
        bidTimerSec: 30,
        turnTimerSec: 30,
        logoUrl: '',
      },
      phase: 'LOBBY',
      players: [],
      spectators: [],
      matchStartedAt: null,
      hands: { 0: [], 1: [], 2: [], 3: [] },
      bid: null,
      trick: null,
      round: null,
      scores: { teamA: 0, teamB: 0 },
      winnerTeam: null,
      winReason: null,
      lastRoundDelta: null,
    };
  }

  // ── Players & Spectators ──────────────────────────────────────────────────

  addPlayer(socketId: string, name: string): { ok: boolean; error?: string } {
    if (this.state.players.length >= 4 && !this.state.players.find(p => p.id === socketId)) {
      return { ok: false, error: 'Room is full of players. Join as spectator.' };
    }
    if (this.state.phase !== 'LOBBY') return { ok: false, error: 'Game already started' };

    // Auto-assign first available seat for convenience, but they can change it
    const occupiedSeats = this.state.players.map(p => p.seat).filter(s => s !== null);
    let seat: SeatIndex | null = null;
    for (let i = 0; i < 4; i++) {
      if (!occupiedSeats.includes(i as SeatIndex)) {
        seat = i as SeatIndex;
        break;
      }
    }

    const player: Player = { id: socketId, name, seat, connected: true };
    this.state.players.push(player);
    return { ok: true };
  }

  addSpectator(socketId: string, name: string): { ok: boolean } {
    this.state.spectators.push({ id: socketId, name });
    return { ok: true };
  }

  setSeat(socketId: string, seat: SeatIndex): { ok: boolean; error?: string } {
    if (this.state.phase !== 'LOBBY') return { ok: false, error: 'Cannot change seats now' };
    
    // Check if seat is taken
    const existing = this.state.players.find(p => p.seat === seat);
    if (existing) return { ok: false, error: 'Seat taken' };

    const player = this.state.players.find(p => p.id === socketId);
    if (!player) return { ok: false, error: 'Player not found' };

    player.seat = seat;
    this.broadcast();
    return { ok: true };
  }

  swapSeats(hostSocketId: string, seatA: SeatIndex, seatB: SeatIndex): { ok: boolean; error?: string } {
    if (this.state.hostSocketId !== hostSocketId) return { ok: false, error: 'Not host' };
    if (this.state.phase !== 'LOBBY') return { ok: false, error: 'Cannot swap seats now' };

    const pA = this.state.players.find(p => p.seat === seatA);
    const pB = this.state.players.find(p => p.seat === seatB);

    if (pA) pA.seat = seatB;
    if (pB) pB.seat = seatA;

    this.broadcast();
    return { ok: true };
  }

  updateSettings(hostSocketId: string, settings: Partial<MatchSettings>): { ok: boolean; error?: string } {
    if (this.state.hostSocketId !== hostSocketId) return { ok: false, error: 'Not host' };
    if (this.state.phase !== 'LOBBY') return { ok: false, error: 'Cannot change settings now' };

    this.state.settings = { ...this.state.settings, ...settings };
    this.broadcast();
    return { ok: true };
  }

  reconnectPlayer(socketId: string, oldSocketId: string): void {
    const p = this.state.players.find((p) => p.id === oldSocketId);
    if (p) {
      p.id = socketId;
      p.connected = true;
      if (this.state.hostSocketId === oldSocketId) this.state.hostSocketId = socketId;
    }
  }

  disconnectPlayer(socketId: string): void {
    const p = this.state.players.find((p) => p.id === socketId);
    if (p) p.connected = false;
  }

  getPlayerBySeat(seat: SeatIndex): Player | undefined {
    return this.state.players.find((p) => p.seat === seat);
  }

  getSeatBySocketId(socketId: string): SeatIndex | null {
    const p = this.state.players.find((p) => p.id === socketId);
    return p ? p.seat : null;
  }

  // ── Game Start ─────────────────────────────────────────────────────────────

  startGame(hostSocketId: string): { ok: boolean; error?: string } {
    if (this.state.hostSocketId !== hostSocketId) return { ok: false, error: 'Only host can start' };
    
    // Ensure 4 players are seated
    const seatedPlayers = this.state.players.filter(p => p.seat !== null);
    if (seatedPlayers.length !== 4) return { ok: false, error: 'Need 4 players in seats' };

    this.state.matchStartedAt = Date.now();
    this.state.round = {
      roundNumber: 1,
      shufflerSeat: 0,
      trumpSuit: null,
      bidTeam: null,
      bidTarget: 8,
      forcedBid: false,
      tricksWon: { teamA: 0, teamB: 0 },
    };

    // Start match timer
    this.matchTimerHandle = setTimeout(() => this.handleMatchEnd(), this.state.settings.matchTimeLimitMs);

    this.doFirstDeal();
    return { ok: true };
  }

  // ── Phase: First Deal ──────────────────────────────────────────────────────

  private doFirstDeal(): void {
    this.state.phase = 'FIRST_DEAL';
    this.deck = shuffle(createDeck());
    this.state.hands = { 0: [], 1: [], 2: [], 3: [] };

    const { hands, remainingDeck } = deal(this.deck, SEATS, 5, this.state.hands);
    this.state.hands = hands;
    this.deck = remainingDeck;

    this.broadcast();
    setTimeout(() => this.doFirstBid(), 1500);
  }

  // ── Phase: First Bid ───────────────────────────────────────────────────────

  private doFirstBid(): void {
    this.state.phase = 'FIRST_BID';
    const shufflerSeat = this.state.round!.shufflerSeat;
    this.state.bid = createFirstBidState(shufflerSeat, this.state.settings.bidTimerSec);
    this.broadcast();
    this.startBidTimer();
  }

  // ── Phase: Second Deal ─────────────────────────────────────────────────────

  private doSecondDeal(): void {
    this.clearBidTimer();
    this.state.phase = 'SECOND_DEAL';
    const { hands, remainingDeck } = deal(this.deck, SEATS, 8, this.state.hands);
    this.state.hands = hands;
    this.deck = remainingDeck;
    this.broadcast();
    setTimeout(() => this.doLateBid(), 1500);
  }

  // ── Phase: Late Bid (War) ──────────────────────────────────────────────────

  private doLateBid(): void {
    this.state.phase = 'LATE_BID';
    this.state.bid = createLateBidState(this.state.bid!, this.state.round!.shufflerSeat, this.state.settings.bidTimerSec);
    this.broadcast();
    this.startBidTimer();
  }

  // ── Phase: Gameplay ────────────────────────────────────────────────────────

  private doStartGameplay(): void {
    this.clearBidTimer();
    this.state.phase = 'GAMEPLAY';

    const bid = this.state.bid!;
    this.state.round!.trumpSuit = bid.trumpSuit;
    this.state.round!.bidTeam = bid.bidTeam;
    this.state.round!.bidTarget = bid.bidTarget;
    this.state.round!.forcedBid = bid.forcedBid;
    this.state.round!.tricksWon = { teamA: 0, teamB: 0 };

    const shufflerSeat = this.state.round!.shufflerSeat;
    const firstLeader = ((shufflerSeat + 1) % 4) as SeatIndex;

    this.state.trick = {
      trickNumber: 1,
      plays: [],
      ledSuit: null,
      currentTurnSeat: firstLeader,
      lastTrickWinner: null,
      lastTrickCards: [],
    };

    this.broadcast();
    this.startTurnTimer();
  }

  // ── Timers ─────────────────────────────────────────────────────────────

  private startBidTimer(): void {
    this.clearBidTimer();
    this.bidTimerHandle = setTimeout(() => {
      this.handleBidTimeout();
    }, this.state.settings.bidTimerSec * 1000 + 500);
  }

  private clearBidTimer(): void {
    if (this.bidTimerHandle) { clearTimeout(this.bidTimerHandle); this.bidTimerHandle = null; }
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    if (this.state.trick) {
      this.state.trick.turnTimerEndAt = Date.now() + this.state.settings.turnTimerSec * 1000;
      this.broadcast();
    }
    this.turnTimerHandle = setTimeout(() => {
      this.handleTurnTimeout();
    }, this.state.settings.turnTimerSec * 1000 + 500);
  }

  private clearTurnTimer(): void {
    if (this.turnTimerHandle) { clearTimeout(this.turnTimerHandle); this.turnTimerHandle = null; }
  }

  private handleMatchEnd(): void {
    if (this.state.phase === 'GAME_OVER') return;
    this.state.winnerTeam = getWinnerByScore(this.state.scores);
    this.state.winReason = 'Match time limit reached!';
    this.state.phase = 'GAME_OVER';
    this.clearAllTimers();
    this.broadcast();
  }

  private clearAllTimers() {
    this.clearBidTimer();
    this.clearTurnTimer();
    if (this.matchTimerHandle) { clearTimeout(this.matchTimerHandle); this.matchTimerHandle = null; }
  }

  // ── Action: Bid ───────────────────────────────────────────────────────────

  private handleBidTimeout(): void {
    if (!this.state.bid) return;
    const bid = this.state.bid;

    if (bid.forcedBid) {
      const { bid: newBid } = applyBid(bid, bid.currentBidderSeat!, 'SPADES', undefined, this.state.settings.bidTimerSec);
      this.state.bid = newBid;
      this.doSecondDeal();
      return;
    }

    const { bid: newBid, biddingComplete } = advanceSkip(bid, this.state.settings.bidTimerSec);
    this.state.bid = newBid;

    if (biddingComplete) {
      if (bid.phase === 'FIRST') {
        this.broadcast();
        this.startBidTimer();
      } else {
        this.doStartGameplay();
      }
      return;
    }

    this.broadcast();
    this.startBidTimer();
  }

  handleBid(socketId: string, suit: Suit, raiseTo?: number): { ok: boolean; error?: string } {
    const phase = this.state.phase;
    if (phase !== 'FIRST_BID' && phase !== 'LATE_BID') return { ok: false, error: 'Not a bid phase' };

    const seat = this.getSeatBySocketId(socketId);
    if (seat === null) return { ok: false, error: 'Not in this game' };

    const bid = this.state.bid!;
    
    if (phase === 'FIRST_BID') {
      if (bid.currentBidderSeat !== seat && !bid.forcedBid) return { ok: false, error: 'Not your turn to bid' };
    } else if (phase === 'LATE_BID') {
      if (bid.passedSeats.includes(seat)) return { ok: false, error: 'You have already passed' };
      if (raiseTo === undefined || raiseTo <= bid.bidTarget || raiseTo > 13) {
        return { ok: false, error: 'Late bid must raise higher than current target (up to 13)' };
      }
    }

    const { bid: newBid, biddingComplete } = applyBid(bid, seat, suit, raiseTo, this.state.settings.bidTimerSec);
    this.state.bid = newBid;
    this.clearBidTimer();

    if (biddingComplete && phase === 'FIRST_BID') {
      this.doSecondDeal();
    } else if (biddingComplete && phase === 'LATE_BID') {
      this.doStartGameplay();
    } else {
      this.broadcast();
      this.startBidTimer();
    }
    return { ok: true };
  }

  handleSkip(socketId: string): { ok: boolean; error?: string } {
    const phase = this.state.phase;
    if (phase !== 'FIRST_BID' && phase !== 'LATE_BID') return { ok: false, error: 'Not a bid phase' };

    const seat = this.getSeatBySocketId(socketId);
    if (seat === null) return { ok: false, error: 'Not in this game' };

    const bid = this.state.bid!;
    
    if (phase === 'FIRST_BID') {
      if (bid.currentBidderSeat !== seat) return { ok: false, error: 'Not your turn to bid' };
      if (bid.forcedBid) return { ok: false, error: 'You must bid a suit (forced)' };
    } else {
      if (bid.passedSeats.includes(seat)) return { ok: false, error: 'You already passed' };
    }

    this.clearBidTimer();
    const { bid: newBid, biddingComplete } = advanceSkip(bid, this.state.settings.bidTimerSec, seat);
    this.state.bid = newBid;

    if (biddingComplete) {
      if (phase === 'FIRST_BID') this.doSecondDeal();
      else this.doStartGameplay();
      return { ok: true };
    }

    this.broadcast();
    this.startBidTimer();
    return { ok: true };
  }

  // ── Action: Play Card ──────────────────────────────────────────────────────

  private handleTurnTimeout() {
    if (this.state.phase !== 'GAMEPLAY') return;
    const trick = this.state.trick!;
    const seat = trick.currentTurnSeat;
    const hand = this.state.hands[seat];
    const trumpSuit = this.state.round!.trumpSuit;
    
    // Get valid cards
    const validIds = getValidCardIds(hand, trick.plays, trick.ledSuit, trumpSuit);
    if (validIds.length > 0) {
      // Auto-play random valid card
      const randomCardId = validIds[Math.floor(Math.random() * validIds.length)];
      const playerSocketId = this.getPlayerBySeat(seat)?.id;
      if (playerSocketId) {
        this.handlePlayCard(playerSocketId, randomCardId);
      }
    }
  }

  handlePlayCard(socketId: string, cardId: string): { ok: boolean; error?: string; trumpBreak?: boolean } {
    if (this.state.phase !== 'GAMEPLAY') return { ok: false, error: 'Not gameplay phase' };

    const seat = this.getSeatBySocketId(socketId);
    if (seat === null) return { ok: false, error: 'Not in this game' };

    const trick = this.state.trick!;
    if (trick.currentTurnSeat !== seat) return { ok: false, error: 'Not your turn' };

    const hand = this.state.hands[seat];
    const card = hand.find((c) => c.id === cardId);
    if (!card) return { ok: false, error: 'Card not in hand' };

    const trumpSuit = this.state.round!.trumpSuit;
    const validIds = getValidCardIds(hand, trick.plays, trick.ledSuit, trumpSuit);
    
    if (!validIds.includes(card.id)) {
      return { ok: false, error: 'Invalid play (must follow rules)' };
    }

    this.clearTurnTimer();

    const trumpBreak = isTrumpBreak(card, trick.ledSuit, trumpSuit);

    // Remove from hand
    this.state.hands[seat] = hand.filter((c) => c.id !== cardId);

    // Set led suit if first play
    if (trick.ledSuit === null) trick.ledSuit = card.suit;

    trick.plays.push({ seat, card });

    if (trick.plays.length < 4) {
      // Advance turn
      trick.currentTurnSeat = ((seat + 1) % 4) as SeatIndex;
      this.startTurnTimer();
      this.broadcast();
    } else {
      // Trick complete
      this.resolveTrick();
    }

    if (trumpBreak) {
      this.io.to(this.roomCode).emit(EV.TRUMP_BREAK, { seat, card });
    }

    return { ok: true, trumpBreak };
  }

  private resolveTrick(): void {
    const trick = this.state.trick!;
    const winner = resolveTrick(trick.plays, trick.ledSuit!, this.state.round!.trumpSuit);
    const winnerTeam = seatToTeam(winner.seat);

    if (winnerTeam === 0) this.state.round!.tricksWon.teamA++;
    else this.state.round!.tricksWon.teamB++;

    this.io.to(this.roomCode).emit(EV.TRICK_COMPLETE, {
      winner: winner.seat,
      plays: trick.plays,
    });

    this.broadcast();

    setTimeout(() => {
      const trickNumber = trick.trickNumber + 1;
      if (trickNumber > 13) {
        this.doRoundEnd();
        return;
      }
      this.state.trick = {
        trickNumber,
        plays: [],
        ledSuit: null,
        currentTurnSeat: winner.seat,
        lastTrickWinner: winner.seat,
        lastTrickCards: trick.plays,
      };
      this.broadcast();
      this.startTurnTimer();
    }, 2000);
  }

  // ── Phase: Round End ───────────────────────────────────────────────────────

  private doRoundEnd(): void {
    this.state.phase = 'ROUND_END';
    const round = this.state.round!;
    const bid = this.state.bid!;

    if (bid.bidTeam === null) {
      this.advanceRound();
      return;
    }

    const result = scoreRound(
      bid.bidTeam,
      bid.bidTarget,
      bid.forcedBid,
      round.tricksWon,
      this.state.scores
    );

    this.state.scores = result.newScores;
    this.state.lastRoundDelta = result.delta;

    if (result.mercyTriggered) {
      const loser = result.mercyLosingTeam!;
      this.state.winnerTeam = loser === 0 ? 1 : 0;
      this.state.winReason = `Team ${loser === 0 ? 'A' : 'B'} hit −52! Mercy rule triggered.`;
      this.state.phase = 'GAME_OVER';
      this.clearAllTimers();
      this.broadcast();
      return;
    }

    this.broadcast();
    setTimeout(() => this.advanceRound(), 4000);
  }

  private advanceRound(): void {
    const round = this.state.round!;
    const shufflerTeam = seatToTeam(round.shufflerSeat);
    const newShuffler = resolveShuffler(round.shufflerSeat, shufflerTeam, this.state.scores);

    this.state.round = {
      roundNumber: round.roundNumber + 1,
      shufflerSeat: newShuffler,
      trumpSuit: null,
      bidTeam: null,
      bidTarget: 8,
      forcedBid: false,
      tricksWon: { teamA: 0, teamB: 0 },
    };
    this.state.bid = null;
    this.state.trick = null;

    this.doFirstDeal();
  }

  // ── State Broadcasting ────────────────────────────────────────────────────

  broadcast(): void {
    // Send to players
    for (const player of this.state.players) {
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        socket.emit(EV.GAME_STATE_UPDATE, this.buildPublicState(player.seat));
      }
    }
    // Send to spectators
    for (const spec of this.state.spectators) {
      const socket = this.io.sockets.sockets.get(spec.id);
      if (socket) {
        socket.emit(EV.GAME_STATE_UPDATE, this.buildPublicState(null));
      }
    }
  }

  buildPublicState(forSeat: SeatIndex | null) {
    const s = this.state;
    const trick = s.trick;
    const trumpSuit = s.round?.trumpSuit ?? null;
    const ledSuit = trick?.ledSuit ?? null;

    const validCardIds =
      s.phase === 'GAMEPLAY' && forSeat !== null && trick?.currentTurnSeat === forSeat
        ? getValidCardIds(s.hands[forSeat], trick.plays, ledSuit, trumpSuit)
        : [];

    const handSizes: Record<SeatIndex, number> = {
      0: s.hands[0].length,
      1: s.hands[1].length,
      2: s.hands[2].length,
      3: s.hands[3].length,
    };

    return {
      roomCode: s.roomCode,
      hostSocketId: s.hostSocketId,
      settings: s.settings,
      phase: s.phase,
      players: s.players,
      spectators: s.spectators,
      matchStartedAt: s.matchStartedAt,
      myHand: forSeat !== null ? s.hands[forSeat] : [],
      handSizes,
      validCardIds,
      bid: s.bid,
      trick: s.trick,
      round: s.round,
      scores: s.scores,
      winnerTeam: s.winnerTeam,
      winReason: s.winReason,
      lastRoundDelta: s.lastRoundDelta,
      mySeat: forSeat,
    };
  }
}
