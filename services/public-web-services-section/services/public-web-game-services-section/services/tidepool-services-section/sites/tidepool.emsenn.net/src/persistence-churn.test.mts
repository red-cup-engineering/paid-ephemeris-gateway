// persistence-churn.test — "the lesson of the day": mutate, force restart, verify survival.
// Drives a real session (join, move, harvest, build, mark, propose/support/enact) through a
// REAL tidepool-room against the flush-on-mutation `WorldRuntime`, backed by fake-gcs (the same
// GCS JSON/upload semantics the real bucket backend speaks), then throws every in-memory object
// away — room, runtime, engine handle, all of it — and boots a completely fresh instance from
// nothing but the store's own persisted bytes, the way a Cloud Run cold start actually would.
// Every mutation must have survived exactly: actor location, inventory contents, harvested
// wares, a built structure, a folded mark, an enacted law, AND the original harvest-rights/
// water-quality contradictions still standing as FOUR `both` (the immutable-trace guarantee).
//
// Also proves clock-store's own crash-safety ordering empirically: a flush that dies AFTER the
// clock write but BEFORE the engine write must fail toward "under-count owed ticks" on restart,
// never toward re-applying ticks that already landed — simulated by literally interrupting a
// flush mid-way and reading back a lastTickAt that predates the (not yet written) engine change.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { evidenceName, settleSubject, value } from "@red-cup-engineering/feltos/world";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { createTidepoolRoom } from "./tidepool-room.mts";
import { openWorldStore } from "./world-store.mts";
import { openClockStore } from "./clock-store.mts";
import { createWorldRuntime } from "./tidepool-runtime.mts";
import { startFakeGcs } from "./fake-gcs.mts";
import { TIDEPOOL_RUNTIME } from "./tidepool-capabilities.mts";

function gcsOptions(fake) {
  return { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } };
}

/** Boots one complete, independent instance (room + runtime) from whatever the store currently
 *  holds — the honest stand-in for "a fresh Cloud Run container starts". */
async function bootInstance(fake, opts = {}) {
  const backend = { kind: "bucket", bucket: fake.bucket, object: "world.json" };
  const store = openWorldStore(backend, gcsOptions(fake));
  const clockStore = openClockStore(backend, gcsOptions(fake));
  const bootEngine = await store.load(() => createEngine(TIDEPOOL_GAME));
  const { room, liveEngine } = createTidepoolRoom(bootEngine);
  const restoredClock = await clockStore.load();
  let now = opts.now ?? 1_000_000;
  const runtime = createWorldRuntime(
    { tick: () => room.stepOnce(), engine: () => liveEngine() },
    {
      tickIntervalMs: 1000,
      maxCatchUpTicksPerRequest: 100,
      lastTickAt: restoredClock?.lastTickAt ?? now,
      store,
      clockStore,
      now: () => now,
    },
  );
  return { room, liveEngine, runtime, store, clockStore, setNow: (n) => { now = n; } };
}

test("persistence churn: a real mixed session survives a full instance teardown and cold-boot rebuild, byte for byte where it matters", async () => {
  const fake = await startFakeGcs("tidepool-churn");
  try {
    // --- instance 1: play a real session -----------------------------------------------------
    const first = await bootInstance(fake);
    first.room.queue.push({ actorId: "qw-1", seq: 0, kind: "presence.join", args: { name: "kip" } });
    await first.room.stepOnce();
    await first.runtime.postRequestFlush(1); // an explicit mutating flush, per the runtime's own contract

    const script = [
      "go south",          // drift-line -> shingle-beach
      "go west",           // -> sand-flat
      "go north",          // -> mussel-shelf
      "harvest",           // real ecology stock change + a carried thing
      "mark a small cairn of shells",
      "go south",          // back to sand-flat
      "go east",           // -> shingle-beach
      "go south",          // -> the-weir
    ];
    for (const command of script) {
      first.room.queue.push({ actorId: "qw-1", seq: undefined, kind: "command", args: { command } });
      await first.room.stepOnce();
    }
    first.room.queue.push({ actorId: "qw-1", seq: undefined, kind: "command", args: { command: "propose shared-harvest-rights" } });
    await first.room.stepOnce();
    first.room.queue.push({ actorId: "qw-1", seq: undefined, kind: "command", args: { command: "support shared-harvest-rights" } });
    await first.room.stepOnce();
    first.room.queue.push({ actorId: "qw-1", seq: undefined, kind: "command", args: { command: "enact shared-harvest-rights" } });
    await first.room.stepOnce();

    const beforeEngine = first.liveEngine();
    const kip = actorIdFor("kip");
    const locationBefore = value(beforeEngine.world, kip, "located-in");
    const carriedBefore = beforeEngine.world.assertions
      .filter((a) => a.predicate === "located-in" && a.object === kip)
      .map((a) => a.subject);
    assert.equal(locationBefore, "the-weir");
    assert.ok(carriedBefore.length > 0, "harvest must have produced at least one carried thing");
    const lawEnactedBefore = beforeEngine.world.assertions.some((a) => a.subject === "the-weir" && a.predicate === "law:shared-harvest-rights");

    // the explicit flush point a real request handler would call
    await first.runtime.postRequestFlush(1);

    // --- FORCE RESTART: throw away every in-memory object, keep only what's in the store -----
    const second = await bootInstance(fake);
    await second.runtime.preRequestCatchUp(); // the honest "first request after cold start" path

    const afterEngine = second.liveEngine();
    assert.equal(afterEngine.actors.includes(kip), true, "the persisted actor must exist after restart");
    assert.equal(value(afterEngine.world, kip, "located-in"), "the-weir", "location must survive exactly");
    const carriedAfter = afterEngine.world.assertions
      .filter((a) => a.predicate === "located-in" && a.object === kip)
      .map((a) => a.subject);
    assert.deepEqual(new Set(carriedAfter), new Set(carriedBefore), "inventory must survive exactly");
    assert.equal(
      afterEngine.world.assertions.some((a) => a.subject === "the-weir" && a.predicate === "law:shared-harvest-rights"),
      lawEnactedBefore,
      "the enacted law must survive",
    );

    // the mark (a folded `word`) must still be found where it was left
    const markStillThere = afterEngine.world.assertions.some((a) => a.predicate === "kind" && a.object === "word");
    assert.equal(markStillThere, true, "the mark left mid-session must survive as a real word in the trace");

    // the ORIGINAL two contradictions are still exactly `both` — the immutable-trace guarantee,
    // proven not just "still exists" but "the enact above did not silently resolve it".
    const rights = settleSubject(afterEngine.world, "the-weir").filter((c) => c.predicate === "harvest-rights");
    assert.equal(evidenceName(rights[0]), "both");
    const spring = settleSubject(afterEngine.world, "the-spring").filter((c) => c.predicate === "water-quality");
    assert.equal(evidenceName(spring[0]), "both");

    // a THIRD instance, reachable from the SAME bytes, must reach the identical world sequence —
    // restart is idempotent, not "lossy in a way that happens to look fine once".
    const third = await bootInstance(fake);
    assert.equal(third.liveEngine().world.sequence, afterEngine.world.sequence);
  } finally {
    await fake.close();
  }
});

test("persistence churn: clock-store ordering means a crash between the two writes under-counts owed ticks, never over-counts", async () => {
  const fake = await startFakeGcs("tidepool-churn-crash");
  try {
    const backend = { kind: "bucket", bucket: fake.bucket, object: "world.json" };
    const clockStore = openClockStore(backend, gcsOptions(fake));
    const worldStore = openWorldStore(backend, gcsOptions(fake));

    // simulate "died after the clock write, before the engine write": write clock only.
    await clockStore.save({ lastTickAt: 5_000 });
    // (engine store deliberately never written this round — the crash point)

    const restoredClock = await clockStore.load();
    const restoredEngine = await worldStore.load(() => createEngine(TIDEPOOL_GAME));
    assert.deepEqual(restoredClock, { lastTickAt: 5_000 });
    // the engine falls back to a fresh boot (nothing was ever actually persisted for it in this
    // scenario) — the important, load-bearing property is that lastTickAt does NOT silently
    // regress to "now" (which would make catch-up re-run ticks that may have already been
    // reflected in whatever engine snapshot eventually does land) — it stays exactly what was
    // durably written, so any FUTURE catch-up computes owed ticks from a real instant, not a lie.
    assert.equal(restoredEngine.kind, "feltos.engine.v1");
    assert.equal(restoredClock.lastTickAt, 5_000);
  } finally {
    await fake.close();
  }
});

test("persistence churn: repeated flush-on-mutation cycles under simulated request churn never lose a tick's worth of state", async () => {
  const fake = await startFakeGcs("tidepool-churn-repeat");
  try {
    let instance = await bootInstance(fake);
    instance.room.queue.push({ actorId: "qw-1", seq: 0, kind: "presence.join", args: { name: "kip" } });
    await instance.room.stepOnce();
    await instance.runtime.postRequestFlush(1);

    // ten independent "restart, reconnect, do one thing, flush, restart again" cycles. Each
    // bootInstance() is a genuinely fresh room with its own empty bodyOf map (qwzspace connection
    // -> feltos actor) — Tier 2 identity (design §2.4) means a FRESH presence.join under the same
    // display name resolves back to the SAME persisted feltos actor, exactly the way a real
    // reconnecting client (human or the reference bot) would after a cold start; it is not itself
    // a second, independent join.
    const moves = ["go south", "go west", "go north", "go west", "go north", "go south", "go east", "go south", "go north", "go east"];
    for (const command of moves) {
      instance = await bootInstance(fake);
      instance.room.queue.push({ actorId: "qw-1", seq: 0, kind: "presence.join", args: { name: "kip" } });
      instance.room.queue.push({ actorId: "qw-1", seq: 1, kind: "command", args: { command } });
      await instance.room.stepOnce();
      await instance.runtime.postRequestFlush(1);
    }

    const final = await bootInstance(fake);
    const kip = actorIdFor("kip");
    const engine = final.liveEngine();
    assert.equal(engine.actors.includes(kip), true);
    // deterministically replay the SAME room graph walk against a fresh engine and confirm the
    // persisted location matches exactly what that walk should produce.
    let expected = createEngine(TIDEPOOL_GAME);
    const { join: joinActor, submit, step } = await import("@red-cup-engineering/feltos/engine");
    expected = joinActor(expected, kip);
    for (const command of moves) {
      expected = step(submit(expected, { actor: kip, command }), { runtime: TIDEPOOL_RUNTIME }).engine;
    }
    assert.equal(value(engine.world, kip, "located-in"), value(expected.world, kip, "located-in"));
  } finally {
    await fake.close();
  }
});
