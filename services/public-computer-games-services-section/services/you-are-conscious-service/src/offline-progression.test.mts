/**
 * `offline-progression.test` — the house's own offline-progress honesty property, stated exactly
 * as the brief asks for it: **N hours offline equals N hours simulated.** Two independent halves:
 *
 *   1. ASSOCIATIVITY (Stoke's own property, ported): one big `advance` jump equals the same span
 *      covered by splitting it into several smaller `advance` calls, within a stated floating-point
 *      tolerance (see `tick.mts`'s header — binary exponentiation groups the same multiplications
 *      differently depending on where `n` is split, so exact bit-equality is never the honest
 *      claim; 1e-9 relative tolerance is).
 *   2. LITERAL "OFFLINE JUMP" vs. "TICK-BY-TICK SIMULATION" — one `advance` call covering the
 *      entire gap in one O(log n) closed-form step, versus manually looping `advance` one tick at a
 *      time (the literal thing "simulated" means: never offline, ticking in real time) for the
 *      identical total span. These two code paths — the offline catch-up path a real client uses
 *      after being closed for a while, and the once-a-second loop the same client uses while the
 *      tab stays open — must land on the same numbers, which is the actual player-facing promise
 *      "offline progress is honest" is making.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TICK_INTERVAL_MS, advance, type StockState } from "./tick.mts";
import type { ProductionGraph } from "./graph.mts";

const RELATIVE_TOLERANCE = 1e-9;

function assertCloseRelative(a: number, b: number, label: string): void {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  const diff = Math.abs(a - b);
  assert.ok(diff / scale < RELATIVE_TOLERANCE, `${label}: |${a} - ${b}| / ${scale} = ${diff / scale} exceeds tolerance ${RELATIVE_TOLERANCE}`);
}

function assertStatesClose(a: StockState, b: StockState, label: string): void {
  for (const id of Object.keys(a.stocks)) {
    assertCloseRelative(a.stocks[id] ?? 0, b.stocks[id] ?? 0, `${label} / node ${id}`);
  }
}

// A real cyclic widget-shaped graph — deliberately NOT starterWidgetGraph() (that one is acyclic
// by design, DESIGN.md's own "no growth loop yet" starting honesty), because this property needs a
// graph that actually compounds to be a meaningful test of the offline-catch-up path.
const growthGraph: ProductionGraph = {
  nodes: [
    { id: "material", label: "Material", baseGeneration: 1.1 },
    { id: "component", label: "Component", baseGeneration: 0 },
    { id: "widget", label: "Widget", baseGeneration: 0 },
  ],
  edges: [
    { from: "material", to: "component", rate: 0.0006 },
    { from: "component", to: "widget", rate: 0.0004 },
    { from: "widget", to: "material", rate: 0.00003 }, // small feedback loop closing the cycle
  ],
};

function initialState(): StockState {
  return { graph: growthGraph, stocks: { material: 3, component: 0, widget: 0 } };
}

test("offline equivalence: one big advance() jump === the same span split into two advance() calls, within tolerance", () => {
  const t0 = 0;
  const t1 = 137 * TICK_INTERVAL_MS;
  const t2 = 900 * TICK_INTERVAL_MS;
  const direct = advance(initialState(), t0, t2);
  const split = advance(advance(initialState(), t0, t1), t1, t2);
  assertStatesClose(direct, split, "137/900 split");
});

test("offline equivalence: a three-way chained split (repeated checkpoints) agrees with one direct jump", () => {
  const t0 = 0;
  const t1 = 50 * TICK_INTERVAL_MS;
  const t2 = 400 * TICK_INTERVAL_MS;
  const t3 = 401 * TICK_INTERVAL_MS;
  const direct = advance(initialState(), t0, t3);
  const chained = advance(advance(advance(initialState(), t0, t1), t1, t2), t2, t3);
  assertStatesClose(direct, chained, "three-way chained split");
});

test("N hours offline === N hours simulated tick-by-tick: one advance() over an entire gap equals looping advance() one tick at a time for the same gap", () => {
  const oneHourTicks = 60 * 60; // 3600 one-second ticks
  const t0 = 0;
  const tN = oneHourTicks * TICK_INTERVAL_MS;

  const offlineJump = advance(initialState(), t0, tN);

  let simulated = initialState();
  for (let tick = 1; tick <= oneHourTicks; tick++) {
    simulated = advance(simulated, (tick - 1) * TICK_INTERVAL_MS, tick * TICK_INTERVAL_MS);
  }

  assertStatesClose(offlineJump, simulated, "1 hour: single jump vs. 3600 one-tick-at-a-time steps");
});

test("N hours offline === N hours simulated, for a longer N (3 hours), still within tolerance", () => {
  const threeHoursTicks = 3 * 60 * 60;
  const t0 = 0;
  const tN = threeHoursTicks * TICK_INTERVAL_MS;

  const offlineJump = advance(initialState(), t0, tN);

  // Simulate in 1-minute strides rather than 1-second strides (10,800 individual advance() calls
  // at 1-second granularity would be slow for a unit test; 1-minute strides still exercise
  // "several smaller advance() calls covering the identical total span" without the runtime cost,
  // and per the associativity property already proven above, the split granularity itself must
  // not matter to the result).
  let simulated = initialState();
  const strideTicks = 60;
  for (let tick = strideTicks; tick <= threeHoursTicks; tick += strideTicks) {
    simulated = advance(simulated, (tick - strideTicks) * TICK_INTERVAL_MS, tick * TICK_INTERVAL_MS);
  }

  assertStatesClose(offlineJump, simulated, "3 hours: single jump vs. 1-minute-strided steps");
});

test("advance over a genuinely long offline gap (two weeks) stays fast (O(log n), no per-tick loop) and still agrees with a split computation", () => {
  const t0 = 0;
  const twoWeeksTicks = 14 * 24 * 60 * 60;
  const t2 = twoWeeksTicks * TICK_INTERVAL_MS;
  const t1 = Math.floor(t2 / 3);
  const started = Date.now();
  const direct = advance(initialState(), t0, t2);
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 2000, `advance over two weeks of ticks took ${elapsedMs}ms — expected well under a second via O(log n) matrix exponentiation`);
  const split = advance(advance(initialState(), t0, t1), t1, t2);
  assertStatesClose(direct, split, "two-week gap, split at 1/3");
});
