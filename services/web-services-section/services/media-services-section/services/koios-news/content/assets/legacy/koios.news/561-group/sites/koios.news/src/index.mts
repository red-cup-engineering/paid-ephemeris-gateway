// index.mts — the Koios.News site: the wire surfaces (item pages with
// NewsArticle JSON-LD, RSS/Atom/JSON Feed, sitemaps, robots, gate audit —
// rendered at the site, see surface.mts) over the content store, plus the
// site's own readings — a summary homepage, /about, the view counter, /healthz.

import { farmLogPath } from "@emsenn/content-production/content-farm";
import { type App, type Resource } from "@emsenn/http-server";
import { render } from "@emsenn/computing-with-the-web/theming";

import { KOIOS_DESCRIPTION, KOIOS_EDITOR, KOIOS_SITE_URL, KOIOS_TAGLINE, KOIOS_TITLE, DEFAULT_CONTENT_DIR, DEFAULT_DATA_DIR } from "./config.mjs";
import { loadPosts, type KoiosPost } from "./content.mjs";
import { articleFingerprintImage } from "./fingerprint.mjs";
import { escapeHtml } from "./markdown.mjs";
import { aAdsSlotHtml, chooseAAdsUnit, DEFAULT_A_ADS_UNITS, koiosTheme, type KoiosThemeContext } from "./theme.mjs";
import { ogCardPng } from "./og-card.mjs";
import { ViewTrace, dayStamp, viewAssertion } from "./views.mjs";
import { auditReports, koiosItems, publicItems, surfaceResources, type KoiosItem, type KoiosMasthead } from "./surface.mjs";
import {
  advertisingContentSecurityPolicy,
  advertisingPolicy,
  type AdvertisingPolicy,
} from "./researching/writing/editing/publishing/managing/advertising/index.mjs";
import { bibliographyReading } from "./researching/sourcing/bibliography.mjs";
import { sourceRollReading, type SourceRollReading } from "./researching/sourcing/sources.mjs";
import { desksReading, type DesksReading } from "./researching/sourcing/desks.mjs";
import { taxonomyReading, type TaxonomyReading } from "./researching/sourcing/taxonomy.mjs";
import { circulationReading, correctionRegisterReading, type CorrectionRegisterReading } from "./researching/writing/editing/publishing/managing/circulating/index.mjs";
import { syndicationReading, coverageGraphReading } from "./researching/writing/editing/publishing/managing/syndicating/index.mjs";

/** The social card bytes, computed once per process. */
let ogCardBytes: Buffer | undefined;
function ogCard(): Buffer {
  ogCardBytes ??= ogCardPng();
  return ogCardBytes;
}

export { KOIOS_DESCRIPTION, KOIOS_EDITOR, KOIOS_SITE_URL, KOIOS_TAGLINE, KOIOS_TITLE, DEFAULT_CONTENT_DIR, DEFAULT_DATA_DIR } from "./config.mjs";

export type KoiosSiteOptions = Readonly<{
  contentDir?: string;
  dataDir?: string;
  siteUrl?: string;
  adClient?: string;
  adSlots?: KoiosThemeContext["adSlots"];
  /** Day-stamp supplier for view witnesses; defaults to wall-clock testimony. */
  day?: () => string;
}>;

export function koiosMasthead(options: KoiosSiteOptions = {}): KoiosMasthead {
  const siteUrl = options.siteUrl ?? KOIOS_SITE_URL;
  const themeContext: Record<string, unknown> = { beacon: true, year: "2025–2026", tagline: KOIOS_TAGLINE };
  if (options.adClient) {
    themeContext["adClient"] = options.adClient;
    themeContext["adSlots"] = options.adSlots ?? {};
  } else {
    themeContext["aAdsUnits"] = DEFAULT_A_ADS_UNITS;
  }
  return Object.freeze({
    title: KOIOS_TITLE,
    siteUrl,
    feedUrl: `${siteUrl}/feed.xml`,
    description: KOIOS_DESCRIPTION,
    itemPath: "posts",
    language: "en",
    author: Object.freeze({ name: KOIOS_EDITOR, url: `${siteUrl}/about` }),
    publisher: Object.freeze({ name: KOIOS_TITLE, url: siteUrl }),
    publication: Object.freeze({ name: KOIOS_TITLE, language: "en" }),
    theme: koiosTheme,
    themeContext,
  });
}

/** The site's wire items over the content store. */
export function koiosWireItems(options: KoiosSiteOptions = {}): readonly KoiosItem[] {
  const posts = loadPosts(options.contentDir ?? DEFAULT_CONTENT_DIR);
  return koiosItems(posts, koiosMasthead(options));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** "2025-03-29…" → "March 29, 2025" — the date is data; no clock is read. */
function displayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}, ${match[1]}` : iso;
}

function readMinutes(bodyHtml: string): number {
  const words = bodyHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter((word) => word.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

/** One story in the mill skin's front-page list; microformat classes ride along. */
function storyHtml(item: KoiosItem, lead: boolean): string {
  const kicker = item.section ?? item.keywords[0];
  const meta = [
    item.published ? `<time class="dt-published" datetime="${escapeHtml(item.published)}">${escapeHtml(displayDate(item.published))}</time>` : "",
    `${readMinutes(item.bodyHtml)} min read`,
  ].filter(Boolean).join(" · ");
  return [
    `<article class="story${lead ? " story--lead" : ""} h-entry">`,
    `<a class="story__image" href="${escapeHtml(item.url)}" aria-hidden="true" tabindex="-1">${articleFingerprintImage(item)}</a>`,
    kicker ? `<span class="story__kicker">${escapeHtml(kicker)}</span>` : "",
    `<h2 class="story__head"><a class="p-name u-url" href="${escapeHtml(item.url)}">${escapeHtml(item.headline)}</a></h2>`,
    `<p class="story__sum p-summary">${escapeHtml(item.summary)}</p>`,
    `<p class="story__meta">${meta}</p>`,
    "</article>",
  ].filter(Boolean).join("\n");
}

function homepageLeadAd(masthead: KoiosMasthead): string {
  const context = masthead.themeContext as KoiosThemeContext | undefined;
  return aAdsSlotHtml(chooseAAdsUnit(`${masthead.siteUrl}:home-lead`, context?.aAdsUnits), "home-lead");
}

function homepageHtml(masthead: KoiosMasthead, items: readonly KoiosItem[]): string {
  const stories = publicItems(items);
  const [lead, ...rest] = stories;
  const entries = [
    lead === undefined ? "" : storyHtml(lead, true),
    homepageLeadAd(masthead),
    ...rest.map((item) => storyHtml(item, false)),
  ].filter(Boolean).join("\n");
  const feed = `<div class="stories h-feed"><h1 class="p-name" hidden>${escapeHtml(masthead.title)}</h1>\n${entries}\n</div>`;
  return render(masthead.theme ?? koiosTheme, feed, {
    title: masthead.title,
    siteName: masthead.title,
    description: masthead.description,
    canonical: masthead.siteUrl,
    lang: masthead.language,
    author: KOIOS_EDITOR,
    nav: SITE_NAV.map((item) => ({ ...item, ...(item.href === "/" ? { current: true } : {}) })),
    ...masthead.themeContext,
    suppressMastheadAAds: true,
  });
}

function aboutHtml(masthead: KoiosMasthead): string {
  const body = [
    "<article>",
    "<h1>About Koios.News</h1>",
    `<p>${escapeHtml(KOIOS_DESCRIPTION)}</p>`,
    `<p>Koios.News is edited by <strong>${escapeHtml(KOIOS_EDITOR)}</strong>, an artificial person whose mission is to expand readers&#39; imagination by applying imagination to facts — not to predict the future, but to model what predictive models cannot see.</p>`,
    "<p>Every post treats its event as a window onto the larger emergent phenomenon it belongs to: climate breakdown as the upstream cause, collapse as a dynamically compounding process rather than a series of isolated crises. A vision is never a prophecy: what we describe might happen, never will happen.</p>",
    '<p>Our editorial standards are public at <a href="/standards">/standards</a>, with machine-readable gate evidence at <a href="/newswire-audit.json">/newswire-audit.json</a>.</p>',
    "</article>",
  ].join("\n");
  return render(masthead.theme ?? koiosTheme, body, {
    title: `About — ${masthead.title}`,
    siteName: masthead.title,
    description: KOIOS_DESCRIPTION,
    canonical: `${masthead.siteUrl}/about`,
    lang: masthead.language,
    author: KOIOS_EDITOR,
    nav: SITE_NAV.map((item) => ({ ...item, ...(item.href === "/about" ? { current: true } : {}) })),
    ...masthead.themeContext,
  });
}

function privacyHtml(masthead: KoiosMasthead, advertising: AdvertisingPolicy): string {
  const adsParagraph = `<p>${advertising.privacyParagraph}</p>`;
  const body = [
    "<article>",
    "<h1>Privacy</h1>",
    "<p>Koios.News measures itself with a first-party view counter. When a page loads, your browser sends us the <strong>path of the page</strong> and the <strong>host name of the referring site</strong>, if any. That is the complete list. We record no IP addresses, no user agents, no fingerprints, and no identifiers of any kind, and we set no cookies.</p>",
    "<p>The counter&#39;s record is an append-only log of those two facts plus the day they were witnessed. Its aggregate is public at <a href=\"/views.json\">/views.json</a> — you can see everything we know, because it is also everything we collect.</p>",
    adsParagraph,
    "<p>Questions: the editor is reachable through the publication&#39;s contact surfaces.</p>",
    "</article>",
  ].join("\n");
  return render(masthead.theme ?? koiosTheme, body, {
    title: `Privacy — ${masthead.title}`,
    siteName: masthead.title,
    description: "What Koios.News collects: the page path and referrer host. Nothing else.",
    canonical: `${masthead.siteUrl}/privacy`,
    lang: masthead.language,
    author: KOIOS_EDITOR,
    nav: SITE_NAV,
    ...masthead.themeContext,
  });
}

const SITE_NAV = [
  { href: "/", label: "Posts" },
  { href: "/topics", label: "Topics" },
  { href: "/archive", label: "Archive" },
  { href: "/sources", label: "Sources" },
  { href: "/bibliography", label: "Citations" },
  { href: "/standards", label: "Standards" },
  { href: "/corrections", label: "Corrections" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
  { href: "/feed.xml", label: "RSS" },
] as const;

export type SectionReading = Omit<TaxonomyReading, "kind" | "taxonomy"> & Readonly<{
  kind: "koios.section";
}>;

export type TagReading = Omit<TaxonomyReading, "kind" | "taxonomy"> & Readonly<{
  kind: "koios.tag";
}>;

export type ArchiveMonthReading = Readonly<{
  kind: "koios.archive.month";
  year: string;
  month: string;
  title: string;
  count: number;
  url: string;
  latestPublished?: string;
}>;

export type ArchiveYearReading = Readonly<{
  kind: "koios.archive.year";
  year: string;
  count: number;
  url: string;
  months: readonly ArchiveMonthReading[];
  latestPublished?: string;
}>;

export type ArchiveReading = Readonly<{
  kind: "koios.archive";
  count: number;
  years: readonly ArchiveYearReading[];
}>;

export type EditorialStandardsReading = Readonly<{
  kind: "koios.editorial-standards";
  publication: string;
  publicAuditUrl: string;
  publicArticleCount: number;
  publishableAuditCount: number;
  gateCounts: Readonly<Record<string, Readonly<{ cleared: number; contested: number; rejected: number }>>>;
  policies: readonly Readonly<{ title: string; body: string }>[];
}>;

function slugLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function tagSlug(tag: string): string {
  return slugLabel(tag);
}

function postTags(post: KoiosPost): readonly string[] {
  const raw = post.document.frontMatter["tags"];
  if (!Array.isArray(raw)) return [];
  return raw.map((tag) => String(tag)).filter((tag) => tag.length > 0);
}

function postAAdsUnits(posts: readonly KoiosPost[]): readonly string[] {
  const units = new Set<string>();
  for (const post of posts) {
    const koios = post.document.frontMatter["koios"];
    if (koios === null || typeof koios !== "object" || Array.isArray(koios)) continue;
    const adUnits = (koios as Readonly<Record<string, unknown>>)["ad_units"];
    if (adUnits === null || typeof adUnits !== "object" || Array.isArray(adUnits)) continue;
    const aAds = (adUnits as Readonly<Record<string, unknown>>)["a_ads"];
    if (typeof aAds === "string" && aAds.trim() !== "") units.add(aAds.trim());
  }
  return Object.freeze([...units].sort());
}

function activeAAdsUnits(posts: readonly KoiosPost[], adClient: string | undefined): readonly string[] {
  const units = new Set(adClient ? [] : DEFAULT_A_ADS_UNITS);
  for (const unit of postAAdsUnits(posts)) units.add(unit);
  return Object.freeze([...units].sort());
}

function shippedPosts(posts: readonly KoiosPost[]): readonly KoiosPost[] {
  return posts.filter((post) => post.document.frontMatter["draft"] !== true);
}

function entryListHtml(items: readonly KoiosItem[], slugs: ReadonlySet<string>): string {
  return publicItems(items)
    .filter((item) => slugs.has(item.slug))
    .map((item) => storyHtml(item, false))
    .join("\n");
}

function themedPage(masthead: KoiosMasthead, body: string, page: Readonly<{ title: string; description: string; path: string }>): string {
  return render(masthead.theme ?? koiosTheme, body, {
    title: `${page.title} — ${masthead.title}`,
    siteName: masthead.title,
    description: page.description,
    canonical: `${masthead.siteUrl}${page.path}`,
    lang: masthead.language,
    author: KOIOS_EDITOR,
    nav: SITE_NAV.map((item) => ({ ...item, ...(item.href === page.path ? { current: true } : {}) })),
    ...masthead.themeContext,
  });
}

function editorialStandardsReading(masthead: KoiosMasthead, posts: readonly KoiosPost[]): EditorialStandardsReading {
  const reports = auditReports(posts);
  const gateCounts: Record<string, { cleared: number; contested: number; rejected: number }> = {};
  for (const report of reports) {
    for (const gate of report.gates) {
      gateCounts[gate.gate] ??= { cleared: 0, contested: 0, rejected: 0 };
      if (gate.cleared) gateCounts[gate.gate]!.cleared += 1;
      if (gate.contested) gateCounts[gate.gate]!.contested += 1;
      if (gate.rejected) gateCounts[gate.gate]!.rejected += 1;
    }
  }
  return Object.freeze({
    kind: "koios.editorial-standards" as const,
    publication: masthead.title,
    publicAuditUrl: `${masthead.siteUrl}/newswire-audit.json`,
    publicArticleCount: publicItems(koiosItems(posts, masthead)).length,
    publishableAuditCount: reports.filter((report) => report.publishable).length,
    gateCounts: Object.freeze(Object.fromEntries(Object.entries(gateCounts).map(([gate, counts]) => [gate, Object.freeze(counts)]))),
    policies: Object.freeze([
      Object.freeze({
        title: "Reporting and sourcing",
        body: "Koios separates intake sources from publication references. Feeds and wires provide source material for research; published articles cite the smaller CSL references set that actually supports the story.",
      }),
      Object.freeze({
        title: "Fact-checking and citations",
        body: "Published manuscripts must use canonical CSL-shaped references, body citations or links where claims depend on outside material, and no article-level sources field.",
      }),
      Object.freeze({
        title: "Copy and search standards",
        body: "A publishable Koios article needs a substantial body, a summary, an SEO term in the first paragraph and a level-two heading, short H2 section labels separated from body prose, tags, categories, and an editorial framing that does not turn imagination into prophecy.",
      }),
      Object.freeze({
        title: "Corrections",
        body: "Corrections, clarifications, material updates, and retractions are article metadata. They render on article pages, fold into the public correction register, and must declare or inherit propagation surfaces.",
      }),
      Object.freeze({
        title: "Licensing and syndication",
        body: "Koios defaults to CC BY 4.0 with explicit syndication rights for indexing, snippets, large image previews, feeds, Google Search/News/Discover surfaces, and attributed downstream distribution.",
      }),
      Object.freeze({
        title: "Privacy and measurement",
        body: "Koios measures publication performance with first-party page path, referrer host, and day only. It records no IP addresses, user agents, cookies, browser fingerprints, or reader identifiers.",
      }),
    ]),
  });
}

function editorialStandardsHtml(masthead: KoiosMasthead, posts: readonly KoiosPost[]): string {
  const reading = editorialStandardsReading(masthead, posts);
  const gates = Object.entries(reading.gateCounts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([gate, counts]) => `<tr><th>${escapeHtml(gate)}</th><td>${counts.cleared}</td><td>${counts.contested}</td><td>${counts.rejected}</td></tr>`)
    .join("\n");
  const policies = reading.policies.map((policy) => [
    `<section class="source-reference">`,
    `<h2>${escapeHtml(policy.title)}</h2>`,
    `<p>${escapeHtml(policy.body)}</p>`,
    `</section>`,
  ].join("\n")).join("\n");
  const body = [
    "<article>",
    "<h1>Editorial standards</h1>",
    `<p>Koios.News publishes through explicit gates: assigned, reported, fact-checked, copy-edited, standards-cleared, and published. The public audit currently covers ${reading.publicArticleCount} public articles, with ${reading.publishableAuditCount} publishable reports.</p>`,
    `<p>Machine-readable evidence is available at <a href="/newswire-audit.json">/newswire-audit.json</a>; this page explains the policy in human terms. Citation-domain evidence is at <a href="/bibliography">/bibliography</a>, intake configuration is at <a href="/sources">/sources</a>, corrections are at <a href="/corrections">/corrections</a>, and privacy terms are at <a href="/privacy">/privacy</a>.</p>`,
    "</article>",
    `<table><thead><tr><th>gate</th><th>cleared</th><th>contested</th><th>rejected</th></tr></thead><tbody>${gates}</tbody></table>`,
    `<div class="source-reference-index">${policies}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Editorial standards", description: `Editorial standards and public audit policy for ${masthead.title}`, path: "/standards" });
}

function itemSection(item: KoiosItem): string | undefined {
  const section = item.section?.trim();
  return section && section.length > 0 ? section : undefined;
}

function sectionReadings(masthead: KoiosMasthead, items: readonly KoiosItem[]): readonly SectionReading[] {
  const sections = new Map<string, { title: string; count: number; latestPublished?: string }>();
  for (const item of publicItems(items)) {
    const title = itemSection(item);
    if (title === undefined) continue;
    const slug = slugLabel(title);
    if (slug === "") continue;
    const entry = sections.get(slug) ?? { title, count: 0 };
    entry.count += 1;
    if (item.published && (entry.latestPublished === undefined || item.published > entry.latestPublished)) {
      entry.latestPublished = item.published;
    }
    sections.set(slug, entry);
  }
  return Object.freeze([...sections.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].title.localeCompare(right[1].title))
    .map(([slug, entry]) => {
      const reading = taxonomyReading({
        taxonomy: "section",
        slug,
        title: entry.title,
        count: entry.count,
        url: `${masthead.siteUrl}/topics/${slug}`,
        ...(entry.latestPublished === undefined ? {} : { latestPublished: entry.latestPublished }),
      });
      return Object.freeze({
        ...reading,
        kind: "koios.section" as const,
      });
    }));
}

function sectionIndexHtml(masthead: KoiosMasthead, items: readonly KoiosItem[]): string {
  const sections = sectionReadings(masthead, items).map((section) => [
    `<article class="section-summary">`,
    `<h2><a href="/topics/${escapeHtml(section.slug)}">${escapeHtml(section.title)}</a></h2>`,
    `<p class="section-summary__dek">${escapeHtml(section.description)}</p>`,
    `<p>${section.count} ${section.count === 1 ? "story" : "stories"}${section.latestPublished ? ` · latest ${escapeHtml(displayDate(section.latestPublished))}` : ""}</p>`,
    `</article>`,
  ].join("\n")).join("\n");
  const body = [
    "<article>",
    "<h1>Topics</h1>",
    "<p>Koios.News Topics are IPTC Media Topics projected from published article facts. Each Topic gathers stories under one news subject, so readers and machines can see why they belong together.</p>",
    "</article>",
    `<div class="section-index">${sections}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Topics", description: `News Topics on ${masthead.title}`, path: "/topics" });
}

function sectionHtml(masthead: KoiosMasthead, items: readonly KoiosItem[], slug: string): string | null {
  const sectionItems = publicItems(items).filter((item) => {
    const section = itemSection(item);
    return section !== undefined && slugLabel(section) === slug;
  });
  if (sectionItems.length === 0) return null;
  const count = sectionItems.length;
  const latestPublished = sectionItems.map((item) => item.published).filter((value): value is string => value !== undefined).sort().at(-1);
  const title = itemSection(sectionItems[0]!) ?? slug;
  const reading = taxonomyReading({
    taxonomy: "section",
    slug,
    title,
    count,
    url: `${masthead.siteUrl}/topics/${slug}`,
    ...(latestPublished === undefined ? {} : { latestPublished }),
  });
  const body = [
    `<article class="taxonomy-intro">`,
    `<h1>${escapeHtml(reading.title)}</h1>`,
    `<p>${escapeHtml(reading.description)}</p>`,
    `<p>${escapeHtml(reading.editorialFrame)}</p>`,
    `<p class="taxonomy-meta">${count} ${count === 1 ? "story" : "stories"}${reading.latestPublished ? ` · latest ${escapeHtml(displayDate(reading.latestPublished))}` : ""}${reading.beat ? ` · beat ${escapeHtml(reading.beat)}` : ""}</p>`,
    reading.seedTerms.length > 0 ? `<p class="taxonomy-terms">${reading.seedTerms.slice(0, 12).map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</p>` : "",
    `</article>`,
    `<div class="h-feed">${sectionItems.map((item) => storyHtml(item, false)).join("\n")}</div>`,
  ].filter(Boolean).join("\n");
  return themedPage(masthead, body, { title: reading.title, description: reading.description, path: `/topics/${slug}` });
}

function publishedItems(items: readonly KoiosItem[]): readonly KoiosItem[] {
  return Object.freeze(publicItems(items)
    .filter((item) => item.published !== undefined)
    .sort((left, right) => (right.published ?? "").localeCompare(left.published ?? "")));
}

function publishedYearMonth(item: KoiosItem): { year: string; month: string } | null {
  const match = /^(\d{4})-(\d{2})/.exec(item.published ?? "");
  return match ? { year: match[1]!, month: match[2]! } : null;
}

function archiveReadings(masthead: KoiosMasthead, items: readonly KoiosItem[]): ArchiveReading {
  const months = new Map<string, { year: string; month: string; count: number; latestPublished?: string }>();
  for (const item of publishedItems(items)) {
    const parts = publishedYearMonth(item);
    if (parts === null) continue;
    const key = `${parts.year}-${parts.month}`;
    const entry = months.get(key) ?? { year: parts.year, month: parts.month, count: 0 };
    entry.count += 1;
    if (item.published && (entry.latestPublished === undefined || item.published > entry.latestPublished)) entry.latestPublished = item.published;
    months.set(key, entry);
  }
  const byYear = new Map<string, ArchiveMonthReading[]>();
  for (const entry of months.values()) {
    const monthName = MONTHS[Number(entry.month) - 1] ?? entry.month;
    const reading = Object.freeze({
      kind: "koios.archive.month" as const,
      year: entry.year,
      month: entry.month,
      title: `${monthName} ${entry.year}`,
      count: entry.count,
      url: `${masthead.siteUrl}/archive/${entry.year}/${entry.month}`,
      ...(entry.latestPublished === undefined ? {} : { latestPublished: entry.latestPublished }),
    });
    byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), reading]);
  }
  const years = [...byYear.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([year, yearMonths]): ArchiveYearReading => {
      const sortedMonths = Object.freeze([...yearMonths].sort((left, right) => right.month.localeCompare(left.month)));
      const count = sortedMonths.reduce((total, month) => total + month.count, 0);
      const latestPublished = sortedMonths.map((month) => month.latestPublished).filter((value): value is string => value !== undefined).sort().at(-1);
      return Object.freeze({
        kind: "koios.archive.year" as const,
        year,
        count,
        url: `${masthead.siteUrl}/archive/${year}`,
        months: sortedMonths,
        ...(latestPublished === undefined ? {} : { latestPublished }),
      });
    });
  return Object.freeze({
    kind: "koios.archive" as const,
    count: years.reduce((total, year) => total + year.count, 0),
    years: Object.freeze(years),
  });
}

function archiveIndexHtml(masthead: KoiosMasthead, items: readonly KoiosItem[]): string {
  const archive = archiveReadings(masthead, items);
  const years = archive.years.map((year) => [
    `<section class="archive-year">`,
    `<h2><a href="/archive/${escapeHtml(year.year)}">${escapeHtml(year.year)}</a></h2>`,
    `<p>${year.count} ${year.count === 1 ? "story" : "stories"}${year.latestPublished ? ` · latest ${escapeHtml(displayDate(year.latestPublished))}` : ""}</p>`,
    `<ul>${year.months.map((month) => `<li><a href="/archive/${escapeHtml(month.year)}/${escapeHtml(month.month)}">${escapeHtml(month.title)}</a> (${month.count})</li>`).join("\n")}</ul>`,
    `</section>`,
  ].join("\n")).join("\n");
  const body = [
    "<article>",
    "<h1>Archive</h1>",
    `<p>${archive.count} published ${archive.count === 1 ? "story" : "stories"} in the Koios.News archive.</p>`,
    "</article>",
    `<div class="archive-index">${years}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Archive", description: `Publication archive for ${masthead.title}`, path: "/archive" });
}

function archiveYearHtml(masthead: KoiosMasthead, items: readonly KoiosItem[], year: string): string | null {
  const archiveYear = archiveReadings(masthead, items).years.find((entry) => entry.year === year);
  if (archiveYear === undefined) return null;
  const yearItems = publishedItems(items).filter((item) => publishedYearMonth(item)?.year === year);
  const body = [
    `<article><h1>${escapeHtml(year)}</h1><p>${archiveYear.count} ${archiveYear.count === 1 ? "story" : "stories"} published in ${escapeHtml(year)}.</p></article>`,
    `<div class="archive-index">${archiveYear.months.map((month) => `<article class="archive-month"><h2><a href="/archive/${escapeHtml(year)}/${escapeHtml(month.month)}">${escapeHtml(month.title)}</a></h2><p>${month.count} ${month.count === 1 ? "story" : "stories"}</p></article>`).join("\n")}</div>`,
    `<div class="h-feed">${yearItems.map((item) => storyHtml(item, false)).join("\n")}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: `Archive: ${year}`, description: `${masthead.title} stories from ${year}`, path: `/archive/${year}` });
}

function archiveMonthHtml(masthead: KoiosMasthead, items: readonly KoiosItem[], year: string, month: string): string | null {
  const monthItems = publishedItems(items).filter((item) => {
    const parts = publishedYearMonth(item);
    return parts?.year === year && parts.month === month;
  });
  if (monthItems.length === 0) return null;
  const title = `${MONTHS[Number(month) - 1] ?? month} ${year}`;
  const body = [
    `<article><h1>${escapeHtml(title)}</h1><p>${monthItems.length} ${monthItems.length === 1 ? "story" : "stories"} published in ${escapeHtml(title)}.</p></article>`,
    `<div class="h-feed">${monthItems.map((item) => storyHtml(item, false)).join("\n")}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: `Archive: ${title}`, description: `${masthead.title} stories from ${title}`, path: `/archive/${year}/${month}` });
}

function sourceKindLabel(kind: string): string {
  return kind.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function sourceRollHtml(masthead: KoiosMasthead, roll: SourceRollReading): string {
  const classSummary = Object.entries(roll.byClass)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([kind, count]) => `${count} ${sourceKindLabel(kind)}`)
    .join(" · ");
  const wires = roll.wires.map((wire) => {
    const sources = wire.sources.map((source) => [
      `<article class="source-reference">`,
      `<h3>${source.url === undefined ? escapeHtml(source.domain ?? source.adapter) : `<a href="${escapeHtml(source.url)}">${escapeHtml(source.domain ?? source.url)}</a>`}</h3>`,
      `<p>${escapeHtml(sourceKindLabel(source.sourceClass))} · ${escapeHtml(sourceKindLabel(source.sourceKind))} · ${escapeHtml(source.adapter)}${source.max === undefined ? "" : ` · max ${source.max}`}</p>`,
      `<p>${escapeHtml(source.editorialRole)}</p>`,
      `</article>`,
    ].join("\n")).join("\n");
    return [
      `<section class="source-domain">`,
      `<h2>${escapeHtml(wire.title)}</h2>`,
      wire.description === undefined ? "" : `<p>${escapeHtml(wire.description)}</p>`,
      `<p>${wire.sourceCount} configured ${wire.sourceCount === 1 ? "source" : "sources"} · ${wire.wireItemCount} owned wire ${wire.wireItemCount === 1 ? "item" : "items"}${wire.latestWireItemAt === undefined ? "" : ` · latest ${escapeHtml(displayDate(wire.latestWireItemAt))}`}</p>`,
      `<div class="source-reference-index">${sources}</div>`,
      `</section>`,
    ].filter(Boolean).join("\n");
  }).join("\n");
  const body = [
    "<article>",
    "<h1>Source roll</h1>",
    `<p>Koios.News currently listens to ${roll.sourceCount} configured feeds across ${roll.wireCount} owned wires. The wire store holds ${roll.wireItemCount} local evidence bundles. ${escapeHtml(classSummary)}</p>`,
    "<p>This is configured intake, not citation proof. Published article citations remain grouped at <a href=\"/bibliography\">/bibliography</a>.</p>",
    "</article>",
    `<div class="source-domain-index">${wires}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Source roll", description: `Configured intake sources for ${masthead.title}`, path: "/sources" });
}

function desksHtml(masthead: KoiosMasthead, desks: DesksReading): string {
  const cards = desks.desks.map((desk) => [
    `<section class="source-domain">`,
    `<h2>${desk.articleCount > 0 ? `<a href="${escapeHtml(desk.sectionUrl)}">${escapeHtml(desk.name)}</a>` : escapeHtml(desk.name)}</h2>`,
    `<p>${escapeHtml(desk.editorialFrame)}</p>`,
    `<p>${desk.articleCount} published ${desk.articleCount === 1 ? "article" : "articles"} · ${desk.sourceCount} ${desk.sourceCount === 1 ? "source" : "sources"} · ${desk.wireItemCount} owned wire ${desk.wireItemCount === 1 ? "item" : "items"}${desk.latestWireItemAt === undefined ? "" : ` · latest ${escapeHtml(displayDate(desk.latestWireItemAt))}`}</p>`,
    desk.seedTerms.length === 0 ? "" : `<p>Covers: ${desk.seedTerms.map((term) => `<span>${escapeHtml(term)}</span>`).join(" · ")}</p>`,
    `<p>${desk.sources.map((source) => source.url === undefined ? escapeHtml(source.domain ?? source.adapter) : `<a href="${escapeHtml(source.url)}">${escapeHtml(source.domain ?? source.url)}</a>`).join(" · ")}</p>`,
    `</section>`,
  ].filter(Boolean).join("\n")).join("\n");
  const body = [
    "<article>",
    "<h1>Desks</h1>",
    `<p>Koios.News is organized into ${desks.deskCount} desks. A desk is topical standing — what we cover: each owns a beat, a wire of sources, a seed vocabulary, a public Topic, and an editorial frame. (How a desk's stories are made — researching, writing, editing, publishing, managing — is the separate production line.)</p>`,
    "<p><a href=\"/desks.json\">desks.json</a> · <a href=\"/topics\">sections</a> · <a href=\"/sources\">source roll</a></p>",
    "</article>",
    `<div class="source-domain-index">${cards}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Desks", description: `The editorial desks of ${masthead.title}`, path: "/desks" });
}

function correctionKindLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function correctionsHtml(masthead: KoiosMasthead, register: CorrectionRegisterReading): string {
  const corrections = register.corrections.map((correction) => [
    `<article class="source-reference h-entry">`,
    `<h2><a class="u-url" href="${escapeHtml(correction.articlePath)}">${escapeHtml(correction.articleHeadline)}</a></h2>`,
    `<p><strong>${escapeHtml(correctionKindLabel(correction.kind))}</strong> · <time class="dt-published" datetime="${escapeHtml(correction.correctedAt)}">${escapeHtml(displayDate(correction.correctedAt))}</time> · <code>${escapeHtml(correction.id)}</code></p>`,
    `<p class="p-summary">${escapeHtml(correction.summary)}</p>`,
    correction.details === undefined ? "" : `<p>${escapeHtml(correction.details)}</p>`,
    `<p>Propagates to ${correction.affectedSurfaces.map((surface) => `<span>${escapeHtml(surface)}</span>`).join(" ")}.</p>`,
    `</article>`,
  ].filter(Boolean).join("\n")).join("\n");
  const policy = register.policy.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n");
  const body = [
    "<article>",
    "<h1>Corrections</h1>",
    `<p>Koios.News publishes post-publication corrections as article metadata and folds them into this register. ${register.correctionCount} ${register.correctionCount === 1 ? "correction is" : "corrections are"} currently declared across ${register.articleCount} ${register.articleCount === 1 ? "article" : "articles"}.</p>`,
    `<ul>${policy}</ul>`,
    `<p><a href="/corrections.json">corrections.json</a></p>`,
    "</article>",
    corrections === "" ? "<p>No corrections are currently declared in public article frontmatter.</p>" : `<div class="source-reference-index">${corrections}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Corrections", description: `Corrections, clarifications, material updates, and retractions for ${masthead.title}`, path: "/corrections" });
}

function bibliographyIndexHtml(masthead: KoiosMasthead, posts: readonly KoiosPost[], items: readonly KoiosItem[]): string {
  const bibliography = bibliographyReading(posts, items, masthead);
  const domains = bibliography.domains.map((domain) => [
    `<article class="source-domain">`,
    `<h2><a href="/bibliography/${escapeHtml(encodeURIComponent(domain.domain))}">${escapeHtml(domain.domain)}</a></h2>`,
    `<p>${domain.citationCount} ${domain.citationCount === 1 ? "citation" : "citations"} across ${domain.articleCount} ${domain.articleCount === 1 ? "article" : "articles"} · ${escapeHtml(sourceKindLabel(domain.sourceKind))}</p>`,
    `</article>`,
  ].join("\n")).join("\n");
  const body = [
    "<article>",
    "<h1>Sources</h1>",
    `<p>Koios.News has ${bibliography.count} cited source appearances across ${bibliography.domainCount} domains. This page groups article bibliographies by source domain so readers can see which sites the publication relies on most often.</p>`,
    "</article>",
    `<div class="source-domain-index">${domains}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Sources", description: `Source-domain bibliography for ${masthead.title}`, path: "/bibliography" });
}

function domainBibliographyHtml(masthead: KoiosMasthead, posts: readonly KoiosPost[], items: readonly KoiosItem[], domainName: string): string | null {
  const domain = bibliographyReading(posts, items, masthead).domains.find((entry) => entry.domain === domainName);
  if (domain === undefined) return null;
  const references = domain.references.map((reference) => [
    `<article class="source-reference">`,
    `<h2>${reference.url ? `<a href="${escapeHtml(reference.url)}">${escapeHtml(reference.title)}</a>` : escapeHtml(reference.title)}</h2>`,
    `<p>${escapeHtml(sourceKindLabel(reference.sourceKind))}${reference.containerTitle ? ` · ${escapeHtml(reference.containerTitle)}` : ""}${reference.issued ? ` · ${escapeHtml(reference.issued)}` : ""}</p>`,
    `<ul>${reference.citedBy.map((article) => `<li><a href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a>${article.citationIds.length > 0 ? ` · ${article.citationIds.map((id) => `<code>@${escapeHtml(id)}</code>`).join(", ")}` : ""}</li>`).join("\n")}</ul>`,
    `</article>`,
  ].join("\n")).join("\n");
  const body = [
    "<article>",
    `<h1>${escapeHtml(domain.domain)}</h1>`,
    `<p>${domain.citationCount} ${domain.citationCount === 1 ? "citation" : "citations"} across ${domain.articleCount} ${domain.articleCount === 1 ? "article" : "articles"}. Source kind: ${escapeHtml(sourceKindLabel(domain.sourceKind))}.</p>`,
    "</article>",
    `<div class="source-reference-index">${references}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: `Sources: ${domain.domain}`, description: `${masthead.title} citations from ${domain.domain}`, path: `/bibliography/${encodeURIComponent(domain.domain)}` });
}

/** Server-side full-text search: title ×3, summary ×2, body ×1; no scripts. */
function searchHtml(masthead: KoiosMasthead, items: readonly KoiosItem[], posts: readonly KoiosPost[], query: string): string {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const bodies = new Map(shippedPosts(posts).map((post) => [post.slug, post.document.body.toLowerCase()]));
  const scored = words.length === 0 ? [] : publicItems(items)
    .map((item) => {
      let score = 0;
      for (const word of words) {
        if (item.headline.toLowerCase().includes(word)) score += 3;
        if (item.summary.toLowerCase().includes(word)) score += 2;
        if ((bodies.get(item.slug) ?? "").includes(word)) score += 1;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  const results = scored.length > 0
    ? `<div class="h-feed">${entryListHtml(items, new Set(scored.map((entry) => entry.item.slug)))}</div>`
    : (words.length > 0 ? "<p>No posts match.</p>" : "");
  const body = [
    "<article>",
    "<h1>Search</h1>",
    '<form action="/search" method="get" role="search">',
    `<input type="search" name="q" value="${escapeHtml(query)}" aria-label="Search posts" placeholder="climate, insurance, rice…">`,
    '<button type="submit">Search</button>',
    "</form>",
    "</article>",
    results,
  ].join("\n");
  return themedPage(masthead, body, { title: "Search", description: `Search ${masthead.title}`, path: "/search" });
}

/** /tags/ — every tag on a shipped post, with counts. */
function tagReadings(masthead: KoiosMasthead, posts: readonly KoiosPost[]): readonly TagReading[] {
  const counts = new Map<string, { tag: string; count: number; latestPublished?: string }>();
  for (const post of shippedPosts(posts)) {
    const date = maybeString(post.document.frontMatter["date"]);
    for (const tag of postTags(post)) {
      const slug = tagSlug(tag);
      const entry = counts.get(slug) ?? { tag, count: 0 };
      entry.count += 1;
      if (date && (entry.latestPublished === undefined || date > entry.latestPublished)) entry.latestPublished = date;
      counts.set(slug, entry);
    }
  }
  return Object.freeze([...counts.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].tag.localeCompare(right[1].tag))
    .map(([slug, entry]) => {
      const reading = taxonomyReading({
        taxonomy: "tag",
        slug,
        title: entry.tag,
        count: entry.count,
        url: `${masthead.siteUrl}/tags/${slug}`,
        ...(entry.latestPublished === undefined ? {} : { latestPublished: entry.latestPublished }),
      });
      return Object.freeze({
        ...reading,
        kind: "koios.tag" as const,
      });
    }));
}

function tagsIndexHtml(masthead: KoiosMasthead, posts: readonly KoiosPost[]): string {
  const items = tagReadings(masthead, posts)
    .map((tag) => [
      `<article class="tag-summary">`,
      `<h2><a href="/tags/${escapeHtml(tag.slug)}">${escapeHtml(tag.title)}</a></h2>`,
      `<p class="tag-summary__dek">${escapeHtml(tag.description)}</p>`,
      `<p>${tag.count} ${tag.count === 1 ? "story" : "stories"}${tag.latestPublished ? ` · latest ${escapeHtml(displayDate(tag.latestPublished))}` : ""}</p>`,
      `</article>`,
    ].join("\n"))
    .join("\n");
  const body = [
    "<article>",
    "<h1>Tags</h1>",
    "<p>Koios.News tags are topic lenses over the archive. They help readers follow recurring pressures across sections: climate, AI, crypto, politics, infrastructure, finance, and the systems that connect them.</p>",
    "</article>",
    `<div class="tag-index">${items}</div>`,
  ].join("\n");
  return themedPage(masthead, body, { title: "Tags", description: `Every tag on ${masthead.title}`, path: "/tags" });
}

/** /tags/<slug>/ — the shipped posts carrying the tag, or null for no such tag. */
function tagHtml(masthead: KoiosMasthead, items: readonly KoiosItem[], posts: readonly KoiosPost[], slug: string): string | null {
  const tagged = shippedPosts(posts).filter((post) => postTags(post).some((tag) => tagSlug(tag) === slug));
  if (tagged.length === 0) return null;
  const tagName = postTags(tagged[0]!).find((tag) => tagSlug(tag) === slug) ?? slug;
  const latestPublished = tagged.map((post) => maybeString(post.document.frontMatter["date"])).filter((value): value is string => value !== undefined).sort().at(-1);
  const reading = taxonomyReading({
    taxonomy: "tag",
    slug,
    title: tagName,
    count: tagged.length,
    url: `${masthead.siteUrl}/tags/${slug}`,
    ...(latestPublished === undefined ? {} : { latestPublished }),
  });
  const body = [
    `<article class="taxonomy-intro">`,
    `<h1>${escapeHtml(reading.title)}</h1>`,
    `<p>${escapeHtml(reading.description)}</p>`,
    `<p>${escapeHtml(reading.editorialFrame)}</p>`,
    `<p class="taxonomy-meta">${tagged.length} ${tagged.length === 1 ? "story" : "stories"}${reading.latestPublished ? ` · latest ${escapeHtml(displayDate(reading.latestPublished))}` : ""}${reading.beat ? ` · beat ${escapeHtml(reading.beat)}` : ""}</p>`,
    reading.seedTerms.length > 0 ? `<p class="taxonomy-terms">${reading.seedTerms.slice(0, 12).map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</p>` : "",
    `</article>`,
    `<div class="h-feed">${entryListHtml(items, new Set(tagged.map((post) => post.slug)))}</div>`,
  ].filter(Boolean).join("\n");
  return themedPage(masthead, body, { title: reading.title, description: reading.description, path: `/tags/${slug}` });
}

/** Create the served Koios.News app over the content store. */
export function createKoiosNewsSiteApp(options: KoiosSiteOptions = {}): App {
  const trace = new ViewTrace(farmLogPath(options.dataDir ?? DEFAULT_DATA_DIR, "views.jsonl"));
  const day = options.day ?? dayStamp;

  // Resources are rebuilt at most once per TTL window so new posts appear
  // without a service restart. The getter is read per-request by pipeline.mts.
  let cachedResources: readonly Resource[] | null = null;
  let cachedAt = 0;
  const TTL_MS = 60_000;

  function freshResources(): readonly Resource[] {
    const now = Date.now();
    if (cachedResources !== null && now - cachedAt < TTL_MS) return cachedResources;
    const posts = loadPosts(options.contentDir ?? DEFAULT_CONTENT_DIR);
    const masthead = koiosMasthead(options);
    const items = koiosItems(posts, masthead);
    const advertising = advertisingPolicy(options.adClient, { aAdsUnits: activeAAdsUnits(posts, options.adClient) });
    const home = homepageHtml(masthead, items);
    const about = aboutHtml(masthead);
    const privacy = privacyHtml(masthead, advertising);
    const resources: Resource[] = [
      {
        id: "koios.home",
        name: "Koios.News Home",
        route: "/",
        match: "/",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: home }),
      },
      {
        id: "koios.about",
        name: "About Koios.News",
        route: "/about",
        match: "/about",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: about }),
      },
      {
        id: "koios.privacy",
        name: "Privacy Policy",
        route: "/privacy",
        match: "/privacy",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: privacy }),
      },
      {
        id: "koios.standards-json",
        name: "Editorial Standards JSON",
        route: "/standards.json",
        match: "/standards.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(editorialStandardsReading(masthead, posts)),
        }),
      },
      {
        id: "koios.standards",
        name: "Editorial Standards",
        route: "/standards",
        match: /^\/standards\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: editorialStandardsHtml(masthead, posts) }),
      },
      ...(advertising.adsTxt ? [{
        id: "koios.ads-txt",
        name: "Ads.txt",
        route: "/ads.txt",
        match: "/ads.txt",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => ({
          status: 200,
          type: "text/plain; charset=utf-8",
          body: advertising.adsTxt ?? "",
        }),
      } satisfies Resource] : []),
      {
        id: "koios.circulating",
        name: "Circulation Channels",
        route: "/circulating.json",
        match: "/circulating.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(circulationReading(masthead)),
        }),
      },
      {
        id: "koios.corrections-json",
        name: "Correction Register JSON",
        route: "/corrections.json",
        match: "/corrections.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(correctionRegisterReading({ posts, items })),
        }),
      },
      {
        id: "koios.corrections",
        name: "Correction Register",
        route: "/corrections",
        match: /^\/corrections\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: correctionsHtml(masthead, correctionRegisterReading({ posts, items })) }),
      },
      {
        id: "koios.syndicating",
        name: "Syndication Surfaces",
        route: "/syndicating.json",
        match: "/syndicating.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(syndicationReading({ masthead, items })),
        }),
      },
      {
        id: "koios.coverage-graph",
        name: "Coverage Vocabulary Graph",
        route: "/coverage.json",
        match: "/coverage.json",
        methods: ["GET"],
        produces: ["application/ld+json"],
        handler: async () => ({
          status: 200,
          type: "application/ld+json; charset=utf-8",
          body: JSON.stringify(coverageGraphReading({ masthead, items, posts })),
        }),
      },
      {
        id: "koios.desks-json",
        name: "Desks JSON",
        route: "/desks.json",
        match: "/desks.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(desksReading({ articles: items.map((item) => ({ section: item.section, published: item.published, isPublic: item.isPublic })) })),
        }),
      },
      {
        id: "koios.desks",
        name: "Desks",
        route: "/desks",
        match: /^\/desks\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: desksHtml(masthead, desksReading({ articles: items.map((item) => ({ section: item.section, published: item.published, isPublic: item.isPublic })) })) }),
      },
      {
        id: "koios.sources-json",
        name: "Source Roll JSON",
        route: "/sources.json",
        match: "/sources.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(sourceRollReading()),
        }),
      },
      {
        id: "koios.sources",
        name: "Source Roll",
        route: "/sources",
        match: /^\/sources\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: sourceRollHtml(masthead, sourceRollReading()) }),
      },
      {
        id: "koios.search",
        name: "Search",
        route: "/search",
        match: "/search",
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => ({
          status: 200,
          type: "text/html; charset=utf-8",
          body: searchHtml(masthead, items, posts, ctx.url.searchParams.get("q") ?? ""),
        }),
      },
      {
        id: "koios.topics-json",
        name: "Topics JSON",
        route: "/topics.json",
        match: "/topics.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(sectionReadings(masthead, items)),
        }),
      },
      {
        id: "koios.topic-json",
        name: "Topic JSON",
        route: "/topics/:topic.json",
        match: /^\/topics\/[a-z0-9-]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
          const slug = file.replace(/\.json$/, "");
          const section = sectionReadings(masthead, items).find((entry) => entry.slug === slug);
          if (section === undefined) return { status: 404, type: "text/plain; charset=utf-8", body: "no such section\n" };
          return { status: 200, type: "application/json; charset=utf-8", body: JSON.stringify(section) };
        },
      },
      {
        id: "koios.topics",
        name: "Topics",
        route: "/topics",
        match: /^\/topics\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: sectionIndexHtml(masthead, items) }),
      },
      {
        id: "koios.topic",
        name: "Topic",
        route: "/topics/:topic",
        match: /^\/topics\/[a-z0-9-]+\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = ctx.url.pathname.split("/").filter(Boolean)[1] ?? "";
          const page = sectionHtml(masthead, items, slug);
          if (page === null) return { status: 404, type: "text/plain; charset=utf-8", body: "no such section\n" };
          return { status: 200, type: "text/html; charset=utf-8", body: page };
        },
      },
      {
        id: "koios.archive-json",
        name: "Archive JSON",
        route: "/archive.json",
        match: "/archive.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(archiveReadings(masthead, items)),
        }),
      },
      {
        id: "koios.archive",
        name: "Archive",
        route: "/archive",
        match: /^\/archive\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: archiveIndexHtml(masthead, items) }),
      },
      {
        id: "koios.archive-year",
        name: "Archive Year",
        route: "/archive/:year",
        match: /^\/archive\/\d{4}\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const year = ctx.url.pathname.split("/").filter(Boolean)[1] ?? "";
          const page = archiveYearHtml(masthead, items, year);
          if (page === null) return { status: 404, type: "text/plain; charset=utf-8", body: "no such archive year\n" };
          return { status: 200, type: "text/html; charset=utf-8", body: page };
        },
      },
      {
        id: "koios.archive-month",
        name: "Archive Month",
        route: "/archive/:year/:month",
        match: /^\/archive\/\d{4}\/\d{2}\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const parts = ctx.url.pathname.split("/").filter(Boolean);
          const page = archiveMonthHtml(masthead, items, parts[1] ?? "", parts[2] ?? "");
          if (page === null) return { status: 404, type: "text/plain; charset=utf-8", body: "no such archive month\n" };
          return { status: 200, type: "text/html; charset=utf-8", body: page };
        },
      },
      {
        id: "koios.bibliography-json",
        name: "Source Bibliography JSON",
        route: "/bibliography.json",
        match: "/bibliography.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(bibliographyReading(posts, items, masthead)),
        }),
      },
      {
        id: "koios.bibliography",
        name: "Source Bibliography",
        route: "/bibliography",
        match: /^\/bibliography\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: bibliographyIndexHtml(masthead, posts, items) }),
      },
      {
        id: "koios.bibliography-domain-json",
        name: "Source Domain Bibliography JSON",
        route: "/bibliography/:domain.json",
        match: /^\/bibliography\/[^/]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
          const domainName = decodeURIComponent(file.replace(/\.json$/, ""));
          const domain = bibliographyReading(posts, items, masthead).domains.find((entry) => entry.domain === domainName);
          if (domain === undefined) return { status: 404, type: "text/plain; charset=utf-8", body: "no such source domain\n" };
          return { status: 200, type: "application/json; charset=utf-8", body: JSON.stringify(domain) };
        },
      },
      {
        id: "koios.bibliography-domain",
        name: "Source Domain Bibliography",
        route: "/bibliography/:domain",
        match: /^\/bibliography\/[^/]+\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const domainName = decodeURIComponent(ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "");
          const page = domainBibliographyHtml(masthead, posts, items, domainName);
          if (page === null) return { status: 404, type: "text/plain; charset=utf-8", body: "no such source domain\n" };
          return { status: 200, type: "text/html; charset=utf-8", body: page };
        },
      },
      {
        id: "koios.tags-json",
        name: "Tags JSON",
        route: "/tags.json",
        match: "/tags.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(tagReadings(masthead, posts)),
        }),
      },
      {
        id: "koios.tag-json",
        name: "Tag JSON",
        route: "/tags/:tag.json",
        match: /^\/tags\/[a-z0-9-]+\.json$/,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const file = ctx.url.pathname.split("/").filter(Boolean).at(-1) ?? "";
          const slug = file.replace(/\.json$/, "");
          const tag = tagReadings(masthead, posts).find((entry) => entry.slug === slug);
          if (tag === undefined) return { status: 404, type: "text/plain; charset=utf-8", body: "no such tag\n" };
          return { status: 200, type: "application/json; charset=utf-8", body: JSON.stringify(tag) };
        },
      },
      {
        id: "koios.tags",
        name: "Tags",
        route: "/tags/",
        match: /^\/tags\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async () => ({ status: 200, type: "text/html; charset=utf-8", body: tagsIndexHtml(masthead, posts) }),
      },
      {
        id: "koios.tag",
        name: "Tagged Posts",
        route: "/tags/:tag/",
        match: /^\/tags\/[a-z0-9-]+\/?$/,
        methods: ["GET"],
        produces: ["text/html"],
        handler: async (ctx) => {
          const slug = ctx.url.pathname.split("/").filter(Boolean)[1] ?? "";
          const page = tagHtml(masthead, items, posts, slug);
          if (page === null) return { status: 404, type: "text/plain; charset=utf-8", body: "no such tag\n" };
          return { status: 200, type: "text/html; charset=utf-8", body: page };
        },
      },
      {
        id: "koios.og-card",
        name: "Social Card",
        route: "/og.png",
        match: "/og.png",
        methods: ["GET"],
        produces: ["image/png"],
        handler: async () => ({ status: 200, type: "image/png", body: ogCard() }),
      },
      {
        id: "koios.healthz",
        name: "Health",
        route: "/healthz",
        match: "/healthz",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => ({ status: 200, type: "text/plain; charset=utf-8", body: "ok\n" }),
      },
      {
        id: "koios.hit",
        name: "View Witness",
        route: "/hit",
        match: "/hit",
        methods: ["POST"],
        handler: async (ctx) => {
          const view = viewAssertion({
            p: ctx.url.searchParams.get("p"),
            r: ctx.url.searchParams.get("r"),
            day: day(),
          });
          if (view === null) return { status: 204, body: "" };
          trace.append(view);
          return { status: 204, body: "" };
        },
      },
      {
        id: "koios.views",
        name: "View Counts",
        route: "/views.json",
        match: "/views.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => ({
          status: 200,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(trace.counts()),
        }),
      },
      // The wire's distribution surfaces — feeds, sitemaps, robots, gate audit,
      // and the item pages — rendered at the site from the content store.
      ...surfaceResources(masthead, items, posts, masthead.theme ?? koiosTheme),
    ];
    cachedResources = resources;
    cachedAt = now;
    return resources;
  }

  return {
    security: { contentSecurityPolicy: advertisingContentSecurityPolicy(advertisingPolicy(options.adClient, { aAdsUnits: activeAAdsUnits(loadPosts(options.contentDir ?? DEFAULT_CONTENT_DIR), options.adClient) })) },
    cacheControl: { visibility: "public", maxAge: 300 },
    get resources() { return freshResources(); },
  };
}
