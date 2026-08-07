import { carrierFrom, type FromSchema } from "@emsenn/relating";

export const ordinalProjectionSchema = {
  $id: "knowing/researching/ordinal",
  title: "OrdinalProjection",
  type: "object",
  required: ["kind", "finiteDepth"],
  additionalProperties: false,
  properties: {
    kind: { type: "string" },
    finiteDepth: { type: ["number", "null"] },
  },
} as const;
export const ordinalProjectionCarrier = carrierFrom(ordinalProjectionSchema);
export type OrdinalProjection = FromSchema<typeof ordinalProjectionSchema>;

export const incrementProjectionSchema = {
  $id: "knowing/researching/increment",
  title: "IncrementProjection",
  type: "object",
  required: ["stage", "ordinal", "addedCells"],
  additionalProperties: false,
  properties: {
    stage: { type: "string" },
    ordinal: ordinalProjectionSchema,
    addedCells: { type: "integer", minimum: 0 },
  },
} as const;
export const incrementProjectionCarrier = carrierFrom(incrementProjectionSchema);
export type IncrementProjection = FromSchema<typeof incrementProjectionSchema>;

export const cellProjectionSchema = {
  $id: "knowing/researching/cell",
  title: "CellProjection",
  type: "object",
  required: ["kind", "settled", "depth", "firstCohomologyRank", "stages"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.wire.cell" },
    settled: { const: true },
    depth: ordinalProjectionSchema,
    firstCohomologyRank: { type: "integer", minimum: 0 },
    stages: { type: "integer", minimum: 0 },
  },
} as const;
export const cellProjectionCarrier = carrierFrom(cellProjectionSchema);
export type CellProjection = FromSchema<typeof cellProjectionSchema>;

export const siteProjectionSchema = {
  $id: "knowing/researching/site",
  title: "SiteProjection",
  type: "object",
  required: ["kind", "increments", "cellsAdded", "trace"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.wire.site" },
    increments: { type: "integer", minimum: 0 },
    cellsAdded: { type: "integer", minimum: 0 },
    trace: { type: "array", items: incrementProjectionSchema },
  },
} as const;
export const siteProjectionCarrier = carrierFrom(siteProjectionSchema);
export type SiteProjection = FromSchema<typeof siteProjectionSchema>;

export const lessonProjectionSchema = {
  $id: "knowing/researching/lesson",
  title: "LessonProjection",
  type: "object",
  required: ["stage", "restrictionCells"],
  additionalProperties: false,
  properties: {
    stage: { type: "string" },
    restrictionCells: { type: "integer", minimum: 0 },
  },
} as const;
export const lessonProjectionCarrier = carrierFrom(lessonProjectionSchema);
export type LessonProjection = FromSchema<typeof lessonProjectionSchema>;

export const learningProjectionSchema = {
  $id: "knowing/researching/learning",
  title: "LearningProjection",
  type: "object",
  required: ["kind", "lessons", "sample"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.wire.learning" },
    lessons: { type: "integer", minimum: 0 },
    sample: { type: "array", items: lessonProjectionSchema },
  },
} as const;
export const learningProjectionCarrier = carrierFrom(learningProjectionSchema);
export type LearningProjection = FromSchema<typeof learningProjectionSchema>;

const derivationStepProjectionSchema = {
  type: "object",
  required: ["stage", "addedCells"],
  additionalProperties: false,
  properties: {
    stage: { type: "string" },
    addedCells: { type: "integer", minimum: 0 },
  },
} as const;

export const explanationProjectionSchema = {
  $id: "knowing/researching/explanation",
  title: "ExplanationProjection",
  type: "object",
  required: ["kind", "steps", "cellsAdded", "derivation"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.explanation" },
    steps: { type: "integer", minimum: 0 },
    cellsAdded: { type: "integer", minimum: 0 },
    derivation: { type: "array", items: derivationStepProjectionSchema },
  },
} as const;
export const explanationProjectionCarrier = carrierFrom(explanationProjectionSchema);
export type ExplanationProjection = FromSchema<typeof explanationProjectionSchema>;

export const curriculumProjectionSchema = {
  $id: "knowing/researching/curriculum",
  title: "CurriculumProjection",
  type: "object",
  required: ["kind", "lessons", "sequence"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.curriculum" },
    lessons: { type: "integer", minimum: 0 },
    sequence: { type: "array", items: lessonProjectionSchema },
  },
} as const;
export const curriculumProjectionCarrier = carrierFrom(curriculumProjectionSchema);
export type CurriculumProjection = FromSchema<typeof curriculumProjectionSchema>;

export const nextStepProjectionSchema = {
  $id: "knowing/researching/next-step",
  title: "NextStepProjection",
  type: "object",
  required: ["kind", "step", "reason"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.next-step" },
    step: { anyOf: [lessonProjectionSchema, { type: "null" }] },
    reason: { type: "string" },
  },
} as const;
export const nextStepProjectionCarrier = carrierFrom(nextStepProjectionSchema);
export type NextStepProjection = FromSchema<typeof nextStepProjectionSchema>;

export const knowledgeProjectionSchema = {
  $id: "knowing/researching/knowledge",
  title: "KnowledgeProjection",
  type: "object",
  required: ["kind", "regime", "certified", "settledRelations", "settled"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.knowledge" },
    regime: { type: "string" },
    certified: { type: "boolean" },
    settledRelations: { type: "integer", minimum: 0 },
    settled: { type: "array", items: incrementProjectionSchema },
  },
} as const;
export const knowledgeProjectionCarrier = carrierFrom(knowledgeProjectionSchema);
export type KnowledgeProjection = FromSchema<typeof knowledgeProjectionSchema>;

export const researchProjectionSchema = {
  $id: "knowing/researching/research",
  title: "ResearchProjection",
  type: "object",
  required: ["kind", "regime", "onShell", "certified", "stages"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.research.settled" },
    regime: { type: "string" },
    onShell: { type: "boolean" },
    certified: { type: "boolean" },
    stages: { type: "integer", minimum: 0 },
  },
} as const;
export const researchProjectionCarrier = carrierFrom(researchProjectionSchema);
export type ResearchProjection = FromSchema<typeof researchProjectionSchema>;
