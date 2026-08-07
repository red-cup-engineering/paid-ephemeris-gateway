// publishing/managing/circulating/corrections — public correction records.
//
// Corrections are article metadata after publication: they are not intake
// sources and not citation references. This module is the one parser/folder for
// correction, clarification, material update, and retraction records.

import type { FrontMatterRecord } from "@emsenn/content/codecs/frontmatter";

import type { KoiosPost } from "../../../../../../content.mjs";
import type { KoiosItem } from "../../../../../../surface.mjs";

export type CorrectionKind = "correction" | "clarification" | "update" | "retraction";

export type CorrectionRecord = Readonly<{
  id: string;
  kind: CorrectionKind;
  articleSlug: string;
  articlePath: string;
  articleHeadline: string;
  correctedAt: string;
  summary: string;
  details?: string;
  affectedSurfaces: readonly string[];
}>;

export type CorrectionRegisterReading = Readonly<{
  department: "publishing.managing.circulating.corrections";
  correctionCount: number;
  articleCount: number;
  policy: readonly string[];
  corrections: readonly CorrectionRecord[];
  constraints: readonly string[];
}>;

export type CorrectionValidationFinding = Readonly<{
  code: string;
  message: string;
}>;

export type CorrectionCoverageReading = Readonly<{
  correctionCount: number;
  explicitSurfaceCount: number;
  implicitSurfaceCount: number;
  incompleteSurfaceCount: number;
  missingSurfaces: readonly string[];
  coverage: number;
}>;

export const DEFAULT_CORRECTION_AFFECTED_SURFACES = Object.freeze([
  "article",
  "feeds",
  "sitemaps",
  "json-ld",
  "social-card",
  "syndication",
]);

export const CORRECTION_POLICY = Object.freeze([
  "Corrections, clarifications, material updates, and retractions belong to the article record and are folded into this public register.",
  "A correction must state what changed, when it was corrected, and which publication surfaces require propagation.",
  "Correction propagation must include body copy, headlines when needed, article metadata, social cards, feeds, sitemaps, JSON-LD, and syndication packets.",
]);

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function koiosFrontMatter(frontMatter: FrontMatterRecord): Readonly<Record<string, unknown>> {
  return record(frontMatter["koios"]);
}

function correctionKind(value: unknown): CorrectionKind | undefined {
  return value === "correction" || value === "clarification" || value === "update" || value === "retraction"
    ? value
    : undefined;
}

function correctionEntries(frontMatter: FrontMatterRecord): readonly Readonly<Record<string, unknown>>[] {
  const direct = frontMatter["corrections"];
  const namespaced = koiosFrontMatter(frontMatter)["corrections"];
  const entries = Array.isArray(direct) ? direct : Array.isArray(namespaced) ? namespaced : [];
  return Object.freeze(entries.flatMap((entry) =>
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? [entry as Readonly<Record<string, unknown>>]
      : []));
}

function malformedCorrectionEntries(frontMatter: FrontMatterRecord): number {
  const direct = frontMatter["corrections"];
  const namespaced = koiosFrontMatter(frontMatter)["corrections"];
  const entries = Array.isArray(direct) ? direct : Array.isArray(namespaced) ? namespaced : [];
  return entries.filter((entry) => entry === null || typeof entry !== "object" || Array.isArray(entry)).length;
}

function itemPath(item: KoiosItem): string {
  try {
    return new URL(item.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return `/${item.slug}`.replace(/\/+$/, "");
  }
}

function correctionSurfaceCoverage(frontMatter: FrontMatterRecord): CorrectionCoverageReading {
  const missing = new Set<string>();
  let correctionCount = 0;
  let explicitSurfaceCount = 0;
  let implicitSurfaceCount = 0;
  let incompleteSurfaceCount = 0;
  for (const entry of correctionEntries(frontMatter)) {
    const correctedAt = maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]);
    const summary = maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]);
    if (correctedAt === undefined || summary === undefined) continue;
    correctionCount += 1;
    const affectedSurfaces = strings(entry["affected_surfaces"] ?? entry["affectedSurfaces"]);
    if (affectedSurfaces.length === 0) {
      implicitSurfaceCount += 1;
      continue;
    }
    explicitSurfaceCount += 1;
    const normalized = new Set(affectedSurfaces.map((surface) => surface.toLowerCase()));
    const missingForEntry = DEFAULT_CORRECTION_AFFECTED_SURFACES.filter((surface) => !normalized.has(surface));
    if (missingForEntry.length > 0) incompleteSurfaceCount += 1;
    for (const surface of missingForEntry) missing.add(surface);
  }
  return Object.freeze({
    correctionCount,
    explicitSurfaceCount,
    implicitSurfaceCount,
    incompleteSurfaceCount,
    missingSurfaces: Object.freeze([...missing].sort()),
    coverage: correctionCount === 0 ? 1 : Math.round(((correctionCount - incompleteSurfaceCount) / correctionCount) * 100) / 100,
  });
}

export function correctionRecordsForArticle(input: Readonly<{
  frontMatter: FrontMatterRecord;
  slug: string;
  articlePath: string;
  articleHeadline: string;
}>): readonly CorrectionRecord[] {
  return Object.freeze(correctionEntries(input.frontMatter).flatMap((entry, index) => {
    const correctedAt = maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]);
    const summary = maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]);
    if (correctedAt === undefined || summary === undefined) return [];
    const affectedSurfaces = strings(entry["affected_surfaces"] ?? entry["affectedSurfaces"]);
    const details = maybeString(entry["details"] ?? entry["body"]);
    return [Object.freeze({
      id: maybeString(entry["id"]) ?? `${input.slug}-correction-${index + 1}`,
      kind: correctionKind(entry["kind"] ?? entry["type"]) ?? "correction",
      articleSlug: input.slug,
      articlePath: input.articlePath,
      articleHeadline: input.articleHeadline,
      correctedAt,
      summary,
      ...(details === undefined ? {} : { details }),
      affectedSurfaces: affectedSurfaces.length === 0 ? DEFAULT_CORRECTION_AFFECTED_SURFACES : affectedSurfaces,
    })];
  }));
}

export function correctionCoverageForFrontMatter(frontMatter: FrontMatterRecord): CorrectionCoverageReading {
  return correctionSurfaceCoverage(frontMatter);
}

export function correctionRecordsForPost(post: KoiosPost, item: KoiosItem): readonly CorrectionRecord[] {
  return correctionRecordsForArticle({
    frontMatter: post.document.frontMatter,
    slug: post.slug,
    articlePath: itemPath(item),
    articleHeadline: item.headline,
  });
}

export function correctionValidationFindings(frontMatter: FrontMatterRecord): readonly CorrectionValidationFinding[] {
  const findings: CorrectionValidationFinding[] = [];
  const hasDirect = "corrections" in frontMatter;
  const hasNamespaced = "corrections" in koiosFrontMatter(frontMatter);
  if (hasDirect && hasNamespaced) {
    findings.push(Object.freeze({
      code: "duplicate-correction-fields",
      message: "Use one corrections field: top-level corrections or koios.corrections, not both.",
    }));
  }
  const declared = hasDirect ? frontMatter["corrections"] : koiosFrontMatter(frontMatter)["corrections"];
  if (declared !== undefined && !Array.isArray(declared)) {
    findings.push(Object.freeze({
      code: "invalid-corrections-field",
      message: "corrections must be an array of correction records.",
    }));
    return Object.freeze(findings);
  }
  if (malformedCorrectionEntries(frontMatter) > 0) {
    findings.push(Object.freeze({
      code: "invalid-correction-record",
      message: "Each correction record must be an object.",
    }));
  }
  for (const [index, entry] of correctionEntries(frontMatter).entries()) {
    if (correctionKind(entry["kind"] ?? entry["type"]) === undefined && (entry["kind"] !== undefined || entry["type"] !== undefined)) {
      findings.push(Object.freeze({
        code: "invalid-correction-kind",
        message: `corrections[${index}] kind must be correction, clarification, update, or retraction.`,
      }));
    }
    if (maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]) === undefined) {
      findings.push(Object.freeze({
        code: "missing-correction-date",
        message: `corrections[${index}] needs corrected_at, correctedAt, or date.`,
      }));
    }
    if (maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]) === undefined) {
      findings.push(Object.freeze({
        code: "missing-correction-summary",
        message: `corrections[${index}] needs summary, note, or title.`,
      }));
    }
  }
  return Object.freeze(findings);
}

export function correctionRegisterReading(input: Readonly<{
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): CorrectionRegisterReading {
  const postsBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const corrections = input.items
    .filter((item) => item.isPublic)
    .flatMap((item): CorrectionRecord[] => {
      const post = postsBySlug.get(item.slug);
      return post === undefined ? [] : [...correctionRecordsForPost(post, item)];
    })
    .sort((left, right) => right.correctedAt.localeCompare(left.correctedAt) || left.articleHeadline.localeCompare(right.articleHeadline));
  return Object.freeze({
    department: "publishing.managing.circulating.corrections",
    correctionCount: corrections.length,
    articleCount: new Set(corrections.map((correction) => correction.articleSlug)).size,
    policy: CORRECTION_POLICY,
    corrections: Object.freeze(corrections),
    constraints: Object.freeze([
      "Generated from public article frontmatter only.",
      "The register records publication accountability, not reader behavior.",
      "Empty register means no article currently declares a correction record; it is not proof that no future correction will be needed.",
    ]),
  });
}
