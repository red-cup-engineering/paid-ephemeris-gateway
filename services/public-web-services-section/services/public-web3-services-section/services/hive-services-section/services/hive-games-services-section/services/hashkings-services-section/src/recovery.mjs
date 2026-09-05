// recovery — HashKings observation and a conservative preserve-custody vs.
// review-recovery classification. This module never signs or broadcasts;
// every export is a pure function over caller-supplied observed evidence.
//
// Ported from aagaard's src/integrations/hashkings/hashkings.adapter.ts
// (self-contained; no shared Hive-Engine encoder dependency) and the
// `classifyDomainResponse`/`statesAgree` helpers from
// aagaard's scripts/hashkings-recovery.mjs.

const ACCOUNT = /^(?=.{3,16}$)[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]*[a-z0-9])?)*$/;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/;
const DAY_SECONDS = 86_400;

function scale(precision) {
  if (!Number.isSafeInteger(precision) || precision < 0 || precision > 18) {
    throw new Error("HashKings precision must be an integer from 0 through 18");
  }
  return 10n ** BigInt(precision);
}

export function hashKingsDecimalUnits(value, precision) {
  const match = DECIMAL.exec(value);
  if (!match) throw new Error(`HashKings value '${value}' is not a canonical unsigned decimal`);
  const fraction = match[1] ?? "";
  if (fraction.length > precision) throw new Error(`HashKings value '${value}' exceeds precision ${precision}`);
  const whole = value.split(".")[0] ?? "0";
  return BigInt(whole) * scale(precision) + BigInt((fraction + "0".repeat(precision)).slice(0, precision) || "0");
}

export function hashKingsFormatUnits(value, precision) {
  if (value < 0n) throw new Error("HashKings amount cannot be negative");
  const factor = scale(precision);
  if (precision === 0) return value.toString();
  return `${value / factor}.${(value % factor).toString().padStart(precision, "0")}`;
}

export function quoteHashKingsBudsPoolExit(budsBalance, baseQuantity, quoteQuantity, feeBps = 25) {
  const precision = 8;
  if (!Number.isSafeInteger(feeBps) || feeBps < 0 || feeBps >= 10_000) throw new Error("invalid HashKings pool fee");
  const input = hashKingsDecimalUnits(budsBalance, precision);
  const reserveIn = hashKingsDecimalUnits(baseQuantity, precision);
  const reserveOut = hashKingsDecimalUnits(quoteQuantity, precision);
  if (input <= 0n || reserveIn <= 0n || reserveOut <= 0n) return hashKingsFormatUnits(0n, precision);
  const effectiveInput = input * BigInt(10_000 - feeBps);
  const output = reserveOut * effectiveInput / (reserveIn * 10_000n + effectiveInput);
  return hashKingsFormatUnits(output, precision);
}

function validateEvidence(evidence, policy) {
  if (!ACCOUNT.test(evidence.account)) throw new Error("invalid HashKings Hive account");
  const observedUnix = Math.floor(Date.parse(evidence.observedAt) / 1000);
  if (!Number.isSafeInteger(observedUnix) || observedUnix <= 0) throw new Error("invalid HashKings observation timestamp");
  if (!Number.isSafeInteger(policy.maximumComparableSaleAgeDays) || policy.maximumComparableSaleAgeDays < 1) {
    throw new Error("invalid HashKings comparable-sale age policy");
  }
  hashKingsDecimalUnits(policy.minimumDirectRecoverySwapHive, 8);
  if (evidence.budsPoolExitSwapHive !== null) hashKingsDecimalUnits(evidence.budsPoolExitSwapHive, 8);
  const expected = new Map([["BUDS", 8], ["HKWATER", 4], ["MOTA", 4]]);
  if (evidence.fungibles.length !== expected.size) throw new Error("HashKings fungible inventory is incomplete");
  for (const asset of evidence.fungibles) {
    if (expected.get(asset.symbol) !== asset.precision) throw new Error(`HashKings ${asset.symbol} precision changed`);
    hashKingsDecimalUnits(asset.balance, asset.precision);
    expected.delete(asset.symbol);
  }
  if (expected.size !== 0) throw new Error("HashKings fungible inventory has duplicate or missing symbols");
  if (evidence.nfts.some((asset) => !Number.isSafeInteger(asset.id) || asset.id <= 0 || !asset.type || !asset.name)) {
    throw new Error("HashKings NFT evidence is malformed");
  }
  if (new Set(evidence.nfts.map((asset) => asset.id)).size !== evidence.nfts.length) throw new Error("HashKings NFT identifiers are not unique");
  for (const count of Object.values(evidence.actualBuyOrderCounts)) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("HashKings buy-order count is malformed");
  }
  if (!Number.isSafeInteger(evidence.ownNftListingCount) || evidence.ownNftListingCount < 0) {
    throw new Error("HashKings own-listing count is malformed");
  }
  if (evidence.latestNftTradeUnix !== null && (!Number.isSafeInteger(evidence.latestNftTradeUnix) || evidence.latestNftTradeUnix <= 0)) {
    throw new Error("HashKings latest-trade timestamp is malformed");
  }
}

const DEFAULT_POLICY = Object.freeze({ minimumDirectRecoverySwapHive: "0.01000000", maximumComparableSaleAgeDays: 90 });

export function assessHashKingsRecovery(evidence, policy = DEFAULT_POLICY) {
  try {
    validateEvidence(evidence, policy);
    if (!evidence.providersAgree) return Object.freeze({ kind: "refuse", reason: "independent Hive-Engine providers disagree" });
    const observedUnix = Math.floor(Date.parse(evidence.observedAt) / 1000);
    const recentComparableSale = evidence.latestNftTradeUnix !== null
      && observedUnix - evidence.latestNftTradeUnix <= policy.maximumComparableSaleAgeDays * DAY_SECONDS
      && observedUnix >= evidence.latestNftTradeUnix;
    const hasActualBid = Object.values(evidence.actualBuyOrderCounts).some((count) => count > 0);
    const poolExitIsMaterial = evidence.budsPoolExitSwapHive !== null
      && hashKingsDecimalUnits(evidence.budsPoolExitSwapHive, 8) >= hashKingsDecimalUnits(policy.minimumDirectRecoverySwapHive, 8);
    if (hasActualBid || poolExitIsMaterial) {
      return Object.freeze({
        kind: "review-recovery",
        reason: hasActualBid
          ? "an actual fungible buy order exists and may support a bounded recovery"
          : "the exact BUDS pool exit meets the direct-recovery threshold",
        nftCount: evidence.nfts.length,
        recentComparableSale,
      });
    }
    if (recentComparableSale && evidence.nfts.length > 0) {
      return Object.freeze({
        kind: "review-recovery",
        reason: "recent independently confirmed NFT sales justify separately pricing a custody-changing listing",
        nftCount: evidence.nfts.length,
        recentComparableSale,
      });
    }
    return Object.freeze({
      kind: "preserve-custody",
      reason: evidence.domainDisposition === "parked"
        ? "the game domain is parked and no material executable bid or recent NFT sale justifies spending authority or market custody"
        : "no material executable bid or recent NFT sale justifies spending authority or market custody",
      nftCount: evidence.nfts.length,
      recentComparableSale,
    });
  } catch (error) {
    return Object.freeze({ kind: "refuse", reason: `invalid HashKings recovery evidence: ${error instanceof Error ? error.message : String(error)}` });
  }
}

const ECONOMIC_FIELDS = ["account", "fungibles", "nfts", "actualBuyOrderCounts", "budsPoolExitSwapHive", "ownNftListingCount", "latestNftTradeUnix"];

/** Two independently observed states are the same economic evidence when
 * every field the assessment reads from agrees. */
export function statesAgree(left, right) {
  return ECONOMIC_FIELDS.every((field) => JSON.stringify(left[field]) === JSON.stringify(right[field]));
}

/** HashKings' web client has, at various points, replaced its game UI with a
 * client-side redirect to a "/lander" holding page. A 2xx/redirect status
 * alone cannot distinguish "operational" from "parked behind a lander," so
 * both the HTTP redirect location and a same-origin script redirect in the
 * response body are checked. */
export function classifyDomainResponse(status, location, body) {
  if (/\/lander(?:[/?#]|["']|$)/i.test(location) || /window\.location\.href\s*=\s*["']\/lander/i.test(body)) return "parked";
  if (status >= 200 && status < 300) return "operational";
  return "unknown";
}
