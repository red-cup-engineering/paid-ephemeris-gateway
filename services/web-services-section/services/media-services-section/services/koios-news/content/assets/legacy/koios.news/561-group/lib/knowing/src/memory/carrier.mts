/**
 * memory/carrier — the agent's memory as a directed-relational carrier, DERIVED
 * from upstream, not reimplemented.
 *
 * Memory is the settled, accumulated body of knowledge an agent holds: the
 * codomain of learning, accumulated along the knowledge order. knowing reads it
 * as a memorystore carrier; downstream packages own concrete filepath admission.
 *
 * It depends on no package but `@emsenn/relating`: document parsing
 * comes from relating's markdown codec (`parseMarkdown`), and settlement from
 * `induceRelation` + `relateRelations`. The genre, frontmatter-legibility
 * conformance, and internal-reference helpers are ported into knowing (below) — the
 * capability lives here. knowing writes no settlement engine.
 *
 * Memory is settled by directed relational research: each document's
 * (path → claim) relation is induced to its own SettlementFiltration and the
 * relations are folded into one settled topology, whose closure regime is the
 * memory's certification (relating-experimental has no `settleUtterances` shortcut).
 */
import {
  cell,
  claim,
  cohomologyLaplacianOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  mark,
  predicateOfClaim,
  token,
  utterance,
  induceRelation,
  relateRelations,
  freeSettlementFiltration,
  readClassificationOfSettlementFiltration,
  type Cell,
  type JsonRecord,
  type JsonValue as RelatingJsonValue,
  type UtteranceCarrier,
  type SettlementFiltrationGenerators,
} from "@emsenn/relating";
import { markdown, type JsonValue } from "@emsenn/relating/writing";
import type { Resource } from "@emsenn/relating/writing/projector";

// The memory readings are interface-first derived producers for now; their generated
// schema mirrors were retired in the FromSchema migration. The spine carriers — term,
// fact, typing, proof — are the EAVT-over-predication grain memory holds: facts
// (charged cells) about terms (entities), typed (predicate/sort), certified by proofs
// (the settling derivation).

// ── conformance vocabulary, ported into knowing (no @emsenn/content dependency) ──
// knowing reads markdown frontmatter through relating's markdown codec and applies
// its own legibility conformance, genre, and internal-reference helpers — the
// capability lives here, depending on no package but @emsenn/relating.

/** A frontmatter record: relating's markdown codec frontmatter shape. */
type FrontMatterRecord = Readonly<Record<string, JsonValue>>;

/** A document's genre: a single classifying facet, or null when unstated. */
interface GenreFacet {
  readonly value: string | null;
}

/** One conformance finding against a document's frontmatter legibility. */
interface MemoryFinding {
  readonly path: string;
  readonly rule: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
}

/** A folded conformance summary: finding counts by severity. */
interface ConformanceSummary {
  readonly total: number;
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}

/** The document's genre facet: its `genre`, else `type`, else null (a projection of the decoded frontmatter). */
function genreFacet(frontMatter: FrontMatterRecord): GenreFacet {
  const genre = frontMatter["genre"] ?? frontMatter["type"];
  return Object.freeze({ value: typeof genre === "string" && genre.trim() !== "" ? genre.trim() : null });
}

/**
 * Read a document's conformance findings from relating's markdown codec verdict —
 * the codec's `frontmatterConformance`, not a hand-rolled title check. A failed MUST
 * (non-conformant frontmatter) is an error; each SHOULD note is a warning; a missing
 * frontmatter title is the one knowing-specific legibility warning.
 */
function conformanceFindings(path: string, verdict: markdown.FrontmatterConformance, frontMatter: FrontMatterRecord): readonly MemoryFinding[] {
  const findings: MemoryFinding[] = [];
  if (!verdict.conformant) findings.push(Object.freeze({ path, rule: "non-conformant-frontmatter", severity: "error" as const, message: "frontmatter does not satisfy a MUST (codec verdict)" }));
  for (const note of verdict.notes) findings.push(Object.freeze({ path, rule: "frontmatter-should", severity: "warning" as const, message: note }));
  const title = frontMatter["title"];
  if (!(typeof title === "string" && title.trim() !== "")) findings.push(Object.freeze({ path, rule: "missing-title", severity: "warning" as const, message: "document has no frontmatter title" }));
  return Object.freeze(findings);
}

/** Fold findings into a conformance summary by severity. */
function summarizeFindings(findings: readonly MemoryFinding[]): ConformanceSummary {
  return Object.freeze({
    total: findings.length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  });
}

/** Slugify a reference value for memorystore addressing. */
function referenceSlug(value: string): string {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

/** The internal references a document's frontmatter asserts: the string (or array)
 *  values of its reference-bearing fields. */
function internalReferenceTargets(frontMatter: FrontMatterRecord): readonly { readonly field: string; readonly value: string }[] {
  const fields = ["aliases", "related", "references", "see-also", "links"];
  const targets: { readonly field: string; readonly value: string }[] = [];
  for (const field of fields) {
    const value = frontMatter[field];
    if (typeof value === "string" && value.trim() !== "") targets.push(Object.freeze({ field, value }));
    else if (Array.isArray(value)) for (const item of value) if (typeof item === "string" && item.trim() !== "") targets.push(Object.freeze({ field, value: item }));
  }
  return Object.freeze(targets);
}

// ── the spine grains: term / fact / typing (the EAVT-over-predication of memory) ──
// Each is mirrored by a schema (`knowing/memory/{term,fact,typing}`); the interfaces
// here are the producers. A FACT is a charged predication cell (subject·predicate·
// object + standing over FOUR) — the truth-bearer; a TERM is the entity a fact is
// about (not a truth-bearer); a TYPING assigns a term the predicate-type it inhabits.

/** A fact: a charged predication cell admitted from a document (the truth-bearer). */
export interface MemoryFact {
  readonly kind: "knowing.memory.fact";
  readonly subject: string;
  readonly predicate: string;
  readonly object: JsonValue;
  /** the charge standing over FOUR (codec-admitted facts carry positive witness → potential). */
  readonly standing: "potential" | "active" | "stable" | "absurd";
}

/** A typing: a term inhabits a predicate-type (the predication's predicate/sort). */
export interface MemoryTyping {
  readonly kind: "knowing.memory.typing";
  readonly term: string;
  readonly predicate: string;
}

export interface MemoryDocument {
  readonly kind: "knowing.memory.document";
  /** the TERM: the entity (the codec's document subject) the facts are about. */
  readonly term: string;
  readonly path: string;
  readonly hadFrontMatter: boolean;
  readonly frontMatter: FrontMatterRecord;
  readonly body: string;
  readonly genre: GenreFacet;
  readonly findings: readonly MemoryFinding[];
  /** the FACTS this document admits: the charged predication cells the codec derived. */
  readonly facts: readonly MemoryFact[];
  /** the TYPINGS: the predicate-types the term inhabits (the distinct fact predicates). */
  readonly typings: readonly MemoryTyping[];
  readonly utterances: readonly UtteranceCarrier[];
}

export interface MemoryCarrier {
  readonly kind: "knowing.memory";
  readonly root: string;
  readonly documents: readonly MemoryDocument[];
  readonly utterances: readonly UtteranceCarrier[];
}

/** The standing name of a codec charge value `[positive, negative]` over FOUR. */
function standingOf(value: readonly [boolean, boolean]): MemoryFact["standing"] {
  const [positive, negative] = value;
  if (positive && negative) return "stable";
  if (positive) return "potential";
  if (negative) return "active";
  return "absurd";
}

/**
 * Admit one memorystore resource as a memory document, decoding it through relating's
 * markdown codec (`markdownDataform`). The codec read gives the document's TERM (its
 * subject), its FACTS (the charged predication cells), its TYPINGS (the predicates
 * those facts assert), and the conformance verdict — never a hand-rolled parse.
 */
export function admitDocument(root: string, resource: Resource): MemoryDocument {
  const term = `knowing.memory.document.${root}:${resource.path}`;
  let dataform: markdown.MarkdownDataform;
  try {
    dataform = markdown.markdownDataform(resource.content, { witness: term });
  } catch (cause) {
    // A resource the codec cannot decode (malformed frontmatter) is admitted as a
    // fact-less document carrying a broken-frontmatter finding — never an abort of the
    // whole memory. The codec is the law; this records its refusal as an active fact.
    const message = cause instanceof Error ? cause.message : String(cause);
    return Object.freeze({
      kind: "knowing.memory.document" as const,
      term,
      path: resource.path,
      hadFrontMatter: true,
      frontMatter: Object.freeze({}),
      body: resource.content,
      genre: Object.freeze({ value: null }),
      findings: Object.freeze([Object.freeze({ path: resource.path, rule: "broken-frontmatter", severity: "error" as const, message: `frontmatter could not be decoded: ${message}` })]),
      facts: Object.freeze([]),
      typings: Object.freeze([]),
      utterances: Object.freeze([]),
    });
  }
  const frontMatter = dataform.frontmatter;
  const body = dataform.body;
  const hadFrontMatter = dataform.format !== null;
  const genre = genreFacet(frontMatter);
  const findings = conformanceFindings(resource.path, dataform.verdict, frontMatter);
  const facts: readonly MemoryFact[] = Object.freeze(dataform.cells.map((c) => Object.freeze({
    kind: "knowing.memory.fact" as const,
    subject: c.cell.subject,
    predicate: c.cell.predicate,
    object: c.cell.object,
    standing: standingOf(c.charge.value),
  })));
  const seenPredicates = new Set<string>();
  const typings: MemoryTyping[] = [];
  for (const f of facts) {
    if (seenPredicates.has(f.predicate)) continue;
    seenPredicates.add(f.predicate);
    typings.push(Object.freeze({ kind: "knowing.memory.typing" as const, term, predicate: f.predicate }));
  }
  const utterances: readonly UtteranceCarrier[] = Object.freeze(
    facts.map((f) => utterance(mark({ subject: f.subject, object: f.object }), mark(f.predicate))),
  );
  return Object.freeze({
    kind: "knowing.memory.document" as const,
    term,
    path: resource.path,
    hadFrontMatter,
    frontMatter,
    body,
    genre,
    findings,
    facts,
    typings: Object.freeze(typings),
    utterances,
  });
}

/** Admit a finite memory from already-gathered memorystore resources (callers own discovery). */
export function admitMemory(root: string, resources: readonly Resource[]): MemoryCarrier {
  const admitted = resources.map((resource) => admitDocument(root, resource));
  return Object.freeze({
    kind: "knowing.memory" as const,
    root,
    documents: Object.freeze(admitted),
    utterances: Object.freeze(admitted.flatMap((document) => document.utterances)),
  });
}

/**
 * A PROOF: the settling derivation that certifies memory's facts — the closure of
 * directed relational research over the held facts-about-terms. This is the shared
 * carrier the spine turns on: DRR (`research`/`settle-memory`) BUILDS it; neuro-
 * reflexivity (`reflect`/`ruminate`/`gauge`) READS its convergence. Its regime is
 * relating-experimental's closure-regime witness; `certified`/`onShell` is whether
 * the orbit settles (converges, `reflect`) rather than ruminates (aperiodic).
 */
export interface MemoryProof {
  readonly kind: "knowing.memory.proof";
  readonly documents: number;
  readonly facts: number;
  readonly relationsFolded: number;
  /** the closure-regime kind of the folded settlement (relating-experimental's witness). */
  readonly regime: string | null;
  /** on-shell idempotence reached — a stabilizing (non-aperiodic, convergent) regime. */
  readonly onShell: boolean;
  /** alias of onShell: whether the proof settles (the ≤_k orbit converges). */
  readonly certified: boolean;
}

function claimOf(document: MemoryDocument): string {
  const title = document.frontMatter["title"];
  if (typeof title === "string" && title.trim() !== "") return title;
  const line = document.body.split("\n").map((l) => l.trim()).find((l) => l !== "" && !l.startsWith("#"));
  return line ?? document.path;
}

/**
 * Fold memory into one settled topology by directed relational research: induce
 * each document's (path → claim) relation and relate them. The raw
 * SettlementFiltration — the carrier downstream agency morphisms (becoming →
 * doing → learning) admit. Null only for empty memory.
 */
export function settleMemoryFiltration(memory: MemoryCarrier): SettlementFiltrationGenerators | null {
  let folded: SettlementFiltrationGenerators | null = null;
  for (const document of memory.documents) {
    const relation = induceRelation(utterance(mark(document.path), mark(claimOf(document))));
    folded = folded === null ? relation : relateRelations(folded, relation);
  }
  return folded;
}

/**
 * settle-memory: build the PROOF — settle the held facts-about-terms by directed
 * relational research and read the folded derivation's regime + convergence. This is
 * the proof the neuroreflexivity readings (reflect/ruminate/gauge) judge for settling.
 */
export function settleMemory(memory: MemoryCarrier): MemoryProof {
  const folded = settleMemoryFiltration(memory);
  const regime = folded === null ? null : readClassificationOfSettlementFiltration(freeSettlementFiltration(folded)).regime.kind;
  const onShell = regime !== null && regime !== "ordinal.closure.regime.aperiodic";
  return Object.freeze({
    kind: "knowing.memory.proof" as const,
    documents: memory.documents.length,
    facts: memory.documents.reduce((n, d) => n + d.facts.length, 0),
    relationsFolded: memory.documents.length,
    regime,
    onShell,
    certified: onShell,
  });
}

export interface MemoryHealth {
  readonly kind: "knowing.memory.health";
  readonly documents: number;
  readonly withFrontMatter: number;
  readonly withTitle: number;
  readonly conformance: ConformanceSummary;
}

export interface MemoryObservation {
  readonly kind: "knowing.memory.observation";
  readonly documents: number;
  /** signs presented to the game (frontmatter/genre/findings as labeled outcomes). */
  readonly signs: number;
  /** Player commitments — ordinary memory signs (frontmatter, genre). */
  readonly commitments: number;
  /** Opponent challenges — conformance findings (the active signs). */
  readonly challenges: number;
  /** polarized arena events produced by computing's observation map. */
  readonly events: number;
}

/**
 * Observe memory as a polarized arena of signs.
 *
 * Each memory sign is a labeled finite outcome: ordinary signs (path, frontmatter
 * keys, genre) are Player commitments (`potential`); conformance findings are
 * Opponent challenges (`active`). Each labeled sign is one arena event — the
 * polarized observation map over knowing's memory. The fuller concurrent-game arena
 * (move trees, strategies) is playing's domain; this records the polarization on the
 * bilattice charge directly, depending on no package but @emsenn/relating.
 */
export function observeMemory(memory: MemoryCarrier): MemoryObservation {
  const inputs: { readonly id: string; readonly charge: "active" | "potential"; readonly predicate: string; readonly object: string }[] = [];
  for (const document of memory.documents) {
    inputs.push({ id: `${document.term}:path`, charge: "potential", predicate: "knowing.memory.sign.path", object: document.path });
    for (const key of Object.keys(document.frontMatter)) {
      inputs.push({ id: `${document.term}:fm:${key}`, charge: "potential", predicate: "knowing.memory.sign.frontmatter", object: key });
    }
    if (document.genre.value !== null) {
      inputs.push({ id: `${document.term}:genre`, charge: "potential", predicate: "knowing.memory.sign.genre", object: String(document.genre.value) });
    }
    for (const finding of document.findings) {
      inputs.push({ id: `${document.term}:finding:${finding.rule}`, charge: "active", predicate: "knowing.memory.sign.finding", object: finding.rule });
    }
  }
  return Object.freeze({
    kind: "knowing.memory.observation" as const,
    documents: memory.documents.length,
    signs: inputs.length,
    commitments: inputs.filter((i) => i.charge === "potential").length,
    challenges: inputs.filter((i) => i.charge === "active").length,
    // each polarized sign is one arena event (the move-tree arena itself is playing's domain).
    events: inputs.length,
  });
}

/** Slugify a topic the way the research server does — lowercase alnum runs joined by `-`. */
function slugifyTopic(value: string): string {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

export type TopicRole = "concept-home" | "exact-title" | "path-match" | "supporting";

export interface TopicDocumentInspection {
  readonly path: string;
  readonly title: string;
  readonly role: TopicRole;
}

export interface MemoryTopicInspection {
  readonly kind: "knowing.memory.topic-inspection";
  readonly topic: string;
  readonly slug: string;
  readonly documentsInspected: number;
  readonly conceptHomes: readonly string[];
  readonly exactTitleMatches: readonly string[];
  readonly pathMatches: readonly string[];
  readonly supporting: number;
  readonly gaps: readonly string[];
}

/**
 * Inspect a topic across memory — DERIVED reading, faithful to the research
 * server's role classification. Each document is a concept-home (title or
 * basename slug matches the topic, outside an archive), an exact-title match, a
 * path match, or merely supporting. The gaps name what is missing for the topic
 * to have a settled home.
 */
export function inspectMemoryTopic(memory: MemoryCarrier, topic: string): MemoryTopicInspection {
  const slug = slugifyTopic(topic);
  const conceptHomes: string[] = [];
  const exactTitleMatches: string[] = [];
  const pathMatches: string[] = [];
  let supporting = 0;
  let unreadable = 0;
  for (const document of memory.documents) {
    const titleValue = document.frontMatter["title"];
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    const extensionless = document.path.replace(/\.[^.]+$/, "");
    const basename = extensionless.split("/").at(-1) ?? "";
    const titleExact = title !== "" && slugifyTopic(title) === slug;
    const basenameExact = slugifyTopic(basename) === slug;
    const pathContainsTopic = slug.length > 0 && slugifyTopic(extensionless).includes(slug);
    if (document.findings.some((f) => f.rule === "broken-internal-reference" && f.severity === "error")) unreadable += 1;
    if ((titleExact || basenameExact) && !document.path.includes("/archive/")) conceptHomes.push(document.path);
    else if (titleExact) exactTitleMatches.push(document.path);
    else if (pathContainsTopic) pathMatches.push(document.path);
    else supporting += 1;
  }
  const gaps: string[] = [
    ...(conceptHomes.length === 0 ? ["no concept-home document for this topic in the inspected region"] : []),
    ...(exactTitleMatches.length === 0 && conceptHomes.length === 0 ? ["no exact-title match in the inspected region"] : []),
    ...(pathMatches.length === 0 && conceptHomes.length === 0 ? ["no path match in the inspected region"] : []),
    ...(unreadable > 0 ? [`${unreadable} inspected document(s) have unreadable frontmatter`] : []),
  ];
  return Object.freeze({
    kind: "knowing.memory.topic-inspection" as const,
    topic,
    slug,
    documentsInspected: memory.documents.length,
    conceptHomes: Object.freeze(conceptHomes),
    exactTitleMatches: Object.freeze(exactTitleMatches),
    pathMatches: Object.freeze(pathMatches),
    supporting,
    gaps: Object.freeze(gaps),
  });
}

/** Read memory's health — frontmatter legibility via knowing's conformance summary. */
export function inspectMemoryHealth(memory: MemoryCarrier): MemoryHealth {
  let withFrontMatter = 0;
  let withTitle = 0;
  const allFindings: MemoryFinding[] = [];
  for (const document of memory.documents) {
    if (document.hadFrontMatter) withFrontMatter += 1;
    const title = document.frontMatter["title"];
    if (typeof title === "string" && title.trim() !== "") withTitle += 1;
    allFindings.push(...document.findings);
  }
  return Object.freeze({
    kind: "knowing.memory.health" as const,
    documents: memory.documents.length,
    withFrontMatter,
    withTitle,
    conformance: summarizeFindings(allFindings),
  });
}

export interface ConceptEdge {
  readonly from: string;
  readonly to: string;
  readonly field: string;
}

export interface MemoryConceptMap {
  readonly kind: "knowing.memory.concept-map";
  readonly topic: string;
  readonly slug: string;
  /** the documents matching the topic (concept-homes, title/path matches) — the map's nodes. */
  readonly nodes: readonly string[];
  readonly edgeCount: number;
  /** the internal cross-references the matched documents assert (bounded sample). */
  readonly edges: readonly ConceptEdge[];
  /** normalized finite cohomology receipt for the concept-reference graph. */
  readonly cohomology: JsonRecord;
}

function conceptEdgeCell(edge: ConceptEdge): Cell {
  return cell(token(mark(edge.from)), predicateOfClaim(claim(mark(edge.field))), token(mark(edge.to)));
}

function conceptMapCohomologyReceipt(nodes: number, edges: readonly ConceptEdge[]): JsonRecord {
  const cells = edges.map(conceptEdgeCell);
  const laplacian = cohomologyLaplacianOfCells(cells);
  return Object.freeze({
    kind: "knowing.memory.concept-map.cohomology" as const,
    nodes,
    edges: edges.length,
    h0: laplacian.cohomology.zeroCohomology.rank.members.length,
    h1: laplacian.cohomology.firstCohomology.rank.members.length,
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, laplacian.cohomology.firstCohomology.vanishing as unknown as RelatingJsonValue),
    laplacian: evaluateRunTerm(cohomologyTerms.laplacian, laplacian as unknown as RelatingJsonValue),
  }) as JsonRecord;
}

/**
 * Map the concepts around a topic — DERIVED. The nodes are the documents matching
 * the topic (via topic inspection); the edges are the internal cross-references
 * those documents assert in their frontmatter, extracted by
 * knowing's `internalReferenceTargets` (ported) and resolved to slugs by
 * `referenceSlug`. The directed-relation neighborhood of a concept.
 */
export function conceptMapMemory(memory: MemoryCarrier, topic: string): MemoryConceptMap {
  const inspection = inspectMemoryTopic(memory, topic);
  const matched = new Set<string>([...inspection.conceptHomes, ...inspection.exactTitleMatches, ...inspection.pathMatches]);
  const nodes: string[] = [];
  const edges: ConceptEdge[] = [];
  for (const document of memory.documents) {
    if (!matched.has(document.path)) continue;
    const fromSlug = document.path.replace(/\.[^.]+$/, "").split("/").at(-1) ?? document.path;
    nodes.push(document.path);
    for (const target of internalReferenceTargets(document.frontMatter)) {
      edges.push(Object.freeze({ from: fromSlug, to: referenceSlug(target.value), field: target.field }));
    }
  }
  return Object.freeze({
    kind: "knowing.memory.concept-map" as const,
    topic: inspection.topic,
    slug: inspection.slug,
    nodes: Object.freeze(nodes),
    edgeCount: edges.length,
    edges: Object.freeze(edges.slice(0, 100)),
    cohomology: conceptMapCohomologyReceipt(nodes.length, edges),
  });
}

export type GapStatus = "settled" | "partial" | "gap";

export interface GapAxis {
  readonly axis: "coverage" | "frontmatter-legibility";
  readonly status: GapStatus;
}

export interface MemoryGap {
  readonly kind: "knowing.memory.gap";
  readonly topic: string;
  readonly slug: string;
  readonly documentsInspected: number;
  readonly axes: readonly GapAxis[];
  readonly conceptHomes: number;
  readonly gaps: readonly string[];
  readonly conformance: ConformanceSummary;
}

/**
 * Measure the gap for a topic across memory — DERIVED by composing the topic
 * inspection and the conformance health into graded axes. Coverage is settled
 * when a concept-home exists, partial when only path-matches do, a gap otherwise;
 * frontmatter-legibility grades how much of the region carries usable titles.
 */
export function measureMemoryGap(memory: MemoryCarrier, topic: string): MemoryGap {
  const inspection = inspectMemoryTopic(memory, topic);
  const health = inspectMemoryHealth(memory);
  const coverage: GapStatus = inspection.conceptHomes.length > 0 ? "settled" : inspection.pathMatches.length > 0 ? "partial" : "gap";
  const legibility: GapStatus = health.documents > 0 && health.withTitle === health.documents ? "settled" : health.withTitle > 0 ? "partial" : "gap";
  return Object.freeze({
    kind: "knowing.memory.gap" as const,
    topic: inspection.topic,
    slug: inspection.slug,
    documentsInspected: inspection.documentsInspected,
    axes: Object.freeze([
      Object.freeze({ axis: "coverage" as const, status: coverage }),
      Object.freeze({ axis: "frontmatter-legibility" as const, status: legibility }),
    ]),
    conceptHomes: inspection.conceptHomes.length,
    gaps: inspection.gaps,
    conformance: health.conformance,
  });
}
