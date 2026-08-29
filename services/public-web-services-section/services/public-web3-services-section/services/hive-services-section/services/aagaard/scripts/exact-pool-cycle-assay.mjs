#!/usr/bin/env node
// Read-only exact assay for the currently observed DEC -> BEE -> VOUCHER ->
// DEC pool cycle using emsenn0's already-held DEC. No SWAP.HIVE is acquired,
// no key is read, and the result grants no execution authority.

import { pathToFileURL } from "node:url";

import { certifyPoolCycleAssay } from "../src/core/poolCycleAssay.mts";
import { createSerializedHiveEngineRpc } from "../src/integrations/hive-engine/serializedRpc.mts";
import { makeReport as makeExitReport } from "./hive-engine-exit-tightness.mjs";

const ACCOUNT = "emsenn0";
const INITIAL = "DEC";
const ROUTE = Object.freeze(["DEC", "BEE", "VOUCHER", "DEC"]);
const PAIRS = Object.freeze(["BEE:DEC", "BEE:VOUCHER", "DEC:VOUCHER"]);
const PROVIDERS = Object.freeze(["https://api.hive-engine.com/rpc/contracts", "https://herpc.dtools.dev/contracts", "https://herpc.liotes.com/contracts"]);
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u;

function fail(message) { throw new Error(`exact-pool-cycle-assay: ${message}`); }
export function parseOptions(argv) { if (argv.length !== 0) fail(`unknown argument ${argv[0]}`); return Object.freeze({}); }
function exact(value, label) { const text = String(value ?? ""); if (!DECIMAL.test(text)) fail(`${label} is not exact`); return text; }
function feeBps(row) { if (row.tradeFeeMultiplier === undefined) return 25; const multiplier = Number(row.tradeFeeMultiplier);
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) fail("pool fee multiplier is malformed"); return Math.round((1 - multiplier) * 10_000); }

function orient(row, inputSymbol, outputSymbol, precision) {
  const [base, quote] = String(row.tokenPair ?? "").split(":");
  if (!base || !quote || ![base, quote].includes(inputSymbol) || ![base, quote].includes(outputSymbol)) fail("pool cannot realize the declared route hop");
  return Object.freeze({ pair: `${base}:${quote}`, inputSymbol, outputSymbol,
    reserveIn: inputSymbol === base ? exact(row.baseQuantity, "base reserve") : exact(row.quoteQuantity, "quote reserve"),
    reserveOut: outputSymbol === base ? exact(row.baseQuantity, "base reserve") : exact(row.quoteQuantity, "quote reserve"),
    inputPrecision: precision[inputSymbol], outputPrecision: precision[outputSymbol], feeBps: feeBps(row) });
}

async function observeProvider(provider) {
  const rpc = createSerializedHiveEngineRpc({ nodes: [provider], timeoutMs: 15_000, attemptsPerNode: 2 });
  try {
    const [rows, tokens, balances] = await Promise.all([
      rpc.find("marketpools", "pools", { tokenPair: { $in: PAIRS } }, 10, 0, []),
      rpc.find("tokens", "tokens", { symbol: { $in: ["BEE", "DEC", "VOUCHER"] } }, 10, 0, []),
      rpc.find("tokens", "balances", { account: ACCOUNT, symbol: INITIAL }, 2, 0, []),
    ]);
    if (rows.length !== 3 || tokens.length !== 3 || balances.length !== 1) fail("provider did not expose the exact route inventory");
    const byPair = Object.fromEntries(rows.map((row) => [String(row.tokenPair), row]));
    const precision = Object.fromEntries(tokens.map((row) => {
      const value = Number(row.precision); if (!Number.isSafeInteger(value) || value < 0 || value > 18) fail("token precision is malformed");
      return [String(row.symbol), value];
    }));
    if (precision.BEE === undefined || precision.DEC === undefined || precision.VOUCHER === undefined) fail("route precision is incomplete");
    const pools = [orient(byPair["BEE:DEC"], ROUTE[0], ROUTE[1], precision),
      orient(byPair["BEE:VOUCHER"], ROUTE[1], ROUTE[2], precision),
      orient(byPair["DEC:VOUCHER"], ROUTE[2], ROUTE[3], precision)];
    const balance = exact(balances[0].balance, "DEC balance");
    return Object.freeze({ provider, status: "available", state: Object.freeze({ initialBalance: balance,
      initialPrecision: precision.DEC, maximumInitial: balance, minimumProfitInitial: "0.200",
      minimumEdgeBps: 50, perPoolSlippageBps: 50, pools: Object.freeze(pools) }) });
  } catch (error) { return Object.freeze({ provider, status: "unavailable", problem: error instanceof Error ? error.message : String(error) }); }
}

export async function observe() {
  const observedAt = new Date().toISOString();
  const [assay, valueFloor] = await Promise.all([
    Promise.all(PROVIDERS.map(observeProvider)).then((observations) => certifyPoolCycleAssay({ observedAt, account: ACCOUNT, initialSymbol: INITIAL, observations })),
    makeExitReport({ account: ACCOUNT, symbol: INITIAL, quantity: "0.200" }),
  ]);
  const valueCertified = valueFloor.status === "certified" && valueFloor.valuation?.completeExit === true
    && BigInt(valueFloor.valuation.grossDepthProceeds.replace(".", "")) >= 100_000n;
  const routeAdmitted = assay.status === "certified" && assay.result?.admitted === true && assay.result.quote.policyAdmitted;
  return Object.freeze({ kind: "aagaard.exact-pool-cycle-opportunity", observedAt, route: ROUTE, assay, minimumProfitValueWitness: valueFloor,
    decision: routeAdmitted && valueCertified ? "candidate-requires-separate-execution-review" : "refuse",
    refusal: !valueCertified ? "0.200 DEC does not have a certified complete 0.001 SWAP.HIVE exit value"
      : assay.refusal ?? null, credentialAccess: false, chainMutation: false, executionAdmissible: false });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { process.stdout.write(`${JSON.stringify(await observe(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
