import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePaths, FLAT_FRACTION, ALL_IN_FRACTION } from './paths.mts';
import { createEngine, applyIntent, currentOffer, resolveOutcome, resolveStake, STARTING_BALANCE } from './engine.mts';
import { kellyFraction, expectedLogGrowth } from './kelly.mts';

const SEED = 'paths-test-seed';

test('computePaths is deterministic: identical BankrollState produces byte-identical paths on repeated calls', () => {
  const state = createEngine(SEED, 'sharp');
  const a = computePaths(state);
  const b = computePaths(state);
  assert.deepEqual(a, b);
});

test('all four paths start at offerIndex 0 with the starting balance', () => {
  const state = createEngine(SEED, 'novice');
  const paths = computePaths(state);
  for (const key of ['yours', 'kelly', 'flat', 'allIn'] as const) {
    const first = paths[key][0]!;
    assert.equal(first.offerIndex, 0);
    assert.equal(first.balance, STARTING_BALANCE);
  }
});

test('yours path re-derives from state.resolutions alone, independent of kelly/flat/allIn', () => {
  let state = createEngine(SEED, 'novice');
  state = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 0.1 }).state, { kind: 'commit-stake' }).state;
  state = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 0.05 }).state, { kind: 'commit-stake' }).state;
  const paths = computePaths(state);
  assert.equal(paths.yours.length, 1 + state.resolutions.length);
  state.resolutions.forEach((r, i) => {
    assert.equal(paths.yours[i + 1]!.balance, r.balanceAfter);
    assert.equal(paths.yours[i + 1]!.offerIndex, r.offerIndex + 1);
  });
});

test('yours path can be shorter than the other three when the player rerolled or the run is unfinished', () => {
  let state = createEngine(SEED, 'sharp');
  state = applyIntent(state, { kind: 'reroll-offer' }).state; // consumes an offer with zero resolution
  const paths = computePaths(state);
  assert.equal(paths.yours.length, 1, 'no commits yet -> only the starting point');
  assert.equal(paths.kelly.length, state.offers.length + 1, 'kelly plays every offer regardless of player rerolls');
  assert.equal(paths.flat.length, state.offers.length + 1);
  assert.equal(paths.allIn.length, state.offers.length + 1);
});

test('the flat path (fraction < 1 always) can never reach exactly zero, by construction', () => {
  for (let i = 0; i < 15; i++) {
    const state = createEngine(`flat-floor-seed-${i}`, 'sharp');
    const paths = computePaths(state);
    for (const point of paths.flat) assert.ok(point.balance > 0, `flat path hit ${point.balance} at offer ${point.offerIndex}`);
  }
  void FLAT_FRACTION;
});

test('the all-in path, once it hits zero on a loss, stays at zero for the rest of the run', () => {
  // Find a seed whose all-in path loses on offer 0 (deterministic search, no Math.random).
  let found = false;
  for (let i = 0; i < 100 && !found; i++) {
    const state = createEngine(`allin-zero-seed-${i}`, 'sharp');
    const paths = computePaths(state);
    if (paths.allIn[1]!.balance === 0) {
      found = true;
      for (let j = 1; j < paths.allIn.length; j++) assert.equal(paths.allIn[j]!.balance, 0);
    }
  }
  assert.ok(found, 'expected at least one seeded trial where all-in loses on the very first offer');
  void ALL_IN_FRACTION;
});

test('kelly path replays engine.mts#resolveOutcome exactly (same outcome the real engine would resolve for that offer)', () => {
  const state = createEngine(SEED, 'novice');
  const paths = computePaths(state);
  // Reconstruct the kelly path by hand using the same public functions paths.mts itself uses,
  // and check for exact agreement — proof there is no separate/duplicated outcome derivation.
  let balance = STARTING_BALANCE;
  const rebuilt = [{ offerIndex: 0, balance }];
  for (const offer of state.offers) {
    const fraction = kellyFraction({ probability: offer.probability, cost: offer.cost });
    if (fraction > 0) {
      const outcome = resolveOutcome(state, offer);
      balance = resolveStake(balance, fraction, offer.cost, outcome);
    }
    rebuilt.push({ offerIndex: offer.index + 1, balance: Math.round(balance * 100) / 100 });
  }
  assert.deepEqual(paths.kelly, rebuilt);
});

test('Kelly correctness (deterministic, not statistical): per-offer expected log growth at the Kelly fraction is >= the flat fraction\'s, for every offer in real seeded sequences across both configs', () => {
  for (const configId of ['novice', 'sharp']) {
    for (let i = 0; i < 10; i++) {
      const state = createEngine(`growth-check-${configId}-${i}`, configId);
      for (const offer of state.offers) {
        const kf = kellyFraction({ probability: offer.probability, cost: offer.cost });
        const kellyGrowth = expectedLogGrowth({ probability: offer.probability, cost: offer.cost, fraction: kf });
        const flatGrowth = expectedLogGrowth({ probability: offer.probability, cost: offer.cost, fraction: FLAT_FRACTION });
        assert.ok(
          kellyGrowth >= flatGrowth - 1e-9,
          `offer ${offer.id} (p=${offer.probability}, cost=${offer.cost}): kelly growth ${kellyGrowth} should be >= flat growth ${flatGrowth}`,
        );
        // all-in (fraction=1) is outside expectedLogGrowth's domain ([0,1)) by construction: its
        // loss branch is ln(0) = -Infinity, i.e. certain eventual ruin against any repeated
        // exposure — kelly's growth (a finite real number, or 0 on a declined trap) always beats
        // that under repeated play, which is the entire point of the comparison this chart makes.
        assert.throws(() => expectedLogGrowth({ probability: offer.probability, cost: offer.cost, fraction: 1 }));
      }
    }
  }
});

void currentOffer;
