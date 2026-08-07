/**
 * performance - privacy-preserving content performance carriers.
 *
 * A site owns how views are counted. The mill owns the aggregate performance
 * packet over public article metadata, with no reader identifiers.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const ContentPerformanceBucketSchema = Type.Object({
  views: Type.Integer({ minimum: 0 }),
  articleCount: Type.Integer({ minimum: 0 }),
  averageViews: Type.Number({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/content-performance-bucket",
  title: "ContentPerformanceBucket",
  additionalProperties: false,
});

export const ArticlePerformanceSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  headline: Type.String({ minLength: 1 }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String({ minLength: 1 })),
  views: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/article-performance",
  title: "ArticlePerformance",
  additionalProperties: false,
});

export const ContentPerformanceReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.content-performance-reading"),
  totalViews: Type.Integer({ minimum: 0 }),
  publicArticleCount: Type.Integer({ minimum: 0 }),
  byArticle: Type.Array(ArticlePerformanceSchema),
  bySection: Type.Record(Type.String(), ContentPerformanceBucketSchema),
  byTag: Type.Record(Type.String(), ContentPerformanceBucketSchema),
  constraints: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/content-performance-reading",
  title: "ContentPerformanceReading",
  additionalProperties: false,
});

export type ContentPerformanceBucket = Static<typeof ContentPerformanceBucketSchema>;
export type ArticlePerformance = Static<typeof ArticlePerformanceSchema>;
export type ContentPerformanceReading = Static<typeof ContentPerformanceReadingSchema>;

export const CONTENT_PERFORMANCE_CONSTRAINTS = Object.freeze([
  "Folded from first-party path/referrer/day view counts and public article metadata only.",
  "No IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are available to this reading.",
]);

export const contentPerformanceBucketCarrier = carrierFrom(ContentPerformanceBucketSchema);

export const articlePerformanceCarrier = carrierFrom(ArticlePerformanceSchema);

export const contentPerformanceReadingCarrier = carrierFrom(ContentPerformanceReadingSchema);

export function contentPerformanceBucket(input: Readonly<{
  views: number;
  articleCount: number;
}>): ContentPerformanceBucket {
  return contentPerformanceBucketCarrier.assert({
    views: input.views,
    articleCount: input.articleCount,
    averageViews: input.articleCount === 0 ? 0 : Math.round((input.views / input.articleCount) * 100) / 100,
  }, "content performance bucket");
}

export function articlePerformance(input: Omit<ArticlePerformance, "tags"> & Readonly<{
  tags: readonly string[];
}>): ArticlePerformance {
  return articlePerformanceCarrier.assert({
    ...input,
    tags: [...input.tags],
  }, "article performance");
}

function emptyBucket(): { views: number; articleCount: number } {
  return { views: 0, articleCount: 0 };
}

function addBucket(record: Record<string, { views: number; articleCount: number }>, key: string, views: number): void {
  record[key] ??= emptyBucket();
  record[key]!.views += views;
  record[key]!.articleCount += 1;
}

function finalized(record: Readonly<Record<string, { views: number; articleCount: number }>>): Readonly<Record<string, ContentPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, contentPerformanceBucket(bucket)])));
}

export function contentPerformanceReading(input: Readonly<{
  totalViews: number;
  articles: readonly ArticlePerformance[];
  constraints?: readonly string[];
}>): ContentPerformanceReading {
  const bySection: Record<string, { views: number; articleCount: number }> = {};
  const byTag: Record<string, { views: number; articleCount: number }> = {};
  const articles = [...input.articles].map((item) => {
    if (item.section !== undefined) addBucket(bySection, item.section, item.views);
    for (const tag of item.tags) addBucket(byTag, tag, item.views);
    return articlePerformance(item);
  }).sort((left, right) => right.views - left.views || left.headline.localeCompare(right.headline));
  return contentPerformanceReadingCarrier.assert({
    kind: "producing-content.content-performance-reading" as const,
    totalViews: input.totalViews,
    publicArticleCount: articles.length,
    byArticle: articles,
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: [...(input.constraints ?? CONTENT_PERFORMANCE_CONSTRAINTS)],
  }, "content performance reading");
}

export function articlePerformanceTerm(input: ArticlePerformance): Tm {
  return carrierToTerm(jsonResource(articlePerformanceCarrier.assert(input), "article performance"));
}

export function contentPerformanceReadingTerm(input: ContentPerformanceReading): Tm {
  return carrierToTerm(jsonResource(contentPerformanceReadingCarrier.assert(input), "content performance reading"));
}
