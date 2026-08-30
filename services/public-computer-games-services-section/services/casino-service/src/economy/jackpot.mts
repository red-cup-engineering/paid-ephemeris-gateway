/**
 * jackpot.mts — the shared progressive jackpot pool as a house account. Game logic (what event
 * actually triggers a payout, how a progressive's headline number is displayed, the qwzspace
 * broadcast of a big win) is explicitly out of scope for this pass — this module only exposes
 * the credit/debit primitives a future game engine composes.
 *
 * The pool is an ordinary energy-bank pool account (`transfer#poolAccountId`), so it carries a
 * real `liabilities:energy:*` CHIP balance subject to the same `checkNoNegativeBalances`
 * invariant as any player: the jackpot can never be paid out past what it actually holds. It is
 * funded *only* by rake off real chip wagers (`rakeIntoJackpot`) or an explicit house seed
 * (`seedJackpot`, for cold-start — a brand-new jackpot pool with a real bet-generated pool of $0
 * looks broken, not exciting) — never by real money, and it never pays out real money:
 * `payoutJackpot` moves CHIPS to a winner's own CHIP balance, the same play currency every
 * other chip transaction uses. This is the concrete enforcement of the house's one hard line
 * ("no real-money wagering, no real-money payouts") at the jackpot's own boundary, not just a
 * README claim: nothing in this file imports `@red-cup-engineering/energy-bank/settlement` or
 * touches an `income:*`/`expenses:payout:*`/`assets:cash:*` account.
 */
import { transferEnergy, fundAccount, poolAccountId } from '@red-cup-engineering/energy-bank/transfer';
import type { Ledger } from '@red-cup-engineering/energy-bank/ledger';
import { CHIP, JACKPOT_POOL_LOCAL_ID, NAMESPACE } from './config.mts';
import type { AccountId } from './accounts.mts';

/** The jackpot pool's own account id — a bare id, not yet wrapped in
 *  `liabilities:energy:`; every energy-bank transfer function below wraps it itself. */
export const jackpotAccountId: AccountId = poolAccountId(NAMESPACE, JACKPOT_POOL_LOCAL_ID);

/** A house seed account for cold-starting the jackpot display value. `equity:*`, per this
 *  package's house-faucet convention (see config.mts), so it is expected to run negative and
 *  never trips `checkNoNegativeBalances`. */
export const JACKPOT_SEED_ACCOUNT = 'equity:casino:jackpot-seed';

/**
 * Rake `rakeAmount` CHIPs off a player's wager into the jackpot pool. This is a plain transfer
 * between two `liabilities:energy:*` accounts — chips already in the economy simply move from
 * the player to the shared pool, so total chips outstanding is conserved by construction (see
 * jackpot.test.mts's conservation check). Throws exactly as `transferEnergy` does if the player
 * cannot cover the rake (a caller wiring a real table should always take the rake as part of a
 * wager amount the player has already been confirmed to hold, never as a surprise on top of
 * it).
 */
export function rakeIntoJackpot(ledger: Ledger, fromAccountId: AccountId, rakeAmount: number, ref: string, date: string): void {
  if (rakeAmount <= 0) return; // a wager below the rake's minimum granularity contributes nothing, not an error
  transferEnergy(ledger, fromAccountId, jackpotAccountId, String(rakeAmount), CHIP, ref, date);
}

/** House-seed the jackpot pool with `amount` CHIPs at cold start, or as a live-ops top-up.
 *  Never called by ordinary play — a seam for an operator action, not a player-facing API. */
export function seedJackpot(ledger: Ledger, amount: number, ref: string, date: string): void {
  fundAccount(ledger, JACKPOT_SEED_ACCOUNT, jackpotAccountId, String(amount), CHIP, ref, date, `jackpot seed: +${amount} CHIP`);
}

/**
 * Pay `amount` CHIPs out of the jackpot pool to a winner's own CHIP balance. A plain transfer
 * between two `liabilities:energy:*` accounts, so — like `rakeIntoJackpot` — this conserves
 * total chips outstanding; it is a *jackpot* payout in the play-currency sense the genre uses
 * the word, never a real-money payout. Throws if the pool cannot cover `amount` (the
 * no-negative-balance invariant on the pool account, enforced at write time by
 * `transferEnergy` itself).
 */
export function payoutJackpot(ledger: Ledger, toAccountId: AccountId, amount: number, ref: string, date: string): void {
  transferEnergy(ledger, jackpotAccountId, toAccountId, String(amount), CHIP, ref, date, {
    narration: `jackpot payout: ${jackpotAccountId} -> ${toAccountId}`,
  });
}

/** The jackpot pool's current CHIP balance, read the same way every other balance in this
 *  package is read: fresh from `ledger.audit()`, never a cached counter. */
export function jackpotBalance(ledger: Ledger): number {
  const { balances } = ledger.audit();
  const raw = balances[`liabilities:energy:${jackpotAccountId}`]?.[CHIP] ?? '0';
  return Number(raw);
}
