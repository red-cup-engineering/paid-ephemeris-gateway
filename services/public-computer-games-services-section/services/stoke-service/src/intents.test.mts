import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILD_COST, CONNECT_COST, MAX_EDGE_RATE, UPGRADE_COST, UPGRADE_RATE_STEP, applyStokeIntent,
} from "./intents.mts";
import { starterState, type StokeState } from "./state.mts";
import { TICK_INTERVAL_MS } from "./tick.mts";

function withWoodStock(amount: number): StokeState {
  const s = starterState(0, "test-seed");
  return { ...s, stocks: { ...s.stocks, wood: amount } };
}

test("build: adds a node and spends BUILD_COST from payFrom", () => {
  const state = withWoodStock(50);
  const { state: next, events } = applyStokeIntent(state, { kind: "build", id: "quarry", label: "Quarry", payFrom: "wood" });
  assert.equal(next.graph.nodes.some((n) => n.id === "quarry"), true);
  assert.equal(next.stocks["wood"], 50 - BUILD_COST);
  assert.equal(next.stocks["quarry"], 0);
  assert.equal(events[0]?.kind, "node-built");
});

test("build: refuses (does not throw) on insufficient stock, and leaves state untouched", () => {
  const state = withWoodStock(BUILD_COST - 1);
  const { state: next, events } = applyStokeIntent(state, { kind: "build", id: "quarry", label: "Quarry", payFrom: "wood" });
  assert.deepEqual(next, state);
  assert.equal(events[0]?.kind, "action-refused");
  assert.equal(events[0]?.reason, "insufficient-stock");
});

test("build: refuses a duplicate node id", () => {
  const state = withWoodStock(1000);
  const { state: next } = applyStokeIntent(state, { kind: "build", id: "wood", label: "Wood again", payFrom: "wood" });
  assert.deepEqual(next, state);
});

test("connect: adds an edge at UPGRADE_RATE_STEP and spends CONNECT_COST", () => {
  const state = withWoodStock(50);
  const { state: next, events } = applyStokeIntent(state, { kind: "connect", from: "wood", to: "gold", payFrom: "wood" });
  const edge = next.graph.edges.find((e) => e.from === "wood" && e.to === "gold");
  assert.ok(edge);
  assert.equal(edge!.rate, UPGRADE_RATE_STEP);
  assert.equal(next.stocks["wood"], 50 - CONNECT_COST);
  assert.equal(events[0]?.kind, "edge-connected");
});

test("connect: refuses an edge that already exists", () => {
  const state = withWoodStock(50);
  const once = applyStokeIntent(state, { kind: "connect", from: "wood", to: "plank", payFrom: "wood" }).state;
  const twice = applyStokeIntent(once, { kind: "connect", from: "wood", to: "plank", payFrom: "wood" });
  assert.equal(twice.events[0]?.kind, "action-refused");
  assert.equal(twice.events[0]?.reason, "edge-already-exists");
});

test("upgrade: raises an existing edge's rate by UPGRADE_RATE_STEP and spends UPGRADE_COST", () => {
  const state = withWoodStock(50);
  const before = state.graph.edges.find((e) => e.from === "wood" && e.to === "plank")!.rate;
  const { state: next } = applyStokeIntent(state, { kind: "upgrade", from: "wood", to: "plank", payFrom: "wood" });
  const after = next.graph.edges.find((e) => e.from === "wood" && e.to === "plank")!.rate;
  assert.ok(Math.abs(after - (before + UPGRADE_RATE_STEP)) < 1e-12);
  assert.equal(next.stocks["wood"], 50 - UPGRADE_COST);
});

test("upgrade: refuses on a nonexistent edge", () => {
  const state = withWoodStock(50);
  const { state: next, events } = applyStokeIntent(state, { kind: "upgrade", from: "gold", to: "wood", payFrom: "wood" });
  assert.deepEqual(next, state);
  assert.equal(events[0]?.reason, "edge-does-not-exist");
});

test("upgrade: never pushes a rate above MAX_EDGE_RATE, and refuses once capped rather than clamping silently forever", () => {
  let state = withWoodStock(1_000_000);
  // Repeatedly upgrade the same edge until it hits the cap.
  for (let i = 0; i < 20; i++) {
    state = applyStokeIntent(state, { kind: "upgrade", from: "wood", to: "plank", payFrom: "wood" }).state;
  }
  const edge = state.graph.edges.find((e) => e.from === "wood" && e.to === "plank")!;
  assert.ok(edge.rate <= MAX_EDGE_RATE + 1e-12);
  const { events } = applyStokeIntent(state, { kind: "upgrade", from: "wood", to: "plank", payFrom: "wood" });
  assert.equal(events[0]?.kind, "action-refused");
  assert.equal(events[0]?.reason, "edge-at-max-rate");
});

test("prestige: refuses (does not throw) on the acyclic starter graph", () => {
  const state = starterState(0, "test-seed");
  const { state: next, events } = applyStokeIntent(state, { kind: "prestige" });
  assert.deepEqual(next, state);
  assert.equal(events[0]?.kind, "action-refused");
  assert.equal(events[0]?.action, "prestige");
});

test("prestige: on a real loop, banks (lambda, mixture) and resets to the starter graph", () => {
  let state = withWoodStock(1000);
  state = applyStokeIntent(state, { kind: "connect", from: "gold", to: "wood", payFrom: "wood" }).state; // closes the chain into a loop
  const { state: next, events } = applyStokeIntent(state, { kind: "prestige" });
  assert.equal(next.prestigeHistory.length, 1);
  assert.equal(events[0]?.kind, "prestiged");
  assert.ok((events[0] as { lambda: number }).lambda > 0);
  assert.equal(next.graph.nodes.length, starterState(0).graph.nodes.length, "reset returns to the starter graph's node count");
});

test("prestige's resetAtTs is state.lastSeenTs, never a fresh wall-clock read", () => {
  let state = withWoodStock(1000);
  state = { ...state, lastSeenTs: 42_000 };
  state = applyStokeIntent(state, { kind: "connect", from: "gold", to: "wood", payFrom: "wood" }).state;
  const { state: next } = applyStokeIntent(state, { kind: "prestige" });
  assert.equal(next.prestigeHistory[0]!.resetAtTs, 42_000);
});

test("tick: advances stocks and lastSeenTs by delegating to tick.mts::advance, no wall-clock read", () => {
  const state = starterState(0, "test-seed");
  const toTs = 5 * TICK_INTERVAL_MS;
  const { state: next, events } = applyStokeIntent(state, { kind: "tick", toTs });
  assert.equal(next.lastSeenTs, toTs);
  assert.equal(next.stocks["wood"], 5); // baseGeneration 1/tick, 5 ticks
  assert.equal(events[0]?.kind, "ticked");
  assert.equal(events[0]?.ticks, 5);
});

test("tick: refuses rather than throwing when toTs is before lastSeenTs", () => {
  const state = { ...starterState(0, "test-seed"), lastSeenTs: 10_000 };
  const { state: next, events } = applyStokeIntent(state, { kind: "tick", toTs: 0 });
  assert.deepEqual(next, state);
  assert.equal(events[0]?.reason, "toTs-before-lastSeenTs");
});

// `balance < cost` is `false` for a NaN balance regardless of cost (IEEE-754 — every comparison
// against NaN is false), so a naive affordability check would treat a corrupted stock as
// always-affordable. `tick.mts`'s clamp is the first line of defense against a stock ever
// becoming NaN, but this is a second, independent layer: `spend()` itself must refuse a
// non-finite balance even if a NaN/Infinity ever reached it some other way.
test("build: refuses (does not throw) when payFrom's stock is NaN, rather than treating a corrupted balance as always-affordable", () => {
  const s = starterState(0, "test-seed");
  const state: StokeState = { ...s, stocks: { ...s.stocks, wood: NaN } };
  const { state: next, events } = applyStokeIntent(state, { kind: "build", id: "quarry", label: "Quarry", payFrom: "wood" });
  assert.deepEqual(next, state, "a NaN balance must never be silently spent from");
  assert.equal(events[0]?.kind, "action-refused");
  assert.equal(events[0]?.reason, "insufficient-stock");
});

test("build: refuses (does not throw) when payFrom's stock is Infinity, rather than treating it as an infinite-money balance", () => {
  const s = starterState(0, "test-seed");
  const state: StokeState = { ...s, stocks: { ...s.stocks, wood: Infinity } };
  const { state: next, events } = applyStokeIntent(state, { kind: "build", id: "quarry", label: "Quarry", payFrom: "wood" });
  assert.deepEqual(next, state, "an Infinity balance must never be silently spent from");
  assert.equal(events[0]?.kind, "action-refused");
  assert.equal(events[0]?.reason, "insufficient-stock");
});

test("unknown intent kind throws (a real bug, not an in-fiction refusal)", () => {
  const state = starterState(0, "test-seed");
  assert.throws(() => applyStokeIntent(state, { kind: "not-a-real-intent" } as never), TypeError);
});
