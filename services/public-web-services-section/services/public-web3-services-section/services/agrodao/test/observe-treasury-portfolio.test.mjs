import assert from "node:assert/strict";
import test from "node:test";

import { publicWalletFleet } from "../src/procure-public-evm-wallet-observation.mjs";
import { observeTreasuryPortfolio } from "../src/observe-treasury-portfolio.mjs";

const AT = "2026-09-01T22:30:00.000Z";

test("records one secret-free, explicitly incomplete treasury portfolio disclosure", async () => {
  const fleet = publicWalletFleet();
  const entries = [];
  const reportPortfolio = async ({ roster, chains }) => {
    assert.ok(roster.some(({ subject }) => subject === "urn:ame:wallet:yanagi"));
    assert.ok(roster.some(({ subject }) => subject === "urn:ame:wallet:sigmund"));
    assert.deepEqual(chains.map(({ caip2 }) => caip2).sort(), ["eip155:42161", "eip155:8453"]);
    return {
      observedAt: AT,
      roster,
      chains: [
        {
          chain: "base",
          caip2: "eip155:8453",
          checked: true,
          provenance: { blockNumber: "123", blockTag: "finalized" },
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
  const disclosure = await observeTreasuryPortfolio({
    at: AT,
    fleet,
    reportPortfolio,
    store: { record: async (entry) => entries.push(entry) },
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
  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, "agrodao.treasury-portfolio-disclosure");
  assert.equal(entries[0].record, disclosure);

  const serialized = JSON.stringify(disclosure);
  assert.doesNotMatch(serialized, /MAIN_WALLET|ANOTHER_WALLET|mnemonic|private.?key|seed.?phrase/iu);
  const forbiddenKeys = [];
  JSON.parse(serialized, (key, value) => {
    if (/(?:secret|signer|signature|action)/iu.test(key)) forbiddenKeys.push(key);
    return value;
  });
  assert.deepEqual(forbiddenKeys, []);
});
