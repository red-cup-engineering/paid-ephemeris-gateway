/**
 * @emsenn/content-topology — public API surface.
 *
 * Content in the communication-studies sense, presented as a site on the
 * meme floor. Vocabulary enters as namespaced terms; a ContentObject's
 * Lasswell coordinates (communicator, message, channel, audience, effect)
 * admit as utterances; `induceContentTopology` settles them; readings
 * come back as sections, charges, and gate verdicts. The production side
 * (assignment, draft) lives under `./production`; the demand side — a
 * finitely additive charge over a term space, agenda-setting made exact —
 * lives under `./demand`.
 */

// ---------- terms and predicates ----------
export {
  contentTerm, communicatorTerm, messageTerm, channelTerm, audienceTerm, effectTerm, frameTerm, gateTerm,
  contentCellMark,
  communicatedByPredicate, saysPredicate, inChannelPredicate, addressedToPredicate,
  effectedPredicate, framedAsPredicate, clearsGatePredicate, rejectedByGatePredicate,
} from "./content-topology.mjs";

// ---------- Lasswell coordinates and the ContentObject carrier ----------
export {
  communicator, message, channel, audience, effect,
  contentObject, withEffect,
  lasswellJudgment,
} from "./content-topology.mjs";
export type {
  LasswellPosition, LasswellCoordinate,
  CommunicatorCoordinate, MessageCoordinate, ChannelCoordinate, AudienceCoordinate, EffectCoordinate,
  ContentObject, ContentObjectInput,
  ContentCellMark,
  LasswellWitness, LasswellObstruction, LasswellJudgment,
} from "./content-topology.mjs";

// ---------- gates and frames (admission) ----------
export { frameUtterance, gateClearedUtterance, gateRejectedUtterance } from "./content-topology.mjs";

// ---------- settlement on the meme floor ----------
export { induceContentTopology, extendContentTopology } from "./content-topology.mjs";
export type { ContentTopologyCarrier, UtteranceCarrier } from "./content-topology.mjs";

// ---------- readings (content analysis) ----------
export {
  contentKnowledgeSection, contentTruthSection,
  communicatorCharge, messageCharge, channelCharge, audienceCharge, effectCharge, frameCharge,
  gateVerdict,
  contentAnalysis, contentEntries,
} from "./content-section.mjs";
export type {
  SectionCarrier, SectionEntry, ChargeCarrier,
  GateVerdict,
  PositionReading, ContentAnalysisCarrier,
} from "./content-section.mjs";

// ---------- production carriers ----------
export {
  assignment, assignmentFromDemand,
  draft, reviseDraft, currentSurfaces, messageFromDraft,
} from "./production.mjs";
export type {
  AssignmentCarrier, AssignmentInput, AssignmentFromDemandInput,
  DraftCarrier, DraftInput, DraftSurface,
} from "./production.mjs";

// ---------- documentation production (code, not news) ----------
export {
  parseDocReply, judgeDoc, docFindings,
  hallucinatedApiFindings, exampleFindings,
  symbolDocPrompt, formatReferenceEntry, formatReference,
  overviewPrompt, parseOverview, judgeOverview, formatReadme,
} from "./documentation.mjs";
export type {
  DocReply, DocGate, DocVoice, DocSymbolKind,
  DocumentableSymbol, SymbolPromptInput,
  SymbolSummary, OverviewPromptInput, ReadmeInput,
} from "./documentation.mjs";

// ---------- content-fitness primitives ----------
export {
  normalizeTerm, wordCount, proseLines,
  prophecyFindings, extractLinks, repetitionFindings,
  proseLintErrors, proseLintSuggestions,
  extractNumbers, numberFaithfulnessFindings,
} from "./gates.mjs";

// ---------- news-document production (the news specialization) ----------
export {
  draftPrompt, parseDraftReply, FORM_EXEMPLAR_DEFAULT,
  selectStory, termSupportCount, distinctiveTermWords,
  judgeDraft, titleFidelityFindings, templateMonotonyCount,
} from "./article.mjs";
export type {
  SourceStory, PostDraft, ArticleVoice, DraftPromptInput,
  SelectStoryOptions, FarmGate, JudgeContext,
} from "./article.mjs";

// ---------- editorial closure operators (local post-production) ----------
export {
  protectedSpans,
  deprophesy, restoreTitles, applyLintSuggestions, dedupe,
  copyedit,
} from "./copyedit.mjs";
export type {
  CopyEdit, OperatorResult, Span,
  CopyEditContext, CopyEditWitness,
} from "./copyedit.mjs";

// ---------- demand charges ----------
export {
  demandEntry, demandCharge, witnessDemand,
  demandAt, totalDemand, addDemand, scaleDemand,
  demandRanking, demandParity,
} from "./demand.mjs";
export type {
  DemandEntry, DemandChargeCarrier, DemandRankEntry,
  DemandParityWitness, DemandParityObstruction, DemandParityJudgment,
} from "./demand.mjs";
