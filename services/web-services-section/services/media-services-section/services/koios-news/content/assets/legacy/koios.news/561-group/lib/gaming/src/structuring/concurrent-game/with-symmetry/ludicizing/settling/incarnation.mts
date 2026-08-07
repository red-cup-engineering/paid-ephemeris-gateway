/**
 * Incarnation — the material $|\mathbf{B}|$ of a behaviour (Girard 2001 §11).
 *
 * The design note (corpus, ludics/library/design) defines the *design order* —
 * "the poset of proper designs on $\xi_0$ ordered by set-inclusion of actions:
 * $\mathfrak{D} \le \mathfrak{D}'$ iff $\mathfrak{D} \subseteq \mathfrak{D}'$"
 * — and proves (same note, "Theorem: the design lattice realizes as a
 * sub-lattice of $A_p$") that this inclusion order IS the *knowledge order*
 * $\le_k$ on the predication-fiber: $\mathfrak{D} \le \mathfrak{D}'$ iff
 * $v_\mathfrak{D} \le_k v_{\mathfrak{D}'}$ pointwise.  We reuse meme-algebra's
 * `knowledgeLeq` verbatim for the comparison — the design order is not
 * reinvented, it is the apex knowledge order restricted to designs.
 *
 * Girard's **incarnation** $|\mathfrak{D}|_\mathbf{B}$ of a design in a
 * behaviour is the *material* part of $\mathfrak{D}$ — the sub-design actually
 * *visited* during plays of $\mathfrak{D}$ against the orthogonal
 * $\mathbf{B}^\perp$.  Loci $\mathfrak{D}$ commits at but that no counter-design
 * in $\mathbf{B}^\perp$ ever meets are inert ballast; the incarnation discards
 * them, keeping the smallest design $\le_k$-below $\mathfrak{D}$ that plays the
 * same against all of $\mathbf{B}^\perp$.  The behaviour note's interaction
 * relation supplies "visited": `interactionReport(d, E).meetings` ranges over
 * exactly the *shared* loci of a play (interaction note, `sharedAndUnionKeys`),
 * so the visited loci of $\mathfrak{D}$ are the union of meeting loci over all
 * $E \in \mathbf{B}^\perp$.
 *
 * The **incarnation of a behaviour** $|\mathbf{B}|$ is the set of incarnated
 * designs — the *skeleton*, the material core of the behaviour stripped of
 * ballast.  A design is **material** when it equals its own incarnation (no
 * ballast: every committed locus is visited by some counter-design).  This
 * realizes Girard's slogan that a behaviour is determined by its material
 * designs; the ballast-laden designs are recovered as the $\le_k$-upward closure.
 */
import {
  type Design,
  type Locus,
  designCharge,
  interactionReport,
  locusFromKey,
  locusKey,
  support,
  supportKeys,
} from "../../index.mjs";
import { knowledgeLeq } from "@emsenn/relating";
import { biorthogonalClosure, orthogonalOf } from "./behaviour.mjs";

/** Same membership key as `behaviour.mjs` (private there) — additive-safe local copy. */
const designKey = (d: Design): string =>
  d.entries.map((e) => `${e.locusKey}:${e.charge.name}`).join("|");

const inSet = (designs: readonly Design[], d: Design): boolean => {
  const key = designKey(d);
  return designs.some((other) => designKey(other) === key);
};

const dedupe = (designs: readonly Design[]): readonly Design[] => {
  const seen = new Map<string, Design>();
  for (const d of designs) seen.set(designKey(d), d);
  return Object.freeze([...seen.values()]);
};

/** Restrict a design to a chosen set of locus keys — its sub-design on those loci. */
const restrictTo = (d: Design, keepKeys: ReadonlySet<string>): Design =>
  Object.freeze({
    kind: "game.design" as const,
    entries: Object.freeze(d.entries.filter((e) => keepKeys.has(e.locusKey))),
  });

/**
 * The design order $\mathfrak{D} \le \mathfrak{D}'$ (design note, "The design
 * lattice") realized as the apex knowledge order (design note, "Theorem: the
 * design lattice realizes as a sub-lattice of $A_p$"): true iff at every locus
 * in either support, $v_\mathfrak{D}(\xi) \le_k v_{\mathfrak{D}'}(\xi)$.
 * Loci outside a support carry $\bot$ (`absurd`), the knowledge bottom, so the
 * check over the union of supports is exhaustive.
 */
export function designLeq(d1: Design, d2: Design): boolean {
  const keys = new Set<string>([...supportKeys(d1), ...supportKeys(d2)]);
  for (const key of keys) {
    const xi = locusFromKey(key);
    if (knowledgeLeq(designCharge(d1, xi), designCharge(d2, xi)).kind !== "bilattice-charge.orderLeq:witness") {
      return false;
    }
  }
  return true;
}

export interface DesignLeqWitness {
  readonly kind: "game.design.leq:witness";
  readonly lesser: Design;
  readonly greater: Design;
}

export interface DesignLeqObstruction {
  readonly kind: "game.design.leq-obstruction";
  readonly lesser: Design;
  readonly greater: Design;
  /** A locus where the knowledge order fails. */
  readonly locus: Locus;
  readonly reason: string;
}

export type DesignLeqJudgment = DesignLeqWitness | DesignLeqObstruction;

/** Witness/obstruction for the design order $\mathfrak{D} \le \mathfrak{D}'$. */
export function designLeqJudgment(d1: Design, d2: Design): DesignLeqJudgment {
  const keys = new Set<string>([...supportKeys(d1), ...supportKeys(d2)]);
  for (const key of keys) {
    const xi = locusFromKey(key);
    if (knowledgeLeq(designCharge(d1, xi), designCharge(d2, xi)).kind !== "bilattice-charge.orderLeq:witness") {
      return Object.freeze({
        kind: "game.design.leq-obstruction" as const,
        lesser: d1,
        greater: d2,
        locus: xi,
        reason: `charge at ${key} is not knowledge-below the greater design's`,
      });
    }
  }
  return Object.freeze({ kind: "game.design.leq:witness" as const, lesser: d1, greater: d2 });
}

/**
 * The loci of `d` *visited* in plays against a set of counter-designs — the
 * union of meeting loci over the interactions (interaction note, the meetings
 * range over the shared/visited loci of each play).
 */
export function visitedLoci(d: Design, counters: readonly Design[]): readonly Locus[] {
  const seen = new Map<string, Locus>();
  for (const e of counters) {
    for (const m of interactionReport(d, e).meetings) {
      seen.set(locusKey(m.locus), m.locus);
    }
  }
  return Object.freeze([...seen.values()]);
}

/**
 * The incarnation $|\mathfrak{D}|_\mathbf{B}$ of a design in the behaviour
 * generated by `set`: the sub-design of `d` on the loci visited by some
 * counter-design in $\mathbf{B}^\perp$ (Girard 2001 §11, the material part).
 * Ballast loci — committed but never met — are discarded.  The result is
 * $\le_k$-below `d` (it is a restriction) and plays identically against all of
 * $\mathbf{B}^\perp$.
 */
export function incarnationOf(d: Design, set: readonly Design[], universe: readonly Design[]): Design {
  const closure = biorthogonalClosure(set, universe);
  const dual = orthogonalOf(closure, universe);
  const visited = visitedLoci(d, dual);
  const keepKeys = new Set<string>(visited.map((xi) => locusKey(xi)));
  return restrictTo(d, keepKeys);
}

/**
 * The incarnation $|\mathbf{B}|$ of the behaviour generated by `set`: the set of
 * incarnated designs of the behaviour — its material *skeleton* (Girard 2001
 * §11).  Each design of $\mathbf{B} = \mathbf{B}^{\perp\perp}$ is stripped to
 * the loci its plays against $\mathbf{B}^\perp$ actually visit; duplicates after
 * stripping collapse, so $|\mathbf{B}|$ is in general smaller than $\mathbf{B}$.
 */
export function incarnation(set: readonly Design[], universe: readonly Design[]): readonly Design[] {
  const closure = biorthogonalClosure(set, universe);
  const dual = orthogonalOf(closure, universe);
  const incarnated = closure.map((d) => {
    const visited = visitedLoci(d, dual);
    const keepKeys = new Set<string>(visited.map((xi) => locusKey(xi)));
    return restrictTo(d, keepKeys);
  });
  return dedupe(incarnated);
}

/** The skeleton of a behaviour — its incarnation $|\mathbf{B}|$, the material core. */
export const skeleton = incarnation;

export interface MaterialWitness {
  readonly kind: "game.incarnation.material:witness";
  readonly design: Design;
}

export interface MaterialObstruction {
  readonly kind: "game.incarnation.material-obstruction";
  readonly design: Design;
  readonly incarnation: Design;
  /** A ballast locus — committed by the design but visited by no counter-design. */
  readonly ballast: Locus | null;
  readonly reason: string;
}

export type MaterialJudgment = MaterialWitness | MaterialObstruction;

/**
 * Witness/obstruction for "`d` is material in $\mathbf{B}$" — it equals its own
 * incarnation, carrying no ballast (Girard 2001 §11).  A material design is the
 * canonical $\le_k$-minimal representative of its play-behaviour.
 */
export function materialJudgment(d: Design, set: readonly Design[], universe: readonly Design[]): MaterialJudgment {
  const inc = incarnationOf(d, set, universe);
  if (designKey(inc) === designKey(d)) {
    return Object.freeze({ kind: "game.incarnation.material:witness" as const, design: d });
  }
  const incKeys = new Set<string>(inc.entries.map((e) => e.locusKey));
  const ballast = support(d).find((xi) => !incKeys.has(locusKey(xi))) ?? null;
  return Object.freeze({
    kind: "game.incarnation.material-obstruction" as const,
    design: d,
    incarnation: inc,
    ballast,
    reason: "the design commits at loci no counter-design visits (ballast)",
  });
}

/** Whether a design is material in the behaviour generated by `set` (carries no ballast). */
export const isMaterial = (d: Design, set: readonly Design[], universe: readonly Design[]): boolean =>
  materialJudgment(d, set, universe).kind === "game.incarnation.material:witness";

/** Whether `d` belongs to the incarnation $|\mathbf{B}|$ — appears among the skeleton designs. */
export function inIncarnation(d: Design, set: readonly Design[], universe: readonly Design[]): boolean {
  return inSet(incarnation(set, universe), d);
}
