import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '@red-cup-engineering/energy-bank/ledger';
import { checkAll } from '@red-cup-engineering/energy-bank/invariants';
import { BUNDLE_CATALOG, bundleById, beginPurchase, settlePurchase } from './bundles.mts';
import { TICKET, CHIP } from './config.mts';

const DATE = '2026-08-29';

function chipOrTicketBalance(ledger, accountId, commodity) {
  const { balances } = ledger.audit();
  return Number(balances[`liabilities:energy:${accountId}`]?.[commodity] ?? '0');
}

test('BUNDLE_CATALOG: every SKU has a positive price and quantity, and a unique id', () => {
  const ids = new Set();
  for (const sku of BUNDLE_CATALOG) {
    assert.ok(sku.priceUsdCents > 0, `${sku.id}: price must be positive`);
    assert.ok(sku.quantity > 0, `${sku.id}: quantity must be positive`);
    assert.ok(sku.commodity === TICKET || sku.commodity === CHIP, `${sku.id}: commodity must be TICKET or CHIP`);
    assert.ok(!ids.has(sku.id), `duplicate sku id ${sku.id}`);
    ids.add(sku.id);
  }
});

test('BUNDLE_CATALOG: includes at least one "best value" tier per instrument, typical of the genre', () => {
  const bestValueTicket = BUNDLE_CATALOG.some((s) => s.commodity === TICKET && s.bestValue === true);
  const bestValueChip = BUNDLE_CATALOG.some((s) => s.commodity === CHIP && s.bestValue === true);
  assert.ok(bestValueTicket && bestValueChip);
});

test('bundleById: resolves a known sku, returns undefined for an unknown one', () => {
  assert.equal(bundleById('tickets-handful')?.id, 'tickets-handful');
  assert.equal(bundleById('does-not-exist'), undefined);
});

test('beginPurchase: mints mock-backend instructions for a known sku', async () => {
  const intent = await beginPurchase('casino:guest-alice', 'tickets-handful', 'order-1');
  assert.equal(intent.provider, 'mock');
  assert.equal(intent.sku.id, 'tickets-handful');
});

test('beginPurchase: throws on an unknown sku', async () => {
  await assert.rejects(() => beginPurchase('casino:guest-alice', 'no-such-sku', 'order-1'));
});

test('settlePurchase: credits exactly the SKU quantity to the player once cleared', async () => {
  const ledger = createLedger();
  const sku = bundleById('tickets-handful');
  const result = await settlePurchase(ledger, 'casino:guest-alice', 'tickets-handful', 'order-1', DATE, 'mock');
  assert.equal(result.cleared, true);
  assert.deepEqual(result.granted, { commodity: TICKET, quantity: sku.quantity });
  assert.equal(chipOrTicketBalance(ledger, 'casino:guest-alice', TICKET), sku.quantity);
  assert.deepEqual(checkAll(ledger), []);
});

test('settlePurchase: also records the real-money side of the ledger (assets/income), never touching liabilities:energy for the payment leg', async () => {
  const ledger = createLedger();
  await settlePurchase(ledger, 'casino:guest-alice', 'chips-stack', 'order-2', DATE, 'mock');
  const { balances } = ledger.audit();
  assert.ok('assets:cash:mock' in balances, 'expected a real-money asset posting');
  assert.ok('income:settlement:mock' in balances, 'expected a real-money income posting');
});

test('settlePurchase: is idempotent — repeating the same orderId neither re-charges nor re-grants', async () => {
  const ledger = createLedger();
  const sku = bundleById('chips-stack');
  await settlePurchase(ledger, 'casino:guest-alice', 'chips-stack', 'order-3', DATE, 'mock');
  const again = await settlePurchase(ledger, 'casino:guest-alice', 'chips-stack', 'order-3', DATE, 'mock');
  assert.equal(again.cleared, true);
  assert.equal(chipOrTicketBalance(ledger, 'casino:guest-alice', CHIP), sku.quantity);
});

test('settlePurchase: throws on an unknown sku', async () => {
  const ledger = createLedger();
  await assert.rejects(() => settlePurchase(ledger, 'casino:guest-alice', 'no-such-sku', 'order-4', DATE, 'mock'));
});

test('settlePurchase: never posts to expenses:payout:* — a purchase is money in, never a payout', async () => {
  const ledger = createLedger();
  await settlePurchase(ledger, 'casino:guest-alice', 'chips-vault', 'order-5', DATE, 'mock');
  const { balances } = ledger.audit();
  for (const account of Object.keys(balances)) {
    assert.ok(!account.startsWith('expenses:payout:'), `unexpected payout posting from a purchase: ${account}`);
  }
});
