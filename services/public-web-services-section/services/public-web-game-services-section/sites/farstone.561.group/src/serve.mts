#!/usr/bin/env node
import process from "node:process";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { closeMudHttpServer, listenMudHttpServer } from "@red-cup-engineering/feltos/http";
import { FARSTONE_GAME } from "./farstone-game.mts";
import { openWorldStore, resolveWorldBackend } from "./world-store.mts";
import { openClockStore } from "./clock-store.mts";
import { createWorldRuntime } from "./world-runtime.mts";
import { createFarstoneRoom } from "./farstone-room.mts";
import { createFarstoneHttpServer } from "./http-wiring.mts";
import { farstoneStaticFiles, renderFarstonePage } from "./farstone-tufte.mts";

const port = Number(process.env["PORT"] ?? process.env["FELTOS_PORT"] ?? 18820);
const host = process.env["HOST"] ?? "127.0.0.1";
// world-store.mts picks the backend: FELTOS_BUCKET set -> GCS (Cloud Run, survives restart
// and scale-to-zero); FELTOS_SAVE alone -> local disk (unchanged local-dev behavior);
// neither -> in-memory only, exactly as before this file gained persistence choices.
const backend = resolveWorldBackend(process.env);
const store = openWorldStore(backend);
const clockStore = openClockStore(backend);
const bootEngine = store === null
  ? createEngine(FARSTONE_GAME)
  : await store.load(() => createEngine(FARSTONE_GAME));

// World time — see world-runtime.mts's own header and README.md's "World time" section for the
// full account. Short version: this world does NOT tick on a `setInterval`, because Cloud Run
// at `min-instances 0` only schedules CPU while a request is in flight — a background timer
// between requests is not a reliable clock, and the 2026-08-19 deploy runbook found the real
// consequence of relying on one (a dropped item lost, tick counters going backward on reload).
// Instead: every request first catches world time up to real elapsed time (capped per request),
// and flushes to `store`/`clockStore` whenever it actually advances the world. `lastTickAt` is
// restored from the persisted clock, or "now" for a brand-new world with nothing to catch up to.
const tickIntervalMs = Number(process.env["FELTOS_TICK_MS"] ?? 1000);
// Cap chosen from a direct benchmark of FARSTONE_GAME's own tick cost (see README.md's "World
// time" section for the measured ms/tick this was set from): bounds one request's worst-case
// catch-up latency to roughly maxCatchUpTicksPerRequest * (measured per-tick cost), well under
// a second, independent of how long the world sat idle beforehand.
const maxCatchUpTicksPerRequest = Number(process.env["FELTOS_MAX_CATCHUP_TICKS"] ?? 30);

// --- the qwzspace room: WS push, alongside the JSON API's existing RAW MudServer ---
// `farstone-room.mts`'s own header has the full account of why this is the single source of
// truth for BOTH transports: `room.liveMud()` returns the SAME MudServer instance this file
// hands to `createFarstoneHttpServer` below, unchanged — the JSON `/connect`/`/command`/`/tick`
// routes and WS presence/command intents both ultimately drive `mud.connect()`/`.enqueue()`/
// `.tick()`, never two independent engines.
const { room, liveMud } = createFarstoneRoom(bootEngine as never, { intervalMs: tickIntervalMs });
const mud = liveMud();

const restoredClock = clockStore === null ? null : await clockStore.load();
// `tick: () => room.stepOnce()` — NOT `() => mud.tick()` directly — is what makes "qwzspace's
// tick literally IS feltos's tick" true here too (farstone-room.mts's header): one
// `room.stepOnce()` call drains any queued WS presence/command intents into `mud`, runs exactly
// one `mud.tick()`, and pushes the resulting per-subscriber WS deltas, all before this catch-up
// call returns. `room.stepOnce()` is async and self-guards re-entrancy — world-runtime.mts's own
// `#runCatchUp` awaits every call for exactly that reason (see its `WorldRuntimeMud` header).
const runtime = createWorldRuntime(
  { tick: () => room.stepOnce(), engine: () => mud.engine() },
  {
    tickIntervalMs,
    maxCatchUpTicksPerRequest,
    lastTickAt: restoredClock?.lastTickAt ?? Date.now(),
    store,
    clockStore,
    onFlush: (info) => {
      if (info.durationMs > 1000) {
        process.stderr.write(`Farstone flush took ${info.durationMs.toFixed(0)}ms (reason=${info.reason}, ticksRun=${info.ticksRun}) — slower than the "no request stalls seconds" target\n`);
      }
    },
  },
);

// Eager catch-up once at boot, so the very first visitor — an HTTP request OR a WS-only client
// that never touches the JSON API — never has to wait for a request to discover time has passed.
// Mirrors tidepool.emsenn.net's own serve.mts.
await runtime.preRequestCatchUp();

// --- HTTP wiring ---
// See http-wiring.mts's own header for the full "why a separate outer server, not a wrapped
// mudServer" account, and its "PUSH TRANSPORT, ADDITIVE" section for exactly how `room` attaches
// the WS upgrade handling to this SAME server alongside the unchanged JSON routes. An ops-plane
// catch-up/flush failure (e.g. the bucket unreachable) is logged loudly (the default error
// logger) but never takes the route itself down — reads still run against whatever's in memory.
// The GCS retry wrapper (gcs-client.mts / gcs-retry.mts) already logged every retry and the
// final exhaustion before either error handler ever fires.
const httpServer = createFarstoneHttpServer(mud, runtime, {
  tickIntervalMs,
  room,
  pageHtml: renderFarstonePage(),
  staticFiles: farstoneStaticFiles(),
});
const { origin } = await listenMudHttpServer(httpServer, { host, port });

// Backstop only, not the guarantee — see world-runtime.mts's header. Flush-on-mutation already
// persists every real change as part of request handling; this interval exists only to shrink
// the (already small, already bounded) window where an instance stays warm across real idle
// ticks with no request in between to trigger a flush. It may simply not fire under Cloud Run's
// CPU throttling while idle, exactly like the timer it replaces as the primary mechanism —
// that's fine now, because correctness no longer depends on it firing. Note: the qwzspace room
// itself never introduces a competing timer — `room.start()` is never called, so the sleep-
// between-visitors clock this backstop already respects is unaffected by adding the WS transport.
const saveTimer = store === null ? null : setInterval(() => {
  void runtime.flushNow().catch((error) => process.stderr.write(`Farstone backstop save failed: ${String(error)}\n`));
}, Number(process.env["FELTOS_SAVE_MS"] ?? 30_000));

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  if (saveTimer !== null) clearInterval(saveTimer);
  room.destroy();
  if (store !== null) await runtime.flushNow();
  await closeMudHttpServer(httpServer);
}
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
  void close().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
});

process.stdout.write(`Farstone is live at ${origin}${store === null ? "" : `, durable to ${store.describe} (clock: ${clockStore?.describe})`}\n`);
