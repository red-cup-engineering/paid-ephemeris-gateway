/**
 * The additive connectives of linear logic — the *with* $\mathbin{\&}$ and the
 * *plus* $\oplus$ — as real arenas with their universal maps.
 *
 * Per `concurrent-game-system.md` (§ "The additive connectives"; read through the
 * Girard decomposition § "The collection of systems is a $*$-autonomous category"):
 * the additive conjunction $A \mathbin{\&} B$ is the *Cartesian product* of
 * $\mathbf{CGS}$ — Player's *external* choice of branch — and the additive
 * disjunction $A \oplus B$ is its De Morgan dual, Opponent's *internal* choice.
 *
 *   - $A \mathbin{\&} B$ — the disjoint union of $A$ and $B$ with each side's own
 *     causality/conflict *plus total cross-conflict* (every $A$-event conflicts with
 *     every $B$-event), so any single configuration lives entirely in one side: a
 *     committed branch. This is exactly `cartesian/product.mts`'s `with2`; this
 *     module *reuses* it (re-exported here under the linear-logic name `withArena`)
 *     and does **not** re-derive the product arena, the terminal object, or the two
 *     projections $\pi_1, \pi_2$ — those already exist there.
 *   - $A \oplus B := (A^\perp \mathbin{\&} B^\perp)^\perp$ — De Morgan dual of
 *     with: dualize the two summands, take their with (Player's external choice on
 *     the duals), and dualize back, turning it into Opponent's *internal* choice.
 *
 * The universal maps:
 *
 *   - **projections** $\pi_1, \pi_2$ — reused from `cartesian/product.mts`.
 *   - **pairing** $\langle f, g\rangle : C \to A \mathbin{\&} B$ for
 *     $f : C \to A$, $g : C \to B$ — the *new* half of the product's universal
 *     property here. Because $A \mathbin{\&} B$ has total cross-conflict, every play
 *     commits to one branch, so $\langle f,g\rangle$ is just $f$ retagged into the
 *     left branch unioned with $g$ retagged into the right branch.
 *   - **injections** $\iota_1 : A \to A \oplus B$, $\iota_2 : B \to A \oplus B$ — by
 *     duality, $\iota_k = \pi_k^\perp$: a coproduct injection is the De Morgan
 *     transpose of a product projection.
 *   - **codiagonal** $\nabla : A \oplus A \to A$ — by duality $\nabla =
 *     \Delta^\perp$, the transpose of the diagonal $\Delta = \langle\mathrm{cc},
 *     \mathrm{cc}\rangle : A \to A \mathbin{\&} A$ — collapsing either summand back
 *     to $A$.
 *
 * The product universal property $\pi_1 \circ \langle f,g\rangle = f$ and
 * $\pi_2 \circ \langle f,g\rangle = g$ is verified by **real composition**
 * (`compose`) on tiny one-event arenas, in the house witness/obstruction style.
 *
 * STANDING FINITE-STAGE CAVEAT (shared with the rest of the package): the
 * additive arenas here carry *no* copy-symmetry — they are point/finite arenas, so
 * `isValidMorphism` is meaningful for their maps (unlike banged-source maps). But
 * `enumeratePlays` is exponential in concurrent events, so every arena used here is
 * kept to one or two events.
 */
import { type Arena, type Event, play, strategy } from "@emsenn/gaming";
import {
  type Morphism,
  compose,
  compoundArena as compoundOf,
  copycat,
  morphism,
} from "./morphism.mjs";
import { dual } from "./object.mjs";
import { leftProjection, rightProjection, with2 } from "../cartesianizing/product.mjs";

const LEFT = "L|";
const RIGHT = "R|";

/**
 * The additive conjunction $A \mathbin{\&} B$ — Player's external choice of branch.
 * This is the categorical *product* of $\mathbf{CGS}$, already realized as
 * `cartesian/product.mts`'s `with2`: the disjoint union of $A$ (`L|…`) and $B$
 * (`R|…`) with each side's conflict plus *total cross-conflict*, so any single
 * configuration commits to one branch. Re-exported under the linear-logic name.
 */
export const withArena = (a: Arena, b: Arena): Arena => with2(a, b);

/**
 * The additive disjunction $A \oplus B := (A^\perp \mathbin{\&} B^\perp)^\perp$ —
 * Opponent's *internal* choice, the De Morgan dual of with. Dualize both summands,
 * form their with (Player's external choice on the duals — total cross-conflict on
 * $A^\perp \sqcup B^\perp$), then dualize back so the branch *commitment* is now
 * Opponent's. Underlying events are the disjoint union $A$ (`L|…`) $\sqcup$ $B$
 * (`R|…`) with full cross-conflict (dual leaves the conflict relation untouched);
 * the double-dual round-trips per-event polarity back to that of $A, B$, so $\oplus$
 * is distinguished from $\mathbin{\&}$ by its De Morgan *construction*, not by a
 * naive per-event polarity flip.
 */
export const plusArena = (a: Arena, b: Arena): Arena => dual(withArena(dual(a), dual(b)));

// ── Projections (reused) ────────────────────────────────────────────────────
//
// $\pi_1 : A \mathbin{\&} B \to A$ and $\pi_2 : A \mathbin{\&} B \to B$ are the
// copycat-onto-the-chosen-branch morphisms already built in `cartesian/product`.
// Re-exported under the linear-logic names so the additive connectives present a
// complete universal-property interface from one module.

/** The first projection $\pi_1 : A \mathbin{\&} B \to A$ (reused from `cartesian/product`). */
export const pi1 = (a: Arena, b: Arena): Morphism => leftProjection(a, b);

/** The second projection $\pi_2 : A \mathbin{\&} B \to B$ (reused from `cartesian/product`). */
export const pi2 = (a: Arena, b: Arena): Morphism => rightProjection(a, b);

// ── Pairing $\langle f, g\rangle : C \to A \mathbin{\&} B$ ───────────────────

/**
 * The pairing $\langle f, g\rangle : C \to A \mathbin{\&} B$ of $f : C \to A$ and
 * $g : C \to B$ — the mediating map of the product's universal property.
 *
 * A morphism $C \to A \mathbin{\&} B$ is a strategy on $C^\perp \| (A \mathbin{\&} B)$:
 * its $C$-moves are tagged `L|…`, and a target $A \mathbin{\&} B$ move carries the
 * with-arena's own branch tag, so an $A$-event `a` is `R|L|a` and a $B$-event `b`
 * is `R|R|b`. Because $A \mathbin{\&} B$ has *total cross-conflict*, every play of
 * the compound commits to a single branch — so $\langle f, g\rangle$ is precisely
 * $f$'s plays routed into the left branch *together with* $g$'s plays routed into
 * the right branch: retag $f$'s target moves `R|a ↦ R|L|a` (keeping its `L|…`
 * $C$-moves) and $g$'s `R|b ↦ R|R|b`, then union. The union is automatically
 * prefix-closed (both $f$ and $g$ are) and never mixes branches (cross-conflict
 * would invalidate any such play), so it is a valid concurrent strategy.
 */
export function pair(f: Morphism, g: Morphism): Morphism {
  const c = f.source;
  const a = f.target;
  const b = g.target;
  const target = withArena(a, b);
  const compound = compoundOf(c, target);
  // Retag a target ("R|…") move into its with-branch; keep source ("L|…") moves.
  const route = (branch: string) => (move: string): string =>
    move.startsWith(RIGHT) ? `${RIGHT}${branch}${move.slice(RIGHT.length)}` : move;
  const seen = new Set<string>();
  const plays = [];
  for (const source of [f, g] as const) {
    const branch = source === f ? LEFT : RIGHT;
    for (const p of source.strategy.plays) {
      const moves = p.moves.map(route(branch));
      const key = moves.join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      plays.push(play(moves));
    }
  }
  return morphism(c, target, strategy(compound, plays));
}

/**
 * The diagonal $\Delta_A = \langle \mathrm{cc}_A, \mathrm{cc}_A\rangle :
 * A \to A \mathbin{\&} A$ — pairing of two copycats; its De Morgan transpose is the
 * codiagonal $\nabla$ below.
 */
export const diagonal = (a: Arena): Morphism => pair(copycat(a), copycat(a));

// ── Linear negation on morphisms (for the dual injections / codiagonal) ─────
//
// A morphism $f : A \to B$ is a strategy on $A^\perp \| B = $ `tensor(dual A, B)`,
// with $A$-moves `L|…` and $B$-moves `R|…`. Its $*$-autonomous transpose
// $f^\perp : B^\perp \to A^\perp$ lives on $(B^\perp)^\perp \| A^\perp$ — the same
// move sequences with the two tensor sides exchanged and the arenas dualized. (The
// `why-not` module names this `dualMorphism`; we inline the identical side-swap
// here to keep `additive` self-contained and avoid a category↔category dependency
// cycle on `why-not`.)

const swapSide = (move: string): string =>
  move.startsWith(LEFT) ? `${RIGHT}${move.slice(LEFT.length)}`
  : move.startsWith(RIGHT) ? `${LEFT}${move.slice(RIGHT.length)}`
  : move;

/** Linear negation $f \mapsto f^\perp : B^\perp \to A^\perp$ — dualize+exchange sides. */
function dualMorphism(f: Morphism): Morphism {
  const source = dual(f.target);
  const target = dual(f.source);
  const compound = compoundOf(source, target);
  const plays = f.strategy.plays.map((p) => play(p.moves.map(swapSide)));
  return morphism(source, target, strategy(compound, plays));
}

// ── Injections $\iota_1, \iota_2$ and the codiagonal $\nabla$ (by duality) ───

/**
 * The first injection $\iota_1 : A \to A \oplus B$ — by De Morgan, the transpose of
 * the second projection on the duals: $\iota_1 = (\pi_2^{A^\perp, B^\perp})^\perp$.
 * Concretely $\pi_2 : A^\perp \mathbin{\&} B^\perp \to B^\perp$? No — the injection
 * into the *left* summand is the transpose of the projection *out of* the left
 * summand of the dualized with: $\iota_1 = (\pi_1^{A^\perp,B^\perp})^\perp :
 * (A^\perp)^\perp = A \to (A^\perp \mathbin{\&} B^\perp)^\perp = A \oplus B$. Where
 * $\pi_1$ copies the chosen left branch, its transpose injects $A$ as that branch.
 */
export const inj1 = (a: Arena, b: Arena): Morphism => dualMorphism(pi1(dual(a), dual(b)));

/**
 * The second injection $\iota_2 : B \to A \oplus B$ — dually
 * $\iota_2 = (\pi_2^{A^\perp,B^\perp})^\perp : B \to A \oplus B$, the transpose of
 * the right projection out of the dualized with.
 */
export const inj2 = (a: Arena, b: Arena): Morphism => dualMorphism(pi2(dual(a), dual(b)));

/**
 * The codiagonal $\nabla_A : A \oplus A \to A$ — by duality the transpose of the
 * diagonal, $\nabla_A = (\Delta_{A^\perp})^\perp$. It collapses either summand of
 * $A \oplus A$ back onto $A$: the universal map *out of* the coproduct that mediates
 * $[\mathrm{cc}, \mathrm{cc}]$, dual to $\Delta$ mediating $\langle\mathrm{cc},
 * \mathrm{cc}\rangle$ *into* the product.
 */
export const codiagonal = (a: Arena): Morphism => dualMorphism(diagonal(dual(a)));

// ── The product universal-property witnesses (verified by real composition) ──

/**
 * A witness/obstruction for one leg of the product's universal property:
 * $\pi_k \circ \langle f, g\rangle = (f \text{ or } g)$, verified by real
 * composition of strategies on tiny arenas.
 */
export interface ProductWitness {
  readonly kind: "computing.category.additive.product:witness";
  readonly hand: "left" | "right";
}
export interface ProductObstruction {
  readonly kind: "computing.category.additive.product-obstruction";
  readonly hand: "left" | "right";
  readonly composite: Morphism;
  readonly expected: Morphism;
}
export type ProductJudgment = ProductWitness | ProductObstruction;

const samePlays = (left: Morphism, right: Morphism): boolean => {
  const keys = (m: Morphism): Set<string> => new Set(m.strategy.plays.map((p) => p.moves.join(" ")));
  const l = keys(left);
  const r = keys(right);
  if (l.size !== r.size) return false;
  for (const key of l) if (!r.has(key)) return false;
  return true;
};

/**
 * Witness the left product law $\pi_1 \circ \langle f, g\rangle = f$ for
 * $f : C \to A$, $g : C \to B$, by REAL composition. `compose(pair(f,g), pi1(A,B))`
 * runs the pairing into $A \mathbin{\&} B$ then projects the left branch, hiding the
 * $A \mathbin{\&} B$ interface; the surviving $C^\perp \| A$ plays must be exactly
 * $f$'s. (Keep $A, B, C$ one event each so the interaction stays enumerable.)
 */
export function productLawLeft(f: Morphism, g: Morphism): ProductJudgment {
  const a = f.target;
  const b = g.target;
  const composite = compose(pair(f, g), pi1(a, b));
  return samePlays(composite, f)
    ? Object.freeze({ kind: "computing.category.additive.product:witness" as const, hand: "left" })
    : Object.freeze({ kind: "computing.category.additive.product-obstruction" as const, hand: "left", composite, expected: f });
}

/**
 * Witness the right product law $\pi_2 \circ \langle f, g\rangle = g$ by REAL
 * composition — dual to {@link productLawLeft}: project the right branch and recover
 * $g$'s plays on $C^\perp \| B$.
 */
export function productLawRight(f: Morphism, g: Morphism): ProductJudgment {
  const a = f.target;
  const b = g.target;
  const composite = compose(pair(f, g), pi2(a, b));
  return samePlays(composite, g)
    ? Object.freeze({ kind: "computing.category.additive.product:witness" as const, hand: "right" })
    : Object.freeze({ kind: "computing.category.additive.product-obstruction" as const, hand: "right", composite, expected: g });
}

// ── MALL-level packaging ─────────────────────────────────────────────────────

/**
 * A structural witness that the additive fragment of MALL is realized on these
 * carriers: with $\mathbin{\&}$ and plus $\oplus$ as De Morgan dual arenas
 * (`plusEventsMatchWith`: $A \oplus B$ and $A \mathbin{\&} B$ share the same
 * underlying event set and total cross-conflict, differing only by polarity), and
 * the product's universal property holding on both legs by real composition
 * (`productUniversalProperty`).
 */
export interface AdditiveMallWitness {
  readonly kind: "computing.category.additive.mall:witness";
  /** $A \oplus B$ has the same events + (full) conflict as $A \mathbin{\&} B$. */
  readonly plusEventsMatchWith: boolean;
  /** $\pi_1 \circ \langle f,g\rangle = f$ and $\pi_2 \circ \langle f,g\rangle = g$. */
  readonly productUniversalProperty: boolean;
}

const conflictKey = (pair: readonly [string, string]): string =>
  pair[0] <= pair[1] ? `${pair[0]} ${pair[1]}` : `${pair[1]} ${pair[0]}`;

const sameStringSet = (left: readonly string[], right: readonly string[]): boolean => {
  const l = new Set(left);
  const r = new Set(right);
  if (l.size !== r.size) return false;
  for (const key of l) if (!r.has(key)) return false;
  return true;
};

/**
 * Package the additive MALL fragment as one witness over tiny arenas $A, B$ and
 * tiny maps $f : C \to A$, $g : C \to B$: with/plus are De Morgan duals sharing the
 * same event+conflict skeleton, and the product universal property holds on both
 * legs by real composition. Keep every arena one event.
 */
export function additiveMallJudgment(f: Morphism, g: Morphism): AdditiveMallWitness {
  const a = f.target;
  const b = g.target;
  const withAB = withArena(a, b);
  const plusAB = plusArena(a, b);
  const plusEventsMatchWith =
    sameStringSet(withAB.structure.events.map((e: Event) => e.id), plusAB.structure.events.map((e: Event) => e.id))
    && sameStringSet(withAB.structure.conflict.map(conflictKey), plusAB.structure.conflict.map(conflictKey));
  const productUniversalProperty =
    productLawLeft(f, g).kind === "computing.category.additive.product:witness"
    && productLawRight(f, g).kind === "computing.category.additive.product:witness";
  return Object.freeze({
    kind: "computing.category.additive.mall:witness" as const,
    plusEventsMatchWith,
    productUniversalProperty,
  });
}
