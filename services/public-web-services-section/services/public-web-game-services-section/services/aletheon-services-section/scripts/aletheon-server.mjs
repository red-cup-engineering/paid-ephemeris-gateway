#!/usr/bin/env node
// aletheon-server — entry point. Stands up the world (server/app.mjs), serves the client, upgrades
// WS via qwzspace, runs a 15Hz tick. Env: PORT (default 8787); WORLD_LOG (local-mode .jsonl path,
// restore-on-boot, ALSO the bucket-mode object name if ALETHEON_BUCKET is set); ALETHEON_BUCKET
// (GCS persistence, takes priority over WORLD_LOG-as-path); WORLD_AUTOSAVE_MS (default 30000,
// bucket-mode flush / local-mode compaction check cadence); ALETHEON_COMPACT_ROWS (default 2000,
// both backends — see server/world/{log-store,local-log-compaction}.mjs) rows-since-compaction
// threshold past which the durable trace is truncated to snapshotRows()'s minimum row set.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { TICK_MS } from "../shared/constants.mjs";
import { createGameServer } from "../server/app.mjs";
import { rowsFromLog } from "../server/world/store.mjs";
import { resolveLogBackend, openBucketLogStore } from "../server/world/log-store.mjs";
import { createLocalLogCompactor } from "../server/world/local-log-compaction.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."); // the package directory, served statically

// The deploy port lives in ONE place: the package's `561:serve` block (the same declaration the
// nginx generator reads, deploy/generate-nginx.mjs). The server defaults to it so the proxy and
// the app can never disagree; PORT/HOST env still override for local runs.
const serve = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))["561:serve"] ?? {};
const PORT = Number(process.env.PORT) || serve.port || 8787;
const HOST = process.env.HOST || "127.0.0.1"; // bind loopback by default; behind nginx in deploy
const AUTOSAVE_MS = Number(process.env.WORLD_AUTOSAVE_MS) || 30000;

// Resolve the persistence backend ONCE, before the world exists, so a restore (either backend)
// replaces the fresh-seed boot outright rather than seeding-then-overwriting. Both WORLD_LOG
// (local file) and ALETHEON_BUCKET (GCS) now restore-on-boot when their trace already has rows —
// see the env doc above and README's "Persistence" section for the local-dev behavior change
// this is (previously WORLD_LOG was write-only; nothing ever read it back at boot).
const backend = resolveLogBackend(process.env);
let rows = [];
let logPath = null;
let onAppend = null;
let bucketStore = null;
let localCompactor = null;

if (backend.kind === "bucket") {
  const compactThresholdRows = Number(process.env.ALETHEON_COMPACT_ROWS) || undefined; // undefined -> log-store's own default
  bucketStore = openBucketLogStore(backend, {
    compactThresholdRows,
    onCompact: (info) => console.log(
      `aletheon: compacted ${bucketStore.describe} — tail ${info.tailRowsBeforeCompaction} rows -> ` +
      `snapshot ${info.snapshotRows} rows (${info.snapshotBytes} bytes) in ${info.durationMs.toFixed(1)}ms`,
    ),
  });
  rows = await bucketStore.loadRows(); // snapshot rows (if any) + tail rows, in that order — see log-store.mjs
  onAppend = (row) => bucketStore.appendRow(row);
  console.log(`aletheon: persistence = ${bucketStore.describe} (${rows.length} rows on boot, snapshot+tail)`);
} else if (backend.kind === "file") {
  logPath = backend.path;
  rows = rowsFromLog(logPath); // read once at boot (restore, if any rows exist); appended to thereafter
  const compactThresholdRows = Number(process.env.ALETHEON_COMPACT_ROWS) || undefined; // undefined -> local-log-compaction's own default
  localCompactor = createLocalLogCompactor({
    logPath,
    compactThresholdRows,
    onCompact: (info) => console.log(
      `aletheon: compacted ${logPath} — ${info.tailRowsBeforeCompaction} rows -> snapshot ${info.snapshotRows} rows in ${info.durationMs.toFixed(1)}ms`,
    ),
  });
  onAppend = () => localCompactor.noteAppend();
}

const { world, server, start } = createGameServer({ root: ROOT, logPath, onAppend, rows, seed: rows.length === 0 });

// Attach the now-existing live world so a post-flush over-threshold tail can be compacted
// against real current state, not the rows that produced it. Must happen before the autosave
// timer below can ever call flush() — see log-store.mjs's own header for why compaction is
// skipped entirely (not an error, just inert) when no world is attached.
//
// Then a ONE-TIME boot-time catch-up compaction (see log-store.mjs's own "BOOT-TIME CATCH-UP
// COMPACTION" header section for the full 2026-08-20 incident/root-cause account): if the tail
// this process just loaded was ALREADY over the compaction threshold — the live incident found
// 179,920 rows surviving two full boots unchanged — compact it down RIGHT NOW, before the
// autosave timer starts, rather than waiting on a future flush() that depends on this process
// surviving long enough (under the memory pressure of having just replayed that much history) to
// ever fire one.
if (bucketStore) {
  bucketStore.setWorld(() => world);
  if (await bucketStore.compactBacklogIfOversized()) {
    console.log(`aletheon: boot-time catch-up compaction ran (the loaded tail was already over the compaction threshold) — see the "compacted" log line above for the new size`);
  }
} else if (localCompactor) {
  localCompactor.setWorld(() => world);
  if (localCompactor.compactBacklogIfOversized(rows.length)) {
    console.log(`aletheon: boot-time catch-up compaction ran for ${logPath} (the loaded trace was already over the compaction threshold) — see the "compacted" log line above for the new size`);
  }
}

server.listen(PORT, HOST, () => {
  const restored = rows.length > 0 ? ` (restored from ${bucketStore ? bucketStore.describe : logPath})` : "";
  console.log(`aletheon: world seeded (${world.entities.size} entities)${restored}; listening on ${HOST}:${PORT}`);
  console.log(`         open http://localhost:${PORT}/  —  ⊥ unknown · t alive · f slain · ⊤ Anomaly`);
});

// the authoritative loop is qwzspace's tick-driver: every TICK_MS it runs one tick (the single
// writer) under its overrun guard, then the Session pushes each player their delta. The driver IS
// the cadence; the transaction boundary is the tick, not the wall clock.
const driver = await start({ intervalMs: TICK_MS });

let autosaveTimer = null;
if (bucketStore) {
  autosaveTimer = setInterval(() => {
    bucketStore.flush().catch((err) => console.error("aletheon: autosave flush failed:", err.message));
  }, AUTOSAVE_MS);
  autosaveTimer.unref?.(); // never keep the process alive on its own
} else if (localCompactor) {
  autosaveTimer = setInterval(() => localCompactor.maybeCompact(), AUTOSAVE_MS);
  autosaveTimer.unref?.(); // never keep the process alive on its own
}

async function shutdown() {
  console.log("\naletheon: closing.");
  driver.stop();
  server.close();
  if (autosaveTimer) clearInterval(autosaveTimer);
  if (bucketStore) {
    try { await bucketStore.flush(); } catch (err) { console.error("aletheon: final save failed:", err.message); }
  } else if (localCompactor) {
    try { localCompactor.maybeCompact(); } catch (err) { console.error("aletheon: final compaction failed:", err.message); }
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
