import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed } from './daily.mts';

test('dailySeed is deterministic for the same date and namespaced under "parlor:chutes"', () => {
  const a = dailySeed('2026-08-19', 'human,bot');
  const b = dailySeed('2026-08-19', 'human,bot');
  assert.equal(a, b);
  assert.ok(a.includes('chutes'), `seed should be namespaced under the chutes game id, got "${a}"`);
});

test('different calendar days produce different seeds', () => {
  const a = dailySeed('2026-08-19');
  const b = dailySeed('2026-08-20');
  assert.notEqual(a, b);
});

test('a Date and its equivalent YYYY-MM-DD string produce the same seed', () => {
  const a = dailySeed(new Date('2026-08-19T00:00:00.000Z'));
  const b = dailySeed('2026-08-19');
  assert.equal(a, b);
});
