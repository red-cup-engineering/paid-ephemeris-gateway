// server — the daily's impure transport boundary (design §1.1, §2.2, §5-§5.3). This is the ONLY
// module in the app that talks node:http, reads the real clock, or generates a random-looking
// bookkeeping id — and even here, `new Date()`/`randomUUID()` are used ONLY for server bookkeeping
// (what UTC date is it right now; a unique storage key for a stored run; a submission timestamp for
// the §5.1-point-3 tiebreak), never as an input to anything the engine computes. Every request is
// handled by: read the one real clock value for this request -> run the lazy rollover check ->
// route -> let the pure engine/server modules do the actual work.
//
// Routes:
//   GET  /daily[?date=YYYY-MM-DD]   today's (or an earlier practice date's) seed + metadata
//   POST /runs                      submit {player|actor, seed?, date?, mode?, intentLog|moves} ->
//                                    replay-verify server-side, store, return the verified score
//   GET  /leaderboard/:date         that date's scored runs, ranked (design §5.1)
//   GET  /replay/:runId             the stored move-log for that run, for client-side spectating
//   GET  /boons/:player             this week's active boon for a player, if any (design §5.2)
//   GET  /health                    liveness + today's UTC date, for smoke-testing deploys
//   GET  /, /play, /watch, /web/*   the browser client (web/) — static files, see server/static.mts
//   GET  /engine/:file.mts          the SAME engine source the client runs, type-stripped for the
//                                    browser at request time — see server/engine-serve.mts

import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

import { dailySeed } from "#engine/daily.mts";
import { buildDaily } from "#engine/dungeon.mts";
import { replay } from "#engine/run.mts";
import type { Move, RunLog } from "#engine/run.mts";

// Daily-tournament plumbing (date arithmetic, guards, leaderboard ranking, the run/score/
// scored-lock store, and the game-agnostic submission pipeline) moved to @red-cup-engineering/
// footing -- see that package's README. isoWeekStartUTC and the ledger/boon store extension stay
// local (server/dates.mts, server/store.mts, server/store-factory.mts): no other game has ruinfold's
// weekly-boon mechanic.
import { isValidDateStr, todayUTC } from "@red-cup-engineering/footing/dates";
import { readBodyCapped, MAX_BODY_BYTES, MAX_LOG_MOVES, isSafeId } from "@red-cup-engineering/footing/guard";
import { rankLeaderboard } from "@red-cup-engineering/footing/leaderboard";
import { submitDailyRun } from "@red-cup-engineering/footing/submission";
import { isoWeekStartUTC } from "#server/dates.mts";
import { openStoreAuto } from "#server/store-factory.mts";
import type { StoreFactoryEnv, Store } from "#server/store-factory.mts";
import { ensureRollover } from "#server/rollover.mts";
import { readStatic } from "#server/static.mts";
import { readEngineModule } from "#server/engine-serve.mts";

// WEB_ROOT/ENGINE_ROOT are computed from this module's own location, independent of `dataRoot`
// (createApp's parameter, which tests point at a scratch temp dir) — the client and engine source
// live in the app's own tree, never in the mutable data root.
const WEB_ROOT = fileURLToPath(new URL("../web/", import.meta.url));
const ENGINE_ROOT = fileURLToPath(new URL("./engine/", import.meta.url));

function hexSeed(n: number): string {
  return "0x" + (n >>> 0).toString(16).padStart(8, "0");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": String(buf.length) });
  res.end(buf);
}

// ---- GET /daily ---------------------------------------------------------------------------------

function handleDaily(url: URL, today: string, res: ServerResponse): void {
  const date = url.searchParams.get("date") ?? today;
  if (!isValidDateStr(date)) return json(res, 400, { error: "bad-date" });
  if (date > today) return json(res, 400, { error: "future-date-not-available" });

  const seed = dailySeed(date);
  const world = buildDaily(seed); // pure, deterministic, cheap — never leaks positions/roster here
  json(res, 200, {
    date,
    seed: hexSeed(seed),
    floorCount: world.floorCount,
    mode: date === today ? "scored" : "practice", // design §1.4: only today's daily is ever scored
    hub: { zoneId: "the-gate" },
  });
}

// ---- POST /runs -----------------------------------------------------------------------------

type SubmitRejection =
  | "body-too-large"
  | "malformed-json"
  | "malformed-body"
  | "bad-actor"
  | "bad-date"
  | "future-date"
  | "missing-moves"
  | "too-many-moves"
  | "malformed-move"
  | "seed-mismatch"
  | "practice-not-allowed-on-live-date"
  | "scored-only-valid-on-live-date"
  | "already-scored-today";

// ruinfoldReplayFn — the replayFn footing's submitDailyRun invokes. Wraps the engine's own
// replay(): footing's generic pipeline validates array-ness/length only, so the per-move (tick,
// seq) SHAPE check stays here, exactly as it always ran, BEFORE the engine ever sees a move --
// run.mts's own replay() trusts tick/seq to already be numbers; this is the boundary that makes
// that trust safe, not a redundant check (see engine/run.mts's and this file's own header).
function ruinfoldReplayFn(date: string, submission: { actor: string; intentLog: unknown[] }) {
  const moves: Move[] = [];
  for (const raw of submission.intentLog) {
    if (!raw || typeof raw !== "object") return { rejected: "malformed-move" };
    const r = raw as Record<string, unknown>;
    if (!Number.isInteger(r.tick) || (r.tick as number) < 0) return { rejected: "malformed-move" };
    if (!Number.isInteger(r.seq) || (r.seq as number) < 0) return { rejected: "malformed-move" };
    moves.push({ tick: r.tick as number, seq: r.seq as number, intent: r.intent });
  }
  const log: RunLog = { schema: "ruinfold-run/1", date, seed: dailySeed(date), actor: submission.actor, mode: "scored", moves };
  return replay(dailySeed(date), log); // the ONLY function that turns a submitted log into a score
}

async function handleSubmitRun(store: Store, today: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const bodyResult = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json(res, 413, { rejected: "body-too-large" satisfies SubmitRejection });

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyResult.text || "{}");
  } catch {
    return json(res, 400, { rejected: "malformed-json" satisfies SubmitRejection });
  }

  const result = await submitDailyRun({
    store,
    today,
    body: parsed,
    dailySeed,
    replayFn: ruinfoldReplayFn,
    maxLogMoves: MAX_LOG_MOVES,
    requireEntrantKind: false, // ruinfold's own posture -- see footing/submission's own doc
  });

  if (result.rejected) {
    const status = result.rejected === "already-scored-today" ? 409 : 400;
    return json(res, status, { rejected: result.rejected });
  }

  json(res, 200, {
    runId: result.runId,
    date: result.date,
    actor: result.actor,
    mode: result.mode,
    endedAt: result.endedAt,
    score: result.score,
    leaderboardEligible: result.leaderboardEligible,
  });
}

// ---- GET /leaderboard/:date ----------------------------------------------------------------------

async function handleLeaderboard(store: Store, dateParam: string, res: ServerResponse): Promise<void> {
  const date = decodeURIComponent(dateParam);
  if (!isValidDateStr(date)) return json(res, 400, { error: "bad-date" });
  const ranked = rankLeaderboard(await store.readScoresForDate(date));
  json(res, 200, { date, entries: ranked });
}

// ---- GET /replay/:runId ---------------------------------------------------------------------------

const RUN_ID_DATE_RE = /^(\d{4}-\d{2}-\d{2})__/;

async function handleReplay(store: Store, runIdParam: string, res: ServerResponse): Promise<void> {
  const runId = decodeURIComponent(runIdParam);
  const m = RUN_ID_DATE_RE.exec(runId);
  if (!m || !isValidDateStr(m[1] as string)) return json(res, 400, { error: "bad-run-id" });
  const record = await store.readRunById(m[1] as string, runId);
  if (!record) return json(res, 404, { error: "not-found" });
  json(res, 200, record);
}

// ---- GET /boons/:player -----------------------------------------------------------------------

async function handleBoons(store: Store, playerParam: string, today: string, res: ServerResponse): Promise<void> {
  const player = decodeURIComponent(playerParam);
  if (!isSafeId(player)) return json(res, 400, { error: "bad-player" });
  const weekStart = isoWeekStartUTC(today);
  const active = (await store.readBoonsForWeek(weekStart)).find((b) => b.actor === player) ?? null;
  json(res, 200, { active: active !== null, player, weekStart, boon: active });
}

// ---- static client + engine-module serving (design §6.1) ----------------------------------------

function serveStatic(res: ServerResponse, urlPath: string): void {
  const result = readStatic(WEB_ROOT, urlPath);
  if (result.status === 404) return json(res, 404, { error: "not-found" });
  res.writeHead(200, { "Content-Type": result.contentType, "Content-Length": String(result.body.length) });
  res.end(result.body);
}

function serveEngineModule(res: ServerResponse, filename: string): void {
  const result = readEngineModule(ENGINE_ROOT, filename);
  if (result.status !== 200) return json(res, result.status, { error: "not-found" });
  const buf = Buffer.from(result.body, "utf8");
  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Length": String(buf.length),
    "Cache-Control": "no-cache",
  });
  res.end(buf);
}

// ---- routing ----------------------------------------------------------------------------------

async function handle(store: Store, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const today = todayUTC(); // the request's one real-clock read

  try {
    await ensureRollover(store, today); // lazy, idempotent, no cron (design §5.2)

    const url = new URL(req.url ?? "/", "http://localhost");
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/daily") return handleDaily(url, today, res);
    if (req.method === "POST" && pathname === "/runs") return await handleSubmitRun(store, today, req, res);

    const lb = /^\/leaderboard\/([^/]+)$/.exec(pathname);
    if (req.method === "GET" && lb) return await handleLeaderboard(store, lb[1] as string, res);

    const rp = /^\/replay\/([^/]+)$/.exec(pathname);
    if (req.method === "GET" && rp) return await handleReplay(store, rp[1] as string, res);

    const bp = /^\/boons\/([^/]+)$/.exec(pathname);
    if (req.method === "GET" && bp) return await handleBoons(store, bp[1] as string, today, res);

    if (req.method === "GET" && pathname === "/health") return json(res, 200, { ok: true, today });

    const eng = /^\/engine\/([^/]+)$/.exec(pathname);
    if (req.method === "GET" && eng) return serveEngineModule(res, eng[1] as string);

    if (req.method === "GET" && pathname === "/") return serveStatic(res, "/index.html");
    if (req.method === "GET" && pathname === "/play") return serveStatic(res, "/play.html");
    if (req.method === "GET" && pathname === "/watch") return serveStatic(res, "/watch.html");
    if (req.method === "GET" && pathname.startsWith("/web/")) return serveStatic(res, pathname.slice("/web".length));

    json(res, 404, { error: "not-found" });
  } catch (err) {
    json(res, 500, { error: "internal-error", detail: err instanceof Error ? err.message : String(err) });
  }
}

// createApp — `openStoreAuto` (store-factory.mts) selects the persistence backend from
// `env.RUINFOLD_BUCKET`: the GCS bucket-store on Cloud Run (set), the local file-store otherwise
// (unset — every existing test's scratch-dir usage, and local `npm start`). Callers here never
// branch on which backend they got; both are exposed under the one `Store` surface.
//
// `dataRoot` is ALWAYS a filesystem path (this app's own apps/ruinfold/data/, or a test's scratch
// temp dir) — that's the only kind of root that ever makes sense for it, since it's the same value
// tests point at a temp directory. store-factory.mts's `root` parameter means something different
// per backend, though: a filesystem directory for the file-store, but a GCS object-name PREFIX for
// the bucket-store (see its own header). Forwarding `dataRoot` unconditionally into that shared
// parameter is exactly the bug this comment is here to prevent: on Cloud Run the container's own
// working-directory path (e.g. "/app/data/") would leak into every GCS object name for no reason,
// producing paths like "gs://bucket//app/data/runs/2026-08-19.jsonl" — technically still readable
// back consistently, but not the clean "runs/2026-08-19.jsonl" layout the bucket-store's own header
// documents. The bucket is already dedicated to this one app, so no prefix is needed there — only
// the file-store branch gets the real `dataRoot`.
export function resolveStoreRoot(dataRoot: string, env: StoreFactoryEnv = process.env): string {
  const bucketSelected = env.RUINFOLD_BUCKET !== undefined && env.RUINFOLD_BUCKET !== "";
  return bucketSelected ? "" : dataRoot;
}

export function createApp(dataRoot: string, env: StoreFactoryEnv = process.env) {
  const store = openStoreAuto(resolveStoreRoot(dataRoot, env), env);
  return createServer((req, res) => {
    void handle(store, req, res);
  });
}

// resolvePort — Cloud Run injects PORT and expects the container to listen on exactly it (its
// health check and traffic routing both depend on this); RUINFOLD_PORT stays as a local-dev
// override for anyone who had it set before Cloud Run entered the picture, and 8787 is the
// unconfigured-local-dev default. `env` is injectable so this is testable without mutating
// `process.env` — see server-port.test.mts.
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.PORT ?? env.RUINFOLD_PORT ?? 8787);
}

// ---- entrypoint: only when run directly (`node src/server.mts`), never on import (tests import
// createApp and drive it against a scratch data root without ever binding a real port). -----------

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = resolvePort();
  // Bind explicitly rather than leaving the host unspecified: an unspecified host resolves to
  // Node's IPv6-first dual-stack default, which some deployment/sandbox network setups don't
  // route loopback IPv4 traffic to. Explicit "0.0.0.0" (override via RUINFOLD_HOST) is the
  // conventional, unambiguous choice for a server meant to accept external connections.
  const host = process.env.RUINFOLD_HOST ?? "0.0.0.0";
  const root = fileURLToPath(new URL("../data/", import.meta.url));
  const app = createApp(root);
  app.listen(port, host, () => {
    const journal = createSemanticRecordJournal({ root, objectKind: "ruinfold-daily.server-event" });
    journal.record({
      category: "ruinfold-daily.listening",
      recordedAt: new Date().toISOString(),
      record: { host, port, dataRoot: root },
      charge: { support: true, refutation: false },
    });
    // eslint-disable-next-line no-console
    console.log(`ruinfold daily server listening on ${host}:${port} (data root: ${root})`);
  });
}
