// publishing/managing/syndicating/coverage-graph — the site's topical coverage
// as linked data.
//
// Feeds and sitemaps say WHICH articles exist; this says WHAT the publication
// covers and how its topics connect to its articles. It projects the published
// corpus into a schema.org DefinedTermSet — a controlled vocabulary of SEO
// terms, beats, sections, and tags — with each term linked to the NewsArticles
// that cover it. That makes the keyword structure the newsroom reasons about
// internally (demand, discovery, coverage gaps) legible to crawlers and agents
// on the open/semantic web, without rendering anything new for human readers.
//
// It is a pure projection of public articles: no drafts, no demand internals,
// no view data. The visual site is untouched; this is a machine surface only.

import type { FrontMatterDocument } from "@emsenn/content/codecs/frontmatter";

import type { KoiosItem, KoiosMasthead } from "../../../../../../surface.mjs";
import { publicItems } from "../../../../../../surface.mjs";
import type { KoiosPost } from "../../../../../../content.mjs";

type TermFacet = "seo-term" | "beat" | "section" | "tag";

export type CoverageArticleRef = Readonly<{
  "@type": "NewsArticle";
  "@id": string;
  headline: string;
  datePublished?: string;
}>;

export type CoverageDefinedTerm = Readonly<{
  "@type": "DefinedTerm";
  "@id": string;
  name: string;
  /** Which facet of the controlled vocabulary this term belongs to. */
  termCode: TermFacet;
  inDefinedTermSet: string;
  /** Number of public articles covering the term. */
  articleCount: number;
  subjectOf: readonly CoverageArticleRef[];
}>;

export type CoverageGraph = Readonly<{
  "@context": "https://schema.org";
  "@type": "DefinedTermSet";
  "@id": string;
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  /** Total public articles folded into the graph. */
  articleCount: number;
  termCount: number;
  hasDefinedTerm: readonly CoverageDefinedTerm[];
}>;

function frontMatter(post: KoiosPost): FrontMatterDocument["frontMatter"] {
  return post.document.frontMatter;
}

function asStrings(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.map(String).filter((entry) => entry.trim() !== "");
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

function termSlug(facet: TermFacet, name: string): string {
  return `${facet}/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/** Project the published corpus into a controlled-vocabulary coverage graph. */
export function coverageGraphReading(input: Readonly<{
  masthead: KoiosMasthead;
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
}>): CoverageGraph {
  const base = input.masthead.siteUrl.replace(/\/$/, "");
  const itemPath = input.masthead.itemPath.replace(/^\/+|\/+$/g, "");
  const setId = `${base}/coverage.json#vocabulary`;
  const postBySlug = new Map(input.posts.map((post) => [post.slug, post]));
  const publics = publicItems(input.items);

  // facet -> term name -> article refs (insertion order preserved per term).
  const facets = new Map<TermFacet, Map<string, CoverageArticleRef[]>>();
  const add = (facet: TermFacet, name: string, ref: CoverageArticleRef): void => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const terms = facets.get(facet) ?? new Map<string, CoverageArticleRef[]>();
    const refs = terms.get(trimmed) ?? [];
    if (!refs.some((existing) => existing["@id"] === ref["@id"])) refs.push(ref);
    terms.set(trimmed, refs);
    facets.set(facet, terms);
  };

  for (const item of publics) {
    const post = postBySlug.get(item.slug);
    const ref: CoverageArticleRef = Object.freeze({
      "@type": "NewsArticle" as const,
      "@id": `${base}/${itemPath}/${item.slug}`,
      headline: item.headline,
      ...(item.published === undefined ? {} : { datePublished: item.published }),
    });
    const koios = post === undefined ? {} : (frontMatter(post)["koios"] ?? {}) as Record<string, unknown>;
    const seoTerm = typeof koios["seo_term"] === "string" ? koios["seo_term"] : undefined;
    if (seoTerm !== undefined) add("seo-term", seoTerm, ref);
    const beat = typeof koios["beat"] === "string" ? koios["beat"] : undefined;
    if (beat !== undefined) add("beat", beat, ref);
    if (item.section !== undefined && item.section !== "") add("section", item.section, ref);
    if (post !== undefined) {
      for (const tag of asStrings(frontMatter(post)["tags"])) add("tag", tag, ref);
    }
  }

  const terms: CoverageDefinedTerm[] = [];
  for (const [facet, byName] of facets) {
    for (const [name, refs] of byName) {
      terms.push(Object.freeze({
        "@type": "DefinedTerm" as const,
        "@id": `${base}/coverage.json#${termSlug(facet, name)}`,
        name,
        termCode: facet,
        inDefinedTermSet: setId,
        articleCount: refs.length,
        subjectOf: Object.freeze(refs.slice()),
      }));
    }
  }
  // Most-covered terms first, then the controlled-vocabulary facet, then name.
  const facetOrder: Record<TermFacet, number> = { "seo-term": 0, beat: 1, section: 2, tag: 3 };
  terms.sort((a, b) =>
    b.articleCount - a.articleCount
    || facetOrder[a.termCode] - facetOrder[b.termCode]
    || a.name.localeCompare(b.name));

  return Object.freeze({
    "@context": "https://schema.org" as const,
    "@type": "DefinedTermSet" as const,
    "@id": setId,
    name: `${input.masthead.title} coverage vocabulary`,
    description: "Controlled vocabulary of the publication's SEO terms, beats, sections, and tags, each linked to the public NewsArticles that cover it. A machine-readable map of what the newsroom covers; the human site is unchanged.",
    url: `${base}/coverage.json`,
    inLanguage: input.masthead.language,
    articleCount: publics.length,
    termCount: terms.length,
    hasDefinedTerm: Object.freeze(terms),
  });
}
