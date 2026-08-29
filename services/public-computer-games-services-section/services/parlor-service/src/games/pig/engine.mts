/**
 * pig/engine.mts — Pig's pure engine, built entirely from `@red-cup-engineering/parlor-kernel`'s own
 * pieces: `seed`/`dice` for a deterministic per-roll sub-stream, `tally` for the bust/bank
 * fold, and `turns#createTurnReducer` for the actual dispatch loop, over the rules-as-data in
 * `./rules.mts`. `applyIntent` below IS `createTurnReducer({ roll, hold })` — this game writes
 * no dispatch logic of its own; rules are data consumed by the kernel's turn reducer.
 *
 * `State` is exactly a kernel `TurnState<PigData>` (no extra wrapper) so the seed can travel
 * inside `data` — the same "state carries a roll counter, not a live Rng" pattern
 * `@red-cup-engineering/parlor-kernel/fixtures/pig-fixture` documents: a live `Rng` stream is not JSON
 * -safe and cannot survive between pure `applyIntent` calls, so each `roll` derives a *fresh*
 * sub-seed (`${seed}:roll:${rollCount}`) from the monotonic `rollCount` instead.
 */
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import { rollDie, rollLogEntry } from '@red-cup-engineering/parlor-kernel/dice';
import {
  createTurnState,
  activePlayer,
  withData,
  withPhase,
  endTurn,
  createTurnReducer,
} from '@red-cup-engineering/parlor-kernel/turns';
import type { TurnState, TurnHandler } from '@red-cup-engineering/parlor-kernel/turns';
import { pigRollOutcome, pigBank } from '@red-cup-engineering/parlor-kernel/tally';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { ApplyResult } from '@red-cup-engineering/cartridge/replay';
import { PIG_RULES } from './rules.mts';

export interface PigData {
  readonly seed: string;
  readonly scores: Readonly<Record<string, number>>;
  readonly turnTotal: number;
  readonly rollCount: number;
  readonly winner: string | null;
}

export type PigState = TurnState<PigData>;

export type PigIntent = ({ readonly kind: 'roll' } | { readonly kind: 'hold' }) & Intent;

function playersFromConfig(configId?: string): string[] {
  if (configId !== undefined && configId.length > 0) return configId.split(',');
  return [...PIG_RULES.defaultPlayers];
}

/** Pure function of (seed, configId): `configId` is a comma-separated player-id list,
 *  defaulting to `PIG_RULES.defaultPlayers`. Identical arguments always produce
 *  byte-identical state. */
export function createEngine(seed: string, configId?: string): PigState {
  const players = playersFromConfig(configId);
  const scores = Object.fromEntries(players.map((p) => [p, 0]));
  return createTurnState<PigData>(players, 'rolling', { seed, scores, turnTotal: 0, rollCount: 0, winner: null });
}

function assertPlayable(state: PigState): void {
  if (state.phase === 'won') {
    throw new Error(`pig: game already won by ${state.data.winner ?? 'unknown'} — no further intents accepted`);
  }
}

const roll: TurnHandler<PigData, PigIntent> = (state) => {
  assertPlayable(state);
  const rollCount = state.data.rollCount;
  const rng = makeRng(`${state.data.seed}:roll:${rollCount}`);
  const pip = rollDie(rng, PIG_RULES.sides);
  const rollEvent: GameEvent = { ...rollLogEntry([pip], PIG_RULES.sides) };
  if (pigRollOutcome(pip) === 'bust') {
    const data: PigData = { ...state.data, turnTotal: 0, rollCount: rollCount + 1 };
    return { state: endTurn(withData(state, data)), events: [rollEvent, { kind: 'bust' }] };
  }
  const data: PigData = { ...state.data, turnTotal: state.data.turnTotal + pip, rollCount: rollCount + 1 };
  return { state: withData(state, data), events: [rollEvent] };
};

const hold: TurnHandler<PigData, PigIntent> = (state) => {
  assertPlayable(state);
  const player = activePlayer(state);
  const nextScore = pigBank(state.data.scores[player] ?? 0, state.data.turnTotal);
  const scores = { ...state.data.scores, [player]: nextScore };
  const won = nextScore >= PIG_RULES.target;
  const data: PigData = { ...state.data, scores, turnTotal: 0, winner: won ? player : null };
  const bankedEvent: GameEvent = { kind: 'banked', player, amount: state.data.turnTotal, total: nextScore };
  if (won) {
    const wonState = withPhase(withData(state, data), 'won');
    return { state: wonState, events: [bankedEvent, { kind: 'won', player }] };
  }
  return { state: endTurn(withData(state, data)), events: [bankedEvent] };
};

/** `applyIntent` IS the kernel's turn reducer built from this game's own `{ roll, hold }`
 *  handler map — no hand-written dispatch. */
export const applyIntent = createTurnReducer<PigData, PigIntent>({ roll, hold }) as (
  state: PigState,
  intent: PigIntent,
) => ApplyResult<PigState>;
