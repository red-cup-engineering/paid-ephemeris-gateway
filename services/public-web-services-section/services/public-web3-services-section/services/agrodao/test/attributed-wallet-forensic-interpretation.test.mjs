import assert from "node:assert/strict";
import test from "node:test";

import {
  ATTRIBUTED_WALLET_FORENSIC_PRODUCT,
  admitAttributedWalletForensicInterpretation,
  recordAttributedWalletForensicInterpretation,
} from "../src/attributed-wallet-forensic-interpretation.mjs";
import { PUBLIC_EVM_WALLET_OBSERVATION_PRODUCT }
  from "@red-cup-engineering/ethereum-services-section/public-wallet-observation-product";

const OBSERVATION = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function fixture() {
  return {
    profile: "org.emsenn.agrodao.attributed-wallet-forensic-interpretation.v1",
    epistemicStatus: "attributed-nondeterministic-inference",
    authority: {
      publicEvidenceOnly: true,
      providerSelectedByCustomer: true,
      liveMutation: false,
      transactionAssembly: false,
      signerMaterialPresent: false,
      signing: false,
      broadcast: false,
      payment: false,
      deployment: false,
    },
    observation: {
      id: OBSERVATION,
      provider: "urn:ame:ethereum-services-section",
      law: "ni:///sha-256;jqPu_xz6rvNpvNznirkpZstyWwlsYxEpKnMm9txo3LE",
      accounts: ["eip155:42161:0x224C08A8526751887a83e2711B167f890c6D078d"],
      snapshots: [{ caip2: "eip155:42161", blockNumber: "486524579", blockTimestamp: "1784722260" }],
    },
    provider: {
      actor: "urn:ame:public-wallet-forensic-inference-provider",
      agentCardUrl: "https://forensics.example/.well-known/agent-card.json",
      agentCardDigest: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      agentCardSignatureEvidence: "ni:///sha-256;EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
      invocationReceipt: "ni:///sha-256;FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      law: "ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    },
    completedAt: "2026-07-22T12:30:00.000Z",
    sources: [
      {
        sourceId: "gmx-voting-power",
        title: "GMX voting power",
        url: "https://docs.gmx.io/docs/governance/voting-power/",
        retrievedAt: "2026-07-22T12:20:00.000Z",
      },
      {
        sourceId: "gmx-v1-liquidity",
        title: "GMX V1 liquidity",
        url: "https://docs.gmx.io/docs/archived/liquidity-v1/",
        retrievedAt: "2026-07-22T12:21:00.000Z",
      },
    ],
    claims: [
      {
        claimId: "staked-gmx-is-governance-bearing",
        kind: "classification",
        statement: "The observed staked GMX balance carries governance power under the cited protocol rules.",
        confidenceBps: "9700",
        observationRefs: [OBSERVATION],
        sourceRefs: ["gmx-voting-power"],
      },
      {
        claimId: "preserve-small-staked-gmx",
        kind: "recommendation",
        statement: "Preserve the small staked GMX position while its governance utility exceeds the modeled liquidation benefit.",
        confidenceBps: "8200",
        observationRefs: [OBSERVATION],
        sourceRefs: ["gmx-voting-power"],
      },
      {
        claimId: "legacy-redemption-route-risk",
        kind: "risk",
        statement: "Any V1 redemption should be replayed against a fresh fixed fork because the route is legacy protocol machinery.",
        confidenceBps: "9300",
        observationRefs: [OBSERVATION],
        sourceRefs: ["gmx-v1-liquidity"],
      },
    ],
  };
}

test("accepts a source-closed attributed interpretation without granting execution authority", () => {
  const result = admitAttributedWalletForensicInterpretation(fixture());
  assert.equal(result.outcome, "accepted-attributed-wallet-forensic-interpretation");
  assert.equal(result.epistemicStatus, "attributed-nondeterministic-inference");
  assert.equal(result.observation, OBSERVATION);
  assert.equal(result.claimCount, "3");
  assert.equal(result.sourceCount, "2");
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.deepEqual(result.authority, {
    publicEvidenceOnly: true,
    investmentAuthority: false,
    custody: false,
    transactionAssembly: false,
    signing: false,
    broadcast: false,
    payment: false,
    deployment: false,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.claims), true);
  assert.equal(Object.isFrozen(result.claims[0]), true);
  assert.throws(() => { result.claims[0].statement = "tampered"; }, /read only|Cannot assign/u);
});

test("identifies the same accepted envelope independent of object key order", () => {
  const first = fixture();
  const second = Object.fromEntries(Object.entries(fixture()).reverse());
  assert.equal(admitAttributedWalletForensicInterpretation(first).id,
    admitAttributedWalletForensicInterpretation(second).id);
});

test("refuses deterministic-truth labels and financial claims without both evidence kinds", () => {
  const truth = fixture(); truth.epistemicStatus = "deterministic-truth";
  assert.throws(() => admitAttributedWalletForensicInterpretation(truth), /epistemicStatus/u);
  const recommendation = fixture(); recommendation.claims[1].sourceRefs = [];
  assert.throws(() => admitAttributedWalletForensicInterpretation(recommendation), /cite both/u);
  const risk = fixture(); risk.claims[2].observationRefs = [];
  assert.throws(() => admitAttributedWalletForensicInterpretation(risk), /cite both/u);
});

test("refuses dangling evidence, chronology inversion, and unsafe public-source URLs", () => {
  const dangling = fixture(); dangling.claims[0].sourceRefs = ["not-a-source"];
  assert.throws(() => admitAttributedWalletForensicInterpretation(dangling), /dangling source/u);
  const future = fixture(); future.sources[0].retrievedAt = "2026-07-22T12:31:00.000Z";
  assert.throws(() => admitAttributedWalletForensicInterpretation(future), /cannot follow/u);
  const local = fixture(); local.sources[0].url = "https://127.0.0.1/admin";
  assert.throws(() => admitAttributedWalletForensicInterpretation(local), /public HTTPS host/u);
});

test("refuses drift from the exact deterministic observation provider", () => {
  const provider = fixture(); provider.observation.provider = "urn:ame:other-provider";
  assert.throws(() => admitAttributedWalletForensicInterpretation(provider), /exact Ethereum Services/u);
});

test("refuses numeric, secret, transaction, payment, and deployment authority", () => {
  const numeric = fixture(); numeric.claims[0].confidenceBps = 9700;
  assert.throws(() => admitAttributedWalletForensicInterpretation(numeric), /decimal text/u);
  const transaction = fixture(); transaction.calldata = "0xdeadbeef";
  assert.throws(() => admitAttributedWalletForensicInterpretation(transaction), /transaction.*material/u);
  const secret = fixture(); secret.privateKey = "never";
  assert.throws(() => admitAttributedWalletForensicInterpretation(secret), /secret material/u);
  const payment = fixture(); payment.authority.payment = true;
  assert.throws(() => admitAttributedWalletForensicInterpretation(payment), /authority must admit/u);
  const deployment = fixture(); deployment.authority.deployment = true;
  assert.throws(() => admitAttributedWalletForensicInterpretation(deployment), /authority must admit/u);
});

test("declares a deployment-neutral inference product owned by AGRODAO", () => {
  assert.equal(ATTRIBUTED_WALLET_FORENSIC_PRODUCT.provider, "urn:ame:agrodao");
  assert.equal(ATTRIBUTED_WALLET_FORENSIC_PRODUCT.skill.id, "interpret-public-evm-wallet-forensics");
  assert.equal(ATTRIBUTED_WALLET_FORENSIC_PRODUCT.epistemicStatus, "attributed-nondeterministic-inference");
  assert.equal(ATTRIBUTED_WALLET_FORENSIC_PRODUCT.settlementPolicy, "deployment-supplied-never-inferred");
  assert.equal(Object.hasOwn(ATTRIBUTED_WALLET_FORENSIC_PRODUCT, "payTo"), false);
  assert.equal(Object.hasOwn(ATTRIBUTED_WALLET_FORENSIC_PRODUCT, "resourceUrl"), false);
});

test("keeps deterministic observation and attributed interpretation as distinct sovereign products", () => {
  const products = [PUBLIC_EVM_WALLET_OBSERVATION_PRODUCT, ATTRIBUTED_WALLET_FORENSIC_PRODUCT];
  assert.equal(new Set(products.map(({ provider }) => provider)).size, 2);
  assert.equal(new Set(products.map(({ skill }) => skill.id)).size, 2);
  assert.deepEqual(products.map(({ epistemicStatus }) => epistemicStatus), [
    "deterministic-public-observation",
    "attributed-nondeterministic-inference",
  ]);
  assert.ok(products.every((product) => product.custody === "none"));
  assert.ok(products.every((product) => product.settlementPolicy === "deployment-supplied-never-inferred"));
  assert.ok(products.every((product) => !Object.hasOwn(product, "payTo") && !Object.hasOwn(product, "resourceUrl")));
});

test("records only through AGRODAO's settlement-store boundary", async () => {
  const writes = [];
  const store = {
    actor: "urn:ame:agrodao",
    async record(value) { writes.push(value); return { digest: "ni:///sha-256;DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD" }; },
  };
  const recorded = await recordAttributedWalletForensicInterpretation(fixture(), {
    recordedAt: "2026-07-22T12:40:00.000Z", store,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.attributed-wallet-forensic-interpretation");
  assert.equal(writes[0].record.interpretation.id, recorded.result.id);
  await assert.rejects(() => recordAttributedWalletForensicInterpretation(fixture(), {
    recordedAt: "2026-07-22T12:40:00.000Z", store: { ...store, actor: "urn:ame:not-agrodao" },
  }), /AGRODAO's contracted settlement store/u);
});
