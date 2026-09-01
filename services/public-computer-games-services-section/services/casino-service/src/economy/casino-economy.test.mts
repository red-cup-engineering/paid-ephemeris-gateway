import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CasinoEconomy } from './casino-economy.mts';
import { TICKET_ACCRUAL_CAP, TICKET_ACCRUAL_PERIOD_MS, BUY_IN_TICKET_COST, BUY_IN_CHIP_GRANT } from './config.mts';

const T0 = new Date(Date.UTC(2026, 7, 29, 0, 0, 0));
function at(msFromT0: number): Date {
  return new Date(T0.getTime() + msFromT0);
}

test('guestAccount: deterministic id derivation for the same client key', () => {
  const economy = new CasinoEconomy();
  const a = economy.guestAccount('device-abc');
  const b = economy.guestAccount('device-abc');
  assert.equal(a, b);
});

test('statusOf: a brand-new guest starts at zero tickets/chips with the daily bonus available', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  const status = economy.statusOf(account, T0);
  assert.equal(status.tickets, 0);
  assert.equal(status.chips, 0);
  assert.equal(status.dailyBonus.availableToday, true);
  assert.equal(status.ticketCap, TICKET_ACCRUAL_CAP);
});

test('claimTickets: grants nothing before a full accrual period has elapsed since account creation, but starts the clock', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  const first = economy.claimTickets(account, T0);
  assert.equal(first.ticketsGranted, 0);
  const soon = economy.claimTickets(account, at(1000));
  assert.equal(soon.ticketsGranted, 0);
});

test('claimTickets: grants one ticket per elapsed accrual period, recorded on the ledger', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  economy.claimTickets(account, T0); // starts the clock
  const result = economy.claimTickets(account, at(TICKET_ACCRUAL_PERIOD_MS));
  assert.equal(result.ticketsGranted, 1);
  assert.equal(result.status.tickets, 1);
});

test('claimTickets: tickets never exceed the accrual cap, even over an enormous elapsed time', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  economy.claimTickets(account, T0);
  const result = economy.claimTickets(account, at(TICKET_ACCRUAL_PERIOD_MS * 1000));
  assert.equal(result.status.tickets, TICKET_ACCRUAL_CAP);
  // claiming again immediately grants nothing further — already at cap.
  const again = economy.claimTickets(account, at(TICKET_ACCRUAL_PERIOD_MS * 1000 + 1));
  assert.equal(again.ticketsGranted, 0);
  assert.equal(again.status.tickets, TICKET_ACCRUAL_CAP);
});

test('claimTickets: accrual is a deterministic function of state and now — replaying the same call sequence yields the same balances', () => {
  const runOnce = () => {
    const economy = new CasinoEconomy();
    const account = economy.guestAccount('device-xyz');
    economy.claimTickets(account, T0);
    economy.claimTickets(account, at(TICKET_ACCRUAL_PERIOD_MS * 2));
    return economy.statusOf(account, at(TICKET_ACCRUAL_PERIOD_MS * 2)).tickets;
  };
  assert.equal(runOnce(), runOnce());
});

test('claimDailyBonus: once per UTC day — a second claim the same day is refused', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  const first = economy.claimDailyBonus(account, T0);
  assert.equal(first.claimed, true);
  assert.ok(first.ticketsGranted > 0);
  const second = economy.claimDailyBonus(account, at(60 * 60 * 1000));
  assert.equal(second.claimed, false);
  assert.equal(second.ticketsGranted, 0);
  // balance reflects only the first grant.
  assert.equal(economy.statusOf(account, T0).tickets, first.ticketsGranted);
});

test('claimDailyBonus: the next UTC day escalates the streak and grants again', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  const day1 = economy.claimDailyBonus(account, T0);
  const day2 = economy.claimDailyBonus(account, at(24 * 60 * 60 * 1000));
  assert.equal(day2.claimed, true);
  assert.equal(day2.streak, 2);
  assert.ok(day2.ticketsGranted >= day1.ticketsGranted);
});

test('buyIntoTable: spends the ticket cost and grants the chip stack, both ledger-recorded', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  economy.claimDailyBonus(account, T0); // fund at least one ticket
  const before = economy.statusOf(account, T0);
  const result = economy.buyIntoTable(account, T0);
  assert.equal(result.ticketsSpent, BUY_IN_TICKET_COST);
  assert.equal(result.chipsGranted, BUY_IN_CHIP_GRANT);
  assert.equal(result.status.tickets, before.tickets - BUY_IN_TICKET_COST);
  assert.equal(result.status.chips, before.chips + BUY_IN_CHIP_GRANT);
});

test('buyIntoTable: refuses when the player has no tickets to spend', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  assert.throws(() => economy.buyIntoTable(account, T0));
});

test('purchase flow: settleBundlePurchase credits exactly the SKU quantity', async () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  await economy.beginBundlePurchase(account, 'tickets-handful', 'order-1');
  const result = await economy.settleBundlePurchase(account, 'tickets-handful', 'order-1', 'mock', T0);
  assert.equal(result.cleared, true);
  assert.equal(economy.statusOf(account, T0).tickets, result.granted!.quantity);
});

test('placeWager/resolveWager: a full round-trip conserves the player and jackpot pool total', async () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  await economy.beginBundlePurchase(account, 'chips-stack', 'order-2');
  await economy.settleBundlePurchase(account, 'chips-stack', 'order-2', 'mock', T0);
  const before = economy.statusOf(account, T0);
  const totalBefore = before.chips + before.jackpot;
  const { potAmount } = economy.placeWager(account, 'table-1', 500, T0, 250);
  economy.resolveWager('table-1', account, potAmount, T0);
  const after = economy.statusOf(account, T0);
  const totalAfter = after.chips + after.jackpot;
  assert.equal(totalAfter, totalBefore);
});

test('checkInvariants: the books stay balanced and no player balance ever goes negative across a full mixed sequence of operations', async () => {
  const economy = new CasinoEconomy();
  const alice = economy.guestAccount('alice-device');
  const bob = economy.guestAccount('bob-device');

  economy.claimDailyBonus(alice, T0);
  economy.claimDailyBonus(bob, T0);
  economy.claimTickets(alice, at(TICKET_ACCRUAL_PERIOD_MS * 3));
  await economy.beginBundlePurchase(bob, 'chips-rack', 'order-3');
  await economy.settleBundlePurchase(bob, 'chips-rack', 'order-3', 'mock', T0);
  economy.buyIntoTable(alice, T0);
  const wager = economy.placeWager(bob, 'table-9', 1000, T0, 300);
  economy.resolveWager('table-9', alice, wager.potAmount, T0);
  economy.seedJackpot(500, T0);

  assert.deepEqual(economy.checkInvariants(), []);
});

test('auditJournal: renders non-empty hledger-format text once at least one entry exists', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  economy.claimDailyBonus(account, T0);
  const journal = economy.auditJournal();
  assert.ok(journal.includes('liabilities:energy:'));
});

test('snapshot/fromSnapshot: round-trips ledger and player state exactly', () => {
  const economy = new CasinoEconomy();
  const account = economy.guestAccount('device-abc');
  economy.claimDailyBonus(account, T0);
  economy.claimTickets(account, T0);

  const restored = CasinoEconomy.fromSnapshot(economy.snapshot());
  assert.deepEqual(restored.statusOf(account, T0).tickets, economy.statusOf(account, T0).tickets);
  assert.deepEqual(restored.checkInvariants(), []);
  // the restored economy remembers the daily bonus was already claimed today.
  const reclaim = restored.claimDailyBonus(account, T0);
  assert.equal(reclaim.claimed, false);
});
