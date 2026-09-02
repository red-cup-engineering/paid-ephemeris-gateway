import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.cross-wallet-deleverage-assay.v1";
const WAD = 10n ** 18n;
const SATS_PER_BTC = 100_000_000n;
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.cross-wallet-deleverage-assay";

export const EXPECTED_DELEVERAGE_STEPS = Object.freeze([
  "exit-expired-reward-pool",
  "withdraw-all-beefy-vault-shares",
  "transfer-lp-to-pair",
  "burn-lp-to-source-wallet",
  "transfer-tbtc-to-pair",
  "swap-tbtc-for-cbbtc",
  "transfer-cbbtc-to-target-wallet",
  "approve-cbbtc-repayment",
  "repay-moonwell-cbbtc-debt",
]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`${name} must be bounded text`);
  return value;
}

function flag(name, value) {
  if (typeof value !== "boolean") throw new Error(`${name} must be boolean`);
  return value;
}

function quantity(name, value) {
  text(name, value, /^(0|[1-9][0-9]*)$/u);
  return BigInt(value);
}

function positive(name, value) {
  const parsed = quantity(name, value);
  if (parsed === 0n) throw new Error(`${name} must be positive`);
  return parsed;
}

function ceilDiv(numerator, denominator) {
  if (denominator <= 0n || numerator < 0n) throw new Error("ceilDiv requires a nonnegative numerator and positive denominator");
  return (numerator + denominator - 1n) / denominator;
}

function assertNoNumericOrTransactionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") {
    throw new Error(`${path} must encode every integer as a decimal string`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoNumericOrTransactionMaterial(entry, `${path}[${index}]`));
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|privateKey|mnemonic|rawTransaction|rlp|secret|signedTransaction)$/iu.test(key)) {
      throw new Error(`${path}.${key} is transaction or secret material and is refused`);
    }
    assertNoNumericOrTransactionMaterial(entry, `${path}.${key}`);
  }
}

function normalizeReceipt(receipt, index) {
  object(`receipts[${index}]`, receipt);
  const label = text(`receipts[${index}].label`, receipt.label, /^[a-z0-9-]{3,80}$/u);
  if (label !== EXPECTED_DELEVERAGE_STEPS[index]) throw new Error(`receipts[${index}] is out of order`);
  if (receipt.status !== "success") throw new Error(`receipts[${index}] did not succeed`);
  return { label, status: "success", gasUsed: positive(`receipts[${index}].gasUsed`, receipt.gasUsed).toString() };
}

function normalizeInput(raw) {
  assertNoNumericOrTransactionMaterial(raw);
  const input = object("input", raw);
  if (input.profile !== PROFILE) throw new Error(`profile must equal ${PROFILE}`);

  const chain = object("chain", input.chain);
  const caip2 = text("chain.caip2", chain.caip2, /^eip155:[1-9][0-9]*$/u);
  const snapshotBlock = positive("chain.snapshotBlock", chain.snapshotBlock);
  const snapshotTimestamp = positive("chain.snapshotTimestamp", chain.snapshotTimestamp);

  const authority = object("authority", input.authority);
  if (flag("authority.forkSimulationOnly", authority.forkSimulationOnly) !== true
      || flag("authority.liveMutation", authority.liveMutation) !== false
      || flag("authority.transactionAssembly", authority.transactionAssembly) !== false
      || flag("authority.signerMaterialPresent", authority.signerMaterialPresent) !== false
      || flag("authority.signing", authority.signing) !== false
      || flag("authority.broadcast", authority.broadcast) !== false) {
    throw new Error("authority must be a credential-free, non-signing, non-broadcast fixed-fork simulation");
  }

  const route = object("route", input.route);
  if (!Array.isArray(route.receipts) || route.receipts.length !== EXPECTED_DELEVERAGE_STEPS.length) {
    throw new Error(`route.receipts must contain exactly ${EXPECTED_DELEVERAGE_STEPS.length} receipts`);
  }
  const receipts = route.receipts.map(normalizeReceipt);
  const totalGasUsed = positive("route.totalGasUsed", route.totalGasUsed);
  const receiptGas = receipts.reduce((sum, receipt) => sum + BigInt(receipt.gasUsed), 0n);
  if (receiptGas !== totalGasUsed) throw new Error("route.totalGasUsed does not equal the receipt gas sum");
  if (text("route.repayErrorCode", route.repayErrorCode, /^(0|[1-9][0-9]*)$/u) !== "0") {
    throw new Error("Moonwell repayment returned a nonzero error code");
  }

  const sourceBefore = object("sourceBefore", input.sourceBefore);
  const sourceAfter = object("sourceAfter", input.sourceAfter);
  const targetBefore = object("targetBefore", input.targetBefore);
  const targetAfter = object("targetAfter", input.targetAfter);
  const source = {
    vaultShares: positive("sourceBefore.vaultShares", sourceBefore.vaultShares),
    stakedVaultShares: positive("sourceBefore.stakedVaultShares", sourceBefore.stakedVaultShares),
    looseTbtcRaw: quantity("sourceBefore.looseTbtcRaw", sourceBefore.looseTbtcRaw),
    looseCbBtcSats: quantity("sourceBefore.looseCbBtcSats", sourceBefore.looseCbBtcSats),
    lpWithdrawn: positive("route.lpWithdrawn", route.lpWithdrawn),
    vaultPricePerFullShareWad: positive("route.vaultPricePerFullShareWad", route.vaultPricePerFullShareWad),
    tbtcLpBurnReceivedRaw: positive("route.tbtcLpBurnReceivedRaw", route.tbtcLpBurnReceivedRaw),
    cbBtcLpBurnReceivedSats: positive("route.cbBtcLpBurnReceivedSats", route.cbBtcLpBurnReceivedSats),
    tbtcAfterLpBurnRaw: positive("route.tbtcAfterLpBurnRaw", route.tbtcAfterLpBurnRaw),
    cbBtcAfterLpBurnSats: positive("route.cbBtcAfterLpBurnSats", route.cbBtcAfterLpBurnSats),
    cbBtcSwapQuotedSats: positive("route.cbBtcSwapQuotedSats", route.cbBtcSwapQuotedSats),
    cbBtcSwapReceivedSats: positive("route.cbBtcSwapReceivedSats", route.cbBtcSwapReceivedSats),
    tbtcRawPerSat: positive("route.tbtcRawPerSat", route.tbtcRawPerSat),
  };
  if (source.cbBtcSwapQuotedSats !== source.cbBtcSwapReceivedSats) throw new Error("swap receipt differs from the fixed-fork quote");
  const combinedVaultShares = source.vaultShares + source.stakedVaultShares;
  if (combinedVaultShares * source.vaultPricePerFullShareWad / WAD !== source.lpWithdrawn) {
    throw new Error("withdrawn LP does not equal combined vault shares at the fixed-fork price per full share");
  }
  if (source.looseTbtcRaw + source.tbtcLpBurnReceivedRaw !== source.tbtcAfterLpBurnRaw
      || source.looseCbBtcSats + source.cbBtcLpBurnReceivedSats !== source.cbBtcAfterLpBurnSats) {
    throw new Error("post-burn token balances do not conserve loose balances plus LP burn receipts");
  }

  const transferSats = positive("route.transferSats", route.transferSats);
  const repaymentSats = positive("route.repaymentSats", route.repaymentSats);
  if (transferSats !== repaymentSats) throw new Error("cross-wallet transfer must exactly equal the repayment");
  const debtBeforeSats = positive("targetBefore.cbBtcDebtSats", targetBefore.cbBtcDebtSats);
  const debtAfterSats = positive("targetAfter.cbBtcDebtSats", targetAfter.cbBtcDebtSats);
  if (debtBeforeSats - debtAfterSats !== repaymentSats) throw new Error("target debt delta does not equal repayment");

  const sourceAfterQuantities = {
    rewardPoolShares: quantity("sourceAfter.rewardPoolShares", sourceAfter.rewardPoolShares),
    vaultShares: quantity("sourceAfter.vaultShares", sourceAfter.vaultShares),
    lpShares: quantity("sourceAfter.lpShares", sourceAfter.lpShares),
    tbtcRaw: quantity("sourceAfter.tbtcRaw", sourceAfter.tbtcRaw),
    cbBtcSats: quantity("sourceAfter.cbBtcSats", sourceAfter.cbBtcSats),
  };
  for (const [name, value] of Object.entries(sourceAfterQuantities)) {
    if (name !== "cbBtcSats" && value !== 0n) throw new Error(`sourceAfter.${name} must be zero after the simulated exit`);
  }
  const targetBeforeLoose = quantity("targetBefore.looseCbBtcSats", targetBefore.looseCbBtcSats);
  const targetAfterLoose = quantity("targetAfter.looseCbBtcSats", targetAfter.looseCbBtcSats);
  const targetAllowance = quantity("targetAfter.cbBtcAllowanceSats", targetAfter.cbBtcAllowanceSats);
  if (targetAfterLoose !== targetBeforeLoose || targetAllowance !== 0n) {
    throw new Error("target loose cbBTC and repayment allowance must return to their initial and zero states");
  }

  const health = object("health", input.health);
  const targetHealthWad = positive("health.targetWad", health.targetWad);
  const beforeHealthWad = positive("health.beforeCurrentWad", health.beforeCurrentWad);
  const afterCurrentWad = positive("health.afterCurrentWad", health.afterCurrentWad);
  if (afterCurrentWad <= beforeHealthWad) throw new Error("simulated repayment must improve the current health factor");
  if (!Array.isArray(health.afterScenarios) || health.afterScenarios.length < 2 || health.afterScenarios.length > 12) {
    throw new Error("health.afterScenarios must contain two through twelve declared stresses");
  }
  const scenarioNames = new Set();
  const afterScenarios = health.afterScenarios.map((scenario, index) => {
    object(`health.afterScenarios[${index}]`, scenario);
    const name = text(`health.afterScenarios[${index}].name`, scenario.name, /^[a-z0-9-]{3,80}$/u);
    if (scenarioNames.has(name)) throw new Error("health scenario names must be unique");
    scenarioNames.add(name);
    const healthFactorWad = positive(`health.afterScenarios[${index}].healthFactorWad`, scenario.healthFactorWad);
    return { name, healthFactorWad: healthFactorWad.toString() };
  });
  const healthAdmits = afterCurrentWad >= targetHealthWad
    && afterScenarios.every((scenario) => BigInt(scenario.healthFactorWad) >= targetHealthWad);
  if (!healthAdmits) throw new Error("simulated current or stressed health factor is below target");

  const economics = object("economics", input.economics);
  const gasPriceWei = positive("economics.gasPriceWei", economics.gasPriceWei);
  const ethPriceMantissa = positive("economics.ethPriceMantissa", economics.ethPriceMantissa);
  const ethPriceScale = positive("economics.ethPriceScale", economics.ethPriceScale);
  const btcPriceMantissa = positive("economics.btcPriceMantissa", economics.btcPriceMantissa);
  const btcPriceScale = positive("economics.btcPriceScale", economics.btcPriceScale);
  const beefyApyWad = quantity("economics.beefyApyWad", economics.beefyApyWad);
  const cbBtcBorrowRatePerSecondWad = quantity("economics.cbBtcBorrowRatePerSecondWad", economics.cbBtcBorrowRatePerSecondWad);
  const secondsPerYear = positive("economics.secondsPerYear", economics.secondsPerYear);
  const maximumAllInDragBps = positive("economics.maximumAllInDragBps", economics.maximumAllInDragBps);
  const minimumRemainingLiquidSats = quantity("economics.minimumRemainingLiquidSats", economics.minimumRemainingLiquidSats);

  const review = object("review", input.review);
  const taxLegalStatus = text("review.taxLegalStatus", review.taxLegalStatus, /^[a-z-]{3,80}$/u);
  const livePreflightCompleted = flag("review.livePreflightCompleted", review.livePreflightCompleted);
  const liveSignerAvailable = flag("review.liveSignerAvailable", review.liveSignerAvailable);

  const disclosures = object("disclosures", input.disclosures);
  const sourceUrls = Array.isArray(disclosures.sourceUrls) ? disclosures.sourceUrls.map((url, index) => {
    const parsed = new URL(text(`disclosures.sourceUrls[${index}]`, url));
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("source URLs must be credential-free HTTPS");
    return parsed.href;
  }) : (() => { throw new Error("disclosures.sourceUrls must be an array"); })();
  if (sourceUrls.length < 3 || sourceUrls.length > 12) throw new Error("three through twelve source URLs are required");
  const rewardProgramsExpired = flag("disclosures.rewardProgramsExpired", disclosures.rewardProgramsExpired);

  return {
    profile: PROFILE,
    chain: { caip2, snapshotBlock: snapshotBlock.toString(), snapshotTimestamp: snapshotTimestamp.toString() },
    authority: { forkSimulationOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    route: { receipts, totalGasUsed, repayErrorCode: "0", transferSats, repaymentSats },
    source, sourceAfter: sourceAfterQuantities, targetBeforeLoose, targetAfterLoose, targetAllowance,
    debtBeforeSats, debtAfterSats,
    health: { targetHealthWad, beforeHealthWad, afterCurrentWad, afterScenarios, healthAdmits },
    economics: { gasPriceWei, ethPriceMantissa, ethPriceScale, btcPriceMantissa, btcPriceScale,
      beefyApyWad, cbBtcBorrowRatePerSecondWad, secondsPerYear, maximumAllInDragBps,
      minimumRemainingLiquidSats },
    review: { taxLegalStatus, livePreflightCompleted, liveSignerAvailable },
    disclosures: { sourceUrls, rewardProgramsExpired },
  };
}

function serializable(normalized) {
  if (typeof normalized === "bigint") return normalized.toString();
  if (Array.isArray(normalized)) return normalized.map(serializable);
  if (normalized != null && typeof normalized === "object") {
    return Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, serializable(value)]));
  }
  return normalized;
}

export function assayCrossWalletDeleverage(rawInput) {
  const input = normalizeInput(rawInput);
  const grossExitSats = (input.source.tbtcAfterLpBurnRaw / input.source.tbtcRawPerSat)
    + input.source.cbBtcAfterLpBurnSats;
  const postSwapLiquidSats = input.source.cbBtcAfterLpBurnSats + input.source.cbBtcSwapReceivedSats;
  const conversionLossSats = grossExitSats - postSwapLiquidSats;
  if (conversionLossSats < 0n) throw new Error("swap output exceeds the conservative pre-swap BTC floor");
  if (postSwapLiquidSats < input.route.transferSats) throw new Error("source output cannot fund the proposed transfer");
  const remainingLiquidSats = postSwapLiquidSats - input.route.transferSats;
  if (remainingLiquidSats !== input.sourceAfter.cbBtcSats) throw new Error("source final cbBTC does not equal simulated output less transfer");

  const gasWei = input.route.totalGasUsed * input.economics.gasPriceWei;
  const gasSats = ceilDiv(gasWei * input.economics.ethPriceMantissa * input.economics.btcPriceScale * SATS_PER_BTC,
    WAD * input.economics.ethPriceScale * input.economics.btcPriceMantissa);
  const allInDragSats = conversionLossSats + gasSats;
  const allInDragBpsCeil = ceilDiv(allInDragSats * 10_000n, grossExitSats);

  const annualBeefyYieldForegoneSats = postSwapLiquidSats * input.economics.beefyApyWad / WAD;
  const annualBorrowRateWad = input.economics.cbBtcBorrowRatePerSecondWad * input.economics.secondsPerYear;
  const annualDebtInterestSavedSats = input.route.repaymentSats * annualBorrowRateWad / WAD;
  const annualCarryChangeBeforeRedeploymentSats = annualDebtInterestSavedSats - annualBeefyYieldForegoneSats;

  const economicCandidate = allInDragBpsCeil <= input.economics.maximumAllInDragBps
    && remainingLiquidSats >= input.economics.minimumRemainingLiquidSats
    && input.health.healthAdmits;
  const executionReasons = ["assay-has-no-live-execution-authority"];
  if (input.review.taxLegalStatus !== "completed") executionReasons.push("tax-and-legal-review-not-completed");
  if (!input.review.livePreflightCompleted) executionReasons.push("fixed-fork-evidence-requires-fresh-live-preflight");
  if (!input.review.liveSignerAvailable) executionReasons.push("custody-signer-not-available-to-this-assay");

  const result = {
    profile: PROFILE,
    outcome: "completed-fixed-fork-economic-assay",
    snapshot: input.chain,
    evidence: {
      stepCount: EXPECTED_DELEVERAGE_STEPS.length.toString(),
      receiptGasUsed: input.route.totalGasUsed.toString(),
      rewardProgramsExpired: input.disclosures.rewardProgramsExpired,
      sourceUrls: input.disclosures.sourceUrls,
    },
    capital: {
      grossExitSats: grossExitSats.toString(),
      postSwapLiquidSats: postSwapLiquidSats.toString(),
      repaymentSats: input.route.repaymentSats.toString(),
      remainingLiquidSats: remainingLiquidSats.toString(),
      debtBeforeSats: input.debtBeforeSats.toString(),
      debtAfterSats: input.debtAfterSats.toString(),
    },
    executionEconomics: {
      conversionLossSats: conversionLossSats.toString(),
      gasWei: gasWei.toString(),
      gasSatsCeil: gasSats.toString(),
      allInDragSats: allInDragSats.toString(),
      allInDragBpsCeil: allInDragBpsCeil.toString(),
    },
    annualSimpleCarry: {
      beefyYieldForegoneSatsFloor: annualBeefyYieldForegoneSats.toString(),
      debtInterestSavedSatsFloor: annualDebtInterestSavedSats.toString(),
      changeBeforeRedeploymentSats: annualCarryChangeBeforeRedeploymentSats.toString(),
      interpretation: "simple annual-rate comparison; excludes compounding, rewards, price divergence, taxes, and redeployment",
    },
    health: {
      targetWad: input.health.targetHealthWad.toString(),
      beforeCurrentWad: input.health.beforeHealthWad.toString(),
      afterCurrentWad: input.health.afterCurrentWad.toString(),
      afterScenarios: input.health.afterScenarios,
      allDeclaredScenariosAdmit: input.health.healthAdmits,
    },
    gate: {
      economicCandidate,
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
      reasons: executionReasons,
    },
  };
  const digestBody = { input: serializable(input), result };
  return { id: semanticId("agrodao.cross-wallet-deleverage-assay", digestBody), ...result };
}

export async function recordCrossWalletDeleverageAssay(rawInput, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new Error("recordedAt must be an ISO timestamp");
  const result = assayCrossWalletDeleverage(rawInput);
  const store = options.store ?? createSettlementStore({
    settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT,
  });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new Error("cross-wallet deleverage record requires AGRODAO's contracted settlement store");
  }
  const record = {
    type: "CrossWalletDeleverageAssayRecord",
    owner: "urn:ame:agrodao",
    assay: result,
    evidenceInput: rawInput,
    recordedAt,
    decisionBoundary: {
      economicEvidenceOnly: true,
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
  };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const CROSS_WALLET_DELEVERAGE_ASSAY_PROFILE = PROFILE;
export const CROSS_WALLET_DELEVERAGE_RECORD_CATEGORY = RECORD_CATEGORY;
