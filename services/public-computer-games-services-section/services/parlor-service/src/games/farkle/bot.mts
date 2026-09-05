/**
 * farkle/bot.mts — the simple bot opponent, kernel-odds-driven exactly like `pig/bot.mts`:
 *
 *  - When dice are on the table (`currentRoll !== null`) it must choose a scoring subset —
 *    the bot takes the *maximal* one, i.e. every die belonging to any scoring group the
 *    kernel's own `scoreFarkleHand` fold identified. Since a triple-or-better group always
 *    consumes every die of that face already in the hand, and a leftover 1/5 group only ever
 *    exists for faces that had no triple, "every die whose face appears in `breakdown`" is
 *    exactly the dice the fold consumed — no separate index bookkeeping needed.
 *  - When no dice are on the table, it rolls or banks by the exact same `rollAgainEV` sign the
 *    odds panel shows the human player, with one rational override above the sign: bank
 *    immediately if that bank wins the game, and never bank below the entry threshold (banking
 *    then simply isn't legal yet, regardless of what the EV sign says).
 */
import { activePlayer } from '@red-cup-engineering/parlor-kernel/turns';
import { scoreFarkleHand } from '@red-cup-engineering/parlor-kernel/tally';
import { farkleOddsForDecision } from './odds.mts';
import { FARKLE_RULES } from './rules.mts';
import type { FarkleState } from './engine.mts';

export type FarkleDecision =
  | { readonly action: 'roll' }
  | { readonly action: 'choose'; readonly indices: readonly number[] }
  | { readonly action: 'bank' };

export function farkleBotDecision(state: FarkleState): FarkleDecision {
  const dice = state.data.currentRoll;
  if (dice !== null) {
    const { breakdown } = scoreFarkleHand(dice);
    const scoringFaces = new Set(breakdown.map((g) => g.face));
    const indices = dice.map((_v, i) => i).filter((i) => scoringFaces.has(dice[i] as number));
    return { action: 'choose', indices };
  }

  const player = activePlayer(state);
  const bankedScore = state.data.scores[player] ?? 0;
  const onBoard = bankedScore > 0;
  const projected = bankedScore + state.data.turnPoints;

  if (state.data.turnPoints > 0 && projected >= FARKLE_RULES.targetScore) return { action: 'bank' };
  if (state.data.turnPoints === 0) return { action: 'roll' }; // nothing accumulated yet — must roll
  if (!onBoard && state.data.turnPoints < FARKLE_RULES.entryThreshold) return { action: 'roll' }; // banking not legal yet

  const odds = farkleOddsForDecision(state.data.diceRemaining, state.data.turnPoints);
  return odds.rollAgainEV > 0 ? { action: 'roll' } : { action: 'bank' };
}
