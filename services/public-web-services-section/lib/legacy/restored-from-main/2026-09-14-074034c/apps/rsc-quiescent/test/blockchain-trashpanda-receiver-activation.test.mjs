import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION,
  assayBlockchainTrashpandaReceiverActivation,
  expectedBlockchainTrashpandaAuthorizationAdmission,
  privateDirectoryOwnedAndRestricted,
} from "../src/blockchain-trashpanda-receiver-activation.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/u, "");
const COMPUTER_SERVICES_ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/u, "");

test("RSC pins the exact PNI admission and preserves the dormant template", () => {
  const admission = expectedBlockchainTrashpandaAuthorizationAdmission();
  assert.equal(admission.id, "ni:///sha-256;x4tE53Q2te6hEiXMyi1uoIqi2SJnE1JQEQS1lcyVZxU");
  const assay = assayBlockchainTrashpandaReceiverActivation(admission);
  assert.equal(assay.disposition, "admissible-if-private-roots-settle");
  assert.equal(assay.authorizationEvidenceDigest, "ni:///sha-256;RESeSQCJgefaqMRTj9t9KIyrZcmFX-eXt669Y5Z5P8A");
  assert.equal(assay.externalNetwork, false);
  assert.equal(assay.credentials, false);
  assert.equal(assay.externalSettlement, false);
  const dormant = JSON.parse(readFileSync(join(ROOT, "content/config/platform-node-admission-receiver.json"), "utf8"));
  assert.equal(dormant.enabled, false);
  assert.equal(dormant.authorizationAdmission, null);
  assert.equal(dormant.workingRoot, null);
  assert.equal(dormant.witnessJournal, null);
});

test("forged and widened admissions refuse before private-root creation", () => {
  const admission = expectedBlockchainTrashpandaAuthorizationAdmission();
  const forged = structuredClone(admission);
  forged.id = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  assert.throws(() => assayBlockchainTrashpandaReceiverActivation(forged), /exact PNI-owned authorization/u);
  const widened = structuredClone(admission);
  widened.binding.ceilings.maximumFiles = 17;
  assert.throws(() => assayBlockchainTrashpandaReceiverActivation(widened), /exact PNI-owned authorization/u);
  assert.equal(existsSync(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.workingRoot), false);
  assert.equal(existsSync(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.witnessJournalRoot), false);
});

test("activation pins only RSC-private roots and the relocated exact target", () => {
  assert.equal(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.target, `${COMPUTER_SERVICES_ROOT}/services/blockchain-services-section/services/blockchain-trashpanda-services-section`);
  assert.equal(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.workingRoot, `${ROOT}/data/platform-node-admission/working`);
  assert.equal(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.witnessJournalRoot, `${ROOT}/data/platform-node-admission/witnessJournal`);
  assert.equal(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.witnessJournalAgent, "http://127.0.0.1:19764/.well-known/agent-card.json");
  assert.equal(existsSync(BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION.target), true);
});

test("preexisting activation roots must be owned by this principal and mode-private", () => {
  const directory = mkdtempSync(join(tmpdir(), "rsc-private-root-"));
  try {
    chmodSync(directory, 0o700);
    assert.equal(privateDirectoryOwnedAndRestricted(directory), true);
    chmodSync(directory, 0o755);
    assert.equal(privateDirectoryOwnedAndRestricted(directory), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
