/**
 * socialize/glue — the Mayer–Vietoris gluing of a replica-cover into its H⁰ global
 * section, with the connecting-map δ⁰ / H¹ obstruction read explicitly.
 *
 * The corpus's coordination theory (content/_archive: `replica-cover.md`,
 * `crdt-convergence-via-mayer-vietoris.md`, `cohomology-as-coordination-substrate.md`)
 * reads a node's consensus as a SHEAF GLUING. A node's replica-cover `{ o_i → target }`
 * is a covering family; its Čech nerve has the overlaps `U_i ∩ U_j`; the Mayer–Vietoris
 * sequence at degree 0 is
 *
 *   0 → H⁰(U) → ⊕_i H⁰(U_i) → ⊕_{i<j} H⁰(U_i ∩ U_j) →[δ⁰] H¹(U) → ⋯
 *
 * The decided value (the consensus) is the global section `H⁰(U)`; the obstruction to
 * gluing the local sections into it is `H¹(U)`, reached through the connecting map δ⁰.
 * Coordination-freeness is exactly `δ⁰ = 0` (cohomological-CALM), and — the corpus's
 * `bilattice-network-sheaf-consensus` theorem — the cellwise `∨_k`-merge over a
 * connected cover IS that unique global section.
 *
 * `glue` realizes this at a node: it presents `target`'s H⁰ global section by
 * `∨_k`-merging its replica-cover's local sections into it (the gluing), then re-reads
 * the consensus. The Mayer–Vietoris pieces — the cover, the glued H⁰ charge, the δ⁰/H¹
 * obstruction, and the Čech-overlap agreements — are exposed by `replicaCoverConsensus`
 * for inspection. This is the STATIC, Čech complement to `settle`'s dynamic gossip: glue
 * assembles ONE node's cover in one MV step; settle iterates the merge to the global v∞.
 *
 * Reuses `coverOf`/`coverSubgraph` (the site's covering family + induced nerve),
 * `mergeStalks` (the ∨_k that IS the global section), `sheafCharges`/`opposed` (the H¹
 * obstruction and overlap-agreement), and `convergeAction` (the re-read).
 */
import {
  action,
  jsonResource,
  type Action,
  type ChargeCarrier,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import {
  sheafCharges,
  opposed,
} from "./consensus.mjs";

import {
  admitField,
  coverOf,
  coverSubgraph,
  type Field,
  type FieldMember,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { mergeStalks } from "./merge.mjs";
import { convergeAction } from "./converge.mjs";

/** A Čech overlap of the cover: the pair `U_left ∩ U_right` and whether the two local
 *  sections AGREE there (not opposed) — the data the gluing condition reads. */
export interface CoverOverlap {
  readonly left: number;
  readonly right: number;
  readonly agree: boolean;
}

/** The Mayer–Vietoris reading of an observer's replica-cover. */
export interface ReplicaCoverConsensus {
  /** the cover members (target first, then its covering sources), by observer index. */
  readonly cover: readonly number[];
  /** H⁰: the glued global section's charge over the cover (the component-pooled ∨_k). */
  readonly glued: ChargeCarrier;
  /** H¹: the obstruction to gluing — the opposition Betti number over the cover's nerve. */
  readonly obstruction: number;
  /** δ⁰ = 0: the local sections glue with no coordination (cohomological-CALM). */
  readonly coordinationFree: boolean;
  /** the Čech nerve: each overlap `U_i ∩ U_j` and whether the sections agree there. */
  readonly overlaps: readonly CoverOverlap[];
}

/**
 * The Mayer–Vietoris reading over `target`'s replica-cover: the cover members, the glued
 * H⁰ section (the ∨_k pooled charge of the component holding `target`), the H¹
 * obstruction and its δ⁰ = 0 coordination-freeness, and the Čech overlap agreements.
 */
export function replicaCoverConsensus(field: Field, target: number): ReplicaCoverConsensus {
  const sub = coverSubgraph(field, target); // target is local index 0
  const consensus = sheafCharges(sub.charges, sub.edges);
  const component = consensus.componentConsensus.find((c) => c.members.includes(0));
  const glued = component ? component.pooled : sub.charges[0]!;
  const overlaps: readonly CoverOverlap[] = sub.edges.map(([left, right]) => Object.freeze({
    left: sub.members[left]!,
    right: sub.members[right]!,
    agree: !opposed(sub.charges[left]!, sub.charges[right]!),
  }));
  return Object.freeze({
    cover: sub.members,
    glued,
    obstruction: consensus.obstruction,
    coordinationFree: consensus.coordinationFree,
    overlaps,
  });
}

/** glue — present `target`'s H⁰ global section by ∨_k-merging its replica-cover into it. */
export const glueAction: Action = action({
  verb: "glue",
  inputFormat: "json",
  outputFormat: "json",
  options: ["cover"],
  summary: "Mayer–Vietoris gluing: present observer `cover`'s H⁰ global section by ∨_k-merging its replica-cover's local sections into it; the cover's H¹ obstruction is read explicitly.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Glues the replica-cover { o_i → target } of options.cover (default 0): the target observer's stalk becomes the cellwise ∨_k-merge of its own and its covering sources' local sections — the unique global section H⁰(U) (bilattice-network-sheaf-consensus). Then re-reads the consensus over the whole field. The Mayer–Vietoris obstruction (the cover's H¹, the δ⁰ = 0 coordination-freeness, and the Čech-overlap agreements) is exposed by replicaCoverConsensus. The static, Čech complement to settle's dynamic gossip.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "glue");
    const target = Number(args.cover ?? 0);
    if (!Number.isInteger(target) || target < 0 || target >= field.members.length) {
      throw new RangeError(`glue: cover target ${String(args.cover)} out of range`);
    }
    // H⁰: the global section over the cover = the ∨_k-merge of the cover's local sections
    // into the target (the covering sources' stalks folded into the target's).
    const sources = [...new Set(coverOf(field.base, target).map((t) => t.source))];
    const glued = sources.reduce<readonly JsonRecord[]>(
      (stalk, source) => mergeStalks(stalk, field.members[source]!.memes),
      field.members[target]!.memes,
    );
    const members: readonly FieldMember[] = field.members.map((member, index) =>
      index === target ? Object.freeze({ ...member, memes: glued }) : member,
    );
    const next: Field = Object.freeze({ ...field, members });
    // re-read the consensus over the field now carrying the glued global section.
    return convergeAction.run(next as unknown as JsonValue, {}) as JsonValue;
  },
});
