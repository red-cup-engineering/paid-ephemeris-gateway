// researching/writing/editing/standards — manuscript review and gated publish.
//
// Publication is a transition out of editing, not a filesystem convenience.
// A manuscript can only be published here after explicit standards findings
// show no blocking errors.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { decodeFrontMatterDocument, encodeFrontMatterDocument, type FrontMatterDocument, type FrontMatterRecord } from "@emsenn/content/codecs/frontmatter";

import { citedReferenceIds, referencesFromFrontMatter } from "../../sourcing/bibliography.mjs";
import { normalizeCslReferenceRecords, referencesFromSourceUrls } from "../../sourcing/reference-normalization.mjs";
import { correctionValidationFindings } from "./publishing/managing/circulating/corrections.mjs";

export type StandardsSeverity = "error" | "warning";

export type StandardsFinding = Readonly<{
  severity: StandardsSeverity;
  gate: "reported" | "fact-checked" | "copy-edited" | "standards-cleared" | "published";
  code: string;
  message: string;
}>;

export type StandardsReview = Readonly<{
  kind: "koios.editing.standards-review";
  slug: string;
  path: string;
  publishable: boolean;
  draft: boolean;
  wordCount: number;
  referenceCount: number;
  seoTerm?: string;
  findings: readonly StandardsFinding[];
}>;

export type PublishManuscriptResult = Readonly<{
  kind: "koios.publishing.manuscript.published";
  slug: string;
  path: string;
  draft: false;
  review: StandardsReview;
}>;

export type ApplyStandardsDefaultsResult = Readonly<{
  kind: "koios.editing.standards-defaults.applied";
  slug: string;
  path: string;
  changed: readonly string[];
  review: StandardsReview;
}>;

export type NormalizeManuscriptReferencesResult = Readonly<{
  kind: "koios.editing.references.normalized";
  slug: string;
  path: string;
  changed: readonly string[];
  sourceUrlCount: number;
  referenceCount: number;
  review: StandardsReview;
}>;

export type RepairManuscriptHeadingsResult = Readonly<{
  kind: "koios.editing.headings.repaired";
  slug: string;
  path: string;
  changed: readonly Readonly<{
    before: string;
    heading: string;
    paragraph: string;
  }>[];
  review: StandardsReview;
}>;

export type RepairManuscriptSeoHeadingResult = Readonly<{
  kind: "koios.editing.seo-heading.repaired";
  slug: string;
  path: string;
  seoTerm?: string;
  changed: readonly Readonly<{
    before: string;
    heading: string;
  }>[];
  review: StandardsReview;
}>;

type LoadedManuscript = Readonly<{
  slug: string;
  path: string;
  document: FrontMatterDocument;
}>;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const MIN_PUBLISH_WORDS = 800;
export const KOIOS_DEFAULT_LICENSE = "CC BY 4.0";
export const KOIOS_DEFAULT_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const KOIOS_DEFAULT_SYNDICATION_RIGHTS = "Licensed under Creative Commons Attribution 4.0 International; Koios.News permits indexing, snippets, large image previews, feed distribution, Google Search/News/Discover surfaces, and other attributed downstream syndication.";
const KOIOS_LEGACY_COPYRIGHT_LICENSE = "Copyright 2026 Koios.News. All rights reserved.";

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function koiosFrontMatter(frontMatter: FrontMatterRecord): Readonly<Record<string, unknown>> {
  const value = frontMatter["koios"];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function draftStatus(frontMatter: FrontMatterRecord): boolean {
  return frontMatter["draft"] === true || frontMatter["draft"] === "true";
}

function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
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

// CJK ideographs, kana, and Hangul have no place in an English-language Koios
// body: when they appear they are almost always model-output corruption (a
// foreign token leaking mid-word, e.g. "单一" for "single"). Cyrillic/Arabic
// are left alone — those plausibly carry legitimate names. This is a robustness
// gate added after a qwen draft leaked a CJK token past every other check.
const CONTAMINATING_SCRIPT_PATTERN = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/gu;

function contaminatingScriptChars(body: string): readonly string[] {
  const matches = body.match(CONTAMINATING_SCRIPT_PATTERN);
  return matches === null ? Object.freeze([]) : Object.freeze([...new Set(matches)]);
}

function splitMalformedH2(heading: string): Readonly<{ heading: string; paragraph: string }> | undefined {
  const sentenceBoundary = heading.match(/^(.+[.!?])\s+(\p{Lu}.*)$/u);
  if (sentenceBoundary?.[1] !== undefined && sentenceBoundary[2] !== undefined) {
    return Object.freeze({ heading: sentenceBoundary[1].trim(), paragraph: sentenceBoundary[2].trim() });
  }
  const words = heading.split(/\s+/).filter(Boolean);
  const sentenceStarters = new Set(["A", "An", "As", "At", "But", "For", "Higher", "In", "It", "Its", "Meanwhile", "Moreover", "Programs", "The", "This", "These", "They", "Those", "When", "While"]);
  for (let index = 2; index < words.length - 2; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if (word === undefined || next === undefined) continue;
    if (!sentenceStarters.has(word)) continue;
    if (word === "Programs" && next.toLowerCase() !== "like") continue;
    if (!/^\p{L}/u.test(next)) continue;
    const repairedHeading = words.slice(0, index).join(" ").trim();
    const paragraph = words.slice(index).join(" ").trim();
    if (wordCount(repairedHeading) < 2 || wordCount(paragraph) < 4) continue;
    return Object.freeze({ heading: repairedHeading, paragraph });
  }
  return undefined;
}

function repairMalformedH2Body(body: string): Readonly<{ body: string; changed: readonly Readonly<{ before: string; heading: string; paragraph: string }>[] }> {
  const changed: { before: string; heading: string; paragraph: string }[] = [];
  const lines = body.split("\n").map((line) => {
    if (!/^##\s+/.test(line)) return line;
    const rawHeading = line.replace(/^##\s+/, "").trim();
    if (!malformedH2Headings(line).includes(rawHeading)) return line;
    const split = splitMalformedH2(rawHeading);
    if (split === undefined) return line;
    changed.push({ before: rawHeading, heading: split.heading, paragraph: split.paragraph });
    return `## ${split.heading}\n${split.paragraph}`;
  });
  return Object.freeze({ body: lines.join("\n"), changed: Object.freeze(changed.map((item) => Object.freeze(item))) });
}

function titleCaseTerm(term: string): string {
  const lowercaseInterior = new Set(["a", "an", "and", "as", "at", "but", "for", "in", "of", "on", "or", "the", "to", "with"]);
  return term.split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowercaseInterior.has(lower)) return lower;
      return /^[A-Z0-9]{2,}$/.test(word) ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function repairSeoH2(body: string, seoTerm: string): Readonly<{ body: string; changed: readonly Readonly<{ before: string; heading: string }>[] }> {
  if (h2Headings(body).some((heading) => includesNeedle(heading, seoTerm))) {
    return Object.freeze({ body, changed: Object.freeze([]) });
  }
  const displayTerm = titleCaseTerm(seoTerm);
  const changed: { before: string; heading: string }[] = [];
  const lines = body.split("\n").map((line) => {
    if (changed.length > 0 || !/^##\s+/.test(line)) return line;
    const before = line.replace(/^##\s+/, "").trim();
    if (before.length === 0 || malformedH2Headings(line).includes(before)) return line;
    const thermodynamicHeading = before.toLowerCase().includes("thermodynamics")
      ? before.replace(/\bArtificial Character\b/i, displayTerm)
      : before;
    const heading = thermodynamicHeading === before ? `${before}: ${displayTerm}` : thermodynamicHeading;
    if (heading === before || malformedH2Headings(`## ${heading}`).length > 0) return line;
    changed.push({ before, heading });
    return `## ${heading}`;
  });
  return Object.freeze({ body: lines.join("\n"), changed: Object.freeze(changed.map((item) => Object.freeze(item))) });
}

function includesNeedle(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function hasMarkdownLink(body: string): boolean {
  return /\[[^\]]+\]\(https?:\/\/[^)]+\)/i.test(body);
}

function manuscriptSlug(path: string, document: FrontMatterDocument): string {
  return maybeString(document.frontMatter["slug"]) ?? basename(path).replace(/\.md$/, "");
}

function loadManuscript(contentDir: string, slug: string): LoadedManuscript {
  if (!existsSync(contentDir)) throw new Error(`content directory does not exist: ${contentDir}`);
  const candidates = readdirSync(contentDir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => {
      const path = join(contentDir, name);
      const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
      return Object.freeze({ slug: manuscriptSlug(path, document), path, document });
    });
  const found = candidates.find((candidate) => candidate.slug === slug || basename(candidate.path).replace(/\.md$/, "") === slug);
  if (found === undefined) throw new Error(`no such manuscript: ${slug}`);
  return found;
}

function finding(severity: StandardsSeverity, gate: StandardsFinding["gate"], code: string, message: string): StandardsFinding {
  return Object.freeze({ severity, gate, code, message });
}

export function reviewManuscriptDocument(path: string, slug: string, document: FrontMatterDocument): StandardsReview {
  const frontMatter = document.frontMatter;
  const koios = koiosFrontMatter(frontMatter);
  const findings: StandardsFinding[] = [];
  const body = document.body;
  const words = wordCount(body);
  const references = referencesFromFrontMatter(frontMatter);
  const referenceIds = new Set(references.map((reference) => reference.id));
  const citedIds = citedReferenceIds(body);
  const referenceUrls = Object.freeze([...new Set(references.flatMap((reference) => reference.url === undefined ? [] : [reference.url]))]);
  const rawReferences = frontMatter["references"];
  const seoTerm = maybeString(koios["seo_term"]) ?? strings(frontMatter["keywords"])[0];
  const tags = strings(frontMatter["tags"]);
  const categories = strings(frontMatter["categories"]);

  if (maybeString(frontMatter["title"]) === undefined) findings.push(finding("error", "reported", "missing-title", "A publishable manuscript needs a title."));
  if (maybeString(frontMatter["summary"]) === undefined && maybeString(frontMatter["description"]) === undefined) {
    findings.push(finding("error", "reported", "missing-summary", "A publishable manuscript needs a summary or description."));
  }
  if (words < MIN_PUBLISH_WORDS) {
    findings.push(finding("error", "copy-edited", "body-too-short", `A publishable Koios article needs at least ${MIN_PUBLISH_WORDS} words; found ${words}.`));
  }
  const malformedH2Count = malformedH2Headings(body).length;
  if (malformedH2Count > 0) {
    findings.push(finding("error", "copy-edited", "malformed-h2-heading", `${malformedH2Count} H2 ${malformedH2Count === 1 ? "heading looks" : "headings look"} like body prose; split headings from paragraphs before publication.`));
  }
  const contaminants = contaminatingScriptChars(body);
  if (contaminants.length > 0) {
    findings.push(finding("error", "copy-edited", "script-contamination", `The body carries ${contaminants.length} unexpected CJK/kana/Hangul character(s) (${contaminants.slice(0, 8).join(" ")}) — almost always model-output corruption; repair before publication.`));
  }
  if (seoTerm === undefined) {
    findings.push(finding("error", "standards-cleared", "missing-seo-term", "A publishable manuscript needs koios.seo_term or a keyword."));
  } else {
    if (!includesNeedle(firstParagraph(body), seoTerm)) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-first-paragraph", "The SEO term must appear in the first paragraph."));
    }
    if (!h2Headings(body).some((heading) => includesNeedle(heading, seoTerm))) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-h2", "The SEO term must appear in a level-two heading."));
    }
  }
  if ("sources" in frontMatter) {
    findings.push(finding("error", "fact-checked", "article-sources-field", "Article frontmatter must use references: for cited works; sources are intake material, not publication citations."));
  }
  if (!Array.isArray(rawReferences)) {
    findings.push(finding("error", "fact-checked", "missing-references", "A publishable manuscript needs a references: array of CSL records."));
  } else if (references.length === 0) {
    findings.push(finding("error", "fact-checked", "missing-references", "A publishable manuscript needs at least one valid CSL reference with id, type, and title or URL."));
  }
  if (Array.isArray(rawReferences)) {
    for (const [index, rawReference] of rawReferences.entries()) {
      if (rawReference === null || typeof rawReference !== "object" || Array.isArray(rawReference)) {
        findings.push(finding("error", "fact-checked", "invalid-reference", `references[${index}] must be a CSL object.`));
        continue;
      }
      const record = rawReference as Readonly<Record<string, unknown>>;
      if (maybeString(record["id"]) === undefined) findings.push(finding("error", "fact-checked", "missing-reference-id", `references[${index}] needs a CSL id.`));
      if (maybeString(record["type"]) === undefined) findings.push(finding("error", "fact-checked", "missing-reference-type", `references[${index}] needs a CSL type.`));
      if (maybeString(record["key"]) !== undefined || maybeString(record["citation-key"]) !== undefined || maybeString(record["citation_key"]) !== undefined) {
        findings.push(finding("error", "fact-checked", "non-csl-reference-key", `references[${index}] must use CSL id, not key/citation-key.`));
      }
    }
  }
  for (const [index, referenceUrl] of referenceUrls.entries()) {
    if (!URL_PATTERN.test(referenceUrl)) {
      findings.push(finding("error", "fact-checked", "invalid-reference-url", `references[${index}] must carry an http(s) URL.`));
    }
  }
  for (const citedId of citedIds) {
    if (!referenceIds.has(citedId)) {
      findings.push(finding("error", "fact-checked", "missing-cited-reference", `Body citation @${citedId} has no matching references entry.`));
    }
  }
  if (referenceUrls.length > 0 && citedIds.length === 0 && !hasMarkdownLink(body) && !referenceUrls.some((referenceUrl) => body.includes(referenceUrl))) {
    findings.push(finding("warning", "fact-checked", "no-body-reference-link", "The body should cite or link at least one reference."));
  }
  if (maybeString(frontMatter["license"]) === undefined) {
    findings.push(finding("error", "standards-cleared", "missing-license", "A publishable manuscript needs an explicit license."));
  } else if (maybeString(frontMatter["license"]) === KOIOS_LEGACY_COPYRIGHT_LICENSE) {
    findings.push(finding("warning", "standards-cleared", "legacy-rights-reserved-license", "Koios now prefers CC BY 4.0 for attributed downstream distribution and Google-surface interoperability."));
  }
  if (maybeString(frontMatter["license_url"]) === undefined) {
    findings.push(finding("warning", "standards-cleared", "missing-license-url", "Machine-readable syndication works better with a license_url."));
  }
  if (maybeString(frontMatter["syndication_rights"]) === undefined) {
    findings.push(finding("error", "standards-cleared", "missing-syndication-rights", "A publishable manuscript needs syndication rights metadata."));
  }
  for (const correctionFinding of correctionValidationFindings(frontMatter)) {
    findings.push(finding("error", "standards-cleared", correctionFinding.code, correctionFinding.message));
  }
  if (maybeString(frontMatter["author"]) === undefined) findings.push(finding("error", "reported", "missing-author", "A publishable manuscript needs an author."));
  if (maybeString(koios["beat"]) === undefined) findings.push(finding("error", "reported", "missing-beat", "A publishable manuscript needs koios.beat."));
  if (tags.length === 0) findings.push(finding("warning", "standards-cleared", "missing-tags", "A publishable manuscript should carry tags."));
  if (categories.length === 0) findings.push(finding("warning", "standards-cleared", "missing-categories", "A publishable manuscript should carry categories."));

  const blocking = findings.some((item) => item.severity === "error");
  return Object.freeze({
    kind: "koios.editing.standards-review",
    slug,
    path,
    publishable: !blocking,
    draft: draftStatus(frontMatter),
    wordCount: words,
    referenceCount: referenceUrls.length,
    ...(seoTerm === undefined ? {} : { seoTerm }),
    findings: Object.freeze(findings),
  });
}

export function reviewManuscriptStandards(contentDir: string, slug: string): StandardsReview {
  const manuscript = loadManuscript(contentDir, slug);
  return reviewManuscriptDocument(manuscript.path, manuscript.slug, manuscript.document);
}

function dayStamp(): string {
  return new Date().toISOString().slice(0, 10); // law-allow: wall-clock-as-data — publication date witness
}

function reviewedAt(): string {
  return new Date().toISOString(); // law-allow: wall-clock-as-data — standards review witness
}

function writeManuscript(path: string, document: FrontMatterDocument): void {
  writeFileSync(path, encodeFrontMatterDocument({
    frontMatter: document.frontMatter,
    body: document.body.endsWith("\n") ? document.body : `${document.body}\n`,
  }), "utf8");
}

export function applyStandardsMetadataDefaults(contentDir: string, slug: string): ApplyStandardsDefaultsResult {
  const manuscript = loadManuscript(contentDir, slug);
  const changed: string[] = [];
  const frontMatter: Record<string, unknown> = { ...manuscript.document.frontMatter };
  if ("sources" in frontMatter && Array.isArray(frontMatter["references"])) {
    delete frontMatter["sources"];
    changed.push("sources");
  }
  const license = maybeString(frontMatter["license"]);
  if (license === undefined || license === KOIOS_LEGACY_COPYRIGHT_LICENSE) {
    frontMatter["license"] = KOIOS_DEFAULT_LICENSE;
    changed.push("license");
  }
  if (maybeString(frontMatter["license_url"]) === undefined) {
    frontMatter["license_url"] = KOIOS_DEFAULT_LICENSE_URL;
    changed.push("license_url");
  }
  if (maybeString(frontMatter["syndication_rights"]) === undefined) {
    frontMatter["syndication_rights"] = KOIOS_DEFAULT_SYNDICATION_RIGHTS;
    changed.push("syndication_rights");
  }
  if (changed.length > 0) {
    writeManuscript(manuscript.path, Object.freeze({
      frontMatter: Object.freeze(frontMatter),
      body: manuscript.document.body,
    }));
  }
  const nextDocument = changed.length === 0
    ? manuscript.document
    : decodeFrontMatterDocument(readFileSync(manuscript.path, "utf8"));
  return Object.freeze({
    kind: "koios.editing.standards-defaults.applied" as const,
    slug: manuscript.slug,
    path: manuscript.path,
    changed: Object.freeze(changed),
    review: reviewManuscriptDocument(manuscript.path, manuscript.slug, nextDocument),
  });
}

export function normalizeManuscriptReferences(contentDir: string, slug: string): NormalizeManuscriptReferencesResult {
  const manuscript = loadManuscript(contentDir, slug);
  const changed: string[] = [];
  const frontMatter: Record<string, unknown> = { ...manuscript.document.frontMatter };
  const sourceUrls = strings(frontMatter["sources"]).filter((source) => /^https?:\/\//i.test(source));
  const existingReferences = Array.isArray(frontMatter["references"]) ? frontMatter["references"] : [];
  const references = existingReferences.length > 0 ? normalizeCslReferenceRecords(existingReferences) : referencesFromSourceUrls(sourceUrls);
  if (references.length > 0 && JSON.stringify(existingReferences) !== JSON.stringify(references)) {
    frontMatter["references"] = Object.freeze(references);
    changed.push("references");
  }
  if ("sources" in frontMatter) {
    delete frontMatter["sources"];
    changed.push("sources");
  }
  if (changed.length > 0) {
    writeManuscript(manuscript.path, Object.freeze({
      frontMatter: Object.freeze(frontMatter),
      body: manuscript.document.body,
    }));
  }
  const nextDocument = changed.length === 0
    ? manuscript.document
    : decodeFrontMatterDocument(readFileSync(manuscript.path, "utf8"));
  const nextReferences = referencesFromFrontMatter(nextDocument.frontMatter);
  return Object.freeze({
    kind: "koios.editing.references.normalized" as const,
    slug: manuscript.slug,
    path: manuscript.path,
    changed: Object.freeze(changed),
    sourceUrlCount: sourceUrls.length,
    referenceCount: nextReferences.length,
    review: reviewManuscriptDocument(manuscript.path, manuscript.slug, nextDocument),
  });
}

export function repairManuscriptHeadings(contentDir: string, slug: string): RepairManuscriptHeadingsResult {
  const manuscript = loadManuscript(contentDir, slug);
  const repaired = repairMalformedH2Body(manuscript.document.body);
  if (repaired.changed.length > 0) {
    writeManuscript(manuscript.path, Object.freeze({
      frontMatter: manuscript.document.frontMatter,
      body: repaired.body,
    }));
  }
  const nextDocument = repaired.changed.length === 0
    ? manuscript.document
    : decodeFrontMatterDocument(readFileSync(manuscript.path, "utf8"));
  return Object.freeze({
    kind: "koios.editing.headings.repaired" as const,
    slug: manuscript.slug,
    path: manuscript.path,
    changed: repaired.changed,
    review: reviewManuscriptDocument(manuscript.path, manuscript.slug, nextDocument),
  });
}

export function repairManuscriptSeoHeading(contentDir: string, slug: string): RepairManuscriptSeoHeadingResult {
  const manuscript = loadManuscript(contentDir, slug);
  const koios = koiosFrontMatter(manuscript.document.frontMatter);
  const seoTerm = maybeString(koios["seo_term"]) ?? strings(manuscript.document.frontMatter["keywords"])[0];
  const repaired = seoTerm === undefined
    ? Object.freeze({ body: manuscript.document.body, changed: Object.freeze([]) })
    : repairSeoH2(manuscript.document.body, seoTerm);
  if (repaired.changed.length > 0) {
    writeManuscript(manuscript.path, Object.freeze({
      frontMatter: manuscript.document.frontMatter,
      body: repaired.body,
    }));
  }
  const nextDocument = repaired.changed.length === 0
    ? manuscript.document
    : decodeFrontMatterDocument(readFileSync(manuscript.path, "utf8"));
  return Object.freeze({
    kind: "koios.editing.seo-heading.repaired" as const,
    slug: manuscript.slug,
    path: manuscript.path,
    ...(seoTerm === undefined ? {} : { seoTerm }),
    changed: repaired.changed,
    review: reviewManuscriptDocument(manuscript.path, manuscript.slug, nextDocument),
  });
}

export function publishManuscript(contentDir: string, slug: string): PublishManuscriptResult {
  const manuscript = loadManuscript(contentDir, slug);
  const review = reviewManuscriptDocument(manuscript.path, manuscript.slug, manuscript.document);
  if (!review.publishable) {
    throw new Error(`manuscript ${review.slug} is not publishable: ${review.findings.filter((item) => item.severity === "error").map((item) => item.code).join(", ")}`);
  }
  const existingKoios = koiosFrontMatter(manuscript.document.frontMatter);
  const frontMatter: FrontMatterRecord = Object.freeze({
    ...manuscript.document.frontMatter,
    draft: false,
    date: maybeString(manuscript.document.frontMatter["date"]) ?? dayStamp(),
    koios: Object.freeze({
      ...existingKoios,
      gates_clear: true,
      standards_reviewed_at: reviewedAt(),
    }),
  });
  writeManuscript(manuscript.path, Object.freeze({ frontMatter, body: manuscript.document.body }));
  return Object.freeze({
    kind: "koios.publishing.manuscript.published",
    slug: review.slug,
    path: review.path,
    draft: false,
    review,
  });
}
