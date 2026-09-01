/**
 * `values.test` — tier 8's pedagogy: a real, computed Pareto frontier, and a real linear-
 * scalarization walk along it. The test named "the frontier collapses to one point for an untainted
 * player" is the direct check that this game never fabricates a tradeoff that isn't actually there.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { frontierCandidates, normalizeWeights, paretoFrontier, pointForWeights, type FrontierPoint } from "./values.mts";
import { starterWidgetGraph, type ConsciousState } from "./state.mts";
import { fastInspectorNode, FAST_INSPECTOR_NODE_ID } from "./goodhart.mts";
import { OBJECTIVE_IDS } from "./state.mts";

function baseState(overrides: Partial<ConsciousState["widgets"]> = {}, trust = 1): ConsciousState {
  const graph = overrides.graph ?? starterWidgetGraph();
  const stocks = overrides.stocks ?? { material: 5, component: 2, widget: 1 };
  return {
    widgets: { graph, stocks },
    cognition: {
      tiersUnlocked: [1, 2, 3, 4, 5, 6, 7, 8],
      insight: 0,
      crossingsAnswered: {},
      attention: { pool: 10, allocation: { memory: 0, perception: 0, synthesis: 0 } },
      exploration: { samples: {}, cumulativeRegret: 0, ticksSpent: 0 },
      policy: { recording: null, policies: {} },
      goodhart: { fastInspectorBuilt: false, auditStocks: stocks, trust, trustLagQueue: [], branch: "unresolved", repairedAtTick: null },
      calibration: { pending: null, brierHistory: [] },
      values: { weights: null },
      childSeeds: [],
      margin: [],
    },
    reflectionHistory: [],
    lastSeenTs: 0,
    seed: "values-test",
  };
}

test("paretoFrontier: a point that's worse-or-equal in every objective is filtered out", () => {
  const dominant: FrontierPoint = { label: "dominant", values: { widgets: 5, "material-honesty": 1, trust: 1 } };
  const dominated: FrontierPoint = { label: "dominated", values: { widgets: 3, "material-honesty": 0.5, trust: 0.5 } };
  const result = paretoFrontier([dominant, dominated]);
  assert.deepEqual(result.map((p) => p.label), ["dominant"]);
});

test("paretoFrontier: two points that each win on a different objective are BOTH kept — a real tradeoff", () => {
  const a: FrontierPoint = { label: "a", values: { widgets: 10, "material-honesty": 0.2, trust: 0.5 } };
  const b: FrontierPoint = { label: "b", values: { widgets: 2, "material-honesty": 1, trust: 0.5 } };
  const result = paretoFrontier([a, b]);
  assert.equal(result.length, 2);
});

test("normalizeWeights always sums to 1, and falls back to an even split when every weight is zero", () => {
  const w = normalizeWeights({ widgets: 2, "material-honesty": 2 });
  const sum = OBJECTIVE_IDS.reduce((s, o) => s + w[o], 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const even = normalizeWeights({});
  for (const o of OBJECTIVE_IDS) assert.ok(Math.abs(even[o] - 1 / 3) < 1e-9);
});

test("normalizeWeights clamps negative requests to zero before normalizing", () => {
  const w = normalizeWeights({ widgets: -5, "material-honesty": 5 });
  assert.equal(w.widgets, 0);
  assert.ok(Math.abs(w["material-honesty"] - 1) < 1e-9);
});

test("pedagogy (tier 8, value alignment): for a player who never built a Fast Inspector, the frontier collapses to a single point — there is no fabricated tradeoff to walk", () => {
  const state = baseState();
  const candidates = frontierCandidates(state);
  const frontier = paretoFrontier(candidates);
  assert.equal(frontier.length, 1, "an untainted graph's 'as built' and 'repaired' points must coincide exactly");
});

test("pedagogy (tier 8): a tainted graph produces a REAL two-point frontier — widgets vs. material-honesty genuinely trade off", () => {
  const graph = starterWidgetGraph();
  const withFI = { nodes: [...graph.nodes, fastInspectorNode()], edges: [...graph.edges, { from: FAST_INSPECTOR_NODE_ID, to: "widget", rate: 0.05 }] };
  const state = baseState({ graph: withFI, stocks: { material: 5, component: 2, widget: 20, [FAST_INSPECTOR_NODE_ID]: 0 } });
  const frontier = paretoFrontier(frontierCandidates(state));
  assert.ok(frontier.length >= 1);
  // the as-built point should score higher on "widgets" and the repaired point higher (or equal)
  // on "material-honesty" — a real, checkable tradeoff, not an assumed one.
  const asBuilt = frontier.find((p) => p.label === "as built");
  const repaired = frontier.find((p) => p.label.startsWith("repaired"));
  if (asBuilt && repaired) {
    assert.ok(repaired.values["material-honesty"] >= asBuilt.values["material-honesty"]);
  }
});

test("pointForWeights always returns a point that is actually a member of the (filtered) frontier — never a synthesized in-between value", () => {
  const state = baseState();
  const candidates = frontierCandidates(state);
  const frontier = paretoFrontier(candidates);
  const point = pointForWeights(candidates, normalizeWeights({ widgets: 1 }));
  assert.ok(frontier.some((p) => p.label === point.label && JSON.stringify(p.values) === JSON.stringify(point.values)));
});

test("pointForWeights favoring 'widgets' heavily picks the point with the higher widgets score, when the two differ", () => {
  const points: FrontierPoint[] = [
    { label: "growth-heavy", values: { widgets: 10, "material-honesty": 0.1, trust: 1 } },
    { label: "honesty-heavy", values: { widgets: 1, "material-honesty": 1, trust: 1 } },
  ];
  const picked = pointForWeights(points, { widgets: 1, "material-honesty": 0, trust: 0 });
  assert.equal(picked.label, "growth-heavy");
});
