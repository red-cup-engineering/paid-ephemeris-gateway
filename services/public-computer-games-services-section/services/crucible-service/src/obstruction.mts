/**
 * `obstruction` — THE thin, honest wrapper around `@lenticule-science/metrologic/obstruction`.
 *
 * This is the ONE file in this service that imports `@lenticule-science/metrologic/...` — every other module
 * reaches the real obstruction math only through the functions this file exports. That keeps the
 * dependency surface minimal and in one place, per ANATOMY digest.
 *
 * ## What is literal math, and what is game-authored, stated plainly (onestone's DESIGN.md
 * doctrine: "the math is load-bearing, and honestly labeled")
 *
 * There are, per the MATH digest, two unrelated things both called "H1" in `@lenticule-science/metrologic`:
 *
 *   - `obstruction/cochain`'s `cohomologyOfRelation` — the SPATIAL H¹ (first Betti number / cycle
 *     rank) of the bond graph, computed by real union-find over the tangle's actual bonds. This
 *     is LITERAL: `spatialH1Rank` below calls it directly on the tangle's real edge list. No part
 *     of this number is invented by the game.
 *
 *   - `obstruction/settling`'s `h1`/`classify`/`depth` — the TEMPORAL firing cohomology of a
 *     settling (a monotone stage sequence). A plain bilattice floor descent can only ever land in
 *     the `finite` regime (the package's own doc comment; confirmed empirically in the worked
 *     examples) — `settle()` will never hand a game a `scott`/`transfinite`/`aperiodic` reading
 *     "for free". Per MATH digest gap #3, the non-finite regimes have to be AUTHORED AS DATA: a
 *     stage sequence built directly with `settling(stages, {cofinal})`, deciding which cells
 *     first appear at a declared limit stage. That authoring is entirely this game's integration
 *     work (MATH digest gap #4: "nothing in the package knows about merge/split/rebond/catalyze").
 *
 *     Once a settling is built, `classify`/`h1`/`depth` are called for real and read back
 *     literally — the regime, depth, and temporal-H1-rank in every `MoveCost` are genuine
 *     `@lenticule-science/metrologic` output on the settling this file constructs, not numbers chosen by hand.
 *     What is game-authored is the STRUCTURE of the stage sequence per move verb (how many
 *     stages, whether a limit stage occurs, which cells appear there) — that structure encodes
 *     the theme digest's chemistry (REBOND = associative/no connectivity drop = finite;
 *     forced SPLIT = dissociative/connectivity drops before recovering = transfinite; clean SPLIT
 *     = thermally-gated bounded reset = scott) as a deliberate design choice, exactly as MATH
 *     digest gap #3 says it must be.
 *
 * ## The gap-1 mitigation (MATH digest: `settling()` is O(stages x cells^2)-ish)
 *
 * Every settling built here is LOCAL to one move: two to three stages, one to four cells. This
 * service never constructs a settling over a whole game session or a whole tangle's move
 * history — `classify`/`h1` on a settling this size is sub-millisecond, per the measured
 * benchmarks. Global "is the whole tangle settled" state is read via `spatialH1Rank` over the
 * bond graph instead (cheap up to low thousands of cells per MATH digest §2; a daily tangle has
 * a few dozen).
 *
 * ## The cost formula
 *
 * `energy = REGIME_MULT[regime] * (1 + depth) + GENERATOR_WEIGHT * temporalH1 + SPATIAL_WEIGHT *
 * spatialH1`, with `REGIME_MULT = {finite:1, scott:2, transfinite:4, aperiodic:8}`,
 * `GENERATOR_WEIGHT = 3`, `SPATIAL_WEIGHT = 5` — MATH digest's proposed formula, unchanged. These
 * weights are tunable game-design constants; no worked example or README in `@lenticule-science/metrologic`
 * prescribes a canonical scalarization, so this is this game's own choice, stated as such.
 */
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { settling, classify, h1 } from '@lenticule-science/metrologic/obstruction/settling';
import type { Bond, Move, MoveCost } from './types.mts';

export const REGIME_MULT: Record<MoveCost['regime'], number> = {
  finite: 1,
  scott: 2,
  transfinite: 4,
  aperiodic: 8,
};
export const GENERATOR_WEIGHT = 3;
export const SPATIAL_WEIGHT = 5;

/** A settling, as `@lenticule-science/metrologic/obstruction/settling` wants it. */
type StageSpec = { designated: unknown[]; limit?: boolean };

/** The spatial H¹ (independent cycle count) of a bond list, read literally off
 * `cohomologyOfRelation` — real union-find cohomology over the tangle's actual edges, not a
 * hand-computed graph statistic. */
export function spatialH1Rank(bonds: readonly Bond[]): number {
  if (bonds.length === 0) return 0;
  const cells = bonds.map((b) => ({ subject: b.a, predicate: 'bond', object: b.b }));
  return cohomologyOfRelation(cells).H1.rank;
}

/** The spatial H¹ of just the bonds touching `claimId` or one of its direct neighbors (a 2-hop
 * neighborhood) — used for CATALYZE's cost, which per the theme digest's own account is never
 * actually free: "the enzyme is not consumed" is true only on a projection; the real cost lands
 * on a complement carrier. Here that complement carrier is modeled as the local cycle structure
 * around the catalyst, read by the same real `cohomologyOfRelation` call, just scoped to a small
 * subgraph rather than the whole tangle. */
export function localSpatialH1Rank(bonds: readonly Bond[], claimId: string): number {
  const directNeighbors = new Set<string>([claimId]);
  for (const b of bonds) {
    if (b.a === claimId) directNeighbors.add(b.b);
    if (b.b === claimId) directNeighbors.add(b.a);
  }
  const local = bonds.filter((b) => directNeighbors.has(b.a) && directNeighbors.has(b.b));
  return spatialH1Rank(local);
}

function classifyAndCost(stages: StageSpec[], opts: { cofinal?: 'uncountable' } | undefined, spatialRank: number): MoveCost {
  const v = settling(stages, opts);
  const cls = classify(v);
  const temporal = h1(v);
  const cost =
    REGIME_MULT[cls.regime] * (1 + cls.depth) + GENERATOR_WEIGHT * temporal.rank + SPATIAL_WEIGHT * spatialRank;
  return { cost, regime: cls.regime, depth: cls.depth, temporalH1: temporal.rank, spatialH1: spatialRank };
}

/**
 * The cost of one move, given the bond list the move produces (`afterBonds`) and, for CATALYZE
 * only, the spatial term is scoped to the catalyst claim's local neighborhood rather than the
 * whole tangle (see `localSpatialH1Rank`'s doc). `engine.mts` computes `afterBonds` by applying
 * the move's edit to the tangle's bond list; this function never mutates or re-derives that edit
 * — it only prices it.
 */
export function costOfMove(move: Move, afterBonds: readonly Bond[]): MoveCost {
  switch (move.verb) {
    case 'merge': {
      // Thiol-ene addition: one irreversible successor firing, no limit stage -> finite, depth 0.
      const cellId = `merge:${move.a}-${move.b}`;
      const stages: StageSpec[] = [{ designated: [cellId] }];
      return classifyAndCost(stages, undefined, spatialH1Rank(afterBonds));
    }
    case 'rebond': {
      // Disulfide exchange (associative): the witness leaves, then the new bond arrives — two
      // ordinary successor firings, connectivity never drops mid-move -> finite, depth 1.
      const leaveCell = `leave:${move.bondId}`;
      const arriveCell = `arrive:${move.bondId}->${move.toClaimId}`;
      const stages: StageSpec[] = [{ designated: [leaveCell] }, { designated: [leaveCell, arriveCell] }];
      return classifyAndCost(stages, undefined, spatialH1Rank(afterBonds));
    }
    case 'split': {
      if (move.mode === 'clean') {
        // Retro-Diels-Alder: catalyst-free, thermally gated, a bounded approach to a limit with
        // nothing new firing there -> Scott-continuous closure (scott regime), depth 0.
        const breakCell = `break:${move.bondId}`;
        const stages: StageSpec[] = [{ designated: [breakCell] }, { designated: [breakCell], limit: true }];
        return classifyAndCost(stages, undefined, spatialH1Rank(afterBonds));
      }
      // Forced (thermal homolysis): no third party attends the break; connectivity drops before
      // it recovers, witnessed only at the limit -> a non-Scott-continuous firing -> transfinite.
      const gapCell = `gap:${move.bondId}`;
      const reformA = `reform:${move.bondId}:a`;
      const reformB = `reform:${move.bondId}:b`;
      const stages: StageSpec[] = [
        { designated: [gapCell] },
        { designated: [gapCell, reformA, reformB], limit: true },
      ];
      return classifyAndCost(stages, undefined, spatialH1Rank(afterBonds));
    }
    case 'catalyze': {
      // Catalysis proper: the catalyst is regenerated (T-invariant) -> one successor firing,
      // finite, depth 0 -- but the cost is never truly free: the spatial term is charged against
      // the catalyst's local neighborhood, the "complement carrier" the theme digest describes.
      const cellId = `catalyze:${move.claimId}@${move.bondId}`;
      const stages: StageSpec[] = [{ designated: [cellId] }];
      return classifyAndCost(stages, undefined, localSpatialH1Rank(afterBonds, move.claimId));
    }
  }
}
