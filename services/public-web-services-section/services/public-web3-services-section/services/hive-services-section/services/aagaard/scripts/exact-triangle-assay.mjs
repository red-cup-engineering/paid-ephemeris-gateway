#!/usr/bin/env node
// Independent-provider, read-only exact assay for the strongest current
// Hive Engine holonomy witness. It carries no signer and never emits a
// broadcast operation: the three sequential calls are not atomic.

import { pathToFileURL } from "node:url";

import { certifyExactTriangleAssay } from "../src/core/triangleAssay.mts";
import { createSerializedHiveEngineRpc } from "../src/integrations/hive-engine/serializedRpc.mts";

const ACCOUNT = "michael561";
const PROVIDERS = Object.freeze([
  "https://api.hive-engine.com/rpc/contracts",
  "https://herpc.dtools.dev/contracts",
  "https://herpc.liotes.com/contracts",
]);
const BOOK_LIMIT = 200;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u;

function one(rows, label) {
  if (rows.length !== 1) throw new Error(`${label} requires exactly one row, observed ${rows.length}`);
  return rows[0];
}

function decimal(value, label) {
  const candidate = String(value ?? "");
  if (!DECIMAL.test(candidate)) throw new Error(`${label} is not an exact unsigned decimal`);
  return candidate;
}

function precision(rows, symbol) {
  const row = one(rows.filter((entry) => entry.symbol === symbol), `${symbol} token`);
  const value = Number(row.precision);
  if (!Number.isSafeInteger(value) || value < 0 || value > 18) throw new Error(`${symbol} precision is malformed`);
  return value;
}

function feeBps(row) {
  if (row.tradeFeeMultiplier === undefined) return 25;
  const multiplier = Number(row.tradeFeeMultiplier);
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) throw new Error("pool fee multiplier is malformed");
  return Math.round((1 - multiplier) * 10_000);
}

function orientPool(rows, inputSymbol, outputSymbol, precisions) {
  const row = one(rows.filter((entry) => {
    const pair = String(entry.tokenPair ?? "").split(":");
    return pair.length === 2 && pair.includes(inputSymbol) && pair.includes(outputSymbol);
  }), `${inputSymbol}->${outputSymbol} pool`);
  const [base, quote] = String(row.tokenPair).split(":");
  return Object.freeze({
    pair: String(row.tokenPair), inputSymbol, outputSymbol,
    reserveIn: decimal(base === inputSymbol ? row.baseQuantity : row.quoteQuantity, `${inputSymbol} reserve`),
    reserveOut: decimal(base === outputSymbol ? row.baseQuantity : row.quoteQuantity, `${outputSymbol} reserve`),
    inputPrecision: precisions[inputSymbol], outputPrecision: precisions[outputSymbol], feeBps: feeBps(row),
  });
}

function fraction(value) {
  const [whole, tail = ""] = value.split(".");
  return [BigInt(`${whole}${tail}`), tail.length];
}

function compare(left, right) {
  const [lv, lp] = fraction(left); const [rv, rp] = fraction(right);
  const p = Math.max(lp, rp);
  const l = lv * 10n ** BigInt(p - lp); const r = rv * 10n ** BigInt(p - rp);
  return l < r ? -1 : l > r ? 1 : 0;
}

async function observeProvider(provider) {
  const rpc = createSerializedHiveEngineRpc({ nodes: [provider], timeoutMs: 15_000, attemptsPerNode: 2 });
  try {
    const [tokenRows, balanceRows, poolRows, rawBids] = await Promise.all([
      rpc.find("tokens", "tokens", { symbol: { $in: ["SWAP.HIVE", "VOUCHER", "DEC"] } }, 3, 0, []),
      rpc.find("tokens", "balances", { account: ACCOUNT, symbol: "SWAP.HIVE" }, 2, 0, []),
      rpc.find("marketpools", "pools", { tokenPair: { $in: ["SWAP.HIVE:VOUCHER", "VOUCHER:SWAP.HIVE", "DEC:VOUCHER", "VOUCHER:DEC"] } }, 4, 0, []),
      rpc.find("market", "buyBook", { symbol: "DEC" }, BOOK_LIMIT, 0, [{ index: "priceDec", descending: true }]),
    ]);
    const precisions = Object.freeze({ "SWAP.HIVE": precision(tokenRows, "SWAP.HIVE"), VOUCHER: precision(tokenRows, "VOUCHER"), DEC: precision(tokenRows, "DEC") });
    const bids = rawBids.map((row) => Object.freeze({
      priceSwapHivePerToken: decimal(row.price, "DEC bid price"), quantity: decimal(row.quantity, "DEC bid quantity"),
    }));
    const bidBookOrdered = bids.every((entry, index) => index === 0 || compare(entry.priceSwapHivePerToken, bids[index - 1].priceSwapHivePerToken) <= 0);
    const balance = balanceRows.length === 0 ? "0" : decimal(one(balanceRows, "michael561 SWAP.HIVE balance").balance, "SWAP.HIVE balance");
    return Object.freeze({ provider, status: "available", state: Object.freeze({
      account: ACCOUNT, initialBalance: balance, initialPrecision: precisions["SWAP.HIVE"], capInitialMilli: 1000,
      firstPool: orientPool(poolRows, "SWAP.HIVE", "VOUCHER", precisions),
      secondPool: orientPool(poolRows, "VOUCHER", "DEC", precisions),
      finalTokenPrecision: precisions.DEC, bids: Object.freeze(bids),
      bidBookComplete: rawBids.length < BOOK_LIMIT, bidBookOrdered, perPoolSlippageBps: 50,
    }) });
  } catch (error) {
    return Object.freeze({ provider, status: "unavailable", problem: error instanceof Error ? error.message : String(error) });
  }
}

export async function observe() {
  const observedAt = new Date().toISOString();
  return certifyExactTriangleAssay({ observedAt, observations: await Promise.all(PROVIDERS.map(observeProvider)) });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { process.stdout.write(`${JSON.stringify(await observe(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
