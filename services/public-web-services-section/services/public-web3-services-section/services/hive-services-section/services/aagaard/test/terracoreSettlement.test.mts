import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";


import {
  readTerraCoreActionReceipts,
  recordTerraCoreActionReceipt,
} from "../src/core/terracoreSettlement.mts";

test("TerraCore pending and recovered receipts form one append-only transaction episode", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "aagaard-terracore-settlement-"));
  try {
    const transactionId = "5".repeat(40);
    const pending = Object.freeze({
      kind: "aagaard.terracore-one-action-receipt",
      account: "michael561",
      transactionId,
      status: "settlement-pending",
      before: Object.freeze({ liquidScrap: "113.48115280", player: Object.freeze({ scrap: "21.55644444" }) }),
      plan: Object.freeze({ kind: "claim", amount: "21.55644444" }),
    });
    const first = await recordTerraCoreActionReceipt(root, pending, "2026-07-22T03:35:25.000Z");
    const duplicate = await recordTerraCoreActionReceipt(root, pending, "2026-07-22T03:36:00.000Z");
    assert.equal(first.eventId, duplicate.eventId);

    await recordTerraCoreActionReceipt(root, Object.freeze({
      ...pending,
      status: "claim-confirmed",
      claimedScrap: "21.56419852",
      after: Object.freeze({ liquidScrap: "135.04535132", player: Object.freeze({ scrap: "0.09107111" }) }),
      recoveryOf: first.eventId,
    }), "2026-07-22T03:35:40.000Z");

    const events = readTerraCoreActionReceipts(root, transactionId);
    assert.deepEqual(events.map((event) => event.status), ["settlement-pending", "claim-confirmed"]);
    assert.equal(events[1]?.receipt.recoveryOf, first.eventId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
