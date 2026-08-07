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
} from "../../../carriers.mjs";

/**
 * The positive judgment that a charge value is consistent: carries the value
 * whose truth and falsity sides are not both present.
 */
export interface ChargeConsistencyWitness {
  readonly kind: "bilattice.linearLogic.chargeConsistency:witness";
  readonly value: ChargeValue;
}

/**
 * The negative judgment that a charge value is inconsistent: carries the value
 * whose truth and falsity sides are both present.
 */
export interface ChargeConsistencyObstruction {
  readonly kind: "bilattice.linearLogic.chargeConsistency-obstruction";
  readonly value: ChargeValue;
}

/**
 * The result of a charge-consistency check: either a ChargeConsistencyWitness
 * or a ChargeConsistencyObstruction.
 */
export type ChargeConsistencyJudgment = ChargeConsistencyWitness | ChargeConsistencyObstruction;

/**
 * The positive judgment that fusion and residuation are adjoint at the given
 * left, right, and bound: records the inputs together with the computed
 * fusionBound and residualBound.
 */
export interface TruthOrderResiduationWitness {
  readonly kind: "bilattice.linearLogic.truthOrderResiduation:witness";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly bound: ChargeValue;
  readonly fusionBound: ChargeValue;
  readonly residualBound: ChargeValue;
}

/**
 * The negative judgment that fusion and residuation fail to be adjoint at the
 * given left, right, and bound: records the inputs together with the computed
 * fusionBound and residualBound.
 */
export interface TruthOrderResiduationObstruction {
  readonly kind: "bilattice.linearLogic.truthOrderResiduation-obstruction";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly bound: ChargeValue;
  readonly fusionBound: ChargeValue;
  readonly residualBound: ChargeValue;
}

/**
 * The result of a truth-order residuation check: either a
 * TruthOrderResiduationWitness or a TruthOrderResiduationObstruction.
 */
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

/**
 * The multiplicative unit of the linear logic over charge values: the "stable"
 * charge value.
 */
export const linearMultiplicativeUnit: ChargeValue = chargeValue("stable");
/**
 * The frozen list of charge values treated as consistent for the linear logic:
 * "absurd", "potential", and "active".
 */
export const consistentChargeValues: readonly ChargeValue[] =
  Object.freeze([chargeValue("absurd"), chargeValue("potential"), chargeValue("active")] as const satisfies readonly ChargeValue[]);

/**
 * The multiplicative conjunction (tensor) of two charge values: combines their
 * truth/falsity coordinates by side product and implication to yield the fused
 * charge value.
 */
export function linearFusionValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  const [leftTruth, leftFalsity] = coordinates(left);
  const [rightTruth, rightFalsity] = coordinates(right);
  return valueFromCoordinates(
    sideProduct(leftTruth, rightTruth),
    sideMeet(sideImplication(leftTruth, rightFalsity), sideImplication(rightTruth, leftFalsity)),
  );
}

/**
 * The linear implication (residuum) of two charge values: combines left and
 * right coordinates by side implication and product to yield the residual
 * charge value.
 */
export function linearResiduumValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  const [leftTruth, leftFalsity] = coordinates(left);
  const [rightTruth, rightFalsity] = coordinates(right);
  return valueFromCoordinates(
    sideMeet(sideImplication(leftTruth, rightTruth), sideImplication(rightFalsity, leftFalsity)),
    sideProduct(leftTruth, rightFalsity),
  );
}

/**
 * The linear negation of a charge value: the residuum of the value against the
 * multiplicative unit.
 */
export function linearNegationValue(value: ChargeValue): ChargeValue {
  return linearResiduumValue(value, linearMultiplicativeUnit);
}

/**
 * The multiplicative disjunction (par) of two charge values: the De Morgan dual
 * of fusion, computed as the negation of the fusion of the negated operands.
 */
export function linearParValue(left: ChargeValue, right: ChargeValue): ChargeValue {
  return linearNegationValue(linearFusionValue(linearNegationValue(left), linearNegationValue(right)));
}

/**
 * Checks whether a charge value is consistent: returns a witness when its truth
 * and falsity sides are not both present, otherwise an obstruction.
 */
export function chargeConsistency(value: ChargeValue): ChargeConsistencyJudgment {
  const [truth, falsity] = coordinates(value);
  return !(sidePresent(truth) && sidePresent(falsity))
    ? Object.freeze({
      kind: "bilattice.linearLogic.chargeConsistency:witness" as const,
      value,
    })
    : Object.freeze({
      kind: "bilattice.linearLogic.chargeConsistency-obstruction" as const,
      value,
    });
}

/**
 * Checks the fusion/residuation adjunction at left, right, and bound in the
 * truth order: returns a witness when "left fused with right is below bound"
 * agrees with "left is below the residuum of right and bound", otherwise an
 * obstruction, carrying the computed fusionBound and residualBound either way.
 */
export function truthOrderResiduation(left: ChargeValue, right: ChargeValue, bound: ChargeValue): TruthOrderResiduationJudgment {
  const residualBound = linearResiduumValue(right, bound);
  const fusionBound = joinTruthValue(linearFusionValue(left, right), bound);
  const residualOrder = joinTruthValue(left, residualBound);
  const fusionLeqBound = sameChargeValue(fusionBound, bound);
  const leftLeqResidual = sameChargeValue(residualOrder, residualBound);
  return fusionLeqBound === leftLeqResidual
    ? Object.freeze({
      kind: "bilattice.linearLogic.truthOrderResiduation:witness" as const,
      left,
      right,
      bound,
      fusionBound,
      residualBound,
    })
    : Object.freeze({
      kind: "bilattice.linearLogic.truthOrderResiduation-obstruction" as const,
      left,
      right,
      bound,
      fusionBound,
      residualBound,
    });
}
