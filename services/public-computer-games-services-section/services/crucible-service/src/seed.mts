/**
 * `seed` — deterministic, reproducible randomness for crucible's daily tangles.
 *
 * Copied near-verbatim from onestone-service's and solitaire-service's `seed.mts` (the house
 * PRNG construction — see ANATOMY digest). Crucible's whole determinism promise ("same seed +
 * move log => identical final state and identical total cost, always") rests on this module:
 * every tangle is a pure function of a seed string, and nothing in `tangle.mts` or `engine.mts`
 * touches `Date.now()` or `Math.random()` — the only randomness anywhere in this codebase flows
 * through the `Rng` this file constructs.
 */

/** Fold a string into a 32-bit unsigned seed (FNV-1a) — stable across processes. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic stream of reals in [0, 1) and the integer/choice/shuffle helpers built on it. */
export interface Rng {
  /** Next real in [0, 1). */
  next(): number;
  /** Next integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** A real in [min, max). */
  range(min: number, max: number): number;
  /** Pick one element (returns undefined for an empty list). */
  pick<T>(items: readonly T[]): T | undefined;
  /** True with probability p. */
  chance(p: number): boolean;
  /** A new array containing the same elements in a deterministic Fisher-Yates shuffle order,
   * consuming from this stream. The input array is never mutated. */
  shuffle<T>(items: readonly T[]): T[];
}

/** A mulberry32 generator seeded by a 32-bit state — tiny, fast, and fully deterministic. */
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

/** Build a deterministic RNG stream from a seed string (the only seed shape every caller holds). */
export function makeRng(seed: string): Rng {
  return rngFromState(hashSeed(seed));
}
