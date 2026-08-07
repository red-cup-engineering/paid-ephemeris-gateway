/**
 * graph - public content topology carriers.
 *
 * Sites own how same-site links are parsed. The mill owns the public topology
 * packet over articles, edges, section buckets, and aggregate graph counts.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const ContentGraphNodeSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String({ minLength: 1 })),
  referenceDomains: Type.Array(Type.String({ minLength: 1 })),
  outboundInternalLinks: Type.Array(Type.String({ minLength: 1 })),
  inboundInternalLinks: Type.Array(Type.String({ minLength: 1 })),
  suggestedInternalTargets: Type.Array(Type.String({ minLength: 1 })),
  graphCentrality: Type.Number({ minimum: 0, maximum: 1 }),
  orphan: Type.Boolean(),
  isolated: Type.Boolean(),
}, {
  $id: "producing-content/content-mill/content-graph-node",
  title: "ContentGraphNode",
  additionalProperties: false,
});

export const ContentGraphEdgeSchema = Type.Object({
  sourceSlug: Type.String({ minLength: 1 }),
  sourcePath: Type.String({ minLength: 1 }),
  sourceHeadline: Type.String({ minLength: 1 }),
  targetSlug: Type.String({ minLength: 1 }),
  targetPath: Type.String({ minLength: 1 }),
  targetHeadline: Type.String({ minLength: 1 }),
  sharedTags: Type.Array(Type.String({ minLength: 1 })),
  sameSection: Type.Boolean(),
  linkCount: Type.Integer({ minimum: 1 }),
}, {
  $id: "producing-content/content-mill/content-graph-edge",
  title: "ContentGraphEdge",
  additionalProperties: false,
});

export const ContentGraphSectionBucketSchema = Type.Object({
  articleCount: Type.Integer({ minimum: 0 }),
  edgeCount: Type.Integer({ minimum: 0 }),
  orphanCount: Type.Integer({ minimum: 0 }),
  isolatedCount: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/content-graph-section-bucket",
  title: "ContentGraphSectionBucket",
  additionalProperties: false,
});

export const ContentGraphReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.content-graph-reading"),
  publicArticleCount: Type.Integer({ minimum: 0 }),
  edgeCount: Type.Integer({ minimum: 0 }),
  orphanCount: Type.Integer({ minimum: 0 }),
  isolatedCount: Type.Integer({ minimum: 0 }),
  averageOutDegree: Type.Number({ minimum: 0 }),
  averageInDegree: Type.Number({ minimum: 0 }),
  byArticle: Type.Array(ContentGraphNodeSchema),
  edges: Type.Array(ContentGraphEdgeSchema),
  bySection: Type.Record(Type.String(), ContentGraphSectionBucketSchema),
  constraints: Type.Array(Type.String({ minLength: 1 })),
  plannedUses: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/content-graph-reading",
  title: "ContentGraphReading",
  additionalProperties: false,
});

export type ContentGraphNode = Static<typeof ContentGraphNodeSchema>;
export type ContentGraphEdge = Static<typeof ContentGraphEdgeSchema>;
export type ContentGraphSectionBucket = Static<typeof ContentGraphSectionBucketSchema>;
export type ContentGraphReading = Static<typeof ContentGraphReadingSchema>;

export const CONTENT_GRAPH_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown links, public taxonomy, and CSL reference domains only.",
  "Same-site links are topology and editorial context, not factual references.",
  "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
]);

export const CONTENT_GRAPH_PLANNED_USES = Object.freeze([
  "Find isolated and orphaned public articles before promotion.",
  "Prioritize warranted internal-link work by section and topic.",
  "Support richer topic clusters, section pages, and revision assignments without user tracking.",
]);

export const contentGraphNodeCarrier = carrierFrom(ContentGraphNodeSchema);

export const contentGraphEdgeCarrier = carrierFrom(ContentGraphEdgeSchema);

export const contentGraphSectionBucketCarrier = carrierFrom(ContentGraphSectionBucketSchema);

export const contentGraphReadingCarrier = carrierFrom(ContentGraphReadingSchema);

export function contentGraphNode(input: Omit<ContentGraphNode,
  "tags" | "referenceDomains" | "outboundInternalLinks" | "inboundInternalLinks" | "suggestedInternalTargets"
> & Readonly<{
  tags: readonly string[];
  referenceDomains: readonly string[];
  outboundInternalLinks: readonly string[];
  inboundInternalLinks: readonly string[];
  suggestedInternalTargets: readonly string[];
}>): ContentGraphNode {
  return contentGraphNodeCarrier.assert({
    ...input,
    tags: [...input.tags],
    referenceDomains: [...input.referenceDomains],
    outboundInternalLinks: [...input.outboundInternalLinks],
    inboundInternalLinks: [...input.inboundInternalLinks],
    suggestedInternalTargets: [...input.suggestedInternalTargets],
  }, "content graph node");
}

export function contentGraphEdge(input: Omit<ContentGraphEdge, "sharedTags"> & Readonly<{
  sharedTags: readonly string[];
}>): ContentGraphEdge {
  return contentGraphEdgeCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
  }, "content graph edge");
}

export function contentGraphSectionBucket(input: ContentGraphSectionBucket): ContentGraphSectionBucket {
  return contentGraphSectionBucketCarrier.assert(input, "content graph section bucket");
}

function sortedSectionBuckets(input: Readonly<Record<string, ContentGraphSectionBucket>>): Readonly<Record<string, ContentGraphSectionBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([section, bucket]) => [section, contentGraphSectionBucket(bucket)])));
}

export function contentGraphReading(input: Readonly<{
  nodes: readonly ContentGraphNode[];
  edges: readonly ContentGraphEdge[];
  bySection: Readonly<Record<string, ContentGraphSectionBucket>>;
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentGraphReading {
  const nodes = [...input.nodes].map((node) => contentGraphNode(node))
    .sort((left, right) => Number(right.isolated) - Number(left.isolated) || Number(right.orphan) - Number(left.orphan) || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  const edges = [...input.edges].map((edge) => contentGraphEdge(edge))
    .sort((left, right) => left.sourceHeadline.localeCompare(right.sourceHeadline) || left.targetHeadline.localeCompare(right.targetHeadline));
  return contentGraphReadingCarrier.assert({
    kind: "producing-content.content-graph-reading" as const,
    publicArticleCount: nodes.length,
    edgeCount: edges.length,
    orphanCount: nodes.filter((node) => node.orphan).length,
    isolatedCount: nodes.filter((node) => node.isolated).length,
    averageOutDegree: nodes.length === 0 ? 0 : Math.round((edges.length / nodes.length) * 100) / 100,
    averageInDegree: nodes.length === 0 ? 0 : Math.round((edges.length / nodes.length) * 100) / 100,
    byArticle: nodes,
    edges,
    bySection: sortedSectionBuckets(input.bySection),
    constraints: [...(input.constraints ?? CONTENT_GRAPH_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_GRAPH_PLANNED_USES)],
  }, "content graph reading");
}

export function contentGraphNodeTerm(input: ContentGraphNode): Tm {
  return carrierToTerm(jsonResource(contentGraphNodeCarrier.assert(input), "content graph node"));
}

export function contentGraphReadingTerm(input: ContentGraphReading): Tm {
  return carrierToTerm(jsonResource(contentGraphReadingCarrier.assert(input), "content graph reading"));
}
