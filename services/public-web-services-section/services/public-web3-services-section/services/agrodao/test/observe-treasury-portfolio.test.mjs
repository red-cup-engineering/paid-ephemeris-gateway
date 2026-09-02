import assert from "node:assert/strict";
import test from "node:test";

import { publicWalletFleet } from "../src/procure-public-evm-wallet-observation.mjs";
import { defaultSettlementRoot, observeTreasuryPortfolio } from "../src/observe-treasury-portfolio.mjs";

const AT = "2026-09-01T22:30:00.000Z";

test("records one secret-free, explicitly incomplete treasury portfolio disclosure", async () => {
  const fleet = publicWalletFleet();
  const entries = [];
  const reportPortfolio = async ({ roster, chains, moonwell }) => {
    assert.ok(roster.some(({ subject }) => subject === "urn:ame:wallet:yanagi"));
    assert.ok(roster.some(({ subject }) => subject === "urn:ame:wallet:sigmund"));
    assert.deepEqual(chains.map(({ caip2 }) => caip2).sort(), ["eip155:42161", "eip155:8453"]);
    assert.match(moonwell.base.rewardDistributor, /^0x[0-9a-fA-F]{40}$/u);
    return {
      observedAt: AT,
      roster,
      chains: [
        {
          chain: "base",
          caip2: "eip155:8453",
          checked: true,
          provenance: {
            chain: "base", chainId: 8453, caip2: "eip155:8453",
            blockNumber: "123", blockTag: "0x7b", blockHash: `0x${"ab".repeat(32)}`,
            provider: "https://mainnet.base.org", observedAt: AT,
            requestedFinality: "finalized", finality: "finalized",
          },
          wallets: [],
          coverage: {
            walletsAttempted: roster.length,
            walletsObserved: roster.length - 1,
            complete: false,
            unchecked: [{ subject: "urn:ame:wallet:sigmund", component: "verifiedTokens", reason: "token discovery unavailable" }],
          },
        },
        {
          chain: "arbitrum",
          caip2: "eip155:42161",
          checked: false,
          provenance: null,
          reason: "finalized boundary unavailable",
          attempts: [],
          wallets: [],
          coverage: { walletsAttempted: roster.length, walletsObserved: 0, complete: false, unchecked: [] },
        },
      ],
      coverage: { complete: false, incompleteChains: ["base", "arbitrum"] },
    };
  };
  const healthCalls = [];
  const enteredMarket = "0x1111111111111111111111111111111111111111";
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async (entry) => entries.push(entry) },
    observeHealth: async (request) => {
      healthCalls.push(request.account);
      assert.equal(request.snapshotBlock, "123");
      assert.equal(request.snapshotBlockHash, `0x${"ab".repeat(32)}`);
      assert.equal(request.targetHealthFactorMantissa, "1500000000000000000");
      if (!request.account.endsWith("224c08a8526751887a83e2711b167f890c6d078d")) {
        return {
          caip2: "eip155:8453", account: request.account, snapshotBlock: "123",
          snapshotBlockHash: `0x${"ab".repeat(32)}`, markets: [],
          outcome: { type: "no-entered-markets", factual: true, enteredMarketCount: 0 },
          riskEvaluationPerformed: false,
        };
      }
      return {
        caip2: "eip155:8453",
        account: request.account,
        snapshotBlock: "123",
        snapshotBlockHash: `0x${"ab".repeat(32)}`,
        markets: [{ market: enteredMarket, symbol: "mcbBTC", underlyingDecimals: 8 }],
        outcome: { type: "account-health-evaluated", factual: false, enteredMarketCount: 1 },
        riskEvaluationPerformed: true,
        evaluation: {
          current: {
            healthFactor: { kind: "finite", mantissa: "1200000000000000000" },
            targetSatisfied: false,
          },
          repaymentOptions: [{
            market: enteredMarket, symbol: "mcbBTC", currentMinimumUnderlyingRaw: "250",
          }],
          guard: { withdrawalOrLeverageExpansionAdmitted: false },
        },
      };
    },
  });

  assert.equal(disclosure.type, "TreasuryPortfolioDisclosure");
  assert.ok(disclosure.subjects.includes("urn:ame:wallet:yanagi"));
  assert.ok(disclosure.subjects.includes("urn:ame:wallet:sigmund"));
  assert.equal(disclosure.coverage.complete, false);
  assert.deepEqual(disclosure.coverage.incompleteChains.sort(), ["eip155:42161", "eip155:8453"]);
  assert.ok(disclosure.unknowns.some(({ subject, component }) => subject === "urn:ame:wallet:sigmund" && component === "verifiedTokens"));
  assert.ok(disclosure.unknowns.some(({ chain, component }) => chain === "eip155:42161" && component === "chain"));
  assert.deepEqual(disclosure.valuation, {
    priced: false,
    totalUsd: null,
    reason: "no portfolio-wide USD valuation provider was supplied",
  });
  assert.deepEqual(disclosure.authority, {
    observationOnly: true,
    chainMutation: false,
    humanApprovalRequiredForMutation: true,
  });
  assert.equal(healthCalls.length, fleet.wallets.length, "the upstream observer classifies every fleet account");
  const yanagiRisk = disclosure.moonwellRisk.find(({ subject }) => subject === "urn:ame:wallet:yanagi");
  assert.equal(yanagiRisk.status, "observed");
  assert.equal(yanagiRisk.healthFactor.decimal, "1.2");
  assert.equal(yanagiRisk.targetHealthFactor.decimal, "1.5");
  assert.equal(yanagiRisk.cbBtcRepayment.exactMinimumSats, "250");
  assert.equal(yanagiRisk.guard.newLeverageAdmitted, false);
  assert.equal(yanagiRisk.authority.humanApprovalRequired, true);
  const sigmundRisk = disclosure.moonwellRisk.find(({ subject }) => subject === "urn:ame:wallet:sigmund");
  assert.equal(sigmundRisk.status, "no-entered-markets");
  assert.equal(sigmundRisk.factual, true);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, "agrodao.treasury-portfolio-disclosure");
  assert.equal(entries[0].record, disclosure);

  const serialized = JSON.stringify(disclosure);
  assert.doesNotMatch(serialized, /MAIN_WALLET|ANOTHER_WALLET|mnemonic|private.?key|seed.?phrase/iu);
  const forbiddenKeys = [];
  JSON.parse(serialized, (key, value) => {
    if (key !== "transactionConstruction" && /(?:secret|signer|signature|action)/iu.test(key)) forbiddenKeys.push(key);
    return value;
  });
  assert.deepEqual(forbiddenKeys, []);
});

test("preserves entered-market and health refusal as unknown", async () => {
  const fleet = publicWalletFleet();
  const reportPortfolio = async ({ roster }) => ({
    observedAt: AT,
    roster,
    chains: [{
      chain: "base", caip2: "eip155:8453", checked: true,
      provenance: {
        chain: "base", chainId: 8453, caip2: "eip155:8453", blockNumber: "123", blockTag: "0x7b",
        blockHash: `0x${"ab".repeat(32)}`, provider: "https://mainnet.base.org", observedAt: AT,
        requestedFinality: "finalized", finality: "finalized",
      },
      wallets: [], coverage: { walletsObserved: roster.length, complete: true, unchecked: [] },
    }],
    coverage: { complete: true, incompleteChains: [] },
  });
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async () => {} },
    observeHealth: async (_request, { readPool }) => {
      assert.equal(typeof readPool.requestAtBoundary, "function");
      throw new Error("health refused");
    },
  });
  assert.equal(disclosure.moonwellRisk[0].status, "unknown");
  assert.ok(disclosure.moonwellRisk.every(({ status, reason }) => status === "unknown" && /health refused/.test(reason)));
});

test("installed upstream pool fails over once at the exact boundary and never mixes an account across providers", async () => {
  const completeFleet = publicWalletFleet();
  const fleet = { ...completeFleet, wallets: completeFleet.wallets.slice(0, 3) };
  const boundary = {
    chain: "base", chainId: 8453, caip2: "eip155:8453", blockNumber: "123", blockTag: "0x7b",
    blockHash: `0x${"ab".repeat(32)}`, provider: "https://mainnet.base.org", observedAt: AT,
    requestedFinality: "finalized", finality: "finalized",
  };
  const reportPortfolio = async ({ roster }) => ({
    observedAt: AT,
    roster,
    chains: [{
      chain: "base", caip2: "eip155:8453", checked: true, provenance: boundary,
      wallets: [], coverage: { walletsObserved: roster.length, complete: true, unchecked: [] },
    }],
    coverage: { complete: true, incompleteChains: [] },
  });
  const calls = [];
  const expectedHash = boundary.blockHash.toLowerCase();
  const oracle = "0x2222222222222222222222222222222222222222";
  const clients = new Map();
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async () => {} },
    readPoolOptions: {
      maxAttemptsPerProvider: 1,
      minimumIntervalMs: 0,
      createClient: ({ provider }) => {
        const client = {
          getChainId: async () => {
            calls.push({ provider: provider.id, operation: "chain" });
            if (provider.id === "base-mainnet") {
              const error = new Error("HTTP 429: Too Many Requests");
              error.status = 429;
              throw error;
            }
            return 8453;
          },
          getBlock: async ({ blockNumber }) => {
            calls.push({ provider: provider.id, operation: "block", blockNumber });
            return { number: 123n, hash: expectedHash, timestamp: 1_756_767_000n };
          },
          multicall: async ({ contracts, blockNumber, allowFailure }) => {
            const account = contracts[0].args[0].toLowerCase();
            calls.push({ provider: provider.id, operation: "account", account, blockNumber });
            assert.equal(allowFailure, false);
            assert.deepEqual(contracts.map(({ functionName }) => functionName),
              ["getAssetsIn", "oracle", "getAccountLiquidity"]);
            return [[], oracle, [0n, 0n, 0n]];
          },
        };
        clients.set(provider.id, client);
        return client;
      },
    },
  });

  assert.equal(clients.size, 3, "the installed pool constructs the canonical Base provider set once");
  assert.equal(calls.filter(({ provider }) => provider === "base-mainnet").length, 1,
    "the failed endpoint remains failed for the rest of this fleet run");
  const accountCalls = calls.filter(({ operation }) => operation === "account");
  assert.equal(accountCalls.length, fleet.wallets.length);
  assert.deepEqual(accountCalls.map(({ provider }) => provider), fleet.wallets.map(() => "base-publicnode"));
  assert.deepEqual(accountCalls.map(({ account }) => account), fleet.wallets.map(({ address }) => address.toLowerCase()));
  assert.ok(accountCalls.every(({ blockNumber }) => blockNumber === 123n));
  assert.ok(calls.filter(({ operation }) => operation === "block")
    .every(({ blockNumber }) => blockNumber === 123n));
  assert.ok(disclosure.moonwellRisk.every(({ account, status, factual }) =>
    /^eip155:8453:0x[0-9a-f]{40}$/u.test(account) && status === "no-entered-markets" && factual === true));
});

test("default settlement root is the package root, so journal custody appends data/logs once", () => {
  const root = defaultSettlementRoot({});
  assert.match(root, /services\/agrodao$/u);
  assert.doesNotMatch(root, /\/data$/u);
  assert.equal(defaultSettlementRoot({ AGRODAO_SETTLEMENT_ROOT: "/tmp/agrodao-settlement" }), "/tmp/agrodao-settlement");
});
