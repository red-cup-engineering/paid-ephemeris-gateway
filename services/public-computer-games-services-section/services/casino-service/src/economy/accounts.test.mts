import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casinoGuestId, casinoDurableId, newPlayerRecord, migrateGuestPlayer } from './accounts.mts';

test('casinoGuestId/casinoDurableId: deterministic and namespace-distinct by construction', () => {
  const guest = casinoGuestId('device-abc');
  const durable = casinoDurableId('device-abc');
  assert.equal(guest, casinoGuestId('device-abc'));
  assert.equal(durable, casinoDurableId('device-abc'));
  assert.notEqual(guest, durable);
});

test('migrateGuestPlayer: moves a guest record onto the durable id, preserving accrual/streak state', () => {
  const guestId = casinoGuestId('device-abc');
  const durableId = casinoDurableId('morgan');
  const guest = { ...newPlayerRecord(guestId), lastAccrualAt: 1000, dailyBonusStreak: 3 };
  const migrated = migrateGuestPlayer(guest, durableId);
  assert.notEqual(migrated, null);
  assert.equal(migrated?.accountId, durableId);
  assert.equal(migrated?.lastAccrualAt, 1000);
  assert.equal(migrated?.dailyBonusStreak, 3);
});

test('migrateGuestPlayer: refuses a non-guest source id', () => {
  const durableId = casinoDurableId('morgan');
  const other = casinoDurableId('sam');
  const notAGuest = newPlayerRecord(durableId);
  assert.equal(migrateGuestPlayer(notAGuest, other), null);
});

test('migrateGuestPlayer: refuses a self-migration (guest id equals the target durable id)', () => {
  const guestId = casinoGuestId('device-abc');
  const guest = newPlayerRecord(guestId);
  assert.equal(migrateGuestPlayer(guest, guestId), null);
});

test('migrateGuestPlayer: refuses to clobber a durable target that already shows progress', () => {
  const guestId = casinoGuestId('device-abc');
  const durableId = casinoDurableId('morgan');
  const guest = { ...newPlayerRecord(guestId), dailyBonusStreak: 2 };
  const durableWithProgress = { ...newPlayerRecord(durableId), dailyBonusStreak: 5 };
  assert.equal(migrateGuestPlayer(guest, durableId, durableWithProgress), null);
});

test('migrateGuestPlayer: a fresh (never-played) durable target does not block migration', () => {
  const guestId = casinoGuestId('device-abc');
  const durableId = casinoDurableId('morgan');
  const guest = { ...newPlayerRecord(guestId), dailyBonusStreak: 2 };
  const freshDurable = newPlayerRecord(durableId);
  const migrated = migrateGuestPlayer(guest, durableId, freshDurable);
  assert.notEqual(migrated, null);
  assert.equal(migrated?.dailyBonusStreak, 2);
});

test('migrateGuestPlayer: preserves the durable target\'s own secretHash, never the guest\'s', () => {
  const guestId = casinoGuestId('device-abc');
  const durableId = casinoDurableId('morgan');
  const guest = newPlayerRecord(guestId); // guest.secretHash is always null
  const claimedDurable = { ...newPlayerRecord(durableId), secretHash: 'already-claimed-hash' };
  const migrated = migrateGuestPlayer(guest, durableId, claimedDurable);
  assert.equal(migrated?.secretHash, 'already-claimed-hash');
});
