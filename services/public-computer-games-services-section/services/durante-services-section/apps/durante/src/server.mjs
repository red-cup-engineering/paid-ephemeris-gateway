// server — durante's only impure transport boundary (node:http/fs/path/url only, no runtime
// package deps). Static-file-only: no body parsing, no session, no database.
// Routes: GET / (web/index.html); /web/<file> (static assets); /src/<file>.mjs (this app's own
// game modules, served as-is for the browser to import); /vendor/abrash/<name>.mjs and the
// generic /vendor/<scope>/<pkg>/<realPath> below (installed house packages served byte-for-byte
// so an import map in web/index.html can resolve bare specifiers the browser's loader cannot);
// /world/<file>.jsonl (seed asset); /DESIGN.md, /README.md; /health.

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, sep, normalize } from "node:path";

import { dailySeed, hexSeed } from "./daily.mjs";
import { dailyArena } from "./daily-arena.mjs";
import { replayRun } from "./run.mjs";
// Daily-tournament plumbing (date arithmetic, guards, leaderboard ranking, the run/score/
// scored-lock store, and the game-agnostic submission pipeline) moved to @red-cup-engineering/
// footing -- see that package's README for why: this app's server/ modules were already a
// disclosed, near-verbatim port of apps/ruinfold's own, duplicated rather than shared.
import { isValidDateStr, todayUTC } from "@red-cup-engineering/footing/dates";
import { readBodyCapped, MAX_BODY_BYTES, MAX_LOG_MOVES } from "@red-cup-engineering/footing/guard";
import { rankLeaderboard } from "@red-cup-engineering/footing/leaderboard";
import { openDailyStoreAuto } from "@red-cup-engineering/footing/store-factory";
import { submitDailyRun } from "@red-cup-engineering/footing/submission";

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));
const WEB_ROOT = join(APP_ROOT, "web");
const SRC_ROOT = join(APP_ROOT, "src");
const WORLD_ROOT = join(APP_ROOT, "world");
const NODE_MODULES_ROOT = join(APP_ROOT, "node_modules");
const ABRASH_SRC_ROOT = join(APP_ROOT, "node_modules", "@red-cup-engineering", "abrash", "src");

// vendored-package scopes this server will serve files out of. Deliberately an allowlist, not "any
// node_modules dir" — see /vendor/<scope>/<pkg>/<realPath> below. @lenticule-science covers
// @lenticule-science/metrologic, a real dependency the generic vendor route below already serves.
const VENDOR_SCOPES = new Set(["@561-group", "@lenticule-science", "@red-cup-engineering"]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

// SAFE_NAME — every route below extracts a bare filename (no slashes) from the URL path and
// validates it against this pattern before joining onto a root directory, making path-traversal
// structurally impossible rather than merely filtered.
const SAFE_NAME = /^[a-zA-Z0-9_-]+\.(mjs|css|jsonl|json|md)$/;

// SAFE_REAL_PATH/SAFE_PKG_SEGMENT — guards for /vendor/<scope>/<pkg>/<realPath>: a slash-bearing
// relative path is allowed (an installed package's own internal layout), but each segment is
// charset-restricted and ".."/"." segments are rejected outright, so climbing above the package
// root never matches, structurally, before any join()/normalize().
const SAFE_REAL_PATH = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\.mjs$/;
const SAFE_PKG_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function contentTypeFor(path) {
  const dot = path.lastIndexOf(".");
  return CONTENT_TYPES[path.slice(dot)] ?? "application/octet-stream";
}

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

// ---- GET /daily — today's (or an earlier practice date's) seed + arena metadata. NEVER leaks
// demon positions/roster (matching ruinfold's own handleDaily comment): a caller reconstructs the
// full arena itself, locally and deterministically, via createDailyEngine(date) — the same pure
// function this route calls to compute the metadata it DOES return.
function handleDaily(url, today, res) {
  const date = url.searchParams.get("date") ?? today;
  if (!isValidDateStr(date)) return json(res, 400, { error: "bad-date" });
  if (date > today) return json(res, 400, { error: "future-date-not-available" });

  const seed = dailySeed(date);
  const arena = dailyArena(seed); // pure, deterministic, cheap — never leaks positions/roster below
  json(res, 200, {
    date,
    seed: hexSeed(seed),
    floorBound: arena.floorBound,
    demonCount: arena.demonSpawns.length,
    mode: date === today ? "scored" : "practice",
  });
}

// ---- POST /runs — the daily submission route: guard -> validate shape -> derive the canonical seed
// server-side -> force `mode` by date===today -> pre-check the scored lock -> replayRun (the ONLY
// function that turns a log into a score) -> store unconditionally -> scored-lock + score if scored.

async function handleSubmitRun(store, today, req, res) {
  const bodyResult = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json(res, 413, { rejected: "body-too-large" });

  let parsed;
  try {
    parsed = JSON.parse(bodyResult.text || "{}");
  } catch {
    return json(res, 400, { rejected: "malformed-json" });
  }

  // entrantKind — spec §2.4's REQUIRED, self-declared honest-label field: requireEntrantKind:true
  // is durante's own exact existing posture (footing's default is false/optional, for a game like
  // ruinfold that never asks). replayRun(date, runLog) already only reads runLog.actor/.intentLog,
  // so passing it directly as footing's replayFn needs no adapter.
  const result = await submitDailyRun({
    store,
    today,
    body: parsed,
    dailySeed,
    replayFn: replayRun,
    maxLogMoves: MAX_LOG_MOVES,
    requireEntrantKind: true,
  });

  if (result.rejected) {
    const status = result.rejected === "already-scored-today" ? 409 : 400;
    return json(res, status, { rejected: result.rejected });
  }

  json(res, 200, {
    runId: result.runId,
    date: result.date,
    actor: result.actor,
    entrantKind: result.entrantKind,
    mode: result.mode,
    endedAt: result.endedAt,
    score: result.score,
    leaderboardEligible: result.leaderboardEligible,
  });
}

// ---- GET /leaderboard/:date ------------------------------------------------------------------------

async function handleLeaderboard(store, dateParam, res) {
  const date = decodeURIComponent(dateParam);
  if (!isValidDateStr(date)) return json(res, 400, { error: "bad-date" });
  const ranked = rankLeaderboard(await store.readScoresForDate(date));
  json(res, 200, { date, entries: ranked });
}

// ---- GET /replay/:runId -----------------------------------------------------------------------------

const RUN_ID_DATE_RE = /^(\d{4}-\d{2}-\d{2})__/;

async function handleReplay(store, runIdParam, res) {
  const runId = decodeURIComponent(runIdParam);
  const m = RUN_ID_DATE_RE.exec(runId);
  if (!m || !isValidDateStr(m[1])) return json(res, 400, { error: "bad-run-id" });
  const record = await store.readRunById(m[1], runId);
  if (!record) return json(res, 404, { error: "not-found" });
  json(res, 200, record);
}

async function handle(store, req, res) {
  try {
    const today = todayUTC(); // the request's one real-clock read
    const url = new URL(req.url ?? "/", "http://localhost");
    const { pathname } = url;

    // POST /runs is the ONE non-GET/HEAD route this server accepts — checked before the blanket
    // method gate below (which still governs every other route, unchanged).
    if (req.method === "POST" && pathname === "/runs") return await handleSubmitRun(store, today, req, res);

    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "method-not-allowed" });

    if (pathname === "/daily") return handleDaily(url, today, res);
    const lb = /^\/leaderboard\/([^/]+)$/.exec(pathname);
    if (lb) return await handleLeaderboard(store, lb[1], res);
    const rp = /^\/replay\/([^/]+)$/.exec(pathname);
    if (rp) return await handleReplay(store, rp[1], res);

    if (pathname === "/" || pathname === "/index.html") return serveFile(res, join(WEB_ROOT, "index.html"));
    if (pathname === "/health") return json(res, 200, { ok: true, today });
    if (pathname === "/DESIGN.md") return serveFile(res, join(APP_ROOT, "DESIGN.md"));
    if (pathname === "/README.md") return serveFile(res, join(APP_ROOT, "README.md"));

    const web = /^\/web\/([^/]+)$/.exec(pathname);
    if (web && SAFE_NAME.test(web[1])) return serveFile(res, join(WEB_ROOT, web[1]));

    const src = /^\/src\/([^/]+)$/.exec(pathname);
    if (src && SAFE_NAME.test(src[1])) return serveFile(res, join(SRC_ROOT, src[1]));

    const world = /^\/world\/([^/]+)$/.exec(pathname);
    if (world && SAFE_NAME.test(world[1])) return serveFile(res, join(WORLD_ROOT, world[1]));

    const vendor = /^\/vendor\/abrash\/([^/]+)$/.exec(pathname);
    if (vendor && SAFE_NAME.test(vendor[1])) return serveFile(res, join(ABRASH_SRC_ROOT, vendor[1]));

    // /vendor/<scope>/<pkg>/<realPath> — generic vendor route for house deps this app may not
    // modify (abrash's world.mjs transitively imports @561-group/computer and
    // @lenticule-science/metrologic subpaths). Serves each package's real on-disk relative path
    // verbatim, matching web/index.html's import map, so a package-internal relative import (e.g.
    // bilattice/src/index.mjs -> "./charge.mjs") resolves back through this same route.
    // SAFE_REAL_PATH + the pkgRoot containment check below make traversal structurally impossible.
    const genericVendor = /^\/vendor\/(@[a-zA-Z0-9-]+)\/([a-zA-Z0-9_-]+)\/(.+)$/.exec(pathname);
    if (genericVendor) {
      const [, scope, pkg, realPath] = genericVendor;
      if (VENDOR_SCOPES.has(scope) && SAFE_PKG_SEGMENT.test(pkg) && SAFE_REAL_PATH.test(realPath)) {
        const pkgRoot = join(NODE_MODULES_ROOT, scope, pkg);
        const resolved = normalize(join(pkgRoot, realPath));
        if (resolved === pkgRoot || resolved.startsWith(pkgRoot + sep)) {
          return serveFile(res, resolved);
        }
      }
      return notFound(res);
    }

    return notFound(res);
  } catch (err) {
    json(res, 500, { error: "internal-error", detail: err instanceof Error ? err.message : String(err) });
  }
}

// DEFAULT_DATA_ROOT — this app's own apps/durante/data/, matching ruinfold's own server.mts default.
const DEFAULT_DATA_ROOT = join(APP_ROOT, "data");

// resolveStoreRoot — `dataRoot` is ALWAYS a filesystem path (this app's own data/, or a test's scratch
// temp dir); store-factory.mjs's `root` parameter means something different per backend though: a
// filesystem directory for the file-store, but a GCS object-name PREFIX for the bucket-store. On the
// bucket backend the dedicated `durante-daily` bucket needs no prefix, so `dataRoot` is deliberately
// NOT forwarded there — see ruinfold's own resolveStoreRoot for the identical reasoning (forwarding it
// unconditionally would leak the container's working-directory path into every GCS object name).
export function resolveStoreRoot(dataRoot, env = process.env) {
  const bucketSelected = env.DURANTE_BUCKET !== undefined && env.DURANTE_BUCKET !== "";
  return bucketSelected ? "" : dataRoot;
}

// createApp(dataRoot, env) — `dataRoot` defaults to DEFAULT_DATA_ROOT (so existing callers of the
// original zero-argument `createApp()` keep working unchanged); `env` defaults to `process.env`.
// footing's `openDailyStoreAuto(root, bucket, bucketOptions)` selects the persistence backend from
// the RESOLVED bucket name this app reads from its own `env.DURANTE_BUCKET` -- footing itself
// never reads process.env or knows this env var's name (see its store-factory.mjs header).
export function createApp(dataRoot = DEFAULT_DATA_ROOT, env = process.env) {
  const store = openDailyStoreAuto(resolveStoreRoot(dataRoot, env), env.DURANTE_BUCKET);
  return createServer((req, res) => {
    void handle(store, req, res);
  });
}

export function resolvePort(env = process.env) {
  return Number(env.PORT ?? env.DURANTE_PORT ?? 8788);
}

// entrypoint — only when run directly (`node src/server.mjs`), never on import (a future test can
// import createApp and drive it with a real HTTP client without ever binding a port).
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = resolvePort();
  const host = process.env.DURANTE_HOST ?? "0.0.0.0";
  const app = createApp();
  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`durante web server listening on ${host}:${port} (data root: ${DEFAULT_DATA_ROOT})`);
  });
}
