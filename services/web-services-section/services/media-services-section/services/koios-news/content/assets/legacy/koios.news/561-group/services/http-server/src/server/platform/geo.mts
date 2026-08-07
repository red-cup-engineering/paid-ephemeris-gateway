// platform/geo.ts — Geographic routing and IP geolocation.
//
// GeoIP resolution uses a UtteranceLog as a lookup cache. Geolocation data sources are pluggable
// via a `resolver` callback (maxmind, ip-api, etc.).
//
// GeoRoute selects resources based on client country/region by folding allow/deny evidence.

import { cellValues, witness, UtteranceLog, recallWhere } from "../internal/witness.mjs";
import type { Middleware, Context } from "../types.mjs";
import type { IncomingMessage } from "node:http";
import { chargeValueFromBits } from "../admission.mjs";
import { clientIp as requestClientIp } from "../internal/net.mjs";

export type GeoRecord = {
  ip: string;
  country?: string;       // ISO 3166-1 alpha-2
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  asn?: string;
  org?: string;
};

export type GeoOptions = {
  resolver: (ip: string) => Promise<GeoRecord | null>;
  ttlMs?: number;         // cache TTL (default 3_600_000 = 1 hour)
  headerPrefix?: string;  // inject CF-IPCountry style headers (default none)
  localsKey?: string;     // attach GeoRecord to ctx.locals under this key (default "geo")
  /** Trust X-Forwarded-For/X-Real-IP. A number skips that many trusted hops from the right. */
  trustProxy?: boolean | number;
};

export function clientIp(req: IncomingMessage, trustProxy: boolean | number = false): string {
  return requestClientIp(req, { trustProxy });
}

export function geoLookup(opts: GeoOptions): Middleware {
  const store = new UtteranceLog();
  const ttlMs = opts.ttlMs ?? 3_600_000;
  const localsKey = opts.localsKey ?? "geo";
  const trustProxy = opts.trustProxy ?? false;
  const expiries = new Map<string, number>();

  return async (ctx) => {
    const ip = clientIp(ctx.req, trustProxy);
    const subject = `geo:${ip}`;

    // Check cache
    const cached = recallWhere(store, { subject: subject, predicate: "geo" });
    const expiresAt = expiries.get(subject);

    if (cached.length > 0 && expiresAt && Date.now() < expiresAt) { // law-allow: wall-clock-as-data — geo cache TTL/freshness bookkeeping (eviction timing), not event ordering
      const raw = String(cellValues(cached[cached.length - 1]!)?.object);
      try {
        const record = JSON.parse(raw) as GeoRecord;
        ctx.locals[localsKey] = record;
        if (opts.headerPrefix) injectHeaders(ctx, record, opts.headerPrefix);
        return;
      } catch { /* fall through to fresh lookup */ }
    }

    try {
      const record = await opts.resolver(ip);
      if (record) {
        witness(store, { subject, predicate: "geo", object: JSON.stringify(record) }, [true, false]);
        expiries.set(subject, Date.now() + ttlMs); // law-allow: wall-clock-as-data — cache TTL/freshness bookkeeping (eviction timing), not event ordering
        ctx.locals[localsKey] = record;
        if (opts.headerPrefix) injectHeaders(ctx, record, opts.headerPrefix);
      }
    } catch { /* resolver failure is non-fatal */ }
  };
}

function injectHeaders(ctx: Context, record: GeoRecord, prefix: string): void {
  if (record.country) ctx.res.setHeader(`${prefix}Country`, record.country);
  if (record.region) ctx.res.setHeader(`${prefix}Region`, record.region);
  if (record.city) ctx.res.setHeader(`${prefix}City`, record.city);
}

export type GeoBlockOptions = {
  allow?: string[];   // ISO country codes to allow (deny all others)
  deny?: string[];    // ISO country codes to deny (allow all others)
  onDeny?: (ctx: Context, country: string) => void | Promise<void>;
  localsKey?: string;
};

/** Middleware: block or allow requests based on resolved country. */
export function geoBlock(opts: GeoBlockOptions): Middleware {
  const localsKey = opts.localsKey ?? "geo";
  return async (ctx) => {
    const record = ctx.locals[localsKey] as GeoRecord | undefined;
    const country = record?.country ?? "";

    const allowedByAllow = opts.allow ? opts.allow.includes(country) : true;
    const deniedByAllow = opts.allow ? !opts.allow.includes(country) : false;
    const deniedByDeny = opts.deny?.includes(country) ?? false;
    const memeCharge = chargeValueFromBits(allowedByAllow && !deniedByDeny, deniedByAllow || deniedByDeny);
    if (memeCharge === "potential") return;

    await opts.onDeny?.(ctx, country);
    ctx.res.writeHead(403).end("Forbidden");
    return true;
  };
}

/** Middleware: add latency-based routing headers for CDN geo-steering. */
export function geoHeaders(prefix = "X-Geo-"): Middleware {
  return (ctx) => {
    const ip = clientIp(ctx.req);
    ctx.res.setHeader(`${prefix}Client-IP`, ip);
    return Promise.resolve(undefined);
  };
}

export type RouteByGeoOptions = {
  /** Which field of the geo record to match on (default "country"). */
  field?: keyof GeoRecord;
  /** If true (default), send an HTTP redirect; if false, rewrite the URL internally. */
  redirect?: boolean;
  /** Redirect status code (default 302). */
  status?: number;
  /** ctx.locals key for the geo record (default "geo"). */
  localsKey?: string;
};

/**
 * routeByGeo(map, opts) — middleware that branches on the visitor's geo.
 * Keys in `map` are geo field values (e.g. "US", "DE"); `*` is the fallback.
 * Values are either a target URL string (redirect/rewrite) or a nested Middleware.
 */
export function routeByGeo(
  map: Record<string, string | Middleware>,
  opts: RouteByGeoOptions = {},
): Middleware {
  const { field = "country", redirect: doRedirect = true, status = 302, localsKey = "geo" } = opts;

  return async (ctx) => {
    const record = ctx.locals[localsKey] as GeoRecord | undefined;
    const value = record?.[field];
    const target = (value != null && String(value) in map) ? map[String(value)] : map["*"];
    if (target == null) return;

    if (typeof target === "function") return target(ctx);

    const location = String(target);
    if (doRedirect) {
      let resolved = location;
      try { resolved = new URL(location, ctx.url.href).toString(); } catch { /* use raw */ }
      ctx.res.setHeader("Location", resolved);
      ctx.res.writeHead(status).end(`Redirecting to ${resolved}`);
      return true;
    }

    // Internal rewrite
    try {
      const next = new URL(location, ctx.url.href);
      ctx.url = next;
      (ctx.req as unknown as { url: string }).url = next.pathname + next.search;
    } catch { /* leave url unchanged */ }
    return;
  };
}

export type RewriteByOptions = {
  redirect?: boolean;
  status?: number;
};

/**
 * rewriteBy(select, opts) — general personalization router: `select(ctx)` returns a target
 * string (redirect/rewrite) or Middleware, or null to fall through.
 */
export function rewriteBy(
  select: (ctx: Context) => string | Middleware | null | Promise<string | Middleware | null>,
  opts: RewriteByOptions = {},
): Middleware {
  if (typeof select !== "function") throw new TypeError("rewriteBy: `select` must be a function");
  const { redirect: doRedirect = true, status = 302 } = opts;

  return async (ctx) => {
    const target = await select(ctx);
    if (target == null) return;

    if (typeof target === "function") return target(ctx);

    const location = String(target);
    if (doRedirect) {
      let resolved = location;
      try { resolved = new URL(location, ctx.url.href).toString(); } catch { /* use raw */ }
      ctx.res.setHeader("Location", resolved);
      ctx.res.writeHead(status).end(`Redirecting to ${resolved}`);
      return true;
    }

    try {
      const next = new URL(location, ctx.url.href);
      ctx.url = next;
      (ctx.req as unknown as { url: string }).url = next.pathname + next.search;
    } catch { /* leave url unchanged */ }
    return;
  };
}
