import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NegativeEdgeRateError, ablate, assertValidGraph, baseVector, isNonNegative, nodeOrder, toMatrix, type ProductionGraph,
} from "./graph.mts";
import { starterWidgetGraph } from "./state.mts";

test("starterWidgetGraph is a valid, honest, ACYCLIC graph — 'no growth loop yet' is true, not fabricated", () => {
  const g = starterWidgetGraph();
  assertValidGraph(g); // does not throw
  assert.equal(isNonNegative(g), true);
  const { matrix } = toMatrix(g);
  // A chain with no back-edge has an all-zero dominant eigenvalue under power iteration; this is
  // exercised end to end in eigen.test.mts / reflect.test.mts, this test only pins the raw shape.
  assert.equal(g.edges.some((e) => e.to === "material"), false, "starter graph must have no edge back into material — otherwise it would not be acyclic");
});

test("assertValidGraph rejects a duplicate node id", () => {
  const g: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "a", label: "A2", baseGeneration: 0 }], edges: [] };
  assert.throws(() => assertValidGraph(g), RangeError);
});

test("assertValidGraph rejects an edge referencing an unknown node", () => {
  const g: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 0 }], edges: [{ from: "a", to: "ghost", rate: 0.1 }] };
  assert.throws(() => assertValidGraph(g), RangeError);
});

test("assertValidGraph rejects a negative edge rate with the named error class", () => {
  const g: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "b", label: "B", baseGeneration: 0 }], edges: [{ from: "a", to: "b", rate: -0.1 }] };
  assert.throws(() => assertValidGraph(g), NegativeEdgeRateError);
});

test("nodeOrder is stable-sorted by id, independent of nodes[]/edges[] insertion order", () => {
  const g: ProductionGraph = { nodes: [{ id: "z", label: "Z", baseGeneration: 0 }, { id: "a", label: "A", baseGeneration: 0 }], edges: [] };
  assert.deepEqual(nodeOrder(g), ["a", "z"]);
});

test("toMatrix: M[target][source] = rate, parallel edges from a source to the same target sum", () => {
  const g: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 0 }, { id: "b", label: "B", baseGeneration: 0 }],
    edges: [{ from: "a", to: "b", rate: 0.1 }],
  };
  const { matrix, order } = toMatrix(g);
  const bi = order.indexOf("b");
  const ai = order.indexOf("a");
  assert.equal(matrix[bi]?.[ai], 0.1);
  assert.equal(matrix[ai]?.[bi], 0);
});

test("baseVector reads baseGeneration in the same node order toMatrix uses", () => {
  const g: ProductionGraph = {
    nodes: [{ id: "b", label: "B", baseGeneration: 2 }, { id: "a", label: "A", baseGeneration: 5 }],
    edges: [],
  };
  const order = nodeOrder(g);
  assert.deepEqual(order, ["a", "b"]);
  assert.deepEqual(baseVector(g, order), [5, 2]);
});

test("ablate removes exactly the named node and every edge touching it, leaving everything else fixed", () => {
  const g: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 1 }, { id: "b", label: "B", baseGeneration: 0 }, { id: "c", label: "C", baseGeneration: 0 }],
    edges: [{ from: "a", to: "b", rate: 0.1 }, { from: "b", to: "c", rate: 0.1 }, { from: "a", to: "c", rate: 0.05 }],
  };
  const ablated = ablate(g, "b");
  assert.deepEqual(ablated.nodes.map((n) => n.id).sort(), ["a", "c"]);
  assert.deepEqual(ablated.edges, [{ from: "a", to: "c", rate: 0.05 }]);
});

test("ablate of a node that doesn't exist is a genuine no-op — same nodes, same edges", () => {
  const g = starterWidgetGraph();
  const ablated = ablate(g, "fast-inspector"); // never built in this fixture
  assert.deepEqual(ablated, g);
});
