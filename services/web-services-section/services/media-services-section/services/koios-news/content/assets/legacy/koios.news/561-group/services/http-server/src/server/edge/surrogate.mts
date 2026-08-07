// edge/surrogate.ts — Surrogate-Control and Surrogate-Key cache management.

import { chargeOfUtterances, witness, UtteranceLog, recallWhere } from "../internal/witness.mjs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCacheControl, parseDirectiveList } from "@emsenn/computing-with-http/codecs/http";
import type { Middleware } from "../types.mjs";

const SURROGATE_CONTROL = "Surrogate-Control";
const SURROGATE_KEY = "Surrogate-Key";
const CACHE_TAG = "Cache-Tag";

type HeaderValue = number | string | string[] | undefined;

export type SurrogateOptions = {
  /** Strip Surrogate-Control/Surrogate-Key/Cache-Tag before forwarding to clients (default true). */
  strip?: boolean;
  /** Resolve CDN-specific max-age from Surrogate-Control (default true). */
  resolveTtl?: boolean;
  onPurge?: (keys: string[]) => void;
};

export type SurrogateCacheOptions = SurrogateOptions & {
  maxEntries?: number;
  defaultTtlMs?: number;
  keyBy?: (req: IncomingMessage) => string;
  varyHeaders?: readonly string[];
};

type CacheEntry = {
  status: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  expiresAt: number;
  storedAt: number;
  tags: string[];
};

export type SurrogateStats = {
  entries: number;
  tags: number;
  tagged: number;
  hits: number;
  misses: number;
  purgedTags: number;
  purgedEntries: number;
  surrogateTtlSet: number;
};

export type SurrogateManager = {
  /** Middleware to attach to the App. */
  middleware: Middleware;
  /** Purge all cached/recorded responses tagged with any of these surrogate keys. */
  purge(keys: string[]): string[];
  /** Tag the current response with surrogate keys (call from handler). */
  tag(ctx: Parameters<Middleware>[0], keys: string[]): void;
};

export type SurrogateCacheManager = SurrogateManager & {
  purgeTag(key: string): number;
  purgeAll(): number;
  stats(): SurrogateStats;
};

export type SurrogateControl = {
  maxAge: number | null;
  noStore: boolean;
  staleWhileRevalidate: number | null;
};

export function parseTags(value: HeaderValue): string[] {
  const parts = Array.isArray(value) ? value : value == null ? [] : [String(value)];
  const seen = new Set<string>();
  for (const part of parts) {
    for (const token of String(part).split(/[\s,]+/)) {
      const tag = token.trim();
      if (tag) seen.add(tag);
    }
  }
  return [...seen];
}

function nonnegativeSeconds(value: true | string | undefined): number | null {
  if (value === true || value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function parseSurrogateControl(value: HeaderValue): SurrogateControl {
  const raw = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  if (!raw.trim()) return { maxAge: null, noStore: false, staleWhileRevalidate: null };
  const directives = parseDirectiveList(raw);
  const noStore = directives["no-store"] === true;
  return {
    maxAge: noStore ? 0 : nonnegativeSeconds(directives["max-age"]),
    noStore,
    staleWhileRevalidate: nonnegativeSeconds(directives["stale-while-revalidate"]),
  };
}

function cacheControlMaxAge(value: HeaderValue): number | null {
  const policy = parseCacheControl(Array.isArray(value) ? value : value == null ? undefined : String(value));
  return policy.sMaxage ?? policy.maxAge ?? null;
}

function cacheControlNoStore(value: HeaderValue): boolean {
  const policy = parseCacheControl(Array.isArray(value) ? value : value == null ? undefined : String(value));
  return policy.noStore === true || policy.visibility === "private";
}

function header(res: ServerResponse, name: string): HeaderValue {
  return res.getHeader(name) as HeaderValue;
}

function headerRecord(res: ServerResponse): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(res.getHeaders())) {
    if (value == null) continue;
    if (Array.isArray(value)) headers[name] = value.map(String);
    else headers[name] = String(value);
  }
  return headers;
}

function applyHeaders(res: ServerResponse, headers: Record<string, string | string[]>): void {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
}

function defaultKey(req: IncomingMessage, varyHeaders: readonly string[]): string {
  const vary = varyHeaders.map((name) => `${name}=${req.headers[name] ?? ""}`).join(";");
  return `${req.method ?? "GET"}:${req.url ?? "/"}:${vary}`;
}

export function surrogateCache(opts: SurrogateCacheOptions = {}): SurrogateCacheManager {
  const strip = opts.strip !== false;
  const resolveTtl = opts.resolveTtl !== false;
  const maxEntries = opts.maxEntries ?? 1000;
  const defaultTtlMs = opts.defaultTtlMs ?? 60_000;
  const varyHeaders = opts.varyHeaders ?? ["accept", "accept-encoding"];
  const keyFor = opts.keyBy ?? ((req: IncomingMessage) => defaultKey(req, varyHeaders));

  const entries = new Map<string, CacheEntry>();
  const tagIndex = new Map<string, Set<string>>();
  const keyTags = new Map<string, Set<string>>();
  const counters = { hits: 0, misses: 0, purgedTags: 0, purgedEntries: 0, surrogateTtlSet: 0 };

  function unlink(key: string): void {
    const tags = keyTags.get(key);
    if (!tags) return;
    for (const tag of tags) {
      const keys = tagIndex.get(tag);
      keys?.delete(key);
      if (keys?.size === 0) tagIndex.delete(tag);
    }
    keyTags.delete(key);
  }

  function link(key: string, tags: readonly string[]): void {
    unlink(key);
    if (tags.length === 0) return;
    const set = new Set(tags);
    keyTags.set(key, set);
    for (const tag of set) {
      let keys = tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  function evictOldest(): void {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) return;
    entries.delete(oldest);
    unlink(oldest);
  }

  function purgeKey(key: string): number {
    const existed = entries.delete(key);
    unlink(key);
    return existed ? 1 : 0;
  }

  function purgeTag(key: string): number {
    const keys = tagIndex.get(key);
    if (!keys) return 0;
    let removed = 0;
    for (const cacheKey of [...keys]) removed += purgeKey(cacheKey);
    counters.purgedTags++;
    counters.purgedEntries += removed;
    opts.onPurge?.([key]);
    return removed;
  }

  function purgeAll(): number {
    const removed = entries.size;
    entries.clear();
    tagIndex.clear();
    keyTags.clear();
    counters.purgedEntries += removed;
    return removed;
  }

  const middleware: Middleware = (ctx) => {
    const { req, res } = ctx;
    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") return;

    const key = keyFor(req);
    const entry = entries.get(key);
    if (entry && entry.expiresAt > Date.now()) { // law-allow: wall-clock-as-data — cache entry freshness check (TTL bookkeeping), not ordering
      counters.hits++;
      applyHeaders(res, entry.headers);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Age", String(Math.max(0, Math.floor((Date.now() - entry.storedAt) / 1000)))); // law-allow: wall-clock-as-data — Age header is HTTP protocol testimony (RFC 9111)
      res.writeHead(entry.status).end(method === "HEAD" ? undefined : entry.body);
      return true;
    }
    if (entry) purgeKey(key);
    counters.misses++;

    const chunks: Buffer[] = [];
    const origWrite = res.write.bind(res) as (...args: unknown[]) => boolean;
    const origEnd = res.end.bind(res) as (...args: unknown[]) => ServerResponse;
    const origWriteHead = res.writeHead.bind(res) as (...args: unknown[]) => ServerResponse;
    let finalized = false;
    let status = res.statusCode || 200;
    let tags: string[] = [];
    let shouldStore = method === "GET";
    let ttlMs = defaultTtlMs;

    const finalize = (statusCode = res.statusCode || status): void => {
      if (finalized) return;
      finalized = true;
      status = statusCode;
      tags = parseTags(header(res, SURROGATE_KEY) ?? header(res, CACHE_TAG));

      const surrogate = parseSurrogateControl(header(res, SURROGATE_CONTROL));
      const cacheControl = header(res, "Cache-Control");
      const noStore = cacheControlNoStore(cacheControl) || surrogate.noStore;
      const surrogateMaxAge = resolveTtl ? surrogate.maxAge : null;
      const maxAge = surrogateMaxAge ?? cacheControlMaxAge(cacheControl);
      if (surrogateMaxAge !== null) {
        ttlMs = surrogateMaxAge * 1000;
        counters.surrogateTtlSet++;
        if (!res.hasHeader("Cache-Control")) res.setHeader("Cache-Control", `public, max-age=${surrogateMaxAge}`);
      } else if (maxAge !== null) {
        ttlMs = maxAge * 1000;
      }
      shouldStore = shouldStore && !noStore && status === 200 && maxEntries > 0;

      if (strip) {
        res.removeHeader(SURROGATE_CONTROL);
        res.removeHeader(SURROGATE_KEY);
        res.removeHeader(CACHE_TAG);
      }
      res.setHeader("X-Cache", "MISS");
    };

    (res as unknown as { write: (...args: unknown[]) => boolean }).write = (...args: unknown[]) => {
      const chunk = args[0];
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return origWrite(...args);
    };

    (res as unknown as { writeHead: (...args: unknown[]) => ServerResponse }).writeHead = (...args: unknown[]) => {
      const statusCode = typeof args[0] === "number" ? args[0] : res.statusCode;
      const maybeHeaders = typeof args[1] === "object" && args[1] !== null ? args[1] : args[2];
      if (maybeHeaders && typeof maybeHeaders === "object") {
        for (const [name, value] of Object.entries(maybeHeaders as Record<string, HeaderValue>)) {
          if (value != null) res.setHeader(name, value);
        }
      }
      finalize(statusCode);
      return typeof args[1] === "string" ? origWriteHead(statusCode, args[1]) : origWriteHead(statusCode);
    };

    (res as unknown as { end: (...args: unknown[]) => ServerResponse }).end = (...args: unknown[]) => {
      const chunk = args[0];
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      finalize();

      if (shouldStore) {
        while (entries.size >= maxEntries) evictOldest();
        const stored: CacheEntry = {
          status,
          headers: headerRecord(res),
          body: Buffer.concat(chunks),
          expiresAt: Date.now() + ttlMs, // law-allow: wall-clock-as-data — cache entry TTL bookkeeping
          storedAt: Date.now(), // law-allow: wall-clock-as-data — storedAt feeds the Age header; protocol testimony
          tags,
        };
        entries.set(key, stored);
        link(key, tags);
      }

      return origEnd(...args);
    };
  };

  return {
    middleware,
    purge(keys) {
      const invalidated: string[] = [];
      for (const key of keys) {
        const targets = tagIndex.get(key);
        if (!targets) continue;
        for (const cacheKey of [...targets]) {
          if (purgeKey(cacheKey)) invalidated.push(cacheKey);
        }
      }
      if (invalidated.length) {
        counters.purgedTags += keys.length;
        counters.purgedEntries += invalidated.length;
        opts.onPurge?.(keys);
      }
      return invalidated;
    },
    purgeTag,
    purgeAll,
    tag(ctx, keys) {
      ctx.res.setHeader(SURROGATE_KEY, parseTags(keys).join(" "));
    },
    stats() {
      return {
        entries: entries.size,
        tags: tagIndex.size,
        tagged: keyTags.size,
        hits: counters.hits,
        misses: counters.misses,
        purgedTags: counters.purgedTags,
        purgedEntries: counters.purgedEntries,
        surrogateTtlSet: counters.surrogateTtlSet,
      };
    },
  };
}

export function surrogateControl(opts: SurrogateOptions = {}): SurrogateManager {
  const cache = surrogateCache({ ...opts, maxEntries: 0 });
  const store = new UtteranceLog();
  const recorded = new Map<string, Set<string>>();
  let responseCounter = 0;

  function recordTag(responseId: string, keys: string[]): void {
    for (const key of keys) {
      let ids = recorded.get(key);
      if (!ids) {
        ids = new Set();
        recorded.set(key, ids);
      }
      ids.add(responseId);
      witness(store, { subject: responseId, predicate: "surrogate-key", object: key }, [true, false]);
    }
  }

  return {
    middleware(ctx) {
      const responseId = `${ctx.req.method}:${ctx.req.url}:${++responseCounter}`; // ordinal identity; wall-clock identity merged same-ms responses in the purge ledger
      const origEnd = ctx.res.end.bind(ctx.res) as (...args: unknown[]) => ServerResponse;
      (ctx.res as unknown as { end: (...args: unknown[]) => ServerResponse }).end = (...args: unknown[]) => {
        const keys = parseTags(ctx.res.getHeader(SURROGATE_KEY) ?? ctx.res.getHeader(CACHE_TAG));
        if (keys.length) recordTag(responseId, keys);
        return origEnd(...args);
      };
      return cache.middleware(ctx);
    },
    purge(keys) {
      const affected: string[] = [];
      for (const key of keys) {
        for (const id of recorded.get(key) ?? []) {
          affected.push(id);
          witness(store, { subject: id, predicate: "surrogate-key", object: key }, [false, true]);
        }
        recorded.delete(key);
      }
      opts.onPurge?.(keys);
      return affected;
    },
    tag: cache.tag,
  };
}

/** Check if a response ID has been surrogate-purged. Package-internal boolean
 * convenience (A1: off the root export surface), not an exported judgment. */
function isSurrogatePurged(store: UtteranceLog, responseId: string): boolean {
  const memes = recallWhere(store, { subject: responseId, predicate: "surrogate-key" });
  if (!memes.length) return false;
  return chargeOfUtterances(memes) !== "potential";
}
export { isSurrogatePurged };
