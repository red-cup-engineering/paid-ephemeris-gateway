/**
 * animating boundary transition — measurement of change between settled agent boundaries.
 *
 * Where boundary reads structure off a settled carrier (sections, bearings,
 * membranes), transition measures the delta between two carriers. The primitive
 * is `transition`: given two settled boundary states, enumerate exactly which cells
 * shifted charge and by how much on the knowledge order.
 *
 * This is the animating-level structural transition reader: it answers
 * "what changed between a prior and a posterior state?" — but at the structural
 * (per-cell) level rather than the aggregate (distribution) level.
 */

import {
  sectionOf,
} from "@emsenn/relating";
import { cellIdentity, type Cell } from "@emsenn/relating";
import type { ChargeValue } from "@emsenn/relating";
import { chargeValueNamed, chargeValueOfCarrier } from "../../algebra/index.mjs";
import type { AgentBoundaryCarrier } from "./index.mjs";

// ---------- private helpers ----------

const truthPresent = (value: ChargeValue): boolean => value.coordinates[0].name === "present";
const falsityPresent = (value: ChargeValue): boolean => value.coordinates[1].name === "present";

const knowledgeHeight = (value: ChargeValue): number =>
  (truthPresent(value) ? 1 : 0) + (falsityPresent(value) ? 1 : 0);

const absurd = (): ChargeValue => chargeValueNamed("absurd");

const sameCell = (left: Cell, right: Cell): boolean =>
  cellIdentity(left, right).kind === "predication.cellIdentity:witness";

const sectionValues = (carrier: AgentBoundaryCarrier): readonly { cell: Cell; value: ChargeValue }[] =>
  sectionOf(carrier.fixedPointReadings.knowledgeLeast).entries.map((entry) => ({
    cell: entry.cell,
    value: chargeValueOfCarrier(entry.charge),
  }));

// ---------- transition ----------

/**
 * A single cell's charge change between two settled carriers: the cell, its
 * before and after charge values, and knowledgeShift, the signed integer in
 * -2..2 giving the movement in knowledge-order height.
 */
export interface ChargeShift {
  readonly kind: "animating.analysis.shift";
  readonly cell: Cell;
  readonly before: ChargeValue;
  readonly after: ChargeValue;
  /** Knowledge-order height movement, exact integer in -2..2. */
  readonly knowledgeShift: number;
}

/**
 * The result of a transition: holds shifts, the set of every cell whose charge
 * changed between two carriers. Cells that did not change are absent, and cells
 * entering or leaving the carrier appear as shifts to or from the absurd
 * charge.
 */
export interface TransitionCarrier {
  readonly kind: "animating.analysis.transition";
  /** Only cells whose charge changed; absence reads absurd, so entering and
   *  leaving cells appear here. */
  readonly shifts: readonly ChargeShift[];
}

/** The charge transition between two carriers, read at the knowledge-least section.
 *  Absence is data: cells that enter or leave the carrier appear as shifts from or
 *  to the absurd charge. */
export function transition(before: AgentBoundaryCarrier, after: AgentBoundaryCarrier): TransitionCarrier {
  const earlier = sectionValues(before);
  const later = sectionValues(after);
  const shifts: ChargeShift[] = [];

  const shifted = (cell: Cell, beforeValue: ChargeValue, afterValue: ChargeValue): void => {
    if (beforeValue.name === afterValue.name) return;
    shifts.push(Object.freeze({
      kind: "animating.analysis.shift" as const,
      cell,
      before: beforeValue,
      after: afterValue,
      knowledgeShift: knowledgeHeight(afterValue) - knowledgeHeight(beforeValue),
    }));
  };

  for (const entry of earlier) {
    const counterpart = later.find((candidate) => sameCell(candidate.cell, entry.cell));
    shifted(entry.cell, entry.value, counterpart?.value ?? absurd());
  }
  for (const entry of later) {
    if (!earlier.some((candidate) => sameCell(candidate.cell, entry.cell))) {
      shifted(entry.cell, absurd(), entry.value);
    }
  }
  return Object.freeze({ kind: "animating.analysis.transition" as const, shifts: Object.freeze(shifts) });
}
