import { createHash } from "node:crypto";

export const HBD_SAVINGS_TOUCH_SCHEMA = "aagaard.hbd-savings-touch.v1" as const;
export const HBD_SAVINGS_TOUCH_CATEGORY = "aagaard.hbd-savings-touch-event" as const;
export const HBD_SAVINGS_EXIT_SCHEMA = "aagaard.hbd-savings-exit.v1" as const;
export const HBD_SAVINGS_EXIT_CATEGORY = "aagaard.hbd-savings-exit-event" as const;

export interface HbdSavingsTouchEvent {
  readonly hbdSavingsTouchSchema: typeof HBD_SAVINGS_TOUCH_SCHEMA;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly account: string;
  readonly transactionId: string;
  readonly receipt: Readonly<Record<string, unknown>>;
}

export async function recordHbdSavingsTouch(
  _dataDir: string,
  receipt: Readonly<Record<string, unknown>>,
  recordedAt = new Date().toISOString(),
): Promise<HbdSavingsTouchEvent> {
  if (receipt.kind !== "aagaard.hbd-savings-interest-touch-receipt" || receipt.status !== "interest-confirmed") {
    throw new TypeError("only a confirmed HBD savings-interest touch receipt is recordable");
  }
  const account = String(receipt.account ?? "");
  const transactionId = String(receipt.transactionId ?? "");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account) || !/^[0-9a-f]{40}$/.test(transactionId)) {
    throw new TypeError("HBD savings touch receipt identity is not canonical");
  }
  const eventId = `urn:aagaard:hbd-savings-touch:${createHash("sha256").update(transactionId).digest("base64url")}`;
  // Hive's transaction id is the durable identity; do not duplicate it in a
  // mutable projection which can disagree with chain history.
  return Object.freeze({
    hbdSavingsTouchSchema: HBD_SAVINGS_TOUCH_SCHEMA,
    eventId,
    recordedAt: new Date(recordedAt).toISOString(),
    account,
    transactionId,
    receipt: Object.freeze({ ...receipt }),
  });
}

export async function recordHbdSavingsExit(
  _dataDir: string,
  receipt: Readonly<Record<string, unknown>>,
  recordedAt = new Date().toISOString(),
): Promise<Readonly<Record<string, unknown>>> {
  if (receipt.kind !== "aagaard.hbd-savings-exit-receipt" || !["withdrawal-queued", "settlement-pending"].includes(String(receipt.status))) {
    throw new TypeError("only a queued or pending HBD savings exit receipt is recordable");
  }
  const account = String(receipt.account ?? ""); const transactionId = String(receipt.transactionId ?? "");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account) || !/^[0-9a-f]{40}$/.test(transactionId)) throw new TypeError("HBD savings exit identity is not canonical");
  const status = String(receipt.status);
  const eventId = `urn:aagaard:hbd-savings-exit:${createHash("sha256").update(JSON.stringify([transactionId, status])).digest("base64url")}`;
  return Object.freeze({ hbdSavingsExitSchema: HBD_SAVINGS_EXIT_SCHEMA, eventId, recordedAt: new Date(recordedAt).toISOString(),
    account, transactionId, status, receipt: Object.freeze({ ...receipt }) });
}
