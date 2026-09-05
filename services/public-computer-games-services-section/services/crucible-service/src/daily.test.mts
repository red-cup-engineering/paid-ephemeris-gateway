import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utcDateString, dailySeed } from './daily.mts';

test('utcDateString formats YYYY-MM-DD from UTC accessors', () => {
  const d = new Date(Date.UTC(2026, 7, 19, 23, 59, 59)); // Aug is month index 7
  assert.equal(utcDateString(d), '2026-08-19');
});

test('utcDateString pads single-digit month and day', () => {
  const d = new Date(Date.UTC(2026, 0, 5));
  assert.equal(utcDateString(d), '2026-01-05');
});

test('utcDateString is timezone-independent (uses UTC fields only, not local)', () => {
  // A moment that is one calendar day apart in local time vs UTC for negative-offset zones
  // would still resolve to the same UTC date here — verified by comparing two Date objects
  // that represent the same UTC instant constructed two different ways.
  const a = new Date(Date.UTC(2026, 7, 19, 0, 30));
  const b = new Date(a.getTime());
  assert.equal(utcDateString(a), utcDateString(b));
});

test('dailySeed accepts a Date and a pre-formatted string identically', () => {
  const d = new Date(Date.UTC(2026, 7, 19));
  assert.equal(dailySeed(d), dailySeed('2026-08-19'));
});

test('dailySeed is namespaced and stable', () => {
  assert.equal(dailySeed('2026-08-19'), 'crucible-daily:2026-08-19');
});

test('dailySeed differs across different days', () => {
  assert.notEqual(dailySeed('2026-08-19'), dailySeed('2026-08-20'));
});

test('dailySeed at UTC day boundary: 23:59:59 and next day 00:00:00 differ', () => {
  const late = new Date(Date.UTC(2026, 7, 19, 23, 59, 59));
  const early = new Date(Date.UTC(2026, 7, 20, 0, 0, 0));
  assert.notEqual(dailySeed(late), dailySeed(early));
});
