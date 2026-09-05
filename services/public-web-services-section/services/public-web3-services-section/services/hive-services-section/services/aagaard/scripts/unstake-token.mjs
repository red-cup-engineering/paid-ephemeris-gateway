#!/usr/bin/env node
import { reportFailure } from "../src/commandFailure.mjs";
// Start one full-balance Hive-Engine unstake after independently proving the
// token's cooldown and that no delegation or earlier unstake encumbers it.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { tokenUnlockEvent } from "../src/core/tokenUnlockSettlement.mts";
import { broadcastViaChildProcess, makeFail, rpc as sharedRpc, verifyActiveKey as sharedVerifyActiveKey } from "../src/core/hiveScriptSupport.mjs";
import { unstake } from "../src/integrations/hive-engine/hiveEngineOps.mjs";

const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const CONTRACT_NODES = ["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts"];
const BLOCKCHAIN_NODES = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);

const fail = makeFail("unstake-token");
const rpc = (node, method, params, timeoutMs) => sharedRpc(node, method, params, { timeoutMs, backoffMs: 350, fail });
function broadcast(request) { return broadcastViaChildProcess(request, BROADCASTER); }
async function verifyActiveKey(account, keyFile) { return sharedVerifyActiveKey(account, keyFile, { rpc, hiveNode: HIVE_NODES[0], fail }); }

export function parseOptions(argv) {
  const options = { account: "", symbol: "", keyFile: "", executeOne: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => { const value = argv[index + 1]; if (!value || value.startsWith("--")) fail(`${argument} requires a value`); index += 1; return value; };
    if (argument === "--account") options.account = take().toLowerCase();
    else if (argument === "--symbol") options.symbol = take().toUpperCase();
    else if (argument === "--key-file") options.keyFile = take();
    else if (argument === "--execute-one") options.executeOne = true;
    else fail(`unknown argument ${argument}`);
  }
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical Hive --account is required");
  if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(options.symbol) || options.symbol === "SWAP.HIVE") fail("a stakable --symbol is required");
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file");
  return Object.freeze(options);
}

async function find(node, contract, table, query, limit = 1000) {
  const rows = await rpc(node, "find", { contract, table, query, limit, offset: 0, indexes: [] });
  if (!Array.isArray(rows)) fail(`${node} returned a non-array ${contract}.${table} result`); return rows;
}

function units(value, precision) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(String(value));
  if (!match || (match[2]?.length ?? 0) > precision) fail(`noncanonical ${precision}-decimal quantity '${value}'`);
  return BigInt(match[1]) * 10n ** BigInt(precision) + BigInt((match[2] ?? "").padEnd(precision, "0"));
}

function format(value, precision) {
  const scale = 10n ** BigInt(precision); return precision === 0 ? String(value) : `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`;
}

async function readState(account, symbol, node) {
  const [tokens, balances, pending] = await Promise.all([
    find(node, "tokens", "tokens", { symbol }, 2), find(node, "tokens", "balances", { account, symbol }, 2),
    find(node, "tokens", "pendingUnstakes", { account, symbol }, 1000),
  ]);
  if (tokens.length !== 1 || balances.length !== 1) fail(`${node} returned non-unique token or balance evidence`);
  const token = tokens[0]; const balance = balances[0]; const precision = Number(token.precision);
  if (!Number.isInteger(precision) || precision < 0 || precision > 8) fail(`${node} returned invalid precision`);
  const canonical = (value) => format(units(String(value ?? "0"), precision), precision);
  return Object.freeze({ account, symbol, precision, stakingEnabled: token.stakingEnabled === true,
    unstakingCooldownDays: Number(token.unstakingCooldown), numberTransactions: Number(token.numberTransactions),
    liquid: canonical(balance.balance), stake: canonical(balance.stake), pendingUnstake: canonical(balance.pendingUnstake),
    delegationsOut: canonical(balance.delegationsOut), pendingUndelegations: canonical(balance.pendingUndelegations),
    pendingRows: Object.freeze(pending.map((row) => Object.freeze({ txID: String(row.txID), quantity: canonical(row.quantity),
      quantityLeft: canonical(row.quantityLeft), nextTransactionTimestamp: Number(row.nextTransactionTimestamp),
      numberTransactionsLeft: Number(row.numberTransactionsLeft) })).sort((a, b) => a.txID.localeCompare(b.txID))) });
}

const ECONOMIC_FIELDS = ["account", "symbol", "precision", "stakingEnabled", "unstakingCooldownDays", "numberTransactions", "liquid", "stake", "pendingUnstake", "delegationsOut", "pendingUndelegations", "pendingRows"];
export function statesAgree(left, right) { return ECONOMIC_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field])); }

export function planUnstake(state) {
  const stake = units(state.stake, state.precision);
  if (!state.stakingEnabled) return Object.freeze({ kind: "refuse", reason: "token staking is not enabled" });
  if (stake === 0n) return Object.freeze({ kind: "refuse", reason: "no staked balance remains" });
  if (units(state.pendingUnstake, state.precision) !== 0n || state.pendingRows.length !== 0) return Object.freeze({ kind: "refuse", reason: "an unstake is already pending" });
  if (units(state.delegationsOut, state.precision) !== 0n || units(state.pendingUndelegations, state.precision) !== 0n) return Object.freeze({ kind: "refuse", reason: "delegated stake must return before unstaking" });
  if (!Number.isInteger(state.unstakingCooldownDays) || state.unstakingCooldownDays < 1
    || !Number.isInteger(state.numberTransactions) || state.numberTransactions < 1) return Object.freeze({ kind: "refuse", reason: "token unstake schedule is malformed" });
  const quantity = format(stake, state.precision);
  return Object.freeze({ kind: "unstake", quantity, cooldownDays: state.unstakingCooldownDays,
    numberTransactions: state.numberTransactions,
    firstReleaseUnits: format(stake / BigInt(state.numberTransactions), state.precision),
    operation: unstake(state.account, state.symbol, quantity) });
}

async function independentlyObservedState(account, symbol) {
  const states = await Promise.all(CONTRACT_NODES.map((node) => readState(account, symbol, node)));
  if (!statesAgree(states[0], states[1])) fail("independent Hive-Engine providers disagree on unstake evidence");
  return Object.freeze({ state: states[0], providers: Object.freeze(CONTRACT_NODES.map((node) => Object.freeze({ node }))) });
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
    await Promise.all(HIVE_NODES.map(async (node) => { if (rows.has(node)) return;
      const tx = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      const actual = tx?.operations?.[0]?.value ?? tx?.operations?.[0]?.[1]; if (!actual) return;
      if (!exactCustomJson(actual, operation[1])) fail(`${node} did not confirm the exact unstake operation`);
      rows.set(node, Object.freeze({ node, block: Number(tx.block_num) })); }));
    if (rows.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  const result = [...rows.values()]; if (result.length < 2 || new Set(result.map((row) => row.block)).size !== 1) fail("Hive providers did not agree on the unstake transaction");
  return Object.freeze(result);
}

async function engineTx(node, txid) {
  for (const candidate of [txid, `${txid}-0`]) { const row = await rpc(node, "getTransactionInfo", { txid: candidate }).catch(() => null); if (!row) continue;
    let logs; try { logs = typeof row.logs === "string" ? JSON.parse(row.logs) : row.logs; } catch { logs = null; }
    if (Array.isArray(logs?.errors) && logs.errors.length > 0) fail(`${node} reports an unstake error: ${logs.errors.join("; ")}`);
    return Object.freeze({ node, transactionId: String(row.transactionId ?? candidate), blockNumber: Number(row.blockNumber), logs }); }
  return null;
}

async function waitForEffect(account, symbol, txid, before, plan) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [transactions, states] = await Promise.all([
      Promise.all(BLOCKCHAIN_NODES.map((node) => engineTx(node, txid))),
      Promise.all(CONTRACT_NODES.map((node) => readState(account, symbol, node))),
    ]);
    const quantity = units(plan.quantity, before.precision); const first = quantity / BigInt(before.numberTransactions);
    const confirmed = transactions.every(Boolean) && states.every((state) =>
      units(state.pendingUnstake, before.precision) - units(before.pendingUnstake, before.precision) === quantity
      && units(before.stake, before.precision) - units(state.stake, before.precision) === first
      && state.pendingRows.some((row) => row.txID === txid && units(row.quantity, before.precision) === quantity));
    if (confirmed) return Object.freeze({ transactions, states });
    if (attempt < 19) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  return null;
}

export async function operate(options) {
  if (options.executeOne) await verifyActiveKey(options.account, options.keyFile);
  const observed = await independentlyObservedState(options.account, options.symbol); const plan = planUnstake(observed.state);
  const base = Object.freeze({ kind: "aagaard.token-unstake-receipt", account: options.account, symbol: options.symbol,
    observedAt: new Date().toISOString(), before: observed.state, evidenceProviders: observed.providers, plan });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed" });
  if (plan.kind !== "unstake") fail(`fresh plan is not executable: ${plan.reason}`);
  const target = `unstake:${options.symbol}:${plan.quantity}`; let submission;
  try { submission = await broadcast({ account: options.account, role: "active", lane: "liquidity-unlock", target, keyFile: options.keyFile, operation: plan.operation }); }
  catch (error) { throw new Error(`submission outcome unknown; do not retry automatically: ${error instanceof Error ? error.message : String(error)}`); }
  if (!/^[0-9a-f]{40}$/.test(String(submission?.id ?? ""))) fail("submission returned no canonical transaction id; do not retry automatically");
  const transactionId = String(submission.id); let hive = null; let effect = null; let settlementError = null;
  try { hive = await confirmHive(transactionId, plan.operation); effect = await waitForEffect(options.account, options.symbol, transactionId, observed.state, plan);
    if (!effect) settlementError = "unstake effect did not independently reconcile before timeout"; }
  catch (error) { settlementError = error instanceof Error ? error.message : String(error); }
  const completedAt = new Date().toISOString(); const receipt = Object.freeze({ ...base, transactionId, ...(hive ? { hive } : {}),
    status: effect ? "unstake-start-confirmed" : "settlement-pending", retryAllowed: false,
    ...(settlementError ? { settlementError } : {}), ...(effect ? { engine: effect.transactions, after: effect.states } : {}), completedAt });
  const event = tokenUnlockEvent(receipt, completedAt);
  return Object.freeze({ ...receipt, durableRecord: Object.freeze({ confirmed: true, eventId: event.eventId }) });
}

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))))}\n`); }
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch(reportFailure);
