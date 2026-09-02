#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { observeTreasuryPortfolio } from "../src/observe-treasury-portfolio.mjs";
import { summarizeUnifiedAgroControlPlane } from "../src/unified-control-plane-summary.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const fixedForkPath = option("--fixed-fork-observation");
if (fixedForkPath === null) {
  throw new TypeError("usage: summarize-unified-control-plane --fixed-fork-observation PATH [--treasury-disclosure PATH]");
}
const fixedForkObservation = JSON.parse(await readFile(fixedForkPath, "utf8"));
const treasuryPath = option("--treasury-disclosure");
const treasuryDisclosure = treasuryPath === null
  ? await observeTreasuryPortfolio({ store: { record: async () => ({ recorded: false }) } })
  : JSON.parse(await readFile(treasuryPath, "utf8"));
process.stdout.write(`${JSON.stringify(summarizeUnifiedAgroControlPlane({ treasuryDisclosure, fixedForkObservation }), null, 2)}\n`);

