/**
 * farkle/odds.mts — the teaching surface for Farkle's roll-or-bank decision. Two exact,
 * enumerated figures, never asserted:
 *
 *  - `bustProbability` — `@red-cup-engineering/parlor-kernel/odds`'s own `farkleBustProbability`, exact
 *    over all `6 ** diceRemaining` equally-likely outcomes.
 *  - `averageScore` — the exact mean of `scoreFarkleHand(dice).score` over that same
 *    enumeration (zero counted on every busting outcome, so the bust probability is already
 *    baked into this mean, not a separate adjustment).
 *
 * `rollAgainEV` is then just `averageScore - bustProbability * turnPoints`: rolling the dice
 * still on the table risks the accumulated `turnPoints` with probability `bustProbability`,
 * and otherwise adds `averageScore` worth of *additional* score on average (the mean already
 * counts busts as contributing 0, so this one subtraction is the whole risk term — no double
 * counting). The same shape as `pig/odds.mts`'s formula, deliberately: both games are
 * "protect an accumulating turn total against a single bust roll," and both odds panels teach
 * the same lesson with the same arithmetic shape.
 */
import { scoreFarkleHand } from '@red-cup-engineering/parlor-kernel/tally';
import { farkleBustProbability } from '@red-cup-engineering/parlor-kernel/odds';
import { FARKLE_RULES } from './rules.mts';

/** Every ordered tuple of `length` pip values in `[1, sides]` — the same odometer-style exact
 *  enumeration `@red-cup-engineering/parlor-kernel/odds` uses internally (not exported from the kernel,
 *  so re-derived here rather than reached into the kernel's private internals). */
function* pipTuples(sides: number, length: number): Generator<number[]> {
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

const averageScoreCache = new Map<number, number>();

/** The exact mean score of rolling `diceCount` fresh dice, over all `sides ** diceCount`
 *  equally-likely outcomes (busts contribute 0). Memoized per `diceCount` — the figure never
 *  changes for a fixed `diceCount`/`sides`. */
export function averageRollScore(diceCount: number, sides: number = FARKLE_RULES.sides): number {
  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > FARKLE_RULES.diceCount) {
    throw new RangeError(`averageRollScore: diceCount must be in [1, ${FARKLE_RULES.diceCount}] (got ${diceCount})`);
  }
  const cached = averageScoreCache.get(diceCount);
  if (cached !== undefined) return cached;
  let total = 0;
  let count = 0;
  for (const dice of pipTuples(sides, diceCount)) {
    total += scoreFarkleHand(dice).score;
    count += 1;
  }
  const avg = total / count;
  averageScoreCache.set(diceCount, avg);
  return avg;
}

export interface FarkleRollOdds {
  readonly bustProbability: number;
  readonly averageScore: number;
  readonly rollAgainEV: number;
}

export function farkleOddsForDecision(diceRemaining: number, turnPoints: number): FarkleRollOdds {
  const bustProbability = farkleBustProbability(diceRemaining);
  const averageScore = averageRollScore(diceRemaining);
  const rollAgainEV = averageScore - bustProbability * turnPoints;
  return { bustProbability, averageScore, rollAgainEV };
}
