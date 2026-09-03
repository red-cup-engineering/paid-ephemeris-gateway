/**
 * `srs` — FSRS-lite, DESIGN.md §2. Deterministic: every function that needs "now" takes it as a
 * parameter (an epoch day — an integer day count, caller's choice of epoch). Nothing in this
 * module ever calls `Date.now()`.
 *
 * The forgetting curve is real and cited, not invented for this project: `R(t,S) = (1 +
 * FACTOR*t/S)^DECAY` is FSRS's own published power-law forgetting curve (Su et al. /
 * open-spaced-repetition project), `DECAY=-0.5` and `FACTOR=19/81` are its own published
 * defaults. `FACTOR` is derived from `DECAY` so that `R = 0.9` exactly when `t = S` — a
 * structural identity of the formula (verified in srs.test.mts), not a coincidence.
 *
 * What IS a disclosed simplification: real FSRS fits ~19 weights per user from review history.
 * This module hand-sets one small fixed constant set below ("FSRS-lite") and never claims to
 * be the full optimizer.
 */
import type { Grade } from './types.mts';
import { DECAY, FACTOR, recallProbability, daysUntilRetention, DEFAULT_TARGET_RETENTION, STAGE_CUTS } from '@red-cup-engineering/education-platform-service/srs';
export { DECAY, FACTOR, recallProbability, daysUntilRetention, DEFAULT_TARGET_RETENTION, STAGE_CUTS };
/** = 0.9^(1/DECAY) − 1, FSRS's own published constant, not chosen for this project. */

/** New-card initial stability S0 (days), by grade. DESIGN.md §2 table. */
const S0: Record<Grade, number> = { 1: 0.4, 2: 1.0, 3: 2.5, 4: 4.5 };
/** New-card initial difficulty D0 (1..10, lower = easier), by grade. */
const D0: Record<Grade, number> = { 1: 8, 2: 6.5, 3: 5, 4: 3 };
/** Growth multiplier G for an existing card's successful review, by grade. Grade 1 (Again) uses
 * the separate lapse rule below and has no entry here. */
const GROWTH: Record<2 | 3 | 4, number> = { 2: 0.5, 3: 1.0, 4: 1.6 };

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

function clip(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Probability of correct recall right now: `t` days since last review, `S` current stability
 * (days). `t <= 0` is defined as certain recall (1); `S <= 0` is defined as certain forgetting
 * (0) — both guards for degenerate inputs, not part of the published curve itself.
 */
export interface CardState {
  stability: number;
  difficulty: number;
  lastReviewedAt?: number;
}

/**
 * Apply one FSRS-lite review to a card's state, DESIGN.md §2. `now` is an epoch day supplied by
 * the caller. A card with no `lastReviewedAt` is brand-new — this is also how the gate-pass
 * (§3) seeds a card straight into FSRS-lite: the gate-pass *is* the first SRS review, so it
 * goes through this exact path with the grade the practice pass earned.
 */
export function reviewCard(state: CardState, grade: Grade, now: number): CardState {
  if (state.lastReviewedAt === undefined) {
    return { stability: S0[grade], difficulty: D0[grade], lastReviewedAt: now };
  }

  const t = Math.max(0, now - state.lastReviewedAt);
  const R = recallProbability(t, state.stability);

  let nextStability: number;
  if (grade === 1) {
    // Lapse: fixed 20%-retention-of-prior-stability rule, standing in for FSRS's fuller
    // stability-after-forgetting formula.
    nextStability = Math.max(S0[1], state.stability * 0.2);
  } else {
    const G = GROWTH[grade];
    nextStability = state.stability * (1 + 1.2 * (1 - R) * G);
  }

  const nextDifficulty = clip(state.difficulty - 1.0 * (grade - 3), MIN_DIFFICULTY, MAX_DIFFICULTY);

  return { stability: nextStability, difficulty: nextDifficulty, lastReviewedAt: now };
}
