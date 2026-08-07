/**
 * standards-packets - editorial standards review and manuscript action packets.
 *
 * Sites own their actual standards gates and manuscript mutations. The farm
 * owns the reusable packets that report those editorial actions to operators
 * and agents.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const StandardsSeveritySchema = Type.Union([
  Type.Literal("error"),
  Type.Literal("warning"),
]);

export const StandardsGateSchema = Type.Union([
  Type.Literal("reported"),
  Type.Literal("fact-checked"),
  Type.Literal("copy-edited"),
  Type.Literal("standards-cleared"),
  Type.Literal("published"),
]);

export const StandardsFindingSchema = Type.Object({
  severity: StandardsSeveritySchema,
  gate: StandardsGateSchema,
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const StandardsReviewSchema = Type.Object({
  kind: Type.Literal("producing-content.standards-review"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  publishable: Type.Boolean(),
  draft: Type.Boolean(),
  wordCount: Type.Number({ minimum: 0 }),
  referenceCount: Type.Number({ minimum: 0 }),
  seoTerm: Type.Optional(Type.String({ minLength: 1 })),
  findings: Type.Array(StandardsFindingSchema),
}, {
  $id: "producing-content/content-farm/standards-review",
  title: "StandardsReview",
  additionalProperties: false,
});

export const PublishManuscriptResultSchema = Type.Object({
  kind: Type.Literal("producing-content.manuscript.published"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  draft: Type.Literal(false),
  review: StandardsReviewSchema,
}, {
  $id: "producing-content/content-farm/manuscript/published",
  title: "PublishManuscriptResult",
  additionalProperties: false,
});

export const ApplyStandardsDefaultsResultSchema = Type.Object({
  kind: Type.Literal("producing-content.standards-defaults.applied"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  changed: Type.Array(Type.String()),
  review: StandardsReviewSchema,
}, {
  $id: "producing-content/content-farm/standards-defaults/applied",
  title: "ApplyStandardsDefaultsResult",
  additionalProperties: false,
});

export const NormalizeManuscriptReferencesResultSchema = Type.Object({
  kind: Type.Literal("producing-content.manuscript.references.normalized"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  changed: Type.Array(Type.String()),
  sourceUrlCount: Type.Number({ minimum: 0 }),
  referenceCount: Type.Number({ minimum: 0 }),
  review: StandardsReviewSchema,
}, {
  $id: "producing-content/content-farm/manuscript/references-normalized",
  title: "NormalizeManuscriptReferencesResult",
  additionalProperties: false,
});

export const RepairManuscriptHeadingChangeSchema = Type.Object({
  before: Type.String({ minLength: 1 }),
  heading: Type.String({ minLength: 1 }),
  paragraph: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const RepairManuscriptHeadingsResultSchema = Type.Object({
  kind: Type.Literal("producing-content.manuscript.headings.repaired"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  changed: Type.Array(RepairManuscriptHeadingChangeSchema),
  review: StandardsReviewSchema,
}, {
  $id: "producing-content/content-farm/manuscript/headings-repaired",
  title: "RepairManuscriptHeadingsResult",
  additionalProperties: false,
});

export const RepairManuscriptSeoHeadingChangeSchema = Type.Object({
  before: Type.String({ minLength: 1 }),
  heading: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const RepairManuscriptSeoHeadingResultSchema = Type.Object({
  kind: Type.Literal("producing-content.manuscript.seo-heading.repaired"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  seoTerm: Type.Optional(Type.String({ minLength: 1 })),
  changed: Type.Array(RepairManuscriptSeoHeadingChangeSchema),
  review: StandardsReviewSchema,
}, {
  $id: "producing-content/content-farm/manuscript/seo-heading-repaired",
  title: "RepairManuscriptSeoHeadingResult",
  additionalProperties: false,
});

export type StandardsSeverity = Static<typeof StandardsSeveritySchema>;
export type StandardsGate = Static<typeof StandardsGateSchema>;
export type StandardsFinding = Static<typeof StandardsFindingSchema>;
export type StandardsReview = Static<typeof StandardsReviewSchema>;
export type PublishManuscriptResult = Static<typeof PublishManuscriptResultSchema>;
export type ApplyStandardsDefaultsResult = Static<typeof ApplyStandardsDefaultsResultSchema>;
export type NormalizeManuscriptReferencesResult = Static<typeof NormalizeManuscriptReferencesResultSchema>;
export type RepairManuscriptHeadingChange = Static<typeof RepairManuscriptHeadingChangeSchema>;
export type RepairManuscriptHeadingsResult = Static<typeof RepairManuscriptHeadingsResultSchema>;
export type RepairManuscriptSeoHeadingChange = Static<typeof RepairManuscriptSeoHeadingChangeSchema>;
export type RepairManuscriptSeoHeadingResult = Static<typeof RepairManuscriptSeoHeadingResultSchema>;

export const standardsReviewCarrier = carrierFrom(StandardsReviewSchema);

export const publishManuscriptResultCarrier = carrierFrom(PublishManuscriptResultSchema);

export const applyStandardsDefaultsResultCarrier = carrierFrom(ApplyStandardsDefaultsResultSchema);

export const normalizeManuscriptReferencesResultCarrier = carrierFrom(NormalizeManuscriptReferencesResultSchema);

export const repairManuscriptHeadingsResultCarrier = carrierFrom(RepairManuscriptHeadingsResultSchema);

export const repairManuscriptSeoHeadingResultCarrier = carrierFrom(RepairManuscriptSeoHeadingResultSchema);

function reviewValue(input: Omit<StandardsReview, "kind" | "findings"> & Readonly<{
  findings: readonly StandardsFinding[];
}>): StandardsReview {
  return standardsReviewCarrier.assert({
    ...input,
    kind: "producing-content.standards-review" as const,
    findings: [...input.findings],
  }, "standards review");
}

export function standardsReview(input: Omit<StandardsReview, "kind" | "findings"> & Readonly<{
  findings: readonly StandardsFinding[];
}>): StandardsReview {
  return reviewValue(input);
}

export function publishManuscriptResult(input: Omit<PublishManuscriptResult, "kind" | "draft">): PublishManuscriptResult {
  return publishManuscriptResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.published" as const,
    draft: false as const,
  }, "published manuscript result");
}

export function applyStandardsDefaultsResult(input: Omit<ApplyStandardsDefaultsResult, "kind" | "changed"> & Readonly<{
  changed: readonly string[];
}>): ApplyStandardsDefaultsResult {
  return applyStandardsDefaultsResultCarrier.assert({
    ...input,
    kind: "producing-content.standards-defaults.applied" as const,
    changed: [...input.changed],
  }, "applied standards defaults result");
}

export function normalizeManuscriptReferencesResult(input: Omit<NormalizeManuscriptReferencesResult, "kind" | "changed"> & Readonly<{
  changed: readonly string[];
}>): NormalizeManuscriptReferencesResult {
  return normalizeManuscriptReferencesResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.references.normalized" as const,
    changed: [...input.changed],
  }, "normalized manuscript references result");
}

export function repairManuscriptHeadingsResult(input: Omit<RepairManuscriptHeadingsResult, "kind" | "changed"> & Readonly<{
  changed: readonly RepairManuscriptHeadingChange[];
}>): RepairManuscriptHeadingsResult {
  return repairManuscriptHeadingsResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.headings.repaired" as const,
    changed: [...input.changed],
  }, "repaired manuscript headings result");
}

export function repairManuscriptSeoHeadingResult(input: Omit<RepairManuscriptSeoHeadingResult, "kind" | "changed"> & Readonly<{
  changed: readonly RepairManuscriptSeoHeadingChange[];
}>): RepairManuscriptSeoHeadingResult {
  return repairManuscriptSeoHeadingResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.seo-heading.repaired" as const,
    changed: [...input.changed],
  }, "repaired manuscript seo heading result");
}

export function standardsReviewTerm(input: StandardsReview): Tm {
  return carrierToTerm(jsonResource(standardsReviewCarrier.assert(input), "standards review"));
}

export function publishManuscriptResultTerm(input: PublishManuscriptResult): Tm {
  return carrierToTerm(jsonResource(publishManuscriptResultCarrier.assert(input), "published manuscript result"));
}

export function applyStandardsDefaultsResultTerm(input: ApplyStandardsDefaultsResult): Tm {
  return carrierToTerm(jsonResource(applyStandardsDefaultsResultCarrier.assert(input), "applied standards defaults result"));
}

export function normalizeManuscriptReferencesResultTerm(input: NormalizeManuscriptReferencesResult): Tm {
  return carrierToTerm(jsonResource(normalizeManuscriptReferencesResultCarrier.assert(input), "normalized manuscript references result"));
}

export function repairManuscriptHeadingsResultTerm(input: RepairManuscriptHeadingsResult): Tm {
  return carrierToTerm(jsonResource(repairManuscriptHeadingsResultCarrier.assert(input), "repaired manuscript headings result"));
}

export function repairManuscriptSeoHeadingResultTerm(input: RepairManuscriptSeoHeadingResult): Tm {
  return carrierToTerm(jsonResource(repairManuscriptSeoHeadingResultCarrier.assert(input), "repaired manuscript seo heading result"));
}
