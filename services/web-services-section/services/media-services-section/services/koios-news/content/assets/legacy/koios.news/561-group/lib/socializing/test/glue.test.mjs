/**
 * glue.test — the Mayer–Vietoris gluing of a replica-cover into its H⁰ global section,
 * and H¹ tied to the cover.
 *
 * The corpus reads a node's consensus as a sheaf gluing over its replica-cover
 * { o_i → target } (content/_archive: replica-cover.md, crdt-convergence-via-mayer-vietoris.md,
 * cohomology-as-coordination-substrate.md): the decided value is the global section
 * H⁰(U), the obstruction to gluing the local sections is H¹(U) via the connecting map
 * δ⁰, coordination-freeness is δ⁰ = 0, and the ∨_k-merge over a connected cover IS the
 * unique global section. These tests assert: glue lands the H⁰ global section, the MV
 * reading reports δ⁰/H¹ and the Čech-overlap agreements, and — the load-bearing point —
 * H¹ is the obstruction of the CHOSEN COVER, which can vanish on a node's cover even when
 * the whole observer graph does not glue.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { meme, cell, token, mark, charge, chargeValue, valueOf, canonical } from "@emsenn/relating";
import {
  emptyField,
  admitAction,
  broadcastAction,
  attendAction,
  convergeAction,
  glueAction,
  replicaCoverConsensus,
} from "@emsenn/socializing";

/** A meme over a DISTINCT cell per label, charged potential. */
function memeOf(label) {
  const c = cell(token(mark(label)), mark(`p:${label}`), token(mark("o")));
  return meme(c, charge(chargeValue("potential"), [[mark(`${label}-w`)], []]));
}

/** Admit `n` memberless observers, then set the base translations explicitly. */
function fieldWith(memesByObserver, translations) {
  let field = emptyField();
  memesByObserver.forEach((memes, i) => {
    field = admitAction.run(field, { agent: `o${i}|exists`, memes });
  });
  return { ...field, base: { kind: "socializing.social-base", translations: translations.map(([source, target]) => ({
    kind: "socializing.translation", source, target,
    channel: { kind: "communicating.messaging.channel", medium: "t",
      from: { kind: "communicating.speaking.signifying.semiosphere", name: "a" },
      to: { kind: "communicating.speaking.signifying.semiosphere", name: "b" }, capacity: null } })) } };
}

// --- glue lands the H⁰ global section ---

test("glue presents target's H⁰ section: the ∨_k-merge of its replica-cover lands in the target", () => {
  // target 0 covered by sources 1 and 2, each holding a distinct write.
  const field = fieldWith([[memeOf("a")], [memeOf("b")], [memeOf("c")]], [[1, 0], [2, 0]]);
  const out = glueAction.run(field, { cover: 0 });
  assert.equal(out.members[0].memes.length, 3, "target 0 now holds the glued global section (its own + both covering writes)");
  assert.equal(out.members[1].memes.length, 1, "a covering source is unchanged (gluing copies its section)");
  assert.equal(out.members[2].memes.length, 1, "the other covering source is unchanged");
});

// --- the Mayer–Vietoris reading: H⁰, δ⁰/H¹, and the Čech overlaps ---

test("replicaCoverConsensus reports the cover, the glued H⁰ charge, δ⁰=0, and overlap agreement", () => {
  // an agreeing star: target 0, sources 1 & 2, all positive on the same cell.
  const same = (label) => { const c = cell(token(mark("s")), mark("p:s"), token(mark("o"))); return meme(c, charge(chargeValue("potential"), [[mark(label)], []])); };
  const field = fieldWith([[same("w0")], [same("w1")], [same("w2")]], [[1, 0], [2, 0]]);
  const mv = replicaCoverConsensus(field, 0);
  assert.deepEqual([...mv.cover].sort(), [0, 1, 2], "the cover is the target plus its covering sources");
  assert.equal(mv.obstruction, 0, "an agreeing cover has H¹ = 0");
  assert.equal(mv.coordinationFree, true, "δ⁰ = 0 — the local sections glue with no coordination");
  assert.equal(valueOf(mv.glued).name, "potential", "H⁰ is the ∨_k glued section (agreement on truth)");
  assert.ok(mv.overlaps.length >= 1, "the Čech nerve has the cover's overlaps");
  assert.ok(mv.overlaps.every((o) => o.agree), "every overlap agrees (no opposition in the cover)");
});

// --- H¹ tied to the cover: a node's cover can glue even when the whole graph does not ---

test("H¹ is tied to the cover: a node's replica-cover glues (H¹=0) though the whole 4-cycle does not (H¹=1)", () => {
  // 4-cycle 0—1—2—3—0 with stances +,-,+,- (every edge opposed). Translations are chosen
  // so observer 0's replica-cover is { 1→0, 3→0 } — a tree, no cycle.
  let field = fieldWith(
    [[], [], [], []],
    [[1, 0], [3, 0], [1, 2], [2, 3]], // comparison graph: {0,1},{0,3},{1,2},{2,3} = the 4-cycle
  );
  for (let i = 0; i < 4; i++) field = broadcastAction.run(field, { from: i, to: i, meme: memeOf(`m${i}`) });
  for (const i of [1, 3]) field = attendAction.run(field, { member: i });

  // whole graph: the opposed 4-cycle does NOT glue.
  const whole = convergeAction.run(field, {});
  assert.equal(whole.section.obstruction, 1, "the whole 4-cycle has H¹ = 1 (does not glue)");

  // observer 0's replica-cover { 1→0, 3→0 } is a tree ⇒ H¹ = 0 (glues), even though the
  // global graph does not. This is the obstruction tied to the COVER, not the whole graph.
  const cover0 = convergeAction.run(field, { cover: 0 });
  assert.equal(cover0.section.obstruction, 0, "observer 0's replica-cover glues — H¹ tied to the cover");
  assert.equal(cover0.section.glued, true);
  // the components of the cover reading only mention the cover's members {0,1,3}.
  const coverMembers = new Set(cover0.section.components.flatMap((c) => c.members));
  assert.ok(!coverMembers.has(2), "observer 2 is outside observer 0's cover — not in the reading");

  // the MV reading agrees: cover 0 is coordination-free though its overlaps are opposed
  // (a held contradiction over a tree glues to stable, not absurd).
  const mv = replicaCoverConsensus(field, 0);
  assert.equal(mv.coordinationFree, true, "the cover's δ⁰ = 0 (tree of disagreement still glues)");
  assert.equal(valueOf(mv.glued).name, "stable", "the held contradiction glues to stable, never absurd");
});

test("glue then converge: the glued node carries the cover's pooled section", () => {
  const field = fieldWith([[memeOf("a")], [memeOf("b")]], [[1, 0]]);
  const glued = glueAction.run(field, { cover: 0 });
  // after gluing, observer 0 holds both writes; converge re-read is over the new state.
  assert.equal(glued.members[0].memes.length, 2, "the glued node carries its cover's global section");
  assert.equal(glued.section.kind, "socializing.common-ground", "glue re-reads the consensus over the glued field");
});
