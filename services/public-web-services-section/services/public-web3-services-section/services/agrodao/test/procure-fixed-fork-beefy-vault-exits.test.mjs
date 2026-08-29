import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const ethereumObservationId = semanticId;
import { procureFixedForkBeefyVaultExits }
  from "../src/procure-fixed-fork-beefy-vault-exits.mjs";

const request = { profile: "org.emsenn.evm.fixed-fork-beefy-vault-exit-observation.v1",
  authority: { fixedForkEvidenceOnly: true, liveMutation: false, signerMaterialPresent: false,
    transactionAssembly: false, signing: false, broadcast: false, chainMutation: false, outputCalldata: false },
  chain: "eip155:8453", rpcUrl: "https://mainnet.base.org/", block: "100", blockHash: `0x${"a".repeat(64)}`,
  timestamp: "1000", candidates: ["yanagi-beefy-weeth-weth"] };

function observation(overrides = {}) {
  const body = { profile: request.profile,
    requestDigest: ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", request), outcome: "completed-fixed-fork-beefy-vault-exit-observation",
    chain: request.chain, block: request.block, blockHash: request.blockHash, timestamp: request.timestamp,
    feeObservedAt: "2026-07-22T15:00:00.000Z", feeSource: request.rpcUrl, candidateCount: "1", candidates: [{
      candidateId: request.candidates[0], outputs: [{ token: "0x4200000000000000000000000000000000000006", amount: "1" }],
      fee: { totalFeeWeiCeil: "2" } }], gate: { fixedForkEvidenceOnly: true, feeCeilingComplete: true,
      priceEvidenceComplete: false, executionAdmitted: false, transactionAssembly: false, outputCalldata: false,
      signing: false, broadcast: false, chainMutation: false }, ...overrides };
  return { id: ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", body), ...body };
}

test("records separate provider and AGRODAO customer evidence", async () => {
  const writes = [];
  const result = await procureFixedForkBeefyVaultExits(request, { recordedAt: "2026-07-22T15:01:00.000Z",
    observe: async () => observation(), recordProvider: async () => ({ projection: { digest: "provider" } }),
    customerStore: { actor: "urn:ame:agrodao", record: async (entry) => { writes.push(entry); return { digest: "customer" }; } } });
  assert.equal(result.record.providerObservation, observation().id);
  assert.equal(result.record.decisionBoundary.executionAdmitted, false);
  assert.equal(writes[0].category, "agrodao.fixed-fork-beefy-vault-exit-procurement");
});

test("canonicalizes candidate order before invoking and binding the provider", async () => {
  const second = "yanagi-beefy-sfrxeth-wsteth";
  const unordered = { ...request, candidates: [request.candidates[0], second] };
  let invoked;
  await procureFixedForkBeefyVaultExits(unordered, { observe: async (normalized) => {
    invoked = normalized;
    const body = { ...observation(), requestDigest: ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", normalized),
      candidateCount: "2" };
    delete body.id;
    return { id: ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", body), ...body };
  }, recordProvider: async () => ({ projection: { digest: "provider" } }),
  customerStore: { actor: "urn:ame:agrodao", record: async () => ({ digest: "customer" }) } });
  assert.deepEqual(invoked.candidates, [second, request.candidates[0]]);
});

test("refuses widened or non-content-valid provider evidence", async () => {
  await assert.rejects(() => procureFixedForkBeefyVaultExits(request, { observe: async () =>
    observation({ gate: { ...observation().gate, executionAdmitted: true } }) }), /outside the contracted/u);
  const invalid = observation(); invalid.id = `ni:///sha-256;${"A".repeat(43)}`;
  await assert.rejects(() => procureFixedForkBeefyVaultExits(request, { observe: async () => invalid }),
    /outside the contracted/u);
});
