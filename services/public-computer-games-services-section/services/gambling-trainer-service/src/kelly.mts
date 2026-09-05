/**
 * `kelly` — VENDORED, typed near-verbatim port of
 * `science-services-section/philosophy-services-section/relationality-services-section/agency-services-section/being-services-section/doing-services-section/playing-services-section/gaming-services-section/gambling-services-section/src/kelly.mjs`
 * (house library, published to Verdaccio as `@lenticule-science/gambling-services-section`).
 *
 * Why a vendored copy and not a live `npm install`, per the house's vendor-not-import doctrine
 * (`house-specification-standard.md`, "Vendor a copy, not a cross-service import" — the same
 * discipline `onestone-service/src/ledger.mts` documents as a port of
 * `flickering-delve-service/src/ledger.mts`):
 *
 *   1. This service's dependencies are restricted to pinned `@red-cup-engineering/*` packages
 *      from Verdaccio. The Kelly/odds library lives under the `@lenticule-science/*` scope, not
 *      `@red-cup-engineering/*` — a live dependency on it would violate that rule outright.
 *   2. Independent of (1): that package's own `package.json#exports` map only exposes the
 *      `./form` and `./confluence` subpaths today. `kelly.mjs` and `odds.mjs` — the two files
 *      this game actually needs — are present in its `src/` but are not exported subpaths, so
 *      they are not even resolvable as a subpath import without a fix on the library's own side.
 *
 * Both reasons point at the same house-doctrine answer: copy the specific pure functions in,
 * document the source file (this header), and keep the port small and dependency-free — exactly
 * what this file is. Nothing below changes the source's math or behavior; only the types are
 * new (the original is untyped `.mjs`).
 *
 * House rule this library states about itself, worth repeating here: the win probability `p` is
 * always the CALLER's estimate — its provenance and honesty are `wagers.mts`'s problem, not this
 * module's. Every output here is an advisory bankroll-fraction ceiling, a grading reference for
 * `engine.mts`'s `gradeStake`, never an auto-executed order (house pedagogy/ethics notes, digest
 * item 4).
 *
 * Vendor-parity test: `kelly.test.mts` runs the identical fixture cases as the source's own
 * `test/kelly.test.mjs`, so a future drift between the two copies fails CI here, not silently.
 */

// A leading `export` (below) must appear before any TypeScript-only syntax anywhere in this
// file: Node's `.mts` type-stripping module-detection heuristic classifies the whole file by its
// first parseable statement, and a bare (non-exported) typed function declared before the first
// `export`/`import` is misclassified as a CommonJS script, where type annotations are a syntax
// error under `node --check`. House files avoid this by always having an `import` first
// (`tangle.mts`); this file has no imports, so `assertProb`/`assertPrice` are ordinary hoisted
// function declarations placed after the first export instead — position-independent at runtime,
// load-bearing for `node --check`.

/** Full Kelly for a binary contract bought at cost `c` (fees folded into `c`) paying $1 on win:
 * `f* = (p - c) / (1 - c)`. Zero when there is no edge. */
export function kellyFraction({ probability, cost }: { probability: number; cost: number }): number {
  assertProb(probability);
  assertPrice(cost);
  return Math.max(0, (probability - cost) / (1 - cost));
}

/** Fee-adjusted convenience: effective cost = price + feePerContract. */
export function kellyForContract({
  probability,
  price,
  feePerContract = 0,
}: {
  probability: number;
  price: number;
  feePerContract?: number;
}): number {
  const cost = price + feePerContract;
  if (cost >= 1) return 0;
  return kellyFraction({ probability, cost });
}

/** Fractional Kelly (`lambda` in `(0,1]`) — the standard variance-reduction discipline; half-Kelly
 * gives ~3/4 of full-Kelly growth at half the variance. Optionally capped by a hard drawdown
 * ceiling: a bet loses at most its stake, so capping the fraction caps the per-bet drawdown. */
export function fractionalKelly({
  probability,
  cost,
  lambda = 0.5,
  maxLossFraction = 1,
}: {
  probability: number;
  cost: number;
  lambda?: number;
  maxLossFraction?: number;
}): number {
  if (!(lambda > 0 && lambda <= 1)) throw new Error(`invalid lambda: ${lambda}`);
  return Math.min(lambda * kellyFraction({ probability, cost }), maxLossFraction);
}

/** Expected log-growth per bet at fraction `f`: the quantity Kelly maximizes. Win multiplier
 * `1 + f(1-c)/c`, loss multiplier `1 - f`. */
export function expectedLogGrowth({
  probability,
  cost,
  fraction,
}: {
  probability: number;
  cost: number;
  fraction: number;
}): number {
  assertProb(probability);
  assertPrice(cost);
  if (!(fraction >= 0 && fraction < 1)) throw new Error(`invalid fraction: ${fraction}`);
  if (fraction === 0) return 0;
  return (
    probability * Math.log(1 + (fraction * (1 - cost)) / cost) + (1 - probability) * Math.log(1 - fraction)
  );
}

export interface StakeEdge {
  readonly probability: number;
  readonly cost: number;
  readonly [key: string]: unknown;
}

export interface ScaledStake extends StakeEdge {
  readonly fraction: number;
  readonly scaled: boolean;
}

/** Concurrent-edge allocation. HEURISTIC, stated plainly (source's own words, kept verbatim):
 * computes each edge's standalone fractional Kelly and rescales proportionally if the total
 * exceeds `maxTotalFraction`. This is NOT the joint Kelly optimum (which requires the joint
 * outcome distribution); it is the safe under-bet approximation for independent-ish simultaneous
 * edges. Kelly's Wager offers wagers one at a time, resolved before the next is offered — no real
 * simultaneity — so this function is vendored for completeness but is not exercised by
 * `engine.mts`'s per-wager grading path today; see DESIGN.md's vendoring note. */
export function simultaneousStakes<T extends StakeEdge>(
  edges: readonly T[],
  { lambda = 0.5, maxTotalFraction = 0.25, maxLossFraction = 1 }: { lambda?: number; maxTotalFraction?: number; maxLossFraction?: number } = {},
): ScaledStake[] {
  const stakes = edges.map((e) => ({
    ...e,
    fraction: fractionalKelly({ probability: e.probability, cost: e.cost, lambda, maxLossFraction }),
  }));
  const total = stakes.reduce((s, e) => s + e.fraction, 0);
  const scale = total > maxTotalFraction ? maxTotalFraction / total : 1;
  return stakes.map((e) => ({ ...e, fraction: e.fraction * scale, scaled: scale !== 1 }));
}

// Hoisted below the exports they support — see the module-detection note above.
function assertProb(p: number): void {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) throw new Error(`invalid probability: ${p}`);
}
function assertPrice(c: number): void {
  if (!Number.isFinite(c) || c <= 0 || c >= 1) throw new Error(`invalid price: ${c}`);
}
