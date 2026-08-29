import { createHash } from "node:crypto";


export const TERRACORE_ACTION_SCHEMA = "aagaard.terracore-action.v1" as const;
export const TERRACORE_ACTION_CATEGORY = "aagaard.terracore-action-event" as const;

const FINAL_OR_PENDING = new Set([
  "claim-confirmed",
  "battle-won-confirmed",
  "battle-dodged-confirmed",
  "battle-settled-no-scrap",
  "settlement-pending",
]);

export interface TerraCoreActionEvent {
  readonly terraCoreActionSchema: typeof TERRACORE_ACTION_SCHEMA;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly account: string;
  readonly transactionId: string;
  readonly status: string;
  readonly receipt: Readonly<Record<string, unknown>>;
}

function validatedReceipt(receipt: Readonly<Record<string, unknown>>): Readonly<{
  account: string;
  transactionId: string;
  status: string;
}> {
  if (receipt.kind !== "aagaard.terracore-one-action-receipt") throw new TypeError("not a TerraCore one-action receipt");
  const account = String(receipt.account ?? "");
  const transactionId = String(receipt.transactionId ?? "");
  const status = String(receipt.status ?? "");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account)) throw new TypeError("TerraCore receipt account is not canonical");
  if (!/^[0-9a-f]{40}$/.test(transactionId)) throw new TypeError("TerraCore receipt transaction id is not canonical");
  if (!FINAL_OR_PENDING.has(status)) throw new TypeError(`TerraCore receipt status '${status}' is not recordable`);
  return Object.freeze({ account, transactionId, status });
}

function eventIdOf(transactionId: string, status: string): string {
  const digest = createHash("sha256").update(JSON.stringify([transactionId, status])).digest("base64url");
  return `urn:aagaard:terracore-action:${digest}`;
}

export async function recordTerraCoreActionReceipt(
  _dataDir: string,
  receipt: Readonly<Record<string, unknown>>,
  recordedAt = new Date().toISOString(),
): Promise<TerraCoreActionEvent> {
  const valid = validatedReceipt(receipt);
  const eventId = eventIdOf(valid.transactionId, valid.status);
  const event: TerraCoreActionEvent = Object.freeze({
    terraCoreActionSchema: TERRACORE_ACTION_SCHEMA,
    eventId,
    recordedAt: new Date(recordedAt).toISOString(),
    account: valid.account,
    transactionId: valid.transactionId,
    status: valid.status,
    receipt: Object.freeze({ ...receipt }),
  });
  return event;
}

export async function readTerraCoreActionReceipts(_dataDir: string, _transactionId?: string): Promise<readonly TerraCoreActionEvent[]> {
  throw new Error("TerraCore action history is chain-derived; local projections were retired");
}
