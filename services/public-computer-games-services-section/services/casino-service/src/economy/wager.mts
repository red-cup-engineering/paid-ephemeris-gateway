/**
 * wager.mts — the generic chip-wager primitive a game engine composes on: take a bet off a
 * player's CHIP balance, skim a jackpot rake off the top, park the rest in a table pot account,
 * then resolve the round by paying some or all of that pot back out. No game rules live here —
 * no cards, no reels, no dice — only the money-movement shape every wagering game on this shelf
 * will eventually share, so a future game engine (a later pass) has one audited primitive to
 * call instead of five reimplementations of "take a bet, skim the rake, pay the winner."
 *
 * `placeWager`/`resolveWager` never touch tickets, never touch a settlement backend, and never
 * post to `income:*`/`expenses:payout:*`/`assets:cash:*` — they only ever move CHIPS between
 * `liabilities:energy:*` accounts (a player, the jackpot pool, a table's own pot account), so
 * total chips outstanding is conserved across a full place+resolve cycle whenever the resolve
 * pays out everything the pot holds (see wager.test.mts's conservation check) and can only
 * ever *shrink* the circulating total when a jackpot rake diverts some of it into the pool
 * instead — never invent chips, never destroy them outside that one accounted-for path.
 */
import { transferEnergy, poolAccountId } from '@red-cup-engineering/energy-bank/transfer';
import type { Ledger } from '@red-cup-engineering/energy-bank/ledger';
import { rakeIntoJackpot } from './jackpot.mts';
import { CHIP, NAMESPACE, DEFAULT_JACKPOT_RAKE_BPS } from './config.mts';
import type { AccountId } from './accounts.mts';

const BPS_DENOMINATOR = 10_000;

/** A table's own pot account id — one per table/round identifier the caller chooses, so
 *  concurrent tables never share a pot. Like the jackpot pool, this is an ordinary energy-bank
 *  pool account and so carries a real, never-negative CHIP balance. */
export function tablePotAccountId(tableId: string): AccountId {
  return poolAccountId(NAMESPACE, `table-${tableId}`);
}

export interface PlaceWagerResult {
  readonly potAccount: AccountId;
  /** The amount that actually reached the pot, i.e. `betAmount - rakeAmount`. */
  readonly potAmount: number;
  readonly rakeAmount: number;
}

/**
 * Move `betAmount` CHIPs off `accountId`'s balance: `rakeBps`/10000 of it into the shared
 * jackpot pool, the remainder into the named table's pot. Throws (via `transferEnergy`) if the
 * player cannot cover the bet — callers should check a player's chip balance before offering a
 * bet, but this is the enforced backstop either way.
 */
export function placeWager(
  ledger: Ledger,
  accountId: AccountId,
  tableId: string,
  betAmount: number,
  ref: string,
  date: string,
  rakeBps: number = DEFAULT_JACKPOT_RAKE_BPS,
): PlaceWagerResult {
  if (betAmount <= 0) throw new RangeError(`placeWager: betAmount must be positive, got ${betAmount}`);
  const rakeAmount = Math.floor((betAmount * rakeBps) / BPS_DENOMINATOR);
  const potAmount = betAmount - rakeAmount;
  const potAccount = tablePotAccountId(tableId);

  if (potAmount > 0) {
    transferEnergy(ledger, accountId, potAccount, String(potAmount), CHIP, `${ref}:pot`, date, {
      narration: `wager: ${accountId} -> ${potAccount}`,
    });
  }
  if (rakeAmount > 0) {
    rakeIntoJackpot(ledger, accountId, rakeAmount, `${ref}:rake`, date);
  }
  return { potAccount, potAmount, rakeAmount };
}

/**
 * Pay `amount` CHIPs out of a table's pot to a winner's own CHIP balance — win, split-pot, or
 * refund are all just this call with a different amount/winner. Throws if the pot cannot cover
 * `amount` (the pot's own no-negative-balance invariant, enforced at write time). Resolving for
 * less than the full pot (e.g. the house keeps a residual, or a multi-way split leaves rounding
 * dust) is legal — the seam this deliberately leaves for a future game engine's own settlement
 * rules, not this module's concern.
 */
export function resolveWager(ledger: Ledger, tableId: string, toAccountId: AccountId, amount: number, ref: string, date: string): void {
  if (amount <= 0) return;
  const potAccount = tablePotAccountId(tableId);
  transferEnergy(ledger, potAccount, toAccountId, String(amount), CHIP, ref, date, {
    narration: `wager resolve: ${potAccount} -> ${toAccountId}`,
  });
}
