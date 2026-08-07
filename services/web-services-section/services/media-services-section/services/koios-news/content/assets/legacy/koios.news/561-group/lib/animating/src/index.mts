/**
 * @emsenn/animating — the root admission surface for animation.
 *
 * The package root is the normal public package API. It rolls up the public
 * carriers and morphisms from the categorical module indexes so consumers can
 * import from `@emsenn/animating` without knowing the internal spine. Explicit
 * subpaths remain available for tools and readers that want the category tree.
 *
 * Root category map:
 *
 * - Package/category: animation, the admission of a requested action by a
 *   provision-bearing token against a stated requirement claim.
 * - Domain object: `AnimationRequest` = action + token + optional claim.
 * - Codomain object: `AnimationAdmission` = admitted gate + bilattice charge +
 *   dispatch readiness reading.
 * - Root morphism: `admit`, preserving governing's residuation law:
 *   the action is admitted exactly when δ settles to `potential`;
 *   contradiction is surfaced as `stable`, never collapsed.
 * - Boundary discipline: callers pass already-admitted capability/authority
 *   fibers. Textual labels belong at serialization edges, not in the root
 *   morphism.
 */

import { mark, negate, witnessedPotential, type ChargeCarrier, type ChargeValueName } from "@emsenn/relating";
import { fiber, type AgentProvisions, type Fiber, type FiberCoordinate } from "./becoming/doing/algebra/index.mjs";
import {
  dispatchReadiness,
  eligibilityCharge,
  chargeStatus,
  requirements,
  type DispatchReadiness,
  type WorkRequirements,
} from "./becoming/doing/working/governing/algebra/index.mjs";

export { becoming } from "./becoming/index.mjs";
export type { AgentCell } from "./becoming/index.mjs";

export {
  prehend,
  prehensionSubjectiveForms,
} from "./becoming/prehending/index.mjs";
export type {
  Prehension,
} from "./becoming/prehending/index.mjs";

export {
  articulationVocabulary,
  articulation,
} from "./becoming/doing/acting/index.mjs";
export type {
  ArticulationInput,
  ArticulationCarrier,
} from "./becoming/doing/acting/index.mjs";

export {
  taskCell,
  task,
  observation,
} from "./becoming/doing/algebra/index.mjs";
export type {
  TaskEvidenceCarrier,
  Term,
  Utterance,
  Task,
  Observation,
} from "./becoming/doing/algebra/index.mjs";

export {
  handedness,
  peerHandedness,
  handednessFrom,
  handednessCoordinateNames,
  handednessCoordinate,
  handednessCoordinates,
  isHandednessCoordinateName,
  isHandednessCoordinate,
  handednessCoordinateName,
  coordinateSide,
  dualCoordinate,
  chargeAt,
  dualHandedness,
  symmetricPeerJudgment,
  isSymmetricPeer,
  isHandedness,
} from "./becoming/doing/embodying/index.mjs";
export type {
  Handedness,
  HandednessInput,
  HandednessCoordinate,
  HandednessCoordinateName,
  HandednessCoordinateInput,
  HandednessSide,
  SymmetricPeerJudgment,
  SymmetricPeerWitness,
  SymmetricPeerObstruction,
} from "./becoming/doing/embodying/index.mjs";

export {
  doing,
  chargeSidesOf,
  chargeNameOfSides,
  chargeValueNamed,
  chargeNameOfCarrier,
  chargeValueOfCarrier,
  joinKnowledgeNames,
  fiber,
  fiberCoordinate,
  fiberEntry,
  fiberFromEntries,
  fiberValue,
  provisions,
  communicationObservations,
  observationsOfCommunication,
} from "./becoming/doing/algebra/index.mjs";
export type {
  AgentSite,
  AgentProvisions,
  Fiber,
  FiberCoordinate,
  FiberEntry,
  CommunicationObservationCarrier,
} from "./becoming/doing/algebra/index.mjs";

export {
  strictFiniteDream,
  scottContinuousDream,
  transfiniteDream,
  dreaming,
  dreamResult,
} from "./becoming/doing/working/learning/dreaming/index.mjs";
export type {
  DreamRegime,
  DreamResult,
  DreamOptions,
} from "./becoming/doing/working/learning/dreaming/index.mjs";

export {
  learning,
  lesson,
} from "./becoming/doing/working/learning/algebra/index.mjs";
export type {
  AgentLearning,
  Lesson,
} from "./becoming/doing/working/learning/algebra/index.mjs";

export {
  working,
  WORK_TYPES,
  meaningSettled,
  executionSettled,
  workTypeOf,
  deriveWorkType,
  settlementLeq,
  WORK_PREDICATES,
  workSubject,
  workAgent,
  workTask,
  workItem,
  assignWork,
  workProject,
  workReport,
} from "./becoming/doing/working/algebra/index.mjs";
export type {
  AgentPresheaf,
  WorkType,
  GoalCell,
  ClosureRule,
  TaskClosure,
  WorkId,
  OfficeName,
  CapabilityName,
  DutyName,
  WorkStatus,
  WorkTerm,
  WorkAgent,
  WorkTask,
  WorkItem,
  WorkAssignment,
  WorkProject,
  WorkReport,
} from "./becoming/doing/working/algebra/index.mjs";

export {
  governing,
  assignment,
  residuate,
  dispatchReadiness,
  requirements,
  eligibilityCharge,
  chargeStatus,
  isContested,
  openMode,
  mode,
  governOperation,
  admitTool,
  incumbentProvisions,
  assignmentReadiness,
  openAssignmentsForOffice,
  readyWork,
  office,
  OfficeRegistry,
} from "./becoming/doing/working/governing/algebra/index.mjs";
export {
  filtrationEquivalence,
  sameFiltration,
  federationMembership,
  federating,
  mergeFederations,
  federationMerge,
  admitFederationMember,
  migrateFederationMember,
} from "./becoming/doing/working/governing/federating/index.mjs";
export type {
  AgentFiltration,
  Assignment,
  AssignmentStatus,
  WorkRequirements,
  DispatchGap,
  CoordMatch,
  DispatchReadiness,
  OperationRequirement,
  OperationRequirementEntry,
  Mode,
  GovernanceDecision,
  ToolAdmission,
  RankedAssignment,
  Office,
  OfficeOptions,
  OfficeRecognition,
  OfficeHolder,
} from "./becoming/doing/working/governing/algebra/index.mjs";
export type {
  AgentFederation,
  AgentFederationMerge,
  AgentFederationMembership,
  AgentFederationMembershipWitness,
  AgentFederationMembershipObstruction,
  AgentFederationAdmission,
  AgentFederationAdmissionWitness,
  AgentFederationAdmissionObstruction,
  AgentFederationMigration,
  AgentFederationMigrationWitness,
  AgentFederationMigrationObstruction,
} from "./becoming/doing/working/governing/federating/index.mjs";

export {
  completeGraph,
  definite,
  opposed,
  sheafCharges,
  sheafObservations,
} from "./becoming/doing/working/governing/deciding/fleet/consensus/index.mjs";
export type {
  ObserverEdge,
  ComponentConsensus,
  SheafConsensus,
} from "./becoming/doing/working/governing/deciding/fleet/consensus/index.mjs";

export {
  evalAnimation,
  scriptActions,
  scriptMorphisms,
} from "./package-bin.mjs";
export type {
  BoundaryDocument,
  ScriptAction,
  ScriptMorphism,
  ScriptMorphismRegistry,
} from "./package-bin.mjs";

export {
  agentTerm,
  agentIndividuation,
  induceAgentBoundary,
  extendAgentBoundary,
  induceAgentIndividuationBoundary,
  settleBoundary,
  perform,
  bearing,
  boundary,
  affordances,
  regulationRead,
  regulate,
} from "./becoming/doing/embodying/boundary/index.mjs";
export type {
  AgentIndividuation,
  AgentBoundaryCarrier,
  PerformanceCarrier,
  BearingAffirmation,
  BearingSilence,
  BearingObstruction,
  BearingJudgment,
  BoundaryCarrier,
  RegulationInput,
  RegulationWitness,
  RegulationObstructionReason,
  RegulationObstruction,
  RegulationJudgment,
  RegulationCarrier,
} from "./becoming/doing/embodying/boundary/index.mjs";

export {
  utterEvidence,
  utterEvidenceSet,
  deriveLessons,
  settleLessonJudgments,
  LessonMemory,
  cellKey,
  cellOfTerms,
  cellOfUtterance,
} from "./becoming/doing/working/learning/lessons/index.mjs";
export type {
  LessonEvidence,
  DerivedLesson,
  LessonJudgment,
  LessonSettlement,
} from "./becoming/doing/working/learning/lessons/index.mjs";

/** A requested animation. */
export type AnimationAction = string;

/** The provision-bearing token presented at the root boundary. */
export interface AnimationToken {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}

/** The optional requirement claim the action must satisfy. */
export interface AnimationClaim {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}

/** The root domain object admitted by `admit`. */
export interface AnimationRequest {
  readonly action: AnimationAction;
  readonly token: AnimationToken;
  readonly claim?: AnimationClaim;
}

/** The root codomain object derived from governing's residuation reading. */
export interface AnimationAdmission {
  readonly action: AnimationAction;
  readonly admitted: boolean;
  readonly status: ChargeValueName;
  readonly charge: ChargeCarrier;
  readonly readiness: DispatchReadiness;
}

/**
 * Admit an action by a token against an optional claim.
 *
 * Domain: `AnimationAction x AnimationToken x AnimationClaim?`.
 * Codomain: `AnimationAdmission`.
 * Law: `admitted` iff the governing readiness δ is `potential`; missing provisions
 * contribute active evidence, provided provisions contribute potential evidence,
 * and contested provisions surface as the held contradiction `stable`.
 */
export function admit(
  action: AnimationAction,
  token: AnimationToken,
  claim: AnimationClaim = {},
): AnimationAdmission {
  const work: WorkRequirements = requirements(claim);
  const provisions: AgentProvisions = {
    capabilities: token.capabilities === undefined ? fiber() : fiber(token.capabilities),
    authorities: token.authorities === undefined ? fiber() : fiber(token.authorities),
  };
  const readiness = dispatchReadiness(work, provisions);
  const charge = admissionCharge(action, readiness);
  return Object.freeze({
    action,
    admitted: readiness.ready,
    status: chargeStatus(charge),
    charge,
    readiness,
  });
}

function admissionCharge(action: string, readiness: DispatchReadiness): ChargeCarrier {
  const evidence: ChargeCarrier[] = [];
  for (const match of [...readiness.capabilityMatches, ...readiness.authorityMatches]) {
    if (match.match === "potential") {
      evidence.push(witnessedPotential(admissionWitness(action, match.coordinate, "provided")));
    } else if (match.match === "stable") {
      const witness = admissionWitness(action, match.coordinate, "contested");
      evidence.push(witnessedPotential(witness));
      evidence.push(negate(witnessedPotential(witness)));
    } else {
      evidence.push(negate(witnessedPotential(admissionWitness(action, match.coordinate, "missing"))));
    }
  }
  if (evidence.length === 0) evidence.push(witnessedPotential(admissionWitness(action, "unrestricted", "provided")));
  return eligibilityCharge(evidence);
}

function admissionWitness(action: string, coordinate: FiberCoordinate | "unrestricted", reading: string) {
  return mark(Object.freeze(["animating", "admission", action, coordinate, reading] as const));
}
