/**
 * yacht/odds.mts — category EVs computed live, recomputed after every roll and every hold
 * toggle (never a static table). For each of the 12 standard categories, two figures:
 *
 *  - `scoreIfCommitNow` — the exact, deterministic score `@red-cup-engineering/parlor-kernel/tally`'s
 *    `scoreYachtCategory` gives the dice sitting on the table right now.
 *  - `rerollEV` — the exact expected score for that category if the currently-*unheld* dice
 *    are rerolled once more, by enumerating all `6 ** freeCount` equally-likely outcomes of
 *    just the free dice (at most `6 ** 5 = 7,776` — small enough to walk exactly, the same
 *    discipline `@red-cup-engineering/parlor-kernel/odds` uses for its own exact figures) and averaging
 *    `scoreYachtCategory` over them. `null` once no rerolls remain (nothing left to average
 *    over — `scoreIfCommitNow` is the only honest figure left).
 *
 * Deliberate, stated scope line: `rerollEV` values the *next* roll only, not an optimal
 * multi-roll lookahead (e.g. "reroll now, then reroll again optimally, then score the best
 * category") — the same one-step-ahead grounding `pig/odds.mts` and `farkle/odds.mts` use for
 * their own EV figures, not a full game-tree solver.
 */
import { scoreYachtCategory } from '@red-cup-engineering/parlor-kernel/tally';
import { YACHT_RULES, type YachtCategory } from './rules.mts';

function* pipTuples(sides: number, length: number): Generator<number[]> {
  if (length === 0) {
    yield [];
    return;
  }
  const digits = new Array(length).fill(1);
  const total = sides ** length;
  for (let i = 0; i < total; i++) {
    yield digits.slice();
    for (let pos = length - 1; pos >= 0; pos--) {
      if ((digits[pos] as number) < sides) {
        digits[pos] = (digits[pos] as number) + 1;
        break;
      }
      digits[pos] = 1;
    }
  }
}

export interface CategoryLiveEV {
  readonly category: YachtCategory;
  readonly scoreIfCommitNow: number;
  readonly rerollEV: number | null;
  readonly alreadyScored: boolean;
}

export function categoryLiveEVs(
  dice: readonly number[],
  held: readonly boolean[],
  rollsUsed: number,
  scoredCategories: ReadonlySet<YachtCategory> = new Set(),
): CategoryLiveEV[] {
  const rerollsRemaining = YACHT_RULES.maxRolls - rollsUsed;
  const freeIndices = held.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);

  return YACHT_RULES.categories.map((category) => {
    const scoreIfCommitNow = scoreYachtCategory(dice, category);
    const alreadyScored = scoredCategories.has(category);
    if (rerollsRemaining <= 0 || alreadyScored) {
      return { category, scoreIfCommitNow, rerollEV: null, alreadyScored };
    }
    if (freeIndices.length === 0) {
      return { category, scoreIfCommitNow, rerollEV: scoreIfCommitNow, alreadyScored };
    }
    let total = 0;
    let count = 0;
    for (const combo of pipTuples(YACHT_RULES.sides, freeIndices.length)) {
      const trial = dice.slice();
      freeIndices.forEach((idx, k) => {
        trial[idx] = combo[k] as number;
      });
      total += scoreYachtCategory(trial, category);
      count += 1;
    }
    return { category, scoreIfCommitNow, rerollEV: total / count, alreadyScored };
  });
}
