#!/usr/bin/env node
// serve — Tidepool's boot script. Per the deploy runbook's farstone/aletheon rows (Cloud Run +
// router + GCS-bucket persistence, `--max-instances 1`), using the CURRENT landed MUD
// persistence pattern (flush-on-mutation + catch-up-on-request — `tidepool-runtime.mts`), not
// the older interval-tick model it replaced.

import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { closeMudHttpServer, listenMudHttpServer } from "@red-cup-engineering/feltos/http";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { createTidepoolRoom } from "./tidepool-room.mts";
import { openWorldStore, resolveWorldBackend } from "./world-store.mts";
import { openClockStore } from "./clock-store.mts";
import { createWorldRuntime } from "./tidepool-runtime.mts";
import { createTidepoolHttpServer } from "./http-wiring.mts";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env["PORT"] ?? process.env["FELTOS_PORT"] ?? 18830);
const host = process.env["HOST"] ?? "127.0.0.1";

const backend = resolveWorldBackend(process.env as never);
const store = openWorldStore(backend);
const clockStore = openClockStore(backend);
const bootEngine = store === null
  ? createEngine(TIDEPOOL_GAME)
  : await store.load(() => createEngine(TIDEPOOL_GAME));

const tickIntervalMs = Number(process.env["FELTOS_TICK_MS"] ?? 300_000); // 5 real minutes/tick — a tidal pace (design §3)
const maxCatchUpTicksPerRequest = Number(process.env["FELTOS_MAX_CATCHUP_TICKS"] ?? 50);

const { room, liveEngine } = createTidepoolRoom(bootEngine as never, { intervalMs: tickIntervalMs });

const restoredClock = clockStore === null ? null : await clockStore.load();
const runtime = createWorldRuntime(
  { tick: () => room.stepOnce(), engine: () => liveEngine() },
  {
    tickIntervalMs,
    maxCatchUpTicksPerRequest,
    lastTickAt: restoredClock?.lastTickAt ?? Date.now(),
    store,
    clockStore,
    onFlush: (info) => {
      if (info.durationMs > 1000) {
        process.stderr.write(`Tidepool flush took ${info.durationMs.toFixed(0)}ms (reason=${info.reason}, ticksRun=${info.ticksRun})\n`);
      }
    },
  },
);

// eagerly catch up once at boot, so the very first visitor (an HTTP page load OR a WS-only
// client like the reference bot) never has to wait for a request to discover time has passed.
await runtime.preRequestCatchUp();

const webRoot = process.env["TIDEPOOL_NO_WEB"] === "1" ? null : join(here, "..", "web");
const httpServer = createTidepoolHttpServer(room, runtime, {
  webRoot,
  metrics: () => ({ tick: room.tickNow(), members: room.members().size }),
});
const { origin } = await listenMudHttpServer(httpServer, { host, port });

const saveTimer = store === null ? null : setInterval(() => {
  void runtime.flushNow().catch((error) => process.stderr.write(`Tidepool backstop save failed: ${String(error)}\n`));
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
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void close().catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    });
  });
}

process.stdout.write(
  `Tidepool is live at ${origin}${store === null ? "" : `, durable to ${store.describe} (clock: ${clockStore?.describe})`}\n`,
);
