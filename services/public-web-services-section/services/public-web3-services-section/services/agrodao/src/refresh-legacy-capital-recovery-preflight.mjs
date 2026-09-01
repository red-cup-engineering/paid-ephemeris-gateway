import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const MAX_RESPONSE_BYTES = 5_000_000;
const DIRECT_SHARE_PROTOCOLS = new Set(["dexfi", "mellow"]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function https(name, value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new TypeError(`${name} must be credential-free HTTPS`);
  return url;
}

function integerText(name, value, positive = false) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value) || (positive && value === "0")) {
    throw new TypeError(`${name} must be ${positive ? "positive " : ""}integer text`);
  }
  return value;
}

export function parseBlockscoutRelayJson(source) {
  if (typeof source !== "string" || source.length === 0 || Buffer.byteLength(source) > MAX_RESPONSE_BYTES) {
    throw new TypeError("Blockscout relay response must be bounded nonempty text");
  }
  const marker = "Markdown Content:";
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new TypeError("Blockscout relay response lacks its Markdown Content envelope");
  const json = source.slice(markerAt + marker.length).trim();
  try { return JSON.parse(json); } catch { throw new TypeError("Blockscout relay Markdown Content is not exact JSON"); }
}

async function fetchRelayJson(url, fetchImpl) {
  const response = await fetchImpl(url, { method: "GET", headers: { accept: "text/plain",
    "user-agent": "@red-cup-engineering/agrodao recovery-preflight-refresh" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Blockscout relay HTTP ${response.status}`);
  const source = await response.text();
  return parseBlockscoutRelayJson(source);
}

function latestCandidates(records) {
  if (!Array.isArray(records) || records.length > 128) throw new TypeError("recovery records must be a bounded array");
  const latest = new Map();
  for (const [recordIndex, rawRecord] of records.entries()) {
    const record = object(`records[${recordIndex}]`, rawRecord);
    if (!Number.isFinite(Date.parse(record.recordedAt))) throw new TypeError(`records[${recordIndex}].recordedAt must be ISO time`);
    const assay = object(`records[${recordIndex}].assay`, record.assay);
    const evidence = object(`records[${recordIndex}].evidenceInput`, record.evidenceInput);
    if (!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(assay.id ?? "")
      || !Array.isArray(assay.candidates) || !Array.isArray(evidence.candidates)) {
      throw new TypeError(`records[${recordIndex}] must bind a recovery assay and evidence candidates`);
    }
    const resultById = new Map(assay.candidates.map((candidate) => [candidate.candidateId, candidate]));
    for (const input of evidence.candidates) {
      const result = resultById.get(input.candidateId);
      if (result == null) throw new TypeError(`records[${recordIndex}] has dangling candidate evidence`);
      const row = { recordedAt: record.recordedAt, assayId: assay.id, input, result };
      const prior = latest.get(input.candidateId);
      if (prior == null || row.recordedAt > prior.recordedAt
        || (row.recordedAt === prior.recordedAt && row.assayId > prior.assayId)) latest.set(input.candidateId, row);
    }
  }
  return [...latest.values()].filter(({ result }) => ["recover-now", "batch-only"].includes(result.disposition))
    .sort((left, right) => left.input.candidateId.localeCompare(right.input.candidateId));
}

function blockscoutAddresses(urls, expectedHost) {
  const output = [];
  for (const raw of urls) {
    const url = https("candidate source URL", raw);
    if (url.hostname !== expectedHost) continue;
    const match = /^\/address\/(0x[0-9a-fA-F]{40})\/?$/u.exec(url.pathname);
    if (match) output.push(match[1].toLowerCase());
  }
  return [...new Set(output)];
}

function walletAddress(fleet, wallet) {
  const subject = `urn:ame:wallet:${wallet.toLowerCase()}`;
  const entry = fleet.wallets.find((candidate) => candidate.subject === subject);
  if (entry == null || !ADDRESS.test(entry.address ?? "")) throw new TypeError(`fleet lacks ${subject} public address`);
  return entry.address;
}

function chainConfiguration(fleet, caip2) {
  const chain = fleet.chains.find((candidate) => candidate.caip2 === caip2);
  if (chain == null || chain.transferIndexerKind !== "blockscout-current-holdings") {
    throw new TypeError(`fleet lacks Blockscout current-holdings configuration for ${caip2}`);
  }
  const relay = https("transferIndexerRelayUrl", chain.transferIndexerRelayUrl);
  const upstream = new URL(relay.pathname.slice(1));
  if (relay.hostname !== "r.jina.ai" || upstream.protocol !== "http:"
    || !/\.blockscout\.com$/u.test(upstream.hostname) || !upstream.pathname.endsWith("/api/v2/")) {
    throw new TypeError(`unsupported bounded Blockscout relay for ${caip2}`);
  }
  return { ...chain, relay, upstreamHost: upstream.hostname };
}

function relayUrl(configuration, suffix) {
  const base = configuration.relay.href.endsWith("/") ? configuration.relay.href : `${configuration.relay.href}/`;
  return new URL(suffix, base);
}

function normalizedHead(body, caip2) {
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 100) {
    throw new TypeError(`${caip2} Blockscout head response must contain one through one hundred blocks`);
  }
  const block = body.items[0];
  if (!Number.isSafeInteger(block.height) || block.height < 1 || !Number.isFinite(Date.parse(block.timestamp))) {
    throw new TypeError(`${caip2} Blockscout head is malformed`);
  }
  return { block: String(block.height), timestamp: String(Math.floor(Date.parse(block.timestamp) / 1_000)) };
}

function normalizedBalances(body, caip2, wallet) {
  if (!Array.isArray(body) || body.length > 10_000) throw new TypeError(`${caip2} ${wallet} balances must be a bounded array`);
  const balances = new Map();
  for (const [index, row] of body.entries()) {
    const address = row?.token?.address_hash;
    if (!ADDRESS.test(address ?? "")) throw new TypeError(`${caip2} ${wallet} balance[${index}] lacks a token address`);
    const value = integerText(`${caip2} ${wallet} balance[${index}].value`, row.value);
    if (BigInt(value) > 0n) balances.set(address.toLowerCase(), value);
  }
  return balances;
}

export async function refreshLegacyCapitalRecoveryPreflight({ records, fleet, now = new Date().toISOString(),
  fetchImpl = fetch } = {}) {
  if (!Number.isFinite(Date.parse(now))) throw new TypeError("now must be an ISO timestamp");
  const publicFleet = object("fleet", fleet);
  if (!Array.isArray(publicFleet.wallets) || !Array.isArray(publicFleet.chains)
    || publicFleet.authority?.observationOnly !== true || publicFleet.authority?.signerMaterialPresent !== false) {
    throw new TypeError("fleet must be a credential-free public observation manifest");
  }
  const selected = latestCandidates(records);
  if (selected.length < 1 || selected.length > 64) throw new TypeError("latest recovery set must contain one through sixty-four actionable candidates");
  const chainIds = [...new Set(selected.map(({ input }) => input.chain.caip2))].sort();
  const configurations = new Map(chainIds.map((caip2) => [caip2, chainConfiguration(publicFleet, caip2)]));
  const headEntries = await Promise.all(chainIds.map(async (caip2) => {
    const configuration = configurations.get(caip2);
    const url = relayUrl(configuration, "blocks?type=block");
    return [caip2, normalizedHead(await fetchRelayJson(url, fetchImpl), caip2), url.href];
  }));
  const heads = new Map(headEntries.map(([caip2, head]) => [caip2, head]));
  const headUrls = new Map(headEntries.map(([caip2, , url]) => [caip2, url]));
  const pairs = [...new Set(selected.map(({ input }) => `${input.chain.caip2}|${input.wallet}`))].sort();
  const balanceEntries = await Promise.all(pairs.map(async (pair) => {
    const [caip2, wallet] = pair.split("|");
    const configuration = configurations.get(caip2);
    const address = walletAddress(publicFleet, wallet);
    const url = relayUrl(configuration, `addresses/${address}/token-balances`);
    return [pair, normalizedBalances(await fetchRelayJson(url, fetchImpl), caip2, wallet), url.href];
  }));
  const balances = new Map(balanceEntries.map(([pair, values]) => [pair, values]));
  const balanceUrls = new Map(balanceEntries.map(([pair, , url]) => [pair, url]));
  const recordedAt = now;
  const assayedAt = String(Math.floor(Date.parse(recordedAt) / 1_000));
  const candidates = selected.map(({ assayId, input, result }) => {
    const caip2 = input.chain.caip2;
    const configuration = configurations.get(caip2);
    const holdings = balances.get(`${caip2}|${input.wallet}`);
    const instrumentAddresses = blockscoutAddresses(input.sourceUrls, configuration.upstreamHost);
    const observedInstrument = instrumentAddresses.find((address) => holdings.has(address)) ?? null;
    const directShare = DIRECT_SHARE_PROTOCOLS.has(String(input.protocol).toLowerCase());
    const positionObservationComplete = observedInstrument != null || directShare;
    const positionStillOwned = observedInstrument != null;
    const fingerprintPlaceholder = semanticId("agrodao.unobserved-contract-fingerprint", { type: "UnobservedContractFingerprint",
      candidateId: input.candidateId, headBlock: heads.get(caip2).block });
    const sourceUrls = [...new Set([...input.sourceUrls, headUrls.get(caip2),
      balanceUrls.get(`${caip2}|${input.wallet}`)])].slice(0, 16);
    return {
      candidateId: input.candidateId,
      wallet: input.wallet,
      protocol: input.protocol,
      chain: { caip2 },
      baseline: { assayId, disposition: result.disposition, snapshotBlock: result.chain.snapshotBlock,
        snapshotTimestamp: result.chain.snapshotTimestamp,
        netMicroUsdAfterFeeCeiling: result.value.netMicroUsdAfterFeeCeiling },
      current: { headBlock: heads.get(caip2).block, headTimestamp: heads.get(caip2).timestamp,
        observedAt: assayedAt, fixedForkBlock: "0", fixedForkTimestamp: "0",
        fixedForkSimulationComplete: false, positionObservationComplete, positionStillOwned,
        outputVerified: false, gasEstimated: false, contractFingerprintObservationComplete: false,
        priceTimestamp: "0", grossMicroUsdFloor: result.value.grossMicroUsdFloor,
        executionFeeMicroUsdCeil: result.value.executionFeeMicroUsdCeil,
        netMicroUsdAfterFeeCeiling: result.value.netMicroUsdAfterFeeCeiling,
        contractFingerprintBaseline: fingerprintPlaceholder, contractFingerprintCurrent: fingerprintPlaceholder,
        legalScopeDeterminationCompleted: false, legalRecordId: "",
        legalAcceptanceRequired: result.evidence.legalAcceptanceRequired,
        legalAcceptanceCompleted: result.evidence.legalAcceptanceCompleted,
        taxScopeDeterminationCompleted: false, taxReviewRequired: true,
        taxReviewCompleted: false, taxRecordId: "" },
      policy: { maximumHeadAgeSeconds: "900", maximumPriceAgeSeconds: "900",
        maximumAssayDelaySeconds: "120", executionWindowSeconds: "300",
        minimumNetRetentionBps: "9000", maximumDragBps: "1000", minimumCurrentNetMicroUsd: "100000" },
      sourceUrls,
    };
  });
  return { recordedAt, input: { profile: "org.emsenn.agrodao.legacy-capital-recovery-preflight.v1",
    assayedAt, authority: { publicEvidenceOnly: true, fixedForkEvidenceOnly: true, liveMutation: false,
      transactionAssembly: false, signerMaterialPresent: false, signing: false, broadcast: false }, candidates },
  observation: { heads: Object.fromEntries(headEntries.map(([caip2, head, url]) => [caip2, { ...head, url }])),
    positivePositionCount: String(candidates.filter(({ current }) => current.positionStillOwned).length),
    conclusiveMissingCount: String(candidates.filter(({ current }) => current.positionObservationComplete
      && !current.positionStillOwned).length) } };
}
