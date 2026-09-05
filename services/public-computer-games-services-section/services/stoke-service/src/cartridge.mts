/**
 * `cartridge` — stoke's `@red-cup-engineering/cartridge` adoption. `applyIntent` is a direct, undecorated
 * call into `intents.mts::applyStokeIntent` — there is exactly one reducer in this codebase, not
 * a second copy wrapped for the contract, per the same "wrap, don't rewrite" posture
 * flickering-delve's `cartridge.mts` documents for itself. `createEngine` is `state.mts`'s
 * `starterState`, seeded and anchored at the epoch (`nowTs = 0`); every subsequent moment in a
 * run is an explicit `tick` intent carrying its own `toTs`, never a read of the real clock.
 */
import type { ApplyResult, Cartridge, ReplayResult } from "@red-cup-engineering/cartridge/replay";
import { defaultReplay } from "@red-cup-engineering/cartridge/replay";
import type { Intent } from "@red-cup-engineering/cartridge/intent-log";
import { applyStokeIntent, type StokeIntent } from "./intents.mts";
import { starterState, type StokeState } from "./state.mts";

/** Pure function of `(seed, configId)`. Stoke has exactly one config (no daily puzzle, no
 *  difficulty tiers yet) so `configId` is accepted, per the contract, and ignored — documented
 *  here rather than silently dropped. Anchored at `nowTs = 0`: the epoch is not "now," it is a
 *  fixed constant every fresh run starts from; real elapsed time only ever enters via `tick`
 *  intents supplying their own `toTs`. */
export function createEngine(seed: string, _configId?: string): StokeState {
  return starterState(0, seed);
}

export function applyIntent(state: StokeState, intent: StokeIntent): ApplyResult<StokeState> {
  const result = applyStokeIntent(state, intent);
  return { state: result.state, events: result.events };
}

/** Delegates to the package's own reference implementation — see flickering-delve's/onestone's
 *  `cartridge.mts` for the same choice, with the same reasoning ("most implementers should just
 *  delegate to `defaultReplay`... rather than reimplementing this loop"). */
export function replay(
  seed: string,
  intents: readonly StokeIntent[],
  configId?: string,
): ReplayResult<StokeState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

/** `StokeState` is already plain JSON data (every field is a string, number, plain object, or an
 *  array of those) — a shallow structural copy is a correct, honest serialize/deserialize pair;
 *  there is no class instance or non-JSON value anywhere inside it to lose on the round trip. */
export function serialize(state: StokeState): unknown {
  return JSON.parse(JSON.stringify(state));
}

export function deserialize(data: unknown): StokeState {
  if (typeof data !== "object" || data === null) throw new TypeError("deserialize: malformed StokeState");
  const d = data as Record<string, unknown>;
  if (
    typeof d["seed"] !== "string" ||
    typeof d["lastSeenTs"] !== "number" ||
    typeof d["graph"] !== "object" || d["graph"] === null ||
    typeof d["stocks"] !== "object" || d["stocks"] === null ||
    !Array.isArray(d["prestigeHistory"])
  ) {
    throw new TypeError("deserialize: malformed StokeState");
  }
  return d as unknown as StokeState;
}

export const stokeCartridge: Cartridge<StokeState, StokeIntent & Intent> = {
  createEngine,
  applyIntent: applyIntent as (state: StokeState, intent: StokeIntent & Intent) => ApplyResult<StokeState>,
  replay: replay as (seed: string, intents: readonly (StokeIntent & Intent)[], configId?: string) => ReplayResult<StokeState>,
  serialize,
  deserialize,
};
