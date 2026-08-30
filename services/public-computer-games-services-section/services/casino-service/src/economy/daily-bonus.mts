/**
 * daily-bonus.mts — one free ticket claim per UTC calendar day, with an escalating streak.
 *
 * Uses `@red-cup-engineering/cartridge/seed`'s `utcDateString` for "today" — the same
 * timezone-independent UTC-calendar-day primitive every daily-seeded game on the shelf already
 * uses (see parlor-service's `dailySeed`), so "today" here means the same thing it means
 * everywhere else in the fleet. As with accrual.mts, the clock is always an injected `Date`;
 * nothing here reads `Date.now()`.
 */
import { utcDateString } from '@red-cup-engineering/cartridge/seed';
import { dailyBonusTickets } from './config.mts';

export interface DailyBonusState {
  readonly lastClaimDate: string | null; // YYYY-MM-DD, UTC
  readonly streak: number;
}

export interface DailyBonusResult {
  /** Whether a claim was actually granted. `false` means "already claimed today" — the caller
   *  should treat this as a normal, expected outcome (idempotent no-op), not an error. */
  readonly claimed: boolean;
  readonly ticketsGranted: number;
  readonly newStreak: number;
  readonly newLastClaimDate: string;
}

function yesterday(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number) as [number, number, number];
  const asDate = new Date(Date.UTC(y, m - 1, d));
  asDate.setUTCDate(asDate.getUTCDate() - 1);
  return utcDateString(asDate);
}

/**
 * Pure: given a player's daily-bonus state and the current instant, decide whether today's
 * claim is available and, if so, what streak day it lands on. Consecutive UTC days extend the
 * streak; any gap (including claiming again the same day, which this treats as "not a gap,
 * just already done") resets it to 1 on the next genuinely new day.
 */
export function computeDailyBonus(state: DailyBonusState, now: Date): DailyBonusResult {
  const today = utcDateString(now);
  if (state.lastClaimDate === today) {
    return { claimed: false, ticketsGranted: 0, newStreak: state.streak, newLastClaimDate: today };
  }
  const isConsecutive = state.lastClaimDate !== null && state.lastClaimDate === yesterday(today);
  const newStreak = isConsecutive ? state.streak + 1 : 1;
  return {
    claimed: true,
    ticketsGranted: dailyBonusTickets(newStreak),
    newStreak,
    newLastClaimDate: today,
  };
}
