/**
 * articulating/predicating — Fregean predication inside articulation.
 *
 * The research-chain morphism is:
 *
 * potential-aperiodic-articulation-cell
 *   --predicating-->
 * potential-transfinite-predication-cell
 *
 * This surface is currently a categorical barrel over the existing
 * implementation while files migrate into the nested layout.
 */
export {
  Predicate,
  predicate,
  entitySet,
  predicateSet,
  cell,
  cellSet,
  generatedPredicationCellSet,
  generatePredicationCategory,
  isCell,
  predicateOfClaim,
  materializePredicationCategory,
  specializationMorphism,
  isSpecializationMorphism,
  predicationSite,
  predicationTermIdentity,
  predicationPredicateIdentity,
  cellIdentity,
  predicationNodeIdentity,
  predicationBaseObjectIdentity,
  cohere,
  closeSpecialization,
  unrelatedPairs,
} from "./predication.mjs";
export type {
  PredicationTerm,
  PredicationPredicate,
  EntitySet,
  PredicateSet,
  Cell,
  CellSet,
  GeneratedPredicationCellSet,
  PredicationNode,
  PredicationBaseObject,
  Edge,
  SpecializationMorphism,
  BaseCategory,
  PredicationSite,
  TransfinitePredicationCategory,
  PredicationFiberFunctorCarrier,
  PredicationDatum,
  PredicationTermIdentityWitness,
  PredicationTermIdentityObstruction,
  PredicationTermIdentityJudgment,
  PredicationPredicateIdentityWitness,
  PredicationPredicateIdentityObstruction,
  PredicationPredicateIdentityJudgment,
  CellIdentityWitness,
  CellIdentityObstruction,
  CellIdentityJudgment,
  PredicationNodeIdentityWitness,
  PredicationNodeIdentityObstruction,
  PredicationNodeIdentityJudgment,
  PredicationBaseObjectIdentityWitness,
  PredicationBaseObjectIdentityObstruction,
  PredicationBaseObjectIdentityJudgment,
  CoherenceCarrier,
  UnrelatedPairsCarrier,
} from "./predication.mjs";

export {
  relation,
  relationRead,
  relationReadAbsence,
  relationMatrix,
  matrixEntryReading,
  relationFromMatrix,
  isRelationCarrier,
  pointProfile,
  stateProfile,
  stateExtension,
  transpose,
  dual,
  settleStateProfile,
  settlePointProfile,
  checkRelationTransform,
  relationTransform,
  isRelationTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "./bilattice-relation.mjs";
export type {
  RelationSameness,
  RelationReadWitness,
  RelationReadObstruction,
  RelationReadJudgment,
  RelationCarrier,
  RelationMatrixEntry,
  RelationMatrixEntryWitness,
  RelationMatrixEntryObstruction,
  RelationMatrixEntryJudgment,
  RelationMatrixCarrier,
  PointProfileEntry,
  PointProfileCarrier,
  StateProfileEntry,
  StateProfileCarrier,
  StateExtensionCarrier,
  RelationForward,
  RelationBackward,
  RelationReadFunction,
  RelationOptions,
  RelationTransform,
  RelationTransformForwardDomainObstruction,
  RelationTransformBackwardDomainObstruction,
  RelationTransformAdjointnessObstruction,
  RelationTransformObstructionAtom,
  RelationTransformWitness,
  RelationTransformObstruction,
  RelationTransformJudgment,
} from "./bilattice-relation.mjs";

export * as geometry from "./geometry/index.mjs";
export * as positing from "./positing/index.mjs";
export * as typedTheory from "./typed-theory/index.mjs";
