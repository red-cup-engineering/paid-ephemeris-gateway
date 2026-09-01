import assert from "node:assert/strict";
import test from "node:test";

import {
  CRYPTO_CAPITAL_OPPORTUNITY_PROFILE,
  evaluateCryptoCapitalOpportunities,
} from "../src/crypto-capital-opportunity.mjs";

const EVALUATED_AT = "2026-09-01T17:00:00.000Z";
const AS_OF = "2026-09-01T16:59:30.000Z";
const MAIN_ACCOUNT = "eip155:8453:0x1111111111111111111111111111111111111111";
const ANOTHER_ACCOUNT = "eip155:8453:0x2222222222222222222222222222222222222222";

function evidence(overrides = {}) {
  return {
    asOf: AS_OF,
    complete: true,
    provenance: ["urn:agrodao:observation:base-block-351"],
    ...overrides,
  };
}

function costs(overrides = {}) {
  return {
    gasBaseUnits: "0",
    slippageBaseUnits: "0",
    feesBaseUnits: "0",
    borrowBaseUnits: "0",
    impermanentLossBaseUnits: "0",
    rewardConversionBaseUnits: "0",
    otherBaseUnits: "0",
    ...overrides,
  };
}

function proposal(proposalId, action, overrides = {}) {
  return {
    proposalId,
    action,
    positionIds: action === "consolidate" || action === "hold"
      ? ["another-btc-liquidity", "main-btc-liquidity"]
      : [action === "harvest" ? "main-btc-liquidity" : "another-btc-liquidity"],
    targetAccount: action === "consolidate" ? MAIN_ACCOUNT : null,
    targetWrapper: action === "hold" ? null : "cbbtc",
    targetVenue: action === "hold" ? null : "moonwell",
    grossBaseAssetGainUnits: "0",
    costs: costs(),
    resultingGrossBaseExposureUnits: action === "hold" ? "380000" : "380350",
    resultingDebtBaseUnits: "200000",
    resultingLeverageBps: action === "hold" ? "6667" : "6000",
    resultingMinimumHealthFactorWad: "1500000000000000000",
    resultingWrapperDivergenceBps: action === "hold" ? "12" : "8",
    resultingDepegLossBps: action === "hold" ? "60" : "40",
    changedRisks: ["wrapper-risk-retained"],
    evidence: evidence(),
    exit: { executable: true, route: ["withdraw-position", "unwrap-to-base"] },
    falsifier: "net BTC accumulation is not positive after measured costs",
    ...overrides,
  };
}

function fixture() {
  return {
    profile: CRYPTO_CAPITAL_OPPORTUNITY_PROFILE,
    evaluatedAt: EVALUATED_AT,
    horizonDays: "365",
    mandate: {
      objective: "stack-sats",
      baseAsset: "BTC",
      allowedWrappers: ["btc", "cbbtc", "tbtc"],
      allowedVenues: ["beefy", "moonwell", "self-custody"],
      minimumRetainedNetBaseUnits: "150000",
      maximumNetExposureReductionBaseUnits: "30000",
      maximumWrapperDivergenceBps: "50",
      maximumDepegLossBps: "200",
      maximumLeverageBps: "7000",
      minimumHealthFactorWad: "1300000000000000000",
      maximumGasBaseUnits: "200",
      maximumSlippageBaseUnits: "150",
      maximumFeesBaseUnits: "100",
      maximumEvidenceAgeSeconds: "120",
      requireExecutableExit: true,
    },
    positions: [
      {
        positionId: "main-btc-liquidity",
        account: MAIN_ACCOUNT,
        wrapper: "cbbtc",
        venue: "moonwell",
        grossBaseExposureUnits: "300000",
        debtBaseUnits: "200000",
        leverageBps: "6667",
        healthFactorWad: "1500000000000000000",
        wrapperDivergenceBps: "8",
        depegLossBps: "40",
        evidence: evidence({ provenance: ["urn:agrodao:observation:main-moonwell"] }),
      },
      {
        positionId: "another-btc-liquidity",
        account: ANOTHER_ACCOUNT,
        wrapper: "tbtc",
        venue: "beefy",
        grossBaseExposureUnits: "80000",
        debtBaseUnits: "0",
        leverageBps: "0",
        healthFactorWad: "999000000000000000000",
        wrapperDivergenceBps: "12",
        depegLossBps: "60",
        evidence: evidence({ provenance: ["urn:agrodao:observation:another-beefy"] }),
      },
    ],
    proposals: [
      proposal("hold-current", "hold"),
      proposal("harvest-well", "harvest", {
        grossBaseAssetGainUnits: "400",
        costs: costs({ gasBaseUnits: "40", rewardConversionBaseUnits: "10" }),
        changedRisks: ["reward-conversion-risk-realized"],
      }),
      proposal("rotate-btc-family-liquidity", "rotate", {
        targetWrapper: "tbtc",
        targetVenue: "beefy",
        grossBaseAssetGainUnits: "1600",
        costs: costs({ gasBaseUnits: "100", slippageBaseUnits: "50", feesBaseUnits: "25", impermanentLossBaseUnits: "100" }),
        resultingGrossBaseExposureUnits: "381325",
        resultingLeverageBps: "3000",
        resultingMinimumHealthFactorWad: "1800000000000000000",
        changedRisks: ["venue-risk-changed", "wrapper-risk-changed"],
      }),
      proposal("consolidate-accounts", "consolidate", {
        grossBaseAssetGainUnits: "1200",
        costs: costs({ gasBaseUnits: "100", slippageBaseUnits: "50", feesBaseUnits: "50" }),
        resultingGrossBaseExposureUnits: "381000",
        resultingLeverageBps: "4000",
        resultingMinimumHealthFactorWad: "1700000000000000000",
        changedRisks: ["account-concentration-increased", "monitoring-burden-reduced"],
      }),
      proposal("unwind-leverage", "unwind", {
        positionIds: ["main-btc-liquidity"],
        targetAccount: MAIN_ACCOUNT,
        targetWrapper: "btc",
        targetVenue: "self-custody",
        grossBaseAssetGainUnits: "600",
        costs: costs({ gasBaseUnits: "100", slippageBaseUnits: "50", feesBaseUnits: "50" }),
        resultingGrossBaseExposureUnits: "355000",
        resultingDebtBaseUnits: "180000",
        resultingLeverageBps: "0",
        resultingMinimumHealthFactorWad: "999000000000000000000",
        resultingWrapperDivergenceBps: "0",
        resultingDepegLossBps: "0",
        changedRisks: ["liquidation-risk-removed", "wrapper-risk-reduced"],
      }),
    ],
  };
}

function byId(result, proposalId) {
  return result.proposals.find((proposalResult) => proposalResult.proposalId === proposalId);
}

test("ranks BTC-family opportunities by net sats rather than headline gain", () => {
  const result = evaluateCryptoCapitalOpportunities(fixture());
  assert.deepEqual(result.ranking, [
    "rotate-btc-family-liquidity",
    "consolidate-accounts",
    "unwind-leverage",
    "harvest-well",
    "hold-current",
  ]);
  assert.equal(result.bestAdmissibleProposalId, "rotate-btc-family-liquidity");
  assert.equal(byId(result, "rotate-btc-family-liquidity").economics.grossBaseAssetGainUnits, "1600");
  assert.equal(byId(result, "rotate-btc-family-liquidity").economics.totalCostsAndDragsBaseUnits, "275");
  assert.equal(byId(result, "rotate-btc-family-liquidity").economics.netBaseAssetGainUnits, "1325");
  assert.equal(result.currentGrossBaseExposureUnits, "380000");
  assert.equal(result.currentDebtBaseUnits, "200000");
  assert.equal(result.currentNetBaseExposureUnits, "180000");
  assert.deepEqual(byId(result, "hold-current").resultingExposure, {
    baseAsset: "BTC",
    grossBaseUnits: "380000",
    debtBaseUnits: "200000",
    netBaseUnits: "180000",
    netReductionBaseUnits: "0",
    leverageBps: "6667",
    minimumHealthFactorWad: "1500000000000000000",
    wrapperDivergenceBps: "12",
    depegLossBps: "60",
  });
  assert.equal(byId(result, "hold-current").admissible, true);
  assert.deepEqual(byId(result, "hold-current").target, { account: null, wrapper: null, venue: null });
  assert.equal(result.decisionBoundary.transactionConstruction, false);
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("evaluates consolidation as one candidate instead of assuming it is desirable", () => {
  const input = fixture();
  const consolidation = input.proposals.find(({ action }) => action === "consolidate");
  consolidation.grossBaseAssetGainUnits = "100";
  consolidation.costs = costs({ gasBaseUnits: "150", slippageBaseUnits: "50" });
  const result = evaluateCryptoCapitalOpportunities(input);
  assert.equal(byId(result, "consolidate-accounts").admissible, false);
  assert.deepEqual(byId(result, "consolidate-accounts").refusalReasons, ["negative-net-base-asset-gain"]);
  assert.equal(byId(result, "consolidate-accounts").rank, null);
});

test("subtracts debt before applying the retained-sats mandate", () => {
  const input = fixture();
  input.mandate.minimumRetainedNetBaseUnits = "175000";
  input.mandate.maximumNetExposureReductionBaseUnits = null;
  const rotate = input.proposals.find(({ action }) => action === "rotate");
  rotate.resultingGrossBaseExposureUnits = "300000";
  rotate.resultingDebtBaseUnits = "200000";
  const evaluated = byId(evaluateCryptoCapitalOpportunities(input), rotate.proposalId);
  assert.equal(evaluated.resultingExposure.grossBaseUnits, "300000");
  assert.equal(evaluated.resultingExposure.debtBaseUnits, "200000");
  assert.equal(evaluated.resultingExposure.netBaseUnits, "100000");
  assert.deepEqual(evaluated.refusalReasons, ["minimum-retained-exposure-violated"]);
});

test("refuses stale or incomplete evidence and an unavailable exit", () => {
  const input = fixture();
  const harvest = input.proposals.find(({ action }) => action === "harvest");
  harvest.evidence = evidence({ asOf: "2026-09-01T16:00:00.000Z", complete: false });
  harvest.exit.executable = false;
  const result = evaluateCryptoCapitalOpportunities(input);
  assert.deepEqual(byId(result, "harvest-well").refusalReasons, [
    "executable-exit-missing",
    "proposal-evidence-incomplete",
    "proposal-evidence-stale",
  ]);
});

test("requires fresh complete evidence for the whole portfolio, not only mutated legs", () => {
  const input = fixture();
  input.positions.find(({ positionId }) => positionId === "another-btc-liquidity").evidence = evidence({
    asOf: "2026-09-01T16:00:00.000Z",
    complete: false,
    provenance: ["urn:agrodao:observation:another-stale"],
  });
  const harvest = input.proposals.find(({ action }) => action === "harvest");
  assert.deepEqual(harvest.positionIds, ["main-btc-liquidity"]);
  assert.deepEqual(
    byId(evaluateCryptoCapitalOpportunities(input), harvest.proposalId).refusalReasons,
    ["position-evidence-incomplete", "position-evidence-stale"],
  );
});

test("refuses disallowed venues, excessive exposure loss, and unsafe leverage or health", () => {
  const input = fixture();
  const rotate = input.proposals.find(({ action }) => action === "rotate");
  Object.assign(rotate, {
    targetWrapper: "unknown-wrapped-btc",
    targetVenue: "unknown-farm",
    resultingGrossBaseExposureUnits: "300000",
    resultingLeverageBps: "9000",
    resultingMinimumHealthFactorWad: "1100000000000000000",
    resultingWrapperDivergenceBps: "70",
    resultingDepegLossBps: "250",
  });
  rotate.costs = costs({ gasBaseUnits: "201", slippageBaseUnits: "151", feesBaseUnits: "101" });
  const refusalReasons = byId(evaluateCryptoCapitalOpportunities(input), rotate.proposalId).refusalReasons;
  assert.deepEqual(refusalReasons, [
    "depeg-loss-exceeded",
    "exposure-reduction-tolerance-exceeded",
    "fee-cap-exceeded",
    "gas-cap-exceeded",
    "health-factor-too-low",
    "leverage-exceeded",
    "minimum-retained-exposure-violated",
    "slippage-cap-exceeded",
    "venue-not-allowed",
    "wrapper-divergence-exceeded",
    "wrapper-not-allowed",
  ]);
});

test("keeps account identity independent of credential aliases and rejects secret material", () => {
  const input = fixture();
  input.positions[0].credentialEnvAlias = "MAIN_WALLET";
  assert.throws(
    () => evaluateCryptoCapitalOpportunities(input),
    /credential, secret, or transaction material/u,
  );
});

test("is deterministic across caller ordering while preserving ordered exit steps", () => {
  const first = fixture();
  const second = fixture();
  second.positions.reverse();
  second.proposals.reverse();
  second.mandate.allowedWrappers.reverse();
  const firstResult = evaluateCryptoCapitalOpportunities(first);
  const secondResult = evaluateCryptoCapitalOpportunities(second);
  assert.equal(firstResult.id, secondResult.id);
  assert.deepEqual(
    byId(firstResult, "unwind-leverage").exit.route,
    ["withdraw-position", "unwrap-to-base"],
  );
});
