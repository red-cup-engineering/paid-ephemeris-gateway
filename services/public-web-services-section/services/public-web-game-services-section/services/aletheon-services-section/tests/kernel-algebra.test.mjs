// kernel-algebra — the voidmath kernel's four-valued (Belnap bilattice) charge algebra, exercised
// through the ONE seam Aletheon owns (server/world/kernel.mjs), which re-exports the real ops from
// @lenticule-science/metrologic/bilattice/{charge,descent}. Nothing here reimplements the algebra —
// every assertion drives the REAL kernel functions the game runs combat/marks/dispute/claims on,
// and pins the laws value.mjs / combat.mjs / dispute.mjs / claims.mjs all lean on without saying so:
//   - present/isTop read the value bits, not the evidence
//   - joinKnowledge is commutative, associative, idempotent on VALUE, and its evidence carrier only
//     ever grows (union, deduped) — this is what makes death "unretractable" (value.mjs's whole point)
//   - negate is an involution that swaps pos/neg on BOTH value and evidence
//   - conflate swaps ⊥↔⊤ and fixes t/f, WITHOUT touching evidence (it can outrun its own witnesses)
//   - the four-regime DESCENT (articulate → predicate → posit → settle) that marks.mjs's positVerdict
//     runs literally, on the same minted utterance, is deterministic and produces a coherent t.
//
// If a future metrologic bump changes any of these laws, this file is what should turn red first —
// before a combat/dispute/claims test does, and with a much clearer name for what broke.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  joinKnowledge, meetTruth, joinTruth, negate, conflate, present, isTop,
  articulate, predicate, posit, settle,
} from "../server/world/kernel.mjs";

// --- charge fixtures, the exact shape every kernel op consumes/returns: {value:[pos,neg], evidence:[[],[]]}
const w = (tag) => ({ src: tag }); // a witness is any small datum; only identity-by-structure matters
const BOTTOM = { value: [false, false], evidence: [[], []] };
const T      = (tag = "t") => ({ value: [true, false], evidence: [[w(tag)], []] });
const F      = (tag = "f") => ({ value: [false, true], evidence: [[], [w(tag)]] });
const TOP    = (tag = "top") => ({ value: [true, true], evidence: [[w(tag)], [w(tag)]] });

test("present/isTop: read the VALUE bits, one reading per FOUR value", () => {
  assert.deepEqual(present(BOTTOM), [false, false]);
  assert.deepEqual(present(T()), [true, false]);
  assert.deepEqual(present(F()), [false, true]);
  assert.deepEqual(present(TOP()), [true, true]);

  assert.equal(isTop(BOTTOM), false);
  assert.equal(isTop(T()), false);
  assert.equal(isTop(F()), false);
  assert.equal(isTop(TOP()), true);
});

test("joinKnowledge: ⊥ is the identity — joining bottom onto any charge changes nothing observable", () => {
  for (const c of [BOTTOM, T(), F(), TOP()]) {
    const j1 = joinKnowledge({ left: BOTTOM, right: c });
    const j2 = joinKnowledge({ left: c, right: BOTTOM });
    assert.deepEqual(present(j1), present(c));
    assert.deepEqual(present(j2), present(c));
  }
});

test("joinKnowledge: t ∨ₖ f = ⊤ — the exact algebra illocution.mjs's header comment names " +
     "(Assert ∨ₖ Deny = Contest)", () => {
  const joined = joinKnowledge({ left: T(), right: F() });
  assert.equal(isTop(joined), true, "t joined with f must read as ⊤ (both faces asserted)");
});

test("joinKnowledge: commutative on the VALUE (order of evidence never flips which face reads asserted)", () => {
  const a = T("a"), b = F("b");
  const ab = joinKnowledge({ left: a, right: b });
  const ba = joinKnowledge({ left: b, right: a });
  assert.deepEqual(present(ab), present(ba));
});

test("joinKnowledge: associative on the VALUE", () => {
  const a = T("a"), b = F("b"), c = TOP("c");
  const l = joinKnowledge({ left: joinKnowledge({ left: a, right: b }), right: c });
  const r = joinKnowledge({ left: a, right: joinKnowledge({ left: b, right: c }) });
  assert.deepEqual(present(l), present(r));
});

test("joinKnowledge: idempotent on the VALUE — joining a charge with itself never changes its face " +
     "(this is what makes an already-slain cell's f face permanent under repeated damage)", () => {
  for (const c of [BOTTOM, T(), F(), TOP()]) {
    const j = joinKnowledge({ left: c, right: c });
    assert.deepEqual(present(j), present(c));
  }
});

test("joinKnowledge: knowledge only GROWS — once a face is asserted, joining more evidence can never " +
     "lower it back to unasserted (the kernel-honest reading of 'death is never retracted')", () => {
  const dead = F("mortal-blow");
  const stillAlive = T("vitality"); // a later positive assertion, e.g. a raise attempt
  const after = joinKnowledge({ left: dead, right: stillAlive });
  const [pos, neg] = present(after);
  assert.equal(neg, true, "the negative (dead) face, once told, is never retracted");
  assert.equal(pos, true, "a fresh positive assertion still lands — together the two make ⊤, not t");
  assert.equal(isTop(after), true);
});

test("joinKnowledge: evidence accumulates losslessly (union) — distinct witnesses are both kept, an " +
     "identical witness is not duplicated", () => {
  const w1 = { src: "vitality", t: 10 };
  const w2 = { src: "vitality", t: 11 };
  const c1 = { value: [true, false], evidence: [[w1], []] };
  const c2 = { value: [true, false], evidence: [[w2], []] };
  const grown = joinKnowledge({ left: c1, right: c2 });
  assert.equal(grown.evidence[0].length, 2, "two DISTINCT witnesses must both survive the join");

  const c1Again = { value: [true, false], evidence: [[w1], []] };
  const same = joinKnowledge({ left: c1, right: c1Again });
  assert.equal(same.evidence[0].length, 1, "an IDENTICAL (structurally-equal) witness must not duplicate");
});

test("negate: an involution — negating twice returns the exact original value and evidence shape", () => {
  for (const c of [BOTTOM, T(), F(), TOP()]) {
    const nn = negate(negate(c));
    assert.deepEqual(nn, c);
  }
});

test("negate: swaps pos/neg on BOTH value and evidence together (truth reversed, knowledge preserved)", () => {
  const c = T("only-positive");
  const n = negate(c);
  assert.deepEqual(n.value, [false, true]);
  assert.deepEqual(n.evidence, [[], [{ src: "only-positive" }]]);
  assert.equal(isTop(n), isTop(c), "negation preserves whether a charge is ⊤ (⊤ is its own negation)");
});

test("conflate: swaps ⊥ ↔ ⊤, fixes t and f, and leaves the evidence carrier untouched", () => {
  const bottomConflated = conflate(BOTTOM);
  assert.deepEqual(bottomConflated.value, [true, true], "conflate(⊥) = ⊤");
  assert.deepEqual(bottomConflated.evidence, BOTTOM.evidence, "conflate never touches evidence");

  const top = TOP();
  const topConflated = conflate(top);
  assert.deepEqual(topConflated.value, [false, false], "conflate(⊤) = ⊥");

  const t = T();
  assert.deepEqual(conflate(t).value, [true, false], "conflate fixes t");
  const f = F();
  assert.deepEqual(conflate(f).value, [false, true], "conflate fixes f");
});

test("conflate: can raise a value ABOVE its own evidence (⊥ with no witnesses conflates to a ⊤ with " +
     "none either) — the one op that can do that, per the kernel's own doc comment", () => {
  const c = conflate(BOTTOM);
  assert.equal(isTop(c), true);
  assert.deepEqual(c.evidence, [[], []], "⊤ here carries NO witnesses — a valued claim outrunning its evidence");
});

test("meetTruth: positive ANDed, negative ORed — pushes toward f faster than it pushes toward t " +
     "(dispute.mjs's ASSERT move leans on exactly this asymmetry to bleed an opponent's floor)", () => {
  const strong = T("strong");
  const weakened = meetTruth({ left: strong, right: { value: [false, false], evidence: [[], []] } });
  assert.equal(weakened.value[0], false, "meeting with a charge that lacks the positive face drops it (AND)");
  assert.equal(weakened.value[1], false, "meeting with a charge that lacks the negative face keeps it clear (OR of two falses)");

  const bothNegSomewhere = meetTruth({ left: T("a"), right: F("b") });
  assert.equal(bothNegSomewhere.value[1], true, "negative ORs in from either side");
});

test("joinTruth: positive ORed, negative ANDed — the truth-order dual of meetTruth", () => {
  const raised = joinTruth({ left: BOTTOM, right: T("a") });
  assert.equal(raised.value[0], true, "positive ORs in from either side");
  const kept = joinTruth({ left: T("a"), right: F("b") });
  assert.equal(kept.value[1], false, "negative only survives an AND — one side lacking it clears it");
});

// --- the four-regime DESCENT — the same pipeline marks.mjs's positVerdict runs verbatim on a minted
// utterance to settle a claim through the REAL kernel (not a hand-built verdict).

test("descent: articulate requires BOTH sides of an utterance — a missing side is malformed input", () => {
  assert.throws(() => articulate([{ const: "this" }, undefined]), TypeError);
  assert.throws(() => articulate([undefined, { const: "settled" }]), TypeError);
  assert.doesNotThrow(() => articulate([{ const: "this" }, { const: "settled" }]));
});

test("descent: articulate → predicate → posit → settle on a minted utterance settles to a coherent " +
     "sheaf section whose single fiber-algebra assignment carries a real charge", () => {
  const out = settle(posit(predicate(articulate([{ const: "this" }, { const: "settled" }]))));
  const fibers = out.sheaf.section["fiber-algebras"];
  assert.ok(Array.isArray(fibers) && fibers.length >= 1, "expected at least one fiber-algebra in the settled section");
  const assignment = fibers[0].assignments[0];
  assert.ok(assignment && assignment.charge, "expected a charge on the settled assignment");
  const [pos, neg] = assignment.charge.value;
  assert.equal(typeof pos, "boolean");
  assert.equal(typeof neg, "boolean");
});

test("descent: the same utterance settles to the SAME verdict every time (deterministic, no hidden RNG)", () => {
  const run = () => {
    const out = settle(posit(predicate(articulate([{ const: "this" }, { const: "settled" }]))));
    return out.sheaf.section["fiber-algebras"][0].assignments[0].charge.value;
  };
  assert.deepEqual(run(), run());
});
