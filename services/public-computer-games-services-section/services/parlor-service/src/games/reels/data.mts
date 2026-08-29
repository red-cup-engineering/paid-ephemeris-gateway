/**
 * data.mts — Fair Spin's three reels and paytable, as pure data. This module owns two things
 * only: the symbol strips (handed straight to `@red-cup-engineering/parlor-kernel/reels`'s `createReels`)
 * and `payoutFor`, a pure `(symbols: string[]) => payout` function shaped exactly for
 * `@red-cup-engineering/parlor-kernel/odds`'s `computeSlotRTP`. Nothing here computes an odds figure
 * itself — that is `disclosure.mts`'s job, kept separate so "the data" and "the math over the
 * data" stay two different files a reader can audit independently.
 *
 * The three strips are deliberately NOT identical (a real slot's reels rarely are) — reel A is
 * cherry-heavy, reel C is bell-heavy — so a symbol's true hit odds genuinely differ per reel,
 * which is exactly what `symbolHitOdds` (kernel) and the disclosure panel exist to show
 * honestly rather than let a player assume "one strip, three copies."
 *
 * `RTP` and `PAYOUT_TABLE` below are not asserted design targets, they are the actual, tested
 * output of `computeSlotRTP(REELS, payoutFor, 1)` run against this exact data — see
 * `disclosure.test.mts`'s differential test and this package's `README.md`, both of which quote
 * the number this file's data actually produces, not a number chosen first and reverse-fit to.
 */
import { createReels } from '@red-cup-engineering/parlor-kernel/reels';

export const SYMBOLS = ['cherry', 'lemon', 'bell', 'star', 'seven'];

const REEL_A = [...Array(5).fill('cherry'), ...Array(3).fill('lemon'), ...Array(2).fill('bell'), 'star', 'seven'];
const REEL_B = [...Array(4).fill('cherry'), ...Array(4).fill('lemon'), ...Array(2).fill('bell'), 'star', 'seven'];
const REEL_C = [...Array(4).fill('cherry'), ...Array(3).fill('lemon'), ...Array(3).fill('bell'), 'star', 'seven'];

/** The machine's three physical reel strips, in spin order. Frozen by `createReels` — no
 *  caller, including this module's own consumers, can mutate a strip after construction. */
export const REELS = createReels([REEL_A, REEL_B, REEL_C]);

/** Payout multipliers (in bet units), ascending with rarity — the machine's whole paytable in
 *  one table, so a reviewer can read it without hunting through `payoutFor`'s branches. */
export const PAYOUT_TABLE = [
  { rule: 'three sevens', multiplier: 100 },
  { rule: 'three stars', multiplier: 75 },
  { rule: 'three bells', multiplier: 10 },
  { rule: 'three lemons', multiplier: 5 },
  { rule: 'three cherries', multiplier: 3 },
  { rule: 'exactly two cherries', multiplier: 2 },
];

/** The paytable as a pure function of a landed 3-symbol combination, exactly the shape
 *  `computeSlotRTP` requires. Every branch here is one row of `PAYOUT_TABLE` above — the table
 *  and the function are kept manually in sync (a small, closed set of rules; `disclosure.test.mts`
 *  checks every named rule against a hand-built combination that triggers it, so drift between
 *  the two would fail a test, not just look inconsistent on inspection). */
export function payoutFor([a, b, c]) {
  if (a === 'seven' && b === 'seven' && c === 'seven') return 100;
  if (a === 'star' && b === 'star' && c === 'star') return 75;
  if (a === 'bell' && b === 'bell' && c === 'bell') return 10;
  if (a === 'lemon' && b === 'lemon' && c === 'lemon') return 5;
  if (a === 'cherry' && b === 'cherry' && c === 'cherry') return 3;
  const cherries = [a, b, c].filter((s) => s === 'cherry').length;
  if (cherries === 2) return 2;
  return 0;
}
