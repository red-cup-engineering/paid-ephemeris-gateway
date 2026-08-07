/**
 * memory — the agent's memory carrier (the settled body of held knowledge),
 * derived from @emsenn/relating (markdown codec + settlement).
 *
 * The memory carrier for learning's codomain: the settled body of held knowledge.
 */
export {
  admitDocument,
  admitMemory,
  settleMemory,
  settleMemoryFiltration,
  observeMemory,
  inspectMemoryHealth,
  inspectMemoryTopic,
  measureMemoryGap,
  conceptMapMemory,
  type MemoryDocument,
  type MemoryCarrier,
  type MemoryFact,
  type MemoryTyping,
  type MemoryProof,
  type MemoryObservation,
  type MemoryHealth,
  type MemoryTopicInspection,
  type TopicDocumentInspection,
  type TopicRole,
  type MemoryGap,
  type GapAxis,
  type GapStatus,
  type MemoryConceptMap,
  type ConceptEdge,
} from "./carrier.mjs";

export {
  markdownSemanticLinefeedText,
  normalizeMarkdownLinefeeds,
  type MarkdownLinefeedFinding,
  type MarkdownLinefeedNormalization,
  type MarkdownLinefeedOptions,
} from "./normalization.mjs";

export {
  memoryActions,
  normalizeMarkdownLinefeedsAction,
} from "./actions.mjs";
