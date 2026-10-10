import assert from "node:assert/strict";
import test from "node:test";

import { observeLegacyRecoveryContractFingerprints, recordLegacyRecoveryContractFingerprintObservation }
  from "../src/legacy-recovery-contract-fingerprint-observation.mjs";

const DIRECT = "0x1111111111111111111111111111111111111111";
const PROXY = "0x2222222222222222222222222222222222222222";
const IMPL = "0x3333333333333333333333333333333333333333";
const MISSING = "0x4444444444444444444444444444444444444444";

function fleet() { return { chains: [{ caip2: "eip155:8453", transferIndexerKind: "blockscout-current-holdings",
  transferIndexerRelayUrl: "https://r.jina.ai/http://base.blockscout.com/api/v2/" }],
authority: { observationOnly: true, signerMaterialPresent: false } }; }

function candidate(candidateId, address) { return { candidateId, wallet: "YANAGI", protocol: "Test",
  chain: { caip2: "eip155:8453" }, sourceUrls: address == null ? ["https://docs.example.com/test"]
    : [`https://base.blockscout.com/address/${address}`, "https://docs.example.com/test"] }; }

function records(candidates) { return [{ recordedAt: "2026-07-22T14:00:00.000Z", preflight: {
  id: `ni:///sha-256;${"A".repeat(43)}`, candidates } }]; }

const envelope = (value) => `Title:\n\nMarkdown Content:\n${JSON.stringify(value)}`;
function fetcher(url) {
  const href = String(url);
  let value;
  if (href.includes("blocks?type=block")) value = { items: [{ height: 1234,
    timestamp: "2026-07-22T14:01:00.000Z" }] };
  else if (href.includes(DIRECT)) value = { deployed_bytecode: "0x6000", proxy_type: null,
    implementations: [], is_verified: true };
  else if (href.includes(PROXY)) value = { deployed_bytecode: "0x6001", proxy_type: "eip1967",
    implementations: [{ address_hash: IMPL }] };
  else if (href.includes(IMPL)) value = { deployed_bytecode: "0x6002", proxy_type: null, implementations: [] };
  else if (href.includes(MISSING)) value = { deployed_bytecode: null, proxy_type: null, implementations: [] };
  else throw new Error(`unexpected URL ${href}`);
  return Promise.resolve({ ok: true, status: 200, text: async () => envelope(value) });
}

test("observes direct and recursively resolved proxy identities conservatively", async () => {
  const result = await observeLegacyRecoveryContractFingerprints({ records: records([
    candidate("direct", DIRECT), candidate("proxy", PROXY), candidate("missing", MISSING), candidate("unknown", null),
  ]), fleet: fleet(), now: "2026-07-22T14:02:00.000Z", fetchImpl: fetcher, minimumRequestIntervalMs: 0 });
  assert.equal(result.completeCurrentIdentityCount, "2");
  assert.equal(result.completeBaselineComparisonCount, "0");
  const byId = Object.fromEntries(result.candidates.map((entry) => [entry.candidateId, entry]));
  assert.equal(byId.direct.observationComplete, true);
  assert.match(byId.direct.contractSetFingerprint, /^ni:\/\/\/sha-256;/u);
  assert.equal(byId.proxy.roots[0].implementations[0].address, IMPL);
  assert.equal(byId.proxy.observationComplete, true);
  assert.equal(byId.missing.observationComplete, false);
  assert.equal(byId.unknown.reason, "no explorer contract address was supplied");
  assert.equal(result.gate.exactHeadBinding, false);
  assert.equal(result.gate.executionAdmitted, false);
});

test("refuses unauthorized fleets and preserves deterministic identities", async () => {
  const args = { records: records([candidate("direct", DIRECT)]), fleet: fleet(),
    now: "2026-07-22T14:02:00.000Z", fetchImpl: fetcher, minimumRequestIntervalMs: 0 };
  const left = await observeLegacyRecoveryContractFingerprints(args);
  const right = await observeLegacyRecoveryContractFingerprints(args);
  assert.equal(left.id, right.id);
  await assert.rejects(() => observeLegacyRecoveryContractFingerprints({ ...args,
    fleet: { ...fleet(), authority: { observationOnly: false, signerMaterialPresent: false } } }),
  /public observation manifest/u);
});

test("caches shared contract metadata within one chain observation", async () => {
  let proxyFetches = 0;
  let implementationFetches = 0;
  const counted = async (url, init) => {
    if (String(url).includes(PROXY)) proxyFetches += 1;
    if (String(url).includes(IMPL)) implementationFetches += 1;
    return fetcher(url, init);
  };
  await observeLegacyRecoveryContractFingerprints({ records: records([
    candidate("proxy-left", PROXY), candidate("proxy-right", PROXY),
  ]), fleet: fleet(), now: "2026-07-22T14:02:00.000Z", fetchImpl: counted,
  minimumRequestIntervalMs: 0 });
  assert.equal(proxyFetches, 1);
  assert.equal(implementationFetches, 1);
});

test("records only through AGRODAO's settlement boundary", async () => {
  const result = await observeLegacyRecoveryContractFingerprints({ records: records([candidate("direct", DIRECT)]),
    fleet: fleet(), now: "2026-07-22T14:02:00.000Z", fetchImpl: fetcher, minimumRequestIntervalMs: 0 });
  const writes = [];
  const store = { actor: "urn:ame:agrodao", record: async (request) => { writes.push(request); return { digest: "x" }; } };
  await recordLegacyRecoveryContractFingerprintObservation(result, { store,
    recordedAt: "2026-07-22T14:02:01.000Z" });
  assert.equal(writes[0].category, "agrodao.legacy-recovery-contract-fingerprint-observation");
  assert.equal(writes[0].record.observation.id, result.id);
  const tampered = structuredClone(result);
  tampered.completeCurrentIdentityCount = "0";
  await assert.rejects(() => recordLegacyRecoveryContractFingerprintObservation(tampered, { store }),
    /content identity is invalid/u);
  await assert.rejects(() => recordLegacyRecoveryContractFingerprintObservation(result, {
    store: { actor: "urn:ame:other", record: async () => ({}) } }), /AGRODAO/u);
});
