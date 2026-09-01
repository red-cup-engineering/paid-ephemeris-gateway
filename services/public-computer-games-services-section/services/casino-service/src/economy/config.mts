/**
 * config.mts — every tunable constant the casino economy reads, in one place, so a later pass
 * (game balancing, live-ops, a VIP-tier rework) has one file to open rather than a grep across
 * the economy modules. Nothing here reads the ambient clock or randomness; every constant is a
 * plain number or string.
 *
 * Two instruments: TICKETS (the entry currency — regenerate on a timer, purchasable in bundles,
 * gate access to a table) and CHIPS (the play currency — what a player actually wagers at a
 * table once they've bought in). Per the 2026-08-29 house direction: "we cannot allow
 * real-money wagers, [but] we can require tickets-for-play, and tickets be generated on a timer
 * or purchased in bundles." Neither commodity is ever redeemable for real money in either
 * direction — see catalog-entry.json's honest energyBankWrapped/cartridgeWrapped fields and the
 * jackpot module's header for how that constraint is enforced in code, not just in prose.
 */

/** Ledger commodity codes. Kept short and upper-case, matching energy-bank's own `"ENERGY"`
 *  convention and its examples (`"USD"`, `"HIVE"`) — a commodity code, not a display label. */
export const TICKET = 'TICKET';
export const CHIP = 'CHIP';

/** The energy-bank account namespace for every casino identity (`guestAccountId`/
 *  `durableAccountId`'s first argument) — see cartridge manifest's `energy.accountNamespace`. */
export const NAMESPACE = 'casino';

// ── ticket accrual ──────────────────────────────────────────────────────────────────

/** How often a new free ticket regenerates, in milliseconds. 30 minutes, per the house
 *  direction's own example ("tickets be generated on a timer"). */
export const TICKET_ACCRUAL_PERIOD_MS = 30 * 60 * 1000;

/** The most free tickets a player can bank from timer accrual alone. Accrual beyond this cap
 *  is dropped, not queued — see accrual.mts for the exact discard rule. Buying a ticket bundle
 *  can still push a balance above this cap; the cap only throttles the *free* faucet. */
export const TICKET_ACCRUAL_CAP = 5;

/** The house account `fundAccount` draws from for every free ticket grant (timer accrual and
 *  the daily bonus). An `equity:*` path, by the ledger's own convention, is allowed to run
 *  negative without tripping `checkNoNegativeBalances` (which scopes to `liabilities:energy:*`
 *  by default) — it represents the house's own issuance capacity, not a real balance anyone
 *  can overdraw. */
export const TICKET_FAUCET_ACCOUNT = 'equity:casino:ticket-faucet';

// ── buy-in: tickets spent, chips granted ────────────────────────────────────────────

/** One buy-in: spend this many tickets, receive this many fresh chips at the table. This is
 *  the concrete shape of "tickets-for-play" — a ticket is not itself wagered, it is the price
 *  of admission to a chip stack. */
export const BUY_IN_TICKET_COST = 1;
export const BUY_IN_CHIP_GRANT = 500;

/** Where spent buy-in tickets go (an `expenses:*` sink, never `income:*`/`expenses:payout:*`,
 *  so ordinary spend never touches the payout invariant) and where buy-in chips are issued
 *  from (another `equity:*` faucet, chips being a house-issued play token, never
 *  redeemable). */
export const TICKET_ENTRY_SINK_ACCOUNT = 'expenses:in-game-use:casino:ticket-entry';
export const CHIP_ISSUANCE_ACCOUNT = 'equity:casino:chip-issuance';

// ── bundle purchases ────────────────────────────────────────────────────────────────

/** Where bundle contents (tickets or chips) are issued from once a settlement clears. Kept
 *  distinct from CHIP_ISSUANCE_ACCOUNT / TICKET_FAUCET_ACCOUNT so the journal can distinguish
 *  "player paid real money for this" from "the house gave this away" at a glance, even though
 *  both are equity-side faucets by the same accounting logic. */
export const BUNDLE_ISSUANCE_ACCOUNT = 'equity:casino:bundle-issuance';

// ── daily bonus ─────────────────────────────────────────────────────────────────────

/** One claim per UTC calendar day (see daily-bonus.mts, which uses
 *  `@red-cup-engineering/cartridge/seed`'s `utcDateString`). The streak escalates linearly up
 *  to a plateau, then holds — escalating forever would make the reward the only thing worth
 *  logging in for, plateauing keeps it a nudge rather than the whole game. */
export const DAILY_BONUS_BASE_TICKETS = 1;
export const DAILY_BONUS_STEP_TICKETS = 1;
export const DAILY_BONUS_MAX_STREAK_DAY = 7; // streak day at which the bonus plateaus
export const DAILY_BONUS_FAUCET_ACCOUNT = 'equity:casino:daily-bonus';

/** `dailyBonusTickets(streakDay)` — streak day 1 grants BASE, each day after adds STEP, capped
 *  at the plateau. A pure function of the (already-computed) streak day, kept here next to the
 *  constants it closes over so daily-bonus.mts's own math is a one-line call. */
export function dailyBonusTickets(streakDay: number): number {
  const day = Math.min(Math.max(1, Math.trunc(streakDay)), DAILY_BONUS_MAX_STREAK_DAY);
  return DAILY_BONUS_BASE_TICKETS + DAILY_BONUS_STEP_TICKETS * (day - 1);
}

// ── jackpot pool ────────────────────────────────────────────────────────────────────

/** The jackpot pool's own energy-bank pool-account id (see `@red-cup-engineering/energy-bank
 *  /transfer#poolAccountId`), always denominated in CHIP — chips are the only instrument ever
 *  wagered. */
export const JACKPOT_POOL_LOCAL_ID = 'jackpot';

/** The default rake taken off the top of a chip wager into the jackpot pool, in basis points
 *  (1/100 of a percent) — 250 bps = 2.5%. A specific game/table can pass its own rake to
 *  `placeWager`; this is only the shelf-wide default. */
export const DEFAULT_JACKPOT_RAKE_BPS = 250;

// ── table pot bankroll (player-vs-house games, e.g. blackjack) ─────────────────────────

/** Where a table's own pot/bankroll is cold-start seeded from — the same "a brand-new pool
 *  with a real $0 looks broken, not exciting" reasoning `jackpot.mts`'s `JACKPOT_SEED_ACCOUNT`
 *  documents, applied to a table pot instead of the jackpot pool. `placeWager`/`resolveWager`
 *  (see wager.mts) are a pari-mutuel-shaped primitive by default — a pot only ever holds what
 *  wagers deposited into it, fine when winners are paid from losers' own stakes. A
 *  player-vs-house table (blackjack: a win pays back *more* than the single wager that funded
 *  it, e.g. blackjack's 3:2) needs its pot pre-funded like a real house bankroll before the
 *  first hand can ever pay out a win — see `CasinoEconomy#seedTablePot`. `equity:*`, per this
 *  package's house-faucet convention, so it is expected to run negative and never trips
 *  `checkNoNegativeBalances`. */
export const TABLE_BANKROLL_SEED_ACCOUNT = 'equity:casino:table-bankroll';

// ── ticket bundle / chip bundle catalog lives in bundles.mts, not here ─────────────────
// (SKUs are data with their own shape — see bundles.mts's SKU_CATALOG — not scalar constants,
// so they get their own module rather than crowding this one.)
