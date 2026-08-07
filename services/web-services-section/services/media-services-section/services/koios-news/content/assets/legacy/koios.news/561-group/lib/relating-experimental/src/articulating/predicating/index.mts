/**
 * predicating — the predication category over the articulation base.
 *
 * `predicate` consumes an articulation cell and materializes the predication site
 * Φ = E × Π × E that positing consumes. Cells, sets, the base category, coherence,
 * and specialization closure live here. Coincidence is structural (boundary-first).
 */
export {
  Predicate,
  predicate,
  predicateOfClaim,
  cell,
  cellSet,
  entitySet,
  predicateSet,
  generatedPredicationCellSet,
  generatePredicationCategory,
  transfinitePredicationCategory,
  materializePredicationCategory,
  predicationSite,
  specializationMorphism,
  isCell,
  isSpecializationMorphism,
  closeSpecialization,
  cohere,
  unrelatedPairs,
  termCoincides,
  predicateCoincides,
  cellCoincides,
  nodeCoincides,
  baseObjectCoincides,
  predicationTermIdentity,
  predicationPredicateIdentity,
  cellIdentity,
  predicationNodeIdentity,
} from "./predication.mjs";
export type {
  PredicationTerm,
  PredicationPredicate,
  PredicationNode,
  PredicationBaseObject,
  PredicationDatum,
  Cell,
  Edge,
  SpecializationMorphism,
  EntitySet,
  PredicateSet,
  CellSet,
  GeneratedPredicationCellSet,
  BaseCategory,
  PredicationSite,
  PredicationFiberFunctorCarrier,
  TransfinitePredicationCategory,
  CoherenceCarrier,
  UnrelatedPairsCarrier,
  Judgment,
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
  RelationReadJudgment,
  RelationCarrier,
  RelationMatrixCarrier,
  RelationMatrixEntry,
  PointProfileCarrier,
  StateProfileCarrier,
  StateExtensionCarrier,
  RelationTransform,
  RelationTransformJudgment,
} from "./bilattice-relation.mjs";

export * as positing from "./positing/index.mjs";
export * as typedTheory from "./typed-theory/index.mjs";
export * as geometry from "./geometry/index.mjs";
