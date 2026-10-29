#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { procureFixedBlockContractIdentities } from "../src/procure-fixed-block-contract-identities.mjs";

try {
  const dataRoot = new URL("../data", import.meta.url).pathname;
  const fleet = JSON.parse(await readFile(new URL("../content/observations/public-accounts/evm-wallet-fleet.json",
    import.meta.url), "utf8"));
  const result = await procureFixedBlockContractIdentities({
    recoveryRecords: await querySettlementRecords("agrodao.legacy-capital-recovery-assay"),
    fingerprintRecords: await querySettlementRecords("agrodao.legacy-recovery-contract-fingerprint-observation"),
    fleet,
  });
  const projection = (value) => ({ digest: value?.digest ?? null, documentNi: value?.documentNi ?? null,
    networkReference: value?.reference ?? null });
  process.stdout.write(`${JSON.stringify({ observation: { id: result.observation.id,
    candidateCount: result.observation.candidateCount,
    comparisonCompleteCount: result.observation.comparisonCompleteCount,
    unchangedCount: result.observation.unchangedCount,
    incompleteCandidates: result.observation.candidates.filter(({ comparisonComplete }) => !comparisonComplete)
      .map(({ candidateId, baseline, current }) => ({ candidateId,
        reasons: [...new Set([...baseline.roots, ...current.roots].filter(({ complete }) => !complete)
          .map(({ reason }) => reason))] })) },
  providerProjection: projection(result.provider.projection), customerProjection: projection(result.projection) }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`procure-fixed-block-contract-identities: ${error.message}\n`);
  process.exitCode = 1;
}
