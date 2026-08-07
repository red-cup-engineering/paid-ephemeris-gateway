/**
 * @emsenn/organizing - social-scale governing: settling a plurality of agents
 * into one collective.
 *
 * Organizing is the Gen-2 inter-agent lift of @emsenn/animating along the agency
 * spiral. Animating glues three faculty faces into one agent; organizing glues a
 * sheaf of agents into one organization.
 *
 * Carriers should move toward Relating's TypeBox carrier kernel directly. The
 * remaining `*.schema.types.mts` modules are legacy checked-in type surfaces, not
 * a build-time codegen contract. Each verb is one Relating action.
 */

export {
  organize,
  assemble,
  adjudicate,
  adjudicationOf,
  socialBecoming,
  socialBecomingOf,
  relate,
  relatingOf,
  community,
  communityOf,
  institute,
  instituteOf,
  socialSymmetry,
  socialSymmetryOf,
  socialStance,
  cohesion,
  governance,
  type GovernanceInput,
  socialFactor,
  socialUnion,
  face,
  faceOf,
  faceOfMembrane,
  project,
  reseed,
  federate,
  crossArena,
  collectiveRobustness,
  buildTelos,
  type Constituent,
  type CrossArena,
  type CollectiveRobustness,
  type SocialBoundary,
  type FederationInput,
  type OrganizationOptions,
  type TelosOptions,
  type SocialProjection,
  type Coordination,
} from "./organizing.mjs";

export {
  DirectorySubstrateSchema,
  SubstrateChronicleSchema,
  SubstrateContentSchema,
  SubstratePackageSchema,
  directorySubstrateCarrier,
  substrateChronicleCarrier,
  substrateContentCarrier,
  substratePackageCarrier,
  readDirectorySubstrate,
  directorySubstrateResource,
  assembleDirectorySubstrate,
  type DirectorySubstrate,
  type DirectorySubstrateOptions,
  type JSNodePackageSubstrate,
  type JSNodeWorkspaceSubstrate,
  type SubstrateChronicle,
  type SubstrateContent,
  type SubstratePackage,
} from "./substrate/index.mjs";

export * from "./theatre.mjs";
export * as performing from "./performing/index.mjs";

export {
  SituationSceneSchema,
  SituationSchema,
  situationCarrier,
  situation,
  type SituationScene,
  type Situation,
  type SituationInput,
} from "./situation/index.mjs";

export {
  TroupeSchema,
  WorkLocusClaimSchema,
  WorkLocusGovernanceSchema,
  troupeCarrier,
  workLocusClaimCarrier,
  workLocusGovernanceCarrier,
  cast,
  stageTroupeMember,
  claimWorkLocus,
  governWorkLocusClaims,
  type Troupe,
  type TroupeStageInput,
  type WorkLocusClaim,
  type WorkLocusClaimInput,
  type WorkLocusGovernance,
  type GovernWorkLocusClaimsOptions,
} from "./casting/index.mjs";

export { organizationSymmetryCarrier, organizationStanceCarrier, governanceCarrier, cohesionCarrier, type OrganizationSymmetry, type OrganizationStance, type Governance, type OrganizationCohesion } from "./carriers.mjs";
export {
  WorkspaceCarrierSchema,
  DependencyGraphSchema,
  CoverSchema,
  ResolutionSchema,
  workspaceCarrier,
  dependencyGraphCarrier,
  coverCarrier,
  resolutionCarrier,
  type WorkspaceCarrier,
  type DependencyGraph,
  type Cover,
  type Resolution,
} from "./host-neutral-carriers.mjs";
export {
  decodePnpmLock,
  decodePnpmWorkspace,
  dependencyGraphFromManifests,
  dependencyGraphH1,
  encodePnpmLockResolution,
  encodePnpmWorkspace,
  topologicalSortDependencyGraph,
  type WorkspaceManifest,
} from "./js-mark.mjs";
export {
  encodeGitmodules,
  gitSubmoduleCover,
  parseGitlinks,
  parseGitSubmoduleStatus,
  parseGitmodules,
  type GitSubmoduleStatusEntry,
  type GitmoduleEntry,
} from "./git-mark.mjs";
export {
  leanDependencyGraphFromModules,
  leanDependencyGraphH1,
  leanTheoremSpine,
  leanTheoremSpineCoverage,
  topologicalSortLeanModules,
  type LeanTheoremSpine,
  type LeanTheoremSpineCoverage,
  type LeanTheoremSpineEntry,
} from "./lean-mark.mjs";
export type { Organization } from "./schemas.mjs";
export type { Telos } from "./schemas.mjs";
export type { Adjudication } from "./schemas.mjs";
export type { SocialBecoming } from "./schemas.mjs";
export type { Relating } from "./schemas.mjs";
export type { Community } from "./schemas.mjs";
export type { Institution } from "./schemas.mjs";
export type { InstitutionMembrane } from "./schemas.mjs";
export type { SocialFactorization } from "./schemas.mjs";
export type { Federation } from "./schemas.mjs";
export type { Face } from "./schemas.mjs";
export type { OfficeEligibilityDecision } from "./schemas.mjs";
export type { OfficeEligibilityRequest } from "./schemas.mjs";
export type { AccountingEntry } from "./schemas.mjs";
export type { AccountingUtterances } from "./schemas.mjs";
export type { AccountingBalance } from "./schemas.mjs";
export type { OrganizingWorkRecord } from "./schemas.mjs";

export {
  ACCOUNTING_PREDICATES,
  accountingInputUtterances,
  accountingUtterances,
  amountUtterances,
  directiveUtterances,
  journalUtterances,
  malformedUtterances,
  postingUtterances,
  transactionUtterances,
  type AccountingTerm,
} from "./accounting.mjs";

export {
  accountingBalance,
  admitAccountingTransaction,
} from "./accounting-balance.mjs";

export {
  default as loadAccountingLedger,
  fixedPointReadingsOfUtterances,
  posting,
  transaction,
  open,
  close,
  commodity,
  price,
  pad,
  balance,
  option,
  include,
  malformed,
  isTransaction,
  isDirective,
  isMalformed,
  makeRegistry,
  declareCommodity,
  observe,
  postingHolding,
  inferElided,
  balances,
  txnId,
  runningBalances,
  balanceAt,
  type Cost,
  type Price,
  type BalanceAssertion,
  type Source,
  type Posting,
  type Transaction,
  type OpenDirective,
  type CloseDirective,
  type CommodityDirective,
  type PriceDirective,
  type PadDirective,
  type BalanceDirective,
  type OptionDirective,
  type IncludeDirective,
  type Directive,
  type Malformed,
  type Entry,
  type Registry,
  type LoadedLedger,
} from "./accounting/ledger.mjs";

export * from "./accounting/report.mjs";
export { default as accountingBalanceReport } from "./accounting/report.mjs";
export * as accountingInstitution from "./accounting/institution.mjs";
export * as accountingCapital from "./accounting/capital.mjs";
export * as accountingCommodity from "./accounting/commodity.mjs";
export * as accountingExchange from "./accounting/exchange.mjs";
export * as accountingMarketAdmission from "./accounting/market-admission.mjs";
export * as accountingStrategy from "./accounting/strategy.mjs";
export * as accountingValue from "./accounting/value.mjs";

export {
  WORK_PREDICATES,
  assignWork,
  deriveWorkType,
  fiber,
  fiberCoordinate,
  fiberOf,
  officeName,
  officeTerm,
  predicate,
  term,
  termKey,
  termValue,
  uniqueTerms,
  workChargeStatus,
  workEvidenceValue,
  workAgent,
  workItem,
  workPriority,
  workProject,
  workPrompt,
  workReport,
  reportSkillResult,
  skillResultRouting,
  type SkillResultRouting,
  workStatusName,
  workSubject,
  workTask,
  workTitle,
  type CapabilityName,
  type DutyName,
  type Fiber,
  type FiberCoordinate,
  type OfficeName,
  type OrganizingCarrierTerm,
  type TaskClosure,
  type WorkAgent,
  type WorkAssignment,
  type WorkEvidenceBearing,
  type WorkEvidenceCarrier,
  type WorkFactCarrier,
  type WorkId,
  type WorkItem,
  type WorkProject,
  type WorkReport,
  type WorkStatus,
  type WorkTask,
  type WorkTerm,
  type WorkType,
} from "./work.mjs";

export {
  admitOfficeEligibilityRequest,
  officeEligibility,
  officeEligibilityTerm,
  type EligibilityGap,
} from "./authority.mjs";

export {
  actions,
  organizeAction,
  assembleAction,
  adjudicateAction,
  socialBecomingAction,
  relatingAction,
  communityAction,
  instituteAction,
  symmetrizeAction,
  stanceAction,
  cohesionAction,
  governAction,
  verificationTournamentAction,
  socialFactorAction,
  faceAction,
  projectAction,
  reseedAction,
  federateAction,
  officeEligibilityAction,
  accountingUtterancesAction,
  accountingBalanceAction,
  jupyterNotebookAction,
  jupyterRunCellsAction,
  jupyterDefaultViewsAction,
  capitalActions,
  commodityActions,
  exchangeActions,
  strategyActions,
  valueActions,
  organizeDirectoryAction,
} from "./actions.mjs";

// -- contradiction-aware federation: held top plus graded H1/Raft residue --
export {
  federateGradedSourceCarrier,
  gradedConsensusCarrier,
  federateGraded,
  type FederateGradedSource,
  type FederateGradedCell,
  type FederateGradedStatement,
  type SharedGradedCell,
  type ContestedGradedCell,
  type NeedsCoordinationCell,
  type GradedConsensus,
  type FederateGradedOptions,
} from "./federate-graded.mjs";

// ── the across-face standards codec: ActivityPub Server-to-Server (federation) ──
// scale-2: delivering animating's Activities between agent-camps (the ‖ fan-out).
export {
  deliver,
  federateActivities,
  follow,
  accept,
  admit,
  isMember,
  announce,
  mergeActivities,
  translate,
  type NameTranslation,
  grantByOffice,
  commonGround,
  converge,
  investiture,
  vacate,
  rotateOffice,
  exchange,
  type CapabilityTransfer,
  type ClaimConsensus,
  type GrantOutcome,
  deliverToCamps,
  reach,
  deliveryRequests,
  type DeliveryRequest,
  ACTIVITYSTREAMS_CONTEXT,
  type Camp,
  type Delivery,
} from "./writing/activitypub/index.mjs";

// ── the across-face standards codec: Matrix — state-resolution over a signed event-DAG ──
// scale-2 / real-time: a ROOM (events over a camp) whose shared state is settled by the
// consensus reading over the event DAG (REUSES converge/federate — not last-writer-wins).
export {
  eventCarrier,
  isStateEvent,
  asActivity,
  ancestryOf,
  resolveState,
  isCoordinationFree,
  federateRoom,
  type MatrixEvent,
  type Room,
  type ResolvedCell,
} from "./writing/matrix/index.mjs";

// ── the CALM theorem reading: coordination-free iff monotone ──
// external theorem over federate/federateActivities: agreement-only and no H1 obstruction.
export {
  calmReadingCarrier,
  readCalmFederation,
  readCalmCovers,
  readCalmActivities,
  type CalmReading,
} from "./writing/calm/index.mjs";

// ── the coordinated consensus frontier: Raft as the fallback where CALM fails ──
// monotone operations lift with no Raft round; non-monotone operations enter the
// leader-elected, totally ordered RWIL log with one command per index.
export {
  raftLeadershipCarrier,
  raftLogEntryCarrier,
  raftLogCarrier,
  raftAppendResultCarrier,
  calmRaftFrontierCarrier,
  emptyRaftLog,
  raftEntry,
  raftEntryRows,
  raftLogRows,
  projectRaftState,
  oneValuePerIndex,
  appendRaftProposals,
  readCalmRaftFrontier,
  coordinateByCalmOrRaft,
  type RaftLeadership,
  type RaftLogEntry,
  type RaftLog,
  type RaftAppendResult,
  type CalmRaftFrontier,
  type RaftProposal,
  type CoordinateWithRaftOptions,
} from "./writing/raft/index.mjs";

// ── the IN-face standards codec: Jupyter — kernel messaging + notebook-as-witness-ledger ──
// scale-2 / shared-compute (computing): the OFFICE OF EXECUTION (kernel) settling
// execute_request → execute_reply, broadcasting iopub outputs, and accumulating a NOTEBOOK
// whose code cells ARE the append-only LOG. cellsToRecords/recordsToCells is the witness-
// ledger projection (log ⇄ records) that round-trips. REUSES jupyter.mts's notebook carriers.
export {
  executeRequestCarrier,
  iopubMessageCarrier,
  executeReplyCarrier,
  echoKernel,
  execute,
  runCells,
  cellsToRecords,
  recordsToCells,
  notebookFromRecords,
  streamOutput,
  resultOutput,
  type JupyterExecuteRequest,
  type JupyterIopubMessage,
  type JupyterExecuteReply,
  type KernelHandler,
  type NotebookRecord,
} from "./writing/jupyter/index.mjs";

// -- default Jupyter/data-science views over organizing instance carriers --
export {
  organizingDefaultJupyterViewArtifacts,
  organizingDefaultNotebookDocuments,
  organizingDefaultViewSessionEventsFromWitnessRows,
  writeOrganizingDefaultJupyterViews,
  type OrganizingDefaultJupyterViewsInput,
  type OrganizingDefaultJupyterViewsWriteOptions,
  type OrganizingDefaultNotebookDocument,
  type OrganizingDefaultNotebookId,
  type OrganizingDefaultViewArtifact,
  type OrganizingDefaultJupyterViewsWritten,
  type OrganizingDefaultViewSessionEvent,
  type OrganizingPackageMesh,
  type OrganizingPackageMeshPackage,
  type OrganizingWitnessLedgerHandle,
} from "./default-jupyter-views.mjs";

// ── the economic protocol projection: HTTP 402 payment as settlement witness ──
export {
  monetaryQuantityCarrier,
  x402ChallengeCarrier,
  x402PaymentCarrier,
  x402ReceiptCarrier,
  quantity,
  valueQuantityView,
  paymentFromChallenge,
  receiptFromPayment,
  receiptFromWitnessLog,
  witnessLogFromReceipt,
  x402ReceiptLogReading,
  receiptLedgerState,
  isWitnessedExchange,
  valueConserved,
  x402PaymentAction,
  x402ReceiptAction,
  x402Actions,
  type MonetaryQuantity,
  type X402Challenge,
  type X402Payment,
  type X402Receipt,
  type PaymentOptions,
  type ReceiptOptions,
} from "./writing/x402/index.mjs";

// -- cockpit dogfoods the moat: held capability = accountable claim; peer disagreement = contradiction-aware federation --
export {
  claimWitness,
  heldCapabilityReading,
  capabilityGrantsPath,
  accountableClaimCarrier,
  accountableClaim,
  cockpitFederationSources,
  cockpitCoordinationCarrier,
  coordinateCockpitClaims,
  type HeldCapabilityWire,
  type AccountableClaimHolder,
  type AccountableClaim,
  type CockpitCoordination,
  type CoordinateCockpitClaimsOptions,
} from "./cockpit-coordination.mjs";

// -- accountable agentic transaction: authority, invocation, settlement, provenance --
export {
  transactionAttestationCarrier,
  transactionWitnessCarrier,
  transactionWitness,
  rwilWitnessOf,
  transactionFromWitness,
  attestTransaction,
  makeTransactionWitness,
  capabilityInvokeReading,
  x402ReceiptReading,
  attestationReading,
  accountableReadings,
  cohereAccountable,
  isAccountable,
  sameAccountableWitness,
  type TransactionAttestation,
  type TransactionAuthorization,
  type TransactionInvocation,
  type TransactionSettlement,
  type TransactionProvenance,
  type TransactionWitness,
  type TransactionWitnessOptions,
  type AccountabilityLegs,
  type AccountabilityReport,
  type CapabilityInvokeWire,
  type X402ReceiptWire,
  type AttestationWire,
} from "./writing/accountable-transaction/index.mjs";

export { NIX_NO_REAL_BINARY_ASSUMPTION, NixWitnessSchema, NixDerivationSchema, NixStorePathSchema, NixClosureSchema, nixWitnessCarrier, nixDerivationCarrier, nixStorePathCarrier, nixClosureCarrier, nixDerivation, settleDerivation, evaluateDerivation, termContentId, storePathFromTerm, closureOf, type NixWitness, type NixDerivation, type NixStorePath, type NixClosure, type NixDerivationInput, type SettledDerivation } from "./nix.mjs";

export {
  REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION,
  ReproducibleReasoningBuildSchema,
  ReproducibleReasoningRebuildSchema,
  reproducibleReasoningBuildCarrier,
  reproducibleReasoningRebuildCarrier,
  reproducibleReasoning,
  rebuild,
  type ReproducibleReasoningBuild,
  type ReproducibleReasoningRebuild,
  type ReproducibleReasoningInput,
} from "./reproducible-reasoning.mjs";
