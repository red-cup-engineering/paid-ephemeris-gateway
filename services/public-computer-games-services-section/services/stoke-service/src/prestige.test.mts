import { test } from "node:test";
import assert from "node:assert/strict";
import { InvalidPrestigeGraphError, previewPrestige, reset, startingStockBonus, totalBankedLambda } from "./prestige.mts";
import { starterGraph, starterState, type StokeState } from "./state.mts";
import type { ProductionGraph } from "./graph.mts";

test("previewPrestige on the starter (acyclic) graph is honestly invalid — no fabricated lambda", () => {
  const preview = previewPrestige(starterGraph());
  assert.equal(preview.validity.valid, false);
  assert.equal(preview.lambda, null);
  assert.equal(preview.mixture, null);
});

test("reset() refuses on an acyclic graph rather than inventing a multiplier", () => {
  const state = starterState(0);
  assert.throws(() => reset(state, 1000), InvalidPrestigeGraphError);
});

const loopedGraph: ProductionGraph = {
  nodes: [
    { id: "wood", label: "Wood", baseGeneration: 1 },
    { id: "plank", label: "Plank", baseGeneration: 0 },
    { id: "gold", label: "Gold", baseGeneration: 0 },
  ],
  edges: [
    { from: "wood", to: "plank", rate: 0.3 },
    { from: "plank", to: "gold", rate: 0.3 },
    { from: "gold", to: "wood", rate: 0.3 }, // closes the loop
  ],
};

test("previewPrestige on a graph with a real loop returns a computed, positive lambda and an L1-normalized mixture", () => {
  const preview = previewPrestige(loopedGraph);
  assert.equal(preview.validity.valid, true);
  assert.ok(preview.lambda !== null && preview.lambda.value > 0);
  assert.equal(preview.lambda?.provenance, "computed-from-your-graph");
  assert.equal(preview.mixture?.provenance, "computed-from-your-graph");
  const shares = Object.values(preview.mixture?.value ?? {});
  const sum = shares.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("reset() banks a PrestigeRecord, resets to the starter graph, and applies an authored (not computed) starting bonus", () => {
  const state: StokeState = { graph: loopedGraph, stocks: { wood: 40, plank: 12, gold: 3 }, prestigeHistory: [], lastSeenTs: 0, seed: "test-seed" };
  const next = reset(state, 5000);
  assert.equal(next.prestigeHistory.length, 1);
  assert.equal(next.prestigeHistory[0]!.resetAtTs, 5000);
  assert.ok(next.prestigeHistory[0]!.lambda > 0);
  assert.deepEqual(next.graph, starterGraph());
  const bonus = startingStockBonus(next.prestigeHistory);
  assert.equal(bonus.provenance, "designed-flavor");
  assert.ok(Math.abs((next.stocks["wood"] ?? 0) - bonus.value) < 1e-9, "wood's starting stock should be exactly the authored bonus, not blended with anything computed");
  assert.equal(next.stocks["plank"], 0);
  assert.equal(next.stocks["gold"], 0);
});

test("startingStockBonus accumulates across multiple banked resets and is always tagged designed-flavor", () => {
  const b0 = startingStockBonus([]);
  assert.equal(b0.value, 0);
  const history = [
    { lambda: 0.5, mixture: {}, resetAtTs: 0 },
    { lambda: 0.3, mixture: {}, resetAtTs: 1 },
  ];
  assert.ok(Math.abs(totalBankedLambda(history) - 0.8) < 1e-12);
  const b = startingStockBonus(history);
  assert.equal(b.provenance, "designed-flavor");
  assert.ok(Math.abs(b.value - 8) < 1e-9); // 10 * 0.8
});

test("second reset banks a second PrestigeRecord on top of the first — history is never overwritten", () => {
  const first = reset({ graph: loopedGraph, stocks: { wood: 5, plank: 0, gold: 0 }, prestigeHistory: [], lastSeenTs: 0, seed: "test-seed" }, 1000);
  const second = reset({ ...first, graph: loopedGraph, stocks: { wood: 5, plank: 0, gold: 0 } }, 2000);
  assert.equal(second.prestigeHistory.length, 2);
  assert.equal(second.prestigeHistory[0]!.resetAtTs, 1000);
  assert.equal(second.prestigeHistory[1]!.resetAtTs, 2000);
});
