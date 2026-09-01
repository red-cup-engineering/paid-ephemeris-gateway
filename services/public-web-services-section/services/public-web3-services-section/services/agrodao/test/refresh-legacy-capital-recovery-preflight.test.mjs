import assert from "node:assert/strict";
import test from "node:test";

import { assayLegacyCapitalRecoveryPreflight } from "../src/legacy-capital-recovery-preflight.mjs";
import { parseBlockscoutRelayJson, refreshLegacyCapitalRecoveryPreflight }
  from "../src/refresh-legacy-capital-recovery-preflight.mjs";

const TOKEN_1 = "0x1111111111111111111111111111111111111111";
const TOKEN_2 = "0x2222222222222222222222222222222222222222";
const TOKEN_3 = "0x3333333333333333333333333333333333333333";
const ASSAY = `ni:///sha-256;${"A".repeat(43)}`;

function inputCandidate(candidateId, wallet, protocol, token) {
  return { candidateId, wallet, protocol, asset: `${protocol} legacy position`,
    chain: { caip2: "eip155:8453", snapshotBlock: "1000", snapshotTimestamp: "1784720000" },
    sourceUrls: [`https://base.blockscout.com/address/${token}`,
      `https://docs.example.com/${protocol.toLowerCase()}`] };
}

function resultCandidate(input, disposition = "recover-now") {
  return { candidateId: input.candidateId, wallet: input.wallet, protocol: input.protocol,
    disposition, chain: input.chain, evidence: { legalAcceptanceRequired: false, legalAcceptanceCompleted: false },
    value: { grossMicroUsdFloor: "2100000", executionFeeMicroUsdCeil: "100000",
      netMicroUsdAfterFeeCeiling: "2000000", dragBpsCeil: "477" } };
}

function record(recordedAt, candidates, dispositions = {}) {
  return { recordedAt, assay: { id: ASSAY,
    candidates: candidates.map((candidate) => resultCandidate(candidate, dispositions[candidate.candidateId])) },
  evidenceInput: { candidates } };
}

function fleet() {
  return { wallets: [
    { subject: "urn:ame:wallet:sigmund", aliases: ["ANOTHER_WALLET"],
      address: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a" },
    { subject: "urn:ame:wallet:yanagi", aliases: ["MAIN_WALLET"],
      address: "0x224C08A8526751887a83e2711B167f890c6D078d" },
  ], chains: [{ caip2: "eip155:8453", transferIndexerKind: "blockscout-current-holdings",
    transferIndexerRelayUrl: "https://r.jina.ai/http://base.blockscout.com/api/v2/" }],
  authority: { observationOnly: true, signerMaterialPresent: false } };
}

const envelope = (value) => `Title: \n\nURL Source: http://base.blockscout.com\n\nMarkdown Content:\n${JSON.stringify(value)}`;

function fetcher(url) {
  const href = String(url);
  let value;
  if (href.includes("blocks?type=block")) value = { items: [{ height: 1200,
    timestamp: "2026-07-22T13:59:30.000000Z" }] };
  else if (href.includes("32886F6F")) value = [{ token: { address_hash: TOKEN_1 }, value: "7" }];
  else if (href.includes("224C08A8")) value = [];
  else throw new Error(`unexpected URL ${href}`);
  return Promise.resolve({ ok: true, status: 200, text: async () => envelope(value) });
}

test("parses only bounded exact JSON from the Blockscout relay envelope", () => {
  assert.deepEqual(parseBlockscoutRelayJson(envelope({ items: [] })), { items: [] });
  assert.throws(() => parseBlockscoutRelayJson("{}"), /Markdown Content/u);
  assert.throws(() => parseBlockscoutRelayJson("Markdown Content:\nnot-json"), /not exact JSON/u);
});

test("refresh binds heads and positive balances while keeping missing evidence blocked", async () => {
  const dexfi = inputCandidate("sigmund-dexfi-main", "SIGMUND", "DexFi", TOKEN_1);
  const mellow = inputCandidate("sigmund-mellow-missing", "SIGMUND", "Mellow", TOKEN_2);
  const beefy = inputCandidate("yanagi-beefy-staked", "YANAGI", "Beefy", TOKEN_3);
  const refreshed = await refreshLegacyCapitalRecoveryPreflight({
    records: [record("2026-07-22T13:00:00.000Z", [dexfi, mellow, beefy])], fleet: fleet(),
    now: "2026-07-22T14:00:00.000Z", fetchImpl: fetcher,
  });
  assert.deepEqual(refreshed.observation.heads["eip155:8453"].block, "1200");
  assert.equal(refreshed.observation.positivePositionCount, "1");
  assert.equal(refreshed.observation.conclusiveMissingCount, "1");
  const byId = Object.fromEntries(refreshed.input.candidates.map((candidate) => [candidate.candidateId, candidate]));
  assert.equal(byId["sigmund-dexfi-main"].current.positionStillOwned, true);
  assert.equal(byId["sigmund-mellow-missing"].current.positionObservationComplete, true);
  assert.equal(byId["sigmund-mellow-missing"].current.positionStillOwned, false);
  assert.equal(byId["yanagi-beefy-staked"].current.positionObservationComplete, false);
  assert.ok(refreshed.input.candidates.every(({ current }) => !current.fixedForkSimulationComplete
    && !current.contractFingerprintObservationComplete && !current.taxScopeDeterminationCompleted));
  const preflight = assayLegacyCapitalRecoveryPreflight(refreshed.input);
  assert.equal(preflight.dispositionCounts["human-review-ready"], "0");
  assert.equal(preflight.candidates.find(({ candidateId }) => candidateId === "sigmund-mellow-missing").disposition,
    "position-missing");
  assert.ok(preflight.candidates.filter(({ candidateId }) => candidateId !== "sigmund-mellow-missing")
    .every(({ disposition }) => disposition === "stale-evidence"));
});

test("latest candidate state wins before actionable filtering", async () => {
  const retired = inputCandidate("sigmund-retired", "SIGMUND", "DexFi", TOKEN_1);
  const active = inputCandidate("sigmund-active", "SIGMUND", "DexFi", TOKEN_1);
  const refreshed = await refreshLegacyCapitalRecoveryPreflight({ records: [
    record("2026-07-22T12:00:00.000Z", [retired, active]),
    record("2026-07-22T13:00:00.000Z", [retired], { "sigmund-retired": "leave-dust" }),
  ], fleet: fleet(), now: "2026-07-22T14:00:00.000Z", fetchImpl: fetcher });
  assert.deepEqual(refreshed.input.candidates.map(({ candidateId }) => candidateId), ["sigmund-active"]);
});

test("refuses malformed heads, balances, and unauthorized fleet manifests", async () => {
  const active = inputCandidate("sigmund-active", "SIGMUND", "DexFi", TOKEN_1);
  const records = [record("2026-07-22T13:00:00.000Z", [active])];
  await assert.rejects(() => refreshLegacyCapitalRecoveryPreflight({ records, fleet: fleet(),
    now: "2026-07-22T14:00:00.000Z", fetchImpl: async () => ({ ok: true, text: async () => envelope({ items: [] }) }) }),
  /one through one hundred blocks/u);
  await assert.rejects(() => refreshLegacyCapitalRecoveryPreflight({ records,
    fleet: { ...fleet(), authority: { observationOnly: false, signerMaterialPresent: false } },
    now: "2026-07-22T14:00:00.000Z", fetchImpl: fetcher }), /public observation manifest/u);
});
