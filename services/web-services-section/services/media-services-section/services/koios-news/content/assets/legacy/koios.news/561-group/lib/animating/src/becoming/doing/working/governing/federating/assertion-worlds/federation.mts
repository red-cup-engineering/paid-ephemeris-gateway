import { admitLog } from "./admission.mjs";
import type { RecognitionInput, World, WorldInput } from "./types.mjs";
import { asWorld, emptyWorld, isInertKey, logFor, unionInto } from "./world.mjs";

/**
 * Folds world `b` into world `a`: for each subject key of `b` in sorted order,
 * inert keys are merged with unionInto while ordinary keys are admitted via
 * admitLog under the given recognition and onReject options. Returns the
 * resulting combined world.
 */
export function federate(a: WorldInput, b: WorldInput, opts: { recognize?: RecognitionInput; onReject?: "quarantine" | "refuse" } = {}): World {
  const source = asWorld(b);
  let world = asWorld(a);
  for (const key of [...source.keys()].sort()) {
    const assertions = source.get(key) ?? [];
    if (isInertKey(key)) world = unionInto(world, key, assertions).world;
    else world = admitLog(world, key, assertions, opts).world;
  }
  return world;
}

/**
 * Federates any number of world inputs into one world, left-folding them with
 * federate over an empty world. Returns the accumulated world.
 */
export const mergeWorlds = (...worlds: WorldInput[]): World =>
  worlds.reduce<World>((acc, world) => federate(acc, world), emptyWorld());

/**
 * Copies one entity's assertion trace from the `from` world into the `into`
 * world under the same entity key, admitting it via admitLog. Returns the
 * resulting `into` world.
 */
export function migrate(from: WorldInput, into: WorldInput, entity: string): World {
  return admitLog(into, entity, logFor(from, entity)).world;
}
