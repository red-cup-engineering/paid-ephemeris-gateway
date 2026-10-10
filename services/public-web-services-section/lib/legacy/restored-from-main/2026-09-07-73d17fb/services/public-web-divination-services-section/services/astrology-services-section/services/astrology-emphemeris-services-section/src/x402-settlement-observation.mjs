/**
 * Vendored copy of @red-cup-engineering/x402-market-observation-service's settlement.mjs
 * (source: services/engineering-services-section/.../x402-services-section/services/x402-market-observation-service/src/settlement.mjs,
 * version 0.1.0, zero runtime dependencies).
 *
 * Vendored rather than depended-on because that package is not yet published to the
 * internal registry, and ops/cloud-run/prepare-context.sh only copies this gateway's own
 * package.json/package-lock.json/src/ into the Cloud Run build context — a cross-package
 * relative import would resolve locally but silently fail to build in the container. Once
 * the source package is published and pinned as a real dependency, delete this file and
 * import from the package name instead; do not let the two copies drift apart until then.
 */
/**
 * `settlement` — measure x402 payment volume at the chain, not at a directory.
 *
 * This module exists because sizing this market from a directory produces an answer that is
 * wrong by about an order of magnitude. Coinbase's Bazaar catalog reports roughly 293,000 calls
 * over thirty days; the same period shows roughly 3.3 million EIP-3009 authorizations settling
 * on Base USDC. The catalog observes something on the order of 9% of settlement activity, so a
 * market sized from it understates the protocol roughly elevenfold — a mistake this estate made
 * before this module was written, and the reason it was written.
 *
 * The measurement works because x402's `exact` scheme settles by EIP-3009
 * `transferWithAuthorization`, which emits `AuthorizationUsed(address indexed authorizer,
 * bytes32 indexed nonce)`. Counting that event over a block range gives a floor on machine-
 * initiated payment activity that no directory can hide, and the indexed authorizer gives the
 * population of distinct paying agents — which is the number that decides whether this market
 * is a handful of whales or a real population.
 *
 * **The honest caveat, carried in every observation this module emits rather than left in a
 * comment:** not all EIP-3009 activity is x402. The event is the settlement primitive x402
 * uses, not a marker of the protocol, so these figures are an upper bound on x402 and a
 * measurement of gasless-authorized stablecoin transfer generally. An observation that quietly
 * dropped that distinction would be the same category of error as sizing from the catalog.
 *
 * Extrapolation is explicit. A sampled window is scaled to a day and a month, and both the
 * sample and the scaling factor are reported alongside the result so a reader can see how much
 * of a headline number is measurement and how much is multiplication. Scaling a thirty-minute
 * window to a month multiplies whatever happened in it by 1,440, including any burst.
 *
 * Plain JavaScript, shapes in the co-located settlement.d.ts. No clock is read here — the
 * caller stamps observations — so results are reproducible from a block range alone.
 */

/** USDC on Base, the asset essentially every x402 `exact` payment settles in today. */
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** keccak256("AuthorizationUsed(address,bytes32)") — EIP-3009's settlement event. */
export const AUTHORIZATION_USED_TOPIC =
  "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";

/** Base produces a block roughly every two seconds, so a day is about 43,200 blocks. Used only
 *  for extrapolation, and always reported alongside the figure it produced. */
export const BASE_BLOCKS_PER_DAY = 43200;

const hexQuantity = (n) => `0x${BigInt(n).toString(16)}`;

async function rpc(url, method, params, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http ${response.status}` };
    const body = await response.json();
    if (body?.error) return { ok: false, reason: `rpc ${body.error.code ?? "?"}: ${body.error.message ?? "error"}` };
    if (body?.result === undefined) return { ok: false, reason: "malformed response: no result" };
    return { ok: true, value: body.result };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

/** The authorizer address out of an `AuthorizationUsed` log's first indexed topic. */
export function authorizerOf(log) {
  const topic = log?.topics?.[1];
  if (typeof topic !== "string" || topic.length !== 66) return null;
  return `0x${topic.slice(26)}`.toLowerCase();
}

/**
 * Count authorizations over an explicit block range.
 *
 * Returns an outcome, never a bare number: a failed `eth_getLogs` must not be reportable as
 * zero settlements, or a rate-limited RPC becomes evidence that the market is dead.
 */
export async function measureRange({ rpcUrl, fromBlock, toBlock, asset = BASE_USDC, ...options } = {}) {
  if (!Number.isInteger(fromBlock) || !Number.isInteger(toBlock) || toBlock < fromBlock) {
    throw new RangeError(`settlement: invalid block range ${fromBlock}..${toBlock}`);
  }
  const result = await rpc(rpcUrl, "eth_getLogs", [{
    address: asset,
    topics: [AUTHORIZATION_USED_TOPIC],
    fromBlock: hexQuantity(fromBlock),
    toBlock: hexQuantity(toBlock),
  }], options);
  if (!result.ok) return { ok: false, reason: result.reason, fromBlock, toBlock };

  const logs = Array.isArray(result.value) ? result.value : [];
  const authorizers = new Set();
  for (const log of logs) {
    const who = authorizerOf(log);
    if (who !== null) authorizers.add(who);
  }
  return {
    ok: true,
    fromBlock,
    toBlock,
    blocks: toBlock - fromBlock + 1,
    authorizations: logs.length,
    distinctAuthorizers: authorizers.size,
    authorizers: [...authorizers],
  };
}

/** The current chain tip, as an outcome. */
export async function chainTip({ rpcUrl, ...options } = {}) {
  const result = await rpc(rpcUrl, "eth_blockNumber", [], options);
  if (!result.ok) return result;
  return { ok: true, value: Number.parseInt(result.value, 16) };
}

/**
 * Sample a window ending at the chain tip and extrapolate.
 *
 * The extrapolation is reported as its own object rather than folded into the headline so a
 * reader can see the multiplier. A thirty-minute window scaled to a month is multiplied by
 * 1,440, and anything unusual in that half hour is multiplied with it.
 */
export async function observeSettlement({ rpcUrl, windowBlocks = 900, asset = BASE_USDC, blocksPerDay = BASE_BLOCKS_PER_DAY, ...options } = {}) {
  if (!Number.isInteger(windowBlocks) || windowBlocks < 1) {
    throw new RangeError(`settlement: windowBlocks must be a positive integer, got ${windowBlocks}`);
  }
  const tip = await chainTip({ rpcUrl, ...options });
  if (!tip.ok) return { ok: false, reason: `could not read chain tip: ${tip.reason}` };

  const toBlock = tip.value;
  const fromBlock = Math.max(0, toBlock - windowBlocks + 1);
  const measured = await measureRange({ rpcUrl, fromBlock, toBlock, asset, ...options });
  if (!measured.ok) return { ok: false, reason: measured.reason, fromBlock, toBlock };

  const dayFactor = blocksPerDay / measured.blocks;
  return {
    ok: true,
    asset,
    measured: {
      fromBlock: measured.fromBlock,
      toBlock: measured.toBlock,
      blocks: measured.blocks,
      approximateMinutes: Math.round((measured.blocks * 2) / 60),
      authorizations: measured.authorizations,
      distinctAuthorizers: measured.distinctAuthorizers,
    },
    authorizers: measured.authorizers,
    extrapolated: {
      dayFactor,
      monthFactor: dayFactor * 30,
      authorizationsPerDay: Math.round(measured.authorizations * dayFactor),
      authorizationsPer30Days: Math.round(measured.authorizations * dayFactor * 30),
      basis: `a ${measured.blocks}-block sample scaled by ${dayFactor.toFixed(1)} to a day; a burst inside the window is scaled with it`,
    },
    caveat:
      "EIP-3009 AuthorizationUsed is the settlement primitive x402's exact scheme uses, not a marker of the protocol. "
      + "These figures are an upper bound on x402 volume and a measurement of gasless-authorized stablecoin transfer generally. "
      + "The x402 share of this total is not established by this measurement.",
  };
}

/**
 * Compare directory-reported activity against measured settlement.
 *
 * This is the finding the service exists to keep producing: how much of the protocol a given
 * catalog can actually see. A visibility figure well under one means anyone sizing the market
 * from that catalog is understating it by the reciprocal.
 */
export function catalogVisibility({ catalogCalls, settlementPer30Days }) {
  if (!Number.isFinite(catalogCalls) || catalogCalls < 0) throw new RangeError("catalogCalls must be a non-negative number");
  if (!Number.isFinite(settlementPer30Days) || settlementPer30Days <= 0) throw new RangeError("settlementPer30Days must be positive");
  const ratio = catalogCalls / settlementPer30Days;
  return {
    catalogCalls,
    settlementPer30Days,
    visibility: ratio,
    visibilityPercent: Number((ratio * 100).toFixed(2)),
    understatementFactor: Number((1 / ratio).toFixed(1)),
    note: `a market sized from this catalog understates settlement activity by about ${(1 / ratio).toFixed(0)}x`,
  };
}
