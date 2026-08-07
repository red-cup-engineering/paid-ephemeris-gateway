// publishing/managing/circulating — reader return channels.
//
// For now Koios circulates feed-native: RSS, Atom, and JSON Feed. This
// keeps the publication useful without introducing reader identifiers.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { decodeFrontMatterDocument, encodeFrontMatterDocument, type FrontMatterDocument } from "@emsenn/content/codecs/frontmatter";

import type { KoiosPost } from "../../../../../../content.mjs";
import { citedReferenceIds, referencesFromFrontMatter } from "../../../../../sourcing/bibliography.mjs";
import type { KoiosMasthead } from "../../../../../../surface.mjs";
import { publicItems, type KoiosItem } from "../../../../../../surface.mjs";
import type { ViewCounts } from "../../../../../../views.mjs";
import { correctionCoverageForFrontMatter } from "./corrections.mjs";
export { correctionRegisterReading } from "./corrections.mjs";
export type { CorrectionCoverageReading, CorrectionKind, CorrectionRecord, CorrectionRegisterReading } from "./corrections.mjs";

export type CirculationChannel = Readonly<{
  kind: "rss" | "atom" | "json-feed";
  title: string;
  href: string;
  mediaType: string;
}>;

export type CirculationReading = Readonly<{
  department: "publishing.managing.circulating";
  channels: readonly CirculationChannel[];
  identifierPolicy: "none";
}>;

export type ContentPerformanceBucket = Readonly<{
  views: number;
  articleCount: number;
  averageViews: number;
}>;

export type ArticlePerformance = Readonly<{
  slug: string;
  path: string;
  headline: string;
  section?: string;
  tags: readonly string[];
  views: number;
}>;

export type ContentPerformanceReading = Readonly<{
  department: "publishing.managing.circulating.performance";
  totalViews: number;
  publicArticleCount: number;
  byArticle: readonly ArticlePerformance[];
  bySection: Readonly<Record<string, ContentPerformanceBucket>>;
  byTag: Readonly<Record<string, ContentPerformanceBucket>>;
  constraints: readonly string[];
}>;

export type ContentQualitySeverity = "attention" | "warning" | "blocker";

export type ContentQualityFinding = Readonly<{
  severity: ContentQualitySeverity;
  code: string;
  message: string;
}>;

export type ArticleContentQuality = Readonly<{
  slug: string;
  path: string;
  headline: string;
  section?: string;
  tags: readonly string[];
  score: number;
  wordCount: number;
  h2Count: number;
  internalLinkCount: number;
  internalLinkTargets: readonly string[];
  suggestedInternalTargets: readonly string[];
  externalLinkCount: number;
  referenceCount: number;
  citedReferenceCount: number;
  referenceDomainCount: number;
  citationDomainDiversity: number;
  seoTerm?: string;
  seoTermOccurrences: number;
  seoTermDensity: number;
  seoTermInFirstParagraph: boolean;
  seoTermInH2: boolean;
  topicDepth: number;
  malformedH2Count: number;
  headlineSummaryOverlap: number;
  correctionCount: number;
  correctionSurfaceCoverage: number;
  implicitCorrectionSurfaceCount: number;
  incompleteCorrectionSurfaceCount: number;
  missingCorrectionSurfaces: readonly string[];
  findings: readonly ContentQualityFinding[];
}>;

export type ContentQualityReading = Readonly<{
  department: "publishing.managing.circulating.quality";
  publicArticleCount: number;
  averageScore: number;
  attentionCount: number;
  warningCount: number;
  blockerCount: number;
  byArticle: readonly ArticleContentQuality[];
  aggregate: Readonly<{
    articlesWithNoInternalLinks: number;
    articlesWithThinReferences: number;
    articlesWithSingleReferenceDomain: number;
    articlesMissingSeoPlacement: number;
    articlesWithSeoTermStuffing: number;
    articlesWithThinTopicDepth: number;
    articlesWithMalformedH2: number;
    articlesWithCorrections: number;
    articlesWithImplicitCorrectionSurfaces: number;
    articlesWithIncompleteCorrectionSurfaces: number;
  }>;
  constraints: readonly string[];
  plannedUses: readonly string[];
}>;

export type PredicationCellKind = "claim" | "evidence" | "same-site-relation" | "unsupported" | "structure";

export type ArticlePredicationCell = Readonly<{
  kind: PredicationCellKind;
  paragraphIndex: number;
  heading?: string;
  textPreview: string;
  citedReferenceIds: readonly string[];
  internalTargets: readonly string[];
  confidence: number;
}>;

export type ArticlePredicationMetrics = Readonly<{
  slug: string;
  path: string;
  headline: string;
  section?: string;
  tags: readonly string[];
  paragraphCount: number;
  claimCellCount: number;
  evidenceCellCount: number;
  sameSiteRelationCellCount: number;
  unsupportedClaimCellCount: number;
  headingCellCount: number;
  citationCoverage: number;
  internalRelationCoverage: number;
  settlementDepth: number;
  graphCentrality: number;
  freshnessDays?: number;
  findings: readonly ContentQualityFinding[];
  cells: readonly ArticlePredicationCell[];
}>;

export type ContentPredicationReading = Readonly<{
  department: "publishing.managing.circulating.predication";
  publicArticleCount: number;
  aggregate: Readonly<{
    claimCells: number;
    evidenceCells: number;
    sameSiteRelationCells: number;
    unsupportedClaimCells: number;
    averageCitationCoverage: number;
    averageInternalRelationCoverage: number;
    averageSettlementDepth: number;
    averageGraphCentrality: number;
    articlesWithUnsupportedClaims: number;
    articlesWithNoEvidenceCells: number;
    articlesWithNoRelationCells: number;
  }>;
  byArticle: readonly ArticlePredicationMetrics[];
  constraints: readonly string[];
  plannedUses: readonly string[];
}>;

export type ContentGraphNode = Readonly<{
  slug: string;
  path: string;
  headline: string;
  section?: string;
  tags: readonly string[];
  referenceDomains: readonly string[];
  outboundInternalLinks: readonly string[];
  inboundInternalLinks: readonly string[];
  suggestedInternalTargets: readonly string[];
  graphCentrality: number;
  orphan: boolean;
  isolated: boolean;
}>;

export type ContentGraphEdge = Readonly<{
  sourceSlug: string;
  sourcePath: string;
  sourceHeadline: string;
  targetSlug: string;
  targetPath: string;
  targetHeadline: string;
  sharedTags: readonly string[];
  sameSection: boolean;
  linkCount: number;
}>;

export type ContentGraphReading = Readonly<{
  department: "publishing.managing.circulating.graph";
  publicArticleCount: number;
  edgeCount: number;
  orphanCount: number;
  isolatedCount: number;
  averageOutDegree: number;
  averageInDegree: number;
  byArticle: readonly ContentGraphNode[];
  edges: readonly ContentGraphEdge[];
  bySection: Readonly<Record<string, Readonly<{ articleCount: number; edgeCount: number; orphanCount: number; isolatedCount: number }>>>;
  constraints: readonly string[];
  plannedUses: readonly string[];
}>;

export type ContentRevisionTaskKind = "citation-cleanup" | "copy-edit" | "evidence-settlement" | "internal-linking" | "reference-enrichment" | "seo-revision" | "structure";

export type ContentRevisionTask = Readonly<{
  kind: ContentRevisionTaskKind;
  severity: ContentQualitySeverity;
  findingCode: string;
  priority: number;
  evidence: string;
  instruction: string;
}>;

export type ContentRevisionPacket = Readonly<{
  slug: string;
  path: string;
  headline: string;
  section?: string;
  score: number;
  settlementDepth?: number;
  citationCoverage?: number;
  internalRelationCoverage?: number;
  claimCellCount?: number;
  unsupportedClaimCellCount?: number;
  taskCount: number;
  highestPriority: number;
  tasks: readonly ContentRevisionTask[];
}>;

export type ContentRevisionBacklogReading = Readonly<{
  department: "publishing.managing.circulating.revisions";
  articleCount: number;
  taskCount: number;
  byArticle: readonly ContentRevisionPacket[];
  constraints: readonly string[];
}>;

export type InternalLinkOpportunity = Readonly<{
  sourceSlug: string;
  sourcePath: string;
  sourceHeadline: string;
  targetSlug: string;
  targetPath: string;
  targetHeadline: string;
  sharedTags: readonly string[];
  confidence: number;
  markdownLink: string;
  insertionGuidance: string;
}>;

export type InternalLinkOpportunityReading = Readonly<{
  department: "publishing.managing.circulating.internal-links";
  opportunityCount: number;
  articleCount: number;
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    currentInternalLinkCount: number;
    opportunities: readonly InternalLinkOpportunity[];
  }>[];
  constraints: readonly string[];
}>;

export type InternalLinkPlacement = Readonly<{
  sourceSlug: string;
  sourcePath: string;
  sourceHeadline: string;
  targetSlug: string;
  targetPath: string;
  targetHeadline: string;
  sharedTags: readonly string[];
  confidence: number;
  paragraphIndex: number;
  paragraphPreview: string;
  matchedTerms: readonly string[];
  markdownLink: string;
  suggestedPatch?: Readonly<{
    beforeMarkdown: string;
    afterMarkdown: string;
  }>;
  insertionGuidance: string;
}>;

export type InternalLinkPlacementReading = Readonly<{
  department: "publishing.managing.circulating.internal-link-placements";
  placementCount: number;
  articleCount: number;
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    placements: readonly InternalLinkPlacement[];
  }>[];
  constraints: readonly string[];
}>;

export type DraftInternalLinkSuggestion = Readonly<{
  targetSlug: string;
  targetPath: string;
  targetHeadline: string;
  section?: string;
  targetTags: readonly string[];
  matchedTerms: readonly string[];
  confidence: number;
  markdownLink: string;
  writingGuidance: string;
}>;

export type DraftInternalLinkGuidanceReading = Readonly<{
  department: "publishing.managing.circulating.drafting-internal-links";
  term: string;
  beat?: string;
  tags: readonly string[];
  suggestionCount: number;
  suggestions: readonly DraftInternalLinkSuggestion[];
  writingInstructions: readonly string[];
  constraints: readonly string[];
}>;

export type ApplyInternalLinkPlacementInput = Readonly<{
  sourceSlug: string;
  targetSlug: string;
  paragraphIndex?: number;
  expectedBeforeMarkdown?: string;
}>;

export type ApplyInternalLinkPlacementResult = Readonly<{
  kind: "koios.circulating.internal-link-placement.applied";
  sourceSlug: string;
  targetSlug: string;
  path: string;
  paragraphIndex: number;
  beforeMarkdown: string;
  afterMarkdown: string;
  placement: InternalLinkPlacement;
}>;

export const applyInternalLinkPlacementJsonSchema = Object.freeze({
  type: "object",
  required: Object.freeze(["sourceSlug", "targetSlug"]),
  properties: Object.freeze({
    sourceSlug: Object.freeze({ type: "string", minLength: 1 }),
    targetSlug: Object.freeze({ type: "string", minLength: 1 }),
    paragraphIndex: Object.freeze({ type: "integer", minimum: 0 }),
    expectedBeforeMarkdown: Object.freeze({ type: "string", minLength: 1 }),
  }),
  additionalProperties: false,
});

export function circulationReading(masthead: KoiosMasthead): CirculationReading {
  return Object.freeze({
    department: "publishing.managing.circulating",
    channels: Object.freeze([
      Object.freeze({ kind: "rss", title: "RSS", href: `${masthead.siteUrl}/feed.xml`, mediaType: "application/rss+xml" }),
      Object.freeze({ kind: "atom", title: "Atom", href: `${masthead.siteUrl}/feed.atom`, mediaType: "application/atom+xml" }),
      Object.freeze({ kind: "json-feed", title: "JSON Feed", href: `${masthead.siteUrl}/feed.json`, mediaType: "application/feed+json" }),
    ]),
    identifierPolicy: "none",
  });
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function itemPath(item: KoiosItem): string {
  try {
    return new URL(item.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return `/${item.slug}`.replace(/\/+$/, "");
  }
}

function pathViews(counts: ViewCounts, path: string): number {
  return (counts.byPath[path] ?? 0) + (path === "/" ? 0 : counts.byPath[`${path}/`] ?? 0);
}

function postTags(post: KoiosPost | undefined): readonly string[] {
  return strings(post?.document.frontMatter["tags"]);
}

function emptyBucket(): { views: number; articleCount: number } {
  return { views: 0, articleCount: 0 };
}

function addBucket(record: Record<string, { views: number; articleCount: number }>, key: string, views: number): void {
  record[key] ??= emptyBucket();
  record[key]!.views += views;
  record[key]!.articleCount += 1;
}

function finalizeBucket(bucket: { views: number; articleCount: number }): ContentPerformanceBucket {
  return Object.freeze({
    views: bucket.views,
    articleCount: bucket.articleCount,
    averageViews: bucket.articleCount === 0 ? 0 : Math.round((bucket.views / bucket.articleCount) * 100) / 100,
  });
}

function finalized(record: Readonly<Record<string, { views: number; articleCount: number }>>): Readonly<Record<string, ContentPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, finalizeBucket(bucket)])));
}

function firstParagraph(body: string): string {
  return body.trim().split(/\n\s*\n/, 1)[0] ?? "";
}

function h2Headings(body: string): readonly string[] {
  return Object.freeze(body.split("\n")
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim()));
}

function malformedH2Headings(body: string): readonly string[] {
  return Object.freeze(h2Headings(body).filter((heading) => wordCount(heading) > 18 || /[.!?]\s+\p{Lu}/u.test(heading)));
}

function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function normalizeApplyInternalLinkPlacementInput(value: unknown): ApplyInternalLinkPlacementInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("internal-link placement input must be a JSON object");
  const record = value as Readonly<Record<string, unknown>>;
  const sourceSlug = maybeString(record["sourceSlug"]);
  const targetSlug = maybeString(record["targetSlug"]);
  if (sourceSlug === undefined) throw new TypeError("sourceSlug is required");
  if (targetSlug === undefined) throw new TypeError("targetSlug is required");
  const paragraphIndex = record["paragraphIndex"] === undefined ? undefined : Number(record["paragraphIndex"]);
  if (paragraphIndex !== undefined && (!Number.isInteger(paragraphIndex) || paragraphIndex < 0)) throw new TypeError("paragraphIndex must be a non-negative integer");
  return Object.freeze({
    sourceSlug,
    targetSlug,
    ...(paragraphIndex === undefined ? {} : { paragraphIndex }),
    ...(record["expectedBeforeMarkdown"] === undefined ? {} : { expectedBeforeMarkdown: String(record["expectedBeforeMarkdown"]) }),
  });
}

function koiosFrontMatter(post: KoiosPost): Readonly<Record<string, unknown>> {
  const value = post.document.frontMatter["koios"];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function manuscriptSlug(path: string, document: FrontMatterDocument): string {
  return maybeString(document.frontMatter["slug"]) ?? basename(path).replace(/\.md$/, "");
}

function loadManuscript(contentDir: string, slug: string): Readonly<{ slug: string; path: string; document: FrontMatterDocument }> {
  if (!existsSync(contentDir)) throw new Error(`content directory does not exist: ${contentDir}`);
  const found = readdirSync(contentDir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => {
      const path = join(contentDir, name);
      const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
      return Object.freeze({ slug: manuscriptSlug(path, document), path, document });
    })
    .find((candidate) => candidate.slug === slug || basename(candidate.path).replace(/\.md$/, "") === slug);
  if (found === undefined) throw new Error(`no such manuscript: ${slug}`);
  return found;
}

function writeManuscript(path: string, document: FrontMatterDocument): void {
  writeFileSync(path, encodeFrontMatterDocument({
    frontMatter: document.frontMatter,
    body: document.body.endsWith("\n") ? document.body : `${document.body}\n`,
  }), "utf8");
}

const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function markdownLinks(body: string): readonly string[] {
  const links: string[] = [];
  for (const match of body.matchAll(MARKDOWN_LINK_PATTERN)) {
    const url = match[1];
    if (url !== undefined && !url.startsWith("#")) links.push(url);
  }
  return Object.freeze(links);
}

function markdownLinkRanges(body: string): readonly Readonly<{ start: number; end: number }>[] {
  return Object.freeze([...body.matchAll(MARKDOWN_LINK_PATTERN)].flatMap((match) => {
    if (match.index === undefined || match[0] === undefined) return [];
    return [Object.freeze({ start: match.index, end: match.index + match[0].length })];
  }));
}

function overlapsRange(start: number, end: number, ranges: readonly Readonly<{ start: number; end: number }>[]): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}

function linkSlug(link: string): string | undefined {
  try {
    const url = link.startsWith("http://") || link.startsWith("https://")
      ? new URL(link)
      : new URL(link, "https://koios.news");
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "posts" && parts[1] !== undefined ? decodeURIComponent(parts[1]) : undefined;
  } catch {
    return undefined;
  }
}

function externalLinks(links: readonly string[]): readonly string[] {
  return Object.freeze(links.filter((link) => {
    try {
      const url = new URL(link, "https://koios.news");
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.hostname.replace(/^www\./, "").toLowerCase() !== "koios.news"
        : false;
    } catch {
      return false;
    }
  }));
}

function tokenSet(value: string): ReadonlySet<string> {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "into", "is", "it", "of", "on", "or", "that", "the", "this", "to", "with"]);
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stop.has(token)));
}

function overlapRatio(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return Math.round((overlap / Math.min(a.size, b.size)) * 100) / 100;
}

function includesNeedle(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function exactPhraseOccurrences(haystack: string, needle: string | undefined): number {
  if (needle === undefined || needle.trim() === "") return 0;
  const escaped = needle.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi");
  return [...haystack.matchAll(pattern)].length;
}

function finding(severity: ContentQualitySeverity, code: string, message: string): ContentQualityFinding {
  return Object.freeze({ severity, code, message });
}

function postSummary(post: KoiosPost): string {
  return maybeString(post.document.frontMatter["summary"]) ?? maybeString(post.document.frontMatter["description"]) ?? "";
}

function postSection(post: KoiosPost, item: KoiosItem): string | undefined {
  return item.section ?? strings(post.document.frontMatter["categories"])[0];
}

function normalizedTags(post: KoiosPost): readonly string[] {
  return Object.freeze(strings(post.document.frontMatter["tags"]).map((tag) => tag.toLowerCase()));
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return Object.freeze(out);
}

function publicPost(post: KoiosPost): boolean {
  return post.document.frontMatter["draft"] !== true && post.document.frontMatter["draft"] !== "true";
}

function sharedTagTargets(post: KoiosPost, posts: readonly KoiosPost[], linkedSlugs: ReadonlySet<string>): readonly string[] {
  const tags = new Set(normalizedTags(post));
  if (tags.size === 0) return Object.freeze([]);
  return Object.freeze(posts
    .filter((candidate) => candidate.slug !== post.slug && publicPost(candidate))
    .map((candidate) => {
      const score = normalizedTags(candidate).filter((tag) => tags.has(tag)).length;
      return Object.freeze({ slug: candidate.slug, score });
    })
    .filter((candidate) => candidate.score > 0 && !linkedSlugs.has(candidate.slug))
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
    .slice(0, 3)
    .map((candidate) => candidate.slug));
}

function sharedTags(left: KoiosPost, right: KoiosPost): readonly string[] {
  const rightTags = new Set(normalizedTags(right));
  return Object.freeze(strings(left.document.frontMatter["tags"]).filter((tag) => rightTags.has(tag.toLowerCase())));
}

function markdownLink(label: string, path: string): string {
  return `[${label}](${path})`;
}

function previewMarkdown(markdown: string, maxLength = 360): string {
  const normalized = markdown.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function linkOpportunity(source: KoiosPost, sourceItem: KoiosItem, target: KoiosPost, targetItem: KoiosItem, currentInternalLinkCount: number): InternalLinkOpportunity | undefined {
  const tags = sharedTags(source, target);
  if (tags.length === 0) return undefined;
  const targetPath = itemPath(targetItem);
  const confidence = Math.min(1, Math.round(((tags.length / 3) + (currentInternalLinkCount === 0 ? 0.25 : 0)) * 100) / 100);
  return Object.freeze({
    sourceSlug: source.slug,
    sourcePath: itemPath(sourceItem),
    sourceHeadline: sourceItem.headline,
    targetSlug: target.slug,
    targetPath,
    targetHeadline: targetItem.headline,
    sharedTags: tags,
    confidence,
    markdownLink: markdownLink(targetItem.headline, targetPath),
    insertionGuidance: `Use only if the paragraph makes the shared topic explicit: ${tags.join(", ")}.`,
  });
}

function draftGuidanceSuggestion(input: Readonly<{
  item: KoiosItem;
  post: KoiosPost;
  requestedTerms: readonly string[];
  requestedTags: readonly string[];
  requestedBeat?: string;
}>): DraftInternalLinkSuggestion | undefined {
  const targetTags = strings(input.post.document.frontMatter["tags"]);
  const targetSearchText = [
    input.item.headline,
    input.item.section ?? "",
    postSection(input.post, input.item) ?? "",
    maybeString(koiosFrontMatter(input.post)["seo_term"]) ?? "",
    ...targetTags,
  ].join(" ");
  const requestedTagSet = new Set(input.requestedTags.map((tag) => tag.toLowerCase()));
  const exact = targetTags.filter((tag) => requestedTagSet.has(tag.toLowerCase()));
  const tokenOverlap = [...tokenSet(input.requestedTerms.join(" "))].filter((token) => tokenSet(targetSearchText).has(token));
  const beatMatch = input.requestedBeat !== undefined && postSection(input.post, input.item)?.toLowerCase() === input.requestedBeat.toLowerCase();
  const matchedTerms = uniqueStrings([...exact, ...tokenOverlap, ...(beatMatch ? [input.requestedBeat!] : [])]);
  if (matchedTerms.length === 0) return undefined;
  const confidence = Math.min(1, Math.round(((exact.length * 0.28) + (tokenOverlap.length * 0.12) + (beatMatch ? 0.18 : 0.05)) * 100) / 100);
  const targetPath = itemPath(input.item);
  return Object.freeze({
    targetSlug: input.post.slug,
    targetPath,
    targetHeadline: input.item.headline,
    ...(input.item.section === undefined ? {} : { section: input.item.section }),
    targetTags,
    matchedTerms,
    confidence,
    markdownLink: markdownLink(input.item.headline, targetPath),
    writingGuidance: `Consider this same-site link only if the draft body makes a local, sourced claim about: ${matchedTerms.join(", ")}.`,
  });
}

function paragraphBlocks(body: string): readonly Readonly<{ index: number; markdown: string }>[] {
  return Object.freeze(body
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/)
    .map((markdown, index) => {
      const lines = markdown.trim().split("\n");
      let firstParagraphLine = 0;
      while (firstParagraphLine < lines.length && /^#{1,6}\s+/.test(lines[firstParagraphLine]?.trim() ?? "")) {
        firstParagraphLine += 1;
      }
      return Object.freeze({ index, markdown: lines.slice(firstParagraphLine).join("\n").trim() });
    })
    .filter((block) => block.markdown.length > 80)
    .filter((block) => !/^#{1,6}\s+/.test(block.markdown))
    .filter((block) => !/^```/.test(block.markdown)));
}

function exactPhraseMatches(markdown: string, phrases: readonly string[]): readonly string[] {
  const lower = markdown.toLowerCase();
  return Object.freeze(phrases.filter((phrase) => phrase.trim().length > 0 && lower.includes(phrase.toLowerCase())));
}

function tokenMatches(markdown: string, terms: readonly string[]): readonly string[] {
  const tokens = tokenSet(markdown);
  const matches = new Set<string>();
  for (const term of terms) {
    for (const token of tokenSet(term)) {
      if (tokens.has(token)) matches.add(token);
    }
  }
  return Object.freeze([...matches].sort());
}

function hasWordBoundary(value: string | undefined): boolean {
  return value === undefined || !/[a-z0-9]/i.test(value);
}

function firstPhrasePatch(markdown: string, phrases: readonly string[], targetPath: string): Readonly<{ beforeMarkdown: string; afterMarkdown: string }> | undefined {
  const ranges = markdownLinkRanges(markdown);
  const sorted = [...phrases].sort((left, right) => right.length - left.length);
  for (const phrase of sorted) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "gi");
    for (const match of markdown.matchAll(pattern)) {
      if (match.index === undefined || match[0] === undefined) continue;
      const start = match.index;
      const end = start + match[0].length;
      if (overlapsRange(start, end, ranges)) continue;
      if (!hasWordBoundary(markdown[start - 1]) || !hasWordBoundary(markdown[end])) continue;
      return Object.freeze({
        beforeMarkdown: markdown,
        afterMarkdown: `${markdown.slice(0, start)}[${match[0]}](${targetPath})${markdown.slice(end)}`,
      });
    }
  }
  return undefined;
}

function placementForOpportunity(source: KoiosPost, opportunity: InternalLinkOpportunity): InternalLinkPlacement | undefined {
  const paragraphs = paragraphBlocks(source.document.body)
    .filter((paragraph) => !markdownLinks(paragraph.markdown).some((link) => linkSlug(link) === opportunity.targetSlug));
  const targetTerms = Object.freeze([opportunity.targetHeadline, ...opportunity.sharedTags]);
  const ranked = paragraphs.map((paragraph) => {
    const exact = exactPhraseMatches(paragraph.markdown, opportunity.sharedTags);
    const tokens = tokenMatches(paragraph.markdown, targetTerms);
    const currentLinks = markdownLinks(paragraph.markdown).length;
    const score = (exact.length * 5) + (tokens.length * 1.5) - (currentLinks * 0.5);
    return Object.freeze({ paragraph, exact, tokens, score });
  })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.paragraph.index - right.paragraph.index);
  const selected = ranked[0];
  if (selected === undefined) return undefined;
  const matchedTerms = Object.freeze([...new Set([...selected.exact, ...selected.tokens])]);
  const patch = firstPhrasePatch(selected.paragraph.markdown, selected.exact, opportunity.targetPath);
  const confidence = Math.min(1, Math.round((opportunity.confidence + Math.min(0.35, selected.score / 20)) * 100) / 100);
  return Object.freeze({
    sourceSlug: opportunity.sourceSlug,
    sourcePath: opportunity.sourcePath,
    sourceHeadline: opportunity.sourceHeadline,
    targetSlug: opportunity.targetSlug,
    targetPath: opportunity.targetPath,
    targetHeadline: opportunity.targetHeadline,
    sharedTags: opportunity.sharedTags,
    confidence,
    paragraphIndex: selected.paragraph.index,
    paragraphPreview: previewMarkdown(selected.paragraph.markdown),
    matchedTerms,
    markdownLink: opportunity.markdownLink,
    ...(patch === undefined ? {} : { suggestedPatch: patch }),
    insertionGuidance: patch === undefined
      ? `Place ${opportunity.markdownLink} only if the paragraph explicitly warrants the target through: ${matchedTerms.join(", ")}.`
      : `Review the suggested patch; it links the first explicit shared-topic phrase and does not otherwise rewrite the paragraph.`,
  });
}

function articleQuality(post: KoiosPost, item: KoiosItem, posts: readonly KoiosPost[]): ArticleContentQuality {
  const body = post.document.body;
  const links = markdownLinks(body);
  const linkedSlugs = new Set(links.flatMap((link) => {
    const slug = linkSlug(link);
    return slug === undefined || slug === post.slug ? [] : [slug];
  }));
  const references = referencesFromFrontMatter(post.document.frontMatter);
  const correctionCoverage = correctionCoverageForFrontMatter(post.document.frontMatter);
  const citedIds = citedReferenceIds(body);
  const referenceDomains = new Set(references.flatMap((reference) => reference.domain === undefined ? [] : [reference.domain]));
  const koios = koiosFrontMatter(post);
  const seoTerm = maybeString(koios["seo_term"]) ?? strings(post.document.frontMatter["keywords"])[0];
  const headings = h2Headings(body);
  const tags = strings(post.document.frontMatter["tags"]);
  const section = postSection(post, item);
  const internalLinkTargets = Object.freeze([...linkedSlugs].sort());
  const suggestedInternalTargets = sharedTagTargets(post, posts, linkedSlugs);
  const headlineSummaryOverlap = overlapRatio(item.headline, postSummary(post));
  const seoTermInFirstParagraph = seoTerm === undefined ? false : includesNeedle(firstParagraph(body), seoTerm);
  const seoTermInH2 = seoTerm === undefined ? false : headings.some((heading) => includesNeedle(heading, seoTerm));
  const malformedH2Count = malformedH2Headings(body).length;
  const topicDepth = Math.min(1, Math.round(((tags.length / 5) + (headings.length / 4) + (references.length / 4)) / 3 * 100) / 100);
  const findings: ContentQualityFinding[] = [];
  const words = wordCount(body);
  const outboundLinks = externalLinks(links);
  const seoTermOccurrences = exactPhraseOccurrences(body, seoTerm);
  const seoTermDensity = words === 0 ? 0 : Math.round((seoTermOccurrences / words) * 10_000) / 100;

  if (words < 800) findings.push(finding("blocker", "short-article", `Article has ${words} words; durable search/news copy should usually clear 800.`));
  if (internalLinkTargets.length === 0) findings.push(finding("warning", "no-internal-links", "Article does not link to another Koios article; add one relevant internal link where the warrant is natural."));
  if (suggestedInternalTargets.length > 0 && internalLinkTargets.length < 2) findings.push(finding("attention", "internal-link-opportunities", `Related published articles are available: ${suggestedInternalTargets.join(", ")}.`));
  if (references.length < 2) findings.push(finding("warning", "thin-references", "Article has fewer than two CSL references."));
  if (references.length >= 3 && referenceDomains.size <= 1) findings.push(finding("warning", "single-reference-domain", "Article cites three or more references but only one reference domain."));
  if (citedIds.length === 0 && references.length > 0) findings.push(finding("attention", "uncited-bibliography", "Article has references but no Pandoc-style body citations."));
  if (headings.length < 2) findings.push(finding("attention", "thin-heading-structure", "Article has fewer than two H2 sections."));
  if (tags.length < 3) findings.push(finding("attention", "thin-topic-tags", "Article has fewer than three tags."));
  if (seoTerm === undefined) findings.push(finding("warning", "missing-seo-term", "Article has no koios.seo_term or keyword."));
  else {
    if (!seoTermInFirstParagraph) findings.push(finding("warning", "seo-term-missing-first-paragraph", "SEO term is missing from the first paragraph."));
    if (!seoTermInH2) findings.push(finding("warning", "seo-term-missing-h2", "SEO term is missing from an H2 heading."));
    if (seoTermDensity > 1.25 || seoTermOccurrences > 8) findings.push(finding("warning", "seo-term-overuse", `SEO term appears ${seoTermOccurrences} times (${seoTermDensity} per 100 words); revise for natural phrasing and entity variety.`));
    else if (seoTermDensity > 0.8) findings.push(finding("attention", "repetitive-seo-term", `SEO term appears ${seoTermOccurrences} times (${seoTermDensity} per 100 words); check for repetitive phrasing.`));
  }
  if (malformedH2Count > 0) findings.push(finding("warning", "malformed-h2-heading", `${malformedH2Count} H2 ${malformedH2Count === 1 ? "heading looks" : "headings look"} like body prose; split headings from paragraphs before publication enrichment.`));
  if (headlineSummaryOverlap < 0.25) findings.push(finding("attention", "low-headline-summary-overlap", "Headline and summary share little vocabulary; confirm the headline preserves the article warrant."));
  if (outboundLinks.length < references.length && citedIds.length === 0) findings.push(finding("attention", "references-not-linked-in-body", "Some references may only appear in the bibliography; add inline citations or links where they support claims."));
  if (correctionCoverage.implicitSurfaceCount > 0) findings.push(finding("attention", "implicit-correction-surfaces", `${correctionCoverage.implicitSurfaceCount} correction ${correctionCoverage.implicitSurfaceCount === 1 ? "record relies" : "records rely"} on default propagation surfaces; make affected_surfaces explicit after propagation is confirmed.`));
  if (correctionCoverage.incompleteSurfaceCount > 0) findings.push(finding("warning", "incomplete-correction-surface-coverage", `${correctionCoverage.incompleteSurfaceCount} correction ${correctionCoverage.incompleteSurfaceCount === 1 ? "record is" : "records are"} missing propagation surfaces: ${correctionCoverage.missingSurfaces.join(", ")}.`));

  const penalty = findings.reduce((sum, item) => sum + (item.severity === "blocker" ? 30 : item.severity === "warning" ? 12 : 5), 0);
  const score = Math.max(0, 100 - penalty);
  return Object.freeze({
    slug: post.slug,
    path: itemPath(item),
    headline: item.headline,
    ...(section === undefined ? {} : { section }),
    tags,
    score,
    wordCount: words,
    h2Count: headings.length,
    internalLinkCount: internalLinkTargets.length,
    internalLinkTargets,
    suggestedInternalTargets,
    externalLinkCount: outboundLinks.length,
    referenceCount: references.length,
    citedReferenceCount: citedIds.length,
    referenceDomainCount: referenceDomains.size,
    citationDomainDiversity: references.length === 0 ? 0 : Math.round((referenceDomains.size / references.length) * 100) / 100,
    ...(seoTerm === undefined ? {} : { seoTerm }),
    seoTermOccurrences,
    seoTermDensity,
    seoTermInFirstParagraph,
    seoTermInH2,
    topicDepth,
    malformedH2Count,
    headlineSummaryOverlap,
    correctionCount: correctionCoverage.correctionCount,
    correctionSurfaceCoverage: correctionCoverage.coverage,
    implicitCorrectionSurfaceCount: correctionCoverage.implicitSurfaceCount,
    incompleteCorrectionSurfaceCount: correctionCoverage.incompleteSurfaceCount,
    missingCorrectionSurfaces: correctionCoverage.missingSurfaces,
    findings: Object.freeze(findings),
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : round(part / whole);
}

function claimLikeParagraph(markdown: string): boolean {
  const text = markdown.replace(/\[[^\]]+\]\([^)]+\)/g, " ").replace(/`[^`]+`/g, " ").trim();
  if (wordCount(text) < 18) return false;
  if (/\b(is|are|was|were|has|have|had|will|would|can|could|may|might|must|should|drives|signals|shows|suggests|reports|said|says|announced|warned|found)\b/i.test(text)) return true;
  return /\b\d+(?:[.,]\d+)?\s*(?:%|percent|million|billion|trillion|MW|GW|TWh|USD|dollars?)?\b/i.test(text);
}

function paragraphInternalTargets(markdown: string, ownSlug: string): readonly string[] {
  return Object.freeze(uniqueStrings(markdownLinks(markdown).flatMap((link) => {
    const slug = linkSlug(link);
    return slug === undefined || slug === ownSlug ? [] : [slug];
  })));
}

function headingCells(body: string): readonly ArticlePredicationCell[] {
  return Object.freeze(h2Headings(body).map((heading, index): ArticlePredicationCell => Object.freeze({
    kind: "structure" as const,
    paragraphIndex: index,
    heading,
    textPreview: heading,
    citedReferenceIds: Object.freeze([]),
    internalTargets: Object.freeze([]),
    confidence: 0.8,
  })));
}

function predicationCell(post: KoiosPost, paragraph: Readonly<{ index: number; markdown: string }>): ArticlePredicationCell | undefined {
  const citedIds = citedReferenceIds(paragraph.markdown);
  const internalTargets = paragraphInternalTargets(paragraph.markdown, post.slug);
  const externalLinkCount = externalLinks(markdownLinks(paragraph.markdown)).length;
  const isClaim = claimLikeParagraph(paragraph.markdown);
  if (!isClaim && citedIds.length === 0 && internalTargets.length === 0 && externalLinkCount === 0) return undefined;
  const hasEvidence = citedIds.length > 0 || externalLinkCount > 0;
  const kind: PredicationCellKind = hasEvidence
    ? "evidence"
    : internalTargets.length > 0
      ? "same-site-relation"
      : isClaim
        ? "unsupported"
        : "claim";
  const confidence = kind === "evidence" ? 0.86 : kind === "same-site-relation" ? 0.72 : kind === "unsupported" ? 0.64 : 0.55;
  return Object.freeze({
    kind,
    paragraphIndex: paragraph.index,
    textPreview: previewMarkdown(paragraph.markdown),
    citedReferenceIds: Object.freeze(citedIds),
    internalTargets,
    confidence,
  });
}

function freshnessDays(post: KoiosPost): number | undefined {
  const raw = maybeString(post.document.frontMatter["date"]);
  if (raw === undefined) return undefined;
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw);
  if (!Number.isFinite(ms)) return undefined;
  return Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
}

function inboundInternalLinks(posts: readonly KoiosPost[]): ReadonlyMap<string, number> {
  const inbound = new Map<string, number>();
  for (const post of posts) {
    for (const target of paragraphInternalTargets(post.document.body, post.slug)) {
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }
  return inbound;
}

function articlePredication(post: KoiosPost, item: KoiosItem, posts: readonly KoiosPost[], inbound: ReadonlyMap<string, number>, cellLimit = 12): ArticlePredicationMetrics {
  const paragraphs = paragraphBlocks(post.document.body);
  const bodyCells = paragraphs.flatMap((paragraph) => {
    const cell = predicationCell(post, paragraph);
    return cell === undefined ? [] : [cell];
  });
  const cells = Object.freeze([...headingCells(post.document.body), ...bodyCells]
    .sort((left, right) => left.paragraphIndex - right.paragraphIndex || left.kind.localeCompare(right.kind)));
  const claimCellCount = bodyCells.filter((cell) => cell.kind === "claim" || cell.kind === "evidence" || cell.kind === "same-site-relation" || cell.kind === "unsupported").length;
  const evidenceCellCount = bodyCells.filter((cell) => cell.kind === "evidence").length;
  const sameSiteRelationCellCount = bodyCells.filter((cell) => cell.kind === "same-site-relation").length;
  const unsupportedClaimCellCount = bodyCells.filter((cell) => cell.kind === "unsupported").length;
  const headingCellCount = cells.filter((cell) => cell.kind === "structure").length;
  const citationCoverage = ratio(evidenceCellCount, claimCellCount);
  const internalRelationCoverage = ratio(sameSiteRelationCellCount, claimCellCount);
  const references = referencesFromFrontMatter(post.document.frontMatter);
  const referenceDomains = new Set(references.flatMap((reference) => reference.domain === undefined ? [] : [reference.domain]));
  const outboundTargets = new Set(bodyCells.flatMap((cell) => cell.internalTargets));
  const inboundCount = inbound.get(post.slug) ?? 0;
  const graphCentrality = Math.min(1, round((outboundTargets.size + inboundCount) / Math.max(1, posts.length - 1)));
  const settlementDepth = round(Math.min(1,
    (citationCoverage * 0.45)
    + (internalRelationCoverage * 0.2)
    + (Math.min(1, references.length / 4) * 0.15)
    + (Math.min(1, referenceDomains.size / 3) * 0.1)
    + (Math.min(1, headingCellCount / 3) * 0.1),
  ));
  const findings: ContentQualityFinding[] = [];
  if (claimCellCount > 0 && evidenceCellCount === 0) findings.push(finding("warning", "no-evidence-cells", "No claim-like paragraph carries an inline citation or external source link."));
  if (claimCellCount > 0 && unsupportedClaimCellCount / claimCellCount > 0.45) findings.push(finding("warning", "unsupported-claim-density", `${unsupportedClaimCellCount} of ${claimCellCount} claim-like paragraphs lack direct evidence or a same-site relation.`));
  if (claimCellCount > 0 && sameSiteRelationCellCount === 0) findings.push(finding("attention", "no-same-site-relations", "No claim-like paragraph links to another Koios article; the article may be isolated from the site graph."));
  if (settlementDepth < 0.45) findings.push(finding("attention", "low-settlement-depth", `Settlement depth is ${settlementDepth}; add cited support, same-site context, or clearer sectioning where warranted.`));
  if (graphCentrality === 0) findings.push(finding("attention", "graph-isolated", "Article has no same-site inbound or outbound article relations in the public graph."));
  const age = freshnessDays(post);
  return Object.freeze({
    slug: post.slug,
    path: itemPath(item),
    headline: item.headline,
    ...(item.section === undefined ? {} : { section: item.section }),
    tags: strings(post.document.frontMatter["tags"]),
    paragraphCount: paragraphs.length,
    claimCellCount,
    evidenceCellCount,
    sameSiteRelationCellCount,
    unsupportedClaimCellCount,
    headingCellCount,
    citationCoverage,
    internalRelationCoverage,
    settlementDepth,
    graphCentrality,
    ...(age === undefined ? {} : { freshnessDays: age }),
    findings: Object.freeze(findings),
    cells: Object.freeze(cells.slice(0, Math.max(1, cellLimit))),
  });
}

export function contentPerformanceReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  views: ViewCounts;
}>): ContentPerformanceReading {
  const postsBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const bySection: Record<string, { views: number; articleCount: number }> = {};
  const byTag: Record<string, { views: number; articleCount: number }> = {};
  const articles = publicItems(input.items).map((item): ArticlePerformance => {
    const path = itemPath(item);
    const views = pathViews(input.views, path);
    const tags = postTags(postsBySlug.get(item.slug));
    if (item.section !== undefined) addBucket(bySection, item.section, views);
    for (const tag of tags) addBucket(byTag, tag, views);
    return Object.freeze({
      slug: item.slug,
      path,
      headline: item.headline,
      ...(item.section === undefined ? {} : { section: item.section }),
      tags,
      views,
    });
  }).sort((left, right) => right.views - left.views || left.headline.localeCompare(right.headline));
  return Object.freeze({
    department: "publishing.managing.circulating.performance",
    totalViews: input.views.total,
    publicArticleCount: articles.length,
    byArticle: Object.freeze(articles),
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: Object.freeze([
      "Folded from first-party path/referrer/day view counts and public article metadata only.",
      "No IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are available to this reading.",
    ]),
  });
}

export function contentQualityReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): ContentQualityReading {
  const postsBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const articles = publicItems(input.items).flatMap((item): ArticleContentQuality[] => {
    const post = postsBySlug.get(item.slug);
    return post === undefined ? [] : [articleQuality(post, item, input.posts)];
  }).sort((left, right) => left.score - right.score || left.headline.localeCompare(right.headline));
  const attentionCount = articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "attention").length, 0);
  const warningCount = articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "warning").length, 0);
  const blockerCount = articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "blocker").length, 0);
  return Object.freeze({
    department: "publishing.managing.circulating.quality",
    publicArticleCount: articles.length,
    averageScore: articles.length === 0 ? 0 : Math.round((articles.reduce((sum, article) => sum + article.score, 0) / articles.length) * 100) / 100,
    attentionCount,
    warningCount,
    blockerCount,
    byArticle: Object.freeze(articles),
    aggregate: Object.freeze({
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
    }),
    constraints: Object.freeze([
      "Folded from public article Markdown, frontmatter, CSL references, taxonomy, and same-site link topology only.",
      "No page views, IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are used by this quality reading.",
      "This is an editorial diagnostic, not a publication gate; standards review remains the publication gate.",
    ]),
    plannedUses: Object.freeze([
      "Prioritize internal-link enrichment work.",
      "Find articles with thin or concentrated reference support.",
      "Check whether headlines, summaries, SEO terms, and body structure preserve the article warrant.",
      "Track correction propagation coverage without using visitor data.",
      "Give human operators and agents a privacy-preserving content-quality backlog.",
    ]),
  });
}

export function contentPredicationReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): ContentPredicationReading {
  const postsBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const itemBySlug = new Map(publicItems(input.items).map((item) => [item.slug, item]));
  const publicPosts = input.posts.filter((post) => publicPost(post) && itemBySlug.has(post.slug));
  const inbound = inboundInternalLinks(publicPosts);
  const articles = publicItems(input.items).flatMap((item): ArticlePredicationMetrics[] => {
    const post = postsBySlug.get(item.slug);
    return post === undefined || !publicPost(post) ? [] : [articlePredication(post, item, publicPosts, inbound)];
  }).sort((left, right) => left.settlementDepth - right.settlementDepth || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  return Object.freeze({
    department: "publishing.managing.circulating.predication",
    publicArticleCount: articles.length,
    aggregate: Object.freeze({
      claimCells: articles.reduce((sum, article) => sum + article.claimCellCount, 0),
      evidenceCells: articles.reduce((sum, article) => sum + article.evidenceCellCount, 0),
      sameSiteRelationCells: articles.reduce((sum, article) => sum + article.sameSiteRelationCellCount, 0),
      unsupportedClaimCells: articles.reduce((sum, article) => sum + article.unsupportedClaimCellCount, 0),
      averageCitationCoverage: articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article.citationCoverage, 0) / articles.length),
      averageInternalRelationCoverage: articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article.internalRelationCoverage, 0) / articles.length),
      averageSettlementDepth: articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article.settlementDepth, 0) / articles.length),
      averageGraphCentrality: articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article.graphCentrality, 0) / articles.length),
      articlesWithUnsupportedClaims: articles.filter((article) => article.unsupportedClaimCellCount > 0).length,
      articlesWithNoEvidenceCells: articles.filter((article) => article.evidenceCellCount === 0 && article.claimCellCount > 0).length,
      articlesWithNoRelationCells: articles.filter((article) => article.sameSiteRelationCellCount === 0 && article.claimCellCount > 0).length,
    }),
    byArticle: Object.freeze(articles),
    constraints: Object.freeze([
      "Folded from public article Markdown, CSL references, and same-site article links only.",
      "This is an editorial predication diagnostic: it estimates support and relation shape, not truth.",
      "Sources and references remain ontologically separate; only CSL references and body citations count as publication evidence.",
      "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
    ]),
    plannedUses: Object.freeze([
      "Find articles whose claim-like paragraphs need stronger inline reference support.",
      "Find isolated articles that should be related to existing Koios coverage where the local paragraph warrants it.",
      "Track settlement depth, graph centrality, and freshness as internal editorial metrics.",
      "Give future autonomous research, writing, editing, and publishing stages a shared content-quality carrier.",
    ]),
  });
}

export function contentPredicationPacket(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  slug: string;
  cellLimit?: number;
}>): ArticlePredicationMetrics {
  const itemBySlug = new Map(publicItems(input.items).map((item) => [item.slug, item]));
  const publicPosts = input.posts.filter((post) => publicPost(post) && itemBySlug.has(post.slug));
  const post = publicPosts.find((candidate) => candidate.slug === input.slug);
  const item = itemBySlug.get(input.slug);
  if (post === undefined || item === undefined) throw new Error(`no public predication packet for article: ${input.slug}`);
  return articlePredication(post, item, publicPosts, inboundInternalLinks(publicPosts), input.cellLimit ?? 80);
}

function countedInternalTargets(post: KoiosPost): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const target of markdownLinks(post.document.body).flatMap((link) => {
    const slug = linkSlug(link);
    return slug === undefined || slug === post.slug ? [] : [slug];
  })) counts.set(target, (counts.get(target) ?? 0) + 1);
  return counts;
}

function sectionBucket(articleCount = 0, edgeCount = 0, orphanCount = 0, isolatedCount = 0): { articleCount: number; edgeCount: number; orphanCount: number; isolatedCount: number } {
  return { articleCount, edgeCount, orphanCount, isolatedCount };
}

export function contentGraphReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): ContentGraphReading {
  const itemBySlug = new Map(publicItems(input.items).map((item) => [item.slug, item]));
  const publicPosts = input.posts.filter((post) => publicPost(post) && itemBySlug.has(post.slug));
  const publicSlugs = new Set(publicPosts.map((post) => post.slug));
  const outboundBySlug = new Map<string, ReadonlyMap<string, number>>();
  const inboundBySlug = new Map<string, Set<string>>();
  for (const post of publicPosts) {
    const outbound = new Map([...countedInternalTargets(post)].filter(([target]) => publicSlugs.has(target)));
    outboundBySlug.set(post.slug, outbound);
    for (const target of outbound.keys()) {
      inboundBySlug.get(target)?.add(post.slug) ?? inboundBySlug.set(target, new Set([post.slug]));
    }
  }
  const edges = publicPosts.flatMap((post): ContentGraphEdge[] => {
    const item = itemBySlug.get(post.slug);
    if (item === undefined) return [];
    const sourceSection = postSection(post, item);
    return [...(outboundBySlug.get(post.slug) ?? new Map<string, number>())].flatMap(([targetSlug, linkCount]) => {
      const targetPost = publicPosts.find((candidate) => candidate.slug === targetSlug);
      const targetItem = itemBySlug.get(targetSlug);
      if (targetPost === undefined || targetItem === undefined) return [];
      const targetSection = postSection(targetPost, targetItem);
      return [Object.freeze({
        sourceSlug: post.slug,
        sourcePath: itemPath(item),
        sourceHeadline: item.headline,
        targetSlug,
        targetPath: itemPath(targetItem),
        targetHeadline: targetItem.headline,
        sharedTags: sharedTags(post, targetPost),
        sameSection: sourceSection !== undefined && targetSection !== undefined && sourceSection.toLowerCase() === targetSection.toLowerCase(),
        linkCount,
      })];
    });
  }).sort((left, right) => left.sourceHeadline.localeCompare(right.sourceHeadline) || left.targetHeadline.localeCompare(right.targetHeadline));
  const bySection: Record<string, { articleCount: number; edgeCount: number; orphanCount: number; isolatedCount: number }> = {};
  const nodes = publicPosts.flatMap((post): ContentGraphNode[] => {
    const item = itemBySlug.get(post.slug);
    if (item === undefined) return [];
    const outbound = [...(outboundBySlug.get(post.slug) ?? new Map<string, number>()).keys()].sort();
    const inbound = [...(inboundBySlug.get(post.slug) ?? new Set<string>())].sort();
    const linkedSlugs = new Set(outbound);
    const section = postSection(post, item);
    const referenceDomains = uniqueStrings(referencesFromFrontMatter(post.document.frontMatter).flatMap((reference) => reference.domain === undefined ? [] : [reference.domain]));
    const node = Object.freeze({
      slug: post.slug,
      path: itemPath(item),
      headline: item.headline,
      ...(section === undefined ? {} : { section }),
      tags: strings(post.document.frontMatter["tags"]),
      referenceDomains,
      outboundInternalLinks: Object.freeze(outbound),
      inboundInternalLinks: Object.freeze(inbound),
      suggestedInternalTargets: sharedTagTargets(post, publicPosts, linkedSlugs),
      graphCentrality: Math.min(1, round((outbound.length + inbound.length) / Math.max(1, publicPosts.length - 1))),
      orphan: inbound.length === 0,
      isolated: inbound.length === 0 && outbound.length === 0,
    });
    const bucketKey = section ?? "uncategorized";
    bySection[bucketKey] ??= sectionBucket();
    bySection[bucketKey]!.articleCount += 1;
    bySection[bucketKey]!.edgeCount += outbound.length;
    if (node.orphan) bySection[bucketKey]!.orphanCount += 1;
    if (node.isolated) bySection[bucketKey]!.isolatedCount += 1;
    return [node];
  }).sort((left, right) => Number(right.isolated) - Number(left.isolated) || Number(right.orphan) - Number(left.orphan) || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  return Object.freeze({
    department: "publishing.managing.circulating.graph",
    publicArticleCount: nodes.length,
    edgeCount: edges.length,
    orphanCount: nodes.filter((node) => node.orphan).length,
    isolatedCount: nodes.filter((node) => node.isolated).length,
    averageOutDegree: nodes.length === 0 ? 0 : round(edges.length / nodes.length),
    averageInDegree: nodes.length === 0 ? 0 : round(edges.length / nodes.length),
    byArticle: Object.freeze(nodes),
    edges: Object.freeze(edges),
    bySection: Object.freeze(Object.fromEntries(Object.entries(bySection).sort(([left], [right]) => left.localeCompare(right)).map(([section, bucket]) => [section, Object.freeze({ ...bucket })]))),
    constraints: Object.freeze([
      "Folded from public article Markdown links, public taxonomy, and CSL reference domains only.",
      "Same-site links are topology and editorial context, not factual references.",
      "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
    ]),
    plannedUses: Object.freeze([
      "Find isolated and orphaned public articles before promotion.",
      "Prioritize warranted internal-link work by section and topic.",
      "Support richer topic clusters, section pages, and revision assignments without user tracking.",
    ]),
  });
}

function severityBasePriority(severity: ContentQualitySeverity): number {
  if (severity === "blocker") return 90;
  if (severity === "warning") return 65;
  return 40;
}

function revisionTask(article: ArticleContentQuality, finding: ContentQualityFinding): ContentRevisionTask {
  if (finding.code === "no-internal-links") return Object.freeze({
    kind: "internal-linking" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 82,
    evidence: `${article.internalLinkCount} internal links; suggested targets: ${article.suggestedInternalTargets.join(", ") || "none from shared tags"}.`,
    instruction: "Add one warranted same-site link where a paragraph already names the target topic; use the internal-link placement queue when it offers a conservative patch.",
  });
  if (finding.code === "thin-references") return Object.freeze({
    kind: "reference-enrichment" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 78,
    evidence: `${article.referenceCount} CSL references across ${article.referenceDomainCount} domains.`,
    instruction: "Add at least one additional relevant CSL reference from a distinct, high-quality source before further syndication or promotion.",
  });
  if (finding.code === "uncited-bibliography" || finding.code === "references-not-linked-in-body") return Object.freeze({
    kind: "citation-cleanup" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 66,
    evidence: `${article.referenceCount} references, ${article.citedReferenceCount} Pandoc-style body citations, ${article.externalLinkCount} external body links.`,
    instruction: "Tie each important claim to a body citation or inline source link so the bibliography is not detached from the prose.",
  });
  if (finding.code === "seo-term-overuse" || finding.code === "repetitive-seo-term") return Object.freeze({
    kind: "seo-revision" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: finding.code === "seo-term-overuse" ? 76 : 54,
    evidence: article.seoTerm === undefined ? finding.message : `${article.seoTermOccurrences} uses of "${article.seoTerm}" (${article.seoTermDensity} per 100 words).`,
    instruction: "Rewrite repeated SEO phrases into natural entity, pronoun, and synonym variation while preserving first-paragraph and H2 topical placement.",
  });
  if (finding.code === "malformed-h2-heading") return Object.freeze({
    kind: "structure" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 74,
    evidence: `${article.malformedH2Count} H2 ${article.malformedH2Count === 1 ? "heading appears" : "headings appear"} to contain body prose.`,
    instruction: "Split long H2 lines into short section headings followed by normal paragraphs; headings should label the section, not carry the whole claim.",
  });
  if (finding.code === "short-article") return Object.freeze({
    kind: "copy-edit" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 88,
    evidence: `${article.wordCount} words.`,
    instruction: "Expand the article with sourced context, concrete implications, and at least one additional section before publication or recirculation.",
  });
  if (finding.code === "missing-seo-term" || finding.code.startsWith("seo-term-missing-")) return Object.freeze({
    kind: "seo-revision" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: severityBasePriority(finding.severity),
    evidence: article.seoTerm === undefined ? "No SEO term is declared." : `SEO term "${article.seoTerm}" placement is incomplete.`,
    instruction: "Declare the intended search term and place it naturally in the first paragraph and one H2 without stuffing the phrase.",
  });
  if (finding.code === "thin-heading-structure") return Object.freeze({
    kind: "structure" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 48,
    evidence: `${article.h2Count} H2 sections.`,
    instruction: "Add section structure that separates background, evidence, implications, and open questions.",
  });
  return Object.freeze({
    kind: "copy-edit" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: severityBasePriority(finding.severity),
    evidence: finding.message,
    instruction: "Review the article against the content-quality finding and make the smallest sourced edit that repairs the warrant.",
  });
}

function predicationRevisionTask(article: ArticlePredicationMetrics, finding: ContentQualityFinding): ContentRevisionTask {
  if (finding.code === "no-evidence-cells") return Object.freeze({
    kind: "citation-cleanup" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 86,
    evidence: `${article.claimCellCount} claim-like paragraphs, ${article.evidenceCellCount} evidence cells, citation coverage ${article.citationCoverage}.`,
    instruction: "Review the claim-like paragraphs in the predication cells; add warranted inline CSL citations or remove claims that cannot be supported by the article's references.",
  });
  if (finding.code === "unsupported-claim-density") return Object.freeze({
    kind: "evidence-settlement" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 84,
    evidence: `${article.unsupportedClaimCellCount} of ${article.claimCellCount} claim-like paragraphs are unsupported; settlement depth ${article.settlementDepth}.`,
    instruction: "Reduce unsupported claim density by either citing the paragraph, linking it to a warranted same-site context article, or rewriting it as narrower attributed analysis.",
  });
  if (finding.code === "no-same-site-relations") return Object.freeze({
    kind: "internal-linking" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 70,
    evidence: `${article.sameSiteRelationCellCount} same-site relation cells across ${article.claimCellCount} claim-like paragraphs; graph centrality ${article.graphCentrality}.`,
    instruction: "Add a same-site link only where a paragraph already warrants related Koios coverage; use the placement queue if it offers a conservative patch.",
  });
  if (finding.code === "low-settlement-depth") return Object.freeze({
    kind: "evidence-settlement" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 68,
    evidence: `Settlement depth ${article.settlementDepth}; citation coverage ${article.citationCoverage}; internal relation coverage ${article.internalRelationCoverage}.`,
    instruction: "Improve the article's support shape: add cited evidence, strengthen sectioning, and connect to related Koios coverage without adding unsupported claims.",
  });
  if (finding.code === "graph-isolated") return Object.freeze({
    kind: "internal-linking" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: 58,
    evidence: `Graph centrality ${article.graphCentrality}; no same-site inbound or outbound article relations were detected.`,
    instruction: "Review whether the article belongs in an existing Koios topic path; if it does, add one warranted same-site link or create a related assignment.",
  });
  return Object.freeze({
    kind: "evidence-settlement" as const,
    severity: finding.severity,
    findingCode: finding.code,
    priority: severityBasePriority(finding.severity),
    evidence: finding.message,
    instruction: "Review the article's predication cells and make the smallest sourced edit that improves evidence settlement.",
  });
}

function revisionPacket(article: ArticleContentQuality, predication?: ArticlePredicationMetrics): ContentRevisionPacket | undefined {
  const tasks = Object.freeze([
    ...article.findings.map((finding) => revisionTask(article, finding)),
    ...(predication === undefined ? [] : predication.findings.map((finding) => predicationRevisionTask(predication, finding))),
  ]
    .sort((left, right) => right.priority - left.priority || left.findingCode.localeCompare(right.findingCode)));
  if (tasks.length === 0) return undefined;
  return Object.freeze({
    slug: article.slug,
    path: article.path,
    headline: article.headline,
    ...(article.section === undefined ? {} : { section: article.section }),
    score: article.score,
    ...(predication === undefined ? {} : {
      settlementDepth: predication.settlementDepth,
      citationCoverage: predication.citationCoverage,
      internalRelationCoverage: predication.internalRelationCoverage,
      claimCellCount: predication.claimCellCount,
      unsupportedClaimCellCount: predication.unsupportedClaimCellCount,
    }),
    taskCount: tasks.length,
    highestPriority: tasks[0]?.priority ?? 0,
    tasks,
  });
}

export function contentRevisionBacklogReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): ContentRevisionBacklogReading {
  const quality = contentQualityReading(input);
  const predication = contentPredicationReading(input);
  const predicationBySlug = new Map(predication.byArticle.map((article) => [article.slug, article]));
  const byArticle = Object.freeze(quality.byArticle.flatMap((article) => {
    const packet = revisionPacket(article, predicationBySlug.get(article.slug));
    return packet === undefined ? [] : [packet];
  }).sort((left, right) => right.highestPriority - left.highestPriority || left.score - right.score || left.headline.localeCompare(right.headline)));
  return Object.freeze({
    department: "publishing.managing.circulating.revisions",
    articleCount: byArticle.length,
    taskCount: byArticle.reduce((sum, packet) => sum + packet.taskCount, 0),
    byArticle,
    constraints: Object.freeze([
      "Derived from content-quality and content-predication findings over public article Markdown, frontmatter, CSL references, taxonomy, and same-site link topology.",
      "Read-only: revision packets do not rewrite copy, create citations, or publish changes without operator action.",
      "Predication findings are editorial support-shape diagnostics, not automatic truth claims.",
      "No visitor identifiers, cookies, user agents, IP addresses, or reader profiles are used.",
    ]),
  });
}

export function internalLinkOpportunityReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  limitPerArticle?: number;
}>): InternalLinkOpportunityReading {
  const limit = Math.max(1, Math.min(10, input.limitPerArticle ?? 3));
  const itemBySlug = new Map(publicItems(input.items).map((item) => [item.slug, item]));
  const publicPosts = input.posts.filter((post) => publicPost(post) && itemBySlug.has(post.slug));
  const byArticle = publicPosts.flatMap((post) => {
    const item = itemBySlug.get(post.slug);
    if (item === undefined) return [];
    const currentInternalLinks = new Set(markdownLinks(post.document.body).flatMap((link) => {
      const slug = linkSlug(link);
      return slug === undefined || slug === post.slug ? [] : [slug];
    }));
    const opportunities = publicPosts
      .filter((candidate) => candidate.slug !== post.slug && !currentInternalLinks.has(candidate.slug))
      .flatMap((candidate) => {
        const targetItem = itemBySlug.get(candidate.slug);
        if (targetItem === undefined) return [];
        const opportunity = linkOpportunity(post, item, candidate, targetItem, currentInternalLinks.size);
        return opportunity === undefined ? [] : [opportunity];
      })
      .sort((left, right) => right.confidence - left.confidence || right.sharedTags.length - left.sharedTags.length || left.targetHeadline.localeCompare(right.targetHeadline))
      .slice(0, limit);
    if (opportunities.length === 0) return [];
    return [Object.freeze({
      slug: post.slug,
      headline: item.headline,
      path: itemPath(item),
      currentInternalLinkCount: currentInternalLinks.size,
      opportunities: Object.freeze(opportunities),
    })];
  });
  return Object.freeze({
    department: "publishing.managing.circulating.internal-links",
    opportunityCount: byArticle.reduce((sum, article) => sum + article.opportunities.length, 0),
    articleCount: byArticle.length,
    byArticle: Object.freeze(byArticle),
    constraints: Object.freeze([
      "This is a link-opportunity reading, not an automatic edit.",
      "Operators must place links only where the local paragraph warrants the target article.",
      "Generated from public article tags and existing same-site link topology only; no reader tracking or page-view data is used.",
    ]),
  });
}

export function internalLinkPlacementReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  limitPerArticle?: number;
}>): InternalLinkPlacementReading {
  const opportunities = internalLinkOpportunityReading(input);
  const postsBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const byArticle = opportunities.byArticle.flatMap((article) => {
    const source = postsBySlug.get(article.slug);
    if (source === undefined) return [];
    const placements = article.opportunities.flatMap((opportunity) => {
      const placement = placementForOpportunity(source, opportunity);
      return placement === undefined ? [] : [placement];
    });
    if (placements.length === 0) return [];
    return [Object.freeze({
      slug: article.slug,
      headline: article.headline,
      path: article.path,
      placements: Object.freeze(placements),
    })];
  });
  return Object.freeze({
    department: "publishing.managing.circulating.internal-link-placements",
    placementCount: byArticle.reduce((sum, article) => sum + article.placements.length, 0),
    articleCount: byArticle.length,
    byArticle: Object.freeze(byArticle),
    constraints: Object.freeze([
      "This is a paragraph-level placement packet, not an automatic edit.",
      "Suggested patches only wrap an existing shared-topic phrase; they never add claims or rewrite copy.",
      "Operators must still review whether the target article is locally warranted before editing the manuscript.",
      "Generated from public article Markdown, public tags, and same-site topology only; no reader tracking or page-view data is used.",
    ]),
  });
}

export function draftInternalLinkGuidanceReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  term: string;
  beat?: string;
  tags?: readonly string[];
  excludeSlugs?: readonly string[];
  limit?: number;
}>): DraftInternalLinkGuidanceReading {
  const term = input.term.trim();
  if (term === "") throw new TypeError("draft internal-link guidance term must be a non-empty string");
  const beat = input.beat?.trim();
  const tags = uniqueStrings(input.tags ?? []);
  const excludeSlugs = new Set((input.excludeSlugs ?? []).map((slug) => slug.trim()).filter(Boolean));
  const requestedTerms = uniqueStrings([term, ...(beat === undefined || beat === "" ? [] : [beat]), ...tags]);
  const limit = Math.max(1, Math.min(12, input.limit ?? 6));
  const postBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const suggestions = publicItems(input.items).flatMap((item) => {
    const post = postBySlug.get(item.slug);
    if (post === undefined || !publicPost(post) || excludeSlugs.has(post.slug)) return [];
    const suggestion = draftGuidanceSuggestion({
      item,
      post,
      requestedTerms,
      requestedTags: tags.length === 0 ? [term] : tags,
      ...(beat === undefined || beat === "" ? {} : { requestedBeat: beat }),
    });
    return suggestion === undefined ? [] : [suggestion];
  }).sort((left, right) => right.confidence - left.confidence || right.matchedTerms.length - left.matchedTerms.length || left.targetHeadline.localeCompare(right.targetHeadline))
    .slice(0, limit);
  return Object.freeze({
    department: "publishing.managing.circulating.drafting-internal-links",
    term,
    ...(beat === undefined || beat === "" ? {} : { beat }),
    tags,
    suggestionCount: suggestions.length,
    suggestions: Object.freeze(suggestions),
    writingInstructions: Object.freeze([
      "Use these targets while drafting, not as automatic insertions.",
      "Include at most two same-site links in a new draft unless the article is unusually long.",
      "Place a link where the paragraph already makes the target topic explicit and the target helps the reader continue the story.",
      "Do not use internal links as factual support; factual support still belongs in CSL references and body citations.",
    ]),
    constraints: Object.freeze([
      "Generated from public Koios article metadata, tags, sections, and same-site topology only.",
      "No visitor identifiers, cookies, user agents, IP addresses, browser fingerprints, or reader profiles are used.",
      "This guidance does not rewrite copy, create references, or satisfy the publication standards gate by itself.",
    ]),
  });
}

export function applyInternalLinkPlacement(input: Readonly<{
  contentDir: string;
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  placement: ApplyInternalLinkPlacementInput | unknown;
}>): ApplyInternalLinkPlacementResult {
  const requested = normalizeApplyInternalLinkPlacementInput(input.placement);
  const reading = internalLinkPlacementReading({ items: input.items, posts: input.posts });
  const article = reading.byArticle.find((candidate) => candidate.slug === requested.sourceSlug);
  const placement = article?.placements.find((candidate) =>
    candidate.targetSlug === requested.targetSlug &&
    (requested.paragraphIndex === undefined || candidate.paragraphIndex === requested.paragraphIndex));
  if (placement === undefined) throw new Error(`no current internal-link placement from ${requested.sourceSlug} to ${requested.targetSlug}`);
  if (placement.suggestedPatch === undefined) throw new Error(`placement from ${requested.sourceSlug} to ${requested.targetSlug} has no conservative patch`);
  if (requested.expectedBeforeMarkdown !== undefined && requested.expectedBeforeMarkdown !== placement.suggestedPatch.beforeMarkdown) {
    throw new Error("expectedBeforeMarkdown does not match the current placement paragraph");
  }

  const manuscript = loadManuscript(input.contentDir, requested.sourceSlug);
  const before = placement.suggestedPatch.beforeMarkdown;
  const after = placement.suggestedPatch.afterMarkdown;
  const occurrences = manuscript.document.body.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`expected exactly one paragraph match in ${requested.sourceSlug}; found ${occurrences}`);
  writeManuscript(manuscript.path, Object.freeze({
    frontMatter: manuscript.document.frontMatter,
    body: manuscript.document.body.replace(before, after),
  }));
  return Object.freeze({
    kind: "koios.circulating.internal-link-placement.applied" as const,
    sourceSlug: requested.sourceSlug,
    targetSlug: requested.targetSlug,
    path: manuscript.path,
    paragraphIndex: placement.paragraphIndex,
    beforeMarkdown: before,
    afterMarkdown: after,
    placement,
  });
}

export { normalizeApplyInternalLinkPlacementInput };
