import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.attributed-wallet-forensic-interpretation.v1";
const PRODUCT_PROFILE = "org.emsenn.public-service-product-declaration.v1";
const EPISTEMIC_STATUS = "attributed-nondeterministic-inference";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.attributed-wallet-forensic-interpretation";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const URN = /^urn:[A-Za-z0-9][A-Za-z0-9:._-]{2,255}$/u;
const CAIP2 = /^eip155:[1-9][0-9]*$/u;
const CAIP10 = /^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u;
const ID = /^[a-z0-9][a-z0-9-]{2,99}$/u;
const CLAIM_KINDS = new Set(["classification", "context", "recommendation", "risk"]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function text(name, value, pattern = /^.{1,2048}$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} must be bounded text`);
  return value;
}

function flag(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}

function integer(name, value) {
  text(name, value, /^(0|[1-9][0-9]*)$/u);
  return BigInt(value);
}

function instant(name, value) {
  text(name, value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${name} must be an ISO instant`);
  return { value, milliseconds };
}

function publicHttps(name, value) {
  const url = new URL(text(name, value));
  if (url.protocol !== "https:" || url.username || url.password) throw new TypeError(`${name} must be a credential-free HTTPS URL`);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "[::1]" || /^127\./u.test(host)
    || /^10\./u.test(host) || /^192\.168\./u.test(host) || /^169\.254\./u.test(host)
    || /^172\.(?:1[6-9]|2[0-9]|3[01])\./u.test(host)) {
    throw new TypeError(`${name} must use a public HTTPS host`);
  }
  return url.href;
}

function assertNoNumericOrAuthorityMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") throw new TypeError(`${path} must encode every integer as decimal text`);
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoNumericOrAuthorityMaterial(entry, `${path}[${index}]`));
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|privateKey|mnemonic|rawTransaction|rlp|secret|signature|signedTransaction)$/iu.test(key)) {
      throw new TypeError(`${path}.${key} is transaction, signature, or secret material and is refused`);
    }
    assertNoNumericOrAuthorityMaterial(entry, `${path}.${key}`);
  }
}

function unique(name, values) {
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must be unique`);
  return values;
}

function deepFreeze(value) {
  if (value != null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function boundedArray(name, value, minimum, maximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new TypeError(`${name} must contain ${minimum} through ${maximum} entries`);
  }
  return value;
}

function normalizeObservation(raw) {
  const value = object("observation", raw);
  const accounts = unique("observation.accounts", boundedArray("observation.accounts", value.accounts, 1, 32)
    .map((account, index) => text(`observation.accounts[${index}]`, account, CAIP10).toLowerCase()));
  const snapshots = boundedArray("observation.snapshots", value.snapshots, 1, 16).map((rawSnapshot, index) => {
    const snapshot = object(`observation.snapshots[${index}]`, rawSnapshot);
    const caip2 = text(`observation.snapshots[${index}].caip2`, snapshot.caip2, CAIP2);
    const blockNumber = integer(`observation.snapshots[${index}].blockNumber`, snapshot.blockNumber);
    const blockTimestamp = integer(`observation.snapshots[${index}].blockTimestamp`, snapshot.blockTimestamp);
    if (blockNumber === 0n || blockTimestamp === 0n) throw new TypeError("observation snapshots must be positive");
    return { caip2, blockNumber, blockTimestamp };
  });
  unique("observation snapshot chains", snapshots.map(({ caip2 }) => caip2));
  if (accounts.some((account) => !snapshots.some(({ caip2 }) => account.startsWith(`${caip2}:`)))) {
    throw new TypeError("every observation account must have one matching chain snapshot");
  }
  const normalized = {
    id: text("observation.id", value.id, NI),
    provider: text("observation.provider", value.provider, URN),
    law: text("observation.law", value.law, NI),
    accounts,
    snapshots: snapshots.map(({ caip2, blockNumber, blockTimestamp }) => ({
      caip2, blockNumber: blockNumber.toString(), blockTimestamp: blockTimestamp.toString(),
    })),
  };
  if (normalized.provider !== "urn:ame:ethereum-services-section") {
    throw new TypeError("observation must bind the exact Ethereum Services public-wallet observation provider");
  }
  return normalized;
}

function normalizeProvider(raw) {
  const value = object("provider", raw);
  return {
    actor: text("provider.actor", value.actor, URN),
    agentCardUrl: publicHttps("provider.agentCardUrl", value.agentCardUrl),
    agentCardDigest: text("provider.agentCardDigest", value.agentCardDigest, NI),
    agentCardSignatureEvidence: text("provider.agentCardSignatureEvidence", value.agentCardSignatureEvidence, NI),
    invocationReceipt: text("provider.invocationReceipt", value.invocationReceipt, NI),
    law: text("provider.law", value.law, NI),
  };
}

function normalizeAuthority(raw) {
  const value = object("authority", raw);
  const normalized = {
    publicEvidenceOnly: flag("authority.publicEvidenceOnly", value.publicEvidenceOnly),
    providerSelectedByCustomer: flag("authority.providerSelectedByCustomer", value.providerSelectedByCustomer),
    liveMutation: flag("authority.liveMutation", value.liveMutation),
    transactionAssembly: flag("authority.transactionAssembly", value.transactionAssembly),
    signerMaterialPresent: flag("authority.signerMaterialPresent", value.signerMaterialPresent),
    signing: flag("authority.signing", value.signing),
    broadcast: flag("authority.broadcast", value.broadcast),
    payment: flag("authority.payment", value.payment),
    deployment: flag("authority.deployment", value.deployment),
  };
  if (!normalized.publicEvidenceOnly || !normalized.providerSelectedByCustomer
    || Object.entries(normalized).some(([key, enabled]) => !["publicEvidenceOnly", "providerSelectedByCustomer"].includes(key) && enabled)) {
    throw new TypeError("authority must admit only public evidence and explicit customer provider selection");
  }
  return normalized;
}

function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializable(child)]));
  return value;
}

export const ATTRIBUTED_WALLET_FORENSIC_PRODUCT = deepFreeze({
  profile: PRODUCT_PROFILE,
  provider: "urn:ame:agrodao",
  skill: Object.freeze({
    id: "interpret-public-evm-wallet-forensics",
    name: "Interpret public EVM wallet forensics",
  }),
  epistemicStatus: EPISTEMIC_STATUS,
  custody: "none",
  settlementPolicy: "deployment-supplied-never-inferred",
});

export function admitAttributedWalletForensicInterpretation(rawInput) {
  assertNoNumericOrAuthorityMaterial(rawInput);
  const input = object("input", rawInput);
  if (input.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  if (input.epistemicStatus !== EPISTEMIC_STATUS) throw new TypeError(`epistemicStatus must equal ${EPISTEMIC_STATUS}`);
  const authority = normalizeAuthority(input.authority);
  const observation = normalizeObservation(input.observation);
  const provider = normalizeProvider(input.provider);
  const completedAt = instant("completedAt", input.completedAt);
  if (observation.snapshots.some(({ blockTimestamp }) => BigInt(blockTimestamp) * 1000n > BigInt(completedAt.milliseconds))) {
    throw new TypeError("observation snapshot cannot follow inference completion");
  }
  const sources = boundedArray("sources", input.sources, 1, 32).map((rawSource, index) => {
    const source = object(`sources[${index}]`, rawSource);
    const retrievedAt = instant(`sources[${index}].retrievedAt`, source.retrievedAt);
    if (retrievedAt.milliseconds > completedAt.milliseconds) throw new TypeError("source retrieval cannot follow inference completion");
    return {
      sourceId: text(`sources[${index}].sourceId`, source.sourceId, ID),
      title: text(`sources[${index}].title`, source.title, /^.{1,256}$/u),
      url: publicHttps(`sources[${index}].url`, source.url),
      retrievedAt: retrievedAt.value,
    };
  });
  unique("source identifiers", sources.map(({ sourceId }) => sourceId));
  const sourceIds = new Set(sources.map(({ sourceId }) => sourceId));
  const claims = boundedArray("claims", input.claims, 1, 64).map((rawClaim, index) => {
    const claim = object(`claims[${index}]`, rawClaim);
    const kind = text(`claims[${index}].kind`, claim.kind, /^[a-z]+$/u);
    if (!CLAIM_KINDS.has(kind)) throw new TypeError(`claims[${index}].kind is unsupported`);
    const confidenceBps = integer(`claims[${index}].confidenceBps`, claim.confidenceBps);
    if (confidenceBps > 10_000n) throw new TypeError(`claims[${index}].confidenceBps exceeds 10000`);
    const observationRefs = unique(`claims[${index}].observationRefs`, boundedArray(`claims[${index}].observationRefs`, claim.observationRefs, 0, 4)
      .map((reference, refIndex) => text(`claims[${index}].observationRefs[${refIndex}]`, reference, NI)));
    const sourceRefs = unique(`claims[${index}].sourceRefs`, boundedArray(`claims[${index}].sourceRefs`, claim.sourceRefs, 0, 16)
      .map((reference, refIndex) => text(`claims[${index}].sourceRefs[${refIndex}]`, reference, ID)));
    if (observationRefs.some((reference) => reference !== observation.id)) throw new TypeError(`claims[${index}] has a dangling observation reference`);
    if (sourceRefs.some((reference) => !sourceIds.has(reference))) throw new TypeError(`claims[${index}] has a dangling source reference`);
    if (observationRefs.length + sourceRefs.length === 0) throw new TypeError(`claims[${index}] must cite evidence`);
    if ((kind === "recommendation" || kind === "risk") && (observationRefs.length === 0 || sourceRefs.length === 0)) {
      throw new TypeError(`${kind} claims must cite both the deterministic observation and public sources`);
    }
    return {
      claimId: text(`claims[${index}].claimId`, claim.claimId, ID),
      kind,
      statement: text(`claims[${index}].statement`, claim.statement),
      confidenceBps: confidenceBps.toString(),
      observationRefs,
      sourceRefs,
    };
  });
  unique("claim identifiers", claims.map(({ claimId }) => claimId));
  const normalized = serializable({
    profile: PROFILE,
    epistemicStatus: EPISTEMIC_STATUS,
    authority,
    observation,
    provider,
    completedAt: completedAt.value,
    sources,
    claims,
  });
  const result = {
    profile: PROFILE,
    outcome: "accepted-attributed-wallet-forensic-interpretation",
    epistemicStatus: EPISTEMIC_STATUS,
    observation: observation.id,
    provider,
    sourceCount: sources.length.toString(),
    claimCount: claims.length.toString(),
    sources,
    claims,
    authority: {
      publicEvidenceOnly: true,
      investmentAuthority: false,
      custody: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      payment: false,
      deployment: false,
    },
  };
  return deepFreeze({ id: semanticId("agrodao.attributed-wallet-forensic-interpretation", { input: normalized, result }), ...result });
}

export async function recordAttributedWalletForensicInterpretation(rawInput, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const result = admitAttributedWalletForensicInterpretation(rawInput);
  const store = options.store ?? createSettlementStore({
    settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT,
  });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("wallet forensic interpretation requires AGRODAO's contracted settlement store");
  }
  const record = {
    type: "AttributedWalletForensicInterpretationRecord",
    owner: "urn:ame:agrodao",
    interpretation: result,
    evidenceInput: rawInput,
    recordedAt,
  };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const ATTRIBUTED_WALLET_FORENSIC_INTERPRETATION_PROFILE = PROFILE;
export const ATTRIBUTED_WALLET_FORENSIC_INTERPRETATION_RECORD_CATEGORY = RECORD_CATEGORY;
