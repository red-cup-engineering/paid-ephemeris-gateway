import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccrual } from './accrual.mts';
import { TICKET_ACCRUAL_PERIOD_MS, TICKET_ACCRUAL_CAP } from './config.mts';

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

test('computeAccrual: no clock yet grants nothing and starts the clock at now', () => {
  const result = computeAccrual({ lastAccrualAt: null, currentBalance: 0 }, T0);
  assert.equal(result.ticketsToGrant, 0);
  assert.equal(result.newLastAccrualAt, T0);
});

test('computeAccrual: before one full period elapses, nothing is granted', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS - 1;
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: 0 }, now);
  assert.equal(result.ticketsToGrant, 0);
  assert.equal(result.newLastAccrualAt, T0);
});

test('computeAccrual: exactly one period grants exactly one ticket', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS;
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: 0 }, now);
  assert.equal(result.ticketsToGrant, 1);
  assert.equal(result.newLastAccrualAt, T0 + TICKET_ACCRUAL_PERIOD_MS);
});

test('computeAccrual: multiple elapsed periods grant multiple tickets, clock advances by exactly that many periods (partial progress preserved)', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 2 + 5 * 60 * 1000; // 2 periods + 5 minutes
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: 0 }, now);
  assert.equal(result.ticketsToGrant, 2);
  assert.equal(result.newLastAccrualAt, T0 + TICKET_ACCRUAL_PERIOD_MS * 2);
  assert.equal(result.msUntilNextTicket, TICKET_ACCRUAL_PERIOD_MS - 5 * 60 * 1000);
});

test('computeAccrual: never grants past the cap even given unlimited elapsed time', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 1000; // absurdly long elapsed time
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: 0 }, now);
  assert.equal(result.ticketsToGrant, TICKET_ACCRUAL_CAP);
});

test('computeAccrual: partial headroom grants only up to the cap, not the full elapsed-period count', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 10;
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: TICKET_ACCRUAL_CAP - 2 }, now);
  assert.equal(result.ticketsToGrant, 2);
});

test('computeAccrual: already at cap grants nothing and resets the clock to now (does not bank unusable time)', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 100;
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: TICKET_ACCRUAL_CAP }, now);
  assert.equal(result.ticketsToGrant, 0);
  assert.equal(result.newLastAccrualAt, now);
});

test('computeAccrual: above cap (e.g. from a purchased bundle) also grants nothing and resets the clock', () => {
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 5;
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: TICKET_ACCRUAL_CAP + 50 }, now);
  assert.equal(result.ticketsToGrant, 0);
  assert.equal(result.newLastAccrualAt, now);
});

test('computeAccrual: deterministic — identical inputs always produce identical outputs', () => {
  const state = { lastAccrualAt: T0, currentBalance: 1 };
  const now = T0 + TICKET_ACCRUAL_PERIOD_MS * 3;
  const a = computeAccrual(state, now);
  const b = computeAccrual(state, now);
  assert.deepEqual(a, b);
});

test('computeAccrual: negative/zero elapsed time (clock skew) never grants a negative ticket count', () => {
  const result = computeAccrual({ lastAccrualAt: T0, currentBalance: 0 }, T0 - 60_000);
  assert.equal(result.ticketsToGrant, 0);
});
