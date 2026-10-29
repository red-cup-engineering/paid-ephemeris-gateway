import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const ethereumObservationId = semanticId;
import { assayFixedForkBeefyRecoveryEconomics, recordFixedForkBeefyRecoveryEconomics }
  from "../src/fixed-fork-beefy-recovery-economics.mjs";

const HASH = `0x${"b".repeat(64)}`;
const tokens = ["0x04c0599ae5a44757c0af6f9ec3b93da8976c150a",
  "0x1f55a02a049033e3419a8e2975cf3f572f4e6e9a", "0x4200000000000000000000000000000000000006",
  "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452"];
const priceUrl = `https://coins.llama.fi/prices/current/${tokens.map((token) => `base:${token}`).join(",")}`;
const rawResponse = JSON.stringify({ coins: Object.fromEntries(tokens.map((token) => [`base:${token}`,
  { decimals: 18, symbol: token.endsWith("0006") ? "WETH" : "LST", price: 2000.1234567,
    timestamp: 4995, confidence: 0.99 }])) });

function providerObservation() {
  const body = { profile: "org.emsenn.evm.fixed-fork-beefy-vault-exit-observation.v1",
    requestDigest: `ni:///sha-256;${"A".repeat(43)}`,
    outcome: "completed-fixed-fork-beefy-vault-exit-observation", chain: "eip155:8453", block: "100",
    blockHash: HASH, timestamp: "5000", feeObservedAt: "2026-07-22T15:00:00.000Z",
    feeSource: "https://mainnet.base.org/", candidateCount: "2", candidates: [{
      candidateId: "yanagi-beefy-weeth-weth", vault: "0x47579c50c7aedea788d18927aed4c827fe34996a",
      lpToken: "0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8", sharesBurned: "10", lpBurned: "11",
      outputs: [{ token: tokens[0], amount: "1000000000000000000" },
        { token: tokens[2], amount: "1000000000000000000" }], routeGasUsed: "100", gasUnitsCeil: "200",
      fee: { totalFeeWeiCeil: "1000000000000000" }, conservationVerified: true, outputVerified: true,
      feeCeilingComplete: true }, {
      candidateId: "yanagi-beefy-sfrxeth-wsteth", vault: "0xdee327bf6b0182a1727caec9c6344a0d27d6da99",
      lpToken: "0x456c166e63634d75a4b49edec86cb51424d4c926", sharesBurned: "12", lpBurned: "13",
      outputs: [{ token: tokens[1], amount: "1000000000000000000" },
        { token: tokens[3], amount: "1000000000000000000" }], routeGasUsed: "100", gasUnitsCeil: "200",
      fee: { totalFeeWeiCeil: "1000000000000000" }, conservationVerified: true, outputVerified: true,
      feeCeilingComplete: true }],
    gate: { feeCeilingComplete: true, outputVerified: true, priceEvidenceComplete: false,
      executionAdmitted: false } };
  return { id: ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", body), ...body };
}

function input(overrides = {}) {
  return { profile: "org.emsenn.agrodao.fixed-fork-beefy-recovery-economics.v1",
    authority: { publicEvidenceOnly: true, fixedForkEvidenceOnly: true, liveMutation: false,
      transactionAssembly: false, signerMaterialPresent: false, outputCalldata: false, signing: false,
      broadcast: false, chainMutation: false }, head: { block: "100", hash: HASH, timestamp: "5000" },
    providerObservation: providerObservation(), priceSource: { url: priceUrl, rawResponse }, ...overrides };
}

test("uses exact decimal lexemes, output haircuts, and upward fee contingency", () => {
  const result = assayFixedForkBeefyRecoveryEconomics(input());
  const candidate = result.candidates[0];
  assert.equal(candidate.grossMicroUsdFloor, "3800234566");
  assert.equal(candidate.executionFeeMicroUsdCeil, "2100130");
  assert.equal(candidate.netMicroUsdAfterFeeCeiling, "3798134436");
  assert.equal(result.gate.priceEvidenceComplete, true);
  assert.equal(result.gate.executionAdmitted, false);
});

test("refuses stale, low-confidence, extra-token, head-drift, and transaction-bearing evidence", () => {
  const replace = (from, to) => input({ priceSource: { url: priceUrl, rawResponse: rawResponse.replace(from, to) } });
  assert.throws(() => assayFixedForkBeefyRecoveryEconomics(replace('"timestamp":4995', '"timestamp":999')), /stale/u);
  assert.throws(() => assayFixedForkBeefyRecoveryEconomics(replace('"confidence":0.99', '"confidence":0.98')), /confidence/u);
  assert.throws(() => assayFixedForkBeefyRecoveryEconomics({ ...input(), head: { ...input().head, block: "101" } }), /bound/u);
  assert.throws(() => assayFixedForkBeefyRecoveryEconomics({ ...input(), privateKey: "refused" }), /secret or transaction/u);
  assert.throws(() => assayFixedForkBeefyRecoveryEconomics({ ...input(), priceSource: {
    url: `${priceUrl},base:0x1111111111111111111111111111111111111111`, rawResponse } }), /exactly/u);
});

test("records economics only through AGRODAO's settlement boundary", async () => {
  const writes = [];
  const recorded = await recordFixedForkBeefyRecoveryEconomics(input(), { recordedAt: "2026-07-22T15:01:00.000Z",
    store: { actor: "urn:ame:agrodao", record: async (entry) => { writes.push(entry); return { digest: "projection" }; } } });
  assert.equal(writes[0].category, "agrodao.fixed-fork-beefy-recovery-economics");
  assert.equal(recorded.record.decisionBoundary.legalScopeComplete, false);
});
