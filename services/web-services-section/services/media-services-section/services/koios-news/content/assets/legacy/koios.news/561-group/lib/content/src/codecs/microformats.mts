/**
 * microformats — h-card / h-entry / h-feed serializers (the IndieWeb projection)
 * and the projection of a relationality finite algebra / selected cells into
 * microformat properties.
 *
 * These emit HTML markup, a serialization format — not transport. They live in
 * the shared hub (content), reachable by content-production (which forms the
 * artifact) and by web (which mounts it on HTTP — `microformatsApp` stays
 * there). Codec law (L4): pure over values, no network/filesystem/clock.
 */

export type MicroformatAuthor = {
  name: string;
  url?: string;
  photo?: string;
};

export type RsvpValue = "yes" | "no" | "maybe" | "interested";

export type MicroformatEntry = {
  id: string;
  url: string;
  title: string;
  contentHtml?: string;
  summary?: string;
  author?: MicroformatAuthor;
  published?: string;
  updated?: string;
  tags?: readonly string[];
  inReplyTo?: readonly string[];
  likeOf?: readonly string[];
  repostOf?: readonly string[];
  bookmarkOf?: readonly string[];
  rsvp?: RsvpValue;
  photos?: readonly string[];
  syndication?: readonly string[];
};

export type MicroformatPagingLinks = {
  self?: string;
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
};

export type MicroformatFeed = {
  title: string;
  url: string;
  author?: MicroformatAuthor;
  entries: readonly MicroformatEntry[];
  links?: MicroformatPagingLinks;
};

export type MicroformatCite = {
  name?: string;
  url?: string;
  published?: string;
  author?: string | MicroformatAuthor;
  contentHtml?: string;
};

export type MicroformatProperties = {
  name?: string;
  summary?: string;
  content?: string;
  url?: string;
  uid?: string;
  published?: string;
  updated?: string;
  author?: string | MicroformatAuthor;
  category?: string | readonly string[];
  inReplyTo?: string | MicroformatCite | readonly (string | MicroformatCite)[];
  likeOf?: string | MicroformatCite | readonly (string | MicroformatCite)[];
  repostOf?: string | MicroformatCite | readonly (string | MicroformatCite)[];
  syndication?: string | readonly string[];
  photo?: string | readonly string[];
  rsvp?: RsvpValue;
};

export type PredicatePair = {
  predicate: string;
  object: unknown;
};

export type PredicatePolarity = "potential" | "active" | "stable";

export type SelectedCell = {
  cell: PredicatePair & {
    subject?: unknown;
  };
};

export type FiniteAlgebra = {
  potential?: readonly PredicatePair[];
  active?: readonly PredicatePair[];
  stable?: readonly PredicatePair[];
};

export type PredicateRule = {
  field: keyof MicroformatProperties;
  repeatable?: boolean;
};

export type MicroformatProjectionOmissionReason = "empty-object" | "unknown-predicate" | "non-potential-polarity";

export type MicroformatProjectionOmission = {
  pair: PredicatePair;
  polarity: PredicatePolarity;
  reason: MicroformatProjectionOmissionReason;
};

export type MicroformatProjection = {
  properties: MicroformatProperties;
  potential: readonly PredicatePair[];
  active: readonly PredicatePair[];
  stable: readonly PredicatePair[];
  omitted: readonly MicroformatProjectionOmission[];
};

export type MicroformatDocumentOptions = {
  title?: string;
  lang?: string;
  bodyClass?: string;
  head?: readonly string[];
};

export const PREDICATE_MAP: Record<string, PredicateRule> = {
  name: { field: "name" },
  title: { field: "name" },
  url: { field: "url" },
  permalink: { field: "url" },
  uid: { field: "uid" },
  content: { field: "content" },
  body: { field: "content" },
  summary: { field: "summary" },
  excerpt: { field: "summary" },
  author: { field: "author" },
  published: { field: "published" },
  date: { field: "published" },
  updated: { field: "updated" },
  modified: { field: "updated" },
  category: { field: "category", repeatable: true },
  tag: { field: "category", repeatable: true },
  tags: { field: "category", repeatable: true },
  "in-reply-to": { field: "inReplyTo", repeatable: true },
  inReplyTo: { field: "inReplyTo", repeatable: true },
  "like-of": { field: "likeOf", repeatable: true },
  likeOf: { field: "likeOf", repeatable: true },
  "repost-of": { field: "repostOf", repeatable: true },
  repostOf: { field: "repostOf", repeatable: true },
  syndication: { field: "syndication", repeatable: true },
  "syndicate-to": { field: "syndication", repeatable: true },
  photo: { field: "photo", repeatable: true },
  rsvp: { field: "rsvp" },
};

function assignProperty(props: Record<string, unknown>, rule: PredicateRule, object: unknown): void {
  if (rule.repeatable) {
    const prior = props[rule.field];
    props[rule.field] = [...(Array.isArray(prior) ? prior : prior === undefined ? [] : [prior]), object];
    return;
  }
  props[rule.field] = object;
}

function isEmptyObject(object: unknown): boolean {
  return object === undefined || object === null || object === "";
}

function assertAbsoluteUrl(value: string, field: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
  } catch {
    throw new TypeError(`${field} must be an absolute http(s) URL`);
  }
}

function instant(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${field} must be an RFC-3339 instant`);
}

function requireAuthor(author: MicroformatAuthor, field: string): void {
  if (!author.name) throw new TypeError(`${field}.name is required`);
  if (author.url) assertAbsoluteUrl(author.url, `${field}.url`);
  if (author.photo) assertAbsoluteUrl(author.photo, `${field}.photo`);
}

function requireEntry(entry: MicroformatEntry): void {
  if (!entry.id) throw new TypeError("entry.id is required");
  if (!entry.title) throw new TypeError("entry.title is required");
  assertAbsoluteUrl(entry.url, "entry.url");
  if (entry.author) requireAuthor(entry.author, "entry.author");
  if (entry.published) instant(entry.published, "entry.published");
  if (entry.updated) instant(entry.updated, "entry.updated");
  for (const [field, values] of Object.entries({
    inReplyTo: entry.inReplyTo,
    likeOf: entry.likeOf,
    repostOf: entry.repostOf,
    bookmarkOf: entry.bookmarkOf,
    photos: entry.photos,
    syndication: entry.syndication,
  })) {
    for (const value of values ?? []) assertAbsoluteUrl(value, `entry.${field}`);
  }
}

function requireFeed(feed: MicroformatFeed): void {
  if (!feed.title) throw new TypeError("feed.title is required");
  assertAbsoluteUrl(feed.url, "feed.url");
  if (feed.author) requireAuthor(feed.author, "feed.author");
  for (const entry of feed.entries) requireEntry(entry);
  for (const [field, value] of Object.entries(feed.links ?? {})) {
    if (value) assertAbsoluteUrl(value, `feed.links.${field}`);
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const escapeAttr = escapeHtml;

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag);
}

export function attrs(map?: Record<string, unknown> | null): string {
  if (!map) return "";
  let out = "";
  for (const [name, value] of Object.entries(map)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) {
      out += ` ${name}`;
      continue;
    }
    out += ` ${name}="${escapeAttr(value)}"`;
  }
  return out;
}

export function classes(...tokens: (string | null | undefined | false)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (!token) continue;
    for (const part of token.split(/\s+/)) {
      if (!part || seen.has(part)) continue;
      seen.add(part);
      out.push(part);
    }
  }
  return out.join(" ");
}

export function el(tag: string, attributes?: Record<string, unknown> | null, children?: string | readonly string[]): string {
  const open = `<${tag}${attrs(attributes)}`;
  if (isVoidElement(tag)) return `${open} />`;
  const inner = Array.isArray(children) ? children.join("") : children ?? "";
  return `${open}>${inner}</${tag}>`;
}

function attr(value: unknown): string {
  return escapeHtml(value);
}

function link(className: string, href: string, label: string, rel?: string): string {
  return `<a class="${className}"${rel ? ` rel="${attr(rel)}"` : ""} href="${attr(href)}">${escapeHtml(label)}</a>`;
}

function links(className: string, values: readonly string[] | undefined, label: string, rel?: string): string[] {
  return (values ?? []).map((value) => link(className, value, label, rel));
}

function list(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function p(name: string, value: unknown, options: { tag?: string; extraClass?: string } = {}): string {
  return el(options.tag ?? "span", { class: classes(`p-${name}`, options.extraClass) }, escapeHtml(value));
}

export function u(
  name: string,
  url: unknown,
  options: { tag?: string; text?: string; alt?: string; extraClass?: string } = {},
): string {
  const tag = options.tag ?? "a";
  const className = classes(`u-${name}`, options.extraClass);
  if (tag === "a" || tag === "area" || tag === "link") {
    return el(tag, { class: className, href: url }, escapeHtml(options.text ?? url));
  }
  return el(tag, { class: className, src: url, alt: tag === "img" ? options.alt ?? "" : undefined });
}

export function dt(name: string, datetime: unknown, options: { text?: string; extraClass?: string } = {}): string {
  return el("time", { class: classes(`dt-${name}`, options.extraClass), datetime }, escapeHtml(options.text ?? datetime));
}

export function e(name: string, html: unknown, options: { tag?: string; extraClass?: string } = {}): string {
  return el(options.tag ?? "div", { class: classes(`e-${name}`, options.extraClass) }, html == null ? "" : String(html));
}

export function hCard(author: MicroformatAuthor): string {
  requireAuthor(author, "author");
  const name = author.url
    ? `<a class="p-name u-url" href="${attr(author.url)}">${escapeHtml(author.name)}</a>`
    : `<span class="p-name">${escapeHtml(author.name)}</span>`;
  const photo = author.photo ? `<img class="u-photo" src="${attr(author.photo)}" alt=""/>` : "";
  return `<span class="h-card">${photo}${name}</span>`;
}

function hAuthor(author: string | MicroformatAuthor | undefined): string {
  if (author === undefined) return "";
  if (typeof author === "string") return p("author", author);
  requireAuthor(author, "author");
  return el("span", { class: "p-author" }, hCard(author));
}

export function hCite(cite: MicroformatCite, options: { extraClass?: string; tag?: string } = {}): string {
  const parts = [
    cite.url ? u("url", cite.url, {
      text: cite.name ?? cite.url,
      ...(cite.name ? { extraClass: "p-name" } : {}),
    }) : "",
    !cite.url && cite.name ? p("name", cite.name) : "",
    cite.author ? hAuthor(cite.author) : "",
    cite.published ? dt("published", cite.published) : "",
    cite.contentHtml ? e("content", cite.contentHtml) : "",
  ].filter(Boolean);
  return el(options.tag ?? "div", { class: classes("h-cite", options.extraClass) }, parts);
}

function citeOrUrl(property: string, value: string | MicroformatCite): string {
  return typeof value === "string" ? u(property, value) : hCite(value, { extraClass: `u-${property}` });
}

export function hEntryFromProperties(props: MicroformatProperties, options: { extraClass?: string; tag?: string } = {}): string {
  const parts = [
    props.name ? p("name", props.name) : "",
    props.author ? hAuthor(props.author) : "",
    props.published ? dt("published", props.published) : "",
    props.updated ? dt("updated", props.updated) : "",
    props.url ? u("url", props.url) : "",
    props.uid ? u("uid", props.uid) : "",
    ...list(props.photo).map((photo) => u("photo", photo, { tag: "img" })),
    props.summary ? p("summary", props.summary) : "",
    props.content ? e("content", props.content) : "",
    ...list(props.category).map((category) => p("category", category)),
    ...list(props.inReplyTo).map((value) => citeOrUrl("in-reply-to", value as string | MicroformatCite)),
    ...list(props.likeOf).map((value) => citeOrUrl("like-of", value as string | MicroformatCite)),
    ...list(props.repostOf).map((value) => citeOrUrl("repost-of", value as string | MicroformatCite)),
    ...list(props.syndication).map((value) => u("syndication", value)),
    props.rsvp ? p("rsvp", props.rsvp) : "",
  ].filter(Boolean);
  return el(options.tag ?? "article", { class: classes("h-entry", options.extraClass) }, parts);
}

function isPropertyEntry(entry: MicroformatEntry | MicroformatProperties): entry is MicroformatProperties {
  return !("id" in entry) && ("name" in entry || "content" in entry || "category" in entry || "inReplyTo" in entry);
}

export function hEntry(entry: MicroformatEntry, fallbackAuthor?: MicroformatAuthor): string;
export function hEntry(entry: MicroformatProperties): string;
export function hEntry(entry: MicroformatEntry | MicroformatProperties, fallbackAuthor?: MicroformatAuthor): string {
  if (isPropertyEntry(entry)) return hEntryFromProperties(entry);
  const legacyEntry = entry as MicroformatEntry;
  requireEntry(legacyEntry);
  if (fallbackAuthor) requireAuthor(fallbackAuthor, "fallbackAuthor");
  const author = legacyEntry.author ?? fallbackAuthor;
  const content = legacyEntry.contentHtml
    ? `<div class="e-content">${legacyEntry.contentHtml}</div>`
    : legacyEntry.summary
      ? `<p class="p-summary">${escapeHtml(legacyEntry.summary)}</p>`
      : "";
  const relations = [
    ...links("u-in-reply-to", legacyEntry.inReplyTo, "in reply to"),
    ...links("u-like-of", legacyEntry.likeOf, "liked"),
    ...links("u-repost-of", legacyEntry.repostOf, "reposted"),
    ...links("u-bookmark-of", legacyEntry.bookmarkOf, "bookmarked"),
    ...(legacyEntry.rsvp ? [`<data class="p-rsvp" value="${attr(legacyEntry.rsvp)}">${escapeHtml(legacyEntry.rsvp)}</data>`] : []),
    ...(legacyEntry.photos ?? []).map((photo) => `<img class="u-photo" src="${attr(photo)}" alt=""/>`),
    ...links("u-syndication", legacyEntry.syndication, "syndication", "syndication"),
  ];
  return [
    `<article class="h-entry" id="${attr(legacyEntry.id)}">`,
    `  <h2 class="p-name">${escapeHtml(legacyEntry.title)}</h2>`,
    `  ${link("u-url u-uid", legacyEntry.url, legacyEntry.url)}`,
    legacyEntry.published ? `  <time class="dt-published" datetime="${attr(legacyEntry.published)}">${escapeHtml(legacyEntry.published)}</time>` : "",
    legacyEntry.updated ? `  <time class="dt-updated" datetime="${attr(legacyEntry.updated)}">${escapeHtml(legacyEntry.updated)}</time>` : "",
    author ? `  <span class="p-author">${hCard(author)}</span>` : "",
    legacyEntry.summary && legacyEntry.contentHtml ? `  <p class="p-summary">${escapeHtml(legacyEntry.summary)}</p>` : "",
    content ? `  ${content}` : "",
    ...(legacyEntry.tags ?? []).map((tag) => `  <a class="p-category" href="${attr(tag.startsWith("http") ? tag : `#${tag}`)}">${escapeHtml(tag)}</a>`),
    ...relations.map((relation) => `  ${relation}`),
    "</article>",
  ].filter(Boolean).join("\n");
}

export function projectMicroformatPairs(
  pairs: Iterable<PredicatePair>,
  polarity: PredicatePolarity = "potential",
): MicroformatProjection {
  const props: Record<string, unknown> = {};
  const potential: PredicatePair[] = [];
  const active: PredicatePair[] = [];
  const stable: PredicatePair[] = [];
  const omitted: MicroformatProjectionOmission[] = [];

  for (const { predicate, object } of pairs) {
    const pair = { predicate, object };
    if (polarity === "active") active.push(pair);
    if (polarity === "stable") stable.push(pair);
    if (polarity !== "potential") {
      omitted.push({ pair, polarity, reason: "non-potential-polarity" });
      continue;
    }

    const rule = PREDICATE_MAP[predicate];
    if (!rule) {
      omitted.push({ pair, polarity, reason: "unknown-predicate" });
      continue;
    }
    if (isEmptyObject(object)) {
      omitted.push({ pair, polarity, reason: "empty-object" });
      continue;
    }

    potential.push(pair);
    assignProperty(props, rule, object);
  }

  return {
    properties: props as MicroformatProperties,
    potential,
    active,
    stable,
    omitted,
  };
}

export function projectFiniteAlgebra(algebra: FiniteAlgebra): MicroformatProjection {
  const potential = projectMicroformatPairs(algebra.potential ?? [], "potential");
  const active = projectMicroformatPairs(algebra.active ?? [], "active");
  const stable = projectMicroformatPairs(algebra.stable ?? [], "stable");
  return {
    properties: potential.properties,
    potential: potential.potential,
    active: active.active,
    stable: stable.stable,
    omitted: [...potential.omitted, ...active.omitted, ...stable.omitted],
  };
}

export function projectSelectedCells(cells: readonly SelectedCell[]): MicroformatProjection {
  return projectMicroformatPairs(cells.map(({ cell }) => ({ predicate: String(cell.predicate), object: cell.object })));
}

export function propsFromPairs(pairs: Iterable<PredicatePair>): MicroformatProperties {
  return projectMicroformatPairs(pairs).properties;
}

export function hEntryFromProjection(projection: MicroformatProjection, options: { extraClass?: string; tag?: string } = {}): string {
  return hEntryFromProperties(projection.properties, options);
}

export function microformatDocument(body: string, options: MicroformatDocumentOptions = {}): string {
  const title = options.title ? `<title>${escapeHtml(options.title)}</title>` : "";
  const lang = options.lang ?? "en";
  const bodyClass = classes("microformats", options.bodyClass);
  return [
    "<!doctype html>",
    `<html lang="${attr(lang)}">`,
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    title ? `  ${title}` : "",
    ...(options.head ?? []).map((head) => `  ${head}`),
    "</head>",
    `<body class="${attr(bodyClass)}">`,
    body,
    "</body>",
    "</html>",
  ].filter(Boolean).join("\n");
}

export function hFeedDocument(feed: MicroformatFeed, options: MicroformatDocumentOptions = {}): string {
  return microformatDocument(hFeed(feed), {
    ...options,
    title: options.title ?? feed.title,
  });
}

export function entryDocumentFromFiniteAlgebra(algebra: FiniteAlgebra, options: MicroformatDocumentOptions = {}): string {
  const projection = projectFiniteAlgebra(algebra);
  const title = options.title ?? projection.properties.name;
  return microformatDocument(
    hEntryFromProjection(projection),
    title ? { ...options, title } : options,
  );
}

export function entryDocumentFromSelectedCells(cells: readonly SelectedCell[], options: MicroformatDocumentOptions = {}): string {
  const projection = projectSelectedCells(cells);
  const title = options.title ?? projection.properties.name;
  return microformatDocument(
    hEntryFromProjection(projection),
    title ? { ...options, title } : options,
  );
}

export function entryFromSelectedCells(cells: readonly SelectedCell[], options: { extraClass?: string; tag?: string } = {}): string {
  return hEntryFromProjection(projectSelectedCells(cells), options);
}

export function entryFromFiniteAlgebra(algebra: FiniteAlgebra, options: { extraClass?: string; tag?: string } = {}): string {
  return hEntryFromProjection(projectFiniteAlgebra(algebra), options);
}

export function feedNavigation(linksForPage: MicroformatPagingLinks = {}): string {
  const items = [
    linksForPage.self ? link("u-url", linksForPage.self, "self", "self") : "",
    linksForPage.first ? link("u-url", linksForPage.first, "first", "first") : "",
    linksForPage.previous ? link("u-url", linksForPage.previous, "previous", "prev") : "",
    linksForPage.next ? link("u-url", linksForPage.next, "next", "next") : "",
    linksForPage.last ? link("u-url", linksForPage.last, "last", "last") : "",
  ].filter(Boolean);
  return items.length > 0 ? `<nav class="pagination">${items.join(" ")}</nav>` : "";
}

export function hFeed(feed: MicroformatFeed): string {
  requireFeed(feed);
  return [
    `<section class="h-feed">`,
    `  <h1 class="p-name">${escapeHtml(feed.title)}</h1>`,
    `  ${link("u-url", feed.url, feed.url, "self")}`,
    feed.author ? `  <span class="p-author">${hCard(feed.author)}</span>` : "",
    feedNavigation(feed.links),
    ...feed.entries.map((entry) => hEntry(entry, feed.author)),
    feedNavigation(feed.links),
    `</section>`,
  ].filter(Boolean).join("\n");
}
