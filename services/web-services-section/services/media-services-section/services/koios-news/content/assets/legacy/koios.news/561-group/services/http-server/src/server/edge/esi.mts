// edge/esi.ts — Edge Side Includes (ESI) fragment assembly.
//
// The markup representation (substitution language, transclusion
// transform) lives in @emsenn/web-codecs-esi. This module is the
// transport side: binding the W3C request variables to the live
// request, fetching fragments over HTTP, caching them, and patching the
// response stream.

import * as http from "node:http";
import * as https from "node:https";
import {
  EsiIncludeError,
  hasEsi,
  processEsi,
  type EsiResolver,
} from "@emsenn/computing-with-http/codecs/esi";
import type { Middleware, Repr } from "../types.mjs";

export type EsiOptions = {
  ttlMs?: number;
  timeout?: number;
  maxDepth?: number;
  onError?: (src: string, err: unknown) => string;
  allowedHosts?: string[];
};

/** The W3C request variables, bound to the live request. The binding is transport; the names are spec. */
function builtinVars(ctx: Record<string, any>): Record<string, unknown> {
  const headers = ctx.req?.headers ?? {};
  const url = ctx.url;
  return {
    HTTP_HOST: headers.host ?? url?.host ?? "",
    HTTP_REFERER: headers.referer ?? "",
    HTTP_USER_AGENT: headers["user-agent"] ?? "",
    HTTP_ACCEPT_LANGUAGE: headers["accept-language"] ?? "",
    HTTP_COOKIE: headers.cookie ?? "",
    QUERY_STRING: url?.search?.replace(/^\?/, "") ?? "",
    REQUEST_METHOD: ctx.req?.method ?? "",
    REQUEST_PATH: url?.pathname ?? "",
    ...(ctx.esiVars ?? {}),
  };
}

function fetchFragment(src: string, timeout: number, allowedHosts: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(src);
    } catch (error) {
      reject(error);
      return;
    }
    if (allowedHosts.length && !allowedHosts.includes(url.hostname)) {
      reject(new Error("ESI host not allowed"));
      return;
    }
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        if ((res.statusCode ?? 500) >= 400) reject(new Error(`fragment status ${res.statusCode}`));
        else resolve(Buffer.concat(chunks).toString("utf8"));
      });
      res.on("error", reject);
    });
    req.setTimeout(timeout, () => req.destroy(new Error("ESI fragment timeout")));
    req.on("error", reject);
  });
}

export function esi(opts: EsiOptions = {}): Middleware {
  const ttlMs = opts.ttlMs ?? 30_000;
  const timeout = opts.timeout ?? 5_000;
  const maxDepth = opts.maxDepth ?? 8;
  const allowedHosts = opts.allowedHosts ?? [];
  const cache = new Map<string, { body: string; expiresAt: number }>();

  const resolver: EsiResolver = async (src) => {
    const now = Date.now(); // law-allow: wall-clock-as-data — fragment cache TTL bookkeeping, not event ordering
    const cached = cache.get(src);
    if (cached && cached.expiresAt > now) return cached.body;
    const body = await fetchFragment(src, timeout, allowedHosts);
    cache.set(src, { body, expiresAt: now + ttlMs });
    return body;
  };

  return (ctx) => {
    const chunks: Buffer[] = [];
    const origWrite = ctx.res.write.bind(ctx.res) as (...args: unknown[]) => boolean;
    const origEnd = ctx.res.end.bind(ctx.res) as (...args: unknown[]) => unknown;

    (ctx.res as unknown as { write: (...args: unknown[]) => boolean }).write = (chunk: unknown, ...args: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    (ctx.res as unknown as { end: (...args: unknown[]) => unknown }).end = (chunk?: unknown, ...args: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      const type = String(ctx.res.getHeader("content-type") ?? "");
      if (!/text\/html/i.test(type)) {
        for (const piece of chunks) origWrite(piece);
        return origEnd(...args);
      }
      const source = Buffer.concat(chunks).toString("utf8");
      processEsi(source, ctx, resolver, { maxDepth, vars: builtinVars(ctx) }).then((body) => {
        const buf = Buffer.from(body, "utf8");
        ctx.res.setHeader("content-length", String(buf.length));
        origEnd(buf);
      }).catch((error) => {
        const fallback = opts.onError?.("document", error);
        origEnd(fallback === undefined ? Buffer.concat(chunks) : Buffer.from(fallback));
      });
      return ctx.res;
    };
  };
}

export function esiResource(
  handle: (req: unknown, ctx: Record<string, any>) => Repr | null | Promise<Repr | null>,
  resolve: EsiResolver,
  options: { maxDepth?: number; onErrorStatus?: number; vary?: boolean } = {},
) {
  return async (req: unknown, ctx: Record<string, any>) => {
    const repr = await handle(req, ctx);
    if (repr == null) return repr;
    const type = repr.type ?? "";
    if (!/^text\/html\b/i.test(type)) return repr;
    const body = repr.body;
    if (!(typeof body === "string" || Buffer.isBuffer(body))) return repr;
    const source = Buffer.isBuffer(body) ? body.toString("utf8") : body;
    if (!hasEsi(source)) return repr;
    try {
      const composed = await processEsi(source, ctx, resolve, { maxDepth: options.maxDepth ?? 8, vars: builtinVars(ctx) });
      const next = { ...repr, body: composed };
      delete next.etag; // law-allow: delete-not-trace — composition invalidates the fragment ETag; header framing, not evidence
      if (options.vary !== false) next.headers = { ...(next.headers ?? {}), vary: appendVary(next.headers?.vary, "Accept") };
      return next;
    } catch (error) {
      if (error instanceof EsiIncludeError) {
        return { status: options.onErrorStatus ?? 500, type: "text/plain; charset=utf-8", body: "Edge composition failed" };
      }
      throw error;
    }
  };
}

function appendVary(existing: string | readonly string[] | undefined, field: string): string {
  const values = new Set(String(existing ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  if (values.has("*")) return "*";
  values.add(field);
  return [...values].join(", ");
}
