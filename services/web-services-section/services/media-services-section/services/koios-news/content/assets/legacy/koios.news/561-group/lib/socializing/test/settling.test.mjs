/**
 * settling.test — the settling-stage τ dynamics: the field's monotone evolution to its
 * quiescent limit v∞, and the settling depth κ (the closure ordinal).
 *
 * A settling is a monotone family (v_τ)_{τ<λ} with v_σ ≤_k v_τ
 * (spatiotemporal-knowledge-presheaf); a distributed settling system reaches the common
 * limit v∞ = cl(⋁_k U) by CRDT gossip in finitely many steps, no consensus protocol
 * (crdt-convergence.md). socializing's `settle` realizes this as synchronous gossip-merge
 * rounds (cl = identity) to quiescence; κ is the number of rounds that changed the field
 * — the closure ordinal of the social settling. These tests assert: monotonicity across
 * stages, quiescence at a fixpoint, convergence of every observer to the component pooled
 * (∨_k) charge, and κ = the observer graph's eccentricity (finite ⇒ strict-consistent).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { meme, cell, token, mark, charge, chargeValue, canonical, joinKnowledge } from "@emsenn/relating";
import {
  emptyField,
  admitAction,
  settleAction,
  settleTrajectory,
  convergeAction,
} from "@emsenn/socializing";

/** A meme over a DISTINCT cell per label, charged potential. */
function memeOf(label) {
  const c = cell(token(mark(label)), mark(`p:${label}`), token(mark("o")));
  return meme(c, charge(chargeValue("potential"), [[mark(`${label}-w`)], []]));
}

/** A society whose observer i holds memes[i]; the base is whatever pairs give. */
function societyWith(memesByObserver, pairs) {
  let field = emptyField();
  memesByObserver.forEach((memes, i) => {
    field = admitAction.run(field, { agent: `o${i}|exists`, memes });
  });
  if (pairs === undefined) return field;
  return { ...field, base: { kind: "socializing.social-base", translations: pairs.map(([source, target]) => ({
    kind: "socializing.translation", source, target,
    channel: { kind: "communicating.messaging.channel", medium: "t",
      from: { kind: "communicating.speaking.signifying.semiosphere", name: "a" },
      to: { kind: "communicating.speaking.signifying.semiosphere", name: "b" }, capacity: null } })) } };
}

const cellsOf = (member) => member.memes.map((m) => canonical(m.cell)).sort();

// --- the trajectory is a monotone family that quiesces ---

test("settling-monotonicity: each observer's stalk is non-decreasing across stages (v_σ ≤_k v_τ)", () => {
  // a path 0—1—2, each with a distinct meme: knowledge propagates hop by hop.
  const field = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]], [[0, 1], [1, 2]]);
  const { stages } = settleTrajectory(field);
  for (let s = 1; s < stages.length; s++) {
    for (let i = 0; i < field.members.length; i++) {
      const before = new Set(cellsOf(stages[s - 1].members[i]));
      const after = cellsOf(stages[s].members[i]);
      for (const cellKey of before) assert.ok(after.includes(cellKey), `stage ${s} observer ${i}: knowledge only grows`);
    }
  }
});

test("settle quiesces to a fixpoint: a further settle changes nothing", () => {
  const field = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]], [[0, 1], [1, 2]]);
  const once = settleAction.run(field, {});
  const twice = settleAction.run(once, {});
  assert.equal(canonical(once.members.map((m) => m.memes)), canonical(twice.members.map((m) => m.memes)), "v∞ is a fixpoint of the gossip-merge");
});

// --- convergence: every observer reaches the component pooled (∨_k) charge ---

test("settle converges every observer to v∞: on a connected graph all hold the same merged stalk", () => {
  const field = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]], [[0, 1], [1, 2]]);
  const settled = settleAction.run(field, {});
  const stalks = settled.members.map((m) => canonical(m.memes));
  assert.equal(stalks[0], stalks[1], "observers 0 and 1 reach the same v∞");
  assert.equal(stalks[1], stalks[2], "observers 1 and 2 reach the same v∞");
  // v∞ holds all three cells (the join of every write).
  assert.equal(settled.members[0].memes.length, 3, "v∞ carries every observer's write (⋁_k U)");
});

test("settle merges opposed writes on a shared cell to the held join (stable), not absurd", () => {
  // two observers, same cell, opposite polarity, connected.
  const cShared = cell(token(mark("s")), mark("p:s"), token(mark("o")));
  const pos = meme(cShared, charge(chargeValue("potential"), [[mark("pos")], []]));
  const neg = meme(cShared, charge(chargeValue("active"), [[], [mark("neg")]]));
  const field = societyWith([[pos], [neg]], [[0, 1]]);
  const settled = settleAction.run(field, {});
  const expected = canonical(joinKnowledge(pos.charge, neg.charge));
  assert.equal(canonical(settled.members[0].memes[0].charge), expected, "v∞ joins the opposed charges (potential ∨_k active = stable)");
  assert.equal(canonical(settled.members[1].memes[0].charge), expected, "both observers reach the same held join");
});

// --- the settling depth κ (the closure ordinal) = the observer graph eccentricity ---

test("closure ordinal κ: a complete graph settles in one round; a path takes its diameter", () => {
  // complete graph on 3 (admit's default): every observer adjacent ⇒ κ = 1.
  const complete = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]]); // default completeTranslations
  assert.equal(settleTrajectory(complete).closureOrdinal, 1, "complete graph ⇒ κ = 1");
  // a path 0—1—2—3: knowledge from 0 reaches 3 in 3 rounds ⇒ κ = 3.
  const path = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")], [memeOf("d")]], [[0, 1], [1, 2], [2, 3]]);
  assert.equal(settleTrajectory(path).closureOrdinal, 3, "path of 4 ⇒ κ = 3 (the diameter)");
});

test("an already-quiescent field settles in κ = 0 (no dynamics needed)", () => {
  // a single observer: nothing to propagate.
  const solo = societyWith([[memeOf("a")]]);
  assert.equal(settleTrajectory(solo).closureOrdinal, 0, "one observer ⇒ κ = 0");
  // identical knowledge everywhere on a complete graph also needs no change.
  const same = societyWith([[memeOf("x")], [memeOf("x")]]);
  assert.equal(settleTrajectory(same).closureOrdinal, 0, "already-shared knowledge ⇒ κ = 0");
});

// --- settle records κ in the section and re-reads the consensus over v∞ ---

test("settle writes the settling depth κ into the section and re-reads the consensus", () => {
  const field = societyWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]], [[0, 1], [1, 2]]);
  const settled = settleAction.run(field, {});
  assert.equal(settled.section.closureOrdinal, 2, "the section records κ = 2 (the path diameter)");
  assert.ok(settled.section.regime === "strict", "a finite field settles in κ < ω — consistent with the strict regime");
  // the consensus is re-read over v∞: the field glues (agreeing writes, no opposition).
  assert.equal(settled.section.obstruction, 0, "no opposition ⇒ glued consensus over v∞");
  assert.equal(settled.section.glued, true);
});
