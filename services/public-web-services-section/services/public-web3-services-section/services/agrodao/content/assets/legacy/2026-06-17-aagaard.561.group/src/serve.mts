// serve — the Aagaard fleet operations platform entry point.
//
// One process serves three things over HTTP and runs one autonomous loop:
//   • the Propolis per-account read surface (GET /agents/:account/{curation,
//     market,wallet}) — the upstream read morphisms, unchanged;
//   • the operations control plane and observability surface at /ops; and
//   • the autonomous orchestrator loop, which every cadence plans and (gated)
//     executes the voting and trading lanes and prepares the locked posting and
//     gaming lanes, recording each cycle.
//
// Broadcasts are suppressed unless the fleet is armed: AAGAARD_LIVE=1 (or an
// armed config / a POST /ops/arm). Until then the platform runs fully — reading,
// planning, computing the alpha radar and trade judgments — and records what it
// WOULD do, signing nothing.

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createPropolisApp } from "@emsenn/propolis";
import { installGracefulShutdown, start, mergeApps, mountAt } from "@emsenn/http-server";

import { loadAagaardConfig } from "./config.mts";
import { buildFleet } from "./fleet.mts";
import { Orchestrator } from "./orchestrator.mts";
import { createOperationsApp } from "./operations-app.mts";
import { loadAuth } from "./auth.mts";
import { createWebuxApp } from "./webux.mts";
import type { StateStore } from "./state.mts";

const siteRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const port = Number(process.env["PORT"] ?? 18807);
const host = process.env["HOST"] ?? "127.0.0.1";
const publicBaseUrl = (process.env["PUBLIC_BASE_URL"] ?? process.env["BASE_URL"] ?? `http://${host}:${port}`).replace(/\/$/, "");

const propolisConfigPath = path.join(siteRoot, "propolis.config.json");
// The three projection tiers: log (append-only witnesses + tick metrics),
// state (current projections + control/OAuth), record (settled invariants).
const stateDir = path.join(siteRoot, "data", "state");
const logDir = path.join(siteRoot, "data", "log");
const recordDir = path.join(siteRoot, "data", "record");
const draftsDir = path.join(siteRoot, "data", "drafts");

const config = loadAagaardConfig({
  propolisConfigPath,
  aagaardConfigPath: path.join(siteRoot, "aagaard.config.json"),
});

const fleet = buildFleet(config);
const store: StateStore = { logDir, stateDir, recordDir, draftsDir };
const orchestrator = new Orchestrator(config, fleet, store);

// The Propolis read surface (unchanged upstream morphisms). It is gated at the
// edge by Caddy basic_auth (the operator password, like research.561.group), so
// it is not app-OAuth-gated here — a password alone reaches the reads, while the
// /ops admin plane below keeps its own OAuth bearer gate ...
const propolisApp = await createPropolisApp({
  configPath: propolisConfigPath,
  stateDir,
  logDir,
  publicBaseUrl,
});

// ... the operations control plane at /ops — GATED behind the ecosystem
// Google-OAuth (single-allowed-email confinement), the same gate the other 561
// surfaces use ...
const auth = loadAuth({ publicBaseUrl, stateDir: path.join(stateDir, "oauth") });
const opsApp = auth.guard(createOperationsApp({ config, fleet, orchestrator, store }));

// ... and the operator WebUX shell (ungated; everything it DOES hits gated /ops).
const webuxApp = createWebuxApp(publicBaseUrl);

const app = mergeApps(
  propolisApp,              // read surface — gated at the edge by Caddy basic_auth (operator password)
  auth.app,                 // /oauth/* + well-known metadata (the OAuth machinery; password-exempt in Caddy)
  webuxApp,                 // /ui operator shell (behind the Caddy password)
  mountAt("/ops", opsApp),  // admin control plane — OAuth bearer-gated (password-exempt: an OAuth token alone is admin)
);

const result = await start(app, { port, host });
installGracefulShutdown(result);

// Start the autonomous loop, bound to the server's lifetime.
const controller = new AbortController();
orchestrator.start(controller.signal);
const stopLoop = () => controller.abort();
process.once("SIGINT", stopLoop);
process.once("SIGTERM", stopLoop);

process.stderr.write(
  `[aagaard] ${publicBaseUrl} on ${host}:${result.port} — live=${config.live} cadence=${config.cadenceSeconds}s ` +
  `enabled=[${config.enabled.join(",")}] accounts=${config.accounts.length}\n`,
);
process.stderr.write(
  `[aagaard] WebUX at ${publicBaseUrl}/ui — control plane /ops gated to ${auth.allowedEmail} via Google OAuth\n`,
);
