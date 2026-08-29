import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  readWorkerBeePoolDistributions,
  reconcileWorkerBeePoolDistribution,
  recordWorkerBeePoolDistributions,
  workerBeePoolTransfersFromHistoryRow,
} from "../src/core/workerBeePoolSettlement.mts";
import { parseOptions } from "../scripts/workerbee-pool-audit.mjs";

const DELEGATED_AT = "2026-07-22T06:31:42.000Z";
const TX = "a".repeat(40);

function historyRow(timestamp = "2026-07-22T07:00:00") {
  return [42, { block: 108_350_000, trx_id: TX, timestamp, op: ["custom_json", { id: "ssc-mainnet-hive",
    required_auths: ["ph1102"], required_posting_auths: [], json: JSON.stringify({ contractName: "tokens", contractAction: "transfer",
      contractPayload: { symbol: "BEE", to: "michael561", quantity: "0.02500000", memo: "" } }) }] }];
}

function engineResult(quantity = "0.02500000") {
  return { blockNumber: 61_400_000, refHiveBlockNumber: 108_350_000, transactionId: TX, sender: "ph1102", contract: "tokens", action: "transfer",
    payload: JSON.stringify({ symbol: "BEE", to: "michael561", quantity, memo: "", isSignedWithActiveKey: true }),
    logs: JSON.stringify({ events: [{ contract: "tokens", event: "transfer", data: { from: "ph1102", to: "michael561", symbol: "BEE", quantity } }] }) };
}

test("pool transfer parsing binds source, beneficiary, delegation time, and narrow action", () => {
  const candidates = workerBeePoolTransfersFromHistoryRow(historyRow(), DELEGATED_AT);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.sourceId, `hive:${TX}:0`);
  assert.equal(candidates[0]?.quantity, "0.02500000");
  assert.equal(workerBeePoolTransfersFromHistoryRow(historyRow("2026-07-22T06:00:00"), DELEGATED_AT).length, 0);
  const foreign = structuredClone(historyRow()) as any;
  foreign[1].op[1].json = JSON.stringify([{ contractName: "tokens", contractAction: "transfer", contractPayload: { symbol: "BEE", to: "michael561", quantity: "0.02500000" } },
    { contractName: "market", contractAction: "sell", contractPayload: {} }]);
  assert.equal(workerBeePoolTransfersFromHistoryRow(foreign, DELEGATED_AT).length, 0);
});

test("expected yield becomes settled only with two exact execution witnesses", () => {
  const candidate = workerBeePoolTransfersFromHistoryRow(historyRow(), DELEGATED_AT)[0]!;
  assert.throws(() => reconcileWorkerBeePoolDistribution(candidate, [{ provider: "one", result: engineResult() }]), /fewer than two/u);
  assert.throws(() => reconcileWorkerBeePoolDistribution(candidate, [{ provider: "one", result: engineResult() },
    { provider: "two", result: engineResult("0.02400000") }]), /fewer than two/u);
  const settled = reconcileWorkerBeePoolDistribution(candidate, [{ provider: "one", result: engineResult() }, { provider: "two", result: engineResult() }]);
  assert.equal(settled.status, "settled");
  assert.deepEqual(settled.confirmationProviders, ["one", "two"]);
});

test("settled pool distributions append idempotently without inventing valuation", async () => {
  const root = mkdtempSync(join(tmpdir(), "aagaard-workerbee-pool-"));
  try {
    const candidate = workerBeePoolTransfersFromHistoryRow(historyRow(), DELEGATED_AT)[0]!;
    const settled = reconcileWorkerBeePoolDistribution(candidate, [{ provider: "one", result: engineResult() }, { provider: "two", result: engineResult() }]);
    assert.equal((await recordWorkerBeePoolDistributions(root, [settled])).length, 1);
    assert.equal((await recordWorkerBeePoolDistributions(root, [settled])).length, 0);
    const events = readWorkerBeePoolDistributions(root);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.valuation.swapHive, null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("pool audit has no credential, arbitrary account, or mutation surface", () => {
  assert.deepEqual(parseOptions(["--account", "michael561"]), { account: "michael561", record: false });
  assert.deepEqual(parseOptions(["--account", "michael561", "--record"]), { account: "michael561", record: true });
  assert.throws(() => parseOptions(["--account", "emsenn0"]), /exactly michael561/u);
  assert.throws(() => parseOptions(["--account", "michael561", "--key-file", "secret"]), /unknown argument/u);
});
