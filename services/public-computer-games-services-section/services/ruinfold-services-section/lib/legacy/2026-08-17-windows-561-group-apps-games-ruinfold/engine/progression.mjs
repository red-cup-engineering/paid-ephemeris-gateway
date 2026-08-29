// progression — leveling as a PURE function of accumulated xp, plus the award mutation.
//
// xp and level are plain numeric FUNCTIONAL predicates (latest-t wins, like health). Nothing in
// the substrate "knows" the leveling curve: the curve lives here as a pure function. An award is
// just `changing` the running xp total (and, on a crossing, the new level and the stats it
// implies). The trace therefore records EACH award as its own row; the settle reads the latest
// total, and levelForXp(thatTotal) recovers the level deterministically. So the level is never
// "stored truth" we could drift from — it is always rederivable from the xp the trace accumulated.
//
// awardXp(root, subject, amount, t, dirty) -> { xp, level, leveledUp }
//   t     : a () => string clock thunk (orders sub-events within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import changing from "#changing";
import { view, numOf } from "#engine/_world.mjs";

// The curve. Total xp needed to REACH level L is 5*(L-1)*L:
//   L1=0, L2=10, L3=30, L4=60, L5=100, L6=150, ...
// (a quadratic, so each level costs a little more than the last).
export function thresholdFor(level) {
  return 5 * (level - 1) * level;
}

// levelForXp — inverse of thresholdFor: the highest level whose threshold is still <= xp.
// Min level is 1 (xp < 10 is always level 1). Small loop: thresholds grow without bound, so
// we climb until the next threshold would exceed the xp we have.
export function levelForXp(xp) {
  let level = 1;
  while (thresholdFor(level + 1) <= xp) level += 1;
  return level;
}

// statsForLevel — the level-scaled BASE stats for a given level. These are the stats an entity
// has from leveling alone; item bonuses (armor, +attack, etc.) are layered on top elsewhere by
// items.mjs and never folded back into these numbers.
export function statsForLevel(level) {
  return {
    maxHealth: 20 + (level - 1) * 8,
    attackPower: 4 + (level - 1) * 2,
  };
}

// awardXp — add `amount` xp to the subject's running total and `changing` the new total. Recompute
// the level from the new total; if it rose, write the new level and the stats that level implies,
// and HEAL to full (a level-up restores max health). All writes attributed to no agent — xp can
// come from many sources, and the award itself is the cause recorded by the row's t.
export async function awardXp(root, subject, amount, t, dirty) {
  const thing = await view(root, subject);
  const oldXp = numOf(thing, "xp", 0);
  const oldLevel = numOf(thing, "level", levelForXp(oldXp));

  const newXp = oldXp + amount;
  await changing({ root, subject, predicate: "xp", object: newXp, t: t() });
  dirty.add(subject);

  const newLevel = levelForXp(newXp);
  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    await changing({ root, subject, predicate: "level", object: newLevel, t: t() });
    // recompute from level + equipped gear (one source of truth in stats.mjs), then heal to full.
    // Dynamic import avoids a static cycle (stats.mjs imports statsForLevel from here).
    const { recomputeStats } = await import("#engine/stats.mjs");
    const { maxHealth } = await recomputeStats(root, subject, t, dirty);
    await changing({ root, subject, predicate: "health", object: maxHealth, t: t() }); // level-up heals to full
    dirty.add(subject);
  }

  return { xp: newXp, level: newLevel, leveledUp };
}
