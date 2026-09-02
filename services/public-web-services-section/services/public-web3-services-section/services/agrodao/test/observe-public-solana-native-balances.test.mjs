import assert from "node:assert/strict";
import test from "node:test";

import { SOLANA_MAINNET_CAIP2 } from "@red-cup-engineering/solana-services-section/public-native-balance-observation";

import {
  observePublicSolanaNativeBalancePortfolio,
  publicSolanaWalletFleet,
} from "../src/observe-public-solana-native-balances.mjs";

const AT = "2026-09-02T00:00:00.000Z";
const ADDRESS = "11111111111111111111111111111111";

function fleet() {
  return {
    profile: "org.emsenn.solana.public-wallet-fleet.v1",
    observer: "urn:ame:agrodao",
    chain: { caip2: SOLANA_MAINNET_CAIP2 },
    wallets: [{
      subject: "urn:ame:wallet:test-solana-fixture",
      address: ADDRESS,
      account: `${SOLANA_MAINNET_CAIP2}:${ADDRESS}`,
    }],
    authority: {
      observationOnly: true,
      signerMaterialPresent: false,
      transactionAuthorityGranted: false,
      chainMutationGranted: false,
    },
  };
}

test("committed roster leaves Solana explicitly pending without invoking a provider", async () => {
  const binding = publicSolanaWalletFleet();
  assert.equal(binding.wallets.length, 0);
  let calls = 0;
  const disclosure = await observePublicSolanaNativeBalancePortfolio({
    at: AT,
    fleet: binding,
    observe: async () => { calls += 1; throw new Error("must not run"); },
  });
  assert.equal(calls, 0);
  assert.equal(disclosure.status, "pending-enrollment");
  assert.equal(disclosure.nativePositions, null);
  assert.equal(disclosure.coverage.complete, false);
  assert.equal(disclosure.coverage.nativeLamports, "unknown");
  assert.equal(disclosure.coverage.enrolledAccounts, 0);
  assert.deepEqual(disclosure.unknowns.map(({ component }) => component), ["account-roster"]);
  assert.equal(disclosure.opportunityArena.arena, "SOL:SOL");
  assert.equal(disclosure.opportunityArena.crossAssetComparison, false);
});

test("maps provider evidence to one SOL-denominated native position without a BTC comparison", async () => {
  const requests = [];
  const disclosure = await observePublicSolanaNativeBalancePortfolio({
    at: AT,
    fleet: fleet(),
    observe: async (addresses, options) => {
      requests.push({ addresses, options });
      return {
        checked: true,
        caip2: SOLANA_MAINNET_CAIP2,
        commitment: "finalized",
        provider: { id: "fixture", url: "https://solana.example/" },
        context: { slot: "300", apiVersion: "2.3.0" },
        boundary: { slot: "300", blockhash: "11111111111111111111111111111111", blockHeight: "250", blockTime: "1" },
        accounts: [{ address: ADDRESS, accountExists: true, empty: false, lamports: "9007199254740993" }],
        coverage: { nativeLamports: "observed", splTokens: "unobserved" },
        attempts: [],
        failures: [],
      };
    },
    providerOptions: { timeoutMs: 10 },
  });
  assert.deepEqual(requests, [{ addresses: [ADDRESS], options: { timeoutMs: 10 } }]);
  assert.equal(disclosure.status, "observed");
  assert.equal(disclosure.nativePositions[0].rawBaseUnits, "9007199254740993");
  assert.equal(disclosure.nativePositions[0].empty, false);
  assert.equal(disclosure.nativePositions[0].accountDataEmpty, false);
  assert.equal(disclosure.nativePositions[0].assetFamily, "SOL");
  assert.equal(disclosure.nativePositions[0].baseUnit, "lamport");
  assert.equal(disclosure.nativePositions[0].provenance.context.slot, "300");
  assert.equal(disclosure.coverage.complete, false, "native observation does not claim SPL-token coverage");
  assert.equal(disclosure.opportunityArena.status, "observation-only");
  assert.equal(disclosure.opportunityArena.crossAssetComparison, false);
  assert.doesNotMatch(JSON.stringify(disclosure), /BTC|satoshi|stack-sats/u);
});

test("provider exhaustion remains unknown and exposes no native value", async () => {
  const disclosure = await observePublicSolanaNativeBalancePortfolio({
    at: AT,
    fleet: fleet(),
    observe: async () => ({
      checked: false,
      caip2: SOLANA_MAINNET_CAIP2,
      commitment: "finalized",
      accounts: null,
      context: null,
      boundary: null,
      coverage: { nativeLamports: "unknown", splTokens: "unobserved" },
      attempts: [],
      failures: [{ message: "all public providers refused the observation" }],
    }),
  });
  assert.equal(disclosure.status, "unknown");
  assert.equal(disclosure.nativePositions, null);
  assert.equal(disclosure.coverage.nativeLamports, "unknown");
  assert.match(disclosure.unknowns[0].reason, /providers refused/u);
});

test("rejects authority-bearing or noncanonical fleet input before observation", async () => {
  const invalid = fleet();
  invalid.authority.transactionAuthorityGranted = true;
  let effects = 0;
  await assert.rejects(
    () => observePublicSolanaNativeBalancePortfolio({
      at: AT,
      fleet: invalid,
      observe: async () => { effects += 1; },
    }),
    /prohibited authority/u,
  );
  assert.equal(effects, 0);
});
