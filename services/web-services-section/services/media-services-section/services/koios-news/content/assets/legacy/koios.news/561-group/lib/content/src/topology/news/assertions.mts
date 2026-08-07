/**
 * assertions — the claim carrier's relationship to the relationality charge
 * algebra: the round-trip between editorial WRITE requests, a flat ASSERTION
 * TRACE of charged cells, and the per-subject CLAIM SETS folded back out of it.
 *
 * This is content-domain, not agency: it is the news carrier's own
 * (de)serialization over @emsenn/relating charges and the content domain's
 * OWN JsonValue — it borrows nothing from the agent fleet. (It was harvested
 * out of services/newsroom, which had only agent's JsonLike to hand; here it
 * sits where it belongs, below both the newsroom fiber and the wire surfaces.)
 *
 * A WRITE is `{ subject, claims, citation }`. An ASSERTION is the charged cell
 * `{ e (entity/subject), a (attribute = predicate+object), v (charge carrier),
 * t (transaction) }`; a gate object of "fail" is asserted as a DENIAL, every
 * other claim as a witnessed potential. Folding a trace groups assertions by
 * subject and partitions the cells by the settled charge name into a
 * NewsClaimSet's potential/active/stable.
 */

import { mark, negate, valueOf, witnessedPotential, type ChargeCarrier } from "@emsenn/relating";
import { canonical, type JsonValue as ResourceJsonValue } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";

import { GATE_FAIL, type JsonValue, type NewsClaim, type NewsClaimSet, type NewsClaimWrite } from "./index.mjs";

/** A charged claim cell: entity, attribute (predicate + object), the charge
 * carrier (with its witnesses), and the transaction it was asserted in. */
export type NewsAssertion = Readonly<{ e: JsonValue; a: JsonValue; v: ChargeCarrier; t: JsonValue }>;
export type NewsAssertionTrace = readonly NewsAssertion[];

/** The input to a single claim assertion. */
export type ClaimAssertionInput = Readonly<{
  subject: string;
  predicate: string;
  object: unknown;
  citation: string;
  transaction: JsonValue;
}>;

/** Options for folding writes into a trace: the transaction stamped on every
 * assertion (the caller owns the clock). */
export type AssertionsFromWritesOptions = Readonly<{ transaction: JsonValue }>;

const affirmed = (witness: unknown): ChargeCarrier => witnessedPotential(mark(witness));
const denied = (witness: unknown): ChargeCarrier => negate(witnessedPotential(mark(witness)));

/** Coerce a value to the content domain's JsonValue, rejecting non-JSON
 * shapes; `undefined` object fields are dropped. */
export function toJsonValue(value: unknown, path = "value"): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must be a finite number`);
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((item, index) => toJsonValue(item, `${path}[${index}]`)));
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} must be JSON-like`);
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      out[key] = toJsonValue(item, `${path}.${key}`);
    }
    return Object.freeze(out);
  }
  throw new TypeError(`${path} must be JSON-like`);
}

/** A write request against a subject's claims. */
export function write(subject: string, claims: Readonly<Record<string, unknown>>, citation: string): NewsClaimWrite {
  return Object.freeze({ subject, claims: Object.freeze({ ...claims }), citation });
}

/** A gate-clearing write: the gate predicate carries pass/fail under the
 * subject, cited to the desk that ruled it. */
export function clearGate(subject: string, gate: string, pass = true, citation = `news:${gate}`): NewsClaimWrite {
  return write(subject, { [gate]: pass ? "pass" : GATE_FAIL }, citation);
}

/** A stable, order-independent key for a JSON value (object keys sorted). */
export function stableJsonKey(value: JsonValue): string {
  return canonical(value as ResourceJsonValue);
}

/** The deterministic id of an assertion: a stable key over its entity,
 * attribute, transaction, and settled charge name. */
export function traceEntryId(entry: NewsAssertion): string {
  return `assertion:${stableJsonKey({ e: entry.e, a: entry.a, t: (entry.t ?? null) as JsonValue, v: valueOf(entry.v).name })}`;
}

/** One claim asserted: a witnessed potential, or a denial when the object is a
 * gate fail. */
export function assertionFromClaim(claim: ClaimAssertionInput): NewsAssertion {
  const object = toJsonValue(claim.object, `${claim.subject}.${claim.predicate}`);
  return Object.freeze({
    e: toJsonValue(claim.subject, "subject"),
    a: Object.freeze({ predicate: toJsonValue(claim.predicate, "predicate"), object }),
    v: object === GATE_FAIL ? denied(claim.citation) : affirmed(claim.citation),
    t: claim.transaction,
  });
}

/** Fold a list of writes into an assertion trace, one assertion per defined
 * claim, each stamped with the transaction. */
export function assertionsFromWrites(writes: readonly NewsClaimWrite[], options: AssertionsFromWritesOptions): NewsAssertionTrace {
  const transaction = toJsonValue(options.transaction, "transaction");
  const assertions: NewsAssertion[] = [];
  for (const request of writes) {
    for (const [predicate, object] of Object.entries(request.claims)) {
      if (object === undefined) continue;
      assertions.push(assertionFromClaim({ subject: request.subject, predicate, object, citation: request.citation, transaction }));
    }
  }
  return Object.freeze(assertions);
}

function newsSubject(value: JsonValue): string {
  return typeof value === "string" ? value : stableJsonKey(value);
}

function newsPredicate(value: JsonValue): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, JsonValue>;
    if (typeof record.mark === "string" && record.mark.trim()) return record.mark;
    if (typeof record.predicate === "string" && record.predicate.trim()) return record.predicate;
  }
  return null;
}

function newsObject(attribute: JsonValue, fallback: JsonValue): unknown {
  if (attribute && typeof attribute === "object" && !Array.isArray(attribute)) {
    const record = attribute as Record<string, JsonValue>;
    if (record.object !== undefined) return record.object;
  }
  return fallback;
}

function newsClaimFromTraceEntry(entry: NewsAssertion): { subject: string; claim: NewsClaim } | null {
  const predicate = newsPredicate(entry.a);
  if (predicate === null) return null;
  return {
    subject: newsSubject(entry.e),
    claim: Object.freeze({
      predicate,
      object: newsObject(entry.a, entry.t),
      citation: traceEntryId(entry),
      claimedBy: Object.freeze(entry.v.evidence[0].map(String)),
      contraryClaimedBy: Object.freeze(entry.v.evidence[1].map(String)),
    }),
  };
}

/** Fold an assertion trace back into per-subject claim sets: assertions group
 * by subject and partition by their settled charge into potential/active/
 * stable cells. */
export function claimSetsFromTrace(trace: NewsAssertionTrace): readonly NewsClaimSet[] {
  const grouped = new Map<string, { potential: NewsClaim[]; active: NewsClaim[]; stable: NewsClaim[]; t?: unknown }>();
  for (const entry of trace) {
    const mapped = newsClaimFromTraceEntry(entry);
    if (!mapped) continue;
    const bucket = grouped.get(mapped.subject) ?? { potential: [], active: [], stable: [] };
    if (entry.t !== undefined) bucket.t = entry.t;
    const charge = valueOf(entry.v).name;
    if (charge === "stable") bucket.stable.push(mapped.claim);
    else if (charge === "potential") bucket.potential.push(mapped.claim);
    else if (charge === "active") bucket.active.push(mapped.claim);
    grouped.set(mapped.subject, bucket);
  }
  return Object.freeze([...grouped.entries()].map(([subject, bucket]) => Object.freeze({
    subject,
    potential: Object.freeze(bucket.potential),
    active: Object.freeze(bucket.active),
    stable: Object.freeze(bucket.stable),
    ...(bucket.t === undefined ? {} : { t: bucket.t }),
  })));
}
