import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '@red-cup-engineering/energy-bank/ledger';
import { fundAccount } from '@red-cup-engineering/energy-bank/transfer';
import { checkAll } from '@red-cup-engineering/energy-bank/invariants';
import { placeWager, resolveWager, tablePotAccountId } from './wager.mts';
import { jackpotBalance } from './jackpot.mts';
import { CHIP } from './config.mts';

const DATE = '2026-08-29';
const TEST_CHIP_FAUCET = 'equity:casino:test-chip-faucet';

function grantChips(ledger, accountId, amount, ref) {
  fundAccount(ledger, TEST_CHIP_FAUCET, accountId, String(amount), CHIP, ref, DATE);
}

function chipBalance(ledger, accountId) {
  const { balances } = ledger.audit();
  return Number(balances[`liabilities:energy:${accountId}`]?.[CHIP] ?? '0');
}

test('placeWager: splits the bet between the table pot and the jackpot rake, at the given bps', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  const result = placeWager(ledger, 'casino:guest-alice', 'table-1', 100, 'wager-1', DATE, 250 /* 2.5% */);
  assert.equal(result.rakeAmount, 2); // floor(100 * 250 / 10000) = 2
  assert.equal(result.potAmount, 98);
  assert.equal(chipBalance(ledger, 'casino:guest-alice'), 900);
  assert.equal(chipBalance(ledger, result.potAccount), 98);
  assert.equal(jackpotBalance(ledger), 2);
});

test('placeWager: refuses a non-positive bet', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  assert.throws(() => placeWager(ledger, 'casino:guest-alice', 'table-1', 0, 'wager-1', DATE));
  assert.throws(() => placeWager(ledger, 'casino:guest-alice', 'table-1', -10, 'wager-1', DATE));
});

test('placeWager: refuses a bet the player cannot cover', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 10, 'grant-1');
  assert.throws(() => placeWager(ledger, 'casino:guest-alice', 'table-1', 100, 'wager-1', DATE));
});

test('resolveWager: pays the pot out to a winner', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  const { potAccount, potAmount } = placeWager(ledger, 'casino:guest-alice', 'table-1', 100, 'wager-1', DATE, 0);
  resolveWager(ledger, 'table-1', 'casino:guest-alice', potAmount, 'resolve-1', DATE);
  assert.equal(chipBalance(ledger, potAccount), 0);
  assert.equal(chipBalance(ledger, 'casino:guest-alice'), 1000); // wagered, then won it all back
});

test('resolveWager: refuses to pay out more than the pot holds', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  placeWager(ledger, 'casino:guest-alice', 'table-1', 100, 'wager-1', DATE, 0);
  assert.throws(() => resolveWager(ledger, 'table-1', 'casino:guest-bob', 500, 'resolve-1', DATE));
});

test('full place+resolve cycle with zero rake conserves total chips outstanding exactly', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  grantChips(ledger, 'casino:guest-bob', 1000, 'grant-2');
  const before = chipBalance(ledger, 'casino:guest-alice') + chipBalance(ledger, 'casino:guest-bob');

  const a = placeWager(ledger, 'casino:guest-alice', 'heads-up-1', 200, 'w-a', DATE, 0);
  const b = placeWager(ledger, 'casino:guest-bob', 'heads-up-1', 200, 'w-b', DATE, 0);
  resolveWager(ledger, 'heads-up-1', 'casino:guest-alice', a.potAmount + b.potAmount, 'resolve-1', DATE);

  const after = chipBalance(ledger, 'casino:guest-alice') + chipBalance(ledger, 'casino:guest-bob');
  assert.equal(after, before);
  assert.equal(chipBalance(ledger, tablePotAccountId('heads-up-1')), 0);
  assert.deepEqual(checkAll(ledger), []);
});

test('a wager with nonzero rake conserves chips across player+pot+jackpot combined', () => {
  const ledger = createLedger();
  grantChips(ledger, 'casino:guest-alice', 1000, 'grant-1');
  const before = chipBalance(ledger, 'casino:guest-alice');
  const { potAccount, potAmount, rakeAmount } = placeWager(ledger, 'casino:guest-alice', 'table-2', 300, 'wager-1', DATE, 500);
  const after = chipBalance(ledger, 'casino:guest-alice') + chipBalance(ledger, potAccount) + jackpotBalance(ledger);
  assert.equal(after, before);
  assert.equal(potAmount + rakeAmount, 300);
  assert.deepEqual(checkAll(ledger), []);
});
