import assert from "node:assert/strict";
import test from "node:test";

import { EXPECTED_DELEVERAGE_STEPS } from "../src/cross-wallet-deleverage-assay.mjs";
import {
  evaluateWalletSegregatedDeleverageIntent,
  recordWalletSegregatedDeleverageIntent,
  WALLET_SEGREGATED_DELEVERAGE_INTENT_PROFILE,
} from "../src/wallet-segregated-deleverage-intent.mjs";

function fixture() {
  return {
    profile: WALLET_SEGREGATED_DELEVERAGE_INTENT_PROFILE,
    evaluatedAt: "1784734750",
    evidence: {
      crossWalletAssayId: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      currentPreflightId: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      snapshot: {
        caip2: "eip155:8453",
        block: "48972555",
        blockHash: `0x${"ab".repeat(32)}`,
        observedAt: "1784734457",
        expiresAt: "1784735057",
      },
    },
    wallets: {
      source: { id: "SIGMUND", account: "eip155:8453:0x32886f6f361c1d570255c2762967a2e41d0e9b1a" },
      target: { id: "YANAGI", account: "eip155:8453:0x224c08a8526751887a83e2711b167f890c6d078d" },
    },
    action: {
      asset: "eip155:8453/erc20:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
      purpose: "repay-moonwell-cbbtc-debt",
      grossExitSats: "99484",
      principalSats: "99424",
      conversionLossSats: "60",
      gasSatsCeil: "19",
      externalDebtBeforeSats: "273464",
      externalDebtAfterSats: "174040",
      healthBeforeWad: "1059729472386544000",
      healthAfterWad: "1665122157990465000",
      healthTargetWad: "1500000000000000000",
      healthStressScenarios: [
        { name: "cbbtc-interest-30-days", healthFactorWad: "1663741621731393000" },
        { name: "lbtc-collateral-haircut-10-percent", healthFactorWad: "1508770239230175000" },
        { name: "lbtc-down-5-cbbtc-up-2-percent", healthFactorWad: "1555829606498093000" },
      ],
      annualBeefyYieldForegoneSats: "1055",
      annualDebtInterestSavedSats: "1003",
      maximumAllInDragBps: "25",
      routeSteps: [...EXPECTED_DELEVERAGE_STEPS],
    },
    accounting: {
      classification: "btc-denominated-inter-wallet-receivable",
      receivableHolder: "SIGMUND",
      payableOwedBy: "YANAGI",
      receivableSats: "99424",
      payableSats: "99424",
      internalCompensationStatus: "unpriced-risk-reduction",
      separateWalletBooks: true,
      taxLotCaptureRequired: true,
    },
    preflight: {
      positionStillOwned: true,
      fixedForkAtHead: true,
      contractUnchanged: true,
      outputVerified: true,
      gasEstimated: true,
      priceFresh: true,
      headFresh: true,
      legalScopeDisclosed: true,
      taxRecordkeepingReady: true,
    },
    authority: {
      publicEvidenceOnly: true,
      intentOnly: true,
      transactionAssembly: false,
      signerMaterialPresent: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
  };
}

function assertNoNumericValues(value) {
  assert.notEqual(typeof value, "number");
  assert.notEqual(typeof value, "bigint");
  if (Array.isArray(value)) value.forEach(assertNoNumericValues);
  else if (value != null && typeof value === "object") Object.values(value).forEach(assertNoNumericValues);
}

test("preserves two wallet books and consolidates the proven BTC deleverage", () => {
  const result = evaluateWalletSegregatedDeleverageIntent(fixture());
  assert.equal(result.verdict, "HUMAN_REVIEW_READY");
  assert.equal(result.accounting.sourceWallet.externalBtcPositionDeltaSats, "-99484");
  assert.equal(result.accounting.sourceWallet.interWalletReceivableDeltaSats, "99424");
  assert.equal(result.accounting.sourceWallet.netWorthDeltaSatsEquivalent, "-79");
  assert.equal(result.accounting.targetWallet.externalMoonwellDebtDeltaSats, "-99424");
  assert.equal(result.accounting.targetWallet.interWalletPayableDeltaSats, "99424");
  assert.equal(result.accounting.targetWallet.netWorthDeltaSatsEquivalent, "0");
  assert.equal(result.accounting.consolidated.interWalletEliminationSats, "99424");
  assert.equal(result.accounting.consolidated.netWorthDeltaSatsEquivalent, "-79");
  assert.equal(result.economics.allInDragBpsCeil, "8");
  assert.equal(result.economics.annualCarryChangeBeforeRedeploymentSats, "-52");
  assert.equal(result.gate.executionAdmitted, false);
  assertNoNumericValues(result);
});

test("expired or incomplete current evidence requires refresh without losing the ledger plan", () => {
  const atExpiry = fixture(); atExpiry.evaluatedAt = atExpiry.evidence.snapshot.expiresAt;
  const atExpiryResult = evaluateWalletSegregatedDeleverageIntent(atExpiry);
  assert.equal(atExpiryResult.verdict, "REFRESH_REQUIRED");
  assert.deepEqual(atExpiryResult.gate.reasons, ["evidence-window-expired"]);
  const expired = fixture(); expired.evaluatedAt = "1784735058";
  const expiredResult = evaluateWalletSegregatedDeleverageIntent(expired);
  assert.equal(expiredResult.verdict, "REFRESH_REQUIRED");
  assert.deepEqual(expiredResult.gate.reasons, ["evidence-window-expired"]);
  const incomplete = fixture(); incomplete.preflight.fixedForkAtHead = false; incomplete.preflight.priceFresh = false;
  const incompleteResult = evaluateWalletSegregatedDeleverageIntent(incomplete);
  assert.equal(incompleteResult.verdict, "REFRESH_REQUIRED");
  assert.deepEqual(incompleteResult.gate.reasons, ["current-preflight-incomplete"]);
});

test("risk deterioration refuses the intent before any execution boundary", () => {
  const health = fixture(); health.action.healthStressScenarios[1].healthFactorWad = "1499999999999999999";
  assert.equal(evaluateWalletSegregatedDeleverageIntent(health).verdict, "REFUSE");
  const drag = fixture(); drag.action.gasSatsCeil = "1000";
  assert.equal(evaluateWalletSegregatedDeleverageIntent(drag).verdict, "REFUSE");
});

test("refuses any hidden donation, debt mismatch, or unaccounted conversion loss", () => {
  const donation = fixture(); donation.accounting.receivableSats = "0";
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(donation), /must be positive/u);
  const payable = fixture(); payable.accounting.payableSats = "99423";
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(payable), /must both equal principal/u);
  const debt = fixture(); debt.action.externalDebtAfterSats = "174041";
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(debt), /debt reduction must equal principal/u);
  const loss = fixture(); loss.action.conversionLossSats = "59";
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(loss), /principal plus conversion loss/u);
});

test("refuses same-wallet funding, route drift, numbers, secrets, and transaction material", () => {
  const same = fixture(); same.wallets.target.account = same.wallets.source.account;
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(same), /must be distinct/u);
  const route = fixture(); [route.action.routeSteps[0], route.action.routeSteps[1]] = [route.action.routeSteps[1], route.action.routeSteps[0]];
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(route), /ordered semantic/u);
  const numeric = fixture(); numeric.action.principalSats = 99424;
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(numeric), /decimal text/u);
  const secret = fixture(); secret.privateKey = "not-a-key";
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(secret), /secret or transaction material/u);
  const tx = fixture(); tx.action.transactionRequest = {};
  assert.throws(() => evaluateWalletSegregatedDeleverageIntent(tx), /secret or transaction material/u);
});

test("identity is deterministic across object-key order", () => {
  const input = fixture();
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.equal(evaluateWalletSegregatedDeleverageIntent(input).id, evaluateWalletSegregatedDeleverageIntent(reordered).id);
});

test("records only through AGRODAO's append-only settlement boundary", async () => {
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return { digest: "ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" }; } };
  const recorded = await recordWalletSegregatedDeleverageIntent(fixture(), { recordedAt: "2026-07-22T16:00:00.000Z", store });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.wallet-segregated-deleverage-intent");
  assert.equal(writes[0].record.decision.id, recorded.result.id);
  assert.equal(writes[0].record.decisionBoundary.executionAdmitted, false);
  await assert.rejects(() => recordWalletSegregatedDeleverageIntent(fixture(), {
    recordedAt: "2026-07-22T16:00:00.000Z", store: { ...store, actor: "urn:ame:not-agrodao" },
  }), /AGRODAO's contracted/u);
});
