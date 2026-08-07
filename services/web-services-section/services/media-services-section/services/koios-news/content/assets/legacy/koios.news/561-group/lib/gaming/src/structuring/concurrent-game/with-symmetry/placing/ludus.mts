/**
 * The paidia<->ludus axis (Caillois 1958).
 *
 * Roger Caillois, *Man, Play, and Games* (1958), cuts across his four play
 * modes (agon, alea, mimicry, ilinx) with a single spectrum: from *paidia*
 * (free, unstructured, exuberant play — play before it becomes a game) to
 * *ludus* (rule-bound, structured, constrained play — play disciplined into a
 * game).  In the corpus this axis is structural: "paidia ↔ Scott-continuous
 * closure; ludus ↔ non-Scott-continuous … Sparse fiber → paidia (open-ended,
 * surprising); dense fiber → ludus (deterministic)"
 * (sociology/questions, girard-caillois-substrate-correspondence).
 *
 * On an event structure the same axis is the *density of causal order*.  A
 * structure all of whose events are concurrent (no causal constraints) is pure
 * paidia — every move is free, index $0$.  A structure that is a total order
 * (every move strictly sequenced) is pure ludus — every move is rule-bound,
 * index $1$.  The `ludusIndex` measures where a structure sits: the fraction of
 * event pairs that are causally comparable, computed exactly as a Rational.
 *
 * Conflict pairs are counted in the denominator (all pairs), not as comparable:
 * a conflict is an *exclusion*, not a sequencing rule, so it reads as freedom,
 * not constraint.  (A total order has no conflicts — causally related events
 * cannot conflict — so the ludus endpoint is unaffected.)
 */
import {
  type PrimeEventStructure,
  causes,
  eventIds,
} from "../index.mjs";
import { type Rational } from "@emsenn/relating";
import { fromRatio } from "@emsenn/relating/codecs";

const comparable = (structure: PrimeEventStructure, a: string, b: string): boolean =>
  causes(structure, a, b) || causes(structure, b, a);

export interface LudusIndex {
  readonly kind: "game-geometry.ludusIndex";
  /** Causally comparable pairs (either direction). */
  readonly comparablePairs: number;
  /** All unordered event pairs, $\binom{n}{2}$. */
  readonly totalPairs: number;
  /** comparablePairs / totalPairs in $[0, 1]$ — paidia at $0$, ludus at $1$. */
  readonly fraction: Rational;
}

export interface LudusIndexObstruction {
  readonly kind: "game-geometry.ludusIndex-obstruction";
  readonly eventCount: number;
}

export type LudusIndexJudgment = LudusIndex | LudusIndexObstruction;

/**
 * The paidia<->ludus index of a structure: the fraction of event pairs that are
 * causally comparable.  Fewer than two events cannot present a fraction — that
 * is an obstruction, not a value of $0$ or $1$.
 */
export function ludusIndex(structure: PrimeEventStructure): LudusIndexJudgment {
  const ids = eventIds(structure);
  const count = ids.length;
  if (count < 2) {
    return Object.freeze({ kind: "game-geometry.ludusIndex-obstruction" as const, eventCount: count });
  }
  let comparablePairs = 0;
  for (let left = 0; left < count; left += 1) {
    for (let right = left + 1; right < count; right += 1) {
      if (comparable(structure, ids[left]!, ids[right]!)) comparablePairs += 1;
    }
  }
  const totalPairs = (count * (count - 1)) / 2;
  return Object.freeze({
    kind: "game-geometry.ludusIndex" as const,
    comparablePairs,
    totalPairs,
    fraction: fromRatio(comparablePairs, totalPairs),
  });
}

/** Pure paidia — every event pair concurrent (index $0$). */
export const isPaidia = (judgment: LudusIndexJudgment): boolean =>
  judgment.kind === "game-geometry.ludusIndex" && judgment.comparablePairs === 0;

/** Pure ludus — every event pair causally ordered (index $1$). */
export const isLudus = (judgment: LudusIndexJudgment): boolean =>
  judgment.kind === "game-geometry.ludusIndex" && judgment.comparablePairs === judgment.totalPairs;
