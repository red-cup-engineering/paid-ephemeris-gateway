/**
 * off-diagonal.test — the GENUINELY SOCIAL morphisms: the inter-observer translation
 * V(α), the CRDT merge ∨_k, and the CALM connection between merge and converge.
 *
 * These are socializing's realization of the multi-observer system's OFF-DIAGONAL
 * content (content/_archive spatiotemporal-knowledge-presheaf) — morphisms among
 * DISTINCT observers, with no single-agent analog, which a stalkwise (diagonal) lift
 * cannot express:
 *
 *   - translate  the perspective map V(α): carry observer `from`'s memes across a
 *                translation morphism into observer `to`'s frame (re-signed). Requires
 *                the directed morphism; `from` is unchanged.
 *   - merge      the distributed-settling CRDT exchange: observer `to` becomes
 *                V(to) ∨_k V(from) cellwise — monotone, idempotent; requires adjacency.
 *   - CALM       iterated merge over a COORDINATION-FREE field (H¹ = 0) converges:
 *                every observer reaches the component's pooled (∨_k) charge — exactly
 *                what converge reports. (When H¹ ≠ 0 the merge of opposed charges is a
 *                held contradiction, not coordinated away.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  meme, cell, token, mark, charge, chargeValue, valueOf, canonical,
} from "@emsenn/relating";
import {
  emptyField,
  admitAction,
  mergeAction,
  translateAction,
  convergeAction,
} from "@emsenn/socializing";

/** A meme over the named cell, charged `potential` (truth witnessed) or `active`. */
function memeOn(subject, predicate, object, positive = true) {
  const c = cell(token(mark(subject)), mark(predicate), token(mark(object)));
  return positive
    ? meme(c, charge(chargeValue("potential"), [[mark(`${subject}-w`)], []]))
    : meme(c, charge(chargeValue("active"), [[], [mark(`${subject}-w`)]]));
}

/** A society of `n` observers (complete observer category from admit), each seeded
 *  with the given memes (memes[i] is observer i's local stalk). */
function societyWith(memesByObserver) {
  let field = emptyField();
  memesByObserver.forEach((memes, i) => {
    field = admitAction.run(field, { agent: `agent-${i}|exists`, memes });
  });
  return field;
}

// --- translate: the inter-observer perspective map V(α) ---

test("translate carries from's memes into to's frame; from is unchanged, to grows", () => {
  const field = societyWith([[memeOn("a", "p", "b")], []]); // obs0 has one meme, obs1 none
  const out = translateAction.run(field, { from: 0, to: 1 });
  assert.equal(out.members[0].memes.length, 1, "the source observer is unchanged (translation copies)");
  assert.equal(out.members[1].memes.length, 1, "the target observer received the translated meme");
  // the received meme is communicating.translate's output: its subject records the crossing.
  const received = out.members[1].memes[0];
  assert.ok("translatedFrom" in received.cell.subject.mark.value, "the received meme records translatedFrom (re-signed via communicating.translate)");
});

test("translate requires a directed translation from → to in the observer category", () => {
  // a hand-built field whose only translation is 1 → 0, so 0 → 1 is absent.
  const base = societyWith([[memeOn("a", "p", "b")], []]);
  const oneWay = { ...base, base: { kind: "socializing.social-base", translations: [
    { kind: "socializing.translation", source: 1, target: 0, channel: {
      kind: "communicating.messaging.channel", medium: "t",
      from: { kind: "communicating.speaking.signifying.semiosphere", name: "x" },
      to: { kind: "communicating.speaking.signifying.semiosphere", name: "y" }, capacity: null } },
  ] } };
  assert.throws(() => translateAction.run(oneWay, { from: 0, to: 1 }), /no translation morphism 0 → 1/);
});

test("translate refuses a degenerate self-translation (from = to)", () => {
  const field = societyWith([[memeOn("a", "p", "b")]]);
  assert.throws(() => translateAction.run(field, { from: 0, to: 0 }), /distinct observers/);
});

// --- merge: the CRDT ∨_k exchange ---

test("merge grows the target by the union of cells (monotone); the source is unchanged", () => {
  const field = societyWith([[memeOn("a", "p", "b")], [memeOn("c", "q", "d")]]);
  const out = mergeAction.run(field, { from: 0, to: 1 });
  assert.equal(out.members[0].memes.length, 1, "the sender is unchanged");
  assert.equal(out.members[1].memes.length, 2, "the receiver now holds both cells (knowledge grew)");
});

test("merge joins charges on a shared cell: potential ∨_k active settles stable (both witnessed)", () => {
  // obs0 positive on (a,p,b), obs1 negative on the SAME cell.
  const field = societyWith([[memeOn("a", "p", "b", true)], [memeOn("a", "p", "b", false)]]);
  const out = mergeAction.run(field, { from: 0, to: 1 });
  assert.equal(out.members[1].memes.length, 1, "the shared cell stays one meme (charges joined, not duplicated)");
  assert.equal(valueOf(out.members[1].memes[0].charge).name, "stable", "potential ∨_k active = stable (held, both-witnessed)");
});

test("merge is idempotent: merging the same source twice leaves the target fixed", () => {
  const field = societyWith([[memeOn("a", "p", "b")], [memeOn("c", "q", "d")]]);
  const once = mergeAction.run(field, { from: 0, to: 1 });
  const twice = mergeAction.run(once, { from: 0, to: 1 });
  assert.equal(canonical(once.members[1].memes), canonical(twice.members[1].memes), "∨_k is idempotent — re-merge changes nothing");
});

test("merge requires the observers to be adjacent in the observer category", () => {
  const base = societyWith([[memeOn("a", "p", "b")], [memeOn("c", "q", "d")]]);
  const disconnected = { ...base, base: { kind: "socializing.social-base", translations: [] } };
  assert.throws(() => mergeAction.run(disconnected, { from: 0, to: 1 }), /not adjacent/);
});

// --- CALM: iterated merge over a coordination-free field reaches the consensus pooled ---

test("CALM: iterated merge over a coordination-free field converges every observer to the pooled charge", () => {
  // three observers agreeing (all positive) on the same cell — no opposition ⇒ H¹ = 0.
  let field = societyWith([
    [memeOn("s", "p", "o", true)],
    [memeOn("s", "p", "o", true)],
    [memeOn("s", "p", "o", true)],
  ]);
  // confirm coordination-free before merging.
  const before = convergeAction.run(field, {});
  assert.equal(before.section.coordinationFree, true, "agreeing observers are coordination-free (H¹ = 0 — CALM applies)");
  const pooledName = valueOf(before.section.components.find((c) => c.members.length === 3).pooled).name;

  // iterate merge across the complete observer category until a fixpoint (a few rounds).
  const edges = [[0, 1], [1, 2], [2, 0]];
  for (let round = 0; round < 3; round++) {
    for (const [a, b] of edges) {
      field = mergeAction.run(field, { from: a, to: b });
      field = mergeAction.run(field, { from: b, to: a });
    }
  }
  // every observer converged to the SAME state (CRDT convergence)…
  const states = field.members.map((m) => canonical(m.memes));
  assert.equal(states[0], states[1], "observers 0 and 1 converged to the same state");
  assert.equal(states[1], states[2], "observers 1 and 2 converged to the same state");
  // …and that state's charge is the consensus pooled charge converge reports.
  assert.equal(valueOf(field.members[0].memes[0].charge).name, pooledName, "the converged charge is the pooled (∨_k) consensus");
});

test("merge of opposed observers is a held contradiction (stable), not coordinated away", () => {
  // obs0 positive, obs1 negative on the same cell, adjacent — a single opposed edge.
  const field = societyWith([[memeOn("s", "p", "o", true)], [memeOn("s", "p", "o", false)]]);
  const out = mergeAction.run(field, { from: 0, to: 1 });
  assert.equal(valueOf(out.members[1].memes[0].charge).name, "stable", "the contradiction is held stable (paraconsistent), never absurd");
});
