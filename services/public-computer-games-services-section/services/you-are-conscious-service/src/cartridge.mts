/**
 * `cartridge` — this game's `@red-cup-engineering/cartridge` adoption, exactly Stoke's own posture: `applyIntent`
 * is a direct, undecorated call into `intents.mts::applyConsciousIntent` — there is exactly one
 * reducer in this codebase, never a second copy wrapped for the contract.
 */
import type { ApplyResult, Cartridge, ReplayResult } from "@red-cup-engineering/cartridge/replay";
import { defaultReplay } from "@red-cup-engineering/cartridge/replay";
import type { Intent } from "@red-cup-engineering/cartridge/intent-log";
import { applyConsciousIntent, type ConsciousIntent } from "./intents.mts";
import { starterState, type ConsciousState } from "./state.mts";

/** Pure function of `(seed, configId)`. This game has exactly one config so far (no daily puzzle,
 *  no difficulty tiers) — `configId` is accepted, per the contract, and ignored, documented rather
 *  than silently dropped. Anchored at `nowTs = 0`: every subsequent moment in a run is an explicit
 *  `tick` intent supplying its own `toTs`, never a read of the real clock. */
export function createEngine(seed: string, _configId?: string): ConsciousState {
  return starterState(0, seed);
}

export function applyIntent(state: ConsciousState, intent: ConsciousIntent): ApplyResult<ConsciousState> {
  const result = applyConsciousIntent(state, intent);
  return { state: result.state, events: result.events };
}

/** Delegates to the package's own reference implementation, exactly Stoke's own choice. */
export function replay(
  seed: string,
  intents: readonly ConsciousIntent[],
  configId?: string,
): ReplayResult<ConsciousState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

/** `ConsciousState` is already plain JSON data — every field is a string, number, plain object, or
 *  array of those — so a shallow structural round trip through `JSON.stringify`/`JSON.parse` is a
 *  correct, honest serialize/deserialize pair. */
export function serialize(state: ConsciousState): unknown {
  return JSON.parse(JSON.stringify(state));
}

export function deserialize(data: unknown): ConsciousState {
  if (typeof data !== "object" || data === null) throw new TypeError("deserialize: malformed ConsciousState");
  const d = data as Record<string, unknown>;
  if (
    typeof d["seed"] !== "string" ||
    typeof d["lastSeenTs"] !== "number" ||
    typeof d["widgets"] !== "object" || d["widgets"] === null ||
    typeof d["cognition"] !== "object" || d["cognition"] === null ||
    !Array.isArray(d["reflectionHistory"])
  ) {
    throw new TypeError("deserialize: malformed ConsciousState");
  }
  return d as unknown as ConsciousState;
}

export const consciousCartridge: Cartridge<ConsciousState, ConsciousIntent & Intent> = {
  createEngine,
  applyIntent: applyIntent as (state: ConsciousState, intent: ConsciousIntent & Intent) => ApplyResult<ConsciousState>,
  replay: replay as (seed: string, intents: readonly (ConsciousIntent & Intent)[], configId?: string) => ReplayResult<ConsciousState>,
  serialize,
  deserialize,
};
