// yield — plans converting a fleet account's liquid WORKERBEE into
// productive BEE-mining power (self-stake, then delegate the same bounded
// quantity to the ph1102 no-fee pool), and the pure reconciliation helpers
// used to confirm an already-broadcast batch really executed as planned.
// Nothing in this module signs or broadcasts a transaction: `planWorkerBeeYield`
// only encodes the `custom_json` operation it would take.
//
// Ported from aagaard's scripts/workerbee-yield.mjs. That original built its
// `stake`/`delegate`/`batchOperations` custom_json calls with aagaard's
// shared src/integrations/hive-engine/hiveEngineOps.mjs encoder; this module
// duplicates that tiny slice (see `stakeOperation`/`delegateOperation`/
// `batchOperations` below) so this service does not depend on aagaard's
// package. See this section's README for that migration note.

const CONTRACT_ID = "ssc-mainnet-hive";

function customJsonOp(account, contractName, contractAction, contractPayload) {
  return Object.freeze(["custom_json", Object.freeze({
    id: CONTRACT_ID,
    required_auths: Object.freeze([account]),
    required_posting_auths: Object.freeze([]),
    json: JSON.stringify({ contractName, contractAction, contractPayload }),
  })]);
}

/** Encode a Hive-Engine tokens.stake custom_json. Duplicate of aagaard's
 * `stake` encoder (see header comment). */
export function stakeOperation(account, symbol, quantity, to = account) {
  return customJsonOp(account, "tokens", "stake", { symbol, to, quantity });
}

/** Encode a Hive-Engine tokens.delegate custom_json. Duplicate of aagaard's
 * `delegate` encoder. */
export function delegateOperation(account, symbol, quantity, to) {
  return customJsonOp(account, "tokens", "delegate", { symbol, to, quantity });
}

/** Put several verified Hive-Engine contract calls in one Hive custom_json.
 * The sidechain executes these inner calls sequentially and contiguously; it
 * does not roll earlier calls back if a later one fails, so every leg must
 * be bounded independently. Duplicate of aagaard's `batchOperations`. */
export function batchOperations(account, operations) {
  if (!Array.isArray(operations) || operations.length < 2) throw new Error("batchOperations: at least two operations are required");
  const calls = operations.map((operation) => {
    if (!Array.isArray(operation) || operation[0] !== "custom_json") throw new Error("batchOperations: only Hive-Engine custom_json operations may be batched");
    const fields = operation[1];
    if (fields.id !== CONTRACT_ID || !Array.isArray(fields.required_auths) || fields.required_auths.length !== 1 || fields.required_auths[0] !== account) {
      throw new Error("batchOperations: every operation must carry the same account and Hive-Engine contract id");
    }
    const decoded = JSON.parse(fields.json);
    if (Array.isArray(decoded)) throw new Error("batchOperations: nested batches are refused");
    return decoded;
  });
  return Object.freeze(["custom_json", Object.freeze({
    id: CONTRACT_ID,
    required_auths: Object.freeze([account]),
    required_posting_auths: Object.freeze([]),
    json: JSON.stringify(calls),
  })]);
}

const ACCOUNT = "michael561";
const SYMBOL = "WORKERBEE";
const POOL_ACCOUNT = "ph1102";
const POOL_ID = "BEE:WORKERBEE";

function units(value, precision) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(String(value));
  if (!match || (match[2]?.length ?? 0) > precision) throw new Error(`noncanonical ${precision}-decimal quantity '${value}'`);
  return BigInt(match[1]) * 10n ** BigInt(precision) + BigInt((match[2] ?? "").padEnd(precision, "0"));
}

function format(value, precision) {
  const scale = 10n ** BigInt(precision);
  return precision === 0 ? String(value) : `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`;
}

function depthProceeds(quantityUnits, quantityPrecision, bids) {
  let left = quantityUnits; let proceeds = 0n; let levels = 0; let floorPrice = null;
  for (const bid of bids) {
    if (left === 0n) break;
    const available = units(bid.quantity, quantityPrecision);
    const take = available < left ? available : left;
    if (take === 0n) continue;
    const price = units(bid.price, 8);
    proceeds += take * price / (10n ** BigInt(quantityPrecision));
    left -= take;
    levels += 1;
    floorPrice = bid.price;
  }
  return left === 0n ? Object.freeze({ proceeds, levels, floorPrice }) : null;
}

const AGREEMENT_FIELDS = ["account", "symbol", "token", "balance", "delegation", "pendingRows", "pool", "books"];

/** Two independently observed WORKERBEE states are the same economic
 * evidence when every field the plan reads from agrees (observedAt may
 * differ). */
export function statesAgree(left, right) {
  return AGREEMENT_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field]));
}

/**
 * Plan self-staking then delegating the full observed liquid WORKERBEE
 * balance to the ph1102 mining pool. Refuses (never throws) whenever the
 * observed contract terms, pending movements, balance, or bid depth do not
 * exactly match this fleet's previously confirmed policy, or the liquid
 * balance exceeds the hard 10.00000 WORKERBEE signer cap.
 */
export function planWorkerBeeYield(state) {
  const token = state.token; const balance = state.balance; const pool = state.pool;
  if (state.account !== ACCOUNT || state.symbol !== SYMBOL) return Object.freeze({ kind: "refuse", reason: "policy identity mismatch" });
  if (token?.issuer !== "steem-tokens" || token.precision !== 5 || token.stakingEnabled !== true || token.delegationEnabled !== true
    || token.unstakingCooldownDays !== 63 || token.undelegationCooldownDays !== 7 || token.numberTransactions !== 9
    || Object.keys(token).sort().join(",") !== ["delegationEnabled", "issuer", "numberTransactions", "precision", "stakingEnabled", "undelegationCooldownDays", "unstakingCooldownDays"].sort().join(",")) return Object.freeze({ kind: "refuse", reason: "WORKERBEE contract terms changed" });
  const miner = Array.isArray(pool?.tokenMiners) && pool.tokenMiners.length === 1 ? pool.tokenMiners[0] : null;
  if (pool.id !== POOL_ID || pool.minedToken !== "BEE" || pool.active !== true || pool.lotteryWinners !== 10
    || pool.lotteryIntervalHours !== 1 || pool.lotteryAmount !== "10.00000000"
    || miner?.symbol !== SYMBOL || miner.multiplier !== 1 || Object.keys(miner).sort().join(",") !== "multiplier,symbol") return Object.freeze({ kind: "refuse", reason: "BEE mining pool terms changed" });
  if (state.pendingRows.unstakes !== 0 || state.pendingRows.undelegations !== 0
    || units(balance.pendingUnstake, 5) !== 0n || units(balance.pendingUndelegations, 5) !== 0n) return Object.freeze({ kind: "refuse", reason: "WORKERBEE has a pending release movement" });
  const quantityUnits = units(balance.liquid, 5);
  if (quantityUnits === 0n) return Object.freeze({ kind: "refuse", reason: "no liquid WORKERBEE remains" });
  if (quantityUnits > 1_000_000n) return Object.freeze({ kind: "refuse", reason: "liquid WORKERBEE exceeds the signer cap of 10.00000" });
  if (!Array.isArray(state.books?.beeBids) || !Array.isArray(state.books?.workerBeeBids)) return Object.freeze({ kind: "refuse", reason: "live BEE or WORKERBEE bid evidence is absent" });
  const totalPowerUnits = units(pool.totalPower, 5);
  if (totalPowerUnits === 0n) return Object.freeze({ kind: "refuse", reason: "BEE mining power is zero" });
  const weeklyLotteries = 168n / BigInt(pool.lotteryIntervalHours);
  const weeklyBeeUnits = quantityUnits * units(pool.lotteryAmount, 8) * weeklyLotteries / totalPowerUnits;
  const annualBeeUnits = weeklyBeeUnits * 52n;
  const beeExit = depthProceeds(annualBeeUnits, 8, state.books.beeBids);
  const workerBeeExit = depthProceeds(quantityUnits, 5, state.books.workerBeeBids);
  if (!beeExit || !workerBeeExit) return Object.freeze({ kind: "refuse", reason: "displayed bids cannot value both the annual BEE output and full WORKERBEE position" });
  const annualSwapHiveUnits = beeExit.proceeds; const positionBidValueUnits = workerBeeExit.proceeds;
  const annualYieldBps = positionBidValueUnits === 0n ? 0 : Number(annualSwapHiveUnits * 10_000n / positionBidValueUnits);
  const quantity = format(quantityUnits, 5);
  return Object.freeze({
    kind: "stake-delegate", quantity, recipient: POOL_ACCOUNT,
    lockTerms: Object.freeze({ unstakingCooldownDays: 63, releaseTransactions: 9, undelegationCooldownDays: 7 }),
    expectedYield: Object.freeze({
      derivation: "q/totalPower * lotteryAmount * 168 lotteries/week; both legs integrated across complete displayed bid depth",
      weeklyBeeFloor: format(weeklyBeeUnits, 8), annualBeeFloor: format(annualBeeUnits, 8),
      annualSwapHiveAtBidFloor: format(annualSwapHiveUnits, 8), annualBeeExitLevels: beeExit.levels, annualBeeFloorPrice: beeExit.floorPrice,
      positionSwapHiveAtBidFloor: format(positionBidValueUnits, 8), positionExitLevels: workerBeeExit.levels, positionFloorPrice: workerBeeExit.floorPrice, annualYieldBps,
    }),
    operation: batchOperations(state.account, [stakeOperation(state.account, SYMBOL, quantity, state.account), delegateOperation(state.account, SYMBOL, quantity, POOL_ACCOUNT)]),
  });
}

/** Hive Engine returns a row for a single call and an array of child rows
 * for a batched custom_json. Normalize both without discarding the child
 * identity; otherwise a successful first call could be mistaken for the
 * whole batch. */
export function normalizeEngineTransactionInfo(result, node = "provider", candidate = "unknown") {
  const rows = Array.isArray(result) ? result : [result];
  if (rows.length === 0) throw new Error(`${node} returned an empty WORKERBEE transaction`);
  const events = []; const transactionIds = []; const blocks = new Set();
  for (const row of rows) {
    let logs;
    try { logs = typeof row?.logs === "string" ? JSON.parse(row.logs) : row?.logs; } catch { logs = null; }
    if (!logs || typeof logs !== "object" || Array.isArray(logs)) throw new Error(`${node} returned malformed WORKERBEE logs`);
    if (Array.isArray(logs.errors) && logs.errors.length > 0) throw new Error(`${node} reports a WORKERBEE yield error: ${logs.errors.join("; ")}`);
    if (Array.isArray(logs.events)) events.push(...logs.events);
    transactionIds.push(String(row?.transactionId ?? candidate));
    blocks.add(Number(row?.blockNumber));
  }
  if (blocks.size !== 1 || ![...blocks][0] || transactionIds.some((id) => !/^[0-9a-f]{40}(?:-[0-9]+)?$/.test(id))) throw new Error(`${node} returned inconsistent WORKERBEE child identities`);
  return Object.freeze({ node, transactionIds: Object.freeze(transactionIds), blockNumber: [...blocks][0], logs: Object.freeze({ events: Object.freeze(events) }) });
}
