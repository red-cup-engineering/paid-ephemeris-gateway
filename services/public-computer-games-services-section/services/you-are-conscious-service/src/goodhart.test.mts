/**
 * `goodhart.test` — tier 6's hinge, made checkable: `WidgetsDisplayed === MaterialConsumed` holds
 * automatically for a player who never builds a Fast Inspector (DESIGN.md §3's own claim, "with no
 * separate code path asserting it"), and the audited gap, lag, and taint discount all behave per
 * §3's stated mechanics. The test named "the audited identity holds with no Fast Inspector" is the
 * one directly proving DESIGN.md §3's structural claim.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { starterWidgetGraph, type ConsciousState } from "./state.mts";
import {
  FAST_INSPECTOR_NODE_ID, TRUST_FLOOR, TRUST_LAG_TICKS, ageAndDecayTrust, auditAdvance,
  auditGraph, buildAllowedUnderTrust, fastInspectorNode, honestyGap, isFastInspectorPresent,
  isTainted, materialConsumed, queueDivergence, resolveBranch, widgetsDisplayed,
} from "./goodhart.mts";
import { TICK_INTERVAL_MS } from "./tick.mts";
import type { GoodhartState } from "./state.mts";
import type { ProductionGraph } from "./graph.mts";

function baseState(graph: ProductionGraph, stocks: Record<string, number>, goodhart?: Partial<GoodhartState>): ConsciousState {
  return {
    widgets: { graph, stocks },
    cognition: {
      tiersUnlocked: [1, 2, 3, 4, 5, 6],
      insight: 0,
      crossingsAnswered: {},
      attention: { pool: 10, allocation: { memory: 0, perception: 0, synthesis: 0 } },
      exploration: { samples: {}, cumulativeRegret: 0, ticksSpent: 0 },
      policy: { recording: null, policies: {} },
      goodhart: { fastInspectorBuilt: false, auditStocks: { ...stocks }, trust: 1, trustLagQueue: [], branch: "unresolved", repairedAtTick: null, ...goodhart },
      calibration: { pending: null, brierHistory: [] },
      values: { weights: null },
      childSeeds: [],
      margin: [],
    },
    reflectionHistory: [],
    lastSeenTs: 0,
    seed: "goodhart-test",
  };
}

test("the audited identity holds with no Fast Inspector: WidgetsDisplayed === MaterialConsumed, automatically, for the starter graph", () => {
  const graph = starterWidgetGraph();
  const stocks = { material: 5, component: 2, widget: 1 };
  const state = baseState(graph, stocks, { auditStocks: stocks });
  assert.equal(widgetsDisplayed(state).value, materialConsumed(state).value);
  assert.equal(honestyGap(state).value, 0);
});

test("ablate of a never-built Fast Inspector is a no-op: auditGraph(graph) === graph", () => {
  const graph = starterWidgetGraph();
  assert.deepEqual(auditGraph(graph), graph);
  assert.equal(isFastInspectorPresent(graph), false);
  assert.equal(isTainted(graph), false);
});

test("building a Fast Inspector node opens a real, honest gap between the real graph and the audited (ablated) one", () => {
  const graph = starterWidgetGraph();
  const withFI: ProductionGraph = { nodes: [...graph.nodes, fastInspectorNode()], edges: [...graph.edges, { from: FAST_INSPECTOR_NODE_ID, to: "widget", rate: 0.05 }] };
  assert.equal(isFastInspectorPresent(withFI), true);
  assert.equal(isTainted(withFI), true);
  const stocks = { material: 5, component: 2, widget: 1, [FAST_INSPECTOR_NODE_ID]: 0 };
  const { real, audit } = auditAdvance(withFI, stocks, stocks, 0, 100 * TICK_INTERVAL_MS);
  assert.ok((real.stocks["widget"] ?? 0) > (audit.stocks["widget"] ?? 0), "the real (tainted) graph must produce MORE widget stock than the honest, ablated audit over the same span");
});

test("queueDivergence only records growth in the gap, never a shrink, and is a no-op when the gap didn't grow", () => {
  const g0: GoodhartState = { fastInspectorBuilt: false, auditStocks: {}, trust: 1, trustLagQueue: [], branch: "unresolved", repairedAtTick: null };
  const grew = queueDivergence(g0, 0, 5);
  assert.equal(grew.trustLagQueue.length, 1);
  assert.equal(grew.trustLagQueue[0]?.amount, 5);
  const same = queueDivergence(g0, 5, 5);
  assert.equal(same, g0, "no growth in the gap must be a true no-op, not an empty-amount entry");
});

test("the trust lag: a fresh divergence does NOT debit trust immediately; it only debits once it has aged TRUST_LAG_TICKS", () => {
  let g: GoodhartState = { fastInspectorBuilt: true, auditStocks: {}, trust: 1, trustLagQueue: [], branch: "unresolved", repairedAtTick: null };
  g = queueDivergence(g, 0, 100);
  const justUnderLag = ageAndDecayTrust(g, TRUST_LAG_TICKS - 1, TRUST_LAG_TICKS - 1);
  assert.equal(justUnderLag.trust, 1, "trust must not move before the divergence has aged the full lag window");
  assert.equal(justUnderLag.trustLagQueue.length, 1, "the entry must still be pending, not yet matured");

  const afterLag = ageAndDecayTrust(g, TRUST_LAG_TICKS, TRUST_LAG_TICKS);
  assert.ok(afterLag.trust < 1, "trust must be debited once the divergence has matured past TRUST_LAG_TICKS");
  assert.equal(afterLag.trustLagQueue.length, 0, "a matured entry must be cleared from the queue, not double-counted on a future call");
});

test("buildAllowedUnderTrust is a live gate: false under the floor, true again once trust recovers above it", () => {
  const low: GoodhartState = { fastInspectorBuilt: true, auditStocks: {}, trust: TRUST_FLOOR - 0.01, trustLagQueue: [], branch: "persist", repairedAtTick: null };
  assert.equal(buildAllowedUnderTrust(low), false);
  const recovered: GoodhartState = { ...low, trust: TRUST_FLOOR + 0.01 };
  assert.equal(buildAllowedUnderTrust(recovered), true);
});

test("resolveBranch('repair') removes the Fast Inspector node from the graph and records repairedAtTick", () => {
  const graph = starterWidgetGraph();
  const withFI: ProductionGraph = { nodes: [...graph.nodes, fastInspectorNode()], edges: graph.edges };
  const state = baseState(withFI, { material: 1, component: 0, widget: 0, [FAST_INSPECTOR_NODE_ID]: 0 }, { fastInspectorBuilt: true });
  const resolved = resolveBranch(state, "repair", 500);
  assert.equal(isFastInspectorPresent(resolved.graph), false);
  assert.equal(resolved.goodhart.branch, "repair");
  assert.equal(resolved.goodhart.repairedAtTick, 500);
});

test("resolveBranch('persist') leaves the graph untouched — the edge stays live, this is a real playstyle, not a game-over", () => {
  const graph = starterWidgetGraph();
  const withFI: ProductionGraph = { nodes: [...graph.nodes, fastInspectorNode()], edges: graph.edges };
  const state = baseState(withFI, { material: 1, component: 0, widget: 0, [FAST_INSPECTOR_NODE_ID]: 0 }, { fastInspectorBuilt: true });
  const resolved = resolveBranch(state, "persist", 500);
  assert.deepEqual(resolved.graph, withFI);
  assert.equal(resolved.goodhart.branch, "persist");
});

test("resolveBranch refuses to resolve to 'unresolved'", () => {
  const state = baseState(starterWidgetGraph(), { material: 0, component: 0, widget: 0 });
  assert.throws(() => resolveBranch(state, "unresolved", 0), RangeError);
});
