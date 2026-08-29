/**
 * `reflect.test` — tier 9's prestige invariants, this build's own version of the property Stoke's
 * `prestige.test.mts` runs: reflection banks a real, computed `(lambda, mixture)`, resets ONLY the
 * `widgets` slice, and the honesty-audit discount on a tainted run is real and directional.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { starterWidgetGraph, type ConsciousState } from "./state.mts";
import { InvalidReflectionGraphError, insightFromLambda, previewReflection, reflect } from "./reflect.mts";
import { FAST_INSPECTOR_NODE_ID, INSIGHT_TAINT_MULTIPLIER, TAINT_REASON, fastInspectorNode } from "./goodhart.mts";
import type { ProductionGraph } from "./graph.mts";

// A real, cyclic, honestly-buildable graph — starterWidgetGraph() is acyclic on purpose and would
// make previewReflection refuse (no growth loop yet), which is a real state this module DOES need
// to handle (see the refusal test below) but not the one every invariant test wants as its fixture.
function cyclicGraph(): ProductionGraph {
  return {
    nodes: [{ id: "material", label: "Material", baseGeneration: 1 }, { id: "component", label: "Component", baseGeneration: 0 }, { id: "widget", label: "Widget", baseGeneration: 0 }],
    edges: [
      { from: "material", to: "component", rate: 0.02 },
      { from: "component", to: "widget", rate: 0.02 },
      { from: "widget", to: "material", rate: 0.01 },
    ],
  };
}

function stateWithGraph(graph: ProductionGraph, stocks: Record<string, number>, overrides: Partial<ConsciousState["cognition"]> = {}): ConsciousState {
  return {
    widgets: { graph, stocks },
    cognition: {
      tiersUnlocked: [1, 2, 3],
      insight: 3,
      crossingsAnswered: { 2: "yes-plainly" },
      attention: { pool: 10, allocation: { memory: 1, perception: 2, synthesis: 3 } },
      exploration: { samples: { alpha: { count: 2, totalObserved: 1 } }, cumulativeRegret: 0.5, ticksSpent: 2 },
      policy: { recording: null, policies: { p1: { name: "p1", steps: [{ kind: "click", payload: {} }] } } },
      goodhart: { fastInspectorBuilt: false, auditStocks: { material: 99 }, trust: 0.77, trustLagQueue: [{ amount: 3, ticksWaited: 4 }], branch: "unresolved", repairedAtTick: null },
      calibration: { pending: null, brierHistory: [0.1, 0.2] },
      values: { weights: { widgets: 1, "material-honesty": 0, trust: 0 } },
      childSeeds: ["child-1"],
      margin: ["a note"],
      ...overrides,
    },
    reflectionHistory: [],
    lastSeenTs: 12345,
    seed: "reflect-test",
  };
}

test("previewReflection refuses an acyclic graph honestly (no valid lambda) rather than fabricating one", () => {
  const preview = previewReflection(starterWidgetGraph());
  assert.equal(preview.validity.valid, false);
  assert.equal(preview.lambda, null);
});

test("reflect() throws InvalidReflectionGraphError on an acyclic graph — no reflection happens, no record is banked", () => {
  const state = stateWithGraph(starterWidgetGraph(), { material: 0, component: 0, widget: 0 });
  assert.throws(() => reflect(state, 999), InvalidReflectionGraphError);
});

test("prestige invariant: widgets resets to starterWidgetGraph() with all-zero stocks", () => {
  const state = stateWithGraph(cyclicGraph(), { material: 5, component: 2, widget: 1 });
  const next = reflect(state, 999);
  assert.deepEqual(next.widgets.graph, starterWidgetGraph());
  for (const v of Object.values(next.widgets.stocks)) assert.equal(v, 0);
});

test("prestige invariant: cognition slices OTHER than goodhart's per-run fields pass through completely unchanged", () => {
  const state = stateWithGraph(cyclicGraph(), { material: 5, component: 2, widget: 1 });
  const next = reflect(state, 999);
  assert.deepEqual(next.cognition.tiersUnlocked, state.cognition.tiersUnlocked);
  assert.deepEqual(next.cognition.crossingsAnswered, state.cognition.crossingsAnswered);
  assert.deepEqual(next.cognition.attention, state.cognition.attention);
  assert.deepEqual(next.cognition.exploration, state.cognition.exploration);
  assert.deepEqual(next.cognition.policy, state.cognition.policy);
  assert.deepEqual(next.cognition.calibration, state.cognition.calibration);
  assert.deepEqual(next.cognition.values, state.cognition.values);
  assert.deepEqual(next.cognition.childSeeds, state.cognition.childSeeds);
  assert.deepEqual(next.cognition.margin, state.cognition.margin);
});

test("prestige invariant: goodhart's per-run fields (auditStocks, trustLagQueue, fastInspectorBuilt, repairedAtTick) reset; trust itself persists", () => {
  const state = stateWithGraph(cyclicGraph(), { material: 5, component: 2, widget: 1 });
  const next = reflect(state, 999);
  assert.deepEqual(next.cognition.goodhart.auditStocks, {});
  assert.deepEqual(next.cognition.goodhart.trustLagQueue, []);
  assert.equal(next.cognition.goodhart.fastInspectorBuilt, false);
  assert.equal(next.cognition.goodhart.repairedAtTick, null);
  assert.equal(next.cognition.goodhart.trust, state.cognition.goodhart.trust, "trust must survive a reflection unchanged — see reflect.mts's own header");
});

test("prestige invariant: reflectionHistory grows by exactly one record, banking the same lambda/mixture previewReflection reports", () => {
  const graph = cyclicGraph();
  const state = stateWithGraph(graph, { material: 5, component: 2, widget: 1 });
  const preview = previewReflection(graph);
  const next = reflect(state, 999);
  assert.equal(next.reflectionHistory.length, 1);
  const record = next.reflectionHistory[0]!;
  assert.ok(Math.abs(record.lambda - preview.lambda!.value) < 1e-9);
  assert.deepEqual(record.mixture, preview.mixture!.value);
  assert.equal(record.taintedBy, null);
  assert.equal(record.resetAtTs, 999);
});

test("insightFromLambda is monotonically increasing in lambda, for both tainted and untainted", () => {
  const a = insightFromLambda(1, false).value;
  const b = insightFromLambda(2, false).value;
  assert.ok(b > a);
  const at = insightFromLambda(1, true).value;
  const bt = insightFromLambda(2, true).value;
  assert.ok(bt > at);
});

test("pedagogy (the Goodhart discount): a tainted reflection banks strictly LESS insight than an untainted reflection of the identical lambda", () => {
  const lambda = 3.5;
  const clean = insightFromLambda(lambda, false);
  const tainted = insightFromLambda(lambda, true);
  assert.ok(tainted.value < clean.value);
  assert.ok(Math.abs(tainted.value - clean.value * INSIGHT_TAINT_MULTIPLIER) < 1e-9);
});

test("reflecting a tainted (Fast Inspector present) graph banks a record with taintedBy set, at the discounted rate, and sets branch to 'reflect-immediately' when unresolved", () => {
  const graph = cyclicGraph();
  const withFI: ConsciousState["widgets"]["graph"] = { nodes: [...graph.nodes, fastInspectorNode()], edges: [...graph.edges, { from: FAST_INSPECTOR_NODE_ID, to: "widget", rate: 0.02 }] };
  const state = stateWithGraph(withFI, { material: 5, component: 2, widget: 1, [FAST_INSPECTOR_NODE_ID]: 0 });
  const next = reflect(state, 999);
  const record = next.reflectionHistory[0]!;
  assert.equal(record.taintedBy, TAINT_REASON);
  assert.equal(next.cognition.goodhart.branch, "reflect-immediately");
  const untaintedEquivalent = insightFromLambda(record.lambda, false).value;
  assert.ok(record.insightBanked < untaintedEquivalent, "a tainted reflection's actual banked Insight must be less than what the same lambda would bank clean");
});

test("reflecting a tainted graph whose Goodhart branch was ALREADY resolved (e.g. 'persist') does not overwrite that branch", () => {
  const graph = cyclicGraph();
  const withFI: ConsciousState["widgets"]["graph"] = { nodes: [...graph.nodes, fastInspectorNode()], edges: [...graph.edges, { from: FAST_INSPECTOR_NODE_ID, to: "widget", rate: 0.02 }] };
  const state = stateWithGraph(withFI, { material: 5, component: 2, widget: 1, [FAST_INSPECTOR_NODE_ID]: 0 }, {
    goodhart: { fastInspectorBuilt: true, auditStocks: {}, trust: 0.6, trustLagQueue: [], branch: "persist", repairedAtTick: null },
  });
  const next = reflect(state, 999);
  assert.equal(next.cognition.goodhart.branch, "persist", "an already-chosen branch must not be silently overwritten by a later, unrelated reflection");
});

test("cumulative insight banking: two successive reflections both add to insight, never replace it", () => {
  const state = stateWithGraph(cyclicGraph(), { material: 5, component: 2, widget: 1 });
  const afterFirst = reflect(state, 500);
  const insightAfterFirst = afterFirst.cognition.insight;
  assert.ok(insightAfterFirst > state.cognition.insight);
  // Build the graph back up to a valid cyclic shape for a second reflection.
  const afterFirstWithGraph = { ...afterFirst, widgets: { graph: cyclicGraph(), stocks: { material: 5, component: 2, widget: 1 } } };
  const afterSecond = reflect(afterFirstWithGraph, 1000);
  assert.ok(afterSecond.cognition.insight > insightAfterFirst, "insight must accumulate across reflections, never reset");
  assert.equal(afterSecond.reflectionHistory.length, 2);
});
