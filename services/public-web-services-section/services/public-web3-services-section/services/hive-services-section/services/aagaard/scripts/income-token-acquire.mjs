#!/usr/bin/env node
import { reportFailure } from "../src/commandFailure.mjs";
// Fixed, evidence-backed 1.000 EDSI productive-position pilot. Observation is
// independent and keyless. Execution revalidates market depth, historical
// settled income, deployed peg-code identity, fleet self-cross, capital and
// concentration limits before the dedicated signer can open an active key.

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { planIncomeTokenAcquisition, readIncomeTokenAcquisitions, recordIncomeTokenAcquisition } from "../src/index.mts";
import { marketBuyLimit } from "../src/integrations/hive-engine/hiveEngineOps.mjs";
import { createSerializedHiveEngineRpc } from "../src/integrations/hive-engine/serializedRpc.mts";
import { operate as auditIncomeToken } from "./income-token-audit.mjs";

const ACCOUNT = "michael561"; const SYMBOL = "EDSI"; const QUANTITY = "1.000";
const REQUIRED_LIMIT = "1.01555000"; const DATA_DIR = new URL("../data/", import.meta.url).pathname;
const FLEET = Object.freeze(["emsenn0", "essiebee", "help-fund", "marshian", "michael561", "sigmund-vexler"]);
const CONTRACT_PROVIDERS = Object.freeze(["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts", "https://herpc.liotes.com/contracts"]);
const PEG_PROVIDERS = Object.freeze(["https://api.hive-engine.com/rpc/contracts", "https://api2.hive-engine.com/rpc/contracts"]);
const BLOCKCHAIN_PROVIDERS = Object.freeze(["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"]);
const HIVE_NODES = Object.freeze(["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"]);
const PEG_CODE_DIGEST = "sha256:ff93fd0ed74c24bff2152c517289c9de043129a74dadff190a843f49213bc575";
const BROADCASTER = new URL("./income-token-acquire-broadcast.mjs", import.meta.url);

function fail(message) { throw new Error(`income-token-acquire: ${message}`); }
export function parseOptions(argv) { const options = { keyFile: "", executeOne: false };
  for (let index = 0; index < argv.length; index += 1) { const flag = argv[index];
    if (flag === "--execute-one") options.executeOne = true;
    else if (flag === "--key-file") { const value = argv[index + 1]; if (!value || value.startsWith("--")) fail("--key-file requires a value"); options.keyFile = value; index += 1; }
    else fail(`unknown argument ${flag}`); }
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file"); return Object.freeze(options); }

export function assertPilotUnspent(events, accountTokenBalance) {
  if (!Array.isArray(events)) fail("prior acquisition history is malformed");
  if (events.some((event) => event?.account === ACCOUNT && event?.symbol === SYMBOL)) fail("the one-shot EDSI acquisition pilot already has a durable submission event");
  if (accountTokenBalance !== "0.000") fail("the one-shot EDSI acquisition pilot requires a zero preexisting michael561 balance");
  return true;
}

function units(value, precision) { const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/u.exec(String(value));
  if (!match || (match[2]?.length ?? 0) > precision) fail(`noncanonical ${precision}-decimal value '${value}'`);
  return BigInt(match[1]) * 10n ** BigInt(precision) + BigInt((match[2] ?? "").padEnd(precision, "0")); }
function format(value, precision) { const scale = 10n ** BigInt(precision); return precision === 0 ? String(value)
  : `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`; }
function digest(value) { return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`; }

async function rpc(url, method, params, timeoutMs = 12_000) { const response = await fetch(url, { method: "POST",
  headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.json(); if (!response.ok || body?.error) fail(`${url} ${method} failed`); return body?.result; }

function normalizeBook(rows, precision, side, observedUnix) { const normalized = rows.map((row) => Object.freeze({
  account: String(row.account ?? "").toLowerCase(), price: format(units(row.price, 8), 8), quantity: format(units(row.quantity, precision), precision),
  orderId: String(row.txId ?? ""), expiration: Number(row.expiration) }))
  .filter((row) => /^[a-z][a-z0-9.-]{2,15}$/u.test(row.account) && /^[0-9a-f]{40}(?:-[0-9]+)?$/u.test(row.orderId)
    && Number.isSafeInteger(row.expiration) && row.expiration > observedUnix);
  normalized.sort((left, right) => { const difference = units(left.price, 8) - units(right.price, 8);
    if (difference === 0n) return left.orderId.localeCompare(right.orderId); return side === "ask" ? (difference < 0n ? -1 : 1) : (difference > 0n ? -1 : 1); });
  return Object.freeze(normalized.map(({ expiration: _expiration, ...row }) => Object.freeze(row))); }

async function marketObservation(provider) { const observedAt = new Date().toISOString();
  const rpcClient = createSerializedHiveEngineRpc({ nodes: [provider], timeoutMs: 15_000, attemptsPerNode: 2 });
  try { const [tokens, swaps, fleetBalances, asks, bids] = await Promise.all([
    rpcClient.find("tokens", "tokens", { symbol: SYMBOL }, 2, 0, []),
    rpcClient.find("tokens", "balances", { account: ACCOUNT, symbol: "SWAP.HIVE" }, 2, 0, []),
    rpcClient.find("tokens", "balances", { account: { $in: FLEET }, symbol: SYMBOL }, 20, 0, []),
    rpcClient.find("market", "sellBook", { symbol: SYMBOL }, 1000, 0, [{ index: "priceDec", descending: false }]),
    rpcClient.find("market", "buyBook", { symbol: SYMBOL }, 1000, 0, [{ index: "priceDec", descending: true }]),
  ]); if (tokens.length !== 1 || swaps.length !== 1) fail(`${provider} returned incomplete acquisition inventory`);
    const precision = Number(tokens[0].precision); if (!Number.isSafeInteger(precision) || precision !== 3) fail("EDSI precision changed");
    const byAccount = Object.fromEntries(fleetBalances.map((row) => [String(row.account), format(units(row.balance, precision), precision)]));
    const existing = fleetBalances.reduce((sum, row) => sum + units(row.balance, precision), 0n);
    const state = Object.freeze({ tokenPrecision: precision, swapHiveBalance: format(units(swaps[0].balance, 8), 8),
      accountTokenBalance: byAccount[ACCOUNT] ?? "0.000", existingFleetQuantity: format(existing, precision),
      asks: normalizeBook(asks, precision, "ask", Math.floor(Date.parse(observedAt) / 1000)),
      bids: normalizeBook(bids, precision, "bid", Math.floor(Date.parse(observedAt) / 1000))
        .filter((row) => !FLEET.includes(row.account)) });
    return Object.freeze({ provider, status: "available", observedAt, stateDigest: digest(state), state });
  } catch (error) { return Object.freeze({ provider, status: "unavailable", problem: error instanceof Error ? error.message : String(error) }); } }

async function certifiedMarket() { const rows = await Promise.all(CONTRACT_PROVIDERS.map(marketObservation));
  const available = rows.filter((row) => row.status === "available"); const groups = new Map();
  for (const row of available) { const group = groups.get(row.stateDigest) ?? []; group.push(row); groups.set(row.stateDigest, group); }
  if (groups.size !== 1 || available.length < 2) fail(groups.size > 1 ? "Hive Engine acquisition state is contested" : "independent acquisition state support is insufficient");
  const winner = [...groups.values()][0]; return Object.freeze({ state: winner[0].state, stateDigest: winner[0].stateDigest,
    providers: Object.freeze(winner.map((row) => row.provider).sort()), unavailable: Object.freeze(rows.filter((row) => row.status === "unavailable")) }); }

async function revalidatePegCode() { const rows = await Promise.all(PEG_PROVIDERS.map(async (provider) => {
  try { const contract = await rpc(provider, "getContract", { name: "hivepegged" }); const codeDigest = `sha256:${createHash("sha256").update(String(contract?.code ?? "")).digest("hex")}`;
    return Object.freeze({ provider, owner: String(contract?.owner ?? ""), version: Number(contract?.version), codeDigest }); }
  catch (error) { return Object.freeze({ provider, problem: error instanceof Error ? error.message : String(error) }); } }));
  if (rows.length !== 2 || rows.some((row) => row.codeDigest !== PEG_CODE_DIGEST || row.owner !== "honey-swap" || row.version !== 3)) fail("deployed peg code no longer matches the contracted fee-mechanics evidence");
  return Object.freeze({ codeDigest: PEG_CODE_DIGEST,
    providers: Object.freeze(rows.map((row) => row.provider)), depositFeeBps: 75, minimumFeeHive: "0.001",
    limits: Object.freeze(["deposit-mechanics-not-reserve-proof", "historical-cashflow-not-guaranteed"]) }); }

async function freshPlan() { const [market, income, peg] = await Promise.all([certifiedMarket(), auditIncomeToken({ account: "emsenn0", symbol: "EDSI", record: false }), revalidatePegCode()]);
  const position = income.position; const annual = String(position?.projection?.annualizedNativeHive ?? "").replace(/ HIVE$/u, "");
  const annualHolding = String(position?.realized?.latest?.reportedHolding ?? "");
  const result = planIncomeTokenAcquisition({ symbol: SYMBOL, tokenPrecision: market.state.tokenPrecision, purchaseQuantity: QUANTITY,
    swapHiveBalance: market.state.swapHiveBalance, existingFleetQuantity: market.state.existingFleetQuantity,
    annualizedNativeHive: annual, annualizedHoldingQuantity: annualHolding, asks: market.state.asks, bids: market.state.bids,
    fleetAccounts: FLEET, policy: { maximumSpendSwapHive: "1.02000000", minimumSwapHiveReserve: "70.00000000",
      maximumLiquidCapitalBps: 150, maximumExposureGrowthBps: 200, minimumHaircuttedYieldBps: 500,
      maximumImmediateDrawdownBps: 500, incomeRetentionBps: 5000, hiveDepositFeeBps: peg.depositFeeBps,
      hiveDepositMinimumFee: peg.minimumFeeHive } });
  const plan = result.admitted ? Object.freeze({ ...result, quote: Object.freeze({ ...result.quote,
    operation: marketBuyLimit(ACCOUNT, SYMBOL, QUANTITY, result.quote.limitPriceSwapHive, 300) }) }) : result;
  return Object.freeze({ market, income: position, peg, plan }); }

function broadcast(request) { return new Promise((resolvePromise, rejectPromise) => { const child = spawn(process.execPath, [BROADCASTER.pathname], { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "", stderr = ""; child.stdout.on("data", (chunk) => { stdout += String(chunk); }); child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  child.on("close", (code) => { if (code !== 0) rejectPromise(new Error(stderr.trim() || `signer exited ${code}`));
    else { try { resolvePromise(JSON.parse(stdout)); } catch { rejectPromise(new Error("signer returned invalid JSON")); } } }); child.stdin.end(JSON.stringify(request)); }); }

async function confirmHive(txid, operation) { const confirmations = [];
  for (let attempt = 0; attempt < 12 && confirmations.length < 2; attempt += 1) { await Promise.all(HIVE_NODES.map(async (node) => {
    if (confirmations.some((entry) => entry.node === node)) return; const transaction = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
    const actual = transaction?.operations?.[0]?.value ?? transaction?.operations?.[0]?.[1]; const expected = operation[1]; if (!actual) return;
    if (actual.id !== expected.id || actual.json !== expected.json || JSON.stringify(actual.required_auths) !== JSON.stringify(expected.required_auths)
      || JSON.stringify(actual.required_posting_auths) !== JSON.stringify(expected.required_posting_auths)) fail(`${node} did not confirm the exact acquisition operation`);
    confirmations.push(Object.freeze({ node, block: Number(transaction.block_num) })); }));
    if (confirmations.length < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200)); }
  if (confirmations.length < 2 || new Set(confirmations.map((row) => row.block)).size !== 1) fail("independent Hive providers did not agree on the acquisition transaction"); return Object.freeze(confirmations); }

async function engineTransaction(txid) { const rows = await Promise.all(BLOCKCHAIN_PROVIDERS.map(async (node) => { const result = await rpc(node, "getTransactionInfo", { txid }).catch(() => null);
  if (!result) return null; let logs = null; try { logs = typeof result.logs === "string" ? JSON.parse(result.logs) : result.logs; } catch { logs = null; }
  if (Array.isArray(logs?.errors) && logs.errors.length > 0) fail(`${node} reports an acquisition error: ${logs.errors.join("; ")}`);
  return Object.freeze({ node, transactionId: String(result.transactionId ?? txid), block: Number(result.blockNumber), logs }); }));
  return rows.every(Boolean) ? Object.freeze(rows) : null; }

async function effectState(node, txid) { const rpcClient = createSerializedHiveEngineRpc({ nodes: [node], timeoutMs: 15_000, attemptsPerNode: 2 });
  const [tokens, swaps, orders] = await Promise.all([rpcClient.find("tokens", "balances", { account: ACCOUNT, symbol: SYMBOL }, 2, 0, []),
    rpcClient.find("tokens", "balances", { account: ACCOUNT, symbol: "SWAP.HIVE" }, 2, 0, []), rpcClient.find("market", "buyBook", { account: ACCOUNT, symbol: SYMBOL }, 1000, 0, [])]);
  return Object.freeze({ provider: node, tokenBalance: String(tokens[0]?.balance ?? "0.000"), swapHiveBalance: String(swaps[0]?.balance ?? "0.00000000"),
    matchingOpenOrders: Object.freeze(orders.filter((row) => String(row.txId ?? "").startsWith(txid)).map((row) => Object.freeze({ txId: String(row.txId), quantity: String(row.quantity), price: String(row.price) }))) }); }

async function waitForEffect(txid, before, maximumSpend) { for (let attempt = 0; attempt < 25; attempt += 1) { const [engine, states] = await Promise.all([engineTransaction(txid), Promise.all(CONTRACT_PROVIDERS.map((node) => effectState(node, txid)))]);
    const expectedToken = units(before.accountTokenBalance, 3) + units(QUANTITY, 3); const beforeSwap = units(before.swapHiveBalance, 8); const max = units(maximumSpend, 8);
    const exact = states.every((state) => units(state.tokenBalance, 3) === expectedToken && beforeSwap > units(state.swapHiveBalance, 8)
      && beforeSwap - units(state.swapHiveBalance, 8) <= max && state.matchingOpenOrders.length === 0)
      && new Set(states.map((state) => JSON.stringify([state.tokenBalance, state.swapHiveBalance, state.matchingOpenOrders]))).size === 1;
    if (engine && exact) return Object.freeze({ engine, states, acquiredQuantity: QUANTITY, spentSwapHive: format(beforeSwap - units(states[0].swapHiveBalance, 8), 8) });
    if (attempt < 24) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200)); }
  return null; }

export async function operate(options) { const fresh = await freshPlan(); const base = Object.freeze({ kind: "aagaard.income-token-acquisition-receipt",
  account: ACCOUNT, symbol: SYMBOL, observedAt: new Date().toISOString(), market: Object.freeze({ stateDigest: fresh.market.stateDigest, providers: fresh.market.providers,
    unavailable: fresh.market.unavailable }), peg: fresh.peg, incomeEvidence: Object.freeze({ sourceAgreement: fresh.income.sourceAgreement,
    realized: fresh.income.realized, projection: fresh.income.projection }), before: Object.freeze({ tokenBalance: fresh.market.state.accountTokenBalance,
    swapHiveBalance: fresh.market.state.swapHiveBalance, existingFleetQuantity: fresh.market.state.existingFleetQuantity }), plan: fresh.plan });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed", credentialAccess: false, chainMutation: false });
  assertPilotUnspent(readIncomeTokenAcquisitions(DATA_DIR), fresh.market.state.accountTokenBalance);
  if (!fresh.plan.admitted || fresh.plan.quote.limitPriceSwapHive !== REQUIRED_LIMIT) fail("fresh exact plan is not the reviewed acquisition");
  const request = { account: ACCOUNT, role: "active", lane: "income-token-acquisition", target: `acquire:${SYMBOL}:${QUANTITY}:${REQUIRED_LIMIT}`,
    keyFile: options.keyFile, operation: fresh.plan.quote.operation }; let submission;
  try { submission = await broadcast(request); } catch (error) { throw new Error(`submission outcome unknown; do not retry automatically: ${error instanceof Error ? error.message : String(error)}`); }
  const transactionId = String(submission?.id ?? ""); if (!/^[0-9a-f]{40}$/u.test(transactionId)) fail("submission returned no canonical transaction id; do not retry automatically");
  let hive = null, effect = null, settlementError = null;
  try { hive = await confirmHive(transactionId, fresh.plan.quote.operation); effect = await waitForEffect(transactionId, fresh.market.state, fresh.plan.quote.maximumEscrowSwapHive);
    if (!effect) settlementError = "acquisition did not independently reconcile before timeout"; } catch (error) { settlementError = error instanceof Error ? error.message : String(error); }
  const completedAt = new Date().toISOString(); const receipt = Object.freeze({ ...base, transactionId, ...(hive ? { hive } : {}),
    status: effect ? "acquired-confirmed" : "settlement-pending", retryAllowed: false, credentialAccess: Object.freeze({ occurred: true, location: "local-key-file", role: "active" }),
    ...(effect ? { engine: effect.engine, after: effect.states, acquiredQuantity: effect.acquiredQuantity, spentSwapHive: effect.spentSwapHive } : {}),
    ...(settlementError ? { settlementError } : {}), completedAt });
  const event = await recordIncomeTokenAcquisition(DATA_DIR, receipt, completedAt); return Object.freeze({ ...receipt, durableRecord: Object.freeze({ confirmed: true, eventId: event.eventId }) }); }

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))), null, 2)}\n`); }
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) { main().catch(reportFailure); }
