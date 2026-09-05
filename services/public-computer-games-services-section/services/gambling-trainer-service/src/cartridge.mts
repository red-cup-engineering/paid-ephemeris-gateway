/**
 * `cartridge` — Kelly's Wager's `@red-cup-engineering/cartridge` adoption: assembles `engine.mts`'s already
 * -pure `createEngine`/`applyIntent` and `replay.mts`'s `defaultReplay`-backed `replay` into the
 * full `Cartridge<BankrollState, WagerIntent>` contract, exactly onestone-service's
 * `src/cartridge.mts` pattern (a real, live `npm install @red-cup-engineering/cartridge` dependency — see
 * DESIGN.md's vendoring note for why *this* package is a live dependency while the Kelly/odds
 * library is vendored instead: two different house rules, both satisfied, for two different
 * reasons).
 *
 * This module changes not one line of `engine.mts`, `wagers.mts`, or `disclosure.mts` — it only
 * wraps them. `BankrollState` is already plain JSON data (every field is a string, number,
 * boolean, or array/object of those), so `serialize`/`deserialize` round-trip it structurally.
 */
import type { ApplyResult as CartridgeApplyResult, Cartridge, ReplayResult } from '@red-cup-engineering/cartridge/replay';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import { createEngine as engineCreateEngine, applyIntent as engineApplyIntent } from './engine.mts';
import { replay as replayFn } from './replay.mts';
import type { BankrollState, WagerIntent } from './types.mts';

export function createEngine(seed: string, configId?: string): BankrollState {
  return engineCreateEngine(seed, configId);
}

export function applyIntent(state: BankrollState, intent: WagerIntent): CartridgeApplyResult<BankrollState> {
  const result = engineApplyIntent(state, intent);
  return { state: result.state, events: result.events as readonly GameEvent[] };
}

/** Delegates to `replay.mts` — no second replay loop lives here. */
export function replay(
  seed: string,
  intents: readonly WagerIntent[],
  configId?: string,
): ReplayResult<BankrollState> {
  return replayFn(seed, intents, configId);
}

/** `BankrollState` is already plain JSON — every field is a string, number, boolean, or a
 * readonly array/object built from those (see `types.mts`). Shallow-copying the arrays is enough
 * to guarantee `deserialize(serialize(s))` deep-equals `s` without aliasing the original. */
export function serialize(state: BankrollState): unknown {
  return {
    ...state,
    offers: state.offers.map((o) => ({ ...o })),
    resolutions: state.resolutions.map((r) => ({ ...r })),
  };
}

export function deserialize(data: unknown): BankrollState {
  if (typeof data !== 'object' || data === null) throw new TypeError('deserialize: malformed BankrollState');
  const d = data as Record<string, unknown>;
  if (
    typeof d['seed'] !== 'string' ||
    typeof d['configId'] !== 'string' ||
    typeof d['balance'] !== 'number' ||
    !Array.isArray(d['offers']) ||
    !Array.isArray(d['resolutions'])
  ) {
    throw new TypeError('deserialize: malformed BankrollState');
  }
  return d as unknown as BankrollState;
}

export const gamblingTrainerCartridge: Cartridge<BankrollState, WagerIntent & Intent> = {
  createEngine,
  applyIntent: applyIntent as (state: BankrollState, intent: WagerIntent & Intent) => CartridgeApplyResult<BankrollState>,
  replay: replay as (seed: string, intents: readonly (WagerIntent & Intent)[], configId?: string) => ReplayResult<BankrollState>,
  serialize,
  deserialize,
};
