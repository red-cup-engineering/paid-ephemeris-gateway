/**
 * feed — syndication-format serializers (the distribution projection). Pure
 * functors from a feed channel + items to RSS 2.0, Atom, JSON Feed, sitemaps,
 * a news sitemap, and robots.txt — plus the RFC-3339 instant helpers and XML
 * escapers they share.
 *
 * These are serialization formats, not transport: they live here in the shared
 * hub (content), reachable by content-production (which forms the artifact) and
 * by web (which mounts it on HTTP — `webSubLinkHeader`, `feedApp` stay there).
 * Codec law (L4): pure over values, no network/filesystem/clock — time enters
 * as RFC-3339 string parameters.
 */

export type FeedAuthor = {
  name: string;
  url?: string;
  email?: string;
};

export type FeedChannel = {
  id?: string;
  title: string;
  homePageUrl: string;
  feedUrl: string;
  description?: string;
  author?: FeedAuthor;
  language?: string;
  updated?: string;
  iconUrl?: string;
  webSub?: WebSubDiscovery;
};

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  contentHtml?: string;
  summary?: string;
  author?: FeedAuthor;
  published?: string;
  updated?: string;
  tags?: readonly string[];
  imageUrl?: string;
  language?: string;
};

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export type SitemapRef = {
  loc: string;
  lastmod?: string;
};

export type NewsSitemapPublication = {
  name: string;
  language: string;
};

export type NewsSitemapUrl = {
  loc: string;
  publication: NewsSitemapPublication;
  publicationDate: string;
  title: string;
};

export type WebSubDiscovery = {
  hub: string;
  self?: string;
};

export type RobotsGroup = {
  userAgent: string | readonly string[];
  allow?: readonly string[];
  disallow?: readonly string[];
  crawlDelay?: number;
};

export type RobotsOptions = {
  groups?: readonly RobotsGroup[];
  sitemap?: string | readonly string[];
  host?: string;
};

export type FeedPagingLinks = {
  self?: string;
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
  complete?: boolean;
};

export type FeedPage = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: readonly FeedItem[];
  links: FeedPagingLinks;
};

export type FeedPagingOptions = {
  pageSize: number;
  pageParam?: string;
};

const JSON_FEED_VERSION = "https://jsonfeed.org/version/1.1";
export const MAX_URLS_PER_SITEMAP = 50_000;

const CHANGEFREQ = new Set<SitemapUrl["changefreq"]>(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);

export function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const escapeXmlAttr = escapeXml;
export const escapeHtml = escapeXml;

export function assertHttpUrl(value: string, field: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
  } catch {
    throw new TypeError(`${field} must be an absolute http(s) URL`);
  }
}

const assertAbsoluteUrl = assertHttpUrl;

// Site-composition utility belt — one copy shared by the garden and blog
// specializations, which used to carry byte-identical private versions.

export function escapeHtmlText(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function joinUrl(base: string, path = ""): string {
  const left = String(base ?? "").replace(/\/+$/, "");
  const right = String(path ?? "").replace(/^\/+/, "");
  return right ? `${left}/${right}` : left;
}

export function slugify(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePath(path: string | undefined, fallback: string): string {
  const raw = String(path ?? fallback).trim();
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

export function scalars(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((item) => scalars(item));
  return [String(value)];
}

export function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function parseRfc3339(value: string): number {
  if (typeof value !== "string") throw new TypeError("date must be an RFC-3339 instant");
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new TypeError(`date must be an RFC-3339 instant: ${value}`);
  const [, year, month, day, hour, minute, second, fraction, offset] = match;
  let millis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    fraction ? Math.round(Number(fraction) * 1000) : 0,
  );
  if (offset !== "Z" && offset !== "z") {
    const sign = offset?.[0] === "-" ? -1 : 1;
    const offsetHours = Number(offset?.slice(1, 3));
    const offsetMinutes = Number(offset?.slice(4, 6));
    millis -= sign * (offsetHours * 60 + offsetMinutes) * 60_000;
  }
  if (!Number.isFinite(millis)) throw new TypeError(`date must be an RFC-3339 instant: ${value}`);
  return millis;
}

function instant(value: string, field: string): Date {
  try {
    return new Date(parseRfc3339(value));
  } catch {
    throw new TypeError(`${field} must be an RFC-3339 instant`);
  }
}

const IMF_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const IMF_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** An instant as an IMF-fixdate (RFC 7231 / RFC 822 GMT) — `Sun, 06 Nov 1994
 * 08:49:37 GMT`. The same wire form HTTP `Date`/`Last-Modified` headers carry;
 * formed here purely so the feed codec stays free of the transport layer. */
export function imfFixdate(date: Date): string {
  return `${IMF_DAYS[date.getUTCDay()]}, ${pad(date.getUTCDate(), 2)} ${IMF_MONTHS[date.getUTCMonth()]} ${pad(date.getUTCFullYear(), 4)} ${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)} GMT`;
}

export function rfc3339ToRfc822(value: string): string {
  // RSS pubDate / lastBuildDate is IMF-fixdate (GMT) — byte-identical to the
  // HTTP Date wire form, but formed here so the codec carries no web dependency.
  return imfFixdate(instant(value, "date"));
}

export function rfc3339ToUtc(value: string): string {
  const date = instant(value, "date");
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}T${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}Z`;
}

export function rfc3339ToDate(value: string): string {
  return instant(value, "date").toISOString().slice(0, 10);
}

function requireChannel(channel: FeedChannel): void {
  if (!channel.title) throw new TypeError("channel.title is required");
  assertAbsoluteUrl(channel.homePageUrl, "channel.homePageUrl");
  assertAbsoluteUrl(channel.feedUrl, "channel.feedUrl");
  if (channel.updated) instant(channel.updated, "channel.updated");
  if (channel.iconUrl) assertAbsoluteUrl(channel.iconUrl, "channel.iconUrl");
  if (channel.webSub) {
    assertAbsoluteUrl(channel.webSub.hub, "channel.webSub.hub");
    if (channel.webSub.self) assertAbsoluteUrl(channel.webSub.self, "channel.webSub.self");
  }
}

function requireItem(item: FeedItem): void {
  if (!item.id) throw new TypeError("item.id is required");
  if (!item.title) throw new TypeError("item.title is required");
  assertAbsoluteUrl(item.url, "item.url");
  if (item.published) instant(item.published, "item.published");
  if (item.updated) instant(item.updated, "item.updated");
}

export function effectiveAuthor(item: FeedItem, channel?: FeedChannel): FeedAuthor | undefined {
  return item.author ?? channel?.author;
}

export function effectiveUpdated(item: FeedItem): string | undefined {
  return item.updated ?? item.published;
}

export function feedUpdated(channel: FeedChannel, items: readonly FeedItem[]): string | undefined {
  if (channel.updated) return channel.updated;
  return items
    .map((item) => effectiveUpdated(item))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => parseRfc3339(a) - parseRfc3339(b))
    .at(-1);
}

function element(name: string, value: unknown, indent = "    "): string {
  if (value === undefined || value === null || value === "") return "";
  return `${indent}<${name}>${escapeXml(value)}</${name}>`;
}

function person(tag: string, author: FeedAuthor | undefined, indent: string): string {
  if (!author?.name) return "";
  return [
    `${indent}<${tag}>`,
    `${indent}  <name>${escapeXml(author.name)}</name>`,
    author.url ? `${indent}  <uri>${escapeXml(author.url)}</uri>` : "",
    author.email ? `${indent}  <email>${escapeXml(author.email)}</email>` : "",
    `${indent}</${tag}>`,
  ].filter(Boolean).join("\n");
}

function pagingAtomLinks(links: FeedPagingLinks, indent = "  ", prefix = ""): string[] {
  const tag = `${prefix}link`;
  return [
    links.self ? `${indent}<${tag} href="${escapeXml(links.self)}" rel="self"/>` : "",
    links.first ? `${indent}<${tag} href="${escapeXml(links.first)}" rel="first"/>` : "",
    links.previous ? `${indent}<${tag} href="${escapeXml(links.previous)}" rel="previous"/>` : "",
    links.next ? `${indent}<${tag} href="${escapeXml(links.next)}" rel="next"/>` : "",
    links.last ? `${indent}<${tag} href="${escapeXml(links.last)}" rel="last"/>` : "",
  ].filter(Boolean);
}

export function webSubLinks(channel: FeedChannel): Required<WebSubDiscovery> | undefined {
  requireChannel(channel);
  if (!channel.webSub) return undefined;
  return {
    hub: channel.webSub.hub,
    self: channel.webSub.self ?? channel.feedUrl,
  };
}

export function rss2(channel: FeedChannel, items: readonly FeedItem[] = [], paging: FeedPagingLinks = {}): string {
  requireChannel(channel);
  for (const item of items) requireItem(item);
  const built = feedUpdated(channel, items);
  const head = [
    element("title", channel.title),
    element("link", channel.homePageUrl),
    element("description", channel.description ?? channel.title),
    element("language", channel.language),
    built ? element("lastBuildDate", rfc3339ToRfc822(built)) : "",
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    channel.webSub ? `    <atom:link href="${escapeXml(channel.webSub.hub)}" rel="hub"/>` : "",
    ...pagingAtomLinks(paging, "    ", "atom:"),
    paging.complete ? "    <fh:complete/>" : "",
  ].filter(Boolean).join("\n");

  const body = items.map((item) => rssItem(item, channel)).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:fh="http://purl.org/syndication/history/1.0">
  <channel>
${head}
${body ? `${body}\n` : ""}  </channel>
</rss>
`;
}

export function rssItem(item: FeedItem, channel?: FeedChannel): string {
  requireItem(item);
  const author = effectiveAuthor(item, channel);
  const indent = "      ";
  return [
    "    <item>",
    element("title", item.title, indent),
    element("link", item.url, indent),
    `${indent}<guid isPermaLink="${item.id === item.url ? "true" : "false"}">${escapeXml(item.id)}</guid>`,
    item.published ? element("pubDate", rfc3339ToRfc822(item.published), indent) : "",
    author ? element("dc:creator", author.name, indent) : "",
    element("description", item.summary, indent),
    item.contentHtml ? `${indent}<content:encoded>${escapeXml(item.contentHtml)}</content:encoded>` : "",
    ...(item.tags ?? []).map((tag) => element("category", tag, indent)),
    "    </item>",
  ].filter(Boolean).join("\n");
}

export function atom(channel: FeedChannel, items: readonly FeedItem[] = [], paging: FeedPagingLinks = {}): string {
  requireChannel(channel);
  for (const item of items) requireItem(item);
  const updated = feedUpdated(channel, items);
  if (!updated) throw new TypeError("atom feed requires at least one item instant");
  const entries = items.map((item) => atomEntry(item, channel)).join("\n");
  const pagingLinks = pagingAtomLinks(paging).join("\n");
  const historyNamespace = paging.complete ? ` xmlns:fh="http://purl.org/syndication/history/1.0"` : "";
  const language = channel.language ? ` xml:lang="${escapeXml(channel.language)}"` : "";
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"${historyNamespace}${language}>
  <title>${escapeXml(channel.title)}</title>
${channel.description ? `  <subtitle>${escapeXml(channel.description)}</subtitle>` : ""}
  <link rel="self" type="application/atom+xml" href="${escapeXml(channel.feedUrl)}"/>
${channel.webSub ? `  <link rel="hub" href="${escapeXml(channel.webSub.hub)}"/>` : ""}
  <link rel="alternate" type="text/html" href="${escapeXml(channel.homePageUrl)}"/>
${pagingLinks}
${paging.complete ? "  <fh:complete/>" : ""}
  <id>${escapeXml(channel.id ?? channel.feedUrl)}</id>
  <updated>${escapeXml(rfc3339ToUtc(updated))}</updated>
${channel.author ? `${person("author", channel.author, "  ")}\n` : ""}${channel.iconUrl ? `  <icon>${escapeXml(channel.iconUrl)}</icon>\n` : ""}  <generator uri="https://github.com/emsenn/561-group">561-group/web-feed</generator>
${entries}
</feed>
`;
}

export function atomEntry(item: FeedItem, channel?: FeedChannel): string {
  requireItem(item);
  const updated = item.updated ?? item.published;
  if (!updated) throw new TypeError("atom entry requires published or updated");
  const author = effectiveAuthor(item, channel);
  return `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(item.url)}"/>
    <id>${escapeXml(item.id)}</id>
    ${item.published ? `<published>${escapeXml(rfc3339ToUtc(item.published))}</published>` : ""}
    <updated>${escapeXml(rfc3339ToUtc(updated))}</updated>
    ${author ? `<author><name>${escapeXml(author.name)}</name>${author.url ? `<uri>${escapeXml(author.url)}</uri>` : ""}${author.email ? `<email>${escapeXml(author.email)}</email>` : ""}</author>` : ""}
    ${item.summary ? `<summary type="html">${escapeHtml(item.summary)}</summary>` : ""}
    ${item.contentHtml ? `<content type="html">${escapeXml(item.contentHtml)}</content>` : ""}
    ${(item.tags ?? []).map((tag) => `<category term="${escapeXml(tag)}"/>`).join("\n    ")}
  </entry>`;
}

export function jsonFeedObject(channel: FeedChannel, items: readonly FeedItem[] = [], paging: FeedPagingLinks = {}): Record<string, unknown> {
  requireChannel(channel);
  for (const item of items) requireItem(item);
  const channelAuthor = channel.author ? { name: channel.author.name, ...(channel.author.url ? { url: channel.author.url } : {}) } : undefined;
  return {
    version: JSON_FEED_VERSION,
    title: channel.title,
    home_page_url: channel.homePageUrl,
    feed_url: channel.feedUrl,
    ...(channel.webSub ? { hubs: [{ type: "WebSub", url: channel.webSub.hub }] } : {}),
    ...(paging.next ? { next_url: paging.next } : {}),
    ...(channel.description ? { description: channel.description } : {}),
    ...(channel.language ? { language: channel.language } : {}),
    ...(channel.iconUrl ? { icon: channel.iconUrl } : {}),
    ...(channelAuthor ? { authors: [channelAuthor] } : {}),
    items: items.map((item) => jsonFeedItem(item, channel)),
  };
}

export function jsonFeedItem(item: FeedItem, channel?: FeedChannel): Record<string, unknown> {
  requireItem(item);
  const author = effectiveAuthor(item, channel);
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    ...(item.contentHtml ? { content_html: item.contentHtml } : {}),
    ...(item.summary ? { summary: item.summary } : {}),
    ...(item.published ? { date_published: rfc3339ToUtc(item.published) } : {}),
    ...(item.updated ? { date_modified: rfc3339ToUtc(item.updated) } : {}),
    ...(item.imageUrl ? { image: item.imageUrl } : {}),
    ...(item.language ? { language: item.language } : {}),
    ...(author ? { authors: [{ name: author.name, ...(author.url ? { url: author.url } : {}) }] } : {}),
    ...(item.tags && item.tags.length > 0 ? { tags: [...item.tags] } : {}),
  };
}

export function jsonFeed(channel: FeedChannel, items: readonly FeedItem[] = [], paging: FeedPagingLinks = {}): string {
  return `${JSON.stringify(jsonFeedObject(channel, items, paging), null, 2)}\n`;
}

export function sitemap(urls: readonly SitemapUrl[]): string {
  if (urls.length > MAX_URLS_PER_SITEMAP) throw new RangeError("sitemap cannot contain more than 50000 URLs");
  const body = urls.map((url) => {
    assertAbsoluteUrl(url.loc, "sitemap.loc");
    if (url.loc.length > 2048) throw new TypeError("sitemap.loc cannot exceed 2048 characters");
    if (url.changefreq !== undefined && !CHANGEFREQ.has(url.changefreq)) {
      throw new TypeError(`sitemap.changefreq is invalid: ${url.changefreq}`);
    }
    if (url.priority !== undefined && (url.priority < 0 || url.priority > 1)) {
      throw new RangeError("sitemap.priority must be between 0 and 1");
    }
    return [
      "  <url>",
      `    <loc>${escapeXml(url.loc)}</loc>`,
      url.lastmod ? `    <lastmod>${escapeXml(rfc3339ToDate(url.lastmod))}</lastmod>` : "",
      url.changefreq ? `    <changefreq>${escapeXml(url.changefreq)}</changefreq>` : "",
      url.priority !== undefined ? `    <priority>${Number(url.priority).toFixed(1)}</priority>` : "",
      "  </url>",
    ].filter(Boolean).join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function sitemapIndex(refs: readonly SitemapRef[]): string {
  if (refs.length > MAX_URLS_PER_SITEMAP) throw new RangeError("sitemap index cannot contain more than 50000 sitemaps");
  const body = refs.map((ref) => {
    assertAbsoluteUrl(ref.loc, "sitemapIndex.loc");
    return [
      "  <sitemap>",
      `    <loc>${escapeXml(ref.loc)}</loc>`,
      ref.lastmod ? `    <lastmod>${escapeXml(rfc3339ToDate(ref.lastmod))}</lastmod>` : "",
      "  </sitemap>",
    ].filter(Boolean).join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}

export function splitSitemaps(urls: readonly SitemapUrl[], size = MAX_URLS_PER_SITEMAP): SitemapUrl[][] {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_URLS_PER_SITEMAP) {
    throw new RangeError(`sitemap chunk size must be within 1..${MAX_URLS_PER_SITEMAP}`);
  }
  const chunks: SitemapUrl[][] = [];
  for (let index = 0; index < urls.length; index += size) {
    chunks.push(urls.slice(index, index + size));
  }
  return chunks;
}

export function newsSitemap(urls: readonly NewsSitemapUrl[]): string {
  if (urls.length > 1000) throw new RangeError("news sitemap cannot contain more than 1000 news entries");
  const body = urls.map((url) => {
    assertAbsoluteUrl(url.loc, "newsSitemap.loc");
    if (!url.publication.name) throw new TypeError("newsSitemap.publication.name is required");
    if (!url.publication.language) throw new TypeError("newsSitemap.publication.language is required");
    if (!url.title) throw new TypeError("newsSitemap.title is required");
    const publicationDate = instant(url.publicationDate, "newsSitemap.publicationDate").toISOString();
    return [
      "  <url>",
      `    <loc>${escapeXml(url.loc)}</loc>`,
      "    <news:news>",
      "      <news:publication>",
      `        <news:name>${escapeXml(url.publication.name)}</news:name>`,
      `        <news:language>${escapeXml(url.publication.language)}</news:language>`,
      "      </news:publication>",
      `      <news:publication_date>${escapeXml(publicationDate)}</news:publication_date>`,
      `      <news:title>${escapeXml(url.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    ].join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;
}

function normalizeRobotPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function robots(baseOrSitemap?: string | RobotsOptions): string {
  if (typeof baseOrSitemap === "string") {
    assertAbsoluteUrl(baseOrSitemap, "sitemap");
    return `User-agent: *
Allow: /

Sitemap: ${baseOrSitemap}
`;
  }

  const options = baseOrSitemap ?? {};
  const groups = options.groups?.length ? options.groups : [{ userAgent: "*", allow: ["/"] }];
  const lines: string[] = [];
  groups.forEach((group, index) => {
    if (index > 0) lines.push("");
    const agents = Array.isArray(group.userAgent) ? group.userAgent : [group.userAgent || "*"];
    for (const agent of agents) lines.push(`User-agent: ${agent}`);
    for (const rule of group.disallow ?? []) lines.push(`Disallow: ${normalizeRobotPath(rule)}`);
    for (const rule of group.allow ?? []) lines.push(`Allow: ${normalizeRobotPath(rule)}`);
    if (!group.disallow?.length && !group.allow?.length) lines.push("Disallow:");
    if (group.crawlDelay !== undefined) lines.push(`Crawl-delay: ${group.crawlDelay}`);
  });

  const sitemaps = options.sitemap ? Array.isArray(options.sitemap) ? options.sitemap : [options.sitemap] : [];
  if (options.host || sitemaps.length > 0) lines.push("");
  if (options.host) lines.push(`Host: ${options.host}`);
  for (const entry of sitemaps) lines.push(`Sitemap: ${entry}`);
  return `${lines.join("\n")}\n`;
}

export function defaultRobots(baseOrSitemap: string): string {
  assertAbsoluteUrl(baseOrSitemap, "sitemap");
  return `User-agent: *
Allow: /

Sitemap: ${baseOrSitemap}
`;
}

function pageUrl(base: string, pageParam: string, page: number): string {
  const url = new URL(base);
  url.searchParams.set(pageParam, String(page));
  return url.href;
}

export function feedPage(channel: FeedChannel, items: readonly FeedItem[], opts: FeedPagingOptions & { page?: number }): FeedPage {
  requireChannel(channel);
  if (!Number.isSafeInteger(opts.pageSize) || opts.pageSize <= 0) throw new RangeError("feedPage.pageSize must be a positive integer");
  const totalPages = Math.max(1, Math.ceil(items.length / opts.pageSize));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const pageParam = opts.pageParam ?? "page";
  const start = (page - 1) * opts.pageSize;
  const pageItems = items.slice(start, start + opts.pageSize);
  const first = pageUrl(channel.feedUrl, pageParam, 1);
  const last = pageUrl(channel.feedUrl, pageParam, totalPages);
  return {
    page,
    pageSize: opts.pageSize,
    totalPages,
    totalItems: items.length,
    items: pageItems,
    links: {
      self: pageUrl(channel.feedUrl, pageParam, page),
      first,
      last,
      ...(page > 1 ? { previous: pageUrl(channel.feedUrl, pageParam, page - 1) } : {}),
      ...(page < totalPages ? { next: pageUrl(channel.feedUrl, pageParam, page + 1) } : {}),
      complete: page === totalPages,
    },
  };
}
