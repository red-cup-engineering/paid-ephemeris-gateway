import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '@red-cup-engineering/energy-bank/ledger';
import { fundAccount } from '@red-cup-engineering/energy-bank/transfer';
import { checkAll } from '@red-cup-engineering/energy-bank/invariants';
import { rakeIntoJackpot, payoutJackpot, seedJackpot, jackpotBalance, jackpotAccountId } from './jackpot.mts';
import { CHIP } from './config.mts';

const DATE = '2026-08-29';
const TEST_CHIP_FAUCET = 'equity:casino:test-chip-faucet';

function grantChips(ledger, accountId, amount, ref) {
  fundAccount(ledger, TEST_CHIP_FAUCET, accountId, String(amount), CHIP, ref, DATE);
}

test('jackpotBalance: starts at zero on a fresh ledger', () => {
  const ledger = createLedger();
  assert.equal(jackpotBalance(ledger), 0);
});

test('seedJackpot: credits the pool directly from the house seed account', () => {
  const ledger = createLedger();
  seedJackpot(ledger, 1000, 'seed-1', DATE);
  assert.equal(jackpotBalance(ledger), 1000);
  assert.deepEqual(checkAll(ledger), []);
});

test('rakeIntoJackpot: moves chips from a player into the pool, conserving total chips outstanding', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 500, 'grant-1');
  rakeIntoJackpot(ledger, 'casino:guest-alice', 25, 'rake-1', DATE);

  const { balances } = ledger.audit();
  const playerBalance = Number(balances['liabilities:energy:casino:guest-alice']?.[CHIP] ?? '0');
  assert.equal(playerBalance, 475);
  assert.equal(jackpotBalance(ledger), 25);
  // total chips outstanding across both accounts is unchanged by the rake — it only moved.
  assert.equal(playerBalance + jackpotBalance(ledger), 500);
  assert.deepEqual(checkAll(ledger), []);
});

test('rakeIntoJackpot: a zero or negative rake amount is a no-op, not an error', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 500, 'grant-1');
  rakeIntoJackpot(ledger, 'casino:guest-alice', 0, 'rake-1', DATE);
  rakeIntoJackpot(ledger, 'casino:guest-alice', -5, 'rake-2', DATE);
  assert.equal(jackpotBalance(ledger), 0);
});

test('rakeIntoJackpot: refuses to rake more than the player holds (no negative balance)', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 10, 'grant-1');
  assert.throws(() => rakeIntoJackpot(ledger, 'casino:guest-alice', 20, 'rake-1', DATE));
});

test('payoutJackpot: pays a winner out of the pool, conserving total chips outstanding', () => {
  const ledger = createLedger();
  seedJackpot(ledger, 1000, 'seed-1', DATE);
  payoutJackpot(ledger, 'casino:guest-bob', 400, 'payout-1', DATE);

  const { balances } = ledger.audit();
  const winnerBalance = Number(balances['liabilities:energy:casino:guest-bob']?.[CHIP] ?? '0');
  assert.equal(winnerBalance, 400);
  assert.equal(jackpotBalance(ledger), 600);
  assert.deepEqual(checkAll(ledger), []);
});

test('payoutJackpot: refuses to pay out more than the pool actually holds', () => {
  const ledger = createLedger();
  seedJackpot(ledger, 100, 'seed-1', DATE);
  assert.throws(() => payoutJackpot(ledger, 'casino:guest-bob', 500, 'payout-1', DATE));
});

test('payoutJackpot never touches income/expenses:payout/assets:cash — no real-money path exists at the jackpot boundary', () => {
  const ledger = createLedger();
  seedJackpot(ledger, 1000, 'seed-1', DATE);
  payoutJackpot(ledger, 'casino:guest-bob', 400, 'payout-1', DATE);
  const { balances } = ledger.audit();
  for (const account of Object.keys(balances)) {
    assert.ok(
      !account.startsWith('income:') && !account.startsWith('expenses:payout:') && !account.startsWith('assets:cash:'),
      `unexpected real-money account touched by a jackpot operation: ${account}`,
    );
  }
});

test('jackpotAccountId is a stable, namespaced pool id', () => {
  assert.equal(jackpotAccountId, 'casino:pool-jackpot');
});
