/**
 * yacht/engine.mts — Yacht's pure engine: up to three rolls a turn (the first roll, then up to
 * two rerolls of whichever dice aren't held), one category scored per turn, game ends the
 * moment every player has filled every category. Built from `@red-cup-engineering/parlor-kernel`'s
 * `seed`/`dice`/`tally`/`turns` over the rules-as-data in `./rules.mts` — `applyIntent` is
 * `createTurnReducer({ roll, toggleHold, score })`.
 *
 * `phase` stays `'rolling'` for the whole active game (per-turn state — how many rolls used,
 * which dice are held — lives in `data`, not in the phase string) and flips to the terminal
 * `'won'` only once every player has filled every category, matching `pig`/`farkle`'s
 * `assertPlayable`-gates-on-`'won'` convention.
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
import { scoreYachtCategory } from '@red-cup-engineering/parlor-kernel/tally';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { ApplyResult } from '@red-cup-engineering/cartridge/replay';
import { YACHT_RULES, type YachtCategory } from './rules.mts';

export interface YachtData {
  readonly seed: string;
  readonly scores: Readonly<Record<string, Readonly<Partial<Record<YachtCategory, number>>>>>;
  readonly dice: readonly number[];
  readonly held: readonly boolean[];
  readonly rollsUsed: number;
  readonly rollCount: number;
  readonly winner: string | null;
}

export type YachtState = TurnState<YachtData>;

export type YachtIntent = (
  | { readonly kind: 'roll' }
  | { readonly kind: 'toggleHold'; readonly index: number }
  | { readonly kind: 'score'; readonly category: YachtCategory }
) &
  Intent;

function playersFromConfig(configId?: string): string[] {
  if (configId !== undefined && configId.length > 0) return configId.split(',');
  return [...YACHT_RULES.defaultPlayers];
}

function freshHand(): { dice: number[]; held: boolean[] } {
  return {
    dice: new Array(YACHT_RULES.diceCount).fill(0),
    held: new Array(YACHT_RULES.diceCount).fill(false),
  };
}

function totalScore(scores: Readonly<Partial<Record<YachtCategory, number>>>): number {
  return Object.values(scores).reduce((sum: number, v) => sum + ((v as number | undefined) ?? 0), 0);
}

export function createEngine(seed: string, configId?: string): YachtState {
  const players = playersFromConfig(configId);
  const scores = Object.fromEntries(players.map((p) => [p, {}]));
  const { dice, held } = freshHand();
  return createTurnState<YachtData>(players, 'rolling', {
    seed,
    scores,
    dice,
    held,
    rollsUsed: 0,
    rollCount: 0,
    winner: null,
  });
}

function assertPlayable(state: YachtState): void {
  if (state.phase === 'won') {
    throw new Error(`yacht: game already won by ${state.data.winner ?? 'unknown'} — no further intents accepted`);
  }
}

const roll: TurnHandler<YachtData, YachtIntent> = (state) => {
  assertPlayable(state);
  if (state.data.rollsUsed >= YACHT_RULES.maxRolls) {
    throw new Error(`yacht: no rolls remaining this turn (used ${state.data.rollsUsed}/${YACHT_RULES.maxRolls})`);
  }
  const freeIndices = state.data.held.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
  if (freeIndices.length === 0) {
    throw new Error('yacht: every die is held — nothing to reroll; score this turn or free a die first');
  }
  const rollCount = state.data.rollCount;
  const rng = makeRng(`${state.data.seed}:roll:${rollCount}`);
  const freshValues = rollDice(rng, freeIndices.length, YACHT_RULES.sides);
  const dice = state.data.dice.slice();
  freeIndices.forEach((idx, k) => {
    dice[idx] = freshValues[k] as number;
  });
  const rollEvent: GameEvent = { ...rollLogEntry(freshValues, YACHT_RULES.sides) };
  const data: YachtData = { ...state.data, dice, rollsUsed: state.data.rollsUsed + 1, rollCount: rollCount + 1 };
  return { state: withData(state, data), events: [rollEvent] };
};

const toggleHold: TurnHandler<YachtData, YachtIntent> = (state, intent) => {
  assertPlayable(state);
  if (intent.kind !== 'toggleHold') throw new TypeError('yacht: toggleHold handler received the wrong intent');
  if (state.data.rollsUsed === 0) throw new Error('yacht: roll before holding any dice');
  if (state.data.rollsUsed >= YACHT_RULES.maxRolls) {
    throw new Error('yacht: no rerolls remain this turn — holding no longer changes anything');
  }
  const index = intent.index;
  if (!Number.isInteger(index) || index < 0 || index >= YACHT_RULES.diceCount) {
    throw new RangeError(`yacht: hold index ${index} is out of range for ${YACHT_RULES.diceCount} dice`);
  }
  const held = state.data.held.slice();
  held[index] = !held[index];
  return {
    state: withData(state, { ...state.data, held }),
    events: [{ kind: 'hold-toggled', index, held: held[index] as boolean }],
  };
};

const score: TurnHandler<YachtData, YachtIntent> = (state, intent) => {
  assertPlayable(state);
  if (intent.kind !== 'score') throw new TypeError('yacht: score handler received the wrong intent');
  if (state.data.rollsUsed === 0) throw new Error('yacht: roll before scoring');
  const player = activePlayer(state);
  const category = intent.category;
  if (!YACHT_RULES.categories.includes(category)) {
    throw new TypeError(`yacht: unknown category "${category}"`);
  }
  const playerScores = state.data.scores[player] ?? {};
  if (category in playerScores) {
    throw new Error(`yacht: ${player} has already scored ${category} this game`);
  }
  const points = scoreYachtCategory(state.data.dice, category);
  const scores = { ...state.data.scores, [player]: { ...playerScores, [category]: points } };
  const scoredEvent: GameEvent = { kind: 'scored', player, category, points };

  const allDone = state.players.every(
    (p) => Object.keys(scores[p] ?? {}).length === YACHT_RULES.categories.length,
  );
  const { dice, held } = freshHand();

  if (allDone) {
    const totals = state.players.map((p) => [p, totalScore(scores[p] ?? {})] as const);
    // First-seen max wins ties — a deliberate, documented tie-break (seating order), not an
    // accident of `reduce`'s traversal direction.
    const [winner] = totals.reduce((a, b) => (b[1] > a[1] ? b : a));
    const tied = totals.filter(([, t]) => t === totals.reduce((m, x) => Math.max(m, x[1]), -Infinity)).map(([p]) => p);
    const data: YachtData = { ...state.data, scores, dice, held, rollsUsed: 0, winner };
    const wonEvent: GameEvent = { kind: 'won', player: winner, totals: Object.fromEntries(totals), tied };
    return { state: withPhase(withData(state, data), 'won'), events: [scoredEvent, wonEvent] };
  }

  const data: YachtData = { ...state.data, scores, dice, held, rollsUsed: 0 };
  return { state: endTurn(withData(state, data)), events: [scoredEvent] };
};

export const applyIntent = createTurnReducer<YachtData, YachtIntent>({ roll, toggleHold, score }) as (
  state: YachtState,
  intent: YachtIntent,
) => ApplyResult<YachtState>;
