/**
 * `tangle` — pure daily-tangle generation: seed -> reaction network.
 *
 * `spawnTangle(seed)` is a pure function of a seed string, using only `seed.mts`'s `Rng` — no
 * clock, no `Math.random()`, per house doctrine. Every player who resolves the same seed (a
 * specific date via `daily.mts`, or a shared/typed seed) gets the byte-identical tangle.
 *
 * Construction, by design (this is the load-bearing part of the "never emit an unwinnable
 * daily" guarantee `validate.mts` checks executably):
 *
 *   1. `claimCount` claims are spawned.
 *   2. A random spanning tree is built over them and seated as `pinned` bonds — pinned bonds are
 *      declared "settled and immovable" (theme digest) and no move may ever touch them. Because
 *      it is a *tree*, no pinned bond can ever lie on a cycle.
 *   3. `extraBondCount` further bonds are added between claims that are not yet directly
 *      bonded, seated as `exchangeable`. Each such bond closes exactly one new independent
 *      cycle in the graph (adding one edge between two already-connected vertices raises the
 *      cycle rank — the spatial H¹ read by `@lenticule-science/metrologic/obstruction/cochain` — by exactly
 *      one), and, because it touches only claims already joined by the pinned spanning tree,
 *      that cycle's resolution never requires touching a pinned bond.
 *
 * The result: the tangle's initial spatial H¹ equals `extraBondCount` exactly, and every one of
 * those independent cycles has at least one `exchangeable` (never `pinned`, never
 * `compliant-permanent`) edge on it — the exact structural property `validate.mts`'s
 * solvability test exploits to build a certified solving sequence at spawn time.
 */
import { makeRng, type Rng } from './seed.mts';
import type { Tangle, Claim, Bond, BondGeometry } from './types.mts';

/** Claim count grows gently with the seed so dailies vary in size without ever leaving the
 * range `validate.mts`'s solver and the settling-construction cost model (MATH digest gap #1)
 * are known to be cheap over. */
const MIN_CLAIMS = 7;
const MAX_CLAIMS = 12;
const MIN_EXTRA_BONDS = 2;
const MAX_EXTRA_BONDS = 5;
/** Starting free-thiol reserve — MERGE and CATALYZE draw this down; REBOND does not. */
const BASE_FREE_RESERVE = 6;

function claimId(i: number): string {
  return `claim-${i}`;
}

function bondId(i: number): string {
  return `bond-${i}`;
}

/** Coordination-number-derived ossification readout — cosmetic only (see `types.mts`). Scaled
 * so an unbonded claim reads 0 and a well-bonded one (degree >= 4, the "ossified" zeolite
 * coordination number per the theme digest) reads 1. */
function phiFor(degree: number): number {
  return Math.max(0, Math.min(1, degree / 4));
}

/** Build a random spanning tree over `n` claims using `rng`, returned as `[parent, child][]`
 * edges — the classic "attach each new node to a uniformly random earlier node" construction,
 * which is trivially a tree (n - 1 edges, connected, acyclic) by induction. */
function randomSpanningTree(n: number, rng: Rng): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  for (let i = 1; i < n; i++) {
    const parent = rng.int(0, i - 1);
    edges.push([parent, i]);
  }
  return edges;
}

/** Pure: seed -> generated tangle. See module doc for the construction that guarantees the
 * result is always settleable within `energyBudget` (proven per-seed by `validate.mts`). */
export function spawnTangle(seed: string): Tangle {
  const rng = makeRng(seed);
  const claimCount = rng.int(MIN_CLAIMS, MAX_CLAIMS);
  const extraBondCount = rng.int(MIN_EXTRA_BONDS, MAX_EXTRA_BONDS);

  const claims: Claim[] = [];
  const degree = new Array<number>(claimCount).fill(0);
  const bonds: Bond[] = [];
  let nextBond = 0;

  const treeEdges = randomSpanningTree(claimCount, rng);
  const existing = new Set<string>();
  const edgeKey = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);

  for (const [i, j] of treeEdges) {
    const geometry: BondGeometry = rng.chance(0.5) ? 'panel' : 'hinge';
    bonds.push({ id: bondId(nextBond++), a: claimId(i), b: claimId(j), geometry, state: 'pinned' });
    existing.add(edgeKey(i, j));
    degree[i] = (degree[i] ?? 0) + 1;
    degree[j] = (degree[j] ?? 0) + 1;
  }

  // Add extra exchangeable bonds, each between two claims not yet directly bonded — each one
  // closes exactly one new independent cycle over the (already connected) spanning tree.
  let added = 0;
  let attempts = 0;
  const maxAttempts = extraBondCount * 50 + 100;
  while (added < extraBondCount && attempts < maxAttempts && claimCount >= 3) {
    attempts++;
    const i = rng.int(0, claimCount - 1);
    const j = rng.int(0, claimCount - 1);
    if (i === j) continue;
    const key = edgeKey(i, j);
    if (existing.has(key)) continue;
    existing.add(key);
    const geometry: BondGeometry = rng.chance(0.5) ? 'panel' : 'hinge';
    bonds.push({ id: bondId(nextBond++), a: claimId(i), b: claimId(j), geometry, state: 'exchangeable' });
    degree[i] = (degree[i] ?? 0) + 1;
    degree[j] = (degree[j] ?? 0) + 1;
    added++;
  }

  for (let i = 0; i < claimCount; i++) {
    claims.push({ id: claimId(i), phi: phiFor(degree[i] ?? 0) });
  }

  const partial: Tangle = {
    seed,
    claims,
    bonds,
    freeReserve: BASE_FREE_RESERVE,
    energyBudget: 0, // placeholder — the real budget is computed by validate.mts's certified
                      // solver and injected by the one place a Tangle is actually spawned for
                      // play (see `withCertifiedBudget` below); left at 0 here so a caller that
                      // skips certification gets an honestly-useless budget, not a fabricated one.
  };
  return partial;
}

/** Attach a real energyBudget to a tangle, computed by the caller (normally
 * `validate.mts#certifyTangle`) from an actual certified solving sequence — never a guess. Kept
 * as a separate pure setter so `spawnTangle` stays free of any dependency on `engine.mts` /
 * `obstruction.mts` (which would otherwise be a circular import: engine needs tangle, tangle
 * would need engine). */
export function withEnergyBudget(tangle: Tangle, energyBudget: number): Tangle {
  return { ...tangle, energyBudget };
}
