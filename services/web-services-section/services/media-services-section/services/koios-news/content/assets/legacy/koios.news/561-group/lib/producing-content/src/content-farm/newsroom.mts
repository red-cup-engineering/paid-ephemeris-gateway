/**
 * newsroom — the NEWSROOM FIBER over the content-farm cycle.
 *
 * Per emsenn (2026-06-15): "newsroom is meant to be a specialization of
 * content-farm, where its special functions are parameters into a content-farm."
 * This module harvests those special functions out of the (retiring) standalone
 * `@emsenn/newsroom` package and exposes them as content-farm SEAM parameters —
 * `select`/`compose`/`record` — so a newsroom is literally
 * `cultivate(property, { ...options, ...newsroomProfile })`, not a parallel
 * engine. See dev/docs/notes/2026-06-15-newsroom-as-fiber-over-content-farm.md.
 *
 * This file currently carries the COMPOSE seam (multi-paper brief synthesis,
 * the newsroom reporter's voice); the SELECT seam (angle clustering) and the
 * RECORD seam (claim-state assertion trace) fold in next. The synthesis
 * functions are kept exported in their own right — they are real capabilities
 * (grounded multi-source briefing) and must not be lost.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { SyndicationItem, FetchLike, SyndicationAdapter } from "@emsenn/content/syndication";
import type { PostDraft, FarmGate } from "@emsenn/content/topology/article";
import {
  write, clearGate, assertionsFromWrites, claimSetsFromTrace, newsSlug,
  type NewsClaimWrite, type NewsAssertionTrace, type NewsClaimSet,
} from "@emsenn/content/topology/news";
import { cultivate, intakeItems } from "./cultivate.mjs";
import type { Ask, ComposeDraft, SelectStory, RecordCycle, CycleSettlement, CultivationObstruction } from "./cultivate.mjs";
import type { DemandEntry } from "./demand.mjs";
import type { FarmProperty } from "./property.mjs";

const unique = <T,>(xs: readonly T[]): T[] => [...new Set(xs)];

// ---------- prose normalization (harvested from @emsenn/newsroom) ----------

/** Strip the tics an LLM leaves in a brief: bold runs, "headline:"/"report:"
 * prefixes, empty `(Source: )` stubs, bare citation brackets, and the spacing
 * those removals leave behind. */
export function cleanProse(value: unknown): string {
  return String(value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*(?:headline|report):\s*/i, "")
    .replace(/\s*\(Source:\s*\)\.?/gi, ".")
    .replace(/\[[\d,\s]+\]/g, " ")
    .replace(/\s+([.!?,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a reply into clean, single-idea sentences; blanks are dropped. */
export function sentences(value: unknown): readonly string[] {
  const text = cleanProse(value);
  if (!text) return Object.freeze([]);
  return Object.freeze(text.split(/(?<=[.!?])\s+/).map(cleanProse).filter((line) => line.length > 1));
}

// ---------- brief synthesis (harvested from @emsenn/newsroom) ----------

/** A reporter's brief: one headline sentence and the coverage findings. The
 * claim-state-first shape — prose is a lossy projection of these. */
export type StructuredBrief = Readonly<{ headline: string; findings: readonly string[] }>;

/** The reporter prompt: ground a short brief ONLY in the bundled sources. */
export function synthesisPrompt(systemPrompt: string, topic: string, papers: readonly SyndicationItem[]): string {
  const bundle = papers.map((paper, index) => `[${index + 1}] ${paper.title}: ${paper.summary ?? ""}`).join("\n\n");
  return `${systemPrompt}\n\nTopic: "${topic}". Sources:\n\n${bundle}\n\n` +
    "Write a short news brief grounded only in the sources above: one headline sentence, then 3 to 6 short, single-idea sentences of coverage.";
}

/** Read a reply into a brief: the first sentence is the headline, the rest are
 * findings. A reply with no prose is an error — synthesis produced nothing. */
export function structureBrief(reply: unknown): StructuredBrief {
  const parts = sentences(reply);
  if (parts.length === 0) throw new Error("synthesis returned no prose");
  return Object.freeze({ headline: parts[0]!, findings: Object.freeze(parts.slice(1)) });
}

/** Synthesize a brief over the bundled papers through the injected `ask`. */
export async function synthesizeBrief(
  ask: Ask,
  params: Readonly<{ systemPrompt?: string; topic: string; papers: readonly SyndicationItem[] }>,
): Promise<StructuredBrief> {
  return structureBrief(await ask(synthesisPrompt(params.systemPrompt ?? "", params.topic, params.papers)));
}

// ---------- the newsroom COMPOSE seam ----------

/** The newsroom's composition: synthesize a brief over the selected story and
 * its context (the cycle's intake = the reporter's papers), grounding every
 * claim in those sources, and project the brief into a PostDraft. Unlike the
 * farm default (one freeform draft prompt), the newsroom reporter writes a
 * source-bounded brief — headline + single-idea findings. */
export const newsroomCompose: ComposeDraft = async ({ voice, term, story, context, ask }) => {
  const papers = [story, ...context];
  const systemPrompt = [...voice.persona, ...(voice.laws ?? [])].join(" ");
  const brief = await synthesizeBrief(ask, { systemPrompt, topic: term, papers });
  const body = brief.findings.join("\n\n");
  const draft: PostDraft = {
    title: brief.headline,
    description: brief.headline,
    summary: brief.findings[0] ?? brief.headline,
    tweet: brief.headline,
    tags: [],
    body: body.length > 0 ? body : brief.headline,
  };
  return Object.freeze({ draft, copyedits: [] });
};

// ---------- angle clustering (harvested from @emsenn/newsroom) ----------

const STOP_WORDS = new Set(("the a an of to in on for and or with from is are be been by as at into over under " +
  "new using based via this that these those their its it can will more most toward across within news agent agents web").split(" "));

/** The content words of a string (4+ letters, stop-words removed, de-duped) —
 * the basis for keyword-overlap clustering. */
export function keywordsOf(value: unknown): readonly string[] {
  return unique((String(value ?? "").toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((word) => !STOP_WORDS.has(word)));
}

/** The assignment-editor prompt: from today's intake, name the N strongest
 * distinct story angles worth assigning. */
export function assignmentPrompt(voice: string, topic: string, articles: readonly SyndicationItem[], max = 3): string {
  const publication = articles.map((article, index) => `${index + 1}. ${article.title}`).join("\n");
  return `${voice.replace(/\{topic\}/g, topic)}\n\nHere is today's source intake. Name the ${max} strongest distinct story angles worth assigning, one per line.\n\nSource observations:\n${publication}`;
}

/** Read the assignment editor's reply into clean angle lines, dropping
 * preamble, empty headers, and numbering. */
export function parseAngles(reply: unknown): readonly string[] {
  return Object.freeze(String(reply ?? "").split("\n")
    .map((line) => cleanProse(line.replace(/^[\s>*\-\d.)]+/, "")))
    .filter((line) => line.length > 4 && /[a-z]/i.test(line))
    .filter((line) => !/:\s*$/.test(line))
    .filter((line) => !/^(here are|the following|below are|these are|sure|certainly|okay|here's)\b/i.test(line)));
}

/** Cluster the intake by keyword overlap with an angle, returning the matching
 * source subjects in descending relevance (the newsroom's source-clustering
 * capability; used by the angle-assignment layer). */
export function clusterSources(angle: string, articles: readonly SyndicationItem[], sourceSubjects: readonly string[], max = 5): readonly string[] {
  const angleKeywords = keywordsOf(angle);
  return Object.freeze(articles
    .map((article, index) => ({
      source: sourceSubjects[index],
      score: keywordsOf(article.title).filter((word) => angleKeywords.includes(word)).length,
    }))
    .filter((candidate): candidate is { source: string; score: number } => candidate.score > 0 && !!candidate.source)
    .sort((left, right) => right.score - left.score)
    .slice(0, max)
    .map((candidate) => candidate.source));
}

// ---------- the newsroom SELECT seam ----------

/** The newsroom's selection: the assigned term IS the angle. Rather than the
 * farm's term-as-lens single-story pick, the newsroom clusters the intake by
 * keyword overlap with the angle — the best-matching item leads, the rest of
 * the cluster is the reporter's context (the papers the brief is grounded in).
 * With no keyword match it falls back to the intake order, so the cycle always
 * settles on a story. */
export const newsroomSelect: SelectStory = ({ term, items }) => {
  const angleKeywords = keywordsOf(term);
  const scored = items
    .map((item) => ({ item, score: keywordsOf(`${item.title} ${item.summary ?? ""}`).filter((word) => angleKeywords.includes(word)).length }))
    .sort((left, right) => right.score - left.score);
  const matched = scored.filter((entry) => entry.score > 0);
  const ranked = matched.length > 0 ? matched : scored;
  const story = ranked[0]?.item ?? items[0]!;
  const context = ranked.slice(1, 6).map((entry) => entry.item);
  return { story, context };
};

// ---------- claim-state writes (harvested from @emsenn/newsroom) ----------

/** The subject atom for a source observation: prefix + the article's id (arXiv
 * abs ids stripped to their bare form), or its url/title. */
export function articleSubject(prefix: string, article: Pick<SyndicationItem, "id" | "url" | "title">): string {
  const rawId = article.id ?? article.url ?? article.title;
  const arxivId = typeof article.id === "string" ? article.id.replace(/^https?:\/\/arxiv\.org\/abs\//, "") : rawId;
  return newsSlug(`${prefix} ${arxivId}`);
}

/** The source observation as a claim write: title and url, plus abstract,
 * publication date, authors, and categories when present. */
export function sourceWrites(article: SyndicationItem, opts: Readonly<{ prefix?: string; citation?: string }> = {}): readonly NewsClaimWrite[] {
  const prefix = opts.prefix ?? article.source ?? "source";
  const subject = articleSubject(prefix, article);
  const citation = opts.citation ?? article.url;
  const claims: Record<string, unknown> = { title: article.title, url: article.url };
  if (article.summary) claims["abstract"] = article.summary;
  if (article.published) claims["published"] = article.published;
  if (article.authors && article.authors.length > 0) claims["author"] = [...article.authors];
  if (article.categories && article.categories.length > 0) claims["category"] = [...article.categories];
  return Object.freeze([write(subject, claims, citation)]);
}

/** A brief as claim writes: the headline cell and (when present) the findings
 * cell, both cited to the reporter. */
export function briefWrites(subject: string, brief: StructuredBrief, citation = "newsroom:reporter"): readonly NewsClaimWrite[] {
  const writes: NewsClaimWrite[] = [write(subject, { headline: brief.headline }, citation)];
  if (brief.findings.length > 0) writes.push(write(subject, { finds: [...brief.findings] }, citation));
  return Object.freeze(writes);
}

// ---------- the newsroom RECORD seam ----------

/** The newsroom's witness: instead of a markdown candidate, the cycle's
 * settlement is carried out as a claim-state ASSERTION TRACE (the canonical
 * carrier — every source observation, the angle and its draws-on links, the
 * brief, and each editorial gate, charged) and the CLAIM SETS folded back out
 * of it. Per the news-topology theory the trace is canonical and prose is the
 * lossy projection. */
export type NewsroomCultivation = Readonly<{
  kind: "content.farm.newsroom-cultivation:witness";
  property: string;
  assignment: DemandEntry;
  story: SyndicationItem;
  draft: PostDraft;
  gates: readonly FarmGate[];
  shipped: boolean;
  assertionTrace: NewsAssertionTrace;
  claimSets: readonly NewsClaimSet[];
  path: string | null;
  usage: Readonly<{ calls: number; tokens: number }>;
  intakeObstructions: readonly string[];
}>;

/** The newsroom's recording: fold the settlement into claim writes — source
 * observations for the story and its context, the angle and its draws-on
 * links, the brief, the editorial gates (a failed gate is a denial), and the
 * published status when shipped — assert them into a trace, and fold the trace
 * back into per-subject claim sets. Persists the trace + claim sets as JSON
 * under the property's data dir unless dry-run. */
export const newsroomRecord: RecordCycle<NewsroomCultivation> = (settlement: CycleSettlement, ctx) => {
  const { property, assignment, story, context, draft, gates, shipped, usage, intakeObstructions } = settlement;
  const papers = [story, ...context];
  const subject = newsSlug(draft.title).split("-").slice(0, 9).join("-") || `${property.name}-${ctx.at}`;
  const citation = `newsroom:${property.name}`;
  const sourceSubjects = unique(papers.map((item) => articleSubject(item.source ?? "source", item)));
  const findings = sentences(draft.body);
  const writes: NewsClaimWrite[] = [
    ...papers.flatMap((item) => sourceWrites(item, { prefix: item.source ?? "source" })),
    write(subject, { angle: assignment.term, "draws-on": sourceSubjects }, citation),
    ...briefWrites(subject, { headline: draft.title, findings }, citation),
    ...gates.map((gate) => clearGate(subject, gate.gate, gate.charge === "pass", `desk:${gate.gate}`)),
    ...(shipped ? [write(subject, { status: "published", "published-at": ctx.at }, citation)] : []),
  ];
  const assertionTrace = assertionsFromWrites(writes, { transaction: ctx.at });
  const claimSets = claimSetsFromTrace(assertionTrace);
  let path: string | null = null;
  if (!ctx.dryRun) {
    const dir = join(property.dataDir, "newsroom");
    mkdirSync(dir, { recursive: true });
    path = join(dir, `${subject}.json`);
    writeFileSync(path, `${JSON.stringify({ subject, shipped, assertionTrace, claimSets })}\n`, "utf8");
  }
  return Object.freeze({
    kind: "content.farm.newsroom-cultivation:witness" as const,
    property: property.name,
    assignment,
    story,
    draft,
    gates,
    shipped,
    assertionTrace,
    claimSets,
    path,
    usage,
    intakeObstructions,
  });
};

// ---------- the newsroom CYCLE (the N-angles-per-run orchestration) ----------

/** Ask the assignment editor for the strongest distinct angles in today's
 * intake. The assignment is the OUTER layer of the newsroom fiber: it chooses
 * WHICH angles to run; the per-angle cultivation (selection → composition →
 * recording) is one base cycle each. With no `ask`, the lead titles stand in;
 * an empty result still yields a roundup angle so a non-empty intake always
 * produces at least one story. */
export async function assignAngles(
  voice: string,
  topic: string,
  items: readonly SyndicationItem[],
  max = 3,
  ask?: Ask,
): Promise<readonly string[]> {
  const reply = ask ? await ask(assignmentPrompt(voice, topic, items, max)) : items.slice(0, max).map((item) => item.title).join("\n");
  const seen = new Set<string>();
  const angles: string[] = [];
  for (const angle of parseAngles(reply)) {
    const key = newsSlug(angle).split("-").slice(0, 8).join("-");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    angles.push(angle);
    if (angles.length >= max) break;
  }
  if (angles.length === 0 && items.length > 0) angles.push(`What's new in ${topic}`);
  return Object.freeze(angles);
}

/** Options for the newsroom cycle: the clock stamp, the beat to draw intake
 * from, the assignment topic and story bound, and the cultivation I/O. */
export type NewsroomCycleOptions = Readonly<{
  at: string;
  beat?: string;
  topic?: string;
  maxStories?: number;
  ask?: Ask;
  fetchImpl?: FetchLike;
  adapters?: Readonly<Record<string, SyndicationAdapter>>;
  dryRun?: boolean;
  provider?: string;
  model?: string;
  env?: Readonly<Record<string, string | undefined>>;
}>;

/** One newsroom cycle for a property: fetch the beat's intake ONCE, assign the
 * day's angles over it, then run the base cultivation cycle once per angle with
 * the newsroom seams (angle selection, brief composition, assertion-trace
 * recording). The witnessed stories and the per-angle obstructions are both
 * returned as values. */
export type NewsroomCycleResult = Readonly<{
  kind: "content.farm.newsroom-cycle:witness";
  property: string;
  angles: readonly string[];
  intakeObstructions: readonly string[];
  stories: readonly NewsroomCultivation[];
  obstructions: readonly CultivationObstruction[];
}>;

/** Run one newsroom cycle. See NewsroomCycleResult. */
export async function runNewsroomCycle(property: FarmProperty, options: NewsroomCycleOptions): Promise<NewsroomCycleResult> {
  const beat = options.beat ?? Object.keys(property.beatSources)[0] ?? "";
  const intake = await intakeItems(property, beat, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.adapters === undefined ? {} : { adapters: options.adapters }),
  });
  const topic = options.topic ?? property.termKey ?? property.name;
  const voice = [...property.voice.persona, ...(property.voice.laws ?? [])].join(" ");
  const angles = await assignAngles(voice, topic, intake.items, options.maxStories ?? 3, options.ask);
  const stories: NewsroomCultivation[] = [];
  const obstructions: CultivationObstruction[] = [];
  for (const angle of angles) {
    const result = await cultivate(property, {
      at: options.at,
      term: angle,
      beat,
      items: intake.items,
      ...(options.ask === undefined ? {} : { ask: options.ask }),
      ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
      ...(options.provider === undefined ? {} : { provider: options.provider }),
      ...(options.model === undefined ? {} : { model: options.model }),
      ...(options.env === undefined ? {} : { env: options.env }),
      select: newsroomSelect,
      compose: newsroomCompose,
      record: newsroomRecord,
    });
    if (result.kind === "content.farm.newsroom-cultivation:witness") stories.push(result);
    else obstructions.push(result);
  }
  return Object.freeze({
    kind: "content.farm.newsroom-cycle:witness" as const,
    property: property.name,
    angles,
    intakeObstructions: intake.obstructions,
    stories: Object.freeze(stories),
    obstructions: Object.freeze(obstructions),
  });
}
