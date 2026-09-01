/**
 * `session` -- the exercise session engine: deterministic seeded ordering of a play session,
 * over either an ungated room's gate exercises or a player's globally-due review queue. Neither
 * design doc names this module directly, but both require it by construction: platform §3 states
 * "every function that needs 'now' takes it as a parameter... nothing ever calls `Date.now()`"
 * as a house rule binding "every checker and every scheduler in every theme" (§8 point 4), and
 * the same section demands "deterministic seeded RNG, never bare `Math.random()`" for anything
 * that orders or samples. A session is exactly that: it orders exercises, and ties (equal due-
 * ness) must break the same way every time a session is rebuilt from the same state, not
 * differently per page load -- otherwise two players (or one player replaying a saved seed for a
 * bug report) would legitimately see different sessions from identical inputs.
 *
 * The RNG itself (`mulberry32`) is a small, public-domain, single-multiply generator -- no
 * dependency, seeded by a plain 32-bit integer, exactly the "zero runtime dependencies" and
 * "deterministic seeded RNG" constraints both ask for.
 */
import { recallProbability } from './srs.mts';
import type { GateExercise } from './checker.mts';

/** mulberry32: a fast, small, deterministic 32-bit PRNG. Same seed -> same infinite output
 * sequence, always -- this is the entire determinism contract a session needs. Not
 * cryptographically secure, and never claimed to be; sessions need reproducibility, not secrecy. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle, driven by a seeded generator (never `Math.random()`). Does
 * not mutate `items`. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * A room's gate session: every exercise for that room, deterministically ordered by `seed`. Two
 * calls with the same `roomId`/`exercises`/`seed` always produce the same order -- this is what
 * lets a session be replayed exactly (a bug report, a "retry this exact gate" feature, or a test)
 * without depending on wall-clock or engine-internal iteration order.
 */
export function buildGateSession(roomId: string, exercises: readonly GateExercise[], seed: number): GateExercise[] {
  const forRoom = exercises.filter((e) => e.roomId === roomId);
  return seededShuffle(forRoom, seed);
}

export interface ReviewCandidate {
  exercise: GateExercise;
  stability: number;
  lastReviewedAt?: number;
}

export interface ScoredReviewCandidate extends ReviewCandidate {
  /** Recall probability at `now`. Un-reviewed exercises never appear here -- a review session is
   * by definition over exercises that have been gated at least once; freshly-gated exercises
   * enter the review queue only after their gate-pass seeds them into SRS. */
  R: number;
}

/**
 * The due-review queue at `now`: every candidate with `lastReviewedAt !== undefined`, sorted
 * weakest-recall-first (the FSRS convention -- the exercise most at risk of being forgotten is
 * reviewed first), with ties broken by a seeded shuffle so the order is reproducible rather than
 * an accident of array position. `limit`, if given, caps the session length (still deterministic:
 * the same seed always keeps the same prefix).
 */
export function buildReviewSession(
  candidates: readonly ReviewCandidate[],
  now: number,
  seed: number,
  limit?: number,
): ScoredReviewCandidate[] {
  const due: ScoredReviewCandidate[] = [];
  for (const c of candidates) {
    if (c.lastReviewedAt === undefined) continue;
    const t = Math.max(0, now - c.lastReviewedAt);
    due.push({ ...c, R: recallProbability(t, c.stability) });
  }
  // Seeded shuffle first (breaks ties reproducibly), THEN a stable sort by R -- so exercises with
  // equal R keep the shuffle's order rather than falling back to array/insertion order.
  const shuffled = seededShuffle(due, seed);
  const sorted = shuffled
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.R - b.c.R || a.i - b.i)
    .map(({ c }) => c);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
