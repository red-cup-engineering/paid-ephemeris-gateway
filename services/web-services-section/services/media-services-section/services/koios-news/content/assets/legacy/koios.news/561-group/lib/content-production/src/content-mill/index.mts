/**
 * content-mill — form cultivated content into distribution artifacts.
 *
 * The mill is the dual of the farm: where `../content-farm` produces content
 * (demand + intake → judged drafts and claim sets), the mill forms the settled
 * content for distribution. It is web-FREE: it returns strings and plain
 * objects (feeds, sitemaps, robots, JSON-LD, h-entry bodies, ninjs, the
 * editorial audit), built purely from `@emsenn/content`'s format codecs. A site
 * mounts those artifacts on HTTP transport (the web layer); the mill never
 * touches transport itself.
 *
 * The natural object is `MillItem` — the lossy wire projection of a subject's
 * claim set. Every distribution format is a functor out of it: F_rss, F_atom,
 * F_jsonfeed, F_sitemap, F_jsonld, F_ninjs, F_hentry. The mill is the coproduct
 * of those functors over a publication's masthead.
 */

import {
  rss2,
  atom,
  jsonFeed,
  sitemap,
  newsSitemap,
  robots,
  escapeHtml,
  type FeedChannel,
  type FeedItem,
  type SitemapUrl,
  type NewsSitemapUrl,
} from "@emsenn/content/codecs/feed";
import { newsArticleScript, type NewsArticleInput, type JsonLdPublisher } from "@emsenn/content/codecs/jsonld";
import { createNinjsArtifact, type NewsCodecArtifact } from "@emsenn/content/codecs/ninjs";
import {
  currentPublicationStatus,
  editorialGateReport,
  PUBLISHED,
  type GateReport,
  type NewsClaimSet,
} from "@emsenn/content/topology/news";

/** A masthead identity: the name and optional URL of an author or publisher. */
export type MillIdentity = Readonly<{ name: string; url?: string }>;

/**
 * A publication's masthead — the identity its distribution surfaces render
 * under. Web-free: it names URLs as strings but binds to no transport. (A site
 * may carry extra fields, e.g. a theme; the mill reads only these.)
 */
export type MillMasthead = Readonly<{
  /** The publication title. */
  title: string;
  /** The site's base URL, without a trailing slash. */
  siteUrl: string;
  /** The canonical feed URL. */
  feedUrl: string;
  /** A one-line description for feed channels and item fallbacks. */
  description: string;
  /** The path segment under which item pages live, e.g. "posts". */
  itemPath: string;
  /** The publication language (BCP-47). */
  language: string;
  author: MillIdentity;
  publisher: MillIdentity;
  /** The news-sitemap publication identity. */
  publication: Readonly<{ name: string; language: string }>;
}>;

/**
 * The lossy wire projection of a subject's claim set — the natural object the
 * mill forms distribution artifacts from. A site projects its own claim-set
 * vocabulary into this shape (see `millItem`) or builds it directly.
 */
export type MillItem = Readonly<{
  subject: string;
  slug: string;
  url: string;
  headline: string;
  summary: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  bodyHtml: string;
  published?: string;
  author?: string;
  authorUrl?: string;
  section?: string;
  keywords: readonly string[];
  status: string | null;
  isPublic: boolean;
}>;

/** A subject's claim set paired with the rendered body HTML and lead image the
 * cells do not carry — the input to the canonical `millItem` projection. */
export type MillSource = Readonly<{ claimSet: NewsClaimSet; slug: string; bodyHtml?: string; image?: string; imageWidth?: number; imageHeight?: number; authorUrl?: string }>;

/** The predicate names `millItem` reads from a claim set's potential cells.
 * Defaults to the flat wire vocabulary; override to read a different dialect. */
export type MillVocabulary = Readonly<{
  headline: string;
  summary: string;
  publishedAt: string;
  author: string;
  section: string;
  keyword: string;
  tag: string;
}>;

const DEFAULT_VOCABULARY: MillVocabulary = Object.freeze({
  headline: "headline",
  summary: "summary",
  publishedAt: "published-at",
  author: "author",
  section: "section",
  keyword: "keyword",
  tag: "tag",
});

function firstCell(claimSet: NewsClaimSet, predicate: string): string | undefined {
  const cell = (claimSet.potential ?? []).find((c) => c.predicate === predicate);
  return cell === undefined ? undefined : String(cell.object);
}

function allCells(claimSet: NewsClaimSet, predicate: string): readonly string[] {
  return (claimSet.potential ?? []).filter((c) => c.predicate === predicate).map((c) => String(c.object));
}

/**
 * Project one subject's claim set into a wire item: read its cells under the
 * given vocabulary, derive its publication status, and freeze the lossy view.
 */
export function millItem(source: MillSource, masthead: MillMasthead, vocabulary: MillVocabulary = DEFAULT_VOCABULARY): MillItem {
  const { claimSet } = source;
  const status = currentPublicationStatus(claimSet);
  const keywords = allCells(claimSet, vocabulary.keyword);
  const tags = allCells(claimSet, vocabulary.tag);
  const published = firstCell(claimSet, vocabulary.publishedAt);
  const author = firstCell(claimSet, vocabulary.author);
  const section = firstCell(claimSet, vocabulary.section);
  return Object.freeze({
    subject: claimSet.subject,
    slug: source.slug,
    url: `${masthead.siteUrl}/${masthead.itemPath}/${source.slug}`,
    headline: firstCell(claimSet, vocabulary.headline) ?? source.slug,
    summary: firstCell(claimSet, vocabulary.summary) ?? "",
    ...(source.image === undefined ? {} : { image: source.image }),
    ...(source.imageWidth === undefined ? {} : { imageWidth: source.imageWidth }),
    ...(source.imageHeight === undefined ? {} : { imageHeight: source.imageHeight }),
    bodyHtml: source.bodyHtml ?? "",
    ...(published === undefined ? {} : { published }),
    ...(author === undefined ? {} : { author }),
    ...(source.authorUrl === undefined ? {} : { authorUrl: source.authorUrl }),
    ...(section === undefined ? {} : { section }),
    keywords: Object.freeze(keywords.length > 0 ? keywords : tags),
    status,
    isPublic: status === PUBLISHED,
  });
}

/** Project every source into a wire item. */
export function millItems(sources: readonly MillSource[], masthead: MillMasthead, vocabulary: MillVocabulary = DEFAULT_VOCABULARY): readonly MillItem[] {
  return Object.freeze(sources.map((source) => millItem(source, masthead, vocabulary)));
}

/** Reverse-chronological order; subject breaks ties for stability. */
function reverseChronological(items: readonly MillItem[]): readonly MillItem[] {
  return [...items].sort((left, right) =>
    (right.published ?? "").localeCompare(left.published ?? "") || left.subject.localeCompare(right.subject));
}

/** The shipped items, newest first — the public wire. */
export function publicItems(items: readonly MillItem[]): readonly MillItem[] {
  return reverseChronological(items.filter((item) => item.isPublic));
}

// ---------- feeds ----------

function feedChannel(masthead: MillMasthead): FeedChannel {
  return {
    title: masthead.title,
    homePageUrl: masthead.siteUrl,
    feedUrl: masthead.feedUrl,
    description: masthead.description,
    author: { name: masthead.author.name, ...(masthead.author.url === undefined ? {} : { url: masthead.author.url }) },
    language: masthead.language,
  };
}

function feedItem(item: MillItem): FeedItem {
  return {
    id: item.url,
    url: item.url,
    title: item.headline,
    contentHtml: item.bodyHtml,
    ...(item.summary ? { summary: item.summary } : {}),
    ...(item.image === undefined ? {} : { imageUrl: item.image }),
    ...(item.author === undefined ? {} : { author: { name: item.author } }),
    ...(item.published === undefined ? {} : { published: item.published }),
    ...(item.keywords.length > 0 ? { tags: item.keywords } : {}),
  };
}

/** The three feed serializations over the public items, newest first. */
export function millFeeds(masthead: MillMasthead, items: readonly MillItem[]): Readonly<{ rss: string; atom: string; jsonFeed: string }> {
  const channel = feedChannel(masthead);
  const feedItems = publicItems(items).map(feedItem);
  return Object.freeze({ rss: rss2(channel, feedItems), atom: atom(channel, feedItems), jsonFeed: jsonFeed(channel, feedItems) });
}

// ---------- sitemaps + robots ----------

/** The site sitemap: the homepage plus every public item. */
export function millSitemap(masthead: MillMasthead, items: readonly MillItem[]): string {
  const urls: SitemapUrl[] = [
    { loc: masthead.siteUrl, changefreq: "daily", priority: 1 },
    ...publicItems(items).map((item): SitemapUrl => ({ loc: item.url, ...(item.published === undefined ? {} : { lastmod: item.published }) })),
  ];
  return sitemap(urls);
}

/** The Google News sitemap: every public, dated item. */
export function millNewsSitemap(masthead: MillMasthead, items: readonly MillItem[]): string {
  const urls: NewsSitemapUrl[] = publicItems(items)
    .filter((item): item is MillItem & { published: string } => item.published !== undefined)
    .map((item) => ({
      loc: item.url,
      publication: { name: masthead.publication.name, language: masthead.publication.language },
      publicationDate: item.published,
      title: item.headline,
    }));
  return newsSitemap(urls);
}

/** robots.txt pointing at both sitemaps under the masthead's host. */
export function millRobots(masthead: MillMasthead): string {
  return robots({ sitemap: [`${masthead.siteUrl}/sitemap.xml`, `${masthead.siteUrl}/news-sitemap.xml`], host: masthead.siteUrl });
}

// ---------- per-item: JSON-LD, h-entry body, ninjs ----------

function publisherIdentity(masthead: MillMasthead): JsonLdPublisher {
  return { name: masthead.publisher.name, ...(masthead.publisher.url === undefined ? {} : { url: masthead.publisher.url }) };
}

/** Project a wire item into the JSON-LD codec's NewsArticle input. */
function articleInput(item: MillItem): NewsArticleInput {
  return {
    headline: item.headline,
    url: item.url,
    ...(item.summary ? { summary: item.summary } : {}),
    ...(item.published === undefined ? {} : { published: item.published }),
    ...(item.author === undefined ? {} : { author: item.authorUrl === undefined ? item.author : { name: item.author, url: item.authorUrl } }),
    ...(item.published === undefined ? {} : { updated: item.published }),
    ...(item.section === undefined ? {} : { section: item.section }),
    ...(item.keywords.length > 0 ? { keywords: item.keywords } : {}),
    ...(item.image === undefined ? {} : { image: item.image }),
    ...(item.imageWidth === undefined ? {} : { imageWidth: item.imageWidth }),
    ...(item.imageHeight === undefined ? {} : { imageHeight: item.imageHeight }),
  };
}

/** The item's NewsArticle JSON-LD `<script>` embedding (the discovery
 * projection), under the masthead's publisher. */
export function millJsonLd(item: MillItem, masthead: MillMasthead): string {
  return newsArticleScript(articleInput(item), publisherIdentity(masthead));
}

/**
 * One item's distribution body: the h-entry (headline, summary, provenance
 * line, content), a hidden permalink, and the NewsArticle JSON-LD. Returns the
 * inner HTML only — a site wraps it in its own theme (the web layer); the mill
 * stays web-free.
 */
export function millItemBody(item: MillItem, masthead: MillMasthead): string {
  const meta = [
    item.published ? `<time class="dt-published" datetime="${escapeHtml(item.published)}">${escapeHtml(item.published)}</time>` : "",
    item.author ? `<span class="p-author">${escapeHtml(item.author)}</span>` : "",
  ].filter(Boolean).join(" · ");
  return [
    `<article class="h-entry">`,
    `<h1 class="p-name">${escapeHtml(item.headline)}</h1>`,
    item.summary ? `<p class="p-summary">${escapeHtml(item.summary)}</p>` : "",
    meta ? `<p class="story__meta">${meta}</p>` : "",
    `<div class="e-content">${item.bodyHtml}</div>`,
    `<a class="u-url" href="${escapeHtml(item.url)}" hidden>permalink</a>`,
    "</article>",
    millJsonLd(item, masthead),
  ].filter(Boolean).join("\n");
}

/** The item as an IPTC ninjs artifact (the syndication-codec projection). */
export function millNinjs(item: MillItem, masthead: MillMasthead): NewsCodecArtifact {
  return createNinjsArtifact(item.subject, {
    uri: item.url,
    title: item.headline,
    ...(item.summary ? { description: item.summary } : {}),
    body: { html: item.bodyHtml },
    ...(item.author === undefined ? {} : { by: item.author }),
    language: masthead.language,
    ...(item.published === undefined ? {} : { firstCreated: item.published, versionCreated: item.published }),
    pubStatus: item.isPublic ? "usable" : "withheld",
    ...(item.keywords.length > 0 ? { subjects: item.keywords } : {}),
  });
}

// ---------- the editorial-gate audit ----------

/** The editorial gate report for every shipped subject — a public audit. */
export function millAudit(sources: readonly MillSource[]): readonly GateReport[] {
  return Object.freeze(sources
    .filter((source) => currentPublicationStatus(source.claimSet) === PUBLISHED)
    .map((source) => editorialGateReport(source.claimSet)));
}

// ---------- the formed surface set ----------

/** Every distribution artifact the mill forms for a publication — strings and
 * plain objects, web-free. A site mounts each on HTTP. */
export type MillSurfaces = Readonly<{
  feeds: Readonly<{ rss: string; atom: string; jsonFeed: string }>;
  sitemap: string;
  newsSitemap: string;
  robots: string;
  audit: readonly GateReport[];
  items: readonly Readonly<{ item: MillItem; body: string; jsonLd: string; ninjs: NewsCodecArtifact }>[];
}>;

/**
 * Form the full distribution surface set for a publication from its wire items
 * and the sources behind them (for the audit). Pure: the result is data, ready
 * for a site to mount on transport.
 */
export function millSurfaces(masthead: MillMasthead, items: readonly MillItem[], sources: readonly MillSource[] = []): MillSurfaces {
  return Object.freeze({
    feeds: millFeeds(masthead, items),
    sitemap: millSitemap(masthead, items),
    newsSitemap: millNewsSitemap(masthead, items),
    robots: millRobots(masthead),
    audit: millAudit(sources),
    items: Object.freeze(publicItems(items).map((item) => Object.freeze({
      item,
      body: millItemBody(item, masthead),
      jsonLd: millJsonLd(item, masthead),
      ninjs: millNinjs(item, masthead),
    }))),
  });
}
