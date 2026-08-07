/**
 * internal-links - same-site relation carriers for produced content.
 *
 * Site packages know how to discover and apply links; producing-content owns
 * the operator packet shape that lets those acts become portable content-farm
 * readings and IR terms.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const InternalLinkOpportunitySchema = Type.Object({
  sourceSlug: Type.String({ minLength: 1 }),
  sourcePath: Type.String({ minLength: 1 }),
  sourceHeadline: Type.String({ minLength: 1 }),
  targetSlug: Type.String({ minLength: 1 }),
  targetPath: Type.String({ minLength: 1 }),
  targetHeadline: Type.String({ minLength: 1 }),
  sharedTags: Type.Array(Type.String()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  markdownLink: Type.String({ minLength: 1 }),
  insertionGuidance: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/internal-link-opportunity",
  title: "InternalLinkOpportunity",
  additionalProperties: false,
});

export const InternalLinkOpportunityArticleSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  currentInternalLinkCount: Type.Number({ minimum: 0 }),
  opportunities: Type.Array(InternalLinkOpportunitySchema),
}, { additionalProperties: false });

export const InternalLinkOpportunityReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.internal-link-opportunities"),
  opportunityCount: Type.Number({ minimum: 0 }),
  articleCount: Type.Number({ minimum: 0 }),
  byArticle: Type.Array(InternalLinkOpportunityArticleSchema),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/internal-link-opportunity-reading",
  title: "InternalLinkOpportunityReading",
  additionalProperties: false,
});

export const InternalLinkSuggestedPatchSchema = Type.Object({
  beforeMarkdown: Type.String({ minLength: 1 }),
  afterMarkdown: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const InternalLinkPlacementSchema = Type.Object({
  sourceSlug: Type.String({ minLength: 1 }),
  sourcePath: Type.String({ minLength: 1 }),
  sourceHeadline: Type.String({ minLength: 1 }),
  targetSlug: Type.String({ minLength: 1 }),
  targetPath: Type.String({ minLength: 1 }),
  targetHeadline: Type.String({ minLength: 1 }),
  sharedTags: Type.Array(Type.String()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  paragraphIndex: Type.Number({ minimum: 0 }),
  paragraphPreview: Type.String({ minLength: 1 }),
  matchedTerms: Type.Array(Type.String()),
  markdownLink: Type.String({ minLength: 1 }),
  suggestedPatch: Type.Optional(InternalLinkSuggestedPatchSchema),
  insertionGuidance: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/internal-link-placement",
  title: "InternalLinkPlacement",
  additionalProperties: false,
});

export const InternalLinkPlacementArticleSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  placements: Type.Array(InternalLinkPlacementSchema),
}, { additionalProperties: false });

export const InternalLinkPlacementReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.internal-link-placements"),
  placementCount: Type.Number({ minimum: 0 }),
  articleCount: Type.Number({ minimum: 0 }),
  byArticle: Type.Array(InternalLinkPlacementArticleSchema),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/internal-link-placement-reading",
  title: "InternalLinkPlacementReading",
  additionalProperties: false,
});

export const DraftInternalLinkSuggestionSchema = Type.Object({
  targetSlug: Type.String({ minLength: 1 }),
  targetPath: Type.String({ minLength: 1 }),
  targetHeadline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  targetTags: Type.Array(Type.String()),
  matchedTerms: Type.Array(Type.String()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  markdownLink: Type.String({ minLength: 1 }),
  writingGuidance: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/draft-internal-link-suggestion",
  title: "DraftInternalLinkSuggestion",
  additionalProperties: false,
});

export const DraftInternalLinkGuidanceReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.draft-internal-link-guidance"),
  term: Type.String({ minLength: 1 }),
  beat: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String()),
  suggestionCount: Type.Number({ minimum: 0 }),
  suggestions: Type.Array(DraftInternalLinkSuggestionSchema),
  writingInstructions: Type.Array(Type.String()),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/draft-internal-link-guidance-reading",
  title: "DraftInternalLinkGuidanceReading",
  additionalProperties: false,
});

export const ApplyInternalLinkPlacementInputSchema = Type.Object({
  sourceSlug: Type.String({ minLength: 1 }),
  targetSlug: Type.String({ minLength: 1 }),
  paragraphIndex: Type.Optional(Type.Integer({ minimum: 0 })),
  expectedBeforeMarkdown: Type.Optional(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-farm/apply-internal-link-placement-input",
  title: "ApplyInternalLinkPlacementInput",
  additionalProperties: false,
});

export const ApplyInternalLinkPlacementResultSchema = Type.Object({
  kind: Type.Literal("producing-content.internal-link-placement.applied"),
  sourceSlug: Type.String({ minLength: 1 }),
  targetSlug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  paragraphIndex: Type.Number({ minimum: 0 }),
  beforeMarkdown: Type.String({ minLength: 1 }),
  afterMarkdown: Type.String({ minLength: 1 }),
  placement: InternalLinkPlacementSchema,
}, {
  $id: "producing-content/content-farm/apply-internal-link-placement-result",
  title: "ApplyInternalLinkPlacementResult",
  additionalProperties: false,
});

export type InternalLinkOpportunity = Static<typeof InternalLinkOpportunitySchema>;
export type InternalLinkOpportunityArticle = Static<typeof InternalLinkOpportunityArticleSchema>;
export type InternalLinkOpportunityReading = Static<typeof InternalLinkOpportunityReadingSchema>;
export type InternalLinkSuggestedPatch = Static<typeof InternalLinkSuggestedPatchSchema>;
export type InternalLinkPlacement = Static<typeof InternalLinkPlacementSchema>;
export type InternalLinkPlacementArticle = Static<typeof InternalLinkPlacementArticleSchema>;
export type InternalLinkPlacementReading = Static<typeof InternalLinkPlacementReadingSchema>;
export type DraftInternalLinkSuggestion = Static<typeof DraftInternalLinkSuggestionSchema>;
export type DraftInternalLinkGuidanceReading = Static<typeof DraftInternalLinkGuidanceReadingSchema>;
export type ApplyInternalLinkPlacementInput = Static<typeof ApplyInternalLinkPlacementInputSchema>;
export type ApplyInternalLinkPlacementResult = Static<typeof ApplyInternalLinkPlacementResultSchema>;

export const internalLinkOpportunityCarrier = carrierFrom(InternalLinkOpportunitySchema);

export const internalLinkOpportunityReadingCarrier = carrierFrom(InternalLinkOpportunityReadingSchema);

export const internalLinkPlacementCarrier = carrierFrom(InternalLinkPlacementSchema);

export const internalLinkPlacementReadingCarrier = carrierFrom(InternalLinkPlacementReadingSchema);

export const draftInternalLinkSuggestionCarrier = carrierFrom(DraftInternalLinkSuggestionSchema);

export const draftInternalLinkGuidanceReadingCarrier = carrierFrom(DraftInternalLinkGuidanceReadingSchema);

export const applyInternalLinkPlacementInputCarrier = carrierFrom(ApplyInternalLinkPlacementInputSchema);

export const applyInternalLinkPlacementResultCarrier = carrierFrom(ApplyInternalLinkPlacementResultSchema);

export const applyInternalLinkPlacementJsonSchema = ApplyInternalLinkPlacementInputSchema;

export function internalLinkOpportunity(input: Omit<InternalLinkOpportunity, "sharedTags"> & Readonly<{
  sharedTags: readonly string[];
}>): InternalLinkOpportunity {
  return internalLinkOpportunityCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
  }, "internal link opportunity");
}

export function internalLinkOpportunityReading(input: Readonly<{
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    currentInternalLinkCount: number;
    opportunities: readonly InternalLinkOpportunity[];
  }>[];
  constraints?: readonly string[];
}>): InternalLinkOpportunityReading {
  const byArticle = input.byArticle.map((article) => ({
    ...article,
    opportunities: [...article.opportunities],
  }));
  return internalLinkOpportunityReadingCarrier.assert({
    kind: "producing-content.internal-link-opportunities" as const,
    opportunityCount: byArticle.reduce((sum, article) => sum + article.opportunities.length, 0),
    articleCount: byArticle.length,
    byArticle,
    constraints: [...(input.constraints ?? [
      "This is a link-opportunity reading, not an automatic edit.",
      "Operators must place links only where the local paragraph warrants the target article.",
    ])],
  }, "internal link opportunity reading");
}

export function internalLinkPlacement(input: Omit<InternalLinkPlacement, "sharedTags" | "matchedTerms"> & Readonly<{
  sharedTags: readonly string[];
  matchedTerms: readonly string[];
}>): InternalLinkPlacement {
  return internalLinkPlacementCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
    matchedTerms: [...input.matchedTerms],
  }, "internal link placement");
}

export function internalLinkPlacementReading(input: Readonly<{
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    placements: readonly InternalLinkPlacement[];
  }>[];
  constraints?: readonly string[];
}>): InternalLinkPlacementReading {
  const byArticle = input.byArticle.map((article) => ({
    ...article,
    placements: [...article.placements],
  }));
  return internalLinkPlacementReadingCarrier.assert({
    kind: "producing-content.internal-link-placements" as const,
    placementCount: byArticle.reduce((sum, article) => sum + article.placements.length, 0),
    articleCount: byArticle.length,
    byArticle,
    constraints: [...(input.constraints ?? [
      "This is a paragraph-level placement packet, not an automatic edit.",
      "Suggested patches do not add claims or rewrite copy.",
    ])],
  }, "internal link placement reading");
}

export function draftInternalLinkSuggestion(input: Omit<DraftInternalLinkSuggestion, "targetTags" | "matchedTerms"> & Readonly<{
  targetTags: readonly string[];
  matchedTerms: readonly string[];
}>): DraftInternalLinkSuggestion {
  return draftInternalLinkSuggestionCarrier.assert({
    ...input,
    targetTags: [...input.targetTags],
    matchedTerms: [...input.matchedTerms],
  }, "draft internal link suggestion");
}

export function draftInternalLinkGuidanceReading(input: Omit<DraftInternalLinkGuidanceReading, "kind" | "suggestionCount" | "tags" | "suggestions" | "writingInstructions" | "constraints"> & Readonly<{
  tags?: readonly string[];
  suggestions: readonly DraftInternalLinkSuggestion[];
  writingInstructions?: readonly string[];
  constraints?: readonly string[];
}>): DraftInternalLinkGuidanceReading {
  return draftInternalLinkGuidanceReadingCarrier.assert({
    ...input,
    kind: "producing-content.draft-internal-link-guidance" as const,
    tags: [...(input.tags ?? [])],
    suggestionCount: input.suggestions.length,
    suggestions: [...input.suggestions],
    writingInstructions: [...(input.writingInstructions ?? [
      "Use these targets while drafting, not as automatic insertions.",
      "Place links where the paragraph already makes the target topic explicit.",
    ])],
    constraints: [...(input.constraints ?? [
      "This guidance does not rewrite copy, create references, or satisfy a publication gate by itself.",
    ])],
  }, "draft internal link guidance reading");
}

export function appliedInternalLinkPlacement(input: Omit<ApplyInternalLinkPlacementResult, "kind">): ApplyInternalLinkPlacementResult {
  return applyInternalLinkPlacementResultCarrier.assert({
    ...input,
    kind: "producing-content.internal-link-placement.applied" as const,
  }, "applied internal link placement");
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function normalizeApplyInternalLinkPlacementInput(value: unknown): ApplyInternalLinkPlacementInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("internal-link placement input must be a JSON object");
  const record = value as Readonly<Record<string, unknown>>;
  const sourceSlug = maybeString(record["sourceSlug"]);
  const targetSlug = maybeString(record["targetSlug"]);
  if (sourceSlug === undefined) throw new TypeError("sourceSlug is required");
  if (targetSlug === undefined) throw new TypeError("targetSlug is required");
  const paragraphIndex = record["paragraphIndex"] === undefined ? undefined : Number(record["paragraphIndex"]);
  if (paragraphIndex !== undefined && (!Number.isInteger(paragraphIndex) || paragraphIndex < 0)) throw new TypeError("paragraphIndex must be a non-negative integer");
  return applyInternalLinkPlacementInputCarrier.assert({
    sourceSlug,
    targetSlug,
    ...(paragraphIndex === undefined ? {} : { paragraphIndex }),
    ...(record["expectedBeforeMarkdown"] === undefined ? {} : { expectedBeforeMarkdown: String(record["expectedBeforeMarkdown"]) }),
  }, "apply internal link placement input");
}

export function internalLinkOpportunityReadingTerm(input: InternalLinkOpportunityReading): Tm {
  return carrierToTerm(jsonResource(internalLinkOpportunityReadingCarrier.assert(input), "internal link opportunity reading"));
}

export function internalLinkPlacementReadingTerm(input: InternalLinkPlacementReading): Tm {
  return carrierToTerm(jsonResource(internalLinkPlacementReadingCarrier.assert(input), "internal link placement reading"));
}

export function draftInternalLinkGuidanceReadingTerm(input: DraftInternalLinkGuidanceReading): Tm {
  return carrierToTerm(jsonResource(draftInternalLinkGuidanceReadingCarrier.assert(input), "draft internal link guidance reading"));
}

export function applyInternalLinkPlacementInputTerm(input: ApplyInternalLinkPlacementInput): Tm {
  return carrierToTerm(jsonResource(applyInternalLinkPlacementInputCarrier.assert(input), "apply internal link placement input"));
}
