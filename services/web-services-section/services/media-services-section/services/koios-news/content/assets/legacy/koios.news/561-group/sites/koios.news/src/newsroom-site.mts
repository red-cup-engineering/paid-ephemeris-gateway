// newsroom-site.mts — the backend surface at newsroom.koios.news: the mill's
// control panel. Read-only readings of the demand table (what gets assigned
// next and why), the mill run trace (every cycle's gates), and the view
// counts. The published gate audit lives on the public site; this surface is
// the desk the editor stands at.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { compost, farmLogPath, replayRuns } from "@emsenn/content-production/content-farm";
import type { CslItem } from "@emsenn/content/codecs/references";
import {
  createMcpApp,
  documentedResource,
  mergeApps,
  readFormBody,
  readJsonBody,
  withOpenApi,
  type App,
  type McpDispatch,
  type McpTool,
  type OpenApiMetadata,
  type Resource,
} from "@emsenn/http-server";
import { render } from "@emsenn/computing-with-the-web/theming";
import { isJsonRecord, parseLines } from "@emsenn/relating/codecs";

import { loadPosts, type KoiosPost } from "./content.mjs";
import { developingOfficeReading, type DevelopingCapability, type DevelopingOfficeReading, type EditorialMetricTask, type TopologyConstructionPattern } from "./administrating/developing/index.mjs";
import { demandTable, koiosFarmProperty, readSearchConsole, SEED_KEYWORDS, type DemandEntry } from "./demand.mjs";
import { deskWorkItems } from "./desk.mjs";
import { DEFAULT_CONTENT_DIR, DEFAULT_DATA_DIR, KOIOS_EDITOR, KOIOS_SITE_URL, KOIOS_TITLE, koiosMasthead } from "./index.mjs";
import { escapeHtml } from "./markdown.mjs";
import { newsroomDepartmentsReading } from "./newsroom/departments.mjs";
import { koiosItems } from "./surface.mjs";
import {
  completeAssignment,
  createAssignment,
  createAssignmentInputFromDemand,
  createAssignmentJsonSchema,
  createAssignmentNoteJsonSchema,
  normalizeCreateAssignmentInput,
  normalizeCreateAssignmentNoteInput,
  readAssignment,
  readAssignmentActivity,
  readAssignments,
  recordAssignmentNote,
  type AssignmentReading,
  type AssignmentActivityReading,
  type CompleteAssignmentResult,
  type CreateAssignmentNoteResult,
  type CreateAssignmentInput,
  type CreateAssignmentResult,
} from "./researching/writing/assignments.mjs";
import {
  createAssignmentDraftJsonSchema,
  createDraftManuscript,
  createDraftManuscriptJsonSchema,
  normalizeCreateAssignmentDraftInput,
  normalizeCreateDraftManuscriptInput,
  referencesFromSourceUrls,
  type CreateDraftManuscriptResult,
} from "./researching/writing/manuscripts.mjs";
import {
  koiosSourceCyclePlan,
  runKoiosSourceCycle,
  sourceCycleRepairPacketsReading,
  type SourceCycleRepairPacket,
  type SourceCycleRepairPacketsReading,
} from "./researching/sourcing/source-cycle.mjs";
import { researchPacket, researchPacketJsonSchema, type ResearchPacket } from "./researching/sourcing/research-packets.mjs";
import { sourceRollReading } from "./researching/sourcing/sources.mjs";
import { keywordDiscoveryReading, googleTrendsProbe } from "./researching/sourcing/discovery.mjs";
import {
  applyStandardsMetadataDefaults,
  normalizeManuscriptReferences,
  publishManuscript,
  repairManuscriptHeadings,
  repairManuscriptSeoHeading,
  reviewManuscriptDocument,
  reviewManuscriptStandards,
  type ApplyStandardsDefaultsResult,
  type NormalizeManuscriptReferencesResult,
  type PublishManuscriptResult,
  type RepairManuscriptHeadingsResult,
  type RepairManuscriptSeoHeadingResult,
  type StandardsReview,
} from "./researching/writing/editing/standards.mjs";
import {
  adPerformanceJsonSchema,
  normalizeAdPerformanceInput,
  readAdPerformance,
  recordAdPerformance,
} from "./researching/writing/editing/publishing/managing/advertising/index.mjs";
import { applyInternalLinkPlacement, applyInternalLinkPlacementJsonSchema, contentGraphReading, contentPerformanceReading, contentPredicationPacket, contentPredicationReading, contentQualityReading, contentRevisionBacklogReading, correctionRegisterReading, draftInternalLinkGuidanceReading, internalLinkOpportunityReading, internalLinkPlacementReading, type ApplyInternalLinkPlacementResult, type ArticleContentQuality, type ArticlePredicationMetrics, type ContentGraphNode, type ContentGraphReading, type ContentPredicationReading, type ContentQualityReading, type ContentRevisionBacklogReading, type ContentRevisionPacket, type CorrectionRegisterReading, type DraftInternalLinkGuidanceReading, type InternalLinkPlacementReading } from "./researching/writing/editing/publishing/managing/circulating/index.mjs";
import { koiosTheme } from "./theme.mjs";
import { ViewTrace, type ViewCounts } from "./views.mjs";

export type MillRunRecord = Readonly<{
  term?: string;
  beat?: string;
  slug?: string;
  shipped?: boolean;
  gates?: readonly Readonly<{ gate?: string; charge?: string; evidence?: string }>[];
  usage?: Readonly<{ calls?: number; tokens?: number }>;
  t?: string;
  obstruction?: string;
  evidence?: string;
  story?: Readonly<{ title?: string; url?: string }>;
}>;

export type KoiosNewsroomOptions = Readonly<{
  contentDir?: string;
  dataDir?: string;
}>;

export type PublicationGameReading = Readonly<{
  kind: "koios.publication-game";
  site: Readonly<{ name: string; url: string; editor: string }>;
  generatedAt: string;
  arena: Readonly<{
    property: string;
    beats: readonly string[];
    sourceCounts: Readonly<Record<string, number>>;
  }>;
  demand: Readonly<{
    next: DemandEntry | null;
    count: number;
    byBeat: Readonly<Record<string, readonly DemandEntry[]>>;
  }>;
  desk: Readonly<{
    reviewSkill: string;
    openCandidateCount: number;
    workItems: ReturnType<typeof deskWorkItems>;
  }>;
  runs: Readonly<{
    count: number;
    shipped: number;
    withheld: number;
    obstructed: number;
    recent: readonly Readonly<Record<string, unknown>>[];
  }>;
  compost: Readonly<{
    count: number;
    recent: ReturnType<typeof compost>;
  }>;
  surfaces: Readonly<{
    newsroom: string;
    demand: string;
    runs: string;
    views: string;
  }>;
}>;

export type OperatorManuscriptReading = Readonly<{
  kind: "koios.newsroom.operator-manuscript";
  slug: string;
  title: string;
  draft: boolean;
  date?: string;
  publicUrl: string;
  standardsUrl: string;
  standardsHtmlUrl: string;
  publishUrl: string;
  publishHtmlUrl: string;
  standardsDefaultsUrl: string;
  standardsDefaultsHtmlUrl: string;
  referencesNormalizeUrl: string;
  referencesNormalizeHtmlUrl: string;
  headingsRepairUrl: string;
  headingsRepairHtmlUrl: string;
  seoHeadingRepairUrl: string;
  seoHeadingRepairHtmlUrl: string;
  workState: "needs-editing" | "ready-to-publish" | "published-standards-clear";
  suggestedAction?: "normalize-references" | "apply-standards-defaults" | "repair-headings" | "repair-seo-heading" | "review-copy" | "publish" | "none";
  standards: Readonly<{
    publishable: boolean;
    wordCount: number;
    referenceCount: number;
    seoTerm?: string;
    errorCount: number;
    warningCount: number;
    findings: StandardsReview["findings"];
  }>;
}>;

export type OperatorAssignmentWorkOrder = Readonly<{
  kind: "koios.newsroom.assignment-work-order";
  assignment: AssignmentReading;
  actions: Readonly<{
    htmlUrl: string;
    jsonUrl: string;
    activityHtmlUrl: string;
    activityJsonUrl: string;
    noteHtmlUrl: string;
    noteJsonUrl: string;
    researchPacketUrl: string;
    draftHtmlUrl?: string;
    draftJsonUrl?: string;
    completeHtmlUrl?: string;
    completeJsonUrl?: string;
    manuscriptUrl?: string;
  }>;
  operatorNotes: readonly string[];
}>;

export type OperatorWorkQueueLane = "drafting" | "editing" | "publishing" | "source-cycle";

export type OperatorWorkQueueItem = Readonly<{
  kind: "assignment" | "manuscript" | "content-graph" | "content-revision" | "source-cycle-repair";
  lane: OperatorWorkQueueLane;
  priority: number;
  title: string;
  state: string;
  href: string;
  jsonHref?: string;
  actionLabel?: string;
  actionHref?: string;
  note?: string;
}>;

export type OperatorWorkQueueReading = Readonly<{
  kind: "koios.newsroom.operator-work-queue";
  generatedAt: string;
  itemCount: number;
  openAssignmentCount: number;
  lanes: Readonly<Record<OperatorWorkQueueLane, readonly OperatorWorkQueueItem[]>>;
  top: readonly OperatorWorkQueueItem[];
  policy: readonly string[];
}>;

export type PublicationCandidate = Readonly<{
  slug: string;
  title: string;
  status: "ready-to-publish" | "editorial-hold" | "one-click-repair" | "copy-edit-required";
  publicationDistance: number;
  nextAction: NonNullable<OperatorManuscriptReading["suggestedAction"]> | "review-source-cycle";
  nextActionLabel: string;
  nextActionHref: string;
  standardsHref: string;
  standardsJsonHref: string;
  publicHref: string;
  editorialHold: boolean;
  sourceCycleRepairHref?: string;
  sourceCycleRepairJsonHref?: string;
  sourceCycleTaskCount?: number;
  sourceCycleHighestPriority?: number;
  sourceCycleWarnings: readonly string[];
  wordCount: number;
  missingWords: number;
  referenceCount: number;
  errorCount: number;
  warningCount: number;
  findingCodes: readonly string[];
  note: string;
}>;

export type PublicationCandidatesReading = Readonly<{
  kind: "koios.newsroom.publication-candidates";
  generatedAt: string;
  draftCount: number;
  publishableDraftCount: number;
  editorialHoldCount: number;
  oneClickRepairCount: number;
  copyEditRequiredCount: number;
  candidates: readonly PublicationCandidate[];
  policy: readonly string[];
}>;

type SemanticHypertextPacketEntry = Readonly<{
  e: string;
  a: string;
  v: unknown;
  evidence?: string;
  href?: string;
}>;

type StoredDraftInternalLinkGuidance = Readonly<{
  targetSlug: string;
  targetPath: string;
  targetHeadline: string;
  matchedTerms: readonly string[];
  confidence: number;
  markdownLink: string;
  writingGuidance: string;
}>;

/** Replay the mill's run trace. Unparseable lines are held aside, not folded. */
export function replayMillRuns(dataDir: string): readonly MillRunRecord[] {
  const path = farmLogPath(dataDir, "mill-runs.jsonl");
  if (!existsSync(path)) return Object.freeze([]);
  const runs: MillRunRecord[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    if (isJsonRecord(parsed) && typeof parsed.term === "string") {
      runs.push(Object.freeze(parsed as unknown as MillRunRecord));
    }
  }
  return Object.freeze(runs);
}

function manuscriptWorkState(review: StandardsReview): OperatorManuscriptReading["workState"] {
  if (!review.publishable) return "needs-editing";
  return review.draft ? "ready-to-publish" : "published-standards-clear";
}

function suggestedManuscriptAction(review: StandardsReview): NonNullable<OperatorManuscriptReading["suggestedAction"]> {
  if (review.findings.some((finding) => finding.code === "article-sources-field")) return "normalize-references";
  if (review.findings.some((finding) => finding.code === "malformed-h2-heading")) return "repair-headings";
  if (review.findings.some((finding) => finding.code === "seo-term-missing-h2")) return "repair-seo-heading";
  const defaultsRepairCodes = new Set(["missing-license", "missing-license-url", "legacy-rights-reserved-license", "missing-syndication-rights"]);
  const hasDefaultsRepair = review.findings.some((finding) => defaultsRepairCodes.has(finding.code));
  const onlyDefaultsBlocking = review.findings.every((finding) => finding.severity !== "error" || defaultsRepairCodes.has(finding.code));
  if (hasDefaultsRepair && onlyDefaultsBlocking) return "apply-standards-defaults";
  if (review.publishable) return review.draft ? "publish" : "none";
  return "review-copy";
}

function manuscriptInventory(contentDir: string, posts: readonly KoiosPost[]): readonly OperatorManuscriptReading[] {
  return Object.freeze(posts.map((post) => {
    const review = reviewManuscriptDocument(join(contentDir, `${post.slug}.md`), post.slug, post.document);
    const errorCount = review.findings.filter((finding) => finding.severity === "error").length;
    const warningCount = review.findings.filter((finding) => finding.severity === "warning").length;
    const date = typeof post.document.frontMatter["date"] === "string" ? post.document.frontMatter["date"] : undefined;
    const title = String(post.document.frontMatter["title"] ?? post.slug);
    return Object.freeze({
      kind: "koios.newsroom.operator-manuscript" as const,
      slug: post.slug,
      title,
      draft: review.draft,
      ...(date === undefined ? {} : { date }),
      publicUrl: `${KOIOS_SITE_URL}/posts/${encodeURIComponent(post.slug)}`,
      standardsUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/standards`,
      standardsHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/standards.html`,
      publishUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/publish`,
      publishHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/publish.html`,
      standardsDefaultsUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/standards/defaults`,
      standardsDefaultsHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/standards/defaults.html`,
      referencesNormalizeUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/references/normalize`,
      referencesNormalizeHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/references/normalize.html`,
      headingsRepairUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/headings/repair`,
      headingsRepairHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/headings/repair.html`,
      seoHeadingRepairUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/headings/seo`,
      seoHeadingRepairHtmlUrl: `/operators/manuscripts/${encodeURIComponent(post.slug)}/headings/seo.html`,
      workState: manuscriptWorkState(review),
      suggestedAction: suggestedManuscriptAction(review),
      standards: Object.freeze({
        publishable: review.publishable,
        wordCount: review.wordCount,
        referenceCount: review.referenceCount,
        ...(review.seoTerm === undefined ? {} : { seoTerm: review.seoTerm }),
        errorCount,
        warningCount,
        findings: review.findings,
      }),
    });
  }));
}

function internalLinkPlacementQueueHtml(reading: InternalLinkPlacementReading): string {
  const placements = reading.byArticle
    .flatMap((article) => article.placements)
    .filter((placement) => placement.suggestedPatch !== undefined)
    .sort((left, right) => right.confidence - left.confidence || left.sourceHeadline.localeCompare(right.sourceHeadline))
    .slice(0, 5);
  if (placements.length === 0) return "<p>No conservative internal-link patches are queued.</p>";
  return placements.map((placement) => [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(`${KOIOS_SITE_URL}${placement.sourcePath}`)}">${escapeHtml(placement.sourceHeadline)}</a> -> <a href="${escapeHtml(`${KOIOS_SITE_URL}${placement.targetPath}`)}">${escapeHtml(placement.targetHeadline)}</a></h3>`,
    `<p>${escapeHtml(placement.paragraphPreview)}</p>`,
    `<p>${escapeHtml(placement.sharedTags.join(" · "))} · confidence ${placement.confidence.toFixed(2)}</p>`,
    `<form method="post" action="/operators/content/internal-link-placements/form">`,
    `<input type="hidden" name="sourceSlug" value="${escapeHtml(placement.sourceSlug)}">`,
    `<input type="hidden" name="targetSlug" value="${escapeHtml(placement.targetSlug)}">`,
    `<input type="hidden" name="paragraphIndex" value="${placement.paragraphIndex}">`,
    `<textarea name="expectedBeforeMarkdown" hidden>${escapeHtml(placement.suggestedPatch?.beforeMarkdown ?? "")}</textarea>`,
    `<button type="submit">Apply link</button>`,
    `</form>`,
    `</article>`,
  ].join("\n")).join("\n");
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function stringArrayValue(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.flatMap((item) => typeof item === "string" && item.trim() !== "" ? [item.trim()] : []));
}

function storedDraftInternalLinkGuidance(posts: readonly KoiosPost[], slug: string): readonly StoredDraftInternalLinkGuidance[] {
  const post = posts.find((candidate) => candidate.slug === slug);
  const koios = recordValue(post?.document.frontMatter["koios"]);
  const raw = koios["draft_internal_link_guidance"];
  if (!Array.isArray(raw)) return Object.freeze([]);
  return Object.freeze(raw.flatMap((item): StoredDraftInternalLinkGuidance[] => {
    const record = recordValue(item);
    const targetSlug = typeof record["targetSlug"] === "string" ? record["targetSlug"] : undefined;
    const targetPath = typeof record["targetPath"] === "string" ? record["targetPath"] : undefined;
    const targetHeadline = typeof record["targetHeadline"] === "string" ? record["targetHeadline"] : undefined;
    const markdownLink = typeof record["markdownLink"] === "string" ? record["markdownLink"] : undefined;
    const writingGuidance = typeof record["writingGuidance"] === "string" ? record["writingGuidance"] : undefined;
    const confidence = typeof record["confidence"] === "number" && Number.isFinite(record["confidence"]) ? record["confidence"] : undefined;
    if (targetSlug === undefined || targetPath === undefined || targetHeadline === undefined || markdownLink === undefined || writingGuidance === undefined || confidence === undefined) return [];
    return [Object.freeze({
      targetSlug,
      targetPath,
      targetHeadline,
      matchedTerms: stringArrayValue(record["matchedTerms"]),
      confidence,
      markdownLink,
      writingGuidance,
    })];
  }));
}

function storedDraftInternalLinkGuidanceHtml(guidance: readonly StoredDraftInternalLinkGuidance[]): string {
  if (guidance.length === 0) return "";
  const items = guidance.map((suggestion) => [
    `<li>`,
    `<a href="${escapeHtml(`${KOIOS_SITE_URL}${suggestion.targetPath}`)}">${escapeHtml(suggestion.targetHeadline)}</a>`,
    ` · confidence ${suggestion.confidence.toFixed(2)}`,
    suggestion.matchedTerms.length === 0 ? "" : ` · ${suggestion.matchedTerms.map(escapeHtml).join(" · ")}`,
    `<br><code>${escapeHtml(suggestion.markdownLink)}</code>`,
    `<br>${escapeHtml(suggestion.writingGuidance)}`,
    `</li>`,
  ].join("")).join("\n");
  return [
    `<section aria-labelledby="draft-link-guidance-title">`,
    `<h2 id="draft-link-guidance-title">Same-site links to consider</h2>`,
    `<p>The source cycle stored these suggestions when it created or refreshed the draft. They are composition guidance, not factual references.</p>`,
    `<ol>${items}</ol>`,
    `</section>`,
  ].join("\n");
}

function draftInternalLinkGuidanceHtml(reading: DraftInternalLinkGuidanceReading): string {
  if (reading.suggestions.length === 0) {
    return `<p>No same-site drafting links are suggested for <code>${escapeHtml(reading.term)}</code>.</p>`;
  }
  const items = reading.suggestions.map((suggestion) => [
    `<li>`,
    `<a href="${escapeHtml(`${KOIOS_SITE_URL}${suggestion.targetPath}`)}">${escapeHtml(suggestion.targetHeadline)}</a>`,
    ` · confidence ${suggestion.confidence.toFixed(2)}`,
    suggestion.section === undefined ? "" : ` · ${escapeHtml(suggestion.section)}`,
    `<br><code>${escapeHtml(suggestion.markdownLink)}</code>`,
    `<br>${escapeHtml(suggestion.writingGuidance)}`,
    `</li>`,
  ].join("")).join("\n");
  return [
    `<p>${reading.suggestionCount} candidate same-site ${reading.suggestionCount === 1 ? "link" : "links"} for <code>${escapeHtml(reading.term)}</code>. Use these while drafting only where the paragraph warrants the link.</p>`,
    `<ol>${items}</ol>`,
  ].join("\n");
}

function contentQualityArticleHtml(article: ArticleContentQuality): string {
  const findings = article.findings.slice(0, 5).map((finding) =>
    `<li><strong>${escapeHtml(finding.severity)}</strong> ${escapeHtml(finding.code)}: ${escapeHtml(finding.message)}</li>`).join("\n");
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(`${KOIOS_SITE_URL}${article.path}`)}">${escapeHtml(article.headline)}</a></h3>`,
    `<p>Score ${article.score} · ${article.wordCount} words · ${article.h2Count} H2s · ${article.internalLinkCount} internal links · ${article.referenceCount} references · ${article.referenceDomainCount} citation domains</p>`,
    article.seoTerm === undefined ? "" : `<p>SEO term: <code>${escapeHtml(article.seoTerm)}</code> · ${article.seoTermOccurrences} uses · ${article.seoTermDensity} per 100 words · first paragraph ${article.seoTermInFirstParagraph ? "yes" : "no"} · H2 ${article.seoTermInH2 ? "yes" : "no"}</p>`,
    article.malformedH2Count === 0 ? "" : `<p>Heading integrity: ${article.malformedH2Count} H2 ${article.malformedH2Count === 1 ? "line needs" : "lines need"} copy separation.</p>`,
    article.correctionCount === 0 ? "" : `<p>Corrections: ${article.correctionCount} · surface coverage ${article.correctionSurfaceCoverage} · implicit ${article.implicitCorrectionSurfaceCount} · incomplete ${article.incompleteCorrectionSurfaceCount}</p>`,
    findings === "" ? "<p>No findings.</p>" : `<ul>${findings}</ul>`,
    `<p><a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(article.slug))}/standards.html">Standards review</a> · <a href="/operators/content/revisions">Revision backlog</a> · <a href="/operators/content/internal-link-placements.json">Internal-link placements</a></p>`,
    `</article>`,
  ].filter(Boolean).join("\n");
}

function contentQualityBoardHtml(reading: ContentQualityReading): string {
  const articles = reading.byArticle.slice(0, 25).map(contentQualityArticleHtml).join("\n");
  const body = [
    `<article>`,
    `<h1>Content quality</h1>`,
    `<p>${reading.publicArticleCount} public articles · average score ${reading.averageScore} · ${reading.attentionCount} attention findings · ${reading.warningCount} warnings · ${reading.blockerCount} blockers.</p>`,
    `<p>${reading.aggregate.articlesWithNoInternalLinks} without internal links · ${reading.aggregate.articlesWithThinReferences} with thin references · ${reading.aggregate.articlesMissingSeoPlacement} missing SEO placement · ${reading.aggregate.articlesWithThinTopicDepth} with thin topic depth.</p>`,
    `<p>${reading.aggregate.articlesWithSeoTermStuffing} with repetitive SEO phrasing · ${reading.aggregate.articlesWithMalformedH2} with malformed H2 headings.</p>`,
    `<p>${reading.aggregate.articlesWithCorrections} with corrections · ${reading.aggregate.articlesWithImplicitCorrectionSurfaces} relying on default correction surfaces · ${reading.aggregate.articlesWithIncompleteCorrectionSurfaces} with incomplete correction surfaces.</p>`,
    `<p><a href="/operators/content/quality.json">quality JSON</a> · <a href="/operators/content/predication">predication board</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/operators/content/revisions.json">revision JSON</a> · <a href="/operators/content/internal-link-placements.json">internal-link packets JSON</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section aria-labelledby="quality-backlog-title">`,
    `<h2 id="quality-backlog-title">Lowest-scoring articles</h2>`,
    articles === "" ? "<p>No public articles found.</p>" : articles,
    `</section>`,
  ].join("\n");
  return newsroomPage("Content quality", body, "/operators/content/quality");
}

function contentGraphArticleHtml(node: ContentGraphNode): string {
  const encoded = encodeURIComponent(node.slug);
  const suggestions = node.suggestedInternalTargets.length === 0
    ? "none from shared tags"
    : node.suggestedInternalTargets.slice(0, 6).join(", ");
  const references = node.referenceDomains.length === 0 ? "" : `<p>Reference domains: ${escapeHtml(node.referenceDomains.join(", "))}</p>`;
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(`${KOIOS_SITE_URL}${node.path}`)}">${escapeHtml(node.headline)}</a></h3>`,
    `<p>${node.section === undefined ? "uncategorized" : escapeHtml(node.section)} · centrality ${node.graphCentrality} · ${node.inboundInternalLinks.length} inbound · ${node.outboundInternalLinks.length} outbound · ${node.orphan ? "orphan" : "has inbound"} · ${node.isolated ? "isolated" : "connected"}</p>`,
    `<p>Suggested targets: ${escapeHtml(suggestions)}</p>`,
    references,
    `<p><a href="/operators/content/predication/${escapeHtml(encoded)}">Predication packet</a> · <a href="/operators/content/revisions/${escapeHtml(encoded)}">Revision packet</a> · <a href="/operators/content/internal-link-placements.json">Internal-link placements</a></p>`,
    `<form method="post" action="/operators/content/graph/${escapeHtml(encoded)}/assign.html"><button type="submit">Create topology assignment</button></form>`,
    `</article>`,
  ].filter(Boolean).join("\n");
}

function contentGraphBoardHtml(reading: ContentGraphReading): string {
  const sectionRows = Object.entries(reading.bySection).map(([section, bucket]) =>
    `<tr><td>${escapeHtml(section)}</td><td>${bucket.articleCount}</td><td>${bucket.edgeCount}</td><td>${bucket.orphanCount}</td><td>${bucket.isolatedCount}</td></tr>`).join("\n");
  const articles = reading.byArticle.filter((node) => node.orphan || node.isolated || node.outboundInternalLinks.length === 0).slice(0, 30).map(contentGraphArticleHtml).join("\n");
  const edges = reading.edges.slice(0, 30).map((edge) =>
    `<li><a href="${escapeHtml(`${KOIOS_SITE_URL}${edge.sourcePath}`)}">${escapeHtml(edge.sourceHeadline)}</a> -> <a href="${escapeHtml(`${KOIOS_SITE_URL}${edge.targetPath}`)}">${escapeHtml(edge.targetHeadline)}</a> · ${edge.linkCount} ${edge.linkCount === 1 ? "link" : "links"} · ${edge.sameSection ? "same section" : "cross-section"}${edge.sharedTags.length === 0 ? "" : ` · shared tags ${escapeHtml(edge.sharedTags.join(", "))}`}</li>`).join("\n");
  const body = [
    `<article>`,
    `<h1>Content graph</h1>`,
    `<p>${reading.publicArticleCount} public articles · ${reading.edgeCount} same-site edges · ${reading.orphanCount} orphans · ${reading.isolatedCount} isolated · average out-degree ${reading.averageOutDegree}.</p>`,
    `<p><a href="/operators/content/graph.json">graph JSON</a> · <a href="/operators/content/internal-links.json">internal-link opportunities</a> · <a href="/operators/content/internal-link-placements.json">internal-link placements</a> · <a href="/operators/content/predication">predication board</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section aria-labelledby="graph-sections-title">`,
    `<h2 id="graph-sections-title">Sections</h2>`,
    sectionRows === "" ? "<p>No section buckets.</p>" : `<table><thead><tr><th>section</th><th>articles</th><th>edges</th><th>orphans</th><th>isolated</th></tr></thead><tbody>${sectionRows}</tbody></table>`,
    `</section>`,
    `<section aria-labelledby="graph-attention-title">`,
    `<h2 id="graph-attention-title">Needs topology work</h2>`,
    articles === "" ? "<p>No orphaned or isolated articles found.</p>" : articles,
    `</section>`,
    `<section aria-labelledby="graph-edges-title">`,
    `<h2 id="graph-edges-title">Recent edge sample</h2>`,
    edges === "" ? "<p>No same-site article edges found.</p>" : `<ol>${edges}</ol>`,
    `</section>`,
  ].join("\n");
  return newsroomPage("Content graph", body, "/operators/content/graph");
}

function predicationCellsHtml(article: ArticlePredicationMetrics, limit: number): string {
  return article.cells.slice(0, limit).map((cell) => {
    const references = cell.citedReferenceIds.length === 0 ? "" : ` · cites ${escapeHtml(cell.citedReferenceIds.join(", "))}`;
    const targets = cell.internalTargets.length === 0 ? "" : ` · links ${escapeHtml(cell.internalTargets.join(", "))}`;
    return [
      `<li>`,
      `<strong>${escapeHtml(cell.kind)}</strong> · paragraph ${cell.paragraphIndex} · confidence ${cell.confidence.toFixed(2)}${references}${targets}`,
      cell.heading === undefined ? "" : `<br>Heading: ${escapeHtml(cell.heading)}`,
      `<br>${escapeHtml(cell.textPreview)}`,
      `</li>`,
    ].filter(Boolean).join("");
  }).join("\n");
}

function contentPredicationArticleHtml(article: ArticlePredicationMetrics): string {
  const findings = article.findings.slice(0, 5).map((finding) =>
    `<li><strong>${escapeHtml(finding.severity)}</strong> ${escapeHtml(finding.code)}: ${escapeHtml(finding.message)}</li>`).join("\n");
  const cells = predicationCellsHtml(article, 6);
  const encoded = encodeURIComponent(article.slug);
  const packetUrl = `/operators/content/predication/${encoded}`;
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(packetUrl)}">${escapeHtml(article.headline)}</a></h3>`,
    `<p>Settlement ${article.settlementDepth} · citation coverage ${article.citationCoverage} · relation coverage ${article.internalRelationCoverage} · graph centrality ${article.graphCentrality}${article.freshnessDays === undefined ? "" : ` · ${article.freshnessDays} days old`}</p>`,
    `<p>${article.claimCellCount} claim-like cells · ${article.evidenceCellCount} evidence cells · ${article.sameSiteRelationCellCount} same-site relation cells · ${article.unsupportedClaimCellCount} unsupported cells · ${article.headingCellCount} structure cells</p>`,
    findings === "" ? "<p>No findings.</p>" : `<ul>${findings}</ul>`,
    cells === "" ? "<p>No predication cells were surfaced for preview.</p>" : `<ol>${cells}</ol>`,
    `<p><a href="${escapeHtml(packetUrl)}">Predication packet</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}${article.path}`)}">Public article</a> · <a href="/operators/content/revisions/${escapeHtml(encoded)}">Revision packet</a> · <a href="/operators/manuscripts/${escapeHtml(encoded)}/standards.html">Standards review</a> · <a href="/operators/content/internal-link-placements.json">Internal-link placements</a></p>`,
    `</article>`,
  ].join("\n");
}

function contentPredicationPacketDetailHtml(article: ArticlePredicationMetrics): string {
  const encoded = encodeURIComponent(article.slug);
  const findings = article.findings.map((finding) =>
    `<li><strong>${escapeHtml(finding.severity)}</strong> ${escapeHtml(finding.code)}: ${escapeHtml(finding.message)}</li>`).join("\n");
  const cells = predicationCellsHtml(article, 80);
  const body = [
    `<article>`,
    `<h1>Predication packet</h1>`,
    `<p><strong>${escapeHtml(article.headline)}</strong></p>`,
    `<p>Settlement ${article.settlementDepth} · citation coverage ${article.citationCoverage} · relation coverage ${article.internalRelationCoverage} · graph centrality ${article.graphCentrality}${article.freshnessDays === undefined ? "" : ` · ${article.freshnessDays} days old`}</p>`,
    `<p>${article.claimCellCount} claim-like cells · ${article.evidenceCellCount} evidence cells · ${article.sameSiteRelationCellCount} same-site relation cells · ${article.unsupportedClaimCellCount} unsupported cells · ${article.headingCellCount} structure cells</p>`,
    `<p><a href="${escapeHtml(`${KOIOS_SITE_URL}${article.path}`)}">public article</a> · <a href="/operators/content/predication/${escapeHtml(encoded)}.json">packet JSON</a> · <a href="/operators/content/predication">predication board</a> · <a href="/operators/content/revisions/${escapeHtml(encoded)}">revision packet</a> · <a href="/operators/manuscripts/${escapeHtml(encoded)}/standards.html">standards review</a> · <a href="/operators/content/internal-link-placements.json">internal-link packets</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section aria-labelledby="predication-findings-title">`,
    `<h2 id="predication-findings-title">Findings</h2>`,
    findings === "" ? "<p>No findings.</p>" : `<ul>${findings}</ul>`,
    `</section>`,
    `<section aria-labelledby="predication-cells-title">`,
    `<h2 id="predication-cells-title">Cells</h2>`,
    cells === "" ? "<p>No predication cells were surfaced for this article.</p>" : `<ol>${cells}</ol>`,
    `</section>`,
  ].join("\n");
  return newsroomPage("Predication packet", body, `/operators/content/predication/${encoded}`);
}

function contentPredicationBoardHtml(reading: ContentPredicationReading): string {
  const articles = reading.byArticle.slice(0, 25).map(contentPredicationArticleHtml).join("\n");
  const body = [
    `<article>`,
    `<h1>Content predication</h1>`,
    `<p>${reading.publicArticleCount} public articles · average settlement ${reading.aggregate.averageSettlementDepth} · average citation coverage ${reading.aggregate.averageCitationCoverage} · average relation coverage ${reading.aggregate.averageInternalRelationCoverage} · average graph centrality ${reading.aggregate.averageGraphCentrality}.</p>`,
    `<p>${reading.aggregate.claimCells} claim-like cells · ${reading.aggregate.evidenceCells} evidence cells · ${reading.aggregate.sameSiteRelationCells} same-site relation cells · ${reading.aggregate.unsupportedClaimCells} unsupported cells.</p>`,
    `<p>${reading.aggregate.articlesWithUnsupportedClaims} with unsupported claims · ${reading.aggregate.articlesWithNoEvidenceCells} with no evidence cells · ${reading.aggregate.articlesWithNoRelationCells} with no same-site relation cells.</p>`,
    `<p><a href="/operators/content/predication.json">predication JSON</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/operators/content/quality">quality board</a> · <a href="/operators/content/internal-link-placements.json">internal-link packets JSON</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section aria-labelledby="predication-backlog-title">`,
    `<h2 id="predication-backlog-title">Weakest settlement articles</h2>`,
    articles === "" ? "<p>No public articles found.</p>" : articles,
    `</section>`,
  ].join("\n");
  return newsroomPage("Content predication", body, "/operators/content/predication");
}

function contentRevisionPacketHtml(packet: ContentRevisionPacket): string {
  const packetUrl = `/operators/content/revisions/${encodeURIComponent(packet.slug)}`;
  const predication = packet.settlementDepth === undefined
    ? ""
    : ` · settlement ${packet.settlementDepth} · citation coverage ${packet.citationCoverage ?? 0} · relation coverage ${packet.internalRelationCoverage ?? 0}`;
  const tasks = packet.tasks.map((task) => [
    `<li>`,
    `<strong>${escapeHtml(task.kind)}</strong> · priority ${task.priority} · ${escapeHtml(task.severity)} · <code>${escapeHtml(task.findingCode)}</code>`,
    `<br>${escapeHtml(task.evidence)}`,
    `<br>${escapeHtml(task.instruction)}`,
    `</li>`,
  ].join("")).join("\n");
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(packetUrl)}">${escapeHtml(packet.headline)}</a></h3>`,
    `<p>Score ${packet.score}${predication} · ${packet.taskCount} revision ${packet.taskCount === 1 ? "task" : "tasks"} · top priority ${packet.highestPriority}${packet.section === undefined ? "" : ` · ${escapeHtml(packet.section)}`}</p>`,
    `<ol>${tasks}</ol>`,
    `<p><a href="${escapeHtml(`${KOIOS_SITE_URL}${packet.path}`)}">Public article</a> · <a href="/operators/content/predication/${escapeHtml(encodeURIComponent(packet.slug))}">Predication packet</a> · <a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(packet.slug))}/standards.html">Standards review</a> · <a href="/operators/content/internal-link-placements.json">Internal-link placements</a></p>`,
    `</article>`,
  ].join("\n");
}

function contentRevisionPacketDetailHtml(packet: ContentRevisionPacket): string {
  const predication = packet.settlementDepth === undefined
    ? ""
    : `<p>Settlement depth ${packet.settlementDepth} · citation coverage ${packet.citationCoverage ?? 0} · internal relation coverage ${packet.internalRelationCoverage ?? 0} · unsupported claim cells ${packet.unsupportedClaimCellCount ?? 0}/${packet.claimCellCount ?? 0}</p>`;
  const tasks = packet.tasks.map((task) => [
    `<article class="operator-work-item">`,
    `<h3>${escapeHtml(task.kind)} · priority ${task.priority}</h3>`,
    `<p>${escapeHtml(task.severity)} · <code>${escapeHtml(task.findingCode)}</code></p>`,
    `<p>${escapeHtml(task.evidence)}</p>`,
    `<p>${escapeHtml(task.instruction)}</p>`,
    `</article>`,
  ].join("\n")).join("\n");
  const encoded = encodeURIComponent(packet.slug);
  const body = [
    `<article>`,
    `<h1>Revision packet</h1>`,
    `<p><strong>${escapeHtml(packet.headline)}</strong></p>`,
    `<p>Score ${packet.score} · ${packet.taskCount} revision ${packet.taskCount === 1 ? "task" : "tasks"} · top priority ${packet.highestPriority}${packet.section === undefined ? "" : ` · ${escapeHtml(packet.section)}`}</p>`,
    predication,
    `<p><a href="${escapeHtml(`${KOIOS_SITE_URL}${packet.path}`)}">public article</a> · <a href="/operators/content/revisions/${escapeHtml(encoded)}.json">packet JSON</a> · <a href="/operators/content/revisions/${escapeHtml(encoded)}.packet.html">semantic packet</a> · <a href="/operators/content/predication/${escapeHtml(encoded)}">predication packet</a> · <a href="/operators/content/predication/${escapeHtml(encoded)}.json">predication JSON</a> · <a href="/operators/manuscripts/${escapeHtml(encoded)}/standards.html">standards review</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/operators/content/internal-link-placements.json">internal-link packets</a> · <a href="/">Desk</a></p>`,
    `<form method="post" action="/operators/content/revisions/${escapeHtml(encoded)}/assign.html"><button type="submit">Create revision assignment</button></form>`,
    `</article>`,
    `<section aria-labelledby="revision-tasks-title">`,
    `<h2 id="revision-tasks-title">Tasks</h2>`,
    tasks === "" ? "<p>No revision tasks are queued for this article.</p>" : tasks,
    `</section>`,
  ].join("\n");
  return newsroomPage("Revision packet", body, `/operators/content/revisions/${encoded}`);
}

function packetValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  return JSON.stringify(value);
}

function semanticHypertextPacketDocument(title: string, canonicalPath: string, subject: string, entries: readonly SemanticHypertextPacketEntry[], links: readonly Readonly<{ href: string; label: string }>[]): string {
  const rows = entries.map((entry) => {
    const value = packetValue(entry.v);
    return [
      `<section class="eavt-cell" data-e="${escapeHtml(entry.e)}" data-a="${escapeHtml(entry.a)}" data-v="${escapeHtml(value)}">`,
      `<h2>${escapeHtml(entry.a)}</h2>`,
      `<p><code>${escapeHtml(entry.e)}</code></p>`,
      entry.href === undefined ? `<p>${escapeHtml(value)}</p>` : `<p><a href="${escapeHtml(entry.href)}">${escapeHtml(value)}</a></p>`,
      entry.evidence === undefined ? "" : `<p data-a="evidence">${escapeHtml(entry.evidence)}</p>`,
      `</section>`,
    ].filter(Boolean).join("\n");
  }).join("\n");
  const linkItems = links.map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`).join("\n");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)} — Koios.News semantic packet</title>`,
    `<link rel="canonical" href="https://newsroom.koios.news${escapeHtml(canonicalPath)}">`,
    '<meta name="robots" content="noindex, nofollow">',
    "</head>",
    "<body>",
    `<article class="semantic-hypertext-packet" data-e="${escapeHtml(subject)}" data-a="packet.kind" data-v="koios.semantic-hypertext-packet">`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p data-e="${escapeHtml(subject)}" data-a="packet.producer" data-v="koios.newsroom">Koios.News newsroom</p>`,
    `<p data-e="${escapeHtml(subject)}" data-a="packet.constraint" data-v="scriptless deterministic operator packet">scriptless deterministic operator packet</p>`,
    linkItems === "" ? "" : `<nav aria-label="packet links"><ul>${linkItems}</ul></nav>`,
    rows,
    "</article>",
    "</body>",
    "</html>",
  ].filter(Boolean).join("\n");
}

function contentRevisionSemanticPacketHtml(packet: ContentRevisionPacket): string {
  const subject = `koios.revision.${packet.slug}`;
  const encoded = encodeURIComponent(packet.slug);
  const entries: SemanticHypertextPacketEntry[] = [
    { e: subject, a: "packet.kind", v: "content-revision" },
    { e: subject, a: "article.slug", v: packet.slug },
    { e: subject, a: "article.headline", v: packet.headline },
    { e: subject, a: "article.path", v: packet.path, href: `${KOIOS_SITE_URL}${packet.path}` },
    { e: subject, a: "revision.score", v: packet.score },
    { e: subject, a: "revision.task-count", v: packet.taskCount },
    { e: subject, a: "revision.highest-priority", v: packet.highestPriority },
    ...(packet.section === undefined ? [] : [{ e: subject, a: "article.section", v: packet.section }]),
    ...(packet.settlementDepth === undefined ? [] : [{ e: subject, a: "predication.settlement-depth", v: packet.settlementDepth }]),
    ...(packet.citationCoverage === undefined ? [] : [{ e: subject, a: "predication.citation-coverage", v: packet.citationCoverage }]),
    ...packet.tasks.map((task, index) => ({
      e: `${subject}.task.${index + 1}`,
      a: `revision.task.${task.kind}`,
      v: task.instruction,
      evidence: `${task.severity}; ${task.findingCode}; priority ${task.priority}; ${task.evidence}`,
    })),
  ];
  return semanticHypertextPacketDocument("Revision semantic packet", `/operators/content/revisions/${encoded}.packet.html`, subject, entries, [
    { href: `/operators/content/revisions/${encoded}`, label: "human revision packet" },
    { href: `/operators/content/revisions/${encoded}.json`, label: "revision JSON" },
    { href: `/operators/content/predication/${encoded}`, label: "predication packet" },
    { href: `${KOIOS_SITE_URL}${packet.path}`, label: "public article" },
  ]);
}

function contentRevisionBacklogHtml(reading: ContentRevisionBacklogReading): string {
  const packets = reading.byArticle.slice(0, 30).map(contentRevisionPacketHtml).join("\n");
  const body = [
    `<article>`,
    `<h1>Revision backlog</h1>`,
    `<p>${reading.articleCount} articles need revision work · ${reading.taskCount} total tasks.</p>`,
    `<p><a href="/operators/content/revisions.json">revision JSON</a> · <a href="/operators/content/quality">quality board</a> · <a href="/operators/content/predication">predication board</a> · <a href="/operators/content/predication.json">predication JSON</a> · <a href="/operators/content/internal-link-placements.json">internal-link packets JSON</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section aria-labelledby="revision-backlog-title">`,
    `<h2 id="revision-backlog-title">Highest-priority edits</h2>`,
    packets === "" ? "<p>No revision tasks are queued.</p>" : packets,
    `</section>`,
  ].join("\n");
  return newsroomPage("Revision backlog", body, "/operators/content/revisions");
}

function sourceCycleRepairPacketHtml(packet: SourceCycleRepairPacket): string {
  const encoded = encodeURIComponent(packet.slug);
  const tasks = packet.tasks.map((task) => [
    `<li>`,
    `<strong>${escapeHtml(task.kind)}</strong> · priority ${task.priority} · <code>${escapeHtml(task.gate)}</code>`,
    `<br>${escapeHtml(task.evidence)}`,
    `<br>${escapeHtml(task.instruction)}`,
    `</li>`,
  ].join("")).join("\n");
  const candidate = packet.candidate.status === "missing"
    ? `candidate missing${packet.candidate.path === undefined ? "" : ` at ${escapeHtml(packet.candidate.path)}`}`
    : `${packet.candidate.status} candidate${packet.candidate.title === undefined ? "" : `: ${escapeHtml(packet.candidate.title)}`}`;
  const story = packet.story?.url === undefined
    ? ""
    : `<p>Witnessed story: <a href="${escapeHtml(packet.story.url)}">${escapeHtml(packet.story.title ?? packet.story.url)}</a></p>`;
  const manuscriptLinks = packet.candidate.status === "missing"
    ? ""
    : `<p><a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(packet.slug))}/standards.html">Standards review</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encodeURIComponent(packet.slug)}`)}">Public candidate URL</a></p>`;
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="/operators/source-cycle/repairs/${escapeHtml(encoded)}">${escapeHtml(packet.term || packet.slug)}</a></h3>`,
    `<p>${escapeHtml(packet.beat)} · ${escapeHtml(packet.t ?? "undated")} · ${escapeHtml(packet.shipped ? "shipped" : "withheld")} · ${escapeHtml(candidate)} · ${packet.taskCount} ${packet.taskCount === 1 ? "task" : "tasks"}</p>`,
    story,
    `<ol>${tasks}</ol>`,
    manuscriptLinks,
    `<form method="post" action="/operators/source-cycle/repairs/${escapeHtml(encoded)}/assign.html"><button type="submit">Create repair assignment</button></form>`,
    `</article>`,
  ].filter(Boolean).join("\n");
}

function sourceCycleRepairsHtml(reading: SourceCycleRepairPacketsReading): string {
  const packets = reading.byCandidate.map(sourceCycleRepairPacketHtml).join("\n");
  const constraints = reading.constraints.map((constraint) => `<li>${escapeHtml(constraint)}</li>`).join("\n");
  const body = [
    `<article>`,
    `<h1>Source-cycle repairs</h1>`,
    `<p>${reading.packetCount} recent candidate repair packets · ${reading.openPacketCount} open · ${reading.taskCount} total tasks.</p>`,
    `<p><a href="/operators/source-cycle/repairs.json">repair JSON</a> · <a href="/operators/source-cycle/plan.json">source-cycle plan</a> · <a href="/">Desk</a></p>`,
    `<ul>${constraints}</ul>`,
    `</article>`,
    `<section aria-labelledby="source-cycle-repair-title">`,
    `<h2 id="source-cycle-repair-title">Gate failures and obstructions</h2>`,
    packets === "" ? "<p>No failed source-cycle candidates are currently in the recent run trace.</p>" : packets,
    `</section>`,
  ].join("\n");
  return newsroomPage("Source-cycle repairs", body, "/operators/source-cycle/repairs");
}

function sourceCycleRepairPacketDetailHtml(packet: SourceCycleRepairPacket): string {
  const encoded = encodeURIComponent(packet.slug);
  const tasks = packet.tasks.map((task) => [
    `<article class="operator-work-item">`,
    `<h3>${escapeHtml(task.kind)} · priority ${task.priority}</h3>`,
    `<p><code>${escapeHtml(task.gate)}</code></p>`,
    `<p>${escapeHtml(task.evidence)}</p>`,
    `<p>${escapeHtml(task.instruction)}</p>`,
    `</article>`,
  ].join("\n")).join("\n");
  const candidate = [
    `<p>Status: ${escapeHtml(packet.candidate.status)}</p>`,
    packet.candidate.title === undefined ? "" : `<p>Title: ${escapeHtml(packet.candidate.title)}</p>`,
    packet.candidate.path === undefined ? "" : `<p>Path: <code>${escapeHtml(packet.candidate.path)}</code></p>`,
    packet.candidate.status === "missing" ? "" : `<p><a href="/operators/manuscripts/${escapeHtml(encoded)}/standards.html">Standards review</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encoded}`)}">Public candidate URL</a></p>`,
  ].filter(Boolean).join("\n");
  const story = packet.story?.url === undefined
    ? "<p>No witnessed story URL was recorded for this run.</p>"
    : `<p><a href="${escapeHtml(packet.story.url)}">${escapeHtml(packet.story.title ?? packet.story.url)}</a></p>`;
  const body = [
    `<article>`,
    `<h1>Source-cycle repair packet</h1>`,
    `<p><strong>${escapeHtml(packet.slug)}</strong></p>`,
    `<p>${escapeHtml(packet.beat)} · ${escapeHtml(packet.t ?? "undated")} · ${escapeHtml(packet.shipped ? "shipped" : "withheld")} · ${packet.taskCount} ${packet.taskCount === 1 ? "task" : "tasks"} · top priority ${packet.highestPriority}</p>`,
    packet.term === "" ? "" : `<p>Original demand term: <code>${escapeHtml(packet.term)}</code></p>`,
    `<p><a href="/operators/source-cycle/repairs/${escapeHtml(encoded)}.json">packet JSON</a> · <a href="/operators/source-cycle/repairs/${escapeHtml(encoded)}.packet.html">semantic packet</a> · <a href="/operators/source-cycle/repairs">repair backlog</a> · <a href="/operators/source-cycle/repairs.json">repair backlog JSON</a> · <a href="/">Desk</a></p>`,
    `<form method="post" action="/operators/source-cycle/repairs/${escapeHtml(encoded)}/assign.html"><button type="submit">Create repair assignment</button></form>`,
    `</article>`,
    `<section aria-labelledby="repair-candidate-title"><h2 id="repair-candidate-title">Candidate</h2>${candidate}</section>`,
    `<section aria-labelledby="repair-story-title"><h2 id="repair-story-title">Witnessed story</h2>${story}</section>`,
    `<section aria-labelledby="repair-tasks-title"><h2 id="repair-tasks-title">Tasks</h2>${tasks === "" ? "<p>No tasks are queued for this packet.</p>" : tasks}</section>`,
  ].filter(Boolean).join("\n");
  return newsroomPage("Source-cycle repair packet", body, `/operators/source-cycle/repairs/${encoded}`);
}

function sourceCycleRepairSemanticPacketHtml(packet: SourceCycleRepairPacket): string {
  const subject = `koios.source-cycle.repair.${packet.slug}`;
  const encoded = encodeURIComponent(packet.slug);
  const entries: SemanticHypertextPacketEntry[] = [
    { e: subject, a: "packet.kind", v: "source-cycle-repair" },
    { e: subject, a: "candidate.slug", v: packet.slug },
    { e: subject, a: "candidate.status", v: packet.candidate.status },
    { e: subject, a: "beat", v: packet.beat },
    { e: subject, a: "demand.term", v: packet.term },
    { e: subject, a: "cycle.shipped", v: packet.shipped },
    { e: subject, a: "repair.failed-gate-count", v: packet.failedGateCount },
    { e: subject, a: "repair.task-count", v: packet.taskCount },
    { e: subject, a: "repair.highest-priority", v: packet.highestPriority },
    ...(packet.t === undefined ? [] : [{ e: subject, a: "cycle.at", v: packet.t }]),
    ...(packet.story?.url === undefined ? [] : [{ e: subject, a: "witnessed-story.url", v: packet.story.title ?? packet.story.url, href: packet.story.url }]),
    ...(packet.candidate.title === undefined ? [] : [{ e: subject, a: "candidate.title", v: packet.candidate.title }]),
    ...packet.tasks.map((task, index) => ({
      e: `${subject}.task.${index + 1}`,
      a: `repair.task.${task.kind}`,
      v: task.instruction,
      evidence: `${task.gate}; priority ${task.priority}; ${task.evidence}`,
    })),
  ];
  return semanticHypertextPacketDocument("Source-cycle repair semantic packet", `/operators/source-cycle/repairs/${encoded}.packet.html`, subject, entries, [
    { href: `/operators/source-cycle/repairs/${encoded}`, label: "human source-cycle repair packet" },
    { href: `/operators/source-cycle/repairs/${encoded}.json`, label: "repair JSON" },
    { href: `/operators/source-cycle/repairs`, label: "repair backlog" },
    ...(packet.candidate.status === "missing" ? [] : [{ href: `/operators/manuscripts/${encoded}/standards.html`, label: "standards review" }]),
  ]);
}

function contentRevisionPacket(reading: ContentRevisionBacklogReading, slug: string): ContentRevisionPacket {
  const packet = reading.byArticle.find((article) => article.slug === slug);
  if (packet === undefined) throw new Error(`no revision packet for article: ${slug}`);
  return packet;
}

function revisionAssignmentInput(packet: ContentRevisionPacket): CreateAssignmentInput {
  return normalizeCreateAssignmentInput({
    term: `revision: ${packet.slug}`,
    beat: "editing",
    priority: packet.highestPriority,
    sourceUrls: [`${KOIOS_SITE_URL}${packet.path}`],
    summary: `Revise "${packet.headline}" from the content-quality and predication revision backlog.`,
    angle: packet.tasks.map((task) => `${task.kind} (${task.findingCode}, priority ${task.priority}): ${task.instruction}`).join("\n"),
  });
}

function sourceCycleRepairPacket(reading: SourceCycleRepairPacketsReading, slug: string): SourceCycleRepairPacket {
  const packet = reading.byCandidate.find((candidate) => candidate.slug === slug);
  if (packet === undefined) throw new Error(`no source-cycle repair packet for candidate: ${slug}`);
  return packet;
}

function contentGraphNode(reading: ContentGraphReading, slug: string): ContentGraphNode {
  const node = reading.byArticle.find((article) => article.slug === slug);
  if (node === undefined) throw new Error(`no content graph node for article: ${slug}`);
  return node;
}

function graphAssignmentPriority(node: ContentGraphNode): number {
  if (node.isolated) return 46;
  if (node.orphan) return 42;
  return 36;
}

function graphAssignmentInput(node: ContentGraphNode): CreateAssignmentInput {
  const suggestions = node.suggestedInternalTargets.slice(0, 8);
  return normalizeCreateAssignmentInput({
    term: `graph: ${node.slug}`,
    beat: "editing",
    priority: graphAssignmentPriority(node),
    sourceUrls: [`${KOIOS_SITE_URL}${node.path}`],
    summary: `Repair same-site topology for "${node.headline}".`,
    angle: [
      `State: ${node.isolated ? "isolated" : node.orphan ? "orphaned" : "thin topology"}.`,
      `Inbound links: ${node.inboundInternalLinks.length}.`,
      `Outbound links: ${node.outboundInternalLinks.length}.`,
      `Graph centrality: ${node.graphCentrality}.`,
      suggestions.length === 0 ? "No shared-tag targets are suggested; review the article's section and tags before adding links." : `Suggested internal targets: ${suggestions.join(", ")}.`,
      `Graph board: https://newsroom.koios.news/operators/content/graph`,
      `Predication packet: https://newsroom.koios.news/operators/content/predication/${encodeURIComponent(node.slug)}`,
      "Add same-site links only where the local paragraph warrants the target article; same-site links are topology, not factual references.",
    ].join("\n"),
  });
}

function sourceCycleRepairAssignmentInput(packet: SourceCycleRepairPacket): CreateAssignmentInput {
  const sourceUrls = [
    packet.story?.url,
    packet.candidate.status === "missing" ? undefined : `${KOIOS_SITE_URL}/posts/${encodeURIComponent(packet.slug)}`,
  ].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url));
  return normalizeCreateAssignmentInput({
    term: `source-cycle repair: ${packet.slug}`,
    beat: "editing",
    priority: packet.highestPriority,
    ...(sourceUrls.length === 0 ? {} : { sourceUrls }),
    summary: `Repair source-cycle candidate "${packet.slug}" from ${packet.beat}${packet.term === "" ? "" : ` for "${packet.term}"`}.`,
    angle: [
      `Original beat: ${packet.beat}`,
      packet.term === "" ? "" : `Original demand term: ${packet.term}`,
      packet.story?.url === undefined ? "" : `Witnessed story: ${packet.story.url}`,
      `Repair packet: https://newsroom.koios.news/operators/source-cycle/repairs/${encodeURIComponent(packet.slug)}`,
      `Candidate state: ${packet.candidate.status}`,
      ...packet.tasks.map((task) => `${task.kind} (${task.gate}, priority ${task.priority}): ${task.instruction} Evidence: ${task.evidence}`),
      "Keep intake sources and published CSL references distinct. Repair work must not reintroduce article-level sources frontmatter.",
    ].filter(Boolean).join("\n"),
  });
}

function assignmentRevisionSlug(assignment: Pick<AssignmentReading, "term">): string {
  return assignment.term.startsWith("revision: ") ? assignment.term.slice("revision: ".length).trim() : "";
}

function assignmentSourceCycleRepairSlug(assignment: Pick<AssignmentReading, "term">): string {
  return assignment.term.startsWith("source-cycle repair: ") ? assignment.term.slice("source-cycle repair: ".length).trim() : "";
}

function assignmentCanCreateDraft(assignment: Pick<AssignmentReading, "beat" | "term">): boolean {
  if (assignment.beat === "editing") return false;
  if (assignmentRevisionSlug(assignment) !== "") return false;
  if (assignmentSourceCycleRepairSlug(assignment) !== "") return false;
  return true;
}

function assignmentWorkOrder(assignment: AssignmentReading): OperatorAssignmentWorkOrder {
  const assignmentId = encodeURIComponent(assignment.assignmentId);
  const open = assignment.status === "assigned" || assignment.status === "drafted";
  const draftable = assignmentCanCreateDraft(assignment);
  const notes = [
    draftable
      ? "Use the research packet before drafting copy."
      : "Use the linked editorial packet and operator notes before revising or closing this work item.",
    assignment.sourceUrls.length === 0
      ? "No intake source URLs are attached to this assignment."
      : "Attached source URLs are intake material; cited material still belongs in manuscript references.",
    open
      ? "Complete the assignment only after the operator has reviewed the work outcome."
      : `This assignment is terminal as ${assignment.status}.`,
  ];
  return Object.freeze({
    kind: "koios.newsroom.assignment-work-order" as const,
    assignment,
    actions: Object.freeze({
      htmlUrl: `/operators/assignments/${assignmentId}`,
      jsonUrl: `/operators/assignments/${assignmentId}.json`,
      activityHtmlUrl: `/operators/assignments/${assignmentId}/activity`,
      activityJsonUrl: `/operators/assignments/${assignmentId}/activity.json`,
      noteHtmlUrl: `/operators/assignments/${assignmentId}/notes/form`,
      noteJsonUrl: `/operators/assignments/${assignmentId}/notes`,
      researchPacketUrl: `/operators/assignments/${assignmentId}/research.json`,
      ...(open && draftable ? {
        draftHtmlUrl: `/operators/assignments/${assignmentId}/manuscripts/new`,
        draftJsonUrl: `/operators/assignments/${assignmentId}/manuscripts`,
      } : {}),
      ...(open ? {
        completeHtmlUrl: `/operators/assignments/${assignmentId}/complete.html`,
        completeJsonUrl: `/operators/assignments/${assignmentId}/complete`,
      } : {}),
      ...(assignment.manuscriptUrl === undefined ? {} : { manuscriptUrl: assignment.manuscriptUrl }),
    }),
    operatorNotes: Object.freeze(notes),
  });
}

function correctionRegisterHtml(register: CorrectionRegisterReading): string {
  const rows = register.corrections.map((correction) => [
    "<tr>",
    `<td>${escapeHtml(correction.correctedAt)}</td>`,
    `<td>${escapeHtml(correction.kind)}</td>`,
    `<td><a href="${escapeHtml(`${KOIOS_SITE_URL}${correction.articlePath}`)}">${escapeHtml(correction.articleHeadline)}</a></td>`,
    `<td>${escapeHtml(correction.summary)}</td>`,
    `<td>${correction.affectedSurfaces.map(escapeHtml).join(" · ")}</td>`,
    "</tr>",
  ].join("")).join("\n");
  const policy = register.policy.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n");
  const body = [
    `<article>`,
    `<h1>Corrections</h1>`,
    `<p>${register.correctionCount} declared ${register.correctionCount === 1 ? "correction" : "corrections"} across ${register.articleCount} ${register.articleCount === 1 ? "article" : "articles"}.</p>`,
    `<ul>${policy}</ul>`,
    `<p><a href="/operators/corrections.json">corrections JSON</a> · <a href="${KOIOS_SITE_URL}/corrections">public register</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    register.corrections.length === 0 ? "<p>No correction records are currently declared in public article frontmatter.</p>" :
      `<table><thead><tr><th>corrected</th><th>kind</th><th>article</th><th>summary</th><th>surfaces</th></tr></thead><tbody>${rows}</tbody></table>`,
  ].join("\n");
  return newsroomPage("Corrections", body, "/operators/corrections");
}

function assignmentActionHtml(assignment: AssignmentReading): string {
  const assignmentId = encodeURIComponent(assignment.assignmentId);
  if (assignment.status === "completed" || assignment.status === "published") return `<a href="/operators/assignments/${escapeHtml(assignmentId)}/activity">activity</a>`;
  const workLink = `<a href="/operators/assignments/${escapeHtml(assignmentId)}">${assignmentCanCreateDraft(assignment) ? "work" : "review"}</a>`;
  const draftLink = assignmentCanCreateDraft(assignment) ? `<a href="/operators/assignments/${escapeHtml(assignmentId)}/manuscripts/new">draft</a>` : workLink;
  return [
    draftLink,
    `<form method="post" action="/operators/assignments/${escapeHtml(assignmentId)}/complete.html"><button type="submit">complete</button></form>`,
  ].join(" ");
}

function assignmentRowsHtml(assignments: readonly AssignmentReading[]): string {
  return assignments.map((assignment) => {
    const assignmentId = encodeURIComponent(assignment.assignmentId);
    return [
      "<tr>",
      `<td><a href="/operators/assignments/${escapeHtml(assignmentId)}">${escapeHtml(assignment.term)}</a></td>`,
      `<td>${escapeHtml(assignment.beat)}</td>`,
      `<td>${escapeHtml(assignment.status)}</td>`,
      `<td>${assignment.priority.toFixed(1)}</td>`,
      `<td>${escapeHtml(assignment.assignee ?? "")}</td>`,
      `<td>${assignment.sourceUrls.length}</td>`,
      `<td><a href="/operators/assignments/${escapeHtml(assignmentId)}/research.json">research</a> · <a href="/operators/assignments/${escapeHtml(assignmentId)}/activity">activity</a></td>`,
      `<td>${assignment.manuscriptSlug === undefined ? "" : `<a href="${escapeHtml(assignment.manuscriptUrl ?? "")}">${escapeHtml(assignment.manuscriptSlug)}</a>`}</td>`,
      `<td>${assignmentActionHtml(assignment)}</td>`,
      "</tr>",
    ].join("");
  }).join("\n");
}

function assignmentQueueHtml(assignments: readonly AssignmentReading[]): string {
  const sorted = Object.freeze([...assignments].sort((left, right) => {
    const leftOpen = left.status === "assigned" || left.status === "drafted";
    const rightOpen = right.status === "assigned" || right.status === "drafted";
    return Number(rightOpen) - Number(leftOpen) || right.priority - left.priority || left.createdAt.localeCompare(right.createdAt);
  }));
  const openCount = sorted.filter((assignment) => assignment.status === "assigned" || assignment.status === "drafted").length;
  const rows = assignmentRowsHtml(sorted);
  const body = [
    "<article>",
    "<h1>Assignment queue</h1>",
    `<p>${sorted.length} assignments · ${openCount} open · ${sorted.length - openCount} terminal.</p>`,
    `<p><a href="/operators/assignments.json">assignments JSON</a> · <a href="/operators/assignments/new">create assignment</a> · <a href="/">Desk</a></p>`,
    '<form method="post" action="/operators/assignments/next"><button type="submit">assign next demand</button></form>',
    "</article>",
    sorted.length === 0 ? "<p>No assignments yet.</p>" :
      `<table><thead><tr><th>term</th><th>beat</th><th>status</th><th>priority</th><th>assignee</th><th>sources</th><th>readings</th><th>manuscript</th><th>action</th></tr></thead><tbody>${rows}</tbody></table>`,
  ].join("\n");
  return newsroomPage("Assignment queue", body, "/operators/assignments.html");
}

function openAssignment(assignment: AssignmentReading): boolean {
  return assignment.status === "assigned" || assignment.status === "drafted";
}

function openAssignmentForTerm(assignments: readonly AssignmentReading[], term: string): boolean {
  return assignments.some((assignment) => openAssignment(assignment) && assignment.term.toLowerCase() === term.toLowerCase());
}

function assignmentWorkQueueItem(assignment: AssignmentReading): OperatorWorkQueueItem {
  const assignmentId = encodeURIComponent(assignment.assignmentId);
  const draftable = assignmentCanCreateDraft(assignment);
  return Object.freeze({
    kind: "assignment" as const,
    lane: draftable ? "drafting" as const : "editing" as const,
    priority: assignment.priority,
    title: assignment.term,
    state: assignment.status,
    href: `/operators/assignments/${assignmentId}`,
    jsonHref: `/operators/assignments/${assignmentId}.json`,
    actionLabel: draftable ? "draft" : "review",
    actionHref: draftable ? `/operators/assignments/${assignmentId}/manuscripts/new` : `/operators/assignments/${assignmentId}`,
    note: draftable ? "Assigned reporting work ready for manuscript drafting." : "Editing work item; review packet context before closing.",
  });
}

function manuscriptWorkQueueItem(manuscript: OperatorManuscriptReading): OperatorWorkQueueItem | null {
  if (!manuscript.draft && manuscript.workState === "published-standards-clear") return null;
  if (manuscript.suggestedAction === "publish") return Object.freeze({
    kind: "manuscript" as const,
    lane: "publishing" as const,
    priority: 100,
    title: manuscript.title,
    state: manuscript.workState,
    href: manuscript.standardsHtmlUrl,
    jsonHref: manuscript.standardsUrl,
    actionLabel: "publish",
    actionHref: manuscript.publishHtmlUrl,
    note: `${manuscript.standards.wordCount} words and ${manuscript.standards.referenceCount} references; standards gate is clear.`,
  });
  if (manuscript.workState === "needs-editing") return Object.freeze({
    kind: "manuscript" as const,
    lane: "editing" as const,
    priority: 90 + manuscript.standards.errorCount * 4 + manuscript.standards.warningCount,
    title: manuscript.title,
    state: manuscript.workState,
    href: manuscript.standardsHtmlUrl,
    jsonHref: manuscript.standardsUrl,
    actionLabel: manuscript.suggestedAction === "repair-headings" ? "repair headings" : manuscript.suggestedAction === "repair-seo-heading" ? "repair SEO heading" : manuscript.suggestedAction === "normalize-references" ? "references" : "review",
    actionHref: manuscript.suggestedAction === "repair-headings" ? manuscript.headingsRepairHtmlUrl
      : manuscript.suggestedAction === "repair-seo-heading" ? manuscript.seoHeadingRepairHtmlUrl
        : manuscript.suggestedAction === "normalize-references" ? manuscript.referencesNormalizeHtmlUrl
          : manuscript.standardsHtmlUrl,
    note: `${manuscript.standards.errorCount} errors and ${manuscript.standards.warningCount} warnings.`,
  });
  return null;
}

function contentRevisionWorkQueueItem(packet: ContentRevisionPacket): OperatorWorkQueueItem {
  const encoded = encodeURIComponent(packet.slug);
  const note = packet.tasks[0]?.instruction;
  return Object.freeze({
    kind: "content-revision" as const,
    lane: "editing" as const,
    priority: packet.highestPriority,
    title: packet.headline,
    state: `${packet.taskCount} revision ${packet.taskCount === 1 ? "task" : "tasks"}`,
    href: `/operators/content/revisions/${encoded}`,
    jsonHref: `/operators/content/revisions/${encoded}.json`,
    actionLabel: "assign",
    actionHref: `/operators/content/revisions/${encoded}`,
    ...(note === undefined ? {} : { note }),
  });
}

function contentGraphWorkQueueItem(node: ContentGraphNode): OperatorWorkQueueItem {
  const encoded = encodeURIComponent(node.slug);
  const suggested = node.suggestedInternalTargets.slice(0, 4).join(", ") || "none from shared tags";
  const state = node.isolated ? "isolated article" : node.orphan ? "orphaned article" : "thin article topology";
  return Object.freeze({
    kind: "content-graph" as const,
    lane: "editing" as const,
    priority: node.isolated ? 46 : node.orphan ? 42 : 36,
    title: node.headline,
    state,
    href: `/operators/content/predication/${encoded}`,
    jsonHref: "/operators/content/graph.json",
    actionLabel: "assign from graph",
    actionHref: "/operators/content/graph",
    note: `${node.inboundInternalLinks.length} inbound, ${node.outboundInternalLinks.length} outbound, centrality ${node.graphCentrality}. Suggested targets: ${suggested}.`,
  });
}

function sourceCycleRepairWorkQueueItem(packet: SourceCycleRepairPacket): OperatorWorkQueueItem {
  const encoded = encodeURIComponent(packet.slug);
  const note = packet.tasks[0]?.instruction;
  return Object.freeze({
    kind: "source-cycle-repair" as const,
    lane: "source-cycle" as const,
    priority: packet.highestPriority,
    title: packet.term || packet.slug,
    state: `${packet.candidate.status} candidate; ${packet.taskCount} ${packet.taskCount === 1 ? "task" : "tasks"}`,
    href: `/operators/source-cycle/repairs/${encoded}`,
    jsonHref: `/operators/source-cycle/repairs/${encoded}.json`,
    actionLabel: "assign",
    actionHref: `/operators/source-cycle/repairs/${encoded}`,
    ...(note === undefined ? {} : { note }),
  });
}

function operatorWorkQueueReading(input: Readonly<{
  assignments: readonly AssignmentReading[];
  manuscripts: readonly OperatorManuscriptReading[];
  contentGraph: ContentGraphReading;
  contentRevisions: ContentRevisionBacklogReading;
  sourceCycleRepairs: SourceCycleRepairPacketsReading;
}>): OperatorWorkQueueReading {
  const openAssignments = input.assignments.filter(openAssignment);
  const assignedTerms = input.assignments;
  const items = [
    ...openAssignments.map(assignmentWorkQueueItem),
    ...input.manuscripts.flatMap((manuscript) => {
      const item = manuscriptWorkQueueItem(manuscript);
      return item === null ? [] : [item];
    }),
    ...input.contentRevisions.byArticle
      .filter((packet) => !openAssignmentForTerm(assignedTerms, `revision: ${packet.slug}`))
      .map(contentRevisionWorkQueueItem),
    ...input.contentGraph.byArticle
      .filter((node) => node.isolated || node.orphan || node.outboundInternalLinks.length === 0)
      .filter((node) => !openAssignmentForTerm(assignedTerms, `revision: ${node.slug}`))
      .filter((node) => !openAssignmentForTerm(assignedTerms, `graph: ${node.slug}`))
      .slice(0, 36)
      .map(contentGraphWorkQueueItem),
    ...input.sourceCycleRepairs.byCandidate
      .filter((packet) => packet.candidate.status !== "published")
      .filter((packet) => !openAssignmentForTerm(assignedTerms, `source-cycle repair: ${packet.slug}`))
      .map(sourceCycleRepairWorkQueueItem),
  ].sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
  const lanes = Object.freeze({
    drafting: Object.freeze(items.filter((item) => item.lane === "drafting")),
    editing: Object.freeze(items.filter((item) => item.lane === "editing")),
    publishing: Object.freeze(items.filter((item) => item.lane === "publishing")),
    "source-cycle": Object.freeze(items.filter((item) => item.lane === "source-cycle")),
  });
  return Object.freeze({
    kind: "koios.newsroom.operator-work-queue" as const,
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    openAssignmentCount: openAssignments.length,
    lanes,
    top: Object.freeze(items.slice(0, 12)),
    policy: Object.freeze([
      "Open assignments are first-class work and suppress duplicate unassigned packet prompts.",
      "Editing assignments are review/repair work, not manuscript drafting work.",
      "Content-graph items are topology prompts: add same-site links only where the source paragraph warrants the target.",
      "The queue is a projection over existing records; it does not create a second task store.",
    ]),
  });
}

function workQueueItemHtml(item: OperatorWorkQueueItem): string {
  return [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>`,
    `<p>${escapeHtml(item.kind)} · ${escapeHtml(item.state)} · priority ${item.priority.toFixed(1)}</p>`,
    item.note === undefined ? "" : `<p>${escapeHtml(item.note)}</p>`,
    `<p>${item.jsonHref === undefined ? "" : `<a href="${escapeHtml(item.jsonHref)}">JSON</a> · `}<a href="${escapeHtml(item.href)}">open</a>${item.actionHref === undefined || item.actionLabel === undefined ? "" : ` · <a href="${escapeHtml(item.actionHref)}">${escapeHtml(item.actionLabel)}</a>`}</p>`,
    `</article>`,
  ].filter(Boolean).join("\n");
}

function workQueueLaneHtml(title: string, items: readonly OperatorWorkQueueItem[]): string {
  return [
    `<section aria-labelledby="work-queue-${escapeHtml(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">`,
    `<h2 id="work-queue-${escapeHtml(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">${escapeHtml(title)}</h2>`,
    items.length === 0 ? "<p>No active work in this lane.</p>" : items.map(workQueueItemHtml).join("\n"),
    `</section>`,
  ].join("\n");
}

function operatorWorkQueueHtml(reading: OperatorWorkQueueReading): string {
  const policy = reading.policy.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n");
  const body = [
    `<article>`,
    `<h1>Operator work queue</h1>`,
    `<p>${reading.itemCount} active work items · ${reading.openAssignmentCount} open assignments.</p>`,
    `<p><a href="/operators/work-queue.json">queue JSON</a> · <a href="/operators/assignments.html">assignments</a> · <a href="/operators/manuscripts.html">manuscripts</a> · <a href="/operators/content/graph">content graph</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/operators/source-cycle/repairs">source-cycle repairs</a> · <a href="/">Desk</a></p>`,
    `<ul>${policy}</ul>`,
    `</article>`,
    workQueueLaneHtml("Publishing", reading.lanes.publishing),
    workQueueLaneHtml("Editing", reading.lanes.editing),
    workQueueLaneHtml("Drafting", reading.lanes.drafting),
    workQueueLaneHtml("Source cycle", reading.lanes["source-cycle"]),
  ].join("\n");
  return newsroomPage("Operator work queue", body, "/operators/work-queue");
}

function manuscriptPriority(manuscript: OperatorManuscriptReading): number {
  if (manuscript.suggestedAction === "publish") return 0;
  if (manuscript.suggestedAction === "normalize-references") return 1;
  if (manuscript.suggestedAction === "apply-standards-defaults") return 1;
  if (manuscript.suggestedAction === "repair-headings") return 1;
  if (manuscript.suggestedAction === "repair-seo-heading") return 1;
  if (manuscript.suggestedAction === "review-copy") return 2;
  if (manuscript.workState === "needs-editing") return 3;
  if (manuscript.draft) return 4;
  return 5;
}

function manuscriptActionHtml(manuscript: OperatorManuscriptReading): string {
  if (manuscript.suggestedAction === "normalize-references") {
    return `<form method="post" action="${escapeHtml(manuscript.referencesNormalizeHtmlUrl)}"><button type="submit">references</button></form>`;
  }
  if (manuscript.suggestedAction === "apply-standards-defaults") {
    return `<form method="post" action="${escapeHtml(manuscript.standardsDefaultsHtmlUrl)}"><button type="submit">rights</button></form>`;
  }
  if (manuscript.suggestedAction === "repair-headings") {
    return `<form method="post" action="${escapeHtml(manuscript.headingsRepairHtmlUrl)}"><button type="submit">headings</button></form>`;
  }
  if (manuscript.suggestedAction === "repair-seo-heading") {
    return `<form method="post" action="${escapeHtml(manuscript.seoHeadingRepairHtmlUrl)}"><button type="submit">SEO heading</button></form>`;
  }
  if (manuscript.suggestedAction === "publish") {
    return `<form method="post" action="${escapeHtml(manuscript.publishHtmlUrl)}"><button type="submit">publish</button></form>`;
  }
  if (manuscript.suggestedAction === "review-copy") {
    return `<a href="${escapeHtml(manuscript.standardsHtmlUrl)}">review</a>`;
  }
  return escapeHtml(manuscript.suggestedAction ?? "none");
}

function manuscriptRowsHtml(manuscripts: readonly OperatorManuscriptReading[]): string {
  return manuscripts.map((manuscript) => [
    "<tr>",
    `<td><a href="${escapeHtml(manuscript.standardsHtmlUrl)}">${escapeHtml(manuscript.title)}</a></td>`,
    `<td>${manuscript.draft ? "draft" : "published"}</td>`,
    `<td>${escapeHtml(manuscript.workState)}</td>`,
    `<td>${manuscript.standards.wordCount}</td>`,
    `<td>${manuscript.standards.referenceCount}</td>`,
    `<td>${manuscript.standards.errorCount}</td>`,
    `<td>${manuscript.standards.warningCount}</td>`,
    `<td>${escapeHtml(manuscript.standards.seoTerm ?? "")}</td>`,
    `<td><a href="${escapeHtml(manuscript.publicUrl)}">public</a> · <a href="${escapeHtml(manuscript.standardsUrl)}">json</a></td>`,
    `<td>${manuscriptActionHtml(manuscript)}</td>`,
    "</tr>",
  ].join("")).join("\n");
}

function manuscriptQueueHtml(manuscripts: readonly OperatorManuscriptReading[]): string {
  const sorted = [...manuscripts].sort((left, right) => manuscriptPriority(left) - manuscriptPriority(right) || left.title.localeCompare(right.title));
  const draftCount = manuscripts.filter((manuscript) => manuscript.draft).length;
  const publishableDraftCount = manuscripts.filter((manuscript) => manuscript.draft && manuscript.standards.publishable).length;
  const needsEditingCount = manuscripts.filter((manuscript) => manuscript.workState === "needs-editing").length;
  const publishedCount = manuscripts.length - draftCount;
  const body = [
    "<article>",
    "<h1>Manuscript queue</h1>",
    `<p>${manuscripts.length} manuscripts: ${draftCount} draft, ${publishableDraftCount} ready to publish, ${needsEditingCount} needing editing, ${publishedCount} published.</p>`,
    '<p><a href="/operators/publication-candidates">publication candidates</a> · <a href="/operators/manuscripts/new">create draft manuscript</a> · <a href="/operators/manuscripts.json">machine inventory</a> · <a href="/">desk</a></p>',
    sorted.length === 0 ? "<p>No manuscripts in the content store.</p>" :
      `<table><thead><tr><th>title</th><th>status</th><th>next</th><th>words</th><th>references</th><th>errors</th><th>warnings</th><th>seo</th><th>surface</th><th>action</th></tr></thead><tbody>${manuscriptRowsHtml(sorted)}</tbody></table>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Manuscript queue", body, "/operators/manuscripts.html");
}

function publicationCandidateAction(manuscript: OperatorManuscriptReading, repairPacket?: SourceCycleRepairPacket): Readonly<{ label: string; href: string }> {
  if (repairPacket !== undefined && repairPacket.taskCount > 0) {
    return Object.freeze({ label: "review source-cycle repair", href: `/operators/source-cycle/repairs/${encodeURIComponent(repairPacket.slug)}` });
  }
  if (manuscript.suggestedAction === "publish") return Object.freeze({ label: "publish", href: manuscript.publishHtmlUrl });
  if (manuscript.suggestedAction === "repair-headings") return Object.freeze({ label: "repair headings", href: manuscript.headingsRepairHtmlUrl });
  if (manuscript.suggestedAction === "repair-seo-heading") return Object.freeze({ label: "repair SEO heading", href: manuscript.seoHeadingRepairHtmlUrl });
  if (manuscript.suggestedAction === "normalize-references") return Object.freeze({ label: "normalize references", href: manuscript.referencesNormalizeHtmlUrl });
  if (manuscript.suggestedAction === "apply-standards-defaults") return Object.freeze({ label: "apply rights defaults", href: manuscript.standardsDefaultsHtmlUrl });
  return Object.freeze({ label: "review copy", href: manuscript.standardsHtmlUrl });
}

function publicationCandidateStatus(manuscript: OperatorManuscriptReading, repairPacket?: SourceCycleRepairPacket): PublicationCandidate["status"] {
  if (repairPacket !== undefined && repairPacket.taskCount > 0) return "editorial-hold";
  if (manuscript.suggestedAction === "publish") return "ready-to-publish";
  if (
    (manuscript.suggestedAction === "repair-headings"
      || manuscript.suggestedAction === "normalize-references"
      || manuscript.suggestedAction === "repair-seo-heading"
      || manuscript.suggestedAction === "apply-standards-defaults")
    && manuscript.standards.errorCount <= 1
    && manuscript.standards.wordCount >= 800
  ) return "one-click-repair";
  return "copy-edit-required";
}

function publicationDistance(manuscript: OperatorManuscriptReading, status: PublicationCandidate["status"]): number {
  if (status === "ready-to-publish") return 0;
  if (status === "editorial-hold") {
    const missingWords = Math.max(0, 800 - manuscript.standards.wordCount);
    const standardsCost = manuscript.standards.publishable ? 0
      : 20 + manuscript.standards.errorCount * 12 + manuscript.standards.warningCount * 3 + Math.ceil(missingWords / 25);
    return 5 + standardsCost;
  }
  const missingWords = Math.max(0, 800 - manuscript.standards.wordCount);
  const actionCost = status === "one-click-repair" ? 10 : 40;
  const errorCost = manuscript.standards.errorCount * 12;
  const warningCost = manuscript.standards.warningCount * 3;
  const referenceCost = manuscript.standards.referenceCount === 0 ? 18 : manuscript.standards.referenceCount === 1 ? 4 : 0;
  return actionCost + errorCost + warningCost + referenceCost + Math.ceil(missingWords / 25);
}

function publicationCandidateNote(manuscript: OperatorManuscriptReading, status: PublicationCandidate["status"], repairPacket?: SourceCycleRepairPacket): string {
  const findingCodes = manuscript.standards.findings.map((finding) => finding.code);
  if (status === "ready-to-publish") return `${manuscript.standards.wordCount} words and ${manuscript.standards.referenceCount} references; standards gate is clear.`;
  if (status === "editorial-hold" && repairPacket !== undefined) {
    const tasks = repairPacket.tasks.slice(0, 2).map((task) => task.kind).join(", ");
    const standards = manuscript.standards.publishable ? "Standards gate is clear" : `Standards gate also has ${manuscript.standards.errorCount} error${manuscript.standards.errorCount === 1 ? "" : "s"} and ${manuscript.standards.warningCount} warning${manuscript.standards.warningCount === 1 ? "" : "s"}`;
    return `${standards}; source cycle still has ${repairPacket.taskCount} repair task${repairPacket.taskCount === 1 ? "" : "s"} (${tasks || "source-cycle review"}).`;
  }
  if (status === "one-click-repair") return `One operator repair should be enough before another standards review: ${findingCodes.join(", ") || "no finding code"}.`;
  const missingWords = Math.max(0, 800 - manuscript.standards.wordCount);
  const parts = [
    missingWords > 0 ? `${missingWords} words short` : undefined,
    manuscript.standards.referenceCount === 0 ? "missing references" : undefined,
    findingCodes.length > 0 ? `findings: ${findingCodes.join(", ")}` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.join("; ") || "Needs human copy review before publication.";
}

function sourceCyclePublicationHold(packet: SourceCycleRepairPacket | undefined): SourceCycleRepairPacket | undefined {
  if (packet === undefined || packet.taskCount === 0) return undefined;
  if (packet.candidate.status !== "draft") return undefined;
  return packet;
}

function publicationCandidatesReading(manuscripts: readonly OperatorManuscriptReading[], repairs: SourceCycleRepairPacketsReading): PublicationCandidatesReading {
  const repairBySlug = new Map(repairs.byCandidate.map((packet) => [packet.slug, packet]));
  const drafts = manuscripts.filter((manuscript) => manuscript.draft);
  const candidates = drafts.map((manuscript) => {
    const repairPacket = sourceCyclePublicationHold(repairBySlug.get(manuscript.slug));
    const status = publicationCandidateStatus(manuscript, repairPacket);
    const action = publicationCandidateAction(manuscript, repairPacket);
    const nextAction = repairPacket === undefined ? manuscript.suggestedAction ?? "review-copy" : "review-source-cycle";
    const encodedSlug = repairPacket === undefined ? "" : encodeURIComponent(repairPacket.slug);
    return Object.freeze({
      slug: manuscript.slug,
      title: manuscript.title,
      status,
      publicationDistance: publicationDistance(manuscript, status),
      nextAction,
      nextActionLabel: action.label,
      nextActionHref: action.href,
      standardsHref: manuscript.standardsHtmlUrl,
      standardsJsonHref: manuscript.standardsUrl,
      publicHref: manuscript.publicUrl,
      editorialHold: repairPacket !== undefined,
      ...(repairPacket === undefined ? {} : {
        sourceCycleRepairHref: `/operators/source-cycle/repairs/${encodedSlug}`,
        sourceCycleRepairJsonHref: `/operators/source-cycle/repairs/${encodedSlug}.json`,
        sourceCycleTaskCount: repairPacket.taskCount,
        sourceCycleHighestPriority: repairPacket.highestPriority,
      }),
      sourceCycleWarnings: Object.freeze(repairPacket === undefined ? [] : repairPacket.tasks.map((task) => task.instruction)),
      wordCount: manuscript.standards.wordCount,
      missingWords: Math.max(0, 800 - manuscript.standards.wordCount),
      referenceCount: manuscript.standards.referenceCount,
      errorCount: manuscript.standards.errorCount,
      warningCount: manuscript.standards.warningCount,
      findingCodes: Object.freeze(manuscript.standards.findings.map((finding) => finding.code)),
      note: publicationCandidateNote(manuscript, status, repairPacket),
    });
  }).sort((left, right) => left.publicationDistance - right.publicationDistance || left.title.localeCompare(right.title));
  return Object.freeze({
    kind: "koios.newsroom.publication-candidates" as const,
    generatedAt: new Date().toISOString(),
    draftCount: drafts.length,
    publishableDraftCount: candidates.filter((candidate) => candidate.status === "ready-to-publish").length,
    editorialHoldCount: candidates.filter((candidate) => candidate.status === "editorial-hold").length,
    oneClickRepairCount: candidates.filter((candidate) => candidate.status === "one-click-repair").length,
    copyEditRequiredCount: candidates.filter((candidate) => candidate.status === "copy-edit-required").length,
    candidates: Object.freeze(candidates),
    policy: Object.freeze([
      "Publication candidates are a projection over manuscript standards reviews; they do not create a second task store.",
      "Ready-to-publish means the draft is standards-clear and has no open source-cycle repair packet.",
      "Editorial holds mean the manuscript may satisfy mechanical standards but still has source-cycle repair work, usually around source alignment, warrant, or references.",
      "One-click repairs are repair-and-review candidates; operators still review the resulting standards packet before publishing.",
      "Sources remain intake material; publication candidates only count CSL references in manuscript frontmatter.",
    ]),
  });
}

function publicationCandidateActionHtml(candidate: PublicationCandidate): string {
  if (candidate.nextAction === "publish" || candidate.nextAction === "repair-headings" || candidate.nextAction === "repair-seo-heading" || candidate.nextAction === "normalize-references" || candidate.nextAction === "apply-standards-defaults") {
    return `<form method="post" action="${escapeHtml(candidate.nextActionHref)}"><button type="submit">${escapeHtml(candidate.nextActionLabel)}</button></form>`;
  }
  return `<a href="${escapeHtml(candidate.nextActionHref)}">${escapeHtml(candidate.nextActionLabel)}</a>`;
}

function publicationCandidateRowsHtml(candidates: readonly PublicationCandidate[]): string {
  return candidates.map((candidate) => [
    "<tr>",
    `<td><a href="${escapeHtml(candidate.standardsHref)}">${escapeHtml(candidate.title)}</a></td>`,
    `<td>${escapeHtml(candidate.status)}</td>`,
    `<td>${candidate.publicationDistance}</td>`,
    `<td>${candidate.wordCount}${candidate.missingWords === 0 ? "" : ` (${candidate.missingWords} short)`}</td>`,
    `<td>${candidate.referenceCount}</td>`,
    `<td>${candidate.errorCount}</td>`,
    `<td>${escapeHtml(candidate.findingCodes.join(", "))}</td>`,
    `<td>${escapeHtml(candidate.note)}</td>`,
    `<td><a href="${escapeHtml(candidate.standardsJsonHref)}">JSON</a> · <a href="${escapeHtml(candidate.publicHref)}">public</a>${candidate.sourceCycleRepairHref === undefined ? "" : ` · <a href="${escapeHtml(candidate.sourceCycleRepairHref)}">source repair</a>`}</td>`,
    `<td>${publicationCandidateActionHtml(candidate)}</td>`,
    "</tr>",
  ].join("")).join("\n");
}

function publicationCandidatesHtml(reading: PublicationCandidatesReading): string {
  const policy = reading.policy.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  const body = [
    "<article>",
    "<h1>Publication candidates</h1>",
    `<p>${reading.draftCount} drafts · ${reading.publishableDraftCount} ready · ${reading.editorialHoldCount} editorial hold · ${reading.oneClickRepairCount} one-click repair · ${reading.copyEditRequiredCount} need copy editing.</p>`,
    '<p><a href="/operators/publication-candidates.json">candidates JSON</a> · <a href="/operators/manuscripts.html">manuscript queue</a> · <a href="/operators/work-queue">work queue</a> · <a href="/">desk</a></p>',
    `<ul>${policy}</ul>`,
    reading.candidates.length === 0 ? "<p>No draft manuscripts are waiting for publication work.</p>" :
      `<table><thead><tr><th>title</th><th>status</th><th>distance</th><th>words</th><th>refs</th><th>errors</th><th>findings</th><th>note</th><th>surface</th><th>action</th></tr></thead><tbody>${publicationCandidateRowsHtml(reading.candidates)}</tbody></table>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Publication candidates", body, "/operators/publication-candidates");
}

function linkedSurface(href: string): string {
  return `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`;
}

function upstreamListHtml(upstream: readonly string[]): string {
  return `<ul>${upstream.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("\n")}</ul>`;
}

function topologyPatternHtml(pattern: TopologyConstructionPattern): string {
  return [
    "<section>",
    `<h3>${escapeHtml(pattern.id)}</h3>`,
    `<p><strong>${escapeHtml(pattern.status)}</strong> · next surface: ${linkedSurface(pattern.nextSurface)}</p>`,
    `<p>${escapeHtml(pattern.construction)}</p>`,
    `<p>${escapeHtml(pattern.koiosUse)}</p>`,
    `<p><strong>Constraint:</strong> ${escapeHtml(pattern.constraint)}</p>`,
    "<details><summary>Upstream evidence</summary>",
    upstreamListHtml(pattern.upstream),
    "</details>",
    "</section>",
  ].join("\n");
}

function editorialMetricTaskHtml(task: EditorialMetricTask): string {
  return [
    "<section>",
    `<h3>${escapeHtml(task.id)}</h3>`,
    `<p><strong>${escapeHtml(task.status)}</strong> · next surface: ${linkedSurface(task.nextSurface)}</p>`,
    `<p>${escapeHtml(task.metric)}</p>`,
    `<p><strong>Constraint:</strong> ${escapeHtml(task.constraint)}</p>`,
    `<p><strong>Evidence:</strong> ${escapeHtml(task.evidence.join(", "))}</p>`,
    "</section>",
  ].join("\n");
}

function developingCapabilityHtml(capability: DevelopingCapability): string {
  return [
    "<tr>",
    `<td>${escapeHtml(capability.id)}</td>`,
    `<td>${escapeHtml(capability.area)}</td>`,
    `<td>${escapeHtml(capability.status)}</td>`,
    `<td>${escapeHtml(capability.intention)}</td>`,
    `<td>${escapeHtml(capability.constraint)}</td>`,
    "</tr>",
  ].join("");
}

function developingOfficeHtml(reading: DevelopingOfficeReading): string {
  const principles = reading.principles.map((principle) => `<li>${escapeHtml(principle)}</li>`).join("\n");
  const topologyPatterns = reading.topologyConstruction.patterns.map(topologyPatternHtml).join("\n");
  const metrics = reading.editorialMetricTasks.map(editorialMetricTaskHtml).join("\n");
  const capabilities = reading.capabilities.map(developingCapabilityHtml).join("\n");
  const reviewed = reading.topologyConstruction.reviewed.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("\n");
  const analyticsCollected = reading.analytics.collected.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  const analyticsExcluded = reading.analytics.excluded.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  const providers = reading.advertising.providers.map((provider) => [
    "<tr>",
    `<td>${escapeHtml(provider.id)}</td>`,
    `<td>${escapeHtml(provider.status)}</td>`,
    `<td>${escapeHtml(provider.unitIds?.join(", ") ?? provider.unitId ?? "")}</td>`,
    `<td>${escapeHtml(provider.intendedUse)}</td>`,
    "</tr>",
  ].join("")).join("\n");
  const body = [
    "<article>",
    "<h1>Developing office</h1>",
    '<p><a href="/administrating/developing.json">developing JSON</a> · <a href="/operators/workbench.json">workbench JSON</a> · <a href="/operators/work-queue">work queue</a> · <a href="/">desk</a></p>',
    "<h2>Principles</h2>",
    `<ul>${principles}</ul>`,
    "<h2>Topology construction</h2>",
    `<p>Stance: <strong>${escapeHtml(reading.topologyConstruction.stance)}</strong>. Reviewed ${reading.topologyConstruction.reviewed.length} upstream packages or content notes.</p>`,
    topologyPatterns,
    "<details><summary>Reviewed upstream and content material</summary>",
    `<ul>${reviewed}</ul>`,
    "</details>",
    "<h2>Editorial metrics</h2>",
    metrics,
    "<h2>Capabilities</h2>",
    `<table><thead><tr><th>id</th><th>area</th><th>status</th><th>intention</th><th>constraint</th></tr></thead><tbody>${capabilities}</tbody></table>`,
    "<h2>Analytics stance</h2>",
    `<p>${escapeHtml(reading.analytics.stance)}</p>`,
    "<h3>Collected</h3>",
    `<ul>${analyticsCollected}</ul>`,
    "<h3>Excluded</h3>",
    `<ul>${analyticsExcluded}</ul>`,
    "<h2>Advertising</h2>",
    `<p>${reading.advertising.adsenseReady ? "AdSense is configured." : "AdSense is not configured."} ${escapeHtml(reading.advertising.plannedRouting)}</p>`,
    `<table><thead><tr><th>provider</th><th>status</th><th>units</th><th>intended use</th></tr></thead><tbody>${providers}</tbody></table>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Developing office", body, "/administrating/developing");
}

function dashboardHtml(demand: readonly DemandEntry[], runs: readonly MillRunRecord[], views: ViewCounts, manuscripts: readonly OperatorManuscriptReading[], assignments: readonly AssignmentReading[], internalLinkPlacements: InternalLinkPlacementReading, corrections: CorrectionRegisterReading): string {
  const demandRows = demand.map((entry) => [
    "<tr>",
    `<td>${escapeHtml(entry.term)}</td><td>${escapeHtml(entry.beat)}</td><td>${entry.score.toFixed(1)}</td>`,
    `<td>${entry.evidence.views}</td><td>${entry.evidence.impressions}</td><td>${entry.evidence.clicks}</td><td>${entry.evidence.covered}</td>`,
    "</tr>",
  ].join("")).join("\n");
  const runRows = [...runs].reverse().slice(0, 30).map((run) => [
    "<tr>",
    `<td>${escapeHtml(run.t ?? "")}</td><td>${escapeHtml(run.term ?? "")}</td><td>${escapeHtml(run.slug ?? "")}</td>`,
    `<td>${run.shipped === true ? "shipped" : run.obstruction === undefined ? "withheld" : `obstructed: ${escapeHtml(run.obstruction)}`}</td>`,
    `<td>${(run.gates ?? []).map((gate) => `${gate.charge === "pass" ? "pass" : "fail"}:${escapeHtml(gate.gate ?? "gate")}`).join(" ") || escapeHtml(run.evidence ?? "")}</td>`,
    "</tr>",
  ].join("")).join("\n");
  const topPaths = Object.entries(views.byPath).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([path, count]) => `<tr><td>${escapeHtml(path)}</td><td>${count}</td></tr>`).join("\n");
  const manuscriptRows = manuscriptRowsHtml(manuscripts);
  const assignmentRows = assignmentRowsHtml(assignments);
  const body = [
    "<article>",
    "<h1>The desk</h1>",
    `<p>${views.total} witnessed views. Demand creates assignments: the top row is the next cycle's story.</p>`,
    "<h2>Manuscripts</h2>",
    '<p><a href="/operators/manuscripts.html">manuscript queue</a> · <a href="/operators/manuscripts/new">create draft manuscript</a></p>',
    manuscripts.length === 0 ? "<p>No manuscripts in the content store.</p>" :
      `<table><thead><tr><th>title</th><th>status</th><th>next</th><th>words</th><th>references</th><th>errors</th><th>warnings</th><th>seo</th><th>surface</th><th>action</th></tr></thead><tbody>${manuscriptRows}</tbody></table>`,
    "<h2>Assignments</h2>",
    '<p><a href="/operators/work-queue">operator work queue</a> · <a href="/operators/assignments.html">assignment queue</a> · <a href="/operators/assignments/new">create assignment</a></p>',
    '<form method="post" action="/operators/assignments/next"><button type="submit">assign next demand</button></form>',
    assignments.length === 0 ? "<p>No assignments yet.</p>" :
      `<table><thead><tr><th>term</th><th>beat</th><th>status</th><th>priority</th><th>assignee</th><th>sources</th><th>readings</th><th>manuscript</th><th>action</th></tr></thead><tbody>${assignmentRows}</tbody></table>`,
    "<h2>Source cycle</h2>",
    '<p>Refresh Koios-owned wires, assemble witnessed intake, and run one farm drafting cycle through the configured LLM provider.</p>',
    '<p><a href="/operators/research-packets/new">research packet</a> · <a href="/operators/sources.json">source roll</a> · <a href="/operators/source-cycle/plan.json">source-cycle plan</a> · <a href="/operators/source-cycle/repairs">source-cycle repairs</a> · <a href="/operators/source-cycle/repairs.json">repair JSON</a></p>',
    '<form method="post" action="/operators/source-cycle"><button type="submit">run source cycle</button></form>',
    "<h2>Content quality</h2>",
    '<p><a href="/operators/content/quality">quality board</a> · <a href="/operators/content/graph">content graph</a> · <a href="/operators/content/predication">predication board</a> · <a href="/operators/content/revisions">revision backlog</a> · <a href="/operators/content/quality.json">quality JSON</a> · <a href="/operators/content/graph.json">graph JSON</a> · <a href="/operators/content/predication.json">predication JSON</a> · <a href="/operators/content/revisions.json">revision JSON</a></p>',
    "<h2>Corrections</h2>",
    `<p>${corrections.correctionCount} declared ${corrections.correctionCount === 1 ? "correction" : "corrections"} across ${corrections.articleCount} ${corrections.articleCount === 1 ? "article" : "articles"}.</p>`,
    '<p><a href="/operators/corrections">corrections board</a> · <a href="/operators/corrections.json">corrections JSON</a> · <a href="https://koios.news/corrections">public register</a></p>',
    "<h2>Internal links</h2>",
    `<p>${internalLinkPlacements.placementCount} paragraph-level placement packets across ${internalLinkPlacements.articleCount} articles. Forms below apply only conservative patches that wrap an existing phrase.</p>`,
    internalLinkPlacementQueueHtml(internalLinkPlacements),
    "<h2>Demand</h2>",
    `<table><thead><tr><th>term</th><th>beat</th><th>score</th><th>views</th><th>impr</th><th>clicks</th><th>covered</th></tr></thead><tbody>${demandRows}</tbody></table>`,
    "<h2>Mill runs</h2>",
    runs.length === 0 ? "<p>No cycles recorded yet.</p>" :
      `<table><thead><tr><th>day</th><th>term</th><th>slug</th><th>outcome</th><th>gates</th></tr></thead><tbody>${runRows}</tbody></table>`,
    "<h2>Views by path</h2>",
    views.total === 0 ? "<p>No views witnessed yet.</p>" :
      `<table><thead><tr><th>path</th><th>views</th></tr></thead><tbody>${topPaths}</tbody></table>`,
    '<p><a href="/publication-game.json">publication-game.json</a> · <a href="/departments.json">departments.json</a> · <a href="/administrating/developing">developing office</a> · <a href="/administrating/developing.json">developing.json</a> · <a href="/operators/workbench.json">operators/workbench.json</a> · <a href="/operators/work-queue.json">work-queue.json</a> · <a href="/operators/publication-candidates">publication-candidates</a> · <a href="/operators/publication-candidates.json">publication-candidates.json</a> · <a href="/operators/sources.json">sources.json</a> · <a href="/operators/research-packets/new">research-packet form</a> · <a href="/operators/research-packets.json?term=AI%20infrastructure%20energy%20use&beat=technology">research-packet.json</a> · <a href="/operators/writing/internal-link-guidance.json?term=AI%20infrastructure%20energy%20use&beat=technology&tag=AI%20infrastructure">draft-link-guidance.json</a> · <a href="/operators/source-cycle/plan.json">source-cycle-plan.json</a> · <a href="/operators/source-cycle/repairs.json">source-cycle-repairs.json</a> · <a href="/operators/manuscripts.json">operators/manuscripts.json</a> · <a href="/operators/assignments.json">operators/assignments.json</a> · <a href="/operators/content/performance.json">content-performance.json</a> · <a href="/operators/content/graph">content-graph</a> · <a href="/operators/content/graph.json">content-graph.json</a> · <a href="/operators/content/quality.json">content-quality.json</a> · <a href="/operators/content/predication">content-predication</a> · <a href="/operators/content/predication.json">content-predication.json</a> · <a href="/operators/content/internal-links.json">internal-links.json</a> · <a href="/operators/content/internal-link-placements.json">internal-link-placements.json</a> · <a href="/operators/corrections.json">corrections.json</a> · <a href="/operators/advertising/performance.json">ad-performance.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/mcp">mcp</a></p>',
    "</article>",
  ].join("\n");
  return render(koiosTheme, body, {
    title: `Newsroom — ${KOIOS_TITLE}`,
    siteName: `${KOIOS_TITLE} Newsroom`,
    description: "The Koios.News mill's control panel: demand, runs, gates, views.",
    canonical: "https://newsroom.koios.news/",
    lang: "en",
    author: KOIOS_EDITOR,
    nav: [{ href: "/", label: "Desk", current: true }, { href: "https://koios.news/", label: "The site" }],
  });
}

function newsroomPage(title: string, body: string, path: string): string {
  return render(koiosTheme, body, {
    title: `${title} — ${KOIOS_TITLE} Newsroom`,
    siteName: `${KOIOS_TITLE} Newsroom`,
    description: "Human operator surface for the Koios.News newsroom.",
    canonical: `https://newsroom.koios.news${path}`,
    lang: "en",
    author: KOIOS_EDITOR,
    nav: [{ href: "/", label: "Desk" }, { href: "/operators/assignments/new", label: "New assignment" }, { href: "/operators/manuscripts/new", label: "New draft" }, { href: "https://koios.news/", label: "The site" }],
  });
}

function errorHtml(title: string, detail: string, backHref: string): string {
  return newsroomPage(title, [
    "<article>",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(detail)}</p>`,
    `<p><a href="${escapeHtml(backHref)}">Back to the form</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n"), backHref);
}

function input(name: string, label: string, options: Readonly<{ value?: string | undefined; required?: boolean; type?: string; help?: string }> = {}): string {
  return [
    `<label>${escapeHtml(label)}`,
    `<input name="${escapeHtml(name)}" type="${escapeHtml(options.type ?? "text")}" value="${escapeHtml(options.value ?? "")}"${options.required ? " required" : ""}>`,
    options.help ? `<small>${escapeHtml(options.help)}</small>` : "",
    `</label>`,
  ].filter(Boolean).join("");
}

function textarea(name: string, label: string, options: Readonly<{ value?: string; required?: boolean; rows?: number; help?: string }> = {}): string {
  return [
    `<label>${escapeHtml(label)}`,
    `<textarea name="${escapeHtml(name)}" rows="${options.rows ?? 5}"${options.required ? " required" : ""}>${escapeHtml(options.value ?? "")}</textarea>`,
    options.help ? `<small>${escapeHtml(options.help)}</small>` : "",
    `</label>`,
  ].filter(Boolean).join("");
}

function assignmentFormHtml(demand: readonly DemandEntry[]): string {
  const next = demand[0];
  const beatOptions = [...new Set(SEED_KEYWORDS.map((seed) => seed.beat))].sort()
    .map((beat) => `<option value="${escapeHtml(beat)}"${next?.beat === beat ? " selected" : ""}>${escapeHtml(beat)}</option>`).join("");
  const body = [
    `<article class="operator-form">`,
    `<h1>Create assignment</h1>`,
    `<p>Assignments turn research demand into explicit editorial work before a draft exists.</p>`,
    `<form method="post" action="/operators/assignments/form">`,
    input("term", "Term", { value: next?.term, required: true }),
    `<label>Beat<select name="beat" required>${beatOptions}</select></label>`,
    input("priority", "Priority", { value: next?.score.toFixed(1), type: "number", help: "Non-negative numeric priority." }),
    textarea("summary", "Summary", { value: next ? `Report the ${next.term} story for the ${next.beat} beat.` : "", rows: 3 }),
    textarea("angle", "Angle", { rows: 3, help: "What makes this assignment worth writing now?" }),
    input("assignee", "Assignee"),
    input("dueAt", "Due at", { help: "Optional ISO-ish due date/time." }),
    textarea("sourceUrls", "Source URLs", { rows: 4, help: "One http(s) URL per line." }),
    `<button type="submit">Create assignment</button>`,
    `</form>`,
    `</article>`,
  ].join("\n");
  return newsroomPage("Create assignment", body, "/operators/assignments/new");
}

function manuscriptFormHtml(): string {
  const beatOptions = [...new Set(SEED_KEYWORDS.map((seed) => seed.beat))].sort()
    .map((beat) => `<option value="${escapeHtml(beat)}">${escapeHtml(beat)}</option>`).join("");
  const body = [
    `<article class="operator-form">`,
    `<h1>Create draft manuscript</h1>`,
    `<p>This writes a draft only. Standards review and publishing remain separate gates.</p>`,
    `<form method="post" action="/operators/manuscripts/form">`,
    input("title", "Title", { required: true }),
    textarea("summary", "Summary", { required: true, rows: 3 }),
    input("seoTerm", "SEO term", { required: true }),
    `<label>Beat<select name="beat" required>${beatOptions}</select></label>`,
    textarea("body", "Body", { required: true, rows: 16 }),
    textarea("referenceUrls", "Reference URLs", { required: true, rows: 5, help: "One http(s) URL per line; the draft stores these as CSL references." }),
    textarea("tags", "Tags", { rows: 3, help: "One tag per line." }),
    input("category", "Category"),
    input("slug", "Slug"),
    input("date", "Date", { type: "date" }),
    input("license", "License"),
    input("licenseUrl", "License URL", { type: "url" }),
    textarea("syndicationRights", "Syndication rights", { rows: 3 }),
    `<button type="submit">Create draft</button>`,
    `</form>`,
    `</article>`,
  ].join("\n");
  return newsroomPage("Create draft manuscript", body, "/operators/manuscripts/new");
}

function assignmentDraftFormHtml(assignment: AssignmentReading, linkGuidance: DraftInternalLinkGuidanceReading): string {
  const body = [
    `<article class="operator-form">`,
    `<h1>Draft assignment</h1>`,
    `<p><strong>${escapeHtml(assignment.term)}</strong> on ${escapeHtml(assignment.beat)}. The assignment term becomes the SEO term and the assignment beat becomes the manuscript beat.</p>`,
    assignment.angle ? `<p>${escapeHtml(assignment.angle)}</p>` : "",
    `<section aria-labelledby="assignment-draft-links-title">`,
    `<h2 id="assignment-draft-links-title">Same-site links to consider</h2>`,
    draftInternalLinkGuidanceHtml(linkGuidance),
    `</section>`,
    `<form method="post" action="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}/manuscripts/form">`,
    input("title", "Title", { required: true }),
    textarea("summary", "Summary", { required: true, rows: 3 }),
    textarea("body", "Body", { required: true, rows: 16 }),
    textarea("referenceUrls", "Reference URLs", { value: assignment.sourceUrls.join("\n"), rows: 5, help: "Assignment source URLs are promoted into CSL references when the draft is created." }),
    textarea("tags", "Tags", { value: assignment.term, rows: 3, help: "One tag per line." }),
    input("category", "Category", { value: assignment.beat }),
    input("slug", "Slug"),
    input("date", "Date", { type: "date" }),
    input("license", "License"),
    input("licenseUrl", "License URL", { type: "url" }),
    textarea("syndicationRights", "Syndication rights", { rows: 3 }),
    `<button type="submit">Create assignment draft</button>`,
    `</form>`,
    `</article>`,
  ].filter(Boolean).join("\n");
  return newsroomPage("Draft assignment", body, `/operators/assignments/${encodeURIComponent(assignment.assignmentId)}/manuscripts/new`);
}

function researchPacketFormHtml(demand: readonly DemandEntry[]): string {
  const next = demand[0];
  const beatOptions = [...new Set(SEED_KEYWORDS.map((seed) => seed.beat))].sort()
    .map((beat) => `<option value="${escapeHtml(beat)}"${next?.beat === beat ? " selected" : ""}>${escapeHtml(beat)}</option>`).join("");
  const body = [
    `<article class="operator-form">`,
    `<h1>Research packet</h1>`,
    `<p>Assemble local wire evidence before drafting. Sources remain intake material; references are only the CSL-shaped cited cut available to writing.</p>`,
    `<form method="get" action="/operators/research-packets">`,
    input("term", "Term", { value: next?.term, required: true }),
    `<label>Beat<select name="beat" required>${beatOptions}</select></label>`,
    input("limit", "Limit", { value: "12", type: "number", help: "1-50 local wire bundles." }),
    textarea("sourceUrls", "Additional source URLs", { rows: 4, help: "Optional. One http(s) URL per line to force into the research context if present in local wires." }),
    `<button type="submit">Read packet</button>`,
    `</form>`,
    `</article>`,
  ].join("\n");
  return newsroomPage("Research packet", body, "/operators/research-packets/new");
}

function researchPacketHtml(packet: ResearchPacket, linkGuidance: DraftInternalLinkGuidanceReading): string {
  const risks = packet.editorialRisks.map((risk) => `<li><strong>${escapeHtml(risk.severity)}</strong> ${escapeHtml(risk.code)}: ${escapeHtml(risk.message)}</li>`).join("\n");
  const sources = packet.intakeSources.map((source) => [
    `<article class="operator-work-item">`,
    `<h3><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a></h3>`,
    `<p>${escapeHtml(source.domain ?? source.url)} · score ${source.score}${source.published === undefined ? "" : ` · ${escapeHtml(source.published)}`}</p>`,
    source.summary === undefined ? "" : `<p>${escapeHtml(source.summary)}</p>`,
    source.matchedTerms.length === 0 ? "" : `<p>Matched: ${source.matchedTerms.map(escapeHtml).join(" · ")}</p>`,
    `</article>`,
  ].filter(Boolean).join("\n")).join("\n");
  const context = packet.context.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n");
  const references = packet.candidateReferences.map((reference) => {
    const title = String(reference["title"] ?? reference["URL"] ?? reference["id"] ?? "reference");
    const url = typeof reference["URL"] === "string" ? reference["URL"] : undefined;
    return `<li><code>@${escapeHtml(String(reference["id"] ?? ""))}</code> ${url === undefined ? escapeHtml(title) : `<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`}</li>`;
  }).join("\n");
  const body = [
    `<article>`,
    `<h1>Research packet</h1>`,
    `<p><strong>${escapeHtml(packet.term)}</strong> · ${escapeHtml(packet.beat)} · ${packet.selectedCount}/${packet.sourceCount} selected local wire bundles · ${packet.warrant.sourceDomainCount} source domains.</p>`,
    `<p>${escapeHtml(packet.warrant.note)}</p>`,
    `<p><a href="/operators/research-packets.json?term=${escapeHtml(encodeURIComponent(packet.term))}&beat=${escapeHtml(encodeURIComponent(packet.beat))}">packet JSON</a> · <a href="/operators/writing/internal-link-guidance.json?term=${escapeHtml(encodeURIComponent(packet.term))}&beat=${escapeHtml(encodeURIComponent(packet.beat))}&tag=${escapeHtml(encodeURIComponent(packet.term))}">link guidance JSON</a> · <a href="/operators/research-packets/new">new packet</a> · <a href="/">Desk</a></p>`,
    `</article>`,
    `<section><h2>Editorial risks</h2>${risks === "" ? "<p>No editorial risks recorded.</p>" : `<ul>${risks}</ul>`}</section>`,
    `<section><h2>Same-site links to consider</h2>${draftInternalLinkGuidanceHtml(linkGuidance)}</section>`,
    `<section><h2>Intake sources</h2>${sources === "" ? "<p>No matching local wire sources.</p>" : sources}</section>`,
    `<section><h2>Context lines</h2>${context === "" ? "<p>No context lines.</p>" : `<ol>${context}</ol>`}</section>`,
    `<section><h2>Candidate CSL references</h2>${references === "" ? "<p>No candidate references.</p>" : `<ol>${references}</ol>`}</section>`,
  ].join("\n");
  return newsroomPage("Research packet", body, "/operators/research-packets");
}

function assignmentCreatedHtml(result: CreateAssignmentResult): string {
  const assignment = result.assignment;
  const body = [
    "<article>",
    `<h1>${result.created ? "Assignment created" : "Assignment reused"}</h1>`,
    `<p><strong>${escapeHtml(assignment.term)}</strong> is queued for ${escapeHtml(assignment.beat)} with priority ${assignment.priority.toFixed(1)}.</p>`,
    assignment.summary === undefined ? "" : `<p>${escapeHtml(assignment.summary)}</p>`,
    `<p><a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}/research.json">Research packet</a> · <a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}/link-guidance.json">Link guidance</a> · <a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}/manuscripts/new">Draft this assignment</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].filter(Boolean).join("\n");
  return newsroomPage(result.created ? "Assignment created" : "Assignment reused", body, "/operators/assignments/new");
}

function revisionAssignmentCreatedHtml(result: CreateAssignmentResult, packet: ContentRevisionPacket): string {
  const assignment = result.assignment;
  const body = [
    "<article>",
    `<h1>${result.created ? "Revision assignment created" : "Revision assignment reused"}</h1>`,
    `<p><strong>${escapeHtml(packet.headline)}</strong> is queued for revision as <code>${escapeHtml(assignment.assignmentId)}</code>.</p>`,
    `<p>${packet.taskCount} tasks · top priority ${packet.highestPriority} · assignment priority ${assignment.priority.toFixed(1)}.</p>`,
    `<p><a href="/operators/content/revisions/${escapeHtml(encodeURIComponent(packet.slug))}">Revision packet</a> · <a href="/operators/assignments.json">assignments JSON</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage(result.created ? "Revision assignment created" : "Revision assignment reused", body, `/operators/content/revisions/${encodeURIComponent(packet.slug)}`);
}

function graphAssignmentCreatedHtml(result: CreateAssignmentResult, node: ContentGraphNode): string {
  const assignment = result.assignment;
  const encoded = encodeURIComponent(node.slug);
  const body = [
    "<article>",
    `<h1>${result.created ? "Graph assignment created" : "Graph assignment reused"}</h1>`,
    `<p><strong>${escapeHtml(node.headline)}</strong> is queued for topology repair as <code>${escapeHtml(assignment.assignmentId)}</code>.</p>`,
    `<p>${node.inboundInternalLinks.length} inbound · ${node.outboundInternalLinks.length} outbound · centrality ${node.graphCentrality} · assignment priority ${assignment.priority.toFixed(1)}.</p>`,
    `<p><a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}">Assignment work order</a> · <a href="/operators/content/graph">Content graph</a> · <a href="/operators/content/predication/${escapeHtml(encoded)}">Predication packet</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage(result.created ? "Graph assignment created" : "Graph assignment reused", body, `/operators/content/graph/${encoded}/assign.html`);
}

function sourceCycleRepairAssignmentCreatedHtml(result: CreateAssignmentResult, packet: SourceCycleRepairPacket): string {
  const assignment = result.assignment;
  const encoded = encodeURIComponent(packet.slug);
  const body = [
    "<article>",
    `<h1>${result.created ? "Source-cycle repair assignment created" : "Source-cycle repair assignment reused"}</h1>`,
    `<p><strong>${escapeHtml(packet.slug)}</strong> is queued as <code>${escapeHtml(assignment.assignmentId)}</code>.</p>`,
    `<p>${packet.taskCount} tasks · top priority ${packet.highestPriority} · candidate ${escapeHtml(packet.candidate.status)} · assignment priority ${assignment.priority.toFixed(1)}.</p>`,
    `<p><a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}">Assignment work order</a> · <a href="/operators/source-cycle/repairs">Source-cycle repairs</a> · <a href="/operators/source-cycle/repairs.json">repair JSON</a> · <a href="/">Desk</a></p>`,
    `</article>`,
  ].join("\n");
  return newsroomPage(result.created ? "Source-cycle repair assignment created" : "Source-cycle repair assignment reused", body, `/operators/source-cycle/repairs/${encoded}/assign.html`);
}

function assignmentCompletedHtml(result: CompleteAssignmentResult): string {
  const assignment = result.assignment;
  const body = [
    "<article>",
    `<h1>${result.completed ? "Assignment completed" : "Assignment already complete"}</h1>`,
    `<p><strong>${escapeHtml(assignment.term)}</strong> is ${escapeHtml(assignment.status)}${assignment.completedAt === undefined ? "" : ` as of ${escapeHtml(assignment.completedAt)}`}.</p>`,
    `<p><a href="/operators/assignments.json">assignments JSON</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage(result.completed ? "Assignment completed" : "Assignment already complete", body, `/operators/assignments/${encodeURIComponent(assignment.assignmentId)}/complete.html`);
}

function assignmentWorkOrderHtml(order: OperatorAssignmentWorkOrder, linkGuidance: DraftInternalLinkGuidanceReading): string {
  const assignment = order.assignment;
  const actions = order.actions;
  const repairSlug = assignmentSourceCycleRepairSlug(assignment);
  const revisionSlug = assignmentRevisionSlug(assignment);
  const sourceCycleRepairLink = repairSlug === "" ? "" :
    `<p><a href="/operators/source-cycle/repairs/${escapeHtml(encodeURIComponent(repairSlug))}">Source-cycle repair packet</a> · <a href="/operators/source-cycle/repairs/${escapeHtml(encodeURIComponent(repairSlug))}.json">packet JSON</a></p>`;
  const revisionPacketLink = revisionSlug === "" ? "" :
    `<p><a href="/operators/content/revisions/${escapeHtml(encodeURIComponent(revisionSlug))}">Revision packet</a> · <a href="/operators/content/revisions/${escapeHtml(encodeURIComponent(revisionSlug))}.json">packet JSON</a></p>`;
  const sourceUrls = assignment.sourceUrls.length === 0
    ? "<p>No intake source URLs are attached.</p>"
    : `<ul>${assignment.sourceUrls.map((url) => `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`).join("\n")}</ul>`;
  const evidence = assignment.evidence === undefined ? "<p>No demand evidence is attached.</p>" : [
    "<table><thead><tr><th>views</th><th>impressions</th><th>clicks</th><th>covered</th></tr></thead><tbody><tr>",
    `<td>${assignment.evidence.views}</td>`,
    `<td>${assignment.evidence.impressions}</td>`,
    `<td>${assignment.evidence.clicks}</td>`,
    `<td>${assignment.evidence.covered}</td>`,
    "</tr></tbody></table>",
  ].join("");
  const notes = order.operatorNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("\n");
  const completeAction = actions.completeHtmlUrl === undefined ? "" :
    `<form method="post" action="${escapeHtml(actions.completeHtmlUrl)}"><button type="submit">Complete assignment</button></form>`;
  const draftAction = actions.draftHtmlUrl === undefined ? "" :
    `<p><a href="${escapeHtml(actions.draftHtmlUrl)}">Draft from assignment</a></p>`;
  const manuscript = actions.manuscriptUrl === undefined ? "" :
    `<p>Manuscript: <a href="${escapeHtml(actions.manuscriptUrl)}">${escapeHtml(assignment.manuscriptSlug ?? actions.manuscriptUrl)}</a></p>`;
  const noteForm = [
    `<form method="post" action="${escapeHtml(actions.noteHtmlUrl)}">`,
    textarea("body", "Operator note", { required: true, rows: 4, help: "Internal editorial context. Notes are not sources, references, or public copy." }),
    input("author", "Author", { help: "Optional operator name or agent id." }),
    `<button type="submit">Record note</button>`,
    `</form>`,
  ].join("\n");
  const body = [
    "<article>",
    `<h1>${escapeHtml(assignment.term)}</h1>`,
    `<p>${escapeHtml(assignment.beat)} · ${escapeHtml(assignment.status)} · priority ${assignment.priority.toFixed(1)} · created ${escapeHtml(assignment.createdAt)}${assignment.completedAt === undefined ? "" : ` · completed ${escapeHtml(assignment.completedAt)}`}</p>`,
    assignment.summary === undefined ? "" : `<p>${escapeHtml(assignment.summary)}</p>`,
    assignment.angle === undefined ? "" : `<pre>${escapeHtml(assignment.angle)}</pre>`,
    sourceCycleRepairLink,
    revisionPacketLink,
    `<p><a href="${escapeHtml(actions.jsonUrl)}">work-order JSON</a> · <a href="${escapeHtml(actions.activityHtmlUrl)}">activity</a> · <a href="${escapeHtml(actions.activityJsonUrl)}">activity JSON</a> · <a href="${escapeHtml(actions.researchPacketUrl)}">research packet</a> · <a href="/operators/assignments/${escapeHtml(encodeURIComponent(assignment.assignmentId))}/link-guidance.json">link guidance JSON</a> · <a href="/operators/assignments.json">assignments JSON</a> · <a href="/">Desk</a></p>`,
    draftAction,
    completeAction,
    manuscript,
    "</article>",
    "<section><h2>Operator notes</h2>",
    `<ul>${notes}</ul>`,
    noteForm,
    "</section>",
    "<section><h2>Same-site links to consider</h2>",
    draftInternalLinkGuidanceHtml(linkGuidance),
    "</section>",
    "<section><h2>Intake source URLs</h2>",
    sourceUrls,
    "</section>",
    "<section><h2>Demand evidence</h2>",
    evidence,
    "</section>",
  ].filter(Boolean).join("\n");
  return newsroomPage("Assignment work order", body, actions.htmlUrl);
}

function assignmentNoteRecordedHtml(result: CreateAssignmentNoteResult): string {
  const assignmentId = encodeURIComponent(result.assignment.assignmentId);
  const body = [
    "<article>",
    "<h1>Assignment note recorded</h1>",
    `<p><strong>${escapeHtml(result.assignment.term)}</strong> has a new internal operator note${result.note.author === undefined ? "" : ` from ${escapeHtml(result.note.author)}`}.</p>`,
    `<blockquote>${escapeHtml(result.note.body)}</blockquote>`,
    `<p><a href="/operators/assignments/${escapeHtml(assignmentId)}">work order</a> · <a href="/operators/assignments/${escapeHtml(assignmentId)}/activity">activity</a> · <a href="/operators/assignments/${escapeHtml(assignmentId)}/activity.json">activity JSON</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Assignment note recorded", body, `/operators/assignments/${assignmentId}/notes/form`);
}

function assignmentActivityHtml(reading: AssignmentActivityReading): string {
  const events = reading.events.length === 0
    ? "<p>No assignment events are recorded.</p>"
    : `<ol>${reading.events.map((event) => `<li><time datetime="${escapeHtml(event.at)}">${escapeHtml(event.at)}</time> · ${escapeHtml(event.kind)} · ${escapeHtml(event.origin)} · ${escapeHtml(event.label)}</li>`).join("\n")}</ol>`;
  const artifact = reading.artifacts.manuscriptUrl === undefined
    ? "<p>No manuscript artifact is linked to this assignment.</p>"
    : `<p>Manuscript: <a href="${escapeHtml(reading.artifacts.manuscriptUrl)}">${escapeHtml(reading.artifacts.manuscriptSlug ?? reading.artifacts.manuscriptUrl)}</a></p>`;
  const assignmentId = encodeURIComponent(reading.assignmentId);
  const body = [
    "<article>",
    `<h1>Activity: ${escapeHtml(reading.assignment.term)}</h1>`,
    `<p>${escapeHtml(reading.assignment.beat)} · ${escapeHtml(reading.assignment.status)} · ${reading.events.length} ${reading.events.length === 1 ? "event" : "events"}.</p>`,
    `<p><a href="/operators/assignments/${escapeHtml(assignmentId)}">work order</a> · <a href="/operators/assignments/${escapeHtml(assignmentId)}/activity.json">activity JSON</a> · <a href="/operators/assignments/${escapeHtml(assignmentId)}/research.json">research packet</a> · <a href="/">Desk</a></p>`,
    "</article>",
    "<section><h2>Event log</h2>",
    events,
    "</section>",
    "<section><h2>Artifacts</h2>",
    artifact,
    "</section>",
  ].join("\n");
  return newsroomPage("Assignment activity", body, `/operators/assignments/${assignmentId}/activity`);
}

function manuscriptCreatedHtml(result: CreateDraftManuscriptResult): string {
  const body = [
    "<article>",
    "<h1>Draft manuscript created</h1>",
    `<p><strong>${escapeHtml(result.title)}</strong> was written as draft <code>${escapeHtml(result.slug)}</code>.</p>`,
    `<p>${result.wordCount} words · ${result.referenceCount} CSL ${result.referenceCount === 1 ? "reference" : "references"} · ${escapeHtml(result.license)}</p>`,
    `<p><a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(result.slug))}/standards.html">Standards review</a> · <a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(result.slug))}/standards">standards JSON</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encodeURIComponent(result.slug)}`)}">Public draft URL</a> · <a href="/">Desk</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Draft manuscript created", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/standards.html`);
}

function standardsReviewHtml(review: StandardsReview, draftLinkGuidance: readonly StoredDraftInternalLinkGuidance[] = Object.freeze([])): string {
  const errors = review.findings.filter((finding) => finding.severity === "error").length;
  const warnings = review.findings.filter((finding) => finding.severity === "warning").length;
  const findings = review.findings.map((finding) => [
    `<article class="operator-work-item">`,
    `<h3>${escapeHtml(finding.code)}</h3>`,
    `<p>${escapeHtml(finding.severity)} · ${escapeHtml(finding.gate)}</p>`,
    `<p>${escapeHtml(finding.message)}</p>`,
    `</article>`,
  ].join("\n")).join("\n");
  const action = review.findings.some((finding) => finding.code === "article-sources-field")
    ? `<form method="post" action="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/references/normalize.html"><button type="submit">Normalize references</button></form>`
    : review.findings.some((finding) => ["missing-license", "missing-license-url", "legacy-rights-reserved-license", "missing-syndication-rights"].includes(finding.code))
      ? `<form method="post" action="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/standards/defaults.html"><button type="submit">Apply rights defaults</button></form>`
      : review.findings.some((finding) => finding.code === "malformed-h2-heading")
        ? `<form method="post" action="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/headings/repair.html"><button type="submit">Repair headings</button></form>`
        : review.findings.some((finding) => finding.code === "seo-term-missing-h2")
          ? `<form method="post" action="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/headings/seo.html"><button type="submit">Repair SEO heading</button></form>`
          : review.publishable && review.draft
            ? `<form method="post" action="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/publish.html"><button type="submit">Publish</button></form>`
            : "";
  const body = [
    `<article>`,
    `<h1>Standards review</h1>`,
    `<p><strong>${escapeHtml(review.slug)}</strong> is ${review.publishable ? "publishable" : "not publishable"} and currently ${review.draft ? "draft" : "published"}.</p>`,
    `<p>${review.wordCount} words · ${review.referenceCount} references · ${errors} errors · ${warnings} warnings${review.seoTerm === undefined ? "" : ` · SEO term <code>${escapeHtml(review.seoTerm)}</code>`}</p>`,
    `<p><a href="/operators/manuscripts/${escapeHtml(encodeURIComponent(review.slug))}/standards">standards JSON</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encodeURIComponent(review.slug)}`)}">public URL</a> · <a href="/">Desk</a></p>`,
    action,
    `</article>`,
    storedDraftInternalLinkGuidanceHtml(draftLinkGuidance),
    `<section aria-labelledby="standards-findings-title">`,
    `<h2 id="standards-findings-title">Findings</h2>`,
    findings === "" ? "<p>No findings. The manuscript clears the current standards gate.</p>" : findings,
    `</section>`,
  ].filter(Boolean).join("\n");
  return newsroomPage("Standards review", body, `/operators/manuscripts/${encodeURIComponent(review.slug)}/standards.html`);
}

function standardsResultLinks(slug: string): string {
  const encoded = encodeURIComponent(slug);
  return `<p><a href="/operators/manuscripts/${escapeHtml(encoded)}/standards.html">Standards review</a> · <a href="/operators/manuscripts/${escapeHtml(encoded)}/standards">standards JSON</a> · <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encoded}`)}">public URL</a> · <a href="/">Desk</a></p>`;
}

function standardsReviewSummaryHtml(review: StandardsReview): string {
  const errors = review.findings.filter((finding) => finding.severity === "error").length;
  const warnings = review.findings.filter((finding) => finding.severity === "warning").length;
  return `<p>${review.publishable ? "Publishable" : "Not publishable"} · ${review.draft ? "draft" : "published"} · ${review.wordCount} words · ${review.referenceCount} references · ${errors} errors · ${warnings} warnings.</p>`;
}

function standardsDefaultsAppliedHtml(result: ApplyStandardsDefaultsResult): string {
  const changed = result.changed.length === 0 ? "<p>No metadata defaults needed to change.</p>" : `<ul>${result.changed.map((field) => `<li>${escapeHtml(field)}</li>`).join("\n")}</ul>`;
  const body = [
    "<article>",
    "<h1>Standards defaults applied</h1>",
    `<p><strong>${escapeHtml(result.slug)}</strong> now has the current default rights metadata.</p>`,
    changed,
    standardsReviewSummaryHtml(result.review),
    standardsResultLinks(result.slug),
    "</article>",
  ].join("\n");
  return newsroomPage("Standards defaults applied", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/standards/defaults.html`);
}

function referencesNormalizedHtml(result: NormalizeManuscriptReferencesResult): string {
  const changed = result.changed.length === 0 ? "<p>No reference fields needed to change.</p>" : `<ul>${result.changed.map((field) => `<li>${escapeHtml(field)}</li>`).join("\n")}</ul>`;
  const body = [
    "<article>",
    "<h1>References normalized</h1>",
    `<p><strong>${escapeHtml(result.slug)}</strong> now uses canonical CSL references.</p>`,
    `<p>${result.sourceUrlCount} source URLs inspected · ${result.referenceCount} CSL references available.</p>`,
    changed,
    standardsReviewSummaryHtml(result.review),
    standardsResultLinks(result.slug),
    "</article>",
  ].join("\n");
  return newsroomPage("References normalized", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/references/normalize.html`);
}

function manuscriptHeadingsRepairedHtml(result: RepairManuscriptHeadingsResult): string {
  const changed = result.changed.length === 0
    ? "<p>No conservative heading repair was available.</p>"
    : `<ol>${result.changed.map((item) => [
      "<li>",
      `<p><strong>${escapeHtml(item.heading)}</strong></p>`,
      `<p>${escapeHtml(item.paragraph)}</p>`,
      `<small>from: ${escapeHtml(item.before)}</small>`,
      "</li>",
    ].join("\n")).join("\n")}</ol>`;
  const body = [
    "<article>",
    "<h1>Headings repaired</h1>",
    `<p><strong>${escapeHtml(result.slug)}</strong> had ${result.changed.length} ${result.changed.length === 1 ? "heading" : "headings"} split from body prose.</p>`,
    changed,
    standardsReviewSummaryHtml(result.review),
    standardsResultLinks(result.slug),
    "</article>",
  ].join("\n");
  return newsroomPage("Headings repaired", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/headings/repair.html`);
}

function manuscriptSeoHeadingRepairedHtml(result: RepairManuscriptSeoHeadingResult): string {
  const changed = result.changed.length === 0
    ? "<p>No conservative SEO heading repair was available.</p>"
    : `<ol>${result.changed.map((item) => [
      "<li>",
      `<p><strong>${escapeHtml(item.heading)}</strong></p>`,
      `<small>from: ${escapeHtml(item.before)}</small>`,
      "</li>",
    ].join("\n")).join("\n")}</ol>`;
  const body = [
    "<article>",
    "<h1>SEO heading repaired</h1>",
    `<p><strong>${escapeHtml(result.slug)}</strong> had ${result.changed.length} ${result.changed.length === 1 ? "heading" : "headings"} adjusted for SEO-term placement${result.seoTerm === undefined ? "." : `: <code>${escapeHtml(result.seoTerm)}</code>.`}</p>`,
    changed,
    standardsReviewSummaryHtml(result.review),
    standardsResultLinks(result.slug),
    "</article>",
  ].join("\n");
  return newsroomPage("SEO heading repaired", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/headings/seo.html`);
}

function manuscriptPublishedHtml(result: PublishManuscriptResult): string {
  const body = [
    "<article>",
    "<h1>Manuscript published</h1>",
    `<p><strong>${escapeHtml(result.slug)}</strong> cleared the standards gate and is no longer marked as draft.</p>`,
    standardsReviewSummaryHtml(result.review),
    standardsResultLinks(result.slug),
    "</article>",
  ].join("\n");
  return newsroomPage("Manuscript published", body, `/operators/manuscripts/${encodeURIComponent(result.slug)}/publish.html`);
}

function formText(form: URLSearchParams, name: string): string | undefined {
  const value = form.get(name)?.trim();
  return value === undefined || value === "" ? undefined : value;
}

function formLines(form: URLSearchParams, name: string): readonly string[] | undefined {
  const value = formText(form, name);
  if (value === undefined) return undefined;
  return Object.freeze(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean));
}

function queryLines(params: URLSearchParams, name: string): readonly string[] | undefined {
  const values = params.getAll(name).flatMap((value) => value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean));
  return values.length === 0 ? undefined : Object.freeze(values);
}

function koiosPostSlugFromUrl(value: string): string | undefined {
  try {
    const url = new URL(value, KOIOS_SITE_URL);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "posts" && parts[1] !== undefined ? decodeURIComponent(parts[1]) : undefined;
  } catch {
    return undefined;
  }
}

function formNumber(form: URLSearchParams, name: string): number | undefined {
  const value = formText(form, name);
  return value === undefined ? undefined : Number(value);
}

function assignmentInputFromForm(form: URLSearchParams): unknown {
  return {
    term: formText(form, "term"),
    beat: formText(form, "beat"),
    summary: formText(form, "summary"),
    angle: formText(form, "angle"),
    assignee: formText(form, "assignee"),
    dueAt: formText(form, "dueAt"),
    priority: formNumber(form, "priority"),
    sourceUrls: formLines(form, "sourceUrls"),
  };
}

function assignmentNoteInputFromForm(form: URLSearchParams): unknown {
  return {
    body: formText(form, "body"),
    author: formText(form, "author"),
  };
}

function researchPacketInputFromQuery(params: URLSearchParams): unknown {
  return {
    term: params.get("term")?.trim() ?? "",
    beat: params.get("beat")?.trim() ?? "",
    sourceUrls: queryLines(params, "sourceUrl") ?? queryLines(params, "sourceUrls") ?? [],
    limit: params.get("limit") ?? undefined,
  };
}

function draftInternalLinkGuidanceInputFromQuery(params: URLSearchParams): unknown {
  return {
    term: params.get("term")?.trim() ?? "",
    beat: params.get("beat")?.trim() || undefined,
    tags: queryLines(params, "tag") ?? queryLines(params, "tags") ?? [],
    limit: params.get("limit") ?? undefined,
  };
}

function draftInputFromForm(form: URLSearchParams): unknown {
  const referenceUrls = formLines(form, "referenceUrls") ?? [];
  return {
    title: formText(form, "title"),
    summary: formText(form, "summary"),
    body: formText(form, "body"),
    seoTerm: formText(form, "seoTerm"),
    beat: formText(form, "beat"),
    references: referencesFromSourceUrls(referenceUrls),
    tags: formLines(form, "tags"),
    category: formText(form, "category"),
    slug: formText(form, "slug"),
    date: formText(form, "date"),
    license: formText(form, "license"),
    licenseUrl: formText(form, "licenseUrl"),
    syndicationRights: formText(form, "syndicationRights"),
  };
}

function assignmentDraftInputFromForm(form: URLSearchParams): unknown {
  const referenceUrls = formLines(form, "referenceUrls");
  return {
    title: formText(form, "title"),
    summary: formText(form, "summary"),
    body: formText(form, "body"),
    ...(referenceUrls === undefined ? {} : { references: referencesFromSourceUrls(referenceUrls) }),
    tags: formLines(form, "tags"),
    category: formText(form, "category"),
    slug: formText(form, "slug"),
    date: formText(form, "date"),
    license: formText(form, "license"),
    licenseUrl: formText(form, "licenseUrl"),
    syndicationRights: formText(form, "syndicationRights"),
  };
}

function internalLinkPlacementInputFromForm(form: URLSearchParams): unknown {
  return {
    sourceSlug: formText(form, "sourceSlug"),
    targetSlug: formText(form, "targetSlug"),
    paragraphIndex: formNumber(form, "paragraphIndex"),
    expectedBeforeMarkdown: formText(form, "expectedBeforeMarkdown"),
  };
}

function internalLinkPlacementAppliedHtml(result: ApplyInternalLinkPlacementResult): string {
  const body = [
    "<article>",
    "<h1>Internal link applied</h1>",
    `<p><a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encodeURIComponent(result.sourceSlug)}`)}">${escapeHtml(result.sourceSlug)}</a> now links to <a href="${escapeHtml(`${KOIOS_SITE_URL}/posts/${encodeURIComponent(result.targetSlug)}`)}">${escapeHtml(result.targetSlug)}</a>.</p>`,
    `<p>Paragraph ${result.paragraphIndex}. The source manuscript body was the only file changed.</p>`,
    `<p><a href="/">Desk</a> · <a href="/operators/content/internal-link-placements.json">placement packets JSON</a></p>`,
    "</article>",
  ].join("\n");
  return newsroomPage("Internal link applied", body, "/operators/content/internal-link-placements");
}

const JSON_TYPE = "application/json; charset=utf-8";

function json(body: unknown, status = 200): { status: number; type: string; body: string } {
  return { status, type: JSON_TYPE, body: JSON.stringify(body) };
}

function problem(status: number, title: string, detail: string): { status: number; type: string; body: string } {
  return json({ type: "about:blank", title, status, detail }, status);
}

function jsonResponses(description: string): NonNullable<OpenApiMetadata["responses"]> {
  return Object.freeze({
    "200": Object.freeze({
      description,
      content: Object.freeze({
        "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
      }),
    }),
  });
}

function documentedJsonResource(resource: Resource, openapi: OpenApiMetadata): Resource {
  return documentedResource(resource, openapi);
}

function pathSlug(pathname: string, prefix: string, suffix: string): string {
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return "";
  return decodeURIComponent(pathname.slice(prefix.length, pathname.length - suffix.length));
}

function assignmentPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/manuscripts");
}

function assignmentResearchPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/research.json");
}

function assignmentLinkGuidancePathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/link-guidance.json");
}

function assignmentNotesPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/notes");
}

function assignmentNotesFormPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/notes/form");
}

function assignmentActivityPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/activity");
}

function assignmentActivityJsonPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", "/activity.json");
}

function assignmentJsonPathId(pathname: string): string {
  return pathSlug(pathname, "/operators/assignments/", ".json");
}

function referenceIdentity(reference: CslItem): string {
  const url = reference["URL"] ?? reference["url"];
  const id = reference["id"];
  return typeof url === "string" && url !== "" ? url : String(id ?? JSON.stringify(reference));
}

function mergeReferences(left: readonly CslItem[], right: readonly CslItem[]): readonly CslItem[] {
  const seen = new Set<string>();
  const references: CslItem[] = [];
  for (const reference of [...left, ...right]) {
    const key = referenceIdentity(reference);
    if (seen.has(key)) continue;
    seen.add(key);
    references.push(reference);
  }
  return Object.freeze(references);
}

function entriesByBeat(demand: readonly DemandEntry[]): Readonly<Record<string, readonly DemandEntry[]>> {
  const grouped: Record<string, DemandEntry[]> = {};
  for (const entry of demand) {
    grouped[entry.beat] ??= [];
    grouped[entry.beat]!.push(entry);
  }
  return Object.freeze(Object.fromEntries(Object.entries(grouped)
    .map(([beat, entries]) => [beat, Object.freeze(entries)])));
}

function publicationGameReading(input: Readonly<{
  contentDir: string;
  dataDir: string;
  demand: readonly DemandEntry[];
}>): PublicationGameReading {
  const property = koiosFarmProperty();
  const beats = Object.keys(property.beatSources).sort();
  const sourceCounts = Object.freeze(Object.fromEntries(beats.map((beat) => [
    beat,
    property.beatSources[beat]?.length ?? 0,
  ])));
  const allRuns = replayRuns(farmLogPath(input.dataDir, property.runsFile ?? "mill-runs.jsonl"));
  const compostEntries = compost(allRuns);
  const workItems = deskWorkItems(loadPosts(input.contentDir));
  return Object.freeze({
    kind: "koios.publication-game" as const,
    site: Object.freeze({ name: KOIOS_TITLE, url: KOIOS_SITE_URL, editor: KOIOS_EDITOR }),
    generatedAt: new Date().toISOString(),
    arena: Object.freeze({
      property: property.name,
      beats: Object.freeze(beats),
      sourceCounts,
    }),
    demand: Object.freeze({
      next: input.demand[0] ?? null,
      count: input.demand.length,
      byBeat: entriesByBeat(input.demand),
    }),
    desk: Object.freeze({
      reviewSkill: workItems[0]?.fields.requiredSkill ?? property.gateModel ?? "fable",
      openCandidateCount: workItems.length,
      workItems,
    }),
    runs: Object.freeze({
      count: allRuns.length,
      shipped: allRuns.filter((run) => run.shipped === true).length,
      withheld: allRuns.filter((run) => run.shipped === false).length,
      obstructed: allRuns.filter((run) => typeof run.obstruction === "string").length,
      recent: Object.freeze([...allRuns].slice(-10).reverse()),
    }),
    compost: Object.freeze({
      count: compostEntries.length,
      recent: Object.freeze([...compostEntries].slice(-10).reverse()),
    }),
    surfaces: Object.freeze({
      newsroom: "https://newsroom.koios.news/",
      demand: "https://newsroom.koios.news/demand.json",
      runs: "https://newsroom.koios.news/mill-runs.json",
      views: "https://newsroom.koios.news/views.json",
    }),
  });
}

/** Create the newsroom.koios.news backend app: desk readings and operator tools. */
export function createKoiosNewsroomApp(options: KoiosNewsroomOptions = {}): App {
  const contentDir = options.contentDir ?? DEFAULT_CONTENT_DIR;
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const reading = () => {
    const views = new ViewTrace(farmLogPath(dataDir, "views.jsonl")).counts();
    const posts = loadPosts(contentDir);
    const demand = demandTable({
      posts,
      views,
      searchConsole: readSearchConsole(dataDir),
      seeds: SEED_KEYWORDS,
    });
    return { views, posts, demand, runs: replayMillRuns(dataDir) };
  };
  const departments = () => {
    const { views, posts } = reading();
    return newsroomDepartmentsReading({ posts, views, dataDir, masthead: koiosMasthead() });
  };
  const developing = () => developingOfficeReading();
  const publicationGame = () => {
    const { demand } = reading();
    return publicationGameReading({ contentDir, dataDir, demand });
  };
  const assignments = () => {
    const { posts } = reading();
    return readAssignments(dataDir, posts);
  };
  const adPerformance = () => readAdPerformance(dataDir);
  const contentPerformance = () => {
    const { posts, views } = reading();
    const masthead = koiosMasthead();
    return contentPerformanceReading({ posts, views, items: koiosItems(posts, masthead) });
  };
  const contentGraph = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return contentGraphReading({ posts, items: koiosItems(posts, masthead) });
  };
  const contentQuality = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return contentQualityReading({ posts, items: koiosItems(posts, masthead) });
  };
  const contentPredication = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return contentPredicationReading({ posts, items: koiosItems(posts, masthead) });
  };
  const readContentPredicationPacket = (slug: string) => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return contentPredicationPacket({ posts, items: koiosItems(posts, masthead), slug });
  };
  const contentRevisions = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return contentRevisionBacklogReading({ posts, items: koiosItems(posts, masthead) });
  };
  const correctionRegister = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return correctionRegisterReading({ posts, items: koiosItems(posts, masthead) });
  };
  const internalLinkOpportunities = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return internalLinkOpportunityReading({ posts, items: koiosItems(posts, masthead) });
  };
  const internalLinkPlacements = () => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return internalLinkPlacementReading({ posts, items: koiosItems(posts, masthead) });
  };
  const draftInternalLinkGuidance = (input: unknown) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("draft internal-link guidance input must be a JSON object");
    const record = input as Readonly<Record<string, unknown>>;
    const { posts } = reading();
    const masthead = koiosMasthead();
    return draftInternalLinkGuidanceReading({
      posts,
      items: koiosItems(posts, masthead),
      term: String(record["term"] ?? ""),
      ...(record["beat"] === undefined ? {} : { beat: String(record["beat"]) }),
      ...(Array.isArray(record["tags"]) ? { tags: Object.freeze(record["tags"].map(String)) } : {}),
      ...(Array.isArray(record["excludeSlugs"]) ? { excludeSlugs: Object.freeze(record["excludeSlugs"].map(String)) } : {}),
      ...(record["limit"] === undefined ? {} : { limit: Number(record["limit"]) }),
    });
  };
  const assignmentDraftInternalLinkGuidance = (assignmentId: string) => {
    const assignment = readAssignment(dataDir, assignmentId, reading().posts);
    return draftInternalLinkGuidance({
      term: assignment.term,
      beat: assignment.beat,
      tags: [assignment.term],
      excludeSlugs: assignment.sourceUrls.flatMap((url) => {
        const slug = koiosPostSlugFromUrl(url);
        return slug === undefined ? [] : [slug];
      }),
    });
  };
  const applyInternalLinkPlacementAction = (input: unknown) => {
    const { posts } = reading();
    const masthead = koiosMasthead();
    return applyInternalLinkPlacement({
      contentDir,
      posts,
      items: koiosItems(posts, masthead),
      placement: input,
    });
  };
  const sourceRoll = () => sourceRollReading();
  const keywordDiscovery = async (withTrends: boolean) => {
    const trends = withTrends ? await googleTrendsProbe({}) : undefined;
    return keywordDiscoveryReading({ contentDir, ...(trends === undefined ? {} : { trends }) });
  };
  const sourceCyclePlan = () => koiosSourceCyclePlan();
  const sourceCycleRepairs = () => sourceCycleRepairPacketsReading({ runs: replayMillRuns(dataDir), contentDir });
  const readResearchPacket = (input: unknown) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("research packet input must be a JSON object");
    const record = input as Readonly<Record<string, unknown>>;
    return researchPacket({
      term: String(record["term"] ?? ""),
      beat: String(record["beat"] ?? ""),
      ...(Array.isArray(record["sourceUrls"]) ? { sourceUrls: Object.freeze(record["sourceUrls"].map(String)) } : {}),
      ...(record["limit"] === undefined ? {} : { limit: Number(record["limit"]) }),
    });
  };
  const readAssignmentResearchPacket = (assignmentId: string) => {
    const assignment = readAssignment(dataDir, assignmentId, reading().posts);
    return researchPacket({
      term: assignment.term,
      beat: assignment.beat,
      sourceUrls: assignment.sourceUrls,
    });
  };
  const runSourceCycle = () => runKoiosSourceCycle({
    env: process.env,
    views: new ViewTrace(farmLogPath(dataDir, "views.jsonl")).counts(),
  });
  const createNextAssignment = () => {
    const { demand, posts } = reading();
    const next = demand[0];
    if (next === undefined) throw new Error("no demand entry is available to assign");
    return createAssignment(dataDir, createAssignmentInputFromDemand(next), posts);
  };
  const createAssignmentDraft = (assignmentId: string, input: unknown) => {
    const { posts } = reading();
    const assignment = readAssignment(dataDir, assignmentId, posts);
    if (assignment.status !== "assigned") throw new Error(`assignment ${assignment.assignmentId} is already ${assignment.status}`);
    if (!assignmentCanCreateDraft(assignment)) throw new Error(`assignment ${assignment.assignmentId} is an editing work item, not a drafting assignment`);
    const draft = normalizeCreateAssignmentDraftInput(input);
    const references = mergeReferences(referencesFromSourceUrls(assignment.sourceUrls), draft.references ?? []);
    if (references.length === 0) throw new Error("assignment draft needs at least one reference from the assignment sources or request body");
    return createDraftManuscript(contentDir, {
      title: draft.title,
      summary: draft.summary,
      body: draft.body,
      seoTerm: assignment.term,
      beat: assignment.beat,
      references,
      assignmentId: assignment.assignmentId,
      tags: draft.tags ?? [assignment.term],
      category: draft.category ?? assignment.beat,
      ...(draft.slug === undefined ? {} : { slug: draft.slug }),
      ...(draft.date === undefined ? {} : { date: draft.date }),
      ...(draft.license === undefined ? {} : { license: draft.license }),
      ...(draft.licenseUrl === undefined ? {} : { licenseUrl: draft.licenseUrl }),
      ...(draft.syndicationRights === undefined ? {} : { syndicationRights: draft.syndicationRights }),
    });
  };
  const createRevisionAssignment = (slug: string) => {
    const { posts } = reading();
    const packet = contentRevisionPacket(contentRevisions(), slug);
    return Object.freeze({
      packet,
      result: createAssignment(dataDir, revisionAssignmentInput(packet), posts),
    });
  };
  const createGraphAssignment = (slug: string) => {
    const { posts } = reading();
    const node = contentGraphNode(contentGraph(), slug);
    return Object.freeze({
      node,
      result: createAssignment(dataDir, graphAssignmentInput(node), posts),
    });
  };
  const createSourceCycleRepairAssignment = (slug: string) => {
    const { posts } = reading();
    const packet = sourceCycleRepairPacket(sourceCycleRepairs(), slug);
    return Object.freeze({
      packet,
      result: createAssignment(dataDir, sourceCycleRepairAssignmentInput(packet), posts),
    });
  };
  const operatorWorkQueue = () => {
    const { posts } = reading();
    const manuscripts = manuscriptInventory(contentDir, posts);
    return operatorWorkQueueReading({
      assignments: readAssignments(dataDir, posts),
      manuscripts,
      contentGraph: contentGraph(),
      contentRevisions: contentRevisions(),
      sourceCycleRepairs: sourceCycleRepairs(),
    });
  };
  const publicationCandidates = () => publicationCandidatesReading(manuscriptInventory(contentDir, reading().posts), sourceCycleRepairs());
  const readAssignmentWorkOrder = (assignmentId: string) => assignmentWorkOrder(readAssignment(dataDir, assignmentId, reading().posts));
  const readAssignmentActivityReading = (assignmentId: string) => readAssignmentActivity(dataDir, assignmentId, reading().posts);
  const recordAssignmentNoteAction = (assignmentId: string, input: unknown) => recordAssignmentNote(dataDir, assignmentId, normalizeCreateAssignmentNoteInput(input), reading().posts);
  const completeAssignmentAction = (assignmentId: string) => completeAssignment(dataDir, assignmentId, reading().posts);
  const workbench = () => {
    const { views, posts, demand, runs } = reading();
    const manuscripts = manuscriptInventory(contentDir, posts);
    return Object.freeze({
      kind: "koios.newsroom.operator-workbench" as const,
      departments: newsroomDepartmentsReading({ posts, views, dataDir, masthead: koiosMasthead() }),
      publicationGame: publicationGameReading({ contentDir, dataDir, demand }),
      assignments: readAssignments(dataDir, posts),
      sourceRoll: sourceRoll(),
      researchPacketPolicy: Object.freeze({
        route: "/operators/research-packets.json?term={term}&beat={beat}",
        assignmentRoute: "/operators/assignments/{assignmentId}/research.json",
      }),
      draftingInternalLinkPolicy: Object.freeze({
        route: "/operators/writing/internal-link-guidance.json?term={term}&beat={beat}&tag={tag}",
        assignmentRoute: "/operators/assignments/{assignmentId}/link-guidance.json",
        constraint: "Guidance is for draft composition only; same-site links are not factual references.",
      }),
      keywordDiscoveryPolicy: Object.freeze({
        route: "/operators/research/discovery.json",
        trendsRoute: "/operators/research/discovery.json?trends=1",
        note: "Coverage gaps, candidate keywords, and cited-but-unwired sources over owned intake and the corpus; ?trends=1 folds the public Google Trends signal. Discovery proposes coverage; it never writes the seed list or the wire config.",
      }),
      advertisingPerformance: adPerformance(),
      contentGraph: contentGraph(),
      contentPerformance: contentPerformance(),
      contentPredication: contentPredication(),
      contentQuality: contentQuality(),
      contentRevisions: contentRevisions(),
      publicationCandidates: publicationCandidates(),
      workQueue: operatorWorkQueue(),
      correctionRegister: correctionRegister(),
      internalLinkOpportunities: internalLinkOpportunities(),
      internalLinkPlacements: internalLinkPlacements(),
      sourceCyclePlan: sourceCyclePlan(),
      sourceCycleRepairs: sourceCycleRepairs(),
      manuscripts,
      runs: Object.freeze({
        count: runs.length,
        recent: Object.freeze([...runs].slice(-10).reverse()),
      }),
    });
  };
  const tools: readonly McpTool[] = Object.freeze([
    Object.freeze({
      name: "read_workbench",
      title: "Read Koios operator workbench",
      description: "Return departments, publication-game state, manuscript inventory, and recent runs.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_departments",
      title: "Read nested newsroom departments",
      description: "Return the researching -> writing -> editing -> publishing -> managing newsroom carrier.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_developing",
      title: "Read Koios developing office",
      description: "Return the administrating/developing office reading for topics, analytics, advertising, admin planning, and upstream review.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_ad_performance",
      title: "Read aggregate ad performance",
      description: "Return aggregate ad ROI readings by provider, section, and tag without reader identifiers.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_performance",
      title: "Read aggregate content performance",
      description: "Return aggregate article, section, and tag performance folded from first-party path view counts.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_graph",
      title: "Read content graph",
      description: "Return the public article same-site graph: nodes, edges, orphaned articles, isolated articles, section buckets, and suggested internal targets.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_content_graph_assignment",
      title: "Create content graph assignment",
      description: "Create or reuse a durable editing assignment from one article's content-graph topology prompt.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_quality",
      title: "Read content quality diagnostics",
      description: "Return privacy-preserving article quality diagnostics for internal links, references, citation domains, SEO placement, topic depth, and headline-warrant alignment.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_predication",
      title: "Read content predication metrics",
      description: "Return privacy-preserving article predication metrics for claim-like paragraphs, CSL evidence cells, same-site relations, settlement depth, and article graph centrality.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_predication_packet",
      title: "Read one content predication packet",
      description: "Return one public article's predication packet by slug, including support-shape findings and paragraph cell previews for editorial review.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_revisions",
      title: "Read content revision backlog",
      description: "Return privacy-preserving article revision packets derived from content-quality findings, with prioritized editorial tasks and instructions.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_content_revision_packet",
      title: "Read one content revision packet",
      description: "Return one article's prioritized revision packet by slug.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_revision_assignment",
      title: "Create revision assignment",
      description: "Create or reuse a durable editing assignment from one article revision packet.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_corrections",
      title: "Read correction register",
      description: "Return the public post-publication correction register folded from article frontmatter.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_internal_link_opportunities",
      title: "Read internal link opportunities",
      description: "Return warranted same-site link opportunities with source article, target article, shared tags, target path, and a Markdown link for operator review.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_internal_link_placements",
      title: "Read internal link placement packets",
      description: "Return paragraph-level same-site link placement packets with matched terms, preview text, and optional reviewed Markdown patches.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "apply_internal_link_placement",
      title: "Apply internal link placement",
      description: "Apply one current conservative internal-link placement patch to a source manuscript after operator approval.",
      inputSchema: applyInternalLinkPlacementJsonSchema,
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_draft_internal_link_guidance",
      title: "Read draft internal link guidance",
      description: "Return published Koios article targets to consider while drafting a manuscript for a term, beat, and optional tags. These are composition hints, not factual references.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["term"]),
        properties: Object.freeze({
          term: Object.freeze({ type: "string", minLength: 1 }),
          beat: Object.freeze({ type: "string", minLength: 1 }),
          tags: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
          excludeSlugs: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
          limit: Object.freeze({ type: "integer", minimum: 1, maximum: 12 }),
        }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_source_roll",
      title: "Read source roll",
      description: "Return configured intake sources by wire, including source class, editorial role, and local wire-store population.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_keyword_discovery",
      title: "Read keyword and source discovery",
      description: "Return coverage gaps (seed terms the intake supports but the corpus barely covers), candidate keywords (frequent intake phrases no seed names), and candidate sources (domains the bibliography cites but no wire feeds). Set trends:true to fold the public Google Trends signal (obstruction-as-value when unreachable).",
      inputSchema: Object.freeze({
        type: "object",
        properties: Object.freeze({ trends: Object.freeze({ type: "boolean" }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: true }),
    }),
    Object.freeze({
      name: "read_source_cycle_plan",
      title: "Read source cycle plan",
      description: "Return the configured Koios source-cycle plan: owned wires, feed sources, farm properties, beats, and publication gate policy.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_source_cycle_repairs",
      title: "Read source-cycle repair packets",
      description: "Return read-only repair packets derived from source-cycle gate failures and intake obstructions.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_source_cycle_repair_packet",
      title: "Read one source-cycle repair packet",
      description: "Return one source-cycle repair packet by candidate slug.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_source_cycle_repair_assignment",
      title: "Create source-cycle repair assignment",
      description: "Create or reuse a durable editing assignment from one source-cycle repair packet.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_research_packet",
      title: "Read research packet",
      description: "Return local wire evidence, source-bound claims, warrant risks, and candidate CSL references for a term and beat.",
      inputSchema: researchPacketJsonSchema,
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_assignment_research_packet",
      title: "Read assignment research packet",
      description: "Return the research packet for an existing Koios assignment without creating a manuscript.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId"]),
        properties: Object.freeze({ assignmentId: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "run_source_cycle",
      title: "Run source cycle",
      description: "Refresh Koios-owned wire stores, then run one content-farm tick through the configured LLM provider. Output remains draft-gated.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: true }),
    }),
    Object.freeze({
      name: "record_ad_performance",
      title: "Record aggregate ad performance",
      description: "Append an aggregate ad-performance record: provider, path, day, section, tags, impressions, clicks, and revenue micros only.",
      inputSchema: adPerformanceJsonSchema,
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_assignments",
      title: "Read newsroom assignments",
      description: "Return the durable Koios assignment queue with derived manuscript status.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_work_queue",
      title: "Read operator work queue",
      description: "Return the prioritized Koios operator work queue across assignments, manuscripts, revision packets, and source-cycle repairs.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_publication_candidates",
      title: "Read publication candidates",
      description: "Return draft manuscripts ranked by standards distance to publication with safe next-action URLs.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_assignment",
      title: "Read newsroom assignment work order",
      description: "Return one Koios assignment with operator notes and safe next-action URLs.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId"]),
        properties: Object.freeze({ assignmentId: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "read_assignment_activity",
      title: "Read newsroom assignment activity",
      description: "Return one Koios assignment's append-only event activity and linked artifact reading.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId"]),
        properties: Object.freeze({ assignmentId: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "record_assignment_note",
      title: "Record newsroom assignment note",
      description: "Append an internal operator note to one assignment without changing manuscript copy or public references.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId", "body"]),
        properties: Object.freeze({
          assignmentId: Object.freeze({ type: "string", minLength: 1 }),
          body: Object.freeze({ type: "string", minLength: 1 }),
          author: Object.freeze({ type: "string", minLength: 1 }),
        }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_assignment",
      title: "Create newsroom assignment",
      description: "Create or reuse an open Koios assignment from a term, beat, and optional editorial instructions.",
      inputSchema: createAssignmentJsonSchema,
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "complete_assignment",
      title: "Complete newsroom assignment",
      description: "Mark a durable newsroom assignment complete after operator review.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId"]),
        properties: Object.freeze({ assignmentId: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_next_assignment",
      title: "Create next demand assignment",
      description: "Create or reuse an open assignment from the top Koios demand row.",
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_assignment_draft",
      title: "Create assignment draft",
      description: "Create a draft manuscript from an assigned Koios assignment, promoting assignment source URLs into manuscript references.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["assignmentId", "title", "summary", "body"]),
        properties: Object.freeze({
          assignmentId: Object.freeze({ type: "string", minLength: 1 }),
          ...createAssignmentDraftJsonSchema.properties,
        }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "create_draft_manuscript",
      title: "Create draft manuscript",
      description: "Create a canonical draft Koios manuscript. Drafts must still pass editorial gates before publication.",
      inputSchema: createDraftManuscriptJsonSchema,
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "review_manuscript_standards",
      title: "Review manuscript standards",
      description: "Review a manuscript against Koios publication standards without modifying it.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ readOnlyHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "publish_manuscript",
      title: "Publish manuscript",
      description: "Publish a draft manuscript only when standards review has no blocking findings.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: false, openWorldHint: false }),
    }),
    Object.freeze({
      name: "apply_standards_metadata_defaults",
      title: "Apply standards metadata defaults",
      description: "Fill or update default CC BY 4.0 license, license URL, and syndication-rights metadata on a manuscript without changing its body or publish state.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "normalize_manuscript_references",
      title: "Normalize manuscript references",
      description: "Promote legacy article source URLs into canonical CSL references and remove article-level sources without changing the body or publish state.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "repair_manuscript_headings",
      title: "Repair manuscript headings",
      description: "Split clear malformed H2 heading/body fusions into short H2 labels followed by body paragraphs without publishing the manuscript.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
    Object.freeze({
      name: "repair_manuscript_seo_heading",
      title: "Repair manuscript SEO heading",
      description: "Adjust one conservative H2 heading so the manuscript SEO term appears in a level-two heading without publishing the manuscript.",
      inputSchema: Object.freeze({
        type: "object",
        required: Object.freeze(["slug"]),
        properties: Object.freeze({ slug: Object.freeze({ type: "string", minLength: 1 }) }),
        additionalProperties: false,
      }),
      outputSchema: Object.freeze({ type: "object" }),
      annotations: Object.freeze({ destructiveHint: false, idempotentHint: true, openWorldHint: false }),
    }),
  ]);
  const dispatch: McpDispatch = (name, args) => {
    if (name === "read_workbench") return workbench();
    if (name === "read_departments") return departments();
    if (name === "read_developing") return developing();
    if (name === "read_ad_performance") return adPerformance();
    if (name === "read_content_performance") return contentPerformance();
    if (name === "read_content_graph") return contentGraph();
    if (name === "create_content_graph_assignment") return createGraphAssignment(String(args["slug"] ?? ""));
    if (name === "read_content_quality") return contentQuality();
    if (name === "read_content_predication") return contentPredication();
    if (name === "read_content_predication_packet") return readContentPredicationPacket(String(args["slug"] ?? ""));
    if (name === "read_content_revisions") return contentRevisions();
    if (name === "read_content_revision_packet") return contentRevisionPacket(contentRevisions(), String(args["slug"] ?? ""));
    if (name === "create_revision_assignment") return createRevisionAssignment(String(args["slug"] ?? ""));
    if (name === "read_corrections") return correctionRegister();
    if (name === "read_internal_link_opportunities") return internalLinkOpportunities();
    if (name === "read_internal_link_placements") return internalLinkPlacements();
    if (name === "apply_internal_link_placement") return applyInternalLinkPlacementAction(args);
    if (name === "read_draft_internal_link_guidance") return draftInternalLinkGuidance(args);
    if (name === "read_source_roll") return sourceRoll();
    if (name === "read_keyword_discovery") return keywordDiscovery(args["trends"] === true);
    if (name === "read_source_cycle_plan") return sourceCyclePlan();
    if (name === "read_source_cycle_repairs") return sourceCycleRepairs();
    if (name === "read_source_cycle_repair_packet") return sourceCycleRepairPacket(sourceCycleRepairs(), String(args["slug"] ?? ""));
    if (name === "create_source_cycle_repair_assignment") return createSourceCycleRepairAssignment(String(args["slug"] ?? ""));
    if (name === "read_research_packet") return readResearchPacket(args);
    if (name === "read_assignment_research_packet") return readAssignmentResearchPacket(String(args["assignmentId"] ?? ""));
    if (name === "run_source_cycle") return runSourceCycle();
    if (name === "record_ad_performance") return recordAdPerformance(dataDir, normalizeAdPerformanceInput(args));
    if (name === "read_assignments") return assignments();
    if (name === "read_work_queue") return operatorWorkQueue();
    if (name === "read_publication_candidates") return publicationCandidates();
    if (name === "read_assignment") return readAssignmentWorkOrder(String(args["assignmentId"] ?? ""));
    if (name === "read_assignment_activity") return readAssignmentActivityReading(String(args["assignmentId"] ?? ""));
    if (name === "record_assignment_note") {
      const { assignmentId, ...note } = args;
      return recordAssignmentNoteAction(String(assignmentId ?? ""), note);
    }
    if (name === "create_assignment") return createAssignment(dataDir, normalizeCreateAssignmentInput(args), reading().posts);
    if (name === "complete_assignment") return completeAssignmentAction(String(args["assignmentId"] ?? ""));
    if (name === "create_next_assignment") return createNextAssignment();
    if (name === "create_assignment_draft") {
      const { assignmentId, ...draft } = args;
      return createAssignmentDraft(String(assignmentId ?? ""), draft);
    }
    if (name === "create_draft_manuscript") return createDraftManuscript(contentDir, normalizeCreateDraftManuscriptInput(args));
    if (name === "review_manuscript_standards") return reviewManuscriptStandards(contentDir, String(args["slug"] ?? ""));
    if (name === "publish_manuscript") return publishManuscript(contentDir, String(args["slug"] ?? ""));
    if (name === "apply_standards_metadata_defaults") return applyStandardsMetadataDefaults(contentDir, String(args["slug"] ?? ""));
    if (name === "normalize_manuscript_references") return normalizeManuscriptReferences(contentDir, String(args["slug"] ?? ""));
    if (name === "repair_manuscript_headings") return repairManuscriptHeadings(contentDir, String(args["slug"] ?? ""));
    if (name === "repair_manuscript_seo_heading") return repairManuscriptSeoHeading(contentDir, String(args["slug"] ?? ""));
    throw new Error(`unknown Koios newsroom tool: ${name}`);
  };
  const core: App = {
    security: true,
    cacheControl: { noStore: true },
    resources: [
      {
        id: "koios-newsroom.desk",
        name: "The Desk",
        route: "/",
        match: "/",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => {
          const { views, posts, demand, runs } = reading();
          return { status: 200, type: "text/html; charset=utf-8", body: dashboardHtml(demand, runs, views, manuscriptInventory(contentDir, posts), readAssignments(dataDir, posts), internalLinkPlacements(), correctionRegister()) };
        },
      },
      {
        id: "koios-newsroom.demand",
        name: "Demand Table",
        route: "/demand.json",
        match: "/demand.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(reading().demand),
      },
      documentedJsonResource({
        id: "koios-newsroom.departments",
        name: "Newsroom Departments",
        route: "/departments.json",
        match: "/departments.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(departments()),
      }, {
        operationId: "readKoiosNewsroomDepartments",
        summary: "Read nested Koios newsroom departments",
        tags: ["newsroom"],
        responses: jsonResponses("Nested newsroom departments"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.developing",
        name: "Developing Office",
        route: "/administrating/developing.json",
        match: "/administrating/developing.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(developing()),
      }, {
        operationId: "readKoiosDevelopingOffice",
        summary: "Read the Koios administrating/developing office",
        description: "Returns planned and active capability readings for topics, aggregate analytics, advertising ROI routing, admin surfaces, and upstream package review.",
        tags: ["administrating"],
        responses: jsonResponses("Developing office reading"),
      }),
      {
        id: "koios-newsroom.developing-board",
        name: "Developing Office Board",
        route: "/administrating/developing",
        match: "/administrating/developing",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: developingOfficeHtml(developing()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.ad-performance",
        name: "Advertising Performance",
        route: "/operators/advertising/performance.json",
        match: "/operators/advertising/performance.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(adPerformance()),
      }, {
        operationId: "readKoiosAdPerformance",
        summary: "Read aggregate advertising performance",
        description: "Returns aggregate ad ROI readings by provider, section, and tag. The records intentionally exclude reader identifiers.",
        tags: ["operators", "advertising"],
        responses: jsonResponses("Aggregate advertising performance"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.content-performance",
        name: "Content Performance",
        route: "/operators/content/performance.json",
        match: "/operators/content/performance.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(contentPerformance()),
      }, {
        operationId: "readKoiosContentPerformance",
        summary: "Read aggregate content performance",
        description: "Returns aggregate article, section, and tag performance folded from first-party path view counts and public article metadata.",
        tags: ["operators", "analytics"],
        responses: jsonResponses("Aggregate content performance"),
      }),
      {
        id: "koios-newsroom.content-graph-board",
        name: "Content Graph Board",
        route: "/operators/content/graph",
        match: "/operators/content/graph",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: contentGraphBoardHtml(contentGraph()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.content-graph",
        name: "Content Graph",
        route: "/operators/content/graph.json",
        match: "/operators/content/graph.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(contentGraph()),
      }, {
        operationId: "readKoiosContentGraph",
        summary: "Read content graph",
        description: "Returns the public article same-site graph: nodes, edges, orphaned articles, isolated articles, section buckets, and suggested internal targets.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Content graph"),
      }),
      {
        id: "koios-newsroom.create-graph-assignment-html",
        name: "Create Graph Assignment HTML",
        route: "/operators/content/graph/:slug/assign.html",
        match: /^\/operators\/content\/graph\/[^/]+\/assign\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/content/graph/", "/assign.html");
          try {
            const created = createGraphAssignment(slug);
            return { status: created.result.created ? 201 : 200, type: "text/html; charset=utf-8", body: graphAssignmentCreatedHtml(created.result, created.node) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Graph assignment rejected", error instanceof Error ? error.message : String(error), "/operators/content/graph") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.create-graph-assignment",
        name: "Create Graph Assignment",
        route: "/operators/content/graph/:slug/assign",
        match: /^\/operators\/content\/graph\/[^/]+\/assign$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(createGraphAssignment(pathSlug(ctx.url.pathname, "/operators/content/graph/", "/assign")), 201);
          } catch (error) {
            return problem(404, "Graph assignment rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosContentGraphAssignment",
        summary: "Create a content graph assignment",
        description: "Creates or reuses a durable editing assignment from one article's content-graph topology prompt.",
        tags: ["operators", "editing", "assignments"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Graph assignment created or reused",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No graph node for the article" }),
        }),
      }),
      {
        id: "koios-newsroom.content-quality-board",
        name: "Content Quality Board",
        route: "/operators/content/quality",
        match: "/operators/content/quality",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: contentQualityBoardHtml(contentQuality()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.content-quality",
        name: "Content Quality",
        route: "/operators/content/quality.json",
        match: "/operators/content/quality.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(contentQuality()),
      }, {
        operationId: "readKoiosContentQuality",
        summary: "Read content quality diagnostics",
        description: "Returns privacy-preserving article quality diagnostics for internal links, outgoing references, citation-domain diversity, topic depth, SEO placement, and headline-warrant preservation.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Content quality diagnostics"),
      }),
      {
        id: "koios-newsroom.content-predication-board",
        name: "Content Predication Board",
        route: "/operators/content/predication",
        match: "/operators/content/predication",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: contentPredicationBoardHtml(contentPredication()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.content-predication",
        name: "Content Predication",
        route: "/operators/content/predication.json",
        match: "/operators/content/predication.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(contentPredication()),
      }, {
        operationId: "readKoiosContentPredication",
        summary: "Read content predication metrics",
        description: "Returns privacy-preserving article metrics for claim-like paragraphs, CSL evidence cells, same-site relation cells, settlement depth, freshness, and article graph centrality.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Content predication metrics"),
      }),
      {
        id: "koios-newsroom.content-predication-packet-board",
        name: "Content Predication Packet Board",
        route: "/operators/content/predication/:slug",
        match: /^\/operators\/content\/predication\/[^/.]+$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/content/predication/", "");
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: contentPredicationPacketDetailHtml(readContentPredicationPacket(slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Predication packet not found", error instanceof Error ? error.message : String(error), "/operators/content/predication") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.content-predication-packet",
        name: "Content Predication Packet",
        route: "/operators/content/predication/:slug.json",
        match: /^\/operators\/content\/predication\/[^/]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(readContentPredicationPacket(pathSlug(ctx.url.pathname, "/operators/content/predication/", ".json")));
          } catch (error) {
            return json({ error: error instanceof Error ? error.message : String(error) }, 404);
          }
        },
      }, {
        operationId: "readKoiosContentPredicationPacket",
        summary: "Read one content predication packet",
        description: "Returns one public article's privacy-preserving predication packet with support-shape findings and paragraph cell previews.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Content predication packet"),
      }),
      {
        id: "koios-newsroom.content-revision-backlog-board",
        name: "Content Revision Backlog Board",
        route: "/operators/content/revisions",
        match: "/operators/content/revisions",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: contentRevisionBacklogHtml(contentRevisions()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.content-revision-backlog",
        name: "Content Revision Backlog",
        route: "/operators/content/revisions.json",
        match: "/operators/content/revisions.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(contentRevisions()),
      }, {
        operationId: "readKoiosContentRevisionBacklog",
        summary: "Read content revision backlog",
        description: "Returns prioritized editorial revision packets derived from content-quality findings without using visitor-level data.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Content revision backlog"),
      }),
      {
        id: "koios-newsroom.content-revision-packet-board",
        name: "Content Revision Packet Board",
        route: "/operators/content/revisions/:slug",
        match: /^\/operators\/content\/revisions\/[^/.]+$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/content/revisions/", "");
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: contentRevisionPacketDetailHtml(contentRevisionPacket(contentRevisions(), slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Revision packet not found", error instanceof Error ? error.message : String(error), "/operators/content/revisions") };
          }
        },
      },
      {
        id: "koios-newsroom.content-revision-semantic-packet",
        name: "Content Revision Semantic Packet",
        route: "/operators/content/revisions/:slug.packet.html",
        match: /^\/operators\/content\/revisions\/[^/]+\.packet\.html$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/content/revisions/", ".packet.html");
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: contentRevisionSemanticPacketHtml(contentRevisionPacket(contentRevisions(), slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Revision semantic packet not found", error instanceof Error ? error.message : String(error), "/operators/content/revisions") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.content-revision-packet",
        name: "Content Revision Packet",
        route: "/operators/content/revisions/:slug.json",
        match: /^\/operators\/content\/revisions\/[^/]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(contentRevisionPacket(contentRevisions(), pathSlug(ctx.url.pathname, "/operators/content/revisions/", ".json")));
          } catch (error) {
            return problem(404, "Revision packet not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosContentRevisionPacket",
        summary: "Read one content revision packet",
        description: "Returns one prioritized editorial revision packet by article slug without using visitor-level data.",
        tags: ["operators", "analytics", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Content revision packet",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No revision packet for the article" }),
        }),
      }),
      {
        id: "koios-newsroom.create-revision-assignment-html",
        name: "Create Revision Assignment HTML",
        route: "/operators/content/revisions/:slug/assign.html",
        match: /^\/operators\/content\/revisions\/[^/]+\/assign\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/content/revisions/", "/assign.html");
          try {
            const created = createRevisionAssignment(slug);
            return { status: created.result.created ? 201 : 200, type: "text/html; charset=utf-8", body: revisionAssignmentCreatedHtml(created.result, created.packet) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Revision assignment rejected", error instanceof Error ? error.message : String(error), "/operators/content/revisions") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.create-revision-assignment",
        name: "Create Revision Assignment",
        route: "/operators/content/revisions/:slug/assign",
        match: /^\/operators\/content\/revisions\/[^/]+\/assign$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(createRevisionAssignment(pathSlug(ctx.url.pathname, "/operators/content/revisions/", "/assign")), 201);
          } catch (error) {
            return problem(404, "Revision assignment rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosRevisionAssignment",
        summary: "Create a revision assignment",
        description: "Creates or reuses a durable editing assignment from one article revision packet.",
        tags: ["operators", "editing", "assignments"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Revision assignment created or reused",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No revision packet for the article" }),
        }),
      }),
      {
        id: "koios-newsroom.corrections-board",
        name: "Corrections Board",
        route: "/operators/corrections",
        match: "/operators/corrections",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: correctionRegisterHtml(correctionRegister()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.corrections",
        name: "Correction Register",
        route: "/operators/corrections.json",
        match: "/operators/corrections.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(correctionRegister()),
      }, {
        operationId: "readKoiosCorrectionRegister",
        summary: "Read correction register",
        description: "Returns public post-publication corrections, clarifications, material updates, and retractions folded from article frontmatter.",
        tags: ["operators", "circulating", "editing"],
        responses: jsonResponses("Correction register"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.internal-link-opportunities",
        name: "Internal Link Opportunities",
        route: "/operators/content/internal-links.json",
        match: "/operators/content/internal-links.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(internalLinkOpportunities()),
      }, {
        operationId: "readKoiosInternalLinkOpportunities",
        summary: "Read same-site link opportunities",
        description: "Returns source articles, target articles, shared tags, target paths, and ready Markdown links for operator-reviewed internal linking.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Internal link opportunities"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.internal-link-placements",
        name: "Internal Link Placement Packets",
        route: "/operators/content/internal-link-placements.json",
        match: "/operators/content/internal-link-placements.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(internalLinkPlacements()),
      }, {
        operationId: "readKoiosInternalLinkPlacements",
        summary: "Read paragraph-level same-site link placement packets",
        description: "Returns source articles, target articles, shared tags, paragraph previews, matched terms, and optional reviewed Markdown patches for operator-reviewed internal linking.",
        tags: ["operators", "analytics", "editing"],
        responses: jsonResponses("Internal link placement packets"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.apply-internal-link-placement",
        name: "Apply Internal Link Placement",
        route: "/operators/content/internal-link-placements",
        match: "/operators/content/internal-link-placements",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 64_000, empty: {} });
            return json(applyInternalLinkPlacementAction(raw), 201);
          } catch (error) {
            return problem(409, "Internal link placement rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "applyKoiosInternalLinkPlacement",
        summary: "Apply one reviewed internal-link placement",
        description: "Applies a current conservative paragraph-level internal-link patch to a manuscript body. The operation refuses stale, missing, ambiguous, or non-conservative placements.",
        tags: ["operators", "analytics", "editing"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: applyInternalLinkPlacementJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Internal link placement applied",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "409": Object.freeze({ description: "Placement could not be safely applied" }),
        }),
      }),
      {
        id: "koios-newsroom.apply-internal-link-placement-form",
        name: "Apply Internal Link Placement Form",
        route: "/operators/content/internal-link-placements/form",
        match: "/operators/content/internal-link-placements/form",
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const form = await readFormBody(ctx.req, { maxBytes: 64_000 });
            const result = applyInternalLinkPlacementAction(internalLinkPlacementInputFromForm(form));
            return { status: 200, type: "text/html; charset=utf-8", body: internalLinkPlacementAppliedHtml(result) };
          } catch (error) {
            return { status: 409, type: "text/html; charset=utf-8", body: errorHtml("Internal link placement rejected", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.draft-internal-link-guidance",
        name: "Draft Internal Link Guidance",
        route: "/operators/writing/internal-link-guidance.json",
        match: "/operators/writing/internal-link-guidance.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(draftInternalLinkGuidance(draftInternalLinkGuidanceInputFromQuery(ctx.url.searchParams)));
          } catch (error) {
            return problem(400, "Draft internal-link guidance rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosDraftInternalLinkGuidance",
        summary: "Read drafting same-site link guidance",
        description: "Returns published Koios article targets to consider while drafting a manuscript for a term, beat, and optional tags. These links are composition guidance, not factual references.",
        tags: ["operators", "writing", "circulating"],
        parameters: Object.freeze([
          Object.freeze({ name: "term", in: "query", required: true, schema: Object.freeze({ type: "string" }) }),
          Object.freeze({ name: "beat", in: "query", required: false, schema: Object.freeze({ type: "string" }) }),
          Object.freeze({ name: "tag", in: "query", required: false, schema: Object.freeze({ type: "string" }) }),
          Object.freeze({ name: "limit", in: "query", required: false, schema: Object.freeze({ type: "integer", minimum: 1, maximum: 12 }) }),
        ]),
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Drafting internal-link guidance",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected guidance request" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.source-roll",
        name: "Source Roll",
        route: "/operators/sources.json",
        match: "/operators/sources.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(sourceRoll()),
      }, {
        operationId: "readKoiosSourceRoll",
        summary: "Read configured source roll",
        description: "Returns configured Koios intake sources by owned wire, with source class, editorial role, and local wire-store population.",
        tags: ["operators", "researching", "sourcing"],
        responses: jsonResponses("Source roll"),
      }),
      {
        id: "koios-newsroom.research-packet-form",
        name: "Research Packet Form",
        route: "/operators/research-packets/new",
        match: "/operators/research-packets/new",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: researchPacketFormHtml(reading().demand) }),
      },
      {
        id: "koios-newsroom.research-packet-html",
        name: "Research Packet",
        route: "/operators/research-packets",
        match: "/operators/research-packets",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const packet = readResearchPacket(researchPacketInputFromQuery(ctx.url.searchParams)) as ResearchPacket;
            const guidance = draftInternalLinkGuidance({ term: packet.term, beat: packet.beat, tags: [packet.term] });
            return { status: 200, type: "text/html; charset=utf-8", body: researchPacketHtml(packet, guidance) };
          } catch (error) {
            return { status: 400, type: "text/html; charset=utf-8", body: errorHtml("Research packet rejected", error instanceof Error ? error.message : String(error), "/operators/research-packets/new") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.research-packet",
        name: "Research Packet",
        route: "/operators/research-packets.json",
        match: "/operators/research-packets.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(readResearchPacket({
              term: ctx.url.searchParams.get("term") ?? "",
              beat: ctx.url.searchParams.get("beat") ?? "",
              sourceUrls: ctx.url.searchParams.getAll("sourceUrl"),
              limit: ctx.url.searchParams.get("limit") ?? undefined,
            }));
          } catch (error) {
            return problem(400, "Research packet rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosResearchPacket",
        summary: "Read a Koios research packet",
        description: "Returns source-bound local wire evidence, claim-state material, warrant risks, accountable-attention constraints, and candidate CSL references for a term and beat.",
        tags: ["operators", "researching", "sourcing"],
        parameters: Object.freeze([
          Object.freeze({ name: "term", in: "query", required: true, schema: Object.freeze({ type: "string" }) }),
          Object.freeze({ name: "beat", in: "query", required: true, schema: Object.freeze({ type: "string" }) }),
          Object.freeze({ name: "sourceUrl", in: "query", required: false, schema: Object.freeze({ type: "string", format: "uri" }) }),
          Object.freeze({ name: "limit", in: "query", required: false, schema: Object.freeze({ type: "integer", minimum: 1, maximum: 50 }) }),
        ]),
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Research packet",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected research packet request" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.source-cycle-plan",
        name: "Source Cycle Plan",
        route: "/operators/source-cycle/plan.json",
        match: "/operators/source-cycle/plan.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(sourceCyclePlan()),
      }, {
        operationId: "readKoiosSourceCyclePlan",
        summary: "Read the Koios source-cycle plan",
        description: "Returns configured owned wires, source feeds, farm properties, beats, and the draft-gated publication policy.",
        tags: ["operators", "researching", "sourcing"],
        responses: jsonResponses("Source cycle plan"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.keyword-discovery",
        name: "Keyword and Source Discovery",
        route: "/operators/research/discovery.json",
        match: "/operators/research/discovery.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => json(await keywordDiscovery(ctx.url.searchParams.get("trends") !== null)),
      }, {
        operationId: "readKoiosKeywordDiscovery",
        summary: "Read keyword and source discovery",
        description: "Returns coverage gaps, candidate keywords, and candidate sources over owned intake and the corpus. Pass ?trends=1 to fold the public Google Trends signal as obstruction-or-value.",
        tags: ["operators", "researching", "sourcing"],
        responses: jsonResponses("Keyword and source discovery"),
      }),
      {
        id: "koios-newsroom.source-cycle-repairs-board",
        name: "Source Cycle Repairs Board",
        route: "/operators/source-cycle/repairs",
        match: "/operators/source-cycle/repairs",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: sourceCycleRepairsHtml(sourceCycleRepairs()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.source-cycle-repairs",
        name: "Source Cycle Repairs",
        route: "/operators/source-cycle/repairs.json",
        match: "/operators/source-cycle/repairs.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(sourceCycleRepairs()),
      }, {
        operationId: "readKoiosSourceCycleRepairs",
        summary: "Read source-cycle repair packets",
        description: "Returns read-only operator repair packets derived from farm gate failures and intake obstructions. Packets preserve the sources-versus-CSL-references distinction.",
        tags: ["operators", "researching", "sourcing", "editing"],
        responses: jsonResponses("Source-cycle repair packets"),
      }),
      {
        id: "koios-newsroom.source-cycle-repair-packet-board",
        name: "Source Cycle Repair Packet Board",
        route: "/operators/source-cycle/repairs/:slug",
        match: /^\/operators\/source-cycle\/repairs\/[^/.]+$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/source-cycle/repairs/", "");
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: sourceCycleRepairPacketDetailHtml(sourceCycleRepairPacket(sourceCycleRepairs(), slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Source-cycle repair packet not found", error instanceof Error ? error.message : String(error), "/operators/source-cycle/repairs") };
          }
        },
      },
      {
        id: "koios-newsroom.source-cycle-repair-semantic-packet",
        name: "Source Cycle Repair Semantic Packet",
        route: "/operators/source-cycle/repairs/:slug.packet.html",
        match: /^\/operators\/source-cycle\/repairs\/[^/]+\.packet\.html$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/source-cycle/repairs/", ".packet.html");
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: sourceCycleRepairSemanticPacketHtml(sourceCycleRepairPacket(sourceCycleRepairs(), slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Source-cycle repair semantic packet not found", error instanceof Error ? error.message : String(error), "/operators/source-cycle/repairs") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.source-cycle-repair-packet",
        name: "Source Cycle Repair Packet",
        route: "/operators/source-cycle/repairs/:slug.json",
        match: /^\/operators\/source-cycle\/repairs\/[^/]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(sourceCycleRepairPacket(sourceCycleRepairs(), pathSlug(ctx.url.pathname, "/operators/source-cycle/repairs/", ".json")));
          } catch (error) {
            return problem(404, "Source-cycle repair packet not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosSourceCycleRepairPacket",
        summary: "Read one source-cycle repair packet",
        description: "Returns one source-cycle repair packet by candidate slug, including failed gate evidence, candidate state, and operator instructions.",
        tags: ["operators", "researching", "sourcing", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Source-cycle repair packet",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No source-cycle repair packet for the candidate" }),
        }),
      }),
      {
        id: "koios-newsroom.create-source-cycle-repair-assignment-html",
        name: "Create Source Cycle Repair Assignment HTML",
        route: "/operators/source-cycle/repairs/:slug/assign.html",
        match: /^\/operators\/source-cycle\/repairs\/[^/]+\/assign\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/source-cycle/repairs/", "/assign.html");
          try {
            const created = createSourceCycleRepairAssignment(slug);
            return { status: created.result.created ? 201 : 200, type: "text/html; charset=utf-8", body: sourceCycleRepairAssignmentCreatedHtml(created.result, created.packet) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Source-cycle repair assignment rejected", error instanceof Error ? error.message : String(error), "/operators/source-cycle/repairs") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.create-source-cycle-repair-assignment",
        name: "Create Source Cycle Repair Assignment",
        route: "/operators/source-cycle/repairs/:slug/assign",
        match: /^\/operators\/source-cycle\/repairs\/[^/]+\/assign$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(createSourceCycleRepairAssignment(pathSlug(ctx.url.pathname, "/operators/source-cycle/repairs/", "/assign")), 201);
          } catch (error) {
            return problem(404, "Source-cycle repair assignment rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosSourceCycleRepairAssignment",
        summary: "Create a source-cycle repair assignment",
        description: "Creates or reuses a durable editing assignment from one source-cycle repair packet. The assignment preserves the sources-versus-CSL-references boundary.",
        tags: ["operators", "researching", "sourcing", "editing", "assignments"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Source-cycle repair assignment created or reused",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No source-cycle repair packet for the candidate" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.run-source-cycle",
        name: "Run Source Cycle",
        route: "/operators/source-cycle",
        match: "/operators/source-cycle",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async () => {
          try {
            return json(await runSourceCycle(), 201);
          } catch (error) {
            return problem(409, "Source cycle obstructed", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "runKoiosSourceCycle",
        summary: "Run one Koios source cycle",
        description: "Refreshes Koios-owned wire stores, then runs one content-farm tick through the configured LLM provider. Any produced article remains a draft candidate until editorial publication.",
        tags: ["operators", "researching", "sourcing"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Source cycle completed",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "409": Object.freeze({ description: "Source cycle was obstructed" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.record-ad-performance",
        name: "Record Advertising Performance",
        route: "/operators/advertising/performance",
        match: "/operators/advertising/performance",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 64_000, empty: {} });
            return json(recordAdPerformance(dataDir, normalizeAdPerformanceInput(raw)), 201);
          } catch (error) {
            return problem(400, "Ad performance rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "recordKoiosAdPerformance",
        summary: "Record aggregate advertising performance",
        description: "Appends an aggregate ad-performance record: provider, path, day, section, tags, impressions, clicks, and revenue micros only.",
        tags: ["operators", "advertising"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: adPerformanceJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Ad performance record appended",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected ad performance input" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.workbench",
        name: "Operator Workbench",
        route: "/operators/workbench.json",
        match: "/operators/workbench.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(workbench()),
      }, {
        operationId: "readKoiosOperatorWorkbench",
        summary: "Read the Koios operator workbench",
        tags: ["operators"],
        responses: jsonResponses("Operator workbench"),
      }),
      {
        id: "koios-newsroom.work-queue-board",
        name: "Operator Work Queue Board",
        route: "/operators/work-queue",
        match: "/operators/work-queue",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: operatorWorkQueueHtml(operatorWorkQueue()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.work-queue",
        name: "Operator Work Queue",
        route: "/operators/work-queue.json",
        match: "/operators/work-queue.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(operatorWorkQueue()),
      }, {
        operationId: "readKoiosOperatorWorkQueue",
        summary: "Read the prioritized Koios operator work queue",
        description: "Returns a projected work queue across open assignments, manuscripts, revision packets, and source-cycle repair packets without creating a second task store.",
        tags: ["operators", "workflow"],
        responses: jsonResponses("Operator work queue"),
      }),
      {
        id: "koios-newsroom.publication-candidates-board",
        name: "Publication Candidates Board",
        route: "/operators/publication-candidates",
        match: "/operators/publication-candidates",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: publicationCandidatesHtml(publicationCandidates()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.publication-candidates",
        name: "Publication Candidates",
        route: "/operators/publication-candidates.json",
        match: "/operators/publication-candidates.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(publicationCandidates()),
      }, {
        operationId: "readKoiosPublicationCandidates",
        summary: "Read draft publication candidates",
        description: "Returns draft manuscripts ranked by standards distance to publication with safe next-action URLs for publishing, repair, or copy review.",
        tags: ["operators", "publishing", "workflow"],
        responses: jsonResponses("Publication candidates"),
      }),
      documentedJsonResource({
        id: "koios-newsroom.manuscripts",
        name: "Operator Manuscripts",
        route: "/operators/manuscripts.json",
        match: "/operators/manuscripts.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(manuscriptInventory(contentDir, reading().posts)),
      }, {
        operationId: "readKoiosOperatorManuscripts",
        summary: "Read manuscripts and standards state",
        description: "Returns manuscript inventory with draft state, publication URLs, standards findings, and next operator action.",
        tags: ["operators", "editing"],
        responses: jsonResponses("Operator manuscript inventory"),
      }),
      {
        id: "koios-newsroom.manuscript-queue",
        name: "Manuscript Queue",
        route: "/operators/manuscripts.html",
        match: "/operators/manuscripts.html",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: manuscriptQueueHtml(manuscriptInventory(contentDir, reading().posts)) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.assignments",
        name: "Operator Assignments",
        route: "/operators/assignments.json",
        match: "/operators/assignments.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(assignments()),
      }, {
        operationId: "readKoiosOperatorAssignments",
        summary: "Read newsroom assignments",
        description: "Returns durable editorial assignments with status derived from linked manuscripts.",
        tags: ["operators", "writing"],
        responses: jsonResponses("Operator assignment inventory"),
      }),
      {
        id: "koios-newsroom.assignment-queue",
        name: "Assignment Queue",
        route: "/operators/assignments.html",
        match: "/operators/assignments.html",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: assignmentQueueHtml(assignments()) }),
      },
      documentedJsonResource({
        id: "koios-newsroom.assignment-work-order-json",
        name: "Assignment Work Order JSON",
        route: "/operators/assignments/:assignmentId.json",
        match: /^\/operators\/assignments\/[^/]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(readAssignmentWorkOrder(assignmentJsonPathId(ctx.url.pathname)));
          } catch (error) {
            return problem(404, "Assignment not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosAssignmentWorkOrder",
        summary: "Read one assignment work order",
        description: "Returns one durable assignment with operator notes, source URLs, evidence, and safe next-action links.",
        tags: ["operators", "writing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Assignment work order",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such assignment" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.assignment-activity-json",
        name: "Assignment Activity JSON",
        route: "/operators/assignments/:assignmentId/activity.json",
        match: /^\/operators\/assignments\/[^/]+\/activity\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(readAssignmentActivityReading(assignmentActivityJsonPathId(ctx.url.pathname)));
          } catch (error) {
            return problem(404, "Assignment activity not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosAssignmentActivity",
        summary: "Read one assignment activity log",
        description: "Returns one durable assignment's append-only created/completed event timeline and linked manuscript artifact.",
        tags: ["operators", "writing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Assignment activity",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such assignment" }),
        }),
      }),
      {
        id: "koios-newsroom.assignment-form",
        name: "Create Assignment Form",
        route: "/operators/assignments/new",
        match: "/operators/assignments/new",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: assignmentFormHtml(reading().demand) }),
      },
      {
        id: "koios-newsroom.create-assignment-form",
        name: "Create Assignment From Form",
        route: "/operators/assignments/form",
        match: "/operators/assignments/form",
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const form = await readFormBody(ctx.req, { maxBytes: 64_000 });
            const result = createAssignment(dataDir, normalizeCreateAssignmentInput(assignmentInputFromForm(form)), reading().posts);
            return { status: 201, type: "text/html; charset=utf-8", body: assignmentCreatedHtml(result) };
          } catch (error) {
            return { status: 400, type: "text/html; charset=utf-8", body: errorHtml("Assignment rejected", error instanceof Error ? error.message : String(error), "/operators/assignments/new") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.assignment-link-guidance-json",
        name: "Assignment Internal Link Guidance JSON",
        route: "/operators/assignments/:assignmentId/link-guidance.json",
        match: /^\/operators\/assignments\/[^/]+\/link-guidance\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(assignmentDraftInternalLinkGuidance(assignmentLinkGuidancePathId(ctx.url.pathname)));
          } catch (error) {
            return problem(404, "Assignment link guidance not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosAssignmentInternalLinkGuidance",
        summary: "Read assignment drafting internal-link guidance",
        description: "Returns same-site article targets to consider while drafting one assignment. These links are composition guidance, not factual references.",
        tags: ["operators", "writing", "circulating"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Assignment internal-link guidance",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such assignment" }),
        }),
      }),
      {
        id: "koios-newsroom.assignment-work-order",
        name: "Assignment Work Order",
        route: "/operators/assignments/:assignmentId",
        match: /^\/operators\/assignments\/(?!new$|next$)[^/.]+$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const assignmentId = pathSlug(ctx.url.pathname, "/operators/assignments/", "");
            return { status: 200, type: "text/html; charset=utf-8", body: assignmentWorkOrderHtml(readAssignmentWorkOrder(assignmentId), assignmentDraftInternalLinkGuidance(assignmentId)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Assignment not found", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      {
        id: "koios-newsroom.assignment-activity",
        name: "Assignment Activity",
        route: "/operators/assignments/:assignmentId/activity",
        match: /^\/operators\/assignments\/[^/]+\/activity$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            return { status: 200, type: "text/html; charset=utf-8", body: assignmentActivityHtml(readAssignmentActivityReading(assignmentActivityPathId(ctx.url.pathname))) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Assignment activity not found", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      {
        id: "koios-newsroom.record-assignment-note-html",
        name: "Record Assignment Note HTML",
        route: "/operators/assignments/:assignmentId/notes/form",
        match: /^\/operators\/assignments\/[^/]+\/notes\/form$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const assignmentId = assignmentNotesFormPathId(ctx.url.pathname);
          try {
            const form = await readFormBody(ctx.req, { maxBytes: 64_000 });
            return { status: 201, type: "text/html; charset=utf-8", body: assignmentNoteRecordedHtml(recordAssignmentNoteAction(assignmentId, assignmentNoteInputFromForm(form))) };
          } catch (error) {
            return { status: 400, type: "text/html; charset=utf-8", body: errorHtml("Assignment note rejected", error instanceof Error ? error.message : String(error), `/operators/assignments/${encodeURIComponent(assignmentId)}`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.record-assignment-note",
        name: "Record Assignment Note",
        route: "/operators/assignments/:assignmentId/notes",
        match: /^\/operators\/assignments\/[^/]+\/notes$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 64_000, empty: {} });
            return json(recordAssignmentNoteAction(assignmentNotesPathId(ctx.url.pathname), raw), 201);
          } catch (error) {
            return problem(400, "Assignment note rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "recordKoiosAssignmentNote",
        summary: "Record an assignment operator note",
        description: "Appends an internal editorial note to one assignment's append-only activity log without changing manuscript copy, sources, or references.",
        tags: ["operators", "writing"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: createAssignmentNoteJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Assignment note recorded",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected assignment note input" }),
        }),
      }),
      {
        id: "koios-newsroom.complete-assignment-html",
        name: "Complete Assignment HTML",
        route: "/operators/assignments/:assignmentId/complete.html",
        match: /^\/operators\/assignments\/[^/]+\/complete\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const assignmentId = pathSlug(ctx.url.pathname, "/operators/assignments/", "/complete.html");
          try {
            const result = completeAssignmentAction(assignmentId);
            return { status: result.completed ? 201 : 200, type: "text/html; charset=utf-8", body: assignmentCompletedHtml(result) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Assignment completion rejected", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.complete-assignment",
        name: "Complete Assignment",
        route: "/operators/assignments/:assignmentId/complete",
        match: /^\/operators\/assignments\/[^/]+\/complete$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const result = completeAssignmentAction(pathSlug(ctx.url.pathname, "/operators/assignments/", "/complete"));
            return json(result, result.completed ? 201 : 200);
          } catch (error) {
            return problem(404, "Assignment completion rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "completeKoiosAssignment",
        summary: "Complete a newsroom assignment",
        description: "Marks a durable newsroom assignment complete after operator review and updates the current assignment projection.",
        tags: ["operators", "assignments"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Assignment completed",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "200": Object.freeze({
            description: "Assignment was already terminal",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such assignment" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.assignment-research",
        name: "Assignment Research Packet",
        route: "/operators/assignments/:assignmentId/research.json",
        match: /^\/operators\/assignments\/[^/]+\/research\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(readAssignmentResearchPacket(assignmentResearchPathId(ctx.url.pathname)));
          } catch (error) {
            return problem(404, "Assignment research not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "readKoiosAssignmentResearchPacket",
        summary: "Read an assignment research packet",
        description: "Returns local wire evidence, source-bound claims, warrant risks, accountable-attention constraints, and candidate CSL references for an existing assignment.",
        tags: ["operators", "researching", "sourcing", "writing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Assignment research packet",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such assignment" }),
        }),
      }),
      {
        id: "koios-newsroom.assignment-draft-form",
        name: "Create Assignment Draft Form",
        route: "/operators/assignments/:assignmentId/manuscripts/new",
        match: /^\/operators\/assignments\/[^/]+\/manuscripts\/new$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const assignmentId = pathSlug(ctx.url.pathname, "/operators/assignments/", "/manuscripts/new");
            return { status: 200, type: "text/html; charset=utf-8", body: assignmentDraftFormHtml(readAssignment(dataDir, assignmentId, reading().posts), assignmentDraftInternalLinkGuidance(assignmentId)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Assignment not found", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      {
        id: "koios-newsroom.create-assignment-draft-form",
        name: "Create Assignment Draft From Form",
        route: "/operators/assignments/:assignmentId/manuscripts/form",
        match: /^\/operators\/assignments\/[^/]+\/manuscripts\/form$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const assignmentId = pathSlug(ctx.url.pathname, "/operators/assignments/", "/manuscripts/form");
          try {
            const form = await readFormBody(ctx.req, { maxBytes: 512_000 });
            return { status: 201, type: "text/html; charset=utf-8", body: manuscriptCreatedHtml(createAssignmentDraft(assignmentId, assignmentDraftInputFromForm(form))) };
          } catch (error) {
            return { status: 409, type: "text/html; charset=utf-8", body: errorHtml("Assignment draft rejected", error instanceof Error ? error.message : String(error), `/operators/assignments/${encodeURIComponent(assignmentId)}/manuscripts/new`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.create-assignment",
        name: "Create Assignment",
        route: "/operators/assignments",
        match: "/operators/assignments",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 64_000, empty: {} });
            return json(createAssignment(dataDir, normalizeCreateAssignmentInput(raw), reading().posts), 201);
          } catch (error) {
            return problem(400, "Assignment rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosAssignment",
        summary: "Create a newsroom assignment",
        description: "Creates or reuses an open editorial assignment from a term, beat, and optional editorial instructions.",
        tags: ["operators", "writing"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: createAssignmentJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Assignment created or reused",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected assignment input" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.create-next-assignment",
        name: "Create Next Assignment",
        route: "/operators/assignments/next",
        match: "/operators/assignments/next",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async () => {
          try {
            return json(createNextAssignment(), 201);
          } catch (error) {
            return problem(409, "No demand assignment available", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosNextDemandAssignment",
        summary: "Create the next demand assignment",
        description: "Creates or reuses an open assignment from the top Koios demand row.",
        tags: ["operators", "researching", "writing"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Next demand assignment created or reused",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "409": Object.freeze({ description: "No demand row available" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.create-assignment-draft",
        name: "Create Assignment Draft",
        route: "/operators/assignments/:assignmentId/manuscripts",
        match: /^\/operators\/assignments\/[^/]+\/manuscripts$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 256_000, empty: {} });
            return json(createAssignmentDraft(assignmentPathId(ctx.url.pathname), raw), 201);
          } catch (error) {
            return problem(409, "Assignment draft rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosAssignmentDraft",
        summary: "Create a draft manuscript from an assignment",
        description: "Creates a canonical draft manuscript from an assigned newsroom assignment, promoting assignment source URLs into manuscript references.",
        tags: ["operators", "writing"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: createAssignmentDraftJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Assignment draft manuscript created",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "409": Object.freeze({ description: "Assignment cannot create a draft" }),
        }),
      }),
      documentedJsonResource({
        id: "koios-newsroom.create-manuscript",
        name: "Create Draft Manuscript",
        route: "/operators/manuscripts",
        match: "/operators/manuscripts",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            const raw = await readJsonBody(ctx.req, { maxBytes: 256_000, empty: {} });
            return json(createDraftManuscript(contentDir, normalizeCreateDraftManuscriptInput(raw)), 201);
          } catch (error) {
            return problem(400, "Draft manuscript rejected", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "createKoiosDraftManuscript",
        summary: "Create a draft Koios manuscript",
        description: "Creates a canonical front-matter Markdown post with draft:true. The manuscript still requires editorial gates before publication.",
        tags: ["operators", "writing"],
        requestBody: Object.freeze({
          required: true,
          content: Object.freeze({
            "application/json": Object.freeze({ schema: createDraftManuscriptJsonSchema }),
          }),
        }),
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Draft manuscript created",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "400": Object.freeze({ description: "Rejected draft manuscript input" }),
        }),
      }),
      {
        id: "koios-newsroom.manuscript-form",
        name: "Create Draft Manuscript Form",
        route: "/operators/manuscripts/new",
        match: "/operators/manuscripts/new",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: manuscriptFormHtml() }),
      },
      {
        id: "koios-newsroom.create-manuscript-form",
        name: "Create Draft Manuscript From Form",
        route: "/operators/manuscripts/form",
        match: "/operators/manuscripts/form",
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const form = await readFormBody(ctx.req, { maxBytes: 512_000 });
            const result = createDraftManuscript(contentDir, normalizeCreateDraftManuscriptInput(draftInputFromForm(form)));
            return { status: 201, type: "text/html; charset=utf-8", body: manuscriptCreatedHtml(result) };
          } catch (error) {
            return { status: 400, type: "text/html; charset=utf-8", body: errorHtml("Draft manuscript rejected", error instanceof Error ? error.message : String(error), "/operators/manuscripts/new") };
          }
        },
      },
      {
        id: "koios-newsroom.review-manuscript-html",
        name: "Review Manuscript Standards HTML",
        route: "/operators/manuscripts/:slug/standards.html",
        match: /^\/operators\/manuscripts\/[^/]+\/standards\.html$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          try {
            const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/standards.html");
            const review = reviewManuscriptStandards(contentDir, slug);
            return { status: 200, type: "text/html; charset=utf-8", body: standardsReviewHtml(review, storedDraftInternalLinkGuidance(reading().posts, review.slug)) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not found", error instanceof Error ? error.message : String(error), "/") };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.review-manuscript",
        name: "Review Manuscript Standards",
        route: "/operators/manuscripts/:slug/standards",
        match: /^\/operators\/manuscripts\/[^/]+\/standards$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(reviewManuscriptStandards(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/standards")));
          } catch (error) {
            return problem(404, "Manuscript not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "reviewKoiosManuscriptStandards",
        summary: "Review manuscript publication standards",
        description: "Returns the standards findings that determine whether a manuscript can be published.",
        tags: ["operators", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Standards review",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such manuscript" }),
        }),
      }),
      {
        id: "koios-newsroom.apply-standards-defaults-html",
        name: "Apply Standards Metadata Defaults HTML",
        route: "/operators/manuscripts/:slug/standards/defaults.html",
        match: /^\/operators\/manuscripts\/[^/]+\/standards\/defaults\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/standards/defaults.html");
          try {
            const result = applyStandardsMetadataDefaults(contentDir, slug);
            return { status: 200, type: "text/html; charset=utf-8", body: standardsDefaultsAppliedHtml(result) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not found", error instanceof Error ? error.message : String(error), `/operators/manuscripts/${encodeURIComponent(slug)}/standards.html`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.apply-standards-defaults",
        name: "Apply Standards Metadata Defaults",
        route: "/operators/manuscripts/:slug/standards/defaults",
        match: /^\/operators\/manuscripts\/[^/]+\/standards\/defaults$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(applyStandardsMetadataDefaults(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/standards/defaults")));
          } catch (error) {
            return problem(404, "Manuscript not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "applyKoiosStandardsMetadataDefaults",
        summary: "Apply default standards metadata",
        description: "Fills or updates default CC BY 4.0 license, license URL, and syndication-rights metadata without publishing or changing manuscript copy.",
        tags: ["operators", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Standards metadata defaults applied",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such manuscript" }),
        }),
      }),
      {
        id: "koios-newsroom.normalize-manuscript-references-html",
        name: "Normalize Manuscript References HTML",
        route: "/operators/manuscripts/:slug/references/normalize.html",
        match: /^\/operators\/manuscripts\/[^/]+\/references\/normalize\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/references/normalize.html");
          try {
            const result = normalizeManuscriptReferences(contentDir, slug);
            return { status: 200, type: "text/html; charset=utf-8", body: referencesNormalizedHtml(result) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not found", error instanceof Error ? error.message : String(error), `/operators/manuscripts/${encodeURIComponent(slug)}/standards.html`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.normalize-manuscript-references",
        name: "Normalize Manuscript References",
        route: "/operators/manuscripts/:slug/references/normalize",
        match: /^\/operators\/manuscripts\/[^/]+\/references\/normalize$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(normalizeManuscriptReferences(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/references/normalize")));
          } catch (error) {
            return problem(404, "Manuscript not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "normalizeKoiosManuscriptReferences",
        summary: "Normalize manuscript references",
        description: "Promotes legacy article source URLs into canonical CSL references and removes article-level sources without publishing or changing manuscript copy.",
        tags: ["operators", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Manuscript references normalized",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such manuscript" }),
        }),
      }),
      {
        id: "koios-newsroom.repair-manuscript-headings-html",
        name: "Repair Manuscript Headings HTML",
        route: "/operators/manuscripts/:slug/headings/repair.html",
        match: /^\/operators\/manuscripts\/[^/]+\/headings\/repair\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/headings/repair.html");
          try {
            const result = repairManuscriptHeadings(contentDir, slug);
            return { status: 200, type: "text/html; charset=utf-8", body: manuscriptHeadingsRepairedHtml(result) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not found", error instanceof Error ? error.message : String(error), `/operators/manuscripts/${encodeURIComponent(slug)}/standards.html`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.repair-manuscript-headings",
        name: "Repair Manuscript Headings",
        route: "/operators/manuscripts/:slug/headings/repair",
        match: /^\/operators\/manuscripts\/[^/]+\/headings\/repair$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(repairManuscriptHeadings(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/headings/repair")));
          } catch (error) {
            return problem(404, "Manuscript not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "repairKoiosManuscriptHeadings",
        summary: "Repair malformed manuscript headings",
        description: "Splits clear malformed H2 heading/body fusions into short H2 labels followed by body paragraphs without publishing the manuscript.",
        tags: ["operators", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Manuscript headings repaired",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such manuscript" }),
        }),
      }),
      {
        id: "koios-newsroom.repair-manuscript-seo-heading-html",
        name: "Repair Manuscript SEO Heading HTML",
        route: "/operators/manuscripts/:slug/headings/seo.html",
        match: /^\/operators\/manuscripts\/[^/]+\/headings\/seo\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/headings/seo.html");
          try {
            const result = repairManuscriptSeoHeading(contentDir, slug);
            return { status: 200, type: "text/html; charset=utf-8", body: manuscriptSeoHeadingRepairedHtml(result) };
          } catch (error) {
            return { status: 404, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not found", error instanceof Error ? error.message : String(error), `/operators/manuscripts/${encodeURIComponent(slug)}/standards.html`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.repair-manuscript-seo-heading",
        name: "Repair Manuscript SEO Heading",
        route: "/operators/manuscripts/:slug/headings/seo",
        match: /^\/operators\/manuscripts\/[^/]+\/headings\/seo$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(repairManuscriptSeoHeading(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/headings/seo")));
          } catch (error) {
            return problem(404, "Manuscript not found", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "repairKoiosManuscriptSeoHeading",
        summary: "Repair manuscript SEO heading",
        description: "Adjusts one conservative H2 heading so the manuscript SEO term appears in a level-two heading without publishing the manuscript.",
        tags: ["operators", "editing"],
        responses: Object.freeze({
          "200": Object.freeze({
            description: "Manuscript SEO heading repaired",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "404": Object.freeze({ description: "No such manuscript" }),
        }),
      }),
      {
        id: "koios-newsroom.publish-manuscript-html",
        name: "Publish Manuscript HTML",
        route: "/operators/manuscripts/:slug/publish.html",
        match: /^\/operators\/manuscripts\/[^/]+\/publish\.html$/,
        methods: ["POST"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/publish.html");
          try {
            const result = publishManuscript(contentDir, slug);
            return { status: 201, type: "text/html; charset=utf-8", body: manuscriptPublishedHtml(result) };
          } catch (error) {
            return { status: 409, type: "text/html; charset=utf-8", body: errorHtml("Manuscript not publishable", error instanceof Error ? error.message : String(error), `/operators/manuscripts/${encodeURIComponent(slug)}/standards.html`) };
          }
        },
      },
      documentedJsonResource({
        id: "koios-newsroom.publish-manuscript",
        name: "Publish Manuscript",
        route: "/operators/manuscripts/:slug/publish",
        match: /^\/operators\/manuscripts\/[^/]+\/publish$/,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          try {
            return json(publishManuscript(contentDir, pathSlug(ctx.url.pathname, "/operators/manuscripts/", "/publish")), 201);
          } catch (error) {
            return problem(409, "Manuscript not publishable", error instanceof Error ? error.message : String(error));
          }
        },
      }, {
        operationId: "publishKoiosManuscript",
        summary: "Publish a reviewed Koios manuscript",
        description: "Publishes a manuscript only if standards review has no blocking errors.",
        tags: ["operators", "publishing"],
        responses: Object.freeze({
          "201": Object.freeze({
            description: "Manuscript published",
            content: Object.freeze({
              "application/json": Object.freeze({ schema: Object.freeze({ type: "object" }) }),
            }),
          }),
          "409": Object.freeze({ description: "Manuscript is missing required standards evidence" }),
        }),
      }),
      {
        id: "koios-newsroom.publication-game",
        name: "Publication Game",
        route: "/publication-game.json",
        match: "/publication-game.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(publicationGame()),
      },
      {
        id: "koios-newsroom.runs",
        name: "Mill Runs",
        route: "/mill-runs.json",
        match: "/mill-runs.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(replayMillRuns(dataDir)),
      },
      {
        id: "koios-newsroom.views",
        name: "View Counts",
        route: "/views.json",
        match: "/views.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => json(new ViewTrace(farmLogPath(dataDir, "views.jsonl")).counts()),
      },
      {
        id: "koios-newsroom.healthz",
        name: "Health",
        route: "/healthz",
        match: "/healthz",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => ({ status: 200, type: "text/plain; charset=utf-8", body: "ok\n" }),
      },
    ],
  };
  const mcp = createMcpApp({
    path: "/mcp",
    serverInfo: Object.freeze({ name: "koios-newsroom", version: "0.1.0" }),
    instructions: "Koios newsroom MCP exposes operator readings and manuscript operations. Created manuscripts are drafts and must pass editorial gates before publication.",
    tools,
    dispatch,
  }).app;
  return withOpenApi(mergeApps(core, mcp), {
    title: "Koios.News Newsroom API",
    version: "0.1.0",
    description: "Operator-facing Koios.News newsroom API: department readings, manuscript inventory, draft creation, standards repair, review, and gated publishing.",
    servers: Object.freeze([{ url: "https://newsroom.koios.news", description: "Production newsroom host" }]),
  });
}
