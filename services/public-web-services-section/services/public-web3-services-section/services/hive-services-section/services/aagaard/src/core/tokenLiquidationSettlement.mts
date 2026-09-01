import { createHash } from "node:crypto";

export const TOKEN_LIQUIDATION_SCHEMA = "aagaard.token-liquidation.v1" as const;
export const TOKEN_LIQUIDATION_CATEGORY = "aagaard.token-liquidation-event" as const;

export interface TokenLiquidationEvent {
  readonly tokenLiquidationSchema: typeof TOKEN_LIQUIDATION_SCHEMA;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly account: string;
  readonly symbol: string;
  readonly transactionId: string;
  readonly status: string;
  readonly receipt: Readonly<Record<string, unknown>>;
}

/**
 * Projects one already-confirmed Hive transaction into an event.  The chain
 * transaction and its independently checked receipt are the durable record;
 * this deliberately does not write a second local ledger.
 */
export function tokenLiquidationEvent(
  receipt: Readonly<Record<string, unknown>>,
  recordedAt = new Date().toISOString(),
): TokenLiquidationEvent {
  if (receipt.kind !== "aagaard.token-liquidation-receipt") throw new TypeError("not a token liquidation receipt");
  const account = String(receipt.account ?? "");
  const symbol = String(receipt.symbol ?? "");
  const transactionId = String(receipt.transactionId ?? "");
  const status = String(receipt.status ?? "");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account) || !/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol)
    || !/^[0-9a-f]{40}$/.test(transactionId) || !["liquidated-confirmed", "settlement-pending"].includes(status)) {
    throw new TypeError("token liquidation receipt identity or status is not recordable");
  }
  const eventId = `urn:aagaard:token-liquidation:${createHash("sha256").update(JSON.stringify([transactionId, status])).digest("base64url")}`;
  return Object.freeze({
    tokenLiquidationSchema: TOKEN_LIQUIDATION_SCHEMA,
    eventId,
    recordedAt: new Date(recordedAt).toISOString(),
    account,
    symbol,
    transactionId,
    status,
    receipt: Object.freeze({ ...receipt }),
  });
}
