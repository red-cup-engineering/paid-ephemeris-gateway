import assert from "node:assert/strict";
import test from "node:test";
import { sellHiveExitTightnessResource } from "../src/sell-hive-exit-tightness-resource.mjs";

const RESOURCE = { id: "hive-engine-exit-tightness-report", price: "0.002" };
const REAL_TRANSFER_ROW = {
  op: ["transfer", { to: "emsenn0", from: "actifit.pay", memo: "Weekly delegator share payment. Thank you for supporting @actifit :)", amount: "0.002 HBD" }],
  block: 52555235,
  trx_id: "3138e2ef6b5881d0752c9512047ab7360a9b9127",
  timestamp: "2021-03-29T09:07:45",
};

const BASE_REQUEST = {
  resource: RESOURCE,
  sellerAccount: "emsenn0",
  memoPrefix: "x402",
  expirySeconds: 900,
  requestedAt: "2026-09-05T00:00:00.000Z",
  nonce: "n-1",
  hiveNodes: ["https://fixture-node-a.example", "https://fixture-node-b.example"],
};

function requirementFor(expiresAt) {
  return {
    scheme: "hbd-transfer",
    network: "hive:mainnet",
    maxAmountRequired: "0.002",
    resource: "hive-engine-exit-tightness-report",
    payTo: "emsenn0",
    asset: "HBD",
    maxTimeoutSeconds: 900,
    extra: { memo: REAL_TRANSFER_ROW.op[1].memo, expiresAt },
  };
}

test("returns a 402 payment requirement when no paymentClaim is supplied", async () => {
  const response = await sellHiveExitTightnessResource(BASE_REQUEST);
  assert.equal(response.status, 402);
  assert.equal(response.body.accepts[0].scheme, "hbd-transfer");
  assert.equal(response.body.accepts[0].payTo, "emsenn0");
});

test("returns 402 with the refusal when the claimed payment does not verify", async () => {
  const requirement = requirementFor("2021-03-30T00:00:00.000Z");
  const response = await sellHiveExitTightnessResource({
    ...BASE_REQUEST,
    paymentClaim: {
      requirement,
      claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
      fixtureResponses: [[], []],
    },
  });
  assert.equal(response.status, 402);
  assert.equal(response.body.status, "refused");
  assert.equal(response.body.reason, "not-found");
});

test("settles and runs the report command once a real transfer verifies, returning 200 with the report", async () => {
  let ranCommand = null;
  const runCommand = (candidateRequest) => {
    ranCommand = candidateRequest;
    return {
      type: "JavascriptNodeCommandExecutionReceipt",
      version: 1,
      request: candidateRequest,
      result: { type: "JavascriptNodeCommandExecutionResult", version: 1, status: 0, signal: null, stdout: JSON.stringify({ ok: true }), stderr: "", error: "" },
    };
  };
  const response = await sellHiveExitTightnessResource({
    ...BASE_REQUEST,
    paymentClaim: {
      requirement: requirementFor("2021-03-30T00:00:00.000Z"),
      claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
      fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]],
    },
    reportCommand: { command: "node", arguments: ["report.mjs", "--account", "emsenn0"] },
    runCommand,
  });
  assert.equal(ranCommand.command, "node");
  assert.equal(response.status, 200);
  assert.equal(response.body.settlement.witnessRecord.transaction, "3138e2ef6b5881d0752c9512047ab7360a9b9127");
  assert.deepEqual(response.body.report, { ok: true });
});

test("returns 402 refused-expired before any report command runs when the requirement has already expired", async () => {
  let ranCommand = false;
  const runCommand = () => { ranCommand = true; };
  const response = await sellHiveExitTightnessResource({
    ...BASE_REQUEST,
    paymentClaim: {
      requirement: requirementFor("2021-01-01T00:00:00.000Z"),
      claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
      fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]],
    },
    reportCommand: { command: "node", arguments: ["report.mjs"] },
    runCommand,
  });
  assert.equal(response.status, 402);
  assert.equal(response.body.reason, "expired");
  assert.equal(ranCommand, false);
});

test("returns 502 naming the failed receipt when the report command exits non-zero", async () => {
  const runCommand = () => ({
    type: "JavascriptNodeCommandExecutionReceipt",
    version: 1,
    request: {},
    result: { type: "JavascriptNodeCommandExecutionResult", version: 1, status: 1, signal: null, stdout: "", stderr: "boom", error: "" },
  });
  const response = await sellHiveExitTightnessResource({
    ...BASE_REQUEST,
    paymentClaim: {
      requirement: requirementFor("2021-03-30T00:00:00.000Z"),
      claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
      fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]],
    },
    reportCommand: { command: "node", arguments: ["report.mjs"] },
    runCommand,
  });
  assert.equal(response.status, 502);
  assert.equal(response.body.error, "report-command-failed");
});

test("returns 200 with a null report when no reportCommand is supplied", async () => {
  const response = await sellHiveExitTightnessResource({
    ...BASE_REQUEST,
    paymentClaim: {
      requirement: requirementFor("2021-03-30T00:00:00.000Z"),
      claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
      fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]],
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.report, null);
});
