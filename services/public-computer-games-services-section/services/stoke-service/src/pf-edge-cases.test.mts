/**
 * `pf-edge-cases` — the three production-graph shapes the research spike hand-built and ran real
 * numbers on (`stoke-spike/spike.mts`, spike report §2/§3): a pure chain (no cycle), a cycle with
 * feedback, and a cycle plus a dead-end node. This file rebuilds the same STRUCTURAL shapes as
 * real `ProductionGraph` values (via `graph.mts`) and asserts the same qualitative findings the
 * spike reported. It deliberately does NOT assert the spike's exact printed decimals (0.6668 etc)
 * — those numbers depended on the spike's own specific hand-chosen edge weights, which the spike
 * report states but doesn't reproduce a machine-checkable fixture for, and fabricating a graph
 * that happens to hit the same digits would be worse than just re-deriving real numbers from this
 * module's own graph and stating what THIS run actually computed. A fourth test adds the general
 * "reducible = max over irreducible blocks" property the spike's Graph C result is one instance
 * of, on a case where the answer is analytically obvious (two disjoint 2-cycles) rather than
 * merely plausible.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toMatrix, type ProductionGraph } from "./graph.mts";
import { assessGraphMatrix, dominantEigen } from "./eigen.mts";

// Graph A — the spike's "chain": Wood -> Plank -> Furniture -> Gold, no cycle anywhere.
const chainGraph: ProductionGraph = {
  nodes: [
    { id: "wood", label: "Wood", baseGeneration: 1 },
    { id: "plank", label: "Plank", baseGeneration: 0 },
    { id: "furniture", label: "Furniture", baseGeneration: 0 },
    { id: "gold", label: "Gold", baseGeneration: 0 },
  ],
  edges: [
    { from: "wood", to: "plank", rate: 0.5 },
    { from: "plank", to: "furniture", rate: 0.4 },
    { from: "furniture", to: "gold", rate: 0.3 },
  ],
};

// Graph B — the spike's "cycle with feedback": A<->B<->C<->D->A plus a self-loop on A.
const cycleGraph: ProductionGraph = {
  nodes: [
    { id: "a", label: "A", baseGeneration: 0 },
    { id: "b", label: "B", baseGeneration: 0 },
    { id: "c", label: "C", baseGeneration: 0 },
    { id: "d", label: "D", baseGeneration: 0 },
  ],
  edges: [
    { from: "a", to: "a", rate: 0.1 }, // self-loop on A
    { from: "a", to: "b", rate: 0.3 },
    { from: "b", to: "a", rate: 0.2 },
    { from: "b", to: "c", rate: 0.3 },
    { from: "c", to: "b", rate: 0.2 },
    { from: "c", to: "d", rate: 0.3 },
    { from: "d", to: "a", rate: 0.3 }, // closes the cycle
  ],
};

// Graph C — Graph B plus a dead-end "Museum" node, fed by C, feeding nothing back.
const cycleWithDeadEnd: ProductionGraph = {
  ...cycleGraph,
  nodes: [...cycleGraph.nodes, { id: "museum", label: "Museum", baseGeneration: 0 }],
  edges: [...cycleGraph.edges, { from: "c", to: "museum", rate: 0.2 }],
};

test("Graph A (pure chain, no cycle): dominant eigenvalue is exactly 0 — no valid prestige multiplier", () => {
  const { matrix } = toMatrix(chainGraph);
  const { lambda, converged } = dominantEigen(matrix);
  assert.equal(lambda, 0);
  assert.equal(converged, true);
  const validity = assessGraphMatrix(matrix);
  assert.equal(validity.valid, false, "a purely acyclic graph must be gated out of the computed-prestige UI");
  assert.match(validity.reason ?? "", /acyclic|no growth loop/);
});

test("Graph B (cycle with feedback): a real positive dominant eigenvalue, eigenvector sums to 1, all shares positive", () => {
  const { matrix } = toMatrix(cycleGraph);
  const { lambda, vector, converged } = dominantEigen(matrix);
  assert.equal(converged, true);
  assert.ok(lambda > 0, `expected a real positive lambda, got ${lambda}`);
  const sum = vector.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `eigenvector shares should L1-normalize to 1, got ${sum}`);
  assert.ok(vector.every((x) => x > 0), "every node in a genuinely cyclic, connected graph should hold a strictly positive share");
  const validity = assessGraphMatrix(matrix);
  assert.equal(validity.valid, true);
});

test("Graph C (cycle + dead-end Museum node): the dead-end CANNOT move lambda, but claims a real nonzero mixture share", () => {
  const { matrix: cycleM } = toMatrix(cycleGraph);
  const { matrix: deadEndM, order } = toMatrix(cycleWithDeadEnd);
  const cycleResult = dominantEigen(cycleM);
  const deadEndResult = dominantEigen(deadEndM);
  assert.ok(
    Math.abs(cycleResult.lambda - deadEndResult.lambda) < 1e-6,
    `adding a dead-end node must not change lambda: cycle-only=${cycleResult.lambda}, with-dead-end=${deadEndResult.lambda}`,
  );
  const museumShare = deadEndResult.vector[order.indexOf("museum")] ?? 0;
  assert.ok(museumShare > 1e-6, `the dead-end node must claim a real, nonzero, honestly-computed mixture share, got ${museumShare}`);
  // And that share is a genuine dilution of everyone else's — the other four nodes' shares in
  // Graph C must sum to strictly less than 1 (Museum's slice comes out of the same normalized 1).
  const others = order.filter((id) => id !== "museum").reduce((s, id) => s + (deadEndResult.vector[order.indexOf(id)] ?? 0), 0);
  assert.ok(others < 1 - 1e-6, `the other four nodes' shares should sum to less than 1 once Museum takes a slice, got ${others}`);
});

test("reducible matrix, general case: dominant eigenvalue is the MAX over independent irreducible blocks, not their sum or average", () => {
  // Two disjoint 2-cycles with no edges between them at all — an unambiguous, analytically
  // checkable reducible matrix. A 2x2 block [[a,a],[a,a]] has eigenvalues {0, 2a}, so block 1
  // (a=0.25) has dominant eigenvalue 0.5 and block 2 (a=0.45) has dominant eigenvalue 0.9. The
  // combined 4x4 block-diagonal matrix's dominant eigenvalue must be exactly the larger block's,
  // 0.9 — not 0.7 (average) and not 1.4 (sum).
  const M = [
    [0.25, 0.25, 0, 0],
    [0.25, 0.25, 0, 0],
    [0, 0, 0.45, 0.45],
    [0, 0, 0.45, 0.45],
  ];
  const { lambda, vector } = dominantEigen(M);
  assert.ok(Math.abs(lambda - 0.9) < 1e-6, `expected lambda = 0.9 (the stronger block), got ${lambda}`);
  // The weaker block's nodes should carry ~0 of the mixture once power iteration has run long
  // enough to be dominated entirely by the stronger block's growth.
  assert.ok(Math.abs(vector[0]!) < 1e-3, `weak-block node 0 should carry ~0 share, got ${vector[0]}`);
  assert.ok(Math.abs(vector[1]!) < 1e-3, `weak-block node 1 should carry ~0 share, got ${vector[1]}`);
  assert.ok(vector[2]! > 0.4 && vector[3]! > 0.4, "the strong block's two nodes should evenly split essentially all of the mixture");
});
