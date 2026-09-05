#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { startFilesystemWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/filesystem-provider";

import { observeOpportunityFeed } from "../src/opportunity-feed.mjs";
import { observe as observeGlobalArbitrage } from "./global-arbitrage-scan.mjs";
import { observe as observePoolCycle } from "./exact-pool-cycle-assay.mjs";
import { observe as observeGames } from "./game-opportunity-cycle.mjs";
import { priceResourceCosts } from "../src/core/resourceCostModel.mjs";

const RESOURCE_COST_ACCOUNT = "sigmund-vexler";
// A deliberately large sentinel: this feed is read-only display, never an
// execution gate (see automatic-arbitrage-cycle.mjs for the real,
// per-opportunity gate), so pricing here always tries to show the
// measured component amounts rather than gating on any one candidate's
// worst-case edge.
const RESOURCE_COST_DISPLAY_SENTINEL_SWAP_HIVE = "999999.00000000";
const MACHINES_RECORD_PATH = fileURLToPath(new URL(
  "../../../../../../../../../../../../561-group-services-section/data/records/2026-08-30-org-machines.json",
  import.meta.url,
));

async function observeResourceCost() {
  return priceResourceCosts({ account: RESOURCE_COST_ACCOUNT,
    worstCaseProfitSwapHive: RESOURCE_COST_DISPLAY_SENTINEL_SWAP_HIVE, machinesRecordPath: MACHINES_RECORD_PATH });
}

const providers = Object.freeze({
  globalArbitrage: observeGlobalArbitrage,
  poolCycle: observePoolCycle,
  games: observeGames,
  resourceCost: observeResourceCost,
});

function loopbackAgentUrl(provider) {
  const agentUrl = new URL(provider?.agentCardUrl);
  if (agentUrl.protocol !== "http:" || agentUrl.hostname !== "127.0.0.1") {
    throw new Error("filesystem WitnessJournal provider must expose an HTTP loopback agent URL");
  }
  return agentUrl.href;
}

export async function awaitFilesystemWitnessJournalProvider(agentUrl) {
  const healthUrl = new URL("/health", agentUrl);
  let failure;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
      failure = new Error(`filesystem WitnessJournal provider refused readiness with HTTP ${response.status}`);
    } catch (error) {
      failure = error;
    }
    await delay(5);
  }
  throw failure;
}

export async function observe({
  env = process.env,
  startFilesystemProvider = startFilesystemWitnessJournalProviderProcess,
  readyFilesystemProvider = awaitFilesystemWitnessJournalProvider,
  observeFeed = observeOpportunityFeed,
  ...options
} = {}) {
  if (env.WITNESS_JOURNAL_RDF_AGENT) {
    return observeFeed({ providers, ...options, env });
  }
  const root = env.AAGAARD_WITNESS_JOURNAL_ROOT;
  if (!root) {
    throw new Error("WITNESS_JOURNAL_RDF_AGENT or AAGAARD_WITNESS_JOURNAL_ROOT must explicitly bind Aagaard's WitnessJournal");
  }

  const provider = await startFilesystemProvider({ root, host: "127.0.0.1", port: 0 });
  try {
    const agentUrl = loopbackAgentUrl(provider);
    await readyFilesystemProvider(agentUrl);
    return await observeFeed({
      providers,
      ...options,
      env: { WITNESS_JOURNAL_RDF_AGENT: agentUrl },
    });
  } finally {
    await provider.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { process.stdout.write(`${JSON.stringify(await observe(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
