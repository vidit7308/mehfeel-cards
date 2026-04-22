import { Card, Suit, Rank, SeatIndex } from './types';
import { v4 as uuidv4 } from 'uuid';

const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal `count` cards to each of the 4 seats from the top of the deck.
 *  Returns { hands, remainingDeck }
 */
export function deal(
  deck: Card[],
  seats: SeatIndex[],
  count: number,
  existingHands: Record<SeatIndex, Card[]>
): { hands: Record<SeatIndex, Card[]>; remainingDeck: Card[] } {
  const hands: Record<SeatIndex, Card[]> = { ...existingHands };
  const remaining = [...deck];

  for (const seat of seats) {
    const drawn = remaining.splice(0, count);
    hands[seat] = [...(hands[seat] ?? []), ...drawn];
  }

  return { hands, remainingDeck: remaining };
}
