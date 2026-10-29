#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { observeLegacyRecoveryContractFingerprints, recordLegacyRecoveryContractFingerprintObservation }
  from "../src/legacy-recovery-contract-fingerprint-observation.mjs";

try {
  const fleet = JSON.parse(await readFile(new URL("../content/observations/public-accounts/evm-wallet-fleet.json",
    import.meta.url), "utf8"));
  const records = await querySettlementRecords("agrodao.legacy-capital-recovery-preflight");
  const observation = await observeLegacyRecoveryContractFingerprints({ records, fleet,
    minimumRequestIntervalMs: 1_500 });
  const recorded = await recordLegacyRecoveryContractFingerprintObservation(observation);
  process.stdout.write(`${JSON.stringify({ observation: recorded.result, projection: {
    digest: recorded.projection.digest, documentNi: recorded.projection.documentNi,
    networkReference: recorded.projection.reference,
  } }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`observe-legacy-recovery-contract-fingerprints: ${error.message}\n`);
  process.exitCode = 1;
}
