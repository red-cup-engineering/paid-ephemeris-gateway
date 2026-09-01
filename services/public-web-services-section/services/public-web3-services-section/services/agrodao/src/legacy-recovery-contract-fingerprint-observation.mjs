import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.legacy-recovery-contract-fingerprint-observation.v1";
const RECORD_CATEGORY = "agrodao.legacy-recovery-contract-fingerprint-observation";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const BYTECODE = /^0x(?:[0-9a-fA-F]{2})+$/u;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_IMPLEMENTATION_DEPTH = 4;

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function https(name, value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new TypeError(`${name} must be credential-free HTTPS`);
  return url;
}

function parseRelayJson(source) {
  if (typeof source !== "string" || source.length === 0 || Buffer.byteLength(source) > MAX_RESPONSE_BYTES) {
    throw new TypeError("Blockscout relay response must be bounded nonempty text");
  }
  const marker = "Markdown Content:";
  const at = source.indexOf(marker);
  if (at < 0) throw new TypeError("Blockscout relay response lacks its Markdown Content envelope");
  try { return JSON.parse(source.slice(at + marker.length).trim()); }
  catch { throw new TypeError("Blockscout relay Markdown Content is not exact JSON"); }
}

function pacedFetcher(fetchImpl, minimumRequestIntervalMs) {
  if (!Number.isSafeInteger(minimumRequestIntervalMs) || minimumRequestIntervalMs < 0
    || minimumRequestIntervalMs > 10_000) throw new TypeError("minimumRequestIntervalMs must be a bounded integer");
  let nextRequestAt = 0;
  return async (url, init) => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    nextRequestAt = Date.now() + minimumRequestIntervalMs;
    return fetchImpl(url, init);
  };
}

async function fetchRelayJson(url, fetchImpl) {
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetchImpl(url, { method: "GET", headers: { accept: "text/plain",
      "user-agent": "@red-cup-engineering/agrodao contract-fingerprint-observation" }, signal: AbortSignal.timeout(20_000) });
    if (response.status !== 429) break;
    if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000 * (attempt + 1)));
  }
  if (!response.ok) throw new Error(`Blockscout relay HTTP ${response.status}`);
  return parseRelayJson(await response.text());
}

function configuration(fleet, caip2) {
  const chain = fleet.chains.find((candidate) => candidate.caip2 === caip2);
  if (chain == null || chain.transferIndexerKind !== "blockscout-current-holdings") {
    throw new TypeError(`fleet lacks Blockscout configuration for ${caip2}`);
  }
  const relay = https("transferIndexerRelayUrl", chain.transferIndexerRelayUrl);
  const upstream = new URL(relay.pathname.slice(1));
  if (relay.hostname !== "r.jina.ai" || upstream.protocol !== "http:"
    || !/\.blockscout\.com$/u.test(upstream.hostname) || !upstream.pathname.endsWith("/api/v2/")) {
    throw new TypeError(`unsupported Blockscout relay for ${caip2}`);
  }
  return { relay, upstreamHost: upstream.hostname };
}

function relayUrl(config, suffix) {
  return new URL(suffix, config.relay.href.endsWith("/") ? config.relay.href : `${config.relay.href}/`);
}

function addressesFromSources(sourceUrls, expectedHost) {
  const output = [];
  for (const raw of sourceUrls) {
    const url = https("candidate source URL", raw);
    if (url.hostname !== expectedHost) continue;
    const match = /^\/address\/(0x[0-9a-fA-F]{40})\/?$/u.exec(url.pathname);
    if (match) output.push(match[1].toLowerCase());
  }
  return [...new Set(output)].sort();
}

function latestPreflight(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 128) {
    throw new TypeError("preflight records must contain one through one hundred twenty-eight entries");
  }
  return [...records].sort((left, right) => {
    if (!Number.isFinite(Date.parse(left.recordedAt)) || !Number.isFinite(Date.parse(right.recordedAt))) {
      throw new TypeError("preflight record times must be ISO timestamps");
    }
    return right.recordedAt.localeCompare(left.recordedAt)
      || String(right.preflight?.id ?? "").localeCompare(String(left.preflight?.id ?? ""));
  })[0];
}

function normalizedHead(body, caip2) {
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 100) {
    throw new TypeError(`${caip2} head response must contain one through one hundred blocks`);
  }
  const block = body.items[0];
  if (!Number.isSafeInteger(block.height) || block.height < 1 || !Number.isFinite(Date.parse(block.timestamp))) {
    throw new TypeError(`${caip2} head is malformed`);
  }
  return { block: String(block.height), timestamp: String(Math.floor(Date.parse(block.timestamp) / 1_000)) };
}

function verification(metadata) {
  const flag = (name) => typeof metadata[name] === "boolean" ? metadata[name] : null;
  return { isVerified: flag("is_verified"), isFullyVerified: flag("is_fully_verified"),
    isPartiallyVerified: flag("is_partially_verified"), isChangedBytecode: flag("is_changed_bytecode"),
    compilerVersion: typeof metadata.compiler_version === "string" ? metadata.compiler_version : null,
    language: typeof metadata.language === "string" ? metadata.language : null };
}

function implementationAddresses(metadata) {
  if (metadata.implementations == null) return [];
  if (!Array.isArray(metadata.implementations) || metadata.implementations.length > 16) {
    throw new TypeError("Blockscout implementations must be a bounded array");
  }
  return [...new Set(metadata.implementations.map((entry) => {
    if (!ADDRESS.test(entry?.address_hash ?? "")) throw new TypeError("Blockscout implementation lacks an address");
    return entry.address_hash.toLowerCase();
  }))].sort();
}

function codeDigest(bytecode) {
  return semanticId("agrodao.evm-runtime-bytecode", { type: "EvmRuntimeBytecode", bytecode: bytecode.toLowerCase() });
}

async function fetchContractMetadata(address, config, fetchImpl, metadataCache) {
  if (!metadataCache.has(address)) {
    const sourceUrl = relayUrl(config, `smart-contracts/${address}`);
    metadataCache.set(address, fetchRelayJson(sourceUrl, fetchImpl));
  }
  return metadataCache.get(address);
}

async function observeComponent(address, config, fetchImpl, metadataCache, path = []) {
  const normalizedAddress = address.toLowerCase();
  const sourceUrl = relayUrl(config, `smart-contracts/${normalizedAddress}`);
  if (path.includes(normalizedAddress)) return { address: normalizedAddress, complete: false,
    reason: "proxy implementation cycle", sourceUrl: sourceUrl.href, codeDigest: null,
    proxyType: null, implementations: [], verification: {} };
  if (path.length >= MAX_IMPLEMENTATION_DEPTH) return { address: normalizedAddress, complete: false,
    reason: "proxy implementation depth exceeded", sourceUrl: sourceUrl.href, codeDigest: null,
    proxyType: null, implementations: [], verification: {} };
  let metadata;
  try { metadata = object("Blockscout smart contract",
    await fetchContractMetadata(normalizedAddress, config, fetchImpl, metadataCache)); }
  catch (error) { return { address: normalizedAddress, complete: false, reason: error.message,
    sourceUrl: sourceUrl.href, codeDigest: null, proxyType: null, implementations: [], verification: {} }; }
  const bytecode = metadata.deployed_bytecode;
  const proxyType = typeof metadata.proxy_type === "string" && metadata.proxy_type.length > 0
    ? metadata.proxy_type : null;
  let implementationAddressesValue;
  try { implementationAddressesValue = implementationAddresses(metadata); }
  catch (error) { return { address: normalizedAddress, complete: false, reason: error.message,
    sourceUrl: sourceUrl.href, codeDigest: BYTECODE.test(bytecode ?? "") ? codeDigest(bytecode) : null,
    proxyType, implementations: [], verification: verification(metadata) }; }
  const implementations = [];
  for (const implementation of implementationAddressesValue) {
    implementations.push(await observeComponent(implementation, config, fetchImpl, metadataCache,
      [...path, normalizedAddress]));
  }
  const bytecodeComplete = BYTECODE.test(bytecode ?? "");
  const proxyResolutionComplete = proxyType == null ? implementationAddressesValue.length === 0
    : implementationAddressesValue.length > 0 && implementations.every(({ complete }) => complete);
  return { address: normalizedAddress, complete: bytecodeComplete && proxyResolutionComplete,
    reason: !bytecodeComplete ? "runtime bytecode unavailable or malformed"
      : !proxyResolutionComplete ? "proxy identity or implementation resolution incomplete" : "complete",
    sourceUrl: sourceUrl.href, codeDigest: bytecodeComplete ? codeDigest(bytecode) : null,
    proxyType, implementations, verification: verification(metadata) };
}

function identityProjection(component) {
  return { address: component.address, codeDigest: component.codeDigest, proxyType: component.proxyType,
    implementations: component.implementations.map(identityProjection) };
}

export async function observeLegacyRecoveryContractFingerprints({ records, fleet, now = new Date().toISOString(),
  fetchImpl = fetch, minimumRequestIntervalMs = 750 } = {}) {
  if (!Number.isFinite(Date.parse(now))) throw new TypeError("now must be an ISO timestamp");
  const publicFleet = object("fleet", fleet);
  if (!Array.isArray(publicFleet.chains) || publicFleet.authority?.observationOnly !== true
    || publicFleet.authority?.signerMaterialPresent !== false) {
    throw new TypeError("fleet must be a credential-free public observation manifest");
  }
  const record = latestPreflight(records);
  const publicFetch = pacedFetcher(fetchImpl, minimumRequestIntervalMs);
  const preflight = object("preflight", record.preflight);
  if (!Array.isArray(preflight.candidates) || preflight.candidates.length < 1 || preflight.candidates.length > 64) {
    throw new TypeError("preflight candidates must be bounded");
  }
  const chainIds = [...new Set(preflight.candidates.map((candidate) => candidate.chain.caip2))].sort();
  const configs = new Map(chainIds.map((caip2) => [caip2, configuration(publicFleet, caip2)]));
  const metadataCaches = new Map(chainIds.map((caip2) => [caip2, new Map()]));
  const candidates = [];
  for (const candidate of [...preflight.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId))) {
    const config = configs.get(candidate.chain.caip2);
    const addresses = addressesFromSources(candidate.sourceUrls, config.upstreamHost);
    const roots = [];
    for (const address of addresses) roots.push(await observeComponent(address, config, publicFetch,
      metadataCaches.get(candidate.chain.caip2)));
    const observationComplete = roots.length > 0 && roots.every(({ complete }) => complete);
    const contractSetFingerprint = observationComplete ? semanticId("agrodao.evm-contract-set-identity", {
      type: "EvmContractSetIdentity", chain: candidate.chain.caip2, roots: roots.map(identityProjection),
    }) : null;
    candidates.push({ candidateId: candidate.candidateId, wallet: candidate.wallet, protocol: candidate.protocol,
      chain: candidate.chain.caip2, sourcePreflightId: preflight.id, addresses, roots, observationComplete,
      contractSetFingerprint, baselineComparisonComplete: false,
      reason: roots.length === 0 ? "no explorer contract address was supplied"
        : !observationComplete ? "one or more contract or proxy identities are incomplete"
          : "current identity observed; no reviewed historical baseline is bound" });
  }
  const heads = {};
  for (const caip2 of chainIds) {
    const config = configs.get(caip2);
    const url = relayUrl(config, "blocks?type=block");
    heads[caip2] = { ...normalizedHead(await fetchRelayJson(url, publicFetch), caip2), sourceUrl: url.href };
  }
  const result = { profile: PROFILE, outcome: "completed-contract-fingerprint-observation", observedAt: now,
    sourcePreflightId: preflight.id, candidateCount: String(candidates.length),
    completeCurrentIdentityCount: String(candidates.filter(({ observationComplete }) => observationComplete).length),
    completeBaselineComparisonCount: "0", heads, candidates,
    gate: { publicEvidenceOnly: true, exactHeadBinding: false, baselineComparisonComplete: false,
      executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false,
      reason: "current explorer identity is evidence, not a historical baseline comparison or execution authority" } };
  return { id: semanticId("agrodao.legacy-recovery-contract-fingerprint-observation", result), ...result };
}

export async function recordLegacyRecoveryContractFingerprintObservation(result, options = {}) {
  if (result?.profile !== PROFILE || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(result.id ?? "")) {
    throw new TypeError("a content-identified contract fingerprint observation is required");
  }
  const { id, ...body } = result;
  if (id !== semanticId("agrodao.legacy-recovery-contract-fingerprint-observation", body)) {
    throw new TypeError("contract fingerprint observation content identity is invalid");
  }
  if (result.gate?.publicEvidenceOnly !== true || result.gate?.exactHeadBinding !== false
    || result.gate?.baselineComparisonComplete !== false || result.gate?.executionAdmitted !== false
    || result.gate?.transactionAssembly !== false || result.gate?.signing !== false
    || result.gate?.broadcast !== false || result.gate?.chainMutation !== false) {
    throw new TypeError("contract fingerprint observation exceeds its read-only authority");
  }
  const recordedAt = options.recordedAt ?? result.observedAt;
  if (!Number.isFinite(Date.parse(recordedAt)) || Date.parse(recordedAt) < Date.parse(result.observedAt)) {
    throw new TypeError("recordedAt must be an ISO time at or after observedAt");
  }
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("contract fingerprint observation requires AGRODAO's contracted settlement store");
  }
  const record = { type: "LegacyRecoveryContractFingerprintObservationRecord", owner: "urn:ame:agrodao",
    observation: result, recordedAt, decisionBoundary: result.gate };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const LEGACY_RECOVERY_CONTRACT_FINGERPRINT_PROFILE = PROFILE;
export const LEGACY_RECOVERY_CONTRACT_FINGERPRINT_RECORD_CATEGORY = RECORD_CATEGORY;
