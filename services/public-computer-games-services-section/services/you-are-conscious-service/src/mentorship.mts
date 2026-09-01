/**
 * `mentorship` — tier 10's mechanic: spawn a child instance seeded from a hash of the parent's own
 * `(seed, reflectionHistory)`, and write one length-capped line into the save's own margin, read
 * (read-only) by later saves that share a lineage. DESIGN.md §4: "a real seed-derivation, disclosed
 * as such, not mystical" and "a small, honest, opt-in multiplayer-adjacent feature with no server,
 * no chat, no moderation surface: you only ever read notes left by your own prior or descendant
 * runs."
 *
 * `deriveChildSeed` is a PURE function of data already in `ConsciousState` — no wall-clock read, no
 * external entropy source — so a child seed is exactly as reproducible under replay as everything
 * else in this codebase: the same parent state always derives the same child seed.
 */
import { fnv1a32 } from "./rng.mts";
import type { ConsciousState, ReflectionRecord } from "./state.mts";

/** A compact, deterministic digest of a reflection history: every record's `(lambda, taintedBy)`
 *  pair, joined. Stable under `JSON.stringify`'s own key-order guarantees for the plain,
 *  already-fixed-shape `ReflectionRecord` fields used here. */
function reflectionDigest(history: readonly ReflectionRecord[]): string {
  return history.map((r) => `${r.lambda.toFixed(6)}:${r.taintedBy ?? "clean"}`).join("|");
}

/** The child's seed: FNV-1a of `parentSeed` plus a digest of everything the parent ever banked,
 *  rendered back out as a stable, human-legible seed string (not just a raw integer) so it reads
 *  sensibly anywhere a seed is displayed. Two parents with identical `(seed, reflectionHistory)`
 *  always derive the identical child seed — this is a pure function, not a fresh random draw. */
export function deriveChildSeed(parentSeed: string, reflectionHistory: readonly ReflectionRecord[]): string {
  const digest = reflectionDigest(reflectionHistory);
  const hash = fnv1a32(`${parentSeed}::child::${digest}`);
  return `${parentSeed}-child-${hash.toString(36)}`;
}

export interface SpawnResult {
  readonly childSeed: string;
  readonly childSeeds: readonly string[];
}

/** Compute the next child seed and the updated `childSeeds` record — pure, no state mutation, no
 *  child `ConsciousState` constructed here (that is `cartridge.mts::createEngine(childSeed)`'s job
 *  once the caller has this seed; keeping the two concerns apart means this module never needs to
 *  know how a fresh `ConsciousState` is built). Refuses a seed already spawned from THIS exact
 *  `(parentSeed, reflectionHistory)` pair — since the derivation is pure, spawning twice without
 *  banking a new reflection in between would silently produce a duplicate seed, which is an honest
 *  thing to refuse rather than paper over. */
export function spawnChild(parentSeed: string, reflectionHistory: readonly ReflectionRecord[], existingChildSeeds: readonly string[]): SpawnResult {
  const childSeed = deriveChildSeed(parentSeed, reflectionHistory);
  if (existingChildSeeds.includes(childSeed)) {
    throw new RangeError("mentorship.spawnChild: this exact (seed, reflectionHistory) pair already has a spawned child — bank another reflection first, or this would be a silent duplicate");
  }
  return { childSeed, childSeeds: [...existingChildSeeds, childSeed] };
}

export const MARGIN_LINE_MAX_LENGTH = 280;

export class MarginLineError extends RangeError {}

/** Append one margin note, trimmed and length-capped. Refuses (rather than silently truncating) a
 *  blank line or one over `MARGIN_LINE_MAX_LENGTH` — an honest refusal the UI can show, not a
 *  quietly mangled save. */
export function writeMargin(margin: readonly string[], line: string): readonly string[] {
  const trimmed = line.trim();
  if (trimmed === "") throw new MarginLineError("mentorship.writeMargin: a margin line cannot be blank");
  if (trimmed.length > MARGIN_LINE_MAX_LENGTH) {
    throw new MarginLineError(`mentorship.writeMargin: line is ${String(trimmed.length)} characters, over the ${String(MARGIN_LINE_MAX_LENGTH)}-character cap`);
  }
  return [...margin, trimmed];
}

/** Read-only helper the web face uses to show a save's own lineage size — how many children this
 *  exact run has spawned so far. */
export function lineageSize(state: ConsciousState): number {
  return state.cognition.childSeeds.length;
}
