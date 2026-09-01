import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.legacy-capital-recovery-assay.v1";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.legacy-capital-recovery-assay";
const WEI_PER_NATIVE = 10n ** 18n;
const MICRO_USD_PER_USD = 1_000_000n;

const DISPOSITIONS = Object.freeze([
  "recover-now",
  "batch-only",
  "legal-acceptance-blocked",
  "further-assay",
  "leave-dust",
  "ignore-untrusted",
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
  if (numerator < 0n || denominator <= 0n) throw new Error("ceilDiv requires a nonnegative numerator and positive denominator");
  return (numerator + denominator - 1n) / denominator;
}

function credentialFreeHttps(name, value) {
  const parsed = new URL(text(name, value));
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${name} must be a credential-free HTTPS URL`);
  }
  return parsed.href;
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

function normalizeOutput(candidateName, output, index) {
  const name = `${candidateName}.outputs[${index}]`;
  object(name, output);
  const decimals = quantity(`${name}.decimals`, output.decimals);
  if (decimals > 36n) throw new Error(`${name}.decimals exceeds the bounded precision`);
  return {
    token: text(`${name}.token`, output.token, /^eip155:[1-9][0-9]*\/erc20:0x[0-9a-fA-F]{40}$/u),
    amount: quantity(`${name}.amount`, output.amount),
    decimals,
    usdPriceMantissa: positive(`${name}.usdPriceMantissa`, output.usdPriceMantissa),
    usdPriceScale: positive(`${name}.usdPriceScale`, output.usdPriceScale),
    priceSourceUrl: credentialFreeHttps(`${name}.priceSourceUrl`, output.priceSourceUrl),
    priceTimestamp: positive(`${name}.priceTimestamp`, output.priceTimestamp),
  };
}

function normalizeCandidate(candidate, index) {
  const name = `candidates[${index}]`;
  object(name, candidate);
  const evidence = object(`${name}.evidence`, candidate.evidence);
  const economics = object(`${name}.economics`, candidate.economics);
  const chain = object(`${name}.chain`, candidate.chain);
  const normalizedChain = {
    caip2: text(`${name}.chain.caip2`, chain.caip2, /^eip155:[1-9][0-9]*$/u),
    snapshotBlock: positive(`${name}.chain.snapshotBlock`, chain.snapshotBlock),
    snapshotTimestamp: positive(`${name}.chain.snapshotTimestamp`, chain.snapshotTimestamp),
  };
  const untrusted = flag(`${name}.evidence.untrusted`, evidence.untrusted);
  const outputs = Array.isArray(candidate.outputs)
    ? candidate.outputs.map((output, outputIndex) => normalizeOutput(name, output, outputIndex))
    : (() => { throw new Error(`${name}.outputs must be an array`); })();
  if ((!untrusted && outputs.length === 0) || outputs.length > 8) {
    throw new Error(`${name}.outputs must contain one through eight entries unless the asset is untrusted`);
  }
  if (outputs.some((output) => !output.token.startsWith(`${normalizedChain.caip2}/`))) {
    throw new Error(`${name}.outputs must belong to the candidate chain`);
  }
  if (new Set(outputs.map((output) => output.token.toLowerCase())).size !== outputs.length) {
    throw new Error(`${name}.outputs must contain unique token identifiers`);
  }
  const sourceUrls = Array.isArray(candidate.sourceUrls)
    ? candidate.sourceUrls.map((url, sourceIndex) => credentialFreeHttps(`${name}.sourceUrls[${sourceIndex}]`, url))
    : (() => { throw new Error(`${name}.sourceUrls must be an array`); })();
  if (sourceUrls.length === 0 || sourceUrls.length > 12) throw new Error(`${name}.sourceUrls must contain one through twelve entries`);

  const gasUnits = quantity(`${name}.economics.gasUnits`, economics.gasUnits);
  const gasPriceWei = quantity(`${name}.economics.gasPriceWei`, economics.gasPriceWei);
  const l1FeeWeiCeiling = quantity(`${name}.economics.l1FeeWeiCeiling`, economics.l1FeeWeiCeiling);
  const executionFeeWeiCeiling = quantity(`${name}.economics.executionFeeWeiCeiling`, economics.executionFeeWeiCeiling);
  const minimumFeeContingencyBps = positive(`${name}.economics.minimumFeeContingencyBps`, economics.minimumFeeContingencyBps);
  if (minimumFeeContingencyBps < 10_000n || minimumFeeContingencyBps > 50_000n) {
    throw new Error(`${name}.economics.minimumFeeContingencyBps must be between 10000 and 50000`);
  }
  const modeledFeeFloor = gasUnits * gasPriceWei + l1FeeWeiCeiling;
  const contingentFeeFloor = ceilDiv(modeledFeeFloor * minimumFeeContingencyBps, 10_000n);
  if (executionFeeWeiCeiling < contingentFeeFloor) {
    throw new Error(`${name}.economics.executionFeeWeiCeiling is below contingent modeled L2 gas plus L1 fee`);
  }
  const gasEstimated = flag(`${name}.evidence.gasEstimated`, evidence.gasEstimated);
  if (gasEstimated && (gasUnits === 0n || gasPriceWei === 0n || executionFeeWeiCeiling === 0n)) {
    throw new Error(`${name} cannot claim gas evidence with a zero gas quantity, price, or fee ceiling`);
  }
  const maximumPriceAgeSeconds = positive(`${name}.economics.maximumPriceAgeSeconds`, economics.maximumPriceAgeSeconds);
  const nativePriceTimestamp = positive(`${name}.economics.nativePriceTimestamp`, economics.nativePriceTimestamp);
  const assertFreshPrice = (priceTimestamp, priceName) => {
    if (priceTimestamp > normalizedChain.snapshotTimestamp
        || normalizedChain.snapshotTimestamp - priceTimestamp > maximumPriceAgeSeconds) {
      throw new Error(`${priceName} must be non-future and within the declared maximum age`);
    }
  };
  assertFreshPrice(nativePriceTimestamp, `${name}.economics.nativePriceTimestamp`);
  outputs.forEach((output, outputIndex) => assertFreshPrice(output.priceTimestamp, `${name}.outputs[${outputIndex}].priceTimestamp`));

  return {
    candidateId: text(`${name}.candidateId`, candidate.candidateId, /^[a-z0-9][a-z0-9-]{2,79}$/u),
    wallet: text(`${name}.wallet`, candidate.wallet, /^[A-Z][A-Z0-9_-]{2,31}$/u),
    protocol: text(`${name}.protocol`, candidate.protocol, /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,79}$/u),
    asset: text(`${name}.asset`, candidate.asset, /^.{2,120}$/u),
    chain: normalizedChain,
    evidence: {
      forkSimulationComplete: flag(`${name}.evidence.forkSimulationComplete`, evidence.forkSimulationComplete),
      outputVerified: flag(`${name}.evidence.outputVerified`, evidence.outputVerified),
      gasEstimated,
      legalAcceptanceRequired: flag(`${name}.evidence.legalAcceptanceRequired`, evidence.legalAcceptanceRequired),
      legalAcceptanceCompleted: flag(`${name}.evidence.legalAcceptanceCompleted`, evidence.legalAcceptanceCompleted),
      batchOnly: flag(`${name}.evidence.batchOnly`, evidence.batchOnly),
      untrusted,
    },
    outputs,
    economics: {
      gasUnits,
      gasPriceWei,
      l1FeeWeiCeiling,
      executionFeeWeiCeiling,
      minimumFeeContingencyBps,
      nativeUsdPriceMantissa: positive(`${name}.economics.nativeUsdPriceMantissa`, economics.nativeUsdPriceMantissa),
      nativeUsdPriceScale: positive(`${name}.economics.nativeUsdPriceScale`, economics.nativeUsdPriceScale),
      nativePriceSourceUrl: credentialFreeHttps(`${name}.economics.nativePriceSourceUrl`, economics.nativePriceSourceUrl),
      nativePriceTimestamp,
      maximumPriceAgeSeconds,
      maximumDragBps: positive(`${name}.economics.maximumDragBps`, economics.maximumDragBps),
      minimumNetMicroUsd: positive(`${name}.economics.minimumNetMicroUsd`, economics.minimumNetMicroUsd),
    },
    sourceUrls,
  };
}

function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  }
  return value;
}

function assayCandidate(candidate) {
  const grossMicroUsd = candidate.outputs.reduce((sum, output) => {
    const tokenScale = 10n ** output.decimals;
    return sum + output.amount * output.usdPriceMantissa * MICRO_USD_PER_USD
      / (tokenScale * output.usdPriceScale);
  }, 0n);
  const executionFeeMicroUsdCeil = ceilDiv(
    candidate.economics.executionFeeWeiCeiling * candidate.economics.nativeUsdPriceMantissa * MICRO_USD_PER_USD,
    WEI_PER_NATIVE * candidate.economics.nativeUsdPriceScale,
  );
  const netMicroUsd = grossMicroUsd - executionFeeMicroUsdCeil;
  const dragBpsCeil = grossMicroUsd === 0n
    ? 10_000n
    : ceilDiv(executionFeeMicroUsdCeil * 10_000n, grossMicroUsd);
  const evidenceComplete = candidate.evidence.forkSimulationComplete
    && candidate.evidence.outputVerified && candidate.evidence.gasEstimated;
  const economicCandidate = evidenceComplete && netMicroUsd >= candidate.economics.minimumNetMicroUsd
    && dragBpsCeil <= candidate.economics.maximumDragBps;

  let disposition;
  if (candidate.evidence.untrusted) disposition = "ignore-untrusted";
  else if (candidate.evidence.legalAcceptanceRequired && !candidate.evidence.legalAcceptanceCompleted) {
    disposition = "legal-acceptance-blocked";
  } else if (!evidenceComplete) disposition = "further-assay";
  else if (candidate.evidence.batchOnly) disposition = "batch-only";
  else if (economicCandidate) disposition = "recover-now";
  else disposition = "leave-dust";

  return {
    candidateId: candidate.candidateId,
    wallet: candidate.wallet,
    protocol: candidate.protocol,
    asset: candidate.asset,
    chain: serializable(candidate.chain),
    disposition,
    value: {
      grossMicroUsdFloor: grossMicroUsd.toString(),
      executionFeeMicroUsdCeil: executionFeeMicroUsdCeil.toString(),
      netMicroUsdAfterFeeCeiling: netMicroUsd.toString(),
      dragBpsCeil: dragBpsCeil.toString(),
    },
    evidence: candidate.evidence,
    gate: {
      evidenceComplete,
      economicCandidate,
      legalAcceptanceSatisfied: !candidate.evidence.legalAcceptanceRequired || candidate.evidence.legalAcceptanceCompleted,
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
    sourceUrls: candidate.sourceUrls,
  };
}

export function assayLegacyCapitalRecovery(rawInput) {
  assertNoNumericOrTransactionMaterial(rawInput);
  const input = object("input", rawInput);
  if (input.profile !== PROFILE) throw new Error(`profile must equal ${PROFILE}`);
  const authority = object("authority", input.authority);
  if (flag("authority.fixedForkEvidenceOnly", authority.fixedForkEvidenceOnly) !== true
      || flag("authority.liveMutation", authority.liveMutation) !== false
      || flag("authority.transactionAssembly", authority.transactionAssembly) !== false
      || flag("authority.signerMaterialPresent", authority.signerMaterialPresent) !== false
      || flag("authority.signing", authority.signing) !== false
      || flag("authority.broadcast", authority.broadcast) !== false) {
    throw new Error("authority must be credential-free evidence with no live mutation, transaction assembly, signing, or broadcast");
  }
  if (!Array.isArray(input.candidates) || input.candidates.length === 0 || input.candidates.length > 64) {
    throw new Error("candidates must contain one through sixty-four entries");
  }
  const normalized = input.candidates.map(normalizeCandidate);
  const ids = new Set(normalized.map((candidate) => candidate.candidateId));
  if (ids.size !== normalized.length) throw new Error("candidate identifiers must be unique");
  const candidates = normalized.map(assayCandidate);
  const dispositionCounts = Object.fromEntries(DISPOSITIONS.map((disposition) => [
    disposition,
    candidates.filter((candidate) => candidate.disposition === disposition).length.toString(),
  ]));
  const result = {
    profile: PROFILE,
    outcome: "completed-legacy-capital-recovery-assay",
    candidateCount: candidates.length.toString(),
    dispositionCounts,
    candidates,
    gate: {
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
      reason: "economic classification is evidence, never custody or execution authority",
    },
  };
  return { id: semanticId("agrodao.legacy-capital-recovery-assay", { input: serializable(normalized), result }), ...result };
}

export async function recordLegacyCapitalRecoveryAssay(rawInput, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new Error("recordedAt must be an ISO timestamp");
  const result = assayLegacyCapitalRecovery(rawInput);
  const store = options.store ?? createSettlementStore({
    settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT,
  });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new Error("legacy capital recovery record requires AGRODAO's contracted settlement store");
  }
  const record = {
    type: "LegacyCapitalRecoveryAssayRecord",
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

export const LEGACY_CAPITAL_RECOVERY_ASSAY_PROFILE = PROFILE;
export const LEGACY_CAPITAL_RECOVERY_DISPOSITIONS = DISPOSITIONS;
export const LEGACY_CAPITAL_RECOVERY_RECORD_CATEGORY = RECORD_CATEGORY;
