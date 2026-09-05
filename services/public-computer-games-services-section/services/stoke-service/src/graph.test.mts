import { test } from "node:test";
import assert from "node:assert/strict";
import { NegativeEdgeRateError, assertValidGraph, baseVector, isNonNegative, nodeOrder, toMatrix, type ProductionGraph } from "./graph.mts";

const chainA: ProductionGraph = {
  nodes: [
    { id: "wood", label: "Wood", baseGeneration: 1 },
    { id: "plank", label: "Plank", baseGeneration: 0 },
    { id: "furniture", label: "Furniture", baseGeneration: 0 },
    { id: "gold", label: "Gold", baseGeneration: 0 },
  ],
  edges: [
    { from: "wood", to: "plank", rate: 0.5 },
    { from: "plank", to: "furniture", rate: 0.5 },
    { from: "furniture", to: "gold", rate: 0.5 },
  ],
};

test("nodeOrder is sorted, independent of insertion order", () => {
  const g: ProductionGraph = { nodes: [{ id: "b", label: "B", baseGeneration: 0 }, { id: "a", label: "A", baseGeneration: 0 }], edges: [] };
  assert.deepEqual(nodeOrder(g), ["a", "b"]);
});

test("toMatrix places rate at M[target][source]", () => {
  const { order, matrix } = toMatrix(chainA);
  assert.deepEqual(order, ["furniture", "gold", "plank", "wood"]);
  const fi = order.indexOf("furniture");
  const gi = order.indexOf("gold");
  const pi = order.indexOf("plank");
  const wi = order.indexOf("wood");
  assert.equal(matrix[gi]![fi], 0.5); // furniture -> gold
  assert.equal(matrix[fi]![pi], 0.5); // plank -> furniture
  assert.equal(matrix[pi]![wi], 0.5); // wood -> plank
  assert.equal(matrix[wi]![gi], 0); // no edge gold -> wood
});

test("baseVector aligns to the same order toMatrix produced", () => {
  const { order } = toMatrix(chainA);
  const b = baseVector(chainA, order);
  assert.equal(b[order.indexOf("wood")], 1);
  assert.equal(b[order.indexOf("gold")], 0);
});

test("duplicate edges from the same pair sum their rates", () => {
  const g: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "b", label: "B", baseGeneration: 0 }],
    edges: [{ from: "a", to: "b", rate: 0.1 }, { from: "a", to: "b", rate: 0.2 }],
  };
  const { matrix, order } = toMatrix(g);
  assert.ok(Math.abs(matrix[order.indexOf("b")]![order.indexOf("a")]! - 0.3) < 1e-12);
});

test("assertValidGraph rejects a negative edge rate", () => {
  const g: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "b", label: "B", baseGeneration: 0 }],
    edges: [{ from: "a", to: "b", rate: -0.9 }],
  };
  assert.throws(() => assertValidGraph(g), NegativeEdgeRateError);
  assert.equal(isNonNegative(g), false);
});

test("assertValidGraph rejects duplicate node ids and dangling edge references", () => {
  const dup: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "a", label: "A2", baseGeneration: 0 }], edges: [] };
  assert.throws(() => assertValidGraph(dup), /duplicate node id/);

  const dangling: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 0 }], edges: [{ from: "a", to: "ghost", rate: 0.1 }] };
  assert.throws(() => assertValidGraph(dangling), /unknown node/);
});
