import type { Card, PlayedCard, Suit } from './types';

/**
 * Find the current winning card of the trick.
 */
function getCurrentWinner(plays: PlayedCard[], ledSuit: Suit | null, trumpSuit: Suit | null): PlayedCard | null {
  if (plays.length === 0 || !ledSuit) return null;
  return resolveTrick(plays, ledSuit, trumpSuit);
}

/** Check if a card play is valid per the "Now You See Me" rules. */
export function isValidPlay(
  card: Card,
  hand: Card[],
  plays: PlayedCard[],
  ledSuit: Suit | null,
  trumpSuit: Suit | null
): boolean {
  // First card of trick — anything goes
  if (ledSuit === null) return true;

  const currentWinner = getCurrentWinner(plays, ledSuit, trumpSuit);
  const currentWinningCard = currentWinner?.card;

  // Determine what cards the player holds
  const cardsOfLedSuit = hand.filter(c => c.suit === ledSuit);
  const hasLedSuit = cardsOfLedSuit.length > 0;

  // Rule 1: Must follow suit if possible
  if (hasLedSuit) {
    if (card.suit !== ledSuit) return false;

    // Rule 1b: Must play a higher card of led suit if possible
    if (currentWinningCard && currentWinningCard.suit === ledSuit) {
      const highestLedValue = currentWinningCard.value;
      const canBeat = cardsOfLedSuit.some(c => c.value > highestLedValue);
      if (canBeat && card.value <= highestLedValue) {
        return false; // Must beat it
      }
    }
    return true; // Valid play
  }

  // Rule 2 & 3: Void in led suit
  if (trumpSuit) {
    const trumpCards = hand.filter(c => c.suit === trumpSuit);
    const hasTrump = trumpCards.length > 0;

    // If player has trump, they MUST play a trump.
    if (hasTrump) {
      if (card.suit !== trumpSuit) return false;

      // Has a trump been played?
      const highestTrumpPlayed = plays
        .filter(p => p.card.suit === trumpSuit)
        .reduce((max, p) => Math.max(max, p.card.value), 0);

      if (highestTrumpPlayed > 0) {
        // Must over-trump if possible
        const canOverTrump = trumpCards.some(c => c.value > highestTrumpPlayed);
        if (canOverTrump && card.value <= highestTrumpPlayed) {
          return false; // Must play a higher trump
        }
      }
      return true; // Valid trump play
    } else {
      // Void in led suit AND void in trump suit. Can play ANY card.
      return true;
    }
  }

  // If no trump suit exists at all, void in led suit can play anything
  return true;
}

/** Get all card IDs from the player's hand that are currently valid to play. */
export function getValidCardIds(
  hand: Card[],
  plays: PlayedCard[],
  ledSuit: Suit | null,
  trumpSuit: Suit | null
): string[] {
  return hand
    .filter((c) => isValidPlay(c, hand, plays, ledSuit, trumpSuit))
    .map((c) => c.id);
}

/**
 * Resolve who wins the trick.
 * Returns the winning PlayedCard.
 */
export function resolveTrick(
  plays: PlayedCard[],
  ledSuit: Suit,
  trumpSuit: Suit | null
): PlayedCard {
  const trumpPlays = trumpSuit
    ? plays.filter((p) => p.card.suit === trumpSuit)
    : [];

  if (trumpPlays.length > 0) {
    // Highest trump wins
    return trumpPlays.reduce((best, p) =>
      p.card.value > best.card.value ? p : best
    );
  }

  // No trump — highest card of led suit wins
  const ledPlays = plays.filter((p) => p.card.suit === ledSuit);
  return ledPlays.reduce((best, p) =>
    p.card.value > best.card.value ? p : best
  );
}

/** Check whether a played card is a trump card breaking a non-trump lead. */
export function isTrumpBreak(card: Card, ledSuit: Suit | null, trumpSuit: Suit | null): boolean {
  if (!trumpSuit || !ledSuit) return false;
  return card.suit === trumpSuit && ledSuit !== trumpSuit;
}
