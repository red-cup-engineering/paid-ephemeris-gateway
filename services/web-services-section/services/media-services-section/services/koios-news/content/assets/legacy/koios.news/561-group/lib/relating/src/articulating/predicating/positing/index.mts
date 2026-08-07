/**
 * articulating/predicating/positing — value enters predication by evidence.
 *
 * The research-chain morphism is:
 *
 * potential-transfinite-predication-cell
 *   --positing-->
 * potential-scott-continuous-posit-cell
 *
 * This surface carries the predication fiber/valuation objects and the
 * bilattice charge vocabulary used by positing. Direct charge admission remains
 * forbidden; charges are constructed as evidence carriers over cells.
 */
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
  PredicateFiberCellIdentityWitness,
  PredicateFiberCellIdentityObstruction,
  PredicateFiberCellIdentityJudgment,
  PredicateFiber,
  GeneratorKind,
  FiberGenerator,
} from "./fiber.mjs";

export {
  mark,
  token,
  claim,
  utterance,
} from "../../index.mjs";
export type {
  Mark,
  Token,
  Claim,
  UtteranceCarrier,
} from "../../index.mjs";

export {
  cell,
  predicateOfClaim,
} from "../index.mjs";
export type {
  Cell,
  PredicationTerm,
  PredicationPredicate,
} from "../index.mjs";

export {
  chargeSide,
  chargeSideNames,
  chargeValue,
  chargeValues,
  chargeValueNames,
  chargeValueName,
  isChargeValueName,
  asChargeValueName,
  asChargeValue,
  charge,
  bottom,
  witnessedPotential,
  valueOf,
  sameCharge,
  sameChargeValue,
  negate,
  negateValue,
  conflate,
  joinKnowledge,
  joinKnowledgeValue,
  meetKnowledge,
  meetKnowledgeValue,
  joinTruth,
  joinTruthValue,
  leqTruth,
  meetTruth,
  meetTruthValue,
  knowledgeLeq,
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
} from "./bilattice-charge.mjs";

export * as settling from "./settling/index.mjs";
export * as logic from "./logic/index.mjs";
