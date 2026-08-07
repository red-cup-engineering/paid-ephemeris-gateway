// evidence-log.mts — an in-memory learning memory of utterances.
//
// It ADMITS (append, accretive, never overwrite) and RECALLS (by the cell an
// utterance articulates) — nothing more. It does not measure what it holds:
// charges exist only in the induced world, and worlds are induced only on
// the explicit `carrier` / `section` reads — induction is exact and
// expensive, so it never belongs on a hot path.

import {
  sectionOf,
  type SectionCarrier,
} from "@emsenn/relating";
import type { UtteranceCarrier } from "@emsenn/relating";
import type { Cell } from "@emsenn/relating";
import { settleBoundary, type AgentBoundaryCarrier } from "../../../embodying/boundary/index.mjs";
import {
  cellKey,
  cellOfTerms,
  cellOfUtterance,
  utteranceMatchesProjection,
  type AnimatingPredicateInput,
  type AnimatingTermInput,
} from "../../../embodying/boundary/relation-boundary.mjs";

export type TermInput = AnimatingTermInput;
export type PredicateInput = AnimatingPredicateInput;
export { cellKey, cellOfTerms, cellOfUtterance };

type SectionOrder = "knowledge" | "truth";
type SectionBound = "least" | "greatest";

const atCell = (carrier: UtteranceCarrier, target: Cell): boolean =>
  cellKey(cellOfUtterance(carrier)) === cellKey(target);

/**
 * An in-memory, append-only log of utterances keyed by the cell each
 * articulates: admits carriers accretively and never overwrites, recalls and
 * tests them by cell, and on explicit reads induces the world they utter or a
 * section of it.
 */
export class LessonMemory {
  #log: UtteranceCarrier[] = [];

  /** Append utterances. Accretive — never overwrites. Chainable. */
  admit(...utterances: readonly UtteranceCarrier[]): this {
    this.#log.push(...utterances);
    return this;
  }

  /** Every utterance admitted at this cell, in admission order. */
  recall(subject: TermInput, predicate: PredicateInput, object?: TermInput): readonly UtteranceCarrier[] {
    return this.#log.filter((carrier) => utteranceMatchesProjection(carrier, subject, predicate, object));
  }

  /** Whether any utterance is admitted at this cell. */
  has(subject: TermInput, predicate: PredicateInput, object?: TermInput): boolean {
    return this.#log.some((carrier) => utteranceMatchesProjection(carrier, subject, predicate, object));
  }

  get size(): number {
    return this.#log.length;
  }

  get utterances(): readonly UtteranceCarrier[] {
    return [...this.#log];
  }

  /** Induce the world the log utters. Exact and expensive — an explicit read, never a hot path. */
  carrier(): AgentBoundaryCarrier {
    if (this.#log.length === 0) throw new TypeError("LessonMemory.carrier: an empty memory founds no world");
    return settleBoundary(this.#log);
  }

  /** A section of the induced world. Defaults to the knowledge-least reading. */
  section(order: SectionOrder = "knowledge", bound: SectionBound = "least"): SectionCarrier {
    const readings = this.carrier().fixedPointReadings;
    if (order === "knowledge") return sectionOf(bound === "least" ? readings.knowledgeLeast : readings.knowledgeGreatest);
    return sectionOf(bound === "least" ? readings.truthLeast : readings.truthGreatest);
  }
}
