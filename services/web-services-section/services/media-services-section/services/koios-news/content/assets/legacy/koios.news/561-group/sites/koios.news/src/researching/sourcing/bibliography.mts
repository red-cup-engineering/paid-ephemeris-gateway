// researching/sourcing/bibliography — CSL frontmatter references and public
// reference-domain readings.
//
// Koios stores published article citations as CSL JSON objects serialized in
// YAML under `references:`. Feed/source material remains a sourcing concern;
// references are the cited cut that writing and editing promote into the
// published article. Article rendering turns [@id] and [cite:@id] body
// citations into linked web citations and appends a DPUB-ARIA-shaped
// bibliography.

import type { KoiosPost } from "../../content.mjs";
import { escapeHtml, renderMarkdown } from "../../markdown.mjs";
import { publicItems, type KoiosItem, type KoiosMasthead } from "../../surface.mjs";
import type { CslItem } from "@emsenn/content/codecs/references";

export type SourceKind =
  | "commercial-website"
  | "independent-website"
  | "academic-journal"
  | "professional-journal"
  | "personal-writing"
  | "social-media"
  | "unknown";

export type BibliographyReference = Readonly<{
  id: string;
  title: string;
  url?: string;
  domain?: string;
  type?: string;
  sourceKind: SourceKind;
  author: readonly string[];
  containerTitle?: string;
  publisher?: string;
  issued?: string;
  annotation?: string;
}>;

export type CitedArticle = Readonly<{
  slug: string;
  title: string;
  url: string;
  citationIds: readonly string[];
}>;

export type DomainReferenceReading = Readonly<BibliographyReference & {
  citedBy: readonly CitedArticle[];
}>;

export type DomainBibliographyReading = Readonly<{
  kind: "koios.bibliography.domain";
  domain: string;
  url: string;
  sourceKind: SourceKind;
  citationCount: number;
  articleCount: number;
  references: readonly DomainReferenceReading[];
}>;

export type SiteBibliographyReading = Readonly<{
  kind: "koios.bibliography";
  count: number;
  domainCount: number;
  domains: readonly DomainBibliographyReading[];
}>;

const CITATION_PATTERN = /\[(?:cite:)?@([A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*(?:\s*;\s*@[A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*)*)\]/g;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function firstText(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = maybeString(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function domainOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function sourceKindForDomain(domain: string | undefined): SourceKind {
  switch (domain) {
    case "nature.com":
    case "pnas.org":
    case "science.org":
    case "arxiv.org":
    case "nber.org":
      return "academic-journal";
    case "spectrum.ieee.org":
    case "technologyreview.com":
      return "professional-journal";
    case "carbonbrief.org":
    case "insideclimatenews.org":
    case "grist.org":
    case "npr.org":
      return "independent-website";
    case "coindesk.com":
    case "theblock.co":
    case "theregister.com":
    case "arstechnica.com":
    case "theguardian.com":
    case "aljazeera.com":
    case "nytimes.com":
      return "commercial-website";
    default:
      return "unknown";
  }
}

function cslDate(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const first = value[0];
    if (isRecord(first)) {
      const parts = ["year", "month", "day"]
        .map((key) => first[key])
        .filter((part): part is number | string => (typeof part === "number" && Number.isFinite(part)) || (typeof part === "string" && part !== ""));
      if (parts.length > 0) return parts.map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("-");
    }
    if (typeof first === "number" || typeof first === "string") return String(first);
  }
  if (!isRecord(value)) return undefined;
  const rawParts = value["date-parts"] ?? value["date_parts"];
  const first = Array.isArray(rawParts) ? rawParts[0] : undefined;
  if (Array.isArray(first)) return first.map((part) => String(part).padStart(2, "0")).join("-");
  return maybeString(value["literal"]) ?? maybeString(value["raw"]);
}

function cslName(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  const literal = maybeString(value["literal"]);
  if (literal !== undefined) return literal;
  const given = maybeString(value["given"]);
  const family = maybeString(value["family"]);
  return [given, family].filter(Boolean).join(" ");
}

function cslNames(value: unknown): readonly string[] {
  if (value === undefined || value === null) return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.map(cslName).filter((name) => name.length > 0));
  const name = cslName(value);
  return name === "" ? Object.freeze([]) : Object.freeze([name]);
}

function slugId(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9_.:-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug === "" ? "reference" : slug;
}

function referenceFromCslItem(item: CslItem): BibliographyReference | null {
  const record = item as Readonly<Record<string, unknown>>;
  const url = firstText(record, ["URL", "url"]);
  const title = firstText(record, ["title", "container-title"]) ?? url;
  const id = maybeString(record["id"]);
  const type = maybeString(record["type"]);
  if (id === undefined || type === undefined || title === undefined) return null;
  const containerTitle = firstText(record, ["container-title"]);
  const publisher = firstText(record, ["publisher"]);
  const issued = cslDate(record["issued"] ?? record["date"] ?? record["accessed"]);
  const domain = domainOf(url);
  const annotation = firstText(record, ["note", "abstract"]);
  return Object.freeze({
    id,
    title,
    ...(url === undefined ? {} : { url }),
    ...(domain === undefined ? {} : { domain }),
    type,
    sourceKind: sourceKindForDomain(domain),
    author: cslNames(record["author"]),
    ...(containerTitle === undefined ? {} : { containerTitle }),
    ...(publisher === undefined ? {} : { publisher }),
    ...(issued === undefined ? {} : { issued }),
    ...(annotation === undefined ? {} : { annotation }),
  });
}

export function referencesFromFrontMatter(frontMatter: Readonly<Record<string, unknown>>): readonly BibliographyReference[] {
  const references: BibliographyReference[] = [];
  const seen = new Set<string>();
  const add = (reference: BibliographyReference): void => {
    const key = reference.url ?? reference.id;
    if (seen.has(key)) return;
    seen.add(key);
    references.push(reference);
  };
  const rawReferences = frontMatter["references"];
  if (Array.isArray(rawReferences)) {
    for (const raw of rawReferences) {
      if (!isRecord(raw)) continue;
      const reference = referenceFromCslItem(raw as CslItem);
      if (reference !== null) add(reference);
    }
  }
  return Object.freeze(references);
}

export function citedReferenceIds(markdown: string): readonly string[] {
  const ids: string[] = [];
  for (const match of markdown.matchAll(CITATION_PATTERN)) {
    for (const id of (match[1] ?? "").split(/\s*;\s*@/).map((key) => key.trim()).filter(Boolean)) ids.push(id);
  }
  return Object.freeze(ids);
}

function referenceHtml(reference: BibliographyReference): string {
  const author = reference.author.length > 0 ? `${escapeHtml(reference.author.join(", "))}. ` : "";
  const title = reference.url === undefined
    ? `<cite>${escapeHtml(reference.title)}</cite>`
    : `<cite><a href="${escapeHtml(reference.url)}">${escapeHtml(reference.title)}</a></cite>`;
  const container = reference.containerTitle ? ` ${escapeHtml(reference.containerTitle)}.` : "";
  const publisher = reference.publisher ? ` ${escapeHtml(reference.publisher)}.` : "";
  const issued = reference.issued ? ` ${escapeHtml(reference.issued)}.` : "";
  const domain = reference.domain ? ` <span class="reference__domain">${escapeHtml(reference.domain)}</span>.` : "";
  const kind = reference.sourceKind === "unknown" ? "" : ` <span class="reference__kind">${escapeHtml(reference.sourceKind)}</span>.`;
  const annotation = reference.annotation === undefined ? "" : `<p class="reference__annotation">${renderMarkdown(reference.annotation)}</p>`;
  return `${author}${title}.${container}${publisher}${issued}${domain}${kind}${annotation}`;
}

function referenceDomId(id: string): string {
  return `ref-${slugId(id)}`;
}

function bibliographyHtml(references: readonly BibliographyReference[]): string {
  if (references.length === 0) return "";
  return [
    `<section class="bibliography" role="doc-bibliography" aria-labelledby="references">`,
    `<h2 id="references">References</h2>`,
    `<ol>`,
    ...references.map((reference) => `<li id="${escapeHtml(referenceDomId(reference.id))}" role="doc-biblioentry" data-source-kind="${escapeHtml(reference.sourceKind)}">${referenceHtml(reference)}</li>`),
    `</ol>`,
    `</section>`,
  ].join("\n");
}

export function renderMarkdownWithBibliography(markdown: string, frontMatter: Readonly<Record<string, unknown>>): string {
  const references = referencesFromFrontMatter(frontMatter);
  const referenceNumbers = new Map(references.map((reference, index) => [reference.id, index + 1]));
  const body = renderMarkdown(markdown, {
    citation(ids, raw) {
      const links = ids.map((id) => {
        const number = referenceNumbers.get(id);
        if (number === undefined) return `<span class="citation citation--missing">${escapeHtml(raw)}</span>`;
        return `<a class="citation" role="doc-biblioref" href="#${escapeHtml(referenceDomId(id))}" data-cites="${escapeHtml(id)}">[${number}]</a>`;
      });
      return links.join("");
    },
  });
  return [body, bibliographyHtml(references)].filter(Boolean).join("\n");
}

function itemBySlug(items: readonly KoiosItem[]): ReadonlyMap<string, KoiosItem> {
  return new Map(publicItems(items).map((item) => [item.slug, item]));
}

function domainSourceKind(references: readonly BibliographyReference[]): SourceKind {
  return references.find((reference) => reference.sourceKind !== "unknown")?.sourceKind ?? "unknown";
}

export function bibliographyReading(posts: readonly KoiosPost[], items: readonly KoiosItem[], masthead: KoiosMasthead): SiteBibliographyReading {
  const publicBySlug = itemBySlug(items);
  const byDomain = new Map<string, Map<string, { reference: BibliographyReference; citedBy: CitedArticle[] }>>();
  for (const post of posts) {
    const item = publicBySlug.get(post.slug);
    if (item === undefined) continue;
    const ids = new Set(citedReferenceIds(post.document.body));
    for (const reference of referencesFromFrontMatter(post.document.frontMatter)) {
      if (reference.domain === undefined) continue;
      const domain = reference.domain;
      const domainEntry = byDomain.get(domain) ?? new Map<string, { reference: BibliographyReference; citedBy: CitedArticle[] }>();
      const referenceKey = reference.url ?? reference.id;
      const entry = domainEntry.get(referenceKey) ?? { reference, citedBy: [] };
      entry.citedBy.push(Object.freeze({
        slug: post.slug,
        title: item.headline,
        url: item.url || `${masthead.siteUrl}/posts/${post.slug}`,
        citationIds: Object.freeze(ids.has(reference.id) ? [reference.id] : []),
      }));
      domainEntry.set(referenceKey, entry);
      byDomain.set(domain, domainEntry);
    }
  }
  const domains = [...byDomain.entries()]
    .map(([domain, references]): DomainBibliographyReading => {
      const domainReferences = [...references.values()].map((entry): DomainReferenceReading => Object.freeze({
        ...entry.reference,
        citedBy: Object.freeze(entry.citedBy.sort((left, right) => left.title.localeCompare(right.title))),
      }));
      const citationCount = domainReferences.reduce((sum, reference) => sum + reference.citedBy.length, 0);
      return Object.freeze({
        kind: "koios.bibliography.domain" as const,
        domain,
        url: `${masthead.siteUrl}/bibliography/${encodeURIComponent(domain)}`,
        sourceKind: domainSourceKind(domainReferences),
        citationCount,
        articleCount: new Set(domainReferences.flatMap((reference) => reference.citedBy.map((article) => article.slug))).size,
        references: Object.freeze(domainReferences.sort((left, right) => left.title.localeCompare(right.title))),
      });
    })
    .sort((left, right) => right.citationCount - left.citationCount || left.domain.localeCompare(right.domain));
  return Object.freeze({
    kind: "koios.bibliography" as const,
    count: domains.reduce((sum, domain) => sum + domain.citationCount, 0),
    domainCount: domains.length,
    domains: Object.freeze(domains),
  });
}
