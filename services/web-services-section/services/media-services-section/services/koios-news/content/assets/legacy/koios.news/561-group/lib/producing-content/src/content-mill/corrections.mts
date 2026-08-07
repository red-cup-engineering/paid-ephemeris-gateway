/**
 * corrections - publication correction register carriers.
 *
 * A site owns how it records corrections in local metadata. The mill owns the
 * public accountability packet: correction records, register readings, coverage
 * readings, and validation findings.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const CorrectionKindSchema = Type.Union([
  Type.Literal("correction"),
  Type.Literal("clarification"),
  Type.Literal("update"),
  Type.Literal("retraction"),
]);

export const CorrectionRecordSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  kind: CorrectionKindSchema,
  articleSlug: Type.String({ minLength: 1 }),
  articlePath: Type.String({ minLength: 1 }),
  articleHeadline: Type.String({ minLength: 1 }),
  correctedAt: Type.String({ minLength: 1 }),
  summary: Type.String({ minLength: 1 }),
  details: Type.Optional(Type.String({ minLength: 1 })),
  affectedSurfaces: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/correction-record",
  title: "CorrectionRecord",
  additionalProperties: false,
});

export const CorrectionRegisterReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.correction-register"),
  correctionCount: Type.Number({ minimum: 0 }),
  articleCount: Type.Number({ minimum: 0 }),
  policy: Type.Array(Type.String()),
  corrections: Type.Array(CorrectionRecordSchema),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-mill/correction-register",
  title: "CorrectionRegisterReading",
  additionalProperties: false,
});

export const CorrectionValidationFindingSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-mill/correction-validation-finding",
  title: "CorrectionValidationFinding",
  additionalProperties: false,
});

export const CorrectionCoverageReadingSchema = Type.Object({
  correctionCount: Type.Number({ minimum: 0 }),
  explicitSurfaceCount: Type.Number({ minimum: 0 }),
  implicitSurfaceCount: Type.Number({ minimum: 0 }),
  incompleteSurfaceCount: Type.Number({ minimum: 0 }),
  missingSurfaces: Type.Array(Type.String()),
  coverage: Type.Number({ minimum: 0, maximum: 1 }),
}, {
  $id: "producing-content/content-mill/correction-coverage",
  title: "CorrectionCoverageReading",
  additionalProperties: false,
});

export type CorrectionKind = Static<typeof CorrectionKindSchema>;
export type CorrectionRecord = Static<typeof CorrectionRecordSchema>;
export type CorrectionRegisterReading = Static<typeof CorrectionRegisterReadingSchema>;
export type CorrectionValidationFinding = Static<typeof CorrectionValidationFindingSchema>;
export type CorrectionCoverageReading = Static<typeof CorrectionCoverageReadingSchema>;

export const DEFAULT_CORRECTION_AFFECTED_SURFACES = Object.freeze([
  "article",
  "feeds",
  "sitemaps",
  "json-ld",
  "social-card",
  "syndication",
]);

export const CORRECTION_POLICY = Object.freeze([
  "Corrections, clarifications, material updates, and retractions belong to the article record and are folded into the public correction register.",
  "A correction must state what changed, when it was corrected, and which publication surfaces require propagation.",
  "Correction propagation should include body copy, headlines when needed, article metadata, social cards, feeds, sitemaps, JSON-LD, and syndication packets.",
]);

export const correctionRecordCarrier = carrierFrom(CorrectionRecordSchema);

export const correctionRegisterReadingCarrier = carrierFrom(CorrectionRegisterReadingSchema);

export const correctionValidationFindingCarrier = carrierFrom(CorrectionValidationFindingSchema);

export const correctionCoverageReadingCarrier = carrierFrom(CorrectionCoverageReadingSchema);

export function correctionRecord(input: Omit<CorrectionRecord, "affectedSurfaces"> & Readonly<{
  affectedSurfaces: readonly string[];
}>): CorrectionRecord {
  return correctionRecordCarrier.assert({
    ...input,
    affectedSurfaces: [...input.affectedSurfaces],
  }, "correction record");
}

export function correctionRegisterReading(input: Readonly<{
  corrections: readonly CorrectionRecord[];
  policy?: readonly string[];
  constraints?: readonly string[];
}>): CorrectionRegisterReading {
  const corrections = [...input.corrections];
  return correctionRegisterReadingCarrier.assert({
    kind: "producing-content.correction-register" as const,
    correctionCount: corrections.length,
    articleCount: new Set(corrections.map((correction) => correction.articleSlug)).size,
    policy: [...(input.policy ?? CORRECTION_POLICY)],
    corrections,
    constraints: [...(input.constraints ?? [
      "Generated from public article metadata only.",
      "The register records publication accountability, not reader behavior.",
    ])],
  }, "correction register reading");
}

export function correctionValidationFinding(input: CorrectionValidationFinding): CorrectionValidationFinding {
  return correctionValidationFindingCarrier.assert(input, "correction validation finding");
}

export function correctionCoverageReading(input: Omit<CorrectionCoverageReading, "missingSurfaces"> & Readonly<{
  missingSurfaces: readonly string[];
}>): CorrectionCoverageReading {
  return correctionCoverageReadingCarrier.assert({
    ...input,
    missingSurfaces: [...input.missingSurfaces],
  }, "correction coverage reading");
}

export function correctionRecordTerm(input: CorrectionRecord): Tm {
  return carrierToTerm(jsonResource(correctionRecordCarrier.assert(input), "correction record"));
}

export function correctionRegisterReadingTerm(input: CorrectionRegisterReading): Tm {
  return carrierToTerm(jsonResource(correctionRegisterReadingCarrier.assert(input), "correction register reading"));
}

export function correctionCoverageReadingTerm(input: CorrectionCoverageReading): Tm {
  return carrierToTerm(jsonResource(correctionCoverageReadingCarrier.assert(input), "correction coverage reading"));
}
