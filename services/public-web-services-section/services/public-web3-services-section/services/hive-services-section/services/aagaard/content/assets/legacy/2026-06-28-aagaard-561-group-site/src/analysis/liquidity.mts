// analysis/liquidity — liquidity within and between Hive and Hive-Engine venues
// (task #20). The trading lane already READS three venues (the internal HIVE/HBD
// order book, the Hive-Engine token books, and the AMM pools). This module turns
// that read into a liquidity map:
//
//   • WITHIN a venue: depth per side, relative spread, and book imbalance
//     (bid-heavy ⟹ buy pressure, ask-heavy ⟹ sell pressure).
//   • A POOL: the constant-product implied price and a TVL proxy, plus how far
//     the pool price sits from the matching order book (pool-vs-book divergence
//     is a standing arbitrage corridor and a liquidity-fragmentation signal).
//   • BETWEEN venues: for a token quoted in more than one place, the price
//     divergence and the executable arbitrage corridor after the pool fee.
//
// This is the analytical core the help-fund liquidity post (#18) and the
// incentive valuation (#25) both draw on — and `tokenValueHbd` is how we price a
// reward token offered by a "do X, get Y" incentive. Native arithmetic; the
// exact rationals stay on chain.

import type { MarketRunResult, MarketSectionResult, PoolState } from "@emsenn/computing-with-hive/scripts";

function amtNumber(a: unknown): number {
  if (typeof a !== "object" || a === null) return 0;
  const r = a as { num?: unknown; den?: unknown };
  if (typeof r.num !== "bigint" || typeof r.den !== "bigint" || r.den === 0n) return 0;
  return Number(r.num) / Number(r.den);
}
const parseNum = (s: string): number => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

export interface VenueLiquidity {
  readonly venue: string;
  readonly pair: string;
  readonly bestBid: number;
  readonly bestAsk: number;
  readonly midpoint: number;
  readonly relativeSpreadBps: number;
  readonly bidDepth: number;
  readonly askDepth: number;
  /** (bid − ask)/(bid + ask) ∈ [−1,1]: + buy-pressure, − sell-pressure. */
  readonly imbalance: number;
  readonly thin: boolean;
}

export interface PoolLiquidity {
  readonly pair: string;
  readonly impliedPrice: number;
  readonly baseQuantity: number;
  readonly quoteQuantity: number;
  /** TVL proxy in quote units: quote + base × impliedPrice = 2 × quote. */
  readonly tvlQuote: number;
  readonly feeBps: number;
}

export interface CrossVenueCorridor {
  readonly symbol: string;
  readonly cheapVenue: string;
  readonly richVenue: string;
  readonly cheapPrice: number;
  readonly richPrice: number;
  /** Price divergence in basis points between the two venues. */
  readonly divergenceBps: number;
  /** Net corridor after the worse pool fee — a positive executable arbitrage. */
  readonly netCorridorBps: number;
}

export interface LiquidityReading {
  readonly kind: "aagaard.liquidity";
  readonly venues: readonly VenueLiquidity[];
  readonly pools: readonly PoolLiquidity[];
  readonly corridors: readonly CrossVenueCorridor[];
  /** Total quote-unit liquidity proxy across the venues observed. */
  readonly totalDepthProxy: number;
}

function venueLiquidity(m: MarketSectionResult): VenueLiquidity {
  const book = (m.reading as { book?: { bids?: readonly { quantity: unknown }[]; asks?: readonly { quantity: unknown }[] } }).book ?? {};
  const bidDepth = (book.bids ?? []).reduce((s, l) => s + amtNumber(l.quantity), 0);
  const askDepth = (book.asks ?? []).reduce((s, l) => s + amtNumber(l.quantity), 0);
  const rep = m.report as { bestBid?: { display?: string }; bestAsk?: { display?: string }; midpoint?: { display?: string }; relativeSpreadBps?: number };
  const bestBid = parseNum(rep.bestBid?.display ?? "0");
  const bestAsk = parseNum(rep.bestAsk?.display ?? "0");
  // Prefer the report midpoint; fall back to the best bid/ask average when the
  // upstream report omits it but the levels are present.
  const repMid = parseNum(rep.midpoint?.display ?? "0");
  const midpoint = repMid > 0 ? repMid : bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid > 0 ? bestBid : bestAsk;
  const total = bidDepth + askDepth;
  return {
    venue: m.venue,
    pair: `${m.baseSymbol}/${m.quoteSymbol}`,
    bestBid,
    bestAsk,
    midpoint,
    relativeSpreadBps: typeof rep.relativeSpreadBps === "number" ? rep.relativeSpreadBps : 0,
    bidDepth,
    askDepth,
    imbalance: total > 0 ? (bidDepth - askDepth) / total : 0,
    thin: total < 1,
  };
}

function poolLiquidity(p: PoolState): PoolLiquidity {
  const base = parseNum(p.baseQuantity);
  const quote = parseNum(p.quoteQuantity);
  const impliedPrice = base > 0 ? quote / base : 0;
  const feeMultiplier = parseNum(p.tradeFeeMultiplier);
  const feeBps = feeMultiplier > 0 && feeMultiplier <= 1 ? Math.round((1 - feeMultiplier) * 10000) : 0;
  return { pair: p.tokenPair, impliedPrice, baseQuantity: base, quoteQuantity: quote, tvlQuote: quote * 2, feeBps };
}

/** A token's price quoted by a venue, for cross-venue comparison. */
function venuePrices(venues: readonly VenueLiquidity[], pools: readonly PoolLiquidity[]): Map<string, { venue: string; price: number; feeBps: number }[]> {
  const bySymbol = new Map<string, { venue: string; price: number; feeBps: number }[]>();
  const add = (symbol: string, venue: string, price: number, feeBps: number): void => {
    if (price <= 0) return;
    (bySymbol.get(symbol) ?? bySymbol.set(symbol, []).get(symbol)!).push({ venue, price, feeBps });
  };
  for (const v of venues) add(v.pair.split("/")[0] ?? v.pair, v.venue, v.midpoint, 0);
  for (const p of pools) add(p.pair.split(":")[0] ?? p.pair, `pool:${p.pair}`, p.impliedPrice, p.feeBps);
  return bySymbol;
}

function corridors(venues: readonly VenueLiquidity[], pools: readonly PoolLiquidity[]): CrossVenueCorridor[] {
  const out: CrossVenueCorridor[] = [];
  for (const [symbol, quotes] of venuePrices(venues, pools)) {
    if (quotes.length < 2) continue;
    const sorted = [...quotes].sort((a, b) => a.price - b.price);
    const cheap = sorted[0]!;
    const rich = sorted[sorted.length - 1]!;
    if (cheap.price <= 0) continue;
    const divergenceBps = Math.round(((rich.price - cheap.price) / cheap.price) * 10000);
    const netCorridorBps = divergenceBps - cheap.feeBps - rich.feeBps;
    if (divergenceBps > 0) {
      out.push({ symbol, cheapVenue: cheap.venue, richVenue: rich.venue, cheapPrice: cheap.price, richPrice: rich.price, divergenceBps, netCorridorBps });
    }
  }
  return out.sort((a, b) => b.netCorridorBps - a.netCorridorBps);
}

/** Read the liquidity map from a live market run. */
export function readLiquidity(market: MarketRunResult): LiquidityReading {
  const venues = market.markets.map(venueLiquidity);
  const pools = market.poolStates.map(poolLiquidity);
  const totalDepthProxy = venues.reduce((s, v) => s + v.bidDepth + v.askDepth, 0) + pools.reduce((s, p) => s + p.tvlQuote, 0);
  return Object.freeze({
    kind: "aagaard.liquidity" as const,
    venues: Object.freeze(venues),
    pools: Object.freeze(pools),
    corridors: Object.freeze(corridors(venues, pools)),
    totalDepthProxy,
  });
}

/** Best-effort value of one unit of `symbol` in HBD, from whichever venue prices
 *  it. Used to value a reward token offered by an incentive. Returns null when
 *  the token is unpriced in the observed venues. */
export function tokenValueHbd(symbol: string, liquidity: LiquidityReading): number | null {
  const sym = symbol.toUpperCase();
  if (sym === "HBD") return 1;
  if (sym === "HIVE") {
    const internal = liquidity.venues.find((v) => v.pair === "HIVE/HBD");
    if (internal && internal.midpoint > 0) return internal.midpoint;
  }
  // Direct venue/pool quote (assumed against HIVE or HBD on Hive-Engine).
  const pool = liquidity.pools.find((p) => (p.pair.split(":")[0] ?? "").toUpperCase() === sym);
  if (pool && pool.impliedPrice > 0) {
    const quoteSym = (pool.pair.split(":")[1] ?? "").toUpperCase();
    if (quoteSym === "HBD") return pool.impliedPrice;
    if (quoteSym === "HIVE" || quoteSym === "SWAP.HIVE") {
      const hive = tokenValueHbd("HIVE", liquidity);
      return hive !== null ? pool.impliedPrice * hive : null;
    }
    return pool.impliedPrice; // unknown quote: report raw implied price
  }
  return null;
}
