/**
 * projecting — wire-safe projections of knowing's real carriers (counts + bounded
 * samples), the boundary codec separating composable carriers from serialization.
 */
export {
  projectOrdinal,
  projectIncrement,
  projectCell,
  projectSite,
  projectLesson,
  projectLearning,
  projectExplanation,
  projectCurriculum,
  projectNextStep,
  projectKnowledge,
  projectResearch,
  type OrdinalProjection,
  type IncrementProjection,
  type CellProjection,
  type SiteProjection,
  type LessonProjection,
  type LearningProjection,
  type ExplanationProjection,
  type CurriculumProjection,
  type NextStepProjection,
  type KnowledgeProjection,
  type ResearchProjection,
} from "./projecting.mjs";

export * from "./schemas.mjs";
