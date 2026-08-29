// static — serves the browser client's static files (apps/ruinfold/web/). This is plain read-a-
// file-and-return-it transport plumbing, the same "impure boundary" posture server.mts's own
// header claims for the rest of this layer: no game logic lives here, just bytes off disk.
//
// Path safety: every request path is resolved with node:path and checked to still be inside
// `root` after resolution — the same path-injection discipline @red-cup-engineering/footing/guard documents for actor/
// player ids (isSafeId), applied here to URL path segments feeding a filesystem read instead.

import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

export interface StaticHit {
  status: 200;
  contentType: string;
  body: Buffer;
}
export interface StaticMiss {
  status: 404;
}
export type StaticResult = StaticHit | StaticMiss;

// resolveUnder — join root + a URL path (which always starts with "/"), then reject anything that
// resolves outside root (a "/../../secrets" style escape) rather than trusting the join alone.
function resolveUnder(root: string, urlPath: string): string | null {
  const normalizedRoot = resolve(root) + sep;
  const abs = resolve(root, "." + urlPath); // "."+"/x/y" -> "./x/y", relative to root
  if (abs + sep !== normalizedRoot && !abs.startsWith(normalizedRoot)) return null;
  return abs;
}

// readStatic — `urlPath` is the request pathname already stripped of whatever route prefix the
// caller mounted this under (server.mts strips "/web" before calling this). "/" maps to
// "/index.html"; anything else is read verbatim relative to `root`.
export function readStatic(root: string, urlPath: string): StaticResult {
  const rel = urlPath === "" || urlPath === "/" ? "/index.html" : urlPath;
  const abs = resolveUnder(root, rel);
  if (!abs || !existsSync(abs) || !statSync(abs).isFile()) return { status: 404 };
  const contentType = MIME[extname(abs)] ?? "application/octet-stream";
  return { status: 200, contentType, body: readFileSync(abs) };
}
