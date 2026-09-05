/**
 * bundles.mts — the purchasable ticket/chip SKU catalog and the two-step purchase flow
 * (`createIntent` then `settle`, matching flickering-delve's `Payments`/onestone's precedent
 * and `@red-cup-engineering/energy-bank/settlement`'s `SettlementBackend` interface directly)
 * that turns a SKU into ledger-recorded real money plus a ledger-recorded grant of tickets or
 * chips.
 *
 * The two ledger postings a single purchase produces are deliberately kept apart, mirroring
 * energy-bank's own settlement.mjs header note: `authorizeSettlement` records only the
 * real-money side (`assets:cash:<backend>` / `income:settlement:<backend>`), entirely in the
 * backend's own commodity (USD cents here); it never touches `liabilities:energy:*`. Granting
 * the purchased tickets/chips onto the player's own balance is this module's own explicit
 * second step (`fundAccount` from `BUNDLE_ISSUANCE_ACCOUNT`), taken only after `settle` reports
 * `cleared: true` — so a purchase that never clears never grants anything, and the two
 * postings share nothing but the order id used as both refs' common prefix.
 *
 * `mockBackend` is wired as the settlement backend today (energy-bank ships it exactly for
 * this: "the default in dev/test so the ledger is fully exercisable without any real payment
 * processor"). `resolveSettlementBackend` below takes the same backend list + requested-id
 * shape `resolveBackend` does, so dropping in a real backend (ZBD, Stripe, whatever this house
 * settles on) later is a one-line change to the array passed at server start — see server.mts
 * and this module's own `SETTLEMENT_BACKENDS` export, not a rewrite of this module.
 */
import { mockBackend, resolveBackend, authorizeSettlement } from '@red-cup-engineering/energy-bank/settlement';
import type { SettlementBackend } from '@red-cup-engineering/energy-bank/settlement';
import { fundAccount } from '@red-cup-engineering/energy-bank/transfer';
import type { Ledger } from '@red-cup-engineering/energy-bank/ledger';
import { TICKET, CHIP, BUNDLE_ISSUANCE_ACCOUNT } from './config.mts';
import type { AccountId } from './accounts.mts';

/** A purchasable bundle: real money in (USD cents, so the price is always an exact integer —
 *  no floating-point cent drift), a fixed quantity of one in-game commodity out. `bestValue`
 *  flags the tier the storefront highlights, per the genre's own convention (a "best value"
 *  badge on the tier the house most wants bought) — a UI concern this module only labels, never
 *  enforces. */
export interface BundleSku {
  readonly id: string;
  readonly displayName: string;
  readonly commodity: typeof TICKET | typeof CHIP;
  readonly quantity: number;
  readonly priceUsdCents: number;
  readonly bestValue?: boolean;
}

/** The bundle catalog. A handful of ticket bundles (buy admission outright, skip the timer)
 *  and chip bundles (buy a bigger stack directly), each tier's per-unit price dropping as
 *  quantity rises — the standard social-casino "best value at the top" ladder. */
export const BUNDLE_CATALOG: readonly BundleSku[] = [
  { id: 'tickets-handful', displayName: 'Handful of Tickets', commodity: TICKET, quantity: 5, priceUsdCents: 199 },
  { id: 'tickets-pocketful', displayName: 'Pocketful of Tickets', commodity: TICKET, quantity: 15, priceUsdCents: 499 },
  { id: 'tickets-satchel', displayName: 'Satchel of Tickets', commodity: TICKET, quantity: 40, priceUsdCents: 999, bestValue: true },
  { id: 'chips-stack', displayName: 'Chip Stack', commodity: CHIP, quantity: 2_500, priceUsdCents: 199 },
  { id: 'chips-rack', displayName: 'Chip Rack', commodity: CHIP, quantity: 8_000, priceUsdCents: 499 },
  { id: 'chips-vault', displayName: 'Chip Vault', commodity: CHIP, quantity: 25_000, priceUsdCents: 999, bestValue: true },
  { id: 'chips-high-roller', displayName: "High Roller's Trunk", commodity: CHIP, quantity: 60_000, priceUsdCents: 1999 },
];

export function bundleById(id: string): BundleSku | undefined {
  return BUNDLE_CATALOG.find((sku) => sku.id === id);
}

/** The settlement backends this service knows about, in preference order. `mockBackend` is
 *  always last and always available, so `resolveBackend` never throws — see energy-bank's own
 *  `resolveBackend` doc. Add a real backend (e.g. `zbdBackend(config)`) ahead of `mockBackend`
 *  here, with its config sourced from environment variables read once at server start; nothing
 *  else in this module or server.mts needs to change. */
export function settlementBackends(): readonly SettlementBackend[] {
  return [mockBackend];
}

export interface PurchaseIntent {
  readonly orderId: string;
  readonly sku: BundleSku;
  readonly provider: string;
  readonly instructions: Record<string, unknown>;
}

/** Begin a bundle purchase: mint an order id and ask the resolved settlement backend for
 *  client-facing instructions. Records nothing to the ledger yet — see `settlePurchase`. */
export async function beginPurchase(
  accountId: AccountId,
  skuId: string,
  orderId: string,
  requestedBackendId?: string,
): Promise<PurchaseIntent> {
  const sku = bundleById(skuId);
  if (sku === undefined) throw new RangeError(`beginPurchase: unknown bundle sku "${skuId}"`);
  const backend = resolveBackend(settlementBackends(), requestedBackendId);
  const result = await backend.createIntent({
    id: orderId,
    account: accountId,
    amount: (sku.priceUsdCents / 100).toFixed(2),
    commodity: 'USD',
    direction: 'purchase',
  });
  return { orderId, sku, provider: backend.id, instructions: result.instructions };
}

export interface SettlePurchaseResult {
  readonly cleared: boolean;
  readonly detail: string;
  /** Present only when `cleared` — the bundle contents actually granted. */
  readonly granted?: { readonly commodity: string; readonly quantity: number };
}

/**
 * Settle a previously-begun purchase: verify the money actually moved (via
 * `authorizeSettlement`, which records the real-money side of the ledger and is idempotent on
 * `orderId`), and — only once cleared — grant the bundle's tickets/chips onto the player's own
 * balance. Idempotent end to end: a repeated call with the same `orderId` neither re-charges
 * nor re-grants, because both `authorizeSettlement` and the grant below key off the same ref
 * and `MemoryLedger.record` refuses (via `assertFreshRef` inside `fundAccount`) a reused ref.
 */
export async function settlePurchase(
  ledger: Ledger,
  accountId: AccountId,
  skuId: string,
  orderId: string,
  date: string,
  backendId: string,
  evidence?: unknown,
): Promise<SettlePurchaseResult> {
  const sku = bundleById(skuId);
  if (sku === undefined) throw new RangeError(`settlePurchase: unknown bundle sku "${skuId}"`);
  const backend = resolveBackend(settlementBackends(), backendId);

  const grantRef = `${orderId}:grant`;
  if (ledger.has(grantRef)) {
    return { cleared: true, detail: 'already settled', granted: { commodity: sku.commodity, quantity: sku.quantity } };
  }

  const result = await authorizeSettlement(
    ledger,
    backend,
    { id: orderId, account: accountId, amount: (sku.priceUsdCents / 100).toFixed(2), commodity: 'USD', direction: 'purchase' },
    date,
    evidence,
  );
  if (!result.cleared) return { cleared: false, detail: result.detail };

  fundAccount(
    ledger,
    BUNDLE_ISSUANCE_ACCOUNT,
    accountId,
    String(sku.quantity),
    sku.commodity,
    grantRef,
    date,
    `bundle purchase: ${sku.displayName} -> ${accountId}`,
  );
  return { cleared: true, detail: result.detail, granted: { commodity: sku.commodity, quantity: sku.quantity } };
}
