#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const CUSTOMER = "urn:ame:agrodao";
const PROVIDER = "urn:ame:aagaard";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EFFECTS = ["invoke-service", "provider-local-witness-journal-evidence"];

export function digest(value) { return semanticId("agrodao.hive-fleet-observation", value); }
function identify(body) { return { id: digest(body), ...body }; }
function providerDigest(value) { return semanticId("aagaard.hive-fleet-observation", value); }
function providerContentValid(value) { const { id: _id, ...body } = value ?? {}; return value?.id === providerDigest(body); }
function arg(flag) { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; }
function instant() { return arg("--now") ?? new Date().toISOString(); }
function dataRoot(env = process.env) { return resolve(env.AGRODAO_DATA_ROOT ?? join(NODE_ROOT, "data")); }

export function providerPath(env = process.env) {
  if (!env.AAGAARD_PROVIDER_PATH) {
    throw new Error("AAGAARD_PROVIDER_PATH must explicitly bind Aagaard's fleet-observation provider");
  }
  return resolve(env.AAGAARD_PROVIDER_PATH);
}

function settlementStore(env) {
  return createSettlementStore({ settlementRoot: dataRoot(env) });
}

function crossBoundary(activity, operation, at, env) {
  const provider = providerPath(env);
  const result = spawnSync(process.execPath, [provider, "--provider-cli", "--operation", operation, "--now", at], {
    input: JSON.stringify(activity), encoding: "utf8", timeout: 30_000,
    env: { ...process.env, ...env }, cwd: dirname(provider),
  });
  if (!result.stdout) throw new Error(`Aagaard returned no ActivityStreams value (status=${result.status ?? "none"}, signal=${result.signal ?? "none"}, error=${result.error?.message ?? "none"}): ${(result.stderr ?? "").trim()}`);
  try { return JSON.parse(result.stdout); }
  catch { throw new Error(`Aagaard returned invalid ActivityStreams JSON: ${result.stdout.slice(0, 300)}`); }
}

function disclosureFrom(result, at) {
  const observation = result.object.exchange.observation;
  return identify({
    type: "TreasuryPositionDisclosure",
    owner: CUSTOMER, scope: "Hive-and-Hive-Engine-wallet-fleet", scopeCompleteness: "partial-chain-observation",
    provider: PROVIDER, providerReceipt: result.object.receipt.id, fulfillment: result.object.receipt.fulfillment,
    sourceTick: observation.sourceTick, aggregateLiquid: observation.aggregateLiquid,
    positions: observation.accounts.map((account) => ({ account: account.account, hive: account.liquid.hive, hbd: account.liquid.hbd })),
    executionExposure: observation.execution,
    custodyFinding: observation.execution.tradesExecuted === 0 && observation.execution.liquidityMovesExecuted === 0 && observation.execution.votesBroadcast === 0
      ? "no-chain-execution-observed-in-source-tick" : "chain-execution-observed-review-provider-evidence",
    limits: [...observation.interpretationLimits, "does-not-disclose-AGRODAO-cross-chain-assets", "does-not-prove-key-custody-soundness"],
    disclosedAt: at,
  });
}

async function record(store, category, value, at) {
  await store.record({ category, recordedAt: at, record: value });
}

async function recordRefusal(store, source, providerResponse, at) {
  const refusal = identify({ type: "ProcurementRefusal",
    customer: CUSTOMER, provider: PROVIDER, source: source.id, providerResponse: providerResponse?.id ?? null,
    reason: providerResponse?.object?.reason ?? "provider-did-not-complete", recordedAt: at });
  await record(store, "agrodao.fleet-observation-refusal", refusal, at);
  return refusal;
}

export async function runProcurement(at = new Date().toISOString(), env = process.env, transport = crossBoundary) {
  const store = settlementStore(env);
  if (store.actor !== CUSTOMER) throw new Error("AGRODAO account binding does not identify urn:ame:agrodao");

  const request = { scope: "hive-wallet-fleet-custody", intendedUse: "AGRODAO treasury-steward Hive-scoped position disclosure" };
  const solicitation = identify({ "@context": CONTEXT, type: "Offer", actor: CUSTOMER, target: PROVIDER,
    object: { type: "ServiceSolicitation", request }, published: at });
  await record(store, "agrodao.fleet-observation-solicitation", solicitation, at);

  const offer = await transport(solicitation, "solicit-service", at, env);
  await record(store, "agrodao.fleet-observation-provider-response", offer, at);
  if (offer?.type !== "Offer" || offer.actor !== PROVIDER || offer.target !== CUSTOMER
      || !providerContentValid(offer) || offer.object?.type !== "ExecutableServiceOffer") {
    const refusal = await recordRefusal(store, solicitation, offer, at);
    return { ok: false, solicitation, providerResponse: offer, refusal };
  }
  if (offer.object.requestDigest !== providerDigest(request)
      || offer.object.termsDigest !== providerDigest(offer.object.terms)) throw new Error("Aagaard's offer is not bound to AGRODAO's exact request and normalized terms");
  if (offer.object.terms.assetPaymentRequired !== false) throw new Error("unpriced observation law cannot be accepted with an asset-payment term");

  const acceptance = identify({ "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: PROVIDER,
    object: { type: "ServiceContract", offer,
      termsAcceptance: { termDigest: offer.object.termsDigest, acceptedBy: CUSTOMER },
      capability: { type: "Capability", holder: PROVIDER, invocationTarget: PROVIDER, parentOffer: offer.id,
        attenuation: { sourceTickDigest: offer.object.sourceTickDigest }, capTP: { target: PROVIDER, method: "invoke-service" },
        allowedActions: EFFECTS } }, published: at });
  await record(store, "agrodao.fleet-observation-invocation", acceptance, at);

  const result = await transport(acceptance, "invoke-service", at, env);
  await record(store, "agrodao.fleet-observation-provider-result", result, at);
  if (result?.type !== "Accept" || result.actor !== PROVIDER || result.target !== CUSTOMER
      || !providerContentValid(result)
      || result.object?.type !== "HiveFleetCustodyObservationResult") {
    const refusal = await recordRefusal(store, acceptance, result, at);
    return { ok: false, solicitation, offer, acceptance, providerResponse: result, refusal };
  }
  const { exchange, receipt } = result.object;
  if (!providerContentValid(exchange) || !providerContentValid(receipt) || receipt.customer !== CUSTOMER || receipt.provider !== PROVIDER
      || receipt.fulfillment !== exchange.id || receipt.assetSettlementClaimed !== false) throw new Error("Aagaard receipt does not bind this exact unpriced fulfillment and these sovereign parties");

  const disclosure = disclosureFrom(result, at);
  const completion = identify({ type: "ProcurementCompletion",
    customer: CUSTOMER, customerAccount: store.settlement, provider: PROVIDER, solicitation: solicitation.id,
    offer: offer.id, invocation: acceptance.id, providerResult: result.id, providerReceipt: receipt.id,
    customerOutcome: disclosure.id, assetSettlementClaimed: false, completedAt: at });
  await record(store, "agrodao.treasury-position-disclosure", disclosure, at);
  await record(store, "agrodao.fleet-observation-procurement-completion", completion, at);
  return { ok: true, solicitation, offer, acceptance, result, disclosure, completion };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const output = await runProcurement(instant()); process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); if (!output.ok) process.exitCode = 2; }
  catch (error) { process.stderr.write(`${basename(process.argv[1])}: ${error.message}\n`); process.exitCode = 1; }
}
