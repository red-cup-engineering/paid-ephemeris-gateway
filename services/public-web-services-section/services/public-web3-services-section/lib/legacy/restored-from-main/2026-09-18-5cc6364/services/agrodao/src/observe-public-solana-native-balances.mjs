import { readFileSync } from "node:fs";

import {
  SOLANA_MAINNET_CAIP2,
  observePublicNativeBalances,
} from "@red-cup-engineering/solana-services-section/public-native-balance-observation";

const CUSTOMER = "urn:ame:agrodao";
const PROFILE = "org.emsenn.solana.public-wallet-fleet.v1";
const BINDING_PATH = new URL(
  "../content/observations/public-accounts/solana-wallet-fleet.json",
  import.meta.url,
);

function authorityIsObservationOnly(authority) {
  return authority?.observationOnly === true
    && authority.signerMaterialPresent === false
    && authority.transactionAuthorityGranted === false
    && authority.chainMutationGranted === false;
}

function validateFleet(binding) {
  if (binding?.profile !== PROFILE || binding.observer !== CUSTOMER
      || binding.chain?.caip2 !== SOLANA_MAINNET_CAIP2
      || !Array.isArray(binding.wallets) || binding.wallets.length > 100
      || !authorityIsObservationOnly(binding.authority)) {
    throw new TypeError("public Solana wallet-fleet binding is invalid or grants prohibited authority");
  }
  if (binding.wallets.length === 0) {
    if (binding.enrollment?.status !== "pending-confirmed-public-addresses"
        || typeof binding.enrollment.unknownReason !== "string"
        || binding.enrollment.unknownReason.length === 0) {
      throw new TypeError("empty public Solana wallet fleet must state pending enrollment and its unknown reason");
    }
    return Object.freeze({ ...binding, wallets: Object.freeze([]) });
  }
  const subjects = new Set();
  const addresses = new Set();
  const wallets = binding.wallets.map((wallet, index) => {
    const subject = wallet?.subject;
    const address = wallet?.address;
    if (typeof subject !== "string" || subject.length === 0 || subjects.has(subject)
        || typeof address !== "string" || address.length === 0 || addresses.has(address)
        || wallet.account !== `${SOLANA_MAINNET_CAIP2}:${address}`) {
      throw new TypeError(`public Solana wallet-fleet binding contains invalid wallet ${index}`);
    }
    subjects.add(subject);
    addresses.add(address);
    return Object.freeze({ subject, address, account: wallet.account });
  });
  return Object.freeze({ ...binding, wallets: Object.freeze(wallets) });
}

export function publicSolanaWalletFleet() {
  return validateFleet(JSON.parse(readFileSync(BINDING_PATH, "utf8")));
}

function pendingDisclosure(at, fleet) {
  const reason = fleet.enrollment.unknownReason;
  return Object.freeze({
    type: "PublicSolanaNativeBalanceDisclosure",
    owner: CUSTOMER,
    chain: Object.freeze({ caip2: SOLANA_MAINNET_CAIP2 }),
    status: "pending-enrollment",
    observedAt: null,
    disclosedAt: at,
    subjects: Object.freeze([]),
    nativePositions: null,
    provenance: null,
    coverage: Object.freeze({
      complete: false,
      enrolledAccounts: 0,
      attemptedAccounts: 0,
      observedAccounts: 0,
      nativeLamports: "unknown",
      splTokens: "unobserved",
    }),
    unknowns: Object.freeze([Object.freeze({
      chain: SOLANA_MAINNET_CAIP2,
      subject: null,
      component: "account-roster",
      reason,
    })]),
    opportunityArena: Object.freeze({
      arena: "SOL:SOL",
      baseAsset: "SOL",
      baseUnit: "lamport",
      status: "pending-observation",
      crossAssetComparison: false,
      reason,
    }),
    authority: Object.freeze({ observationOnly: true, chainMutation: false }),
  });
}

function unknownDisclosure(at, fleet, observation) {
  const reason = observation.failures?.at(-1)?.message ?? "public Solana observation was unavailable";
  return Object.freeze({
    type: "PublicSolanaNativeBalanceDisclosure",
    owner: CUSTOMER,
    chain: Object.freeze({ caip2: SOLANA_MAINNET_CAIP2 }),
    status: "unknown",
    observedAt: null,
    disclosedAt: at,
    subjects: Object.freeze(fleet.wallets.map(({ subject }) => subject)),
    nativePositions: null,
    provenance: null,
    coverage: Object.freeze({
      complete: false,
      enrolledAccounts: fleet.wallets.length,
      attemptedAccounts: fleet.wallets.length,
      observedAccounts: 0,
      nativeLamports: "unknown",
      splTokens: "unobserved",
    }),
    unknowns: Object.freeze(fleet.wallets.map(({ subject }) => Object.freeze({
      chain: SOLANA_MAINNET_CAIP2,
      subject,
      component: "nativeBalance",
      reason,
    }))),
    opportunityArena: Object.freeze({
      arena: "SOL:SOL",
      baseAsset: "SOL",
      baseUnit: "lamport",
      status: "observation-unavailable",
      crossAssetComparison: false,
      reason,
    }),
    authority: Object.freeze({ observationOnly: true, chainMutation: false }),
  });
}

function observedDisclosure(at, fleet, observation) {
  const provenance = Object.freeze({
    caip2: observation.caip2,
    commitment: observation.commitment,
    context: observation.context,
    boundary: observation.boundary,
    provider: observation.provider,
    observedAt: at,
  });
  const nativePositions = observation.accounts.map((account, index) => {
    const enrolled = fleet.wallets[index];
    if (account.address !== enrolled.address || !/^(?:0|[1-9][0-9]*)$/u.test(account.lamports)) {
      throw new Error("public Solana provider changed account ordering or returned noncanonical lamports");
    }
    return Object.freeze({
      subject: enrolled.subject,
      account: enrolled.account,
      address: account.address,
      checked: true,
      accountExists: account.accountExists,
      accountDataEmpty: account.empty,
      empty: account.lamports === "0",
      assetFamily: "SOL",
      baseAsset: "SOL",
      baseUnit: "lamport",
      decimals: 9,
      rawBaseUnits: account.lamports,
      provenance,
    });
  });
  return Object.freeze({
    type: "PublicSolanaNativeBalanceDisclosure",
    owner: CUSTOMER,
    chain: Object.freeze({ caip2: SOLANA_MAINNET_CAIP2 }),
    status: "observed",
    observedAt: at,
    disclosedAt: at,
    subjects: Object.freeze(fleet.wallets.map(({ subject }) => subject)),
    nativePositions: Object.freeze(nativePositions),
    provenance,
    coverage: Object.freeze({
      complete: false,
      enrolledAccounts: fleet.wallets.length,
      attemptedAccounts: fleet.wallets.length,
      observedAccounts: nativePositions.length,
      nativeLamports: "observed",
      splTokens: "unobserved",
    }),
    unknowns: Object.freeze([Object.freeze({
      chain: SOLANA_MAINNET_CAIP2,
      subject: null,
      component: "splTokens",
      reason: "the admitted provider observes native lamports only",
    })]),
    opportunityArena: Object.freeze({
      arena: "SOL:SOL",
      baseAsset: "SOL",
      baseUnit: "lamport",
      status: "observation-only",
      crossAssetComparison: false,
      reason: "no SOL-denominated earnings proposal or executable exit was supplied",
    }),
    authority: Object.freeze({ observationOnly: true, chainMutation: false }),
  });
}

export async function observePublicSolanaNativeBalancePortfolio({
  at = new Date().toISOString(),
  fleet = publicSolanaWalletFleet(),
  observe = observePublicNativeBalances,
  providerOptions = {},
} = {}) {
  if (!Number.isFinite(Date.parse(at))) {
    throw new TypeError("public Solana disclosure requires an ISO observation time");
  }
  const admittedFleet = validateFleet(fleet);
  if (admittedFleet.wallets.length === 0) return pendingDisclosure(at, admittedFleet);
  if (typeof observe !== "function") throw new TypeError("public Solana disclosure requires an observation provider");
  const observation = await observe(admittedFleet.wallets.map(({ address }) => address), providerOptions);
  if (observation?.caip2 !== SOLANA_MAINNET_CAIP2 || observation?.commitment !== "finalized") {
    throw new Error("public Solana provider returned the wrong chain or commitment");
  }
  if (observation.checked !== true) return unknownDisclosure(at, admittedFleet, observation);
  if (!Array.isArray(observation.accounts)
      || observation.accounts.length !== admittedFleet.wallets.length
      || observation.context == null || observation.boundary == null || observation.provider == null) {
    throw new Error("public Solana provider returned incomplete checked evidence");
  }
  return observedDisclosure(at, admittedFleet, observation);
}
