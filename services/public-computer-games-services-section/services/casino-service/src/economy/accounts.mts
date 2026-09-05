/**
 * accounts.mts — casino-namespaced identity, a thin wrapper over
 * `@red-cup-engineering/energy-bank/accounts`. Durable-account login is a handle+passphrase
 * scheme, the shape flickering-delve-service's `Accounts#authenticate` already established on
 * this shelf: first login for a handle sets `PlayerRecord.secretHash` (claims it), a later
 * login must match (`AuthError` otherwise) — see casino-economy.mts#loginAccount for the wire.
 */
import { guestAccountId, durableAccountId, isGuest, energyAccountPath } from '@red-cup-engineering/energy-bank/accounts';
import { NAMESPACE } from './config.mts';

/** Thrown by casino-economy.mts#loginAccount on an empty or non-matching passphrase. */
export class AuthError extends Error {}

export type AccountId = string;

/** A casino guest account id, derived from an opaque client-minted key (e.g. a value the
 *  client stores in localStorage and presents on every visit). */
export function casinoGuestId(clientKey: string): AccountId {
  return guestAccountId(NAMESPACE, clientKey);
}

/** A casino durable account id, derived from a chosen handle — see casino-economy.mts's
 *  `loginAccount` for the login route wired to it. */
export function casinoDurableId(handle: string): AccountId {
  return durableAccountId(NAMESPACE, handle);
}

export { isGuest, energyAccountPath };

/** Everything about a player that is *not* a ledger balance: when their free-ticket faucet
 *  last accrued, their daily-bonus streak state, and (durable accounts only) their login
 *  secret hash. Ledger balances (tickets, chips held) are never cached here — they are always
 *  read fresh from `ledger.audit()`, per this whole package's "the trace is the audit"
 *  discipline (see energy-bank's ledger.mjs header). */
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
  /** Salted hash of a durable account's chosen passphrase (`hashSecret`), set on first login —
   *  `null` for every guest, and for a durable account never yet logged into. */
  secretHash: string | null;
}

/** A fresh `PlayerRecord` for an account that has never been seen before. */
export function newPlayerRecord(accountId: AccountId): PlayerRecord {
  return { accountId, lastAccrualAt: null, lastDailyBonusDate: null, dailyBonusStreak: 0, secretHash: null };
}

/**
 * Migrate a guest `PlayerRecord`'s non-ledger state into a durable one. Ledger balances
 * migrate separately (casino-economy.mts's `claimGuestIntoAccount` calls `transferEnergy` for
 * the guest's TICKET/CHIP balances after this). Refuses (returns `null`) a non-guest source, a
 * self-migration, or a `durable` target that already shows progress (accrual/streak state) —
 * mirroring the guard sequencing `@red-cup-engineering/energy-bank/accounts#createIdentityFederation`
 * documents for the general case. The durable target's own `secretHash` (set at login, before
 * any migration) is always preserved, never overwritten by the guest's (always-`null`) one.
 */
export function migrateGuestPlayer(guest: PlayerRecord, durableAccountId: AccountId, durable?: PlayerRecord): PlayerRecord | null {
  if (!isGuest(guest.accountId) || guest.accountId === durableAccountId) return null;
  if (durable !== undefined && (durable.lastAccrualAt !== null || durable.lastDailyBonusDate !== null || durable.dailyBonusStreak > 0)) return null;
  return { ...guest, accountId: durableAccountId, secretHash: durable?.secretHash ?? null };
}
