// Theorem-shaped tests for socializing's GOVERNANCE reading — the Hohfeldian jural relation,
// the governance-act thesis (attribution ⊗_k binding ⊗_k becoming), and the kyriarchist ↔
// swarm ↔ consensus discipline discriminated by the power-relation graph. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { governance, correlate, correlativeKind } from "../dist/index.mjs";
import { admitSeed, descend } from "@emsenn/animating";

const membrane = (seed) => descend(admitSeed(seed)).utterances;

test("the Hohfeldian correlative is an INVOLUTION; the active/passive converse preserves standing", () => {
  // power ↔ liability, duty ↔ claim, privilege ↔ no-right, immunity ↔ disability.
  assert.equal(correlativeKind("power"), "liability");
  assert.equal(correlativeKind("liability"), "power");
  assert.equal(correlativeKind("duty"), "claim");
  assert.equal(correlativeKind("immunity"), "disability");

  const r = { kind: "power", active: "boss", passive: "worker", scope: "task:t1", standing: "potential" };
  const c = correlate(r);
  // the converse swaps active/passive and renames the kind, preserving scope + standing
  // (the predicate-converse is self-adjoint in both bilattice orders).
  assert.deepEqual(c, { kind: "liability", active: "worker", passive: "boss", scope: "task:t1", standing: "potential" });
  assert.deepEqual(correlate(c), r); // involution
});

test("KYRIARCHY: a dominator over a strict majority, bearing no accountability duty", () => {
  // king holds power over a, b, c — power over a strict majority of the other observers.
  const r = governance(membrane("king|power>a>x\nking|power>b>x\nking|power>c>x"));
  assert.equal(r.discipline, "kyriarchist");
  assert.equal(r.observers, 4);
  assert.equal(r.dominion, 3, "the dominator holds power over all three others");
  assert.equal(r.concentration, 1, "all power concentrates in one holder");
  assert.equal(r.accountabilityGap, 3, "no power has a correlative accountability duty");
});

test("accountability DISSOLVES the kyriarchy: the dominator bearing a duty is no longer κύριος", () => {
  // the same dominance, but now the king bears an accountability duty — falls to a distributed discipline.
  const r = governance(membrane("king|power>a>x\nking|power>b>x\nking|power>c>x\nking|duty>council>account"));
  assert.notEqual(r.discipline, "kyriarchist");
  assert.equal(r.accountabilityGap, 0, "every power's holder now bears a duty");
});

test("SWARM: rotational authority — the power graph CYCLES, no dominator", () => {
  const r = governance(membrane("a|power>b>x\nb|power>c>x\nc|power>a>x"));
  assert.equal(r.discipline, "swarm");
  assert.equal(r.rotational, true, "authority returns — a directed cycle in the power graph");
  assert.equal(r.dominion, 1, "no holder dominates more than one party");
});

test("CONSENSUS: no position-altering powers — authority is undirected agreement", () => {
  const r = governance(membrane("a|claim>b>x\nb|duty>a>x"));
  assert.equal(r.discipline, "consensus");
  assert.equal(r.powers, 0);
});

test("the GOVERNANCE ACT is operative when attribution, binding, and becoming all settle (⊗_k = t)", () => {
  const r = governance(membrane("boss|power>worker>task\nworker|duty>boss>task"));
  assert.equal(r.attribution, "potential", "a collective of ≥2 observers");
  assert.equal(r.binding, "potential", "coherent bindings");
  assert.equal(r.becoming, "potential", "the bindings glue — the collective can transition");
  assert.equal(r.operativity, "potential", "⊗_k of the three settlements = operative");
});

test("a CONTRADICTED binding makes the act a GAP (⊥), not a contradiction — Belnap-Dunn distinction", () => {
  // boss both asserts and denies the same power over the same scope → that cell pools to ⊤.
  const r = governance(membrane("boss|power>worker>task\nboss|not power>worker>task"));
  assert.equal(r.contested, 1, "the cell pooled to ⊤ stable (asserted and denied)");
  assert.equal(r.binding, "stable", "the binding is contradicted (⊤)");
  assert.equal(r.becoming, "absurd", "a contradiction blocks the transition from settling (⊥)");
  // operativity = attribution(t) ⊗_k binding(⊤) ⊗_k becoming(⊥) = ⊥ — a GAP, the act is NOT operative,
  // and the ⊥ is distinguishable from an outright refusal (f).
  assert.equal(r.operativity, "absurd");
});

test("the empty membrane is UNGOVERNED", () => {
  const r = governance([]);
  assert.equal(r.discipline, "ungoverned");
  assert.equal(r.observers, 0);
  assert.equal(r.operativity, "absurd");
});
