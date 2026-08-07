// @emsenn/content-production/content-farm — the content-generation engine.
//
// CONTENT-FARM is the property-agnostic generation machinery of
// @emsenn/content-production (content + computing): the computing-backed
// autonomous-production engine. A farm is configured with PROPERTIES; each
// property declares its content dir, seed terms, demand source, voice, ask
// model, and gates' parameters. The witnessed `cultivate` cycle is the BASE
// engine, parameterized at the `select` and `compose` seams — a specialization
// such as the newsroom is a fiber over it (see dev/docs/notes/
// 2026-06-15-newsroom-as-fiber-over-content-farm.md). It subsumes the
// koios.news mill (2026-06-12): demand creates the assignment, the term-as-lens
// selects ONE source story, the draft is asked for with a SINGLE LLM call,
// post-produced locally by the editorial closure (deprophesy, dedupe,
// restore-title, safe lint splices — no re-prompt), judged by the gates,
// and the candidate is projected
// draft: true into the property's content store, the run is recorded on
// the append-only run trace, and an editorial work item is deposited to
// the swarm hub. Withheld runs are compost — retained learning substrate,
// read back with their gate evidence by `compost()`.

// ---------- the upstream intake vocabulary (syndication-codecs re-exports) ----------
export type { FetchLike, SyndicationItem, SyndicationConfig } from "@emsenn/content/syndication";

// ---------- news-document production (domain: @emsenn/content-topology) ----------
// The article prompt/parse, story selection, and editorial gates are content-
// domain primitives; they live in the content library and are re-exported here
// for the service's consumers. content-farm ORCHESTRATES them (see cultivate).
export {
  FORM_EXEMPLAR_DEFAULT, draftPrompt, parseDraftReply,
  distinctiveTermWords, termSupportCount, selectStory,
  titleFidelityFindings, templateMonotonyCount, judgeDraft,
} from "@emsenn/content/topology/article";
export type {
  ArticleVoice, DraftPromptInput, PostDraft, SourceStory,
  SelectStoryOptions, FarmGate, JudgeContext,
} from "@emsenn/content/topology/article";

// ---------- prose-fitness primitives (domain: @emsenn/content-topology) ----------
export {
  normalizeTerm,
  wordCount,
  prophecyFindings,
  extractLinks,
  repetitionFindings,
  numberFaithfulnessFindings,
} from "@emsenn/content/topology/gates";

// ---------- demand ----------
export { NO_VIEWS, readSearchConsole, demandTable } from "./demand.mjs";
export type {
  SeedTerm,
  SearchConsoleQuery,
  DemandEntry,
  CandidatePost,
  ViewCountsReading,
  DemandTableInput,
} from "./demand.mjs";

// ---------- properties ----------
export {
  candidateDocument,
  farmLogPath,
  farmRecordPath,
  loadCandidates,
  normalizeFarmProperty,
  runsPath,
  searchConsolePath,
} from "./property.mjs";
export type { CandidateDocumentInput, FarmDemandSource, FarmProperty } from "./property.mjs";

// ---------- the cultivation cycle, its trace, and the compost ----------
export {
  cultivate,
  intakeItems,
  isCultivationObstruction,
  editorialWorkItem,
  depositEditorialWork,
  replayRuns,
  compost,
} from "./cultivate.mjs";
export type {
  Ask,
  SelectStory,
  ComposeDraft,
  CycleSettlement,
  RecordContext,
  RecordCycle,
  CultivateOptions,
  CultivationResult,
  CultivationObstruction,
  CultivationJudgment,
  EditorialWorkItem,
  EditorialOffice,
  FarmHub,
  DeskWitness,
  DeskObstruction,
  DeskJudgment,
  FarmRunRecord,
  CompostEntry,
} from "./cultivate.mjs";

// ---------- the newsroom fiber (newsroom's special functions as seams) ----------
export {
  cleanProse, sentences,
  synthesisPrompt, structureBrief, synthesizeBrief,
  newsroomCompose,
  keywordsOf, assignmentPrompt, parseAngles, clusterSources,
  newsroomSelect,
  articleSubject, sourceWrites, briefWrites,
  newsroomRecord,
  assignAngles, runNewsroomCycle,
} from "./newsroom.mjs";
export type { StructuredBrief, NewsroomCultivation, NewsroomCycleOptions, NewsroomCycleResult } from "./newsroom.mjs";

// ---------- the persistent service form ----------
export {
  ContentFarmService,
  createContentFarmService,
  contentFarmConfigFromDocument,
  farmCycleReading,
  normalizeContentFarmConfig,
} from "./service.mjs";
export type {
  ContentFarmConfig,
  ContentFarmServiceOptions,
  ContentFarmSnapshot,
  FarmCycleReading,
  DemandPullWitness,
  DemandPullObstruction,
  DemandPullJudgment,
  FarmRunObstruction,
  FarmReading,
  FarmCycle,
} from "./service.mjs";
