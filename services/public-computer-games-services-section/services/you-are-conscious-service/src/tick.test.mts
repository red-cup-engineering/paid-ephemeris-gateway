/**
 * `tick.test` — the stock-evolution engine's own direct properties: `ticksBetween`'s purity and
 * additivity, `advance`'s no-op-on-zero-ticks and clamp-to-finite behavior, and growth-curve
 * monotonicity (DESIGN.md §2's tier-2 "compounding vs. linear" claim, made checkable: a graph with
 * a real reinvestment edge grows STRICTLY faster than one without, given equal starting stock and
 * equal elapsed ticks — this is the literal mechanism the tier-2 sparkline draws from).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STOCK_CLAMP, TICK_INTERVAL_MS, advance, ticksBetween, type StockState } from "./tick.mts";
import type { ProductionGraph } from "./graph.mts";

test("ticksBetween is exact integer arithmetic, anchored to the epoch, not to either argument", () => {
  assert.equal(ticksBetween(0, 0), 0);
  assert.equal(ticksBetween(0, TICK_INTERVAL_MS), 1);
  assert.equal(ticksBetween(500, TICK_INTERVAL_MS + 500), 1);
  assert.equal(ticksBetween(0, 10 * TICK_INTERVAL_MS), 10);
});

test("ticksBetween is additive: splitting an interval anywhere never changes the total tick count", () => {
  const t0 = 137;
  const t1 = 90_000;
  const t2 = 3_600_000;
  assert.equal(ticksBetween(t0, t1) + ticksBetween(t1, t2), ticksBetween(t0, t2));
});

test("ticksBetween throws on a backward interval — time does not run backward in this engine", () => {
  assert.throws(() => ticksBetween(1000, 0), RangeError);
});

test("advance is a true no-op (returns the identical stocks object) when zero ticks elapse", () => {
  const graph: ProductionGraph = { nodes: [{ id: "a", label: "A", baseGeneration: 1 }], edges: [] };
  const state: StockState = { graph, stocks: { a: 5 } };
  const next = advance(state, 500, 999); // < 1 tick apart
  assert.equal(next, state);
});

test("advance on a graph with no nodes returns the state unchanged rather than throwing", () => {
  const graph: ProductionGraph = { nodes: [], edges: [] };
  const state: StockState = { graph, stocks: {} };
  const next = advance(state, 0, 10 * TICK_INTERVAL_MS);
  assert.deepEqual(next.stocks, {});
});

test("STOCK_CLAMP: a runaway-growth graph never produces Infinity or NaN, even over a very long offline gap", () => {
  const graph: ProductionGraph = {
    nodes: [{ id: "a", label: "A", baseGeneration: 1 }, { id: "b", label: "B", baseGeneration: 0 }],
    edges: [
      { from: "a", to: "a", rate: 0.05 },
      { from: "a", to: "b", rate: 0.05 },
      { from: "b", to: "a", rate: 0.05 },
    ],
  };
  const state: StockState = { graph, stocks: { a: 1, b: 0 } };
  const oneYearTicks = 365 * 24 * 60 * 60;
  const next = advance(state, 0, oneYearTicks * TICK_INTERVAL_MS);
  for (const v of Object.values(next.stocks)) {
    assert.ok(Number.isFinite(v), `stock must stay finite, got ${v}`);
    assert.ok(!Number.isNaN(v), "stock must never be NaN");
    assert.ok(v <= STOCK_CLAMP, `stock must be clamped at or below ${STOCK_CLAMP}, got ${v}`);
  }
});

// ── DESIGN.md §2 tier-2 pedagogy: feedback loops make compounding growth strictly outpace linear
//    growth. This is the mechanism the tier-2 "two literal curves on one small chart" sparkline
//    reads directly off of. ─────────────────────────────────────────────────────────────────────

const LINEAR_ONLY: ProductionGraph = {
  nodes: [{ id: "material", label: "Material", baseGeneration: 1 }],
  edges: [], // no reinvestment edge at all: stock grows by exactly baseGeneration per tick, forever
};

const COMPOUNDING: ProductionGraph = {
  nodes: [{ id: "material", label: "Material", baseGeneration: 1 }],
  edges: [{ from: "material", to: "material", rate: 0.01 }], // reinvests 1% of its own stock per tick
};

test("pedagogy (tier 2, feedback loops): a graph with a self-reinvestment edge grows strictly faster than a same-baseGeneration graph with none, once stock has accumulated", () => {
  const t = 500 * TICK_INTERVAL_MS;
  const linear = advance({ graph: LINEAR_ONLY, stocks: { material: 0 } }, 0, t);
  const compounding = advance({ graph: COMPOUNDING, stocks: { material: 0 } }, 0, t);
  assert.equal(linear.stocks["material"], 500, "no-edge growth is exactly baseGeneration * ticks — literally linear");
  assert.ok(
    (compounding.stocks["material"] ?? 0) > (linear.stocks["material"] ?? 0),
    `compounding growth (${compounding.stocks["material"]}) must exceed linear growth (${linear.stocks["material"]}) over the same elapsed ticks`,
  );
});

test("pedagogy (tier 2, feedback loops): compounding growth's OWN curve is convex — later equal-length windows produce strictly more growth than earlier ones", () => {
  const early = advance({ graph: COMPOUNDING, stocks: { material: 0 } }, 0, 200 * TICK_INTERVAL_MS);
  const midStart = advance({ graph: COMPOUNDING, stocks: { material: 0 } }, 0, 800 * TICK_INTERVAL_MS);
  const midEnd = advance({ graph: COMPOUNDING, stocks: { material: 0 } }, 0, 1000 * TICK_INTERVAL_MS);
  const earlyWindowGrowth = early.stocks["material"] ?? 0; // ticks [0, 200)
  const lateWindowGrowth = (midEnd.stocks["material"] ?? 0) - (midStart.stocks["material"] ?? 0); // ticks [800, 1000)
  assert.ok(
    lateWindowGrowth > earlyWindowGrowth,
    `a later 200-tick window (${lateWindowGrowth}) must grow more than an earlier 200-tick window (${earlyWindowGrowth}) under real compounding`,
  );
});
