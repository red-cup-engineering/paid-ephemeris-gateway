// publishing/managing/syndicating — machine distribution after publication.
//
// Circulation is reader return; syndication is machine-readable republication:
// feeds, sitemaps, ninjs, and the public gate audit.

import type { KoiosItem, KoiosMasthead } from "../../../../../../surface.mjs";
import { publicItems } from "../../../../../../surface.mjs";

export type SyndicationSurface = Readonly<{
  kind: "feed" | "sitemap" | "record" | "audit" | "article";
  href: string;
  mediaType: string;
}>;

export type SyndicationReading = Readonly<{
  department: "publishing.managing.syndicating";
  surfaces: readonly SyndicationSurface[];
}>;

export { coverageGraphReading } from "./coverage-graph.mjs";
export type { CoverageGraph, CoverageDefinedTerm, CoverageArticleRef } from "./coverage-graph.mjs";

export function syndicationReading(input: Readonly<{
  masthead: KoiosMasthead;
  items: readonly KoiosItem[];
}>): SyndicationReading {
  const base = input.masthead.siteUrl.replace(/\/$/, "");
  const itemPath = input.masthead.itemPath.replace(/^\/+|\/+$/g, "");
  return Object.freeze({
    department: "publishing.managing.syndicating",
    surfaces: Object.freeze([
      Object.freeze({ kind: "feed", href: `${base}/feed.xml`, mediaType: "application/rss+xml" }),
      Object.freeze({ kind: "feed", href: `${base}/feed.atom`, mediaType: "application/atom+xml" }),
      Object.freeze({ kind: "feed", href: `${base}/feed.json`, mediaType: "application/feed+json" }),
      Object.freeze({ kind: "sitemap", href: `${base}/sitemap.xml`, mediaType: "application/xml" }),
      Object.freeze({ kind: "sitemap", href: `${base}/news-sitemap.xml`, mediaType: "application/xml" }),
      Object.freeze({ kind: "record", href: `${base}/ninjs.json`, mediaType: "application/vnd.iptc.ninjs+json" }),
      Object.freeze({ kind: "record", href: `${base}/topics.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/tags.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/archive.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/sources.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/desks.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/bibliography.json`, mediaType: "application/json" }),
      Object.freeze({ kind: "record", href: `${base}/coverage.json`, mediaType: "application/ld+json" }),
      Object.freeze({ kind: "audit", href: `${base}/newswire-audit.json`, mediaType: "application/json" }),
      ...publicItems(input.items).map((item): SyndicationSurface => Object.freeze({
        kind: "article",
        href: `${base}/${itemPath}/${item.slug}`,
        mediaType: "text/html",
      })),
    ]),
  });
}
