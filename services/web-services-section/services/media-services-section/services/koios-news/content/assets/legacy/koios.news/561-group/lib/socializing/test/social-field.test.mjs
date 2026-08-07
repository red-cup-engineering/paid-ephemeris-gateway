/**
 * social-field.test — the consensus / disagreement law converge must satisfy.
 *
 * socializing is endomorphic on the Social Field; converge delegates the glued
 * common-ground section and its H¹ obstruction to the corpus's already-proven
 * bilattice-network-sheaf consensus (sheafCharges). These tests assert the inherited
 * theorem on the Social Field:
 *
 *   section.glued = true ⟺ section.obstruction = 0 ⟺ the agents' memes glue.
 *
 * The opposition axis is communicating's own residuation pair, faithfully lifted:
 * `broadcast` (speak↑) leaves a member's meme `potential` (truth-witnessed, the ⊙
 * extending endpoint), and `attend` (listen↑) moves it to `active` (falsity-witnessed,
 * the ⇒ restricting endpoint). Two members on opposite sides of that axis are
 * *opposed* on the edge between them. Then:
 *   - a CYCLE of opposed members ⇒ obstruction > 0, glued = false (held, not exploded).
 *   - a TREE (path) of opposed members ⇒ obstruction = 0, glued = true, pooled stable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  meme,
  cell,
  token,
  mark,
  charge,
  chargeValue,
  valueOf,
} from "@emsenn/relating";

import {
  emptyField,
  admitAction,
  broadcastAction,
  attendAction,
  convergeAction,
} from "@emsenn/socializing";

/** A bare meme over a trivial cell, charged `potential` (truth witnessed). */
function seedMeme(label) {
  const c = cell(token(mark(label)), mark(`predicate:${label}`), token(mark("topic")));
  return meme(c, charge(chargeValue("potential"), [[mark(`${label}-w`)], []]));
}

/** Admit `n` members (each with no local memes initially) into a fresh field.
 *  The agent seed is a valid `token|claim` line (the animating seed wire). */
function societyOf(n) {
  let field = emptyField();
  for (let i = 0; i < n; i++) {
    field = admitAction.run(field, { agent: `agent-${i}|exists` });
  }
  return field;
}

/** Override the observer category O's translations so its comparison graph is exactly
 *  `pairs` (one directed translation per pair; converge forgets direction). */
function withEdges(field, pairs) {
  return {
    ...field,
    base: {
      kind: "socializing.social-base",
      translations: pairs.map(([source, target]) => ({
        kind: "socializing.translation",
        source,
        target,
        channel: {
          kind: "communicating.messaging.channel",
          medium: "test",
          from: { kind: "communicating.speaking.signifying.semiosphere", name: "a" },
          to: { kind: "communicating.speaking.signifying.semiosphere", name: "b" },
          capacity: null,
        },
      })),
    },
  };
}

/** Seed every member with a `potential` meme (broadcast to itself), then ATTEND the
 *  members in `negatives` so their representative charge flips to `active`. The
 *  result: members in `negatives` are negative-only, the rest positive-only. */
function stances(field, negatives) {
  for (let i = 0; i < field.members.length; i++) {
    field = broadcastAction.run(field, { from: i, to: i, meme: seedMeme(`m${i}`) });
  }
  for (const i of negatives) {
    field = attendAction.run(field, { member: i });
  }
  return field;
}

function naturalToNumber(value) {
  return value.members.length;
}

test("a CYCLE of opposed members does not glue (obstruction > 0, held not exploded)", () => {
  // A 4-cycle strictly 2-colored: members 0,2 positive (potential), 1,3 negative
  // (active). Every cycle edge joins a positive to a negative ⇒ every edge opposed
  // ⇒ one independent cycle ⇒ H¹ = 1.
  let field = societyOf(4);
  field = stances(field, [1, 3]);
  field = withEdges(field, [[0, 1], [1, 2], [2, 3], [3, 0]]);

  const out = convergeAction.run(field, {});
  assert.equal(out.section.kind, "socializing.common-ground");
  assert.ok(out.section.obstruction > 0, "a cycle of opposed members raises H¹");
  assert.equal(out.section.glued, false, "non-zero H¹ ⇒ not glued");
  assert.equal(out.section.coordinationFree, false);
  assert.equal(out.section.cohomology.kind, "socializing.consensus.cohomology");
  assert.equal(out.section.cohomology.h1, out.section.obstruction, "socializing's obstruction is relating H¹");
  assert.equal(naturalToNumber(out.section.cohomology.carrier.firstCohomology.rank), out.section.obstruction);
  assert.equal(out.section.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");

  // Held, not exploded: the single glued component pools to `stable`, never `absurd`.
  const component = out.section.components.find((c) => c.members.length > 1);
  assert.ok(component, "the cycle is one connected component");
  assert.equal(valueOf(component.pooled).name, "stable", "a held contradiction settles stable, not absurd");
});

test("a TREE (path) of opposed members glues (obstruction = 0), pooled to stable", () => {
  // A path 0—1—2 with stances +,-,+: both edges opposed, but no cycle ⇒ H¹ = 0.
  let field = societyOf(3);
  field = stances(field, [1]);
  field = withEdges(field, [[0, 1], [1, 2]]);

  const out = convergeAction.run(field, {});
  assert.equal(out.section.obstruction, 0, "a tree of opposed members has no cycle ⇒ H¹ = 0");
  assert.equal(out.section.glued, true, "H¹ = 0 ⇒ glued");
  assert.equal(out.section.coordinationFree, true);
  assert.equal(out.section.cohomology.h1, 0);
  assert.equal(out.section.cohomology.vanishing.kind, "predication.cohomology.rankVanishing:witness");

  const component = out.section.components.find((c) => c.members.length === 3);
  assert.ok(component, "all three members are one connected component");
  assert.equal(valueOf(component.pooled).name, "stable", "the held contradiction glues to stable");
});

test("consensus: agreeing members glue to a definite shared charge", () => {
  // Two members both positive (neither attended): no opposition at all.
  let field = societyOf(2);
  field = stances(field, []);
  field = withEdges(field, [[0, 1]]);

  const out = convergeAction.run(field, {});
  assert.equal(out.section.obstruction, 0);
  assert.equal(out.section.glued, true);
  const component = out.section.components.find((c) => c.members.length === 2);
  assert.equal(valueOf(component.pooled).name, "potential", "agreement on truth pools to a definite potential");
});
