/**
 * revision-packets - editorial revision backlog carriers.
 *
 * Quality and predication readers may be site-specific, but the operator-facing
 * packet they emit is a producing-content carrier: article identity, support
 * metrics, prioritized repair tasks, and backlog totals.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const ContentQualitySeveritySchema = Type.Union([
  Type.Literal("attention"),
  Type.Literal("warning"),
  Type.Literal("blocker"),
]);

export const ContentRevisionTaskKindSchema = Type.Union([
  Type.Literal("citation-cleanup"),
  Type.Literal("copy-edit"),
  Type.Literal("evidence-settlement"),
  Type.Literal("internal-linking"),
  Type.Literal("reference-enrichment"),
  Type.Literal("seo-revision"),
  Type.Literal("structure"),
]);

export const ContentRevisionTaskSchema = Type.Object({
  kind: ContentRevisionTaskKindSchema,
  severity: ContentQualitySeveritySchema,
  findingCode: Type.String({ minLength: 1 }),
  priority: Type.Number(),
  evidence: Type.String({ minLength: 1 }),
  instruction: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const ContentRevisionPacketSchema = Type.Object({
  kind: Type.Literal("producing-content.revision-packet"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String()),
  score: Type.Number(),
  settlementDepth: Type.Optional(Type.Number()),
  citationCoverage: Type.Optional(Type.Number()),
  internalRelationCoverage: Type.Optional(Type.Number()),
  claimCellCount: Type.Optional(Type.Number()),
  unsupportedClaimCellCount: Type.Optional(Type.Number()),
  taskCount: Type.Number(),
  highestPriority: Type.Number(),
  tasks: Type.Array(ContentRevisionTaskSchema),
}, {
  $id: "producing-content/content-farm/revision-packet",
  title: "ContentRevisionPacket",
  additionalProperties: false,
});

export const ContentRevisionBacklogReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.revision-backlog"),
  articleCount: Type.Number(),
  taskCount: Type.Number(),
  byArticle: Type.Array(ContentRevisionPacketSchema),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/revision-backlog",
  title: "ContentRevisionBacklogReading",
  additionalProperties: false,
});

export type ContentQualitySeverity = Static<typeof ContentQualitySeveritySchema>;
export type ContentRevisionTaskKind = Static<typeof ContentRevisionTaskKindSchema>;
export type ContentRevisionTask = Static<typeof ContentRevisionTaskSchema>;
export type ContentRevisionPacket = Static<typeof ContentRevisionPacketSchema>;
export type ContentRevisionBacklogReading = Static<typeof ContentRevisionBacklogReadingSchema>;

export const contentRevisionTaskCarrier = carrierFrom(ContentRevisionTaskSchema);

export const contentRevisionPacketCarrier = carrierFrom(ContentRevisionPacketSchema);

export const contentRevisionBacklogCarrier = carrierFrom(ContentRevisionBacklogReadingSchema);

export function contentRevisionTask(input: ContentRevisionTask): ContentRevisionTask {
  return contentRevisionTaskCarrier.assert(input, "content revision task");
}

export function contentRevisionPacket(input: Omit<ContentRevisionPacket, "kind" | "taskCount" | "highestPriority"> & Readonly<{
  tasks: readonly ContentRevisionTask[];
}>): ContentRevisionPacket {
  const tasks = [...input.tasks].sort((left, right) => right.priority - left.priority || left.findingCode.localeCompare(right.findingCode));
  return contentRevisionPacketCarrier.assert({
    ...input,
    kind: "producing-content.revision-packet" as const,
    tasks,
    taskCount: tasks.length,
    highestPriority: tasks[0]?.priority ?? 0,
  }, "content revision packet");
}

export function contentRevisionBacklogReading(input: Readonly<{
  byArticle: readonly ContentRevisionPacket[];
  constraints?: readonly string[];
}>): ContentRevisionBacklogReading {
  const byArticle = [...input.byArticle].sort((left, right) =>
    right.highestPriority - left.highestPriority || left.score - right.score || left.headline.localeCompare(right.headline));
  return contentRevisionBacklogCarrier.assert({
    kind: "producing-content.revision-backlog" as const,
    articleCount: byArticle.length,
    taskCount: byArticle.reduce((sum, packet) => sum + packet.taskCount, 0),
    byArticle,
    constraints: [...(input.constraints ?? [
      "Read-only: revision packets do not rewrite copy, create citations, or publish changes without operator action.",
      "Revision packets are editorial support-shape diagnostics, not automatic truth claims.",
    ])],
  }, "content revision backlog");
}

export function contentRevisionPacketTerm(input: ContentRevisionPacket): Tm {
  return carrierToTerm(jsonResource(contentRevisionPacketCarrier.assert(input), "content revision packet"));
}

export function contentRevisionBacklogTerm(input: ContentRevisionBacklogReading): Tm {
  return carrierToTerm(jsonResource(contentRevisionBacklogCarrier.assert(input), "content revision backlog"));
}
