/**
 * `daily.test` — the daily seed is a pure function of UTC calendar date + variant id, stable
 * regardless of the caller's local timezone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed, utcDateString } from './daily.mts';
import { VARIANT_LIST } from './engine.mts';

test('dailySeed is deterministic for the same (date, variantId)', () => {
  const date = new Date('2026-08-19T12:00:00Z');
  assert.equal(dailySeed(date, 'klondike-draw1'), dailySeed(new Date('2026-08-19T12:00:00Z'), 'klondike-draw1'));
});

test('dailySeed differs across variants for the same date, and across dates for the same variant', () => {
  const d = new Date('2026-08-19T00:00:00Z');
  assert.notEqual(dailySeed(d, 'klondike-draw1'), dailySeed(d, 'freecell'));
  assert.notEqual(
    dailySeed(new Date('2026-08-19T00:00:00Z'), 'klondike-draw1'),
    dailySeed(new Date('2026-08-20T00:00:00Z'), 'klondike-draw1'),
  );
});

test('dailySeed is stable for a given UTC calendar day regardless of the moment within it', () => {
  const early = dailySeed(new Date('2026-08-19T00:00:01Z'), 'spider-2suit');
  const late = dailySeed(new Date('2026-08-19T23:59:59Z'), 'spider-2suit');
  assert.equal(early, late);
});

test('dailySeed accepts an already-formatted YYYY-MM-DD string identically to the equivalent Date', () => {
  assert.equal(dailySeed('2026-08-19', 'freecell'), dailySeed(new Date('2026-08-19T00:00:00Z'), 'freecell'));
});

test('utcDateString uses UTC accessors, not local timezone — a date near local midnight is not off by one', () => {
  // 2026-08-19T00:30:00Z is 2026-08-19 in UTC no matter what timezone this test process runs in.
  assert.equal(utcDateString(new Date('2026-08-19T00:30:00Z')), '2026-08-19');
  assert.equal(utcDateString(new Date('2026-08-19T23:30:00Z')), '2026-08-19');
});

test('dailySeed produces a distinct, stable seed for every declared variant on the same date (full VARIANT_LIST coverage)', () => {
  const date = '2026-08-19';
  const seeds = VARIANT_LIST.map((v) => dailySeed(date, v.id));
  assert.equal(new Set(seeds).size, VARIANT_LIST.length, 'every variant must get its own distinct daily seed');
  assert.ok(VARIANT_LIST.length >= 11, 'this must cover the full catalog, not a stale subset');
  for (const v of VARIANT_LIST) {
    assert.equal(dailySeed(date, v.id), dailySeed(date, v.id), `${v.id}: dailySeed must be a pure function`);
  }
});
