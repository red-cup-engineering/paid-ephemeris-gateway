// edge/proxy.ts — Reverse proxy as request dispatch.
//
// Each upstream target is a Meme. Stored health evidence decides which target to use
// (potential=admit, active=circuit-open, stable=contradiction held). Requests are forwarded
// with trace headers so the upstream can read the full request trace.

import { chargeOfUtterances, witness, UtteranceLog, recallCell } from "../internal/witness.mjs";
import * as http from "node:http";
import * as https from "node:https";
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from "node:http";
import type { Middleware, Context } from "../types.mjs";
import { clientIp } from "../internal/net.mjs";

export type ProxyTarget = {
  url: string;           // upstream origin, e.g. "http://backend:3000"
  weight?: number;       // relative weight for weighted random selection (default 1)
  healthy?: boolean;     // initial health state (default true)
};

export type ProxyRetryMethods = "all" | readonly string[];

export type ProxyOptions = {
  targets: ProxyTarget[];
  stripPrefix?: string;
  rewritePath?: (path: string, ctx: Context) => string;
  timeout?: number;                                           // ms, default 30_000; 0 disables
  retries?: number;                                           // default 0
  retryMethods?: ProxyRetryMethods;                           // default bodyless idempotent methods
  onProxyReq?: (proxyReq: http.ClientRequest, req: IncomingMessage, res: ServerResponse) => void;
  onProxyRes?: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void;
  headers?: OutgoingHttpHeaders;                              // extra headers to upstream
  preserveHost?: boolean;                                     // pass original Host header
  xForwardedFor?: boolean;                                    // append X-Forwarded-For (default true)
  balancer?: "round-robin" | "random" | "weighted-random";   // default round-robin
};

export type ProxyPassOptions = {
  changeOrigin?: boolean;
  xfwd?: boolean;
  pathRewrite?: (path: string, ctx: Context) => string;
  timeout?: number;                                           // ms, default 30_000; 0 disables
  headers?: OutgoingHttpHeaders;
  onError?: (err: unknown, req: IncomingMessage, res: ServerResponse) => void;
};

export class ProxyUpstreamError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 502, code = "PROXY_UPSTREAM_ERROR") {
    super(message);
    this.name = "ProxyUpstreamError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "http2-settings",
];

export const DEFAULT_PROXY_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function connectionTokens(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value == null ? "" : String(value);
  return raw.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean);
}

function stripHopByHop(headers: IncomingMessage["headers"] | OutgoingHttpHeaders): OutgoingHttpHeaders {
  const out: OutgoingHttpHeaders = { ...headers };
  for (const header of connectionTokens(headers.connection)) delete out[header]; // law-allow: delete-not-trace — hop-by-hop header stripping is protocol framing (RFC 9110 s7.6.1), not evidence
  for (const header of HOP_BY_HOP) delete out[header]; // law-allow: delete-not-trace — hop-by-hop header stripping is protocol framing (RFC 9110 s7.6.1), not evidence
  return out;
}

function pickTarget(targets: ProxyTarget[], balancer: string, counter: { n: number }): ProxyTarget | null {
  const healthy = targets.filter((t) => t.healthy !== false);
  if (!healthy.length) return null;
  if (balancer === "random") return healthy[Math.floor(Math.random() * healthy.length)]!;
  if (balancer === "weighted-random") {
    const total = healthy.reduce((s, t) => s + (t.weight ?? 1), 0);
    let r = Math.random() * total;
    for (const t of healthy) { r -= (t.weight ?? 1); if (r <= 0) return t; }
    return healthy[healthy.length - 1]!;
  }
  // round-robin
  const idx = counter.n % healthy.length;
  counter.n++;
  return healthy[idx]!;
}

export function abortProxyOnClientAbort(
  signal: AbortSignal,
  proxyReq: http.ClientRequest,
  reason = "client aborted proxied request",
): void {
  const abort = () => {
    if (!proxyReq.destroyed) proxyReq.destroy(new Error(reason));
  };
  if (signal.aborted) {
    abort();
    return;
  }
  signal.addEventListener("abort", abort, { once: true });
  proxyReq.once("close", () => signal.removeEventListener("abort", abort));
}

function retryMethodAllowed(method: string | undefined, policy: ProxyRetryMethods | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  if (policy === "all") return true;
  if (Array.isArray(policy)) return policy.some((entry) => entry.toUpperCase() === normalized);
  return DEFAULT_RETRY_METHODS.has(normalized);
}

function headerValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function requestDeclaresBody(req: IncomingMessage): boolean {
  if (req.headers["transfer-encoding"] !== undefined) return true;
  const lengths = headerValues(req.headers["content-length"]);
  if (!lengths.length) return false;
  return lengths.some((value) => {
    const length = Number.parseInt(value, 10);
    return !Number.isFinite(length) || length > 0;
  });
}

function canRetryProxyFailure(ctx: Context, opts: ProxyOptions, attempt: number, retries: number): boolean {
  return attempt < retries
    && !ctx.signal.aborted
    && !ctx.res.headersSent
    && !ctx.res.writableEnded
    && !requestDeclaresBody(ctx.req)
    && retryMethodAllowed(ctx.req.method, opts.retryMethods);
}

export function proxyTimeoutMs(timeout: number | undefined): number | undefined {
  return timeout === 0 ? undefined : timeout ?? DEFAULT_PROXY_TIMEOUT_MS;
}

export function upstreamTimeoutError(): ProxyUpstreamError {
  return new ProxyUpstreamError("upstream timeout", 504, "PROXY_UPSTREAM_TIMEOUT");
}

export function proxyFailureStatus(error: unknown): number {
  return error instanceof ProxyUpstreamError ? error.statusCode : 502;
}

export function writeProxyFailureResponse(res: ServerResponse, error: unknown): void {
  if (res.headersSent || res.writableEnded) return;
  const status = proxyFailureStatus(error);
  const body = status === 504 ? "Gateway Timeout" : "Bad Gateway";
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" }).end(body);
}

function forwardRequest(
  target: ProxyTarget,
  ctx: Context,
  opts: ProxyOptions,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const { req, res } = ctx;
    const targetUrl = new URL(target.url);
    let pathname = ctx.url.pathname;
    if (opts.stripPrefix && pathname.startsWith(opts.stripPrefix)) {
      pathname = pathname.slice(opts.stripPrefix.length) || "/";
    }
    if (opts.rewritePath) pathname = opts.rewritePath(pathname, ctx);
    const search = ctx.url.search;

    const isHttps = targetUrl.protocol === "https:";
    const mod = isHttps ? https : http;
    const port = targetUrl.port ? parseInt(targetUrl.port, 10) : (isHttps ? 443 : 80);

    const headers: OutgoingHttpHeaders = { ...stripHopByHop(req.headers), ...(opts.headers ?? {}) };
    if (!opts.preserveHost) headers["host"] = targetUrl.host;
    if (opts.xForwardedFor !== false) {
      const existing = req.headers["x-forwarded-for"];
      const ip = clientIp(req);
      headers["x-forwarded-for"] = existing ? `${existing}, ${ip}` : ip;
    }
    const proto = (req.socket as { encrypted?: boolean }).encrypted ? "https" : "http";
    headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? proto;
    headers["x-forwarded-host"] = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    // Stamp the meme trace ID so upstreams can correlate
    headers["x-meme-process"] = ctx.trace.id;

    const proxyReq = mod.request({
      hostname: targetUrl.hostname,
      port,
      path: pathname + search,
      method: req.method,
      headers,
    });

    const timeoutMs = proxyTimeoutMs(opts.timeout);
    if (timeoutMs !== undefined) proxyReq.setTimeout(timeoutMs, () => proxyReq.destroy(upstreamTimeoutError()));
    abortProxyOnClientAbort(ctx.signal, proxyReq);
    opts.onProxyReq?.(proxyReq, req, res);

    proxyReq.on("response", (proxyRes) => {
      opts.onProxyRes?.(proxyRes, req, res);
      res.writeHead(proxyRes.statusCode ?? 502, stripHopByHop(proxyRes.headers));
      proxyRes.pipe(res);
      proxyRes.on("end", () => resolve(true));
    });

    proxyReq.on("error", reject);
    if (requestDeclaresBody(req)) req.pipe(proxyReq);
    else proxyReq.end();
  });
}

export function proxy(opts: ProxyOptions): Middleware {
  const store = new UtteranceLog();
  const counter = { n: 0 };
  const balancer = opts.balancer ?? "round-robin";
  const retries = opts.retries ?? 0;

  // Seed target Memes so MPU can settle health
  for (const target of opts.targets) {
    const id = target.url;
    witness(store, { subject: id, predicate: "target", object: "registered" }, [true, false]);
    if (target.healthy !== false) {
      witness(store, { subject: id, predicate: "health", object: "up" }, [true, false]);
    }
  }

  return async (ctx) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const target = pickTarget(opts.targets, balancer, counter);
      if (!target) {
        ctx.res.writeHead(503).end("No healthy upstream");
        return true;
      }

      const healthMemes = recallCell(store, { subject: target.url, predicate: "health", object: "up" });
      const memeCharge = chargeOfUtterances(healthMemes);
      if (memeCharge !== "potential") {
        // Mark unhealthy and retry with next target
        target.healthy = false;
        continue;
      }

      try {
        return await forwardRequest(target, ctx, opts);
      } catch (error) {
        if (ctx.signal.aborted || ctx.res.headersSent || ctx.res.writableEnded) return true;
        // Record failure in store
        witness(store, { subject: target.url, predicate: "health", object: "up" }, [false, true]);
        target.healthy = false;
        if (!canRetryProxyFailure(ctx, opts, attempt, retries)) {
          writeProxyFailureResponse(ctx.res, error);
          return true;
        }
      }
    }
    ctx.res.writeHead(503).end("Service Unavailable");
    return true;
  };
}

/** Expose a function that marks a target healthy/unhealthy at runtime. */
export function proxyHealthToggle(targets: ProxyTarget[], url: string, healthy: boolean): void {
  const t = targets.find((t) => t.url === url);
  if (t) t.healthy = healthy;
}

/** nginx-style `proxy_pass` convenience middleware for a single upstream prefix. */
export function proxyPass(target: string, options: ProxyPassOptions = {}): Middleware {
  const upstream = new URL(target);
  const mod = upstream.protocol === "https:" ? https : http;
  const basePath = upstream.pathname.replace(/\/$/, "");
  const {
    changeOrigin = true,
    xfwd = true,
    pathRewrite,
    timeout,
    headers: extraHeaders,
    onError,
  } = options;

  return (ctx) => new Promise<true>((resolve) => {
    const { req, res } = ctx;
    let path = `${ctx.url.pathname}${ctx.url.search}`;
    if (pathRewrite) path = pathRewrite(path, ctx);

    const headers = stripHopByHop(req.headers);
    if (changeOrigin) headers.host = upstream.host;
    if (xfwd) {
      const proto = (req.socket as { encrypted?: boolean }).encrypted ? "https" : "http";
      const prior = req.headers["x-forwarded-for"];
      const addr = clientIp(req);
      headers["x-forwarded-for"] = prior ? `${prior}, ${addr}` : addr;
      headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? proto;
      headers["x-forwarded-host"] = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    }
    Object.assign(headers, extraHeaders ?? {});

    const fail = (err: unknown) => {
      if (ctx.signal.aborted || res.writableEnded) {
        resolve(true);
        return;
      }
      if (onError) {
        try { onError(err, req, res); } catch {}
      } else if (!res.headersSent) {
        writeProxyFailureResponse(res, err);
      } else {
        try { res.end(); } catch {}
      }
      resolve(true);
    };

    const proxyReq = mod.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
        method: req.method,
        path: basePath + path,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, stripHopByHop(proxyRes.headers));
        proxyRes.on("error", () => { try { res.end(); } catch {} resolve(true); });
        proxyRes.on("end", () => resolve(true));
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", fail);
    const timeoutMs = proxyTimeoutMs(timeout);
    if (timeoutMs !== undefined) proxyReq.setTimeout(timeoutMs, () => proxyReq.destroy(upstreamTimeoutError()));
    abortProxyOnClientAbort(ctx.signal, proxyReq);
    req.pipe(proxyReq);
  });
}
