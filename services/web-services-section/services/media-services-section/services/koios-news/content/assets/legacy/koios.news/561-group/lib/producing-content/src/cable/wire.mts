// The newswire: a discrete, self-sufficient claim stream with a masthead.
//
// Vocabulary, in the standard sense: a newswire is ONE wire — a provenanced
// claim stream whose canonical resources are claim-state bundles (the
// carrier from @emsenn/content/topology/news), one JSON file per subject in the
// wire's own store directory. The wire OWNS its store — reading bundles for
// serving, and writing them through the production kit at the bottom of
// this module — its item projection, and every surface it publishes. It
// knows nothing about cables, domains, or routing: only its own base URL,
// and every canonical URL it publishes derives from that base and nothing
// else.
//
// Web-free: the surface forming uses @emsenn/content's pure feed codecs, and
// the HTML document shell is an INJECTED `render` function (the site supplies
// one built on its web theme). Without a render, a minimal bare document is
// produced — the wire's pre-theming default.
//
// Doctrine: the wire publishes claim-state bundles; HTML and feeds are
// lossy projections, and no projection displays a claim stronger than its
// force. The store is re-read per request (no caching): the store is the
// state, the wire a projection of it. An invalid store file is skipped and
// reported through the injected onSkip witness — a bad file is absent, not
// fatal — and a missing store directory is an empty wire (its producer may
// simply not have run yet). TypeError is the only throw, for malformed
// shapes only.

import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import {
  assertClaimStateBundle,
  correctionClaims,
  effectiveClaims,
  type AssertedClaim,
  type ClaimStateBundle,
} from "@emsenn/content/topology/news";
import {
  atom,
  escapeHtml,
  jsonFeed,
  rss2,
  type FeedChannel,
  type FeedItem,
} from "@emsenn/content/codecs/feed";

import {
  auditOf,
  claimLine,
  freshnessOf,
  projectItem,
  sortReverseChronological,
  type WireAuditEntry,
  type WireItem,
} from "./projection.mjs";

/** A typed per-page head link (feed alternates etc.); structurally the web
 * theming `HeadLink`, named locally so the wire carries no web dependency. */
export type RenderLink = Readonly<{ rel: string; type?: string; href: string; title?: string }>;

/**
 * The injected HTML document shell. A site supplies one built on its web theme
 * (`(title, content, opts) => render(theme, content, { title, ...opts })`);
 * the wire stays web-free. The callback receives INNER content and owns the
 * document and the single landmark.
 */
export type RenderDocument = (
  title: string,
  content: string,
  options: Readonly<{
    description?: string;
    canonical?: string;
    siteName?: string;
    links?: readonly RenderLink[];
  }>,
) => string;

// — The store: one ClaimStateBundle per subject, kept byte-for-byte. —

export type StoredBundle = Readonly<{
  /** The subject, as the bundle itself states it. */
  subject: string;
  /** The exact file bytes, for verbatim serving of the canonical resource. */
  raw: string;
  bundle: ClaimStateBundle;
}>;

/** Read one bundle file; TypeError if it is not a ClaimStateBundle. */
export async function readBundleFile(path: string): Promise<StoredBundle> {
  const raw = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError(`not JSON: ${path}`);
  }
  assertClaimStateBundle(parsed);
  return Object.freeze({ subject: parsed.subject, raw, bundle: parsed });
}

/**
 * Read every `*.json` bundle in a wire's store, in stable filename order.
 * Invalid files are skipped and reported to `onSkip`; an unreadable store
 * directory is an empty wire.
 */
export async function loadWireBundles(
  storeDir: string,
  onSkip: (message: string) => void = () => {},
): Promise<readonly StoredBundle[]> {
  let entries: readonly string[];
  try {
    entries = await readdir(storeDir);
  } catch {
    onSkip(`store not readable (treated as empty): ${storeDir}`);
    return Object.freeze([]);
  }
  const stored: StoredBundle[] = [];
  for (const entry of entries.filter((name) => name.endsWith(".json")).sort()) {
    const path = join(storeDir, entry);
    try {
      stored.push(await readBundleFile(path));
    } catch (error) {
      onSkip(`skipping ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return Object.freeze(stored);
}

// — The wire itself. —

export type NewswireAuthor = string | Readonly<{ name: string; url?: string }>;

export type NewswireDefinition = Readonly<{
  /** The masthead title. */
  title: string;
  /** The masthead description. */
  description: string;
  /** The masthead author for the wire's surfaces. */
  author?: NewswireAuthor;
  /** The wire's beat keyword, when one applies. */
  keyword?: string;
}>;

/** One served representation: status, headers (content-type included), body. */
export type WireSurface = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;

export type WireSurfaceUrls = Readonly<{
  hFeed: string;
  rss: string;
  atom: string;
  jsonFeed: string;
  items: string;
  corrections: string;
  audit: string;
}>;

/** The wire's surface URLs, all derived from its base and nothing else. */
export function wireSurfaceUrls(baseUrl: string): WireSurfaceUrls {
  return Object.freeze({
    hFeed: baseUrl,
    rss: `${baseUrl}feed.xml`,
    atom: `${baseUrl}feed.atom`,
    jsonFeed: `${baseUrl}feed.json`,
    items: `${baseUrl}items/`,
    corrections: `${baseUrl}corrections.json`,
    audit: `${baseUrl}audit.json`,
  });
}

export type NewswireDescription = Readonly<{
  name: string;
  title: string;
  description: string;
  keyword?: string;
  baseUrl: string;
  surfaces: WireSurfaceUrls;
  /** Latest asserted instant in the wire, or null when nothing is asserted. */
  freshness: string | null;
}>;

export type WireCorrection = Readonly<{
  subject: string;
  claim: AssertedClaim;
  /** The claim the correction names, in full; null if it names none we hold. */
  corrects: AssertedClaim | null;
}>;

export type Newswire = Readonly<{
  /** The wire's name: lowercase atoms joined by hyphens; the URL atom. */
  name: string;
  /** The wire's canonical base URL (scheme through trailing slash). */
  baseUrl: string;
  definition: NewswireDefinition;
  /** The wire's store directory, absolute. */
  storeDir: string;
  /** The wire's items, reverse-chronological. */
  items(): Promise<readonly WireItem[]>;
  /** The wire's masthead, surface URLs, and freshness — its directory row. */
  describe(): Promise<NewswireDescription>;
  /**
   * Serve one surface by sub-path under the wire's base: `/` (h-feed),
   * `/items/<subject>.json` (canonical bundle, verbatim bytes),
   * `/items/<subject>` (h-entry), `/feed.xml`, `/feed.atom`, `/feed.json`,
   * `/corrections.json`, `/audit.json`. Null when the path names no surface
   * of this wire.
   */
  handle(subPath: string): Promise<WireSurface | null>;
}>;

export type NewswireOptions = Readonly<{
  name: string;
  baseUrl: string;
  definition: NewswireDefinition;
  storeDir: string;
  /** Witness for skipped store files (default: silent). */
  onSkip?: (message: string) => void;
  /** When set, HTML surfaces render through this injected document shell. */
  render?: RenderDocument;
}>;

// The wire-name law, as stated by @emsenn/content/topology/news: lowercase atoms
// joined by hyphens, so every routing projection is injective and
// prefix-free.
const WIRE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function jsonSurface(value: unknown): WireSurface {
  return Object.freeze({
    status: 200,
    headers: Object.freeze({ "content-type": "application/json; charset=utf-8" }),
    body: `${JSON.stringify(value, null, 2)}\n`,
  });
}

function htmlSurface(body: string): WireSurface {
  return Object.freeze({
    status: 200,
    headers: Object.freeze({ "content-type": "text/html; charset=utf-8" }),
    body,
  });
}

export type HtmlPageOptions = Readonly<{
  /** Extra raw <head> HTML (untyped links/meta). */
  head?: string;
  /** Typed per-page head links (feed alternates etc.). */
  links?: readonly RenderLink[];
  /** When set, render the document through this injected shell. */
  render?: RenderDocument;
  description?: string;
  canonical?: string;
  siteName?: string;
}>;

/**
 * Wrap inner content into an HTML document. With a `render`, the injected shell
 * owns the document (the site's theme — reset, tokens, component CSS,
 * landmarks); without one, a minimal bare document is produced (the wire's
 * pre-theming default). Callers pass INNER content; the document supplies the
 * single <main>.
 */
export function htmlPage(title: string, content: string, options: HtmlPageOptions = {}): string {
  if (options.render) {
    return options.render(title, content, {
      ...(options.description === undefined ? {} : { description: options.description }),
      ...(options.canonical === undefined ? {} : { canonical: options.canonical }),
      ...(options.siteName === undefined ? {} : { siteName: options.siteName }),
      ...(options.links === undefined ? {} : { links: options.links }),
    });
  }
  const linkTags = (options.links ?? [])
    .map(
      (l) =>
        `<link rel="${escapeHtml(l.rel)}"${l.type ? ` type="${escapeHtml(l.type)}"` : ""} href="${escapeHtml(l.href)}"${l.title ? ` title="${escapeHtml(l.title)}"` : ""}>`,
    )
    .join("\n");
  const head = `${options.head ?? ""}${linkTags ? `${linkTags}\n` : ""}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${head}</head>
<body>
<main>
${content}</main>
</body>
</html>
`;
}

function feedItemsOf(baseUrl: string, stored: readonly StoredBundle[]): readonly FeedItem[] {
  const items = sortReverseChronological(stored.map(({ bundle }) => projectItem(bundle)));
  return items
    .filter((item): item is WireItem & { published: string } => item.published !== undefined)
    .map((item) => {
      const wireUrl = `${baseUrl}items/${item.subject}`;
      return {
        id: wireUrl,
        url: item.sourceUrl ?? wireUrl,
        title: item.title,
        ...(item.summary === undefined ? {} : { summary: item.summary }),
        published: item.published,
        ...(item.updated === undefined ? {} : { updated: item.updated }),
      };
    });
}

function channelFor(definition: NewswireDefinition, baseUrl: string, feedUrl: string): FeedChannel {
  const author =
    typeof definition.author === "string" ? { name: definition.author } : definition.author;
  return {
    title: definition.title,
    description: definition.description,
    homePageUrl: baseUrl,
    feedUrl,
    ...(author === undefined
      ? {}
      : { author: { name: author.name, ...(author.url === undefined ? {} : { url: author.url }) } }),
  };
}

/** /corrections.json — every correction across the wire, newest first. */
function wireCorrections(
  wireName: string,
  stored: readonly StoredBundle[],
): Readonly<{ wire: string; corrections: readonly WireCorrection[] }> {
  const corrections: WireCorrection[] = [];
  for (const { bundle } of stored) {
    for (const claim of correctionClaims(bundle)) {
      const target = bundle.claims.find((candidate) => candidate.id === claim.corrects) ?? null;
      corrections.push(Object.freeze({ subject: bundle.subject, claim, corrects: target }));
    }
  }
  corrections.sort((a, b) => b.claim.time.asserted.localeCompare(a.claim.time.asserted));
  return Object.freeze({ wire: wireName, corrections: Object.freeze(corrections) });
}

/** /audit.json — per-item claim counts, force/status histograms, witnesses. */
function wireAudit(
  wireName: string,
  stored: readonly StoredBundle[],
): Readonly<{ wire: string; items: readonly WireAuditEntry[] }> {
  return Object.freeze({
    wire: wireName,
    items: Object.freeze(
      stored
        .map(({ bundle }) => auditOf(bundle))
        .sort((a, b) => a.subject.localeCompare(b.subject)),
    ),
  });
}

/** The wire's h-feed: its masthead and every item as an h-entry. */
function hFeedHtml(
  definition: NewswireDefinition,
  baseUrl: string,
  stored: readonly StoredBundle[],
  render?: RenderDocument,
): string {
  const items = sortReverseChronological(stored.map(({ bundle }) => projectItem(bundle)));
  const entries = items
    .map((item) => {
      const url = `${baseUrl}items/${item.subject}`;
      const summary =
        item.summary === undefined ? "" : `<p class="p-summary">${escapeHtml(item.summary)}</p>\n`;
      const published =
        item.published === undefined
          ? ""
          : `<p><time class="dt-published" datetime="${escapeHtml(item.published)}">${escapeHtml(item.published)}</time></p>\n`;
      return `<article class="h-entry">
<h2><a class="u-url p-name" href="${escapeHtml(url)}">${escapeHtml(item.title)}</a></h2>
${summary}${published}</article>`;
    })
    .join("\n");
  const links: readonly RenderLink[] = [
    { rel: "alternate", type: "application/rss+xml", href: `${baseUrl}feed.xml` },
    { rel: "alternate", type: "application/atom+xml", href: `${baseUrl}feed.atom` },
    { rel: "alternate", type: "application/feed+json", href: `${baseUrl}feed.json` },
  ];
  const content = `<div class="h-feed">
<h1 class="p-name">${escapeHtml(definition.title)}</h1>
<p class="p-summary">${escapeHtml(definition.description)}</p>
${entries}
</div>`;
  return htmlPage(definition.title, content, {
    links,
    description: definition.description,
    canonical: baseUrl,
    siteName: definition.title,
    ...(render === undefined ? {} : { render }),
  });
}

/** One item's h-entry: every effective claim as a modality-preserving line. */
function hEntryHtml(
  definition: NewswireDefinition,
  baseUrl: string,
  stored: StoredBundle,
  render?: RenderDocument,
): string {
  const item = projectItem(stored.bundle);
  const lines = effectiveClaims(stored.bundle)
    .map((claim) => `  <li>${escapeHtml(claimLine(claim))}</li>`)
    .join("\n");
  const canonical = `${baseUrl}items/${item.subject}.json`;
  const published =
    item.published === undefined
      ? ""
      : `<p><time class="dt-published" datetime="${escapeHtml(item.published)}">${escapeHtml(item.published)}</time></p>\n`;
  const summary =
    item.summary === undefined ? "" : `<p class="p-summary">${escapeHtml(item.summary)}</p>\n`;
  const content = `<article class="h-entry">
<h1 class="p-name">${escapeHtml(item.title)}</h1>
${summary}${published}<ul class="claims">
${lines}
</ul>
<p><a href="${escapeHtml(canonical)}">canonical claim-state bundle</a> · <a href="${escapeHtml(baseUrl)}">${escapeHtml(definition.title)}</a></p>
</article>`;
  return htmlPage(item.title, content, {
    canonical,
    siteName: definition.title,
    ...(render === undefined ? {} : { render }),
  });
}

function assertNewswireOptions(options: NewswireOptions): void {
  if (typeof options.name !== "string" || !WIRE_NAME_PATTERN.test(options.name)) {
    throw new TypeError(`wire name must be lowercase atoms (got ${String(options.name)})`);
  }
  if (typeof options.baseUrl !== "string" || !options.baseUrl.endsWith("/")) {
    throw new TypeError(`wire baseUrl must be a URL ending in "/" (got ${String(options.baseUrl)})`);
  }
  if (typeof options.storeDir !== "string" || options.storeDir.length === 0) {
    throw new TypeError("wire storeDir must be a non-empty path");
  }
  const definition = options.definition as NewswireDefinition | null | undefined;
  if (definition === null || typeof definition !== "object") {
    throw new TypeError("wire definition must be an object");
  }
  for (const key of ["title", "description"] as const) {
    if (typeof definition[key] !== "string" || definition[key].length === 0) {
      throw new TypeError(`wire ${options.name}: definition.${key} must be a non-empty string`);
    }
  }
}

/**
 * Construct a newswire over a store directory. The wire is self-sufficient:
 * it can serve alone (hand its surfaces to any listener) or be bundled into
 * a newscable; either way it serves exactly the same representations.
 */
export function createNewswire(options: NewswireOptions): Newswire {
  assertNewswireOptions(options);
  const { name, baseUrl, storeDir } = options;
  const definition = Object.freeze({ ...options.definition });
  const onSkip = options.onSkip ?? (() => {});
  const render = options.render;

  const loadStore = (): Promise<readonly StoredBundle[]> => loadWireBundles(storeDir, onSkip);

  async function handle(subPath: string): Promise<WireSurface | null> {
    const stored = await loadStore();
    if (subPath === "/") return htmlSurface(hFeedHtml(definition, baseUrl, stored, render));
    if (subPath === "/feed.xml") {
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "application/rss+xml; charset=utf-8" }),
        body: rss2(channelFor(definition, baseUrl, `${baseUrl}feed.xml`), feedItemsOf(baseUrl, stored)),
      });
    }
    if (subPath === "/feed.atom") {
      const items = feedItemsOf(baseUrl, stored);
      if (items.length === 0) return null; // Atom requires an instant; an unasserted wire has none yet.
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "application/atom+xml; charset=utf-8" }),
        body: atom(channelFor(definition, baseUrl, `${baseUrl}feed.atom`), items),
      });
    }
    if (subPath === "/feed.json") {
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "application/feed+json; charset=utf-8" }),
        body: jsonFeed(channelFor(definition, baseUrl, `${baseUrl}feed.json`), feedItemsOf(baseUrl, stored)),
      });
    }
    if (subPath === "/corrections.json") return jsonSurface(wireCorrections(name, stored));
    if (subPath === "/audit.json") return jsonSurface(wireAudit(name, stored));
    if (subPath.startsWith("/items/")) {
      const rest = decodeURIComponent(subPath.slice("/items/".length));
      if (rest.endsWith(".json")) {
        const subject = rest.slice(0, -".json".length);
        const found = stored.find((candidate) => candidate.subject === subject);
        if (found === undefined) return null;
        return Object.freeze({
          status: 200,
          headers: Object.freeze({ "content-type": "application/json; charset=utf-8" }),
          body: found.raw,
        });
      }
      const found = stored.find((candidate) => candidate.subject === rest);
      if (found === undefined) return null;
      return htmlSurface(hEntryHtml(definition, baseUrl, found, render));
    }
    return null;
  }

  return Object.freeze({
    name,
    baseUrl,
    definition,
    storeDir,
    async items(): Promise<readonly WireItem[]> {
      const stored = await loadStore();
      return sortReverseChronological(stored.map(({ bundle }) => projectItem(bundle)));
    },
    async describe(): Promise<NewswireDescription> {
      const stored = await loadStore();
      return Object.freeze({
        name,
        title: definition.title,
        description: definition.description,
        ...(definition.keyword === undefined ? {} : { keyword: definition.keyword }),
        baseUrl,
        surfaces: wireSurfaceUrls(baseUrl),
        freshness: freshnessOf(stored.map(({ bundle }) => bundle)),
      });
    },
    handle,
  });
}

// — The production kit: writing the store is the wire's own affair. —
//
// Producers ASSERT: they write claim-state bundles into the wire's store,
// append-only. Every claim built here carries force "computes" — a
// deterministic computation with a stated method and accuracy, witnessed by
// the library that computed it. Time is bitemporal: time.valid is when the
// claimed state of affairs holds, time.asserted the real instant of
// assertion.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The day under assertion: an explicit YYYY-MM-DD argument, or today. */
export function resolveDate(argument: string | undefined): string {
  if (argument === undefined) {
    return new Date().toISOString().slice(0, 10); // law-allow: wall-clock-as-data — the default subject day IS today's date, recorded as data; an explicit argument overrides it.
  }
  if (!DATE_PATTERN.test(argument)) throw new TypeError(`not a YYYY-MM-DD date: ${argument}`);
  return argument;
}

/** The assertion instant: assertions are events, stamped as they happen. */
export function assertedNow(): string {
  return new Date().toISOString(); // law-allow: wall-clock-as-data — time.asserted records the real instant of assertion, as data on the claim, never as ordering.
}

/** Civil-date arithmetic: dateIso + days, no wall clock involved. */
export function addDays(dateIso: string, days: number): string {
  if (!DATE_PATTERN.test(dateIso)) throw new TypeError(`not a YYYY-MM-DD date: ${dateIso}`);
  if (!Number.isSafeInteger(days)) throw new TypeError(`days must be an integer: ${String(days)}`);
  const [year, month, day] = dateIso.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export type ComputedClaimInput = Readonly<{
  id: string;
  predicate: string;
  object: unknown;
  /** time.asserted — the assertion instant. */
  asserted: string;
  /** time.valid — when the claimed state of affairs holds, if time-bound. */
  valid?: string;
  witness: string;
  method?: string;
  accuracy?: string;
  citation?: string;
}>;

/** A force-"computes" claim: deterministic, witnessed, status "supported". */
export function computesClaim(input: ComputedClaimInput): AssertedClaim {
  return Object.freeze({
    id: input.id,
    proposition: Object.freeze({ predicate: input.predicate, object: input.object }),
    time: Object.freeze({
      asserted: input.asserted,
      ...(input.valid === undefined ? {} : { valid: input.valid }),
    }),
    force: "computes" as const,
    provenance: Object.freeze({
      witness: input.witness,
      ...(input.method === undefined ? {} : { method: input.method }),
      ...(input.accuracy === undefined ? {} : { accuracy: input.accuracy }),
      ...(input.citation === undefined ? {} : { citation: input.citation }),
    }),
    status: "supported" as const,
  });
}

export type WriteOutcome = "written" | "already-present";

/**
 * Append-only write: `<subject>.json` in the store, created only if absent.
 * Reruns are idempotent — an existing bundle is never overwritten (upstream
 * corrections re-write bundles through withCorrection, not through this).
 */
export async function writeBundleIfAbsent(
  storeDir: string,
  bundle: ClaimStateBundle,
): Promise<WriteOutcome> {
  assertClaimStateBundle(bundle);
  await mkdir(storeDir, { recursive: true });
  const path = join(storeDir, `${bundle.subject}.json`);
  try {
    await access(path);
    return "already-present";
  } catch {
    const text = JSON.stringify(bundle, null, 2);
    await writeFile(path, `${text}\n`, { flag: "wx" });
    return "written";
  }
}

/** Report one producer write to stdout, uniformly. */
export function reportWrite(wire: string, subject: string, outcome: WriteOutcome): void {
  process.stdout.write(`${wire} ${subject}: ${outcome}\n`);
}
