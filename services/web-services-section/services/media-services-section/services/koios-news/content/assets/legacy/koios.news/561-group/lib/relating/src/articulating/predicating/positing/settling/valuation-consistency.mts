import { sameCharge, valueOf, type ChargeValue } from "../../../../articulating/carriers.mjs";
import { chargeConsistency, type ChargeConsistencyJudgment } from "../../../../articulating/predicating/logic.mjs";
import { natIsZero, type Natural } from "../../../../articulating/carriers.mjs";
import { predicationCellCoincidenceHolds } from "../../../../articulating/carriers.mjs";
import { rankedReadings, selectRankedReadings } from "./carrier.mjs";
import type { FiberAlgebra, Meme, Valuation } from "../fiber.mjs";

/**
 * Witness that a single valuation assignment is charge-consistent: pairs the
 * assignment meme with its charge value and the underlying charge-consistency
 * judgment that classified it as consistent.
 */
export interface ValuationAssignmentConsistencyWitness {
  readonly kind: "predication.valuation.consistency.assignment:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

/**
 * Witness that a single valuation assignment is charge-contradictory: pairs the
 * assignment meme with its charge value and the underlying charge-consistency
 * judgment that classified it as contradictory.
 */
export interface ValuationAssignmentContradictionWitness {
  readonly kind: "predication.valuation.consistency.assignmentContradiction:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

/**
 * A per-assignment consistency reading: either a consistency witness or a
 * contradiction witness for one valuation assignment.
 */
export type ValuationConsistencyJudgment =
  | ValuationAssignmentConsistencyWitness
  | ValuationAssignmentContradictionWitness;

/**
 * Carrier holding all per-assignment consistency readings for a valuation, with
 * rank counting the number of readings.
 */
export interface ValuationConsistencyReadingsCarrier {
  readonly kind: "predication.valuation.consistency.readings";
  readonly readings: readonly ValuationConsistencyJudgment[];
  readonly rank: Natural;
}

/**
 * Carrier holding the consistency witnesses among a valuation's readings, with
 * rank counting the consistent assignments.
 */
export interface ValuationConsistentAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.consistentAssignments";
  readonly readings: readonly ValuationAssignmentConsistencyWitness[];
  readonly rank: Natural;
}

/**
 * Carrier holding the contradiction witnesses among a valuation's readings,
 * with rank counting the contradictory assignments.
 */
export interface ValuationContradictoryAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.contradictoryAssignments";
  readonly readings: readonly ValuationAssignmentContradictionWitness[];
  readonly rank: Natural;
}

/**
 * Witness that a valuation's contradiction obstruction vanishes: carries the
 * contradiction rank, which is zero when no contradictory assignments exist.
 */
export interface ValuationConsistencyVanishingWitness {
  readonly kind: "predication.valuation.consistency.vanishing:witness";
  readonly rank: Natural;
}

/**
 * Obstruction to consistency vanishing: carries the nonzero contradiction rank
 * and the contradictory-assignments carrier that prevents vanishing.
 */
export interface ValuationConsistencyVanishingObstruction {
  readonly kind: "predication.valuation.consistency.vanishing-obstruction";
  readonly rank: Natural;
  readonly contradictions: ValuationContradictoryAssignmentsCarrier;
}

/**
 * Judgment on whether a valuation's contradictions vanish: either a vanishing
 * witness or a vanishing obstruction.
 */
export type ValuationConsistencyVanishingJudgment =
  | ValuationConsistencyVanishingWitness
  | ValuationConsistencyVanishingObstruction;

/**
 * Subcarrier restricting a valuation to its consistent assignments: pairs the
 * restricted valuation with the consistent-assignments carrier it was built
 * from.
 */
export interface ConsistentValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.consistentSubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationConsistentAssignmentsCarrier;
}

/**
 * Subcarrier restricting a valuation to its contradictory assignments: pairs
 * the restricted valuation with the contradictory-assignments carrier it was
 * built from.
 */
export interface ContradictoryValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.contradictorySubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationContradictoryAssignmentsCarrier;
}

/**
 * Full consistency analysis of a valuation: bundles the source valuation, all
 * assignment readings, the consistent and contradictory assignment carriers,
 * the contradiction rank, the vanishing judgment, and the consistent and
 * contradictory subvaluations.
 */
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
  predicationCellCoincidenceHolds(left.cell, right.cell) && sameCharge(left.charge, right.charge);

const readingMatchesAssignment = (reading: ValuationConsistencyJudgment, assignment: Meme): boolean =>
  valuationAssignmentCoincidenceHolds(reading.assignment, assignment);

/**
 * Wraps a list of per-assignment consistency judgments into a readings carrier,
 * setting rank to the number of readings.
 */
export const valuationConsistencyReadings = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationConsistencyReadingsCarrier =>
  rankedReadings("predication.valuation.consistency.readings", readings);

/**
 * Filters consistency judgments down to the consistency witnesses and returns
 * them as a consistent-assignments carrier, with rank counting the matches.
 */
export const valuationConsistentAssignments = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationConsistentAssignmentsCarrier =>
  selectRankedReadings(
    "predication.valuation.consistency.consistentAssignments",
    readings,
    (reading): reading is ValuationAssignmentConsistencyWitness =>
      reading.kind === "predication.valuation.consistency.assignment:witness",
  );

/**
 * Filters consistency judgments down to the contradiction witnesses and returns
 * them as a contradictory-assignments carrier, with rank counting the matches.
 */
export const valuationContradictoryAssignments = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationContradictoryAssignmentsCarrier =>
  selectRankedReadings(
    "predication.valuation.consistency.contradictoryAssignments",
    readings,
    (reading): reading is ValuationAssignmentContradictionWitness =>
      reading.kind === "predication.valuation.consistency.assignmentContradiction:witness",
  );

const subvaluationOfReadings = (
  valuation: Valuation,
  readings: readonly ValuationConsistencyJudgment[],
): Valuation => {
  return Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
      ...fiber,
      assignments: Object.freeze(fiber.assignments.filter((assignment) =>
        readings.some((reading) => readingMatchesAssignment(reading, assignment)))),
    }) satisfies FiberAlgebra)),
  });
};

/**
 * Builds a consistent-valuation subcarrier by restricting the valuation's
 * fibers to the assignments named in the given consistent-assignments carrier.
 */
export const consistentValuationSubcarrier = (
  valuation: Valuation,
  assignments: ValuationConsistentAssignmentsCarrier,
): ConsistentValuationSubcarrier => Object.freeze({
  kind: "predication.valuation.consistency.consistentSubvaluation" as const,
  valuation: subvaluationOfReadings(valuation, assignments.readings),
  assignments,
});

/**
 * Builds a contradictory-valuation subcarrier by restricting the valuation's
 * fibers to the assignments named in the given contradictory-assignments
 * carrier.
 */
export const contradictoryValuationSubcarrier = (
  valuation: Valuation,
  assignments: ValuationContradictoryAssignmentsCarrier,
): ContradictoryValuationSubcarrier => Object.freeze({
  kind: "predication.valuation.consistency.contradictorySubvaluation" as const,
  valuation: subvaluationOfReadings(valuation, assignments.readings),
  assignments,
});

/**
 * Decides the vanishing judgment from a contradictory-assignments carrier:
 * returns a vanishing witness when its rank is zero, otherwise a vanishing
 * obstruction carrying the contradictions.
 */
export const valuationConsistencyVanishing = (
  contradictions: ValuationContradictoryAssignmentsCarrier,
): ValuationConsistencyVanishingJudgment =>
  natIsZero(contradictions.rank)
    ? Object.freeze({ kind: "predication.valuation.consistency.vanishing:witness" as const, rank: contradictions.rank })
    : Object.freeze({
      kind: "predication.valuation.consistency.vanishing-obstruction" as const,
      rank: contradictions.rank,
      contradictions,
    });

/**
 * Computes the full consistency analysis of a valuation: reads each
 * assignment's charge value through charge-consistency to classify it as
 * consistent or contradictory, partitions the readings, and assembles the
 * carrier with ranks, vanishing judgment, and consistent and contradictory
 * subvaluations.
 */
export function valuationConsistency(valuation: Valuation): PredicationValuationConsistencyCarrier {
  const readings = Object.freeze(valuationAssignments(valuation).map((assignment): ValuationConsistencyJudgment => {
    const value = valueOf(assignment.charge);
    const consistency = chargeConsistency(value);
    return consistency.kind === "bilattice.linearLogic.chargeConsistency:witness"
      ? Object.freeze({
        kind: "predication.valuation.consistency.assignment:witness" as const,
        assignment,
        value,
        chargeConsistency: consistency,
      })
      : Object.freeze({
        kind: "predication.valuation.consistency.assignmentContradiction:witness" as const,
        assignment,
        value,
        chargeConsistency: consistency,
      });
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
