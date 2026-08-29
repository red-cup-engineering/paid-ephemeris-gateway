// rewards — HoloZing pending-reward observation and reward-claim planning.
// A claim converts server-side pending ZING into on-chain staked ZING; it
// never opens, transfers, or otherwise mutates an Alpha Vial NFT, and this
// module never signs or broadcasts anything itself.
//
// Ported from aagaard's src/integrations/holozing/holozing.adapter.ts
// (self-contained), plus the pure `loginMessage`, `keychainLoginEnvelope`,
// `balancesAgree`, and `attachHolozingDurableRecord` helpers from
// aagaard's scripts/holozing-rewards.mjs.

const ACCOUNT = /^(?=.{3,16}$)[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]*[a-z0-9])?)*$/;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/;
const PRECISION = 3;

function scale() { return 10n ** BigInt(PRECISION); }

export function holozingDecimalUnits(value) {
  const match = DECIMAL.exec(value);
  if (!match) throw new Error(`HoloZing value '${value}' is not a canonical unsigned decimal`);
  const fraction = match[1] ?? "";
  if (fraction.length > PRECISION) throw new Error(`HoloZing value '${value}' exceeds precision ${PRECISION}`);
  const whole = value.split(".")[0] ?? "0";
  return BigInt(whole) * scale() + BigInt((fraction + "0".repeat(PRECISION)).slice(0, PRECISION) || "0");
}

export function holozingFormatUnits(value) {
  if (value < 0n) throw new Error("HoloZing amount cannot be negative");
  return `${value / scale()}.${(value % scale()).toString().padStart(PRECISION, "0")}`;
}

function exactReward(value, field) {
  if (typeof value !== "string") throw new Error(`${field} must be a decimal string`);
  return holozingFormatUnits(holozingDecimalUnits(value));
}

export function parseHoloZingPendingRewards(account, observedAt, value, alphaVialIds) {
  if (!ACCOUNT.test(account)) throw new Error("invalid HoloZing Hive account");
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error("invalid HoloZing observation timestamp");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("pending rewards must be an object");
  if (!Array.isArray(alphaVialIds) || alphaVialIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("Alpha Vial identifiers must be positive safe integers");
  }
  if (new Set(alphaVialIds).size !== alphaVialIds.length) throw new Error("Alpha Vial identifiers must be unique");
  const delegation = exactReward(value["delegation"], "delegation");
  const stakeZing = exactReward(value["stakeZing"], "stakeZing");
  const holdingRewards = exactReward(value["holdingRewards"], "holdingRewards");
  const total = holozingFormatUnits(
    holozingDecimalUnits(delegation) + holozingDecimalUnits(stakeZing) + holozingDecimalUnits(holdingRewards),
  );
  return Object.freeze({
    account,
    observedAt,
    delegation,
    stakeZing,
    holdingRewards,
    total,
    alphaVialIds: Object.freeze([...alphaVialIds].sort((left, right) => left - right)),
  });
}

export function planHoloZingRewardClaim(pending, minimumClaimZing = "1.000") {
  try {
    const minimum = holozingDecimalUnits(minimumClaimZing);
    if (minimum <= 0n) throw new Error("minimum claim must be positive");
    const total = holozingDecimalUnits(pending.total);
    if (total < minimum) {
      return Object.freeze({ kind: "refuse", reason: `pending reward ${pending.total} ZING is below policy minimum ${holozingFormatUnits(minimum)} ZING` });
    }
    return Object.freeze({
      kind: "ready",
      reason: "claim converts server-pending rewards into on-chain staked ZING without opening or transferring an Alpha Vial",
      minimumClaimZing: pending.total,
    });
  } catch (error) {
    return Object.freeze({ kind: "refuse", reason: `invalid HoloZing claim evidence: ${error instanceof Error ? error.message : String(error)}` });
  }
}

export function reconcileHoloZingRewardClaim(beforePending, afterPending, beforeBalance, afterBalance, events) {
  try {
    if (beforePending.account !== afterPending.account) throw new Error("pending observations name different accounts");
    if (events.length === 0) throw new Error("no exact on-chain ZING stake event was observed");
    const minimum = holozingDecimalUnits(beforePending.total);
    const eventUnits = events.reduce((sum, event) => sum + holozingDecimalUnits(event.quantity), 0n);
    if (eventUnits < minimum) throw new Error("confirmed stake events are below the freshly planned reward amount");
    const beforeStake = holozingDecimalUnits(beforeBalance.staked);
    const afterStake = holozingDecimalUnits(afterBalance.staked);
    if (afterStake - beforeStake !== eventUnits) throw new Error("staked ZING balance delta does not equal the exact claim events");
    if (holozingDecimalUnits(afterBalance.liquid) !== holozingDecimalUnits(beforeBalance.liquid)) {
      throw new Error("liquid ZING changed during a stake-only reward claim");
    }
    if (holozingDecimalUnits(afterPending.total) >= holozingDecimalUnits(beforePending.total)) {
      throw new Error("pending rewards did not decrease after the claim");
    }
    return Object.freeze({ confirmed: true, claimedZing: holozingFormatUnits(eventUnits) });
  } catch (error) {
    return Object.freeze({ confirmed: false, reason: error instanceof Error ? error.message : String(error) });
  }
}

/** Two independently observed pending-reward balances are the same evidence
 * when their liquid and staked ZING agree. */
export function balancesAgree(left, right) {
  return left.liquid === right.liquid && left.staked === right.staked;
}

/** The exact message HoloZing's Keychain login flow signs. */
export function loginMessage(account, expiryUnix) {
  if (!ACCOUNT.test(account)) throw new Error("invalid login account");
  if (!Number.isSafeInteger(expiryUnix) || expiryUnix <= 0) throw new Error("invalid login expiry");
  return JSON.stringify({ username: account, type: "login", app: "holozing", expiry: expiryUnix });
}

/** The exact Keychain `signBuffer` response envelope HoloZing's login expects
 * back, given an already-computed signature and public key. This function
 * does not sign anything; it only shapes an envelope around a signature the
 * caller supplies. */
export function keychainLoginEnvelope(account, message, signature, publicKey) {
  if (!/^[0-9a-f]{130}$/i.test(signature)) throw new Error("invalid Keychain compact signature");
  if (!/^STM[1-9A-HJ-NP-Za-km-z]+$/.test(publicKey)) throw new Error("invalid Hive public key");
  return Object.freeze({
    success: true,
    error: null,
    result: signature,
    data: Object.freeze({
      type: "signBuffer",
      username: account,
      message,
      method: "Posting",
      rpc: null,
      title: "Login to HoloZing",
      domain: "holozing.com",
    }),
    message: "Message signed!",
    request_id: 1,
    publicKey,
  });
}

/** Attach a durable settlement record to an already-completed claim receipt.
 * `recorder` is caller-supplied (network/disk I/O lives with the caller,
 * never in this module); a recorder failure never sets retryAllowed back to
 * true, because the claim has already happened by the time this runs. */
export async function attachHolozingDurableRecord(receipt, recorder) {
  try {
    const event = await recorder(receipt);
    return Object.freeze({ ...receipt, durableRecord: Object.freeze({ confirmed: true, eventId: event.eventId }) });
  } catch (error) {
    return Object.freeze({
      ...receipt,
      retryAllowed: false,
      durableRecord: Object.freeze({ confirmed: false, error: error instanceof Error ? error.message : String(error) }),
    });
  }
}
