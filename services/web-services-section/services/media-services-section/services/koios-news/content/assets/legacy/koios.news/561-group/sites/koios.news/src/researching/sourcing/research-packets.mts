// researching/sourcing/research-packets — local wire evidence assembled for
// a term before writing. A packet keeps intake sources distinct from the
// candidate CSL references that writing may carry into a manuscript.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { CslDate, CslItem } from "@emsenn/content/codecs/references";
import { DEFAULT_WIRE_STORE } from "@emsenn/content-production/cable";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "../../config.mjs";

export type ResearchPacketSource = Readonly<{
  kind: "koios.research.packet.source";
  subject: string;
  wire: string;
  path: string;
  title: string;
  url: string;
  domain?: string;
  published?: string;
  assertedAt?: string;
  score: number;
  matchedTerms: readonly string[];
  summary?: string;
}>;

export type ResearchPacketClaim = Readonly<{
  kind: "koios.research.packet.claim";
  sourceSubject: string;
  sourceUrl: string;
  id: string;
  predicate: string;
  object: string;
  force?: string;
  status?: string;
  assertedAt?: string;
}>;

export type ResearchPacketRisk = Readonly<{
  code: string;
  severity: "note" | "warning";
  message: string;
}>;

export type ResearchPacket = Readonly<{
  kind: "koios.research.packet";
  generatedAt: string;
  term: string;
  beat: string;
  queryTerms: readonly string[];
  sourceCount: number;
  selectedCount: number;
  intakeSources: readonly ResearchPacketSource[];
  claims: readonly ResearchPacketClaim[];
  warrant: Readonly<{
    status: "research-intake";
    supportClaimCount: number;
    refutationClaimCount: number;
    uncertainClaimCount: number;
    sourceDomainCount: number;
    sourceDomains: readonly string[];
    note: string;
  }>;
  editorialRisks: readonly ResearchPacketRisk[];
  sourceUrls: readonly string[];
  candidateReferences: readonly CslItem[];
  context: readonly string[];
  accountableAttention: Readonly<{
    rule: "make-the-click-preserve-the-warrant";
    headlineMustPreserve: readonly string[];
    forbiddenStrengthenings: readonly string[];
    correctionSurfacePolicy: string;
  }>;
  constraints: readonly string[];
}>;

export type ResearchPacketInput = Readonly<{
  term: string;
  beat: string;
  sourceUrls?: readonly string[];
  limit?: number;
  configPath?: string;
  now?: () => string;
}>;

type JsonRecord = Record<string, unknown>;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const STOPWORDS = new Set([
  "about",
  "after",
  "amid",
  "and",
  "are",
  "for",
  "from",
  "how",
  "into",
  "its",
  "new",
  "not",
  "of",
  "on",
  "over",
  "the",
  "to",
  "under",
  "when",
  "with",
]);

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function optionalText(value: unknown): string | undefined {
  const valueText = text(value);
  return valueText === "" ? undefined : valueText;
}

function integer(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function words(value: string): readonly string[] {
  return Object.freeze(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !STOPWORDS.has(word)));
}

function uniqueStrings(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set([...values].map((value) => value.trim()).filter(Boolean))]);
}

function maybeUrl(value: unknown): string | undefined {
  const valueText = optionalText(value);
  return valueText !== undefined && URL_PATTERN.test(valueText) ? valueText : undefined;
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function readConfig(configPath: string): JsonRecord {
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new TypeError("research packet config must be a JSON object");
  return parsed;
}

function wireStore(configPath: string, beat: string): string {
  const config = readConfig(configPath);
  const cable = isRecord(config["newscable"]) ? config["newscable"] : {};
  const wires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  const wire = wires.find((candidate) => isRecord(candidate) && text(candidate["name"]) === beat);
  const configDir = dirname(resolve(configPath));
  const rawStore = isRecord(wire) ? text(wire["store"], join(DEFAULT_WIRE_STORE, beat)) : join(DEFAULT_WIRE_STORE, beat);
  return resolve(configDir, rawStore);
}

function claimValue(bundle: JsonRecord, predicate: string): string | undefined {
  const claims = Array.isArray(bundle["claims"]) ? bundle["claims"] : [];
  for (const claim of claims) {
    if (!isRecord(claim)) continue;
    const proposition = isRecord(claim["proposition"]) ? claim["proposition"] : {};
    if (text(proposition["predicate"]) !== predicate) continue;
    return optionalText(proposition["object"]);
  }
  return undefined;
}

function claimsFromBundle(bundle: JsonRecord, source: ResearchPacketSource): readonly ResearchPacketClaim[] {
  const claims = Array.isArray(bundle["claims"]) ? bundle["claims"] : [];
  return Object.freeze(claims.flatMap((claim): ResearchPacketClaim[] => {
    if (!isRecord(claim)) return [];
    const proposition = isRecord(claim["proposition"]) ? claim["proposition"] : {};
    const predicate = optionalText(proposition["predicate"]);
    const object = optionalText(proposition["object"]);
    if (predicate === undefined || object === undefined) return [];
    const time = isRecord(claim["time"]) ? claim["time"] : {};
    return [Object.freeze({
      kind: "koios.research.packet.claim" as const,
      sourceSubject: source.subject,
      sourceUrl: source.url,
      id: text(claim["id"], predicate),
      predicate,
      object: truncate(object, 1200),
      ...(optionalText(claim["force"]) === undefined ? {} : { force: optionalText(claim["force"])! }),
      ...(optionalText(claim["status"]) === undefined ? {} : { status: optionalText(claim["status"])! }),
      ...(optionalText(time["asserted"]) === undefined ? {} : { assertedAt: optionalText(time["asserted"])! }),
    })];
  }));
}

function claimProvenanceUrl(bundle: JsonRecord): string | undefined {
  const claims = Array.isArray(bundle["claims"]) ? bundle["claims"] : [];
  for (const claim of claims) {
    if (!isRecord(claim)) continue;
    const provenance = isRecord(claim["provenance"]) ? claim["provenance"] : {};
    const citation = maybeUrl(provenance["citation"]);
    if (citation !== undefined) return citation;
  }
  return undefined;
}

function claimAssertedAt(bundle: JsonRecord): string | undefined {
  const claims = Array.isArray(bundle["claims"]) ? bundle["claims"] : [];
  for (const claim of claims) {
    if (!isRecord(claim)) continue;
    const time = isRecord(claim["time"]) ? claim["time"] : {};
    const asserted = optionalText(time["asserted"]);
    if (asserted !== undefined) return asserted;
  }
  return undefined;
}

function truncate(value: string, max = 700): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1).trimEnd()}…`;
}

function scoreCandidate(input: Readonly<{
  title: string;
  summary: string;
  url: string;
  term: string;
  queryTerms: readonly string[];
  explicitSourceUrls: ReadonlySet<string>;
}>): Readonly<{ score: number; matchedTerms: readonly string[] }> {
  const haystackTitle = input.title.toLowerCase();
  const haystackSummary = input.summary.toLowerCase();
  const term = input.term.toLowerCase();
  let score = input.explicitSourceUrls.has(input.url) ? 40 : 0;
  if (term !== "" && haystackTitle.includes(term)) score += 30;
  if (term !== "" && haystackSummary.includes(term)) score += 15;
  const matched: string[] = [];
  for (const queryTerm of input.queryTerms) {
    let termScore = 0;
    if (haystackTitle.includes(queryTerm)) termScore += 8;
    if (haystackSummary.includes(queryTerm)) termScore += 3;
    if (termScore > 0) {
      matched.push(queryTerm);
      score += termScore;
    }
  }
  return Object.freeze({ score, matchedTerms: Object.freeze(matched) });
}

function sourceFromFile(path: string, wire: string, input: Readonly<{
  term: string;
  queryTerms: readonly string[];
  explicitSourceUrls: ReadonlySet<string>;
}>): ResearchPacketSource | undefined {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!isRecord(parsed)) return undefined;
  const title = claimValue(parsed, "title");
  const url = claimValue(parsed, "url") ?? claimProvenanceUrl(parsed);
  if (title === undefined || url === undefined) return undefined;
  const summary = claimValue(parsed, "summary") ?? "";
  const scored = scoreCandidate({
    title,
    summary,
    url,
    term: input.term,
    queryTerms: input.queryTerms,
    explicitSourceUrls: input.explicitSourceUrls,
  });
  if (scored.score === 0) return undefined;
  const subject = text(parsed["subject"], path.replace(/^.*\//, "").replace(/\.json$/, ""));
  const domain = domainOf(url);
  return Object.freeze({
    kind: "koios.research.packet.source" as const,
    subject,
    wire,
    path,
    title,
    url,
    ...(domain === undefined ? {} : { domain }),
    ...(optionalText(claimValue(parsed, "published")) === undefined ? {} : { published: optionalText(claimValue(parsed, "published"))! }),
    ...(claimAssertedAt(parsed) === undefined ? {} : { assertedAt: claimAssertedAt(parsed)! }),
    score: scored.score,
    matchedTerms: scored.matchedTerms,
    ...(summary === "" ? {} : { summary: truncate(summary) }),
  });
}

function readBundleForSource(source: ResearchPacketSource): JsonRecord | undefined {
  try {
    const parsed = JSON.parse(readFileSync(source.path, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function issuedDateParts(dateText: string | undefined): CslDate | undefined {
  if (dateText === undefined) return undefined;
  const timestamp = Date.parse(dateText);
  if (!Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp);
  return Object.freeze({
    "date-parts": Object.freeze([Object.freeze([
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    ])]),
  });
}

function referenceId(url: string, title: string): string {
  const domain = domainOf(url) ?? "source";
  const hash = createHash("sha256").update(`${url}\n${title}`).digest("hex").slice(0, 8);
  return `${domain.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${hash}`;
}

function cslReference(source: ResearchPacketSource): CslItem {
  const issued = issuedDateParts(source.published);
  return Object.freeze({
    id: referenceId(source.url, source.title),
    type: "webpage",
    title: source.title,
    URL: source.url,
    ...(source.domain === undefined ? {} : { "container-title": source.domain }),
    ...(issued === undefined ? {} : { issued }),
  });
}

function latestFirst(left: ResearchPacketSource, right: ResearchPacketSource): number {
  if (left.score !== right.score) return right.score - left.score;
  const leftTime = Date.parse(left.published ?? left.assertedAt ?? "");
  const rightTime = Date.parse(right.published ?? right.assertedAt ?? "");
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

function contextLine(source: ResearchPacketSource, index: number): string {
  const date = source.published ?? source.assertedAt ?? "undated";
  const summary = source.summary === undefined ? "" : ` — ${source.summary}`;
  return `[${index + 1}] ${source.title} (${source.domain ?? source.url}, ${date})${summary}`;
}

function sourceRisks(sources: readonly ResearchPacketSource[], claims: readonly ResearchPacketClaim[]): readonly ResearchPacketRisk[] {
  const risks: ResearchPacketRisk[] = [];
  const domains = uniqueStrings(sources.flatMap((source) => source.domain === undefined ? [] : [source.domain]));
  if (sources.length === 0) {
    risks.push(Object.freeze({
      code: "no-local-wire-evidence",
      severity: "warning" as const,
      message: "No matching owned wire bundles were found; do not write from demand alone.",
    }));
  } else if (sources.length < 3) {
    risks.push(Object.freeze({
      code: "thin-evidence-set",
      severity: "warning" as const,
      message: "Fewer than three matching source bundles were found; a draft needs more research or narrow scope.",
    }));
  }
  if (domains.length === 1 && sources.length > 1) {
    risks.push(Object.freeze({
      code: "single-domain-source-concentration",
      severity: "warning" as const,
      message: "All selected sources come from one domain; preserve attribution and avoid treating repetition as independent evidence.",
    }));
  }
  if (claims.every((claim) => claim.force === undefined && claim.status === undefined)) {
    risks.push(Object.freeze({
      code: "weak-claim-state-marking",
      severity: "note" as const,
      message: "Selected claims have little explicit force/status marking; preserve source-bound language in prose.",
    }));
  }
  risks.push(Object.freeze({
    code: "demand-is-not-evidence",
    severity: "note" as const,
    message: "The term and beat justify research attention only; they do not support any factual claim.",
  }));
  return Object.freeze(risks);
}

function warrantFor(sources: readonly ResearchPacketSource[], claims: readonly ResearchPacketClaim[]): ResearchPacket["warrant"] {
  const sourceDomains = uniqueStrings(sources.flatMap((source) => source.domain === undefined ? [] : [source.domain]));
  const refutationClaimCount = claims.filter((claim) => /refut|deny|disput|false|unsupported/i.test(`${claim.status ?? ""} ${claim.force ?? ""}`)).length;
  const supportClaimCount = claims.filter((claim) => /support|allege|report|assert/i.test(`${claim.status ?? ""} ${claim.force ?? ""}`)).length;
  return Object.freeze({
    status: "research-intake" as const,
    supportClaimCount,
    refutationClaimCount,
    uncertainClaimCount: Math.max(0, claims.length - supportClaimCount - refutationClaimCount),
    sourceDomainCount: sourceDomains.length,
    sourceDomains,
    note: "This warrant is source-bound research intake. Writing may cite these records, but only editing and publishing gates can settle a manuscript.",
  });
}

export function researchPacket(input: ResearchPacketInput): ResearchPacket {
  const term = text(input.term);
  const beat = text(input.beat);
  if (term === "") throw new TypeError("research packet term must be a non-empty string");
  if (beat === "") throw new TypeError("research packet beat must be a non-empty string");
  const configPath = input.configPath ?? DEFAULT_CONTENT_PRODUCTION_CONFIG;
  const queryTerms = uniqueStrings(words(term));
  const explicitSourceUrls = new Set(input.sourceUrls?.filter((url) => URL_PATTERN.test(url)) ?? []);
  const store = wireStore(configPath, beat);
  const candidates: ResearchPacketSource[] = [];
  if (existsSync(store)) {
    for (const entry of readdirSync(store, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const source = sourceFromFile(join(store, entry.name), beat, { term, queryTerms, explicitSourceUrls });
      if (source !== undefined) candidates.push(source);
    }
  }
  const limit = Math.min(integer(input.limit, 12), 50);
  const selected = Object.freeze(candidates.sort(latestFirst).slice(0, limit));
  const claims = Object.freeze(selected.flatMap((source) => {
    const bundle = readBundleForSource(source);
    return bundle === undefined ? [] : claimsFromBundle(bundle, source);
  }));
  const sourceUrls = uniqueStrings([...explicitSourceUrls, ...selected.map((source) => source.url)]);
  return Object.freeze({
    kind: "koios.research.packet" as const,
    generatedAt: (input.now ?? (() => new Date().toISOString()))(),
    term,
    beat,
    queryTerms,
    sourceCount: candidates.length,
    selectedCount: selected.length,
    intakeSources: selected,
    claims,
    warrant: warrantFor(selected, claims),
    editorialRisks: sourceRisks(selected, claims),
    sourceUrls,
    candidateReferences: Object.freeze(selected.map(cslReference)),
    context: Object.freeze(selected.map(contextLine)),
    accountableAttention: Object.freeze({
      rule: "make-the-click-preserve-the-warrant" as const,
      headlineMustPreserve: Object.freeze([
        "attribution",
        "modality",
        "scope",
        "uncertainty",
        "correction state",
      ]),
      forbiddenStrengthenings: Object.freeze([
        "source claim to newsroom fact",
        "may/could/alleged to does/did/proves",
        "single case to trend",
        "correlation to causation",
        "reader demand to evidence",
      ]),
      correctionSurfacePolicy: "Any later correction to a cited claim must be propagated to body copy, headline, social cards, feeds, JSON-LD, and syndicated packets.",
    }),
    constraints: Object.freeze([
      "This packet is research intake, not a publishable article.",
      "sourceUrls are newsroom source material; candidateReferences are the CSL-shaped cited cut available to writing.",
      "claims remain attributed and source-bound until a manuscript's editing and publishing gates settle them.",
      "Attention surfaces may increase curiosity, but must not create factual commitments absent from the packet or manuscript references.",
      "Publication still requires body citations, editing standards review, and an explicit publishing action.",
    ]),
  });
}

export const researchPacketJsonSchema = Object.freeze({
  type: "object",
  required: Object.freeze(["term", "beat"]),
  properties: Object.freeze({
    term: Object.freeze({ type: "string", minLength: 1 }),
    beat: Object.freeze({ type: "string", minLength: 1 }),
    sourceUrls: Object.freeze({
      type: "array",
      items: Object.freeze({ type: "string", format: "uri" }),
    }),
    limit: Object.freeze({ type: "integer", minimum: 1, maximum: 50 }),
  }),
  additionalProperties: false,
});
