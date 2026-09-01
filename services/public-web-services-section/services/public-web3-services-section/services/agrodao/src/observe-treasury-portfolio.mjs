import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { allChains } from "@red-cup-engineering/treasury-observation-service/chains";
import { observePortfolio } from "@red-cup-engineering/treasury-observation-service/portfolio";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

import { publicWalletFleet } from "./procure-public-evm-wallet-observation.mjs";
import { createSettlementStore } from "./settlement-witness.mjs";

const CUSTOMER = "urn:ame:agrodao";
const CATEGORY = "agrodao.treasury-portfolio-disclosure";

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

function defaultStore(env = process.env) {
  return createSettlementStore({ settlementRoot: resolve(env.AGRODAO_DATA_ROOT ?? fileURLToPath(new URL("../data", import.meta.url))) });
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

export async function observeTreasuryPortfolio({
  at = new Date().toISOString(),
  fleet = publicWalletFleet(),
  reportPortfolio = observePortfolio,
  store = defaultStore(),
  chainCatalog = allChains(),
  reportDependencies = {},
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
  const report = await reportPortfolio({ roster, chains: selectedChains(fleet, chainCatalog) }, {
    ...reportDependencies,
    now: () => new Date(at),
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
