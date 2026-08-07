/**
 * settling/fixed-point-gap — the gap between least and greatest fixed points.
 *
 * Per cell, compares the least extremum's charge to the coincident greatest
 * charge: a closure witness when they agree, an opening obstruction when they
 * differ, a missing-greatest obstruction when the greatest has no coincident
 * cell. The gap vanishes exactly when no obstructions remain — the bilattice
 * interval collapses to a point.
 */
import { sameChargeValue, valueOf, type ChargeCarrier } from "../bilattice-charge.mjs";
import { cellCoincides, type Cell } from "../../predication.mjs";
import { count, natIsZero, type Natural } from "./analysis/exact-number.mjs";
import { rankedReadings, selectRankedReadings } from "./carrier.mjs";
import type { FixedPointExtremum, FixedPointOrderObject } from "./fixed-point.mjs";

/** A cell whose least and greatest charges agree (the gap closes here). */
export interface FixedPointGapCellClosureWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosure:witness";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

/** A cell whose least and greatest charges differ (the gap stays open). */
export interface FixedPointGapCellOpeningObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

/** A least cell with no coincident greatest counterpart. */
export interface FixedPointGapCellMissingGreatestObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
}

/** The per-cell outcome of the least/greatest comparison. */
export type FixedPointGapCellReading =
  | FixedPointGapCellClosureWitness
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/** The obstructing subset of cell readings. */
export type FixedPointGapCellObstruction =
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/** Every per-cell reading, with rank. */
export interface FixedPointGapCellReadingsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellReadings";
  readonly readings: readonly FixedPointGapCellReading[];
  readonly rank: Natural;
}

/** Only the closure witnesses, with rank. */
export interface FixedPointGapCellClosuresCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosures";
  readonly readings: readonly FixedPointGapCellClosureWitness[];
  readonly rank: Natural;
}

/** Only the opening obstructions, with rank. */
export interface FixedPointGapCellOpeningsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpenings";
  readonly readings: readonly FixedPointGapCellOpeningObstruction[];
  readonly rank: Natural;
}

/** Only the missing-greatest obstructions, with rank. */
export interface FixedPointGapMissingGreatestCellsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.missingGreatestCells";
  readonly readings: readonly FixedPointGapCellMissingGreatestObstruction[];
  readonly rank: Natural;
}

/** All obstructing readings, grouped, with rank. */
export interface FixedPointGapCellObstructionsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellObstructions";
  readonly readings: readonly FixedPointGapCellObstruction[];
  readonly rank: Natural;
  readonly openings: FixedPointGapCellOpeningsCarrier;
  readonly missingGreatest: FixedPointGapMissingGreatestCellsCarrier;
}

/** The gap vanishes (no obstructions). */
export interface FixedPointGapVanishingWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing:witness";
  readonly rank: Natural;
}

/** The gap does not vanish. */
export interface FixedPointGapVanishingObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction";
  readonly rank: Natural;
  readonly obstructions: FixedPointGapCellObstructionsCarrier;
}

/** The verdict on whether the gap vanishes. */
export type FixedPointGapVanishingJudgment = FixedPointGapVanishingWitness | FixedPointGapVanishingObstruction;

/** The full fixed-point gap result. */
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

/** Input to the gap computation. */
export interface FixedPointGapInput {
  readonly kind: "predication.valuation.fixedPoint.gap.input";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
}

/** Build a gap input from one order interval. */
export function fixedPointGapInput(order: FixedPointOrderObject, least: FixedPointExtremum, greatest: FixedPointExtremum): FixedPointGapInput {
  return Object.freeze({ kind: "predication.valuation.fixedPoint.gap.input" as const, order, least, greatest });
}

/** Wrap cell readings with rank. */
export const fixedPointGapCellReadings = (readings: readonly FixedPointGapCellReading[]): FixedPointGapCellReadingsCarrier =>
  rankedReadings("predication.valuation.fixedPoint.gap.cellReadings", readings);

/** Select the closure witnesses. */
export const fixedPointGapCellClosures = (readings: readonly FixedPointGapCellReading[]): FixedPointGapCellClosuresCarrier =>
  selectRankedReadings("predication.valuation.fixedPoint.gap.cellClosures", readings,
    (reading): reading is FixedPointGapCellClosureWitness => reading.kind === "predication.valuation.fixedPoint.gap.cellClosure:witness");

/** Select the opening obstructions. */
export const fixedPointGapCellOpenings = (readings: readonly FixedPointGapCellReading[]): FixedPointGapCellOpeningsCarrier =>
  selectRankedReadings("predication.valuation.fixedPoint.gap.cellOpenings", readings,
    (reading): reading is FixedPointGapCellOpeningObstruction => reading.kind === "predication.valuation.fixedPoint.gap.cellOpening-obstruction");

/** Select the missing-greatest obstructions. */
export const fixedPointGapMissingGreatestCells = (readings: readonly FixedPointGapCellReading[]): FixedPointGapMissingGreatestCellsCarrier =>
  selectRankedReadings("predication.valuation.fixedPoint.gap.missingGreatestCells", readings,
    (reading): reading is FixedPointGapCellMissingGreatestObstruction => reading.kind === "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction");

/** Combine openings and missing-greatest into one obstructions carrier. */
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

/** Judge vanishing from an obstructions carrier. */
export const fixedPointGapVanishing = (obstructions: FixedPointGapCellObstructionsCarrier): FixedPointGapVanishingJudgment =>
  natIsZero(obstructions.rank)
    ? Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing:witness" as const, rank: obstructions.rank })
    : Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction" as const, rank: obstructions.rank, obstructions });

/** Compute the gap between an order's least and greatest extrema. */
export function fixedPointGap(input: FixedPointGapInput): FixedPointGapCarrier {
  const least = input.least;
  const greatest = input.greatest;
  const greatestAssignments = greatest.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
  const readings: FixedPointGapCellReading[] = [];
  for (const fiber of least.sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const greatestCharge = greatestAssignments.find((candidate) => cellCoincides(candidate.cell, assignment.cell))?.charge;
      if (!greatestCharge) {
        readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction" as const, cell: assignment.cell, least: assignment.charge }));
        continue;
      }
      if (sameChargeValue(valueOf(assignment.charge), valueOf(greatestCharge))) {
        readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellClosure:witness" as const, cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
        continue;
      }
      readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction" as const, cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
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
