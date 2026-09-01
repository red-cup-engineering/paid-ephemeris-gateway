// rng — deterministic, reproducible randomness for BNSF's level generator and anomaly/loot
// placement. abrash itself ships no RNG (confirmed by reading its published source directly:
// math.mjs is pure vec2/rotation, nothing else in the package touches randomness) and the house
// determinism discipline forbids Math.random() in any domain module, so this is vendored, not
// invented fresh and not imported cross-service (the house's "vendor a copy, documented as a
// port" rule — see 2026-08-19-note-on-house-specification-standard.md §2).
//
// This is a documented, byte-for-byte port of onestone-service/src/seed.mts's hashSeed/makeRng
// (FNV-1a string hash -> mulberry32 stream), which is itself the house's third independent
// re-derivation of the same pattern (flickering-delve-service, onestone-service, solitaire-
// service's src/cards.mts all hold the identical FNV-1a -> mulberry32 shape, never imported
// cross-service per house doctrine). Only the doc comments differ; every function body below is
// unchanged from onestone-service/src/seed.mts.

/** Fold a string into a 32-bit unsigned seed (FNV-1a) — stable across processes. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic stream of reals in [0, 1) and the handful of derived helpers a level
 *  generator or a placement pass needs. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T | undefined;
  chance(p: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

/** A mulberry32 generator seeded by a 32-bit state — tiny, fast, fully deterministic. */
function rngFromState(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const oi = out[i] as T;
      const oj = out[j] as T;
      out[i] = oj;
      out[j] = oi;
    }
    return out;
  };
  return {
    next,
    int,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
    shuffle,
  };
}

/** Build a deterministic RNG stream from a seed string. The namespacing discipline lives at the
 *  TIER boundary, not below it: level-gen.mts calls this once per depth tier with a
 *  tier-namespaced seed (`${seed}:tier1`, `${seed}:tier2`, `${seed}:tier3`), and *within* one
 *  tier's generation every stage — room layout, corridors, pre-seeded contested walls,
 *  extraction beacons, anomaly placement, loot placement — draws from that SAME single Rng
 *  instance in sequence, never restarted mid-tier. See level-gen.mts's header for why: a fresh
 *  `makeRng` per placement stage would let two stages that happen to draw the same COUNT of
 *  values up to some point silently start echoing each other's numbers past that point (two
 *  namespaced-but-related seeds are not guaranteed independent the way two genuinely different
 *  seeds are) — continuing one stream sidesteps that whole class of correlation, and matches the
 *  design's own instruction that placement is "continued from the same seed stream as the
 *  geometry, not restarted per subsystem". */
export function makeRng(seed: string): Rng {
  return rngFromState(hashSeed(seed));
}
