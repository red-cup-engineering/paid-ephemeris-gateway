/**
 * `odds` — VENDORED, typed near-verbatim port of
 * `science-services-section/philosophy-services-section/relationality-services-section/agency-services-section/being-services-section/doing-services-section/playing-services-section/gaming-services-section/gambling-services-section/src/odds.mjs`.
 * See `kelly.mts`'s header for the full vendoring rationale (wrong npm scope, and the source
 * package's own `exports` map doesn't expose this subpath) — identical reasoning applies here.
 *
 * Vendor-parity test: `odds.test.mts` runs the identical fixture cases as the `'odds arithmetic'`
 * test inline in the source's own `test/kelly.test.mjs` (the source library has no dedicated
 * `odds.test.mjs` of its own, so this port's test is the first dedicated odds test either copy
 * has).
 */

// A leading `export` must appear before any TypeScript-only syntax in this file — see
// `kelly.mts`'s module-detection note. `assertPrices` is hoisted to the bottom for that reason.

/** Overround (vig): how much a set of mutually-exclusive-and-exhaustive prices sums above 1. */
export function overround(prices: readonly number[]): number {
  assertPrices(prices);
  return prices.reduce((s, p) => s + p, 0) - 1;
}

/** Proportional (basic) vig removal: fair probabilities by normalization. Adequate for tight
 * books; biased at longshots (favourite-longshot bias), where Shin's method is the recognized
 * successor — `proposed` in the source catalog, not implemented here or there. */
export function fairProbabilities(prices: readonly number[]): number[] {
  assertPrices(prices);
  const total = prices.reduce((s, p) => s + p, 0);
  return prices.map((p) => p / total);
}

/** Midpoint fair-value estimate from a two-sided book. */
export function midpoint({ bid, ask }: { bid: number; ask: number }): number {
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask >= 1 || bid > ask) {
    throw new Error(`invalid book: bid ${bid} ask ${ask}`);
  }
  return (bid + ask) / 2;
}

/** Expected value per contract for a claimed win probability against a cost. */
export function evPerContract({ probability, cost }: { probability: number; cost: number }): number {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error(`invalid probability: ${probability}`);
  }
  if (!Number.isFinite(cost) || cost <= 0 || cost >= 1) throw new Error(`invalid cost: ${cost}`);
  return probability - cost;
}

/** Decimal-odds conversions, for reading external bookmaker lines. */
export function priceToDecimalOdds(price: number): number {
  if (!(price > 0 && price < 1)) throw new Error(`invalid price: ${price}`);
  return 1 / price;
}
export function decimalOddsToPrice(odds: number): number {
  if (!(odds > 1)) throw new Error(`invalid odds: ${odds}`);
  return 1 / odds;
}

// Hoisted below the exports it supports — see the module-detection note above.
function assertPrices(ps: readonly number[]): void {
  if (!Array.isArray(ps) || ps.length < 2) throw new Error('need >= 2 prices');
  for (const p of ps) if (!Number.isFinite(p) || p <= 0 || p >= 1) throw new Error(`invalid price: ${p}`);
}
