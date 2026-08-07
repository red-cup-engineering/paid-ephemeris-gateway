/**
 * quality - privacy-preserving content-quality carriers.
 *
 * Sites own their article parsing and diagnostic heuristics. The mill owns the
 * article-quality packet and the aggregate reading over public article quality.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";
import { ContentQualitySeveritySchema } from "../content-farm/revision-packets.mjs";

export const ContentQualityFindingSchema = Type.Object({
  severity: ContentQualitySeveritySchema,
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-mill/content-quality-finding",
  title: "ContentQualityFinding",
  additionalProperties: false,
});

export const ArticleContentQualitySchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String({ minLength: 1 })),
  score: Type.Number({ minimum: 0, maximum: 100 }),
  wordCount: Type.Integer({ minimum: 0 }),
  h2Count: Type.Integer({ minimum: 0 }),
  internalLinkCount: Type.Integer({ minimum: 0 }),
  internalLinkTargets: Type.Array(Type.String({ minLength: 1 })),
  suggestedInternalTargets: Type.Array(Type.String({ minLength: 1 })),
  externalLinkCount: Type.Integer({ minimum: 0 }),
  referenceCount: Type.Integer({ minimum: 0 }),
  citedReferenceCount: Type.Integer({ minimum: 0 }),
  referenceDomainCount: Type.Integer({ minimum: 0 }),
  citationDomainDiversity: Type.Number({ minimum: 0, maximum: 1 }),
  seoTerm: Type.Optional(Type.String({ minLength: 1 })),
  seoTermOccurrences: Type.Integer({ minimum: 0 }),
  seoTermDensity: Type.Number({ minimum: 0 }),
  seoTermInFirstParagraph: Type.Boolean(),
  seoTermInH2: Type.Boolean(),
  topicDepth: Type.Number({ minimum: 0, maximum: 1 }),
  malformedH2Count: Type.Integer({ minimum: 0 }),
  headlineSummaryOverlap: Type.Number({ minimum: 0, maximum: 1 }),
  correctionCount: Type.Integer({ minimum: 0 }),
  correctionSurfaceCoverage: Type.Number({ minimum: 0, maximum: 1 }),
  implicitCorrectionSurfaceCount: Type.Integer({ minimum: 0 }),
  incompleteCorrectionSurfaceCount: Type.Integer({ minimum: 0 }),
  missingCorrectionSurfaces: Type.Array(Type.String({ minLength: 1 })),
  findings: Type.Array(ContentQualityFindingSchema),
}, {
  $id: "producing-content/content-mill/article-content-quality",
  title: "ArticleContentQuality",
  additionalProperties: false,
});

export const ContentQualityAggregateSchema = Type.Object({
  articlesWithNoInternalLinks: Type.Integer({ minimum: 0 }),
  articlesWithThinReferences: Type.Integer({ minimum: 0 }),
  articlesWithSingleReferenceDomain: Type.Integer({ minimum: 0 }),
  articlesMissingSeoPlacement: Type.Integer({ minimum: 0 }),
  articlesWithSeoTermStuffing: Type.Integer({ minimum: 0 }),
  articlesWithThinTopicDepth: Type.Integer({ minimum: 0 }),
  articlesWithMalformedH2: Type.Integer({ minimum: 0 }),
  articlesWithCorrections: Type.Integer({ minimum: 0 }),
  articlesWithImplicitCorrectionSurfaces: Type.Integer({ minimum: 0 }),
  articlesWithIncompleteCorrectionSurfaces: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/content-quality-aggregate",
  title: "ContentQualityAggregate",
  additionalProperties: false,
});

export const ContentQualityReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.content-quality-reading"),
  publicArticleCount: Type.Integer({ minimum: 0 }),
  averageScore: Type.Number({ minimum: 0, maximum: 100 }),
  attentionCount: Type.Integer({ minimum: 0 }),
  warningCount: Type.Integer({ minimum: 0 }),
  blockerCount: Type.Integer({ minimum: 0 }),
  byArticle: Type.Array(ArticleContentQualitySchema),
  aggregate: ContentQualityAggregateSchema,
  constraints: Type.Array(Type.String({ minLength: 1 })),
  plannedUses: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/content-quality-reading",
  title: "ContentQualityReading",
  additionalProperties: false,
});

export type ContentQualityFinding = Static<typeof ContentQualityFindingSchema>;
export type ArticleContentQuality = Static<typeof ArticleContentQualitySchema>;
export type ContentQualityAggregate = Static<typeof ContentQualityAggregateSchema>;
export type ContentQualityReading = Static<typeof ContentQualityReadingSchema>;

export const CONTENT_QUALITY_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown, frontmatter, CSL references, taxonomy, and same-site link topology only.",
  "No page views, IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are used by this quality reading.",
  "This is an editorial diagnostic, not a publication gate; standards review remains the publication gate.",
]);

export const CONTENT_QUALITY_PLANNED_USES = Object.freeze([
  "Prioritize internal-link enrichment work.",
  "Find articles with thin or concentrated reference support.",
  "Check whether headlines, summaries, SEO terms, and body structure preserve the article warrant.",
  "Track correction propagation coverage without using visitor data.",
  "Give human operators and agents a privacy-preserving content-quality backlog.",
]);

export const contentQualityFindingCarrier = carrierFrom(ContentQualityFindingSchema);

export const articleContentQualityCarrier = carrierFrom(ArticleContentQualitySchema);

export const contentQualityAggregateCarrier = carrierFrom(ContentQualityAggregateSchema);

export const contentQualityReadingCarrier = carrierFrom(ContentQualityReadingSchema);

export function contentQualityFinding(input: ContentQualityFinding): ContentQualityFinding {
  return contentQualityFindingCarrier.assert(input, "content quality finding");
}

export function articleContentQuality(input: Omit<ArticleContentQuality,
  "tags" | "internalLinkTargets" | "suggestedInternalTargets" | "missingCorrectionSurfaces" | "findings"
> & Readonly<{
  tags: readonly string[];
  internalLinkTargets: readonly string[];
  suggestedInternalTargets: readonly string[];
  missingCorrectionSurfaces: readonly string[];
  findings: readonly ContentQualityFinding[];
}>): ArticleContentQuality {
  return articleContentQualityCarrier.assert({
    ...input,
    tags: [...input.tags],
    internalLinkTargets: [...input.internalLinkTargets],
    suggestedInternalTargets: [...input.suggestedInternalTargets],
    missingCorrectionSurfaces: [...input.missingCorrectionSurfaces],
    findings: input.findings.map((finding) => contentQualityFinding(finding)),
  }, "article content quality");
}

export function contentQualityAggregate(articles: readonly ArticleContentQuality[]): ContentQualityAggregate {
  return contentQualityAggregateCarrier.assert({
    articlesWithNoInternalLinks: articles.filter((article) => article.internalLinkCount === 0).length,
    articlesWithThinReferences: articles.filter((article) => article.referenceCount < 2).length,
    articlesWithSingleReferenceDomain: articles.filter((article) => article.referenceCount >= 3 && article.referenceDomainCount <= 1).length,
    articlesMissingSeoPlacement: articles.filter((article) => !article.seoTermInFirstParagraph || !article.seoTermInH2).length,
    articlesWithSeoTermStuffing: articles.filter((article) => article.seoTermDensity > 1.25 || article.seoTermOccurrences > 8).length,
    articlesWithThinTopicDepth: articles.filter((article) => article.topicDepth < 0.5).length,
    articlesWithMalformedH2: articles.filter((article) => article.malformedH2Count > 0).length,
    articlesWithCorrections: articles.filter((article) => article.correctionCount > 0).length,
    articlesWithImplicitCorrectionSurfaces: articles.filter((article) => article.implicitCorrectionSurfaceCount > 0).length,
    articlesWithIncompleteCorrectionSurfaces: articles.filter((article) => article.incompleteCorrectionSurfaceCount > 0).length,
  }, "content quality aggregate");
}

export function contentQualityReading(input: Readonly<{
  articles: readonly ArticleContentQuality[];
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentQualityReading {
  const articles = [...input.articles].map((article) => articleContentQuality(article))
    .sort((left, right) => left.score - right.score || left.headline.localeCompare(right.headline));
  return contentQualityReadingCarrier.assert({
    kind: "producing-content.content-quality-reading" as const,
    publicArticleCount: articles.length,
    averageScore: articles.length === 0 ? 0 : Math.round((articles.reduce((sum, article) => sum + article.score, 0) / articles.length) * 100) / 100,
    attentionCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "attention").length, 0),
    warningCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "warning").length, 0),
    blockerCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "blocker").length, 0),
    byArticle: articles,
    aggregate: contentQualityAggregate(articles),
    constraints: [...(input.constraints ?? CONTENT_QUALITY_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_QUALITY_PLANNED_USES)],
  }, "content quality reading");
}

export function articleContentQualityTerm(input: ArticleContentQuality): Tm {
  return carrierToTerm(jsonResource(articleContentQualityCarrier.assert(input), "article content quality"));
}

export function contentQualityReadingTerm(input: ContentQualityReading): Tm {
  return carrierToTerm(jsonResource(contentQualityReadingCarrier.assert(input), "content quality reading"));
}
