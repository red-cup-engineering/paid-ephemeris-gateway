import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  admitSourcePacket,
  deliverSourcePacket,
  firstPacketDraft,
} from "../../../../emsweb/services/mathematics-research-enterprise/src/research.mjs";
import { records } from "../src/boundary.mjs";
import {
  CATEGORY,
  settleMathematicsResearchDelivery,
} from "../src/contract-mathematics-research-intake.mjs";

const ADMITTED_AT = "2026-08-03T12:00:00.000Z";
const RECEIVED_AT = "2026-08-03T12:00:01.000Z";

test("the real mathematics packet crosses canonical admission and Koios retains an authority refusal", async () => {
  const producerRoot = mkdtempSync(join(tmpdir(), "mathematics-research-producer-"));
  const receiverRoot = mkdtempSync(join(tmpdir(), "koios-mathematics-intake-"));
  const packet = await admitSourcePacket(firstPacketDraft(), { dataRoot: producerRoot, at: ADMITTED_AT });
  const delivery = deliverSourcePacket(packet);
  const refusal = settleMathematicsResearchDelivery(delivery, RECEIVED_AT, { dataRoot: receiverRoot });

  assert.match(packet.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.match(delivery.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.match(refusal.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.equal(refusal.type, "Reject");
  assert.equal(refusal.code, "editorial-reuse-not-granted");
  assert.equal(refusal.object, delivery.id);
  assert.deepEqual(refusal.diagnosis.grantedUses, packet.reuseGrant);
  assert.deepEqual(refusal.sourceWarrants.map(({ id, url }) => ({ id, url })), packet.citations.map(({ id, url }) => ({ id, url })));
  assert.deepEqual(refusal.claimWarrantBindings, packet.claims.map(({ statement, warrants, scope }) => ({ statement, warrants, scope })));
  assert.deepEqual(refusal.limitations, packet.limitations);
  assert.ok(refusal.receiverAuthorityWithheld.includes("truth-settlement"));
  assert.ok(refusal.receiverAuthorityWithheld.includes("refutation"));

  const retained = records(CATEGORY, receiverRoot);
  assert.equal(retained.length, 1);
  assert.deepEqual(retained[0], refusal);
});

test("Koios refuses a delivery whose canonical identity was changed", async () => {
  const producerRoot = mkdtempSync(join(tmpdir(), "mathematics-research-tamper-"));
  const packet = await admitSourcePacket(firstPacketDraft(), { dataRoot: producerRoot, at: ADMITTED_AT });
  const delivery = structuredClone(deliverSourcePacket(packet));
  delivery.object.limitations.push("invented receiver mutation");
  assert.throws(
    () => settleMathematicsResearchDelivery(delivery, RECEIVED_AT, { dataRoot: mkdtempSync(join(tmpdir(), "koios-reject-tamper-")) }),
    /exact canonical producer delivery/u,
  );
});
