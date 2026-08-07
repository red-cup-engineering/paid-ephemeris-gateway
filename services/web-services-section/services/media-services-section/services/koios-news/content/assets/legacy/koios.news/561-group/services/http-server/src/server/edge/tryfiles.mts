// edge/tryfiles.ts — nginx-style try_files: serve first-existing candidate.
//
// Each candidate path is tested in order; the first that exists is served.
// If none exist, optionally fall through to the next middleware, or return 404.
// $uri and :param substitutions supported.

import { stat } from "node:fs/promises";
import { join, resolve, normalize } from "node:path";
import type { Middleware, Repr } from "../types.mjs";
import { send } from "../http.mjs";
import { staticFiles } from "../static.mjs";
import type { StaticOptions } from "../static.mjs";

export type TryFilesOptions = {
  root: string;
  /** Candidates in order. Supports $uri (full path), $1…$n (regex captures), literal paths. */
  files?: string[];
  /** Alias for archive-style callers. */
  paths?: string[];
  /** If all candidates miss: "next" (fall through), "404" (return 404), a fixed path, or a representation. */
  fallback?: "next" | "404" | string | Repr;
  /** Static file serving options (for serving matched files). */
  staticOpts?: Omit<StaticOptions, "root">;
};

function safePath(root: string, path: string): string | null {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.\/|\/)+/, "");
  const full = resolve(join(root, clean));
  return full.startsWith(resolve(root)) ? full : null;
}

async function fileExists(path: string): Promise<boolean> {
  try { const s = await stat(path); return s.isFile(); } catch { return false; }
}

export function tryFiles(opts: TryFilesOptions): Middleware {
  const { root, fallback = "next" } = opts;
  const files = opts.files ?? opts.paths ?? ["$uri"];
  const serveStatic = staticFiles({ root, ...(opts.staticOpts ?? {}) });

  return async (ctx) => {
    const urlPath = ctx.url.pathname;

    for (const candidate of files) {
      // Substitute $uri
      const path = candidate.replace("$uri", urlPath);
      const fullPath = safePath(root, path);
      if (!fullPath) continue;
      if (!(await fileExists(fullPath))) continue;

      // Found — serve it via the static handler
      const origUrl = ctx.url;
      ctx.url = new URL(path.startsWith("/") ? path : "/" + path, ctx.url.origin);
      (ctx.req as unknown as { url: string }).url = ctx.url.pathname;

      await serveStatic(ctx);
      ctx.url = origUrl;
      return true;
    }

    // All candidates missed
    if (fallback === "next") return;
    if (fallback === "404") { ctx.res.writeHead(404).end("Not Found"); return true; }
    if (typeof fallback === "object") {
      await send(ctx.req, ctx.res, fallback);
      return true;
    }

    // Fallback is a fixed path
    const fallbackFull = safePath(root, fallback);
    if (fallbackFull && await fileExists(fallbackFull)) {
      ctx.url = new URL(fallback.startsWith("/") ? fallback : "/" + fallback, ctx.url.origin);
      (ctx.req as unknown as { url: string }).url = ctx.url.pathname;
      await serveStatic(ctx);
      return true;
    }

    ctx.res.writeHead(404).end("Not Found");
    return true;
  };
}
