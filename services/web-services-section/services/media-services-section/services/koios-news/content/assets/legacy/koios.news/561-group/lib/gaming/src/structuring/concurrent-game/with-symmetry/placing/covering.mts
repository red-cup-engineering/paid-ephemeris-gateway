/**
 * The covering (Hasse) geometry of the causal order.
 *
 * A prime event structure carries a causal partial order $\leq$
 * (Castellan-Clairambault-Winskel; see game-algebra `event-structure`).  Its
 * *covering* (Hasse) relation keeps only the immediate causation edges: $a
 * \lessdot b$ when $a < b$ and no event lies strictly between them.  The
 * covering relation is the geometric skeleton of the order — the edges you draw
 * in a Hasse diagram — from which the full order is recovered by transitive
 * closure.
 *
 * The edges are computed from the *closure* (`causes`, the reflexive-transitive
 * relation) rather than from the raw `causality` field, so the result is the
 * same whether the structure was given with or without transitive shortcuts.
 */
import {
  type EventPair,
  type PrimeEventStructure,
  causes,
  eventIds,
} from "../index.mjs";

export interface CoveringRelation {
  readonly kind: "game-geometry.coveringRelation";
  readonly structure: PrimeEventStructure;
  /** Immediate-causation edges `[a, b]` read as $a \lessdot b$. */
  readonly edges: readonly EventPair[];
}

/**
 * $a \lessdot b$ — `a` immediately causes `b`: $a < b$ with nothing strictly
 * between.  Because `causes` is reflexive we explicitly exclude the witnesses
 * $c = a$ and $c = b$; otherwise every causal edge reads as non-covering.
 */
export function isImmediateCause(structure: PrimeEventStructure, a: string, b: string): boolean {
  if (a === b) return false;
  if (!causes(structure, a, b)) return false;
  for (const c of eventIds(structure)) {
    if (c === a || c === b) continue;
    if (causes(structure, a, c) && causes(structure, c, b)) return false;
  }
  return true;
}

/** The covering (Hasse) relation: all immediate-causation edges of the order. */
export function coveringRelation(structure: PrimeEventStructure): CoveringRelation {
  const ids = eventIds(structure);
  const edges: EventPair[] = [];
  for (const a of ids) {
    for (const b of ids) {
      if (isImmediateCause(structure, a, b)) edges.push(Object.freeze([a, b] as const));
    }
  }
  return Object.freeze({
    kind: "game-geometry.coveringRelation" as const,
    structure,
    edges: Object.freeze(edges),
  });
}

export function isCoveringRelation(value: unknown): value is CoveringRelation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CoveringRelation>;
  return candidate.kind === "game-geometry.coveringRelation" && Array.isArray(candidate.edges);
}
