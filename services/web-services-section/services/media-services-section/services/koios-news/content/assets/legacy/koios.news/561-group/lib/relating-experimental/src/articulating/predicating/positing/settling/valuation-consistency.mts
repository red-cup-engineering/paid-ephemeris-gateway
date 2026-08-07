/**
 * settling/valuation-consistency — per-assignment consistency of a valuation.
 *
 * Each assignment's charge is read through the linear-logic charge-consistency
 * judgment (a value is inconsistent exactly when both sides are present —
 * `stable`). The valuation splits into consistent and contradictory
 * subvaluations; the contradiction rank vanishes exactly when no assignment is
 * stable. Contradictions are kept as data, never thrown — the paraconsistent stance.
 */
import { sameCharge, valueOf, type ChargeValue } from "../bilattice-charge.mjs";
import { chargeConsistency, type ChargeConsistencyJudgment } from "../logic/index.mjs";
import { natIsZero, type Natural } from "./analysis/exact-number.mjs";
import { cellCoincides } from "../../predication.mjs";
import { rankedReadings, selectRankedReadings } from "./carrier.mjs";
import type { FiberAlgebra, Meme, Valuation } from "../fiber.mjs";

/** A charge-consistent assignment. */
export interface ValuationAssignmentConsistencyWitness {
  readonly kind: "predication.valuation.consistency.assignment:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

/** A charge-contradictory assignment. */
export interface ValuationAssignmentContradictionWitness {
  readonly kind: "predication.valuation.consistency.assignmentContradiction:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

/** A per-assignment consistency reading. */
export type ValuationConsistencyJudgment = ValuationAssignmentConsistencyWitness | ValuationAssignmentContradictionWitness;

/** All per-assignment readings, with rank. */
export interface ValuationConsistencyReadingsCarrier {
  readonly kind: "predication.valuation.consistency.readings";
  readonly readings: readonly ValuationConsistencyJudgment[];
  readonly rank: Natural;
}

/** The consistent assignments, with rank. */
export interface ValuationConsistentAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.consistentAssignments";
  readonly readings: readonly ValuationAssignmentConsistencyWitness[];
  readonly rank: Natural;
}

/** The contradictory assignments, with rank. */
export interface ValuationContradictoryAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.contradictoryAssignments";
  readonly readings: readonly ValuationAssignmentContradictionWitness[];
  readonly rank: Natural;
}

/** The contradiction obstruction vanishes. */
export interface ValuationConsistencyVanishingWitness {
  readonly kind: "predication.valuation.consistency.vanishing:witness";
  readonly rank: Natural;
}

/** The contradiction obstruction does not vanish. */
export interface ValuationConsistencyVanishingObstruction {
  readonly kind: "predication.valuation.consistency.vanishing-obstruction";
  readonly rank: Natural;
  readonly contradictions: ValuationContradictoryAssignmentsCarrier;
}

/** Judgment on whether contradictions vanish. */
export type ValuationConsistencyVanishingJudgment = ValuationConsistencyVanishingWitness | ValuationConsistencyVanishingObstruction;

/** A valuation restricted to its consistent assignments. */
export interface ConsistentValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.consistentSubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationConsistentAssignmentsCarrier;
}

/** A valuation restricted to its contradictory assignments. */
export interface ContradictoryValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.contradictorySubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationContradictoryAssignmentsCarrier;
}

/** The full consistency analysis of a valuation. */
export interface PredicationValuationConsistencyCarrier {
  readonly kind: "predication.valuation.consistency.carrier";
  readonly valuation: Valuation;
  readonly assignmentReadings: ValuationConsistencyReadingsCarrier;
  readonly consistentAssignments: ValuationConsistentAssignmentsCarrier;
  readonly contradictoryAssignments: ValuationContradictoryAssignmentsCarrier;
  readonly contradictionRank: Natural;
  readonly vanishing: ValuationConsistencyVanishingJudgment;
  readonly consistentSubvaluation: ConsistentValuationSubcarrier;
  readonly contradictorySubvaluation: ContradictoryValuationSubcarrier;
}

function valuationAssignments(valuation: Valuation): readonly Meme[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));
}

const valuationAssignmentCoincidenceHolds = (left: Meme, right: Meme): boolean =>
  cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);

const readingMatchesAssignment = (reading: ValuationConsistencyJudgment, assignment: Meme): boolean =>
  valuationAssignmentCoincidenceHolds(reading.assignment, assignment);

/** Wrap per-assignment readings with rank. */
export const valuationConsistencyReadings = (readings: readonly ValuationConsistencyJudgment[]): ValuationConsistencyReadingsCarrier =>
  rankedReadings("predication.valuation.consistency.readings", readings);

/** Select the consistency witnesses. */
export const valuationConsistentAssignments = (readings: readonly ValuationConsistencyJudgment[]): ValuationConsistentAssignmentsCarrier =>
  selectRankedReadings("predication.valuation.consistency.consistentAssignments", readings,
    (reading): reading is ValuationAssignmentConsistencyWitness => reading.kind === "predication.valuation.consistency.assignment:witness");

/** Select the contradiction witnesses. */
export const valuationContradictoryAssignments = (readings: readonly ValuationConsistencyJudgment[]): ValuationContradictoryAssignmentsCarrier =>
  selectRankedReadings("predication.valuation.consistency.contradictoryAssignments", readings,
    (reading): reading is ValuationAssignmentContradictionWitness => reading.kind === "predication.valuation.consistency.assignmentContradiction:witness");

const subvaluationOfReadings = (valuation: Valuation, readings: readonly ValuationConsistencyJudgment[]): Valuation =>
  Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
      ...fiber,
      assignments: Object.freeze(fiber.assignments.filter((assignment) => readings.some((reading) => readingMatchesAssignment(reading, assignment)))),
    }) satisfies FiberAlgebra)),
  });

/** A consistent-valuation subcarrier. */
export const consistentValuationSubcarrier = (valuation: Valuation, assignments: ValuationConsistentAssignmentsCarrier): ConsistentValuationSubcarrier =>
  Object.freeze({ kind: "predication.valuation.consistency.consistentSubvaluation" as const, valuation: subvaluationOfReadings(valuation, assignments.readings), assignments });

/** A contradictory-valuation subcarrier. */
export const contradictoryValuationSubcarrier = (valuation: Valuation, assignments: ValuationContradictoryAssignmentsCarrier): ContradictoryValuationSubcarrier =>
  Object.freeze({ kind: "predication.valuation.consistency.contradictorySubvaluation" as const, valuation: subvaluationOfReadings(valuation, assignments.readings), assignments });

/** Decide vanishing from a contradictory-assignments carrier. */
export const valuationConsistencyVanishing = (contradictions: ValuationContradictoryAssignmentsCarrier): ValuationConsistencyVanishingJudgment =>
  natIsZero(contradictions.rank)
    ? Object.freeze({ kind: "predication.valuation.consistency.vanishing:witness" as const, rank: contradictions.rank })
    : Object.freeze({ kind: "predication.valuation.consistency.vanishing-obstruction" as const, rank: contradictions.rank, contradictions });

/** The full consistency analysis of a valuation. */
export function valuationConsistency(valuation: Valuation): PredicationValuationConsistencyCarrier {
  const readings = Object.freeze(valuationAssignments(valuation).map((assignment): ValuationConsistencyJudgment => {
    const value = valueOf(assignment.charge);
    const consistency = chargeConsistency(value);
    return consistency.kind === "bilattice.linearLogic.chargeConsistency:witness"
      ? Object.freeze({ kind: "predication.valuation.consistency.assignment:witness" as const, assignment, value, chargeConsistency: consistency })
      : Object.freeze({ kind: "predication.valuation.consistency.assignmentContradiction:witness" as const, assignment, value, chargeConsistency: consistency });
  }));
  const assignmentReadings = valuationConsistencyReadings(readings);
  const consistentAssignments = valuationConsistentAssignments(readings);
  const contradictoryAssignments = valuationContradictoryAssignments(readings);
  return Object.freeze({
    kind: "predication.valuation.consistency.carrier" as const,
    valuation,
    assignmentReadings,
    consistentAssignments,
    contradictoryAssignments,
    contradictionRank: contradictoryAssignments.rank,
    vanishing: valuationConsistencyVanishing(contradictoryAssignments),
    consistentSubvaluation: consistentValuationSubcarrier(valuation, consistentAssignments),
    contradictorySubvaluation: contradictoryValuationSubcarrier(valuation, contradictoryAssignments),
  });
}
