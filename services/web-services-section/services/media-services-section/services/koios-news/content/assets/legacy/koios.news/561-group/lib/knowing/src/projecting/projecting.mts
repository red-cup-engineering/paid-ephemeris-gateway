/**
 * projecting — wire-safe projections of knowing's real carriers.
 *
 * The learning-verb morphisms return REAL upstream carriers (AgentCell, AgentSite,
 * AgentLearning) and thin carriers wrapping them (Explanation, Curriculum,
 * NextStep, Knowledge). Those carriers hold CellSets and Ordinals with embedded
 * fundamental-sequence FUNCTIONS — huge and non-serializable; sending them raw to
 * `jsonResource` previously hung the CLI. This module mirrors relating-experimental
 * separating carriers from their codec/serving: each morphism's full carrier stays
 * composable in-process, and the boundary action calls one of these projections to
 * get a faithful, BOUNDED wire form (counts + small samples, never raw CellSets or
 * ordinal closures) before serialization.
 *
 * These are pure functions, projections only — they never reconstruct or summarize
 * the morphism's job; they read a carrier into a JSON-safe shape. Each wire shape is
 * a knowing-owned carrier in `./schemas.mjs`: an `as const` JSON-Schema literal read
 * by `FromSchema` and registered by `carrierFrom`.
 */
import type {
  Ordinal,
  SettlingIncrement,
  SettlingStageOrdinalCarrier,
} from "@emsenn/relating";
import { freeSettlementFiltration } from "@emsenn/relating";
import type {
  Explanation,
  DerivationStep,
  Curriculum,
  NextStep,
  Knowledge,
  SettledResearch,
  KnowingEntry,
  KnowingTrace,
  KnowingLessons,
  KnowingLesson,
} from "../researching/index.mjs";

import type {
  OrdinalProjection,
  IncrementProjection,
  CellProjection,
  SiteProjection,
  LessonProjection,
  LearningProjection,
  ExplanationProjection,
  CurriculumProjection,
  NextStepProjection,
  KnowledgeProjection,
  ResearchProjection,
} from "./schemas.mjs";

export type {
  OrdinalProjection,
  IncrementProjection,
  CellProjection,
  SiteProjection,
  LessonProjection,
  LearningProjection,
  ExplanationProjection,
  CurriculumProjection,
  NextStepProjection,
  KnowledgeProjection,
  ResearchProjection,
};

/** The bounded sample size for any projected list. */
const SAMPLE = 12;

/** Project an ordinal to a bounded reading (never walking a limit's fundamental sequence). */
export function projectOrdinal(ordinal: Ordinal): OrdinalProjection {
  let depth = 0;
  let cursor: Ordinal = ordinal;
  while (cursor.kind === "ordinal.closure.ordinal.successor") {
    depth += 1;
    if (depth > 4096) return Object.freeze({ kind: ordinal.kind, finiteDepth: null });
    cursor = cursor.predecessor;
  }
  return Object.freeze({
    kind: ordinal.kind,
    finiteDepth: cursor.kind === "ordinal.closure.ordinal.zero" ? depth : null,
  });
}

/** Project a settling increment (its CellSet is reduced to a count). */
export function projectIncrement(increment: SettlingIncrement): IncrementProjection {
  return Object.freeze({
    stage: increment.source.shape.kind,
    ordinal: projectOrdinal((increment.stage as SettlingStageOrdinalCarrier).ordinal),
    addedCells: increment.added.cells.length,
  });
}

/** Project an AgentCell to a bounded wire form. */
export function projectCell(cell: KnowingEntry): CellProjection {
  return Object.freeze({
    kind: "knowing.wire.cell" as const,
    settled: true as const,
    depth: projectOrdinal(cell.depth.ordinal),
    firstCohomologyRank: cell.firstCohomology.generators.length,
    stages: freeSettlementFiltration(cell.settlement).stages.length,
  });
}

/** Project an AgentSite to a bounded wire form (the trace as a counted sample). */
export function projectSite(site: KnowingTrace): SiteProjection {
  return Object.freeze({
    kind: "knowing.wire.site" as const,
    increments: site.trace.length,
    cellsAdded: site.trace.reduce((sum, increment) => sum + increment.added.cells.length, 0),
    trace: Object.freeze(site.trace.slice(0, SAMPLE).map(projectIncrement)),
  });
}

/** Project a lesson (its restriction CellSet is reduced to a count). */
export function projectLesson(lesson: KnowingLesson): LessonProjection {
  return Object.freeze({
    stage: lesson.increment.source.shape.kind,
    restrictionCells: lesson.restriction.cells.length,
  });
}

/** Project an AgentLearning to a bounded wire form. */
export function projectLearning(learning: KnowingLessons): LearningProjection {
  return Object.freeze({
    kind: "knowing.wire.learning" as const,
    lessons: learning.lessons.length,
    sample: Object.freeze(learning.lessons.slice(0, SAMPLE).map(projectLesson)),
  });
}

/** Project an Explanation to a bounded wire form (the derivation as a counted sample). */
export function projectExplanation(explanation: Explanation): ExplanationProjection {
  const step = (s: DerivationStep): { readonly stage: string; readonly addedCells: number } =>
    Object.freeze({ stage: s.stage, addedCells: s.addedCells });
  return Object.freeze({
    kind: "knowing.explanation" as const,
    steps: explanation.derivation.length,
    cellsAdded: explanation.derivation.reduce((sum, s) => sum + s.addedCells, 0),
    derivation: Object.freeze(explanation.derivation.slice(0, SAMPLE).map(step)),
  });
}

/** Project a Curriculum to a bounded wire form. */
export function projectCurriculum(curriculum: Curriculum): CurriculumProjection {
  return Object.freeze({
    kind: "knowing.curriculum" as const,
    lessons: curriculum.lessons.length,
    sequence: Object.freeze(curriculum.lessons.slice(0, SAMPLE).map(projectLesson)),
  });
}

/** Project a NextStep to a bounded wire form. */
export function projectNextStep(nextStep: NextStep): NextStepProjection {
  return Object.freeze({
    kind: "knowing.next-step" as const,
    step: nextStep.lesson === null ? null : projectLesson(nextStep.lesson),
    reason: nextStep.reason,
  });
}

/** Project a Knowledge carrier to a bounded wire form. */
export function projectKnowledge(knowledge: Knowledge): KnowledgeProjection {
  return Object.freeze({
    kind: "knowing.knowledge" as const,
    regime: knowledge.regime,
    certified: knowledge.certified,
    settledRelations: knowledge.settled.length,
    settled: Object.freeze(knowledge.settled.slice(0, SAMPLE).map(projectIncrement)),
  });
}

/** Project a SettledResearch carrier to a bounded wire form. */
export function projectResearch(research: SettledResearch, isCertified: boolean): ResearchProjection {
  return Object.freeze({
    kind: "knowing.research.settled" as const,
    regime: research.regime,
    onShell: research.onShell,
    certified: isCertified,
    stages: freeSettlementFiltration(research.settlement).stages.length,
  });
}
