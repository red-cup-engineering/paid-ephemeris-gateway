#!/usr/bin/env node
import { reportFailure } from "../src/commandFailure.mjs";

import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { broadcastSellLegViaColdRedGate, broadcastSwapLegViaColdRedGate } from "./cold-red-gate-arbitrage-broadcast.mjs";
import { observe as scanUniverse } from "./global-arbitrage-scan.mjs";
import { assessRoundTripEconomicEffect, assessSellLegEffect, assessSwapLegEffect } from "../src/integrations/hive-engine/hiveEngineConfirmation.mjs";
import { priceResourceCosts, RESOURCE_COMPONENT_NAMES } from "../src/core/resourceCostModel.mjs";

const DEFAULT_ACCOUNT = "sigmund-vexler";
const AUTONOMOUS_ACCOUNTS = Object.freeze(new Set(["sigmund-vexler", "michael561"]));
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);
/** Declared parameter naming the 561-group machines record (cold-red-gate's
 * own entry), read for a real monthly host cost; see resourceCostModel.mjs's
 * priceHostOverheadSwapHive. A relative `import.meta.url` walk only resolves
 * inside this monorepo checkout, never once this package is materialized as
 * a standalone release (verified 2026-09-05: on cold-red-gate's release tree
 * it resolved to a nonexistent `/561-group-services-section/...` path) --
 * so the checkout's own absolute path is the documented default, and
 * AAGAARD_MACHINES_RECORD_PATH overrides it per host. priceHostOverheadSwapHive
 * already falls back to a named declared-parameter default and reports that
 * fallback in its witness when the file is absent, so a host with no copy of
 * the record (cold-red-gate has none, verified 2026-09-05) still prices
 * honestly rather than resolving nowhere. */
export const DEFAULT_MACHINES_RECORD_PATH =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/data/records/2026-08-30-org-machines.json";
const MACHINES_RECORD_PATH_PARAMETER = "AAGAARD_MACHINES_RECORD_PATH";
const MACHINES_RECORD_PATH = process.env[MACHINES_RECORD_PATH_PARAMETER] || DEFAULT_MACHINES_RECORD_PATH;
const DECIMAL_8DP = /^(?:0|[1-9][0-9]*)\.[0-9]{8}$/u;

function coldRedGateKey(account) { return `cold-red-gate:${account}/active`; }

async function defaultPriceCosts({ account, worstCaseProfitSwapHive }) {
  return priceResourceCosts({ account, worstCaseProfitSwapHive, machinesRecordPath: MACHINES_RECORD_PATH });
}

/** True when `costs` is a `{status:"priced", components, total}` decision
 * that names all three resources (Hive RC, signer, runner) as exact
 * SWAP.HIVE amounts -- Hive RC as a zero, capacity-gated component -- never
 * a fabricated or partially-priced total. */
function isFullyPricedResourceCost(costs) {
  return Boolean(costs) && costs.status === "priced" && DECIMAL_8DP.test(costs.total ?? "")
    && Array.isArray(costs.components)
    && RESOURCE_COMPONENT_NAMES.every((name) => costs.components.some((component) => component?.name === name && DECIMAL_8DP.test(component.amount ?? "")));
}

function fail(message) { throw new Error(`automatic-arbitrage-cycle: ${message}`); }

export function selectOpportunity(scan, account = DEFAULT_ACCOUNT) {
  if (!AUTONOMOUS_ACCOUNTS.has(account) || scan?.status !== "certified" || scan.account !== account || scan.providerKnowledge?.value !== "true") return null;
  const candidates = (scan.opportunities ?? []).filter((row) => row.policyAdmitted === true && row.exact?.admitted === true);
  if (candidates.length === 0) return null;
  return candidates[0];
}

/**
 * Legacy two-action bundle request (swapTokens + sell in one custom_json).
 * Kept only for the local-keyFile fallback path (`--key-file`, never
 * `--cold-red-gate-signer`) via `hive-broadcast.mjs`; the autonomous
 * cold-red-gate lane uses `swapLegRequest`/`sellLegRequest` below instead
 * (2026-09-05: bundling crosses Hive-Engine's own resourcemanager
 * multi-transaction BEED fee -- see cold-red-gate-arbitrage-broadcast.mjs).
 * @param {Readonly<Record<string, unknown>>} opportunity a certified, policy-admitted exact opportunity
 * @param {string} keyFile
 * @param {string} [account]
 * @returns {Readonly<Record<string, unknown>>}
 */
export function roundTripRequest(opportunity, keyFile, account = DEFAULT_ACCOUNT) {
  const quote = opportunity?.exact?.quote;
  if (!quote || typeof keyFile !== "string" || keyFile.length === 0) fail("an exact opportunity and key file are required");
  if (!AUTONOMOUS_ACCOUNTS.has(account)) fail("account is not admitted to autonomous arbitrage");
  const calls = [
    { contractName: "marketpools", contractAction: "swapTokens", contractPayload: {
      tokenPair: opportunity.pool, tokenSymbol: opportunity.symbol, tokenAmount: quote.quantity,
      tradeType: "exactOutput", maxAmountIn: quote.maxInputSwapHive,
    } },
    { contractName: "market", contractAction: "sell", contractPayload: {
      symbol: opportunity.symbol, quantity: quote.quantity,
      price: quote.limitSellPriceSwapHive, expiration: 300,
    } },
  ];
  return Object.freeze({ kind: "aagaard.hive-write", account, role: "active", lane: "trading",
    target: `${opportunity.symbol}:pool-to-book-round-trip`, keyFile,
    operation: Object.freeze(["custom_json", Object.freeze({ id: "ssc-mainnet-hive", required_auths: Object.freeze([account]),
      required_posting_auths: Object.freeze([]), json: JSON.stringify(calls) })]) });
}

/**
 * The round trip's first, standalone leg: `marketpools.swapTokens`
 * (exactOutput), broadcast alone so no resourcemanager multi-transaction
 * fee ever applies. `pairedSellPriceSwapHive` carries leg two's own
 * committed limit-sell price so the signer can still gate on the round
 * trip's full worst-case profit before spending anything.
 * @param {Readonly<Record<string, unknown>>} opportunity a certified, policy-admitted exact opportunity
 * @param {string} keyFile
 * @param {string} account
 * @param {string} pricedOverheadSwapHive the priced signer+runner total (see resourceCostModel.mjs)
 * @returns {Readonly<Record<string, unknown>>}
 */
export function swapLegRequest(opportunity, keyFile, account, pricedOverheadSwapHive) {
  const quote = opportunity?.exact?.quote;
  if (!quote || typeof keyFile !== "string" || keyFile.length === 0) fail("an exact opportunity and key file are required");
  if (!AUTONOMOUS_ACCOUNTS.has(account)) fail("account is not admitted to autonomous arbitrage");
  const calls = [{ contractName: "marketpools", contractAction: "swapTokens", contractPayload: {
    tokenPair: opportunity.pool, tokenSymbol: opportunity.symbol, tokenAmount: quote.quantity,
    tradeType: "exactOutput", maxAmountIn: quote.maxInputSwapHive } }];
  return Object.freeze({ kind: "aagaard.hive-write", account, role: "active", lane: "trading",
    target: `${opportunity.symbol}:pool-to-book-round-trip`, keyFile, leg: "swap",
    pricedOverheadSwapHive, pairedSellPriceSwapHive: quote.limitSellPriceSwapHive,
    operation: Object.freeze(["custom_json", Object.freeze({ id: "ssc-mainnet-hive", required_auths: Object.freeze([account]),
      required_posting_auths: Object.freeze([]), json: JSON.stringify(calls) })]) });
}

/**
 * The round trip's second, standalone leg: `market.sell`, broadcast only
 * after leg one is confirmed on-chain. `pairedSwapMaxAmountInSwapHive`
 * carries leg one's own committed cost so the signer can re-gate the round
 * trip's worst-case profit one last time, against a fresh order-book read,
 * before realizing it.
 * @param {Readonly<Record<string, unknown>>} opportunity a certified, policy-admitted exact opportunity
 * @param {string} keyFile
 * @param {string} account
 * @param {string} pricedOverheadSwapHive the priced signer+runner total (see resourceCostModel.mjs)
 * @returns {Readonly<Record<string, unknown>>}
 */
export function sellLegRequest(opportunity, keyFile, account, pricedOverheadSwapHive) {
  const quote = opportunity?.exact?.quote;
  if (!quote || typeof keyFile !== "string" || keyFile.length === 0) fail("an exact opportunity and key file are required");
  if (!AUTONOMOUS_ACCOUNTS.has(account)) fail("account is not admitted to autonomous arbitrage");
  const calls = [{ contractName: "market", contractAction: "sell", contractPayload: {
    symbol: opportunity.symbol, quantity: quote.quantity, price: quote.limitSellPriceSwapHive, expiration: 300 } }];
  return Object.freeze({ kind: "aagaard.hive-write", account, role: "active", lane: "trading",
    target: `${opportunity.symbol}:pool-to-book-round-trip`, keyFile, leg: "sell",
    pricedOverheadSwapHive, pairedSwapMaxAmountInSwapHive: quote.maxInputSwapHive,
    operation: Object.freeze(["custom_json", Object.freeze({ id: "ssc-mainnet-hive", required_auths: Object.freeze([account]),
      required_posting_auths: Object.freeze([]), json: JSON.stringify(calls) })]) });
}

function broadcast(request) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BROADCASTER.pathname], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `broadcaster exited ${code}`));
      else { try { resolve(JSON.parse(stdout)); } catch { reject(new Error("broadcaster returned invalid JSON")); } }
    });
    child.stdin.end(JSON.stringify(request));
  });
}

async function confirmRoundTrip(account, request, transactionId) {
  const calls = JSON.parse(request.operation[1].json);
  const nodes = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const observations = await Promise.all(nodes.map(async (node) => {
      try { const response = await fetch(node, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionInfo", params: { txid: transactionId } }), signal: AbortSignal.timeout(10_000) }); const body = await response.json(); return response.ok && !body?.error && Array.isArray(body?.result) ? body.result : null; }
      catch { return null; }
    }));
    if (observations[0] && JSON.stringify(observations[0]) === JSON.stringify(observations[1])) return assessRoundTripEconomicEffect(account, calls, observations[0]);
    if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return Object.freeze({ status: "unverified", source: "hive-engine.getTransactionInfo", expectedLegs: 2, confirmedLegs: 0 });
}

/** Confirms one standalone leg's own transaction id against two independent
 * providers before trusting `assess`'s reading of it -- same two-provider
 * agreement and eight-attempt poll `confirmRoundTrip` already used, applied
 * to a single leg's transaction id instead of a bundle's. */
async function defaultConfirmLeg(account, call, transactionId, assess) {
  const nodes = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const observations = await Promise.all(nodes.map(async (node) => {
      try { const response = await fetch(node, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionInfo", params: { txid: transactionId } }), signal: AbortSignal.timeout(10_000) }); const body = await response.json(); return response.ok && !body?.error && Array.isArray(body?.result) ? body.result : null; }
      catch { return null; }
    }));
    if (observations[0] && JSON.stringify(observations[0]) === JSON.stringify(observations[1])) return assess(account, call, observations[0]);
    if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return Object.freeze({ status: "unverified", source: "hive-engine.getTransactionInfo", expectedLegs: 1, confirmedLegs: 0 });
}

export async function operate({ account = DEFAULT_ACCOUNT, keyFile, executeOne = false, coldRedGateSigner = false, economicCostWitness = null, priceCosts = defaultPriceCosts, scan = scanUniverse, submit = broadcast,
  broadcastSwapLeg = broadcastSwapLegViaColdRedGate, broadcastSellLeg = broadcastSellLegViaColdRedGate, confirmLeg = defaultConfirmLeg } = {}) {
  if (!AUTONOMOUS_ACCOUNTS.has(account)) fail("account is not admitted to autonomous arbitrage");
  const observedAt = new Date().toISOString();
  const universe = await scan({ account });
  const opportunity = selectOpportunity(universe, account);
  const base = { kind: "aagaard.automatic-arbitrage-cycle", account, observedAt,
    scan: { status: universe.status, observedAt: universe.observedAt, admittedCount: universe.admittedCount ?? null,
      providers: universe.certifyingProviders ?? [] } };
  if (!opportunity) return Object.freeze({ ...base, status: "no-admissible-route", credentialAccess: false, chainMutation: false });
  if (!executeOne) return Object.freeze({ ...base, status: "admissible-route-observed", opportunity,
    credentialAccess: false, chainMutation: false });
  // Fail closed before key access.  The on-chain transfer rows can prove a
  // gross SWAP.HIVE delta but cannot check RC capacity or price signer/
  // runner/paymaster resources.  An autonomous deployment must supply a
  // fresh resource-cost decision covering all three -- Hive RC (a capacity
  // floor, never priced: it regenerates over five days and is never spent
  // as HIVE), the signer's host share, and the runner's host share -- each
  // as its own witnessed component, before the certified worst-case edge is
  // trusted as net profit.
  const costs = economicCostWitness ?? (coldRedGateSigner ? await priceCosts({ account, worstCaseProfitSwapHive: opportunity.exact.quote.worstCaseProfitSwapHive }) : null);
  if (!isFullyPricedResourceCost(costs)) {
    // Carry the pricing decision's own diagnostic so a refusal names which
    // component and why, rather than only that pricing failed (a prior
    // deployed cycle's journal recorded status alone -- verified 2026-09-05
    // against cold-red-gate's own journal, no `reason` ever appeared).
    return Object.freeze({ ...base, status: "unpriced-resource-cost-model", opportunity,
      reason: costs?.reason ?? null, stillUnpriced: costs?.stillUnpriced ?? null, components: costs?.components ?? null,
      credentialAccess: false, chainMutation: false });
  }

  if (coldRedGateSigner) {
    const kf = coldRedGateKey(account);
    const swapRequest = swapLegRequest(opportunity, kf, account, costs.total);
    const swapResult = await broadcastSwapLeg(swapRequest);
    if (swapResult?.status === "refused") {
      return Object.freeze({ ...base, status: "swap-leg-refused", opportunity,
        refusal: { datum: swapResult.datum, reason: swapResult.reason }, credentialAccess: false, chainMutation: false });
    }
    if (swapResult?.status !== "broadcast" || typeof swapResult.id !== "string") fail("cold-red-gate swap leg returned an unrecognized result");
    const swapCall = JSON.parse(swapRequest.operation[1].json)[0];
    const swapEconomicEffect = await confirmLeg(account, swapCall, swapResult.id, assessSwapLegEffect);
    if (swapEconomicEffect.status !== "confirmed") {
      return Object.freeze({ ...base, status: "execution-residue", opportunity,
        swapTransactionId: swapResult.id, swapEconomicEffect, sellTransactionId: null, sellEconomicEffect: null,
        retryAllowed: false, chainMutation: true });
    }

    const sellRequest = sellLegRequest(opportunity, kf, account, costs.total);
    const sellResult = await broadcastSellLeg(sellRequest);
    if (sellResult?.status === "refused") {
      return Object.freeze({ ...base, status: "execution-residue", opportunity,
        swapTransactionId: swapResult.id, swapEconomicEffect, sellTransactionId: null,
        sellRefusal: { datum: sellResult.datum, reason: sellResult.reason },
        retryAllowed: false, chainMutation: true });
    }
    if (sellResult?.status !== "broadcast" || typeof sellResult.id !== "string") fail("cold-red-gate sell leg returned an unrecognized result");
    const sellCall = JSON.parse(sellRequest.operation[1].json)[0];
    const sellEconomicEffect = await confirmLeg(account, sellCall, sellResult.id, assessSellLegEffect);
    if (sellEconomicEffect.status !== "confirmed") {
      return Object.freeze({ ...base, status: "execution-residue", opportunity,
        swapTransactionId: swapResult.id, swapEconomicEffect, sellTransactionId: sellResult.id, sellEconomicEffect,
        retryAllowed: false, chainMutation: true });
    }
    // A Hive Engine confirmation proves the two SWAP.HIVE/token legs only.
    // It does not price the runner's authorization/paymaster cost.  Calling
    // that gross delta "profit" was the exact accounting lie that caused
    // the earlier losing trades.  A separate, witnessed resource-cost
    // settlement must turn this residue into net P&L.
    return Object.freeze({ ...base, status: "round-trip-confirmed-unpriced-resource-costs", opportunity,
      swapTransactionId: swapResult.id, swapEconomicEffect, sellTransactionId: sellResult.id, sellEconomicEffect,
      retryAllowed: false, chainMutation: true });
  }

  const request = roundTripRequest(opportunity, keyFile, account);
  const submitted = await submit(request);
  const result = submitted?.id ? Object.freeze({ ...submitted, economicEffect: submitted.economicEffect ?? await confirmRoundTrip(account, request, submitted.id) }) : submitted;
  if (result?.economicEffect?.status !== "confirmed") return Object.freeze({ ...base, status: "execution-residue", opportunity,
    transactionId: result?.id ?? null, economicEffect: result?.economicEffect ?? null, retryAllowed: false, chainMutation: true });
  return Object.freeze({ ...base, status: "round-trip-confirmed-unpriced-resource-costs", opportunity, transactionId: result.id,
    economicEffect: result.economicEffect, retryAllowed: false, chainMutation: true });
}

function parseOptions(argv) {
  let account = DEFAULT_ACCOUNT, keyFile = "", executeOne = false, coldRedGateSigner = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--account") account = argv[++index] ?? "";
    else if (argv[index] === "--execute-one") executeOne = true;
    else if (argv[index] === "--key-file") keyFile = argv[++index] ?? "";
    else if (argv[index] === "--cold-red-gate-signer") coldRedGateSigner = true;
    else fail(`unknown argument ${argv[index]}`);
  }
  if (keyFile && coldRedGateSigner) fail("--key-file and --cold-red-gate-signer are mutually exclusive");
  if (executeOne && !keyFile && !coldRedGateSigner) fail("--execute-one requires --key-file or --cold-red-gate-signer");
  if (!AUTONOMOUS_ACCOUNTS.has(account)) fail("--account must name an admitted autonomous account");
  return { account, keyFile, executeOne, coldRedGateSigner };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  operate(parseOptions(process.argv.slice(2))).then((receipt) => process.stdout.write(`${JSON.stringify(receipt)}\n`))
    .catch(reportFailure);
}
