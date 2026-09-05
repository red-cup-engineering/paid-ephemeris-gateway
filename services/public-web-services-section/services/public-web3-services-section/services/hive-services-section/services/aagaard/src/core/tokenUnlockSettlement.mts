import { createHash } from "node:crypto";

export const TOKEN_UNLOCK_SCHEMA = "aagaard.token-unlock.v1" as const;
export const TOKEN_UNLOCK_CATEGORY = "aagaard.token-unlock-event" as const;

export interface TokenUnlockEvent {
  readonly tokenUnlockSchema: typeof TOKEN_UNLOCK_SCHEMA;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly account: string;
  readonly symbol: string;
  readonly transactionId: string;
  readonly status: string;
  readonly receipt: Readonly<Record<string, unknown>>;
}

/** Projects a confirmed unstake transaction; no parallel local ledger exists. */
export function tokenUnlockEvent(receipt: Readonly<Record<string, unknown>>, recordedAt = new Date().toISOString()): TokenUnlockEvent {
  if (receipt.kind !== "aagaard.token-unstake-receipt") throw new TypeError("not a token unstake receipt");
  const account = String(receipt.account ?? ""); const symbol = String(receipt.symbol ?? "");
  const transactionId = String(receipt.transactionId ?? ""); const status = String(receipt.status ?? "");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account) || !/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol)
    || !/^[0-9a-f]{40}$/.test(transactionId) || !["unstake-start-confirmed", "settlement-pending"].includes(status)) {
    throw new TypeError("token unlock receipt identity or status is not recordable");
  }
  const eventId = `urn:aagaard:token-unlock:${createHash("sha256").update(JSON.stringify([transactionId, status])).digest("base64url")}`;
  return Object.freeze({ tokenUnlockSchema: TOKEN_UNLOCK_SCHEMA, eventId,
    recordedAt: new Date(recordedAt).toISOString(), account, symbol, transactionId, status, receipt: Object.freeze({ ...receipt }) });
}
