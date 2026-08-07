// edge/upstream.ts — load-balanced reverse-proxy upstream pools.

import { createHash } from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import type { IncomingMessage } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";
import type { Middleware } from "../types.mjs";
import {
  abortProxyOnClientAbort,
  proxyTimeoutMs,
  upstreamTimeoutError,
  writeProxyFailureResponse,
  type ProxyPassOptions,
} from "./proxy.mjs";
import { clientIp } from "../internal/net.mjs";

export type UpstreamStrategy = "round-robin" | "least-connections" | "ip-hash";

export type UpstreamPoolOptions = {
  strategy?: UpstreamStrategy;
  cooldownMs?: number;
  proxyOptions?: ProxyPassOptions;
};

export type UpstreamHealth = {
  target: string;
  up: boolean;
  inFlight: number;
  fails: number;
  downUntil: number;
};

export type UpstreamPoolMiddleware = Middleware & {
  targets: string[];
  readonly health: UpstreamHealth[];
};

type TargetState = {
  url: string;
  inFlight: number;
  downUntil: number;
  fails: number;
};

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

function hashToIndex(key: unknown, n: number): number {
  const digest = createHash("sha1").update(String(key ?? "")).digest();
  const u32 = ((digest[0]! << 24) | (digest[1]! << 16) | (digest[2]! << 8) | digest[3]!) >>> 0;
  return u32 % n;
}

function writeUpstreamFailure(ctx: Parameters<Middleware>[0], error?: unknown): void {
  writeProxyFailureResponse(ctx.res, error);
}

export function upstreamPool(targets: readonly string[], options: UpstreamPoolOptions = {}): UpstreamPoolMiddleware {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new TypeError("upstreamPool: targets must be a non-empty array of origin URLs");
  }
  const strategy = options.strategy ?? "round-robin";
  if (strategy !== "round-robin" && strategy !== "least-connections" && strategy !== "ip-hash") {
    throw new TypeError(`upstreamPool: unknown strategy ${strategy}`);
  }

  const cooldownMs = options.cooldownMs ?? 5_000;
  const pool: TargetState[] = targets.map((url) => ({ url, inFlight: 0, downUntil: 0, fails: 0 }));
  let cursor = 0;

  const now = () => Date.now(); // law-allow: wall-clock-as-data — ejection cooldown bookkeeping, not evidence ordering
  const isUp = (target: TargetState) => target.downUntil <= now();
  const markDown = (target: TargetState) => {
    target.fails += 1;
    target.downUntil = now() + cooldownMs;
  };
  const candidates = () => pool.map((target, index) => ({ target, index })).filter(({ target }) => isUp(target));

  function pickOrder(req: IncomingMessage): TargetState[] {
    const up = candidates();
    if (up.length === 0) return [];

    if (strategy === "least-connections") {
      return [...up]
        .sort((a, b) => {
          if (a.target.inFlight !== b.target.inFlight) return a.target.inFlight - b.target.inFlight;
          return ((a.index - cursor + pool.length) % pool.length) - ((b.index - cursor + pool.length) % pool.length);
        })
        .map(({ target }) => target);
    }

    if (strategy === "ip-hash") {
      const forwarded = req.headers["x-forwarded-for"];
      const key = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.socket.remoteAddress ?? "";
      const start = hashToIndex(key, up.length);
      return up.slice(start).concat(up.slice(0, start)).map(({ target }) => target);
    }

    const start = up.findIndex(({ index }) => index >= cursor % pool.length);
    const begin = start === -1 ? 0 : start;
    const ordered = up.slice(begin).concat(up.slice(0, begin));
    cursor = (ordered[0]!.index + 1) % pool.length;
    return ordered.map(({ target }) => target);
  }

  async function proxyTo(target: TargetState, ctx: Parameters<Middleware>[0]): Promise<{ ok: boolean; error?: unknown }> {
    const upstream = new URL(target.url);
    const proxyOptions = options.proxyOptions ?? {};
    const mod = upstream.protocol === "https:" ? https : http;
    const basePath = upstream.pathname.replace(/\/$/, "");

    target.inFlight += 1;
    try {
      return await new Promise<{ ok: boolean; error?: unknown }>((resolve) => {
        const { req, res } = ctx;
        let path = `${ctx.url.pathname}${ctx.url.search}`;
        if (proxyOptions.pathRewrite) path = proxyOptions.pathRewrite(path, ctx);

        const headers = stripHopByHop(req.headers);
        if (proxyOptions.changeOrigin !== false) headers.host = upstream.host;
        if (proxyOptions.xfwd !== false) {
          const proto = (req.socket as { encrypted?: boolean }).encrypted ? "https" : "http";
          const prior = req.headers["x-forwarded-for"];
          const addr = clientIp(req);
          headers["x-forwarded-for"] = prior ? `${prior}, ${addr}` : addr;
          headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? proto;
          headers["x-forwarded-host"] = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
        }
        Object.assign(headers, proxyOptions.headers ?? {});

        let settled = false;
        const settle = (ok: boolean, error?: unknown) => {
          if (settled) return;
          settled = true;
          resolve({ ok, error });
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
            proxyRes.on("error", () => {
              try { res.end(); } catch {}
              settle(true);
            });
            proxyRes.on("end", () => settle(true));
            proxyRes.pipe(res);
          },
        );

        proxyReq.on("error", (error) => {
          if (ctx.signal.aborted) {
            settle(true);
            return;
          }
          proxyOptions.onError?.(error, req, res);
          if (!res.headersSent) settle(false, error);
          else {
            try { res.end(); } catch {}
            settle(true);
          }
        });
        const timeoutMs = proxyTimeoutMs(proxyOptions.timeout);
        if (timeoutMs !== undefined) proxyReq.setTimeout(timeoutMs, () => proxyReq.destroy(upstreamTimeoutError()));
        abortProxyOnClientAbort(ctx.signal, proxyReq);
        req.pipe(proxyReq);
      });
    } finally {
      target.inFlight -= 1;
    }
  }

  const middleware: Middleware = async (ctx) => {
    const order = pickOrder(ctx.req);
    if (order.length === 0) {
      writeUpstreamFailure(ctx);
      return true;
    }

    let lastError: unknown;
    for (const target of order) {
      const result = await proxyTo(target, ctx);
      if (result.ok) return true;
      lastError = result.error;
      markDown(target);
      if (ctx.res.headersSent) return true;
    }

    writeUpstreamFailure(ctx, lastError);
    return true;
  };

  Object.defineProperty(middleware, "targets", {
    enumerable: true,
    value: [...targets],
  });
  Object.defineProperty(middleware, "health", {
    enumerable: true,
    get(): UpstreamHealth[] {
      return pool.map((target) => ({
        target: target.url,
        up: isUp(target),
        inFlight: target.inFlight,
        fails: target.fails,
        downUntil: target.downUntil,
      }));
    },
  });
  return middleware as UpstreamPoolMiddleware;
}
