/**
 * pig/bot.mts — the simple bot opponent: it literally plays the published math. No heuristic
 * table, no hidden threshold distinct from what the odds panel shows the human player — it
 * reads the exact same `pigOddsForDecision` this game's face renders on screen and rolls
 * whenever, and only whenever, the sign says rolling again is +EV. Beating this bot means
 * beating the odds knowingly, not out-guessing a smarter hidden strategy.
 *
 * One rational override sits above the EV sign: if holding right now would already win the
 * game, the bot holds — computing an EV for a roll that risks a game already won would be
 * perverse, not "more honest math."
 */
import { activePlayer } from '@red-cup-engineering/parlor-kernel/turns';
import { pigOddsForDecision } from './odds.mts';
import { PIG_RULES } from './rules.mts';
import type { PigState } from './engine.mts';

export type PigDecision = 'roll' | 'hold';

export function pigBotDecision(state: PigState): PigDecision {
  const player = activePlayer(state);
  const scoreIfHold = (state.data.scores[player] ?? 0) + state.data.turnTotal;
  if (scoreIfHold >= PIG_RULES.target) return 'hold';
  if (state.data.turnTotal === 0) return 'roll';
  const odds = pigOddsForDecision(state.data.turnTotal, PIG_RULES.sides);
  return odds.rollAgainEV > 0 ? 'roll' : 'hold';
}
