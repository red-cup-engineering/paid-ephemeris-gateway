import { stableJson } from "./json.mjs";
import { dedupe, assertionId } from "./assertions.mjs";
import type { Assertion, AssertionTrace, World, WorldInput } from "./types.mjs";

const INERT_PREFIX = "absurd:";

/**
 * A new empty world: an empty map from entity identifier to assertion trace.
 */
export function emptyWorld(): World {
  return new Map();
}

/**
 * Normalizes a WorldInput into a World: copies an existing map or a plain
 * record into a fresh map, deduping each entity's assertion trace, and returns
 * an empty world for null/undefined or non-object input.
 */
export function asWorld(world: WorldInput): World {
  if (world instanceof Map) return new Map([...world.entries()].map(([k, v]) => [k, dedupe(v)]));
  if (world && typeof world === "object") return new Map(Object.entries(world).map(([k, v]) => [k, dedupe(v)]));
  return new Map();
}

/** The sorted list of subject keys in the world, excluding inert keys. */
export function subjects(world: WorldInput): string[] {
  return [...asWorld(world).keys()].filter((key) => !isInertKey(key)).sort();
}

/**
 * The deduped assertion trace held for a subject, or an empty array when the
 * subject is absent.
 */
export function logFor(world: WorldInput, subject: string): Assertion[] {
  return dedupe(asWorld(world).get(subject) ?? []);
}

/**
 * The deduped assertion trace held under a subject's inert key, or an empty
 * array when none exist.
 */
export function inertFor(world: WorldInput, subject: string): Assertion[] {
  return dedupe(asWorld(world).get(inertKeyFor(subject)) ?? []);
}

/**
 * Every assertion across all keys of the world, collected in sorted key order
 * and deduped.
 */
export function allAssertions(world: WorldInput): Assertion[] {
  const out: Assertion[] = [];
  for (const key of [...asWorld(world).keys()].sort()) out.push(...(asWorld(world).get(key) ?? []));
  return dedupe(out);
}

/**
 * A stable content-addressed key for the world: a deterministic json encoding
 * of each sorted key paired with its deduped, sorted assertion ids.
 */
export function contentKey(world: WorldInput): string {
  const normalized = asWorld(world);
  return stableJson([...normalized.keys()].sort().map((key) => [key, dedupe(normalized.get(key) ?? []).map(assertionId).sort()]));
}

/**
 * Merges assertions into the world under a key, skipping any whose assertion id
 * already exists there, and returns the resulting world along with the counts
 * of assertions added and skipped.
 */
export function unionInto(world: WorldInput, key: string, assertions: Iterable<Assertion> | AssertionTrace): { world: World; added: number; skipped: number } {
  const out = asWorld(world);
  const existing = out.get(key) ?? [];
  const have = new Set(existing.map(assertionId));
  const merged = [...existing];
  let added = 0;
  let skipped = 0;
  for (const assertion of assertions) {
    const id = assertionId(assertion);
    if (have.has(id)) { skipped += 1; continue; }
    have.add(id);
    merged.push(assertion);
    added += 1;
  }
  out.set(key, merged);
  return { world: out, added, skipped };
}

/** Whether a key is an inert key, identified by the inert prefix. */
export function isInertKey(key: string): boolean {
  return key.startsWith(INERT_PREFIX);
}

/** The inert key for a subject: the subject prefixed with the inert marker. */
export function inertKeyFor(subject: string): string {
  return `${INERT_PREFIX}${subject}`;
}
