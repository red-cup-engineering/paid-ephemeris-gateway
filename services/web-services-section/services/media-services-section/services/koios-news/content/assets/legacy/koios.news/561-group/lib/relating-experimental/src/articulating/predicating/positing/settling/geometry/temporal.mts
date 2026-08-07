/**
 * settling/geometry/temporal — the causal order of a settling.
 *
 * Time is the settling itself: a cell's temporal position is the stage at which
 * it first fires. Two cells are adjacent when they share a term; causal
 * precedence is the transitive closure of stage-increasing adjacency — a strict
 * partial order (acyclic, since stages strictly increase along every edge).
 * Unrelated cells are spacelike. The ordering fraction (comparable pairs over all
 * pairs) is an exact rational; what dimension it corresponds to is not answered here.
 */
import { cellCoincides, termCoincides, type Cell } from "../../../predication.mjs";
import type { Rational } from "../analysis/exact-number.mjs";
import { fromRatio } from "../../../../../codecs/index.mjs";
import { readIncrementsOfSettlementFiltration } from "../increment.mjs";
import type { SettlementFiltration } from "../object.mjs";

/** A cell paired with the stage index at which it first fired. */
export interface FiringEvent {
  readonly kind: "meme-geometry.temporal.firingEvent";
  readonly cell: Cell;
  readonly stageIndex: number;
}

/** The causal order over a settling's firing events (transitive closure). */
export interface CausalOrderCarrier {
  readonly kind: "meme-geometry.temporal.order";
  readonly events: readonly FiringEvent[];
  readonly precedes: readonly (readonly number[])[];
}

const sameCell = (left: Cell, right: Cell): boolean => cellCoincides(left, right);

const sharesTerm = (left: Cell, right: Cell): boolean => {
  const terms = [left.subject, left.object];
  const others = [right.subject, right.object];
  return terms.some((term) => others.some((other) => termCoincides(term, other)));
};

/** Each designated cell paired with the stage index of its first firing. */
export function readFiringEventsOfSettlementFiltration(settling: SettlementFiltration): readonly FiringEvent[] {
  const events: FiringEvent[] = [];
  readIncrementsOfSettlementFiltration(settling).forEach((increment, stageIndex) => {
    for (const cell of increment.added.cells) {
      if (!events.some((event) => sameCell(event.cell, cell))) {
        events.push(Object.freeze({ kind: "meme-geometry.temporal.firingEvent" as const, cell, stageIndex }));
      }
    }
  });
  return Object.freeze(events);
}

/** The causal order: transitive closure of stage-increasing term adjacency. */
export function readCausalOrderOfSettlementFiltration(settling: SettlementFiltration): CausalOrderCarrier {
  const events = readFiringEventsOfSettlementFiltration(settling);
  const direct: boolean[][] = events.map((earlier) => events.map((later) =>
    earlier.stageIndex < later.stageIndex && sharesTerm(earlier.cell, later.cell)));
  for (let mid = 0; mid < events.length; mid += 1) {
    for (let from = 0; from < events.length; from += 1) {
      if (!direct[from]![mid]) continue;
      for (let to = 0; to < events.length; to += 1) {
        if (direct[mid]![to]) direct[from]![to] = true;
      }
    }
  }
  return Object.freeze({
    kind: "meme-geometry.temporal.order" as const,
    events,
    precedes: Object.freeze(direct.map((row) => Object.freeze(row.flatMap((reachable, index) => reachable ? [index] : [])))),
  });
}

/** Two events ordered by the causal order (earlier strictly precedes later). */
export interface TimelikeSeparation {
  readonly kind: "meme-geometry.temporal.separation.timelike";
  readonly earlier: FiringEvent;
  readonly later: FiringEvent;
}

/** Two events the causal order does not relate. */
export interface SpacelikeSeparation {
  readonly kind: "meme-geometry.temporal.separation.spacelike";
  readonly left: FiringEvent;
  readonly right: FiringEvent;
}

/** A cell that never fired (not an event). */
export interface CausalSeparationObstruction {
  readonly kind: "meme-geometry.temporal.separation-obstruction";
  readonly missing: Cell;
}

/** The result of causalSeparation. */
export type CausalSeparation = TimelikeSeparation | SpacelikeSeparation | CausalSeparationObstruction;

/** Separation of two cells under the causal order. */
export function causalSeparation(order: CausalOrderCarrier, left: Cell, right: Cell): CausalSeparation {
  const leftIndex = order.events.findIndex((event) => sameCell(event.cell, left));
  if (leftIndex === -1) return Object.freeze({ kind: "meme-geometry.temporal.separation-obstruction" as const, missing: left });
  const rightIndex = order.events.findIndex((event) => sameCell(event.cell, right));
  if (rightIndex === -1) return Object.freeze({ kind: "meme-geometry.temporal.separation-obstruction" as const, missing: right });
  if (order.precedes[leftIndex]!.includes(rightIndex)) {
    return Object.freeze({ kind: "meme-geometry.temporal.separation.timelike" as const, earlier: order.events[leftIndex]!, later: order.events[rightIndex]! });
  }
  if (order.precedes[rightIndex]!.includes(leftIndex)) {
    return Object.freeze({ kind: "meme-geometry.temporal.separation.timelike" as const, earlier: order.events[rightIndex]!, later: order.events[leftIndex]! });
  }
  return Object.freeze({ kind: "meme-geometry.temporal.separation.spacelike" as const, left: order.events[leftIndex]!, right: order.events[rightIndex]! });
}

/** The causal cone at an event (past and future). */
export interface CausalConeCarrier {
  readonly kind: "meme-geometry.temporal.cone";
  readonly apex: FiringEvent;
  readonly past: readonly FiringEvent[];
  readonly future: readonly FiringEvent[];
}

/** A cone apex cell that never fired. */
export interface CausalConeObstruction {
  readonly kind: "meme-geometry.temporal.cone-obstruction";
  readonly missing: Cell;
}

/** The result of causalCone. */
export type CausalConeJudgment = CausalConeCarrier | CausalConeObstruction;

/** The cone at a cell: everything causally before and after it. */
export function causalCone(order: CausalOrderCarrier, apex: Cell): CausalConeJudgment {
  const apexIndex = order.events.findIndex((event) => sameCell(event.cell, apex));
  if (apexIndex === -1) return Object.freeze({ kind: "meme-geometry.temporal.cone-obstruction" as const, missing: apex });
  const past = order.events.filter((_, index) => order.precedes[index]!.includes(apexIndex));
  const future = order.precedes[apexIndex]!.map((index) => order.events[index]!);
  return Object.freeze({ kind: "meme-geometry.temporal.cone" as const, apex: order.events[apexIndex]!, past: Object.freeze(past), future: Object.freeze(future) });
}

/** The ordering fraction over a causal order (comparable pairs / all pairs). */
export interface OrderingFractionCarrier {
  readonly kind: "meme-geometry.temporal.orderingFraction";
  readonly comparablePairs: number;
  readonly totalPairs: number;
  readonly fraction: Rational;
}

/** Fewer than two events, so no fraction. */
export interface OrderingFractionObstruction {
  readonly kind: "meme-geometry.temporal.orderingFraction-obstruction";
  readonly eventCount: number;
}

/** The result of orderingFraction. */
export type OrderingFractionJudgment = OrderingFractionCarrier | OrderingFractionObstruction;

/** Comparable pairs over all pairs, exactly. */
export function orderingFraction(order: CausalOrderCarrier): OrderingFractionJudgment {
  const count = order.events.length;
  if (count < 2) return Object.freeze({ kind: "meme-geometry.temporal.orderingFraction-obstruction" as const, eventCount: count });
  let comparable = 0;
  for (let left = 0; left < count; left += 1) {
    for (let right = left + 1; right < count; right += 1) {
      if (order.precedes[left]!.includes(right) || order.precedes[right]!.includes(left)) comparable += 1;
    }
  }
  const total = (count * (count - 1)) / 2;
  return Object.freeze({
    kind: "meme-geometry.temporal.orderingFraction" as const,
    comparablePairs: comparable,
    totalPairs: total,
    fraction: fromRatio(comparable, total),
  });
}
