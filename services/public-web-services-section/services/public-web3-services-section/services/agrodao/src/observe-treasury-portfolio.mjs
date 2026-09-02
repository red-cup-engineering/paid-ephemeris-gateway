import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MOONWELL_ACCOUNT_HEALTH_PROFILE, observeMoonwellAccountHealth,
} from "@red-cup-engineering/ethereum-services-section/moonwell-account-health";
import {
  BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool,
} from "@red-cup-engineering/ethereum-services-section/public-evm-read";
import { allChains } from "@red-cup-engineering/treasury-observation-service/chains";
import { observePortfolio } from "@red-cup-engineering/treasury-observation-service/portfolio";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

import { publicWalletFleet } from "./procure-public-evm-wallet-observation.mjs";
import { createSettlementStore } from "./settlement-witness.mjs";

const CUSTOMER = "urn:ame:agrodao";
const CATEGORY = "agrodao.treasury-portfolio-disclosure";
const BASE_CAIP2 = "eip155:8453";
const TARGET_HEALTH_FACTOR_MANTISSA = "1500000000000000000";
const MOONWELL_COMPTROLLER = "0xfbb21d0380bee3312b33c4353c8936a0f13ef26c";
const MOONWELL_REWARD_DISTRIBUTOR = "0xe9005b078701e2A0948D2EaC43010D35870Ad9d2";

function identify(value) {
  return {
    id: identifyJsonSemanticContent({
      objectKind: "agrodao.treasury-portfolio-disclosure",
      value,
      witnessRoot: EMPTY_WITNESS_ROOT,
    }).token,
    ...value,
  };
}

export function defaultSettlementRoot(env = process.env) {
  return resolve(env.AGRODAO_SETTLEMENT_ROOT ?? fileURLToPath(new URL("..", import.meta.url)));
}

function defaultStore(env = process.env) {
  return createSettlementStore({ settlementRoot: defaultSettlementRoot(env) });
}

function selectedChains(fleet, catalog) {
  const byCaip2 = new Map(catalog.map((chain) => [chain.caip2, chain]));
  return fleet.chains.map(({ caip2 }) => {
    const descriptor = byCaip2.get(caip2);
    if (descriptor === undefined) throw new Error(`treasury portfolio has no observation provider for ${caip2}`);
    return descriptor;
  });
}

function unknowns(report) {
  return report.chains.flatMap((chain) => {
    if (chain.checked !== true) {
      return [{ chain: chain.caip2, subject: null, component: "chain", reason: chain.reason ?? "unchecked chain" }];
    }
    return (chain.coverage?.unchecked ?? []).map((item) => ({ chain: chain.caip2, ...item }));
  });
}

function coverage(report) {
  return {
    complete: report.coverage.complete === true,
    checkedChains: report.chains.filter((chain) => chain.checked === true).map((chain) => chain.caip2),
    incompleteChains: report.coverage.incompleteChains.map((chainId) => {
      const chain = report.chains.find((candidate) => candidate.chain === chainId);
      return chain?.caip2 ?? chainId;
    }),
    walletsExpected: report.roster.length,
    walletChainObservationsExpected: report.roster.length * report.chains.length,
    walletChainObservationsChecked: report.chains.reduce((sum, chain) => sum + (chain.coverage?.walletsObserved ?? 0), 0),
  };
}

function caip10(address) {
  return `${BASE_CAIP2}:${address.toLowerCase()}`;
}

function exactDecimal(mantissa, decimals = 18) {
  const digits = BigInt(mantissa).toString().padStart(decimals + 1, "0");
  const fraction = digits.slice(-decimals).replace(/0+$/u, "");
  return fraction.length === 0 ? digits.slice(0, -decimals) : `${digits.slice(0, -decimals)}.${fraction}`;
}

function riskView(subject, account, health, provenance) {
  const current = health.evaluation.current;
  const cbBtcOptions = health.evaluation.repaymentOptions.filter((option) => {
    const market = health.markets.find((candidate) => candidate.market === option.market);
    return market?.underlyingDecimals === 8 && /cbbtc/iu.test(option.symbol);
  });
  const exactMinimum = cbBtcOptions.length === 0 ? null : cbBtcOptions
    .map((option) => BigInt(option.currentMinimumUnderlyingRaw))
    .reduce((minimum, value) => value < minimum ? value : minimum)
    .toString();
  return {
    subject,
    account,
    status: "observed",
    provenance,
    enteredMarketCount: health.markets.length,
    healthFactor: current.healthFactor.kind === "finite" ? {
      kind: "finite",
      mantissa: current.healthFactor.mantissa,
      decimal: exactDecimal(current.healthFactor.mantissa),
    } : current.healthFactor,
    targetHealthFactor: { mantissa: TARGET_HEALTH_FACTOR_MANTISSA, decimal: "1.5" },
    targetSatisfied: current.targetSatisfied,
    cbBtcRepayment: exactMinimum === null ? {
      known: false,
      exactMinimumSats: null,
      reason: "no entered eight-decimal cbBTC debt market was observed",
    } : {
      known: true,
      asset: "cbBTC",
      unit: "satoshi",
      exactMinimumSats: exactMinimum,
    },
    guard: {
      newLeverageAdmitted: false,
      providerGuardWouldAdmit: health.evaluation.guard.withdrawalOrLeverageExpansionAdmitted,
      reason: "AGRODAO does not admit new leverage from a read-only health observation",
    },
    authority: {
      observationOnly: true,
      humanApprovalRequired: true,
      transactionConstruction: false,
      signing: false,
      broadcast: false,
    },
  };
}

async function joinMoonwellHealth({
  report, fleet, observeHealth, createReadPool, readPoolOptions, healthDependencies,
}) {
  const base = report.chains.find(({ caip2: chain }) => chain === BASE_CAIP2);
  if (base?.checked !== true || base.provenance === null || base.provenance === undefined) {
    const reason = base?.reason ?? "Base portfolio provenance is unavailable";
    return fleet.wallets.map(({ subject, address }) => ({
      subject, account: caip10(address), status: "unknown", reason,
    }));
  }
  const boundary = base.provenance;
  const readPool = createReadPool({
    chain: BASE_PUBLIC_EVM_CHAIN,
    providers: BASE_PUBLIC_EVM_PROVIDERS,
    ...readPoolOptions,
  });
  const results = [];
  for (const { subject, address } of fleet.wallets) {
    const account = caip10(address);
    try {
      const health = await observeHealth({
        profile: MOONWELL_ACCOUNT_HEALTH_PROFILE,
        account,
        comptroller: MOONWELL_COMPTROLLER,
        rpcUrls: BASE_PUBLIC_EVM_PROVIDERS.map(({ url }) => url),
        snapshotBlock: boundary.blockNumber,
        snapshotBlockHash: boundary.blockHash,
        targetHealthFactorMantissa: TARGET_HEALTH_FACTOR_MANTISSA,
        stresses: [],
        horizonsSeconds: [],
      }, { ...healthDependencies, readPool });
      if (health.snapshotBlock !== boundary.blockNumber
          || health.snapshotBlockHash?.toLowerCase() !== boundary.blockHash.toLowerCase()
          || health.caip2 !== BASE_CAIP2) {
        throw new Error("Moonwell health result does not identify the portfolio's exact Base block");
      }
      if (health.outcome?.type === "no-entered-markets" && health.outcome.factual === true) {
        results.push({ subject, account, status: "no-entered-markets", provenance: boundary,
          enteredMarketCount: 0, factual: true });
      } else if (health.outcome?.type === "account-health-evaluated" && health.riskEvaluationPerformed === true) {
        results.push(riskView(subject, account, health, boundary));
      } else {
        throw new Error("Moonwell health observer returned an unrecognized outcome");
      }
    } catch (error) {
      results.push({ subject, account, status: "unknown", provenance: boundary,
        reason: `account-health observation failed: ${String(error?.message ?? error)}` });
    }
  }
  return results;
}

export async function observeTreasuryPortfolio({
  at = new Date().toISOString(),
  fleet = publicWalletFleet(),
  reportPortfolio = observePortfolio,
  store = defaultStore(),
  chainCatalog = allChains(),
  reportDependencies = {},
  observeHealth = observeMoonwellAccountHealth,
  createReadPool = createPublicEvmReadPool,
  readPoolOptions = {},
  healthDependencies = {},
} = {}) {
  if (!Number.isFinite(Date.parse(at))) throw new TypeError("treasury portfolio disclosure requires an ISO observation time");
  if (fleet?.authority?.observationOnly !== true || fleet.authority.signerMaterialPresent !== false
      || fleet.authority.transactionAuthorityGranted !== false || fleet.authority.chainMutationGranted !== false) {
    throw new TypeError("treasury portfolio requires a public observation-only wallet fleet");
  }
  if (typeof reportPortfolio !== "function" || typeof store?.record !== "function") {
    throw new TypeError("treasury portfolio requires report and record operations");
  }
  const roster = fleet.wallets.map(({ subject, address }) => ({ subject, address }));
  const report = await reportPortfolio({
    roster,
    chains: selectedChains(fleet, chainCatalog),
    moonwell: { base: { rewardDistributor: MOONWELL_REWARD_DISTRIBUTOR } },
  }, {
    ...reportDependencies,
    now: () => new Date(at),
  });
  const moonwellRisk = await joinMoonwellHealth({
    report, fleet, observeHealth, createReadPool, readPoolOptions, healthDependencies,
  });
  const body = {
    type: "TreasuryPortfolioDisclosure",
    owner: CUSTOMER,
    observedAt: report.observedAt,
    disclosedAt: at,
    subjects: report.roster.map(({ subject }) => subject),
    coverage: coverage(report),
    unknowns: unknowns(report),
    valuation: {
      priced: false,
      totalUsd: null,
      reason: "no portfolio-wide USD valuation provider was supplied",
    },
    portfolio: { roster: report.roster, chains: report.chains },
    moonwellRisk,
    authority: {
      observationOnly: true,
      chainMutation: false,
      humanApprovalRequiredForMutation: true,
    },
  };
  const disclosure = identify(body);
  await store.record({ category: CATEGORY, recordedAt: at, record: disclosure });
  return disclosure;
}
