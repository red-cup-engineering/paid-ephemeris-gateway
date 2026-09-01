/**
 * pig/odds.mts — the teaching surface: on every roll-or-hold decision, compute (never assert)
 * the bust probability and the expected value of rolling again, from `@red-cup-engineering/parlor-kernel`'s
 * own exact figures (`odds#pigBustProbability`, `dice#diePmf`) plus this turn's own
 * `turnTotal` — nothing here is a hand-typed threshold.
 *
 * Derivation of `rollAgainEV` (the classic Pig "hold at 20" result, arrived at by computation
 * rather than quoted as folklore): holding now locks in `turnTotal`. Rolling again either busts
 * (probability `bustProbability`, losing the whole `turnTotal`) or lands a non-busting pip
 * (probability `continueProbability`), whose *conditional* expected value — averaged only over
 * the faces that don't bust — is `expectedPipIfContinue`. So the expected *change* from rolling
 * once more, relative to holding right now, is:
 *
 *   rollAgainEV = continueProbability * expectedPipIfContinue - bustProbability * turnTotal
 *
 * For the standard `sides = 6` die this is `10/3 - turnTotal/6`, zero at `turnTotal = 20` —
 * `odds.test.mts` checks that figure directly, independently of this formula's own algebra.
 */
import { pigBustProbability } from '@red-cup-engineering/parlor-kernel/odds';
import { diePmf } from '@red-cup-engineering/parlor-kernel/dice';
import { PIG_RULES } from './rules.mts';

export interface PigRollOdds {
  readonly bustProbability: number;
  readonly continueProbability: number;
  readonly expectedPipIfContinue: number;
  readonly rollAgainEV: number;
  readonly holdValue: number;
}

export function pigOddsForDecision(turnTotal: number, sides: number = PIG_RULES.sides): PigRollOdds {
  if (!Number.isInteger(turnTotal) || turnTotal < 0) {
    throw new RangeError(`pigOddsForDecision: turnTotal must be a non-negative integer (got ${turnTotal})`);
  }
  const bustProbability = pigBustProbability(sides);
  const continueProbability = 1 - bustProbability;
  const nonBustPips = diePmf(sides).filter((entry) => entry.pip !== 1);
  const conditionalSum = nonBustPips.reduce((sum, entry) => sum + entry.pip * entry.probability, 0);
  const expectedPipIfContinue = conditionalSum / continueProbability;
  const rollAgainEV = continueProbability * expectedPipIfContinue - bustProbability * turnTotal;
  return { bustProbability, continueProbability, expectedPipIfContinue, rollAgainEV, holdValue: turnTotal };
}
