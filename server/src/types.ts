// ─────────────────────────────────────────────
// Shared TypeScript types between server & client
// ─────────────────────────────────────────────

export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;       // e.g. "HEARTS_A"
  suit: Suit;
  rank: Rank;
  value: number;    // 2–14 for comparison
}

// Seats 0–3 clockwise. Teams: 0&2 vs 1&3 (opposite seats)
export type SeatIndex = 0 | 1 | 2 | 3;

export interface Player {
  id: string;        // socket id
  name: string;
  seat: SeatIndex | null; // null if unseated
  connected: boolean;
}

export interface Spectator {
  id: string;
  name: string;
}

export interface MatchSettings {
  matchTimeLimitMs: number;
  bidTimerSec: number;
  turnTimerSec: number;
  logoUrl: string;
}

export type GamePhase =
  | 'LOBBY'
  | 'FIRST_DEAL'
  | 'FIRST_BID'
  | 'SECOND_DEAL'
  | 'LATE_BID'
  | 'GAMEPLAY'
  | 'ROUND_END'
  | 'GAME_OVER';

export interface BidState {
  currentBidderSeat: SeatIndex | null; // null during LATE phase (open floor)
  highestBidderSeat: SeatIndex | null; // tracks current leader in LATE phase
  bidderOrder: SeatIndex[];      // order bids happen (left of shuffler first)
  skipCount: number;
  forcedBid: boolean;
  trumpSuit: Suit | null;
  bidTeam: 0 | 1 | null;        // 0 = team A (seats 0&2), 1 = team B (seats 1&3)
  bidTarget: number;             // 7, 8, 9, 10, 11, 12, or 13
  timerEndAt: number;            // epoch ms
  phase: 'FIRST' | 'LATE';
  passedSeats: SeatIndex[];      // For the late bid war
}

export interface PlayedCard {
  seat: SeatIndex;
  card: Card;
}

export interface TrickState {
  trickNumber: number;           // 1–13
  plays: PlayedCard[];
  ledSuit: Suit | null;
  currentTurnSeat: SeatIndex;
  lastTrickWinner: SeatIndex | null;
  lastTrickCards: PlayedCard[];
  turnTimerEndAt?: number;
}

export interface TeamScores {
  teamA: number;  // seats 0 & 2
  teamB: number;  // seats 1 & 3
}

export interface RoundState {
  roundNumber: number;
  shufflerSeat: SeatIndex;
  trumpSuit: Suit | null;
  bidTeam: 0 | 1 | null;
  bidTarget: number;
  forcedBid: boolean;
  tricksWon: { teamA: number; teamB: number };
}

export interface GameState {
  roomCode: string;
  hostSocketId: string | null;
  settings: MatchSettings;
  phase: GamePhase;
  players: Player[];
  spectators: Spectator[];
  matchStartedAt: number | null;
  hands: Record<SeatIndex, Card[]>;
  bid: BidState | null;
  trick: TrickState | null;
  round: RoundState | null;
  scores: TeamScores;
  winnerTeam: 0 | 1 | null;
  winReason: string | null;
  lastRoundDelta: TeamScores | null;
}

// What the client sees — hands are censored
export interface PublicGameState {
  roomCode: string;
  hostSocketId: string | null;
  settings: MatchSettings;
  phase: GamePhase;
  players: Player[];
  spectators: Spectator[];
  matchStartedAt: number | null;
  myHand: Card[];              // only the requesting player's cards
  handSizes: Record<SeatIndex, number>; // how many cards each player holds
  validCardIds: string[];      // which cards in myHand are playable right now
  bid: BidState | null;
  trick: TrickState | null;
  round: RoundState | null;
  scores: TeamScores;
  winnerTeam: 0 | 1 | null;
  winReason: string | null;
  lastRoundDelta: TeamScores | null;
  mySeat: SeatIndex | null;
}

// ── Socket Event Names ──────────────────────────────────────────────────────
export const EV = {
  // Client → Server
  CREATE_ROOM:     'create_room',
  JOIN_ROOM:       'join_room',
  JOIN_SPECTATOR:  'join_spectator',
  SET_SEAT:        'set_seat',
  SWAP_SEATS:      'swap_seats',
  UPDATE_SETTINGS: 'update_settings',
  PLACE_BID:       'place_bid',
  SKIP_BID:        'skip_bid',
  PLAY_CARD:       'play_card',
  SET_NAME:        'set_name',

  // Server → Client
  ROOM_CREATED:       'room_created',
  ROOM_JOINED:        'room_joined',
  ROOM_ERROR:         'room_error',
  GAME_STATE_UPDATE:  'game_state_update',
  INVALID_ACTION:     'invalid_action',
  TRUMP_BREAK:        'trump_break',       
  TRICK_COMPLETE:     'trick_complete',    
} as const;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  HEARTS:   '♥',
  DIAMONDS: '♦',
  CLUBS:    '♣',
  SPADES:   '♠',
};

export const SUIT_LABELS: Record<Suit, string> = {
  HEARTS:   'Hearts',
  DIAMONDS: 'Diamonds',
  CLUBS:    'Clubs',
  SPADES:   'Spades',
};

export const SUIT_CSS: Record<Suit, string> = {
  HEARTS:   'card-suit-hearts',
  DIAMONDS: 'card-suit-diamonds',
  CLUBS:    'card-suit-clubs',
  SPADES:   'card-suit-spades',
};

/** Team 0 = seats 0 & 2, Team 1 = seats 1 & 3 */
export function seatToTeam(seat: SeatIndex): 0 | 1 {
  return seat % 2 === 0 ? 0 : 1;
}
