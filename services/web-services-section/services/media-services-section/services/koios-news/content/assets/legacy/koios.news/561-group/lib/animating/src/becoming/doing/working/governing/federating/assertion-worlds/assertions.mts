import { compareStamp, contentId, stableJson } from "./json.mjs";
import type { Assertion, AssertionTrace, FunctionalPredicate } from "./types.mjs";

/**
 * The string prefix marking a reified assertion identifier: a value beginning
 * with this prefix is an assertion referenced as an entity rather than a plain
 * entity id.
 */
export const REIFIED_PREFIX = "assertion:";

/**
 * The content-addressed identifier of an assertion: the stable content id
 * computed over its structure.
 */
export function assertionId(assertion: unknown): string {
  return contentId(assertion);
}

/**
 * Validates that a value is a well-formed assertion - an object with string `e`
 * and `a` - returning it unchanged, or throwing a TypeError otherwise.
 */
export function assertAssertion(assertion: Assertion): Assertion {
  if (!assertion || typeof assertion !== "object" || typeof assertion.e !== "string" || typeof assertion.a !== "string") {
    throw new TypeError("assertion must be an object with string e and a");
  }
  return assertion;
}

/**
 * Removes duplicate assertions from a trace by content id, preserving
 * first-seen order, and returns the deduplicated array.
 */
export function dedupe(assertions: AssertionTrace): Assertion[] {
  const seen = new Set<string>();
  const out: Assertion[] = [];
  for (const assertion of assertions) {
    const id = assertionId(assertion);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(assertion);
  }
  return out;
}

/**
 * Reifies an assertion into an entity reference: the reified prefix followed by
 * the first 16 characters of the assertion's content id.
 */
export function reify(assertion: Assertion): string {
  return `${REIFIED_PREFIX}${assertionId(assertion).slice(0, 16)}`;
}

/**
 * Reports whether a value is a reified assertion reference: true when it is a
 * string beginning with the reified prefix.
 */
export function isReified(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(REIFIED_PREFIX);
}

/**
 * Resolves functional predicates within a trace: for each functional predicate,
 * keeps only the assertions bearing the latest timestamp, while passing through
 * reified-entity and non-functional assertions unchanged.
 */
export function supersede(assertions: AssertionTrace, functional?: FunctionalPredicate): Assertion[] {
  const isFunctional = functionalPredicate(functional);
  const latest = new Map<string, unknown>();
  for (const assertion of assertions) {
    assertAssertion(assertion);
    if (isReified(assertion.e) || !isFunctional(assertion.a)) continue;
    const current = latest.get(assertion.a);
    if (current === undefined || compareStamp(assertion.t, current) > 0) latest.set(assertion.a, assertion.t);
  }
  return assertions.filter((assertion) => isReified(assertion.e) || !isFunctional(assertion.a) || compareStamp(assertion.t, latest.get(assertion.a)) === 0);
}

/**
 * Returns the sorted, frozen set of subjects (`e`) whose assertions under the
 * given predicate have a value equal to the given object, ignoring
 * reified-entity assertions.
 */
export function relate(assertions: AssertionTrace, predicate: string, object: unknown): readonly unknown[] {
  const subjects = new Set<unknown>();
  for (const assertion of assertions) {
    assertAssertion(assertion);
    if (!isReified(assertion.e) && assertion.a === predicate && stableJson(assertion.v) === stableJson(object)) subjects.add(assertion.e);
  }
  return Object.freeze([...subjects].sort((left, right) => String(left).localeCompare(String(right))));
}

/**
 * Returns the frozen list of distinct values asserted for the given subject and
 * predicate, in trace order, ignoring reified-entity assertions.
 */
export function relateFrom(assertions: AssertionTrace, subject: string, predicate: string): readonly unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const assertion of assertions) {
    assertAssertion(assertion);
    if (isReified(assertion.e) || assertion.e !== subject || assertion.a !== predicate) continue;
    const key = stableJson(assertion.v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(assertion.v);
  }
  return Object.freeze(out);
}

function functionalPredicate(functional?: FunctionalPredicate): (predicate: string) => boolean {
  if (typeof functional === "function") return functional;
  if (functional instanceof Set) return (predicate) => functional.has(predicate);
  return () => false;
}
