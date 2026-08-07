/**
 * analysis/conservation — the boundary operator ∂ and the conservation law.
 *
 * Where the Laplacian L = ∂∂* is the symmetric second-order operator, this is
 * the first-order ∂ underneath it, which keeps the orientation L throws away: a
 * cell relates subject → object, value flows from subject into object. A FLOW is
 * a Rational per oriented edge (a 1-chain); its boundary ∂f is the net
 * accumulation per term (a 0-chain). ∂f = 0 everywhere is Kirchhoff's current
 * law / a circulation / ker ∂ / a conserved current. The syndrome names the
 * leaking term; an elided edge can be solved for. Generalized to any
 * GradedAdditive quantity (superselection by sector). Carrier-valued throughout.
 */
import {
  gradedAdd, gradedIsZero, gradedNegate, type GradedRational,
} from "./graded.mjs";
import { ratAdd, ratIsZero, ratSubtract, ratZero, type Rational } from "./exact-number.mjs";
import { termCoincides, type PredicationTerm } from "../../../predication.mjs";
import { type SectionCarrier } from "../section.mjs";
import { relationGraph, type RelationGraphCarrier } from "./laplacian.mjs";

const sameTerm = (left: PredicationTerm, right: PredicationTerm): boolean => termCoincides(left, right);

/** One oriented edge of the flow network: a directed transfer subject → object. */
export interface FlowEdge {
  readonly kind: "meme-analysis.conservation.edge";
  readonly from: PredicationTerm;
  readonly to: PredicationTerm;
  readonly fromIndex: number;
  readonly toIndex: number;
}

/** The flow network of a section: terms (nodes) and oriented per-cell edges. */
export interface FlowNetworkCarrier {
  readonly kind: "meme-analysis.conservation.network";
  readonly graph: RelationGraphCarrier;
  readonly terms: readonly PredicationTerm[];
  readonly edges: readonly FlowEdge[];
}

/** The flow network of a section (reflexive cells are not edges). */
export function flowNetwork(section: SectionCarrier): FlowNetworkCarrier {
  const graph = relationGraph(section);
  const indexOf = (term: PredicationTerm): number => graph.terms.findIndex((candidate) => sameTerm(candidate, term));
  const edges: FlowEdge[] = [];
  for (const entry of section.entries) {
    const fromIndex = indexOf(entry.cell.subject);
    const toIndex = indexOf(entry.cell.object);
    if (fromIndex === toIndex) continue;
    edges.push(Object.freeze({ kind: "meme-analysis.conservation.edge" as const, from: graph.terms[fromIndex]!, to: graph.terms[toIndex]!, fromIndex, toIndex }));
  }
  return Object.freeze({ kind: "meme-analysis.conservation.network" as const, graph, terms: graph.terms, edges: Object.freeze(edges) });
}

const requireFlow = (network: FlowNetworkCarrier, flow: readonly Rational[]): void => {
  if (flow.length !== network.edges.length) throw new TypeError("a flow assigns a value to every oriented edge of the network");
};

/** The boundary ∂(flow): net accumulation (inflow − outflow) at every term. */
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

/** A conserved flow (boundary vanishes everywhere). */
export interface ConservedWitness {
  readonly kind: "meme-analysis.conservation.conserved:witness";
  readonly network: FlowNetworkCarrier;
  readonly flow: readonly Rational[];
  readonly divergence: readonly Rational[];
}

/** A non-conserved flow (the first leaking term and its residual). */
export interface ConservedObstruction {
  readonly kind: "meme-analysis.conservation.conserved-obstruction";
  readonly network: FlowNetworkCarrier;
  readonly flow: readonly Rational[];
  readonly divergence: readonly Rational[];
  readonly atTerm: PredicationTerm;
  readonly residual: Rational;
}

/** The result of judging a flow for conservation. */
export type ConservedJudgment = ConservedWitness | ConservedObstruction;

/** Whether a flow is conserved (Kirchhoff balance / ker ∂). */
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
  return Object.freeze({ kind: "meme-analysis.conservation.conserved:witness" as const, network, flow: Object.freeze([...flow]), divergence: div });
}

/** The elided edge was solved for and the flow now conserves. */
export interface CompletionWitness {
  readonly kind: "meme-analysis.conservation.completion:witness";
  readonly network: FlowNetworkCarrier;
  readonly edge: FlowEdge;
  readonly inferred: Rational;
  readonly flow: readonly Rational[];
}

/** The elided edge could not close the imbalance globally. */
export interface CompletionObstruction {
  readonly kind: "meme-analysis.conservation.completion-obstruction";
  readonly network: FlowNetworkCarrier;
  readonly edge: FlowEdge;
  readonly inferred: Rational;
  readonly flow: readonly Rational[];
  readonly atTerm: PredicationTerm;
  readonly residual: Rational;
}

/** The result of completing an elided edge. */
export type CompletionJudgment = CompletionWitness | CompletionObstruction;

/** Solve for the value on an elided edge that makes the whole flow conserve. */
export function complete(network: FlowNetworkCarrier, flow: readonly Rational[], holeIndex: number): CompletionJudgment {
  requireFlow(network, flow);
  if (holeIndex < 0 || holeIndex >= network.edges.length) throw new RangeError("the elided edge must be an edge of the network");
  const edge = network.edges[holeIndex]!;
  const rest = flow.map((value, index) => (index === holeIndex ? ratZero : value));
  const restDivergence = divergence(network, rest);
  const inferred = restDivergence[edge.fromIndex]!;
  const completed = Object.freeze(rest.map((value, index) => (index === holeIndex ? inferred : value)));
  const judgment = conserved(network, completed);
  if (judgment.kind === "meme-analysis.conservation.conserved:witness") {
    return Object.freeze({ kind: "meme-analysis.conservation.completion:witness" as const, network, edge, inferred, flow: completed });
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

/** A grade-tagged additive structure: read a sector, add within it, recognize zero, negate. */
export interface GradedAdditive<Q> {
  readonly gradeOf: (quantity: Q) => string;
  readonly add: (left: Q, right: Q) => Q;
  readonly isZero: (quantity: Q) => boolean;
  readonly negate: (quantity: Q) => Q;
}

/** The signed per-sector residual of a 0-chain, in first-seen order, nonzero sectors only. */
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

/** Conservation over any GradedAdditive: conserved when the residual is empty. */
export function gradedConservedBy<Q>(amounts: readonly Q[], ops: GradedAdditive<Q>): { readonly conserved: boolean; readonly residual: readonly Q[] } {
  const residual = gradedResidualBy(amounts, ops);
  return Object.freeze({ conserved: residual.length === 0, residual });
}

/** Completion over any GradedAdditive: the missing quantity, or why it cannot be inferred. */
export type GradedCompletionBy<Q> =
  | { readonly kind: "witness"; readonly inferred: Q }
  | { readonly kind: "obstruction"; readonly reason: "balanced" | "ambiguous"; readonly residual: readonly Q[] };

/** Infer the one quantity missing so the 0-chain conserves (residual in one sector). */
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

/** The signed per-sector residual of a carrier 0-chain. */
export function gradedResidual(amounts: readonly GradedRational[]): readonly GradedRational[] {
  return gradedResidualBy(amounts, carrierAdditive);
}

/** A graded 0-chain that conserves in every sector. */
export interface GradedConservedWitness {
  readonly kind: "meme-analysis.conservation.graded:witness";
  readonly amounts: readonly GradedRational[];
}

/** A graded 0-chain with surviving per-sector residuals. */
export interface GradedConservedObstruction {
  readonly kind: "meme-analysis.conservation.graded-obstruction";
  readonly amounts: readonly GradedRational[];
  readonly residual: readonly GradedRational[];
}

/** The result of judging a graded 0-chain for conservation. */
export type GradedConservedJudgment = GradedConservedWitness | GradedConservedObstruction;

/** Graded conservation judgment. */
export function gradedConserved(amounts: readonly GradedRational[]): GradedConservedJudgment {
  const { conserved, residual } = gradedConservedBy(amounts, carrierAdditive);
  if (conserved) return Object.freeze({ kind: "meme-analysis.conservation.graded:witness" as const, amounts: Object.freeze([...amounts]) });
  return Object.freeze({ kind: "meme-analysis.conservation.graded-obstruction" as const, amounts: Object.freeze([...amounts]), residual });
}

/** An elided graded amount solved for (residual confined to one sector). */
export interface GradedCompletionWitness {
  readonly kind: "meme-analysis.conservation.graded-completion:witness";
  readonly known: readonly GradedRational[];
  readonly inferred: GradedRational;
}

/** An elided graded amount that cannot be inferred (balanced or ambiguous). */
export interface GradedCompletionObstruction {
  readonly kind: "meme-analysis.conservation.graded-completion-obstruction";
  readonly known: readonly GradedRational[];
  readonly reason: "balanced" | "ambiguous";
  readonly residual: readonly GradedRational[];
}

/** The result of completing an elided graded amount. */
export type GradedCompletionJudgment = GradedCompletionWitness | GradedCompletionObstruction;

/** Infer the one graded amount missing so the 0-chain conserves. */
export function gradedComplete(known: readonly GradedRational[]): GradedCompletionJudgment {
  const completion = gradedCompleteBy(known, carrierAdditive);
  if (completion.kind === "witness") {
    return Object.freeze({ kind: "meme-analysis.conservation.graded-completion:witness" as const, known: Object.freeze([...known]), inferred: completion.inferred });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-completion-obstruction" as const,
    known: Object.freeze([...known]),
    reason: completion.reason,
    residual: completion.residual,
  });
}
