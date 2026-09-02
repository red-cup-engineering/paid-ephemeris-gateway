import assert from "node:assert/strict";
import test from "node:test";

import { createSettlementWitness } from "../src/settlement-witness.mjs";

test("settled payments become typed witness-journal document batches on the gateway plate, never the biometric payload", async () => {
  let recorded;
  const witness = createSettlementWitness({
    WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19765/.well-known/agent-card.json",
    PAID_PACING_DATA_ROOT: "/durable/pacing",
    X402_PAY_TO: "0x0000000000000000000000000000000000000001",
  }, {
    now: () => "2026-08-30T12:00:00.000Z",
    record: async (request) => { recorded = request; return { graphPath: "witness.nq" }; },
  });
  await witness({
    result: {
      network: "eip155:8453",
      transaction: "0xabc",
      payer: "0x0000000000000000000000000000000000000002",
      amount: "50000",
    },
    requirements: { amount: "50000" },
  });
  assert.equal(recorded.nodeId, "paid-pacing-intelligence-gateway");
  assert.equal(recorded.batch.recordedAt, "2026-08-30T12:00:00.000Z");
  assert.equal(recorded.batch.settlement, "0x0000000000000000000000000000000000000001");
  assert.ok(recorded.batch.assertions.some((assertion) =>
    assertion.predicate === "urn:emsenn:pacing:tier" && assertion.object.value === "pacing-analysis"));
  assert.match(recorded.batch.graph, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.equal(JSON.stringify(recorded.batch.document).includes("observations"), false);
});

test("the $0.01 tier is witnessed as heart-rate-threshold", async () => {
  let recorded;
  const witness = createSettlementWitness({
    WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19765/.well-known/agent-card.json",
    PAID_PACING_DATA_ROOT: "/durable/pacing",
    X402_PAY_TO: "0x0000000000000000000000000000000000000001",
  }, {
    now: () => "2026-08-30T12:00:00.000Z",
    record: async (request) => { recorded = request; return { graphPath: "witness.nq" }; },
  });
  await witness({ result: { network: "eip155:8453", transaction: "0xdef", amount: "10000" }, requirements: { amount: "10000" } });
  assert.ok(recorded.batch.assertions.some((assertion) =>
    assertion.predicate === "urn:emsenn:pacing:tier" && assertion.object.value === "heart-rate-threshold"));
});

test("witness wiring refuses ephemeral or uncontracted storage", () => {
  assert.throws(() => createSettlementWitness({ X402_PAY_TO: "0x1" }), /WITNESS_JOURNAL_DOCUMENT_AGENT/u);
  assert.throws(() => createSettlementWitness({ WITNESS_JOURNAL_DOCUMENT_AGENT: "http://agent", X402_PAY_TO: "0x1" }), /DATA_ROOT/u);
});
