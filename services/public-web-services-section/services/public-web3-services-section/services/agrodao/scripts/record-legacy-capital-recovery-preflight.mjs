#!/usr/bin/env node

import process from "node:process";
import { recordLegacyCapitalRecoveryPreflight } from "../src/legacy-capital-recovery-preflight.mjs";

const chunks = [];
try {
  for await (const chunk of process.stdin) chunks.push(chunk);
  const source = Buffer.concat(chunks).toString("utf8");
  if (source.trim() === "") throw new TypeError("a JSON preflight evidence document is required on standard input");
  const recorded = await recordLegacyCapitalRecoveryPreflight(JSON.parse(source), {
    recordedAt: process.env.AGRODAO_RECORDED_AT,
  });
  process.stdout.write(`${JSON.stringify({ preflight: recorded.result, projection: {
    digest: recorded.projection.digest, documentNi: recorded.projection.documentNi,
    networkReference: recorded.projection.reference,
  } }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`record-legacy-capital-recovery-preflight: ${error.message}\n`);
  process.exitCode = 1;
}
