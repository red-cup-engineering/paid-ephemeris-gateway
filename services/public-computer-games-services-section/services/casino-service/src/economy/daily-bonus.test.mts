import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyBonus } from './daily-bonus.mts';
import { DAILY_BONUS_BASE_TICKETS, DAILY_BONUS_STEP_TICKETS, DAILY_BONUS_MAX_STREAK_DAY, dailyBonusTickets } from './config.mts';

test('computeDailyBonus: first-ever claim grants the base amount and starts streak at 1', () => {
  const result = computeDailyBonus({ lastClaimDate: null, streak: 0 }, new Date(Date.UTC(2026, 7, 29)));
  assert.equal(result.claimed, true);
  assert.equal(result.ticketsGranted, DAILY_BONUS_BASE_TICKETS);
  assert.equal(result.newStreak, 1);
  assert.equal(result.newLastClaimDate, '2026-08-29');
});

test('computeDailyBonus: claiming again the same UTC day is refused (idempotent no-op)', () => {
  const result = computeDailyBonus({ lastClaimDate: '2026-08-29', streak: 3 }, new Date(Date.UTC(2026, 7, 29, 23, 59)));
  assert.equal(result.claimed, false);
  assert.equal(result.ticketsGranted, 0);
  assert.equal(result.newStreak, 3);
});

test('computeDailyBonus: claiming the very next UTC day extends the streak and escalates the reward', () => {
  const result = computeDailyBonus({ lastClaimDate: '2026-08-29', streak: 1 }, new Date(Date.UTC(2026, 7, 30)));
  assert.equal(result.claimed, true);
  assert.equal(result.newStreak, 2);
  assert.equal(result.ticketsGranted, DAILY_BONUS_BASE_TICKETS + DAILY_BONUS_STEP_TICKETS);
});

test('computeDailyBonus: a missed day resets the streak to 1', () => {
  const result = computeDailyBonus({ lastClaimDate: '2026-08-27', streak: 5 }, new Date(Date.UTC(2026, 7, 29)));
  assert.equal(result.claimed, true);
  assert.equal(result.newStreak, 1);
  assert.equal(result.ticketsGranted, DAILY_BONUS_BASE_TICKETS);
});

test('computeDailyBonus: streak escalation plateaus at DAILY_BONUS_MAX_STREAK_DAY, never grows unbounded', () => {
  const plateauReward = dailyBonusTickets(DAILY_BONUS_MAX_STREAK_DAY);
  const beyond = dailyBonusTickets(DAILY_BONUS_MAX_STREAK_DAY + 10);
  assert.equal(beyond, plateauReward);
  assert.ok(plateauReward > DAILY_BONUS_BASE_TICKETS);
});

test('computeDailyBonus: UTC-day boundary respected regardless of local-looking hour (23:59 -> 00:01 next day is consecutive)', () => {
  const late = computeDailyBonus({ lastClaimDate: null, streak: 0 }, new Date(Date.UTC(2026, 7, 29, 23, 59)));
  assert.equal(late.newLastClaimDate, '2026-08-29');
  const nextEarly = computeDailyBonus({ lastClaimDate: late.newLastClaimDate, streak: late.newStreak }, new Date(Date.UTC(2026, 7, 30, 0, 1)));
  assert.equal(nextEarly.claimed, true);
  assert.equal(nextEarly.newStreak, 2);
});

test('computeDailyBonus: deterministic for identical inputs', () => {
  const state = { lastClaimDate: '2026-08-28', streak: 4 };
  const now = new Date(Date.UTC(2026, 7, 29, 12));
  assert.deepEqual(computeDailyBonus(state, now), computeDailyBonus(state, now));
});
