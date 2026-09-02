#!/usr/bin/env node
// Convert michael561's exact freshly observed liquid WORKERBEE into productive
// BEE-mining power by self-staking and delegating the same bounded quantity to
// the no-fee ph1102 pool.  No other account, token, recipient, transfer, sale,
// unstake, or delegation shape crosses this capability.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { recordAssetYield } from "../src/core/assetYieldSettlement.mts";
import { broadcastViaChildProcess, makeFail, rpc as sharedRpc, verifyActiveKey as sharedVerifyActiveKey } from "../src/core/hiveScriptSupport.mjs";
import { batchOperations, delegate, stake } from "../src/integrations/hive-engine/hiveEngineOps.mjs";

const ACCOUNT = "michael561";
const SYMBOL = "WORKERBEE";
const POOL_ACCOUNT = "ph1102";
const POOL_ID = "BEE:WORKERBEE";
const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const CONTRACT_NODES = ["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts"];
const BLOCKCHAIN_NODES = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);
const DATA_DIR = new URL("../data/", import.meta.url).pathname;

const fail = makeFail("workerbee-yield");
const rpc = (node, method, params, timeoutMs) => sharedRpc(node, method, params, { timeoutMs, backoffMs: 350, fail });
function broadcast(request) { return broadcastViaChildProcess(request, BROADCASTER); }
async function verifyActiveKey(account, keyFile) { return sharedVerifyActiveKey(account, keyFile, { rpc, hiveNode: HIVE_NODES[0], fail }); }

export function parseOptions(argv) {
  const options = { account: "", keyFile: "", executeOne: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => { const value = argv[index + 1]; if (!value || value.startsWith("--")) fail(`${argument} requires a value`); index += 1; return value; };
    if (argument === "--account") options.account = take().toLowerCase();
    else if (argument === "--key-file") options.keyFile = take();
    else if (argument === "--execute-one") options.executeOne = true;
    else fail(`unknown argument ${argument}`);
  }
  if (options.account !== ACCOUNT) fail(`--account must be exactly ${ACCOUNT}`);
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
  return BigInt(match[1]) * 10n ** BigInt(precision) + BigInt((match[2] ?? "").padEnd(precision, "0"));
}

function format(value, precision) {
  const scale = 10n ** BigInt(precision);
  return precision === 0 ? String(value) : `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`;
}

function liveBook(rows, precision, descending, observedUnix) {
  return rows.map((row) => Object.freeze({ account: String(row.account), price: format(units(row.price, 8), 8),
    quantity: format(units(row.quantity, precision), precision), txId: String(row.txId), expiration: Number(row.expiration) }))
    .filter((row) => /^[0-9a-f]{40}$/.test(row.txId) && Number.isSafeInteger(row.expiration) && row.expiration > observedUnix)
    .sort((left, right) => { const delta = units(left.price, 8) - units(right.price, 8); return delta === 0n ? left.txId.localeCompare(right.txId) : Number(descending ? -delta : delta); });
}

async function readState(account, node) {
  const observedAt = new Date().toISOString();
  const [tokens, balances, delegations, pendingUnstakes, pendingUndelegations, pools, powers, beeBids, workerBeeBids] = await Promise.all([
    find(node, "tokens", "tokens", { symbol: SYMBOL }, 2),
    find(node, "tokens", "balances", { account, symbol: SYMBOL }, 2),
    find(node, "tokens", "delegations", { from: account, to: POOL_ACCOUNT, symbol: SYMBOL }, 2),
    find(node, "tokens", "pendingUnstakes", { account, symbol: SYMBOL }, 100),
    find(node, "tokens", "pendingUndelegations", { account, symbol: SYMBOL }, 100),
    find(node, "mining", "pools", { id: POOL_ID }, 2),
    find(node, "mining", "miningPower", { id: POOL_ID, account: POOL_ACCOUNT }, 2),
    find(node, "market", "buyBook", { symbol: "BEE" }, 1000, [{ index: "priceDec", descending: true }]),
    find(node, "market", "buyBook", { symbol: SYMBOL }, 1000, [{ index: "priceDec", descending: true }]),
  ]);
  if (tokens.length !== 1 || balances.length !== 1 || delegations.length > 1 || pools.length !== 1 || powers.length !== 1) fail(`${node} returned non-unique WORKERBEE evidence`);
  const token = tokens[0]; const balance = balances[0]; const delegationRow = delegations[0]; const pool = pools[0];
  const precision = Number(token.precision); if (precision !== 5) fail(`${node} returned unexpected WORKERBEE precision`);
  const canonical = (value) => format(units(String(value ?? "0"), precision), precision);
  const bidsBee = liveBook(beeBids, 8, true, Math.floor(Date.parse(observedAt) / 1000));
  const bidsWorkerBee = liveBook(workerBeeBids, precision, true, Math.floor(Date.parse(observedAt) / 1000));
  return Object.freeze({ account, symbol: SYMBOL, observedAt, token: Object.freeze({ issuer: String(token.issuer), precision,
    stakingEnabled: token.stakingEnabled === true, delegationEnabled: token.delegationEnabled === true,
    unstakingCooldownDays: Number(token.unstakingCooldown), undelegationCooldownDays: Number(token.undelegationCooldown),
    numberTransactions: Number(token.numberTransactions) }),
  balance: Object.freeze({ liquid: canonical(balance.balance), stake: canonical(balance.stake), delegationsOut: canonical(balance.delegationsOut),
    pendingUnstake: canonical(balance.pendingUnstake), pendingUndelegations: canonical(balance.pendingUndelegations) }),
  delegation: Object.freeze({ to: POOL_ACCOUNT, quantity: canonical(delegationRow?.quantity ?? "0") }),
  pendingRows: Object.freeze({ unstakes: pendingUnstakes.length, undelegations: pendingUndelegations.length }),
  pool: Object.freeze({ id: String(pool.id), minedToken: String(pool.minedToken), lotteryWinners: Number(pool.lotteryWinners),
    lotteryIntervalHours: Number(pool.lotteryIntervalHours), lotteryAmount: format(units(pool.lotteryAmount, 8), 8), active: pool.active === true,
    tokenMiners: Object.freeze((pool.tokenMiners ?? []).map((row) => Object.freeze({ symbol: String(row.symbol), multiplier: Number(row.multiplier) }))),
    totalPower: canonical(pool.totalPower), poolAccountPower: canonical(powers[0]?.power?.$numberDecimal ?? powers[0]?.power ?? "0") }),
  books: Object.freeze({ beeBids: Object.freeze(bidsBee), workerBeeBids: Object.freeze(bidsWorkerBee) }) });
}

const AGREEMENT_FIELDS = ["account", "symbol", "token", "balance", "delegation", "pendingRows", "pool", "books"];
export function statesAgree(left, right) { return AGREEMENT_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field])); }

function depthProceeds(quantityUnits, quantityPrecision, bids) {
  let left = quantityUnits; let proceeds = 0n; let levels = 0; let floorPrice = null;
  for (const bid of bids) {
    if (left === 0n) break;
    const available = units(bid.quantity, quantityPrecision); const take = available < left ? available : left;
    if (take === 0n) continue;
    const price = units(bid.price, 8); proceeds += take * price / (10n ** BigInt(quantityPrecision)); left -= take; levels += 1; floorPrice = bid.price;
  }
  return left === 0n ? Object.freeze({ proceeds, levels, floorPrice }) : null;
}

export function planWorkerBeeYield(state) {
  const token = state.token; const balance = state.balance; const pool = state.pool;
  if (state.account !== ACCOUNT || state.symbol !== SYMBOL) return Object.freeze({ kind: "refuse", reason: "policy identity mismatch" });
  if (token?.issuer !== "steem-tokens" || token.precision !== 5 || token.stakingEnabled !== true || token.delegationEnabled !== true
    || token.unstakingCooldownDays !== 63 || token.undelegationCooldownDays !== 7 || token.numberTransactions !== 9
    || Object.keys(token).sort().join(",") !== ["delegationEnabled", "issuer", "numberTransactions", "precision", "stakingEnabled", "undelegationCooldownDays", "unstakingCooldownDays"].sort().join(",")) return Object.freeze({ kind: "refuse", reason: "WORKERBEE contract terms changed" });
  const miner = Array.isArray(pool?.tokenMiners) && pool.tokenMiners.length === 1 ? pool.tokenMiners[0] : null;
  if (pool.id !== POOL_ID || pool.minedToken !== "BEE" || pool.active !== true || pool.lotteryWinners !== 10
    || pool.lotteryIntervalHours !== 1 || pool.lotteryAmount !== "10.00000000"
    || miner?.symbol !== SYMBOL || miner.multiplier !== 1 || Object.keys(miner).sort().join(",") !== "multiplier,symbol") return Object.freeze({ kind: "refuse", reason: "BEE mining pool terms changed" });
  if (state.pendingRows.unstakes !== 0 || state.pendingRows.undelegations !== 0
    || units(balance.pendingUnstake, 5) !== 0n || units(balance.pendingUndelegations, 5) !== 0n) return Object.freeze({ kind: "refuse", reason: "WORKERBEE has a pending release movement" });
  const quantityUnits = units(balance.liquid, 5);
  if (quantityUnits === 0n) return Object.freeze({ kind: "refuse", reason: "no liquid WORKERBEE remains" });
  if (quantityUnits > 1_000_000n) return Object.freeze({ kind: "refuse", reason: "liquid WORKERBEE exceeds the signer cap of 10.00000" });
  if (!Array.isArray(state.books?.beeBids) || !Array.isArray(state.books?.workerBeeBids)) return Object.freeze({ kind: "refuse", reason: "live BEE or WORKERBEE bid evidence is absent" });
  const totalPowerUnits = units(pool.totalPower, 5); if (totalPowerUnits === 0n) return Object.freeze({ kind: "refuse", reason: "BEE mining power is zero" });
  const weeklyLotteries = 168n / BigInt(pool.lotteryIntervalHours);
  const weeklyBeeUnits = quantityUnits * units(pool.lotteryAmount, 8) * weeklyLotteries / totalPowerUnits;
  const annualBeeUnits = weeklyBeeUnits * 52n;
  const beeExit = depthProceeds(annualBeeUnits, 8, state.books.beeBids);
  const workerBeeExit = depthProceeds(quantityUnits, 5, state.books.workerBeeBids);
  if (!beeExit || !workerBeeExit) return Object.freeze({ kind: "refuse", reason: "displayed bids cannot value both the annual BEE output and full WORKERBEE position" });
  const annualSwapHiveUnits = beeExit.proceeds; const positionBidValueUnits = workerBeeExit.proceeds;
  const annualYieldBps = positionBidValueUnits === 0n ? 0 : Number(annualSwapHiveUnits * 10_000n / positionBidValueUnits);
  const quantity = format(quantityUnits, 5);
  return Object.freeze({ kind: "stake-delegate", quantity, recipient: POOL_ACCOUNT,
    lockTerms: Object.freeze({ unstakingCooldownDays: 63, releaseTransactions: 9, undelegationCooldownDays: 7 }),
    expectedYield: Object.freeze({ derivation: "q/totalPower * lotteryAmount * 168 lotteries/week; both legs integrated across complete displayed bid depth",
      weeklyBeeFloor: format(weeklyBeeUnits, 8), annualBeeFloor: format(annualBeeUnits, 8),
      annualSwapHiveAtBidFloor: format(annualSwapHiveUnits, 8), annualBeeExitLevels: beeExit.levels, annualBeeFloorPrice: beeExit.floorPrice,
      positionSwapHiveAtBidFloor: format(positionBidValueUnits, 8), positionExitLevels: workerBeeExit.levels, positionFloorPrice: workerBeeExit.floorPrice, annualYieldBps }),
    operation: batchOperations(state.account, [stake(state.account, SYMBOL, quantity, state.account), delegate(state.account, SYMBOL, quantity, POOL_ACCOUNT)]) });
}

async function independentlyObservedState(account) {
  const states = await Promise.all(CONTRACT_NODES.map((node) => readState(account, node)));
  if (!statesAgree(states[0], states[1])) fail("independent Hive-Engine providers disagree on WORKERBEE yield evidence");
  return Object.freeze({ state: states[0], evidenceProviders: Object.freeze(CONTRACT_NODES.map((node) => Object.freeze({ node }))) });
}

function exactCustomJson(actual, expected) {
  return actual?.id === expected.id && actual?.json === expected.json
    && JSON.stringify(actual?.required_auths) === JSON.stringify(expected.required_auths)
    && JSON.stringify(actual?.required_posting_auths) === JSON.stringify(expected.required_posting_auths)
    && Object.keys(actual ?? {}).sort().join(",") === Object.keys(expected).sort().join(",");
}

async function confirmHive(txid, operation) {
  const rows = new Map();
  for (let attempt = 0; attempt < 12 && rows.size < 2; attempt += 1) {
    await Promise.all(HIVE_NODES.map(async (node) => { if (rows.has(node)) return; const tx = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      const actual = tx?.operations?.[0]?.value ?? tx?.operations?.[0]?.[1]; if (!actual) return;
      if (!exactCustomJson(actual, operation[1])) fail(`${node} did not confirm the exact WORKERBEE yield operation`);
      rows.set(node, Object.freeze({ node, block: Number(tx.block_num) })); }));
    if (rows.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  const result = [...rows.values()]; if (result.length < 2 || new Set(result.map((row) => row.block)).size !== 1) fail("Hive providers did not agree on the WORKERBEE transaction");
  return Object.freeze(result);
}

async function engineTx(node, txid) {
  for (const candidate of [txid, `${txid}-0`]) { const row = await rpc(node, "getTransactionInfo", { txid: candidate }).catch(() => null); if (!row) continue;
    return normalizeEngineTransactionInfo(row, node, candidate); }
  return null;
}

// Hive Engine returns a row for a single call and an array of child rows for a
// batched custom_json.  Normalize both without discarding the child identity;
// otherwise a successful first call could be mistaken for the whole batch.
export function normalizeEngineTransactionInfo(result, node = "provider", candidate = "unknown") {
  const rows = Array.isArray(result) ? result : [result];
  if (rows.length === 0) fail(`${node} returned an empty WORKERBEE transaction`);
  const events = []; const transactionIds = []; const blocks = new Set();
  for (const row of rows) {
    let logs; try { logs = typeof row?.logs === "string" ? JSON.parse(row.logs) : row?.logs; } catch { logs = null; }
    if (!logs || typeof logs !== "object" || Array.isArray(logs)) fail(`${node} returned malformed WORKERBEE logs`);
    if (Array.isArray(logs.errors) && logs.errors.length > 0) fail(`${node} reports a WORKERBEE yield error: ${logs.errors.join("; ")}`);
    if (Array.isArray(logs.events)) events.push(...logs.events);
    transactionIds.push(String(row?.transactionId ?? candidate)); blocks.add(Number(row?.blockNumber));
  }
  if (blocks.size !== 1 || ![...blocks][0] || transactionIds.some((id) => !/^[0-9a-f]{40}(?:-[0-9]+)?$/.test(id))) fail(`${node} returned inconsistent WORKERBEE child identities`);
  return Object.freeze({ node, transactionIds: Object.freeze(transactionIds), blockNumber: [...blocks][0], logs: Object.freeze({ events: Object.freeze(events) }) });
}

function exactYieldEvents(logs, quantity) {
  const events = Array.isArray(logs?.events) ? logs.events : [];
  const stakeEvent = events.filter((event) => event.contract === "tokens" && event.event === "stake"
    && JSON.stringify(event.data) === JSON.stringify({ account: ACCOUNT, symbol: SYMBOL, quantity }));
  const delegateEvent = events.filter((event) => event.contract === "tokens" && event.event === "delegate"
    && JSON.stringify(event.data) === JSON.stringify({ to: POOL_ACCOUNT, symbol: SYMBOL, quantity }));
  return stakeEvent.length === 1 && delegateEvent.length === 1;
}

async function waitForEffect(account, txid, before, plan) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [transactions, states] = await Promise.all([Promise.all(BLOCKCHAIN_NODES.map((node) => engineTx(node, txid))), Promise.all(CONTRACT_NODES.map((node) => readState(account, node)))]);
    const quantity = units(plan.quantity, 5); const expectedLiquid = units(before.balance.liquid, 5) - quantity;
    const expectedOut = units(before.balance.delegationsOut, 5) + quantity; const expectedDelegation = units(before.delegation.quantity, 5) + quantity;
    const confirmed = transactions.every((row) => row && exactYieldEvents(row.logs, plan.quantity)) && states.every((state) =>
      units(state.balance.liquid, 5) === expectedLiquid && units(state.balance.stake, 5) === units(before.balance.stake, 5)
      && units(state.balance.delegationsOut, 5) === expectedOut && units(state.delegation.quantity, 5) === expectedDelegation);
    if (confirmed) return Object.freeze({ transactions, states });
    if (attempt < 19) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  return null;
}

export async function operate(options) {
  if (options.executeOne) await verifyActiveKey(options.account, options.keyFile);
  const observed = await independentlyObservedState(options.account); const plan = planWorkerBeeYield(observed.state);
  const base = Object.freeze({ kind: "aagaard.asset-yield-receipt", account: options.account, symbol: SYMBOL, observedAt: new Date().toISOString(), before: observed.state,
    evidenceProviders: observed.evidenceProviders, plan });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed" });
  if (plan.kind !== "stake-delegate") fail(`fresh plan is not executable: ${plan.reason}`);
  const target = `workerbee:${POOL_ACCOUNT}:${plan.quantity}`; let submission;
  try { submission = await broadcast({ account: options.account, role: "active", lane: "asset-yield", target, keyFile: options.keyFile, operation: plan.operation }); }
  catch (error) { throw new Error(`submission outcome unknown; do not retry automatically: ${error instanceof Error ? error.message : String(error)}`); }
  if (!/^[0-9a-f]{40}$/.test(String(submission?.id ?? ""))) fail("submission returned no canonical transaction id; do not retry automatically");
  const transactionId = String(submission.id); let hive = null; let effect = null; let settlementError = null;
  try { hive = await confirmHive(transactionId, plan.operation); effect = await waitForEffect(options.account, transactionId, observed.state, plan); if (!effect) settlementError = "WORKERBEE yield effect did not independently reconcile before timeout"; }
  catch (error) { settlementError = error instanceof Error ? error.message : String(error); }
  const completedAt = new Date().toISOString(); const receipt = Object.freeze({ ...base, transactionId, ...(hive ? { hive } : {}),
    status: effect ? "yield-delegation-confirmed" : "settlement-pending", retryAllowed: false, ...(settlementError ? { settlementError } : {}),
    ...(effect ? { engine: effect.transactions, after: effect.states } : {}), completedAt });
  const event = await recordAssetYield(DATA_DIR, receipt, completedAt);
  return Object.freeze({ ...receipt, durableRecord: Object.freeze({ confirmed: true, eventId: event.eventId }) });
}

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))))}\n`); }
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
