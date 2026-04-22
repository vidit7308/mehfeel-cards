// Mirror of server/src/types.ts — kept in sync manually

export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export type SeatIndex = 0 | 1 | 2 | 3;

export interface Player {
  id: string;
  name: string;
  seat: SeatIndex | null;
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
  currentBidderSeat: SeatIndex | null;
  highestBidderSeat: SeatIndex | null;
  bidderOrder: SeatIndex[];
  skipCount: number;
  forcedBid: boolean;
  trumpSuit: Suit | null;
  bidTeam: 0 | 1 | null;
  bidTarget: number;
  timerEndAt: number;
  phase: 'FIRST' | 'LATE';
  passedSeats: SeatIndex[];
}

export interface PlayedCard {
  seat: SeatIndex;
  card: Card;
}

export interface TrickState {
  trickNumber: number;
  plays: PlayedCard[];
  ledSuit: Suit | null;
  currentTurnSeat: SeatIndex;
  lastTrickWinner: SeatIndex | null;
  lastTrickCards: PlayedCard[];
  turnTimerEndAt?: number;
}

export interface TeamScores {
  teamA: number;
  teamB: number;
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

export interface PublicGameState {
  roomCode: string;
  hostSocketId: string | null;
  settings: MatchSettings;
  phase: GamePhase;
  players: Player[];
  spectators: Spectator[];
  matchStartedAt: number | null;
  myHand: Card[];
  handSizes: Record<SeatIndex, number>;
  validCardIds: string[];
  bid: BidState | null;
  trick: TrickState | null;
  round: RoundState | null;
  scores: TeamScores;
  winnerTeam: 0 | 1 | null;
  winReason: string | null;
  lastRoundDelta: TeamScores | null;
  mySeat: SeatIndex | null;
}

export const EV = {
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

export function seatToTeam(seat: SeatIndex): 0 | 1 {
  return seat % 2 === 0 ? 0 : 1;
}
