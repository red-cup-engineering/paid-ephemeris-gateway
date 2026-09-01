/**
 * farkle/engine.mts — Farkle's pure engine: roll the dice pool, set aside a valid scoring
 * subset (kernel-validated — see `assertValidSelection` below), bank between rolls or keep
 * rolling the dice still in play, hot dice (empty the pool) refills it to a full hand without
 * losing the running turn total, and a roll that scores nothing busts the whole turn total.
 * Built from `@red-cup-engineering/parlor-kernel`'s `seed`/`dice`/`tally`/`turns` over the rules-as-data
 * in `./rules.mts` — `applyIntent` is `createTurnReducer({ roll, choose, bank })`, this game's
 * own dispatch logic written nowhere else.
 *
 * Three phases: `'rolling'` (no dice on the table — the next legal intents are `roll` or, if
 * `turnPoints` clears the entry rule, `bank`), `'choosing'` (a roll landed and scored — the next
 * legal intent is `choose`, selecting which rolled dice to set aside), `'won'` (terminal).
 */
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import { rollDice, rollLogEntry } from '@red-cup-engineering/parlor-kernel/dice';
import {
  createTurnState,
  activePlayer,
  withData,
  withPhase,
  endTurn,
  createTurnReducer,
} from '@red-cup-engineering/parlor-kernel/turns';
import type { TurnState, TurnHandler } from '@red-cup-engineering/parlor-kernel/turns';
import { scoreFarkleHand, farkleBust } from '@red-cup-engineering/parlor-kernel/tally';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { ApplyResult } from '@red-cup-engineering/cartridge/replay';
import { FARKLE_RULES } from './rules.mts';

export interface FarkleData {
  readonly seed: string;
  readonly scores: Readonly<Record<string, number>>;
  readonly turnPoints: number;
  readonly diceRemaining: number;
  readonly currentRoll: readonly number[] | null;
  readonly rollCount: number;
  readonly winner: string | null;
}

export type FarkleState = TurnState<FarkleData>;

export type FarkleIntent = (
  | { readonly kind: 'roll' }
  | { readonly kind: 'choose'; readonly indices: readonly number[] }
  | { readonly kind: 'bank' }
) &
  Intent;

function playersFromConfig(configId?: string): string[] {
  if (configId !== undefined && configId.length > 0) return configId.split(',');
  return [...FARKLE_RULES.defaultPlayers];
}

export function createEngine(seed: string, configId?: string): FarkleState {
  const players = playersFromConfig(configId);
  const scores = Object.fromEntries(players.map((p) => [p, 0]));
  return createTurnState<FarkleData>(players, 'rolling', {
    seed,
    scores,
    turnPoints: 0,
    diceRemaining: FARKLE_RULES.diceCount,
    currentRoll: null,
    rollCount: 0,
    winner: null,
  });
}

function assertPlayable(state: FarkleState): void {
  if (state.phase === 'won') {
    throw new Error(`farkle: game already won by ${state.data.winner ?? 'unknown'} — no further intents accepted`);
  }
}

/** A selection is legal only if every selected die is actually part of a scoring group — the
 *  kernel's own `scoreFarkleHand` fold is the sole authority: if the dice it *didn't* fold into
 *  `breakdown` show up in the selection, the selection is invalid (no "trash die" smuggled in
 *  alongside a real scoring group). */
function validateSelection(dice: readonly number[]): { readonly score: number } {
  const scored = scoreFarkleHand(dice);
  const consumed = scored.breakdown.reduce((sum, g) => sum + g.count, 0);
  if (scored.score === 0 || consumed !== dice.length) {
    throw new Error(
      `farkle: selection [${dice.join(',')}] is not a valid scoring set — every set-aside die must contribute to a scoring group`,
    );
  }
  return scored;
}

const roll: TurnHandler<FarkleData, FarkleIntent> = (state) => {
  assertPlayable(state);
  if (state.data.currentRoll !== null) {
    throw new Error('farkle: dice are already on the table — choose before rolling again');
  }
  const rollCount = state.data.rollCount;
  const rng = makeRng(`${state.data.seed}:roll:${rollCount}`);
  const dice = rollDice(rng, state.data.diceRemaining, FARKLE_RULES.sides);
  const rollEvent: GameEvent = { ...rollLogEntry(dice, FARKLE_RULES.sides) };
  if (farkleBust(dice)) {
    const data: FarkleData = {
      ...state.data,
      turnPoints: 0,
      diceRemaining: FARKLE_RULES.diceCount,
      currentRoll: null,
      rollCount: rollCount + 1,
    };
    return { state: endTurn(withData(state, data)), events: [rollEvent, { kind: 'bust' }] };
  }
  const data: FarkleData = { ...state.data, currentRoll: dice, rollCount: rollCount + 1 };
  return { state: withPhase(withData(state, data), 'choosing'), events: [rollEvent] };
};

const choose: TurnHandler<FarkleData, FarkleIntent> = (state, intent) => {
  assertPlayable(state);
  if (intent.kind !== 'choose') throw new TypeError('farkle: choose handler received a non-choose intent');
  const dice = state.data.currentRoll;
  if (dice === null) throw new Error('farkle: no dice on the table to choose from — roll first');
  const indices = intent.indices;
  const seen = new Set<number>();
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= dice.length) {
      throw new RangeError(`farkle: index ${i} is out of range for a ${dice.length}-die roll`);
    }
    if (seen.has(i)) throw new Error(`farkle: index ${i} selected more than once`);
    seen.add(i);
  }
  if (indices.length === 0) throw new Error('farkle: must select at least one scoring die');
  const selected = indices.map((i) => dice[i] as number);
  const { score } = validateSelection(selected);

  let diceRemaining = state.data.diceRemaining - selected.length;
  const hotDice = diceRemaining === 0;
  if (hotDice) diceRemaining = FARKLE_RULES.diceCount;

  const data: FarkleData = {
    ...state.data,
    turnPoints: state.data.turnPoints + score,
    diceRemaining,
    currentRoll: null,
  };
  const events: GameEvent[] = [{ kind: 'set-aside', dice: selected, points: score }];
  if (hotDice) events.push({ kind: 'hot-dice' });
  return { state: withPhase(withData(state, data), 'rolling'), events };
};

const bank: TurnHandler<FarkleData, FarkleIntent> = (state) => {
  assertPlayable(state);
  if (state.data.currentRoll !== null) {
    throw new Error('farkle: dice are on the table — choose before banking');
  }
  const player = activePlayer(state);
  const bankedScore = state.data.scores[player] ?? 0;
  const onBoard = bankedScore > 0;
  if (state.data.turnPoints <= 0) {
    throw new Error('farkle: nothing to bank this turn');
  }
  if (!onBoard && state.data.turnPoints < FARKLE_RULES.entryThreshold) {
    throw new Error(
      `farkle: ${player} has not reached the ${FARKLE_RULES.entryThreshold}-point entry threshold yet (has ${state.data.turnPoints})`,
    );
  }
  const nextScore = bankedScore + state.data.turnPoints;
  const won = nextScore >= FARKLE_RULES.targetScore;
  const scores = { ...state.data.scores, [player]: nextScore };
  const data: FarkleData = {
    ...state.data,
    scores,
    turnPoints: 0,
    diceRemaining: FARKLE_RULES.diceCount,
    currentRoll: null,
    winner: won ? player : null,
  };
  const bankedEvent: GameEvent = { kind: 'banked', player, amount: state.data.turnPoints, total: nextScore };
  if (won) {
    return { state: withPhase(withData(state, data), 'won'), events: [bankedEvent, { kind: 'won', player }] };
  }
  return { state: endTurn(withData(state, data)), events: [bankedEvent] };
};

export const applyIntent = createTurnReducer<FarkleData, FarkleIntent>({ roll, choose, bank }) as (
  state: FarkleState,
  intent: FarkleIntent,
) => ApplyResult<FarkleState>;
