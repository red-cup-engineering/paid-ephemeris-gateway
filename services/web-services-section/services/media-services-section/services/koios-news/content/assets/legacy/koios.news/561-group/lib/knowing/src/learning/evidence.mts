// evidence.mts — learning evidence is a sequence of articulated claims; its
// bedrock form is a sequence of utterances.
//
// A learning-evidence item names a cell `subject -predicate-> object` plus an
// opaque provenance carried only at the learning layer. Its bedrock form is the
// single utterance articulating the cell — a relational token mark `{subject,
// object}` for a three-place entry, the diagonal (`subject` alone) for a two-place
// one. An entry carries NO charge: charges are measured from the induced world,
// never seeded, and a contrary fact is its own entry claiming a contrary
// predicate. Derived on @emsenn/relating's mark/utterance only.

import {
  articulate,
  fixedPointReadings,
  fixedPoints,
  predicate,
  predicationSite,
  posit,
  sectionOf,
  type Cell,
  type ChargeCarrier,
  type ChargeValueName,
  type MemeTopologyFixedPointReadings,
  type PredicationPredicate,
  type SectionCarrier,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { mark, cellIdentity, utterance } from "@emsenn/relating";
import { task as knowingTask } from "../dreaming/task.mjs";
import type { Task } from "../dreaming/task.mjs";

/**
 * One evidential claim for learning: names a cell `subject -predicate-> object`
 * (two-place when `object` is absent, articulated on the diagonal) plus an opaque
 * provenance carried only at the learning layer. An entry carries no charge — a
 * contrary fact is a separate entry asserting a contrary predicate.
 */
export interface LessonEvidence {
  readonly subject: string;
  readonly predicate: string;
  readonly object?: string;
  /** Opaque provenance, carried at the learning layer — never into the bedrock. */
  readonly provenance?: unknown;
}

/** The single utterance a learning-evidence item articulates: relational when the
 *  item is three-place, diagonal when it is two-place. */
export function utterEvidence(entry: LessonEvidence): UtteranceCarrier {
  const tokenMark = entry.object === undefined
    ? mark(entry.subject)
    : mark({ subject: entry.subject, object: entry.object });
  return utterance(tokenMark, mark(entry.predicate));
}

/** The utterances of a whole learning-evidence set, in entry order. */
export function utterEvidenceSet(entries: readonly LessonEvidence[]): readonly UtteranceCarrier[] {
  return Object.freeze(entries.map(utterEvidence));
}

/**
 * One lesson measured from evidence: its original evidence coordinates, the
 * charge value measured in the knowledge-least section of the induced world, and
 * every provenance value attached to the cell in evidence order.
 */
export interface DerivedLesson {
  readonly subject: string;
  readonly predicate: string;
  readonly object?: string;
  readonly value: ChargeValueName;
  readonly provenance: readonly unknown[];
}

type LessonAccumulator = {
  subject: string;
  predicate: string;
  object: string | undefined;
  task: Task;
  provenance: unknown[];
};

type SectionOrder = "knowledge" | "truth";
type SectionBound = "least" | "greatest";

const chargeNameOfCarrier = (carrier: ChargeCarrier): ChargeValueName => {
  const [truth, falsity] = carrier.value;
  if (truth.name === "present") return falsity.name === "present" ? "stable" : "potential";
  return falsity.name === "present" ? "active" : "absurd";
};

const sameCell = (left: Cell, right: Cell): boolean =>
  cellIdentity(left, right).kind === "predication.identity:witness";

const predicateMatches = (predicate: PredicationPredicate, value: string): boolean =>
  predicate.mark.value === value;

const taskOfEvidence = (entry: LessonEvidence): Task => knowingTask(utterEvidence(entry));

const evidenceKey = (entry: LessonEvidence): string =>
  JSON.stringify([entry.subject, entry.predicate, entry.object ?? null]);

/**
 * Derive lessons per distinct evidence cell: induce the world the evidence
 * utters, then read each cell's measured charge from the knowledge-least section.
 * Charges are derived from the settled world, never admitted as evidence.
 */
export function deriveLessons(entries: readonly LessonEvidence[]): readonly DerivedLesson[] {
  if (entries.length === 0) return Object.freeze([]);
  const memory = new LessonMemory().admit(...utterEvidenceSet(entries));
  const readings = new Map<string, LessonAccumulator>();
  const order: string[] = [];

  for (const entry of entries) {
    const key = evidenceKey(entry);
    let accumulator = readings.get(key);
    if (accumulator === undefined) {
      accumulator = {
        subject: entry.subject,
        predicate: entry.predicate,
        object: entry.object,
        task: taskOfEvidence(entry),
        provenance: [],
      };
      readings.set(key, accumulator);
      order.push(key);
    }
    if (entry.provenance !== undefined) accumulator.provenance.push(entry.provenance);
  }

  const section = memory.section();
  return Object.freeze(order.map((key) => {
    const accumulator = readings.get(key)!;
    const matched = section.entries.find((entry) => sameCell(entry.cell, accumulator.task.cell));
    return Object.freeze({
      subject: accumulator.subject,
      predicate: accumulator.predicate,
      ...(accumulator.object === undefined ? {} : { object: accumulator.object }),
      value: matched === undefined ? "absurd" as const : chargeNameOfCarrier(matched.charge),
      provenance: Object.freeze([...accumulator.provenance]),
    });
  }));
}

/**
 * Append-only utterance memory for learning evidence. It admits utterances
 * accretively, recalls them by projected task cell, and only induces sections on
 * explicit reads.
 */
export class LessonMemory {
  #log: UtteranceCarrier[] = [];

  admit(...utterances: readonly UtteranceCarrier[]): this {
    this.#log.push(...utterances);
    return this;
  }

  recall(subject: string, predicate: string, object?: string): readonly UtteranceCarrier[] {
    return this.#log.filter((carrier) => taskMatches(knowingTask(carrier), subject, predicate, object));
  }

  has(subject: string, predicate: string, object?: string): boolean {
    return this.#log.some((carrier) => taskMatches(knowingTask(carrier), subject, predicate, object));
  }

  get size(): number {
    return this.#log.length;
  }

  get utterances(): readonly UtteranceCarrier[] {
    return Object.freeze([...this.#log]);
  }

  carrier(): ReturnType<typeof settleLearningUtterances> {
    if (this.#log.length === 0) throw new TypeError("LessonMemory.carrier: an empty memory founds no world");
    return settleLearningUtterances(this.#log);
  }

  section(order: SectionOrder = "knowledge", bound: SectionBound = "least"): SectionCarrier {
    const readings = this.carrier();
    if (order === "knowledge") return sectionOf(bound === "least" ? readings.knowledgeLeast : readings.knowledgeGreatest);
    return sectionOf(bound === "least" ? readings.truthLeast : readings.truthGreatest);
  }
}

function taskMatches(task: Task, subject: string, predicate: string, object?: string): boolean {
  const carrier = task.utterance;
  if (!predicateMatches(task.predicate, predicate)) return false;
  const tokenValue = carrier.token.mark.value;
  if (object === undefined) return tokenValue === subject;
  return typeof tokenValue === "object"
    && tokenValue !== null
    && !Array.isArray(tokenValue)
    && (tokenValue as { readonly subject?: unknown }).subject === subject
    && (tokenValue as { readonly object?: unknown }).object === object;
}

function settleLearningUtterances(utterances: readonly UtteranceCarrier[]): MemeTopologyFixedPointReadings {
  const generated = utterances.map((carrier) => predicate(articulate(carrier)));
  const predicated = predicationSite(generated.flatMap((site) => [...site.cells.cells, ...site.specializations]));
  const posited = posit(predicated);
  return fixedPointReadings(fixedPoints(posited));
}
