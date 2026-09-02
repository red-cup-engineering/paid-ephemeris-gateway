#!/usr/bin/env node
import { reportFailure } from "../src/commandFailure.mjs";
// Convert one account's entire freshly observed liquid Hive-Engine token
// balance into SWAP.HIVE through existing bids. The order has a hard price
// floor and a 300-second expiry; no buy, transfer, NFT, or staking action is
// available through this boundary.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { tokenLiquidationEvent } from "../src/core/tokenLiquidationSettlement.mts";
import { assertLiquidationSymbolAllowed } from "../src/core/protectedAssets.mjs";
import { broadcastViaChildProcess, makeFail, rpc as sharedRpc, verifyActiveKey as sharedVerifyActiveKey } from "../src/core/hiveScriptSupport.mjs";
import { marketSellLimit } from "../src/integrations/hive-engine/hiveEngineOps.mjs";

const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const CONTRACT_NODES = ["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts"];
const BLOCKCHAIN_NODES = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
const FLEET = new Set(["emsenn0", "essiebee", "sigmund-vexler", "marshian", "michael561", "help-fund"]);
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);

const fail = makeFail("liquidate-token");
const rpc = (node, method, params, timeoutMs) => sharedRpc(node, method, params, { timeoutMs, backoffMs: 350, fail });
function broadcast(request) { return broadcastViaChildProcess(request, BROADCASTER); }
async function verifyActiveKey(account, keyFile) { return sharedVerifyActiveKey(account, keyFile, { rpc, hiveNode: HIVE_NODES[0], fail }); }

export function parseOptions(argv) {
  const options = { account: "", symbol: "", keyFile: "", executeOne: false, maxSlippageBps: 500 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      index += 1;
      return value;
    };
    if (argument === "--account") options.account = take().toLowerCase();
    else if (argument === "--symbol") options.symbol = take().toUpperCase();
    else if (argument === "--key-file") options.keyFile = take();
    else if (argument === "--max-slippage-bps") options.maxSlippageBps = Number(take());
    else if (argument === "--execute-one") options.executeOne = true;
    else fail(`unknown argument ${argument}`);
  }
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical Hive --account is required");
  if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(options.symbol) || options.symbol === "SWAP.HIVE") fail("a non-SWAP.HIVE Hive-Engine --symbol is required");
  assertLiquidationSymbolAllowed(options.account, options.symbol);
  if (!Number.isInteger(options.maxSlippageBps) || options.maxSlippageBps < 0 || options.maxSlippageBps > 2500) fail("--max-slippage-bps must be an integer from 0 through 2500");
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file");
  return Object.freeze(options);
}

async function find(node, contract, table, query, limit = 1000, indexes = []) {
  const rows = await rpc(node, "find", { contract, table, query, limit, offset: 0, indexes });
  if (!Array.isArray(rows)) fail(`${node} returned a non-array ${contract}.${table} result`);
  return rows;
}

function units(value, precision) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(String(value));
  if (!match || (match[2]?.length ?? 0) > precision) fail(`noncanonical ${precision}-decimal quantity '${value}'`);
  return BigInt(match[1]) * (10n ** BigInt(precision)) + BigInt((match[2] ?? "").padEnd(precision, "0"));
}

function format(value, precision) {
  const scale = 10n ** BigInt(precision);
  return precision === 0 ? String(value) : `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`;
}

function normalizedBook(rows, precision, observedUnix) {
  return Object.freeze(rows.map((row) => Object.freeze({
    account: String(row.account ?? "").toLowerCase(),
    price: format(units(String(row.price), 8), 8),
    quantity: format(units(String(row.quantity), precision), precision),
    txId: String(row.txId ?? ""),
    expiration: Number(row.expiration),
  })).filter((row) => !FLEET.has(row.account) && /^[0-9a-f]{40}$/.test(row.txId)
    && Number.isSafeInteger(row.expiration) && row.expiration > observedUnix)
    .sort((left, right) => {
      const difference = units(right.price, 8) - units(left.price, 8);
      return difference === 0n ? left.txId.localeCompare(right.txId) : (difference > 0n ? 1 : -1);
    }));
}

async function readState(account, symbol, node) {
  const observedAt = new Date().toISOString();
  const [tokenRows, balanceRows, swapRows, bids] = await Promise.all([
    find(node, "tokens", "tokens", { symbol }, 2),
    find(node, "tokens", "balances", { account, symbol }, 2),
    find(node, "tokens", "balances", { account, symbol: "SWAP.HIVE" }, 2),
    find(node, "market", "buyBook", { symbol }, 1000, [{ index: "priceDec", descending: true }]),
  ]);
  if (tokenRows.length !== 1 || balanceRows.length > 1 || swapRows.length > 1) fail(`${node} returned non-unique token or balance evidence`);
  const precision = Number(tokenRows[0].precision);
  if (!Number.isInteger(precision) || precision < 0 || precision > 8) fail(`${node} returned invalid token precision`);
  const balance = balanceRows[0]?.balance ?? format(0n, precision);
  const swapHiveBalance = swapRows[0]?.balance ?? "0.00000000";
  units(balance, precision); units(swapHiveBalance, 8);
  return Object.freeze({ account, symbol, precision, balance: format(units(balance, precision), precision),
    swapHiveBalance: format(units(swapHiveBalance, 8), 8), observedAt,
    bids: normalizedBook(bids, precision, Math.floor(Date.parse(observedAt) / 1000)) });
}

const ECONOMIC_FIELDS = ["account", "symbol", "precision", "balance", "swapHiveBalance", "bids"];
export function statesAgree(left, right) {
  return ECONOMIC_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field]));
}

export function planLiquidation(state, maxSlippageBps = 500) {
  const quantity = units(state.balance, state.precision);
  if (quantity === 0n) return Object.freeze({ kind: "refuse", reason: "no liquid token balance remains" });
  if (!Array.isArray(state.bids) || state.bids.length === 0) return Object.freeze({ kind: "refuse", reason: "no non-fleet live bid exists" });
  let left = quantity;
  let proceeds = 0n;
  let floor = 0n;
  let levels = 0;
  const best = units(state.bids[0].price, 8);
  for (const bid of state.bids) {
    if (left === 0n) break;
    const available = units(bid.quantity, state.precision);
    const take = available < left ? available : left;
    if (take === 0n) continue;
    const price = units(bid.price, 8);
    proceeds += take * price / (10n ** BigInt(state.precision));
    left -= take;
    floor = price;
    levels += 1;
  }
  if (left !== 0n) return Object.freeze({ kind: "refuse", reason: "displayed non-fleet bids cannot fill the full liquid balance" });
  const slippageBps = Number((best - floor) * 10_000n / best);
  if (slippageBps > maxSlippageBps) return Object.freeze({ kind: "refuse", reason: `full exit floor is ${slippageBps} bps below the best bid`, slippageBps });
  if (proceeds < 100_000n) return Object.freeze({ kind: "refuse", reason: "full displayed exit is worth less than 0.001 SWAP.HIVE" });
  const quantityText = format(quantity, state.precision);
  const floorText = format(floor, 8);
  return Object.freeze({ kind: "sell", quantity: quantityText, bestBid: format(best, 8), floorPrice: floorText,
    minimumSwapHive: format(quantity * floor / (10n ** BigInt(state.precision)), 8),
    displayedGrossSwapHive: format(proceeds, 8), levels, slippageBps,
    operation: marketSellLimit(state.account, state.symbol, quantityText, floorText, 300) });
}

async function independentlyObservedState(account, symbol) {
  const states = await Promise.all(CONTRACT_NODES.map((node) => readState(account, symbol, node)));
  if (!statesAgree(states[0], states[1])) fail("independent Hive-Engine providers disagree on liquidation evidence");
  return Object.freeze({ state: states[0], providers: Object.freeze(CONTRACT_NODES.map((node, index) => Object.freeze({ node, observedAt: states[index].observedAt }))) });
}

async function confirmHiveTransaction(txid, operation) {
  const confirmed = new Map();
  for (let attempt = 0; attempt < 12 && confirmed.size < 2; attempt += 1) {
    await Promise.all(HIVE_NODES.map(async (node) => {
      if (confirmed.has(node)) return;
      const transaction = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      const actual = transaction?.operations?.[0]?.value ?? transaction?.operations?.[0]?.[1];
      if (!actual) return;
      const expected = operation[1];
      const exact = actual.id === expected.id && actual.json === expected.json
        && JSON.stringify(actual.required_auths) === JSON.stringify(expected.required_auths)
        && JSON.stringify(actual.required_posting_auths) === JSON.stringify(expected.required_posting_auths)
        && Object.keys(actual).sort().join(",") === Object.keys(expected).sort().join(",");
      if (!exact) fail(`${node} did not confirm the exact liquidation operation`);
      confirmed.set(node, Object.freeze({ node, block: Number(transaction.block_num) }));
    }));
    if (confirmed.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  const rows = [...confirmed.values()];
  if (rows.length < 2 || new Set(rows.map((row) => row.block)).size !== 1) fail("independent Hive providers did not agree on the liquidation transaction");
  return Object.freeze(rows);
}

async function transactionEvidence(txid) {
  const rows = await Promise.all(BLOCKCHAIN_NODES.map(async (node) => {
    for (const candidate of [txid, `${txid}-0`]) {
      const result = await rpc(node, "getTransactionInfo", { txid: candidate }).catch(() => null);
      if (!result) continue;
      let logs;
      try { logs = typeof result.logs === "string" ? JSON.parse(result.logs) : result.logs; } catch { logs = null; }
      if (Array.isArray(logs?.errors) && logs.errors.length > 0) fail(`${node} reports a Hive-Engine liquidation error: ${logs.errors.join("; ")}`);
      return Object.freeze({ node, transactionId: String(result.transactionId ?? candidate), blockNumber: Number(result.blockNumber), logs });
    }
    return null;
  }));
  if (rows.some((row) => row === null)) return null;
  return Object.freeze(rows);
}

async function effectState(account, symbol, txid, node) {
  const [tokenRows, swapRows, orders] = await Promise.all([
    find(node, "tokens", "balances", { account, symbol }, 2),
    find(node, "tokens", "balances", { account, symbol: "SWAP.HIVE" }, 2),
    find(node, "market", "sellBook", { account, symbol }, 1000),
  ]);
  return Object.freeze({ node, tokenBalance: String(tokenRows[0]?.balance ?? "0"),
    swapHiveBalance: String(swapRows[0]?.balance ?? "0.00000000"),
    matchingOpenOrders: orders.filter((row) => row.txId === txid).map((row) => Object.freeze({ txId: row.txId, quantity: row.quantity, price: row.price })) });
}

async function waitForEffect(account, symbol, txid, before, plan) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [engine, states] = await Promise.all([
      transactionEvidence(txid),
      Promise.all(CONTRACT_NODES.map((node) => effectState(account, symbol, txid, node))),
    ]);
    const expectedToken = units(before.balance, before.precision) - units(plan.quantity, before.precision);
    const minimum = units(plan.minimumSwapHive, 8);
    const confirmed = states.every((state) => units(state.tokenBalance, before.precision) === expectedToken
      && units(state.swapHiveBalance, 8) - units(before.swapHiveBalance, 8) >= minimum
      && state.matchingOpenOrders.length === 0);
    if (engine && confirmed) return Object.freeze({ engine, states });
    if (attempt < 19) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  return null;
}

export async function operate(options) {
  if (options.executeOne) await verifyActiveKey(options.account, options.keyFile);
  const observed = await independentlyObservedState(options.account, options.symbol);
  const plan = planLiquidation(observed.state, options.maxSlippageBps);
  const base = Object.freeze({ kind: "aagaard.token-liquidation-receipt", account: options.account, symbol: options.symbol,
    observedAt: new Date().toISOString(), before: Object.freeze({ balance: observed.state.balance, swapHiveBalance: observed.state.swapHiveBalance }),
    evidenceProviders: observed.providers, plan });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed" });
  if (plan.kind !== "sell") fail(`fresh plan is not executable: ${plan.reason}`);
  const target = `liquidate:${options.symbol}:${plan.quantity}:${plan.floorPrice}`;
  let submission;
  try { submission = await broadcast({ account: options.account, role: "active", lane: "liquidity-exit", target,
    keyFile: options.keyFile, operation: plan.operation }); }
  catch (error) { throw new Error(`submission outcome unknown; do not retry automatically: ${error instanceof Error ? error.message : String(error)}`); }
  if (!/^[0-9a-f]{40}$/.test(String(submission?.id ?? ""))) fail("submission returned no canonical transaction id; do not retry automatically");
  const transactionId = String(submission.id);
  let hive = null;
  let effect = null;
  let settlementError = null;
  try {
    hive = await confirmHiveTransaction(transactionId, plan.operation);
    effect = await waitForEffect(options.account, options.symbol, transactionId, observed.state, plan);
    if (!effect) settlementError = "liquidation effect did not independently reconcile before timeout";
  } catch (error) {
    settlementError = error instanceof Error ? error.message : String(error);
  }
  const completedAt = new Date().toISOString();
  const receipt = Object.freeze({ ...base, transactionId, ...(hive ? { hive } : {}), status: effect ? "liquidated-confirmed" : "settlement-pending",
    retryAllowed: false, ...(settlementError ? { settlementError } : {}),
    ...(effect ? { engine: effect.engine, after: effect.states } : {}), completedAt });
  const event = tokenLiquidationEvent(receipt, completedAt);
  return Object.freeze({ ...receipt, durableRecord: Object.freeze({ confirmed: true, eventId: event.eventId }) });
}

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))))}\n`); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(reportFailure);
}
