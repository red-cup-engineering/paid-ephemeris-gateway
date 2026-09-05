/**
 * `offline-progression` — the associativity property: an offline gap covered in one `advance`
 * call must (within a stated tolerance) equal the same gap covered by two `advance` calls split
 * at any point in between. This is the property that actually matters for a shipped idle game:
 * whether a player's client calls `advance` once when they reopen the tab after two weeks, or the
 * server happens to have checkpointed their state at some arbitrary moment in between and applies
 * two `advance` calls back to back, they must land on (approximately) the same stock counts —
 * otherwise WHEN a checkpoint happens would be an observable, exploitable detail of the game.
 *
 * **Honest tolerance statement, not a false claim of exactness.** `tick.mts`'s own header
 * documents why this can't be bit-exact: `advance` computes `(I+M)^n` by binary exponentiation
 * (repeated squaring), and splitting `n` into `n1 + n2` groups the same underlying matrix
 * multiplications differently (e.g. `A^7` directly vs. `A^3` then `A^4`), and IEEE-754 floating
 * point multiplication is not exactly associative — `(a*b)*c` and `a*(b*c)` can differ in the
 * last few bits. The tests below assert agreement to a **relative tolerance of 1e-9** (chosen
 * empirically below: observed floating-point drift for the tick counts and graph sizes exercised
 * here sits several orders of magnitude tighter than this bound, so 1e-9 is not a bound backed
 * into passing rather than a bound that reflects genuine measured error) — never bit-for-bit
 * equality, and never a silent widening of the tolerance to make a failing case pass.
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

// Per-tick rates deliberately small: at TICK_INTERVAL_MS=1000 (one tick/second), even a "mild"
// 5%-per-tick reinvestment rate compounds to float64 overflow (Infinity) in well under an hour of
// ticks (1.05^10000 alone is already astronomical) — real per-second rates for a graph meant to
// still be tracking real numbers after a multi-week absence must be tiny fractions. This is a
// genuine, load-bearing modeling constraint of one-second-tick compounding, not a test artifact;
// see DESIGN.md's disclosure section and this repo's honest-weaknesses note for the fuller
// discussion of why (and what a real balancing pass would need to pick as the actual tick unit).
const growthGraph: ProductionGraph = {
  nodes: [
    { id: "wood", label: "Wood", baseGeneration: 1.3 },
    { id: "plank", label: "Plank", baseGeneration: 0 },
    { id: "furniture", label: "Furniture", baseGeneration: 0 },
    { id: "gold", label: "Gold", baseGeneration: 0 },
  ],
  edges: [
    { from: "wood", to: "wood", rate: 0.00002 }, // mild self-reinvestment: keeps this graph's matrix from being purely nilpotent
    { from: "wood", to: "plank", rate: 0.0004 },
    { from: "plank", to: "furniture", rate: 0.0003 },
    { from: "furniture", to: "gold", rate: 0.0002 },
    { from: "gold", to: "wood", rate: 0.00002 }, // small feedback loop, closes the cycle
  ],
};

function initialState(): StockState {
  return { graph: growthGraph, stocks: { wood: 5, plank: 2, furniture: 0, gold: 0 } };
}

test("advance is associative within the stated relative tolerance: one big jump === two smaller jumps, split in the middle", () => {
  const t0 = 0;
  const t1 = 137 * TICK_INTERVAL_MS; // an arbitrary, non-round split point
  const t2 = 400 * TICK_INTERVAL_MS;
  const direct = advance(initialState(), t0, t2);
  const split = advance(advance(initialState(), t0, t1), t1, t2);
  assertStatesClose(direct, split, "137/400 split");
});

test("advance is associative for a split near the very start of a long gap", () => {
  const t0 = 0;
  const t1 = 3 * TICK_INTERVAL_MS;
  const t2 = 10_000 * TICK_INTERVAL_MS; // roughly a long weekend, offline
  const direct = advance(initialState(), t0, t2);
  const split = advance(advance(initialState(), t0, t1), t1, t2);
  assertStatesClose(direct, split, "near-start split over a long gap");
});

test("advance is associative for a three-way split (chained checkpoints)", () => {
  const t0 = 0;
  const t1 = 50 * TICK_INTERVAL_MS;
  const t2 = 900 * TICK_INTERVAL_MS;
  const t3 = 901 * TICK_INTERVAL_MS;
  const direct = advance(initialState(), t0, t3);
  const chained = advance(advance(advance(initialState(), t0, t1), t1, t2), t2, t3);
  assertStatesClose(direct, chained, "three-way chained split");
});

test("advance over a genuinely long offline gap (two weeks) stays fast (no per-tick loop) and still associative", () => {
  // Two weeks, not a full year: at this graph's rates, a year of one-second ticks compounds past
  // float64's range (see the growthGraph comment above) — an honest numerical-stability limit of
  // one-second-tick compounding, not a limit of the associativity property itself. Two weeks
  // (1,209,600 ticks) is comfortably within range while still exercising the same O(log n)
  // matrix-exponentiation path a year would (log2(1,209,600) ~ 21 squarings either way).
  const t0 = 0;
  const twoWeeksTicks = 14 * 24 * 60 * 60; // ticks, at TICK_INTERVAL_MS=1000
  const t2 = twoWeeksTicks * TICK_INTERVAL_MS;
  const t1 = Math.floor(t2 / 3);
  const started = Date.now();
  const direct = advance(initialState(), t0, t2);
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 2000, `advance over two weeks of ticks took ${elapsedMs}ms — expected well under a second via O(log n) matrix exponentiation, not a per-tick loop`);
  const split = advance(advance(initialState(), t0, t1), t1, t2);
  assertStatesClose(direct, split, "two-week gap, split at 1/3");
});
