// tidepool-runtime.test — catch-up-on-request math and flush ordering (design §3/§4): ticks owed
// is computed from wall-clock elapsed time, capped per request with the remainder honestly owed
// forward; a flush writes the clock store BEFORE the engine store (module header's own safety
// argument: a mid-flush crash must fail toward under-counting owed ticks, never double-applying
// them) — asserted here by an injected write-order log, not just read from the comment.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorldRuntime } from "./tidepool-runtime.mts";

function fakeMud(engineValue = { n: 0 }) {
  let ticks = 0;
  return {
    ticks: () => ticks,
    tick: async () => { ticks += 1; },
    engine: () => engineValue,
  };
}

test("ticksOwed: zero when no time has elapsed", () => {
  let now = 1000;
  const runtime = createWorldRuntime(fakeMud(), {
    tickIntervalMs: 1000, maxCatchUpTicksPerRequest: 10, lastTickAt: 1000, store: null, clockStore: null, now: () => now,
  });
  assert.equal(runtime.ticksOwed(), 0);
});

test("ticksOwed: floor((now - lastTickAt) / tickIntervalMs)", () => {
  let now = 1000;
  const runtime = createWorldRuntime(fakeMud(), {
    tickIntervalMs: 1000, maxCatchUpTicksPerRequest: 100, lastTickAt: 1000, store: null, clockStore: null, now: () => now,
  });
  now = 4500; // 3.5 intervals elapsed since lastTickAt=1000
  assert.equal(runtime.ticksOwed(), 3);
});

test("preRequestCatchUp: caps ticks run at maxCatchUpTicksPerRequest, leaves the remainder honestly owed", async () => {
  let now = 0;
  const mud = fakeMud();
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 100, maxCatchUpTicksPerRequest: 3, lastTickAt: 0, store: null, clockStore: null, now: () => now,
  });
  now = 1000; // 10 ticks owed
  const info = await runtime.preRequestCatchUp();
  assert.equal(info.ticksOwed, 10);
  assert.equal(info.ticksRun, 3);
  assert.equal(info.ticksRemaining, 7);
  assert.equal(mud.ticks(), 3);

  // the remainder must genuinely still be owed on the NEXT call, at the same `now`
  const info2 = await runtime.preRequestCatchUp();
  assert.equal(info2.ticksRun, 3);
  assert.equal(mud.ticks(), 6);
});

test("preRequestCatchUp: a no-op when nothing is owed never calls tick() or flushes", async () => {
  let now = 0;
  const mud = fakeMud();
  let flushed = 0;
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 1000, maxCatchUpTicksPerRequest: 10, lastTickAt: 0, store: { save: async () => { flushed++; } }, clockStore: null, now: () => now,
  });
  await runtime.preRequestCatchUp();
  assert.equal(mud.ticks(), 0);
  assert.equal(flushed, 0);
});

test("flush ordering: clock store is written BEFORE the engine store on every real flush", async () => {
  let now = 0;
  const order = [];
  const mud = fakeMud({ marker: "engine-state" });
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 100,
    maxCatchUpTicksPerRequest: 100,
    lastTickAt: 0,
    now: () => now,
    store: { save: async (engine) => { order.push(["engine", engine]); } },
    clockStore: { save: async (state) => { order.push(["clock", state]); } },
  });
  now = 250;
  await runtime.preRequestCatchUp();
  assert.equal(order.length, 2);
  assert.equal(order[0][0], "clock");
  assert.equal(order[1][0], "engine");
  assert.deepEqual(order[1][1], { marker: "engine-state" });
});

test("flushNow: persists exactly what's here right now, with no catch-up bookkeeping change", async () => {
  let now = 0;
  const flushes = [];
  const runtime = createWorldRuntime(fakeMud(), {
    tickIntervalMs: 100, maxCatchUpTicksPerRequest: 10, lastTickAt: 0, now: () => now,
    store: { save: async () => {} },
    clockStore: { save: async () => {} },
    onFlush: (info) => flushes.push(info.reason),
  });
  await runtime.flushNow();
  assert.deepEqual(flushes, ["shutdown"]);
});

test("onCatchUp/onFlush observers fire with the documented info shape", async () => {
  let now = 0;
  const catchUps = [];
  const flushes = [];
  const runtime = createWorldRuntime(fakeMud(), {
    tickIntervalMs: 100, maxCatchUpTicksPerRequest: 100, lastTickAt: 0, now: () => now,
    store: { save: async () => {} },
    clockStore: { save: async () => {} },
    onCatchUp: (info) => catchUps.push(info),
    onFlush: (info) => flushes.push(info),
  });
  now = 350;
  await runtime.preRequestCatchUp();
  assert.equal(catchUps.length, 1);
  assert.equal(catchUps[0].ticksRun, 3);
  assert.equal(flushes.length, 1);
  assert.equal(flushes[0].reason, "tick");
  assert.equal(flushes[0].ticksRun, 3);
  assert.equal(typeof flushes[0].durationMs, "number");
  assert.equal(typeof flushes[0].engineBytes, "number");
});

test("concurrency: overlapping flushes coalesce into one queued follow-up, never a stale snapshot clobbering a fresh one", async () => {
  // Regression coverage for the live incident named in the module header: two callers whose
  // flushes overlap must never each independently run store.save() with their own captured
  // snapshot — the second (slower-arriving-to-actually-run) one must win with FRESH state, and
  // the store must see at most 2 saves total (the running one + the one coalesced follow-up),
  // never one per caller.
  let now = 0;
  const saveStarts: number[] = [];
  const engineSnapshots: Array<{ n: number }> = [];
  let releaseFirstSave!: () => void;
  const firstSaveGate = new Promise<void>((res) => { releaseFirstSave = res; });
  let saveCount = 0;
  const engineState = { n: 0 };
  const mud = { tick: async () => { engineState.n += 1; }, engine: () => ({ ...engineState }) };
  const store = {
    save: async (engine: { n: number }) => {
      saveCount++;
      saveStarts.push(saveCount);
      engineSnapshots.push(engine);
      if (saveCount === 1) await firstSaveGate; // hold the first save open so a second call overlaps it
    },
  };
  const clockStore = { save: async () => {} };
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 100, maxCatchUpTicksPerRequest: 1, lastTickAt: 0, store, clockStore, now: () => now,
  });

  now = 100; // one tick owed
  const firstCatchUp = runtime.preRequestCatchUp(); // starts a flush that will block on firstSaveGate
  await new Promise((r) => setTimeout(r, 5)); // let the first flush actually start and block

  now = 200; // a second tick now owed, while the first flush is still in flight
  const secondCatchUp = runtime.preRequestCatchUp(); // must coalesce, not run its own overlapping flush
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(saveCount, 1, "a second caller arriving mid-flush must not start its own concurrent save");

  releaseFirstSave();
  const [firstInfo, secondInfo] = await Promise.all([firstCatchUp, secondCatchUp]);
  assert.equal(saveCount, 2, "exactly one coalesced follow-up flush, never one per waiter");
  assert.equal(firstInfo.ticksRun, 1);
  assert.equal(secondInfo.ticksRun, 1);
  // The follow-up save must have captured the LATER engine state (n:2), not a stale copy taken
  // back when the second caller merely arrived (n would have been 1 at that moment).
  assert.deepEqual(engineSnapshots[1], { n: 2 });
});

test("concurrency: many simultaneous preRequestCatchUp calls never run mud.tick() in an overlapping window", async () => {
  let now = 0;
  let ticking = false;
  let overlapDetected = false;
  const mud = {
    tick: async () => {
      if (ticking) overlapDetected = true;
      ticking = true;
      await new Promise((r) => setTimeout(r, 5));
      ticking = false;
    },
    engine: () => ({}),
  };
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 10, maxCatchUpTicksPerRequest: 5, lastTickAt: 0, store: { save: async () => {} }, clockStore: { save: async () => {} }, now: () => now,
  });
  now = 50;
  await Promise.all([
    runtime.preRequestCatchUp(),
    runtime.preRequestCatchUp(),
    runtime.preRequestCatchUp(),
  ]);
  assert.equal(overlapDetected, false, "concurrent requests must never independently run mud.tick() at the same time");
});

test("constructor rejects non-positive tickIntervalMs / maxCatchUpTicksPerRequest", () => {
  assert.throws(() => createWorldRuntime(fakeMud(), { tickIntervalMs: 0, maxCatchUpTicksPerRequest: 1, lastTickAt: 0, store: null, clockStore: null }));
  assert.throws(() => createWorldRuntime(fakeMud(), { tickIntervalMs: 100, maxCatchUpTicksPerRequest: 0, lastTickAt: 0, store: null, clockStore: null }));
});
