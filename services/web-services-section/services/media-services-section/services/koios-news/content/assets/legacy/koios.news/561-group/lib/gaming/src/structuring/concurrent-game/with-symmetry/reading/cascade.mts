/**
 * The settlement cascade — ilinx as iterated interaction depth.
 *
 * Ilinx (Caillois) is "play structured around vertigo — the temporary
 * disruption of stable perception" (corpus, terms/ilinx), realized on the
 * dialogical-game substrate as a *settlement cascade* (cultural-ludic embedding
 * journal: "ilinx-heavy plays to settlement-cascade-dominated configurations").
 * Where `regime.mts` reads ilinx structurally off the arena's causal depth,
 * this module measures the *actual* cascade of an interaction: how far the play
 * falls — how many meeting loci it descends through — before it settles into
 * the Daimon $\dagger$ (convergence).
 *
 * The depth is read off the interaction normal form of two dual designs.  We
 * reuse `interactionReport` (the per-locus meeting of the designs) and
 * `convergenceJudgment` (whether the join reaches a $\top$-collision) from the
 * cores verbatim — the cascade is not a new interaction, it is a *measurement*
 * of one.  The Daimon loci are the give-up points; `locusDepth` measures how
 * deep in the locus tree the deepest fall lands.  A long cascade is a long
 * vertiginous descent — the algebraic shadow of ilinx.
 */

import {
  type Design,
  type Locus,
  interactionReport,
  locusDepth,
} from "../index.mjs";
import {
  convergenceJudgment,
} from "../ludicizing/settling/index.mjs";

export interface CascadeWitness {
  readonly kind: "game-analysis.cascade:witness";
  /** Total number of meeting loci the interaction descends through. */
  readonly meetings: number;
  /** Number of Daimon ($\top$) collisions — the settle points. */
  readonly daimonCount: number;
  /** Depth in the locus tree of the deepest Daimon collision — the fall's reach. */
  readonly length: number;
  /** The deepest Daimon locus, where the play settles. */
  readonly settlesAt: Locus;
}

export interface CascadeObstruction {
  readonly kind: "game-analysis.cascade-obstruction";
  /** `no-meeting` — the designs never meet; `no-daimon` — they meet but never
   *  settle into $\top$, so the cascade diverges (no vertigo, no bottom). */
  readonly reason: "no-meeting" | "no-daimon";
  /** Meeting loci reached before divergence (0 when the designs never meet). */
  readonly meetings: number;
}

export type CascadeJudgment = CascadeWitness | CascadeObstruction;

/**
 * Measure the settlement cascade of an interaction between two dual designs.
 * The interaction converges (a witness) exactly when it reaches the Daimon;
 * `length` is then the locus-tree depth of the deepest $\top$-collision — the
 * vertigo's reach.  Divergence (no meeting, or meeting without a Daimon) is an
 * obstruction: there is no settled bottom to fall to.
 */
export function cascadeLength(d1: Design, d2: Design): CascadeJudgment {
  const report = interactionReport(d1, d2);
  const meetings = report.meetings.length;
  const convergence = convergenceJudgment(d1, d2);
  if (convergence.kind === "game.convergence-obstruction") {
    return Object.freeze({
      kind: "game-analysis.cascade-obstruction" as const,
      reason: convergence.reason,
      meetings,
    });
  }
  const daimonLoci = convergence.daimonLoci;
  // Convergence guarantees at least one Daimon locus; fold to the deepest.
  let settlesAt: Locus = daimonLoci[0]!;
  let length = locusDepth(settlesAt);
  for (const xi of daimonLoci) {
    const depth = locusDepth(xi);
    if (depth > length) {
      length = depth;
      settlesAt = xi;
    }
  }
  return Object.freeze({
    kind: "game-analysis.cascade:witness" as const,
    meetings,
    daimonCount: daimonLoci.length,
    length,
    settlesAt,
  });
}

/** Whether the interaction settles into the Daimon — has a finite cascade. */
export const settles = (d1: Design, d2: Design): boolean =>
  cascadeLength(d1, d2).kind === "game-analysis.cascade:witness";
