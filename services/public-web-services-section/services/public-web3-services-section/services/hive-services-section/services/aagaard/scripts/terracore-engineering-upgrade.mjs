#!/usr/bin/env node
// One-time, one-level TerraCore Engineering upgrade. This boundary is fixed
// to the proven level-14 -> level-15 opportunity, exact SCRAP cost and reserve
// policy. It cannot upgrade another stat, repeat a level, stake, transfer to a
// player, buy an asset, contribute Favor, or invoke another game operation.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  parseTerraCorePlayer,
  planTerraCoreEngineeringUpgrade,
  reconcileTerraCoreEngineeringUpgrade,
  terraCoreEngineeringUpgradeIntent,
} from "../src/integrations/terracore/terracore.adapter.ts";
import { PrivateKey } from "../src/integrations/hive/waggle/keys.mjs";

const API = "https://api.terracoregame.com";
const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const CONTRACT_NODES = ["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts"];
const BLOCKCHAIN_NODES = ["https://api.hive-engine.com/rpc/blockchain", "https://herpc.dtools.dev/blockchain"];
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);

function fail(message) { throw new Error(`terracore-engineering-upgrade: ${message}`); }

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

async function rpc(node, method, params, timeoutMs = 8_000) {
  let residue = "unavailable";
  for (let attempt = 0; attempt < 3; attempt += 1) {
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
      if (response.ok && !body?.error) return body?.result;
      residue = `HTTP ${response.status} or RPC error`;
    } catch (error) { residue = error instanceof Error ? error.message : String(error); }
    if (attempt < 2) await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * (attempt + 1)));
  }
  fail(`${node} ${method} failed: ${residue}`);
}

async function find(node, contract, table, query, limit = 2) {
  const rows = await rpc(node, "find", { contract, table, query, limit, offset: 0, indexes: [] });
  if (!Array.isArray(rows)) fail(`${node} returned malformed ${contract}.${table} evidence`);
  return rows;
}

function exact8(value) {
  if (!/^(?:0|[1-9][0-9]*)\.[0-9]{8}$/.test(value)) fail(`noncanonical eight-decimal SCRAP amount '${value}'`);
  return BigInt(value.replace(".", ""));
}

async function readPlayer(account) {
  const response = await fetch(`${API}/player/${encodeURIComponent(account)}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) fail(`player read returned HTTP ${response.status}`);
  return parseTerraCorePlayer(await response.text(), new Date().toISOString());
}

async function readEngineState(account, node) {
  const [tokens, balances] = await Promise.all([
    find(node, "tokens", "tokens", { symbol: "SCRAP" }),
    find(node, "tokens", "balances", { account, symbol: "SCRAP" }),
  ]);
  if (tokens.length !== 1 || Number(tokens[0]?.precision) !== 8) fail(`${node} did not confirm SCRAP precision 8`);
  if (balances.length > 1) fail(`${node} returned duplicate SCRAP balances`);
  const liquidScrap = String(balances[0]?.balance ?? "0.00000000");
  exact8(liquidScrap);
  return Object.freeze({ node, liquidScrap, scrapPrecision: 8, observedAt: new Date().toISOString() });
}

export function engineStatesAgree(left, right) {
  return left.liquidScrap === right.liquidScrap && left.scrapPrecision === right.scrapPrecision;
}

async function independentlyReadState(account) {
  const states = await Promise.all(CONTRACT_NODES.map((node) => readEngineState(account, node)));
  if (!engineStatesAgree(states[0], states[1])) fail("independent Hive-Engine providers disagree on the upgrade capital");
  const player = await readPlayer(account);
  return Object.freeze({
    economic: Object.freeze({ player, liquidScrap: states[0].liquidScrap, scrapPrecision: states[0].scrapPrecision }),
    providers: Object.freeze(states),
  });
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

async function confirmHive(txid, operation) {
  const confirmations = new Map();
  for (let attempt = 0; attempt < 12 && confirmations.size < 2; attempt += 1) {
    await Promise.all(HIVE_NODES.map(async (node) => {
      if (confirmations.has(node)) return;
      const transaction = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      if (!transaction) return;
      const actual = transaction?.operations?.[0]?.value ?? transaction?.operations?.[0]?.[1];
      const expected = operation[1];
      if (actual?.id !== expected.id || actual?.json !== expected.json
        || JSON.stringify(actual?.required_auths) !== JSON.stringify(expected.required_auths)
        || JSON.stringify(actual?.required_posting_auths) !== JSON.stringify(expected.required_posting_auths)) {
        fail(`${node} did not confirm the exact engineering upgrade`);
      }
      confirmations.set(node, Object.freeze({ node, block: transaction.block_num }));
    }));
    if (confirmations.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  const rows = [...confirmations.values()];
  if (rows.length < 2) fail("fewer than two Hive providers confirmed the engineering upgrade");
  if (new Set(rows.map((row) => row.block)).size !== 1) fail("Hive providers disagree on the engineering-upgrade block");
  return Object.freeze(rows);
}

export function parseUpgradeTransaction(row, account, quantity, memo) {
  let payload;
  let logs;
  try { payload = typeof row?.payload === "string" ? JSON.parse(row.payload) : row?.payload; } catch { fail("upgrade transaction payload is not JSON"); }
  try { logs = typeof row?.logs === "string" ? JSON.parse(row.logs) : row?.logs; } catch { fail("upgrade transaction logs are not JSON"); }
  if (row?.sender !== account || row?.contract !== "tokens" || row?.action !== "transfer"
    || payload?.symbol !== "SCRAP" || payload?.to !== "null" || payload?.quantity !== quantity || payload?.memo !== memo
    || payload?.isSignedWithActiveKey !== true) {
    fail("upgrade transaction is not the exact active-authorized SCRAP burn");
  }
  if (Array.isArray(logs?.errors) && logs.errors.length > 0) fail("upgrade transaction reports a Hive-Engine error");
  const events = Array.isArray(logs?.events) ? logs.events : [];
  const event = events.find((candidate) => candidate?.contract === "tokens" && candidate?.event === "transfer"
    && candidate?.data?.from === account && candidate?.data?.to === "null"
    && candidate?.data?.symbol === "SCRAP" && candidate?.data?.quantity === quantity);
  if (!event) fail("upgrade transaction lacks the exact SCRAP transfer event");
  return Object.freeze({ transactionId: String(row.transactionId ?? ""), blockNumber: Number(row.blockNumber), quantity, memo });
}

async function waitForEngineTransaction(txid, account, quantity, memo) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const results = await Promise.all(BLOCKCHAIN_NODES.map(async (node) => {
      for (const candidate of [txid, `${txid}-0`]) {
        const row = await rpc(node, "getTransactionInfo", { txid: candidate }).catch(() => null);
        if (row) return Object.freeze({ node, parsed: parseUpgradeTransaction(row, account, quantity, memo) });
      }
      return null;
    }));
    if (results.every(Boolean)) {
      const [left, right] = results;
      if (JSON.stringify(left.parsed) !== JSON.stringify(right.parsed)) fail("Hive-Engine providers disagree on the upgrade transaction");
      return Object.freeze(results);
    }
    if (attempt < 14) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  fail("both Hive-Engine providers did not confirm the engineering upgrade");
}

async function waitForEconomicEffect(account, before, quote) {
  let lastReason = "effect unavailable";
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const after = await independentlyReadState(account);
      const reconciliation = reconcileTerraCoreEngineeringUpgrade(before.economic, after.economic, quote);
      if (reconciliation.confirmed) return Object.freeze({ after, reconciliation });
      lastReason = reconciliation.reason;
    } catch (error) { lastReason = error instanceof Error ? error.message : String(error); }
    if (attempt < 14) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  fail(`engineering upgrade did not reconcile: ${lastReason}`);
}

function safeState(state) {
  return Object.freeze({
    observedAt: state.player.observedAt,
    engineering: state.player.engineering,
    mineRate: state.player.mineRate,
    scrapPerDay: null,
    maxAttacks: state.player.maxAttacks,
    lastUpgradeMs: state.player.lastUpgradeMs ?? null,
    liquidScrap: state.liquidScrap,
  });
}

export async function operate(options) {
  if (options.executeOne) await verifyActiveKey(options.account, options.keyFile);
  const before = await independentlyReadState(options.account);
  const plan = planTerraCoreEngineeringUpgrade(before.economic);
  const base = Object.freeze({
    kind: "aagaard.terracore-engineering-upgrade-receipt",
    account: options.account,
    observedAt: new Date().toISOString(),
    before: safeState(before.economic),
    plan,
    providers: before.providers.map(({ node, observedAt }) => Object.freeze({ node, observedAt })),
  });
  if (!options.executeOne) return Object.freeze({ ...base, status: "observed" });
  if (plan.kind !== "ready") fail(`fresh plan is not executable: ${plan.reason}`);
  const nonce = randomBytes(8).toString("hex");
  const intent = terraCoreEngineeringUpgradeIntent(options.account, plan.quote.costScrap, nonce);
  const memo = JSON.parse(intent.operation[1].json).contractPayload.memo;
  let result;
  try {
    result = await broadcast({
      account: options.account,
      role: "active",
      lane: "gaming",
      target: "terracore-engineering-upgrade",
      keyFile: options.keyFile,
      operation: intent.operation,
    });
  } catch (error) {
    throw new Error(`submission outcome unknown; do not retry automatically: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof result?.id !== "string" || !/^[0-9a-f]{40}$/.test(result.id)) fail("submission returned no canonical transaction id; do not retry automatically");
  const [hive, engine, effect] = await Promise.all([
    confirmHive(result.id, intent.operation),
    waitForEngineTransaction(result.id, options.account, plan.quote.costScrap, memo),
    waitForEconomicEffect(options.account, before, plan.quote),
  ]);
  return Object.freeze({
    ...base,
    status: "upgrade-confirmed",
    transactionId: result.id,
    hive,
    engine,
    after: safeState(effect.after.economic),
    reconciliation: effect.reconciliation,
    completedAt: new Date().toISOString(),
  });
}

async function main() { process.stdout.write(`${JSON.stringify(await operate(parseOptions(process.argv.slice(2))))}\n`); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
