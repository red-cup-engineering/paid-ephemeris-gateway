// server — BNSF's ONLY impure transport boundary: the sole module in this app that talks node:http or
// touches the filesystem. Zero runtime dependencies (node:http, node:fs, node:path, node:url, and
// node:module's stripTypeScriptTypes are the whole import list). Everything served is a static file (or
// a `.mts` source, type-stripped on the fly); there is no request body parsing, no session, no
// database — the game is entirely client-side once the page loads, deterministic core and all, matching
// the design's own "local-first, signed run submissions per cartridge replay" v1 economy shape (no
// server-side leaderboard backend in v1 — see src/manifest.mts's own seedPolicy note).
//
// This file's SHAPE is a deliberate, documented port of two real, already-proven sibling patterns
// (house doctrine: vendor/port, never a live cross-service import):
//   - The `.mts` type-stripping route is gambling-trainer-service's `web/server.mjs` pattern (serving
//     `src/*.mts` engine modules to the browser as plain JS via `node:module`'s `stripTypeScriptTypes`,
//     the same primitive `check-mts.mjs` uses).
//   - The `/vendor/abrash/` and generic `/vendor/<scope>/<pkg>/<realPath>` routes are durante-service's
//     `src/server.mjs` pattern, needed for the identical reason: abrash's own `world.mjs` imports
//     `@561-group/computer/posix-holography/eavt-substrate`, which imports
//     `@561-group/computer/typed-resource-catalog/eavt` and `@lenticule-science/metrologic/{bilattice,chu,chu/four}`
//     — real, pinned, published house dependencies this app may not modify, transitively reachable only
//     because a browser has no npm resolver and needs every bare specifier served at a real URL an
//     import map (web/index.html) can point at.
//
// Routes:
//   GET  /                         redirects (302) to /web/index.html — a REAL redirect, never an
//                                   internal rewrite (see the deploy runbook's own front-door bug class)
//   GET  /web/<file>                static browser-face assets (index.html, css/*, js/*)
//   GET  /src/<...>.mts             this app's own engine modules, type-stripped on the fly
//   GET  /vendor/abrash/<name>.mjs   the installed abrash package's own src/*.mjs, served as-is
//   GET  /vendor/<scope>/<pkg>/<realPath>   the generic vendor route for abrash's own transitive deps
//   GET  /DESIGN.md, /README.md     this app's own disclosure docs, plain text
//   GET  /health                    liveness probe

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, sep, normalize, extname } from "node:path";
import { stripTypeScriptTypes } from "node:module";

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));
const WEB_ROOT = join(APP_ROOT, "web");
const SRC_ROOT = join(APP_ROOT, "src");
const NODE_MODULES_ROOT = join(APP_ROOT, "node_modules");
const ABRASH_SRC_ROOT = join(NODE_MODULES_ROOT, "@red-cup-engineering", "abrash", "src");

// vendored-package scopes this server will serve files out of — an allowlist, not "any node_modules
// dir" (see the generic vendor route below).
const VENDOR_SCOPES = new Set(["@561-group", "@red-cup-engineering"]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mts": "text/javascript; charset=utf-8", // stripped before serving — see handleSrc below
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function contentTypeFor(path) {
  return CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
}

// SAFE_NAME — a bare filename (no slashes) extracted from a URL path, validated BEFORE ever being
// joined onto a root directory: path traversal ("..", absolute paths, encoded slashes) is structurally
// impossible, not merely filtered, because a string that doesn't match never reaches `join()`.
const SAFE_NAME = /^[a-zA-Z0-9_-]+\.(mjs|mts|css|json|md|svg|ico|html)$/;

// SAFE_SRC_PATH — src/ files may nest one or two directories deep (anomalies/, ext/) — a slash-bearing
// relative path is allowed, but each segment is restricted to this charset and ".."/"." segments are
// rejected outright, so a climbing path never matches, structurally, before any join()/normalize().
const SAFE_SRC_PATH = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\.mts$/;

// SAFE_REAL_PATH / SAFE_PKG_SEGMENT — the guard for the generic vendor route (see below).
const SAFE_REAL_PATH = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\.mjs$/;
const SAFE_PKG_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function serveFile(res, absPath) {
  if (!existsSync(absPath)) return notFound(res);
  const body = readFileSync(absPath);
  res.writeHead(200, {
    "Content-Type": contentTypeFor(absPath),
    "Content-Length": String(body.length),
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

// serveSrcModule — read a `.mts` source file and serve it TYPE-STRIPPED as plain `text/javascript`,
// the same primitive check-mts.mjs and `node <file>.mts` execution itself already use. The browser
// never sees TypeScript syntax; it runs the identical, unmodified engine source Node runs for tests.
function serveSrcModule(res, absPath) {
  if (!existsSync(absPath)) return notFound(res);
  const source = readFileSync(absPath, "utf8");
  let stripped;
  try {
    stripped = stripTypeScriptTypes(source, { mode: "strip" });
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`type-stripping failed for ${absPath}: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  const body = Buffer.from(stripped, "utf8");
  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Length": String(body.length),
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

function notFound(res) {
  const body = Buffer.from("not found", "utf8");
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Content-Length": String(body.length) });
  res.end(body);
}

function json(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": String(buf.length) });
  res.end(buf);
}

function handle(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "method-not-allowed" });

    const url = new URL(req.url ?? "/", "http://localhost");
    const { pathname } = url;

    // Real redirect, not an internal rewrite — every path-relative asset reference inside
    // web/index.html only resolves correctly when the document's own URL is /web/index.html.
    if (pathname === "/" || pathname === "") {
      res.writeHead(302, { Location: "/web/index.html" });
      res.end();
      return;
    }

    if (pathname === "/health") return json(res, 200, { ok: true });
    if (pathname === "/DESIGN.md") return serveFile(res, join(APP_ROOT, "DESIGN.md"));
    if (pathname === "/README.md") return serveFile(res, join(APP_ROOT, "README.md"));

    const web = /^\/web\/(.+)$/.exec(pathname);
    if (web) {
      const rel = decodeURIComponent(web[1]);
      if (SAFE_SRC_PATH.test(rel) || SAFE_NAME.test(rel) || /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(css|mjs)$/.test(rel)) {
        return serveFile(res, join(WEB_ROOT, rel));
      }
      return notFound(res);
    }

    const src = /^\/src\/(.+)$/.exec(pathname);
    if (src) {
      const rel = decodeURIComponent(src[1]);
      if (SAFE_SRC_PATH.test(rel)) return serveSrcModule(res, join(SRC_ROOT, rel));
      return notFound(res);
    }

    const vendorAbrash = /^\/vendor\/abrash\/([^/]+)$/.exec(pathname);
    if (vendorAbrash && SAFE_NAME.test(vendorAbrash[1])) return serveFile(res, join(ABRASH_SRC_ROOT, vendorAbrash[1]));

    // /vendor/<scope>/<pkg>/<realPath> — the generic vendor route for abrash's OWN transitive
    // dependencies (see the file header). Package-internal relative imports (e.g. bilattice/src/
    // index.mjs importing "./charge.mjs") resolve correctly because this route serves each package's
    // real on-disk relative path verbatim — a browser's relative-URL resolution lands back on this
    // same route for the sibling file, no per-file entry needed.
    const genericVendor = /^\/vendor\/(@[a-zA-Z0-9-]+)\/([a-zA-Z0-9_-]+)\/(.+)$/.exec(pathname);
    if (genericVendor) {
      const [, scope, pkg, realPath] = genericVendor;
      const decoded = decodeURIComponent(realPath);
      if (VENDOR_SCOPES.has(scope) && SAFE_PKG_SEGMENT.test(pkg) && SAFE_REAL_PATH.test(decoded)) {
        const pkgRoot = join(NODE_MODULES_ROOT, scope, pkg);
        const resolved = normalize(join(pkgRoot, decoded));
        if (resolved === pkgRoot || resolved.startsWith(pkgRoot + sep)) return serveFile(res, resolved);
      }
      return notFound(res);
    }

    return notFound(res);
  } catch (err) {
    json(res, 500, { error: "internal-error", detail: err instanceof Error ? err.message : String(err) });
  }
}

export function createApp() {
  return createServer(handle);
}

export function resolvePort(env = process.env) {
  return Number(env.PORT ?? 8787);
}

// entrypoint — only when run directly (`node src/server.mjs`), never on import.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = resolvePort();
  const host = process.env.HOST ?? "0.0.0.0";
  const app = createApp();
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`be-not-so-fearful web server listening on ${host}:${port} (${APP_ROOT})`);
  });
}
