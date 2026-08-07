/**
 * positing/logic/bilattice-linear-logic — multiplicative linear logic over FOUR.
 *
 * Fusion (tensor ⊗), residuum (linear implication ⊸), negation, and par on the
 * four charge values, computed coordinate-wise over the truth/falsity sides:
 * fusion is side-product on truth and side-implication on falsity; residuum is
 * its adjoint. The multiplicative unit is `stable`; `absurd`/`potential`/`active`
 * are the consistent values. Self-contained over the charge algebra.
 */
import {
  charge,
  chargeSide,
  chargeValue,
  joinTruthValue,
  sameChargeValue,
  valueOf,
  type ChargeCarrier,
  type ChargeSide,
  type ChargeValue,
} from "../bilattice-charge.mjs";

/** The judgment that a charge value is consistent (sides not both present). */
export interface ChargeConsistencyWitness {
  readonly kind: "bilattice.linearLogic.chargeConsistency:witness";
  readonly value: ChargeValue;
}

/** The judgment that a charge value is inconsistent (both sides present). */
export interface ChargeConsistencyObstruction {
  readonly kind: "bilattice.linearLogic.chargeConsistency-obstruction";
  readonly value: ChargeValue;
}

/** The result of a charge-consistency check. */
export type ChargeConsistencyJudgment = ChargeConsistencyWitness | ChargeConsistencyObstruction;

/** Fusion and residuation are adjoint at (left, right, bound). */
export interface TruthOrderResiduationWitness {
  readonly kind: "bilattice.linearLogic.truthOrderResiduation:witness";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly bound: ChargeValue;
  readonly fusionBound: ChargeValue;
  readonly residualBound: ChargeValue;
}

/** Fusion and residuation fail to be adjoint at (left, right, bound). */
export interface TruthOrderResiduationObstruction {
  readonly kind: "bilattice.linearLogic.truthOrderResiduation-obstruction";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly bound: ChargeValue;
  readonly fusionBound: ChargeValue;
  readonly residualBound: ChargeValue;
}

/** The result of a truth-order residuation check. */
export type TruthOrderResiduationJudgment = TruthOrderResiduationWitness | TruthOrderResiduationObstruction;

const sidePresent = (side: ChargeSide): boolean => side.name === "present";
const sideMeet = (left: ChargeSide, right: ChargeSide): ChargeSide => sidePresent(left) && sidePresent(right) ? chargeSide("present") : chargeSide("absent");
const sideProduct = sideMeet;
const sideImplication = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  sidePresent(left) && !sidePresent(right) ? chargeSide("absent") : chargeSide("present");

const coordinates = (value: ChargeValue): readonly [truth: ChargeSide, falsity: ChargeSide] => charge(value).value;
const valueFromCoordinates = (truth: ChargeSide, falsity: ChargeSide): ChargeValue =>
  valueOf(Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([truth, falsity] as const),
    evidence: Object.freeze([Object.freeze([]), Object.freeze([])] as const),
  }) satisfies ChargeCarrier);

/** The multiplicative unit: the "stable" value. */
export const linearMultiplicativeUnit: ChargeValue = chargeValue("stable");

/** The consistent charge values: absurd, potential, active. */
export const consistentChargeValues: readonly ChargeValue[] =
  Object.freeze([chargeValue("absurd"), chargeValue("potential"), chargeValue("active")] as const satisfies readonly ChargeValue[]);

/** Multiplicative conjunction (tensor ⊗) of two charge values. */
export function linearFusionValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  const [leftTruth, leftFalsity] = coordinates(left);
  const [rightTruth, rightFalsity] = coordinates(right);
  return valueFromCoordinates(
    sideProduct(leftTruth, rightTruth),
    sideMeet(sideImplication(leftTruth, rightFalsity), sideImplication(rightTruth, leftFalsity)),
  );
}

/** Linear implication (residuum ⊸) of two charge values. */
export function linearResiduumValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  const [leftTruth, leftFalsity] = coordinates(left);
  const [rightTruth, rightFalsity] = coordinates(right);
  return valueFromCoordinates(
    sideMeet(sideImplication(leftTruth, rightTruth), sideImplication(rightFalsity, leftFalsity)),
    sideProduct(leftTruth, rightFalsity),
  );
}

/** Linear negation: the residuum against the multiplicative unit. */
export function linearNegationValue(value: ChargeValue): ChargeValue {
  return linearResiduumValue(value, linearMultiplicativeUnit);
}

/** Multiplicative disjunction (par ⅋): the De Morgan dual of fusion. */
export function linearParValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  return linearNegationValue(linearFusionValue(linearNegationValue(left), linearNegationValue(right)));
}

/** Whether a charge value is consistent (truth and falsity not both present). */
export function chargeConsistency(value: ChargeValue): ChargeConsistencyJudgment {
  const [truth, falsity] = coordinates(value);
  return !(sidePresent(truth) && sidePresent(falsity))
    ? Object.freeze({ kind: "bilattice.linearLogic.chargeConsistency:witness" as const, value })
    : Object.freeze({ kind: "bilattice.linearLogic.chargeConsistency-obstruction" as const, value });
}

/** Check the fusion/residuation adjunction at (left, right, bound) in the truth order. */
export function truthOrderResiduation(left: ChargeValue, right: ChargeValue, bound: ChargeValue): TruthOrderResiduationJudgment {
  const residualBound = linearResiduumValue(right, bound);
  const fusionBound = joinTruthValue(linearFusionValue(left, right), bound);
  const residualOrder = joinTruthValue(left, residualBound);
  const fusionLeqBound = sameChargeValue(fusionBound, bound);
  const leftLeqResidual = sameChargeValue(residualOrder, residualBound);
  return fusionLeqBound === leftLeqResidual
    ? Object.freeze({ kind: "bilattice.linearLogic.truthOrderResiduation:witness" as const, left, right, bound, fusionBound, residualBound })
    : Object.freeze({ kind: "bilattice.linearLogic.truthOrderResiduation-obstruction" as const, left, right, bound, fusionBound, residualBound });
}
