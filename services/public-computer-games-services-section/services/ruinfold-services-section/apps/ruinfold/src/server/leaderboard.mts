// leaderboard — ruinfold's OWN remaining leaderboard logic: weeklyTotals, which exists only to
// feed this app's weekly-boon rollover (rollover.mts) and stays local, out of
// @red-cup-engineering/footing's scope (no other game has a boon mechanic). Ranking itself
// (rankLeaderboard, ScoreLike, RankedEntry) moved to footing/leaderboard verbatim.

import type { ScoreLike } from "@red-cup-engineering/footing/leaderboard";

// weeklyTotals — Σ that actor's scored daily totalScores across the given week's dates (design
// §5.2). A missed day contributes 0 by construction (it's simply absent from byDate). One-scored-
// run-per-actor-per-day (enforced upstream by footing's writeScoredLock) means summing is safe --
// there's never a "which of several same-day runs counts" ambiguity to resolve here.
export function weeklyTotals(
  byDate: ReadonlyMap<string, readonly ScoreLike[]>,
  weekDates: readonly string[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const date of weekDates) {
    for (const e of byDate.get(date) ?? []) {
      totals.set(e.actor, (totals.get(e.actor) ?? 0) + e.score);
    }
  }
  return totals;
}
