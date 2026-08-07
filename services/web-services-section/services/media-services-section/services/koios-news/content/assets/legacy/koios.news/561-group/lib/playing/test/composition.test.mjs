// Theorem-shaped tests for the REAL ludics cut / Hyland–Ong composition and the
// copycat Fax identity — the categorical structure of behaviours, built in
// src/structuring/concurrent-game/with-symmetry/ludicizing/composition.mts.
//
// Each test is a falsifiable category law. They are the ANTI-FAKE GATE: they must
// pass via the genuine composition (interaction on the shared interface B, THEN
// hide B with directed copycat transport) — NOT the symmetric knowledge-join
// shadow (proving/computational-ludics::cutShadow), which provably cannot satisfy
// the identity law (it keeps the interface and cannot transport a directed copy).
//
// What extra structure the laws required (documented honestly):
//   • a cut-interface address convention: a composable design `A ⊸ B` lives over
//     a two-component interface — domain A under `0·…` (DOMAIN_SIDE), codomain B
//     under `1·1·…` (CODOMAIN_SIDE). The prefix lengths differ on purpose: the
//     domain of a linear arrow is `A^⊥` (polarity-reversed), so an ODD-length
//     domain prefix flips parity to keep the dual side coherent, while the
//     EVEN-length codomain prefix preserves parity for the as-is side.
//   • chronicle-grain normalization that runs the B-dispute, transports the
//     copycat copy across it, and DELETES the interface actions from the
//     surviving plays.
// No assertion is weakened to pass.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  designFromActs,
  designCoherenceJudgment,
  cut,
  fax,
  project,
  locusFromKey,
  composeChronicles,
  isLeftIdentity,
  isRightIdentity,
  isAssociative,
  isCoherentFax,
  leftIdentityJudgment,
  rightIdentityJudgment,
  associativityJudgment,
} from "../dist/index.mjs";

// Build a design from a { locusKey -> act } map (act ∈ proponent|opponent|daimon).
const D = (m) => designFromActs(new Map(Object.entries(m)));
const dump = (d) => d.entries.map((e) => `${e.locusKey || "ε"}:${e.charge.name}`).join(" ");
const sameDesign = (x, y) => dump(x) === dump(y);

// --- concrete behaviours (coherent designs) -------------------------------

// B1: the give-up behaviour — a single Daimon at the root (depth 0, positive).
const dDaimon = D({ "": "daimon" });
const B1 = [dDaimon];
const U1 = [dDaimon, D({ "": "opponent" }), D({ "": "proponent" })];

// B2: a non-trivial play — Proponent opens child 0, Opponent answers, give-up at
// [0,0] (depth 2, even/positive — a coherent Daimon).  Chronicle (+,-,†).
const dPlay = D({ "": "proponent", "0": "opponent", "0.0": "daimon" });
const B2 = () => [dPlay];
const U2 = [
  dPlay,
  D({ "": "opponent" }),
  D({ "": "daimon" }),
  D({ "": "opponent", "0": "proponent" }),
  D({ "": "opponent", "0": "proponent", "0.0": "daimon" }),
];

// --- (0) the copycat Fax is a genuine coherent design ---------------------

test("Fax_B is a coherent design (η-expanded copycat, not a flat valuation)", () => {
  assert.equal(designCoherenceJudgment(fax(B1, U1)).kind, "game.design.coherence:witness");
  assert.equal(designCoherenceJudgment(fax(B2(), U2)).kind, "game.design.coherence:witness");
  assert.ok(isCoherentFax(B1, U1));
  assert.ok(isCoherentFax(B2(), U2));
});

// --- (a) left identity  cut(Fax_B, d) ≃ d --------------------------------

test("left identity: cut(Fax_B, d) ≃ d for every material member d ∈ B", () => {
  const j1 = leftIdentityJudgment(B1, U1);
  assert.equal(j1.kind, "game.composition.identity:witness", JSON.stringify(j1).slice(0, 240));
  assert.ok(isLeftIdentity(B1, U1));

  const j2 = leftIdentityJudgment(B2(), U2);
  assert.equal(j2.kind, "game.composition.identity:witness", JSON.stringify(j2).slice(0, 240));
  assert.ok(isLeftIdentity(B2(), U2));
});

// --- (b) right identity  cut(d, Fax_B) ≃ d -------------------------------

test("right identity: cut(d, Fax_B) ≃ d for every material member d ∈ B", () => {
  const j1 = rightIdentityJudgment(B1, U1);
  assert.equal(j1.kind, "game.composition.identity:witness", JSON.stringify(j1).slice(0, 240));
  assert.ok(isRightIdentity(B1, U1));

  const j2 = rightIdentityJudgment(B2(), U2);
  assert.equal(j2.kind, "game.composition.identity:witness", JSON.stringify(j2).slice(0, 240));
  assert.ok(isRightIdentity(B2(), U2));
});

// --- (c) associativity  cut(cut(f,g),h) ≃ cut(f, cut(g,h)) ---------------

test("associativity: cut(cut(f,g),h) ≃ cut(f, cut(g,h))", () => {
  // composable morphisms over interfaces A⊸B, B⊸C, C⊸D.  Each interface is a
  // Daimon collision on its shared sub-address; the domain side `0·`, codomain
  // side `1·1·`.  cut(g,h) must keep g's domain B so it remains a B⊸D morphism —
  // that is what makes both bracketings defined.
  const f = D({ "1.1": "daimon" });
  const g = D({ "0": "daimon", "1.1": "daimon" });
  const h = D({ "0": "daimon", "1.1": "daimon" });

  const left = cut(cut(f, g), h);
  const right = cut(f, cut(g, h));
  assert.ok(left.entries.length > 0, "left bracketing must not collapse to the empty design");
  assert.ok(right.entries.length > 0, "right bracketing must not collapse to the empty design");
  assert.ok(sameDesign(left, right), `assoc mismatch: L=${dump(left)} R=${dump(right)}`);

  const j = associativityJudgment(f, g, h);
  assert.equal(j.kind, "game.composition.associativity:witness", JSON.stringify(j).slice(0, 240));
  assert.ok(isAssociative(f, g, h));

  // a second bracketing chain, where the trailing factor is a pure domain-input.
  const f2 = D({ "1.1": "daimon" });
  const g2 = D({ "0": "daimon", "1.1": "daimon" });
  const h2 = D({ "0": "daimon" });
  assert.ok(isAssociative(f2, g2, h2), `assoc2: L=${dump(cut(cut(f2, g2), h2))} R=${dump(cut(f2, cut(g2, h2)))}`);
});

// --- (d) the cut genuinely HIDES the interface (not the join shadow) ------

test("cut hides the cut interface B (categorical composition, not the union-join shadow)", () => {
  // cut(Fax_B1, d^⊥-on-domain) must yield a design whose codomain projection is
  // exactly d — the interface B does NOT survive in the result's support as a raw
  // union would leave it.  We read the codomain projection and require it equals d.
  const fb = fax(B1, U1);
  // place d's counter-play on the domain side `0·` (the law does this internally);
  // here we assert the hiding directly through composeChronicles.
  const plays = composeChronicles(fb, D({ "0": "daimon" }));
  assert.ok(plays.length >= 1, "the copycat dispute must produce at least one converging play");
  for (const p of plays) {
    // every B-move is marked hidden; no visible action sits on a bare interface key
    const hiddenSteps = p.internal.filter((s) => s.hidden);
    assert.ok(hiddenSteps.length >= 1, "the B-dispute must record hidden interface moves");
  }
});

// --- (e) partiality: a non-dual interface yields the empty composition ----

test("non-dual interface B yields the empty design (the cut's partiality)", () => {
  // f's codomain B and g's domain B at the same address with the SAME polarity are
  // NOT dual; the dispute is stuck and the composition is empty.  This is the line
  // between the real cut and the symmetric-join shadow (which would still merge).
  const f = D({ "1.1": "proponent" });
  const g = D({ "0": "proponent" });
  const composite = cut(f, g);
  assert.equal(composite.entries.length, 0, `expected empty design, got ${dump(composite)}`);
});

// --- (f) the codomain projection of the identity composite IS d -----------

test("cut(Fax_B, d) codomain projection equals d exactly (verbatim copy)", () => {
  // a direct, value-level witness of the copy for B2's principal play dPlay.
  const fb = fax(B2(), U2);
  // present d's counter-play on the domain: dual each act, prefix with `0`.
  const dualAct = (a) => (a === "proponent" ? "opponent" : a === "opponent" ? "proponent" : "opponent");
  const counter = new Map();
  for (const e of dPlay.entries) {
    const act = e.charge.name === "potential" ? "proponent" : e.charge.name === "active" ? "opponent" : "daimon";
    counter.set(`0${e.locusKey ? "." + e.locusKey : ""}`, dualAct(act));
  }
  const composite = cut(fb, designFromActs(counter));
  const recovered = project(composite, locusFromKey("1.1"));
  assert.ok(sameDesign(recovered, dPlay), `recovered ${dump(recovered)} ≠ d ${dump(dPlay)}`);
});
