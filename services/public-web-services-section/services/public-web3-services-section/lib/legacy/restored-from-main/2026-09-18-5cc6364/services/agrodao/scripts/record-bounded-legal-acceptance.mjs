#!/usr/bin/env node

import process from "node:process";

import { recordBoundedLegalAcceptance } from "../src/bounded-legal-acceptance.mjs";
import { configuredRuntimeEnvironment } from "../src/procure-public-evm-wallet-observation.mjs";

async function readStandardInput() {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const document = Buffer.concat(chunks).toString("utf8");
  if (document.trim() === "") throw new TypeError("a bounded legal-acceptance document is required on standard input");
  return JSON.parse(document);
}

try {
  const input = await readStandardInput();
  const env = configuredRuntimeEnvironment();
  const recorded = await recordBoundedLegalAcceptance(input, { recordedAt: process.env.AGRODAO_RECORDED_AT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT });
  process.stdout.write(`${JSON.stringify({ acceptance: recorded.result, projection: recorded.projection }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`record-bounded-legal-acceptance: ${error.message}\n`); process.exitCode = 1;
}
