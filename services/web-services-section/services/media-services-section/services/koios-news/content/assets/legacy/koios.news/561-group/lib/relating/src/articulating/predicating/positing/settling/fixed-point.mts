import { chargeSide, type ChargeSide } from "../../../../articulating/carriers.mjs";
import { type ClosureCarrier } from "./closure.mjs";
import type { Valuation } from "../fiber.mjs";
import { fixedPointGap, fixedPointGapInput, type FixedPointGapCarrier } from "./fixed-point-gap.mjs";
import {
  closePredicationValuationClosure,
  knowledgeValuationClosureOrder,
  predicationValuationClosureStageOrdinal,
  predicationValuationClosureProcess,
  truthValuationClosureOrder,
  type PredicationValuationClosureOrderCarrier,
  type PredicationValuationClosureStageOrdinalCarrier,
} from "./valuation-closure.mjs";
import {
  type PositPresheaf,
  type SheafCarrier,
} from "./sheaf.mjs";

export type { OrderName } from "../fiber.mjs";
import type { OrderName } from "../fiber.mjs";
/**
 * The two extremal bounds of a fixed-point computation: "least" for the least
 * fixed point and "greatest" for the greatest.
 */
export type BoundName = "least" | "greatest";

/**
 * The order object a fixed point is taken in: wraps the underlying
 * predication-valuation closure order (knowledge or truth) used to drive
 * closure.
 */
export interface FixedPointOrderObject {
  readonly kind: "predication.valuation.fixedPoint.orderObject";
  readonly valuationClosureOrder: PredicationValuationClosureOrderCarrier;
}

/**
 * The bound object selecting which extremal fixed point to compute, carrying
 * its name ("least" or "greatest").
 */
export interface FixedPointBoundObject {
  readonly kind: "predication.valuation.fixedPoint.boundObject";
  readonly name: BoundName;
}

/**
 * The seed for a fixed-point closure: the valuation the closure process starts
 * from, tagged with the order and bound it is being closed under.
 */
export interface FixedPointSeedCarrier {
  readonly kind: "predication.valuation.fixedPoint.seed";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly valuation: Valuation;
}

/**
 * A computed extremal fixed point: the seed, the resulting ordinal closure, the
 * fixed-point judgment (witness or obstruction), and the sheaf of the closure's
 * value, for a given order and bound.
 */
export interface FixedPointExtremum {
  readonly kind: "predication.valuation.fixedPoint.extremum";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly seed: FixedPointSeedCarrier;
  readonly closure: ClosureCarrier<Valuation>;
  readonly fixedPoint: FixedPointJudgment;
  readonly sheaf: SheafCarrier;
}

/**
 * Witness that closure stabilized to a fixed point: records the stabilization
 * stage ordinal and the stabilized valuation value, with its order and bound.
 */
export interface FixedPointWitness {
  readonly kind: "predication.valuation.fixedPoint:witness";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly stabilizationStage: PredicationValuationClosureStageOrdinalCarrier;
  readonly value: Valuation;
}

/**
 * Obstruction recording that closure did not stabilize to a fixed point:
 * retains the last valuation value reached, with its order and bound.
 */
export interface FixedPointObstruction {
  readonly kind: "predication.valuation.fixedPoint-obstruction";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly value: Valuation;
}

/**
 * The outcome of closing toward a fixed point: either a stabilization witness
 * or a non-stabilization obstruction.
 */
export type FixedPointJudgment = FixedPointWitness | FixedPointObstruction;

/**
 * The pair of extremal fixed points for one order: the least and greatest
 * fixed-point extrema taken in the same order object, plus their gap.
 */
export interface FixedPointOrderCarrier {
  readonly kind: "predication.valuation.fixedPoint.order";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
  readonly gap: FixedPointGapCarrier;
}

/**
 * The full fixed-point structure of a posit presheaf: the least/greatest extrema in
 * both the knowledge and truth orders, together with the gap carriers measuring
 * the spread between least and greatest in each order.
 */
export interface FixedPointCarrier {
  readonly kind: "predication.valuation.fixedPoint.carrier";
  readonly knowledge: FixedPointOrderCarrier;
  readonly truth: FixedPointOrderCarrier;
}

const greatestSeedValuation = (freeFalsity: ChargeSide) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
    ...fiber,
    assignments: Object.freeze(fiber.assignments.map((assignment) => Object.freeze({
      ...assignment,
      charge: Object.freeze({
        kind: "bilattice-charge.carrier" as const,
        value: Object.freeze([
          assignment.charge.evidence[0].length ? assignment.charge.value[0] : chargeSide("present"),
          assignment.charge.evidence[1].length ? assignment.charge.value[1] : freeFalsity,
        ] as const),
        evidence: assignment.charge.evidence,
      }),
    }))),
  }))),
});

const fixedPointSeed = (
  order: FixedPointOrderObject,
  bound: FixedPointBoundObject,
  valuation: Valuation,
): FixedPointSeedCarrier => Object.freeze({
  kind: "predication.valuation.fixedPoint.seed" as const,
  order,
  bound,
  valuation,
});

const sheafOfClosure = (closure: ClosureCarrier<Valuation>): SheafCarrier => Object.freeze({
  kind: "predication.valuation.sheaf.carrier" as const,
  section: closure.value,
});

const valuationClosureOrder = (name: OrderName): PredicationValuationClosureOrderCarrier =>
  name === "knowledge" ? knowledgeValuationClosureOrder : truthValuationClosureOrder;

const greatestFreeFalsity = (name: OrderName): ChargeSide =>
  name === "knowledge" ? chargeSide("present") : chargeSide("absent");

/**
 * Builds a fixed-point order object wrapping the given predication-valuation
 * closure order.
 */
const fixedPointOrderObject = (
  valuationClosureOrder: PredicationValuationClosureOrderCarrier,
): FixedPointOrderObject => Object.freeze({
  kind: "predication.valuation.fixedPoint.orderObject" as const,
  valuationClosureOrder,
});

/** Builds a fixed-point bound object carrying the given bound name. */
const fixedPointBoundObject = (name: BoundName): FixedPointBoundObject => Object.freeze({
  kind: "predication.valuation.fixedPoint.boundObject" as const,
  name,
});

class FixedPointComputation {
  readonly positCarrier: PositPresheaf;

  constructor(positCarrier: PositPresheaf) {
    this.positCarrier = positCarrier;
  }

  order(name: OrderName): FixedPointOrderObject {
    return fixedPointOrderObject(valuationClosureOrder(name));
  }

  seed(order: FixedPointOrderObject, bound: FixedPointBoundObject): FixedPointSeedCarrier {
    const source = this.positCarrier.traces[0]!;
    const valuation = bound.name === "least"
      ? source
      : greatestSeedValuation(greatestFreeFalsity(order.valuationClosureOrder.name))(source);
    return fixedPointSeed(order, bound, valuation);
  }

  extremum(order: FixedPointOrderObject, boundName: BoundName): FixedPointExtremum {
    const bound = fixedPointBoundObject(boundName);
    const seed = this.seed(order, bound);
    const closure = closePredicationValuationClosure(predicationValuationClosureProcess(order.valuationClosureOrder, seed.valuation)).closure;
    const fixedPoint = closure.stabilization.kind === "ordinal.closure.stabilization:witness"
      ? Object.freeze({
        kind: "predication.valuation.fixedPoint:witness" as const,
        order,
        bound,
        stabilizationStage: predicationValuationClosureStageOrdinal(closure.stabilization.ordinal),
        value: closure.stabilization.value,
      })
      : Object.freeze({
        kind: "predication.valuation.fixedPoint-obstruction" as const,
        order,
        bound,
        value: closure.stabilization.value,
      });
    return Object.freeze({
      kind: "predication.valuation.fixedPoint.extremum" as const,
      order,
      bound,
      seed,
      closure,
      fixedPoint,
      sheaf: sheafOfClosure(closure),
    });
  }

  orderCarrier(name: OrderName): FixedPointOrderCarrier {
    const order = this.order(name);
    const least = this.extremum(order, "least");
    const greatest = this.extremum(order, "greatest");
    return Object.freeze({
      kind: "predication.valuation.fixedPoint.order" as const,
      order,
      least,
      greatest,
      gap: fixedPointGap(fixedPointGapInput(order, least, greatest)),
    });
  }

  carrier(): FixedPointCarrier {
    const knowledge = this.orderCarrier("knowledge");
    const truth = this.orderCarrier("truth");
    return Object.freeze({
      kind: "predication.valuation.fixedPoint.carrier" as const,
      knowledge,
      truth,
    });
  }
}

/**
 * Computes the complete fixed-point structure of a posit presheaf: least and
 * greatest extrema in both the knowledge and truth orders plus the gap carriers
 * for each order.
 */
export function fixedPoints(p: PositPresheaf): FixedPointCarrier {
  return new FixedPointComputation(p).carrier();
}
