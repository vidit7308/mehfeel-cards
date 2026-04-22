import { BidState, SeatIndex, Suit } from './types';

/** Returns the bidding order: starting left of shuffler (clockwise) */
export function buildBidOrder(shufflerSeat: SeatIndex): SeatIndex[] {
  const order: SeatIndex[] = [];
  for (let i = 1; i <= 4; i++) {
    order.push(((shufflerSeat + i) % 4) as SeatIndex);
  }
  return order;
}

/** Determine which team a seat belongs to.
 *  Team A = seats 0 & 2, Team B = seats 1 & 3
 */
export function seatToTeam(seat: SeatIndex): 0 | 1 {
  return seat % 2 === 0 ? 0 : 1;
}

/** Create the initial BidState for Phase 2 (First Bid) */
export function createFirstBidState(shufflerSeat: SeatIndex, bidTimerSec: number): BidState {
  const order = buildBidOrder(shufflerSeat);
  return {
    currentBidderSeat: order[0],
    highestBidderSeat: null,
    bidderOrder: order,
    skipCount: 0,
    forcedBid: false,
    trumpSuit: null,
    bidTeam: null,
    bidTarget: 8,
    timerEndAt: Date.now() + bidTimerSec * 1000,
    phase: 'FIRST',
    passedSeats: [],
  };
}

/** Create the initial BidState for Phase 4 (Late Bid War) */
export function createLateBidState(
  existing: BidState,
  shufflerSeat: SeatIndex,
  bidTimerSec: number
): BidState {
  const order = buildBidOrder(shufflerSeat);
  
  // Figure out who the original highest bidder was from the first phase
  // existing.currentBidderSeat in FIRST phase was whoever won the bid
  // Wait, applyBid set currentBidderSeat to next, but we can deduce it from bidTeam/trumpSuit
  // Actually it doesn't matter too much initially.
  
  return {
    ...existing,
    currentBidderSeat: null, // Open floor
    highestBidderSeat: null, // We'll set this when someone raises
    bidderOrder: order,
    timerEndAt: Date.now() + bidTimerSec * 1000,
    phase: 'LATE',
    passedSeats: [], // Track who passes on the current highest bid
  };
}

/**
 * Advance to the next bidder after a skip or timeout.
 * Returns updated BidState and whether bidding is complete.
 */
export function advanceSkip(
  bid: BidState,
  bidTimerSec: number,
  skippingSeat?: SeatIndex
): { bid: BidState; biddingComplete: boolean; forcedBidRequired: boolean } {
  
  if (bid.phase === 'FIRST') {
    const nextSkipCount = bid.skipCount + 1;
    const currentIdx = bid.bidderOrder.indexOf(bid.currentBidderSeat!);

    // If 4 skips in first bid phase → 1st player is forced
    if (nextSkipCount === 4) {
      const forcedSeat = bid.bidderOrder[0]; // 1st in order
      return {
        bid: {
          ...bid,
          skipCount: nextSkipCount,
          currentBidderSeat: forcedSeat,
          forcedBid: true,
          timerEndAt: Date.now() + bidTimerSec * 1000,
        },
        biddingComplete: false,
        forcedBidRequired: true,
      };
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx >= bid.bidderOrder.length) {
      return { bid, biddingComplete: true, forcedBidRequired: false };
    }

    return {
      bid: {
        ...bid,
        skipCount: nextSkipCount,
        currentBidderSeat: bid.bidderOrder[nextIdx],
        timerEndAt: Date.now() + bidTimerSec * 1000,
      },
      biddingComplete: false,
      forcedBidRequired: false,
    };
  } else {
    // LATE BID (Simultaneous War)
    if (skippingSeat === undefined) {
      // Timeout hit -> the war ends instantly (everyone ran out of time to bid)
      return { bid, biddingComplete: true, forcedBidRequired: false };
    }

    const passed = [...bid.passedSeats];
    if (!passed.includes(skippingSeat)) {
      passed.push(skippingSeat);
    }

    // War ends if the other 3 players passed the current high bid
    // Or if all 4 players passed immediately (highestBidderSeat === null)
    const requiredPasses = bid.highestBidderSeat !== null ? 3 : 4;

    if (passed.length >= requiredPasses) {
      return {
        bid: { ...bid, passedSeats: passed },
        biddingComplete: true,
        forcedBidRequired: false
      };
    }

    return {
      bid: {
        ...bid,
        passedSeats: passed,
      },
      biddingComplete: false,
      forcedBidRequired: false
    };
  }
}

/**
 * Apply a bid (suit selection).
 * Returns updated BidState and whether bidding phase is complete.
 */
export function applyBid(
  bid: BidState,
  seat: SeatIndex,
  suit: Suit,
  raiseTo: number | undefined,
  bidTimerSec: number
): { bid: BidState; biddingComplete: boolean } {
  const team = seatToTeam(seat);

  if (bid.phase === 'FIRST') {
    const target = bid.forcedBid ? 7 : 8;
    return {
      bid: {
        ...bid,
        trumpSuit: suit,
        bidTeam: team,
        bidTarget: target,
        highestBidderSeat: seat,
      },
      biddingComplete: true,
    };
  }

  // Late bid — must raise
  const newTarget = raiseTo ?? (bid.bidTarget + 1);
  
  return {
    bid: {
      ...bid,
      trumpSuit: suit,
      bidTeam: team,
      bidTarget: newTarget,
      passedSeats: [], // Reset passes!
      highestBidderSeat: seat,
      timerEndAt: Date.now() + bidTimerSec * 1000,
    },
    biddingComplete: false, // War continues until 3 passes
  };
}
