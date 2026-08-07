// evidence.mts — learning evidence is a sequence of articulated claims, and
// its bedrock form is a sequence of utterances.
//
// A learning evidence item names a cell (subject -predicate-> object) and an opaque
// provenance. Its bedrock form is the single utterance that articulates the
// cell: a relational token mark `{ subject, object }` for a three-place
// entry, the diagonal for a two-place one. An entry carries NO charge —
// charges are measured from the induced world, never seeded, and a contrary
// fact is its own entry claiming a contrary predicate. Serialization of
// utterances is bedrock-owned (dehydrateUtterances / rehydrateUtterances).

import { sectionOf } from "@emsenn/relating";
import { mark, utterance, type UtteranceCarrier } from "@emsenn/relating";
import type { ChargeValueName } from "@emsenn/relating";

import { chargeNameOfCarrier } from "../../../algebra/index.mjs";
import { settleBoundary } from "../../../embodying/boundary/index.mjs";
import {
  cellKey,
  cellOfUtterance,
  markOf,
  markValueOf,
  boundaryInputTag,
  type AnimatingPredicateInput,
  type AnimatingTermInput,
} from "../../../embodying/boundary/relation-boundary.mjs";

export type TermInput = AnimatingTermInput;
export type PredicateInput = AnimatingPredicateInput;

/**
 * One evidential claim for learning: names a cell as subject -predicate-> object (two-place
 * when object is absent, articulated on the diagonal) plus an opaque provenance
 * carried only at the learning layer. An entry carries no charge - a contrary fact
 * is a separate entry asserting a contrary predicate.
 */
export interface LessonEvidence {
  readonly subject: TermInput;
  readonly predicate: PredicateInput;
  readonly object?: TermInput;
  /** Opaque provenance, carried at the learning layer - never into the bedrock. */
  readonly provenance?: unknown;
}

/** The single utterance a learning evidence item articulates: relational when the item
 *  is three-place, diagonal when it is two-place. */
export function utterEvidence(entry: LessonEvidence): UtteranceCarrier {
  const tokenMark = entry.object === undefined
    ? markOf(entry.subject)
    : mark({ subject: markValueOf(entry.subject), object: markValueOf(entry.object) });
  return utterance(tokenMark, markOf(entry.predicate));
}

/** The utterances of a whole learning evidence set, in entry order. */
export function utterEvidenceSet(entries: readonly LessonEvidence[]): readonly UtteranceCarrier[] {
  return Object.freeze(entries.map(utterEvidence));
}

/**
 * One lesson read from the evidence: its subject, predicate, and optional
 * object, the charge value measured at that cell in the knowledge-least section
 * of the induced world, and the provenance of every entry articulating the cell
 * in evidence order.
 */
export interface DerivedLesson {
  readonly subject: TermInput;
  readonly predicate: PredicateInput;
  readonly object?: TermInput;
  /** Charge MEASURED at this cell in the knowledge-least section of the
   *  world the evidence induces - derived, never seeded. */
  readonly value: ChargeValueName;
  /** Provenance of every entry articulating this cell, in evidence order. */
  readonly provenance: readonly unknown[];
}

/**
 * Derive lessons per distinct cell: induce the world the evidence utters, and
 * read each cell's MEASURED charge from the knowledge-least section, with
 * the entries' provenance accumulated per cell at the learning layer. There is
 * no cheaper honest read — the charge of a cell exists only in the induced
 * world, so this is exact and expensive, never a hot path.
 *
 * Ordering law: the cells themselves carry no intrinsic order. The only
 * order the data provides is the evidence sequence, inherited here as
 * first-appearance order under the quotient. Any other ordering (sorting by
 * a serialized key) is a presentation choice and belongs at the boundary,
 * explicitly.
 */
export function deriveLessons(entries: readonly LessonEvidence[]): readonly DerivedLesson[] {
  type Accumulator = {
    subject: TermInput;
    predicate: PredicateInput;
    object: TermInput | undefined;
    utterance: UtteranceCarrier;
    provenance: unknown[];
  };
  if (entries.length === 0) return Object.freeze([]);
  const utterances = utterEvidenceSet(entries);
  const readings = new Map<string, Accumulator>();
  const order: string[] = [];
  for (const [index, entry] of entries.entries()) {
    const key = `${boundaryInputTag(entry.subject)}|${boundaryInputTag(entry.predicate)}|${boundaryInputTag(entry.object)}`;
    let accumulator = readings.get(key);
    if (accumulator === undefined) {
      accumulator = {
        subject: entry.subject,
        predicate: entry.predicate,
        object: entry.object,
        utterance: utterances[index]!,
        provenance: [],
      };
      readings.set(key, accumulator);
      order.push(key);
    }
    if (entry.provenance !== undefined) accumulator.provenance.push(entry.provenance);
  }
  const section = sectionOf(settleBoundary(utterances).fixedPointReadings.knowledgeLeast);
  return Object.freeze(order.map((key) => {
    const accumulator = readings.get(key)!;
    const carrier = accumulator.utterance;
    const projectedKey = cellKey(cellOfUtterance(carrier));
    const matched = section.entries.find((entry) => cellKey(entry.cell) === projectedKey);
    return Object.freeze({
      subject: accumulator.subject,
      predicate: accumulator.predicate,
      ...(accumulator.object !== undefined ? { object: accumulator.object } : {}),
      value: matched === undefined ? "absurd" as const : chargeNameOfCarrier(matched.charge),
      provenance: Object.freeze([...accumulator.provenance]),
    });
  }));
}
