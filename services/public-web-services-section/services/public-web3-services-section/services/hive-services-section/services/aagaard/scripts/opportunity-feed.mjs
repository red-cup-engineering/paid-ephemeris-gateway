#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { observeOpportunityFeed } from "../src/opportunity-feed.mjs";
import { observe as observeGlobalArbitrage } from "./global-arbitrage-scan.mjs";
import { observe as observePoolCycle } from "./exact-pool-cycle-assay.mjs";
import { observe as observeGames } from "./game-opportunity-cycle.mjs";

export function observe(options = {}) {
  return observeOpportunityFeed({
    providers: { globalArbitrage: observeGlobalArbitrage, poolCycle: observePoolCycle, games: observeGames },
    ...options,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { process.stdout.write(`${JSON.stringify(await observe(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
