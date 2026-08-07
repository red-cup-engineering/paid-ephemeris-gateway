/**
 * sheaf — bilattice network-sheaf consensus over a fleet of observer charges.
 *
 * This is the collective decision-settling the algebra layer defers: many agents
 * observe the same subject and each contributes a charge; consensus is read off
 * the network sheaf on the observer graph. Theory:
 * `work/archive/quorum-as-colimit-of-voter-fibers.md`,
 * `consensus-closure.md`, and the bilattice-network-sheaf-consensus theorem —
 * the obstruction to agreement is exactly the H¹ of the opposition subgraph.
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
 * Ported onto the one descent (`@emsenn/relating`): fleet consensus is
 * the lawful home for this consensus read.
 */

import {
  joinKnowledge,
  meetKnowledge,
  valueOf,
  type ChargeCarrier,
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
  const touched = [...new Set(opposedPairs.flat())];
  const opposedComponents = touched.length === 0
    ? 0
    : connectedComponents(charges.length, opposedPairs).filter((group) => group.some((member) => touched.includes(member))).length;
  const obstruction = opposedPairs.length === 0 ? 0 : opposedPairs.length - touched.length + opposedComponents;
  const coordinationFree = obstruction === 0;
  const confidentByComponent = componentConsensus.map(({ pooled }) => coordinationFree && definite(pooled));

  return {
    componentConsensus,
    opposedEdges,
    obstruction,
    coordinationFree,
    confidentByComponent,
    confident: coordinationFree && confidentByComponent.every(Boolean),
  };
}

/** Consensus over any observations that carry a `charge`. */
export function sheafObservations(
  observations: readonly { readonly charge: ChargeCarrier }[],
  edges: readonly ObserverEdge[] = completeGraph(observations.length),
): SheafConsensus {
  return sheafCharges(observations.map((observation) => observation.charge), edges);
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
