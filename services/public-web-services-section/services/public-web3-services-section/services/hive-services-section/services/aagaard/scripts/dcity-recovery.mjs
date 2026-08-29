#!/usr/bin/env node
// One-action recovery operator for liquid SIM left by the closed dCity game.
// It can only exchange the account's entire freshly observed liquid SIM
// balance for SWAP.HIVE through the exact surviving pool with a hard minimum.
// CITY NFTs are observed but this script has no burn, transfer, or market path.

import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  dcityDecimalUnits,
  dcityFormatUnits,
  planDCityLiquidSimRecovery,
} from "../src/integrations/dcity/dcity.adapter.ts";
import { createSerializedHiveEngineRpc } from "../src/integrations/hive-engine/serializedRpc.mts";
import { PrivateKey } from "../src/integrations/hive/waggle/keys.mjs";

const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const ENGINE_CONTRACT_NODES = ["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts"];
const ENGINE_BLOCKCHAIN_NODES = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);
const CONTRACT_READERS = new Map(ENGINE_CONTRACT_NODES.map((node) => [node,
  createSerializedHiveEngineRpc({ nodes: [node], timeoutMs: 7_000, attemptsPerNode: 2 })]));

function fail(message) { throw new Error(`dcity-recovery: ${message}`); }

export function parseOptions(argv) {
  const options = { account: "", keyFile: "", executeOne: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      index += 1;
      return value;
    };
    if (argument === "--account") options.account = take().toLowerCase();
    else if (argument === "--key-file") options.keyFile = take();
    else if (argument === "--execute-one") options.executeOne = true;
    else fail(`unknown argument ${argument}`);
  }
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical Hive --account is required");
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file");
  return Object.freeze(options);
}

async function rpc(node, method, params, timeoutMs = 7000) {
  let residue = "unavailable";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(node, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { residue = "non-JSON gateway response"; continue; }
      if (!response.ok || body?.error) { residue = `HTTP ${response.status} or RPC error`; continue; }
      return body?.result;
    } catch (error) {
      residue = error instanceof Error ? error.message : String(error);
    }
    if (attempt === 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  fail(`${node} ${method} failed after retry: ${residue}`);
}

async function find(node, contract, table, query, limit = 1000) {
  const reader = CONTRACT_READERS.get(node);
  if (!reader) fail(`${node} is not an admitted Hive Engine contract provider`);
  return await reader.find(contract, table, query, limit, 0, []);
}

function one(rows, field) {
  if (rows.length !== 1) fail(`${field} must have exactly one live row`);
  return rows[0];
}

async function readState(account, node) {
  const [simTokens, swapTokens, simBalances, swapBalances, directPools, reversePools, nfts] = await Promise.all([
    find(node, "tokens", "tokens", { symbol: "SIM" }, 2),
    find(node, "tokens", "tokens", { symbol: "SWAP.HIVE" }, 2),
    find(node, "tokens", "balances", { account, symbol: "SIM" }, 2),
    find(node, "tokens", "balances", { account, symbol: "SWAP.HIVE" }, 2),
    find(node, "marketpools", "pools", { tokenPair: "SWAP.HIVE:SIM" }, 2),
    find(node, "marketpools", "pools", { tokenPair: "SIM:SWAP.HIVE" }, 2),
    find(node, "nft", "CITYinstances", { account, ownedBy: "u" }, 1000),
  ]);
  const poolRows = [...directPools, ...reversePools];
  const pool = one(poolRows, "SIM/SWAP.HIVE pool");
  const simBalance = simBalances.length === 0 ? "0.000" : String(one(simBalances, "SIM balance").balance);
  const swapHiveBalance = swapBalances.length === 0 ? "0.00000000" : String(one(swapBalances, "SWAP.HIVE balance").balance);
  const lockedUnits = nfts.reduce((sum, nft) => sum + dcityDecimalUnits(String(nft?.lockedTokens?.SIM ?? "0"), 3), 0n);
  return Object.freeze({
    account,
    observedAt: new Date().toISOString(),
    simBalance,
    swapHiveBalance,
    simPrecision: Number(one(simTokens, "SIM token").precision),
    swapHivePrecision: Number(one(swapTokens, "SWAP.HIVE token").precision),
    tokenPair: String(pool.tokenPair),
    baseQuantity: String(pool.baseQuantity),
    quoteQuantity: String(pool.quoteQuantity),
    nftCount: nfts.length,
    nftLockedSim: dcityFormatUnits(lockedUnits, 3),
  });
}

const ECONOMIC_FIELDS = ["account", "simBalance", "swapHiveBalance", "simPrecision", "swapHivePrecision", "tokenPair", "baseQuantity", "quoteQuantity", "nftCount", "nftLockedSim"];

export function statesAgree(left, right) {
  return ECONOMIC_FIELDS.every((field) => left[field] === right[field]);
}

export function planState(state) { return planDCityLiquidSimRecovery(state, 100); }

async function independentlyObservedState(account) {
  const states = await Promise.all(ENGINE_CONTRACT_NODES.map((node) => readState(account, node)));
  if (!statesAgree(states[0], states[1])) fail("independent Hive-Engine providers disagree on the live dCity recovery evidence");
  return Object.freeze({ state: states[0], providers: Object.freeze(states.map((state, index) => Object.freeze({ node: ENGINE_CONTRACT_NODES[index], observedAt: state.observedAt }))) });
}

async function hiveAccount(account) {
  for (const node of HIVE_NODES) {
    const rows = await rpc(node, "condenser_api.get_accounts", [[account]]).catch(() => null);
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  fail(`Hive account ${account} was not found on any admitted provider`);
}

async function verifyActiveKey(account, keyFile) {
  const mode = statSync(keyFile).mode & 0o777;
  if ((mode & 0o077) !== 0) fail("active-key file must not be group/world accessible");
  const publicKey = PrivateKey.from(readFileSync(keyFile, "utf8").trim()).createPublic("STM").toString();
  const row = await hiveAccount(account);
  const threshold = Number(row.active?.weight_threshold ?? 1);
  const weight = Number((row.active?.key_auths ?? []).find(([candidate]) => candidate === publicKey)?.[1] ?? 0);
  if (weight < threshold) fail("the supplied key does not independently satisfy the account's active authority");
}

function broadcast(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [BROADCASTER.pathname], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      if (code !== 0) rejectPromise(new Error(stderr.trim() || `broadcaster exited ${code}`));
      else {
        try { resolvePromise(JSON.parse(stdout)); } catch { rejectPromise(new Error("broadcaster returned invalid JSON")); }
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}

async function confirmHiveTransaction(txid, operation) {
  const expected = operation[1];
  const confirmed = new Map();
  for (let attempt = 0; attempt < 12 && confirmed.size < 2; attempt += 1) {
    await Promise.all(HIVE_NODES.map(async (node) => {
      if (confirmed.has(node)) return;
      const transaction = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      if (!transaction) return;
      const actual = transaction?.operations?.[0]?.value ?? transaction?.operations?.[0]?.[1];
      if (actual?.id !== expected.id || actual?.json !== expected.json
        || JSON.stringify(actual?.required_auths) !== JSON.stringify(expected.required_auths)
        || JSON.stringify(actual?.required_posting_auths) !== JSON.stringify(expected.required_posting_auths)) {
        fail(`${node} did not confirm the exact dCity recovery transaction`);
      }
      confirmed.set(node, Object.freeze({ node, block: transaction.block_num }));
    }));
    if (confirmed.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  const confirmations = [...confirmed.values()];
  if (confirmations.length < 2) fail("fewer than two Hive providers confirmed the recovery transaction");
  if (new Set(confirmations.map((entry) => entry.block)).size !== 1) fail("Hive providers disagree on the recovery transaction block");
  return Object.freeze(confirmations);
}

async function waitForEngineTransactions(txid) {
  const found = new Map();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await Promise.all(ENGINE_BLOCKCHAIN_NODES.map(async (node) => {
      if (found.has(node)) return;
      for (const candidate of [txid, `${txid}-0`]) {
        const row = await rpc(node, "getTransactionInfo", { txid: candidate }).catch(() => null);
        if (!row) continue;
        let logs;
        try { logs = typeof row.logs === "string" ? JSON.parse(row.logs) : row.logs; } catch { logs = null; }
        if (Array.isArray(logs?.errors) && logs.errors.length > 0) fail(`${node} reports a Hive-Engine recovery error`);
        found.set(node, Object.freeze({ node, transactionId: row.transactionId ?? candidate, blockNumber: row.blockNumber ?? null }));
        break;
      }
    }));
    if (found.size === ENGINE_BLOCKCHAIN_NODES.length) return Object.freeze([...found.values()]);
    if (attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  fail("both Hive-Engine providers did not confirm the recovery transaction");
}

function effectConfirmed(before, after, quote) {
  const beforeSim = dcityDecimalUnits(before.simBalance, 3);
  const afterSim = dcityDecimalUnits(after.simBalance, 3);
  const quantity = dcityDecimalUnits(quote.quantitySim, 3);
  const beforeSwap = dcityDecimalUnits(before.swapHiveBalance, 8);
  const afterSwap = dcityDecimalUnits(after.swapHiveBalance, 8);
  const minimum = dcityDecimalUnits(quote.minimumSwapHive, 8);
  return beforeSim - afterSim === quantity && afterSwap - beforeSwap >= minimum;
}

async function waitForBalanceEffect(account, before, quote) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const states = await Promise.all(ENGINE_CONTRACT_NODES.map((node) => readState(account, node)));
    if (states.every((state) => effectConfirmed(before, state, quote))) return Object.freeze(states);
    if (attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  fail("both Hive-Engine providers did not confirm the bounded SIM exit effect");
}

function safeState(state) {
  return Object.freeze({
    observedAt: state.observedAt,
    simBalance: state.simBalance,
    swapHiveBalance: state.swapHiveBalance,
    pool: Object.freeze({ tokenPair: state.tokenPair, baseQuantity: state.baseQuantity, quoteQuantity: state.quoteQuantity }),
    cityNfts: Object.freeze({ count: state.nftCount, lockedSim: state.nftLockedSim, disposition: "preserved" }),
  });
}

export async function operate(options) {
  // In the armed lane verify authority before touching the economic
  // providers, then make exactly one two-provider observation. This avoids a
  // duplicate burst that can trigger public-node gateway throttling while
  // still placing the only executable quote immediately before broadcast.
  if (options.executeOne) await verifyActiveKey(options.account, options.keyFile);
  const observed = await independentlyObservedState(options.account);
  const plan = planState(observed.state);
  const base = Object.freeze({
    kind: "aagaard.dcity-liquid-recovery-receipt",
    account: options.account,
    observedAt: new Date().toISOString(),
    before: safeState(observed.state),
    providers: observed.providers,
    plan,
  });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed" });
  if (plan.kind !== "ready") fail(`fresh plan is not executable: ${plan.reason}`);
  const broadcastResult = await broadcast({
    account: options.account,
    role: "active",
    lane: "gaming",
    target: "dcity-liquid-sim-recovery",
    keyFile: options.keyFile,
    operation: plan.quote.operation,
  });
  const [hiveConfirmations, engineConfirmations, afterStates] = await Promise.all([
    confirmHiveTransaction(broadcastResult.id, plan.quote.operation),
    waitForEngineTransactions(broadcastResult.id),
    waitForBalanceEffect(options.account, observed.state, plan.quote),
  ]);
  const beforeSwap = dcityDecimalUnits(observed.state.swapHiveBalance, 8);
  const afterSwap = dcityDecimalUnits(afterStates[0].swapHiveBalance, 8);
  return Object.freeze({
    ...base,
    status: "recovered-confirmed",
    transactionId: broadcastResult.id,
    executedQuote: plan.quote,
    actualSwapHiveReceived: dcityFormatUnits(afterSwap - beforeSwap, 8),
    hiveConfirmations,
    engineConfirmations,
    after: safeState(afterStates[0]),
    completedAt: new Date().toISOString(),
  });
}

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))))}\n`); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
