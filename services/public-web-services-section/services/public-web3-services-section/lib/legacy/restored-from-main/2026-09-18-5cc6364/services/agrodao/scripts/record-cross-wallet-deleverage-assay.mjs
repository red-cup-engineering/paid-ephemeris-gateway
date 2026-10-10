#!/usr/bin/env node

import process from "node:process";

import { recordCrossWalletDeleverageAssay } from "../src/cross-wallet-deleverage-assay.mjs";

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const document = Buffer.concat(chunks).toString("utf8");
  if (document.trim() === "") throw new Error("a JSON evidence document is required on standard input");
  return JSON.parse(document);
}

try {
  const evidence = await readStandardInput();
  const recorded = await recordCrossWalletDeleverageAssay(evidence, {
    recordedAt: process.env.AGRODAO_RECORDED_AT,
  });
  process.stdout.write(`${JSON.stringify({
    assay: recorded.result,
    projection: {
      digest: recorded.projection.digest,
      documentNi: recorded.projection.documentNi,
      requestNi: recorded.projection.requestNi,
      responseNi: recorded.projection.responseNi,
      networkReference: recorded.projection.reference,
    },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`record-cross-wallet-deleverage-assay: ${error.message}\n`);
  process.exitCode = 1;
}
