import { SeatIndex, TeamScores } from './types';

/**
 * Score the round according to the "Now You See Me" rules:
 * - If bidding team succeeds, opposing team gets negative points = bidTarget.
 * - If bidding team fails, bidding team gets:
 *   - negative points = bidTarget (if bid is 7)
 *   - negative points = 2 * bidTarget (if bid >= 8)
 */
export function scoreRound(
  bidTeam: 0 | 1,
  bidTarget: number,
  forcedBid: boolean,
  tricksWon: { teamA: number; teamB: number },
  currentScores: TeamScores
): {
  newScores: TeamScores;
  delta: TeamScores;
  mercyTriggered: boolean;
  mercyLosingTeam: 0 | 1 | null;
} {
  const wonTricks = bidTeam === 0 ? tricksWon.teamA : tricksWon.teamB;
  const success = wonTricks >= bidTarget;

  const newScores = { ...currentScores };
  const delta = { teamA: 0, teamB: 0 };

  if (success) {
    // Opposing team gets negative points equal to bid
    const penalty = -bidTarget;
    if (bidTeam === 0) {
      newScores.teamB += penalty;
      delta.teamB = penalty;
    } else {
      newScores.teamA += penalty;
      delta.teamA = penalty;
    }
  } else {
    // Bidding team failed
    const penalty = bidTarget >= 8 ? -(bidTarget * 2) : -bidTarget;
    if (bidTeam === 0) {
      newScores.teamA += penalty;
      delta.teamA = penalty;
    } else {
      newScores.teamB += penalty;
      delta.teamB = penalty;
    }
  }

  // Check mercy rule (-52 points)
  let mercyTriggered = false;
  let mercyLosingTeam: 0 | 1 | null = null;

  if (newScores.teamA <= -52) {
    mercyTriggered = true;
    mercyLosingTeam = 0;
  } else if (newScores.teamB <= -52) {
    mercyTriggered = true;
    mercyLosingTeam = 1;
  }

  return { newScores, delta, mercyTriggered, mercyLosingTeam };
}

/**
 * Determines the shuffler for the next round.
 * Passes to the left (clockwise).
 */
export function resolveShuffler(
  currentShuffler: SeatIndex,
  shufflerTeam: 0 | 1,
  currentScores: TeamScores
): SeatIndex {
  // Simple clockwise pass
  return ((currentShuffler + 1) % 4) as SeatIndex;
}

/** Determines who wins the match based on scores */
export function getWinnerByScore(scores: TeamScores): 0 | 1 {
  // In negative point game, higher score is better (closer to 0)
  return scores.teamA > scores.teamB ? 0 : 1;
}
