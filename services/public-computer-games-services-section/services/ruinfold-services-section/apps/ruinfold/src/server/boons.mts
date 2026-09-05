// boons — the week-boon table and top-3 selection (design §5.2). Pure: given a map of actor ->
// weeklyScore (already aggregated by leaderboard.mts's weeklyTotals), returns up to three awards.
// Cosmetic-forward, capped mechanical edge, exactly the design's three named boons — no accumulation
// path, no stacking: each week's awards are computed fresh from that week's totals alone, so an
// actor who doesn't requalify simply doesn't appear next time, with nothing carried over to check.

export interface BoonSpec {
  rank: 1 | 2 | 3;
  name: string;
  edge: Record<string, number>;
}

export const BOON_TABLE: readonly BoonSpec[] = [
  { rank: 1, name: "Ashfall Coronet", edge: { armor: 1 } }, // armor items grant 2-5 — sub-tier
  { rank: 2, name: "Cinderveil Cloak", edge: { maxHealth: 5 } }, // a level grants +8 maxHealth
  { rank: 3, name: "Rootbound Charm", edge: { attackPower: 1 } }, // a level grants +2 attack-power
];

export interface BoonAward {
  actor: string;
  weeklyScore: number;
  rank: 1 | 2 | 3;
  boonName: string;
  edge: Record<string, number>;
}

// computeWeekBoons — top 3 by weeklyScore, descending; a weeklyScore of 0 (never scored a single
// daily that week) never wins a slot — "consistency" (§5.2) presumes at least some real play.
// Deterministic tiebreak by actor id so a fixture with tied totals never produces an ambiguous award.
export function computeWeekBoons(totals: ReadonlyMap<string, number>): BoonAward[] {
  const ranked = [...totals.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  return ranked.slice(0, 3).map(([actor, weeklyScore], i) => {
    const spec = BOON_TABLE[i] as BoonSpec;
    return { actor, weeklyScore, rank: spec.rank, boonName: spec.name, edge: spec.edge };
  });
}
