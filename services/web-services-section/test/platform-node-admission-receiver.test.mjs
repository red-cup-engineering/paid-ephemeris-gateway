import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { startWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-rdf-projection-service/test-provider";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";

import {
  RSC_PLATFORM_NODE_ADMISSION_CATEGORIES,
  PlatformNodeAdmissionError,
  createContractedWitnessJournal,
  createRscPlatformNodeAdmissionReceiver,
  identify,
  platformNodeMeshAdmissionRequest,
  semanticDigest,
} from "../src/platform-node-admission-receiver.mjs";
import { renameNoReplace } from "../src/rename-noreplace.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKER = resolve(ROOT, "test", "platform-node-admission-race-worker.mjs");
const EFFECTS = ["receiver-create-only-admission", "receiver-rollback-on-partial-failure", "provider-local-witness-journal-evidence", "provider-runtime-withdrawal"];

function hash(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

function memoryJournal(seed = {}) {
  const records = new Map(Object.entries(seed));
  return {
    records(category) { return [...(records.get(category) ?? [])]; },
    async record({ category, record }) { records.set(category, [...(records.get(category) ?? []), record]); },
  };
}

function operationRecord(state, request, recordedAt, predecessor = null) {
  return identify({
    type: "RscPlatformNodeAdmissionOperation", contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA",
    state, predecessor, request, requestDigest: request.id, idempotencyKey: request.idempotencyKey,
    targetRoot: request.targetRoot, manifestDigest: request.manifestDigest, recordedAt,
  });
}

function fixture(agentCardUrl) {
  const root = mkdtempSync(join(tmpdir(), "rsc-platform-node-receiver-"));
  mkdirSync(join(root, ".git"));
  const services = join(root, "services"), workingRoot = join(root, "data", "receiver"), dataRoot = join(root, "data", "witnessJournal");
  mkdirSync(services, { recursive: true });
  mkdirSync(workingRoot, { recursive: true, mode: 0o700 });
  mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
  const nodeId = "blockchain-trashpanda", targetRoot = join(services, nodeId);
  const bytesA = Buffer.from("{\"name\":\"blockchain-trashpanda\",\"private\":true}\n");
  const bytesB = Buffer.from("export const trash = \"panda\";\n");
  const files = [
    { kind: "file", path: "package.json", encoding: "base64", content: bytesA.toString("base64"), byteLength: bytesA.byteLength, sha256: hash(bytesA) },
    { kind: "file", path: "src/index.mjs", encoding: "base64", content: bytesB.toString("base64"), byteLength: bytesB.byteLength, sha256: hash(bytesB) },
  ];
  const manifest = { type: "PlatformNodeProductionManifest", nodeId, targetRoot, fileCount: files.length, totalBytes: bytesA.byteLength + bytesB.byteLength, files };
  const admittedProviderLaw = "ni:///sha-256;fqCupKTkPu7Yta0UwcvyqaPAhfciGh2fZ6LXVVcXPhc";
  const authorizationAdmission = semanticDigest({ type: "TestAuthorizationAdmission" });
  const authorizationEvidenceDigest = semanticDigest({ type: "TestAuthorizationEvidence" });
  const configuration = {
    type: "RscPlatformNodeAdmissionReceiverConfiguration", version: 1, enabled: true,
    actor: "urn:ame:rsc-quiescent", admittedProvider: "urn:ame:platform-node-inducer", admittedProviderLaw,
    contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA", meshAuthorityRoot: root, receiverRoot: root, admittedParent: services,
    allocationId: "yanagi-trashpanda-test-allocation", customer: "urn:ame:yanagi", nodeId,
    authorizationAdmission, authorizationEvidenceDigest, workingRoot,
    witnessJournal: { agentUrl: agentCardUrl, dataRoot, nodeId: "rsc-quiescent", settlement: "urn:ame:rsc-quiescent", actor: "urn:ame:rsc-quiescent" },
    ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 },
    publication: { createOnly: true, overwrite: false, externalNetwork: false, credentials: false, externalSettlement: false },
    refusal: "test-activation",
  };
  const manifestDigest = semanticDigest(manifest);
  const idempotencyKey = semanticDigest({ law: admittedProviderLaw, allocationId: configuration.allocationId, nodeId, targetRoot, manifestDigest, receiver: configuration.actor, receiverContract: configuration.contract });
  const request = identify({
    type: "ReceiverCreateOnlyAdmissionRequest", contract: configuration.contract, receiver: configuration.actor,
    provider: configuration.admittedProvider, customer: configuration.customer, allocationId: configuration.allocationId,
    idempotencyKey, nodeId, targetRoot, manifest, manifestDigest, authorizationEvidenceDigest,
    authorizationAdmission, effects: EFFECTS, requireAbsentTarget: true, createOnly: true, overwrite: false, maximumRuntimeMs: 120000,
  });
  return { root, services, workingRoot, dataRoot, targetRoot, configuration, request, witnessJournal: configuration.witnessJournal };
}

function runWorker(payload) {
  return new Promise((accept, reject) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const child = spawn(process.execPath, [WORKER, encoded], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject); child.once("exit", (code) => accept({ code, stdout, stderr }));
  });
}

async function withProvider(run) {
  const provider = await startWitnessJournalProviderProcess();
  try { await run(provider.agentCardUrl); } finally { await provider.close(); }
}

test("checked-in receiver is dormant and canonical", async () => {
  const receiver = createRscPlatformNodeAdmissionReceiver();
  await assert.rejects(() => receiver.status(semanticDigest("unused"), {}), (error) => error instanceof PlatformNodeAdmissionError && error.reason === "receiver-disabled");
});

test("exact admit publishes once and journals typed witness-journal RDF operations and receipt", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const journal = createContractedWitnessJournal(f.witnessJournal);
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal });
    const receipt = await receiver.admit(f.request);
    assert.equal(receipt.targetRoot, f.targetRoot);
    assert.equal(readFileSync(join(f.targetRoot, "src/index.mjs"), "utf8"), "export const trash = \"panda\";\n");
    const replay = await receiver.status(f.request.idempotencyKey, f.request);
    assert.equal(replay.id, receipt.id);
    const operations = await querySettlementRecords(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations);
    assert.deepEqual(new Set(operations.map((record) => record.state)), new Set(["claimed", "prepared", "committed", "receipted"]));
    assert.equal((await querySettlementRecords(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.receipts)).length, 1);
    const claimRoot = join(f.workingRoot, "claims", f.request.idempotencyKey.slice("ni:///sha-256;".length));
    const prepared = JSON.parse(readFileSync(join(claimRoot, "prepared.json"), "utf8"));
    const meshRequest = platformNodeMeshAdmissionRequest(f.configuration, prepared.stage);
    assert.equal(meshRequest.sourceEnterprise, prepared.stage);
    assert.equal(meshRequest.targetNode, f.services);
    assert.equal(readdirSync(claimRoot).some((name) => name.endsWith(".tmp")), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("historical receipt revalidates target and complete operation history", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const journal = createContractedWitnessJournal(f.witnessJournal);
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal });
    await receiver.admit(f.request);
    writeFileSync(join(f.targetRoot, "package.json"), "changed\n");
    assert.equal(await receiver.status(f.request.idempotencyKey, f.request), null);
  } finally { rmSync(f.root, { recursive: true, force: true }); }

  const g = fixture(agentCardUrl);
  try {
    const journal = createContractedWitnessJournal(g.witnessJournal);
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: g.configuration, journal });
    await receiver.admit(g.request);
    await journal.record({ category: RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations, recordedAt: new Date().toISOString(), record: { type: "foreign", idempotencyKey: g.request.idempotencyKey } });
    await assert.rejects(() => receiver.status(g.request.idempotencyKey, g.request), (error) => error.reason === "receiver-operation-journal-contaminated");
  } finally { rmSync(g.root, { recursive: true, force: true }); }
}));

test("activation clones configuration and production cannot inject a publisher", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    f.configuration.enabled = false;
    f.configuration.nodeId = "mutated";
    const receipt = await receiver.status(f.request.idempotencyKey, f.request);
    assert.equal(receipt.nodeId, "blockchain-trashpanda");
    assert.throws(() => createRscPlatformNodeAdmissionReceiver({ publish: renameNoReplace }), (error) => error.reason === "receiver-custom-seam-test-only");
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("an incomplete stale private temporary is ignored and never trusted as a final witness", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const claims = join(f.workingRoot, "claims"); mkdirSync(claims);
    const claimRoot = join(claims, f.request.idempotencyKey.slice("ni:///sha-256;".length)); mkdirSync(claimRoot);
    const stale = join(claimRoot, ".claim.json.00000000-0000-4000-8000-000000000000.tmp");
    writeFileSync(stale, "{\"truncated\":");
    let tick = 0;
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal),
      clock: () => new Date(Date.parse("2026-07-22T00:00:00.000Z") + tick++).toISOString(),
    });
    const receipt = await receiver.status(f.request.idempotencyKey, f.request);
    assert.ok(receipt);
    const claim = JSON.parse(readFileSync(join(claimRoot, "claim.json"), "utf8"));
    assert.equal(claim.request.id, f.request.id);
    assert.equal(readFileSync(stale, "utf8"), "{\"truncated\":");
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("durable claim monotonic deadline bounds recovery and publisher timeout", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const monotonic = [0n, 1_000_000n, 2_000_000n, 120_001_000_000n];
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal),
      clock: () => "2026-07-22T00:00:00.000Z",
      monotonicNow: () => monotonic.shift() ?? 120_001_000_000n,
    });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-runtime-exhausted");
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("content-valid premature receipted and terminal refused histories cannot publish", async () => withProvider(async (agentCardUrl) => {
  const at = "2026-07-22T00:00:00.000Z";
  const f = fixture(agentCardUrl);
  try {
    let predecessor = null;
    const premature = ["claimed", "prepared", "committed", "receipted"].map((state) => {
      const record = operationRecord(state, f.request, at, predecessor); predecessor = record.id; return record;
    });
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: f.configuration,
      journal: memoryJournal({ [RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations]: premature }),
      clock: () => at,
    });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-operation-journal-premature-terminal-state");
    assert.equal(existsSync(f.targetRoot), false);
    assert.equal(existsSync(join(f.workingRoot, "claims")), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }

  const g = fixture(agentCardUrl);
  try {
    const claimed = operationRecord("claimed", g.request, at);
    const refused = [claimed, operationRecord("refused", g.request, at, claimed.id)];
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: g.configuration,
      journal: memoryJournal({ [RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations]: refused }),
      clock: () => at,
    });
    await assert.rejects(() => receiver.status(g.request.idempotencyKey, g.request), (error) => error.reason === "receiver-operation-terminal-refusal");
    assert.equal(existsSync(g.targetRoot), false);
  } finally { rmSync(g.root, { recursive: true, force: true }); }

  const regressed = fixture(agentCardUrl);
  try {
    const walls = ["2026-07-22T00:00:03.000Z", "2026-07-22T00:00:02.000Z", "2026-07-22T00:00:01.000Z", "2026-07-22T00:00:00.000Z"];
    let monotonic = 0n;
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: regressed.configuration, journal: memoryJournal(),
      clock: () => walls.shift() ?? "2026-07-22T00:00:00.000Z", monotonicNow: () => monotonic++ * 1_000_000n,
    });
    const receipt = await receiver.status(regressed.request.idempotencyKey, regressed.request);
    assert.equal(receipt.targetRoot, regressed.targetRoot);
  } finally { rmSync(regressed.root, { recursive: true, force: true }); }

  const h = fixture(agentCardUrl);
  try {
    const journal = memoryJournal();
    const crashing = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: h.configuration, journal, clock: () => at,
      fault: async (point) => { if (point === "afterPublish") throw new Error("stop-before-receipt"); },
    });
    await assert.rejects(() => crashing.status(h.request.idempotencyKey, h.request), /stop-before-receipt/u);
    const prepared = journal.records(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations).find((record) => record.state === "prepared");
    const committed = operationRecord("committed", h.request, at, prepared.id);
    const receipted = operationRecord("receipted", h.request, at, committed.id);
    await journal.record({ category: RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations, record: committed });
    await journal.record({ category: RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations, record: receipted });
    const recovering = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: h.configuration, journal, clock: () => at });
    await assert.rejects(() => recovering.status(h.request.idempotencyKey, h.request), (error) => error.reason === "receiver-operation-journal-premature-terminal-state");
  } finally { rmSync(h.root, { recursive: true, force: true }); }
}));

test("content-valid operation forks are rejected before any private write", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const fork = [
      operationRecord("claimed", f.request, "2026-07-22T00:00:00.000Z"),
      operationRecord("claimed", f.request, "2026-07-22T00:00:01.000Z"),
    ];
    const receiver = createRscPlatformNodeAdmissionReceiver({
      testOnly: true,
      configuration: f.configuration,
      journal: memoryJournal({ [RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations]: fork }),
    });
    await assert.rejects(
      () => receiver.status(f.request.idempotencyKey, f.request),
      (error) => error.reason === "receiver-operation-journal-fork",
    );
    assert.equal(existsSync(join(f.workingRoot, "claims")), false);
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("proven post-publication recovery remains live after the wall deadline", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  const journal = memoryJournal();
  const early = "2026-07-22T00:00:00.000Z", late = "2026-07-22T01:00:00.000Z";
  try {
    let earlyMonotonic = 0n;
    const crashing = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: f.configuration, journal, clock: () => early, monotonicNow: () => earlyMonotonic++ * 1_000_000n,
      fault: async (point) => { if (point === "afterPublish") throw new Error("simulated process loss after publication"); },
    });
    await assert.rejects(() => crashing.status(f.request.idempotencyKey, f.request), /simulated process loss/u);
    assert.equal(existsSync(f.targetRoot), true);
    const recovering = createRscPlatformNodeAdmissionReceiver({
      testOnly: true, configuration: f.configuration, journal, clock: () => late, monotonicNow: () => 3_600_000_000_000n,
    });
    const receipt = await recovering.status(f.request.idempotencyKey, f.request);
    assert.equal(receipt.resourceReceipt.elapsedMs, f.request.maximumRuntimeMs);
    assert.equal(receipt.targetRoot, f.targetRoot);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

for (const exitAt of ["afterClaim", "afterPrepared", "afterRenameBeforeParentSync", "afterPublish", "afterReceiptRecord"]) {
  test(`status with exact request recovers a process death ${exitAt}`, async () => withProvider(async (agentCardUrl) => {
    const f = fixture(agentCardUrl);
    try {
      const crashed = await runWorker({ operation: "admit", exitAt, configuration: f.configuration, request: f.request, witnessJournal: f.witnessJournal });
      assert.equal(crashed.code, 73, crashed.stderr);
      const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
      const receipt = await receiver.status(f.request.idempotencyKey, f.request);
      assert.equal(receipt.targetRoot, f.targetRoot);
      assert.equal((await querySettlementRecords(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.receipts)).length, 1);
      const operations = await querySettlementRecords(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations);
      assert.equal(operations.some((record) => record.state === "receipted"), true);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }));
}

test("cross-process race has one no-replace publication and one receipt identity", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const payload = { operation: "status", exitAt: null, configuration: f.configuration, request: f.request, witnessJournal: f.witnessJournal };
    const results = await Promise.all([runWorker(payload), runWorker(payload), runWorker(payload), runWorker(payload)]);
    assert.ok(results.some((result) => result.code === 0), results.map((result) => result.stderr).join("\n"));
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    const receipt = await receiver.status(f.request.idempotencyKey, f.request);
    assert.ok(receipt);
    const receipts = await querySettlementRecords(RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.receipts);
    assert.equal(new Set(receipts.map((record) => record.id)).size, 1);
    assert.equal(readFileSync(join(f.targetRoot, "package.json"), "utf8"), Buffer.from(f.request.manifest.files[0].content, "base64").toString("utf8"));
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("a barrier-forced publish race and a commit-then-throw both recover by exact inode", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    let arrivals = 0, release;
    const barrier = new Promise((accept) => { release = accept; });
    const timeout = setTimeout(release, 10_000);
    const racedPublish = async (...arguments_) => {
      arrivals += 1;
      if (arrivals === 2) release();
      await barrier;
      return renameNoReplace(...arguments_);
    };
    const first = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal), publish: racedPublish });
    const second = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal), publish: racedPublish });
    const receipts = await Promise.all([first.status(f.request.idempotencyKey, f.request), second.status(f.request.idempotencyKey, f.request)]);
    clearTimeout(timeout);
    assert.equal(arrivals, 2);
    assert.equal(receipts[0].id, receipts[1].id);
  } finally { rmSync(f.root, { recursive: true, force: true }); }

  const g = fixture(agentCardUrl);
  try {
    const commitThenThrow = async (...arguments_) => { await renameNoReplace(...arguments_); throw new Error("simulated lost syscall reply"); };
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: g.configuration, journal: createContractedWitnessJournal(g.witnessJournal), publish: commitThenThrow });
    const receipt = await receiver.status(g.request.idempotencyKey, g.request);
    assert.equal(receipt.targetRoot, g.targetRoot);
  } finally { rmSync(g.root, { recursive: true, force: true }); }
}));

test("status without the exact submitted request cannot cause an effect", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey), (error) => error.reason === "status-exact-request-required");
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("a forged idempotency key and a pre-existing target are refused without overwrite", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    const forged = { ...f.request, idempotencyKey: semanticDigest("forged") };
    forged.id = semanticDigest(Object.fromEntries(Object.entries(forged).filter(([key]) => key !== "id")));
    await assert.rejects(() => receiver.admit(forged), (error) => error.reason === "request-idempotency-key-mismatch");
    mkdirSync(f.targetRoot); writeFileSync(join(f.targetRoot, "owned.txt"), "preexisting\n");
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "target-already-exists");
    assert.equal(readFileSync(join(f.targetRoot, "owned.txt"), "utf8"), "preexisting\n");
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("conflicting WitnessJournal operation and extra empty directory fail closed", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const journal = createContractedWitnessJournal(f.witnessJournal);
    await journal.record({ category: RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.operations, recordedAt: new Date().toISOString(), record: { type: "foreign", idempotencyKey: f.request.idempotencyKey } });
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-operation-journal-contaminated");
  } finally { rmSync(f.root, { recursive: true, force: true }); }

  const g = fixture(agentCardUrl);
  try {
    const crashed = await runWorker({ operation: "admit", exitAt: "afterPublish", configuration: g.configuration, request: g.request, witnessJournal: g.witnessJournal });
    assert.equal(crashed.code, 73);
    mkdirSync(join(g.targetRoot, "empty-extra"));
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: g.configuration, journal: createContractedWitnessJournal(g.witnessJournal) });
    assert.equal(await receiver.status(g.request.idempotencyKey, g.request), null);
  } finally { rmSync(g.root, { recursive: true, force: true }); }
}));

test("a content-valid same-key receipt with changed target is a journal conflict", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const journal = createContractedWitnessJournal(f.witnessJournal);
    const recordedAt = new Date().toISOString();
    const forgedTarget = join(f.services, "foreign-target");
    const forged = identify({
      type: "ReceiverCreateOnlyAdmissionReceipt", contract: f.request.contract, receiver: f.request.receiver,
      customer: f.request.customer, provider: f.request.provider, allocationId: f.request.allocationId,
      idempotencyKey: f.request.idempotencyKey, nodeId: f.request.nodeId, targetRoot: forgedTarget,
      manifestDigest: f.request.manifestDigest, installation: true, createOnly: true, overwrite: false, priorTargetAbsent: true,
      postState: { targetExists: true, manifestDigest: f.request.manifestDigest, fileCount: f.request.manifest.fileCount, totalBytes: f.request.manifest.totalBytes },
      rollback: { ownedByReceiver: true, partialFailureRemovesExactNewTarget: true },
      lifecycle: { providerRuntimeImported: false, continuingAuthority: false, withdrawal: "complete" },
      resourceReceipt: { elapsedMs: 1, network: false, credentialsUsed: false, externalSettlement: false }, recordedAt,
    });
    await journal.record({ category: RSC_PLATFORM_NODE_ADMISSION_CATEGORIES.receipts, recordedAt, record: forged });
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-receipt-journal-conflict");
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("a symlinked private claim directory is refused before any cleanup or target write", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  const outside = mkdtempSync(join(tmpdir(), "rsc-receiver-outside-"));
  try {
    const claims = join(f.workingRoot, "claims"); mkdirSync(claims);
    const claim = join(claims, f.request.idempotencyKey.slice("ni:///sha-256;".length));
    writeFileSync(join(outside, "preserve.txt"), "preserve\n"); symlinkSync(outside, claim, "dir");
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-private-claim-directory-invalid");
    assert.equal(readFileSync(join(outside, "preserve.txt"), "utf8"), "preserve\n");
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
}));

test("working root must share the publication filesystem", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    if (!existsSync("/dev/shm") || statSync("/dev/shm").dev === statSync(f.services).dev) return;
    f.configuration = { ...f.configuration, workingRoot: mkdtempSync("/dev/shm/rsc-receiver-") };
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration: f.configuration, journal: createContractedWitnessJournal(f.witnessJournal) });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-owned-root-outside-rsc-territory");
    rmSync(f.configuration.workingRoot, { recursive: true, force: true });
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));

test("receiver working and WitnessJournal roots cannot cross a checked-out sovereign boundary", async () => withProvider(async (agentCardUrl) => {
  const f = fixture(agentCardUrl);
  try {
    const foreign = join(f.root, "foreign-sovereign");
    const foreignData = join(foreign, "data");
    mkdirSync(foreignData, { recursive: true });
    writeFileSync(join(foreign, ".git"), "gitdir: /nonexistent/foreign\n");
    const configuration = { ...f.configuration, witnessJournal: { ...f.configuration.witnessJournal, dataRoot: foreignData } };
    const receiver = createRscPlatformNodeAdmissionReceiver({ testOnly: true, configuration, journal: createContractedWitnessJournal(configuration.witnessJournal) });
    await assert.rejects(() => receiver.status(f.request.idempotencyKey, f.request), (error) => error.reason === "receiver-owned-data-crosses-mesh-boundary");
    assert.equal(existsSync(join(f.workingRoot, "claims")), false);
    assert.equal(existsSync(f.targetRoot), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
}));
