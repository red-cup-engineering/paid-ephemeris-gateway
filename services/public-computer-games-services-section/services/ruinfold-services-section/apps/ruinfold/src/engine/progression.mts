// progression — leveling as a pure function of accumulated xp, ported verbatim from legacy
// engine/progression.mjs. Per the daily design (§3.2) xp/level is scoped to the RUN, not a
// persistent account: every run starts at xp 0, and the curve climbed during one attempt is
// discarded (except as a scoring input) when the run ends. The curve itself is untouched.

// Total xp needed to REACH level L is 5*(L-1)*L: L1=0, L2=10, L3=30, L4=60, L5=100, L6=150, ...
export function thresholdFor(level: number): number {
  return 5 * (level - 1) * level;
}

// levelForXp — inverse of thresholdFor: the highest level whose threshold is still <= xp.
export function levelForXp(xp: number): number {
  let level = 1;
  while (thresholdFor(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelStats {
  maxHealth: number;
  attackPower: number;
}

// statsForLevel — the level-scaled BASE stats. Item bonuses layer on top elsewhere (stats.mts).
export function statsForLevel(level: number): LevelStats {
  return {
    maxHealth: 20 + (level - 1) * 8,
    attackPower: 4 + (level - 1) * 2,
  };
}
