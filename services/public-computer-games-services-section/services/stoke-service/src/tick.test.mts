import { test } from "node:test";
import assert from "node:assert/strict";
import { STOCK_CLAMP, TICK_INTERVAL_MS, advance, ticksBetween, type StockState } from "./tick.mts";
import type { ProductionGraph } from "./graph.mts";

test("ticksBetween is exact epoch-anchored integer arithmetic", () => {
  assert.equal(ticksBetween(0, 5_000), 5);
  assert.equal(ticksBetween(500, 5_500), 5); // partial leading second doesn't round up
  assert.equal(ticksBetween(0, 999), 0); // less than one tick elapsed
  assert.throws(() => ticksBetween(1000, 0), /before fromTs/);
});

test("advance with zero elapsed ticks returns the identical state", () => {
  const graph: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 1 }], edges: [] };
  const state: StockState = { graph, stocks: { a: 3 } };
  const next = advance(state, 0, 500);
  assert.equal(next, state);
});

test("a lone source node accumulates baseGeneration linearly, one tick at a time", () => {
  const graph: ProductionGraph = { nodes: [{ id: "wood", label: "Wood", baseGeneration: 1 }], edges: [] };
  const state: StockState = { graph, stocks: { wood: 0 } };
  const next = advance(state, 0, 5 * TICK_INTERVAL_MS);
  assert.equal(next.stocks["wood"], 5);
});

test("a self-loop node compounds: stock_n = stock_0 * (1+r)^n", () => {
  const graph: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 0 }],
    edges: [{ from: "a", to: "a", rate: 0.1 }],
  };
  const state: StockState = { graph, stocks: { a: 1 } };
  const next = advance(state, 0, 10 * TICK_INTERVAL_MS);
  const expected = Math.pow(1.1, 10);
  assert.ok(Math.abs(next.stocks["a"]! - expected) < 1e-9, `got ${next.stocks["a"]}, expected ${expected}`);
});

test("advance matches an independent naive per-tick reference simulation, for a small chain over a small tick count", () => {
  const graph: ProductionGraph = {
    nodes: [
      { id: "a", label: "A", baseGeneration: 1 },
      { id: "b", label: "B", baseGeneration: 0 },
    ],
    edges: [
      { from: "a", to: "a", rate: 0.5 },
      { from: "a", to: "b", rate: 0.2 },
    ],
  };
  // Independent reference: simulate tick-by-tick with plain arithmetic, matching this module's
  // documented rule (stock_{t+1} = (I+M) stock_t + b) but implemented from scratch, not by
  // calling matPow — a bug in the fast-exponentiation code path would not reproduce here.
  let a = 2;
  let b = 0;
  for (let i = 0; i < 12; i++) {
    const na = a * 1.5 + 1; // (1 + self-loop 0.5) * a + baseGeneration 1
    const nb = b + 0.2 * a; // b gains 0.2 * a's PREVIOUS stock
    a = na;
    b = nb;
  }
  const state: StockState = { graph, stocks: { a: 2, b: 0 } };
  const next = advance(state, 0, 12 * TICK_INTERVAL_MS);
  assert.ok(Math.abs(next.stocks["a"]! - a) < 1e-6, `a: got ${next.stocks["a"]}, expected ${a}`);
  assert.ok(Math.abs(next.stocks["b"]! - b) < 1e-6, `b: got ${next.stocks["b"]}, expected ${b}`);
});

test("advance never reads the wall clock — same (state, fromTs, toTs) always yields the same result", () => {
  const graph: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 2 }], edges: [] };
  const state: StockState = { graph, stocks: { a: 0 } };
  const r1 = advance(state, 1_000, 9_000);
  const r2 = advance(state, 1_000, 9_000);
  assert.deepEqual(r1, r2);
});

test("advance throws rather than silently no-op when toTs < fromTs", () => {
  const graph: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 1 }], edges: [] };
  const state: StockState = { graph, stocks: { a: 0 } };
  assert.throws(() => advance(state, 10_000, 0));
});

// A real, honestly-built two-node reinvestment loop, ticked over an ordinary offline gap, can
// overflow float64 to Infinity in well under a day — and, without the clamp, would corrupt a
// totally unrelated disconnected node's stock to NaN in the process, because matPow's repeated
// squaring multiplies that Infinity against a genuine structural zero elsewhere in the augmented
// matrix. NaN is the specific failure that matters: `intents.mts`'s `spend()` check
// `balance < cost` is `false` for every cost when balance is NaN, so an un-caught NaN stock would
// become free, infinite currency. See tick.mts's header ("Numerical-safety ceiling").
test("advance never produces Infinity or NaN, even for a real player-buildable loop over an ordinary offline gap that would otherwise overflow float64", () => {
  const graph: ProductionGraph = {
    nodes: [
      { id: "wood", label: "Wood", baseGeneration: 1 },
      { id: "smelter", label: "Smelter", baseGeneration: 0 },
      { id: "museum", label: "Museum", baseGeneration: 0 }, // a genuine dead end: no edges in or out
    ],
    edges: [
      { from: "wood", to: "smelter", rate: 0.04 },
      { from: "smelter", to: "wood", rate: 0.01 },
    ],
  };
  const state: StockState = { graph, stocks: { wood: 800_000_000_000_000, smelter: 1_600_000_000_000_000, museum: 0 } };
  // One day of one-second ticks — an ordinary "came back the next day" idle-game gap, not an
  // extreme edge case.
  const next = advance(state, 0, 24 * 60 * 60 * 1000);
  for (const [id, value] of Object.entries(next.stocks)) {
    assert.ok(Number.isFinite(value), `${id}: expected a finite stock, got ${value}`);
  }
  // The dead-end node specifically must not be corrupted by an unrelated part of the graph
  // overflowing — it has no edges at all, so its honest value is exactly its own accumulation
  // (zero baseGeneration, zero stock in, so it should still read 0), never NaN.
  assert.equal(next.stocks["museum"], 0, "a disconnected dead-end node must never be corrupted to NaN by growth elsewhere in the graph");
  // The genuinely explosive loop should have saturated at the documented, finite safety ceiling
  // rather than reading Infinity.
  assert.equal(next.stocks["wood"], STOCK_CLAMP, `expected the overflowing loop to saturate at STOCK_CLAMP, got ${next.stocks["wood"]}`);
});

test("advance's numerical-safety clamp does not engage for any honestly-sized graph/gap combination this game's own fixtures exercise (STOCK_CLAMP is a ceiling on overflow, not a gameplay cap)", () => {
  // Sanity check on the ceiling's placement: two weeks against offline-progression.test.mts's own
  // growth fixture (see that file's header) tops out around 1e84 — nowhere near STOCK_CLAMP
  // (1e250). This test would fail loudly if a future change moved the ceiling low enough to start
  // silently flattening ordinary numbers instead of only rescuing genuine overflow.
  const graph: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 0 }],
    edges: [{ from: "a", to: "a", rate: 0.02 }],
  };
  const state: StockState = { graph, stocks: { a: 1000 } };
  const next = advance(state, 0, 1000 * TICK_INTERVAL_MS); // 1.02^1000 ~= 4e8, comfortably finite
  assert.ok(next.stocks["a"]! < STOCK_CLAMP / 1e100, "an ordinary growth scenario must land far below the safety ceiling, not be silently flattened by it");
});
