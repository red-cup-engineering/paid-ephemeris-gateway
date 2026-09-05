// prng — mulberry32, a tiny seeded PRNG. Zero deps, deterministic: same seed -> same stream,
// forever, on any machine. Per the design doc (ruinfold-daily-design.md §1.2) this is used
// ONLY by the dungeon generator (engine/dungeon.mts) to turn one seed into a whole daily's
// floor count / monster roster / loot table / hazard & relic placement. It must NEVER be
// imported by tick.mts, ai.mts, combat.mts, death.mts, or any other module that advances an
// already-built world — those are pure functions of trace state and the injected clock only.
// The engine as a whole never calls Math.random() or Date.now(): every source of "unknown until
// you look" is either this seeded generator (build-time) or a value carried in the move-log
// (run-time), so a replay is byte-identical to the original run.

export type Rng = () => number; // -> a float in [0, 1)

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// intBetween — a deterministic integer in [min, max], inclusive, drawn from `rng`.
export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// pick — a deterministic uniform choice from a non-empty array, drawn from `rng`.
export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

// shuffled — a deterministic Fisher-Yates shuffle of `items`, drawn from `rng`. Does not mutate
// the input.
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
