#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { digest as ethereumProviderDigest, run as runEthereumProvider } from "@red-cup-engineering/ethereum-services-section/public-wallet-observation";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";


const CONTEXT = "https://www.w3.org/ns/activitystreams";
const CUSTOMER = "urn:ame:agrodao";
const PROVIDER = "urn:ame:ethereum-services-section";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EFFECTS = ["invoke-service", "public-network-read", "provider-local-witness-journal-evidence"];
const BINDING_PATH = new URL("../content/observations/public-accounts/yanagi-arbitrum.json", import.meta.url);
const FLEET_PATH = new URL("../content/observations/public-accounts/evm-wallet-fleet.json", import.meta.url);
const PROVIDERS_PATH = new URL("../content/config/capability-providers.json", import.meta.url);

export function digest(value) { return semanticId("agrodao.public-evm-wallet-observation", value); }
function identify(body) { return { id: digest(body), ...body }; }
function providerContentValid(value) { const { id: _id, ...body } = value ?? {}; return value?.id === ethereumProviderDigest(body); }
function arg(flag) { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; }
function instant() { return arg("--now") ?? new Date().toISOString(); }
function dataRoot(env = process.env) { return resolve(env.AGRODAO_DATA_ROOT ?? join(NODE_ROOT, "data")); }
function settlementStore(env) { return createSettlementStore({ settlementRoot: dataRoot(env) }); }

export function configuredRuntimeEnvironment(env = process.env) {
  if (env.WITNESS_JOURNAL_RDF_AGENT) return env;
  const providers = JSON.parse(readFileSync(PROVIDERS_PATH, "utf8"));
  const witnessJournal = providers?.bindings?.witnessJournalRdfProjection;
  if (providers?.profile !== "org.emsenn.agrodao.capability-provider-bindings.v1"
      || witnessJournal?.provider !== "urn:ame:witness-journal-rdf-projection-service" || witnessJournal?.requiredSignature !== true
      || witnessJournal?.capability !== "witness-journal-rdf-projection") {
    throw new Error("AGRODAO's witness-journal RDF capability-provider binding is invalid");
  }
  const agentCard = new URL(witnessJournal.agentCard);
  if (agentCard.protocol !== "https:" || agentCard.username || agentCard.password
      || agentCard.pathname !== "/.well-known/agent-card.json") {
    throw new Error("AGRODAO's witness-journal RDF provider must expose a credential-free HTTPS Agent Card");
  }
  return { ...env, WITNESS_JOURNAL_RDF_AGENT: agentCard.href };
}

export function publicAccount() {
  const binding = JSON.parse(readFileSync(BINDING_PATH, "utf8"));
  if (binding?.profile !== "org.emsenn.evm.public-account-observation.v1" || binding.subject !== "urn:ame:yanagi"
      || binding.observer !== CUSTOMER || binding.chain?.caip2 !== "eip155:42161"
      || binding.account?.caip10 !== `eip155:42161:${binding.account?.address}`
      || binding.authority?.observationOnly !== true || binding.authority?.signerMaterialPresent !== false
      || binding.authority?.transactionAuthorityGranted !== false) throw new Error("Yanagi public-account binding does not grant the exact observation-only authority");
  return binding.account.caip10;
}

export function publicWalletFleet() {
  const binding = JSON.parse(readFileSync(FLEET_PATH, "utf8"));
  if (binding?.profile !== "org.emsenn.evm.public-wallet-fleet.v1" || binding.observer !== CUSTOMER
      || !Array.isArray(binding.wallets) || binding.wallets.length === 0 || binding.wallets.length > 100
      || !Array.isArray(binding.chains) || binding.chains.length === 0
      || binding.authority?.observationOnly !== true || binding.authority?.signerMaterialPresent !== false
      || binding.authority?.transactionAuthorityGranted !== false || binding.authority?.chainMutationGranted !== false) {
    throw new Error("public EVM wallet-fleet binding does not grant the exact observation-only authority");
  }
  const addresses = new Set(); const subjects = new Set();
  for (const wallet of binding.wallets) {
    const address = wallet?.address?.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address ?? "") || typeof wallet.subject !== "string" || subjects.has(wallet.subject)
        || addresses.has(address) || !Array.isArray(wallet.aliases) || wallet.aliases.length === 0
        || wallet.aliases.some((alias) => typeof alias !== "string" || alias.length === 0)) {
      throw new Error("public EVM wallet-fleet binding contains an invalid or duplicate wallet");
    }
    addresses.add(address); subjects.add(wallet.subject);
  }
  const chains = new Set();
  for (const chain of binding.chains) {
    if (!/^eip155:\d+$/.test(chain?.caip2 ?? "") || chains.has(chain.caip2)
        || chain.transferIndexerKind !== "blockscout-current-holdings") {
      throw new Error("public EVM wallet-fleet binding contains an invalid or duplicate chain source");
    }
    for (const field of ["rpcUrl", "transferIndexerUrl", "transferIndexerRelayUrl"]) {
      const url = new URL(chain[field]);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("public EVM wallet-fleet source must be credential-free HTTPS");
    }
    chains.add(chain.caip2);
  }
  return binding;
}

export function providerPath(env = process.env) {
  if (env.ETHEREUM_OBSERVATION_PROVIDER_PATH) return resolve(env.ETHEREUM_OBSERVATION_PROVIDER_PATH);
  const installed = fileURLToPath(import.meta.resolve("@red-cup-engineering/ethereum-services-section/public-wallet-observation"));
  if (existsSync(installed)) return installed;
  throw new Error("Ethereum Services Section public-wallet observation boundary is unavailable");
}
export function sanitizedProviderEnvironment(env) {
  const source = { ...process.env, ...env }; const child = {};
  for (const name of ["PATH", "NODE_OPTIONS", "NODE_PATH", "SSL_CERT_FILE", "SSL_CERT_DIR", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY",
    "WITNESS_JOURNAL_RDF_AGENT", "ETHEREUM_OBSERVATION_DATA_ROOT"]) if (source[name] != null) child[name] = source[name];
  return child;
}
async function crossBoundary(activity, operation, at, env) {
  providerPath(env);
  const providerEnvironment = sanitizedProviderEnvironment(env);
  return runEthereumProvider(activity, operation, at, providerEnvironment, undefined, {
    agentUrl: providerEnvironment.WITNESS_JOURNAL_RDF_AGENT,
  });
}

function gmxDisclosureFrom(result, at) {
  const observation = result.object.exchange.observation;
  const legacyGlp = observation.holdings.find((holding) => holding.role === "deprecated-gmx-v1-liquidity-receipt");
  const claims = observation.glpCompensation.claimables.filter((claim) => BigInt(claim.rawAmount) > 0n);
  const findings = [];
  if (legacyGlp && BigInt(legacyGlp.rawBalance) > 0n) findings.push("deprecated-gmx-v1-liquidity-balance-observed");
  if (claims.length > 0) findings.push("glp-compensation-observed-legal-acceptance-required");
  if (observation.suppressedUntrustedAssetCount > 0) findings.push("unsolicited-token-metadata-suppressed");
  return identify({ type: "TreasuryPositionDisclosure",
    owner: CUSTOMER, subject: "urn:ame:yanagi", account: observation.account, scope: observation.scope,
    scopeCompleteness: observation.completeness, provider: PROVIDER, providerReceipt: result.object.receipt.id,
    sourceObservation: observation.id, positions: observation.positions, orders: observation.orders, staking: observation.staking,
    holdings: observation.holdings, oraclePrices: observation.oraclePrices, glpCompensation: observation.glpCompensation,
    findings, suppressedUntrustedAssetCount: observation.suppressedUntrustedAssetCount,
    invalidTrustedAssetCount: observation.invalidTrustedAssetCount,
    decisionBoundary: { observationOnly: true, legalAcceptancePerformed: false, transactionProposed: false,
      transactionAssembled: false, signatureRequested: false, exactUserApprovalRequiredForAnyMutation: true },
    limits: [...observation.limits, "does-not-prove-beneficial-ownership", "does-not-authorize-claim-stake-delegate-redeem-or-transfer"], disclosedAt: at });
}

function ledgerDisclosureFrom(result, at, binding) {
  const observation = result.object.exchange.observation;
  if (observation?.type !== "PublicEvmLedgerObservation" || observation.scope !== "public-evm-ledger"
      || observation.ledger?.profile !== "org.emsenn.evm.public-ledger.v1") {
    throw new Error("provider fulfillment is not the requested public EVM ledger observation");
  }
  const subjectByAddress = new Map(binding.wallets.map((wallet) => [wallet.address.toLowerCase(), wallet.subject]));
  const positions = observation.ledger.observations.map((entry) => {
    const address = entry.account.split(":").at(-1);
    const contracts = entry.contracts.filter((contract) => BigInt(contract.current.rawBalance ?? "0") > 0n
      || contract.current.tokenHoldings.length > 0).map((contract) => ({
      address: contract.address, transferCategories: contract.transferCategories,
      untrustedMetadata: contract.untrustedMetadata, untrustedIndexClaims: contract.untrustedIndexClaims,
      code: contract.code, proxy: contract.proxy, standards: contract.standards, current: contract.current,
      failures: contract.failures,
    }));
    return { subject: subjectByAddress.get(address) ?? null, account: entry.account, chain: entry.chain,
      snapshotBlock: entry.snapshotBlock, native: entry.native, coverage: entry.coverage, contracts, failures: entry.failures };
  });
  const complete = positions.every((position) => position.coverage.complete);
  const active = positions.filter((position) => BigInt(position.native.rawBalance ?? "0") > 0n || position.contracts.length > 0);
  return identify({ type: "TreasuryPositionDisclosure",
    owner: CUSTOMER, scope: observation.scope, scopeCompleteness: complete ? "complete" : "partial",
    chainCoverage: binding.chains.map((chain) => chain.caip2).sort(), provider: PROVIDER,
    providerReceipt: result.object.receipt.id, sourceObservation: observation.id,
    walletCount: binding.wallets.length, accountObservationCount: positions.length, activeAccountCount: active.length,
    positions, findings: [complete ? "bounded-chain-ledger-complete" : "bounded-chain-ledger-partial",
      "index-metadata-treated-as-untrusted-discovery", "empty-accounts-retained-in-coverage"],
    decisionBoundary: { observationOnly: true, transactionProposed: false, transactionAssembled: false,
      signatureRequested: false, chainMutation: false, exactUserApprovalRequiredForAnyMutation: true },
    limits: [...observation.limits, "Base-and-Arbitrum-only", "does-not-value-assets",
      "does-not-classify-spam-or-economic-worth", "does-not-authorize-redeem-swap-transfer-or-trade"], disclosedAt: at });
}
async function record(store, category, value, at) { await store.record({ category, recordedAt: at, record: value }); }
async function recordRefusal(store, source, providerResponse, at, category = "agrodao.public-evm-observation-refusal") {
  const refusal = identify({ type: "ProcurementRefusal",
    customer: CUSTOMER, provider: PROVIDER, source: source.id, providerResponse: providerResponse?.id ?? null,
    reason: providerResponse?.object?.reason ?? "provider-did-not-complete", recordedAt: at });
  await record(store, category, refusal, at); return refusal;
}

async function procure(request, disclosureBuilder, category, at, env, transport) {
  const store = settlementStore(env); if (store.actor !== CUSTOMER) throw new Error("AGRODAO account binding does not identify urn:ame:agrodao");
  const solicitation = identify({ "@context": CONTEXT, type: "Offer", actor: CUSTOMER, target: PROVIDER,
    object: { type: "ServiceSolicitation", request }, published: at });
  await record(store, `${category}-solicitation`, solicitation, at);
  const offer = await transport(solicitation, "solicit-service", at, env); await record(store, `${category}-provider-response`, offer, at);
  if (offer?.type !== "Offer" || offer.actor !== PROVIDER || offer.target !== CUSTOMER
      || !providerContentValid(offer) || offer.object?.type !== "ExecutableServiceOffer") {
    const refusal = await recordRefusal(store, solicitation, offer, at, `${category}-refusal`); return { ok: false, solicitation, providerResponse: offer, refusal };
  }
  if (offer.object.requestDigest !== ethereumProviderDigest(request)
      || offer.object.termsDigest !== ethereumProviderDigest(offer.object.terms)) {
    throw new Error("provider offer is not bound to the provider's exact request and normalized terms");
  }
  if (offer.object.terms.assetPaymentRequired !== false || offer.object.terms.legalAcceptancePerformed !== false || offer.object.terms.transactionAuthorityGranted !== false || offer.object.terms.credentialAccessGranted !== false) throw new Error("read-only observation offer contains prohibited authority or consideration");
  const acceptance = identify({ "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: PROVIDER,
    object: { type: "ServiceContract",
      offer, termsAcceptance: { termDigest: offer.object.termsDigest, acceptedBy: CUSTOMER }, capability: { type: "Capability",
        holder: PROVIDER, invocationTarget: PROVIDER, parentOffer: offer.id, attenuation: { sourceObservationDigest: offer.object.sourceObservationDigest },
        capTP: { target: PROVIDER, method: "invoke-service" }, allowedActions: EFFECTS } }, published: at });
  await record(store, `${category}-invocation`, acceptance, at);
  const result = await transport(acceptance, "invoke-service", at, env); await record(store, `${category}-provider-result`, result, at);
  if (result?.type !== "Accept" || result.actor !== PROVIDER || result.target !== CUSTOMER
      || !providerContentValid(result) || result.object?.type !== "PublicEvmWalletObservationResult") {
    const refusal = await recordRefusal(store, acceptance, result, at, `${category}-refusal`); return { ok: false, solicitation, offer, acceptance, providerResponse: result, refusal };
  }
  const { exchange, receipt } = result.object;
  if (!providerContentValid(exchange) || !providerContentValid(receipt) || receipt.customer !== CUSTOMER || receipt.provider !== PROVIDER
      || receipt.fulfillment !== exchange.id || receipt.assetSettlementClaimed !== false || exchange.credentialAccess !== false
      || exchange.signerMaterialAccepted !== false || exchange.transactionAssembly !== false || exchange.chainMutation !== false) throw new Error("provider receipt does not bind an exact read-only fulfillment");
  const disclosure = disclosureBuilder(result, at);
  const completion = identify({ type: "ProcurementCompletion",
    customer: CUSTOMER, customerAccount: store.settlement, provider: PROVIDER, solicitation: solicitation.id, offer: offer.id,
    invocation: acceptance.id, providerResult: result.id, providerReceipt: receipt.id, customerOutcome: disclosure.id,
    assetSettlementClaimed: false, chainMutation: false, completedAt: at });
  await record(store, "agrodao.treasury-position-disclosure", disclosure, at);
  await record(store, `${category}-procurement-completion`, completion, at);
  return { ok: true, solicitation, offer, acceptance, result, disclosure, completion };
}

export async function runProcurement(at = new Date().toISOString(), env = process.env, transport = crossBoundary) {
  const request = { account: publicAccount(), intendedUse: "urn:ame:agrodao:purpose:yanagi-public-treasury-disclosure", scope: "gmx-arbitrum-public-position" };
  return procure(request, gmxDisclosureFrom, "agrodao.public-evm-observation", at, env, transport);
}

export async function runLedgerProcurement(at = new Date().toISOString(), env = process.env, transport = crossBoundary) {
  const binding = publicWalletFleet();
  const accounts = binding.wallets.flatMap((wallet) => binding.chains.map((chain) => `${chain.caip2}:${wallet.address}`));
  const sources = binding.chains.map((chain) => ({ ...chain }));
  const request = { accounts, intendedUse: "urn:ame:agrodao:purpose:bounded-public-evm-wallet-fleet-ledger",
    scope: "public-evm-ledger", sources };
  return procure(request, (result, at) => ledgerDisclosureFrom(result, at, binding),
    "agrodao.public-evm-ledger", at, env, transport);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const ledger = arg("--scope") === "public-evm-ledger" || basename(process.argv[1]).includes("ledger");
    const env = configuredRuntimeEnvironment();
    const output = ledger ? await runLedgerProcurement(instant(), env) : await runProcurement(instant(), env);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); if (!output.ok) process.exitCode = 2; }
  catch (error) { process.stderr.write(`${basename(process.argv[1])}: ${error.message}\n`); process.exitCode = 1; }
}
