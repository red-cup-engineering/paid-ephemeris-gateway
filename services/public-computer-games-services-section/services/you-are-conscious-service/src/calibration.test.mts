/**
 * `calibration.test` — tier 7's pedagogy: a proper scoring rule cannot be gamed by hedging.
 * The test named "always guessing 0.5 converges to exactly 0.25, never better" is the direct proof
 * of DESIGN.md §4's claim.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_IDS, averageBrier, brierScore, submitPrediction, trueOutcome } from "./calibration.mts";
import type { CalibrationState } from "./state.mts";

const SEED = "calibration-test-seed";

function empty(): CalibrationState {
  return { pending: null, brierHistory: [] };
}

test("brierScore(confidence=outcome-as-number) is exactly 0 — a perfect prediction scores perfectly", () => {
  assert.equal(brierScore(1, true), 0);
  assert.equal(brierScore(0, false), 0);
});

test("brierScore rejects confidence outside [0, 1]", () => {
  assert.throws(() => brierScore(1.5, true), RangeError);
  assert.throws(() => brierScore(-0.1, false), RangeError);
});

test("pedagogy (tier 7, proper scoring rule): a confident WRONG guess scores strictly worse than an honest 0.5 hedge", () => {
  const wrongConfident = brierScore(0.95, false); // said "almost certainly yes," was wrong
  const hedge = brierScore(0.5, false);
  assert.ok(wrongConfident > hedge, `confidently wrong (${wrongConfident}) should score worse than hedging (${hedge})`);
});

test("pedagogy (tier 7): always guessing 0.5 converges to exactly 0.25 average Brier score — cannot be gamed by hedging", () => {
  let calibration = empty();
  for (let i = 0; i < 200; i++) {
    const result = submitPrediction(SEED, calibration, AGENT_IDS[0]!, 0.5);
    calibration = result.calibration;
  }
  const avg = averageBrier(calibration)!;
  assert.ok(Math.abs(avg.value - 0.25) < 1e-9, `average Brier score for constant 0.5 guessing must be exactly 0.25, got ${avg.value}`);
});

test("pedagogy (tier 7): predicting the TRUE outcome with full confidence every round beats always hedging at 0.5", () => {
  let calibration = empty();
  const agent = AGENT_IDS[1]!;
  for (let round = 0; round < 100; round++) {
    const outcome = trueOutcome(SEED, agent, round);
    const result = submitPrediction(SEED, calibration, agent, outcome ? 1 : 0);
    calibration = result.calibration;
  }
  const avg = averageBrier(calibration)!;
  assert.ok(avg.value < 0.25, `an oracle who knows the true outcome every round (avg ${avg.value}) must beat the 0.25 hedge baseline`);
  assert.ok(Math.abs(avg.value) < 1e-9, "an oracle's score should in fact be exactly 0");
});

test("each round resolves against a FRESH outcome — round is keyed to brierHistory.length, so the same question is never askable twice", () => {
  let calibration = empty();
  const agent = AGENT_IDS[0]!;
  const seen = new Set<boolean>();
  for (let i = 0; i < 40; i++) {
    const result = submitPrediction(SEED, calibration, agent, 0.5);
    calibration = result.calibration;
    seen.add(result.outcome);
  }
  // Not a strict property (a fair coin could all land the same way), but across 40 independent
  // fresh rounds it would be astronomically unlikely — this is a real sanity check that rounds are
  // actually advancing rather than the function accidentally always resolving round 0.
  assert.equal(seen.size, 2, "40 fresh rounds should include both outcomes at least once");
});

test("averageBrier is null before any prediction has been scored", () => {
  assert.equal(averageBrier(empty()), null);
});
