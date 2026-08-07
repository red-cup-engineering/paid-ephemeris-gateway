// Theorem-shaped tests for socializing's FRONTIER wing: natural coalitions as FCA formal concepts
// (the Galois-closed coalition lattice) and coalition effectivity as a Chu space over FOUR (the
// power/liability dual involution). These exercise relating's IR operators end-to-end. Run vs dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  holdingsOfRelations,
  coalitionClosure,
  coalitionConcept,
  isCoalition,
  coalitionLattice,
  effectivitySpace,
  canForce,
  effectivityDual,
  effectivityIsInvolutive,
  governanceConvergence,
} from "../dist/index.mjs";

const holdings = [
  { agent: "alice", capability: "power:review" },
  { agent: "alice", capability: "power:merge" },
  { agent: "bob", capability: "power:review" },
  { agent: "carol", capability: "duty:test" },
];

test("a natural COALITION is a formal concept: agents sharing exactly a joint mandate", () => {
  const c = coalitionConcept(holdings, ["alice", "bob"]);
  // alice & bob jointly hold only review; the concept's mandate is exactly {power:review}.
  assert.deepEqual(c.agents, ["alice", "bob"]);
  assert.deepEqual(c.mandate, ["power:review"]);
  assert.equal(isCoalition(holdings, ["alice", "bob"], ["power:review"]), true);
  // {alice} alone is NOT closed against just {power:review} — alice's true mandate is larger.
  assert.equal(isCoalition(holdings, ["alice"], ["power:review"]), false);
});

test("the GALOIS CLOSURE pulls in the agents indistinguishable by shared mandate", () => {
  // bob's only capability is review; everyone holding review is {alice, bob} — so {bob} closes up.
  assert.deepEqual(coalitionClosure(holdings, ["bob"]), ["alice", "bob"]);
  // alice has a capability bob lacks, so {alice} is already closed.
  assert.deepEqual(coalitionClosure(holdings, ["alice"]), ["alice"]);
});

test("the COALITION LATTICE is complete: a top concept over all agents, closed under meets", () => {
  const lattice = coalitionLattice(holdings);
  assert.ok(lattice.length >= 3, "at least the top, an object concept, and a meet");
  // the apex concept contains every agent (the mandate they ALL share — here empty).
  const top = lattice[0];
  assert.deepEqual([...top.agents].sort(), ["alice", "bob", "carol"]);
  // every returned coalition has a Galois-CLOSED extent (the defining property of a formal concept).
  const closed = (agents) => JSON.stringify([...coalitionClosure(holdings, agents)].sort()) === JSON.stringify([...agents].sort());
  assert.ok(lattice.every((c) => closed(c.agents)), "every lattice element is a Galois-closed coalition");
});

test("coalitions bridge from jural relations via holdingsOfRelations", () => {
  const relations = [
    { kind: "power", active: "ada", passive: "p", scope: "deploy", standing: "potential" },
    { kind: "power", active: "ada", passive: "p", scope: "deploy", standing: "active" }, // denied → excluded
  ];
  const held = holdingsOfRelations(relations);
  assert.equal(held.length, 1, "only the held (non-denied) relation becomes a capability");
  assert.deepEqual(held[0], { agent: "ada", capability: "power:deploy" });
});

test("EFFECTIVITY is a Chu space: a coalition forces outcomes to a FOUR degree", () => {
  const space = effectivitySpace(
    ["builders", "reviewers"],
    ["ship", "block"],
    [
      { coalition: "builders", outcome: "ship", force: "potential" },
      { coalition: "reviewers", outcome: "block", force: "potential" },
      { coalition: "builders", outcome: "block", force: "active" },
    ],
  );
  assert.equal(canForce(space, "builders", "ship"), "potential", "the builders can ensure shipping");
  assert.equal(canForce(space, "builders", "block"), "active", "the builders cannot block");
  assert.equal(canForce(space, "reviewers", "block"), "potential");
});

test("POWER ↔ LIABILITY is a DUAL INVOLUTION (RelMath Chu/FOUR): dualizing twice is the identity", () => {
  const space = effectivitySpace(
    ["c1", "c2"],
    ["x", "y"],
    [{ coalition: "c1", outcome: "x", force: "potential" }, { coalition: "c2", outcome: "y", force: "active" }],
  );
  assert.equal(effectivityIsInvolutive(space), true, "dual ∘ dual = id (the Chu/FOUR dual-involution theorem)");
  // the dual swaps the axes: the dual's points are the original outcomes.
  const dual = effectivityDual(space);
  assert.deepEqual([...dual.coalitions].sort(), ["x", "y"], "the liability view's points are the outcomes");
});

test("GOVERNANCE CONVERGENCE: a finite, quantifier-free polity settles finitely, coordination-free", () => {
  const strict = governanceConvergence({ finiteBase: true, scottContinuous: true, countableCofinality: true });
  assert.equal(strict.regime, "strict");
  assert.equal(strict.settlesFinitely, true);
  assert.equal(strict.coordinationFree, true);
  assert.equal(strict.perpetual, false);
});

test("GOVERNANCE CONVERGENCE: a ∀-quantified, uncountable-cofinality design is PROVABLY PERPETUAL", () => {
  // ∀-blocks over an unbounded future population (seventh-generation obligation / open-membership
  // swarm with ∀-over-all-future-agents): the aperiodic regime — no finite protocol settles it.
  const perpetual = governanceConvergence({ finiteBase: false, scottContinuous: false, countableCofinality: false });
  assert.equal(perpetual.regime, "aperiodic");
  assert.equal(perpetual.perpetual, true, "provably non-convergent — perpetual deliberation");
  assert.equal(perpetual.coordinationFree, false, "the consensus cohomology does not vanish");
  assert.equal(perpetual.settlesFinitely, false);
});
