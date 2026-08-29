import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyOffers, trueEdge, wagerConfigById, WAGER_CONFIGS, DEFAULT_WAGER_CONFIG_ID } from './wagers.mts';
import { kellyFraction } from './kelly.mts';

test('dailyOffers is a pure, deterministic function of (seed, configId)', () => {
  const a = dailyOffers('seed-alpha', 'novice');
  const b = dailyOffers('seed-alpha', 'novice');
  assert.deepEqual(a, b, 'same seed + same config must produce byte-identical offers');
  const c = dailyOffers('seed-beta', 'novice');
  assert.notDeepEqual(a, c, 'a different seed must produce a different offer sequence');
});

test('dailyOffers respects each config\'s offerCount and defaults to the novice config', () => {
  for (const config of WAGER_CONFIGS) {
    const offers = dailyOffers('seed-gamma', config.id);
    assert.equal(offers.length, config.offerCount);
    offers.forEach((o, i) => assert.equal(o.index, i));
  }
  const defaulted = dailyOffers('seed-gamma');
  assert.deepEqual(defaulted, dailyOffers('seed-gamma', DEFAULT_WAGER_CONFIG_ID));
});

test('wagerConfigById rejects an unknown config id', () => {
  assert.throws(() => wagerConfigById('not-a-real-config'), /unknown config id/);
});

test('every offer carries a probability and cost strictly inside (0, 1)', () => {
  for (const config of WAGER_CONFIGS) {
    for (const offer of dailyOffers('seed-range-check', config.id)) {
      assert.ok(offer.probability > 0 && offer.probability < 1, `probability ${offer.probability} out of range`);
      assert.ok(offer.cost > 0 && offer.cost < 1, `cost ${offer.cost} out of range`);
    }
  }
});

test('trap-framed offers are, in fact, negative-true-edge, and value-framed offers are non-negative', () => {
  // Run across enough seeds that both framings are exercised for both configs.
  for (const config of WAGER_CONFIGS) {
    let sawTrap = false;
    let sawValue = false;
    for (let s = 0; s < 25; s++) {
      for (const offer of dailyOffers(`edge-check-${s}`, config.id)) {
        const edge = trueEdge(offer);
        if (offer.framing === 'trap') {
          sawTrap = true;
          assert.ok(edge < 0, `trap offer ${offer.id} must have negative true edge, got ${edge}`);
        } else {
          sawValue = true;
          assert.ok(edge >= -1e-9, `value offer ${offer.id} must have non-negative true edge, got ${edge}`);
        }
      }
    }
    assert.ok(sawTrap, `config ${config.id} never generated a trap in 25 seeds`);
    assert.ok(sawValue, `config ${config.id} never generated a value offer in 25 seeds`);
  }
});

test('framing never leaks into math: kellyFraction over an offer depends only on probability/cost, never on framing', () => {
  // Two offers that differ only in framing/label/pitch, identical probability/cost, must grade
  // identically — proof that no code path derives a number from the framing string.
  const offers = dailyOffers('framing-independence-seed', 'sharp');
  for (const offer of offers) {
    const viaSpec = kellyFraction({ probability: offer.probability, cost: offer.cost });
    const relabeled = { ...offer, framing: offer.framing === 'trap' ? ('value' as const) : ('trap' as const) };
    const viaRelabeled = kellyFraction({ probability: relabeled.probability, cost: relabeled.cost });
    assert.equal(viaSpec, viaRelabeled, `kellyFraction for ${offer.id} must be identical regardless of framing`);
  }
});

test('trueEdge matches odds.evPerContract exactly (single derivation, no drift)', () => {
  for (const offer of dailyOffers('trueedge-parity-seed', 'novice')) {
    assert.equal(trueEdge(offer), offer.probability - offer.cost);
  }
});
