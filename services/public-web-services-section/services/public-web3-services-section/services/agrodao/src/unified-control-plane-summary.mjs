import { EXPECTED_DELEVERAGE_STEPS } from "./cross-wallet-deleverage-assay.mjs";

const HIVE_ACCOUNT = "michael561";
const FIXED_FORK_CANDIDATE = "sigmund-beefy-tbtc-cbbtc";
const TARGET_HEALTH_FACTOR_WAD = "1200000000000000000";
const MAXIMUM_SLIPPAGE_BPS = "50";
const AERODROME_STABLE_POOL = "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e";
const BASE_CHAIN = "eip155:8453";
const SIGMUND_SOURCE = "0x32886f6f361c1d570255c2762967a2e41d0e9b1a";
const SIGMUND_REWARD_POOL = "0xcd241a97ac92c3415fefbe6f3d61a27b2c30ace7";
const SIGMUND_VAULT = "0x64af54612646cce0657374226e38b82b8001e674";
const TBTC = "0x236aa50979d5f3de3bd1eeb40e81137f22ab794b";
const CBBTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";
const YANAGI_TARGET = "0x224c08a8526751887a83e2711b167f890c6d078d";
const MOONWELL_CBBTC_MARKET = "0xf877acafa28c19b96727966690b2f44d35ad5976";

function object(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function assertNoExecutionAuthority(authority, label) {
  object(authority, label);
  for (const key of ["executionAdmitted", "transactionAssembly", "outputCalldata", "signing", "broadcast", "chainMutation"]) {
    if (authority[key] !== false) throw new TypeError(`${label}.${key} must be false`);
  }
}

function hiveOpportunity(disclosure) {
  const opportunity = object(disclosure?.opportunities?.hiveEngineLiquidity, "treasuryDisclosure.opportunities.hiveEngineLiquidity");
  if (opportunity.type !== "NormalizedEarningOpportunity" || opportunity.account !== HIVE_ACCOUNT
      || opportunity.apy?.unit !== "fraction-per-year" || typeof opportunity.apy?.denomination !== "string"
      || opportunity.liquidity?.capacity == null || !Array.isArray(opportunity.changedRisks)
      || opportunity.exit?.operation == null || !Array.isArray(opportunity.freshness?.provenance)) {
    throw new TypeError("treasury disclosure lacks the normalized michael561 Hive opportunity contract");
  }
  if (disclosure.opportunities.enrollment?.account !== HIVE_ACCOUNT
      || disclosure.opportunities.enrollment?.status !== "public-observation-enrolled") {
    throw new TypeError("michael561 public opportunity enrollment is missing");
  }
  return opportunity;
}

function fixedForkRecovery(observation) {
  object(observation, "fixedForkObservation");
  if (observation.outcome !== "completed-fixed-fork-beefy-vault-exit-observation") {
    throw new TypeError("fixed-fork observation is incomplete");
  }
  assertNoExecutionAuthority(observation.gate, "fixedForkObservation.gate");
  const matches = observation.candidates?.filter(({ candidateId }) => candidateId === FIXED_FORK_CANDIDATE) ?? [];
  if (matches.length !== 1) throw new TypeError(`fixed-fork observation must contain exactly one ${FIXED_FORK_CANDIDATE} result`);
  const candidate = matches[0];
  if (observation.chain !== BASE_CHAIN || !/^(?:0|[1-9][0-9]*)$/u.test(observation.block)
      || !/^0x[0-9a-f]{64}$/u.test(observation.blockHash) || !/^(?:0|[1-9][0-9]*)$/u.test(observation.timestamp)
      || candidate.sourcePosition?.source?.toLowerCase() !== SIGMUND_SOURCE
      || candidate.sourcePosition?.rewardPool?.toLowerCase() !== SIGMUND_REWARD_POOL
      || candidate.sourcePosition?.vault?.toLowerCase() !== SIGMUND_VAULT
      || candidate.sourcePosition?.lpToken?.toLowerCase() !== AERODROME_STABLE_POOL
      || candidate.repayment?.target?.toLowerCase() !== YANAGI_TARGET
      || candidate.repayment?.market?.toLowerCase() !== MOONWELL_CBBTC_MARKET
      || candidate.outputs?.find(({ token }) => token.toLowerCase() === TBTC) == null
      || candidate.outputs?.find(({ token }) => token.toLowerCase() === CBBTC) == null
      || !/^[1-9][0-9]*$/u.test(candidate.routeGasUsed)
      || candidate.fullConversionStatus !== "completed" || candidate.fullConversionVerified !== true
      || candidate.fullConversion?.receiptVerified !== true || candidate.fullConversion?.tbtcResidual !== "0"
      || candidate.fullConversion?.pool?.toLowerCase() !== AERODROME_STABLE_POOL
      || candidate.repaymentVerified !== true || candidate.repayment?.receiptVerified !== true
      || candidate.repayment?.debtDeltaSats !== candidate.repayment?.repaymentSats
      || candidate.repayment?.sourceCbBtcResidualSats !== "0" || candidate.repayment?.targetCbBtcAllowanceSats !== "0"
      || candidate.healthVerified !== true || candidate.health?.targetHealthFactorWad !== TARGET_HEALTH_FACTOR_WAD
      || candidate.health?.allScenariosMeetTarget !== true || !Array.isArray(candidate.health?.scenarios)
      || candidate.health.scenarios.length < 1
      || BigInt(candidate.health.currentHealthFactorWad) < BigInt(TARGET_HEALTH_FACTOR_WAD)
      || candidate.health.scenarios.some(({ healthFactorWad }) => BigInt(healthFactorWad) < BigInt(TARGET_HEALTH_FACTOR_WAD))) {
    throw new TypeError("fixed-fork recovery lacks conserved conversion, repayment, or target-health evidence");
  }
  return candidate;
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function preArmSnapshot(observation, recovery) {
  const tbtcOutput = recovery.outputs.find(({ token }) => token.toLowerCase() === TBTC);
  const cbbtcOutput = recovery.outputs.find(({ token }) => token.toLowerCase() === CBBTC);
  return Object.freeze({
    chain: observation.chain,
    candidateId: recovery.candidateId,
    observedBoundary: Object.freeze({ block: observation.block, blockHash: observation.blockHash, timestamp: observation.timestamp }),
    source: Object.freeze({ account: recovery.sourcePosition.source, rewardPool: recovery.sourcePosition.rewardPool,
      vault: recovery.sourcePosition.vault, lpToken: recovery.sourcePosition.lpToken,
      stakedVaultShares: recovery.sourcePosition.stakedVaultSharesExited,
      directVaultShares: recovery.sourcePosition.directVaultSharesBurned, lpAmount: recovery.sourcePosition.lpBurned }),
    target: Object.freeze({ account: recovery.repayment.target, moonwellMarket: recovery.repayment.market,
      debtSats: recovery.repayment.debtBeforeSats }),
    assets: Object.freeze({ tbtc: TBTC, cbbtc: CBBTC, tbtcFromExitRaw: tbtcOutput.amount,
      cbbtcFromExitSats: cbbtcOutput.amount, tbtcConversionInputRaw: recovery.fullConversion.tbtcInput,
      cbbtcQuoteSats: recovery.fullConversion.cbbtcQuotedSats, cbbtcRepaymentSats: recovery.repayment.repaymentSats }),
    venue: Object.freeze({ name: "Aerodrome stable pool", pool: recovery.fullConversion.pool }),
    projectedHealth: Object.freeze({ policyMinimumWad: TARGET_HEALTH_FACTOR_WAD,
      currentWad: recovery.health.currentHealthFactorWad, stressScenarios: recovery.health.scenarios }),
  });
}

function armingRefusalReasons(card, observation, currentBoundary, suppliedMaximumSlippageBps) {
  const reasons = [];
  let recovery;
  try { recovery = fixedForkRecovery(observation); } catch { reasons.push("refreshed-evidence-invalid"); return reasons; }
  const refreshed = preArmSnapshot(observation, recovery);
  if (currentBoundary?.chain !== observation.chain || currentBoundary?.block !== observation.block
      || currentBoundary?.blockHash?.toLowerCase() !== observation.blockHash.toLowerCase()) reasons.push("stale-observed-boundary");
  if (BigInt(observation.block) <= BigInt(card.armingEnvelope.expiry.validThroughBlock)) {
    reasons.push("refreshed-boundary-required");
  }
  const expected = card.armingEnvelope.expectedPreArmSnapshot;
  for (const field of ["chain", "candidateId", "source", "target", "assets", "venue"]) {
    if (!same(refreshed[field], expected[field])) reasons.push(`${field}-drift`);
  }
  if (BigInt(recovery.routeGasUsed) > BigInt(card.armingEnvelope.ceilings.maximumGasUnits)) reasons.push("gas-ceiling-exceeded");
  if (card.armingEnvelope.ceilings.maximumSlippageBps !== MAXIMUM_SLIPPAGE_BPS
      || (suppliedMaximumSlippageBps != null && suppliedMaximumSlippageBps !== MAXIMUM_SLIPPAGE_BPS)) {
    reasons.push("maximumSlippageBps-policy-drift");
  }
  if (BigInt(refreshed.projectedHealth.currentWad) < BigInt(TARGET_HEALTH_FACTOR_WAD)
      || refreshed.projectedHealth.stressScenarios.some(({ healthFactorWad }) => BigInt(healthFactorWad) < BigInt(TARGET_HEALTH_FACTOR_WAD))) {
    reasons.push("projected-health-factor-below-policy");
  }
  return reasons;
}

export function evaluateUnifiedAgroActionArming({ card, refreshedFixedForkObservation, currentBoundary, humanParameters = {} }) {
  object(card, "card");
  if (card.id !== "review-sigmund-full-cbbtc-repayment" || card.armingEnvelope?.singleUse !== true) {
    throw new TypeError("card is not the bounded unified AGRO action card");
  }
  const reasons = armingRefusalReasons(card, refreshedFixedForkObservation, currentBoundary,
    humanParameters.maximumSlippageBps);
  return Object.freeze({
    status: reasons.length === 0 ? "human-transaction-authorization-required" : "refused",
    reasons: Object.freeze(reasons),
    freshPreflightAdmitted: reasons.length === 0,
    humanTransactionAuthorizationPresent: false,
    armingAdmitted: false,
    oneUse: true,
    executionAdmitted: false,
    transactionAssembly: false,
    outputCalldata: false,
    signing: false,
    broadcast: false,
    chainMutation: false,
  });
}

export function summarizeUnifiedAgroControlPlane({ treasuryDisclosure, fixedForkObservation }) {
  const opportunity = hiveOpportunity(treasuryDisclosure);
  const recovery = fixedForkRecovery(fixedForkObservation);
  const expectedPreArmSnapshot = preArmSnapshot(fixedForkObservation, recovery);
  const minimumCbBtcReceivedSats = (BigInt(recovery.fullConversion.cbbtcQuotedSats)
    * (10_000n - BigInt(MAXIMUM_SLIPPAGE_BPS)) / 10_000n).toString();
  const card = Object.freeze({
    id: "review-sigmund-full-cbbtc-repayment",
    status: "fresh-preflight-required",
    action: "Review the fixed-fork evidence for exiting SIGMUND's Beefy tBTC/cbBTC position, converting the full tBTC output through the observed Aerodrome stable pool, and applying all resulting cbBTC to the existing same-underlying Moonwell cbBTC debt.",
    evidence: Object.freeze({
      fixedForkObservation: fixedForkObservation.id,
      candidateId: recovery.candidateId,
      conversionVenue: "Aerodrome stable pool",
      conversionPool: recovery.fullConversion.pool,
      cbbtcReceivedSats: recovery.fullConversion.cbbtcReceivedSats,
      repaymentSats: recovery.repayment.repaymentSats,
      debtBeforeSats: recovery.repayment.debtBeforeSats,
      debtAfterSats: recovery.repayment.debtAfterSats,
      targetHealthFactorWad: recovery.health.targetHealthFactorWad,
      projectedCurrentHealthFactorWad: recovery.health.currentHealthFactorWad,
      projectedStressHealthFactors: recovery.health.scenarios,
    }),
    armingEnvelope: Object.freeze({
      singleUse: true,
      replayProtection: "consume-once-by-fixed-fork-observation-id-and-refreshed-boundary",
      expectedPreArmSnapshot,
      expiry: Object.freeze({ validThroughBlock: fixedForkObservation.block,
        validThroughBlockHash: fixedForkObservation.blockHash, refreshedBoundaryRequiredAfterExpiry: true }),
      ceilings: Object.freeze({ maximumGasUnits: recovery.routeGasUsed,
        gasCeilingSource: "fixed-fork-route-gas-used", maximumSlippageBps: MAXIMUM_SLIPPAGE_BPS,
        minimumCbBtcReceivedSats, slippageCeilingSource: "founder-delegated-policy" }),
      refuseBeforeArmingOn: Object.freeze(["stale-observed-boundary", "chain-or-candidate-drift", "contract-drift",
        "source-balance-drift", "target-debt-drift", "quote-drift", "gas-ceiling-exceeded",
        "maximumSlippageBps-policy-drift", "projected-current-or-stress-health-factor-below-1.2"]),
    }),
    conceptualOperations: Object.freeze([...EXPECTED_DELEVERAGE_STEPS]),
    reconciliation: Object.freeze({
      finality: "finalized",
      requiredEvidenceIds: Object.freeze([treasuryDisclosure.id, fixedForkObservation.id,
        opportunity.id, recovery.candidateId]),
      requiredReceipts: Object.freeze([...EXPECTED_DELEVERAGE_STEPS]),
      postconditions: Object.freeze({
        sourceRewardPoolShares: "0", sourceDirectVaultShares: "0", sourceLpAmount: "0",
        sourceTbtcRaw: "0", sourceCbBtcSats: "0",
        moonwellDebtDeltaSats: recovery.repayment.debtDeltaSats,
        moonwellDebtAfterSats: recovery.repayment.debtAfterSats,
        targetLooseCbBtcSats: "unchanged-from-pre-arm-observation",
        targetCbBtcAllowanceSats: "0", everyRequiredReceiptSuccessful: true,
      }),
    }),
    monitoring: Object.freeze({
      healthFactorPolicyMinimumWad: TARGET_HEALTH_FACTOR_WAD,
      alertAndRefuseOn: Object.freeze(["current-health-factor-below-policy", "stress-health-factor-below-policy",
        "rate-drift", "quote-drift", "contract-drift", "incomplete-exit", "allowance-residue"]),
      pause: "stop before the next conceptual operation and require a refreshed boundary",
      revoke: "consume or cancel the one-use envelope and clear any temporary allowance to zero",
      unwind: "retain assets at the last finalized custody boundary, reconcile receipts, balances, debt, and allowances, then require a new human-reviewed envelope",
    }),
    authority: Object.freeze({
      humanDecisionOnly: true,
      freshPreflightRequired: true,
      separateHumanTransactionAuthorizationRequired: true,
      executionAdmitted: false,
      transactionAssembly: false,
      outputCalldata: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    }),
  });
  return Object.freeze({
    type: "AgroUnifiedPortfolioActionSummary",
    portfolioDisclosure: treasuryDisclosure.id,
    opportunities: Object.freeze([Object.freeze({
      id: opportunity.id,
      account: opportunity.account,
      provider: opportunity.provider,
      mechanism: opportunity.mechanism,
      underlyings: opportunity.underlyings,
      apy: opportunity.apy,
      capacity: opportunity.liquidity.capacity,
      accountAvailable: opportunity.liquidity.accountAvailable,
      changedRisks: opportunity.changedRisks,
      exit: opportunity.exit,
      freshness: opportunity.freshness,
      status: "observation-only",
      reasonNotActionReady: opportunity.apy.availability === "unavailable"
        ? opportunity.apy.reason
        : "a separate treasury admission and human authorization are required",
    })]),
    recoveries: Object.freeze([Object.freeze({
      candidateId: recovery.candidateId,
      sourcePosition: recovery.sourcePosition,
      outputs: recovery.outputs,
      fullConversion: recovery.fullConversion,
      repayment: recovery.repayment,
      health: recovery.health,
      status: "fixed-fork-evidence-only",
    })]),
    humanReviewActionCards: Object.freeze([card]),
    authority: card.authority,
  });
}
