import assert from "node:assert/strict";
import test from "node:test";
import { createTrashpandaSettlementWitness } from "../src/x402-settlement-witness.mjs";

const ENV = {
  WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19764/.well-known/agent-card.json",
  TRASHPANDA_SERVICES_DATA_ROOT: "/tmp/trashpanda-services-test-data",
  TRASHPANDA_SETTLEMENT_ACCOUNT: "eip155:8453:0x42f72c0a340a4a55c082fe42483e87691d2bff64",
  TRASHPANDA_X402_PRICE: "$0.03",
  TRASHPANDA_MARKET_ACTION_PRICE: "$0.04",
};

test("records one exact Base-mainnet USDC settlement under the Trashpanda Services identity", async () => {
  const calls = [];
  const witness = createTrashpandaSettlementWitness(ENV, {
    now: () => "2026-07-22T18:00:00.000Z",
    record: async (value) => { calls.push(value); return { accepted: true }; },
  });
  const result = await witness({ paymentPayload: { resource: { url: "https://market.example/v1/pre-sign/conformance" } }, result: {
    network: "eip155:8453",
    transaction: `0x${"aa".repeat(32)}`,
    payer: "0x1111111111111111111111111111111111111111",
    amount: "30000",
  } });
  assert.deepEqual(result, { accepted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nodeId, "trashpanda-services");
  assert.equal(calls[0].batch.settlement, ENV.TRASHPANDA_SETTLEMENT_ACCOUNT);
  assert.match(JSON.stringify(calls[0].batch.document), /X402TrashpandaServicesSettlementWitness/u);
  assert.match(JSON.stringify(calls[0].batch.document), /pre-sign-transaction-policy-conformance/u);
});

test("records a market-action settlement under its exact product identity", async () => {
  const calls = [];
  const witness = createTrashpandaSettlementWitness(ENV, {
    now: () => "2026-07-22T18:00:00.000Z",
    record: async (value) => { calls.push(value); return { accepted: true }; },
  });
  await witness({
    paymentPayload: { resource: { url: "https://market.example/v1/market-action/admission" } },
    result: {
      network: "eip155:8453",
      transaction: `0x${"bb".repeat(32)}`,
      payer: "0x2222222222222222222222222222222222222222",
      amount: "40000",
    },
  });
  assert.equal(calls.length, 1);
  assert.match(JSON.stringify(calls[0].batch.document), /market-action-admission/u);
  assert.match(JSON.stringify(calls[0].batch.document), /\$0\.04/u);
});

test("refuses wrong network, amount, missing witness, and missing market price", async () => {
  assert.throws(() => createTrashpandaSettlementWitness({ ...ENV, WITNESS_JOURNAL_RDF_AGENT: undefined }), /WITNESS_JOURNAL_RDF_AGENT/u);
  assert.throws(() => createTrashpandaSettlementWitness({ ...ENV, TRASHPANDA_X402_PRICE: undefined }), /TRASHPANDA_X402_PRICE/u);
  assert.throws(() => createTrashpandaSettlementWitness({ ...ENV, TRASHPANDA_MARKET_ACTION_PRICE: undefined }), /TRASHPANDA_MARKET_ACTION_PRICE/u);
  const witness = createTrashpandaSettlementWitness(ENV, { record: async () => ({}) });
  await assert.rejects(witness({ result: { network: "eip155:84532", transaction: "0x1", amount: "30000" } }), /configured exact Base-mainnet/u);
  await assert.rejects(witness({ result: { network: "eip155:8453", transaction: "0x1", amount: "29999" } }), /configured exact Base-mainnet/u);
  await assert.rejects(witness({
    paymentPayload: { resource: { url: "https://market.example/v1/pre-sign/conformance" } },
    result: { network: "eip155:8453", transaction: "0x1", amount: "40000" },
  }), /configured exact Base-mainnet/u);
});
