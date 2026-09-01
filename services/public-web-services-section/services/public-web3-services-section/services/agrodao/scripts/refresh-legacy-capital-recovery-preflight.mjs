#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { recordLegacyCapitalRecoveryPreflight } from "../src/legacy-capital-recovery-preflight.mjs";
import { refreshLegacyCapitalRecoveryPreflight } from "../src/refresh-legacy-capital-recovery-preflight.mjs";

try {
  const fleetUrl = new URL("../content/observations/public-accounts/evm-wallet-fleet.json", import.meta.url);
  const fleet = JSON.parse(await readFile(fleetUrl, "utf8"));
  const records = await querySettlementRecords("agrodao.legacy-capital-recovery-assay");
  const refreshed = await refreshLegacyCapitalRecoveryPreflight({ records, fleet });
  const recorded = await recordLegacyCapitalRecoveryPreflight(refreshed.input, {
    recordedAt: refreshed.recordedAt,
  });
  process.stdout.write(`${JSON.stringify({ observation: refreshed.observation, preflight: recorded.result,
    projection: { digest: recorded.projection.digest, documentNi: recorded.projection.documentNi,
      networkReference: recorded.projection.reference } }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`refresh-legacy-capital-recovery-preflight: ${error.message}\n`);
  process.exitCode = 1;
}
