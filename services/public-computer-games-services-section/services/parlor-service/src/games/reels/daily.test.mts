import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed } from './daily.mts';

test('dailySeed is deterministic and namespaced under "reels"', () => {
  const a = dailySeed('2026-08-19');
  const b = dailySeed('2026-08-19');
  assert.equal(a, b);
  assert.ok(a.includes('reels'), `seed should be namespaced under the reels game id, got "${a}"`);
});

test('different calendar days produce different seeds', () => {
  assert.notEqual(dailySeed('2026-08-19'), dailySeed('2026-08-20'));
});
