import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed, GAME_ID } from './daily.mts';
import { dailySeed as cartridgeDailySeed, utcDateString } from '@red-cup-engineering/cartridge/seed';
import { dailyOffers } from './wagers.mts';

test('dailySeed delegates to @red-cup-engineering/cartridge/seed with this game\'s GAME_ID, no local hashing', () => {
  const date = new Date('2026-08-19T23:59:59Z');
  assert.equal(dailySeed(date), cartridgeDailySeed(GAME_ID, date));
  assert.equal(dailySeed(date, 'sharp'), cartridgeDailySeed(GAME_ID, date, 'sharp'));
});

test('dailySeed accepts either a Date or an already-formatted YYYY-MM-DD string, and both resolve identically', () => {
  const date = new Date('2026-03-01T05:00:00Z');
  assert.equal(dailySeed(date), dailySeed(utcDateString(date)));
});

test('dailySeed is timezone-independent: only the UTC calendar day matters', () => {
  const early = new Date('2026-08-19T00:00:01Z');
  const late = new Date('2026-08-19T23:59:59Z');
  assert.equal(dailySeed(early), dailySeed(late));
  const nextDay = new Date('2026-08-20T00:00:01Z');
  assert.notEqual(dailySeed(early), dailySeed(nextDay));
});

test('this game\'s own offer sequence is a pure function of the resulting seed string (cartridge already owns the date-hashing half)', () => {
  const date = new Date('2026-08-19T12:00:00Z');
  const seed = dailySeed(date, 'novice');
  const a = dailyOffers(seed, 'novice');
  const b = dailyOffers(seed, 'novice');
  assert.deepEqual(a, b);
  const differentDay = dailyOffers(dailySeed(new Date('2026-08-20T12:00:00Z'), 'novice'), 'novice');
  assert.notDeepEqual(a, differentDay);
});
