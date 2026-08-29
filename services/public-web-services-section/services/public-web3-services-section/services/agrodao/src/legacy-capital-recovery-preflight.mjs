import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.legacy-capital-recovery-preflight.v1";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.legacy-capital-recovery-preflight";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const BASELINE_DISPOSITIONS = Object.freeze(["recover-now", "batch-only", "legal-acceptance-blocked",
  "further-assay", "leave-dust"]);
const DISPOSITIONS = Object.freeze(["human-review-ready", "stale-evidence", "position-missing",
  "economics-degraded", "contract-changed", "legal-blocked", "tax-review-blocked", "further-assay"]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} must be bounded text`);
  return value;
}

function flag(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}

function quantity(name, value) {
  text(name, value, /^(0|[1-9][0-9]*)$/u);
  return BigInt(value);
}

function positive(name, value) {
  const parsed = quantity(name, value);
  if (parsed === 0n) throw new TypeError(`${name} must be positive`);
  return parsed;
}

function signedQuantity(name, value) {
  text(name, value, /^(0|-?[1-9][0-9]*)$/u);
  return BigInt(value);
}

function ni(name, value) {
  return text(name, value, NI);
}

function credentialFreeHttps(name, value) {
  const url = new URL(text(name, value));
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new TypeError(`${name} must be a credential-free HTTPS URL`);
  }
  return url.href;
}

function assertNoNumericOrTransactionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") {
    throw new TypeError(`${path} must encode every integer as decimal text`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoNumericOrTransactionMaterial(entry, `${path}[${index}]`));
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|privateKey|mnemonic|rawTransaction|rlp|secret|signedTransaction|transactionRequest)$/iu.test(key)) {
      throw new TypeError(`${path}.${key} is transaction or secret material and is refused`);
    }
    assertNoNumericOrTransactionMaterial(entry, `${path}.${key}`);
  }
}

function ceilDiv(numerator, denominator) {
  if (numerator < 0n || denominator <= 0n) throw new TypeError("ceilDiv requires nonnegative numerator and positive denominator");
  return (numerator + denominator - 1n) / denominator;
}

function normalizeCandidate(raw, index, assayedAt) {
  const name = `candidates[${index}]`;
  const candidate = object(name, raw);
  const chain = object(`${name}.chain`, candidate.chain);
  const baseline = object(`${name}.baseline`, candidate.baseline);
  const current = object(`${name}.current`, candidate.current);
  const policy = object(`${name}.policy`, candidate.policy);
  const baselineDisposition = text(`${name}.baseline.disposition`, baseline.disposition,
    /^(recover-now|batch-only|legal-acceptance-blocked|further-assay|leave-dust)$/u);
  if (!BASELINE_DISPOSITIONS.includes(baselineDisposition)) throw new TypeError(`${name}.baseline.disposition is unsupported`);
  const baselineNet = positive(`${name}.baseline.netMicroUsdAfterFeeCeiling`, baseline.netMicroUsdAfterFeeCeiling);
  const headBlock = positive(`${name}.current.headBlock`, current.headBlock);
  const headTimestamp = positive(`${name}.current.headTimestamp`, current.headTimestamp);
  const observedAt = positive(`${name}.current.observedAt`, current.observedAt);
  const fixedForkBlock = quantity(`${name}.current.fixedForkBlock`, current.fixedForkBlock);
  const fixedForkTimestamp = quantity(`${name}.current.fixedForkTimestamp`, current.fixedForkTimestamp);
  const priceTimestamp = quantity(`${name}.current.priceTimestamp`, current.priceTimestamp);
  const gross = quantity(`${name}.current.grossMicroUsdFloor`, current.grossMicroUsdFloor);
  const fee = quantity(`${name}.current.executionFeeMicroUsdCeil`, current.executionFeeMicroUsdCeil);
  const net = signedQuantity(`${name}.current.netMicroUsdAfterFeeCeiling`, current.netMicroUsdAfterFeeCeiling);
  if (net !== gross - fee) throw new TypeError(`${name}.current net value must equal gross floor minus fee ceiling`);
  const maximumHeadAgeSeconds = positive(`${name}.policy.maximumHeadAgeSeconds`, policy.maximumHeadAgeSeconds);
  const maximumPriceAgeSeconds = positive(`${name}.policy.maximumPriceAgeSeconds`, policy.maximumPriceAgeSeconds);
  const maximumAssayDelaySeconds = positive(`${name}.policy.maximumAssayDelaySeconds`, policy.maximumAssayDelaySeconds);
  const executionWindowSeconds = positive(`${name}.policy.executionWindowSeconds`, policy.executionWindowSeconds);
  if (maximumHeadAgeSeconds > 3_600n || maximumPriceAgeSeconds > 3_600n
    || maximumAssayDelaySeconds > 600n || executionWindowSeconds > 3_600n) {
    throw new TypeError(`${name}.policy freshness bounds exceed the preflight maxima`);
  }
  const minimumNetRetentionBps = positive(`${name}.policy.minimumNetRetentionBps`, policy.minimumNetRetentionBps);
  const maximumDragBps = positive(`${name}.policy.maximumDragBps`, policy.maximumDragBps);
  if (minimumNetRetentionBps > 20_000n || maximumDragBps > 10_000n) {
    throw new TypeError(`${name}.policy economic basis-point bounds are invalid`);
  }
  if (headTimestamp > observedAt || observedAt > assayedAt) {
    throw new TypeError(`${name} timestamps must satisfy headTimestamp <= observedAt <= assayedAt`);
  }
  const baselineSnapshotBlock = positive(`${name}.baseline.snapshotBlock`, baseline.snapshotBlock);
  const baselineSnapshotTimestamp = positive(`${name}.baseline.snapshotTimestamp`, baseline.snapshotTimestamp);
  if (baselineSnapshotBlock > headBlock || baselineSnapshotTimestamp > headTimestamp) {
    throw new TypeError(`${name}.baseline snapshot cannot be later than the current head`);
  }
  const legalScopeDeterminationCompleted = flag(`${name}.current.legalScopeDeterminationCompleted`,
    current.legalScopeDeterminationCompleted);
  const legalRecordId = text(`${name}.current.legalRecordId`, current.legalRecordId,
    /^(|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/u);
  if (legalScopeDeterminationCompleted && !NI.test(legalRecordId)) {
    throw new TypeError(`${name}.current.legalRecordId must identify the completed legal-scope determination`);
  }
  const taxScopeDeterminationCompleted = flag(`${name}.current.taxScopeDeterminationCompleted`,
    current.taxScopeDeterminationCompleted);
  const taxReviewRequired = flag(`${name}.current.taxReviewRequired`, current.taxReviewRequired);
  const taxReviewCompleted = flag(`${name}.current.taxReviewCompleted`, current.taxReviewCompleted);
  const taxRecordId = text(`${name}.current.taxRecordId`, current.taxRecordId, /^(|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/u);
  if ((taxScopeDeterminationCompleted || taxReviewCompleted) && !NI.test(taxRecordId)) {
    throw new TypeError(`${name}.current.taxRecordId must identify the completed tax/accounting scope or review`);
  }
  const sourceUrls = Array.isArray(candidate.sourceUrls)
    ? candidate.sourceUrls.map((url, sourceIndex) => credentialFreeHttps(`${name}.sourceUrls[${sourceIndex}]`, url))
    : (() => { throw new TypeError(`${name}.sourceUrls must be an array`); })();
  if (sourceUrls.length < 2 || sourceUrls.length > 16) {
    throw new TypeError(`${name}.sourceUrls must contain two through sixteen entries`);
  }
  return {
    candidateId: text(`${name}.candidateId`, candidate.candidateId, /^[a-z0-9][a-z0-9-]{2,79}$/u),
    wallet: text(`${name}.wallet`, candidate.wallet, /^[A-Z][A-Z0-9_-]{2,31}$/u),
    protocol: text(`${name}.protocol`, candidate.protocol, /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,79}$/u),
    chain: { caip2: text(`${name}.chain.caip2`, chain.caip2, /^eip155:[1-9][0-9]*$/u) },
    baseline: {
      assayId: ni(`${name}.baseline.assayId`, baseline.assayId),
      disposition: baselineDisposition,
      snapshotBlock: baselineSnapshotBlock,
      snapshotTimestamp: baselineSnapshotTimestamp,
      netMicroUsdAfterFeeCeiling: baselineNet,
    },
    current: {
      headBlock,
      headTimestamp,
      observedAt,
      fixedForkBlock,
      fixedForkTimestamp,
      fixedForkSimulationComplete: flag(`${name}.current.fixedForkSimulationComplete`, current.fixedForkSimulationComplete),
      positionObservationComplete: flag(`${name}.current.positionObservationComplete`, current.positionObservationComplete),
      positionStillOwned: flag(`${name}.current.positionStillOwned`, current.positionStillOwned),
      outputVerified: flag(`${name}.current.outputVerified`, current.outputVerified),
      gasEstimated: flag(`${name}.current.gasEstimated`, current.gasEstimated),
      contractFingerprintObservationComplete: flag(`${name}.current.contractFingerprintObservationComplete`,
        current.contractFingerprintObservationComplete),
      priceTimestamp,
      grossMicroUsdFloor: gross,
      executionFeeMicroUsdCeil: fee,
      netMicroUsdAfterFeeCeiling: net,
      contractFingerprintBaseline: ni(`${name}.current.contractFingerprintBaseline`, current.contractFingerprintBaseline),
      contractFingerprintCurrent: ni(`${name}.current.contractFingerprintCurrent`, current.contractFingerprintCurrent),
      legalScopeDeterminationCompleted,
      legalRecordId,
      legalAcceptanceRequired: flag(`${name}.current.legalAcceptanceRequired`, current.legalAcceptanceRequired),
      legalAcceptanceCompleted: flag(`${name}.current.legalAcceptanceCompleted`, current.legalAcceptanceCompleted),
      taxScopeDeterminationCompleted,
      taxReviewRequired,
      taxReviewCompleted,
      taxRecordId,
    },
    policy: {
      maximumHeadAgeSeconds,
      maximumPriceAgeSeconds,
      maximumAssayDelaySeconds,
      executionWindowSeconds,
      minimumNetRetentionBps,
      maximumDragBps,
      minimumCurrentNetMicroUsd: positive(`${name}.policy.minimumCurrentNetMicroUsd`, policy.minimumCurrentNetMicroUsd),
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

function assayCandidate(candidate, assayedAt) {
  const current = candidate.current;
  const policy = candidate.policy;
  const forkAtHead = current.fixedForkBlock === current.headBlock
    && current.fixedForkTimestamp === current.headTimestamp;
  const headFresh = current.observedAt - current.headTimestamp <= policy.maximumHeadAgeSeconds;
  const observationFresh = assayedAt - current.observedAt <= policy.maximumAssayDelaySeconds;
  const priceFresh = current.priceTimestamp <= current.headTimestamp
    && current.headTimestamp - current.priceTimestamp <= policy.maximumPriceAgeSeconds;
  const freshnessComplete = forkAtHead && headFresh && observationFresh && priceFresh;
  const contractUnchanged = current.contractFingerprintObservationComplete
    && current.contractFingerprintBaseline === current.contractFingerprintCurrent;
  const contractChanged = current.contractFingerprintObservationComplete && !contractUnchanged;
  const evidenceComplete = current.fixedForkSimulationComplete && current.positionObservationComplete
    && current.outputVerified && current.gasEstimated && current.contractFingerprintObservationComplete;
  const legalAcceptanceSatisfied = current.legalScopeDeterminationCompleted
    && (!current.legalAcceptanceRequired || current.legalAcceptanceCompleted);
  const taxReviewSatisfied = current.taxScopeDeterminationCompleted
    && (!current.taxReviewRequired || current.taxReviewCompleted);
  const dragBpsCeil = current.grossMicroUsdFloor === 0n ? 10_000n
    : ceilDiv(current.executionFeeMicroUsdCeil * 10_000n, current.grossMicroUsdFloor);
  const netRetentionBpsFloor = current.netMicroUsdAfterFeeCeiling <= 0n ? 0n
    : current.netMicroUsdAfterFeeCeiling * 10_000n / candidate.baseline.netMicroUsdAfterFeeCeiling;
  const baselineEligible = ["recover-now", "batch-only", "legal-acceptance-blocked"].includes(candidate.baseline.disposition);
  const economicsAdmit = current.netMicroUsdAfterFeeCeiling >= policy.minimumCurrentNetMicroUsd
    && netRetentionBpsFloor >= policy.minimumNetRetentionBps && dragBpsCeil <= policy.maximumDragBps;
  let disposition;
  let reason;
  if (current.positionObservationComplete && !current.positionStillOwned) {
    disposition = "position-missing";
    reason = "fresh public observation does not show the recoverable position in the named wallet";
  } else if (contractChanged) {
    disposition = "contract-changed";
    reason = "current code or proxy implementation fingerprint differs from the reviewed baseline";
  } else if (!freshnessComplete) {
    disposition = "stale-evidence";
    reason = "head, same-head fork, observation, or price evidence exceeds the predeclared freshness law";
  } else if (!legalAcceptanceSatisfied) {
    disposition = "legal-blocked";
    reason = "required legal acceptance is incomplete";
  } else if (!taxReviewSatisfied) {
    disposition = "tax-review-blocked";
    reason = "the required jurisdiction-specific tax or accounting review record is incomplete";
  } else if (!baselineEligible || !evidenceComplete || !current.positionStillOwned) {
    disposition = "further-assay";
    reason = "baseline eligibility, ownership, fixed-fork output, or gas evidence is incomplete";
  } else if (!economicsAdmit) {
    disposition = "economics-degraded";
    reason = "current net value, value retention, or fee drag misses the predeclared economic floor";
  } else {
    disposition = "human-review-ready";
    reason = "fresh evidence satisfies the predeclared review gate but grants no execution authority";
  }
  return {
    candidateId: candidate.candidateId,
    wallet: candidate.wallet,
    protocol: candidate.protocol,
    chain: candidate.chain,
    baseline: serializable(candidate.baseline),
    current: serializable(candidate.current),
    policy: serializable(candidate.policy),
    disposition,
    reason,
    expiresAt: (assayedAt + policy.executionWindowSeconds).toString(),
    economics: {
      dragBpsCeil: dragBpsCeil.toString(),
      netRetentionBpsFloor: netRetentionBpsFloor.toString(),
      economicsAdmit,
    },
    gate: {
      baselineEligible,
      forkAtHead,
      headFresh,
      observationFresh,
      priceFresh,
      freshnessComplete,
      contractUnchanged,
      contractChanged,
      evidenceComplete,
      legalAcceptanceSatisfied,
      taxReviewSatisfied,
      humanReviewReady: disposition === "human-review-ready",
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
    sourceUrls: candidate.sourceUrls,
  };
}

export function assayLegacyCapitalRecoveryPreflight(rawInput) {
  assertNoNumericOrTransactionMaterial(rawInput);
  const input = object("input", rawInput);
  if (input.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  const assayedAt = positive("assayedAt", input.assayedAt);
  const authority = object("authority", input.authority);
  if (flag("authority.publicEvidenceOnly", authority.publicEvidenceOnly) !== true
    || flag("authority.fixedForkEvidenceOnly", authority.fixedForkEvidenceOnly) !== true
    || flag("authority.liveMutation", authority.liveMutation) !== false
    || flag("authority.transactionAssembly", authority.transactionAssembly) !== false
    || flag("authority.signerMaterialPresent", authority.signerMaterialPresent) !== false
    || flag("authority.signing", authority.signing) !== false
    || flag("authority.broadcast", authority.broadcast) !== false) {
    throw new TypeError("authority must permit only public and fixed-fork evidence with no transaction authority");
  }
  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 64) {
    throw new TypeError("candidates must contain one through sixty-four entries");
  }
  const normalized = input.candidates.map((candidate, index) => normalizeCandidate(candidate, index, assayedAt));
  if (new Set(normalized.map(({ candidateId }) => candidateId)).size !== normalized.length) {
    throw new TypeError("candidate identifiers must be unique");
  }
  const candidates = normalized.map((candidate) => assayCandidate(candidate, assayedAt));
  const dispositionCounts = Object.fromEntries(DISPOSITIONS.map((disposition) => [disposition,
    candidates.filter((candidate) => candidate.disposition === disposition).length.toString()]));
  const result = {
    profile: PROFILE,
    outcome: "completed-legacy-capital-recovery-preflight",
    assayedAt: assayedAt.toString(),
    candidateCount: candidates.length.toString(),
    dispositionCounts,
    candidates,
    gate: {
      humanReviewReadyCount: dispositionCounts["human-review-ready"],
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
      reason: "execution-adjacent evidence expires and never grants custody or transaction authority",
    },
  };
  return { id: semanticId("agrodao.legacy-capital-recovery-preflight", { input: serializable(normalized), result }), ...result };
}

export async function recordLegacyCapitalRecoveryPreflight(rawInput, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const result = assayLegacyCapitalRecoveryPreflight(rawInput);
  const recordedAtSeconds = BigInt(Math.floor(Date.parse(recordedAt) / 1_000));
  const assayedAt = BigInt(result.assayedAt);
  const earliestExpiry = result.candidates.reduce((minimum, candidate) => {
    const expiry = BigInt(candidate.expiresAt);
    return expiry < minimum ? expiry : minimum;
  }, BigInt(result.candidates[0].expiresAt));
  if (recordedAtSeconds < assayedAt || recordedAtSeconds > earliestExpiry) {
    throw new TypeError("recordedAt must fall between assayedAt and the earliest candidate expiry");
  }
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("legacy recovery preflight requires AGRODAO's contracted settlement store");
  }
  const record = { type: "LegacyCapitalRecoveryPreflightRecord", owner: "urn:ame:agrodao",
    preflight: result, evidenceInput: rawInput, recordedAt,
    decisionBoundary: { publicAndFixedForkEvidenceOnly: true, executionAdmitted: false,
      transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const LEGACY_CAPITAL_RECOVERY_PREFLIGHT_PROFILE = PROFILE;
export const LEGACY_CAPITAL_RECOVERY_PREFLIGHT_DISPOSITIONS = DISPOSITIONS;
export const LEGACY_CAPITAL_RECOVERY_PREFLIGHT_RECORD_CATEGORY = RECORD_CATEGORY;
