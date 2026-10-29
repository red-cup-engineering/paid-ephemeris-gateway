#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { orchestrateLegacyRecoveryEvidenceWindow }
  from "../src/orchestrate-legacy-recovery-evidence-window.mjs";

try {
  const dataRoot = new URL("../data", import.meta.url).pathname;
  const fleet = JSON.parse(await readFile(new URL("../content/observations/public-accounts/evm-wallet-fleet.json",
    import.meta.url), "utf8"));
  const completed = await orchestrateLegacyRecoveryEvidenceWindow({
    recoveryRecords: await querySettlementRecords("agrodao.legacy-capital-recovery-assay"), fleet,
  });
  const compactProjection = (value) => ({ digest: value?.digest ?? null, documentNi: value?.documentNi ?? null,
    networkReference: value?.reference ?? null });
  process.stdout.write(`${JSON.stringify({ orchestration: { id: completed.result.id,
    law: completed.result.law, candidateCount: completed.result.candidateCount,
    exactComparisonCompleteCount: completed.result.exactComparisonCompleteCount,
    exactUnchangedCount: completed.result.exactUnchangedCount, residueCount: completed.result.residueCount,
    dispositions: completed.preflight.result.dispositionCounts,
    candidateDispositions: completed.result.candidateDispositions },
  projections: { fingerprint: compactProjection(completed.fingerprint.projection),
    fixedBlockProvider: compactProjection(completed.identities.provider?.projection),
    fixedBlockCustomer: compactProjection(completed.identities.projection),
    finalPreflight: compactProjection(completed.preflight.projection),
    orchestration: compactProjection(completed.orchestration.projection) } }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`orchestrate-legacy-recovery-evidence-window: ${error.message}\n`);
  process.exitCode = 1;
}
