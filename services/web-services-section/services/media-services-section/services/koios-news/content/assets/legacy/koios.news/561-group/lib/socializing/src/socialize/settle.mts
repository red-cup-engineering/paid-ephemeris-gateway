/**
 * socialize/settle — the closure-driven SOCIAL SETTLING: the field's evolution across
 * settling stages τ to its quiescent limit v∞.
 *
 * The corpus's settling is not a snapshot but a monotone family `(v_τ)_{τ<λ}` with
 * settling-monotonicity `v_σ ≤_k v_τ` for `σ ≤ τ` (spatiotemporal-knowledge-presheaf).
 * For a distributed settling system the dynamics are CRDT gossip: each replica's stage-τ
 * state is `cl(⋁_k U_{i,τ})` — the closure of the join of the writes it has received —
 * and once every write has reached every replica all converge to the common limit
 * `v∞ = cl(⋁_k U)`, in FINITELY many steps, with NO consensus protocol (crdt-convergence.md).
 *
 * `settle` realizes that dynamics on the Social Field. With no inference layer the
 * closure operator `cl` is the identity, so a settling stage is one SYNCHRONOUS
 * gossip-merge round: every observer simultaneously becomes `V(o) ∨_k ⋁_{neighbours} V`.
 * Rounds are iterated until the field quiesces (a fixpoint — a further round changes
 * nothing). The number of rounds that changed the field is the SETTLING DEPTH κ — the
 * closure ordinal of the social settling, here the eccentricity of the observer graph.
 * It is finite for a finite field (κ < ω) — consistent with the strict regime — and the
 * quiescent endpoint is the per-component pooled (`∨_k`) charge `converge` reports: this
 * is CRDT convergence run to its limit.
 *
 * The trajectory `(stages)` IS the monotone family `(v_τ)`. In the strict / scott
 * regimes (endpoint-state federation) only the endpoint v∞ matters; the trajectory is
 * the firing-ordinal record the transfinite regimes must SHIP (the trajectory federation
 * discipline). `settle` returns the quiesced field with `section.closureOrdinal = κ`;
 * `settleTrajectory` exposes the whole family for inspection and trajectory shipping.
 *
 * Reuses `mergeStalks` (the ∨_k semilattice merge) and `convergeAction` (the consensus
 * readout) — settle is the iteration of merge to the limit, then the converge readout.
 */
import {
  action,
  jsonResource,
  canonical,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import {
  admitField,
  comparisonEdges,
  type Field,
  type FieldMember,
  type FieldSection,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { mergeStalks } from "./merge.mjs";
import { convergeAction } from "./converge.mjs";

/** The undirected adjacency of the observer graph: observer index → its neighbours. */
function adjacency(field: Field): readonly (readonly number[])[] {
  const neighbours: number[][] = field.members.map(() => []);
  for (const [left, right] of comparisonEdges(field.base)) {
    neighbours[left]!.push(right);
    neighbours[right]!.push(left);
  }
  return neighbours;
}

/** One SYNCHRONOUS gossip-merge round (one settling stage): every observer
 *  simultaneously joins its own stalk with all its neighbours' stalks (∨_k). */
function oneRound(field: Field, neighbours: readonly (readonly number[])[]): Field {
  const members: readonly FieldMember[] = field.members.map((member, index) => {
    const merged = neighbours[index]!.reduce<readonly JsonRecord[]>(
      (stalk, j) => mergeStalks(stalk, field.members[j]!.memes),
      member.memes,
    );
    return Object.freeze({ ...member, memes: Object.freeze(merged) });
  });
  return Object.freeze({ ...field, members });
}

/** The canonical signature of the field's stalks — quiescence is signature stability. */
function stalkSignature(field: Field): string {
  return canonical(field.members.map((m) => m.memes) as unknown as JsonValue);
}

/**
 * Run the social settling to quiescence, recording the monotone family `(v_τ)`.
 * Returns the trajectory (stages[0] is the input; stages[κ] is the quiescent v∞) and the
 * settling depth κ (the number of rounds that changed the field). Bounded by the observer
 * count (a finite gossip graph fully propagates within that many rounds).
 */
export function settleTrajectory(field: Field): { readonly stages: readonly Field[]; readonly closureOrdinal: number } {
  const neighbours = adjacency(field);
  const stages: Field[] = [field];
  let current = field;
  let signature = stalkSignature(current);
  const bound = field.members.length + 1;
  for (let round = 1; round <= bound; round++) {
    const next = oneRound(current, neighbours);
    const nextSignature = stalkSignature(next);
    if (nextSignature === signature) {
      return { stages, closureOrdinal: round - 1 }; // already quiescent at stage round-1
    }
    stages.push(next);
    current = next;
    signature = nextSignature;
  }
  return { stages, closureOrdinal: bound };
}

/** settle — iterate the gossip-merge to the quiescent limit v∞; write κ and re-read the
 *  consensus over the settled field. */
export const settleAction: Action = action({
  verb: "settle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "The social settling: iterate the synchronous gossip-merge (∨_k) to the quiescent limit v∞, recording the settling depth κ (the closure ordinal) and re-reading the consensus.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Iterates the synchronous gossip-merge round (every observer becomes V(o) ∨_k ⋁_neighbours V) until quiescence — the CRDT limit v∞ = cl(⋁_k U), reached in finitely many rounds with no consensus protocol. Each observer's stalk is monotone non-decreasing across stages (settling-monotonicity v_σ ≤_k v_τ); on a connected component all observers converge to the component's pooled (∨_k) charge. Returns the quiesced field with section.closureOrdinal = κ (the settling depth / closure ordinal — finite ⇒ strict-regime-consistent) and the consensus re-read over v∞.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    void args;
    const field = admitField(input as JsonValue, "settle");
    const { stages, closureOrdinal } = settleTrajectory(field);
    const settled = stages[stages.length - 1]!;
    // re-read the consensus over the quiescent field, then record the settling depth κ.
    const converged = admitField(convergeAction.run(settled as unknown as JsonValue, {}) as JsonValue, "settle");
    const section: FieldSection = Object.freeze({ ...converged.section, closureOrdinal });
    const next: Field = Object.freeze({ ...converged, section });
    return jsonResource(next, "social-field");
  },
});
