#!/usr/bin/env node

import process from "node:process";

import { recordAttributedWalletForensicInterpretation }
  from "../src/attributed-wallet-forensic-interpretation.mjs";

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const document = Buffer.concat(chunks).toString("utf8");
  if (document.trim() === "") throw new TypeError("an attributed interpretation evidence document is required on standard input");
  return JSON.parse(document);
}

try {
  const evidence = await readStandardInput();
  const recorded = await recordAttributedWalletForensicInterpretation(evidence, {
    recordedAt: process.env.AGRODAO_RECORDED_AT,
  });
  process.stdout.write(`${JSON.stringify({
    interpretation: recorded.result,
    projection: {
      digest: recorded.projection.digest,
      documentNi: recorded.projection.documentNi,
      requestNi: recorded.projection.requestNi,
      responseNi: recorded.projection.responseNi,
      networkReference: recorded.projection.reference,
    },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`record-attributed-wallet-forensic-interpretation: ${error.message}\n`);
  process.exitCode = 1;
}
