/**
 * property — the farm's configuration unit: a property is one publication
 * the farm cultivates. It declares its content store, its data dir, its
 * seed terms, its beats' sources, its voice, its ask model, and its
 * demand source — all as values; the farm hard-codes no publication.
 *
 * Also here: the candidate projection (the koios front-matter shape,
 * now the farm's standard candidate shape: always draft: true, the gate
 * verdict riding along under the property's front-matter namespace) and
 * the content-store reading the demand table folds coverage from.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { decodeFrontMatterDocument, type FrontMatterDocument } from "@emsenn/content/codecs/frontmatter";
import type { SyndicationConfig } from "@emsenn/content/syndication";

import type { ArticleVoice, PostDraft } from "@emsenn/content/topology/article";
import type { CandidatePost, SeedTerm } from "./demand.mjs";

export type FarmDemandSource = Readonly<{
  /** The Search Console property, e.g. "sc-domain:koios.news". */
  property: string;
  /** The pull window in days; default 28. */
  days?: number;
  /** Service-account key file; defaults to content-computer's default. */
  keyFile?: string;
}>;

export type FarmProperty = Readonly<{
  /** The property's name — the `office` on its editorial work items. */
  name: string;
  /** Where candidate markdown lands. */
  contentDir: string;
  /** Where the run trace and demand material live. */
  dataDir: string;
  /** Run-trace file under dataDir; default "runs.jsonl". (koios keeps its
   * pre-farm "mill-runs.jsonl" — the trace is append-only, so its name
   * survives the machinery that writes it.) */
  runsFile?: string;
  /** The byline on produced candidates. */
  author: string;
  /** Front-matter namespace for the farm's metadata block; default "farm". */
  termKey?: string;
  voice: ArticleVoice;
  seeds: readonly SeedTerm[];
  /** Citable sources per beat: real publishers whose URLs may be cited. */
  beatSources: Readonly<Record<string, readonly SyndicationConfig[]>>;
  /** Category labels per beat, for the candidate's `categories`. */
  beatCategory?: Readonly<Record<string, string>>;
  /** Beat-generic term words that prove nothing about an event. */
  genericTermWords?: readonly string[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** The model whose editorial read gates publication; the `requiredSkill`
   * on deposited work items. Default "fable". */
  gateModel?: string;
  /** Minimum intake support before a term is warranted; default 3. */
  supportThreshold?: number;
  /** Optional Search Console demand pull, run on the farm tick. */
  demand?: FarmDemandSource;
}>;

/**
 * The farm data layout (emsenn, 2026-06-14): one tree per farm under its
 * `dataDir`, the same across every publication.
 *
 *   <dataDir>/logs/     append-only .jsonl event streams — EAVT datoms: the
 *                       run trace, the view trace. What happened, in order.
 *   <dataDir>/records/  .json / JSON-LD documents — current-state records:
 *                       the demand pull's search-console.json. What is true now.
 *
 * Every writer routes through these two helpers, so the split is one rule —
 * jsonl logs, json records — not a per-call-site convention.
 */
export function farmLogPath(dataDir: string, file: string): string {
  return join(dataDir, "logs", file);
}

export function farmRecordPath(dataDir: string, file: string): string {
  return join(dataDir, "records", file);
}

export function runsPath(property: FarmProperty): string {
  return farmLogPath(property.dataDir, property.runsFile ?? "runs.jsonl");
}

export function searchConsolePath(property: FarmProperty): string {
  return farmRecordPath(property.dataDir, "search-console.json");
}

/** Read every candidate post in a property's content store (ignores
 * section index files). A missing store is an empty store — the first
 * cultivation creates it. */
export function loadCandidates(contentDir: string): readonly CandidatePost[] {
  if (!existsSync(contentDir)) return Object.freeze([]);
  const files = readdirSync(contentDir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();
  return Object.freeze(files.map((name) => {
    const document = decodeFrontMatterDocument(readFileSync(join(contentDir, name), "utf8"));
    const slug = typeof document.frontMatter["slug"] === "string" && document.frontMatter["slug"] !== ""
      ? String(document.frontMatter["slug"])
      : basename(name).replace(/\.md$/, "");
    return Object.freeze({ slug, document });
  }));
}

export type CandidateDocumentInput = Readonly<{
  draft: PostDraft;
  term: string;
  beat: string;
  category?: string;
  author: string;
  termKey?: string;
  slug: string;
  day: string;
  shipped: boolean;
  cited: readonly string[];
}>;

/** Project a gated draft into the candidate front-matter document.
 * Editorial law (emsenn, 2026-06-11): the farm never publishes. Every
 * produced article is written draft: true; publication is gated by the
 * orchestrator's editorial read. The gate verdict is kept in
 * `<termKey>.gates_clear` and in the run trace. */
export function candidateDocument(input: CandidateDocumentInput): FrontMatterDocument {
  return Object.freeze({
    frontMatter: Object.freeze({
      title: input.draft.title,
      date: input.day,
      draft: true,
      author: input.author,
      slug: input.slug,
      description: input.draft.description,
      summary: input.draft.summary,
      keywords: Object.freeze([input.term]),
      ...(input.category === undefined ? {} : { categories: Object.freeze([input.category]) }),
      tags: input.draft.tags,
      sources: Object.freeze([...input.cited]),
      [input.termKey ?? "farm"]: Object.freeze({
        seo_term: input.term,
        tweet: input.draft.tweet,
        beat: input.beat,
        gates_clear: input.shipped,
      }),
    }),
    body: `${input.draft.body.trim()}\n`,
  });
}

// ---------- admission ----------

export function normalizeFarmProperty(input: unknown, path = "property"): FarmProperty {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${path} must be an object`);
  const record = input as Record<string, unknown>;
  const seeds = normalizeSeeds(record.seeds, `${path}.seeds`);
  const beatSources = normalizeBeatSources(record.beatSources, `${path}.beatSources`);
  for (const seed of seeds) {
    if (!(seed.beat in beatSources)) throw new TypeError(`${path}.seeds: beat "${seed.beat}" has no beatSources entry`);
  }
  return Object.freeze({
    name: requiredString(record.name, `${path}.name`),
    contentDir: requiredString(record.contentDir, `${path}.contentDir`),
    dataDir: requiredString(record.dataDir, `${path}.dataDir`),
    ...(optionalString(record.runsFile) === undefined ? {} : { runsFile: optionalString(record.runsFile)! }),
    author: requiredString(record.author, `${path}.author`),
    ...(optionalString(record.termKey) === undefined ? {} : { termKey: optionalString(record.termKey)! }),
    voice: normalizeVoice(record.voice, `${path}.voice`),
    seeds,
    beatSources,
    ...(record.beatCategory === undefined ? {} : { beatCategory: normalizeStringRecord(record.beatCategory, `${path}.beatCategory`) }),
    ...(record.genericTermWords === undefined ? {} : { genericTermWords: normalizeStringArray(record.genericTermWords, `${path}.genericTermWords`) }),
    ...(optionalString(record.provider) === undefined ? {} : { provider: optionalString(record.provider)! }),
    ...(optionalString(record.model) === undefined ? {} : { model: optionalString(record.model)! }),
    ...(optionalNumber(record.temperature, `${path}.temperature`) === undefined ? {} : { temperature: optionalNumber(record.temperature, `${path}.temperature`)! }),
    ...(optionalPositiveInteger(record.maxTokens, `${path}.maxTokens`) === undefined ? {} : { maxTokens: optionalPositiveInteger(record.maxTokens, `${path}.maxTokens`)! }),
    ...(optionalString(record.gateModel) === undefined ? {} : { gateModel: optionalString(record.gateModel)! }),
    ...(optionalPositiveInteger(record.supportThreshold, `${path}.supportThreshold`) === undefined ? {} : { supportThreshold: optionalPositiveInteger(record.supportThreshold, `${path}.supportThreshold`)! }),
    ...(record.demand === undefined ? {} : { demand: normalizeDemandSource(record.demand, `${path}.demand`) }),
  });
}

function normalizeVoice(input: unknown, path: string): ArticleVoice {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${path} must be an object`);
  const record = input as Record<string, unknown>;
  return Object.freeze({
    persona: normalizeStringArray(record.persona, `${path}.persona`),
    ...(record.exemplar === undefined ? {} : { exemplar: normalizeStringArray(record.exemplar, `${path}.exemplar`) }),
    ...(record.laws === undefined ? {} : { laws: normalizeStringArray(record.laws, `${path}.laws`) }),
  });
}

function normalizeSeeds(input: unknown, path: string): readonly SeedTerm[] {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError(`${path} must be a non-empty array`);
  return Object.freeze(input.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new TypeError(`${path}[${index}] must be an object`);
    const record = entry as Record<string, unknown>;
    const priority = record.priority;
    if (typeof priority !== "number" || !Number.isFinite(priority)) throw new TypeError(`${path}[${index}].priority must be a finite number`);
    return Object.freeze({
      beat: requiredString(record.beat, `${path}[${index}].beat`),
      term: requiredString(record.term, `${path}[${index}].term`),
      priority,
    });
  }));
}

function normalizeBeatSources(input: unknown, path: string): Readonly<Record<string, readonly SyndicationConfig[]>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${path} must be an object`);
  const out: Record<string, readonly SyndicationConfig[]> = {};
  for (const [beat, sources] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(sources)) throw new TypeError(`${path}.${beat} must be an array`);
    out[beat] = Object.freeze(sources.map((entry, index) => normalizeSource(entry, `${path}.${beat}[${index}]`)));
  }
  if (Object.keys(out).length === 0) throw new TypeError(`${path} must name at least one beat`);
  return Object.freeze(out);
}

function normalizeSource(value: unknown, path: string): SyndicationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path} must be an object`);
  const record = value as Record<string, unknown>;
  return Object.freeze({
    adapter: requiredString(record.adapter, `${path}.adapter`),
    ...(optionalString(record.query) === undefined ? {} : { query: optionalString(record.query)! }),
    ...(optionalString(record.url) === undefined ? {} : { url: optionalString(record.url)! }),
    ...(optionalPositiveInteger(record.max, `${path}.max`) === undefined ? {} : { max: optionalPositiveInteger(record.max, `${path}.max`)! }),
    ...(optionalString(record.sourcePrefix) === undefined ? {} : { sourcePrefix: optionalString(record.sourcePrefix)! }),
    ...(optionalString(record.sortBy) === undefined ? {} : { sortBy: optionalString(record.sortBy)! }),
    ...(optionalString(record.sortOrder) === undefined ? {} : { sortOrder: optionalString(record.sortOrder)! }),
    ...(optionalNonNegativeInteger(record.retries, `${path}.retries`) === undefined ? {} : { retries: optionalNonNegativeInteger(record.retries, `${path}.retries`)! }),
  });
}

function normalizeDemandSource(input: unknown, path: string): FarmDemandSource {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${path} must be an object`);
  const record = input as Record<string, unknown>;
  return Object.freeze({
    property: requiredString(record.property, `${path}.property`),
    ...(optionalPositiveInteger(record.days, `${path}.days`) === undefined ? {} : { days: optionalPositiveInteger(record.days, `${path}.days`)! }),
    ...(optionalString(record.keyFile) === undefined ? {} : { keyFile: optionalString(record.keyFile)! }),
  });
}

function normalizeStringArray(input: unknown, path: string): readonly string[] {
  if (!Array.isArray(input)) throw new TypeError(`${path} must be an array of strings`);
  return Object.freeze(input.map((entry, index) => {
    if (typeof entry !== "string") throw new TypeError(`${path}[${index}] must be a string`);
    return entry;
  }));
}

function normalizeStringRecord(input: unknown, path: string): Readonly<Record<string, string>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${path} must be an object`);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string") throw new TypeError(`${path}.${key} must be a string`);
    out[key] = value;
  }
  return Object.freeze(out);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${path} must be a finite number`);
  return value;
}

function optionalPositiveInteger(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new TypeError(`${path} must be a positive integer`);
  return value;
}

function optionalNonNegativeInteger(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new TypeError(`${path} must be a non-negative integer`);
  return value;
}
