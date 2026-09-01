#!/usr/bin/env node
// One-shot active-key signer for cycle 31's fixed 1.000 EDSI acquisition.
// It accepts no other account, token, price, quantity, expiry, or lane and
// validates the entire public operation before opening the key file.

import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { Waggle } from "../src/integrations/hive/waggle/client.mjs";
import { PrivateKey } from "../src/integrations/hive/waggle/keys.mjs";

function exactKeys(value, keys) { return value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join(",") === [...keys].sort().join(","); }

export function validateIncomeTokenAcquisitionRequest(request) {
  const fields = request?.operation?.[1]; let decoded = null;
  try { decoded = JSON.parse(fields?.json ?? ""); } catch { decoded = null; }
  const payload = decoded?.contractPayload;
  if (!exactKeys(request, ["account", "role", "lane", "target", "keyFile", "operation"])
    || request.account !== "michael561" || request.role !== "active" || request.lane !== "income-token-acquisition"
    || request.target !== "acquire:EDSI:1.000:1.01555000" || typeof request.keyFile !== "string" || request.keyFile.length === 0
    || !Array.isArray(request.operation) || request.operation.length !== 2 || request.operation[0] !== "custom_json"
    || !exactKeys(fields, ["id", "required_auths", "required_posting_auths", "json"])
    || fields.id !== "ssc-mainnet-hive" || JSON.stringify(fields.required_auths) !== JSON.stringify(["michael561"])
    || JSON.stringify(fields.required_posting_auths) !== "[]"
    || !exactKeys(decoded, ["contractName", "contractAction", "contractPayload"])
    || decoded.contractName !== "market" || decoded.contractAction !== "buy"
    || !exactKeys(payload, ["symbol", "quantity", "price", "expiration"])
    || payload.symbol !== "EDSI" || payload.quantity !== "1.000" || payload.price !== "1.01555000" || payload.expiration !== 300) {
    throw new Error("income-token acquisition signer refused the changed operation");
  }
  return true;
}

async function rpc(method, params) {
  const response = await fetch("https://api.hive.blog", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(10000) });
  const body = await response.json(); if (!response.ok || body?.error) throw new Error("active-authority RPC failed"); return body?.result;
}

export async function broadcastIncomeTokenAcquisition(request) {
  validateIncomeTokenAcquisitionRequest(request);
  const mode = statSync(request.keyFile).mode & 0o777;
  if ((mode & 0o077) !== 0) throw new Error("income-token active key permissions are broader than 0600");
  const wif = readFileSync(request.keyFile, "utf8").trim(); const publicKey = PrivateKey.from(wif).createPublic("STM").toString();
  const account = (await rpc("condenser_api.get_accounts", [["michael561"]]))?.[0];
  const threshold = Number(account?.active?.weight_threshold ?? 1);
  const weight = Number((account?.active?.key_auths ?? []).find(([candidate]) => candidate === publicKey)?.[1] ?? 0);
  if (weight < threshold) throw new Error("income-token key does not independently satisfy michael561 active authority");
  const result = await new Waggle({ account: "michael561", keys: { active: wif } }).broadcast([request.operation], "active");
  if (!/^[0-9a-f]{40}$/u.test(result?.id ?? "")) throw new Error("income-token broadcast returned no canonical transaction id");
  return Object.freeze({ id: result.id });
}

async function main() { let request; try { request = JSON.parse(readFileSync(0, "utf8")); }
  catch (error) { throw new Error(`income-token acquisition stdin is not JSON: ${error instanceof Error ? error.message : String(error)}`); }
  process.stdout.write(JSON.stringify(await broadcastIncomeTokenAcquisition(request))); }

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { await main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
