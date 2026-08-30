/**
 * slots/rules.mts — "Tideline Treasures" house rules as data, exactly the discipline
 * `blackjack/rules.mts` establishes for this service ("every house rule as data... never
 * scattered `if`s in the engine"): the reel strip, the paytable, the 20 payline patterns, the
 * free-spin award schedule, and the jackpot's own trigger pattern all live here, keyed by the
 * cartridge `configId` a machine is created with. `engine.mts` never hard-codes a symbol name, a
 * payout number, or a payline shape — every one of those comes from a `SlotsRules` object here,
 * so retuning the game (a paytable pass, a new reel strip) never touches the reducer.
 *
 * Symbol roster (exactly the 8 drawables the client registers — see web/js/slots.mjs): `wave`,
 * `anchor`, `starfish`, `gem`, `pearl`, `cowrie` (the six paying symbols, low to high — the shell
 * IS the brand, so it is deliberately the top *regular* symbol), `wild` (substitutes for any
 * paying symbol, never the scatter; an all-wild line pays under its own top-tier entry below),
 * and `scatter` (pays anywhere on the grid per `SCATTER_PAYTABLE`, and triggers/retriggers free
 * spins — see `FREE_SPIN_AWARDS`).
 *
 * One shared reel strip is used for all five physical reels — a deliberate simplicity choice
 * (every reel drawn from the same, single published strip, rather than five differently-weighted
 * strips a player would have to trust individually) that keeps this rules file auditable at a
 * glance: `symbolHitOdds`/`symbolAtRowOdds` (parlor-kernel) computed against this one array *is*
 * every reel's own odds.
 *
 * The exact RTP/odds this reel+paytable+payline set produces are never hand-typed here — they
 * are computed by `ev.mts#computeHouseMath` via `@red-cup-engineering/parlor-kernel/paylines`'s
 * exact-enumeration `computeMultiLineSlotRTP`/`computeJackpotOdds`, the same "a number here can
 * never be one the data didn't produce" bar `symbolHitOdds` sets for parlor-kernel's own reels.
 */
import { createReel } from '@red-cup-engineering/parlor-kernel/reels';
import type { Reel } from '@red-cup-engineering/parlor-kernel/reels';
import type { Payline, Paytable, ScatterPaytable } from '@red-cup-engineering/parlor-kernel/paylines';

export const ROWS = 3;
export const REEL_COUNT = 5;

export const WILD_SYMBOL = 'wild';
export const SCATTER_SYMBOL = 'scatter';
export const PAYING_SYMBOLS = ['wave', 'anchor', 'starfish', 'gem', 'pearl', 'cowrie'] as const;
export type PayingSymbol = (typeof PAYING_SYMBOLS)[number];

/** The one shared 16-symbol reel strip every physical reel spins — see this file's header for
 *  why one strip, not five. Frozen by `createReel` (parlor-kernel's own defensive-copy
 *  convention), so nothing downstream can mutate the published strip. */
const SHARED_STRIP = [
  'wave', 'wave', 'wave', 'wave', 'wave',
  'anchor', 'anchor', 'anchor',
  'starfish', 'starfish',
  'gem', 'gem',
  'pearl',
  'cowrie',
  'wild',
  'scatter',
];

export interface SlotsRules {
  readonly id: string;
  readonly displayName: string;
  readonly rows: number;
  readonly reelCount: number;
  /** One reel strip per physical reel — every entry is `SHARED_STRIP` today (see header), but
   *  kept as a real per-reel array (not a single shared reel repeated implicitly) so a future
   *  ruleset genuinely CAN give reel 3 its own weighting without changing this shape. */
  readonly reels: readonly Reel[];
  readonly paylines: readonly Payline[];
  readonly paytable: Paytable;
  readonly scatterPaytable: ScatterPaytable;
  readonly wilds: readonly string[];
  readonly scatter: string;
  readonly scatterTriggerCount: number;
  /** Free spins awarded the instant `scatterCount` scatters land anywhere on the grid — during
   *  the base game (a trigger) or during an already-running bonus (a retrigger, additive to
   *  whatever spins remain). */
  readonly freeSpinAwards: Readonly<Record<number, number>>;
  /** Payout multiplier applied to every line/scatter payout won during a free spin (never during
   *  the base game) — the standard "free spins pay more" bonus-round sweetener. */
  readonly freeSpinMultiplier: number;
  /** The payline pattern (row index per reel) that must show `wild` on every reel to hit the
   *  progressive jackpot — line 0 (the straight center line) by convention, so a jackpot hit is
   *  always visibly "the center row, all wild" on the client's own grid. */
  readonly jackpotPattern: Payline;
  readonly jackpotSymbol: string;
  readonly minBetPerLine: number;
  readonly maxBetPerLine: number;
  readonly defaultBetPerLine: number;
}

/** The 20 standard payline patterns (row index per reel, 0 = top): straights, Vs, zigzags — the
 *  same shape family most real 5x3 video slots publish, chosen so every line is visually legible
 *  on the client's own grid, not merely mathematically valid. */
export const PAYLINES: readonly Payline[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 0, 2, 0, 0],
];

/** The published paytable: run length (3/4/5, always anchored at reel 0) -> payout multiplier of
 *  `betPerLine`. Tuned (see `ev.mts`'s own header and the service README's "Math" section for the
 *  exact tuning method) so the reel+paytable+payline combination's exact RTP, computed by
 *  enumeration, lands in the honest-but-commercial ~92-96% band once the free-spin bonus's exact
 *  analytic contribution is added — see `ev.mts#computeHouseMath`. */
export const PAYTABLE: Paytable = {
  wave: { 3: 2, 4: 4, 5: 9 },
  anchor: { 3: 3, 4: 7, 5: 15 },
  starfish: { 3: 4, 4: 11, 5: 31 },
  gem: { 3: 7, 4: 20, 5: 58 },
  pearl: { 3: 9, 4: 30, 5: 92 },
  cowrie: { 3: 15, 4: 58, 5: 195 },
  wild: { 3: 30, 4: 92, 5: 611 },
};

/** Scatter pay (anywhere on the grid) as a multiplier of the spin's *total* bet, per the standard
 *  slot convention `@red-cup-engineering/parlor-kernel/paylines#evaluateSpin` itself documents. */
export const SCATTER_PAYTABLE: ScatterPaytable = { 3: 1, 4: 4, 5: 20 };

export const FREE_SPIN_AWARDS: Readonly<Record<number, number>> = { 3: 6, 4: 10, 5: 15 };
export const FREE_SPIN_MULTIPLIER = 2;

const BASE: SlotsRules = {
  id: 'default',
  displayName: 'Tideline Treasures',
  rows: ROWS,
  reelCount: REEL_COUNT,
  reels: Array.from({ length: REEL_COUNT }, () => createReel(SHARED_STRIP)),
  paylines: PAYLINES,
  paytable: PAYTABLE,
  scatterPaytable: SCATTER_PAYTABLE,
  wilds: [WILD_SYMBOL],
  scatter: SCATTER_SYMBOL,
  scatterTriggerCount: 3,
  freeSpinAwards: FREE_SPIN_AWARDS,
  freeSpinMultiplier: FREE_SPIN_MULTIPLIER,
  jackpotPattern: [1, 1, 1, 1, 1],
  jackpotSymbol: WILD_SYMBOL,
  minBetPerLine: 1,
  maxBetPerLine: 50,
  defaultBetPerLine: 5,
};

export const SLOTS_RULESETS: Readonly<Record<string, SlotsRules>> = {
  default: BASE,
};

export const DEFAULT_SLOTS_RULESET_ID = 'default';

export function resolveSlotsRules(configId?: string): SlotsRules {
  const id = configId === undefined || configId.length === 0 ? DEFAULT_SLOTS_RULESET_ID : configId;
  const rules = SLOTS_RULESETS[id];
  if (rules === undefined) {
    throw new RangeError(`slots: unknown ruleset configId "${id}"`);
  }
  return rules;
}

export function freeSpinAwardFor(rules: SlotsRules, scatterCount: number): number {
  return rules.freeSpinAwards[scatterCount] ?? rules.freeSpinAwards[rules.reelCount] ?? 0;
}

export function totalBetFor(rules: SlotsRules, betPerLine: number): number {
  return betPerLine * rules.paylines.length;
}
