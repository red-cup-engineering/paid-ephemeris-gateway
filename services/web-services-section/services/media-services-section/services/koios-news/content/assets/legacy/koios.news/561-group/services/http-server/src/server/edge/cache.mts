// edge/cache.ts — in-process HTTP response cache middleware.

import type { IncomingMessage, ServerResponse } from "node:http";
import { ifModifiedSince, ifNoneMatch, parseDirectiveList, parseHttpDate } from "@emsenn/computing-with-http/codecs/http";
import type { Middleware } from "../types.mjs";

export type CacheOptions = {
  maxEntries?: number;
  /** Alias for maxEntries, for archive-style callers. */
  max?: number;
  defaultTtlMs?: number;
  /** Alias in seconds, for archive-style callers. */
  defaultTtl?: number;
  keyBy?: (req: IncomingMessage) => string;
  invalidateBy?: (req: IncomingMessage) => string | readonly string[];
  invalidateOnUnsafeMethods?: boolean;
  varyHeaders?: readonly string[];
};

type CacheEntry = {
  baseKey: string;
  varyHeaders: readonly string[];
  varyKey: string;
  status: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  expiresAt: number;
  staleWhileRevalidateUntil: number;
  staleIfErrorUntil: number;
  storedAt: number;
};

export type CacheStats = {
  entries: number;
  maxEntries: number;
  hits: number;
  misses: number;
  bypasses: number;
  stores: number;
  evictions: number;
  purges: number;
  invalidations: number;
  hitRatio: number;
};

export type CacheMiddleware = Middleware & {
  purge(predicate?: (info: { key: string; entry: CacheEntry }) => boolean): number;
  stats(): CacheStats;
};

type DirectiveMap = Record<string, true | string>;
type HeaderValue = number | string | string[] | undefined;

function cacheDirectives(header: HeaderValue): DirectiveMap {
  return parseDirectiveList(Array.isArray(header) ? header.map(String) : header == null ? undefined : String(header));
}

function deltaSeconds(value: true | string | undefined): number | null {
  if (value === true || value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function hasNoStore(directives: DirectiveMap): boolean {
  return directives["no-store"] === true;
}

function hasNoCache(directives: DirectiveMap): boolean {
  return directives["no-cache"] === true || deltaSeconds(directives["max-age"]) === 0;
}

function headerValue(headers: Record<string, string | string[]>, name: string): string | undefined {
  const needle = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== needle) continue;
    return Array.isArray(value) ? value.join(", ") : value;
  }
  return undefined;
}

function responseHeaderValue(res: ServerResponse, name: string): string | undefined {
  const value = res.getHeader(name);
  if (value == null) return undefined;
  return Array.isArray(value) ? value.map(String).join(", ") : String(value);
}

function requestHeaderValue(req: IncomingMessage, name: string): string {
  const value = req.headers[name.toLowerCase()];
  if (value == null) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

function uniqueHeaderNames(names: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const normalized = normalizeHeaderName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function parseVaryHeader(value: HeaderValue): string[] | null {
  const raw = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  const names: string[] = [];
  for (const part of raw.split(",")) {
    const name = normalizeHeaderName(part);
    if (!name) continue;
    if (name === "*") return null;
    names.push(name);
  }
  return uniqueHeaderNames(names);
}

function varyHeadersForStore(res: ServerResponse, fixed: readonly string[]): string[] | null {
  const dynamic = parseVaryHeader(responseHeaderValue(res, "Vary"));
  return dynamic === null ? null : uniqueHeaderNames([...fixed, ...dynamic]);
}

function requestVaryKey(req: IncomingMessage, names: readonly string[]): string {
  return JSON.stringify(names.map((name) => [name, requestHeaderValue(req, name)]));
}

function cacheKey(baseKey: string, varyKey: string): string {
  return JSON.stringify([baseKey, varyKey]);
}

function cachedNotModified(req: IncomingMessage, entry: CacheEntry): boolean {
  const etag = headerValue(entry.headers, "etag");
  if (etag && ifNoneMatch(req.headers["if-none-match"], etag)) return true;

  const lastModified = headerValue(entry.headers, "last-modified");
  if (lastModified) {
    const modifiedAt = parseHttpDate(lastModified);
    if (modifiedAt !== null && ifModifiedSince(req.headers["if-modified-since"], modifiedAt)) return true;
  }

  return false;
}

function responseUncacheable(res: ServerResponse): boolean {
  const directives = cacheDirectives(res.getHeader("Cache-Control") as HeaderValue);
  return directives["no-store"] === true
    || directives.private === true
    || res.hasHeader("Set-Cookie")
    || parseVaryHeader(responseHeaderValue(res, "Vary")) === null;
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

function replaceHeaders(res: ServerResponse, headers: Record<string, string | string[]>): void {
  for (const name of res.getHeaderNames()) res.removeHeader(name);
  applyHeaders(res, headers);
}

function age(entry: CacheEntry, now = Date.now()): number { // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  return Math.max(0, Math.floor((now - entry.storedAt) / 1000));
}

function ttl(entry: CacheEntry, now = Date.now()): number { // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  return Math.max(0, Math.ceil((entry.expiresAt - now) / 1000));
}

function freshEnough(entry: CacheEntry, directives: DirectiveMap, now = Date.now()): boolean { // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  if (entry.expiresAt <= now) return false;
  const minFresh = deltaSeconds(directives["min-fresh"]) ?? 0;
  if (entry.expiresAt - now < minFresh * 1000) return false;
  const maxAge = deltaSeconds(directives["max-age"]);
  if (maxAge !== null && age(entry, now) > maxAge) return false;
  return true;
}

function maxStaleMs(directives: DirectiveMap): number | null {
  const value = directives["max-stale"];
  if (value === undefined) return null;
  if (value === true) return Infinity;
  const seconds = deltaSeconds(value);
  return seconds === null ? null : seconds * 1000;
}

function requestAllowsStale(entry: CacheEntry, directives: DirectiveMap, now = Date.now()): boolean { // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  if (entry.expiresAt > now || hasNoCache(directives)) return false;
  const allowed = maxStaleMs(directives);
  return allowed !== null && entry.expiresAt + allowed >= now;
}

function responseAllowsStaleWhileRevalidate(entry: CacheEntry, directives: DirectiveMap, now = Date.now()): boolean { // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  return !hasNoCache(directives) && entry.expiresAt <= now && entry.staleWhileRevalidateUntil > now;
}

function writeCached(
  req: IncomingMessage,
  res: ServerResponse,
  entry: CacheEntry,
  state: "HIT" | "STALE",
  options: {
    notModified?: boolean;
    now?: number;
    writeHead?: (...args: unknown[]) => ServerResponse;
    end?: (...args: unknown[]) => ServerResponse;
    staleReason?: "max-stale" | "stale-if-error" | "stale-while-revalidate";
    fwdStatus?: number;
  } = {},
): void {
  const now = options.now ?? Date.now(); // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
  const writeHead = options.writeHead ?? (res.writeHead.bind(res) as (...args: unknown[]) => ServerResponse);
  const end = options.end ?? (res.end.bind(res) as (...args: unknown[]) => ServerResponse);
  replaceHeaders(res, entry.headers);
  res.setHeader("X-Cache", state);
  res.setHeader("Age", String(age(entry, now)));
  res.setHeader(
    "Cache-Status",
    state === "HIT"
      ? `@emsenn/web-server; hit; ttl=${ttl(entry, now)}`
      : `@emsenn/web-server; hit; fwd=stale${options.fwdStatus === undefined ? "" : `; fwd-status=${options.fwdStatus}`}${options.staleReason === undefined ? "" : `; detail="${options.staleReason}"`}`,
  );
  if (options.notModified) {
    res.removeHeader("Content-Length");
    writeHead(304);
    end();
    return;
  }
  writeHead(entry.status);
  end(req.method === "HEAD" ? undefined : entry.body);
}

function cacheMethod(method: string | undefined): string {
  const upper = (method ?? "GET").toUpperCase();
  return upper === "HEAD" ? "GET" : upper;
}

function defaultKey(req: IncomingMessage): string {
  return `${cacheMethod(req.method)}:${req.url ?? "/"}`;
}

function defaultInvalidationKeys(req: IncomingMessage): readonly string[] {
  return [`GET:${req.url ?? "/"}`];
}

function unsafeMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

export function responseCache(opts: CacheOptions = {}): CacheMiddleware {
  const entries = new Map<string, CacheEntry>();
  const maxEntries = opts.maxEntries ?? opts.max ?? 1000;
  const defaultTtlMs = opts.defaultTtlMs ?? (opts.defaultTtl === undefined ? 60_000 : opts.defaultTtl * 1000);
  const varyHeaders = opts.varyHeaders ?? ["accept", "accept-encoding"];
  const keyFor = opts.keyBy ?? ((req: IncomingMessage) => defaultKey(req));
  const invalidateOnUnsafeMethods = opts.invalidateOnUnsafeMethods !== false;
  const invalidationKeysFor = opts.invalidateBy ?? defaultInvalidationKeys;
  const counters = { hits: 0, misses: 0, bypasses: 0, stores: 0, evictions: 0, purges: 0, invalidations: 0 };

  function touch(key: string, entry: CacheEntry): void {
    entries.delete(key);
    entries.set(key, entry);
  }

  function evictOldest(): void {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (!oldest) return;
      entries.delete(oldest);
      counters.evictions++;
    }
  }

  function findEntry(baseKey: string, req: IncomingMessage): { key: string; entry: CacheEntry } | null {
    for (const [key, entry] of entries) {
      if (entry.baseKey !== baseKey) continue;
      if (entry.varyKey !== requestVaryKey(req, entry.varyHeaders)) continue;
      return { key, entry };
    }
    return null;
  }

  function invalidate(keys: readonly string[]): number {
    let removed = 0;
    const targets = new Set(keys);
    for (const [key, entry] of [...entries]) {
      if (!targets.has(entry.baseKey)) continue;
      entries.delete(key);
      removed++;
    }
    counters.invalidations += removed;
    return removed;
  }

  const middleware: Middleware = async (ctx) => {
    const { req, res } = ctx;
    const method = (req.method ?? "GET").toUpperCase();
    if (invalidateOnUnsafeMethods && unsafeMethod(method)) {
      const rawKeys = invalidationKeysFor(req);
      invalidate(typeof rawKeys === "string" ? [rawKeys] : [...rawKeys]);
    }
    if (method !== "GET" && method !== "HEAD") {
      counters.bypasses++;
      return;
    }

    const requestDirectives = cacheDirectives(req.headers["cache-control"] as HeaderValue);
    if (hasNoStore(requestDirectives)) {
      counters.bypasses++;
      return;
    }

    const baseKey = keyFor(req);
    const found = findEntry(baseKey, req);
    const entry = found?.entry;
    const now = Date.now(); // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
    const requestNoCache = hasNoCache(requestDirectives);
    if (entry && !requestNoCache && freshEnough(entry, requestDirectives, now)) {
      counters.hits++;
      touch(found!.key, entry);
      writeCached(req, res, entry, "HIT", { notModified: cachedNotModified(req, entry), now });
      return true;
    }
    if (entry && requestAllowsStale(entry, requestDirectives, now)) {
      counters.hits++;
      touch(found!.key, entry);
      writeCached(req, res, entry, "STALE", { now, staleReason: "max-stale" });
      return true;
    }
    if (entry && responseAllowsStaleWhileRevalidate(entry, requestDirectives, now)) {
      counters.hits++;
      touch(found!.key, entry);
      writeCached(req, res, entry, "STALE", { now, staleReason: "stale-while-revalidate" });
      return true;
    }
    if (requestDirectives["only-if-cached"] === true) {
      counters.bypasses++;
      res.setHeader("X-Cache", "BYPASS");
      res.setHeader("Cache-Status", '@emsenn/web-server; fwd=uri-miss; detail="only-if-cached"');
      res.writeHead(504, { "Content-Type": "text/plain; charset=utf-8" }).end(method === "HEAD" ? undefined : "Gateway Timeout");
      return true;
    }
    if (found && entry && entry.expiresAt <= now && entry.staleIfErrorUntil <= now) entries.delete(found.key);
    counters.misses++;

    const chunks: Buffer[] = [];
    const origWrite = res.write.bind(res) as (...args: unknown[]) => boolean;
    const origEnd = res.end.bind(res) as (...args: unknown[]) => ServerResponse;
    const origWriteHead = res.writeHead.bind(res) as (...args: unknown[]) => ServerResponse;
    let finalized = false;
    let status = res.statusCode || 200;
    let shouldStore = method === "GET" && maxEntries > 0;
    let ttlMs = defaultTtlMs;
    let staleWhileRevalidateMs = 0;
    let staleIfErrorMs = 0;
    let servedStale = false;

    const finalize = (statusCode = res.statusCode || status): void => {
      if (finalized) return;
      finalized = true;
      status = statusCode;
      const directives = cacheDirectives(res.getHeader("Cache-Control") as HeaderValue);
      ttlMs = (deltaSeconds(directives["s-maxage"]) ?? deltaSeconds(directives["max-age"]) ?? Math.floor(defaultTtlMs / 1000)) * 1000;
      staleWhileRevalidateMs = (deltaSeconds(directives["stale-while-revalidate"]) ?? 0) * 1000;
      staleIfErrorMs = (deltaSeconds(directives["stale-if-error"]) ?? 0) * 1000;
      shouldStore = shouldStore && status === 200 && !responseUncacheable(res);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Status", "@emsenn/web-server; fwd=uri-miss; stored");
    };

    const serveStaleIfError = (): boolean => {
      if (!entry || entry.staleIfErrorUntil <= Date.now() || res.headersSent || res.writableEnded) return false; // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
      if (status < 500 || status > 599) return false;
      servedStale = true;
      counters.hits++;
      touch(found!.key, entry);
      writeCached(req, res, entry, "STALE", {
        writeHead: origWriteHead,
        end: origEnd,
        staleReason: "stale-if-error",
        fwdStatus: status,
      });
      return true;
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
      if (serveStaleIfError()) return res;
      return typeof args[1] === "string" ? origWriteHead(statusCode, args[1]) : origWriteHead(statusCode);
    };

    (res as unknown as { end: (...args: unknown[]) => ServerResponse }).end = (...args: unknown[]) => {
      if (servedStale) return res;
      const chunk = args[0];
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      finalize();
      if (serveStaleIfError()) return res;

      if (shouldStore) {
        const now = Date.now(); // law-allow: wall-clock-as-data — RFC 9111 freshness/Age arithmetic; cache bookkeeping, not event ordering
        const entryVaryHeaders = varyHeadersForStore(res, varyHeaders);
        if (entryVaryHeaders === null) return origEnd(...args);
        const varyKey = requestVaryKey(req, entryVaryHeaders);
        entries.set(cacheKey(baseKey, varyKey), {
          baseKey,
          varyHeaders: entryVaryHeaders,
          varyKey,
          status,
          headers: headerRecord(res),
          body: Buffer.concat(chunks),
          expiresAt: now + ttlMs,
          staleWhileRevalidateUntil: now + ttlMs + staleWhileRevalidateMs,
          staleIfErrorUntil: now + ttlMs + staleIfErrorMs,
          storedAt: now,
        });
        counters.stores++;
        evictOldest();
      }

      return origEnd(...args);
    };
  };

  return Object.assign(middleware, {
    purge(predicate?: (info: { key: string; entry: CacheEntry }) => boolean): number {
      if (!predicate) {
        const removed = entries.size;
        entries.clear();
        counters.purges += removed;
        return removed;
      }
      let removed = 0;
      for (const [key, entry] of [...entries]) {
        if (!predicate({ key, entry })) continue;
        entries.delete(key);
        removed++;
      }
      counters.purges += removed;
      return removed;
    },
    stats(): CacheStats {
      const lookups = counters.hits + counters.misses;
      return {
        entries: entries.size,
        maxEntries,
        hits: counters.hits,
        misses: counters.misses,
        bypasses: counters.bypasses,
        stores: counters.stores,
        evictions: counters.evictions,
        purges: counters.purges,
        invalidations: counters.invalidations,
        hitRatio: lookups ? counters.hits / lookups : 0,
      };
    },
  });
}
