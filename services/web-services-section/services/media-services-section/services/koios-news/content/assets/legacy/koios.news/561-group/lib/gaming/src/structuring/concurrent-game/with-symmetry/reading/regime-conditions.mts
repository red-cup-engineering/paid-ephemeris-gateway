/**
 * The defining *condition* of each Caillois regime as a witness/obstruction.
 *
 * `regime.mts` scores all four modes commensurably and names a dominant one.
 * This module refines that picture: it asks, for each regime, whether the
 * regime's *necessary condition* — the structural feature without which the
 * mode is not genuinely present — actually **holds**.  A board can score
 * non-zero agon yet fail agon's necessary condition (formal equality); the
 * score measures *how much*, the condition judges *whether at all*.  Each
 * condition is grounded in its 2026-05-24 regime journal:
 *
 *   - **agon — formal equality / fairness.**  Agon's fairness is the symmetry
 *     of the twist-product fusion ($v_A \odot v_B = v_B \odot v_A$); "agon
 *     requires formal equality of starting conditions" is the algebraic
 *     statement that the algebra does not privilege one party (agon journal,
 *     fairness theorem and its corollary).  Its structural shadow on the arena
 *     is **perfectly balanced Player/Opponent polarity**: the contest is fair
 *     exactly when positive and negative events are evenly matched, neither
 *     side holding predicates the other lacks.  (We do *not* look in the
 *     symmetry groupoid: those bijections are polarity-preserving relabelings,
 *     not the player-exchanging $\mathbf{Z}/2$ swap of the fairness theorem.)
 *   - **alea — genuine indeterminacy.**  Alea is *non-confluence*: from one
 *     starting commitment, multiple incomparable normal forms (alea journal,
 *     (Al1)–(Al3)).  Its structural shadow is the **presence of conflict**:
 *     at least one pair of events stands in conflict ($\#$), so the running
 *     game forks into incompatible futures.  (This is the same condition as
 *     embedding image-condition (I4) — non-trivial bypass-cone structure;
 *     `cultural-embedding.mts` shares it.)
 *   - **mimicry — identity / fiction boundary.**  Mimicry is *fiber-assumption*
 *     with a *navigable* enter/exit boundary — the double consciousness, the
 *     witness simultaneously holding their own and an assumed fiber (mimicry
 *     journal, double-consciousness theorem).  Its structural shadow is a
 *     **non-identity symmetry**: a relabeling under which a play may put on
 *     another's mask.  Here the symmetry groupoid *is* the right structure.
 *   - **ilinx — reversibility.**  Ilinx is a *settlement cascade* that is
 *     playful only when **reversible** — the cascade settles, the spin ends,
 *     stability returns; an irreversible cascade is injury, not play (ilinx
 *     journal, (I3) and the play-vs-injury theorem).  Reversibility is read off
 *     an *interaction*, not the arena alone: the cascade is reversible exactly
 *     when it settles into the Daimon $\dagger$ (convergence).  This condition
 *     therefore takes two dual designs, not an arena — a faithful asymmetry.
 *
 * All four reuse the existing measures verbatim (`agonScore`, `aleaScore`,
 * `mimicryScore`, and the `cascade` settling judgment); a condition is the
 * *threshold* reading of a score, not a new computation.
 */

import {
  type Arena,
  type Design,
  type PolarityName,
} from "../index.mjs";
import {
  ratCompare,
} from "@emsenn/relating";
import { fromRatio } from "@emsenn/relating/codecs";
import {
  agonScore,
  aleaScore,
  mimicryScore,
} from "./regime.mjs";
import {
  cascadeLength,
  type CascadeJudgment,
} from "./cascade.mjs";

/** Agon's necessary condition holds — the board is a fair, formally-equal contest. */
export interface AgonFairnessWitness {
  readonly kind: "game-analysis.agonFairness:witness";
  readonly arena: Arena;
  /** Count of positive (Player) events. */
  readonly positive: number;
  /** Count of negative (Opponent) events. */
  readonly negative: number;
}

export interface AgonFairnessObstruction {
  readonly kind: "game-analysis.agonFairness-obstruction";
  readonly arena: Arena;
  /** `empty-board` — no contest is staged; `imbalanced` — one polarity dominates. */
  readonly reason: "empty-board" | "imbalanced";
  /** The polarity holding the majority of the board, when `imbalanced`. */
  readonly dominant: PolarityName | null;
  readonly positive: number;
  readonly negative: number;
}

export type AgonFairnessJudgment = AgonFairnessWitness | AgonFairnessObstruction;

/**
 * Judge agon's necessary condition: *formal equality of starting conditions*,
 * realized as perfectly balanced Player/Opponent polarity (agon journal,
 * fairness corollary).  The condition holds exactly when `agonScore` is $1$ —
 * equal numbers of positive and negative events — so the algebra does not
 * privilege either party.  An empty board stages no contest; an imbalanced
 * board names the dominant polarity as the obstruction.
 */
export function agonFairness(arena: Arena): AgonFairnessJudgment {
  let positive = 0;
  let negative = 0;
  for (const e of arena.structure.events) {
    if (e.polarity.name === "positive") positive += 1;
    else negative += 1;
  }
  if (positive + negative === 0) {
    return Object.freeze({
      kind: "game-analysis.agonFairness-obstruction" as const,
      arena,
      reason: "empty-board" as const,
      dominant: null,
      positive,
      negative,
    });
  }
  // Fairness IS agonScore = 1 (perfect balance); reuse the existing measure.
  if (ratCompare(agonScore(arena), fromRatio(1, 1)) === 0) {
    return Object.freeze({
      kind: "game-analysis.agonFairness:witness" as const,
      arena,
      positive,
      negative,
    });
  }
  return Object.freeze({
    kind: "game-analysis.agonFairness-obstruction" as const,
    arena,
    reason: "imbalanced" as const,
    dominant: positive > negative ? ("positive" as const) : ("negative" as const),
    positive,
    negative,
  });
}

/** Agon's fairness condition holds in the arena. */
export const isAgonFair = (arena: Arena): boolean =>
  agonFairness(arena).kind === "game-analysis.agonFairness:witness";

/** Alea's necessary condition holds — the board admits genuine indeterminacy. */
export interface AleaIndeterminacyWitness {
  readonly kind: "game-analysis.aleaIndeterminacy:witness";
  readonly arena: Arena;
  /** Number of distinct conflict pairs — the forks into incompatible futures. */
  readonly conflicts: number;
}

export interface AleaIndeterminacyObstruction {
  readonly kind: "game-analysis.aleaIndeterminacy-obstruction";
  readonly arena: Arena;
  /** `confluent` — no conflict pair, so the trajectory is determined (no alea). */
  readonly reason: "confluent";
}

export type AleaIndeterminacyJudgment =
  | AleaIndeterminacyWitness
  | AleaIndeterminacyObstruction;

/** Count distinct unordered conflict pairs (conflict is symmetric, stored once). */
const conflictPairCount = (arena: Arena): number => {
  const seen = new Set<string>();
  for (const [a, b] of arena.structure.conflict) {
    if (a === b) continue;
    seen.add(a < b ? `${a} ${b}` : `${b} ${a}`);
  }
  return seen.size;
};

/**
 * Judge alea's necessary condition: *genuine indeterminacy*, realized as
 * non-confluence — the presence of conflict, so the running game forks into
 * incomparable futures (alea journal, (Al1)–(Al3)).  The condition holds
 * exactly when at least one conflict pair exists, equivalently `aleaScore > 0`.
 * A confluent board (no conflict) has a determined trajectory and hosts no
 * alea — this is also the failure of embedding image-condition (I4).
 */
export function aleaIndeterminacy(arena: Arena): AleaIndeterminacyJudgment {
  const conflicts = conflictPairCount(arena);
  // Indeterminacy IS aleaScore > 0 (some conflict fork); reuse the measure.
  if (conflicts > 0 && ratCompare(aleaScore(arena), fromRatio(0, 1)) > 0) {
    return Object.freeze({
      kind: "game-analysis.aleaIndeterminacy:witness" as const,
      arena,
      conflicts,
    });
  }
  return Object.freeze({
    kind: "game-analysis.aleaIndeterminacy-obstruction" as const,
    arena,
    reason: "confluent" as const,
  });
}

/** Alea's indeterminacy condition holds in the arena. */
export const isAleaIndeterminate = (arena: Arena): boolean =>
  aleaIndeterminacy(arena).kind === "game-analysis.aleaIndeterminacy:witness";

/** Mimicry's necessary condition holds — a navigable identity boundary exists. */
export interface MimicryBoundaryWitness {
  readonly kind: "game-analysis.mimicryBoundary:witness";
  readonly arena: Arena;
  /** Size of the symmetry groupoid — the masks (including identity) available. */
  readonly symmetries: number;
}

export interface MimicryBoundaryObstruction {
  readonly kind: "game-analysis.mimicryBoundary-obstruction";
  readonly arena: Arena;
  /** `identity-only` — the arena carries only the identity symmetry, so there
   *  is no mask to assume and no fiction boundary to navigate. */
  readonly reason: "identity-only";
}

export type MimicryBoundaryJudgment =
  | MimicryBoundaryWitness
  | MimicryBoundaryObstruction;

/**
 * Judge mimicry's necessary condition: a navigable *identity / fiction
 * boundary*, realized as the existence of a non-identity symmetry — a
 * relabeling under which a play may put on another's mask (mimicry journal,
 * double-consciousness theorem; the symmetry groupoid is the right structure).
 * The condition holds exactly when the groupoid has more than the identity
 * bijection, equivalently `mimicryScore > 0`.  A discrete arena carries only
 * identity: no mask, no boundary to cross.
 */
export function mimicryBoundary(arena: Arena): MimicryBoundaryJudgment {
  const symmetries = arena.symmetry.length;
  // A navigable boundary IS mimicryScore > 0 (a non-identity mask exists).
  if (symmetries > 1 && ratCompare(mimicryScore(arena), fromRatio(0, 1)) > 0) {
    return Object.freeze({
      kind: "game-analysis.mimicryBoundary:witness" as const,
      arena,
      symmetries,
    });
  }
  return Object.freeze({
    kind: "game-analysis.mimicryBoundary-obstruction" as const,
    arena,
    reason: "identity-only" as const,
  });
}

/** Mimicry's identity-boundary condition holds in the arena. */
export const hasMimicryBoundary = (arena: Arena): boolean =>
  mimicryBoundary(arena).kind === "game-analysis.mimicryBoundary:witness";

/**
 * Judge ilinx's necessary condition: *reversibility* — the play-vs-injury
 * distinction (ilinx journal, (I3) and the reversibility theorem).  Playful
 * vertigo's cascade is reversible: it settles, stability returns.  An
 * irreversible cascade is injury, not play.  Reversibility is read off an
 * *interaction* of two dual designs, not the arena alone: the cascade is
 * reversible exactly when it settles into the Daimon $\dagger$ (convergence).
 * This is precisely the settling judgment of `cascade.mts` — the cascade
 * *witness* is the reversible (playful) case, the *obstruction* the
 * irreversible (no settled bottom to fall to) case.
 */
export function ilinxReversibility(d1: Design, d2: Design): CascadeJudgment {
  return cascadeLength(d1, d2);
}

/** Ilinx's reversibility condition holds — the cascade settles into the Daimon. */
export const isIlinxReversible = (d1: Design, d2: Design): boolean =>
  ilinxReversibility(d1, d2).kind === "game-analysis.cascade:witness";

/**
 * The three *arena-readable* regime conditions in one carrier — agon's
 * fairness, alea's indeterminacy, mimicry's boundary.  Ilinx's reversibility is
 * deliberately excluded: it needs an interaction (two designs), not an arena,
 * and is judged separately by `ilinxReversibility`.
 */
export interface RegimeConditions {
  readonly kind: "game-analysis.regimeConditions";
  readonly arena: Arena;
  readonly agonFairness: AgonFairnessJudgment;
  readonly aleaIndeterminacy: AleaIndeterminacyJudgment;
  readonly mimicryBoundary: MimicryBoundaryJudgment;
}

/** Judge the three arena-readable regime conditions of an arena at once. */
export function regimeConditions(arena: Arena): RegimeConditions {
  return Object.freeze({
    kind: "game-analysis.regimeConditions" as const,
    arena,
    agonFairness: agonFairness(arena),
    aleaIndeterminacy: aleaIndeterminacy(arena),
    mimicryBoundary: mimicryBoundary(arena),
  });
}
