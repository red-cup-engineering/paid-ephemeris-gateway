import { sameChargeValue, valueOf, type ChargeCarrier } from "../../../../articulating/carriers.mjs";
import { predicationCellCoincidenceHolds } from "../../../../articulating/carriers.mjs";
import { count, natIsZero, type Natural } from "../../../../articulating/carriers.mjs";
import type { Cell } from "../../../../articulating/carriers.mjs";
import { rankedReadings, selectRankedReadings } from "./carrier.mjs";
import type {
  FixedPointExtremum,
  FixedPointOrderObject,
} from "./fixed-point.mjs";

/**
 * Witness that a cell coincides between the least and greatest fixed-point
 * extrema: the cell's least and greatest charges carry the same value, so the
 * gap closes at this cell.
 */
export interface FixedPointGapCellClosureWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosure:witness";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

/**
 * Obstruction recording a cell whose least and greatest fixed-point charges
 * differ in value: the gap stays open at this cell, retaining both charges.
 */
export interface FixedPointGapCellOpeningObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

/**
 * Obstruction recording a cell present in the least extremum that has no
 * coincident counterpart in the greatest extremum: the least charge is held
 * with no greatest to compare against.
 */
export interface FixedPointGapCellMissingGreatestObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
}

/**
 * The per-cell outcome of comparing the least and greatest extrema: a closure
 * witness, an opening obstruction, or a missing-greatest obstruction.
 */
export type FixedPointGapCellReading =
  | FixedPointGapCellClosureWitness
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/**
 * The obstructing subset of cell readings: either an opening obstruction or a
 * missing-greatest obstruction, excluding closure witnesses.
 */
export type FixedPointGapCellObstruction =
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/**
 * Carrier holding every per-cell reading produced by the gap comparison, with
 * rank counting the readings.
 */
export interface FixedPointGapCellReadingsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellReadings";
  readonly readings: readonly FixedPointGapCellReading[];
  readonly rank: Natural;
}

/**
 * Carrier holding only the closure witnesses among the cell readings, with rank
 * counting the cells where the gap closes.
 */
export interface FixedPointGapCellClosuresCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosures";
  readonly readings: readonly FixedPointGapCellClosureWitness[];
  readonly rank: Natural;
}

/**
 * Carrier holding only the opening obstructions among the cell readings, with
 * rank counting the cells where least and greatest charges differ.
 */
export interface FixedPointGapCellOpeningsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpenings";
  readonly readings: readonly FixedPointGapCellOpeningObstruction[];
  readonly rank: Natural;
}

/**
 * Carrier holding only the missing-greatest obstructions among the cell
 * readings, with rank counting the least cells lacking a greatest counterpart.
 */
export interface FixedPointGapMissingGreatestCellsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.missingGreatestCells";
  readonly readings: readonly FixedPointGapCellMissingGreatestObstruction[];
  readonly rank: Natural;
}

/**
 * Carrier collecting all obstructing readings - openings together with
 * missing-greatest cells - exposing each grouped sub-carrier and a rank
 * counting the total obstructions.
 */
export interface FixedPointGapCellObstructionsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellObstructions";
  readonly readings: readonly FixedPointGapCellObstruction[];
  readonly rank: Natural;
  readonly openings: FixedPointGapCellOpeningsCarrier;
  readonly missingGreatest: FixedPointGapMissingGreatestCellsCarrier;
}

/**
 * Witness that the gap vanishes: no obstructions remain, so the least and
 * greatest extrema coincide on every cell; rank is zero.
 */
export interface FixedPointGapVanishingWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing:witness";
  readonly rank: Natural;
}

/**
 * Obstruction recording that the gap does not vanish: rank counts the surviving
 * obstructions and the obstructions carrier holds them.
 */
export interface FixedPointGapVanishingObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction";
  readonly rank: Natural;
  readonly obstructions: FixedPointGapCellObstructionsCarrier;
}

/**
 * The verdict on whether the gap vanishes: a vanishing witness when no
 * obstructions remain, otherwise a vanishing obstruction.
 */
export type FixedPointGapVanishingJudgment = FixedPointGapVanishingWitness | FixedPointGapVanishingObstruction;

/**
 * The full result of the fixed-point gap computation: the underlying order,
 * the least and greatest extrema, every cell reading
 * partitioned into closures, openings, missing-greatest cells, and combined
 * obstructions, plus the obstruction rank and the vanishing judgment.
 */
export interface FixedPointGapCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.carrier";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
  readonly cellReadings: FixedPointGapCellReadingsCarrier;
  readonly closures: FixedPointGapCellClosuresCarrier;
  readonly openings: FixedPointGapCellOpeningsCarrier;
  readonly missingGreatest: FixedPointGapMissingGreatestCellsCarrier;
  readonly obstructions: FixedPointGapCellObstructionsCarrier;
  readonly rank: Natural;
  readonly vanishing: FixedPointGapVanishingJudgment;
}

/**
 * Input to the gap computation: one fixed-point order and the least/greatest
 * extrema being compared in that order.
 */
export interface FixedPointGapInput {
  readonly kind: "predication.valuation.fixedPoint.gap.input";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
}

/**
 * Builds a frozen FixedPointGapInput from one fixed-point order interval.
 */
export function fixedPointGapInput(
  order: FixedPointOrderObject,
  least: FixedPointExtremum,
  greatest: FixedPointExtremum,
): FixedPointGapInput {
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.input" as const,
    order,
    least,
    greatest,
  });
}

/**
 * Wraps a list of cell readings in a frozen readings carrier, setting rank to
 * the reading count.
 */
export const fixedPointGapCellReadings = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellReadingsCarrier =>
  rankedReadings("predication.valuation.fixedPoint.gap.cellReadings", readings);

/**
 * Selects the closure witnesses from the given cell readings and returns them
 * in a frozen closures carrier ranked by their count.
 */
export const fixedPointGapCellClosures = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellClosuresCarrier =>
  selectRankedReadings(
    "predication.valuation.fixedPoint.gap.cellClosures",
    readings,
    (reading): reading is FixedPointGapCellClosureWitness =>
      reading.kind === "predication.valuation.fixedPoint.gap.cellClosure:witness",
  );

/**
 * Selects the opening obstructions from the given cell readings and returns
 * them in a frozen openings carrier ranked by their count.
 */
export const fixedPointGapCellOpenings = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellOpeningsCarrier =>
  selectRankedReadings(
    "predication.valuation.fixedPoint.gap.cellOpenings",
    readings,
    (reading): reading is FixedPointGapCellOpeningObstruction =>
      reading.kind === "predication.valuation.fixedPoint.gap.cellOpening-obstruction",
  );

/**
 * Selects the missing-greatest obstructions from the given cell readings and
 * returns them in a frozen carrier ranked by their count.
 */
export const fixedPointGapMissingGreatestCells = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapMissingGreatestCellsCarrier =>
  selectRankedReadings(
    "predication.valuation.fixedPoint.gap.missingGreatestCells",
    readings,
    (reading): reading is FixedPointGapCellMissingGreatestObstruction =>
      reading.kind === "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction",
  );

/**
 * Combines the openings and missing-greatest carriers into a single frozen
 * obstructions carrier: concatenated readings, the two sub-carriers, and a rank
 * totalling both.
 */
export const fixedPointGapCellObstructions = (
  openings: FixedPointGapCellOpeningsCarrier,
  missingGreatest: FixedPointGapMissingGreatestCellsCarrier,
): FixedPointGapCellObstructionsCarrier => {
  const obstructions = Object.freeze([...openings.readings, ...missingGreatest.readings]);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.cellObstructions" as const,
    readings: obstructions,
    rank: count(obstructions),
    openings,
    missingGreatest,
  });
};

/**
 * Judges vanishing from an obstructions carrier: returns a vanishing witness
 * when its rank is zero, otherwise a vanishing obstruction carrying the
 * obstructions.
 */
export const fixedPointGapVanishing = (
  obstructions: FixedPointGapCellObstructionsCarrier,
): FixedPointGapVanishingJudgment =>
  natIsZero(obstructions.rank)
    ? Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing:witness" as const, rank: obstructions.rank })
    : Object.freeze({
      kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction" as const,
      rank: obstructions.rank,
      obstructions,
    });

/**
 * Computes the gap between an order's least and greatest fixed-point extrema:
 * for each least-extremum cell assignment it finds the coincident greatest
 * charge and emits a closure witness when the values match, an opening
 * obstruction when they differ, or a missing-greatest obstruction when no
 * greatest cell coincides, then assembles all partitioned carriers, the
 * obstruction rank, and the vanishing judgment into a FixedPointGapCarrier.
 */
export function fixedPointGap(input: FixedPointGapInput): FixedPointGapCarrier {
  const least = input.least;
  const greatest = input.greatest;
  const greatestAssignments = greatest.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
  const readings: FixedPointGapCellReading[] = [];
  for (const fiber of least.sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const greatestCharge = greatestAssignments.find((candidate) => predicationCellCoincidenceHolds(candidate.cell, assignment.cell))?.charge;
      if (!greatestCharge) {
        const missing = Object.freeze({
          kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction" as const,
          cell: assignment.cell,
          least: assignment.charge,
        });
        readings.push(missing);
        continue;
      }
      if (sameChargeValue(valueOf(assignment.charge), valueOf(greatestCharge))) {
        readings.push(Object.freeze({
          kind: "predication.valuation.fixedPoint.gap.cellClosure:witness" as const,
          cell: assignment.cell,
          least: assignment.charge,
          greatest: greatestCharge,
        }));
        continue;
      }
      const opening = Object.freeze({
        kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction" as const,
        cell: assignment.cell,
        least: assignment.charge,
        greatest: greatestCharge,
      });
      readings.push(opening);
    }
  }
  const cellReadings = fixedPointGapCellReadings(readings);
  const closures = fixedPointGapCellClosures(readings);
  const openings = fixedPointGapCellOpenings(readings);
  const missingGreatest = fixedPointGapMissingGreatestCells(readings);
  const obstructions = fixedPointGapCellObstructions(openings, missingGreatest);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.carrier" as const,
    order: input.order,
    least,
    greatest,
    cellReadings,
    closures,
    openings,
    missingGreatest,
    obstructions,
    rank: obstructions.rank,
    vanishing: fixedPointGapVanishing(obstructions),
  });
}
