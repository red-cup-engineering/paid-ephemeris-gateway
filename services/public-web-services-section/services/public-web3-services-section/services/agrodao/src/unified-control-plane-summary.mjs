const HIVE_ACCOUNT = "michael561";
const FIXED_FORK_CANDIDATE = "sigmund-beefy-tbtc-cbbtc";
const TARGET_HEALTH_FACTOR_WAD = "1200000000000000000";
const AERODROME_STABLE_POOL = "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e";

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
  if (candidate.fullConversionStatus !== "completed" || candidate.fullConversionVerified !== true
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

export function summarizeUnifiedAgroControlPlane({ treasuryDisclosure, fixedForkObservation }) {
  const opportunity = hiveOpportunity(treasuryDisclosure);
  const recovery = fixedForkRecovery(fixedForkObservation);
  const card = Object.freeze({
    id: "review-sigmund-full-cbbtc-repayment",
    status: "human-review-required",
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
    authority: Object.freeze({
      humanDecisionOnly: true,
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
