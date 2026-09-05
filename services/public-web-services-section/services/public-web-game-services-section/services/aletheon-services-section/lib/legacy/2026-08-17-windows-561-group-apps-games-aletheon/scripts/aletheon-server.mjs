#!/usr/bin/env node
// aletheon-server — the entry point. Stands up the authoritative world (server/app.mjs), serves
// the browser client and upgrades WebSocket connections via @561-group/qwzspace (the shared realtime
// engine's http-ws-server carrier), and runs the world on a fixed 15 Hz tick via qwzspace's tick-
// driver: advance the sim, then stream each player an interest-filtered delta. Env:
//   PORT       (default 8787)   — the http/ws port
//   WORLD_LOG  (optional path)  — append the EAVT trace to this .jsonl for replay
//
// Reverse-DNS naming (the repo convention) maps @561/development.experimental.aletheon to the
// subdomain aletheon.experimental.development.561.group; deploy/ has the ws-aware nginx + systemd.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { TICK_MS } from "../shared/constants.mjs";
import { createGameServer } from "../server/app.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."); // the package directory, served statically

// The deploy port lives in ONE place: the package's `561:serve` block (the same declaration the
// nginx generator reads, deploy/generate-nginx.mjs). The server defaults to it so the proxy and
// the app can never disagree; PORT/HOST env still override for local runs.
const serve = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))["561:serve"] ?? {};
const PORT = Number(process.env.PORT) || serve.port || 8787;
const HOST = process.env.HOST || "127.0.0.1"; // bind loopback by default; behind nginx in deploy
const WORLD_LOG = process.env.WORLD_LOG || null;

const { world, server, start } = createGameServer({ root: ROOT, logPath: WORLD_LOG });

server.listen(PORT, HOST, () => {
  console.log(`aletheon: world seeded (${world.entities.size} entities); listening on ${HOST}:${PORT}`);
  console.log(`         open http://localhost:${PORT}/  —  ⊥ unknown · t alive · f slain · ⊤ Anomaly`);
});

// the authoritative loop is qwzspace's tick-driver: every TICK_MS it runs one tick (the single
// writer) under its overrun guard, then the Session pushes each player their delta. The driver IS
// the cadence; the transaction boundary is the tick, not the wall clock.
const driver = await start({ intervalMs: TICK_MS });

process.on("SIGINT", () => { console.log("\naletheon: closing."); driver.stop(); server.close(); process.exit(0); });
