import assert from "node:assert/strict";
import test from "node:test";
import { Interface } from "ethers";

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
  let healthCalls = 0;
  const enteredMarket = "0x1111111111111111111111111111111111111111";
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async (entry) => entries.push(entry) },
    observeEnteredMarkets: async ({ account, boundary }) => {
      assert.equal(boundary.blockNumber, "123");
      return account.endsWith("224c08a8526751887a83e2711b167f890c6d078d") ? [enteredMarket] : [];
    },
    observeHealth: async (request) => {
      healthCalls += 1;
      assert.equal(request.snapshotBlock, "123");
      assert.equal(request.targetHealthFactorMantissa, "1500000000000000000");
      return {
        caip2: "eip155:8453",
        account: request.account,
        snapshotBlock: "123",
        markets: [{ market: enteredMarket, symbol: "mcbBTC", underlyingDecimals: 8 }],
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
  assert.equal(healthCalls, 1, "health is evaluated only for accounts with entered markets");
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
  let index = 0;
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async () => {} },
    observeEnteredMarkets: async () => {
      index += 1;
      if (index === 1) throw new Error("rpc refused");
      return ["0x1111111111111111111111111111111111111111"];
    },
    observeHealth: async () => { throw new Error("health refused"); },
  });
  assert.equal(disclosure.moonwellRisk[0].status, "unknown");
  assert.match(disclosure.moonwellRisk[0].reason, /rpc refused/);
  assert.ok(disclosure.moonwellRisk.slice(1).every(({ status, reason }) => status === "unknown" && /health refused/.test(reason)));
});

test("default entered-market ABI receives bare addresses while disclosure keeps CAIP-10", async () => {
  const fleet = publicWalletFleet();
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
  const iface = new Interface(["function getAssetsIn(address) view returns (address[])"]);
  const encodedAddresses = [];
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async () => {} },
    rpc: async (_url, method, params) => {
      assert.equal(method, "eth_call");
      assert.equal(params[1], boundary.blockTag);
      const [address] = iface.decodeFunctionData("getAssetsIn", params[0].data);
      encodedAddresses.push(String(address));
      return iface.encodeFunctionResult("getAssetsIn", [[]]);
    },
    rpcSchedule: async () => {},
    observeHealth: async () => { throw new Error("health must not run for an empty market list"); },
  });

  assert.equal(encodedAddresses.length, fleet.wallets.length);
  assert.ok(encodedAddresses.every((address) => /^0x[0-9a-fA-F]{40}$/u.test(address) && !address.includes(":")));
  assert.ok(disclosure.moonwellRisk.every(({ account, status, factual }) =>
    /^eip155:8453:0x[0-9a-f]{40}$/u.test(account) && status === "no-entered-markets" && factual === true));
});

test("shared Moonwell RPC lane retries one 429 without multiplying fleet bursts", async () => {
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
  const iface = new Interface(["function getAssetsIn(address) view returns (address[])"]);
  const attempts = [];
  const waits = [];
  let active = 0;
  let maximumActive = 0;
  let first = true;
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async () => {} },
    rpcSchedule: async (milliseconds) => waits.push(milliseconds),
    rpc: async (_url, method, params) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        assert.equal(method, "eth_call");
        const [address] = iface.decodeFunctionData("getAssetsIn", params[0].data);
        attempts.push(String(address).toLowerCase());
        await Promise.resolve();
        if (first) {
          first = false;
          throw new Error("JSON-RPC HTTP 429: Too Many Requests");
        }
        return iface.encodeFunctionResult("getAssetsIn", [[]]);
      } finally {
        active -= 1;
      }
    },
    observeHealth: async () => { throw new Error("health must not run for an empty market list"); },
  });

  assert.equal(maximumActive, 1);
  assert.equal(attempts.length, fleet.wallets.length + 1);
  assert.equal(attempts[0], attempts[1], "the rate-limited wallet retries before the fleet advances");
  assert.deepEqual(attempts.slice(1), fleet.wallets.map(({ address }) => address.toLowerCase()));
  assert.deepEqual(waits, [250, 250, 150, 150]);
  assert.ok(disclosure.moonwellRisk.every(({ status, factual }) => status === "no-entered-markets" && factual === true));
});

test("default settlement root is the package root, so journal custody appends data/logs once", () => {
  const root = defaultSettlementRoot({});
  assert.match(root, /services\/agrodao$/u);
  assert.doesNotMatch(root, /\/data$/u);
  assert.equal(defaultSettlementRoot({ AGRODAO_SETTLEMENT_ROOT: "/tmp/agrodao-settlement" }), "/tmp/agrodao-settlement");
});
