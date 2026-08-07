/**
 * relation-boundary — animating's local projection boundary from relating
 * carriers to value-level relation cells.
 *
 * Core animating code should not inspect `Mark` payloads directly. The exception
 * is this file: it proves whether an utterance token mark carries the
 * `{ subject, object }` relation shape animating admits at its boundary, then
 * derives stable cell keys and relation-aware reads from that proof. Everything
 * exported here is package-internal vocabulary for that boundary, not a public
 * ontology.
 */

import {
  cell,
  claim,
  mark,
  predicateOfClaim,
  token,
  type Cell,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { canonical, requireJsonValue } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json";

export type AnimatingBoundaryInput = string | Mark | PredicationTerm | PredicationPredicate;
export type AnimatingTermInput = string | Mark | PredicationTerm;
export type AnimatingPredicateInput = string | Mark | PredicationPredicate;

export const isMark = (input: AnimatingBoundaryInput): input is Mark =>
  typeof input === "object" && input !== null && input.kind === "utterance.mark";

export const isToken = (input: AnimatingBoundaryInput): input is PredicationTerm =>
  typeof input === "object" && input !== null && input.kind === "utterance.token";

export const isPredicate = (input: AnimatingBoundaryInput): input is PredicationPredicate =>
  typeof input === "object" && input !== null && input.kind === "predication.predicate";

export function markOf(input: AnimatingBoundaryInput): Mark {
  if (typeof input === "string") return mark(input);
  if (isMark(input)) return input;
  return input.mark;
}

export function termOf(input: AnimatingTermInput): PredicationTerm {
  if (isToken(input)) return input;
  return token(markOf(input));
}

export function predicateOf(input: AnimatingPredicateInput): PredicationPredicate {
  if (isPredicate(input)) return input;
  return predicateOfClaim(claim(markOf(input)));
}

export function markValueOf(input: AnimatingBoundaryInput): unknown {
  if (typeof input === "string") return input;
  if (isMark(input)) return input.value;
  return input.mark.value;
}

export function termLabel(input: AnimatingBoundaryInput): string {
  if (typeof input === "string") return input;
  if (isMark(input)) return String(input.value);
  return String(input.mark.value);
}

export function relationTermOf(subject: AnimatingTermInput, object: AnimatingTermInput): PredicationTerm {
  return token(mark({ subject: markValueOf(subject), object: markValueOf(object) }));
}

export function stableJson(value: unknown): string {
  return canonical(requireJsonValue(value, "boundary value"));
}

export function sameBoundaryValue(left: unknown, right: AnimatingBoundaryInput): boolean {
  return stableJson(left) === stableJson(markValueOf(right));
}

export function relationPairOf(term: PredicationTerm): { readonly subject: unknown; readonly object: unknown } | undefined {
  const value = term.mark.value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as { readonly subject?: unknown; readonly object?: unknown };
  if (Object.keys(record).length !== 2 || record.subject === undefined || record.object === undefined) return undefined;
  return record as { readonly subject: unknown; readonly object: unknown };
}

function normalizedCellTermValues(cellCarrier: Cell): readonly [unknown, unknown] {
  const subject = cellCarrier.subject.mark.value;
  const object = cellCarrier.object.mark.value;
  if (stableJson(subject) === stableJson(object)) return [subject, object];
  const relation = { subject, object };
  return [relation, relation];
}

/** Animating's boundary-level cell key: value equality over mark payloads. */
export function cellKey(cellCarrier: Cell): string {
  const [subject, object] = normalizedCellTermValues(cellCarrier);
  return [
    stableJson(subject),
    stableJson(cellCarrier.predicate.mark.value),
    stableJson(object),
  ].join("|");
}

export function cellOfTerms(
  subject: AnimatingTermInput,
  predicate: AnimatingPredicateInput,
  object?: AnimatingTermInput,
): Cell {
  const subjectTerm = object === undefined ? termOf(subject) : relationTermOf(subject, object);
  return cell(subjectTerm, predicateOf(predicate), subjectTerm);
}

/** Both atomic and relation-shaped token marks settle on the diagonal. */
export function cellOfUtterance(carrier: UtteranceCarrier): Cell {
  return cell(carrier.token, predicateOfClaim(carrier.claim), carrier.token);
}

export function utteranceMatchesProjection(
  carrier: UtteranceCarrier,
  subject: AnimatingTermInput,
  predicate: AnimatingPredicateInput,
  object?: AnimatingTermInput,
): boolean {
  if (!sameBoundaryValue(carrier.claim.mark.value, predicate)) return false;
  if (object === undefined) return sameBoundaryValue(carrier.token.mark.value, subject);
  const pair = relationPairOf(carrier.token);
  return pair !== undefined
    && sameBoundaryValue(pair.subject, subject)
    && sameBoundaryValue(pair.object, object);
}

export function termTouches(term: PredicationTerm, input: AnimatingTermInput): boolean {
  if (sameBoundaryValue(term.mark.value, input)) return true;
  const pair = relationPairOf(term);
  return pair !== undefined && (sameBoundaryValue(pair.subject, input) || sameBoundaryValue(pair.object, input));
}

export function predicateMatches(predicate: PredicationPredicate, input: AnimatingPredicateInput): boolean {
  return sameBoundaryValue(predicate.mark.value, input);
}

export function boundaryInputTag(input: AnimatingBoundaryInput | undefined): string {
  return input === undefined
    ? "reflexive"
    : typeof input === "string"
      ? `s:${input}`
      : `m:${stableJson(markValueOf(input))}`;
}
