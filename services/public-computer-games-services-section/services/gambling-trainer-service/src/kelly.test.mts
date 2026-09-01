/**
 * Vendor-parity fixture cases, copied from the source library's own
 * `gambling-services-section/test/kelly.test.mjs`. If this vendored port ever drifts from the
 * source's math, these fail here rather than silently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kellyFraction, kellyForContract, fractionalKelly, expectedLogGrowth, simultaneousStakes } from './kelly.mts';

test('kelly fraction: classic values (source parity)', () => {
  assert.ok(Math.abs(kellyFraction({ probability: 0.6, cost: 0.5 }) - 0.2) < 1e-12);
  assert.equal(kellyFraction({ probability: 0.5, cost: 0.5 }), 0);
  assert.equal(kellyFraction({ probability: 0.4, cost: 0.5 }), 0);
});

test('fees can delete the edge entirely (source parity)', () => {
  assert.ok(kellyForContract({ probability: 0.52, price: 0.5, feePerContract: 0.0175 }) > 0);
  assert.equal(kellyForContract({ probability: 0.51, price: 0.5, feePerContract: 0.0175 }), 0);
});

test('kelly maximizes expected log growth (source parity)', () => {
  const p = 0.6;
  const c = 0.5;
  const f = kellyFraction({ probability: p, cost: c });
  const atKelly = expectedLogGrowth({ probability: p, cost: c, fraction: f });
  for (const df of [-0.05, 0.05]) {
    assert.ok(atKelly > expectedLogGrowth({ probability: p, cost: c, fraction: f + df }));
  }
  assert.ok(atKelly > 0);
});

test('fractional kelly halves the stake and respects the drawdown cap (source parity)', () => {
  assert.ok(Math.abs(fractionalKelly({ probability: 0.6, cost: 0.5, lambda: 0.5 }) - 0.1) < 1e-12);
  assert.equal(fractionalKelly({ probability: 0.9, cost: 0.2, lambda: 1, maxLossFraction: 0.3 }), 0.3);
});

test('simultaneous stakes rescale to the total cap (source parity)', () => {
  const edges = Array.from({ length: 5 }, (_, i) => ({ id: i, probability: 0.6, cost: 0.5 }));
  const stakes = simultaneousStakes(edges, { lambda: 1, maxTotalFraction: 0.25 });
  const total = stakes.reduce((s, e) => s + e.fraction, 0);
  assert.ok(Math.abs(total - 0.25) < 1e-12);
  assert.ok(stakes.every((e) => e.scaled));
});

test('invalid probability/cost/lambda/fraction all throw', () => {
  assert.throws(() => kellyFraction({ probability: 0, cost: 0.5 }));
  assert.throws(() => kellyFraction({ probability: 0.5, cost: 1 }));
  assert.throws(() => fractionalKelly({ probability: 0.6, cost: 0.5, lambda: 0 }));
  assert.throws(() => expectedLogGrowth({ probability: 0.6, cost: 0.5, fraction: 1 }));
});
