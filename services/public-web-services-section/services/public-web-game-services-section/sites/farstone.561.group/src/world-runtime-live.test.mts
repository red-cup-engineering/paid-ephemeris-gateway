// world-runtime-live — end-to-end proof against the REAL feltos engine, the REAL (raw,
// unwrapped) MudServer, and a real (fake-http) GCS bucket, driven exactly the way `serve.mts`
// drives world-hosting's `WorldRuntime`: `preRequestCatchUp()` before a route runs,
// `postRequestFlush()` after a route that itself mutated state. Reproduces the live churn bug
// the 2026-08-19 deploy runbook found (a mutating command, an idle gap with no timer running,
// then a fresh "instance" reload) — asserts the fixed model never loses the mutation or runs
// tick/assertion counters backward.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { openWorldStore } from "@red-cup-engineering/world-hosting/world-store";
import { openClockStore } from "@red-cup-engineering/world-hosting/clock-store";
import { createWorldRuntime } from "@red-cup-engineering/world-hosting/world-runtime";
import { startFakeGcs } from "@red-cup-engineering/world-hosting/fake-gcs";

const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

function openStores(fakeUrl: string, bucket: string) {
  const backend = { kind: "bucket" as const, bucket, object: "world.json" };
  const gcsClientOptions = { apiBase: fakeUrl, request: unauthenticatedRequest };
  return { store: openWorldStore(backend, { gcsClientOptions }), clockStore: openClockStore(backend, { gcsClientOptions }) };
}

test("live churn proof: a mutating command survives an idle gap with no timer running, and tick counters never go backward on reload", async (t) => {
  const fake = await startFakeGcs("live-churn-bucket");
  t.after(() => fake.close());

  let simTime = 1_000_000;
  const clock = { now: () => simTime, advance: (ms: number) => { simTime += ms; } };

  // --- "Instance 1": boots fresh (nothing in the bucket yet). A player connects (POST /connect
  // -> mud.connect() then postRequestFlush(0), exactly like serve.mts's wrapper), enqueues a
  // command (POST /command -> mud.enqueue(), no flush — matches http.mjs/mud-server.mjs
  // exactly), then an explicit tick lands it (POST /tick -> preRequestCatchUp() then
  // mud.tick() then postRequestFlush(tickIntervalMs)).
  const engine1 = createEngine(FARSTONE_GAME);
  const mud1 = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine: engine1, maxAssertions: 20_000 });
  const { store: store1, clockStore: clockStore1 } = openStores(fake.url, fake.bucket);
  const rt1 = createWorldRuntime(mud1, { tickIntervalMs: 1000, maxCatchUpTicksPerRequest: 30, now: clock.now, lastTickAt: clock.now(), store: store1, clockStore: clockStore1 });

  await rt1.preRequestCatchUp(); // POST /connect's pre-hook
  const actor = mud1.connect("live-proof-actor");
  await rt1.postRequestFlush();

  mud1.enqueue(actor, "look"); // POST /command — no catch-up, no flush, exactly as before this change

  await rt1.preRequestCatchUp(); // POST /tick's pre-hook (0 owed, no-op)
  mud1.tick(); // commits the enqueued "look"
  await rt1.postRequestFlush(1000); // flush + advance the clock by one real tick-interval

  const tickAfterSession1 = mud1.engine().tick as number;
  assert.ok(tickAfterSession1 >= 1);
  assert.equal(mud1.engine().actors.length, 1);

  // --- The idle gap: real time passes (simulating a scale-to-zero window) with NO process
  // running any interval timer at all — nothing calls tick()/save() during this gap, exactly
  // the condition that broke the old interval-based model.
  clock.advance(47_000); // 47 real seconds idle, comfortably past the old default 30s autosave interval

  // --- "Instance 2": a fresh process, fresh MudServer, restored from whatever the bucket
  // actually holds — never touches mud1/rt1's in-memory state.
  const { store: store2, clockStore: clockStore2 } = openStores(fake.url, fake.bucket);
  const restoredEngine = await store2!.load(() => { throw new Error("must restore from the real save, not fall back"); });
  const restoredClock = await clockStore2!.load();
  assert.notEqual(restoredClock, null, "the clock must have been persisted by instance 1's flush");

  const mud2 = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine: restoredEngine as never, maxAssertions: 20_000 });
  const rt2 = createWorldRuntime(mud2, { tickIntervalMs: 1000, maxCatchUpTicksPerRequest: 30, now: clock.now, lastTickAt: restoredClock!.lastTickAt, store: store2, clockStore: clockStore2 });

  // A single request arrives on the fresh instance (e.g. GET /health -> preRequestCatchUp runs
  // for every route in serve.mts's real wrapper, per its own header) — this alone must catch
  // the world up, not require an explicit /tick.
  const catchUpInfo = await rt2.preRequestCatchUp();

  assert.ok(
    mud2.engine().tick >= tickAfterSession1,
    `tick counter must never go backward on reload: was ${tickAfterSession1}, reloaded as ${mud2.engine().tick}`,
  );
  assert.equal(mud2.engine().actors.length, 1, "the connected actor from instance 1 must still be present — nothing was silently lost");
  // Session 1's explicit /tick already advanced lastTickAt by one tick-interval (representing
  // that one real tick having happened "now"), so of the 47 real seconds that then elapsed
  // idle, 46 whole ticks are owed at reload — capped at 30/request, 16 remain owed for the
  // next one.
  assert.equal(catchUpInfo.ticksRun, 30);
  assert.equal(catchUpInfo.ticksRemaining, 16);
  assert.equal(mud2.engine().tick, tickAfterSession1 + 30);
});

test("measured write size/latency, real engine + real fake-gcs bucket (numbers for the report, not just pass/fail)", async (t) => {
  const fake = await startFakeGcs("live-measure-bucket");
  t.after(() => fake.close());

  let simTime = 0;
  const clock = { now: () => simTime, advance: (ms: number) => { simTime += ms; } };
  const engine = createEngine(FARSTONE_GAME);
  const mud = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine, maxAssertions: 20_000 });
  const { store, clockStore } = openStores(fake.url, fake.bucket);

  const flushes: Array<{ reason: string; ticksRun: number; durationMs: number; engineBytes: number }> = [];
  const rt = createWorldRuntime(mud, {
    tickIntervalMs: 1000,
    maxCatchUpTicksPerRequest: 30,
    now: clock.now,
    lastTickAt: clock.now(),
    store,
    clockStore,
    onFlush: (info) => flushes.push(info),
  });

  await rt.preRequestCatchUp();
  mud.connect("measure-actor");
  await rt.postRequestFlush();

  for (let i = 0; i < 10; i++) {
    mud.enqueue(mud.engine().actors[0] as string, "look");
    clock.advance(1000);
    await rt.preRequestCatchUp();
    mud.tick();
    await rt.postRequestFlush(1000);
  }

  assert.ok(flushes.length >= 11, "one flush for connect + one per tick");
  const tickFlushes = flushes.filter((f) => f.reason === "mutation" && f.ticksRun === 1);
  const avgDurationMs = tickFlushes.reduce((sum, f) => sum + f.durationMs, 0) / tickFlushes.length;
  const lastEngineBytes = tickFlushes[tickFlushes.length - 1]?.engineBytes ?? 0;
  process.stdout.write(
    `[measured] farstone flush-on-mutation over real fake-gcs: ${tickFlushes.length} tick-flushes, ` +
    `avg ${avgDurationMs.toFixed(2)}ms/flush, last engine snapshot ~${lastEngineBytes} bytes (JSON.stringify estimate)\n`,
  );
  assert.ok(avgDurationMs < 2000, "each flush against the fake bucket completes well under a second, not literal seconds");
  assert.ok(lastEngineBytes > 0);
});
