#!/usr/bin/env node
// farstone — run the Farstone Harbor MUD. Farstone is a game BUILT ON the tab engine
// (@561-group/tab) and the FizzOS MUD driver (@561-group/fizzos), the same way ruinfold is. This
// bin materializes the harbour world (the lint-gated DSL definition + the deep-systems seeding in
// farstone-harbor/build.mjs) into a world dir, then serves it over tab's web/SSE transport.
//
//   node scripts/farstone.mjs [<world-dir>] [--http 18793] [--host 127.0.0.1] [--start <room>]
//
// Defaults: world dir ./world (gitignored runtime state, rebuilt each run unless it already
// exists), HTTP on 18793, start room newcomer-landing (the tutorial landing). The world is
// REBUILT only when the dir is absent, so player traces accrue across restarts; remove the dir to
// reset. Deterministic build — every `t` is a counter, no Date.now / Math.random.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

import { webServe } from "@561-group/tab/scripts/web.mjs";
import buildHarbor from "../farstone-harbor/build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = dirname(HERE);

const args = argv.slice(2);
const flag = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const root = resolve(args.find((a) => !a.startsWith("--")) ?? join(PKG, "world"));
const httpPort = Number(flag("--http", "18793"));
const httpHost = flag("--host", undefined);
const startRoom = flag("--start", "newcomer-landing");
const interval = Number(flag("--interval", "200"));

// Build the world only if it isn't already on disk (so a restart resumes the live world).
if (!existsSync(root)) {
  const { written } = await buildHarbor(root, { fresh: true });
  console.log(`✓ built Farstone Harbor: ${written} cells under ${root}`);
} else {
  console.log(`• resuming existing Farstone world under ${root}`);
}

const server = webServe({ root, startRoom, httpPort, httpHost, interval, autostart: true });
console.log(`Farstone up: http://localhost:${httpPort}  (start ${startRoom})`);
console.log(`  play:   open http://localhost:${httpPort} in a browser`);
console.log(`  watch:  curl -N http://localhost:${httpPort}/events?topics=market,combat,chat`);
process.on("SIGINT", () => { server.stopWeb?.(); console.log("\nFarstone down."); exit(0); });
