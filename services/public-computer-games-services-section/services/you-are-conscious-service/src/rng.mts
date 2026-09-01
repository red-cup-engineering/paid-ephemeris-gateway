/**
 * `rng` — a tiny, deterministic, zero-dependency pseudorandom generator (mulberry32 + a plain
 * FNV-1a string hash for turning an arbitrary seed string into a 32-bit int seed). Used anywhere
 * this game needs a number that LOOKS unpredictable to the player but is actually a pure function
 * of `(seed, index)` — `exploration.mts`'s hidden process yields, `mentorship.mts`'s child-seed
 * derivation. Never used for anything the disclosure discipline (`provenance.mts`) would need to
 * call `computed-from-your-graph`: a seeded random number is disclosed as what it is, an authored
 * (if unpredictable-feeling) generator, never dressed up as graph output.
 *
 * Deliberately NOT `Math.random()` or `node:crypto`: both are non-reproducible (or, for `crypto`,
 * asynchronous in the browser via `crypto.subtle`), and this module needs to run identically under
 * Node and in a browser from the same seed, synchronously, for replay determinism
 * (`@red-cup-engineering/cartridge`'s own contract: `(seed, intentLog) -> stateHash` must be
 * reproducible).
 */

/** 32-bit FNV-1a over a UTF-16 string — a standard, tiny, well-known non-cryptographic hash.
 *  Deterministic across platforms because it only ever does `Number` arithmetic already
 *  representable exactly by every JS engine's `>>> 0` unsigned-32-bit coercion. */
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, public-domain 32-bit PRNG. Returns a function that yields
 *  successive floats in `[0, 1)`, deterministic for a given `seed`. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A single deterministic float in `[0, 1)` from `(seedString, index)` — no shared generator
 *  state, so callers never need to worry about draw ORDER; the same `(seedString, index)` pair
 *  always yields the same value, which is exactly what a seed-fixed hidden process
 *  (`exploration.mts`) needs. */
export function seededFloat(seedString: string, index: number): number {
  const base = fnv1a32(`${seedString}:${String(index)}`);
  const gen = mulberry32(base);
  return gen();
}
