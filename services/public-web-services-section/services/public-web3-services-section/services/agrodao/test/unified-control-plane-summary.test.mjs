import assert from "node:assert/strict";
import test from "node:test";

import { summarizeUnifiedAgroControlPlane } from "../src/unified-control-plane-summary.mjs";

function treasuryDisclosure() {
  return { id: "ni:///sha-256;portfolio", opportunities: {
    enrollment: { account: "michael561", status: "public-observation-enrolled" },
    hiveEngineLiquidity: {
      type: "NormalizedEarningOpportunity", id: "hive-engine:marketpools:SWAP.HIVE:DEC:michael561",
      chain: "hive:mainnet/hive-engine", account: "michael561", provider: "Hive Engine marketpools",
      mechanism: "constant-product liquidity provision", underlyings: ["SWAP.HIVE", "DEC"],
      apy: { availability: "unavailable", value: null, unit: "fraction-per-year",
        denomination: "SWAP.HIVE:DEC pool-share value", method: "fee series unavailable",
        reason: "the public table has no time-bounded fee series" },
      liquidity: { capacity: { "SWAP.HIVE": "100", DEC: "200", totalShares: "300" },
        accountAvailable: { "SWAP.HIVE": "1", DEC: "2" } },
      changedRisks: ["impermanent loss", "sidechain availability"],
      exit: { operation: "Hive Engine marketpools removeLiquidity", receives: ["SWAP.HIVE", "DEC"],
        constraints: ["separate active-authority transaction"] },
      freshness: { observedAt: "2026-09-01T22:30:00.000Z", chainBoundary: { blockNumber: 1 },
        provenance: [{ endpoint: "https://api.hive-engine.com/rpc/contracts", method: "find" }] },
    },
  } };
}

function fixedForkObservation() {
  return { id: "ni:///sha-256;fork", outcome: "completed-fixed-fork-beefy-vault-exit-observation",
    gate: { executionAdmitted: false, transactionAssembly: false, outputCalldata: false, signing: false,
      broadcast: false, chainMutation: false }, candidates: [{ candidateId: "sigmund-beefy-tbtc-cbbtc",
      sourcePosition: { source: "0xsource", vault: "0xvault", lpToken: "0xpool" },
      outputs: [{ token: "tBTC", amount: "10" }, { token: "cbBTC", amount: "20" }],
      fullConversionStatus: "completed", fullConversionVerified: true,
      fullConversion: { receiptVerified: true, pool: "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e",
        tbtcInput: "10", cbbtcQuotedSats: "99558", cbbtcReceivedSats: "99558", tbtcResidual: "0" },
      repaymentVerified: true, repayment: { receiptVerified: true, repaymentSats: "99558",
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
  assert.equal(summary.opportunities[0].apy.denomination, "SWAP.HIVE:DEC pool-share value");
  assert.deepEqual(summary.opportunities[0].capacity, { "SWAP.HIVE": "100", DEC: "200", totalShares: "300" });
  assert.equal(summary.recoveries[0].fullConversion.cbbtcReceivedSats, "99558");
  assert.equal(summary.recoveries[0].repayment.debtAfterSats, "175010");
  assert.equal(summary.recoveries[0].health.targetHealthFactorWad, "1200000000000000000");
  assert.equal(summary.recoveries[0].health.scenarios.length, 2);
  assert.equal(summary.humanReviewActionCards.length, 1);
  assert.match(summary.humanReviewActionCards[0].action, /full tBTC output.*existing same-underlying Moonwell cbBTC debt/u);
  assert.deepEqual(summary.authority, { humanDecisionOnly: true, executionAdmitted: false,
    transactionAssembly: false, outputCalldata: false, signing: false, broadcast: false, chainMutation: false });
});

test("refuses widened execution authority or incomplete repayment evidence", () => {
  const widened = fixedForkObservation(); widened.gate.executionAdmitted = true;
  assert.throws(() => summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: widened }), /must be false/u);
  const incomplete = fixedForkObservation(); incomplete.candidates[0].repayment.debtDeltaSats = "1";
  assert.throws(() => summarizeUnifiedAgroControlPlane({ treasuryDisclosure: treasuryDisclosure(),
    fixedForkObservation: incomplete }), /lacks conserved/u);
});

