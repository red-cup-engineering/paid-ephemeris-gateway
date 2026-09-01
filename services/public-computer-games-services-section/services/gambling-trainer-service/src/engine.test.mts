import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEngine, applyIntent, currentOffer, resolveOutcome, resolveStake, rerollCost,
  computeRuinProbability, gradeStake, gradeRun, STARTING_BALANCE, RUIN_THRESHOLD, REROLL_FEE_FRACTION,
} from './engine.mts';
import { kellyFraction, expectedLogGrowth } from './kelly.mts';

const SEED = 'engine-test-seed';
const CONFIG = 'novice';

test('createEngine is a pure function of (seed, configId)', () => {
  const a = createEngine(SEED, CONFIG);
  const b = createEngine(SEED, CONFIG);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, createEngine('a-different-seed', CONFIG));
  assert.equal(a.balance, STARTING_BALANCE);
  assert.equal(a.offerIndex, 0);
  assert.equal(a.finished, false);
});

test('createEngine defaults configId to novice', () => {
  const defaulted = createEngine(SEED);
  assert.deepEqual(defaulted, createEngine(SEED, 'novice'));
});

// ---- Hand-computed Kelly cases against kelly.mts's exact API (kellyFraction) ----

test('gradeStake hand-computed case: p=0.6, cost=0.5 -> Kelly f* = 0.2', () => {
  let state = createEngine(SEED, CONFIG);
  // Force a known offer onto the table by constructing state directly rather than depending on
  // the seeded sequence's contents — gradeStake only reads state.offers[state.offerIndex].
  state = { ...state, offers: [{ id: 'w1', index: 0, probability: 0.6, cost: 0.5, framing: 'value', label: 'x', pitch: 'x' }] };
  const grade = gradeStake(state, 0.2);
  assert.ok(Math.abs(grade.kellyOptimalFraction - 0.2) < 1e-12, `expected 0.2, got ${grade.kellyOptimalFraction}`);
  assert.ok(Math.abs(grade.deviation - 0) < 1e-12, 'a stake exactly at Kelly must grade zero deviation');
  assert.ok(Math.abs(grade.trueEdge - 0.1) < 1e-12);
});

test('gradeStake hand-computed case: p=0.9, cost=0.2 -> Kelly f* = 0.875, over-staking grades positive deviation', () => {
  let state = createEngine(SEED, CONFIG);
  state = { ...state, offers: [{ id: 'w1', index: 0, probability: 0.9, cost: 0.2, framing: 'value', label: 'x', pitch: 'x' }] };
  const expected = (0.9 - 0.2) / (1 - 0.2); // = 0.875
  const grade = gradeStake(state, 1.0);
  assert.ok(Math.abs(grade.kellyOptimalFraction - expected) < 1e-9);
  assert.ok(grade.deviation > 0, 'staking 1.0 against a 0.875 optimum must grade as over-staked');
});

test('gradeStake hand-computed case: negative-edge trap (p=0.4, cost=0.5) grades Kelly optimum as zero', () => {
  let state = createEngine(SEED, CONFIG);
  state = { ...state, offers: [{ id: 'w1', index: 0, probability: 0.4, cost: 0.5, framing: 'trap', label: 'x', pitch: 'x' }] };
  const grade = gradeStake(state, 0.1);
  assert.equal(grade.kellyOptimalFraction, 0, 'Kelly correctly refuses a negative-edge trap');
  assert.ok(grade.deviation > 0, 'any positive stake against a zero-Kelly trap over-stakes');
  assert.ok(grade.trueEdge < 0);
});

test('gradeStake matches kelly.mts#kellyFraction directly for every offer in a real seeded sequence (no drift)', () => {
  const state = createEngine('grade-parity-seed', 'sharp');
  for (const offer of state.offers) {
    const withOffer = { ...state, offers: [offer], offerIndex: 0 };
    const grade = gradeStake(withOffer, 0.05);
    assert.equal(grade.kellyOptimalFraction, kellyFraction({ probability: offer.probability, cost: offer.cost }));
  }
});

// ---- resolveStake / payout formula, tied to kelly.mts's own multiplier shape ----

test('resolveStake win/lose multipliers match kelly.mts#expectedLogGrowth\'s own formula shape', () => {
  const balance = 1000;
  const fraction = 0.2;
  const cost = 0.5;
  const win = resolveStake(balance, fraction, cost, 'win');
  const lose = resolveStake(balance, fraction, cost, 'lose');
  assert.ok(Math.abs(win - balance * (1 + (fraction * (1 - cost)) / cost)) < 1e-9);
  assert.equal(lose, balance * (1 - fraction));
  // Cross-check against a manual expected-log-growth computation using the same multipliers.
  const p = 0.6;
  const manualGrowth = p * Math.log(win / balance) + (1 - p) * Math.log(lose / balance);
  assert.ok(Math.abs(manualGrowth - expectedLogGrowth({ probability: p, cost, fraction })) < 1e-9);
});

// ---- ruin detection ----

test('computeRuinProbability is zero for a stake that cannot zero the balance if lost', () => {
  const offer = { probability: 0.6, cost: 0.5 };
  assert.equal(computeRuinProbability(1000, offer, 0.05), 0);
});

test('computeRuinProbability equals 1 - probability for a stake that WOULD zero the balance if lost', () => {
  const offer = { probability: 0.6, cost: 0.5 };
  // fraction=1 -> losing zeroes the balance entirely, well under RUIN_THRESHOLD.
  const p = computeRuinProbability(1000, offer, 1);
  assert.ok(Math.abs(p - 0.4) < 1e-9);
});

test('an all-in commit-stake on a loss ruins the run, and the engine marks ruined+finished', () => {
  let state = createEngine(SEED, CONFIG);
  const offer = currentOffer(state)!;
  // Find a seed/run where the very first commit at fraction=1 loses, by trying run generations
  // deterministically until one does (still fully seeded, no Math.random).
  let seedTry = 0;
  let resolved: ReturnType<typeof applyIntent> | undefined;
  while (seedTry < 200) {
    const trial = createEngine(`ruin-seed-${seedTry}`, CONFIG);
    const trialOffer = currentOffer(trial)!;
    const outcome = resolveOutcome(trial, trialOffer);
    if (outcome === 'lose') {
      const adjusted = applyIntent(trial, { kind: 'adjust-stake', fraction: 1 }).state;
      resolved = applyIntent(adjusted, { kind: 'commit-stake' });
      break;
    }
    seedTry++;
  }
  assert.ok(resolved, 'expected to find a losing first offer within 200 seeded trials');
  assert.equal(resolved!.state.ruined, true);
  assert.equal(resolved!.state.finished, true);
  assert.equal(resolved!.state.balance, 0);
  assert.equal(resolved!.events.some((e) => e.kind === 'ruin'), true);
  void state;
  void offer;
});

test('commit-stake is deterministic: same seed + same intents replay to the identical outcome and balance', () => {
  const s1 = createEngine(SEED, CONFIG);
  const s2 = createEngine(SEED, CONFIG);
  const r1 = applyIntent(applyIntent(s1, { kind: 'adjust-stake', fraction: 0.1 }).state, { kind: 'commit-stake' });
  const r2 = applyIntent(applyIntent(s2, { kind: 'adjust-stake', fraction: 0.1 }).state, { kind: 'commit-stake' });
  assert.deepEqual(r1.state, r2.state);
});

test('a zero pending stake refuses commit-stake as an in-fiction no-op, not an error', () => {
  const state = createEngine(SEED, CONFIG);
  const result = applyIntent(state, { kind: 'commit-stake' });
  assert.equal(result.events[0]?.kind, 'action-refused');
  assert.deepEqual(result.state, state);
});

test('adjust-stake rejects an out-of-range fraction', () => {
  const state = createEngine(SEED, CONFIG);
  assert.throws(() => applyIntent(state, { kind: 'adjust-stake', fraction: 1.5 }));
  assert.throws(() => applyIntent(state, { kind: 'adjust-stake', fraction: -0.1 }));
});

// ---- reroll-offer: priced, named cost ----

test('reroll-offer charges exactly rerollCost(balance) and advances offerIndex without resolving a wager', () => {
  const state = createEngine(SEED, CONFIG);
  const fee = rerollCost(state.balance);
  assert.ok(Math.abs(fee - state.balance * REROLL_FEE_FRACTION) < 1e-9);
  const result = applyIntent(state, { kind: 'reroll-offer' });
  assert.equal(result.state.balance, state.balance - fee);
  assert.equal(result.state.offerIndex, state.offerIndex + 1);
  assert.equal(result.state.resolutions.length, 0, 'reroll must never append a WagerResolution');
  assert.equal(result.events[0]?.kind, 'offer-rerolled');
});

test('no code path accepts a commit-stake past a finished run', () => {
  let state = createEngine(SEED, 'novice');
  // Drain the whole offer sequence via reroll (cheapest deterministic way to reach `finished`).
  while (!state.finished) {
    state = applyIntent(state, { kind: 'reroll-offer' }).state;
  }
  const result = applyIntent(state, { kind: 'commit-stake' });
  assert.equal(result.events[0]?.kind, 'action-refused');
  assert.deepEqual(result.state, state);
});

// ---- new-run ----

test('new-run resets balance/offerIndex/resolutions and produces a fresh, still-deterministic offer sequence', () => {
  const state = createEngine(SEED, CONFIG);
  const played = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 0.1 }).state, { kind: 'commit-stake' }).state;
  const restarted = applyIntent(played, { kind: 'new-run' }).state;
  assert.equal(restarted.balance, STARTING_BALANCE);
  assert.equal(restarted.offerIndex, 0);
  assert.equal(restarted.resolutions.length, 0);
  assert.equal(restarted.ruined, false);
  assert.equal(restarted.finished, false);
  assert.equal(restarted.runNumber, played.runNumber + 1);
  const restartedAgain = applyIntent(played, { kind: 'new-run' }).state;
  assert.deepEqual(restarted, restartedAgain, 'new-run must itself be a pure, deterministic function of the prior state');
});

// ---- per-run grading ----

test('gradeRun on a run with zero commits reports zero wagersCommitted', () => {
  const state = createEngine(SEED, CONFIG);
  const grade = gradeRun(state);
  assert.equal(grade.wagersCommitted, 0);
  assert.equal(grade.meanAbsoluteDeviation, 0);
});

test('gradeRun\'s meanKellyExpectedLogGrowth is always >= meanPlayerExpectedLogGrowth for non-Kelly play (Kelly is the growth-optimal fraction, per kelly.mts)', () => {
  let state = createEngine('grade-run-seed', 'sharp');
  // Stake a deliberately-wrong fixed fraction (0.5) against every offer, not the Kelly optimum.
  while (!state.finished) {
    const offer = currentOffer(state);
    if (offer === undefined) break;
    state = applyIntent(state, { kind: 'adjust-stake', fraction: 0.5 }).state;
    state = applyIntent(state, { kind: 'commit-stake' }).state;
  }
  const grade = gradeRun(state);
  assert.ok(grade.wagersCommitted > 0);
  assert.ok(
    grade.meanKellyExpectedLogGrowth >= grade.meanPlayerExpectedLogGrowth - 1e-9,
    `Kelly growth (${grade.meanKellyExpectedLogGrowth}) should dominate a fixed-0.5 policy's growth (${grade.meanPlayerExpectedLogGrowth})`,
  );
});

test('RUIN_THRESHOLD and REROLL_FEE_FRACTION are sane, documented constants', () => {
  assert.equal(RUIN_THRESHOLD, 1);
  assert.equal(REROLL_FEE_FRACTION, 0.02);
});
