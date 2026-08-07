/**
 * consensus — bilattice network-sheaf consensus over a fleet of observer charges.
 *
 * socializing's own collective-decision read (multi-observer settlement): many
 * agents observe the same subject and each contributes a charge; consensus is read
 * off the network sheaf on the observer graph. The obstruction to agreement is
 * exactly the H¹ of the opposition subgraph — disagreement is a topological
 * obstruction, not a mere mismatch. Theory:
 * `work/archive/quorum-as-colimit-of-voter-fibers.md`, `consensus-closure.md`, and
 * the bilattice-network-sheaf-consensus theorem.
 *
 * Per component (a connected group of observers):
 *   pooled = ⋀_k over the component  (knowledge-join — everything anyone knows)
 *   common = ⋁_k over the component  (knowledge-meet — what all agree on)
 * Two observers are *opposed* on an edge when one settled positive-only
 * (`potential`) and the other negative-only (`active`): a direct contradiction in
 * truth direction. The obstruction is the first Betti number of the opposition
 * subgraph (edges − touched-vertices + components); zero means coordination-free,
 * and the fleet is *confident* only when coordination-free and every component
 * pooled to a definite (non-⊥, non-⊤) charge.
 *
 * This is socializing's home for the consensus read — the off-diagonal observer
 * category O settling its plurality into one decision. (Relocated from animating;
 * a fleet's collective settlement is a social, not an interior-agent, concern.)
 */

import {
  analysis,
  cell,
  claim,
  cohomologyOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  joinKnowledge,
  mark,
  meetKnowledge,
  predicateOfClaim,
  token,
  valueOf,
  type ChargeCarrier,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

/**
 * An undirected comparison edge in the observer graph: a [left, right] pair of
 * observer indices whose settled charges are compared for opposition.
 */
export type ObserverEdge = readonly [left: number, right: number];

/**
 * The settled consensus over one connected component of observers: its member
 * indices, the knowledge-join `pooled` charge (everything anyone in the
 * component knows), and the knowledge-meet `common` charge (only what every
 * member shares).
 */
export interface ComponentConsensus {
  /** Observer indices in this connected component. */
  readonly members: readonly number[];
  /** Knowledge-join across the component — the union of all evidence. */
  readonly pooled: ChargeCarrier;
  /** Knowledge-meet across the component — only what every member shares. */
  readonly common: ChargeCarrier;
}

/**
 * The network-sheaf consensus read off a fleet of observer charges:
 * per-component consensus, the indices of opposed edges, the H1 obstruction
 * (first Betti number of the opposition subgraph) and whether it is zero
 * (coordinationFree), per-component confidence, and the overall `confident`
 * flag (coordination-free and every component pooled to a definite charge).
 */
export interface SheafConsensus {
  readonly componentConsensus: readonly ComponentConsensus[];
  /** Indices into `edges` whose endpoints settled to opposed truth directions. */
  readonly opposedEdges: readonly number[];
  /** Finite predication-cohomology receipt for the opposition subgraph. */
  readonly cohomology: JsonRecord;
  /** First Betti number of the opposition subgraph — the H¹ obstruction. */
  readonly obstruction: number;
  /** obstruction === 0: no cycle of disagreement to coordinate away. */
  readonly coordinationFree: boolean;
  readonly confidentByComponent: readonly boolean[];
  /** Coordination-free AND every component pooled to a definite charge. */
  readonly confident: boolean;
}

/** The complete graph on `size` observers — every observer compared with every other. */
export function completeGraph(size: number): ObserverEdge[] {
  const edges: ObserverEdge[] = [];
  for (let left = 0; left < size; left++) {
    for (let right = left + 1; right < size; right++) edges.push([left, right]);
  }
  return edges;
}

/** The [positive, negative] truth/falsity presence of a charge.
 *  ⊥ absurd = [f,f], t potential = [t,f], f active = [f,t], ⊤ stable = [t,t]. */
function present(charge: ChargeCarrier): readonly [positive: boolean, negative: boolean] {
  switch (valueOf(charge).name) {
    case "potential": return [true, false];
    case "active": return [false, true];
    case "stable": return [true, true];
    default: return [false, false]; // absurd
  }
}

/** A charge with a definite truth direction (potential or active, not ⊥/⊤). */
export function definite(charge: ChargeCarrier): boolean {
  const [positive, negative] = present(charge);
  return positive !== negative;
}

/** Two charges in directly opposed truth directions: one positive-only, the
 *  other negative-only. ⊥ and ⊤ are never opposed (no definite direction). */
export function opposed(left: ChargeCarrier, right: ChargeCarrier): boolean {
  const [leftPositive, leftNegative] = present(left);
  const [rightPositive, rightNegative] = present(right);
  return (leftPositive && !leftNegative && rightNegative && !rightPositive) ||
    (rightPositive && !rightNegative && leftNegative && !leftPositive);
}

/** Network-sheaf consensus over the observer charges and the comparison graph
 *  (default: complete graph — every pair compared). */
export function sheafCharges(
  charges: readonly ChargeCarrier[],
  edges: readonly ObserverEdge[] = completeGraph(charges.length),
): SheafConsensus {
  validateEdges(charges.length, edges);
  const components = connectedComponents(charges.length, edges);
  const componentConsensus: ComponentConsensus[] = components.map((members) => {
    const first = charges[members[0]!];
    if (!first) throw new TypeError("sheafCharges: component without a charge");
    const rest = members.slice(1).map((index) => charges[index]!);
    return {
      members,
      pooled: rest.reduce((left, right) => joinKnowledge(left, right), first),
      common: rest.reduce((left, right) => meetKnowledge(left, right), first),
    };
  });

  const opposedEdges: number[] = [];
  edges.forEach(([left, right], index) => {
    if (opposed(charges[left]!, charges[right]!)) opposedEdges.push(index);
  });
  const opposedPairs = opposedEdges.map((index) => edges[index]!);
  const cohomology = oppositionCohomology(opposedPairs);
  const obstruction = cohomology.h1;
  const coordinationFree = obstruction === 0;
  const confidentByComponent = componentConsensus.map(({ pooled }) => coordinationFree && definite(pooled));

  return {
    componentConsensus,
    opposedEdges,
    cohomology: cohomology.receipt,
    obstruction,
    coordinationFree,
    confidentByComponent,
    confident: coordinationFree && confidentByComponent.every(Boolean),
  };
}

function oppositionCohomology(opposedPairs: readonly ObserverEdge[]): {
  readonly h1: number;
  readonly receipt: JsonRecord;
} {
  const opposes = predicateOfClaim(claim(mark("opposes")));
  const cells = opposedPairs.map(([left, right]) =>
    cell(token(mark(`observer:${left}`)), opposes, token(mark(`observer:${right}`))));
  const cohomology = cohomologyOfCells(cells);
  const normalized = evaluateRunTerm(cohomologyTerms.carrier, cohomology as unknown as JsonValue) as JsonValue;
  const receipt = Object.freeze({
    kind: "socializing.consensus.cohomology" as const,
    cells: opposedPairs.length,
    h0: natCount(cohomology.zeroCohomology.rank),
    h1: natCount(cohomology.firstCohomology.rank),
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, cohomology.firstCohomology.vanishing as unknown as JsonValue),
    carrier: normalized,
  }) as JsonRecord;
  return { h1: receipt.h1 as number, receipt };
}

/** Consensus over any observations that carry a `charge`. */
export function sheafObservations(
  observations: readonly { readonly charge: ChargeCarrier }[],
  edges: readonly ObserverEdge[] = completeGraph(observations.length),
): SheafConsensus {
  return sheafCharges(observations.map((observation) => observation.charge), edges);
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const natCount = (natural: { readonly members: readonly unknown[] }): number => natural.members.length;

/**
 * The consensus read through the substrate graph Laplacian (`@emsenn/relating` analysis.laplacian).
 * Where `sheafCharges` computes the opposition subgraph's first Betti number by hand, this grounds the
 * CONSENSUS (agreement) structure in the spectral Laplacian over the fixed observer set: the AGREEMENT
 * graph is the comparison edges whose endpoints are not opposed.
 *   • clusters = the connected-component count H⁰ (the Laplacian's zero-eigenvalue multiplicity) — how
 *     many independent agreement groups the fleet settles into (consensus = a single global section,
 *     H⁰ of the cover, per the consensus-as-H⁰-construction theorem; isolated observers count).
 *   • agreementTrees = the Matrix-Tree spanning-tree count — the consensus ROBUSTNESS: `0` the fleet
 *     fragments into several clusters, `1` a single fragile thread of agreement (one lost link
 *     fragments it), `> 1` redundant agreement paths (resilient to a few disagreements).
 */
export interface SpectralConsensus {
  readonly kind: "socializing.spectral-consensus";
  /** the number of observers (the fixed vertex set of the agreement graph). */
  readonly observers: number;
  /** H⁰ = the number of independent agreement clusters (connected components, isolated observers
   *  counted), as the Laplacian's zero-eigenvalue multiplicity. */
  readonly clusters: number;
  /** whether the whole fleet agrees into one cluster (`clusters === 1`) — a single global section. */
  readonly unified: boolean;
  /** the Matrix-Tree spanning-tree count of the agreement graph — the consensus robustness. */
  readonly agreementTrees: number;
  /** redundant agreement paths (`agreementTrees > 1`): resilient to a few disagreements. */
  readonly robust: boolean;
  /** a single fragile thread of agreement (`agreementTrees === 1`): one lost link fragments it. */
  readonly fragile: boolean;
  /** CONSENSUS EQUILIBRIUM: whether the fleet's truth-lean assignment is HARMONIC on the comparison
   *  graph (`L·lean = 0`, the lean ∈ ker L) — every compared pair shares one truth direction, so no
   *  disagreement flows along any edge. This is the consensus = ker(L) reading (the field's settled
   *  limit is harmonic ⟺ coordination-free), DISTINCT from the structural `robust`/`fragile` reading:
   *  a fleet can be robustly connected yet not at equilibrium (compared neighbours leaning differently). */
  readonly atEquilibrium: boolean;
  /** derivable agreement: the EXACT/gradient flows of the agreement graph `rank(L) = V − C` (the
   *  pairwise agreements implied by a per-cluster consensus). */
  readonly derivable: number;
  /** irreducible agreement cycles: the HARMONIC flows `β₁ = E − V + C` (the H¹) — the redundant
   *  agreement loops that make the consensus robust beyond a spanning tree. */
  readonly irreducible: number;
}

/** An observer's TRUTH-LEAN as an exact integer: +1 leaning FOR (potential), −1 leaning AGAINST
 *  (active), 0 for no definite direction (⊥ absurd / ⊤ stable). The observable whose harmonicity on
 *  the comparison graph IS consensus equilibrium. */
const leanInteger = (charge: ChargeCarrier) => {
  const [positive, negative] = present(charge);
  if (positive && !negative) return analysis.intOne;
  if (negative && !positive) return analysis.intNegate(analysis.intOne);
  return analysis.intZero;
};

/** Read a fleet's consensus through the substrate graph Laplacian: the agreement graph's component
 *  count (H⁰) and spanning-tree robustness. */
export function spectralConsensus(
  charges: readonly ChargeCarrier[],
  edges: readonly ObserverEdge[] = completeGraph(charges.length),
): SpectralConsensus {
  validateEdges(charges.length, edges);
  const agreement = edges.filter(([left, right]) => !opposed(charges[left]!, charges[right]!));
  const spectrum = analysis.graphSpectrum(charges.length, agreement.map(([left, right]) => [left, right] as const));
  const clusters = natCount(spectrum.components);
  const agreementTrees = natCount(analysis.magnitude(spectrum.spanningTrees));
  const comparisonWeights = analysis.weightsOfEdges(charges.length, edges.map(([left, right]) => [left, right] as const));
  const atEquilibrium = analysis.isHarmonicOfWeights(comparisonWeights, charges.map(leanInteger));
  const hodge = analysis.hodgeDecompositionOfWeights(analysis.weightsOfEdges(charges.length, agreement.map(([left, right]) => [left, right] as const)));
  return Object.freeze({
    kind: "socializing.spectral-consensus" as const,
    observers: charges.length,
    clusters,
    unified: clusters === 1,
    agreementTrees,
    robust: agreementTrees > 1,
    fragile: agreementTrees === 1,
    atEquilibrium,
    derivable: natCount(hodge.exact),
    irreducible: natCount(hodge.harmonic),
  });
}

/** The diffusion endpoint of a fleet's charges: where each observer's agreement-community settles. */
export interface DiffusedField {
  readonly kind: "socializing.diffused-field";
  /** the number of observers. */
  readonly observers: number;
  /** observers whose agreement-community diffuses to a net FOR (+1) truth-direction. */
  readonly leansFor: number;
  /** observers whose agreement-community diffuses to a net AGAINST (−1) truth-direction. */
  readonly leansAgainst: number;
  /** observers whose agreement-community diffuses to a BALANCED (0) direction — no net lean. */
  readonly balanced: number;
}

/**
 * diffusedField — diffuse the fleet's charges to consensus. Each observer relaxes to the net
 * truth-DIRECTION of its agreement-community (`sign` of the harmonic projection `lim_{t→∞} e^{−tL}`
 * onto `ker L` — the per-community mean lean), read through the substrate `diffusionDirections`. Where
 * `spectralConsensus.atEquilibrium` asks WHETHER the leans are already harmonic, this reads what the
 * fleet settles TO: how many observers land for / against / balanced once consensus diffuses.
 */
export function diffusedField(
  charges: readonly ChargeCarrier[],
  edges: readonly ObserverEdge[] = completeGraph(charges.length),
): DiffusedField {
  validateEdges(charges.length, edges);
  const agreement = edges.filter(([left, right]) => !opposed(charges[left]!, charges[right]!));
  const weights = analysis.weightsOfEdges(charges.length, agreement.map(([left, right]) => [left, right] as const));
  const directions = analysis.diffusionDirections(weights, charges.map(leanInteger));
  let leansFor = 0;
  let leansAgainst = 0;
  let balanced = 0;
  for (const direction of directions) {
    if (analysis.intIsZero(direction)) balanced += 1;
    else if (analysis.isNegative(direction)) leansAgainst += 1;
    else leansFor += 1;
  }
  return Object.freeze({ kind: "socializing.diffused-field" as const, observers: charges.length, leansFor, leansAgainst, balanced });
}

function validateEdges(size: number, edges: readonly ObserverEdge[]): void {
  for (const [left, right] of edges) {
    if (left < 0 || right < 0 || left >= size || right >= size || left === right) {
      throw new RangeError(`sheafCharges: edge [${left},${right}] out of range or self-loop`);
    }
  }
}

function connectedComponents(size: number, edges: readonly ObserverEdge[]): number[][] {
  const parent = Array.from({ length: size }, (_, index) => index);
  const find = (value: number): number => parent[value] === value ? value : (parent[value] = find(parent[value]!));
  for (const [left, right] of edges) parent[find(left)] = find(right);
  const groups = new Map<number, number[]>();
  for (let index = 0; index < size; index++) {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(index);
    groups.set(root, group);
  }
  return [...groups.values()];
}
