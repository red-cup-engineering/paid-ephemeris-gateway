#!/usr/bin/env node
// Independent-provider bounded baseline for realized emsenn0 curation rewards.
// It has no key, vote, claim, transfer, or valuation surface.

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { curationRewardFromHistoryRow } from "../src/integrations/hive/hive.adapter.ts";

const ACCOUNT = "emsenn0";
const LIMIT = 1000;
const NODES = Object.freeze(["https://api.hive.blog", "https://api.openhive.network", "https://api.deathwing.me"]);

function digest(value) { return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`; }
function vestsMicros(value) { const match = /^(\d+)\.(\d{6})$/u.exec(value);
  if (!match) throw new Error("curation reward precision is not exact"); return BigInt(match[1]) * 1_000_000n + BigInt(match[2]); }
function formatVests(value) { const text = value.toString().padStart(7, "0"); return `${text.slice(0, -6)}.${text.slice(-6)}`; }

async function rpc(node) {
  const response = await fetch(node, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "condenser_api.get_account_history", params: [ACCOUNT, -1, LIMIT] }),
    signal: AbortSignal.timeout(15_000) });
  const payload = await response.json();
  if (!response.ok || payload?.error || !Array.isArray(payload?.result)) throw new Error(`${node} did not expose exact account history`);
  return payload.result;
}

async function observeNode(node) {
  try {
    const rows = await rpc(node); const indices = rows.map((row) => Number(row?.[0])).filter(Number.isSafeInteger);
    if (rows.length !== LIMIT || indices.length !== LIMIT) throw new Error("bounded account-history coverage is incomplete");
    const rewards = Object.freeze(rows.map((row) => curationRewardFromHistoryRow(ACCOUNT, row)).filter(Boolean)
      .sort((left, right) => left.historyIndex - right.historyIndex));
    const state = Object.freeze({ account: ACCOUNT, requestedLimit: LIMIT, oldestHistoryIndex: Math.min(...indices),
      newestHistoryIndex: Math.max(...indices), rewards });
    return Object.freeze({ node, status: "available", state, stateDigest: digest(state) });
  } catch (error) { return Object.freeze({ node, status: "unavailable", problem: error instanceof Error ? error.message : String(error) }); }
}

export async function observe() {
  const observedAt = new Date().toISOString(); const observations = await Promise.all(NODES.map(observeNode));
  const groups = new Map(); const unavailable = [];
  for (const row of observations) {
    if (row.status === "unavailable") { unavailable.push({ provider: row.node, problem: row.problem }); continue; }
    const group = groups.get(row.stateDigest) ?? { state: row.state, providers: [] }; group.providers.push(row.node); groups.set(row.stateDigest, group);
  }
  const available = observations.length - unavailable.length; const knowledge = groups.size > 1 ? "both" : available >= 2 ? "true" : "neither";
  const providerKnowledge = Object.freeze({ value: knowledge, stateDigests: Object.freeze([...groups.entries()].map(([stateDigest, group]) => Object.freeze({
    stateDigest, providers: Object.freeze([...group.providers].sort()) }))), unavailable: Object.freeze(unavailable) });
  const base = Object.freeze({ kind: "aagaard.curation-reward-baseline", account: ACCOUNT, observedAt, providerKnowledge,
    requestedLimit: LIMIT, credentialAccess: false, chainMutation: false });
  if (knowledge !== "true") return Object.freeze({ ...base, status: "uncertified", baseline: null,
    refusal: knowledge === "both" ? "provider-history-contested" : "independent-provider-support-insufficient" });
  const state = [...groups.values()][0].state;
  const total = state.rewards.reduce((sum, reward) => sum + vestsMicros(reward.reward.amount), 0n);
  return Object.freeze({ ...base, status: "certified", baseline: Object.freeze({ oldestHistoryIndex: state.oldestHistoryIndex,
    newestHistoryIndex: state.newestHistoryIndex, rewardCount: state.rewards.length,
    realizedReward: Object.freeze({ amount: formatVests(total), asset: "VESTS" }), boundedHistoryOnly: true }),
    certifyingProviders: Object.freeze([...groups.values()][0].providers.sort()), refusal: null });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { process.stdout.write(`${JSON.stringify(await observe(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
