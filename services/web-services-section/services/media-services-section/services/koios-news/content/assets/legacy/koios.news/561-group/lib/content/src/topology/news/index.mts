import { asChargeValueName, type ChargeValueName } from "@emsenn/relating";

/** A JSON value — the metadata/object payload carried by news carriers.
 * The content domain owns its own JSON type; it borrows none from the agent
 * fleet. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Deterministic id from a value: a slugged JSON serialization, truncated.
 * Pure and content-local — the news domain carries no agent-fleet
 * dependency, only a hash over its own carriers. */
function stableId(value: unknown, length = 16): string {
  return JSON.stringify(value)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, length) || "item";
}

/**
 * The newsroom desks: the named editorial offices a story passes through -
 * assignment, research, writing, editing, standards, publishing.
 */
export type NewsDeskName = "assignment" | "research" | "writing" | "editing" | "standards" | "publishing";
/**
 * The output shape of a news item: wire, article, brief, profile, explainer, or
 * custom.
 */
export type NewsFormat = "wire" | "article" | "brief" | "profile" | "explainer" | "custom";
/**
 * A claim's charge value, aliased from the relationality algebra: the charge a
 * news cell carries (absurd, potential, active, stable).
 */
export type NewsClaimCharge = ChargeValueName;
/**
 * A single claim cell: a predicate and object, with optional citation and the
 * witnesses who claimed or contrarily claimed it.
 */
export type NewsClaim = Readonly<{ predicate: string; object: unknown; citation?: string; claimedBy?: string | readonly string[]; contraryClaimedBy?: string | readonly string[] }>;
/**
 * The lossy projection of a claim-state onto a subject: claims partitioned by
 * charge into potential, active, and stable cells, with an optional time
 * marker. The documented LOSSY view of ClaimStateBundle kept for the wire
 * surfaces.
 */
export type NewsClaimSet = Readonly<{ subject: string; potential?: readonly NewsClaim[]; active?: readonly NewsClaim[]; stable?: readonly NewsClaim[]; t?: unknown }>;
/**
 * A write request against a subject's claims: the subject, a map of
 * predicate-to-value claims, and the citation backing them.
 */
export type NewsClaimWrite = Readonly<{
  subject: string;
  claims: Readonly<Record<string, unknown>>;
  citation: string;
}>;

/**
 * One stage of the editorial lifecycle: its status, the gate predicate that
 * clears it, and a human label.
 */
export type LifecycleStage = Readonly<{ status: string; gate: string; label: string }>;
/**
 * The resolved editorial lifecycle: its ordered stages, the status and gate
 * atoms, the publishing status, and lookups from a status to its index or gate.
 */
export type Lifecycle = Readonly<{
  stages: readonly LifecycleStage[];
  statuses: readonly string[];
  gates: readonly string[];
  publishStatus: string;
  indexOf: (status: string) => number;
  gateFor: (status: string) => string | undefined;
}>;

/**
 * The full editorial-gate judgment for a subject: its current status, whether
 * it is publishable, and every lifecycle gate with its charge,
 * cleared/contested/rejected flags, and witnessing evidence.
 */
export type GateReport = Readonly<{
  subject: string;
  status: string | null;
  publishable: boolean;
  gates: readonly Readonly<{
    status: string;
    gate: string;
    label: string;
    charge: NewsClaimCharge;
    cleared: boolean;
    contested: boolean;
    rejected: boolean;
    evidence: readonly string[];
  }>[];
}>;

/**
 * A coverage beat: its keyword, optional near-keywords, optional domain, and
 * optional metadata.
 */
export type NewsBeat = Readonly<{
  keyword: string;
  nearKeywords?: readonly string[];
  domain?: string;
  metadata?: Readonly<Record<string, JsonValue>>;
}>;

/**
 * A news source definition: an id, the adapter that fetches it, an optional
 * query, url, max item count, and metadata.
 */
export type NewsSource = Readonly<{
  id: string;
  adapter: string;
  query?: string;
  url?: string;
  max?: number;
  metadata?: Readonly<Record<string, JsonValue>>;
}>;

/**
 * A single observation drawn from a source: its id, originating sourceId, url
 * and title, with optional summary, authors, published date, categories,
 * charge, and metadata.
 */
export type NewsSourceObservation = Readonly<{
  id: string;
  sourceId: string;
  url: string;
  title: string;
  summary?: string;
  authors?: readonly string[];
  published?: string;
  categories?: readonly string[];
  charge?: ChargeValueName;
  metadata?: Readonly<Record<string, JsonValue>>;
}>;

/**
 * A proposed story: its id, beat, headline and angle, the source observations
 * it draws on, its output format, and optional metadata.
 */
export type NewsStoryCandidate = Readonly<{
  id: string;
  beat: NewsBeat;
  headline: string;
  angle: string;
  sources: readonly NewsSourceObservation[];
  format: NewsFormat;
  metadata?: Readonly<Record<string, JsonValue>>;
}>;

/**
 * A desk's ruling on a story: the storyId, the desk, the pass/fail/hold/revise
 * status, and optional reason, timestamp, author, and evidence.
 */
export type NewsEditorialDecision = Readonly<{
  storyId: string;
  desk: NewsDeskName;
  status: "pass" | "fail" | "hold" | "revise";
  reason?: string;
  at?: JsonValue;
  by?: string;
  evidence?: readonly string[];
}>;

// The news desks (agent-fleet offices) and the assignment/project work
// builders are AGENCY, not content — they live in services/newsroom, which
// specializes this content core onto the agent fleet.

/**
 * The frozen registry of news predicate paths: maps each news concept (beat,
 * keyword, source, headline, body, angle, editorial-decision, codecs, and so
 * on) to its predicate path tuple.
 */
export const NEWS_PREDICATES = Object.freeze({
  beat: ["news", "beat"] as const,
  keyword: ["news", "keyword"] as const,
  nearKeyword: ["news", "near-keyword"] as const,
  source: ["news", "source"] as const,
  sourceUrl: ["news", "source-url"] as const,
  headline: ["news", "headline"] as const,
  summary: ["news", "summary"] as const,
  body: ["news", "body"] as const,
  angle: ["news", "angle"] as const,
  drawsOn: ["news", "draws-on"] as const,
  editorialDecision: ["news", "editorial-decision"] as const,
  publishedAt: ["news", "published-at"] as const,
  ninjs: ["news", "codec", "ninjs"] as const,
  iptc: ["news", "codec", "iptc"] as const,
});

/**
 * The predicate atom under which a subject's current publication status cell is
 * stored.
 */
export const STATUS_PREDICATE = "status";
/** The object value marking a cleared editorial gate. */
export const GATE_PASS = "pass";
/** The object value marking a failed editorial gate. */
export const GATE_FAIL = "fail";
/** The status and gate atom for the published lifecycle stage. */
export const PUBLISHED = "published";

/**
 * The default editorial lifecycle stages: assigned, reported, fact-checked,
 * copy-edited, standards-cleared, and published.
 */
export const DEFAULT_LIFECYCLE: readonly LifecycleStage[] = Object.freeze([
  Object.freeze({ status: "assigned", gate: "assigned", label: "Assigned" }),
  Object.freeze({ status: "reported", gate: "reported", label: "Reported" }),
  Object.freeze({ status: "fact-checked", gate: "fact-checked", label: "Fact-checked" }),
  Object.freeze({ status: "copy-edited", gate: "copy-edited", label: "Copy-edited" }),
  Object.freeze({ status: "standards-cleared", gate: "standards-cleared", label: "Standards-cleared" }),
  Object.freeze({ status: PUBLISHED, gate: PUBLISHED, label: "Published" }),
]);

/**
 * Build a resolved Lifecycle from stage specs: normalizes each stage
 * (defaulting gate and label to the status), checks statuses are unique, fixes
 * the publish status, and returns the frozen lifecycle with index and gate
 * lookups. Throws TypeError on no stages, a missing status, duplicate statuses,
 * or a publishStatus outside the lifecycle.
 */
export function lifecycle(stages: readonly Partial<LifecycleStage>[] = DEFAULT_LIFECYCLE, opts: { publishStatus?: string } = {}): Lifecycle {
  if (stages.length === 0) throw new TypeError("lifecycle needs at least one stage");
  const normalized = Object.freeze(stages.map((stage, index) => {
    if (!stage.status) throw new TypeError(`lifecycle stage ${index} needs status`);
    return Object.freeze({ status: stage.status, gate: stage.gate ?? stage.status, label: stage.label ?? stage.status });
  }));
  const statuses = normalized.map((stage) => stage.status);
  if (new Set(statuses).size !== statuses.length) throw new TypeError("lifecycle statuses must be unique");
  const publishStatus = opts.publishStatus ?? statuses.at(-1)!;
  if (!statuses.includes(publishStatus)) throw new TypeError("publishStatus must be in lifecycle");
  const byStatus = new Map(statuses.map((status, index) => [status, index]));
  return Object.freeze({
    stages: normalized,
    statuses: Object.freeze(statuses),
    gates: Object.freeze(normalized.map((stage) => stage.gate)),
    publishStatus,
    indexOf: (status: string) => byStatus.get(status) ?? -1,
    gateFor: (status: string) => {
      const index = byStatus.get(status);
      return index === undefined ? undefined : normalized[index]?.gate;
    },
  });
}

/**
 * The set of predicates the news domain manages internally: the status
 * predicate together with every lifecycle gate.
 */
export function internalPredicates(lc: Lifecycle = lifecycle()): ReadonlySet<string> {
  return new Set([STATUS_PREDICATE, ...lc.gates]);
}

/**
 * The subject's current publication status: the last string-valued status cell
 * among its potential claims, or null if none.
 */
export function currentPublicationStatus(claimSet: Pick<NewsClaimSet, "potential">): string | null {
  let status: string | null = null;
  for (const cell of claimSet.potential ?? []) {
    if (cell.predicate === STATUS_PREDICATE && typeof cell.object === "string") status = cell.object;
  }
  return status;
}

/**
 * The charge of a gate over a claim set: stable if any stable cell carries the
 * gate, absurd if no cell does, potential if any potential cell is not a fail,
 * otherwise active.
 */
export function editorialGateCharge(claimSet: Pick<NewsClaimSet, "potential" | "active" | "stable">, gate: string): NewsClaimCharge {
  if ((claimSet.stable ?? []).some((cell) => cell.predicate === gate)) return "stable";
  const potential = (claimSet.potential ?? []).filter((cell) => cell.predicate === gate);
  const active = (claimSet.active ?? []).filter((cell) => cell.predicate === gate);
  if (potential.length === 0 && active.length === 0) return "absurd";
  if (potential.some((cell) => cell.object !== GATE_FAIL)) return "potential";
  return "active";
}

/**
 * The boolean shadow of the editorial-gate judgment (way 5: the classical
 * case is the degenerate case). The PRIMARY judgments are the carriers:
 * `editorialGateReport` (every gate with its charge and evidence) and
 * `firstBlockingEditorialGate` (the obstruction, or null). This shadow is a
 * rendering-edge convenience exported only for compatibility with its
 * existing consumers (`services/newsroom`, `services/newswire`), which use
 * it exactly as a rendering-edge count/filter. New callers should take the
 * carrier, not the shadow: the shadow forgets WHICH gate blocked and WHO
 * witnessed it. Exported by alias below so the boundary documents the
 * collapse instead of presenting it as a judgment (invariant A1).
 */
function readyForPublicationShadow(claimSet: Pick<NewsClaimSet, "potential" | "active" | "stable">, lc: Lifecycle = lifecycle()): boolean {
  const status = currentPublicationStatus(claimSet);
  if (!status || lc.indexOf(status) < lc.indexOf(lc.publishStatus)) return false;
  const publishIndex = lc.indexOf(lc.publishStatus);
  return lc.stages.slice(0, publishIndex + 1).every((stage) => editorialGateCharge(claimSet, stage.gate) === "potential");
}

export { readyForPublicationShadow as isReadyForPublication };

/**
 * The witnesses backing a gate over a claim set: the deduplicated citations
 * from potential and active cells plus the claimedBy and contraryClaimedBy
 * witnesses from stable cells.
 */
export function editorialGateEvidence(claimSet: Pick<NewsClaimSet, "potential" | "active" | "stable">, gate: string): readonly string[] {
  const evidence: string[] = [];
  const push = (value: unknown): void => {
    for (const witness of witnessList(value)) if (!evidence.includes(witness)) evidence.push(witness);
  };
  for (const cell of claimSet.potential ?? []) if (cell.predicate === gate) push(cell.citation);
  for (const cell of claimSet.active ?? []) if (cell.predicate === gate) push(cell.citation);
  for (const cell of claimSet.stable ?? []) {
    if (cell.predicate !== gate) continue;
    push(cell.claimedBy);
    push(cell.contraryClaimedBy);
  }
  return Object.freeze(evidence);
}

/**
 * The GateReport for a claim set: the subject, its current status, its
 * publishable shadow, and every lifecycle gate with its charge,
 * cleared/contested/rejected flags, and evidence.
 */
export function editorialGateReport(claimSet: NewsClaimSet, lc: Lifecycle = lifecycle()): GateReport {
  return Object.freeze({
    subject: claimSet.subject,
    status: currentPublicationStatus(claimSet),
    publishable: readyForPublicationShadow(claimSet, lc),
    gates: Object.freeze(lc.stages.map((stage) => {
      const charge = editorialGateCharge(claimSet, stage.gate);
      return Object.freeze({
        status: stage.status,
        gate: stage.gate,
        label: stage.label,
        charge,
        cleared: charge === "potential",
        contested: charge === "stable",
        rejected: charge === "active",
        evidence: editorialGateEvidence(claimSet, stage.gate),
      });
    })),
  });
}

/**
 * The first uncleared gate in the report - the obstruction to publication - or
 * null when every gate is cleared.
 */
export function firstBlockingEditorialGate(claimSet: NewsClaimSet, lc: Lifecycle = lifecycle()): GateReport["gates"][number] | null {
  return editorialGateReport(claimSet, lc).gates.find((gate) => !gate.cleared) ?? null;
}

/**
 * Normalize a beat input into a frozen NewsBeat: requires a non-empty keyword,
 * trims near-keywords and domain, and copies metadata. Throws TypeError on
 * empty text fields.
 */
export function newsBeat(input: NewsBeat): NewsBeat {
  return Object.freeze({
    keyword: requireText(input.keyword, "beat keyword"),
    ...(input.nearKeywords === undefined ? {} : { nearKeywords: Object.freeze(input.nearKeywords.map((value) => requireText(value, "near keyword"))) }),
    ...(input.domain === undefined ? {} : { domain: requireText(input.domain, "beat domain") }),
    ...(input.metadata === undefined ? {} : { metadata: Object.freeze({ ...input.metadata }) }),
  });
}

/**
 * The subject path for a beat: the frozen tuple ["news", "beat", slug] from a
 * beat or its keyword.
 */
export function beatSubject(beat: NewsBeat | string): readonly ["news", "beat", string] {
  const keyword = typeof beat === "string" ? beat : beat.keyword;
  return Object.freeze(["news", "beat", slug(keyword)] as const);
}

/**
 * The subject path for a story: the frozen tuple ["news", "story", slug] from a
 * required story id.
 */
export function storySubject(id: string): readonly ["news", "story", string] {
  return Object.freeze(["news", "story", slug(requireText(id, "story id"))] as const);
}

/**
 * The subject path for a source: the frozen tuple ["news", "source", slug] from
 * a required source id.
 */
export function sourceSubject(id: string): readonly ["news", "source", string] {
  return Object.freeze(["news", "source", slug(requireText(id, "source id"))] as const);
}

/**
 * Normalize a source input into a frozen NewsSource: requires non-empty id and
 * adapter, trims optional query and url, and copies max and metadata. Throws
 * TypeError on empty required text.
 */
export function newsSource(input: NewsSource): NewsSource {
  return Object.freeze({
    id: requireText(input.id, "source id"),
    adapter: requireText(input.adapter, "source adapter"),
    ...(input.query === undefined ? {} : { query: requireText(input.query, "source query") }),
    ...(input.url === undefined ? {} : { url: requireText(input.url, "source url") }),
    ...(input.max === undefined ? {} : { max: input.max }),
    ...(input.metadata === undefined ? {} : { metadata: Object.freeze({ ...input.metadata }) }),
  });
}

/**
 * Normalize an observation into a frozen NewsSourceObservation: derives a
 * stable id from sourceId, url, and title when none is given, requires
 * non-empty sourceId, url, and title, normalizes any charge, and copies the
 * optional fields.
 */
export function sourceObservation(input: Omit<NewsSourceObservation, "id"> & Partial<Pick<NewsSourceObservation, "id">>): NewsSourceObservation {
  const id = input.id ?? `observation:${stableId([input.sourceId, input.url, input.title])}`;
  return Object.freeze({
    id,
    sourceId: requireText(input.sourceId, "observation sourceId"),
    url: requireText(input.url, "observation url"),
    title: requireText(input.title, "observation title"),
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.authors === undefined ? {} : { authors: Object.freeze([...input.authors]) }),
    ...(input.published === undefined ? {} : { published: input.published }),
    ...(input.categories === undefined ? {} : { categories: Object.freeze([...input.categories]) }),
    ...(input.charge === undefined ? {} : { charge: asChargeValueName(input.charge) }),
    ...(input.metadata === undefined ? {} : { metadata: Object.freeze({ ...input.metadata }) }),
  });
}

/**
 * Normalize a story input into a frozen NewsStoryCandidate: normalizes its beat
 * and source observations, derives an id from the headline, angle, or source
 * urls when none is given, and requires non-empty headline and angle.
 */
export function storyCandidate(input: Omit<NewsStoryCandidate, "id"> & Partial<Pick<NewsStoryCandidate, "id">>): NewsStoryCandidate {
  const beat = newsBeat(input.beat);
  const sources = Object.freeze(input.sources.map((source) => sourceObservation(source)));
  const id = input.id ?? slug(input.headline || input.angle || stableId(sources.map((source) => source.url)));
  return Object.freeze({
    id,
    beat,
    headline: requireText(input.headline, "story headline"),
    angle: requireText(input.angle, "story angle"),
    sources,
    format: input.format,
    ...(input.metadata === undefined ? {} : { metadata: Object.freeze({ ...input.metadata }) }),
  });
}

/**
 * Normalize a decision input into a frozen NewsEditorialDecision: requires a
 * non-empty storyId, keeps the desk and status, and copies the optional reason,
 * timestamp, author, and evidence.
 */
export function editorialDecision(input: NewsEditorialDecision): NewsEditorialDecision {
  return Object.freeze({
    storyId: requireText(input.storyId, "decision storyId"),
    desk: input.desk,
    status: input.status,
    ...(input.reason === undefined ? {} : { reason: input.reason }),
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.by === undefined ? {} : { by: input.by }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  });
}

/**
 * The gate cell for a decision: the frozen [desk, "pass"|"fail"] tuple,
 * collapsing any non-pass status to fail.
 */
export function decisionGate(decision: NewsEditorialDecision): readonly [predicate: string, object: "pass" | "fail"] {
  const normalized = editorialDecision(decision);
  return Object.freeze([normalized.desk, normalized.status === "pass" ? "pass" : "fail"] as const);
}

/**
 * The news domain's public slugger: lowercases, strips diacritics, and joins
 * the value into a hyphenated atom, returning "item" when empty.
 */
export function newsSlug(value: unknown): string {
  return slug(value);
}

function slug(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function witnessList(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function requireText(value: string, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

// — The enriched claim carrier and the cable (claim.mts, cable.mts). —

export {
  assertClaimStateBundle,
  effectiveClaims,
  correctionClaims,
  withCorrection,
  type AssertedClaim,
  type AssertionForce,
  type ClaimProvenance,
  type ClaimScope,
  type ClaimStateBundle,
  type ClaimTime,
  type EditorialStatus,
} from "./claim.mjs";

export {
  assertNewsCable,
  cableBaseUrl,
  wireBaseUrl,
  routeRequest,
  type CableRouting,
  type WireBinding,
  type NewsCable,
} from "./cable.mjs";

// — The assertion round-trip: writes ↔ assertion trace ↔ claim sets
//   (assertions.mts), the carrier's serialization over relationality charges. —

export {
  toJsonValue,
  write,
  clearGate,
  stableJsonKey,
  traceEntryId,
  assertionFromClaim,
  assertionsFromWrites,
  claimSetsFromTrace,
  type NewsAssertion,
  type NewsAssertionTrace,
  type ClaimAssertionInput,
  type AssertionsFromWritesOptions,
} from "./assertions.mjs";
