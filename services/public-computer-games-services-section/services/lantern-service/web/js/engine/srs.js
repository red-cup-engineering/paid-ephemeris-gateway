/**
 * `srs` — browser port of `src/srs.mts` (FSRS-lite, DESIGN.md §2). The `.mts` original cannot
 * be served to a browser as-is (its `import type`/interface syntax is not valid runtime JS,
 * and this face is zero-build, zero-deps static HTML/JS — no bundler strips it), so this file
 * is a deliberate line-for-line transliteration, kept honest by
 * `web/test/parity.test.mts`, which imports both this file and the real engine module and
 * asserts they agree across a grid of inputs. Do not hand-edit the formulas here without
 * re-running that test — see it for the guardrail, and `src/srs.mts` for the full citation
 * and disclosure commentary this file intentionally does not repeat.
 *
 * Deterministic: every function that needs "now" takes it as a parameter (an epoch day).
 * Nothing here calls `Date.now()` — the app's `now()` helper lives in `state.js`.
 */

export const DECAY = -0.5;
/** = 0.9^(1/DECAY) − 1, FSRS's own published constant. */
export const FACTOR = 19 / 81;

const S0 = { 1: 0.4, 2: 1.0, 3: 2.5, 4: 4.5 };
const D0 = { 1: 8, 2: 6.5, 3: 5, 4: 3 };
const GROWTH = { 2: 0.5, 3: 1.0, 4: 1.6 };

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

function clip(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/** Probability of correct recall right now: `t` days since last review, `S` stability (days). */
export function recallProbability(t, S) {
  if (S <= 0) return 0;
  if (t <= 0) return 1;
  return Math.pow(1 + (FACTOR * t) / S, DECAY);
}

/** Inverse of `recallProbability` for `t`, solving for the target retention `targetR`. */
export function daysUntilRetention(S, targetR) {
  if (S <= 0) return 0;
  return S * ((Math.pow(targetR, 1 / DECAY) - 1) / FACTOR);
}

/**
 * Apply one FSRS-lite review to a card's state. `state.lastReviewedAt === undefined` means
 * brand-new — this is also how a gate-pass seeds a card straight into FSRS-lite (DESIGN.md §3:
 * "the gate-pass *is* the first SRS review").
 */
export function reviewCard(state, grade, now) {
  if (state.lastReviewedAt === undefined) {
    return { stability: S0[grade], difficulty: D0[grade], lastReviewedAt: now };
  }

  const t = Math.max(0, now - state.lastReviewedAt);
  const R = recallProbability(t, state.stability);

  let nextStability;
  if (grade === 1) {
    nextStability = Math.max(S0[1], state.stability * 0.2);
  } else {
    const G = GROWTH[grade];
    nextStability = state.stability * (1 + 1.2 * (1 - R) * G);
  }

  const nextDifficulty = clip(state.difficulty - 1.0 * (grade - 3), MIN_DIFFICULTY, MAX_DIFFICULTY);

  return { stability: nextStability, difficulty: nextDifficulty, lastReviewedAt: now };
}

export const DEFAULT_TARGET_RETENTION = 0.9;
export const STAGE_CUTS = { full: 0.9, embers: 0.7, dim: 0.5 };
