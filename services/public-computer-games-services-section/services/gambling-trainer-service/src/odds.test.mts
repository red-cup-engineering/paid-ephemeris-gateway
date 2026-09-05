/**
 * Vendor-parity fixture cases, copied from the source library's `'odds arithmetic'` test inline
 * in `gambling-services-section/test/kelly.test.mjs` (the source has no dedicated `odds.test.mjs`
 * of its own — this is the first dedicated odds test either copy has).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overround, fairProbabilities, midpoint, evPerContract, priceToDecimalOdds, decimalOddsToPrice } from './odds.mts';

test('odds arithmetic (source parity)', () => {
  assert.ok(Math.abs(overround([0.55, 0.55]) - 0.1) < 1e-12);
  const fair = fairProbabilities([0.55, 0.55]);
  assert.ok(Math.abs((fair[0] ?? NaN) - 0.5) < 1e-12);
  assert.equal(midpoint({ bid: 0.4, ask: 0.5 }), 0.45);
  assert.ok(Math.abs(evPerContract({ probability: 0.6, cost: 0.5 }) - 0.1) < 1e-12);
  assert.equal(priceToDecimalOdds(0.5), 2);
  assert.equal(decimalOddsToPrice(4), 0.25);
  assert.throws(() => midpoint({ bid: 0.6, ask: 0.5 }));
});

test('overround/fairProbabilities reject fewer than two prices or out-of-range prices', () => {
  assert.throws(() => overround([0.5]));
  assert.throws(() => overround([0.5, 1.1]));
  assert.throws(() => fairProbabilities([0.5, 0]));
});

test('decimal-odds round trip', () => {
  for (const price of [0.1, 0.25, 0.4, 0.5, 0.75, 0.9]) {
    const odds = priceToDecimalOdds(price);
    assert.ok(Math.abs(decimalOddsToPrice(odds) - price) < 1e-12);
  }
  assert.throws(() => priceToDecimalOdds(0));
  assert.throws(() => decimalOddsToPrice(1));
});
