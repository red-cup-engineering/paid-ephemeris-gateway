import { createHash } from "node:crypto";


export const ASSET_YIELD_SCHEMA = "aagaard.asset-yield.v1" as const;
export const ASSET_YIELD_CATEGORY = "aagaard.asset-yield-event" as const;

export interface AssetYieldEvent {
  readonly assetYieldSchema: typeof ASSET_YIELD_SCHEMA;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly account: string;
  readonly symbol: string;
  readonly transactionId: string;
  readonly status: string;
  readonly receipt: Readonly<Record<string, unknown>>;
}

export async function recordAssetYield(
  _dataDir: string,
  receipt: Readonly<Record<string, unknown>>,
  recordedAt = new Date().toISOString(),
): Promise<AssetYieldEvent> {
  if (receipt.kind !== "aagaard.asset-yield-receipt") throw new TypeError("not an asset yield receipt");
  const account = String(receipt.account ?? "");
  const symbol = String(receipt.symbol ?? "");
  const transactionId = String(receipt.transactionId ?? "");
  const status = String(receipt.status ?? "");
  if (account !== "michael561" || symbol !== "WORKERBEE"
    || !/^[0-9a-f]{40}$/.test(transactionId)
    || !["yield-delegation-confirmed", "settlement-pending"].includes(status)) {
    throw new TypeError("asset yield receipt identity or status is not recordable");
  }
  const eventId = `urn:aagaard:asset-yield:${createHash("sha256").update(JSON.stringify([transactionId, status])).digest("base64url")}`;
  const event: AssetYieldEvent = Object.freeze({ assetYieldSchema: ASSET_YIELD_SCHEMA, eventId,
    recordedAt: new Date(recordedAt).toISOString(), account, symbol, transactionId, status,
    receipt: Object.freeze({ ...receipt }) });
  return event;
}

/** A local report cannot be used to recover a transaction episode. Reconcile the
 * transaction against Hive Engine before constructing a fresh receipt. */
export async function readAssetYields(_dataDir: string, _account?: string): Promise<readonly AssetYieldEvent[]> {
  throw new Error("asset-yield history is chain-derived; local projections are retired");
}
