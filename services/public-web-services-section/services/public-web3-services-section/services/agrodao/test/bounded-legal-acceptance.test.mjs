import assert from "node:assert/strict";
import test from "node:test";

import { admitBoundedLegalAcceptance, recordBoundedLegalAcceptance } from "../src/bounded-legal-acceptance.mjs";

function fixture() {
  return {
    profile: "org.emsenn.agrodao.bounded-legal-acceptance.v1",
    principal: { actor: "urn:leader:emsenn", enterprise: "urn:ame:yanagi", account: "eip155:42161:0x224C08A8526751887a83e2711B167f890c6D078d" },
    source: { channel: "codex:session", utterance: "I consent to this legal thing. Proceed.", observedAt: "2026-07-26T23:00:00.000Z" },
    terms: { uri: "ipfs://bafkreiemqapoduhh2j5spg7ndmkqdx2l5s2uloqqcv4egu5qiy5oiv4kaq", sha256: "8c801ee1d0e7d27b279bed1b1501df4becb545ba1015784353b0463ae4578a04", byteLength: "181866", title: "TOKEN COMPENSATION & RELEASE AGREEMENT", updated: "2025-08-05" },
    claim: { protocol: "GMX", chain: "eip155:42161", distributionId: "11802763389053472339483616176459046875189472617101418668457790595837638713068", outputs: [
      { token: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9", amount: "4149456793756073183", symbol: "GLV-ETH-USDC" },
      { token: "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96", amount: "3817608593649773717", symbol: "GLV-WBTC-USDC" },
    ] },
    contribution: { accepted: true, weight: { numerator: "1", denominator: "1" } },
  };
}

test("seats exact legal consent without manufacturing a trade mandate", () => {
  const result = admitBoundedLegalAcceptance(fixture());
  assert.equal(result.outcome, "bounded-legal-acceptance-seated");
  assert.equal(result.gate.legalAcceptanceCompleted, true);
  assert.deepEqual(result.gate.principalContribution, { numerator: "1", denominator: "1" });
  assert.equal(result.authority.generalTradingMandate, false);
  assert.equal(result.authority.chainMutation, false);
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("refuses partial, noncanonical, transaction-bearing, or cross-chain acceptance", () => {
  const partial = fixture(); partial.contribution.weight = { numerator: "1", denominator: "2" };
  assert.throws(() => admitBoundedLegalAcceptance(partial), /full 1\/1/u);
  const noncanonical = fixture(); noncanonical.contribution.weight = { numerator: "2", denominator: "2" };
  assert.throws(() => admitBoundedLegalAcceptance(noncanonical), /reduced canonical/u);
  const transaction = fixture(); transaction.calldata = "0x1234";
  assert.throws(() => admitBoundedLegalAcceptance(transaction), /execution/u);
  const chain = fixture(); chain.claim.chain = "eip155:1";
  assert.throws(() => admitBoundedLegalAcceptance(chain), /match/u);
});

test("records only through AGRODAO's settlement membrane", async () => {
  const calls = []; const store = { actor: "urn:ame:agrodao", record: async (value) => { calls.push(value); return { digest: "ni:///sha-256;receipt" }; } };
  const recorded = await recordBoundedLegalAcceptance(fixture(), { store, recordedAt: "2026-07-26T23:01:00.000Z" });
  assert.equal(calls.length, 1); assert.equal(calls[0].category, "agrodao.bounded-legal-acceptance");
  assert.equal(recorded.record.acceptance.id, recorded.result.id);
});
