/**
 * source-cycle-packets - candidate post-processing packets.
 *
 * A source cycle can draft candidates, then perform conservative local
 * post-processing: normalize references, annotate draft link guidance, or
 * restore an existing manuscript when a candidate collides with a stored path.
 * The filesystem work is site-specific; these packets are the reusable
 * producing-content carrier vocabulary for reporting those acts.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const SourceCycleCandidateReferenceNormalizationSchema = Type.Object({
  kind: Type.Literal("producing-content.source-cycle.references"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  changed: Type.Boolean(),
  sourceUrlCount: Type.Number({ minimum: 0 }),
  referenceCount: Type.Number({ minimum: 0 }),
}, {
  $id: "producing-content/content-farm/source-cycle/references",
  title: "SourceCycleCandidateReferenceNormalization",
  additionalProperties: false,
});

export const SourceCycleDraftInternalLinkSuggestionSchema = Type.Object({
  targetSlug: Type.String({ minLength: 1 }),
  targetPath: Type.String({ minLength: 1 }),
  targetHeadline: Type.String({ minLength: 1 }),
  matchedTerms: Type.Array(Type.String()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  markdownLink: Type.String({ minLength: 1 }),
  writingGuidance: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/source-cycle/draft-internal-link-suggestion",
  title: "SourceCycleDraftInternalLinkSuggestion",
  additionalProperties: false,
});

export const SourceCycleCandidateDraftInternalLinkGuidanceSchema = Type.Object({
  kind: Type.Literal("producing-content.source-cycle.draft-internal-link-guidance"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  changed: Type.Boolean(),
  suggestionCount: Type.Number({ minimum: 0 }),
  suggestions: Type.Array(SourceCycleDraftInternalLinkSuggestionSchema),
}, {
  $id: "producing-content/content-farm/source-cycle/draft-internal-link-guidance",
  title: "SourceCycleCandidateDraftInternalLinkGuidance",
  additionalProperties: false,
});

export const SourceCycleCandidateWriteCollisionSchema = Type.Object({
  kind: Type.Literal("producing-content.source-cycle.candidate-write-collision"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  existingDraft: Type.Boolean(),
  existingTitle: Type.Optional(Type.String({ minLength: 1 })),
  runTitle: Type.Optional(Type.String({ minLength: 1 })),
  restored: Type.Boolean(),
  instruction: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/source-cycle/candidate-write-collision",
  title: "SourceCycleCandidateWriteCollision",
  additionalProperties: false,
});

export type SourceCycleCandidateReferenceNormalization = Static<typeof SourceCycleCandidateReferenceNormalizationSchema>;
export type SourceCycleDraftInternalLinkSuggestion = Static<typeof SourceCycleDraftInternalLinkSuggestionSchema>;
export type SourceCycleCandidateDraftInternalLinkGuidance = Static<typeof SourceCycleCandidateDraftInternalLinkGuidanceSchema>;
export type SourceCycleCandidateWriteCollision = Static<typeof SourceCycleCandidateWriteCollisionSchema>;

export const sourceCycleCandidateReferenceNormalizationCarrier = carrierFrom(SourceCycleCandidateReferenceNormalizationSchema);

export const sourceCycleDraftInternalLinkSuggestionCarrier = carrierFrom(SourceCycleDraftInternalLinkSuggestionSchema);

export const sourceCycleCandidateDraftInternalLinkGuidanceCarrier = carrierFrom(SourceCycleCandidateDraftInternalLinkGuidanceSchema);

export const sourceCycleCandidateWriteCollisionCarrier = carrierFrom(SourceCycleCandidateWriteCollisionSchema);

export function sourceCycleCandidateReferenceNormalization(input: Omit<SourceCycleCandidateReferenceNormalization, "kind">): SourceCycleCandidateReferenceNormalization {
  return sourceCycleCandidateReferenceNormalizationCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.references" as const,
  }, "source cycle candidate reference normalization");
}

export function sourceCycleDraftInternalLinkSuggestion(input: Omit<SourceCycleDraftInternalLinkSuggestion, "matchedTerms"> & Readonly<{
  matchedTerms: readonly string[];
}>): SourceCycleDraftInternalLinkSuggestion {
  return sourceCycleDraftInternalLinkSuggestionCarrier.assert({
    ...input,
    matchedTerms: [...input.matchedTerms],
  }, "source cycle draft internal link suggestion");
}

export function sourceCycleCandidateDraftInternalLinkGuidance(input: Omit<SourceCycleCandidateDraftInternalLinkGuidance, "kind" | "suggestionCount" | "suggestions"> & Readonly<{
  suggestions: readonly SourceCycleDraftInternalLinkSuggestion[];
}>): SourceCycleCandidateDraftInternalLinkGuidance {
  return sourceCycleCandidateDraftInternalLinkGuidanceCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.draft-internal-link-guidance" as const,
    suggestionCount: input.suggestions.length,
    suggestions: [...input.suggestions],
  }, "source cycle candidate draft internal link guidance");
}

export function sourceCycleCandidateWriteCollision(input: Omit<SourceCycleCandidateWriteCollision, "kind">): SourceCycleCandidateWriteCollision {
  return sourceCycleCandidateWriteCollisionCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.candidate-write-collision" as const,
  }, "source cycle candidate write collision");
}

export function sourceCycleCandidateReferenceNormalizationTerm(input: SourceCycleCandidateReferenceNormalization): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateReferenceNormalizationCarrier.assert(input), "source cycle candidate reference normalization"));
}

export function sourceCycleCandidateDraftInternalLinkGuidanceTerm(input: SourceCycleCandidateDraftInternalLinkGuidance): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateDraftInternalLinkGuidanceCarrier.assert(input), "source cycle candidate draft internal link guidance"));
}

export function sourceCycleCandidateWriteCollisionTerm(input: SourceCycleCandidateWriteCollision): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateWriteCollisionCarrier.assert(input), "source cycle candidate write collision"));
}
