import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { startWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/test-provider";

import { observePublicWallet, run as runProvider } from "@red-cup-engineering/ethereum-services-section/public-wallet-observation";
import { configuredRuntimeEnvironment, publicAccount, publicWalletFleet, runLedgerProcurement, runProcurement, sanitizedProviderEnvironment } from "../src/procure-public-evm-wallet-observation.mjs";

const AT = "2026-07-21T18:30:00.000Z";

function fixtureFetch() {
  return async (url) => {
    if (url.includes("/positions?")) return [];
    if (url.includes("/orders?")) return [];
    if (url.includes("/staking/power?")) return { currentStaked: "740317467429280984", historicalMaxStaked: "740317467429280984", projectedRewardShare: "39172556409776732" };
    if (url.includes("prices/tickers")) return [{ tokenAddress: "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96", minPrice: "1366253000000000000000000000000", maxPrice: "1366375000000000000000000000000" }];
    if (url.includes("/api/graphql")) return { data: { claimableAmounts: [
      { distributionId: "11802763389053472339483616176459046875189472617101418668457790595837638713068", token: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9", amount: "4149456793756073183" },
      { distributionId: "11802763389053472339483616176459046875189472617101418668457790595837638713068", token: "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96", amount: "3817608593649773717" },
    ] } };
    return [
      { token: { address_hash: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", type: "ERC-20" }, token_id: null, value: "9385746483603618712" },
      { token: { address_hash: "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96", type: "ERC-20" }, token_id: null, value: "9116172534368098201" },
      { token: { address_hash: "0xAEDeF7904CECc1672a5Eb03AC53E00003E25ba56", type: "ERC-20" }, token_id: null, value: "999" },
    ];
  };
}

test("the customer binds its exact public account and wallet fleet", () => {
  assert.equal(publicAccount(), "eip155:42161:0x224C08A8526751887a83e2711B167f890c6D078d");
  assert.equal(publicWalletFleet().wallets.length, 10);
});

test("the operator runtime binds the hired public WitnessJournal provider without weakening explicit library refusal", () => {
  const configured = configuredRuntimeEnvironment({ SAFE_PUBLIC_SETTING: "kept" });
  assert.equal(configured.WITNESS_JOURNAL_RDF_AGENT,
    "https://witness-journal-rdf-projection-service-a2d7mjqbfa-uc.a.run.app/.well-known/agent-card.json");
  assert.equal(configured.SAFE_PUBLIC_SETTING, "kept");
  const explicit = { WITNESS_JOURNAL_RDF_AGENT: "https://provider.example/.well-known/agent-card.json" };
  assert.equal(configuredRuntimeEnvironment(explicit), explicit);
});

test("AGRODAO procures and records a bounded Base and Arbitrum wallet-fleet ledger", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "agrodao-public-ledger-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const buyerRoot = join(root, "buyer"); const providerRoot = join(root, "provider");
  const witnessJournal = await startWitnessJournalProviderProcess(); t.after(async () => witnessJournal.close());
  const env = { AGRODAO_DATA_ROOT: buyerRoot, ETHEREUM_OBSERVATION_DATA_ROOT: providerRoot, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
  const word = (value) => BigInt(value).toString(16).padStart(64, "0");
  const stringResult = (value) => {
    const bytes = Buffer.from(value, "utf8").toString("hex");
    return `0x${word(32)}${word(bytes.length / 2)}${bytes.padEnd(Math.ceil(bytes.length / 64) * 64, "0")}`;
  };
  const rpc = async (url, method, params) => {
    if (method === "eth_chainId") return url.includes("arbitrum") ? "0xa4b1" : "0x2105";
    if (method === "eth_blockNumber") return url.includes("arbitrum") ? "0x2000" : "0x1000";
    if (method === "eth_getBalance" || method === "eth_getTransactionCount") return "0x0";
    if (method === "eth_getCode") return "0x6000";
    if (method === "eth_getStorageAt") return `0x${"0".repeat(64)}`;
    if (method === "eth_call") {
      const data = params[0].data;
      if (data.startsWith("0x70a08231")) return `0x${word(42)}`;
      if (data.startsWith("0x06fdde03")) return stringResult("Wrapped Ether");
      if (data.startsWith("0x95d89b41")) return stringResult("WETH");
      if (data.startsWith("0x313ce567")) return `0x${word(18)}`;
    }
    throw new Error(`unexpected ${method}`);
  };
  const fetchImpl = async (url) => {
    const value = String(url); const isYanagiBase = value.includes("base.blockscout.com")
      && value.toLowerCase().includes("0x224c08a8526751887a83e2711b167f890c6d078d");
    const body = isYanagiBase ? [{ value: "999", token_id: null, token: {
      address_hash: "0x4200000000000000000000000000000000000006", type: "ERC-20",
      name: "Indexed WETH", symbol: "IWETH", decimals: "18" } }] : [];
    return { ok: true, text: async () => `Title: \n\nURL Source: public fixture\n\nMarkdown Content:\n${JSON.stringify(body)}` };
  };
  const observer = (request, at) => observePublicWallet(request, at, { rpc, fetchImpl, contractConcurrency: 2 });
  const transport = (activity, operation, at, providerEnv) => runProvider(activity, operation, at, providerEnv, observer);
  const trade = await runLedgerProcurement(AT, env, transport);
  assert.equal(trade.ok, true);
  assert.equal(trade.disclosure.scope, "public-evm-ledger");
  assert.equal(trade.disclosure.scopeCompleteness, "complete");
  assert.equal(trade.disclosure.walletCount, 10);
  assert.equal(trade.disclosure.accountObservationCount, 20);
  assert.equal(trade.disclosure.activeAccountCount, 1);
  assert.equal(trade.disclosure.positions.find((position) => position.contracts.length > 0).contracts[0].current.rawBalance, "42");
  assert.equal(trade.disclosure.decisionBoundary.chainMutation, false);
  assert.equal((await querySettlementRecords("agrodao.public-evm-ledger-procurement-completion")).length, 1);
  assert.equal((await querySettlementRecords("ethereum-services.public-wallet-observation-receipt")).length, 1);
});

test("AGRODAO procures and records Yanagi's read-only public GMX observation", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "agrodao-public-observation-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const buyerRoot = join(root, "buyer"); const providerRoot = join(root, "provider");
  const witnessJournal = await startWitnessJournalProviderProcess(); t.after(async () => witnessJournal.close());
  const env = { AGRODAO_DATA_ROOT: buyerRoot, ETHEREUM_OBSERVATION_DATA_ROOT: providerRoot, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
  const observer = (request, at) => observePublicWallet(request, at, { fetchJson: fixtureFetch() });
  const transport = (activity, operation, at, providerEnv) => runProvider(activity, operation, at, providerEnv, observer);
  const trade = await runProcurement(AT, env, transport);
  assert.equal(trade.ok, true);
  assert.equal(trade.disclosure.subject, "urn:ame:yanagi");
  assert.equal(trade.disclosure.positions.openCount, 0);
  assert.equal(trade.disclosure.orders.openCount, 0);
  assert.ok(trade.disclosure.findings.includes("deprecated-gmx-v1-liquidity-balance-observed"));
  assert.ok(trade.disclosure.findings.includes("glp-compensation-observed-legal-acceptance-required"));
  assert.ok(trade.disclosure.findings.includes("unsolicited-token-metadata-suppressed"));
  assert.equal(trade.disclosure.decisionBoundary.transactionAssembled, false);
  assert.equal(trade.disclosure.decisionBoundary.signatureRequested, false);
  assert.equal(trade.completion.chainMutation, false);
  assert.equal((await querySettlementRecords("agrodao.public-evm-observation-procurement-completion")).length, 1);
  assert.equal((await querySettlementRecords("ethereum-services.public-wallet-observation-receipt")).length, 1);
});

test("provider child environment strips wallet and signer secrets", () => {
  const child = sanitizedProviderEnvironment({ YANAGI_WALLET: "secret", OTHER_MNEMONIC: "secret", PRIVATE_KEY: "secret", SAFE_PUBLIC_SETTING: "kept" });
  assert.equal(child.YANAGI_WALLET, undefined);
  assert.equal(child.OTHER_MNEMONIC, undefined);
  assert.equal(child.PRIVATE_KEY, undefined);
  assert.equal(child.SAFE_PUBLIC_SETTING, undefined);
});
