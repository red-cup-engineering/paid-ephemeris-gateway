/**
 * `seed` — deterministic, reproducible randomness for onestone's boards and levels.
 *
 * onestone's whole determinism doctrine (see DESIGN.md) rests on one promise: every board
 * and level is a *pure function of a seed string*. The server replays a player's moves
 * through the same pure engine the tests use, and the client never generates or perturbs
 * board state — it only requests moves. That is both a fairness property (no two players
 * get a luckier board from the same level seed) and an anti-cheat property (a tampering
 * client cannot reroll spawns or blocker layouts in its favor, because the server can always
 * recompute the "true" board from the seed and compare). This module is the pure function
 * surface that promise is built on: a string-hash into a 32-bit state, then a small fast
 * PRNG (mulberry32) over it, plus the handful of derived helpers (`int`, `range`, `pick`,
 * `chance`, `shuffle`) every board-fill, blocker-placement, and level-builder call needs.
 *
 * Nothing here touches the clock or global state, so a board spawned on the server and a
 * board previewed in a test are bit-identical given the same seed string.
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
  /**
   * A new array containing the same elements in a deterministic Fisher-Yates shuffle order,
   * consuming from this stream. The input array is never mutated (levels.mts and engine.mts
   * both rely on being able to shuffle a `readonly` array they still hold a reference to).
   */
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
    // Fisher-Yates, walking from the end so each swap partner is drawn from the shrinking
    // untouched prefix [0, i] — the standard unbiased-permutation form.
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
