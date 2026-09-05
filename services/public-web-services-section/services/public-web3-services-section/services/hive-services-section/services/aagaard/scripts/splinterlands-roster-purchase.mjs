#!/usr/bin/env node
import { reportFailure } from "../src/commandFailure.mjs";
// Observe or execute one exact five-card Modern roster acquisition. The
// purchase spends only existing Splinterlands CREDITS, never DEC/HIVE/SPS,
// and is re-derived from live official listings at both this boundary and
// the lower signing boundary immediately before broadcast.

import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { broadcastViaChildProcess } from "../src/core/hiveScriptSupport.mjs";
import { PrivateKey } from "../src/integrations/hive/waggle/keys.mjs";
import {
  SPLINTERLANDS_ROSTER_PURCHASE_POLICY,
  planSplinterlandsRosterPurchase,
  reconcileSplinterlandsRosterPurchase,
} from "../src/integrations/splinterlands/splinterlandsMarket.mts";
import { assessOwnedModernCoverage } from "../src/integrations/splinterlands/splinterlandsOperator.mts";

const API = "https://api.splinterlands.com";
const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"];
const BROADCASTER = new URL("./hive-broadcast.mjs", import.meta.url);

function fail(message) { throw new Error(`splinterlands-roster-purchase: ${message}`); }

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
  if (options.account !== SPLINTERLANDS_ROSTER_PURCHASE_POLICY.account) fail("--account must be michael561");
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file");
  return Object.freeze(options);
}

async function readJson(path) {
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) fail(`${path} returned HTTP ${response.status}`);
  return response.json();
}

async function rpc(node, method, params) {
  const response = await fetch(node, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  const body = await response.json();
  if (!response.ok || body?.error) throw new Error(`${node} ${method} failed`);
  return body?.result;
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
  if (weight < threshold) fail("the supplied key does not independently satisfy michael561's active authority");
}

function broadcast(request) { return broadcastViaChildProcess(request, BROADCASTER); }

async function confirmHive(txid, operation) {
  const confirmations = new Map();
  for (let attempt = 0; attempt < 12 && confirmations.size < 2; attempt += 1) {
    await Promise.all(HIVE_NODES.map(async (node) => {
      if (confirmations.has(node)) return;
      const transaction = await rpc(node, "account_history_api.get_transaction", { id: txid, include_reversible: true }).catch(() => null);
      const actual = transaction?.operations?.[0]?.value ?? transaction?.operations?.[0]?.[1];
      if (!actual) return;
      if (actual.id !== operation[1].id || actual.json !== operation[1].json
        || JSON.stringify(actual.required_auths) !== JSON.stringify(operation[1].required_auths)
        || JSON.stringify(actual.required_posting_auths) !== JSON.stringify(operation[1].required_posting_auths)) {
        fail(`${node} did not confirm the exact Splinterlands roster purchase`);
      }
      confirmations.set(node, Object.freeze({ node, block: transaction.block_num }));
    }));
    if (confirmations.size < 2 && attempt < 11) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  const rows = [...confirmations.values()];
  if (rows.length < 2) fail("fewer than two Hive providers confirmed the roster purchase");
  if (new Set(rows.map((row) => row.block)).size !== 1) fail("Hive providers disagree on the roster-purchase block");
  return Object.freeze(rows);
}

function creditsFrom(balances, account) {
  if (!Array.isArray(balances)) fail("Splinterlands returned malformed balance evidence");
  const balance = Number(balances.find((row) => row?.player === account && row?.token === "CREDITS")?.balance);
  if (!Number.isSafeInteger(balance) || balance < 0) fail("Splinterlands returned a malformed CREDITS balance");
  return balance;
}

async function observe(account) {
  const [settings, player, balances, collection, details, rules, ...listingGroups] = await Promise.all([
    readJson("/settings"),
    readJson(`/players/details?name=${encodeURIComponent(account)}`),
    readJson(`/players/balances?username=${encodeURIComponent(account)}`),
    readJson(`/cards/collection/${encodeURIComponent(account)}`),
    readJson("/cards/get_details"),
    readJson("/battle/rulesets"),
    ...SPLINTERLANDS_ROSTER_PURCHASE_POLICY.cards.map((card) => readJson(`/market/for_sale_by_card?card_detail_id=${card.cardDetailId}&gold=false&edition=${card.edition}`)),
  ]);
  if (collection?.player !== account || !Array.isArray(collection?.cards)) fail("collection response disagrees with the requested account");
  const listingsByCard = new Map(SPLINTERLANDS_ROSTER_PURCHASE_POLICY.cards.map((card, index) => [card.cardDetailId, listingGroups[index]]));
  const plan = planSplinterlandsRosterPurchase({
    account,
    creditBalance: creditsFrom(balances, account),
    clientVersion: String(settings?.version ?? ""),
    nonce: randomBytes(5).toString("hex"),
    listingsByCard,
  });
  return Object.freeze({ settings, player, balances, collection, details, rules, plan });
}

function safePlan(plan) {
  return Object.freeze({
    credits: plan.credits,
    creditReserve: plan.creditReserve,
    listings: Object.freeze(plan.listings.map((row) => Object.freeze({
      cardDetailId: row.cardDetailId,
      edition: row.edition,
      uid: row.uid,
      marketId: row.marketId,
      seller: row.seller,
      usdPrice: row.usdPrice,
    }))),
  });
}

async function waitForSettlement(before) {
  let latestReason = "official state has not settled";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const [balances, collection] = await Promise.all([
        readJson(`/players/balances?username=${encodeURIComponent(before.plan.account)}`),
        readJson(`/cards/collection/${encodeURIComponent(before.plan.account)}`),
      ]);
      const settlement = reconcileSplinterlandsRosterPurchase({
        plan: before.plan,
        beforeCredits: creditsFrom(before.balances, before.plan.account),
        afterCredits: creditsFrom(balances, before.plan.account),
        beforeUids: before.collection.cards.map((card) => String(card.uid)),
        afterUids: collection.cards.map((card) => String(card.uid)),
      });
      return Object.freeze({ settlement, balances, collection });
    } catch (error) { latestReason = error instanceof Error ? error.message : String(error); }
    if (attempt < 19) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  fail(`purchase did not reconcile: ${latestReason}`);
}

export async function run(options) {
  const before = await observe(options.account);
  if (!options.executeOne) return Object.freeze({
    kind: "aagaard.splinterlands-roster-purchase",
    mode: "observe-only",
    account: options.account,
    observedAt: new Date().toISOString(),
    plan: safePlan(before.plan),
    submitted: false,
  });
  await verifyActiveKey(options.account, options.keyFile);
  const submission = await broadcast({
    account: options.account,
    role: "active",
    lane: SPLINTERLANDS_ROSTER_PURCHASE_POLICY.lane,
    target: SPLINTERLANDS_ROSTER_PURCHASE_POLICY.target,
    keyFile: options.keyFile,
    operation: before.plan.operation,
  });
  const confirmations = await confirmHive(submission.id, before.plan.operation);
  const after = await waitForSettlement(before);
  const coverageInput = {
    account: options.account,
    owned: after.collection.cards,
    details: before.details,
    modernEditions: before.settings.modern_editions,
    ruleCatalog: before.rules,
    rankedLeague: Number(before.player?.modern_league ?? 0),
    manaCap: 8,
  };
  const coverageNow = assessOwnedModernCoverage(coverageInput);
  const coverageAfterTransferCooldown = assessOwnedModernCoverage({ ...coverageInput, now: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000 + 60_000) });
  if (!coverageAfterTransferCooldown.readyForUnattendedQueue) fail("settled roster does not prove complete post-cooldown coverage");
  return Object.freeze({
    kind: "aagaard.splinterlands-roster-purchase",
    mode: "executed-one",
    account: options.account,
    transactionId: submission.id,
    confirmations,
    plan: safePlan(before.plan),
    settlement: after.settlement,
    coverageNow: Object.freeze({ ready: coverageNow.readyForUnattendedQueue, gaps: coverageNow.unplayableCombinedScenarios.length }),
    coverageAfterTransferCooldown: Object.freeze({ ready: true, scenarios: coverageAfterTransferCooldown.combinedScenariosTested, manaCap: 8 }),
  });
}

async function main() { process.stdout.write(`${JSON.stringify(await run(parseOptions(process.argv.slice(2))))}\n`); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(reportFailure);
}
