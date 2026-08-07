/**
 * settling/valuation-closure — the knowledge closure and `settle`.
 *
 * A valuation closes under a modal step (knowledge- or truth-raise) followed by
 * transport along the predication generators (specialization closure + recompose,
 * folding coincident cells by the order's join). The ordinal closure engine runs
 * that endomorphism from the posit seed to its fixed point; `settle` maps the
 * closure orbit to settling-stage inputs (each stage's designated cells) and
 * assembles the `SettlementFiltration` — the settled object the read bins query.
 */
import { joinKnowledge, leqKnowledge, meetKnowledge, joinTruth, meetTruth, sameCharge, type ChargeCarrier } from "../bilattice-charge.mjs";
import { natZero, successor, type Natural } from "./analysis/exact-number.mjs";
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
import { readDesignatedCellsOfValuation } from "./designation.mjs";
import { settlementFiltration } from "./filtration.mjs";
import { settlingStageOrdinal } from "./ordinal.mjs";
import { settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet } from "./stage.mjs";
import type { SettlingStageOrdinalCarrier, SettlementFiltration } from "./object.mjs";
import {
  baseObjectCoincides,
  cellCoincides,
  predicateCoincides,
  termCoincides,
  closeSpecialization,
  entitySet,
  predicate,
  type BaseCategory,
  type Cell,
  type Edge,
  type PredicationBaseObject,
  type PredicationPredicate,
} from "../../predication.mjs";
import { sheafFromValuation, type PositPresheaf, type SheafCarrier } from "./sheaf.mjs";
import { articulate, utterance, type Mark } from "../../../utterance.mjs";

export type { OrderName } from "../fiber.mjs";
import type { OrderName } from "../fiber.mjs";

/** A stage ordinal in valuation closure. */
export interface PredicationValuationClosureStageOrdinalCarrier {
  readonly kind: "predication.valuation.closure.stageOrdinal";
  readonly ordinal: Ordinal;
}

/** A single stage of valuation closure: a stage ordinal and the valuation reached. */
export interface PredicationValuationClosureStageCarrier {
  readonly kind: "predication.valuation.closure.stage";
  readonly stageOrdinal: PredicationValuationClosureStageOrdinalCarrier;
  readonly valuation: Valuation;
}

/** A closure order over valuations: its name, endomorphism, and lattice builder. */
export interface PredicationValuationClosureOrderCarrier {
  readonly kind: "predication.valuation.closure.order";
  readonly name: OrderName;
  readonly endomorphism: (valuation: Valuation) => Valuation;
  readonly lattice: (seed: Valuation) => Lattice<Valuation>;
}

/** A valuation closure process: an order, a seed, and the ordinal process. */
export interface PredicationValuationClosureProcessCarrier {
  readonly kind: "predication.valuation.closure.process";
  readonly order: PredicationValuationClosureOrderCarrier;
  readonly seed: Valuation;
  readonly ordinalProcess: ClosureProcessCarrier<Valuation>;
}

/** The result of closing a valuation closure process. */
export interface PredicationValuationClosureCarrier {
  readonly kind: "predication.valuation.closure.carrier";
  readonly process: PredicationValuationClosureProcessCarrier;
  readonly closure: ClosureCarrier<Valuation>;
  readonly sheaf: SheafCarrier;
}

/** A witness that a closure stage's ordinal is finite. */
export interface PredicationValuationClosureFiniteStageWitness {
  readonly kind: "predication.valuation.closure.finiteStage:witness";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly value: Natural;
}

/** An obstruction that a closure stage's ordinal is not finite. */
export interface PredicationValuationClosureFiniteStageObstruction {
  readonly kind: "predication.valuation.closure.finiteStage-obstruction";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

/** The judgment on whether a closure stage's ordinal is finite. */
export type PredicationValuationClosureFiniteStageJudgment =
  | PredicationValuationClosureFiniteStageWitness
  | PredicationValuationClosureFiniteStageObstruction;

/** A trace of a valuation closure: the carrier, sheaf, orbit, and fixed-point stage. */
export interface PredicationValuationClosureTraceCarrier {
  readonly kind: "predication.valuation.closure.trace";
  readonly closure: PredicationValuationClosureCarrier;
  readonly sheaf: SheafCarrier;
  readonly orbit: readonly PredicationValuationClosureStageCarrier[];
  readonly fixedPointStage: PredicationValuationClosureStageCarrier;
}

/** The most recent valuation in a posit presheaf's trace. */
export function lastValuation(p: PositPresheaf): Valuation {
  return p.traces[p.traces.length - 1]!;
}

/** Whether two memes coincide (cells coincide and charges are the same). */
export function sameMeme(left: Meme, right: Meme): boolean {
  return cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);
}

function sameAssignmentSet(left: readonly Meme[], right: readonly Meme[]): boolean {
  return left.length === right.length && left.every((assignment) => right.some((other) => sameMeme(assignment, other)));
}

function sameFiberAlgebra(left: FiberAlgebra, right: FiberAlgebra): boolean {
  return predicateCoincides(left.predicate, right.predicate) && sameAssignmentSet(left.assignments, right.assignments);
}

function sameBaseEdge(left: Edge<PredicationBaseObject, PredicationBaseObject>, right: Edge<PredicationBaseObject, PredicationBaseObject>): boolean {
  return baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain);
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

/** Whether two valuations coincide (same base, same fibers as a set). */
export function sameValuation(left: Valuation, right: Valuation): boolean {
  return sameBaseCategory(left.base, right.base)
    && left.fibers.length === right.fibers.length
    && left.fibers.every((fiber) => right.fibers.some((other) => sameFiberAlgebra(fiber, other)));
}

/** A stage-ordinal carrier wrapping an ordinal. */
export const predicationValuationClosureStageOrdinal = (ordinal: Ordinal): PredicationValuationClosureStageOrdinalCarrier =>
  Object.freeze({ kind: "predication.valuation.closure.stageOrdinal" as const, ordinal });

/** A closure stage carrier from a closure orbit point. */
export function predicationValuationClosureStage(point: ClosureOrbitPoint<Valuation>): PredicationValuationClosureStageCarrier {
  return Object.freeze({
    kind: "predication.valuation.closure.stage" as const,
    stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
    valuation: point.value,
  });
}

/** Judge whether a closure stage's ordinal is finite. */
export function predicationValuationClosureFiniteStageJudgment(
  stage: PredicationValuationClosureStageCarrier,
): PredicationValuationClosureFiniteStageJudgment {
  const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({ kind: "predication.valuation.closure.finiteStage:witness" as const, stage, value: reading.value })
    : Object.freeze({ kind: "predication.valuation.closure.finiteStage-obstruction" as const, stage, reading });
}

/** Map a closure stage to a settling stage ordinal. */
export const settlingStageOrdinalOfPredicationValuationClosureStage = (
  stage: PredicationValuationClosureStageCarrier,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(stage.stageOrdinal.ordinal);

const modalStep = (fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber): FiberAlgebra => {
    const assignments: Meme[] = [];
    for (const assignment of fiber.assignments) {
      const index = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
      if (index < 0) assignments.push(assignment);
      else assignments[index] = Object.freeze({ ...assignment, charge: fold(assignments[index]!.charge, assignment.charge) });
    }
    return Object.freeze({ ...fiber, assignments: Object.freeze(assignments) });
  })),
});

/** Knowledge-raise: fold duplicate cells by knowledge join. */
export const raiseKnowledge = modalStep(joinKnowledge);
/** Knowledge-lower: fold by knowledge meet. */
export const lowerKnowledge = modalStep(meetKnowledge);
/** Truth-raise: fold by truth join. */
export const raiseTruth = modalStep(joinTruth);
/** Truth-lower: fold by truth meet. */
export const lowerTruth = modalStep(meetTruth);

const appendValuation = (step: (valuation: Valuation) => Valuation) => (p: PositPresheaf): PositPresheaf => Object.freeze({
  ...p,
  traces: Object.freeze([...p.traces, step(lastValuation(p))]),
});

/** Append the knowledge-raised valuation to a presheaf trace. */
export const possibilizeKnowledge = appendValuation(raiseKnowledge);
/** Append the knowledge-lowered valuation to a presheaf trace. */
export const necessitateKnowledge = appendValuation(lowerKnowledge);
/** Append the truth-raised valuation to a presheaf trace. */
export const possibilizeTruth = appendValuation(raiseTruth);
/** Append the truth-lowered valuation to a presheaf trace. */
export const necessitateTruth = appendValuation(lowerTruth);

const valuationMemes = (valuation: Valuation): readonly Meme[] =>
  Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));

function composeValuation(memes: readonly Meme[], base: BaseCategory, fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier): Valuation {
  const byPredicate: { readonly predicate: PredicationPredicate; readonly assignments: Meme[] }[] = [];
  for (const assignment of memes) {
    const bucket = byPredicate.find((item) => predicateCoincides(item.predicate, assignment.cell.predicate));
    if (!bucket) {
      byPredicate.push({ predicate: assignment.cell.predicate, assignments: [assignment] });
      continue;
    }
    const index = bucket.assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
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
    entities: entitySet(assignments.flatMap((assignment) => [assignment.cell.subject, assignment.cell.object]), termCoincides),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

/** Transport a valuation along the predication generators (specialization closure + recompose). */
export function transportValuationAlongPredicationGenerators(
  valuation: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier = joinKnowledge,
): Valuation {
  const base = closeSpecialization(valuation.base);
  return composeValuation(valuationMemes(valuation), base, fold);
}

/** The knowledge closure endomorphism. */
export const knowledgeClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseKnowledge(valuation), joinKnowledge);

/** The truth closure endomorphism. */
export const truthClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseTruth(valuation), joinTruth);

/** The knowledge closure order carrier. */
export const knowledgeValuationClosureOrder: PredicationValuationClosureOrderCarrier = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "knowledge" as const,
  endomorphism: knowledgeClosureEndomorphism,
  lattice: knowledgeValuationClosureLattice,
});

/** The truth closure order carrier. */
export const truthValuationClosureOrder: PredicationValuationClosureOrderCarrier = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "truth" as const,
  endomorphism: truthClosureEndomorphism,
  lattice: truthValuationClosureLattice,
});

/** Build a valuation closure process from an order and seed. */
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

/** Close a valuation closure process to its fixed point. */
export function closePredicationValuationClosure(process: PredicationValuationClosureProcessCarrier): PredicationValuationClosureCarrier {
  const closure = closeOrdinalProcess(process.ordinalProcess);
  return Object.freeze({
    kind: "predication.valuation.closure.carrier" as const,
    process,
    closure,
    sheaf: sheafFromValuation(closure.value),
  });
}

/** The knowledge closure of a posit presheaf. */
export function knowledgeValuationClosure(p: PositPresheaf): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(knowledgeValuationClosureOrder, p.traces[0]!));
}

/** The truth closure of a posit presheaf. */
export function truthValuationClosure(p: PositPresheaf): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(truthValuationClosureOrder, p.traces[0]!));
}

/** The sheaf of a posit presheaf's knowledge closure. */
export function knowledgeClosureSheaf(p: PositPresheaf): SheafCarrier {
  return knowledgeValuationClosure(p).sheaf;
}

/** Build a trace from a closure carrier (orbit + fixed-point stage). */
export function predicationValuationClosureTrace(closure: PredicationValuationClosureCarrier): PredicationValuationClosureTraceCarrier {
  const fixedPointStage = closure.closure.stabilization.kind === "ordinal.closure.stabilization:witness"
    ? predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint" as const, stage: closure.closure.stabilization.ordinal, value: closure.closure.stabilization.value }))
    : predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint" as const, stage: closure.closure.stabilization.searchedThrough, value: closure.closure.stabilization.value }));
  return Object.freeze({
    kind: "predication.valuation.closure.trace" as const,
    closure,
    sheaf: closure.sheaf,
    orbit: Object.freeze(closure.closure.orbit.map(predicationValuationClosureStage)),
    fixedPointStage,
  });
}

/** The trace of a posit presheaf's knowledge closure. */
export function knowledgeClosureTrace(p: PositPresheaf): PredicationValuationClosureTraceCarrier {
  return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}

/** The cells of a posit presheaf's knowledge closure sheaf. */
export function knowledgeClosureCells(p: PositPresheaf): readonly Cell[] {
  return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}

/** The cohomology of the knowledge closure of an utterance's posit. */
export function utteranceKnowledgeClosureCohomology(left: Mark, right: Mark): CohomologyCarrier {
  return cohomology(knowledgeClosureSheaf(posit(predicate(articulate(utterance(left, right))))));
}

/** Settle a posit presheaf: knowledge-close, map the orbit to stages, assemble the filtration. */
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

/** The knowledge-join valuation closure lattice. */
export function valuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinKnowledge);
}

/** The truth-join valuation closure lattice. */
export function truthValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinTruth);
}

/** The knowledge valuation closure lattice, with leq strengthened to per-charge knowledge order. */
export function knowledgeValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  const lattice = Object.freeze({
    ...valuationClosureLattice(bottom),
    leq: (left: Valuation, right: Valuation): boolean => {
      for (const fiber of left.fibers) {
        for (const assignment of fiber.assignments) {
          const rightCharge = right.fibers
            .flatMap((rightFiber) => rightFiber.assignments)
            .find((rightAssignment) => cellCoincides(rightAssignment.cell, assignment.cell))
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
      const prior = fibers.find((item) => predicateCoincides(item.predicate, fiber.predicate));
      if (!prior) fibers.push(fiber);
      else {
        const assignments: Meme[] = [];
        for (const assignment of [...prior.assignments, ...fiber.assignments]) {
          const existingIndex = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
          if (existingIndex < 0) assignments.push(assignment);
          else assignments[existingIndex] = Object.freeze({ ...assignment, charge: fold(assignments[existingIndex]!.charge, assignment.charge) });
        }
        fibers.splice(fibers.indexOf(prior), 1, Object.freeze({ ...fiber, assignments: Object.freeze(assignments) }));
      }
    }
  }
  return Object.freeze({ ...left, fibers: Object.freeze(fibers) });
}
