// surface.mts — koios's wire surfaces, mounted at the site over the content
// mill.
//
// The forming is no longer koios's job: @emsenn/content-production/content-mill
// turns a publication's masthead + claim sets into the distribution artifacts
// (feeds, sitemaps, robots, NewsArticle JSON-LD, h-entry bodies, ninjs, and the
// editorial-gate audit) web-free. This file is the thin transport mount: it
// projects KoiosPosts into mill sources, applies koios's theme to the formed
// item bodies, and exposes each artifact as a web Resource. "Render at site":
// content-production stays web-free; the HTTP transport is applied here.

import { render, type Theme, type ThemeContext } from "@emsenn/computing-with-the-web/theming";
import type { Resource } from "@emsenn/http-server";
import { type GateReport } from "@emsenn/content/topology/news";
import {
  millItem,
  millItems,
  publicItems,
  millFeeds,
  millSitemap,
  millNewsSitemap,
  millRobots,
  millItemBody,
  millNinjs,
  millAudit,
  type MillItem,
  type MillMasthead,
  type MillSource,
} from "@emsenn/content-production/content-mill";

import type { IptcCode } from "@emsenn/content/codecs/ninjs";

import type { KoiosPost } from "./content.mjs";
import { topicSubject } from "./researching/sourcing/topics.mjs";
import { articleFingerprintFigure, articleFingerprintJson, articleFingerprintPng, articleFingerprintSvg } from "./fingerprint.mjs";
import { escapeHtml } from "./markdown.mjs";
import { correctionRecordsForPost } from "./researching/writing/editing/publishing/managing/circulating/corrections.mjs";
import { aAdsSlotHtml, chooseAAdsUnit, type KoiosThemeContext } from "./theme.mjs";

/** The site identity the surfaces render under — the mill's masthead, plus the
 * koios theme the item pages are wrapped in. */
export type KoiosMasthead = MillMasthead & Readonly<{
  theme?: Theme;
  themeContext?: ThemeContext;
}>;

/** A post projected for the wire surfaces — the mill's lossy item view. */
export type KoiosItem = MillItem;

export { publicItems };

const FINGERPRINT_IMAGE_TYPE = "image/png";
const FINGERPRINT_IMAGE_WIDTH = 1200;
const FINGERPRINT_IMAGE_HEIGHT = 675;

function fingerprintPngPath(slug: string): string {
  return `/fingerprints/${encodeURIComponent(slug)}.png`;
}

function fingerprintPngUrl(slug: string, masthead: KoiosMasthead): string {
  return `${masthead.siteUrl}${fingerprintPngPath(slug)}`;
}

/** The mill source behind a post: its claim set, slug, and rendered body. */
function sourceOf(post: KoiosPost, masthead?: KoiosMasthead): MillSource {
  return {
    claimSet: post.claimSet,
    slug: post.slug,
    bodyHtml: post.wireInput.bodyHtml,
    ...(masthead === undefined ? {} : {
      image: fingerprintPngUrl(post.slug, masthead),
      imageWidth: FINGERPRINT_IMAGE_WIDTH,
      imageHeight: FINGERPRINT_IMAGE_HEIGHT,
      ...(masthead.author.url === undefined ? {} : { authorUrl: masthead.author.url }),
    }),
  };
}

/** Project one post into a wire item by reading the cells koios wrote. */
export function koiosItem(post: KoiosPost, masthead: KoiosMasthead): KoiosItem {
  return millItem(sourceOf(post, masthead), masthead);
}

/** Every post as a wire item. */
export function koiosItems(posts: readonly KoiosPost[], masthead: KoiosMasthead): readonly KoiosItem[] {
  return millItems(posts.map((post) => sourceOf(post, masthead)), masthead);
}

/** The three feed serializations over the public items. */
export function koiosFeeds(masthead: KoiosMasthead, items: readonly KoiosItem[]): Readonly<{ rss: string; atom: string; jsonFeed: string }> {
  return millFeeds(masthead, items);
}

/** The gate report for every shipped post: koios's editorial gates are public. */
export function auditReports(posts: readonly KoiosPost[]): readonly GateReport[] {
  return millAudit(posts.map((post) => sourceOf(post)));
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function articleAdUnits(post: KoiosPost): Readonly<{ aAds?: string }> | undefined {
  const koios = record(post.document.frontMatter["koios"]);
  const units = record(koios["ad_units"]);
  const aAds = units["a_ads"];
  return typeof aAds === "string" && aAds.trim() !== ""
    ? Object.freeze({ aAds: aAds.trim() })
    : undefined;
}

function mastheadAAdsUnits(masthead: KoiosMasthead): readonly string[] | undefined {
  return (masthead.themeContext as KoiosThemeContext | undefined)?.aAdsUnits;
}

function articleBannerAd(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): string {
  return aAdsSlotHtml(effectiveArticleAdUnits(post, item, masthead)?.aAds, "article-banner");
}

function effectiveArticleAdUnits(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): Readonly<{ aAds?: string }> | undefined {
  const aAds = articleAdUnits(post)?.aAds ?? chooseAAdsUnit(item.slug, mastheadAAdsUnits(masthead));
  return aAds === undefined ? undefined : Object.freeze({ aAds });
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function postTags(post: KoiosPost): readonly string[] {
  return strings(post.document.frontMatter["tags"]);
}

function postCategories(post: KoiosPost): readonly string[] {
  return strings(post.document.frontMatter["categories"]);
}

function normalizedSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map((value) => value.toLowerCase()).filter((value) => value.length > 0));
}

function sharedValues(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightSet = normalizedSet(right);
  return Object.freeze(left.filter((value) => rightSet.has(value.toLowerCase())));
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return Object.freeze(values.filter((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}

function relatedStoriesHtml(post: KoiosPost, item: KoiosItem, items: readonly KoiosItem[], posts: readonly KoiosPost[]): string {
  const postsBySlug = new Map(posts.map((candidate) => [candidate.slug, candidate]));
  const sourceTags = postTags(post);
  const sourceCategories = postCategories(post);
  const related = publicItems(items)
    .filter((candidate) => candidate.slug !== item.slug)
    .flatMap((candidate) => {
      const candidatePost = postsBySlug.get(candidate.slug);
      if (candidatePost === undefined) return [];
      const sharedTags = sharedValues(sourceTags, postTags(candidatePost));
      const sharedCategories = sharedValues(sourceCategories, postCategories(candidatePost));
      const sameSection = item.section !== undefined && candidate.section !== undefined && item.section.toLowerCase() === candidate.section.toLowerCase();
      const score = (sharedTags.length * 4) + (sharedCategories.length * 2) + (sameSection ? 1 : 0);
      if (score === 0) return [];
      return [Object.freeze({ item: candidate, sharedTags, sharedCategories, sameSection, score })];
    })
    .sort((left, right) => right.score - left.score || (right.item.published ?? "").localeCompare(left.item.published ?? "") || left.item.headline.localeCompare(right.item.headline))
    .slice(0, 3);
  if (related.length === 0) return "";
  const cards = related.map((entry) => {
    const evidence = [
      ...entry.sharedTags,
      ...entry.sharedCategories,
      entry.sameSection && entry.item.section ? entry.item.section : "",
    ].filter(Boolean);
    return [
      `<article class="related-story">`,
      `<h3><a href="${escapeHtml(entry.item.url)}">${escapeHtml(entry.item.headline)}</a></h3>`,
      `<p>${escapeHtml(entry.item.summary)}</p>`,
      evidence.length === 0 ? "" : `<p class="related-story__meta">${evidence.slice(0, 4).map(escapeHtml).join(" · ")}</p>`,
      `</article>`,
    ].filter(Boolean).join("\n");
  }).join("\n");
  return [
    `<aside class="related-stories" aria-labelledby="related-stories-title">`,
    `<h2 id="related-stories-title">Related Stories</h2>`,
    `<div class="related-stories__grid">${cards}</div>`,
    `</aside>`,
  ].join("\n");
}

function correctionKindLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function correctionNoticeHtml(post: KoiosPost, item: KoiosItem): string {
  const corrections = correctionRecordsForPost(post, item);
  if (corrections.length === 0) return "";
  const entries = corrections.map((correction) => [
    `<li>`,
    `<strong>${escapeHtml(correctionKindLabel(correction.kind))}</strong> `,
    `<time datetime="${escapeHtml(correction.correctedAt)}">${escapeHtml(correction.correctedAt)}</time>: `,
    `${escapeHtml(correction.summary)}`,
    correction.details === undefined ? "" : `<br><span>${escapeHtml(correction.details)}</span>`,
    `</li>`,
  ].filter(Boolean).join("")).join("\n");
  return [
    `<aside class="correction-notice" aria-labelledby="correction-notice-title">`,
    `<h2 id="correction-notice-title">Corrections</h2>`,
    `<ol>${entries}</ol>`,
    `<p><a href="/corrections">Correction register</a></p>`,
    `</aside>`,
  ].join("\n");
}

function articleRightsHtml(post: KoiosPost, item: KoiosItem): string {
  const license = maybeString(post.document.frontMatter["license"]);
  const licenseUrl = maybeString(post.document.frontMatter["license_url"]);
  const syndicationRights = maybeString(post.document.frontMatter["syndication_rights"]);
  if (license === undefined && licenseUrl === undefined && syndicationRights === undefined) return "";
  const licenseText = licenseUrl === undefined
    ? escapeHtml(license ?? "Declared license")
    : `<a rel="license" href="${escapeHtml(licenseUrl)}">${escapeHtml(license ?? licenseUrl)}</a>`;
  return [
    `<aside class="article-rights" aria-labelledby="article-rights-title">`,
    `<h2 id="article-rights-title">Rights and republication</h2>`,
    `<p>This article is published under ${licenseText}. Reuse should credit ${escapeHtml(item.author ?? "Koios.News")} and link the canonical article URL: <a href="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a>.</p>`,
    syndicationRights === undefined ? "" : `<p>${escapeHtml(syndicationRights)}</p>`,
    `</aside>`,
  ].filter(Boolean).join("\n");
}

/** One item page: the mill's formed body (h-entry + provenance + NewsArticle
 * JSON-LD), wrapped in the masthead's theme. */
export function itemPageHtml(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead, theme: Theme, items: readonly KoiosItem[] = Object.freeze([]), posts: readonly KoiosPost[] = Object.freeze([])): string {
  const related = relatedStoriesHtml(post, item, items, posts);
  const corrections = correctionNoticeHtml(post, item);
  const rights = articleRightsHtml(post, item);
  return render(theme, `${articleFingerprintFigure(item)}\n${articleBannerAd(post, item, masthead)}${corrections === "" ? "" : `\n${corrections}`}\n${millItemBody(item, masthead)}${rights === "" ? "" : `\n${rights}`}${related === "" ? "" : `\n${related}`}`, {
    title: `${item.headline} — ${masthead.title}`,
    siteName: masthead.title,
    description: item.summary || masthead.description,
    canonical: item.url,
    lang: masthead.language,
    author: item.author ?? masthead.author.name,
    nav: [{ href: "/", label: "Posts" }, { href: "/topics", label: "Topics" }, { href: "/archive", label: "Archive" }, { href: "/corrections", label: "Corrections" }, { href: "/about", label: "About" }, { href: "/feed.xml", label: "RSS" }],
    ...masthead.themeContext,
    suppressMastheadAAds: true,
    socialImage: fingerprintPngPath(item.slug),
    socialImageType: FINGERPRINT_IMAGE_TYPE,
    socialImageAlt: item.headline,
    articlePublishedTime: item.published,
    articleModifiedTime: item.published,
    articleAuthor: masthead.author.url,
    articleSection: item.section,
    articleTags: uniqueStrings([...item.keywords, ...postTags(post), ...postCategories(post)]),
    articleFingerprintJson: `/fingerprints/${encodeURIComponent(item.slug)}.json`,
    articleAdUnits: effectiveArticleAdUnits(post, item, masthead),
  });
}

// ---------- the surface resources ----------

const ok = (type: string, body: string | Buffer): { status: number; type: string; body: string | Buffer } => ({ status: 200, type, body });

const MEDTOP_SCHEME = "http://cv.iptc.org/newscodes/mediatopic/";

/** The post's IPTC Media Topic as a coded NINJS subject, from its beat. */
function postTopicSubject(post: KoiosPost | undefined): IptcCode | null {
  if (post === undefined) return null;
  const koios = post.document.frontMatter["koios"];
  const beat = koios !== null && typeof koios === "object" && !Array.isArray(koios)
    ? (koios as Record<string, unknown>)["beat"]
    : undefined;
  if (typeof beat !== "string") return null;
  const subject = topicSubject(beat);
  return subject === null ? null : Object.freeze({ name: subject.name, code: subject.code, scheme: MEDTOP_SCHEME });
}

/** Every wire surface as web Resources: the three feeds, both sitemaps, robots,
 * the ninjs records, the gate audit, and the item pages. The homepage/about/etc
 * are the site's own (index.mts); these are the wire's distribution surfaces. */
export function surfaceResources(masthead: KoiosMasthead, items: readonly KoiosItem[], posts: readonly KoiosPost[], theme: Theme): readonly Resource[] {
  const feeds = millFeeds(masthead, items);
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  // The post's beat is an IPTC Media Topic; carry its medtop QCode as the
  // record's leading NINJS subject (the keyword strings follow as named
  // subjects). "subjects" in NINJS, "Topics" public-facing.
  const ninjsRecords = publicItems(items).map((item) => {
    const record = millNinjs(item, masthead).record;
    const subject = postTopicSubject(postsBySlug.get(item.slug));
    if (subject === null) return record;
    const existing = Array.isArray(record.subject) ? record.subject : [];
    return Object.freeze({ ...record, subject: Object.freeze([subject, ...existing]) });
  });
  const itemPathAtom = masthead.itemPath.replace(/^\/+|\/+$/g, "");
  return [
    { id: "koios.feed.rss", name: "RSS Feed", route: "/feed.xml", match: "/feed.xml", methods: ["GET"], produces: ["application/rss+xml"], handler: async () => ok("application/rss+xml; charset=utf-8", feeds.rss) },
    { id: "koios.feed.atom", name: "Atom Feed", route: "/feed.atom", match: "/feed.atom", methods: ["GET"], produces: ["application/atom+xml"], handler: async () => ok("application/atom+xml; charset=utf-8", feeds.atom) },
    { id: "koios.feed.json", name: "JSON Feed", route: "/feed.json", match: "/feed.json", methods: ["GET"], produces: ["application/feed+json"], handler: async () => ok("application/feed+json; charset=utf-8", feeds.jsonFeed) },
    { id: "koios.sitemap", name: "Sitemap", route: "/sitemap.xml", match: "/sitemap.xml", methods: ["GET"], produces: ["application/xml"], handler: async () => ok("application/xml; charset=utf-8", millSitemap(masthead, items)) },
    { id: "koios.news-sitemap", name: "News Sitemap", route: "/news-sitemap.xml", match: "/news-sitemap.xml", methods: ["GET"], produces: ["application/xml"], handler: async () => ok("application/xml; charset=utf-8", millNewsSitemap(masthead, items)) },
    { id: "koios.robots", name: "Robots", route: "/robots.txt", match: "/robots.txt", methods: ["GET"], produces: ["text/plain"], handler: async () => ok("text/plain; charset=utf-8", millRobots(masthead)) },
    { id: "koios.ninjs", name: "ninjs Records", route: "/ninjs.json", match: "/ninjs.json", methods: ["GET"], produces: ["application/vnd.iptc.ninjs+json"], handler: async () => ok("application/vnd.iptc.ninjs+json; charset=utf-8", JSON.stringify(ninjsRecords)) },
    { id: "koios.audit", name: "Editorial Gate Audit", route: "/newswire-audit.json", match: "/newswire-audit.json", methods: ["GET"], produces: ["application/json"], handler: async () => ok("application/json; charset=utf-8", JSON.stringify(auditReports(posts))) },
    {
      id: "koios.fingerprint",
      name: "Article Fingerprint",
      route: "/fingerprints/:slug.svg",
      match: /^\/fingerprints\/[^/]+\.svg$/,
      methods: ["GET"],
      produces: ["image/svg+xml"],
      handler: async (ctx) => {
        const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
        const slug = decodeURIComponent(file.replace(/\.svg$/, ""));
        const item = bySlug.get(slug);
        const post = postsBySlug.get(slug);
        if (item === undefined || post === undefined || !item.isPublic) return { status: 404, type: "text/plain; charset=utf-8", body: "no such fingerprint\n" };
        return ok("image/svg+xml; charset=utf-8", articleFingerprintSvg(post, item, masthead));
      },
    },
    {
      id: "koios.fingerprint-png",
      name: "Article Fingerprint PNG",
      route: "/fingerprints/:slug.png",
      match: /^\/fingerprints\/[^/]+\.png$/,
      methods: ["GET"],
      produces: ["image/png"],
      handler: async (ctx) => {
        const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
        const slug = decodeURIComponent(file.replace(/\.png$/, ""));
        const item = bySlug.get(slug);
        const post = postsBySlug.get(slug);
        if (item === undefined || post === undefined || !item.isPublic) return { status: 404, type: "text/plain; charset=utf-8", body: "no such fingerprint\n" };
        return ok("image/png", articleFingerprintPng(post, item, masthead));
      },
    },
    {
      id: "koios.fingerprint-json",
      name: "Article Fingerprint Carrier",
      route: "/fingerprints/:slug.json",
      match: /^\/fingerprints\/[^/]+\.json$/,
      methods: ["GET"],
      produces: ["application/ld+json"],
      handler: async (ctx) => {
        const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
        const slug = decodeURIComponent(file.replace(/\.json$/, ""));
        const item = bySlug.get(slug);
        const post = postsBySlug.get(slug);
        if (item === undefined || post === undefined || !item.isPublic) return { status: 404, type: "text/plain; charset=utf-8", body: "no such fingerprint\n" };
        return ok("application/ld+json; charset=utf-8", articleFingerprintJson(post, item, masthead));
      },
    },
    {
      id: "koios.item",
      name: "Post",
      route: `/${itemPathAtom}/:slug`,
      match: new RegExp(`^/${itemPathAtom}/[^/]+$`),
      methods: ["GET"],
      produces: ["text/html"],
      handler: async (ctx) => {
        const slug = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
        const item = bySlug.get(slug);
        const post = postsBySlug.get(slug);
        if (item === undefined || post === undefined || !item.isPublic) return { status: 404, type: "text/plain; charset=utf-8", body: "no such post\n" };
        return ok("text/html; charset=utf-8", itemPageHtml(post, item, masthead, theme, items, posts));
      },
    },
  ];
}
