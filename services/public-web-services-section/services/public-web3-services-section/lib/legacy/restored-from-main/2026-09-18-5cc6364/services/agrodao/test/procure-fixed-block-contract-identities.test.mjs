import assert from "node:assert/strict";
import test from "node:test";

import { buildFixedBlockContractIdentityRequest, procureFixedBlockContractIdentities }
  from "../src/procure-fixed-block-contract-identities.mjs";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const ethereumObservationId = semanticId;

const ROOT = "0x1111111111111111111111111111111111111111";
const IMPL = "0x2222222222222222222222222222222222222222";
const NI = `ni:///sha-256;${"A".repeat(43)}`;
const recovery = [{ recordedAt: "2026-07-22T10:00:00.000Z", assay: { id: NI, candidates: [{
  candidateId: "yanagi-beefy-test", disposition: "recover-now" }] }, evidenceInput: { candidates: [{
    candidateId: "yanagi-beefy-test", chain: { caip2: "eip155:8453", snapshotBlock: "100" } }] } }];
const fingerprints = [{ recordedAt: "2026-07-22T11:00:00.000Z", observation: { id: NI,
  gate: { publicEvidenceOnly: true, executionAdmitted: false }, heads: { "eip155:8453": { block: "200" } }, candidates: [{
    candidateId: "yanagi-beefy-test", chain: "eip155:8453", observationComplete: true, roots: [{ address: ROOT,
      complete: true, proxyType: "eip1167", implementations: [{ address: IMPL, complete: true }] }] }] } }];
const fleet = { chains: [{ caip2: "eip155:8453", rpcUrl: "https://mainnet.base.org/" }],
  authority: { observationOnly: true, signerMaterialPresent: false } };

test("builds a bounded provider request from customer-owned evidence", () => {
  const request = buildFixedBlockContractIdentityRequest({ recoveryRecords: recovery,
    fingerprintRecords: fingerprints, fleet });
  assert.equal(request.candidates[0].baselineBlock, "100");
  assert.equal(request.candidates[0].currentBlock, "200");
  assert.equal(request.candidates[0].roots[0].expectedImplementationAddress, IMPL);
  assert.equal(request.authority.calldata, false);
});

test("records separate provider and customer evidence without execution authority", async () => {
  const writes = [];
  const result = await procureFixedBlockContractIdentities({ recoveryRecords: recovery,
    fingerprintRecords: fingerprints, fleet, recordedAt: "2026-07-22T12:00:00.000Z",
    observe: async (request) => ({ id: NI, profile: "org.emsenn.evm.fixed-block-contract-identity-observation.v1",
      requestDigest: ethereumObservationId("ethereum.fixed-block-contract-identity-observation", request), comparisonCompleteCount: "1", unchangedCount: "1",
      gate: { publicEvidenceOnly: true, calldata: false, executionAdmitted: false } }),
    recordProvider: async () => ({ projection: { digest: "provider-digest" } }),
    customerStore: { actor: "urn:ame:agrodao", record: async (request) => { writes.push(request); return { digest: "customer-digest" }; } } });
  assert.equal(result.record.provider, "urn:ame:ethereum-services-section");
  assert.equal(writes[0].category, "agrodao.fixed-block-contract-identity-procurement");
  assert.equal(result.record.decisionBoundary.executionAdmitted, false);
});

test("refuses incomplete source bindings and widened provider evidence", async () => {
  const missing = structuredClone(fingerprints); missing[0].observation.candidates[0].observationComplete = false;
  assert.throws(() => buildFixedBlockContractIdentityRequest({ recoveryRecords: recovery,
    fingerprintRecords: missing, fleet }), /no bounded/u);
  await assert.rejects(() => procureFixedBlockContractIdentities({ recoveryRecords: recovery,
    fingerprintRecords: fingerprints, fleet,
    observe: async () => ({
      gate: { executionAdmitted: true, calldata: false } }) }), /outside the contracted/u);
});
