/**
 * `seed` — deterministic, reproducible randomness for flickering's procedural cave.
 *
 * The FizzOS relational Lisp's `rand` reaches for `Math.random`, which is fine for a
 * vessel's idle wandering but wrong for a *shared* procedurally generated dungeon: every
 * delver must descend the SAME cave, so floor N's contents have to be a pure function of a
 * global seed and the depth — not of wall-clock entropy. This module is that pure function
 * surface: a string-hash into a 32-bit state, then a small fast PRNG (mulberry32) over it.
 *
 * Nothing here touches the clock or global state, so a floor generated on the server and a
 * floor previewed in a test are bit-identical. That determinism is also a security property
 * (the layout cannot be rerolled by a tampering client) and a fairness property (no two
 * players get a luckier cave).
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

/** A deterministic stream of reals in [0, 1) and the integer/choice helpers built on it. */
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
}

/** A mulberry32 generator seeded by a 32-bit state — tiny, fast, and fully deterministic. */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
  };
}

/** Seed a generator from a base seed string composed with any number of coordinates. */
export function rngAt(base: string, ...coords: (string | number)[]): Rng {
  return rngFrom(hashSeed([base, ...coords.map(String)].join(":")));
}
