import assert from "node:assert/strict";
import test from "node:test";

import { createSettlementWitness } from "../src/settlement-witness.mjs";

test("settled payments become typed witness-journal RDF witness batches on the gateway plate", async () => {
  let recorded;
  const witness = createSettlementWitness({
    WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19764/.well-known/agent-card.json",
    PAID_EPHEMERIS_DATA_ROOT: "/durable/ephemeris",
    X402_PAY_TO: "0x0000000000000000000000000000000000000001",
  }, {
    now: () => "2026-07-21T12:00:00.000Z",
    record: async (request) => { recorded = request; return { graphPath: "witness.nq" }; },
  });
  await witness({
    result: {
      network: "eip155:8453",
      transaction: "0xabc",
      payer: "0x0000000000000000000000000000000000000002",
      amount: "320000",
    },
    requirements: { amount: "320000" },
  });
  assert.equal(recorded.nodeId, "paid-ephemeris-gateway");
  assert.equal(recorded.batch.recordedAt, "2026-07-21T12:00:00.000Z");
  assert.equal(recorded.batch.settlement, "0x0000000000000000000000000000000000000001");
  assert.ok(recorded.batch.assertions.some((assertion) =>
    assertion.predicate === "urn:emsenn:ephemeris:tier" && assertion.object.value === "precision-moment"));
  assert.match(recorded.batch.graph, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("witness wiring refuses ephemeral or uncontracted storage", () => {
  assert.throws(() => createSettlementWitness({ X402_PAY_TO: "0x1" }), /WITNESS_JOURNAL_RDF_AGENT/u);
  assert.throws(() => createSettlementWitness({ WITNESS_JOURNAL_RDF_AGENT: "http://agent", X402_PAY_TO: "0x1" }), /DATA_ROOT/u);
});
