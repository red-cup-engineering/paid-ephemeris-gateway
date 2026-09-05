import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CasinoEconomy, AuthError } from './casino-economy.mts';
import { casinoGuestId, casinoDurableId } from './accounts.mts';
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

// ── durable-account login (accounts.mts's seam, wired) ─────────────────────────────────

test('loginAccount: first login for a handle claims it and derives a durable id deterministically', () => {
  const economy = new CasinoEconomy();
  const login = economy.loginAccount('morgan', 'correct-horse', T0);
  assert.equal(login.created, true);
  assert.equal(login.accountId, economy.loginAccount('morgan', 'correct-horse', T0).accountId);
});

test('loginAccount: a later login with the same passphrase reconnects to the same account, created:false', () => {
  const economy = new CasinoEconomy();
  const first = economy.loginAccount('morgan', 'correct-horse', T0);
  const second = economy.loginAccount('morgan', 'correct-horse', at(1000));
  assert.equal(second.created, false);
  assert.equal(second.accountId, first.accountId);
});

test('loginAccount: a mismatched passphrase throws AuthError, never silently logs in', () => {
  const economy = new CasinoEconomy();
  economy.loginAccount('morgan', 'correct-horse', T0);
  assert.throws(() => economy.loginAccount('morgan', 'wrong-passphrase', T0), AuthError);
});

test('loginAccount: an empty passphrase throws AuthError', () => {
  const economy = new CasinoEconomy();
  assert.throws(() => economy.loginAccount('morgan', '', T0), AuthError);
});

test('loginAccount: balances survive a reconnect from a fresh session — the assay this route exists for', () => {
  const economy = new CasinoEconomy();
  const first = economy.loginAccount('morgan', 'correct-horse', T0);
  economy.claimDailyBonus(first.accountId, T0);
  const before = economy.statusOf(first.accountId, T0).tickets;
  assert.ok(before > 0);
  // a second, independent "session" reconnects with the same claim code (the passphrase).
  const second = economy.loginAccount('morgan', 'correct-horse', at(1));
  assert.equal(second.accountId, first.accountId);
  assert.equal(second.status.tickets, before);
});

// ── guest -> durable migration, wired through the economy ──────────────────────────────

test('claimGuestIntoAccount: folds a guest\'s ticket/chip balances and streak state into the durable account', () => {
  const economy = new CasinoEconomy();
  const guestKey = 'device-xyz';
  const guestId = economy.guestAccount(guestKey);
  economy.claimDailyBonus(guestId, T0); // grants a ticket, sets streak to 1
  const guestTickets = economy.statusOf(guestId, T0).tickets;
  assert.ok(guestTickets > 0);

  const login = economy.loginAccount('morgan', 'correct-horse', T0);
  const result = economy.claimGuestIntoAccount(guestId, login.accountId, T0);
  assert.equal(result.migrated, true);
  assert.equal(result.status.tickets, guestTickets);
  assert.equal(result.status.dailyBonus.streak, 1);
  // the guest's own balance is gone — it moved, not copied.
  assert.equal(economy.statusOf(guestId, T0).tickets, 0);
  assert.deepEqual(economy.checkInvariants(), []);
});

test('claimGuestIntoAccount: migrated:false, no throw, when there is no such guest', () => {
  const economy = new CasinoEconomy();
  const login = economy.loginAccount('morgan', 'correct-horse', T0);
  const neverPlayedGuest = casinoGuestId('never-seen-device');
  const result = economy.claimGuestIntoAccount(neverPlayedGuest, login.accountId, T0);
  assert.equal(result.migrated, false);
});

test('claimGuestIntoAccount: refuses to clobber a durable account that already has its own progress', () => {
  const economy = new CasinoEconomy();
  const guestId = economy.guestAccount('device-xyz');
  economy.claimDailyBonus(guestId, T0);
  const login = economy.loginAccount('morgan', 'correct-horse', T0);
  economy.claimDailyBonus(login.accountId, T0); // the durable account already has its own streak

  const result = economy.claimGuestIntoAccount(guestId, login.accountId, T0);
  assert.equal(result.migrated, false);
  // the guest's own balance is untouched — nothing moved.
  assert.ok(economy.statusOf(guestId, T0).tickets > 0);
});

// ── friends list + gift-a-ticket ────────────────────────────────────────────────────────

test('addFriend: links two durable accounts mutually', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const b = economy.loginAccount('sam', 'secret-b', T0).accountId;
  const result = economy.addFriend(a, b);
  assert.deepEqual(result.friends, [b]);
  assert.deepEqual(economy.friendsOf(b), [a]);
});

test('addFriend: refuses a guest account on either side', () => {
  const economy = new CasinoEconomy();
  const durable = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const guest = economy.guestAccount('device-xyz');
  assert.throws(() => economy.addFriend(guest, durable), RangeError);
  assert.throws(() => economy.addFriend(durable, guest), RangeError);
});

test('addFriend: refuses friending a handle nobody has claimed with a login yet', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const nobody = casinoDurableId('nobody');
  assert.throws(() => economy.addFriend(a, nobody), RangeError);
});

test('giftTicket: moves a TICKET from one friend to another, ledger balanced', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const b = economy.loginAccount('sam', 'secret-b', T0).accountId;
  economy.addFriend(a, b);
  economy.claimDailyBonus(a, T0);
  const before = economy.statusOf(a, T0).tickets;
  assert.ok(before > 0);

  const gift = economy.giftTicket(a, b, 1, T0);
  assert.equal(gift.ticketsGifted, 1);
  assert.equal(economy.statusOf(a, T0).tickets, before - 1);
  assert.equal(economy.statusOf(b, T0).tickets, 1);
  assert.deepEqual(economy.checkInvariants(), []);
});

test('giftTicket: refuses a gift between accounts that are not friends', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const b = economy.loginAccount('sam', 'secret-b', T0).accountId;
  economy.claimDailyBonus(a, T0);
  assert.throws(() => economy.giftTicket(a, b, 1, T0), RangeError);
});

test('giftTicket: refuses a gift the sender cannot cover (ledger\'s own no-negative-balance guard)', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const b = economy.loginAccount('sam', 'secret-b', T0).accountId;
  economy.addFriend(a, b);
  assert.throws(() => economy.giftTicket(a, b, 1, T0));
});

test('snapshot/fromSnapshot: a friend link survives a restart', () => {
  const economy = new CasinoEconomy();
  const a = economy.loginAccount('morgan', 'secret-a', T0).accountId;
  const b = economy.loginAccount('sam', 'secret-b', T0).accountId;
  economy.addFriend(a, b);

  const restored = CasinoEconomy.fromSnapshot(economy.snapshot());
  assert.deepEqual(restored.friendsOf(a), [b]);
  assert.deepEqual(restored.friendsOf(b), [a]);
  // and the restored durable account still requires the same passphrase.
  assert.throws(() => restored.loginAccount('morgan', 'wrong', T0), AuthError);
});
