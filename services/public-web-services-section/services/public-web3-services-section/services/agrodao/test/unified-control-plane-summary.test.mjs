import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUnifiedAgroActionArming, summarizeUnifiedAgroControlPlane } from "../src/unified-control-plane-summary.mjs";

function treasuryDisclosure() {
  return { id: "ni:///sha-256;portfolio", opportunities: {
    enrollment: { account: "michael561", status: "public-observation-enrolled" },
    hiveEngineLiquidity: {
      type: "NormalizedEarningOpportunity", id: "hive-engine:marketpools:ZING:SWAP.HIVE:michael561",
      chain: "hive:mainnet/hive-engine", account: "michael561", provider: "Hive Engine marketpools",
      mechanism: "constant-product liquidity provision", underlyings: ["ZING", "SWAP.HIVE"],
      apy: { availability: "unavailable", value: null, unit: "fraction-per-year",
        denomination: "ZING:SWAP.HIVE pool-share value", method: "fee series unavailable",
        reason: "the public table has no time-bounded fee series" },
      liquidity: { capacity: { ZING: "100", "SWAP.HIVE": "200", totalShares: "300" },
        accountAvailable: { ZING: "1", "SWAP.HIVE": "2" } },
      changedRisks: ["impermanent loss", "sidechain availability"],
      exit: { operation: "Hive Engine marketpools removeLiquidity", receives: ["ZING", "SWAP.HIVE"],
        constraints: ["separate active-authority transaction"] },
      freshness: { observedAt: "2026-09-01T22:30:00.000Z", chainBoundary: { blockNumber: 1 },
        provenance: [{ endpoint: "https://api.hive-engine.com/rpc/contracts", method: "find" }] },
    },
  } };
}

function fixedForkObservation() {
  return { id: "ni:///sha-256;fork", outcome: "completed-fixed-fork-beefy-vault-exit-observation",
    chain: "eip155:8453", block: "50761308", blockHash: `0x${"1".repeat(64)}`, timestamp: "1788300000",
    gate: { executionAdmitted: false, transactionAssembly: false, outputCalldata: false, signing: false,
      broadcast: false, chainMutation: false }, candidates: [{ candidateId: "sigmund-beefy-tbtc-cbbtc",
      sourcePosition: { source: "0x32886f6f361c1d570255c2762967a2e41d0e9b1a",
        rewardPool: "0xcd241a97ac92c3415fefbe6f3d61a27b2c30ace7",
        vault: "0x64af54612646cce0657374226e38b82b8001e674",
        lpToken: "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e",
        stakedVaultSharesExited: "100", directVaultSharesBurned: "200", lpBurned: "300" },
      outputs: [{ token: "0x236aa50979d5f3de3bd1eeb40e81137f22ab794b", amount: "10" },
        { token: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", amount: "20" }], routeGasUsed: "50135",
      fullConversionStatus: "completed", fullConversionVerified: true,
      fullConversion: { receiptVerified: true, pool: "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e",
        tbtcInput: "10", cbbtcQuotedSats: "99558", cbbtcReceivedSats: "99558", tbtcResidual: "0" },
      repaymentVerified: true, repayment: { receiptVerified: true,
        target: "0x224c08a8526751887a83e2711b167f890c6d078d",
        market: "0xf877acafa28c19b96727966690b2f44d35ad5976", repaymentSats: "99558",
        debtBeforeSats: "274568", debtAfterSats: "175010", debtDeltaSats: "99558",
        sourceCbBtcResidualSats: "0", targetCbBtcAllowanceSats: "0" },
      healthVerified: true, health: { targetHealthFactorWad: "1200000000000000000",
        currentHealthFactorWad: "1300000000000000000", scenarios: [
          { id: "lbtc-collateral-haircut-10-percent", healthFactorWad: "1240000000000000000" },
          { id: "lbtc-down-5-cbbtc-up-2-percent", healthFactorWad: "1210000000000000000" }],
        allScenariosMeetTarget: true },
    }] };
}

test("compares the normalized Hive opportunity with the full fixed-fork recovery and emits one review card", () => {
  const summary = summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: fixedForkObservation() });
  assert.equal(summary.opportunities[0].account, "michael561");
  assert.equal(summary.opportunities[0].apy.value, null);
  assert.equal(summary.opportunities[0].apy.denomination, "ZING:SWAP.HIVE pool-share value");
  assert.deepEqual(summary.opportunities[0].capacity, { ZING: "100", "SWAP.HIVE": "200", totalShares: "300" });
  assert.equal(summary.recoveries[0].fullConversion.cbbtcReceivedSats, "99558");
  assert.equal(summary.recoveries[0].repayment.debtAfterSats, "175010");
  assert.equal(summary.recoveries[0].health.targetHealthFactorWad, "1200000000000000000");
  assert.equal(summary.recoveries[0].health.scenarios.length, 2);
  assert.equal(summary.humanReviewActionCards.length, 1);
  assert.equal(summary.humanReviewActionCards[0].status, "fresh-preflight-required");
  assert.equal(summary.humanReviewActionCards[0].armingEnvelope.ceilings.maximumSlippageBps, "50");
  assert.equal(summary.humanReviewActionCards[0].armingEnvelope.ceilings.minimumCbBtcReceivedSats, "99060");
  assert.equal(summary.humanReviewActionCards[0].armingEnvelope.ceilings.maximumGasUnits, "50135");
  assert.equal(summary.humanReviewActionCards[0].conceptualOperations.length, 9);
  assert.equal(summary.humanReviewActionCards[0].reconciliation.postconditions.targetCbBtcAllowanceSats, "0");
  assert.match(summary.humanReviewActionCards[0].action, /full tBTC output.*existing same-underlying Moonwell cbBTC debt/u);
  assert.deepEqual(summary.authority, { humanDecisionOnly: true, freshPreflightRequired: true,
    separateHumanTransactionAuthorizationRequired: true, executionAdmitted: false,
    transactionAssembly: false, outputCalldata: false, signing: false, broadcast: false, chainMutation: false });
});

test("pre-arm contract refuses the expired fork, drift, slippage-policy changes, and health below 1.2", () => {
  const observation = fixedForkObservation();
  const card = summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: observation }).humanReviewActionCards[0];
  const boundary = { chain: observation.chain, block: observation.block, blockHash: observation.blockHash };
  assert.deepEqual(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: observation,
    currentBoundary: boundary }).reasons, ["refreshed-boundary-required"]);
  const stale = { ...boundary, block: "50761309" };
  assert.ok(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: observation,
    currentBoundary: stale }).reasons.includes("stale-observed-boundary"));
  assert.ok(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: observation,
    currentBoundary: boundary, humanParameters: { maximumSlippageBps: "25" } }).reasons.includes("maximumSlippageBps-policy-drift"));
  const drifted = fixedForkObservation(); drifted.candidates[0].repayment.debtBeforeSats = "274569";
  assert.ok(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: drifted,
    currentBoundary: boundary }).reasons.includes("target-drift"));
  const lowHealth = fixedForkObservation(); lowHealth.candidates[0].health.currentHealthFactorWad = "1199999999999999999";
  assert.ok(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: lowHealth,
    currentBoundary: boundary }).reasons.includes("refreshed-evidence-invalid"));
  const refreshed = fixedForkObservation(); refreshed.block = "50761309"; refreshed.blockHash = `0x${"2".repeat(64)}`;
  assert.deepEqual(evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation: refreshed,
    currentBoundary: { chain: refreshed.chain, block: refreshed.block, blockHash: refreshed.blockHash } }), {
    status: "human-transaction-authorization-required", reasons: [], freshPreflightAdmitted: true,
    humanTransactionAuthorizationPresent: false, armingAdmitted: false, oneUse: true,
    executionAdmitted: false, transactionAssembly: false, outputCalldata: false, signing: false,
    broadcast: false, chainMutation: false,
  });
});

test("refuses widened execution authority or incomplete repayment evidence", () => {
  const widened = fixedForkObservation(); widened.gate.executionAdmitted = true;
  assert.throws(() => summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: widened }), /must be false/u);
  const incomplete = fixedForkObservation(); incomplete.candidates[0].repayment.debtDeltaSats = "1";
  assert.throws(() => summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: incomplete }), /lacks conserved/u);
});
