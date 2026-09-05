/**
 * accrual.mts — lazy, timer-free ticket regeneration.
 *
 * No `setInterval` anywhere in this module (or this package): `computeAccrual` is a pure
 * function of `(lastAccrualAt, currentBalance, now)` that says how many free tickets are owed
 * right now and what the new "clock" timestamp should be. The caller (claimAccrual, below, or
 * casino-economy.mts's `claimTickets`) is the only place that touches a ledger or a clock —
 * everything that decides *how many* is a pure computation, directly unit-testable with
 * fabricated timestamps and no fake timers.
 *
 * The discard rule for the cap: accrual does not bank unclaimed time past the cap. If a
 * player's balance is already at or above TICKET_ACCRUAL_CAP when they claim, the clock resets
 * to `now` with zero tickets granted — elapsed time beyond what the cap can hold is simply
 * lost, exactly like the "energy" mechanic in the incumbent social-casino genre this economy is
 * built to meet. This keeps `computeAccrual` a total function with no unbounded-queue state to
 * carry between calls.
 */
import { TICKET_ACCRUAL_PERIOD_MS, TICKET_ACCRUAL_CAP } from './config.mts';

export interface AccrualState {
  /** Epoch ms of the last accrual computation, or `null` if this player has never had one
   *  (their first claim starts the clock at `now` and grants nothing — there is no owed time
   *  before a clock exists). */
  readonly lastAccrualAt: number | null;
  /** The player's current TICKET ledger balance, as an integer. */
  readonly currentBalance: number;
}

export interface AccrualResult {
  /** How many free tickets to grant right now (0 if none are due, or the balance is already at
   *  cap). */
  readonly ticketsToGrant: number;
  /** The new `lastAccrualAt` to persist, whether or not any tickets were granted. */
  readonly newLastAccrualAt: number;
  /** How many whole accrual periods remain un-elapsed toward the *next* ticket, purely for a
   *  client progress bar — not used by any accounting decision. */
  readonly msUntilNextTicket: number;
}

/** Pure: given a player's accrual clock and current ticket balance, at instant `now`, how many
 *  tickets are owed and what the new clock should read. Never mutates anything, never reads
 *  `Date.now()` — `now` is always the caller's own clock reading. */
export function computeAccrual(state: AccrualState, now: number): AccrualResult {
  if (state.lastAccrualAt === null) {
    // No clock yet: start it now, grant nothing. There is no "owed since account creation"
    // debt — a brand-new player starts exactly where the free-ticket faucet would leave them
    // after their most recent claim, which is "just claimed, next one in a full period."
    return { ticketsToGrant: 0, newLastAccrualAt: now, msUntilNextTicket: TICKET_ACCRUAL_PERIOD_MS };
  }

  const headroom = Math.max(0, TICKET_ACCRUAL_CAP - state.currentBalance);
  if (headroom === 0) {
    // Already at (or somehow above, e.g. from a purchased bundle) the free-accrual cap: the
    // faucet doesn't bank time it can't use. Reset the clock so a future claim, once the
    // balance drops, starts counting from now rather than replaying a huge backlog instantly.
    return { ticketsToGrant: 0, newLastAccrualAt: now, msUntilNextTicket: TICKET_ACCRUAL_PERIOD_MS };
  }

  const elapsedMs = Math.max(0, now - state.lastAccrualAt);
  const periodsElapsed = Math.floor(elapsedMs / TICKET_ACCRUAL_PERIOD_MS);
  const ticketsToGrant = Math.min(periodsElapsed, headroom);

  if (ticketsToGrant === 0) {
    return {
      ticketsToGrant: 0,
      newLastAccrualAt: state.lastAccrualAt,
      msUntilNextTicket: TICKET_ACCRUAL_PERIOD_MS - elapsedMs,
    };
  }

  // Advance the clock by exactly the periods actually granted (not to `now`), so partial
  // progress toward the *next* ticket beyond what was granted is preserved rather than
  // discarded — e.g. claiming at 65 minutes with a 30-minute period grants 2 and leaves 5
  // minutes of progress toward the third, not zero.
  const newLastAccrualAt = state.lastAccrualAt + ticketsToGrant * TICKET_ACCRUAL_PERIOD_MS;
  return {
    ticketsToGrant,
    newLastAccrualAt,
    msUntilNextTicket: TICKET_ACCRUAL_PERIOD_MS - (now - newLastAccrualAt),
  };
}
