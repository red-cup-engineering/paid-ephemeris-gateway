#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { evaluateBasePreSignPolicy, PolicyConformanceRefusal, semanticDigest } from "./policy-conformance.mjs";
import { PRODUCT_CORPUS } from "../test/fixtures/product-corpus.mjs";

function observed(caseRecord) {
  try {
    const receipt = evaluateBasePreSignPolicy(structuredClone(caseRecord.request));
    return { kind: "receipt", verdict: receipt.verdict, receipt: receipt.id };
  } catch (error) {
    if (!(error instanceof PolicyConformanceRefusal)) throw error;
    return { kind: "refusal", code: error.code, path: error.path };
  }
}

export function measureProductConformance() {
  const started = performance.now();
  const cases = PRODUCT_CORPUS.map((caseRecord) => {
    const result = observed(caseRecord);
    const matched = result.kind === caseRecord.expected.kind
      && (result.kind === "receipt" ? result.verdict === caseRecord.expected.verdict : result.code === caseRecord.expected.code);
    return { id: caseRecord.id, expected: caseRecord.expected, observed: result, matched };
  });
  const replayInput = structuredClone(PRODUCT_CORPUS[0].request);
  const replayReceipts = Array.from({ length: 3 }, () => evaluateBasePreSignPolicy(structuredClone(replayInput)));
  const body = {
    type: "BlockchainTrashpandaLocalProductMeasurement",
    product: "pre-sign-transaction-policy-conformance",
    engine: replayReceipts[0].engine,
    policyLaw: replayReceipts[0].law,
    corpus: {
      expected: cases.length,
      passed: cases.filter((entry) => entry.matched).length,
      mismatches: cases.filter((entry) => !entry.matched).map((entry) => entry.id),
      cases,
    },
    replays: {
      count: replayReceipts.length,
      receiptDigests: replayReceipts.map((receipt) => receipt.id),
      byteIdentical: new Set(replayReceipts.map(JSON.stringify)).size === 1,
    },
    latency: { corpusElapsedMs: Number((performance.now() - started).toFixed(3)), clock: "node:performance" },
    forbiddenEffects: { credentials: false, custody: false, signing: false, broadcast: false, stateMutation: false },
  };
  return Object.freeze({ id: semanticDigest("blockchain-trashpanda.product-conformance-measurement", body), ...body });
}

if (process.argv[1] === new URL(import.meta.url).pathname) process.stdout.write(`${JSON.stringify(measureProductConformance())}\n`);
