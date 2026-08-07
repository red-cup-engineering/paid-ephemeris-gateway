// researching/sourcing/source-cycle — one Koios-owned source refresh plus farm
// tick. This is the operator-visible act that turns external feeds into local
// wire evidence, then lets the content farm assemble context and draft.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

import {
  createContentFarmService,
  contentFarmConfigFromDocument,
  farmCycleReading,
  type ContentFarmConfig,
  type FarmCycle,
  type FarmCycleReading,
  type ViewCountsReading,
} from "@emsenn/content-production/content-farm";
import { decodeFrontMatterDocument, encodeFrontMatterDocument, type FrontMatterRecord } from "@emsenn/content/codecs/frontmatter";
import {
  ingestCableFromConfig,
  type IngestResult,
} from "@emsenn/content-production/cable";
import type { FetchLike } from "@emsenn/content/syndication";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "../../config.mjs";
import { loadPosts } from "../../content.mjs";
import { koiosMasthead } from "../../index.mjs";
import { koiosItems } from "../../surface.mjs";
import { draftInternalLinkGuidanceReading, type DraftInternalLinkSuggestion } from "../writing/editing/publishing/managing/circulating/index.mjs";
import {
  KOIOS_DEFAULT_LICENSE,
  KOIOS_DEFAULT_LICENSE_URL,
  KOIOS_DEFAULT_SYNDICATION_RIGHTS,
} from "../writing/editing/standards.mjs";
import { normalizeCslReferenceRecords, referencesFromSourceUrls } from "./reference-normalization.mjs";

export type SourceWirePlan = Readonly<{
  name: string;
  sourceCount: number;
  sources: readonly string[];
}>;

export type KoiosSourceCyclePlan = Readonly<{
  kind: "koios.news.source-cycle.plan";
  configPath: string;
  cable: Readonly<{
    title: string;
    domain: string;
    port: number | null;
    wireCount: number;
    sourceCount: number;
    wires: readonly SourceWirePlan[];
  }>;
  farm: Readonly<{
    name: string;
    port: number;
    propertyCount: number;
    properties: readonly Readonly<{
      name: string;
      contentDir: string;
      dataDir: string;
      beatCount: number;
      beats: readonly string[];
      seedCount: number;
    }>[];
  }>;
  operator: Readonly<{
    planUrl: string;
    runUrl: string;
    publicationGate: string;
  }>;
}>;

export type KoiosSourceCycleReading = Readonly<{
  kind: "koios.news.source-cycle";
  generatedAt: string;
  plan: KoiosSourceCyclePlan;
  cable: Readonly<{
    wireCount: number;
    written: number;
    skipped: number;
    errorCount: number;
    results: readonly IngestResult[];
    skippedMessages: readonly string[];
  }>;
  farm: FarmCycleReading;
  candidateWriteCollisions: readonly SourceCycleCandidateWriteCollision[];
  candidateReferences: readonly CandidateReferenceNormalization[];
  candidateDraftInternalLinkGuidance: readonly CandidateDraftInternalLinkGuidance[];
  editorialPolicy: Readonly<{
    record: "draft-candidate";
    publication: "manual-standards-gate";
    note: string;
  }>;
}>;

export type CandidateReferenceNormalization = Readonly<{
  kind: "koios.news.source-cycle.references";
  slug: string;
  path: string;
  changed: boolean;
  sourceUrlCount: number;
  referenceCount: number;
}>;

export type CandidateDraftInternalLinkGuidance = Readonly<{
  kind: "koios.news.source-cycle.draft-internal-link-guidance";
  slug: string;
  path: string;
  changed: boolean;
  suggestionCount: number;
  suggestions: readonly Pick<DraftInternalLinkSuggestion, "targetSlug" | "targetPath" | "targetHeadline" | "matchedTerms" | "confidence" | "markdownLink" | "writingGuidance">[];
}>;

export type SourceCycleCandidateWriteCollision = Readonly<{
  kind: "koios.news.source-cycle.candidate-write-collision";
  slug: string;
  path: string;
  existingDraft: boolean;
  existingTitle?: string;
  runTitle?: string;
  restored: boolean;
  instruction: string;
}>;

export type KoiosSourceCycleOptions = Readonly<{
  configPath?: string;
  fetchImpl?: FetchLike;
  env?: Readonly<Record<string, string | undefined>>;
  views?: ViewCountsReading;
  now?: () => string;
  onSkip?: (message: string) => void;
}>;

export type SourceCycleRepairTaskKind = "source-alignment" | "seo-revision" | "reference-enrichment" | "copy-edit" | "warrant-review" | "structure-repair";

export type SourceCycleRepairTask = Readonly<{
  kind: SourceCycleRepairTaskKind;
  gate: string;
  priority: number;
  evidence: string;
  instruction: string;
}>;

export type SourceCycleCandidateState = Readonly<{
  status: "missing" | "draft" | "published";
  path?: string;
  title?: string;
}>;

export type SourceCycleRepairPacket = Readonly<{
  kind: "koios.news.source-cycle.repair-packet";
  slug: string;
  term: string;
  beat: string;
  t?: string;
  shipped: boolean;
  story?: Readonly<{ title?: string; url?: string }>;
  usage?: Readonly<{ calls?: number; tokens?: number }>;
  candidate: SourceCycleCandidateState;
  failedGateCount: number;
  highestPriority: number;
  taskCount: number;
  tasks: readonly SourceCycleRepairTask[];
}>;

export type SourceCycleRepairPacketsReading = Readonly<{
  kind: "koios.news.source-cycle.repair-packets";
  packetCount: number;
  openPacketCount: number;
  taskCount: number;
  byCandidate: readonly SourceCycleRepairPacket[];
  constraints: readonly string[];
}>;

type JsonRecord = Record<string, unknown>;

type CandidateSnapshot = Readonly<{
  path: string;
  text: string;
  slug: string;
  draft: boolean;
  title?: string;
}>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function readConfigDocument(configPath: string): unknown {
  return JSON.parse(readFileSync(configPath, "utf8")) as unknown;
}

function manuscriptSlug(frontMatter: Readonly<Record<string, unknown>>, fallback: string): string {
  return typeof frontMatter["slug"] === "string" && frontMatter["slug"] !== "" ? frontMatter["slug"] : fallback;
}

function koiosFrontMatter(frontMatter: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const value = frontMatter["koios"];
  return isRecord(value) ? value : Object.freeze({});
}

function frontMatterDraft(frontMatter: Readonly<Record<string, unknown>>): boolean {
  return frontMatter["draft"] === true || frontMatter["draft"] === "true";
}

function slugFromTerm(term: string): string {
  return term.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "source-cycle-obstruction";
}

function runString(run: Readonly<Record<string, unknown>>, key: string): string {
  return stringValue(run[key]);
}

function runBoolean(run: Readonly<Record<string, unknown>>, key: string): boolean {
  return run[key] === true;
}

function runUsage(run: Readonly<Record<string, unknown>>): SourceCycleRepairPacket["usage"] | undefined {
  const usage = run["usage"];
  if (!isRecord(usage)) return undefined;
  const calls = typeof usage["calls"] === "number" && Number.isFinite(usage["calls"]) ? usage["calls"] : undefined;
  const tokens = typeof usage["tokens"] === "number" && Number.isFinite(usage["tokens"]) ? usage["tokens"] : undefined;
  if (calls === undefined && tokens === undefined) return undefined;
  return Object.freeze({
    ...(calls === undefined ? {} : { calls }),
    ...(tokens === undefined ? {} : { tokens }),
  });
}

function runStory(run: Readonly<Record<string, unknown>>): SourceCycleRepairPacket["story"] | undefined {
  const story = run["story"];
  if (!isRecord(story)) return undefined;
  const title = stringValue(story["title"]);
  const url = stringValue(story["url"]);
  if (title === "" && url === "") return undefined;
  return Object.freeze({
    ...(title === "" ? {} : { title }),
    ...(url === "" ? {} : { url }),
  });
}

function failedRunGates(run: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] {
  const gates = run["gates"];
  if (!Array.isArray(gates)) return Object.freeze([]);
  return Object.freeze(gates.filter((gate): gate is Readonly<Record<string, unknown>> =>
    isRecord(gate) && stringValue(gate["charge"]) !== "pass"));
}

function repairTaskForGate(gate: Readonly<Record<string, unknown>>): SourceCycleRepairTask {
  const name = stringValue(gate["gate"], "unknown-gate");
  const evidence = stringValue(gate["evidence"], "The gate failed without structured evidence.");
  if (name === "seo-subheader") {
    return Object.freeze({
      kind: "seo-revision" as const,
      gate: name,
      priority: 86,
      evidence,
      instruction: "Revise one natural H2 so the selected SEO term appears once without making the heading read like a stamped keyword.",
    });
  }
  if (name === "seo-frequency") {
    return Object.freeze({
      kind: "seo-revision" as const,
      gate: name,
      priority: 84,
      evidence,
      instruction: "Reduce repeated SEO phrasing and reconsider the term if the witnessed story is being forced into the wrong demand bucket.",
    });
  }
  if (name === "citations") {
    return Object.freeze({
      kind: "reference-enrichment" as const,
      gate: name,
      priority: 90,
      evidence,
      instruction: "Add or repair CSL references and body citations for the witnessed intake cut; do not reintroduce article-level sources frontmatter.",
    });
  }
  if (name === "numbers-faithfulness") {
    return Object.freeze({
      kind: "warrant-review" as const,
      gate: name,
      priority: 88,
      evidence,
      instruction: "Remove unsupported figures or cite witnessed intake that actually carries the number before publication.",
    });
  }
  if (name === "no-prophecy") {
    return Object.freeze({
      kind: "copy-edit" as const,
      gate: name,
      priority: 82,
      evidence,
      instruction: "Rewrite future-certainty language as contingent analysis grounded in the available sources.",
    });
  }
  if (name === "length") {
    return Object.freeze({
      kind: "structure-repair" as const,
      gate: name,
      priority: 80,
      evidence,
      instruction: "Extend the manuscript with sourced context, warranted analysis, and article structure rather than filler.",
    });
  }
  if (name === "summary-length") {
    return Object.freeze({
      kind: "copy-edit" as const,
      gate: name,
      priority: 58,
      evidence,
      instruction: "Adjust summary and description lengths while preserving the factual warrant of the manuscript.",
    });
  }
  return Object.freeze({
    kind: "copy-edit" as const,
    gate: name,
    priority: 70,
    evidence,
    instruction: "Review the failed gate evidence and revise the draft only where the manuscript warrants it.",
  });
}

function repairTaskForObstruction(run: Readonly<Record<string, unknown>>): SourceCycleRepairTask | null {
  const obstruction = runString(run, "obstruction");
  if (obstruction === "") return null;
  const evidence = runString(run, "evidence") || `Source cycle obstruction: ${obstruction}`;
  return Object.freeze({
    kind: "source-alignment" as const,
    gate: obstruction,
    priority: 92,
    evidence,
    instruction: "Repair the intake path or choose a demand row with witnessed local wire evidence before spending model calls.",
  });
}

function candidateState(contentDir: string | undefined, slug: string): SourceCycleCandidateState {
  if (contentDir === undefined || slug === "") return Object.freeze({ status: "missing" as const });
  const path = join(contentDir, `${slug}.md`);
  if (!existsSync(path)) return Object.freeze({ status: "missing" as const, path });
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  const title = stringValue(document.frontMatter["title"]);
  return Object.freeze({
    status: document.frontMatter["draft"] === true ? "draft" as const : "published" as const,
    path,
    ...(title === "" ? {} : { title }),
  });
}

function sourceCycleRepairPacket(runValue: unknown, contentDir: string | undefined): SourceCycleRepairPacket | null {
  if (!isRecord(runValue)) return null;
  const gates = failedRunGates(runValue);
  const obstruction = repairTaskForObstruction(runValue);
  const tasks = Object.freeze([
    ...gates.map(repairTaskForGate),
    ...(obstruction === null ? [] : [obstruction]),
  ].sort((left, right) => right.priority - left.priority || left.gate.localeCompare(right.gate)));
  if (tasks.length === 0) return null;
  const term = runString(runValue, "term");
  const beat = runString(runValue, "beat");
  const slug = runString(runValue, "slug") || slugFromTerm(term || beat);
  const highestPriority = tasks.reduce((max, task) => Math.max(max, task.priority), 0);
  const t = runString(runValue, "t");
  const story = runStory(runValue);
  const usage = runUsage(runValue);
  return Object.freeze({
    kind: "koios.news.source-cycle.repair-packet" as const,
    slug,
    term,
    beat,
    ...(t === "" ? {} : { t }),
    shipped: runBoolean(runValue, "shipped"),
    ...(story === undefined ? {} : { story }),
    ...(usage === undefined ? {} : { usage }),
    candidate: candidateState(contentDir, slug),
    failedGateCount: gates.length,
    highestPriority,
    taskCount: tasks.length,
    tasks,
  });
}

export function sourceCycleRepairPacketsReading(input: Readonly<{
  runs: readonly unknown[];
  contentDir?: string;
  limit?: number;
}>): SourceCycleRepairPacketsReading {
  const seen = new Set<string>();
  const packets: SourceCycleRepairPacket[] = [];
  for (const run of [...input.runs].reverse()) {
    const packet = sourceCycleRepairPacket(run, input.contentDir);
    if (packet === null) continue;
    const key = `${packet.slug}\n${packet.term}\n${packet.beat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    packets.push(packet);
    if (packets.length >= (input.limit ?? 50)) break;
  }
  const ordered = Object.freeze(packets.sort((left, right) => {
    const leftOpen = left.candidate.status !== "published";
    const rightOpen = right.candidate.status !== "published";
    return Number(rightOpen) - Number(leftOpen)
      || right.highestPriority - left.highestPriority
      || (right.t ?? "").localeCompare(left.t ?? "")
      || left.slug.localeCompare(right.slug);
  }));
  return Object.freeze({
    kind: "koios.news.source-cycle.repair-packets" as const,
    packetCount: ordered.length,
    openPacketCount: ordered.filter((packet) => packet.candidate.status !== "published").length,
    taskCount: ordered.reduce((sum, packet) => sum + packet.taskCount, 0),
    byCandidate: ordered,
    constraints: Object.freeze([
      "This is a read-only operator backlog over farm run traces.",
      "Repair packets do not rewrite, publish, or silently normalize manuscripts.",
      "Intake sources remain research material; published citations remain CSL references in manuscript frontmatter and body links.",
      "A published candidate stays visible as historical friction but is not counted as open.",
    ]),
  });
}

export function normalizeCandidateReferences(path: string): CandidateReferenceNormalization {
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  const sourceUrls = strings(document.frontMatter["sources"]).filter((source) => /^https?:\/\//i.test(source));
  const existingReferences = Array.isArray(document.frontMatter["references"]) ? document.frontMatter["references"] : [];
  const nextReferences = existingReferences.length > 0 ? normalizeCslReferenceRecords(existingReferences) : referencesFromSourceUrls(sourceUrls);
  const frontMatter = { ...document.frontMatter } as FrontMatterRecord;
  const changed = "sources" in frontMatter
    || JSON.stringify(existingReferences) !== JSON.stringify(nextReferences)
    || frontMatter["license"] === undefined
    || frontMatter["license_url"] === undefined
    || frontMatter["syndication_rights"] === undefined;
  if (changed) {
    const { sources: _sources, ...withoutSources } = frontMatter;
    writeFileSync(path, encodeFrontMatterDocument({
      frontMatter: Object.freeze({
        ...withoutSources,
        ...(nextReferences.length === 0 ? {} : { references: Object.freeze(nextReferences) }),
        license: withoutSources["license"] ?? KOIOS_DEFAULT_LICENSE,
        license_url: withoutSources["license_url"] ?? KOIOS_DEFAULT_LICENSE_URL,
        syndication_rights: withoutSources["syndication_rights"] ?? KOIOS_DEFAULT_SYNDICATION_RIGHTS,
      }),
      body: document.body.endsWith("\n") ? document.body : `${document.body}\n`,
    }), "utf8");
  }
  return Object.freeze({
    kind: "koios.news.source-cycle.references" as const,
    slug: manuscriptSlug(document.frontMatter, path.replace(/^.*\//, "").replace(/\.md$/, "")),
    path,
    changed,
    sourceUrlCount: sourceUrls.length,
    referenceCount: nextReferences.length,
  });
}

function compactDraftLinkSuggestion(suggestion: DraftInternalLinkSuggestion): CandidateDraftInternalLinkGuidance["suggestions"][number] {
  return Object.freeze({
    targetSlug: suggestion.targetSlug,
    targetPath: suggestion.targetPath,
    targetHeadline: suggestion.targetHeadline,
    matchedTerms: suggestion.matchedTerms,
    confidence: suggestion.confidence,
    markdownLink: suggestion.markdownLink,
    writingGuidance: suggestion.writingGuidance,
  });
}

export function enrichCandidateDraftInternalLinkGuidance(path: string, contentDir = dirname(path)): CandidateDraftInternalLinkGuidance {
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  const slug = manuscriptSlug(document.frontMatter, path.replace(/^.*\//, "").replace(/\.md$/, ""));
  const koios = koiosFrontMatter(document.frontMatter);
  const term = stringValue(koios["seo_term"]) || strings(document.frontMatter["keywords"])[0] || stringValue(document.frontMatter["title"], slug);
  const beat = stringValue(koios["beat"]);
  const tags = strings(document.frontMatter["tags"]);
  const posts = loadPosts(contentDir);
  const guidance = draftInternalLinkGuidanceReading({
    posts,
    items: koiosItems(posts, koiosMasthead()),
    term,
    ...(beat === "" ? {} : { beat }),
    tags,
    excludeSlugs: [slug],
    limit: 3,
  });
  const suggestions = Object.freeze(guidance.suggestions.map(compactDraftLinkSuggestion));
  const nextKoios = Object.freeze({
    ...koios,
    draft_internal_link_guidance: suggestions,
  });
  const changed = JSON.stringify(koios["draft_internal_link_guidance"] ?? []) !== JSON.stringify(suggestions);
  if (changed) {
    writeFileSync(path, encodeFrontMatterDocument({
      frontMatter: Object.freeze({
        ...document.frontMatter,
        koios: nextKoios,
      }),
      body: document.body.endsWith("\n") ? document.body : `${document.body}\n`,
    }), "utf8");
  }
  return Object.freeze({
    kind: "koios.news.source-cycle.draft-internal-link-guidance" as const,
    slug,
    path,
    changed,
    suggestionCount: suggestions.length,
    suggestions,
  });
}

function candidateSnapshots(farmConfig: ContentFarmConfig): ReadonlyMap<string, CandidateSnapshot> {
  const snapshots = new Map<string, CandidateSnapshot>();
  for (const property of farmConfig.properties) {
    if (!existsSync(property.contentDir)) continue;
    for (const entry of readdirSync(property.contentDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const path = join(property.contentDir, entry.name);
      const text = readFileSync(path, "utf8");
      const document = decodeFrontMatterDocument(text);
      snapshots.set(resolve(path), Object.freeze({
        path,
        text,
        slug: manuscriptSlug(document.frontMatter, entry.name.replace(/\.md$/, "")),
        draft: frontMatterDraft(document.frontMatter),
        ...(stringValue(document.frontMatter["title"]) === "" ? {} : { title: stringValue(document.frontMatter["title"]) }),
      }));
    }
  }
  return snapshots;
}

function restoreCycleCandidateWriteCollisions(cycle: FarmCycle, snapshots: ReadonlyMap<string, CandidateSnapshot>): readonly SourceCycleCandidateWriteCollision[] {
  const collisions: SourceCycleCandidateWriteCollision[] = [];
  for (const reading of cycle.readings) {
    const run = reading.run;
    if (run.kind !== "content.farm.cultivation:witness" || run.path === null) continue;
    const snapshot = snapshots.get(resolve(run.path));
    if (snapshot === undefined) continue;
    const current = existsSync(run.path) ? readFileSync(run.path, "utf8") : "";
    const restored = current !== snapshot.text;
    if (restored) writeFileSync(run.path, snapshot.text, "utf8");
    collisions.push(Object.freeze({
      kind: "koios.news.source-cycle.candidate-write-collision" as const,
      slug: snapshot.slug,
      path: run.path,
      existingDraft: snapshot.draft,
      ...(snapshot.title === undefined ? {} : { existingTitle: snapshot.title }),
      runTitle: run.draft.title,
      restored,
      instruction: "The farm attempted to write a draft candidate at an existing manuscript path. Koios restored the existing manuscript; create a new assignment or unique draft slug before writing this candidate.",
    }));
  }
  return Object.freeze(collisions);
}

function collisionPathSet(collisions: readonly SourceCycleCandidateWriteCollision[]): ReadonlySet<string> {
  return new Set(collisions.map((collision) => resolve(collision.path)));
}

function normalizeCycleCandidateReferences(cycle: FarmCycle, collisions: ReadonlySet<string> = new Set()): readonly CandidateReferenceNormalization[] {
  const normalized: CandidateReferenceNormalization[] = [];
  for (const reading of cycle.readings) {
    const run = reading.run;
    if (run.kind !== "content.farm.cultivation:witness" || run.path === null) continue;
    if (collisions.has(resolve(run.path))) continue;
    normalized.push(normalizeCandidateReferences(run.path));
  }
  return Object.freeze(normalized);
}

function enrichCycleCandidateDraftInternalLinks(cycle: FarmCycle, collisions: ReadonlySet<string> = new Set()): readonly CandidateDraftInternalLinkGuidance[] {
  const enriched: CandidateDraftInternalLinkGuidance[] = [];
  for (const reading of cycle.readings) {
    const run = reading.run;
    if (run.kind !== "content.farm.cultivation:witness" || run.path === null) continue;
    if (collisions.has(resolve(run.path))) continue;
    enriched.push(enrichCandidateDraftInternalLinkGuidance(run.path));
  }
  return Object.freeze(enriched);
}

function sourceLabel(source: unknown): string {
  if (!isRecord(source)) return "(unreadable source)";
  const adapter = stringValue(source["adapter"], "source");
  const locator = stringValue(source["url"]) || stringValue(source["query"]) || adapter;
  return `${adapter}:${locator}`;
}

function wirePlans(document: unknown): readonly SourceWirePlan[] {
  const root = isRecord(document) ? document : {};
  const cable = isRecord(root["newscable"]) ? root["newscable"] : {};
  const wires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  return Object.freeze(wires.flatMap((wire): SourceWirePlan[] => {
    if (!isRecord(wire)) return [];
    const sources = Array.isArray(wire["sources"]) ? wire["sources"].map(sourceLabel) : [];
    return [Object.freeze({
      name: stringValue(wire["name"], "unnamed-wire"),
      sourceCount: sources.length,
      sources: Object.freeze(sources),
    })];
  }));
}

function cablePlan(document: unknown): KoiosSourceCyclePlan["cable"] {
  const root = isRecord(document) ? document : {};
  const cable = isRecord(root["newscable"]) ? root["newscable"] : {};
  const wires = wirePlans(document);
  return Object.freeze({
    title: stringValue(cable["title"], "Koios source cable"),
    domain: stringValue(cable["domain"], "cable.koios.news"),
    port: numberValue(cable["port"]),
    wireCount: wires.length,
    sourceCount: wires.reduce((sum, wire) => sum + wire.sourceCount, 0),
    wires,
  });
}

function farmPlan(config: ContentFarmConfig): KoiosSourceCyclePlan["farm"] {
  return Object.freeze({
    name: config.name,
    port: config.port,
    propertyCount: config.properties.length,
    properties: Object.freeze(config.properties.map((property) => {
      const beats = Object.keys(property.beatSources).sort();
      return Object.freeze({
        name: property.name,
        contentDir: property.contentDir,
        dataDir: property.dataDir,
        beatCount: beats.length,
        beats: Object.freeze(beats),
        seedCount: property.seeds.length,
      });
    })),
  });
}

export function koiosSourceCyclePlan(options: Pick<KoiosSourceCycleOptions, "configPath"> = {}): KoiosSourceCyclePlan {
  const configPath = options.configPath ?? DEFAULT_CONTENT_PRODUCTION_CONFIG;
  const document = readConfigDocument(configPath);
  const farm = contentFarmConfigFromDocument(document);
  return Object.freeze({
    kind: "koios.news.source-cycle.plan" as const,
    configPath,
    cable: cablePlan(document),
    farm: farmPlan(farm),
    operator: Object.freeze({
      planUrl: "https://newsroom.koios.news/operators/source-cycle/plan.json",
      runUrl: "https://newsroom.koios.news/operators/source-cycle",
      publicationGate: "Draft candidates remain draft:true until the editing and publishing offices approve them.",
    }),
  });
}

export async function runKoiosSourceCycle(options: KoiosSourceCycleOptions = {}): Promise<KoiosSourceCycleReading> {
  const configPath = options.configPath ?? DEFAULT_CONTENT_PRODUCTION_CONFIG;
  const plan = koiosSourceCyclePlan({ configPath });
  const skippedMessages: string[] = [];
  const onSkip = (message: string): void => {
    skippedMessages.push(message);
    options.onSkip?.(message);
  };
  const cableResults = await ingestCableFromConfig(configPath, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    onSkip,
  });
  const farmConfig = contentFarmConfigFromDocument(readConfigDocument(configPath));
  const snapshots = candidateSnapshots(farmConfig);
  const service = createContentFarmService(farmConfig, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    env: options.env ?? process.env,
    ...(options.views === undefined ? {} : { views: options.views }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const cycle = await service.tick();
  const candidateWriteCollisions = restoreCycleCandidateWriteCollisions(cycle, snapshots);
  const collisionPaths = collisionPathSet(candidateWriteCollisions);
  const candidateReferences = normalizeCycleCandidateReferences(cycle, collisionPaths);
  const candidateDraftInternalLinkGuidance = enrichCycleCandidateDraftInternalLinks(cycle, collisionPaths);
  const farm = farmCycleReading(cycle);
  return Object.freeze({
    kind: "koios.news.source-cycle" as const,
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    plan,
    cable: Object.freeze({
      wireCount: cableResults.length,
      written: cableResults.reduce((sum, result) => sum + result.written, 0),
      skipped: cableResults.reduce((sum, result) => sum + result.skipped, 0),
      errorCount: cableResults.reduce((sum, result) => sum + result.errors.length, 0),
      results: cableResults,
      skippedMessages: Object.freeze(skippedMessages),
    }),
    farm,
    candidateWriteCollisions,
    candidateReferences,
    candidateDraftInternalLinkGuidance,
    editorialPolicy: Object.freeze({
      record: "draft-candidate" as const,
      publication: "manual-standards-gate" as const,
      note: "The source cycle can write draft candidates and run traces; Koios normalizes candidate citation metadata to CSL references and annotates drafts with same-site link guidance, but publishing remains a separate standards-gated newsroom action.",
    }),
  });
}
