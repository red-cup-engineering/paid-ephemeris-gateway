/**
 * The four Caillois regimes as a structural classifier.
 *
 * Roger Caillois (1958) disaggregated play into four modes — *agon*
 * (competition), *alea* (chance), *mimicry* (simulation / role), *ilinx*
 * (vertigo) — and the corpus pins each mode to a specific algebraic phenomenon
 * of the dialogical-game substrate (cultural-ludic embedding journal,
 * 2026-05-24, correspondence list): "agon-heavy plays correspond to
 * $\odot$-composition-dominated configurations, alea-heavy plays to
 * non-confluence-dominated configurations, mimicry-heavy plays to
 * fiber-assumption-dominated configurations, ilinx-heavy plays to
 * settlement-cascade-dominated configurations."
 *
 * Read off the *arena* (a polarized prime event structure with a symmetry
 * groupoid), those four phenomena have structural shadows:
 *
 *   - **agon** — competition under formal equality.  Agon is the mode whose
 *     action "originates in the player's own capacity" (corpus, terms/agon),
 *     realized as *symmetric $\odot$-composition against a shared situation*.
 *     Its structural shadow is **balanced Player/Opponent polarity**: the board
 *     is a fair contest exactly when positive and negative events are evenly
 *     matched.
 *   - **alea** — chance, the outcome "coming from outside the player" (corpus,
 *     terms/alea), realized as *non-confluence*.  Its structural shadow is
 *     **conflict-branching**: the more pairs of events are in conflict ($\#$),
 *     the more the running game forks into incompatible futures.
 *   - **mimicry** — becoming-other, "the interest lies in transformation"
 *     (corpus, terms/mimicry), realized as *fiber-assumption*.  Its structural
 *     shadow is a **rich symmetry groupoid**: the more relabelings the arena
 *     admits, the more freely a play may put on another's mask.
 *   - **ilinx** — vertigo, "the temporary disruption of stable perception"
 *     (corpus, terms/ilinx), realized as a *settlement cascade*.  Its
 *     structural shadow is **deep causality**: a long chain of forced
 *     dependencies is a long fall before the play settles.
 *
 * Each score is an exact `Rational` in $[0, 1]$ so the four — living on four
 * different structural axes — are commensurable and a dominant regime is
 * well-defined.  We classify the arena, not a single play: the arena is the
 * board, and its mode is a weighted blend (corpus: "every play is some weighted
 * combination of them").
 */

import {
  type Arena,
  arenaEvents,
} from "../index.mjs";
import {
  ratCompare,
  type Rational,
} from "@emsenn/relating";
import { fromRatio } from "@emsenn/relating/codecs";

export type RegimeName = "agon" | "alea" | "mimicry" | "ilinx";

/** The four Caillois regimes, in Caillois's canonical order. */
export const regimeNames = (): readonly RegimeName[] =>
  Object.freeze(["agon", "alea", "mimicry", "ilinx"] as const);

export interface RegimeScores {
  readonly kind: "game-analysis.regime.scores";
  readonly arena: Arena;
  /** Balanced Player/Opponent polarity — competition under formal equality. */
  readonly agon: Rational;
  /** Conflict-branching density — chance / non-confluence. */
  readonly alea: Rational;
  /** Symmetry-groupoid richness — fiber-assumption / becoming-other. */
  readonly mimicry: Rational;
  /** Causal depth — vertigo / settlement cascade. */
  readonly ilinx: Rational;
}

/** Reflexive-transitive depth of the longest causal chain below `id`. */
const longestChainTo = (
  causality: readonly (readonly [string, string])[],
  id: string,
  memo: Map<string, number>,
): number => {
  const seen = memo.get(id);
  if (seen !== undefined) return seen;
  // Guard against cycles in malformed input: mark in-progress as depth 1.
  memo.set(id, 1);
  let best = 1;
  for (const [from, to] of causality) {
    if (to === id && from !== id) {
      best = Math.max(best, 1 + longestChainTo(causality, from, memo));
    }
  }
  memo.set(id, best);
  return best;
};

/**
 * Agon score — balanced polarity.  With $p$ positive and $n$ negative events
 * over a total of $p + n$, the imbalance is $|p - n| / (p + n)$ and agon is its
 * complement: $1$ at a perfectly even contest, $0$ when one polarity holds the
 * whole board.  An empty arena scores $0$ (no contest is staged).
 */
export function agonScore(arena: Arena): Rational {
  const events = arenaEvents(arena);
  const total = events.length;
  if (total === 0) return fromRatio(0, 1);
  let positive = 0;
  let negative = 0;
  for (const e of events) {
    if (e.polarity.name === "positive") positive += 1;
    else negative += 1;
  }
  const imbalance = Math.abs(positive - negative);
  return fromRatio(total - imbalance, total);
}

/**
 * Alea score — conflict-branching density.  Among the $\binom{m}{2}$ unordered
 * pairs of events, the fraction that stand in conflict ($\#$) measures how far
 * the board forks into incompatible futures (non-confluence).  Fewer than two
 * events admit no branching, so the score is $0$.
 */
export function aleaScore(arena: Arena): Rational {
  const events = arenaEvents(arena);
  const m = events.length;
  if (m < 2) return fromRatio(0, 1);
  const maxPairs = (m * (m - 1)) / 2;
  // Conflict edges are stored once (symmetric); count distinct unordered pairs.
  const seen = new Set<string>();
  for (const [a, b] of arena.structure.conflict) {
    if (a === b) continue;
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    seen.add(key);
  }
  return fromRatio(seen.size, maxPairs);
}

/**
 * Mimicry score — symmetry-groupoid richness.  A discrete arena carries only
 * the identity symmetry (one bijection): no mask to put on, score $0$.  Each
 * further symmetry the arena admits is another relabeling under which a play
 * may become other; the monotone-in-size measure $1 - 1/|{\rm Sym}|$ rises from
 * $0$ toward $1$ as the groupoid grows.
 */
export function mimicryScore(arena: Arena): Rational {
  const size = arena.symmetry.length;
  if (size <= 1) return fromRatio(0, 1);
  return fromRatio(size - 1, size);
}

/**
 * Ilinx score — causal depth.  The longest chain in the causal order, divided
 * by the event count, measures how deep the forced fall runs before the play
 * settles: a flat board (every event minimal) has chain length $1$ and scores
 * near $0$; a single long causal thread scores near $1$.  An empty arena scores
 * $0$.
 */
export function ilinxScore(arena: Arena): Rational {
  const events = arenaEvents(arena);
  const total = events.length;
  if (total === 0) return fromRatio(0, 1);
  const causality = arena.structure.causality;
  const memo = new Map<string, number>();
  let deepest = 1;
  for (const e of events) {
    deepest = Math.max(deepest, longestChainTo(causality, e.id, memo));
  }
  return fromRatio(deepest, total);
}

export interface RegimeClassification {
  readonly kind: "game-analysis.regime.classification";
  readonly scores: RegimeScores;
  /** The highest-scoring regime; ties break in Caillois's canonical order. */
  readonly dominant: RegimeName;
  /** The dominant score. */
  readonly dominantScore: Rational;
  /** True when at least two regimes tie for the maximum score. */
  readonly tied: boolean;
}

/** The four structural scores of an arena, each an exact `Rational` in $[0,1]$. */
export function regimeScores(arena: Arena): RegimeScores {
  return Object.freeze({
    kind: "game-analysis.regime.scores" as const,
    arena,
    agon: agonScore(arena),
    alea: aleaScore(arena),
    mimicry: mimicryScore(arena),
    ilinx: ilinxScore(arena),
  });
}

/**
 * Classify the dominant Caillois regime of an arena.  Because all four scores
 * are `Rational` in $[0, 1]$, the argmax is meaningful; ties (a perfectly
 * blended board, or a trivial arena scoring $0$ on every axis) break in
 * Caillois's canonical order agon < alea < mimicry < ilinx and are flagged.
 */
export function classifyRegime(arena: Arena): RegimeClassification {
  const scores = regimeScores(arena);
  const ranked: readonly (readonly [RegimeName, Rational])[] = [
    ["agon", scores.agon],
    ["alea", scores.alea],
    ["mimicry", scores.mimicry],
    ["ilinx", scores.ilinx],
  ];
  let dominant: RegimeName = "agon";
  let dominantScore: Rational = scores.agon;
  let maxima = 1;
  for (const [name, score] of ranked) {
    const cmp = ratCompare(score, dominantScore);
    if (cmp > 0) {
      dominant = name;
      dominantScore = score;
      maxima = 1;
    } else if (cmp === 0 && name !== dominant) {
      maxima += 1;
    }
  }
  return Object.freeze({
    kind: "game-analysis.regime.classification" as const,
    scores,
    dominant,
    dominantScore,
    tied: maxima > 1,
  });
}
