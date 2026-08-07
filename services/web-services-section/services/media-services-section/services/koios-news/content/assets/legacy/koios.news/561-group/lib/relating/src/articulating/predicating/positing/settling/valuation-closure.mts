import { joinKnowledge, leqKnowledge, meetKnowledge, joinTruth, meetTruth, sameCharge, type ChargeCarrier } from "../../../../articulating/carriers.mjs";
import {
  predicationBaseObjectCoincidenceHolds,
  predicationCellCoincidenceHolds,
  predicationPredicateCoincidenceHolds,
  predicationTermCoincidenceHolds,
} from "../../../../articulating/carriers.mjs";
import { natZero, successor, type Natural } from "../../../../articulating/carriers.mjs";
import {
  closeOrdinalProcess,
  closureProcess,
  finiteOrdinalJudgment,
  type ClosureCarrier,
  type ClosureOrbitPoint,
  type ClosureProcessCarrier,
  type FiniteOrdinalJudgment,
  type Lattice,
  type Ordinal,
} from "./closure.mjs";
import { cohomology, type CohomologyCarrier } from "./cohomology.mjs";
import type { FiberAlgebra, Meme, Valuation } from "../fiber.mjs";
import { posit } from "../fiber.mjs";
import {
  readDesignatedCellsOfValuation,
} from "./designation.mjs";
import {
  settlementFiltration,
} from "./filtration.mjs";
import {
  settlingStageOrdinal,
} from "./ordinal.mjs";
import {
  settlingStageInput,
  readShapeOfSettlingStageOrdinal,
  settlingStageDesignatedCellSet,
} from "./stage.mjs";
import type {
  SettlingStageOrdinalCarrier,
  SettlementFiltration,
} from "./object.mjs";
import { cell, closeSpecialization, entitySet, predicate, type BaseCategory, type Cell, type Edge, type PredicationBaseObject, type PredicationPredicate, type PredicationTerm } from "../../../../articulating/carriers.mjs";
import {
  sheafFromValuation,
  type PositPresheaf,
  type SheafCarrier,
} from "./sheaf.mjs";
import { articulate, utterance, type Mark } from "../../../../articulating/carriers.mjs";

/**
 * A stage ordinal in valuation closure: wraps the ordinal index of a stage in
 * the transfinite closure orbit.
 */
export interface PredicationValuationClosureStageOrdinalCarrier {
  readonly kind: "predication.valuation.closure.stageOrdinal";
  readonly ordinal: Ordinal;
}

/**
 * A single stage of valuation closure: pairs a stage ordinal with the valuation
 * reached at that point in the orbit.
 */
export interface PredicationValuationClosureStageCarrier {
  readonly kind: "predication.valuation.closure.stage";
  readonly stageOrdinal: PredicationValuationClosureStageOrdinalCarrier;
  readonly valuation: Valuation;
}

export type { OrderName } from "../fiber.mjs";
import type { OrderName } from "../fiber.mjs";

/**
 * A closure order over valuations: names the order, supplies its closure
 * endomorphism on valuations, and builds the lattice of valuations from a seed.
 */
export interface PredicationValuationClosureOrderCarrier {
  readonly kind: "predication.valuation.closure.order";
  readonly name: OrderName;
  readonly endomorphism: (valuation: Valuation) => Valuation;
  readonly lattice: (seed: Valuation) => Lattice<Valuation>;
}

/**
 * A valuation closure process: an order, a seed valuation, and the underlying
 * ordinal closure process iterating the order's endomorphism over its lattice.
 */
export interface PredicationValuationClosureProcessCarrier {
  readonly kind: "predication.valuation.closure.process";
  readonly order: PredicationValuationClosureOrderCarrier;
  readonly seed: Valuation;
  readonly ordinalProcess: ClosureProcessCarrier<Valuation>;
}

/**
 * The result of closing a valuation closure process: the process, its ordinal
 * closure carrier, and the sheaf built from the fixed-point valuation.
 */
export interface PredicationValuationClosureCarrier {
  readonly kind: "predication.valuation.closure.carrier";
  readonly process: PredicationValuationClosureProcessCarrier;
  readonly closure: ClosureCarrier<Valuation>;
  readonly sheaf: SheafCarrier;
}

/**
 * A witness that a closure stage's ordinal is finite: carries the stage and the
 * natural number value of its ordinal.
 */
export interface PredicationValuationClosureFiniteStageWitness {
  readonly kind: "predication.valuation.closure.finiteStage:witness";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly value: Natural;
}

/**
 * An obstruction showing a closure stage's ordinal is not finite: carries the
 * stage and the finite-ordinal judgment reading that failed.
 */
export interface PredicationValuationClosureFiniteStageObstruction {
  readonly kind: "predication.valuation.closure.finiteStage-obstruction";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

/**
 * The judgment on whether a closure stage's ordinal is finite: either a
 * finite-stage witness or an obstruction.
 */
export type PredicationValuationClosureFiniteStageJudgment =
  | PredicationValuationClosureFiniteStageWitness
  | PredicationValuationClosureFiniteStageObstruction;

/**
 * A trace of a valuation closure: the closure carrier, its sheaf, the orbit of
 * stages traversed, and the stage at which the fixed point is reached.
 */
export interface PredicationValuationClosureTraceCarrier {
  readonly kind: "predication.valuation.closure.trace";
  readonly closure: PredicationValuationClosureCarrier;
  readonly sheaf: SheafCarrier;
  readonly orbit: readonly PredicationValuationClosureStageCarrier[];
  readonly fixedPointStage: PredicationValuationClosureStageCarrier;
}

/**
 * Returns the most recent valuation in a posit presheaf's trace sequence: the last
 * entry of its traces.
 */
export function lastValuation(p: PositPresheaf): Valuation {
  return p.traces[p.traces.length - 1]!;
}

/**
 * Tests whether two memes coincide: true when their cells coincide and their
 * charges are the same.
 */
export function sameMeme(left: Meme, right: Meme): boolean {
  return predicationCellCoincidenceHolds(left.cell, right.cell) && sameCharge(left.charge, right.charge);
}

function sameAssignmentSet(left: readonly Meme[], right: readonly Meme[]): boolean {
  return left.length === right.length && left.every((assignment) => right.some((other) => sameMeme(assignment, other)));
}

function sameFiberAlgebra(left: FiberAlgebra, right: FiberAlgebra): boolean {
  return predicationPredicateCoincidenceHolds(left.predicate, right.predicate)
    && sameAssignmentSet(left.assignments, right.assignments);
}

function sameBaseEdge(left: Edge<PredicationBaseObject, PredicationBaseObject>, right: Edge<PredicationBaseObject, PredicationBaseObject>): boolean {
  return predicationBaseObjectCoincidenceHolds(left.domain, right.domain) && predicationBaseObjectCoincidenceHolds(left.codomain, right.codomain);
}

function sameBaseEdges(
  left: readonly Edge<PredicationBaseObject, PredicationBaseObject>[],
  right: readonly Edge<PredicationBaseObject, PredicationBaseObject>[],
): boolean {
  return left.length === right.length && left.every((edge) => right.some((other) => sameBaseEdge(edge, other)));
}

function sameBaseCategory(left: BaseCategory, right: BaseCategory): boolean {
  return sameBaseEdges(left.specialization, right.specialization)
    && sameBaseEdges(left.converse, right.converse)
    && sameBaseEdges(left.subjectProjection, right.subjectProjection)
    && sameBaseEdges(left.objectProjection, right.objectProjection);
}

/**
 * Tests whether two valuations coincide: true when their base categories are
 * the same and their fibers match as a set under fiber-algebra coincidence.
 */
export function sameValuation(left: Valuation, right: Valuation): boolean {
  return sameBaseCategory(left.base, right.base)
    && left.fibers.length === right.fibers.length
    && left.fibers.every((fiber) => right.fibers.some((other) => sameFiberAlgebra(fiber, other)));
}

/** Builds a frozen stage-ordinal carrier wrapping the given ordinal. */
export const predicationValuationClosureStageOrdinal = (
  ordinal: Ordinal,
): PredicationValuationClosureStageOrdinalCarrier => Object.freeze({
  kind: "predication.valuation.closure.stageOrdinal" as const,
  ordinal,
});

/**
 * Builds a closure stage carrier from a closure orbit point: pairs the point's
 * stage ordinal with its valuation value.
 */
export function predicationValuationClosureStage(point: ClosureOrbitPoint<Valuation>): PredicationValuationClosureStageCarrier {
  return Object.freeze({
    kind: "predication.valuation.closure.stage" as const,
    stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
    valuation: point.value,
  });
}

/**
 * Judges whether a closure stage's ordinal is finite: returns a finite-stage
 * witness carrying its natural value, or an obstruction carrying the failed
 * finite-ordinal reading.
 */
export function predicationValuationClosureFiniteStageJudgment(
  stage: PredicationValuationClosureStageCarrier,
): PredicationValuationClosureFiniteStageJudgment {
  const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({
      kind: "predication.valuation.closure.finiteStage:witness" as const,
      stage,
      value: reading.value,
    })
    : Object.freeze({
      kind: "predication.valuation.closure.finiteStage-obstruction" as const,
      stage,
      reading,
    });
}

/**
 * Maps a closure stage to a settling stage ordinal: extracts the stage's
 * ordinal and wraps it as a settling-stage ordinal carrier.
 */
export const settlingStageOrdinalOfPredicationValuationClosureStage = (
  stage: PredicationValuationClosureStageCarrier,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(stage.stageOrdinal.ordinal);

const modalStep = (fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber): FiberAlgebra => {
    const assignments: Meme[] = [];
    for (const assignment of fiber.assignments) {
      const index = assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
      if (index < 0) assignments.push(assignment);
      else assignments[index] = Object.freeze({ ...assignment, charge: fold(assignments[index]!.charge, assignment.charge) });
    }
    return Object.freeze({ ...fiber, assignments: Object.freeze(assignments) });
  })),
});

/**
 * A modal step that folds duplicate cells within each fiber by the knowledge
 * join, raising assignments toward greater knowledge.
 */
export const raiseKnowledge = modalStep(joinKnowledge);
/**
 * A modal step that folds duplicate cells within each fiber by the knowledge
 * meet, lowering assignments toward lesser knowledge.
 */
export const lowerKnowledge = modalStep(meetKnowledge);
/**
 * A modal step that folds duplicate cells within each fiber by the truth join,
 * raising assignments toward greater truth.
 */
export const raiseTruth = modalStep(joinTruth);
/**
 * A modal step that folds duplicate cells within each fiber by the truth meet,
 * lowering assignments toward lesser truth.
 */
export const lowerTruth = modalStep(meetTruth);

const appendValuation = (step: (valuation: Valuation) => Valuation) => (p: PositPresheaf): PositPresheaf => Object.freeze({
  ...p,
  traces: Object.freeze([...p.traces, step(lastValuation(p))]),
});

/**
 * Appends to a posit presheaf's trace the knowledge-raised valuation derived from its
 * last entry.
 */
export const possibilizeKnowledge = appendValuation(raiseKnowledge);
/**
 * Appends to a posit presheaf's trace the knowledge-lowered valuation derived from
 * its last entry.
 */
export const necessitateKnowledge = appendValuation(lowerKnowledge);
/**
 * Appends to a posit presheaf's trace the truth-raised valuation derived from its
 * last entry.
 */
export const possibilizeTruth = appendValuation(raiseTruth);
/**
 * Appends to a posit presheaf's trace the truth-lowered valuation derived from its
 * last entry.
 */
export const necessitateTruth = appendValuation(lowerTruth);

const valuationMemes = (valuation: Valuation): readonly Meme[] =>
  Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));

function composeValuation(memes: readonly Meme[], base: BaseCategory, fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier): Valuation {
  const byPredicate: { readonly predicate: PredicationPredicate; readonly assignments: Meme[] }[] = [];
  for (const assignment of memes) {
    const bucket = byPredicate.find((item) => predicationPredicateCoincidenceHolds(item.predicate, assignment.cell.predicate));
    if (!bucket) {
      byPredicate.push({ predicate: assignment.cell.predicate, assignments: [assignment] });
      continue;
    }

    const index = bucket.assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
    if (index < 0) {
      bucket.assignments.push(assignment);
      continue;
    }

    const prior = bucket.assignments[index]!;
    bucket.assignments[index] = Object.freeze({ ...assignment, charge: fold(prior.charge, assignment.charge) });
  }

  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((assignment) => [assignment.cell.subject, assignment.cell.object]), predicationTermCoincidenceHolds),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}










/**
 * Transports a valuation along the predication generators: closes the base
 * under specialization and recomposes the valuation's memes over it, folding
 * duplicate cells with the given charge fold (knowledge join by default).
 */
export function transportValuationAlongPredicationGenerators(
  valuation: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier = joinKnowledge,
): Valuation {
  const base = closeSpecialization(valuation.base);
  return composeValuation(valuationMemes(valuation), base, fold);
}





/**
 * The knowledge closure endomorphism: knowledge-raises a valuation then
 * transports it along the predication generators, folding duplicates by the
 * knowledge join.
 */
export const knowledgeClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseKnowledge(valuation), joinKnowledge);

/**
 * The truth closure endomorphism: truth-raises a valuation then transports it
 * along the predication generators, folding duplicates by the truth join.
 */
export const truthClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseTruth(valuation), joinTruth);

/**
 * Knowledge closure order carrier: names it "knowledge" and binds its
 * endomorphism and lattice.
 */
export const knowledgeValuationClosureOrder: PredicationValuationClosureOrderCarrier = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "knowledge" as const,
  endomorphism: knowledgeClosureEndomorphism,
  lattice: knowledgeValuationClosureLattice,
});

/**
 * Truth closure order carrier: names it "truth" and binds its
 * endomorphism and lattice.
 */
export const truthValuationClosureOrder: PredicationValuationClosureOrderCarrier = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "truth" as const,
  endomorphism: truthClosureEndomorphism,
  lattice: truthValuationClosureLattice,
});

/**
 * Builds a valuation closure process from an order and a seed valuation:
 * constructs the ordinal closure process iterating the order's endomorphism
 * over its lattice on the seed.
 */
export function predicationValuationClosureProcess(
  order: PredicationValuationClosureOrderCarrier,
  seed: Valuation,
): PredicationValuationClosureProcessCarrier {
  return Object.freeze({
    kind: "predication.valuation.closure.process" as const,
    order,
    seed,
    ordinalProcess: closureProcess(order.lattice(seed), order.endomorphism),
  });
}

/**
 * Closes a valuation closure process: runs the ordinal process to its fixed
 * point and packages the process, the closure carrier, and the sheaf built from
 * the fixed-point valuation.
 */
export function closePredicationValuationClosure(process: PredicationValuationClosureProcessCarrier): PredicationValuationClosureCarrier {
  const closure = closeOrdinalProcess(process.ordinalProcess);
  return Object.freeze({
    kind: "predication.valuation.closure.carrier" as const,
    process,
    closure,
    sheaf: sheafFromValuation(closure.value),
  });
}

/**
 * Computes the knowledge closure of a posit presheaf: closes the knowledge-order
 * process seeded by the posit presheaf's first valuation.
 */
export function knowledgeValuationClosure(p: PositPresheaf): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(knowledgeValuationClosureOrder, p.traces[0]!));
}

/**
 * Computes the truth closure of a posit presheaf: closes the truth-order process
 * seeded by the posit presheaf's first valuation.
 */
export function truthValuationClosure(p: PositPresheaf): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(truthValuationClosureOrder, p.traces[0]!));
}

/** Returns the sheaf of a posit presheaf's knowledge closure. */
export function knowledgeClosureSheaf(p: PositPresheaf): SheafCarrier {
  return knowledgeValuationClosure(p).sheaf;
}

/**
 * Builds a trace from a closure carrier: collects the orbit of stages and the
 * fixed-point stage, taken from the stabilization witness's ordinal and value
 * or, when unstabilized, the ordinal searched through.
 */
export function predicationValuationClosureTrace(closure: PredicationValuationClosureCarrier): PredicationValuationClosureTraceCarrier {
  const fixedPointStage = closure.closure.stabilization.kind === "ordinal.closure.stabilization:witness"
    ? predicationValuationClosureStage(Object.freeze({
      kind: "ordinal.closure.orbitPoint" as const,
      stage: closure.closure.stabilization.ordinal,
      value: closure.closure.stabilization.value,
    }))
    : predicationValuationClosureStage(Object.freeze({
      kind: "ordinal.closure.orbitPoint" as const,
      stage: closure.closure.stabilization.searchedThrough,
      value: closure.closure.stabilization.value,
    }));
  return Object.freeze({
    kind: "predication.valuation.closure.trace" as const,
    closure,
    sheaf: closure.sheaf,
    orbit: Object.freeze(closure.closure.orbit.map(predicationValuationClosureStage)),
    fixedPointStage,
  });
}

/** Returns the trace of a posit presheaf's knowledge closure. */
export function knowledgeClosureTrace(p: PositPresheaf): PredicationValuationClosureTraceCarrier {
  return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}

/**
 * Returns the cells of a posit presheaf's knowledge closure sheaf: the cell of every
 * assignment across all fibers of the closure section.
 */
export function knowledgeClosureCells(p: PositPresheaf): readonly Cell[] {
  return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}

/**
 * Computes the cohomology of the knowledge closure sheaf of the predicate
 * positing the articulated utterance of two marks.
 */
export function utteranceKnowledgeClosureCohomology(left: Mark, right: Mark): CohomologyCarrier {
  return cohomology(knowledgeClosureSheaf(posit(predicate(articulate(utterance(left, right))))));
}

/**
 * Settles a posit presheaf by taking its knowledge closure, mapping each orbit
 * stage to a settling-stage input of its ordinal, designated cells, and shape,
 * then materializing the resulting settlement filtration.
 */
export function settle(positCarrier: PositPresheaf): SettlementFiltration {
  const traced = knowledgeClosureTrace(positCarrier);
  const stages = traced.orbit.map((stage) => {
    const ordinal = settlingStageOrdinalOfPredicationValuationClosureStage(stage);
    return settlingStageInput(
      ordinal,
      settlingStageDesignatedCellSet(readDesignatedCellsOfValuation(stage.valuation)),
      readShapeOfSettlingStageOrdinal(ordinal),
    );
  });
  return settlementFiltration(stages);
}

function foldedValuationClosureLattice(
  bottom: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier,
): Lattice<Valuation> {
  const join = (left: Valuation, right: Valuation): Valuation => mergeValuations(left, right, fold);
  return Object.freeze({
    bottom,
    leq: (left: Valuation, right: Valuation) => sameValuation(left, right) || sameValuation(join(left, right), right),
    join,
    eq: sameValuation,
    sup: (sequence: (n: Natural) => Valuation) => {
      let current = sequence(natZero);
      for (let index = successor(natZero); ; index = successor(index)) {
        const next = sequence(index);
        const joined = join(current, next);
        if (sameValuation(joined, current)) return current;
        current = joined;
      }
    },
  });
}

/**
 * Builds the valuation closure lattice with the given bottom, joining
 * valuations by folding shared cells with the knowledge join.
 */
export function valuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinKnowledge);
}

/**
 * Builds the valuation closure lattice with the given bottom, joining
 * valuations by folding shared cells with the truth join.
 */
export function truthValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinTruth);
}

/**
 * Builds the knowledge valuation closure lattice with the given bottom: the
 * knowledge-join lattice with leq strengthened to require every left
 * assignment's charge to be below the matching right charge under the knowledge
 * order.
 */
export function knowledgeValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  const lattice = Object.freeze({
    ...valuationClosureLattice(bottom),
    leq: (left: Valuation, right: Valuation): boolean => {
      for (const fiber of left.fibers) {
        for (const assignment of fiber.assignments) {
          const rightCharge = right.fibers
            .flatMap((rightFiber) => rightFiber.assignments)
            .find((rightAssignment) => predicationCellCoincidenceHolds(rightAssignment.cell, assignment.cell))
            ?.charge;
          if (!rightCharge || !leqKnowledge(assignment.charge, rightCharge)) return false;
        }
      }
      return true;
    },
  }) satisfies Lattice<Valuation>;
  return lattice;
}

function mergeValuations(
  left: Valuation,
  right: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier = joinKnowledge,
): Valuation {
  const fibers: FiberAlgebra[] = [];
  for (const valuation of [left, right]) {
    for (const fiber of valuation.fibers) {
      const prior = fibers.find((item) => predicationPredicateCoincidenceHolds(item.predicate, fiber.predicate));
      if (!prior) fibers.push(fiber);
      else {
        const assignments: Meme[] = [];
        for (const assignment of [...prior.assignments, ...fiber.assignments]) {
          const existingIndex = assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
          if (existingIndex < 0) assignments.push(assignment);
          else assignments[existingIndex] = Object.freeze({ ...assignment, charge: fold(assignments[existingIndex]!.charge, assignment.charge) });
        }
        fibers.splice(fibers.indexOf(prior), 1, Object.freeze({ ...fiber, assignments: Object.freeze(assignments) }));
      }
    }
  }
  return Object.freeze({ ...left, fibers: Object.freeze(fibers) });
}
