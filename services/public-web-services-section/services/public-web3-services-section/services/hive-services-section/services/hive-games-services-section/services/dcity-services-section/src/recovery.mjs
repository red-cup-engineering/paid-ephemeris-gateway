// recovery — dCity's game contract is closed (no new CITY-affecting actions
// are accepted by the token itself); the only live economic surface left is
// the SIM/SWAP.HIVE Hive-Engine pool. This module prices one exact full-
// balance SIM exit through that pool using integer/fraction arithmetic only,
// and never touches CITY NFTs (they are historical custody, not a market).
//
// Ported from aagaard's src/integrations/dcity/dcity.adapter.ts. That
// original computed the swapTokens custom_json operation by importing
// aagaard's shared src/integrations/hive-engine/hiveEngineOps.mjs encoder.
// This module duplicates the tiny slice of that encoder it needs (see
// `swapTokensOperation` below) so this service does not depend on aagaard's
// package. See this section's README for that migration note.

const ACCOUNT = /^(?=.{3,16}$)[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]*[a-z0-9])?)*$/;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/;
const CONTRACT_ID = "ssc-mainnet-hive";

function scale(precision) {
  if (!Number.isSafeInteger(precision) || precision < 0 || precision > 18) throw new Error("dCity precision must be an integer from 0 through 18");
  return 10n ** BigInt(precision);
}

export function dcityDecimalUnits(value, precision) {
  const match = DECIMAL.exec(value);
  if (!match) throw new Error(`dCity value '${value}' is not a canonical unsigned decimal`);
  const fraction = match[1] ?? "";
  if (fraction.length > precision) throw new Error(`dCity value '${value}' exceeds precision ${precision}`);
  const whole = value.split(".")[0] ?? "0";
  return BigInt(whole) * scale(precision) + BigInt((fraction + "0".repeat(precision)).slice(0, precision) || "0");
}

export function dcityFormatUnits(value, precision) {
  if (value < 0n) throw new Error("dCity amount cannot be negative");
  const factor = scale(precision);
  if (precision === 0) return value.toString();
  return `${value / factor}.${(value % factor).toString().padStart(precision, "0")}`;
}

/** Encode a Hive-Engine marketpools.swapTokens custom_json. This is a
 * duplicate of aagaard's `swapTokens` encoder (see header comment); it only
 * ENCODES an operation and broadcasts nothing. */
export function swapTokensOperation(account, tokenPair, tokenSymbol, tokenAmount, tradeType, bound) {
  if (tradeType !== "exactInput" && tradeType !== "exactOutput") {
    throw new Error(`swapTokensOperation: tradeType must be 'exactInput' or 'exactOutput', got '${tradeType}'`);
  }
  const contractPayload = { tokenPair, tokenSymbol, tokenAmount, tradeType };
  if (bound !== undefined) {
    if (tradeType === "exactInput") contractPayload.minAmountOut = bound;
    else contractPayload.maxAmountIn = bound;
  }
  return Object.freeze(["custom_json", Object.freeze({
    id: CONTRACT_ID,
    required_auths: Object.freeze([account]),
    required_posting_auths: Object.freeze([]),
    json: JSON.stringify({ contractName: "marketpools", contractAction: "swapTokens", contractPayload }),
  })]);
}

/**
 * Price a full-balance liquid-SIM exit through the observed SWAP.HIVE:SIM
 * pool, applying the deployed 25-bps Hive-Engine marketpools fee and a
 * caller-chosen slippage floor. Returns a `refuse` result (never throws) for
 * any evidence that fails validation, is empty, or has changed shape from
 * what this fleet has previously confirmed on-chain.
 */
export function planDCityLiquidSimRecovery(state, slippageBps = 100) {
  try {
    if (!ACCOUNT.test(state.account)) throw new Error("invalid Hive account");
    if (!Number.isSafeInteger(slippageBps) || slippageBps < 1 || slippageBps > 500) throw new Error("slippage policy must be 1 through 500 basis points");
    if (state.simPrecision !== 3 || state.swapHivePrecision !== 8) throw new Error("live SIM or SWAP.HIVE precision changed");
    if (state.tokenPair !== "SWAP.HIVE:SIM" && state.tokenPair !== "SIM:SWAP.HIVE") throw new Error("pool is not the exact SIM/SWAP.HIVE pair");
    const sim = dcityDecimalUnits(state.simBalance, state.simPrecision);
    if (sim <= 0n) return Object.freeze({ kind: "refuse", reason: "no liquid SIM remains to recover" });

    const reservePrecision = Math.max(
      state.baseQuantity.split(".")[1]?.length ?? 0,
      state.quoteQuantity.split(".")[1]?.length ?? 0,
      state.swapHivePrecision,
      state.simPrecision,
    );
    if (reservePrecision > 18) throw new Error("pool reserve precision exceeds the exact arithmetic bound");
    const base = dcityDecimalUnits(state.baseQuantity, reservePrecision);
    const quote = dcityDecimalUnits(state.quoteQuantity, reservePrecision);
    const reserveIn = state.tokenPair === "SWAP.HIVE:SIM" ? quote : base;
    const reserveOut = state.tokenPair === "SWAP.HIVE:SIM" ? base : quote;
    const input = sim * scale(reservePrecision) / scale(state.simPrecision);
    if (reserveIn <= 0n || reserveOut <= 0n || input <= 0n) throw new Error("positive exact pool reserves are required");
    const effectiveInput = input * 9_975n;
    const outputAtReservePrecision = reserveOut * effectiveInput / (reserveIn * 10_000n + effectiveInput);
    const outputUnits = outputAtReservePrecision * scale(state.swapHivePrecision) / scale(reservePrecision);
    const minimumUnits = outputUnits * BigInt(10_000 - slippageBps) / 10_000n;
    if (minimumUnits <= 0n) throw new Error("bounded pool output rounds to zero");
    const quantitySim = dcityFormatUnits(sim, state.simPrecision);
    const expectedSwapHive = dcityFormatUnits(outputUnits, state.swapHivePrecision);
    const minimumSwapHive = dcityFormatUnits(minimumUnits, state.swapHivePrecision);
    return Object.freeze({
      kind: "ready",
      reason: "the closed dCity token has a live, bounded SIM-to-SWAP.HIVE pool exit; historical CITY NFTs remain untouched",
      quote: Object.freeze({
        quantitySim,
        expectedSwapHive,
        minimumSwapHive,
        slippageBps,
        operation: swapTokensOperation(state.account, state.tokenPair, "SIM", quantitySim, "exactInput", minimumSwapHive),
      }),
    });
  } catch (error) {
    return Object.freeze({ kind: "refuse", reason: `invalid dCity recovery evidence: ${error instanceof Error ? error.message : String(error)}` });
  }
}

const AGREEMENT_FIELDS = ["account", "simBalance", "swapHiveBalance", "baseQuantity", "quoteQuantity", "tokenPair"];

/** Two independently observed states are the same economic evidence when
 * every field that feeds the recovery quote agrees (observedAt may differ). */
export function statesAgree(left, right) {
  return AGREEMENT_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field]));
}
