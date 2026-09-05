// Pure confirmation law for Aagaard's two-leg Hive-Engine bundles.
// An outer Hive transaction id is not an economic effect. A bundle is
// confirmed only when both sidechain transactions match the admitted
// contract actions and their token-transfer events prove the exact token
// round trip plus bounded SWAP.HIVE input/proceeds.  Amounts stay as integer
// units; a binary float must never decide whether an economic effect exists.

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function logsOf(row) {
  if (!row) return {};
  try {
    return typeof row.logs === "string" ? record(JSON.parse(row.logs)) : record(row.logs);
  } catch {
    return {};
  }
}

function eventsOf(row) {
  const events = logsOf(row).events;
  return Array.isArray(events) ? events.map(record) : [];
}

function errorsOf(row) {
  const errors = logsOf(row).errors;
  return Array.isArray(errors) ? errors : [];
}

const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/u;

function scale(precision) { return 10n ** BigInt(precision); }

function units(value, precision) {
  const text = String(value ?? "");
  const match = DECIMAL.exec(text);
  if (!match || (match[1]?.length ?? 0) > precision) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * scale(precision) + BigInt((fraction + "0".repeat(precision)).slice(0, precision) || "0");
}

function render(value, precision) {
  if (value < 0n) return `-${render(-value, precision)}`;
  const whole = value / scale(precision); const fraction = (value % scale(precision)).toString().padStart(precision, "0");
  return `${whole}.${fraction}`;
}

function amount(events, predicate, precision) {
  return events.reduce((sum, event) => {
    const data = record(event.data);
    if (!predicate(event, data)) return sum;
    const quantity = units(data.quantity, precision);
    return quantity === null ? sum : sum + quantity;
  }, 0n);
}

function inbound(events, account, symbol, precision) {
  return amount(events, (event, data) => event.contract === "tokens"
    && event.event === "transferFromContract" && data.to === account && data.symbol === symbol, precision);
}

function outbound(events, account, symbol, precision) {
  return amount(events, (event, data) => event.contract === "tokens"
    && event.event === "transferToContract" && data.from === account && data.symbol === symbol, precision);
}

function callKey(call) {
  return `${call?.contractName}.${call?.contractAction}`;
}

function rowMatches(row, call) {
  return row && row.contract === call?.contractName && row.action === call?.contractAction;
}

function closesOrder(events, account, type, txid) {
  return typeof txid === "string" && events.some((event) => {
    const data = record(event.data);
    return event.contract === "market" && event.event === "orderClosed"
      && data.account === account && data.type === type && data.txId === txid;
  });
}

export function assessRoundTripEconomicEffect(account, calls, rows) {
  if (!Array.isArray(calls) || calls.length !== 2 || !Array.isArray(rows) || rows.length !== 2) {
    return Object.freeze({ status: "unverified", source: "hive-engine.getTransactionInfo", expectedLegs: 2, confirmedLegs: 0 });
  }
  const [firstCall, secondCall] = calls;
  const [firstRow, secondRow] = rows;
  const poolToBook = callKey(firstCall) === "marketpools.swapTokens" && callKey(secondCall) === "market.sell";
  const bookToPool = callKey(firstCall) === "market.buy" && callKey(secondCall) === "marketpools.swapTokens";
  if (!poolToBook && !bookToPool) {
    return Object.freeze({ status: "not-recognized", source: "hive-engine.getTransactionInfo", expectedLegs: 2, confirmedLegs: 0 });
  }
  const acquisitionCall = firstCall;
  const exitCall = secondCall;
  const acquisitionPayload = record(acquisitionCall.contractPayload);
  const exitPayload = record(exitCall.contractPayload);
  const symbol = String(poolToBook ? acquisitionPayload.tokenSymbol : acquisitionPayload.symbol);
  const quantityText = String(poolToBook ? acquisitionPayload.tokenAmount : acquisitionPayload.quantity ?? "");
  const quantityPrecision = DECIMAL.exec(quantityText)?.[1]?.length ?? 0;
  const expectedQuantity = units(quantityText, quantityPrecision);
  const price = poolToBook ? units(exitPayload.price, 8) : units(acquisitionPayload.price, 8);
  const directBound = poolToBook ? null : units(exitPayload.minAmountOut, 8);
  const maxInput = poolToBook ? units(acquisitionPayload.maxAmountIn, 8) : expectedQuantity !== null && price !== null
    ? expectedQuantity * price / scale(quantityPrecision) : null;
  const boundProceeds = poolToBook && expectedQuantity !== null && price !== null
    ? expectedQuantity * price / scale(quantityPrecision) : directBound;
  if (!symbol || expectedQuantity === null || expectedQuantity <= 0n
    || boundProceeds === null || boundProceeds <= 0n
    || maxInput === null || maxInput <= 0n) {
    return Object.freeze({ status: "not-recognized", source: "hive-engine.getTransactionInfo", expectedLegs: 2, confirmedLegs: 0 });
  }

  const firstEvents = eventsOf(firstRow);
  const secondEvents = eventsOf(secondRow);
  const firstRecognized = rowMatches(firstRow, firstCall) && errorsOf(firstRow).length === 0;
  const secondRecognized = rowMatches(secondRow, secondCall) && errorsOf(secondRow).length === 0;
  const acquired = inbound(firstEvents, account, symbol, quantityPrecision) - outbound(firstEvents, account, symbol, quantityPrecision);
  const disposed = outbound(secondEvents, account, symbol, quantityPrecision) - inbound(secondEvents, account, symbol, quantityPrecision);
  const input = outbound(firstEvents, account, "SWAP.HIVE", 8) - inbound(firstEvents, account, "SWAP.HIVE", 8);
  const proceeds = inbound(secondEvents, account, "SWAP.HIVE", 8) - outbound(secondEvents, account, "SWAP.HIVE", 8);
  // The live market/marketpools contracts charge no BEED fee (verified
  // 2026-09-05: neither contract's code or params table names BEED); this
  // stays a defensive empirical check for an unexpected BEED transfer,
  // never a modeled cost the confirmation gate assumes.
  const feeBeed = outbound(secondEvents, account, "BEED", 4) - inbound(secondEvents, account, "BEED", 4);
  const orderEvents = poolToBook ? secondEvents : firstEvents;
  const orderRow = poolToBook ? secondRow : firstRow;
  const orderClosed = closesOrder(orderEvents, account, poolToBook ? "sell" : "buy", orderRow?.transactionId);
  const firstConfirmed = firstRecognized && acquired === expectedQuantity && input > 0n && maxInput >= input
    && (poolToBook || orderClosed);
  const secondConfirmed = secondRecognized && disposed === expectedQuantity && proceeds >= boundProceeds
    && (bookToPool || orderClosed);
  const confirmedLegs = Number(firstConfirmed) + Number(secondConfirmed);
  const reference = rows.map((row) => row?.transactionId).filter((id) => typeof id === "string").join(",");
  const common = {
    source: "hive-engine.getTransactionInfo",
    reference,
    contract: `${firstCall.contractName}+${secondCall.contractName}`,
    action: `${firstCall.contractAction}+${secondCall.contractAction}`,
    expectedLegs: 2,
    confirmedLegs,
    realizedInputSwapHive: render(input, 8),
    realizedProceedsSwapHive: render(proceeds, 8),
    realizedGrossDeltaSwapHive: render(proceeds - input, 8),
    realizedFeeBeed: render(feeBeed, 4),
    // Net P&L is intentionally absent: Hive RC, signing and paymaster
    // resources have not yet been valued by a witnessed common cost model.
    unpricedResourceCosts: true,
  };
  if (firstConfirmed && secondConfirmed) return Object.freeze({ status: "confirmed", ...common });
  if (firstRow || secondRow) return Object.freeze({ status: "partial", ...common });
  return Object.freeze({ status: "unverified", ...common });
}

/**
 * Confirms one standalone `marketpools.swapTokens` (exactOutput) leg,
 * broadcast alone (2026-09-05: no longer bundled with its paired sell, so a
 * Hive-Engine resourcemanager multi-transaction BEED fee never applies) --
 * the account's own transfer events must show it received exactly the
 * committed output quantity and spent no more than the committed
 * `maxAmountIn` SWAP.HIVE.
 * @param {string} account
 * @param {Readonly<Record<string, unknown>>} call the single swapTokens call this leg's own operation carried
 * @param {readonly Readonly<Record<string, unknown>>[]} rows the getTransactionInfo rows for this leg's own transaction id (expected length 1)
 * @returns {Readonly<Record<string, unknown>>}
 */
export function assessSwapLegEffect(account, call, rows) {
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (callKey(call) !== "marketpools.swapTokens" || !row) {
    return Object.freeze({ status: "unverified", source: "hive-engine.getTransactionInfo", expectedLegs: 1, confirmedLegs: 0 });
  }
  const payload = record(call.contractPayload);
  const symbol = String(payload.tokenSymbol ?? "");
  const quantityText = String(payload.tokenAmount ?? "");
  const quantityPrecision = DECIMAL.exec(quantityText)?.[1]?.length ?? 0;
  const expectedQuantity = units(quantityText, quantityPrecision);
  const maxInput = units(payload.maxAmountIn, 8);
  if (!symbol || expectedQuantity === null || expectedQuantity <= 0n || maxInput === null || maxInput <= 0n) {
    return Object.freeze({ status: "not-recognized", source: "hive-engine.getTransactionInfo", expectedLegs: 1, confirmedLegs: 0 });
  }
  const events = eventsOf(row);
  const recognized = rowMatches(row, call) && errorsOf(row).length === 0;
  const acquired = inbound(events, account, symbol, quantityPrecision) - outbound(events, account, symbol, quantityPrecision);
  const input = outbound(events, account, "SWAP.HIVE", 8) - inbound(events, account, "SWAP.HIVE", 8);
  const confirmed = recognized && acquired === expectedQuantity && input > 0n && maxInput >= input;
  const common = {
    source: "hive-engine.getTransactionInfo", reference: typeof row.transactionId === "string" ? row.transactionId : "",
    contract: call.contractName, action: call.contractAction, expectedLegs: 1, confirmedLegs: Number(confirmed),
    realizedInputSwapHive: render(input, 8), realizedAcquiredQuantity: render(acquired, quantityPrecision), acquiredSymbol: symbol,
  };
  if (confirmed) return Object.freeze({ status: "confirmed", ...common });
  return Object.freeze({ status: "partial", ...common });
}

/**
 * Confirms one standalone `market.sell` leg -- either the round trip's own
 * leg two, or a reconciliation sell closing out a residue position. The
 * account's own transfer events must show it disposed exactly the committed
 * quantity and realized proceeds at or above the committed limit price, and
 * the market's own `orderClosed` event must name this transaction.
 * @param {string} account
 * @param {Readonly<Record<string, unknown>>} call the single sell call this leg's own operation carried
 * @param {readonly Readonly<Record<string, unknown>>[]} rows the getTransactionInfo rows for this leg's own transaction id (expected length 1)
 * @returns {Readonly<Record<string, unknown>>}
 */
export function assessSellLegEffect(account, call, rows) {
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (callKey(call) !== "market.sell" || !row) {
    return Object.freeze({ status: "unverified", source: "hive-engine.getTransactionInfo", expectedLegs: 1, confirmedLegs: 0 });
  }
  const payload = record(call.contractPayload);
  const symbol = String(payload.symbol ?? "");
  const quantityText = String(payload.quantity ?? "");
  const quantityPrecision = DECIMAL.exec(quantityText)?.[1]?.length ?? 0;
  const expectedQuantity = units(quantityText, quantityPrecision);
  const price = units(payload.price, 8);
  const boundProceeds = expectedQuantity !== null && price !== null ? expectedQuantity * price / scale(quantityPrecision) : null;
  if (!symbol || expectedQuantity === null || expectedQuantity <= 0n || boundProceeds === null || boundProceeds <= 0n) {
    return Object.freeze({ status: "not-recognized", source: "hive-engine.getTransactionInfo", expectedLegs: 1, confirmedLegs: 0 });
  }
  const events = eventsOf(row);
  const recognized = rowMatches(row, call) && errorsOf(row).length === 0;
  const disposed = outbound(events, account, symbol, quantityPrecision) - inbound(events, account, symbol, quantityPrecision);
  const proceeds = inbound(events, account, "SWAP.HIVE", 8) - outbound(events, account, "SWAP.HIVE", 8);
  const orderClosed = closesOrder(events, account, "sell", row.transactionId);
  const confirmed = recognized && disposed === expectedQuantity && proceeds >= boundProceeds && orderClosed;
  const common = {
    source: "hive-engine.getTransactionInfo", reference: typeof row.transactionId === "string" ? row.transactionId : "",
    contract: call.contractName, action: call.contractAction, expectedLegs: 1, confirmedLegs: Number(confirmed),
    realizedProceedsSwapHive: render(proceeds, 8), realizedDisposedQuantity: render(disposed, quantityPrecision), disposedSymbol: symbol,
  };
  if (confirmed) return Object.freeze({ status: "confirmed", ...common });
  return Object.freeze({ status: "partial", ...common });
}
