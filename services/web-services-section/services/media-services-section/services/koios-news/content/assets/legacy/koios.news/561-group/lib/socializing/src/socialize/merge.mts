/**
 * socialize/merge — the CRDT knowledge-order exchange (∨_k), scale-2-native.
 *
 * merge is the OFF-DIAGONAL heart of socializing: a genuinely inter-observer morphism
 * with NO single-agent analog (a lone observer has no peer to merge with — like
 * `admit`, it is native to scale 2). It realizes the corpus's distributed-settling
 * system (content/_archive spatiotemporal-knowledge-presheaf
 * `distributed-settling-system.md`): replicas exchange state via the **merge
 * operation — the pointwise knowledge-order join `∨_k` of their valuations**.
 *
 * `merge(from, to)` is a directed replica receive: observer `to` incorporates observer
 * `from`'s knowledge, becoming `V(to) ∨_k V(from)` cellwise; `from` is unchanged (it
 * sent a copy). The two observers must be adjacent in the observer category `O` (a
 * translation in either direction is the medium of exchange). The join is taken
 * per predication cell: memes over the same cell have their charges `joinKnowledge`-d
 * (the bilattice knowledge join, evidence-accumulating, dedup by `mergeEvidence`);
 * memes unique to either side carry through.
 *
 * The CRDT laws this realizes (and the suite asserts):
 *   - MONOTONE: `merge(from, to) ≥_k to` — knowledge only grows (settling-monotonicity).
 *   - IDEMPOTENT: `merge(to, to)` leaves `to` fixed (∨_k is idempotent).
 *   - the FIXPOINT of iterated merge over a component is its `pooled = ∨_k` charge —
 *     which is exactly what `converge` reports, and (by the CALM theorem) is reached
 *     COORDINATION-FREE iff `H¹ = 0`. So merge is the dynamics; converge is its readout.
 *
 * Reuses relating's `joinKnowledge`/`meme`/`canonical` — the same knowledge-order join
 * `converge`'s `representativeCharge` already folds, here ranged across the edge.
 */
import {
  action,
  jsonResource,
  isMeme,
  meme as buildMeme,
  canonical,
  joinKnowledge,
  type Action,
  type ChargeCarrier,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import {
  admitField,
  translationBetween,
  type Field,
  type FieldMember,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";

/** The cell and charge a meme carries (structural reading; stalk memes may be clones). */
function cellOf(meme: JsonRecord): JsonValue {
  return (meme as unknown as { readonly cell: JsonValue }).cell;
}
function chargeOf(meme: JsonRecord): ChargeCarrier {
  return (meme as unknown as { readonly charge: ChargeCarrier }).charge;
}

/**
 * The pointwise knowledge-order join (∨_k) of two stalks: group every meme by its
 * predication cell (`canonical`), fold the charges over each cell with `joinKnowledge`,
 * and rebuild one meme per cell. Non-meme items (there should be none) pass through.
 *
 * This is the semilattice merge of `settling-merge-semilattice.md` — commutative,
 * associative, idempotent — exported so the settling dynamics (`settle.mts`) can fold
 * it across a gossip round.
 */
export function mergeStalks(into: readonly JsonRecord[], incoming: readonly JsonRecord[]): readonly JsonRecord[] {
  const byCell = new Map<string, { readonly cell: JsonValue; charge: ChargeCarrier }>();
  const passthrough: JsonRecord[] = [];
  const fold = (m: JsonRecord): void => {
    if (!isMeme(m)) { passthrough.push(m); return; }
    const key = canonical(cellOf(m));
    const prev = byCell.get(key);
    byCell.set(key, prev
      ? { cell: prev.cell, charge: joinKnowledge(prev.charge, chargeOf(m)) }
      : { cell: cellOf(m), charge: chargeOf(m) });
  };
  for (const m of into) fold(m);
  for (const m of incoming) fold(m);
  // Emit in canonical cell order — a CRDT state is order-irrelevant, so the merged
  // stalk has a canonical NORMAL FORM: observers that have received the same writes
  // converge to byte-identical stalks regardless of the order they merged in.
  const merged = [...byCell.keys()].sort().map((key) => {
    const { cell, charge } = byCell.get(key)!;
    return buildMeme(cell as never, charge) as unknown as JsonRecord;
  });
  return Object.freeze([...merged, ...passthrough]);
}

/** Range-check an observer index against the field. */
function observerIndex(field: Field, value: JsonValue, role: string): number {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index >= field.members.length) {
    throw new RangeError(`merge: ${role} index ${String(value)} out of range`);
  }
  return index;
}

/** merge — observer `to` receives observer `from`'s knowledge (to ← to ∨_k from). */
export const mergeAction: Action = action({
  verb: "merge",
  inputFormat: "json",
  outputFormat: "json",
  options: ["from", "to"],
  summary: "CRDT ∨_k exchange (scale-2-native): observer `to` incorporates observer `from`'s knowledge cellwise — monotone, idempotent — over an edge of the observer category.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The distributed-settling merge: observer options.to becomes V(to) ∨_k V(from) — memes over the same predication cell have their charges joinKnowledge-d (knowledge-order join), memes unique to either side carry through; from is unchanged. The two observers must be adjacent in the observer category O. Monotone (knowledge only grows) and idempotent; the fixpoint of iterated merge over a component is its pooled ∨_k charge, reached coordination-free iff H¹ = 0 (CALM). Has no single-agent analog — native to scale 2, like admit.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "merge");
    const from = observerIndex(field, (args.from ?? 0) as JsonValue, "from");
    const to = observerIndex(field, (args.to ?? 1) as JsonValue, "to");
    if (from === to) {
      // a self-merge is the identity (∨_k is idempotent) — nothing to exchange.
      return jsonResource(field as unknown as JsonValue, "social-field");
    }
    const adjacent = translationBetween(field.base, from, to) ?? translationBetween(field.base, to, from);
    if (!adjacent) {
      throw new RangeError(`merge: observers ${from} and ${to} are not adjacent in the observer category (no translation between them)`);
    }
    const sender = field.members[from]!;
    const receiver = field.members[to]!;
    const mergedMemes = mergeStalks(receiver.memes, sender.memes);
    const members: readonly FieldMember[] = field.members.map((member, index) =>
      index === to ? Object.freeze({ ...member, memes: mergedMemes }) : member,
    );
    const next: Field = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
