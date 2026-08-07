/**
 * predication - editorial support-shape carriers.
 *
 * Sites own paragraph parsing and claim heuristics. The mill owns the
 * predication packet that records support, same-site relations, settlement,
 * and graph centrality without reader tracking.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";
import { ContentQualityFindingSchema, contentQualityFinding, type ContentQualityFinding } from "./quality.mjs";

export const PredicationCellKindSchema = Type.Union([
  Type.Literal("claim"),
  Type.Literal("evidence"),
  Type.Literal("same-site-relation"),
  Type.Literal("unsupported"),
  Type.Literal("structure"),
]);

export const ArticlePredicationCellSchema = Type.Object({
  kind: PredicationCellKindSchema,
  paragraphIndex: Type.Integer({ minimum: 0 }),
  heading: Type.Optional(Type.String({ minLength: 1 })),
  textPreview: Type.String({ minLength: 1 }),
  citedReferenceIds: Type.Array(Type.String({ minLength: 1 })),
  internalTargets: Type.Array(Type.String({ minLength: 1 })),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
}, {
  $id: "producing-content/content-mill/article-predication-cell",
  title: "ArticlePredicationCell",
  additionalProperties: false,
});

export const ArticlePredicationMetricsSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String({ minLength: 1 })),
  paragraphCount: Type.Integer({ minimum: 0 }),
  claimCellCount: Type.Integer({ minimum: 0 }),
  evidenceCellCount: Type.Integer({ minimum: 0 }),
  sameSiteRelationCellCount: Type.Integer({ minimum: 0 }),
  unsupportedClaimCellCount: Type.Integer({ minimum: 0 }),
  headingCellCount: Type.Integer({ minimum: 0 }),
  citationCoverage: Type.Number({ minimum: 0, maximum: 1 }),
  internalRelationCoverage: Type.Number({ minimum: 0, maximum: 1 }),
  settlementDepth: Type.Number({ minimum: 0, maximum: 1 }),
  graphCentrality: Type.Number({ minimum: 0, maximum: 1 }),
  freshnessDays: Type.Optional(Type.Integer({ minimum: 0 })),
  findings: Type.Array(ContentQualityFindingSchema),
  cells: Type.Array(ArticlePredicationCellSchema),
}, {
  $id: "producing-content/content-mill/article-predication-metrics",
  title: "ArticlePredicationMetrics",
  additionalProperties: false,
});

export const ContentPredicationAggregateSchema = Type.Object({
  claimCells: Type.Integer({ minimum: 0 }),
  evidenceCells: Type.Integer({ minimum: 0 }),
  sameSiteRelationCells: Type.Integer({ minimum: 0 }),
  unsupportedClaimCells: Type.Integer({ minimum: 0 }),
  averageCitationCoverage: Type.Number({ minimum: 0, maximum: 1 }),
  averageInternalRelationCoverage: Type.Number({ minimum: 0, maximum: 1 }),
  averageSettlementDepth: Type.Number({ minimum: 0, maximum: 1 }),
  averageGraphCentrality: Type.Number({ minimum: 0, maximum: 1 }),
  articlesWithUnsupportedClaims: Type.Integer({ minimum: 0 }),
  articlesWithNoEvidenceCells: Type.Integer({ minimum: 0 }),
  articlesWithNoRelationCells: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/content-predication-aggregate",
  title: "ContentPredicationAggregate",
  additionalProperties: false,
});

export const ContentPredicationReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.content-predication-reading"),
  publicArticleCount: Type.Integer({ minimum: 0 }),
  aggregate: ContentPredicationAggregateSchema,
  byArticle: Type.Array(ArticlePredicationMetricsSchema),
  constraints: Type.Array(Type.String({ minLength: 1 })),
  plannedUses: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/content-predication-reading",
  title: "ContentPredicationReading",
  additionalProperties: false,
});

export type PredicationCellKind = Static<typeof PredicationCellKindSchema>;
export type ArticlePredicationCell = Static<typeof ArticlePredicationCellSchema>;
export type ArticlePredicationMetrics = Static<typeof ArticlePredicationMetricsSchema>;
export type ContentPredicationAggregate = Static<typeof ContentPredicationAggregateSchema>;
export type ContentPredicationReading = Static<typeof ContentPredicationReadingSchema>;

export const CONTENT_PREDICATION_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown, CSL references, and same-site article links only.",
  "This is an editorial predication diagnostic: it estimates support and relation shape, not truth.",
  "Sources and references remain ontologically separate; only CSL references and body citations count as publication evidence.",
  "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
]);

export const CONTENT_PREDICATION_PLANNED_USES = Object.freeze([
  "Find articles whose claim-like paragraphs need stronger inline reference support.",
  "Find isolated articles that should be related to existing coverage where the local paragraph warrants it.",
  "Track settlement depth, graph centrality, and freshness as internal editorial metrics.",
  "Give future autonomous research, writing, editing, and publishing stages a shared content-quality carrier.",
]);

export const articlePredicationCellCarrier = carrierFrom(ArticlePredicationCellSchema);

export const articlePredicationMetricsCarrier = carrierFrom(ArticlePredicationMetricsSchema);

export const contentPredicationAggregateCarrier = carrierFrom(ContentPredicationAggregateSchema);

export const contentPredicationReadingCarrier = carrierFrom(ContentPredicationReadingSchema);

export function articlePredicationCell(input: Omit<ArticlePredicationCell, "citedReferenceIds" | "internalTargets"> & Readonly<{
  citedReferenceIds: readonly string[];
  internalTargets: readonly string[];
}>): ArticlePredicationCell {
  return articlePredicationCellCarrier.assert({
    ...input,
    citedReferenceIds: [...input.citedReferenceIds],
    internalTargets: [...input.internalTargets],
  }, "article predication cell");
}

export function articlePredicationMetrics(input: Omit<ArticlePredicationMetrics, "tags" | "findings" | "cells"> & Readonly<{
  tags: readonly string[];
  findings: readonly ContentQualityFinding[];
  cells: readonly ArticlePredicationCell[];
}>): ArticlePredicationMetrics {
  return articlePredicationMetricsCarrier.assert({
    ...input,
    tags: [...input.tags],
    findings: input.findings.map((finding) => contentQualityFinding(finding)),
    cells: input.cells.map((cell) => articlePredicationCell(cell)),
  }, "article predication metrics");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(articles: readonly ArticlePredicationMetrics[], field: "citationCoverage" | "internalRelationCoverage" | "settlementDepth" | "graphCentrality"): number {
  return articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article[field], 0) / articles.length);
}

export function contentPredicationAggregate(articles: readonly ArticlePredicationMetrics[]): ContentPredicationAggregate {
  return contentPredicationAggregateCarrier.assert({
    claimCells: articles.reduce((sum, article) => sum + article.claimCellCount, 0),
    evidenceCells: articles.reduce((sum, article) => sum + article.evidenceCellCount, 0),
    sameSiteRelationCells: articles.reduce((sum, article) => sum + article.sameSiteRelationCellCount, 0),
    unsupportedClaimCells: articles.reduce((sum, article) => sum + article.unsupportedClaimCellCount, 0),
    averageCitationCoverage: average(articles, "citationCoverage"),
    averageInternalRelationCoverage: average(articles, "internalRelationCoverage"),
    averageSettlementDepth: average(articles, "settlementDepth"),
    averageGraphCentrality: average(articles, "graphCentrality"),
    articlesWithUnsupportedClaims: articles.filter((article) => article.unsupportedClaimCellCount > 0).length,
    articlesWithNoEvidenceCells: articles.filter((article) => article.evidenceCellCount === 0 && article.claimCellCount > 0).length,
    articlesWithNoRelationCells: articles.filter((article) => article.sameSiteRelationCellCount === 0 && article.claimCellCount > 0).length,
  }, "content predication aggregate");
}

export function contentPredicationReading(input: Readonly<{
  articles: readonly ArticlePredicationMetrics[];
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentPredicationReading {
  const articles = [...input.articles].map((article) => articlePredicationMetrics(article))
    .sort((left, right) => left.settlementDepth - right.settlementDepth || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  return contentPredicationReadingCarrier.assert({
    kind: "producing-content.content-predication-reading" as const,
    publicArticleCount: articles.length,
    aggregate: contentPredicationAggregate(articles),
    byArticle: articles,
    constraints: [...(input.constraints ?? CONTENT_PREDICATION_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_PREDICATION_PLANNED_USES)],
  }, "content predication reading");
}

export function articlePredicationMetricsTerm(input: ArticlePredicationMetrics): Tm {
  return carrierToTerm(jsonResource(articlePredicationMetricsCarrier.assert(input), "article predication metrics"));
}

export function contentPredicationReadingTerm(input: ContentPredicationReading): Tm {
  return carrierToTerm(jsonResource(contentPredicationReadingCarrier.assert(input), "content predication reading"));
}
