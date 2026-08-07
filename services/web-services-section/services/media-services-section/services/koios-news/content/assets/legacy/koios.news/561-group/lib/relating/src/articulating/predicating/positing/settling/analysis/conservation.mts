/**
 * analysis/conservation — the boundary operator ∂ on the relation graph, and
 * the conservation law it measures.
 *
 * The Laplacian next door (laplacian.mjs) is the second-order operator L = ∂∂*:
 * symmetric, orientation-blind, the heat operator of the topology. This module
 * is the *first*-order operator underneath it — ∂ itself — and ∂ needs what L
 * throws away: orientation. A cell relates a subject to an object in a
 * direction; value flows *from* the subject *into* the object. So where the
 * Laplacian symmetrizes cell counts into an unsigned weight, ∂ keeps each cell
 * as an oriented edge subject → object.
 *
 * A FLOW assigns an exact Rational to each oriented edge — a 1-chain. Its
 * boundary ∂(flow) is a 0-chain: at every term, the net accumulation
 *
 *     (∂f)(w) = Σ_{e into w} f(e) − Σ_{e out of w} f(e).
 *
 * The single law this measures has many names because it is one structure seen
 * from several rooms:
 *
 *   - ∂f = 0 everywhere  ⟺  inflow = outflow at every node  (Kirchhoff's current law),
 *   - ⟺  the flow is a circulation, divergence-free, a steady state (a harmonic 1-chain),
 *   - ⟺  ker ∂ — the cycle space of the graph,
 *   - ⟺  a conserved current: what flows into a term flows out, nothing accumulates.
 *
 * Where ∂f ≠ 0, the residual is the *syndrome*: it names the term that is acting
 * as a source or sink and the exact amount by which it fails to balance. And
 * because ∂ is exactly determined, a single elided edge can be *solved for*: the
 * missing leg whose value makes the whole flow conserve — the one unstated
 * current that the rest determine.
 *
 * Everything that carries value here is a carrier Rational; only positions
 * (indices into the term/edge arrays) are JS numbers, exactly as in the
 * Laplacian. No JS number crosses this surface as a value.
 */

import {
  gradedAdd,
  gradedIsZero,
  gradedNegate,
  ratAdd,
  ratIsZero,
  ratSubtract,
  ratZero,
  type GradedRational,
  type Rational,
} from "../../../../carriers.mjs";
import {
  predicationTermIdentity,
  type PredicationTerm,
} from "../../../../carriers.mjs";
import {
  type SectionCarrier,
} from "../index.mjs";
import { relationGraph, type RelationGraphCarrier } from "./laplacian.mjs";

const sameTerm = (left: PredicationTerm, right: PredicationTerm): boolean =>
  predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";

/**
 * One oriented edge of the flow network: a directed transfer from a subject term
 * to an object term, the way a single cell relates them. fromIndex and toIndex
 * are the positions of those terms in the network's term array, so a flow value
 * at this edge accumulates at `to` and is shed at `from`.
 */
export interface FlowEdge {
  readonly kind: "meme-analysis.conservation.edge";
  readonly from: PredicationTerm;
  readonly to: PredicationTerm;
  readonly fromIndex: number;
  readonly toIndex: number;
}

/**
 * The flow network of a section: the relation graph's terms as nodes, reused
 * whole for the spectral view, together with the oriented edges ∂ needs — one
 * per non-reflexive cell, carrying its direction. A flow is a Rational per edge
 * (aligned to `edges`); its divergence is a Rational per term (aligned to
 * `terms`).
 */
export interface FlowNetworkCarrier {
  readonly kind: "meme-analysis.conservation.network";
  /** The relation graph — terms and the symmetric spectral weights — reused. */
  readonly graph: RelationGraphCarrier;
  /** The nodes: the distinct terms, surfaced for divergence alignment. */
  readonly terms: readonly PredicationTerm[];
  /** The oriented edges, one per non-reflexive cell, in section order. */
  readonly edges: readonly FlowEdge[];
}

/**
 * The flow network of a section: the relation graph (reused for its terms and
 * spectral weights) carrying the oriented per-cell edges. Reflexive cells are
 * not edges — a transfer from a term to itself has boundary zero and moves no
 * value across the graph.
 */
export function flowNetwork(section: SectionCarrier): FlowNetworkCarrier {
  const graph = relationGraph(section);
  const indexOf = (term: PredicationTerm): number =>
    graph.terms.findIndex((candidate) => sameTerm(candidate, term));
  const edges: FlowEdge[] = [];
  for (const entry of section.entries) {
    const fromIndex = indexOf(entry.cell.subject);
    const toIndex = indexOf(entry.cell.object);
    if (fromIndex === toIndex) continue;
    edges.push(Object.freeze({
      kind: "meme-analysis.conservation.edge" as const,
      from: graph.terms[fromIndex]!,
      to: graph.terms[toIndex]!,
      fromIndex,
      toIndex,
    }));
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.network" as const,
    graph,
    terms: graph.terms,
    edges: Object.freeze(edges),
  });
}

const requireFlow = (network: FlowNetworkCarrier, flow: readonly Rational[]): void => {
  if (flow.length !== network.edges.length) {
    throw new TypeError("a flow assigns a value to every oriented edge of the network");
  }
};

/**
 * The boundary operator ∂ applied to a flow: the net accumulation at every term.
 * Each oriented edge pours its value into its head (`to`) and draws it from its
 * tail (`from`); the divergence at a term is the sum of these — inflow minus
 * outflow. Exact and carrier-valued.
 */
export function divergence(network: FlowNetworkCarrier, flow: readonly Rational[]): readonly Rational[] {
  requireFlow(network, flow);
  const net: Rational[] = network.terms.map(() => ratZero);
  network.edges.forEach((edge, index) => {
    const value = flow[index]!;
    net[edge.toIndex] = ratAdd(net[edge.toIndex]!, value);
    net[edge.fromIndex] = ratSubtract(net[edge.fromIndex]!, value);
  });
  return Object.freeze(net);
}

/**
 * The witness that a flow is conserved: its boundary vanishes at every term, so
 * inflow equals outflow everywhere — a circulation, divergence-free, in ker ∂.
 * A conserved current: nothing accumulates.
 */
export interface ConservedWitness {
  readonly kind: "meme-analysis.conservation.conserved:witness";
  readonly network: FlowNetworkCarrier;
  readonly flow: readonly Rational[];
  /** The boundary ∂(flow) — zero at every term. */
  readonly divergence: readonly Rational[];
}

/**
 * The obstruction to conservation: the first term whose boundary is nonzero,
 * recorded as atTerm together with that residual — the syndrome, the exact
 * amount by which the flow fails to balance there (a source if positive, a sink
 * if negative).
 */
export interface ConservedObstruction {
  readonly kind: "meme-analysis.conservation.conserved-obstruction";
  readonly network: FlowNetworkCarrier;
  readonly flow: readonly Rational[];
  readonly divergence: readonly Rational[];
  /** The first term where the flow fails to balance. */
  readonly atTerm: PredicationTerm;
  /** The residual at that term: the syndrome of the imbalance. */
  readonly residual: Rational;
}

/**
 * The result of judging a flow for conservation: a ConservedWitness when its
 * boundary vanishes everywhere, or a ConservedObstruction naming the first term
 * where it does not.
 */
export type ConservedJudgment = ConservedWitness | ConservedObstruction;

/**
 * Conservation judgment: the flow is conserved exactly when its boundary ∂(flow)
 * vanishes at every term (Kirchhoff balance / ker ∂). On obstruction, the first
 * nonzero term and its residual are named.
 */
export function conserved(network: FlowNetworkCarrier, flow: readonly Rational[]): ConservedJudgment {
  const div = divergence(network, flow);
  const leaking = div.findIndex((value) => !ratIsZero(value));
  if (leaking !== -1) {
    return Object.freeze({
      kind: "meme-analysis.conservation.conserved-obstruction" as const,
      network,
      flow: Object.freeze([...flow]),
      divergence: div,
      atTerm: network.terms[leaking]!,
      residual: div[leaking]!,
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.conserved:witness" as const,
    network,
    flow: Object.freeze([...flow]),
    divergence: div,
  });
}

/**
 * The witness that an elided edge can be solved for: the inferred value on that
 * edge restores conservation, and `flow` is the completed, conserved 1-chain.
 */
export interface CompletionWitness {
  readonly kind: "meme-analysis.conservation.completion:witness";
  readonly network: FlowNetworkCarrier;
  /** The edge whose value was elided and is now inferred. */
  readonly edge: FlowEdge;
  /** The value on that edge that makes the whole flow conserve. */
  readonly inferred: Rational;
  /** The completed flow — conserved everywhere. */
  readonly flow: readonly Rational[];
}

/**
 * The obstruction to completion: solving the elided edge for its tail balances
 * that one term, but the whole flow still fails to conserve — the imbalance was
 * not confined to the missing leg's two endpoints, so no single edge can close
 * it. The best completion and a surviving residual are named.
 */
export interface CompletionObstruction {
  readonly kind: "meme-analysis.conservation.completion-obstruction";
  readonly network: FlowNetworkCarrier;
  readonly edge: FlowEdge;
  /** The value that balances the elided edge's tail; insufficient globally. */
  readonly inferred: Rational;
  /** The completed flow — still not conserved. */
  readonly flow: readonly Rational[];
  /** A term that still fails to balance after completion. */
  readonly atTerm: PredicationTerm;
  readonly residual: Rational;
}

/**
 * The result of completing an elided edge: a CompletionWitness when the inferred
 * value conserves the whole flow, or a CompletionObstruction when it cannot.
 */
export type CompletionJudgment = CompletionWitness | CompletionObstruction;

/**
 * Harmonic completion: given a flow with one elided edge (at holeIndex), solve
 * for the value on that edge that makes the whole flow conserve. The boundary is
 * linear, so ∂(x · edge) = −∂(rest): the missing leg u → v contributes +x at v
 * and −x at u, and zeroing the tail u gives x = ∂(rest)(u). The completed flow
 * is then judged for conservation — a witness if the imbalance was confined to
 * the missing leg, an obstruction if it was not. This is "infer the entry that
 * isn't written down."
 */
export function complete(
  network: FlowNetworkCarrier,
  flow: readonly Rational[],
  holeIndex: number,
): CompletionJudgment {
  requireFlow(network, flow);
  if (holeIndex < 0 || holeIndex >= network.edges.length) {
    throw new RangeError("the elided edge must be an edge of the network");
  }
  const edge = network.edges[holeIndex]!;
  const rest = flow.map((value, index) => (index === holeIndex ? ratZero : value));
  const restDivergence = divergence(network, rest);
  const inferred = restDivergence[edge.fromIndex]!;
  const completed = Object.freeze(rest.map((value, index) => (index === holeIndex ? inferred : value)));
  const judgment = conserved(network, completed);
  if (judgment.kind === "meme-analysis.conservation.conserved:witness") {
    return Object.freeze({
      kind: "meme-analysis.conservation.completion:witness" as const,
      network,
      edge,
      inferred,
      flow: completed,
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.completion-obstruction" as const,
    network,
    edge,
    inferred,
    flow: completed,
    atTerm: judgment.atTerm,
    residual: judgment.residual,
  });
}

















/**
 * A grade-tagged additive structure: the minimum a quantity type needs to obey
 * the conservation law — read its sector, add within a sector, recognize zero,
 * and negate. The carrier Rational satisfies it; so does any downstream quantity
 * that forms an abelian group per sector (a bigint money where magnitudes run
 * past what von Neumann ordinals can hold, a counted tally, a measured flux).
 * The law is one; the representation is the caller's.
 */
export interface GradedAdditive<Q> {
  readonly gradeOf: (quantity: Q) => string;
  readonly add: (left: Q, right: Q) => Q;
  readonly isZero: (quantity: Q) => boolean;
  readonly negate: (quantity: Q) => Q;
}

/**
 * The graded residual of a 0-chain over any GradedAdditive structure: the signed
 * total in each sector, in first-seen sector order, keeping only the sectors that
 * fail to vanish. Empty exactly when the quantities conserve.
 */
export function gradedResidualBy<Q>(amounts: readonly Q[], ops: GradedAdditive<Q>): readonly Q[] {
  const order: string[] = [];
  const sums = new Map<string, Q>();
  for (const amount of amounts) {
    const grade = ops.gradeOf(amount);
    const prior = sums.get(grade);
    if (prior === undefined) {
      order.push(grade);
      sums.set(grade, amount);
    } else {
      sums.set(grade, ops.add(prior, amount));
    }
  }
  return Object.freeze(order.map((grade) => sums.get(grade)!).filter((sum) => !ops.isZero(sum)));
}

/** Conservation over any GradedAdditive structure: conserved when the residual is empty. */
export function gradedConservedBy<Q>(
  amounts: readonly Q[],
  ops: GradedAdditive<Q>,
): { readonly conserved: boolean; readonly residual: readonly Q[] } {
  const residual = gradedResidualBy(amounts, ops);
  return Object.freeze({ conserved: residual.length === 0, residual });
}

/** Completion over any GradedAdditive structure: the missing quantity, or why it cannot be inferred. */
export type GradedCompletionBy<Q> =
  | { readonly kind: "witness"; readonly inferred: Q }
  | { readonly kind: "obstruction"; readonly reason: "balanced" | "ambiguous"; readonly residual: readonly Q[] };

/**
 * Graded completion over any GradedAdditive structure: infer the one quantity
 * missing from an otherwise-known 0-chain so the whole conserves. Solvable
 * exactly when the residual lives in a single sector; the inferred quantity is
 * its negation.
 */
export function gradedCompleteBy<Q>(known: readonly Q[], ops: GradedAdditive<Q>): GradedCompletionBy<Q> {
  const residual = gradedResidualBy(known, ops);
  if (residual.length === 1) return { kind: "witness", inferred: ops.negate(residual[0]!) };
  return { kind: "obstruction", reason: residual.length === 0 ? "balanced" : "ambiguous", residual };
}



const carrierAdditive: GradedAdditive<GradedRational> = Object.freeze({
  gradeOf: (quantity: GradedRational) => quantity.grade,
  add: gradedAdd,
  isZero: gradedIsZero,
  negate: gradedNegate,
});

/**
 * The graded residual of a carrier 0-chain: the signed total in each sector, in
 * first-seen sector order, keeping only the sectors that fail to vanish. Empty
 * exactly when the quantities conserve.
 */
export function gradedResidual(amounts: readonly GradedRational[]): readonly GradedRational[] {
  return gradedResidualBy(amounts, carrierAdditive);
}

/**
 * The witness that a graded 0-chain conserves: its signed total vanishes in
 * every sector — each conserved quantity balances on its own.
 */
export interface GradedConservedWitness {
  readonly kind: "meme-analysis.conservation.graded:witness";
  readonly amounts: readonly GradedRational[];
}

/**
 * The obstruction to graded conservation: the sectors whose totals do not
 * vanish, each carrying its leftover — the syndrome of the imbalance.
 */
export interface GradedConservedObstruction {
  readonly kind: "meme-analysis.conservation.graded-obstruction";
  readonly amounts: readonly GradedRational[];
  readonly residual: readonly GradedRational[];
}

/** The result of judging a graded 0-chain for conservation. */
export type GradedConservedJudgment = GradedConservedWitness | GradedConservedObstruction;

/**
 * Graded conservation judgment: the amounts conserve exactly when their signed
 * total vanishes in every sector. On obstruction, the surviving per-sector
 * residuals are named.
 */
export function gradedConserved(amounts: readonly GradedRational[]): GradedConservedJudgment {
  const { conserved, residual } = gradedConservedBy(amounts, carrierAdditive);
  if (conserved) {
    return Object.freeze({
      kind: "meme-analysis.conservation.graded:witness" as const,
      amounts: Object.freeze([...amounts]),
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-obstruction" as const,
    amounts: Object.freeze([...amounts]),
    residual,
  });
}

/**
 * The witness that an elided graded amount can be solved for: the known amounts
 * leave a residual confined to one sector, and the inferred amount is its
 * negation — the single value that makes the whole 0-chain conserve.
 */
export interface GradedCompletionWitness {
  readonly kind: "meme-analysis.conservation.graded-completion:witness";
  readonly known: readonly GradedRational[];
  readonly inferred: GradedRational;
}

/**
 * The obstruction to completing an elided graded amount: either the known
 * amounts already conserve (nothing to infer) or their residual spans more than
 * one sector (ambiguous — no single amount can close it).
 */
export interface GradedCompletionObstruction {
  readonly kind: "meme-analysis.conservation.graded-completion-obstruction";
  readonly known: readonly GradedRational[];
  readonly reason: "balanced" | "ambiguous";
  readonly residual: readonly GradedRational[];
}

/** The result of completing an elided graded amount. */
export type GradedCompletionJudgment = GradedCompletionWitness | GradedCompletionObstruction;

/**
 * Graded completion: infer the one amount missing from an otherwise-known
 * 0-chain so that the whole conserves. Solvable exactly when the residual of the
 * known amounts lives in a single sector; the inferred amount is its negation —
 * the one unstated quantity the rest determine.
 */
export function gradedComplete(known: readonly GradedRational[]): GradedCompletionJudgment {
  const completion = gradedCompleteBy(known, carrierAdditive);
  if (completion.kind === "witness") {
    return Object.freeze({
      kind: "meme-analysis.conservation.graded-completion:witness" as const,
      known: Object.freeze([...known]),
      inferred: completion.inferred,
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-completion-obstruction" as const,
    known: Object.freeze([...known]),
    reason: completion.reason,
    residual: completion.residual,
  });
}
