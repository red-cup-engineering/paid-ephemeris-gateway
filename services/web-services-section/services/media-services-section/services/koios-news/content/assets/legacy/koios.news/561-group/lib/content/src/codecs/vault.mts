// Markdown-vault conformance codec: the front-matter corpus read as a content
// mill rather than one document at a time. Where ./frontmatter is the codec for
// a single `---`-fenced document, this module is the codec for a *vault* — a
// collection of decoded FrontMatterRecords — and the legibility it computes is
// the corpus's own latent vocabulary structure.
//
// The load-bearing observation, measured over this workspace's ~83k-file
// research archive: one facet — "what genre of thing is this record?" — is
// encoded under three front-matter keys with no stated relation between them.
//
//   - `type`  is the canonical genre key (the overwhelming majority of records).
//   - `kind`  is a non-canonical *variant* of the same facet: it carries the
//             same value vocabulary (theorem, definition, concept, example,
//             reference, morphism, structure, operator…) and appears almost
//             exclusively in records that have no `type` at all. It is `type`
//             under a different name, used in a few subtrees and recent intake.
//   - `class` is a strict *refinement* of `type`: every record that carries a
//             `class` also carries a `type`; `class` names a narrower sub-genre
//             beneath the `type` it rides alongside.
//
// `role` is a DIFFERENT facet (the structural function a node plays — operator,
// structure) confined to other subtrees and essentially disjoint from the genre
// keys; it is NOT folded into the genre scheme here. It only appears as a
// conformance concern, because in places its value has been overwritten with a
// leaked description sentence.
//
// Vocabulary: GenreFacet (the genre resolved for one record), VaultCensus (the
// aggregate value vocabulary plus the type/kind/class crosswalk statistics),
// VaultFinding (one actionable per-record conformance defect), and
// GenreConceptScheme (the facet rendered as a SKOS concept scheme, emittable as
// JSON-LD or Turtle). Morphisms are pure functions over already-decoded records;
// no filesystem, no clock, no network — the caller owns the walk. Codec law
// (L4) holds exactly as it does for ./frontmatter.

import type { FrontMatterRecord } from "./frontmatter.mjs";

// — the genre facet vocabulary —

/** The canonical front-matter key for the genre facet. */
export const GENRE_CANONICAL_KEY = "type" as const;
/** Non-canonical keys that carry the same genre facet as `type`. */
export const GENRE_VARIANT_KEYS: readonly string[] = Object.freeze(["kind"]);
/** The key whose value refines the genre named by `type` (a narrower sub-genre). */
export const GENRE_REFINEMENT_KEY = "class" as const;

/**
 * The front-matter key a genre value was read from: `type` (canonical) or
 * `kind` (variant).
 */
export type GenreSourceKey = "type" | "kind";

/**
 * A disagreeing pair of genre assertions on one record: `type` and a variant
 * key (`kind`) both present with different values.
 */
export type GenreConflict = Readonly<{ type: string; kind: string }>;

/** The genre facet resolved for a single record. `value` is the canonical genre
 *  (from `type` when present, else from a variant key). `variant` marks that the
 *  value was read from a non-canonical key. `conflict` is set when `type` and a
 *  variant key are both present and disagree — the record asserts two genres at
 *  once and the corpus is holding the contradiction silently. */
export type GenreFacet = Readonly<{
  value: string | null;
  sourceKey: GenreSourceKey | null;
  variant: boolean;
  refinement: string | null;
  conflict: GenreConflict | null;
}>;

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Resolve the genre facet of a single decoded record. Pure; total. */
export function genreFacet(record: FrontMatterRecord): GenreFacet {
  const typeValue = firstString(record[GENRE_CANONICAL_KEY]);
  let variantValue: string | null = null;
  let variantKey: GenreSourceKey | null = null;
  for (const key of GENRE_VARIANT_KEYS) {
    const candidate = firstString(record[key]);
    if (candidate !== null) {
      variantValue = candidate;
      variantKey = key as GenreSourceKey;
      break;
    }
  }
  const refinement = firstString(record[GENRE_REFINEMENT_KEY]);
  const conflict =
    typeValue !== null && variantValue !== null && typeValue !== variantValue
      ? Object.freeze({ type: typeValue, kind: variantValue })
      : null;
  if (typeValue !== null) {
    return Object.freeze({
      value: typeValue,
      sourceKey: "type" as const,
      variant: false,
      refinement,
      conflict,
    });
  }
  if (variantValue !== null) {
    return Object.freeze({
      value: variantValue,
      sourceKey: variantKey,
      variant: true,
      refinement,
      conflict: null,
    });
  }
  return Object.freeze({ value: null, sourceKey: null, variant: false, refinement, conflict: null });
}

// — per-record conformance findings —

/**
 * The severity of a vault conformance finding: `error`, `warning`, or `info`.
 */
export type FindingSeverity = "error" | "warning" | "info";

/**
 * The set of conformance rule identifiers a record can violate: genre conflicts
 * and variants, class without type, leaked role descriptions, non-list tags,
 * non-CSL references, and broken internal references.
 */
export type VaultRule =
  | "genre-conflict"
  | "genre-variant-key"
  | "genre-class-without-type"
  | "role-leaked-description"
  | "tags-not-list"
  | "references-non-csl"
  | "broken-internal-reference";

/**
 * One actionable per-record conformance defect: the record `path`, the violated
 * `rule` and its `severity`, a human-readable `message`, and optionally the
 * offending `key`/`value` and a `suggestion` for the fix.
 */
export type VaultFinding = Readonly<{
  path: string;
  rule: VaultRule;
  severity: FindingSeverity;
  message: string;
  key?: string;
  value?: string;
  suggestion?: string;
}>;

/** Heuristic: a `role` value that is really a leaked description sentence rather
 *  than a structural-role token. Genuine role tokens are short single words
 *  (`operator`, `structure`) or namespaced atoms (`:user`); a value carrying
 *  several words, or ending in a sentence-final period, is a copy-paste of the
 *  document's description and has clobbered the facet. */
function looksLikeSentence(value: string): boolean {
  const trimmed = value.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 6) return true;
  if (words.length >= 3 && /[.;:]$/.test(trimmed)) return true;
  if (trimmed.length >= 60) return true;
  return false;
}

/** All conformance findings for one record. Pure; total. The `path` is threaded
 *  through verbatim so findings are addressable; this module never reads it. */
export function conformRecord(path: string, record: FrontMatterRecord): readonly VaultFinding[] {
  const findings: VaultFinding[] = [];
  const genre = genreFacet(record);

  if (genre.conflict !== null) {
    findings.push(
      Object.freeze({
        path,
        rule: "genre-conflict",
        severity: "error",
        message: `genre asserted twice and disagrees: type=${genre.conflict.type}, kind=${genre.conflict.kind}`,
        suggestion: `keep one genre under \`${GENRE_CANONICAL_KEY}\` and drop the other`,
      }),
    );
  } else if (genre.variant && genre.value !== null && genre.sourceKey !== null) {
    findings.push(
      Object.freeze({
        path,
        rule: "genre-variant-key",
        severity: "warning",
        message: `genre carried by non-canonical key \`${genre.sourceKey}\``,
        key: genre.sourceKey,
        value: genre.value,
        suggestion: `rename \`${genre.sourceKey}: ${genre.value}\` to \`${GENRE_CANONICAL_KEY}: ${genre.value}\``,
      }),
    );
  }

  if (genre.refinement !== null && genre.value === null) {
    findings.push(
      Object.freeze({
        path,
        rule: "genre-class-without-type",
        severity: "warning",
        message: `\`${GENRE_REFINEMENT_KEY}\` refines a genre, but no \`${GENRE_CANONICAL_KEY}\`/variant genre is present to refine`,
        key: GENRE_REFINEMENT_KEY,
        value: genre.refinement,
        suggestion: `add a \`${GENRE_CANONICAL_KEY}\` for \`${GENRE_REFINEMENT_KEY}: ${genre.refinement}\` to narrow`,
      }),
    );
  }

  const roleValue = firstString(record["role"]);
  if (roleValue !== null && looksLikeSentence(roleValue)) {
    findings.push(
      Object.freeze({
        path,
        rule: "role-leaked-description",
        severity: "warning",
        message: "`role` holds a description sentence, not a structural-role token",
        key: "role",
        value: roleValue.length > 80 ? `${roleValue.slice(0, 77)}…` : roleValue,
        suggestion: "move the sentence to `description` and set `role` to a single token",
      }),
    );
  }

  const tags = record["tags"];
  if (typeof tags === "string" && tags.trim() !== "") {
    findings.push(
      Object.freeze({
        path,
        rule: "tags-not-list",
        severity: "info",
        message: "`tags` is a bare scalar; the convention is a list",
        key: "tags",
        value: tags,
        suggestion: `write \`tags: [${tags}]\``,
      }),
    );
  }

  return Object.freeze(findings);
}

/** A conformance finding for a record's `references:` dialect. The bespoke
 *  citekey-map form is valid YAML and decodes fine, but it is not CSL/citeproc —
 *  the canonical target — so it is flagged for normalization. Pure; total. The
 *  dialect is computed by the references codec (which needs raw text); this
 *  takes the already-detected dialect string so vault.mts stays record-pure. */
export function referenceConformance(path: string, dialect: string): readonly VaultFinding[] {
  if (dialect !== "citekey-map") return Object.freeze([]);
  return Object.freeze([
    Object.freeze({
      path,
      rule: "references-non-csl" as const,
      severity: "warning" as const,
      message: "`references:` uses the bespoke citekey-map dialect, not CSL/citeproc",
      key: "references",
      suggestion: "normalize to a CSL/citeproc `references:` sequence (deterministic; see /api/references)",
    }),
  ]);
}

// — the vault census —

/**
 * One member of a vault: a record's `path` paired with its already-decoded
 * `frontMatter`.
 */
export type VaultEntry = Readonly<{ path: string; frontMatter: FrontMatterRecord }>;

/** One genre value, counted by the key it was carried under. The same value
 *  appearing under more than one of these columns is the evidence that `type`,
 *  `kind`, and `class` are one facet under three names. */
export type GenreValueRow = Readonly<{
  value: string;
  type: number;
  kind: number;
  class: number;
  total: number;
}>;

/**
 * The type/kind/class crosswalk statistics over a vault: counts of variant-only
 * genres, type/variant agreement and conflict, whether every `class` rides
 * alongside a `type`, and how many `class` records carry no genre at all.
 */
export type VaultCrosswalk = Readonly<{
  /** Records whose genre is carried only by a variant key (no `type`). */
  variantOnly: number;
  /** Records where `type` and a variant key agree. */
  typeAndVariantAgree: number;
  /** Records where `type` and a variant key disagree. */
  typeAndVariantConflict: number;
  /** Whether every record carrying `class` also carries `type`. */
  classAlwaysWithType: boolean;
  /** Records carrying `class` but no `type`/variant genre. */
  classWithoutGenre: number;
}>;

/**
 * The aggregate census of a vault: document count, how many records carry
 * `type`/variant/`class`/any genre, the per-value genre vocabulary counted by
 * carrying key, and the type/kind/class crosswalk.
 */
export type VaultCensus = Readonly<{
  documents: number;
  withType: number;
  withVariant: number;
  withClass: number;
  withGenre: number;
  genreValues: readonly GenreValueRow[];
  crosswalk: VaultCrosswalk;
}>;

type MutableRow = { value: string; type: number; kind: number; class: number; total: number };

/** Aggregate the genre vocabulary and the type/kind/class crosswalk over a
 *  vault. Pure; total; order of `entries` does not affect the result beyond the
 *  deterministic value sort (by total desc, then value asc). */
export function censusVault(entries: readonly VaultEntry[]): VaultCensus {
  const rows = new Map<string, MutableRow>();
  const bump = (value: string, column: "type" | "kind" | "class"): void => {
    const row = rows.get(value) ?? { value, type: 0, kind: 0, class: 0, total: 0 };
    row[column] += 1;
    row.total += 1;
    rows.set(value, row);
  };

  let withType = 0;
  let withVariant = 0;
  let withClass = 0;
  let withGenre = 0;
  let variantOnly = 0;
  let typeAndVariantAgree = 0;
  let typeAndVariantConflict = 0;
  let classAlwaysWithType = true;
  let classWithoutGenre = 0;

  for (const entry of entries) {
    const record = entry.frontMatter;
    const typeValue = firstString(record[GENRE_CANONICAL_KEY]);
    let variantValue: string | null = null;
    for (const key of GENRE_VARIANT_KEYS) {
      variantValue = firstString(record[key]);
      if (variantValue !== null) break;
    }
    const classValue = firstString(record[GENRE_REFINEMENT_KEY]);

    if (typeValue !== null) {
      withType += 1;
      bump(typeValue, "type");
    }
    if (variantValue !== null) {
      withVariant += 1;
      bump(variantValue, "kind");
    }
    if (classValue !== null) {
      withClass += 1;
      bump(classValue, "class");
      if (typeValue === null) classAlwaysWithType = false;
      if (typeValue === null && variantValue === null) classWithoutGenre += 1;
    }
    if (typeValue !== null || variantValue !== null) withGenre += 1;
    if (typeValue === null && variantValue !== null) variantOnly += 1;
    if (typeValue !== null && variantValue !== null) {
      if (typeValue === variantValue) typeAndVariantAgree += 1;
      else typeAndVariantConflict += 1;
    }
  }

  const genreValues = [...rows.values()]
    .sort((left, right) => right.total - left.total || left.value.localeCompare(right.value))
    .map((row) => Object.freeze({ ...row }));

  return Object.freeze({
    documents: entries.length,
    withType,
    withVariant,
    withClass,
    withGenre,
    genreValues: Object.freeze(genreValues),
    crosswalk: Object.freeze({
      variantOnly,
      typeAndVariantAgree,
      typeAndVariantConflict,
      classAlwaysWithType,
      classWithoutGenre,
    }),
  });
}

/** Tally findings by rule and severity for a quick conformance summary. */
export type ConformanceSummary = Readonly<{
  total: number;
  byRule: Readonly<Record<string, number>>;
  bySeverity: Readonly<Record<FindingSeverity, number>>;
}>;

/**
 * Tally a list of findings into counts by rule and by severity plus a grand
 * total. Pure; total.
 */
export function summarizeFindings(findings: readonly VaultFinding[]): ConformanceSummary {
  const byRule: Record<string, number> = {};
  const bySeverity: Record<FindingSeverity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) {
    byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    bySeverity[finding.severity] += 1;
  }
  return Object.freeze({ total: findings.length, byRule: Object.freeze(byRule), bySeverity: Object.freeze(bySeverity) });
}

// — the genre facet as a SKOS concept scheme —

/**
 * One concept in the genre SKOS scheme: the genre `value`, its IRI `slug`, the
 * number of `documents` carrying it, and the front-matter keys (`carriedBy`)
 * observed to carry it.
 */
export type GenreConcept = Readonly<{
  value: string;
  slug: string;
  documents: number;
  carriedBy: readonly GenreSourceKey[] | readonly string[];
}>;

/**
 * The genre facet rendered as a SKOS concept scheme: the IRI `base` stem, the
 * canonical/variant/refinement front-matter keys, and the list of genre
 * `concepts`.
 */
export type GenreConceptScheme = Readonly<{
  base: string;
  canonicalKey: string;
  variantKeys: readonly string[];
  refinementKey: string;
  concepts: readonly GenreConcept[];
}>;

function conceptSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build a SKOS concept scheme for the genre facet from a census. Only values
 *  that appear at least `minDocuments` times become concepts (the long tail of
 *  one-off values is left out of the published vocabulary). `base` is the IRI
 *  stem the scheme and its concepts hang under. Pure; total. */
export function genreConceptScheme(
  census: VaultCensus,
  options: Readonly<{ base?: string; minDocuments?: number }> = {},
): GenreConceptScheme {
  const base = (options.base ?? "/").replace(/\/+$/, "") || "";
  const minDocuments = options.minDocuments ?? 1;
  const seen = new Set<string>();
  const concepts: GenreConcept[] = [];
  for (const row of census.genreValues) {
    if (row.total < minDocuments) continue;
    const slug = conceptSlug(row.value);
    if (slug === "" || seen.has(slug)) continue;
    seen.add(slug);
    const carriedBy: string[] = [];
    if (row.type > 0) carriedBy.push("type");
    if (row.kind > 0) carriedBy.push("kind");
    if (row.class > 0) carriedBy.push("class");
    concepts.push(Object.freeze({ value: row.value, slug, documents: row.total, carriedBy: Object.freeze(carriedBy) }));
  }
  return Object.freeze({
    base,
    canonicalKey: GENRE_CANONICAL_KEY,
    variantKeys: GENRE_VARIANT_KEYS,
    refinementKey: GENRE_REFINEMENT_KEY,
    concepts: Object.freeze(concepts),
  });
}

const SKOS = "http://www.w3.org/2004/02/skos/core#";
const DCT = "http://purl.org/dc/terms/";

function schemeIri(base: string): string {
  return `${base}/vocabulary/genre`;
}
function conceptIri(base: string, slug: string): string {
  return `${base}/vocabulary/genre#${slug}`;
}

function schemeDefinition(scheme: GenreConceptScheme): string {
  return (
    `The genre facet of a vault record — "what kind of thing is this entry?". ` +
    `Carried canonically by the \`${scheme.canonicalKey}\` front-matter key; ` +
    `the variant key(s) ${scheme.variantKeys.map((k) => `\`${k}\``).join(", ")} carry the same facet ` +
    `and should be normalized to \`${scheme.canonicalKey}\`; ` +
    `\`${scheme.refinementKey}\` names a narrower sub-genre beneath the \`${scheme.canonicalKey}\` it accompanies.`
  );
}

/** Emit the genre concept scheme as a SKOS JSON-LD document (a plain object the
 *  caller serializes). Concepts are top concepts of the scheme; each carries a
 *  document count and the front-matter keys observed to carry it. */
export function encodeGenreSchemeJsonLd(scheme: GenreConceptScheme): Readonly<Record<string, unknown>> {
  const schemeId = schemeIri(scheme.base);
  const graph: Record<string, unknown>[] = [
    {
      "@id": schemeId,
      "@type": "skos:ConceptScheme",
      "skos:prefLabel": "Genre",
      "dct:description": schemeDefinition(scheme),
      "561:canonicalKey": scheme.canonicalKey,
      "561:variantKey": scheme.variantKeys,
      "561:refinementKey": scheme.refinementKey,
    },
  ];
  for (const concept of scheme.concepts) {
    graph.push({
      "@id": conceptIri(scheme.base, concept.slug),
      "@type": "skos:Concept",
      "skos:prefLabel": concept.value,
      "skos:inScheme": { "@id": schemeId },
      "skos:topConceptOf": { "@id": schemeId },
      "skos:note": `${concept.documents} document(s); carried by ${concept.carriedBy.join(", ")}`,
      "561:documents": concept.documents,
      "561:carriedBy": concept.carriedBy,
    });
  }
  return Object.freeze({
    "@context": {
      skos: SKOS,
      dct: DCT,
      "561": `${scheme.base}/vocabulary/genre#`,
    },
    "@graph": graph,
  });
}

function turtleString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** Emit the genre concept scheme as Turtle. */
export function encodeGenreSchemeTurtle(scheme: GenreConceptScheme): string {
  const schemeId = schemeIri(scheme.base);
  const lines: string[] = [
    `@prefix skos: <${SKOS}> .`,
    `@prefix dct: <${DCT}> .`,
    `@prefix g: <${scheme.base}/vocabulary/genre#> .`,
    "",
    `<${schemeId}> a skos:ConceptScheme ;`,
    `  skos:prefLabel "Genre" ;`,
    `  dct:description ${turtleString(schemeDefinition(scheme))} ;`,
    `  g:canonicalKey ${turtleString(scheme.canonicalKey)} ;`,
    `  g:refinementKey ${turtleString(scheme.refinementKey)}${scheme.variantKeys.length > 0 ? " ;" : " ."}`,
  ];
  scheme.variantKeys.forEach((key, index) => {
    lines.push(`  g:variantKey ${turtleString(key)}${index === scheme.variantKeys.length - 1 ? " ." : " ;"}`);
  });
  lines.push("");
  for (const concept of scheme.concepts) {
    lines.push(
      `<${conceptIri(scheme.base, concept.slug)}> a skos:Concept ;`,
      `  skos:prefLabel ${turtleString(concept.value)} ;`,
      `  skos:inScheme <${schemeId}> ;`,
      `  skos:topConceptOf <${schemeId}> ;`,
      `  g:documents ${concept.documents} ;`,
      `  g:carriedBy ${concept.carriedBy.map((k) => turtleString(k)).join(", ")} ;`,
      `  skos:note ${turtleString(`${concept.documents} document(s); carried by ${concept.carriedBy.join(", ")}`)} .`,
      "",
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
