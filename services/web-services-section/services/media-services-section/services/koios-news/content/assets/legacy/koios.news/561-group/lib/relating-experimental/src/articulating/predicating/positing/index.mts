/**
 * positing — value enters predication by evidence.
 *
 *   potential-transfinite-predication-cell --positing--> potential-scott-continuous-posit-cell
 *
 * Carries the bilattice charge vocabulary, the predication fiber algebra, the
 * `posit` morphism, the multiplicative linear logic at value entry, and the
 * posit presheaf settlement reads. Charges are never admitted directly; they are
 * constructed from evidence over cells.
 */
export {
  chargeSide,
  chargeSideNames,
  chargeValue,
  chargeValues,
  chargeValueNames,
  chargeValueName,
  chargeSideName,
  isChargeValueName,
  isChargeSideName,
  isChargeSide,
  isChargeValue,
  isCharge,
  asChargeValueName,
  asChargeValue,
  charge,
  bottom,
  witnessedPotential,
  valueOf,
  present,
  sameCharge,
  sameChargeValue,
  negate,
  negateValue,
  conflate,
  conflateValue,
  joinKnowledge,
  joinKnowledgeValue,
  meetKnowledge,
  meetKnowledgeValue,
  joinTruth,
  joinTruthValue,
  meetTruth,
  meetTruthValue,
  leqKnowledge,
  leqTruth,
  compareKnowledge,
  aggregate,
  isTop,
  isBottom,
  knowledgeLeq,
  truthLeq,
  gauge,
  gaugeElementNames,
  fixedSet,
  firingPatternSelfDuality,
  chargeValueIdentity,
  chargeFiniteAlgebra,
} from "./bilattice-charge.mjs";
export type {
  ChargeSideName,
  ChargeSide,
  ChargeValueName,
  ChargeCoordinates,
  ChargeValue,
  ChargeCarrier,
  ChargeFiniteAlgebraCarrier,
  ChargePair,
  GaugeElementName,
  FiringPatternSelfDualityJudgment,
  ChargeValueIdentityJudgment,
  OrderLeqJudgment,
} from "./bilattice-charge.mjs";

export {
  meme,
  isMeme,
  allCells,
  predicateFiber,
  predicateFiberCellIdentity,
  fiberCarrier,
  posit,
  knowledgeOrder,
  truthOrder,
  fiberFromAlgebra,
  predicationFiberLinearFusion,
  predicationFiberLinearResiduum,
  leqTruthPredicateFiber,
  generatorPreservesLinearFusion,
  generatorPreservesLinearResiduum,
  generatorSatisfiesLinearFusionFrobenius,
  converse,
  subjectProjection,
  objectProjection,
  specialization,
  composeFibers,
  chargeAt,
  valuationFromPredicateFiber,
} from "./fiber.mjs";
export type {
  Meme,
  FiberAlgebra,
  Valuation,
  FiberCarrier,
  OrderName,
  Order,
  PredicateFiberCell,
  PredicateFiberCellIdentityJudgment,
  PredicateFiber,
  GeneratorKind,
  FiberGenerator,
} from "./fiber.mjs";

export {
  commutate,
  presheaf,
  presheafFromValuation,
  sheafFromValuation,
} from "./settling/sheaf.mjs";
export type {
  PositPresheaf,
  PresheafTrace,
  SheafCarrier,
  CommutationCarrier,
} from "./settling/sheaf.mjs";

export * as logic from "./logic/index.mjs";
export * as settling from "./settling/index.mjs";
