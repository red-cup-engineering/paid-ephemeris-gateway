/**
 * accounts.mts — casino-namespaced identity, a thin wrapper over
 * `@red-cup-engineering/energy-bank/accounts`. Every account minted here lives in the `casino`
 * namespace (config.mts's `NAMESPACE`), so a casino guest id and, say, an onestone guest id
 * sharing the same clientKey never collide in the shared energy-bank chart of accounts.
 *
 * This module owns identity derivation only. The per-player *state* that isn't a ledger
 * balance — last accrual timestamp, daily-bonus streak — lives in `PlayerRecord` below and is
 * held by whatever store the caller wires in (casino-economy.mts's in-memory `Map`, today;
 * persistence.mts's JSON snapshot makes it survive a restart). Durable-account migration is a
 * seam, not implemented end-to-end here: `guestAccountId`/`durableAccountId` are both derived
 * and ready, but casino-service ships guest-only sessions in this pass (see server.mts) —
 * wiring a real login screen to `migrateGuestPlayer` below is later-pass work.
 */
import { guestAccountId, durableAccountId, isGuest, energyAccountPath } from '@red-cup-engineering/energy-bank/accounts';
import { NAMESPACE } from './config.mts';

export type AccountId = string;

/** A casino guest account id, derived from an opaque client-minted key (e.g. a value the
 *  client stores in localStorage and presents on every visit). */
export function casinoGuestId(clientKey: string): AccountId {
  return guestAccountId(NAMESPACE, clientKey);
}

/** A casino durable account id, derived from a chosen handle. Not wired to a login flow in
 *  this pass — see this module's header. */
export function casinoDurableId(handle: string): AccountId {
  return durableAccountId(NAMESPACE, handle);
}

export { isGuest, energyAccountPath };

/** Everything about a player that is *not* a ledger balance: when their free-ticket faucet
 *  last accrued, and their daily-bonus streak state. Ledger balances (tickets, chips held) are
 *  never cached here — they are always read fresh from `ledger.audit()`, per this whole
 *  package's "the trace is the audit" discipline (see energy-bank's ledger.mjs header). */
export interface PlayerRecord {
  readonly accountId: AccountId;
  /** Epoch ms of the last time free-ticket accrual was computed and (if any tickets were due)
   *  granted. `null` before a player's first accrual claim — accrual.mts treats that as "start
   *  the clock now," not "infinite tickets are owed." */
  lastAccrualAt: number | null;
  /** UTC `YYYY-MM-DD` of the last daily bonus claim, or `null` if never claimed. */
  lastDailyBonusDate: string | null;
  /** Consecutive UTC days claimed, ending at `lastDailyBonusDate`. 0 before any claim. */
  dailyBonusStreak: number;
}

/** A fresh `PlayerRecord` for an account that has never been seen before. */
export function newPlayerRecord(accountId: AccountId): PlayerRecord {
  return { accountId, lastAccrualAt: null, lastDailyBonusDate: null, dailyBonusStreak: 0 };
}

/**
 * Migrate a guest `PlayerRecord`'s non-ledger state into a durable one. Ledger balances
 * migrate separately (a caller transfers the guest's TICKET/CHIP balances into the durable
 * account via `transferEnergy`, or — more honestly, given a guest's tickets/chips were never
 * meant to be a claim on anything — simply re-derives them from the same accrual/streak state
 * carried over here, letting the durable account re-accrue on its own clock). Refuses (returns
 * `null`) a non-guest source, a self-migration, or a durable target that already has state —
 * mirroring the guard sequencing `@red-cup-engineering/energy-bank/accounts#createIdentityFederation`
 * documents for the general case. This is the seam: no server route calls this yet.
 */
export function migrateGuestPlayer(guest: PlayerRecord, durableAccountId: AccountId): PlayerRecord | null {
  if (!isGuest(guest.accountId) || guest.accountId === durableAccountId) return null;
  return { ...guest, accountId: durableAccountId };
}
