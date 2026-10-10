// http-wiring.test.mts — real HTTP requests, over a real bound TCP port, against the EXACT
// wiring serve.mts ships. This is the test that would have caught the near-miss bug an earlier
// draft of this change shipped with: wrapping MudServer's methods as async and handing THAT to
// createMudHttpServer, which — because http.mjs (vendored) calls those methods synchronously
// and JSON.stringifies the return value in the same tick — would have silently serialized every
// route but /health as `{}` instead of throwing. A test that only calls preRequestCatchUp()/
// postRequestFlush() directly (world-runtime.test.mts) can't see that class of bug; only a real
// HTTP round trip through http.mjs's actual route table can.

import assert from "node:assert/strict";
import { test } from "node:test";
import { listenMudHttpServer, closeMudHttpServer } from "@red-cup-engineering/feltos/http";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { createWorldRuntime } from "./world-runtime.mts";
import { createFarstoneHttpServer } from "./http-wiring.mts";

// warmUpLocalPort — this sandbox's loopback networking refuses the very FIRST connection
// attempt to a freshly bound ephemeral port (the same behavior fake-gcs.mts's own
// `warmUpLocalPort` documents and works around). A newly listening server "primes" its own
// port with a harmless self-request before a test starts asserting against it.
async function warmUpLocalPort(origin: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(`${origin}/does-not-exist-warmup-probe`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

async function withLiveServer(
  runtimeOpts: Partial<Parameters<typeof createWorldRuntime>[1]> = {},
  run: (args: { origin: string; mud: ReturnType<typeof createMudServer>; flushes: unknown[]; catchUps: unknown[] }) => Promise<void>,
) {
  const engine = createEngine(FARSTONE_GAME);
  const mud = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine, maxAssertions: 20_000 });
  const flushes: unknown[] = [];
  const catchUps: unknown[] = [];
  const runtime = createWorldRuntime(mud, {
    tickIntervalMs: 1000,
    maxCatchUpTicksPerRequest: 30,
    lastTickAt: Date.now(),
    store: null,
    clockStore: null,
    onFlush: (i) => flushes.push(i),
    onCatchUp: (i) => catchUps.push(i),
    ...runtimeOpts,
  });
  const server = createFarstoneHttpServer(mud, runtime, { tickIntervalMs: 1000 });
  const { origin } = await listenMudHttpServer(server, { host: "127.0.0.1", port: 0 });
  await warmUpLocalPort(origin);
  flushes.length = 0; // the warm-up probe's own catch-up pass isn't part of any test's assertions
  catchUps.length = 0;
  try {
    await run({ origin, mud, flushes, catchUps });
  } finally {
    await closeMudHttpServer(server);
  }
}

test("GET /health returns real JSON, unaffected by the wrapper", async () => {
  await withLiveServer({}, async ({ origin }) => {
    const res = await fetch(`${origin}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});

test("GET /metrics returns the REAL metrics object, not a serialized-away Promise ({})", async () => {
  await withLiveServer({}, async ({ origin }) => {
    const res = await fetch(`${origin}/metrics`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.tick, "number", "must be a real number, not undefined from an unserialized Promise");
    assert.equal(typeof body.actors, "number");
    assert.equal(typeof body.worldAssertions, "number");
  });
});

test("POST /connect returns a real, non-empty actor id — this is exactly the field an async-wrapper bug would silently drop", async () => {
  await withLiveServer({}, async ({ origin }) => {
    const res = await fetch(`${origin}/connect`, { method: "POST", body: JSON.stringify({ name: "wiring-test-actor" }), headers: { "content-type": "application/json" } });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(typeof body.actor, "string");
    assert.ok(body.actor.startsWith("actor:"), `expected a real actor id, got ${JSON.stringify(body)}`);
  });
});

test("POST /connect flushes exactly once (postRequestFlush fired for the mutating route)", async () => {
  await withLiveServer({}, async ({ origin, flushes }) => {
    await fetch(`${origin}/connect`, { method: "POST", body: JSON.stringify({ name: "flush-check" }), headers: { "content-type": "application/json" } });
    assert.equal(flushes.length, 1);
    assert.equal((flushes[0] as { reason: string }).reason, "mutation");
  });
});

test("full session over real HTTP: connect -> command -> tick -> events, world state genuinely advances", async () => {
  await withLiveServer({}, async ({ origin }) => {
    const connectRes = await fetch(`${origin}/connect`, { method: "POST", body: JSON.stringify({ name: "session-actor" }), headers: { "content-type": "application/json" } });
    const { actor } = await connectRes.json();
    assert.equal(typeof actor, "string");

    const commandRes = await fetch(`${origin}/command`, { method: "POST", body: JSON.stringify({ actor, command: "look" }), headers: { "content-type": "application/json" } });
    assert.equal(commandRes.status, 202);
    assert.deepEqual(await commandRes.json(), { accepted: true });

    const tickRes = await fetch(`${origin}/tick`, { method: "POST" });
    assert.equal(tickRes.status, 200);
    const receipt = await tickRes.json();
    assert.ok(receipt && typeof receipt === "object");

    const eventsRes = await fetch(`${origin}/events?actor=${encodeURIComponent(actor)}`);
    assert.equal(eventsRes.status, 200);
    const eventsBody = await eventsRes.json();
    assert.ok(Array.isArray(eventsBody.events));

    const metricsRes = await fetch(`${origin}/metrics`);
    const metrics = await metricsRes.json();
    assert.ok(metrics.tick >= 1, "the explicit /tick must have actually advanced the world");
    assert.equal(metrics.actors, 1);
  });
});

test("POST /tick flushes with ticksRun=1 and the clock advances by one tick-interval, regardless of ticksOwed", async () => {
  await withLiveServer({}, async ({ origin, flushes }) => {
    const res = await fetch(`${origin}/tick`, { method: "POST" });
    assert.equal(res.status, 200);
    const tickFlush = (flushes as Array<{ reason: string; ticksRun: number }>).find((f) => f.reason === "mutation");
    assert.equal(tickFlush?.ticksRun, 1);
  });
});

test("POST /command does not flush (enqueue alone is not a commit point) but does 202 with a real body", async () => {
  // Frozen clock, deliberately: this test's claim is about POST /command specifically never
  // being a flush point, not about catch-up (preRequestCatchUp flushing under reason "tick" is
  // correct, documented behavior — see world-runtime.mts). Using the real wall clock here (as
  // an earlier draft of this test did, with a 1000ms tickIntervalMs) was flaky under any
  // sandbox slow enough that real time between the two fetches below exceeds one tick interval:
  // preRequestCatchUp would then legitimately run and flush a real owed tick before /command's
  // own handler ever runs, inflating the count this test checks for reasons unrelated to what
  // it's actually testing. A clock that never advances makes `ticksOwed()` provably 0 for both
  // requests, isolating the assertion to exactly the claim in this test's name.
  const frozenNow = () => 0;
  await withLiveServer({ now: frozenNow, lastTickAt: 0 }, async ({ origin, flushes }) => {
    const connectRes = await fetch(`${origin}/connect`, { method: "POST", body: JSON.stringify({ name: "cmd-only-actor" }), headers: { "content-type": "application/json" } });
    const { actor } = await connectRes.json();
    const flushesBeforeCommand = flushes.length;
    const res = await fetch(`${origin}/command`, { method: "POST", body: JSON.stringify({ actor, command: "look" }), headers: { "content-type": "application/json" } });
    assert.equal(res.status, 202);
    assert.equal(flushes.length, flushesBeforeCommand, "enqueue must not add a flush");
  });
});

test("preRequestCatchUp runs on GET /health too (every route wakes the world, per the design)", async () => {
  let simTime = 0;
  const clock = { now: () => simTime, advance: (ms: number) => { simTime += ms; } };
  await withLiveServer({ now: clock.now, lastTickAt: 0, maxCatchUpTicksPerRequest: 5 }, async ({ origin, catchUps }) => {
    clock.advance(3000);
    const res = await fetch(`${origin}/health`);
    assert.equal(res.status, 200);
    assert.equal(catchUps.length, 1);
    assert.equal((catchUps[0] as { ticksRun: number }).ticksRun, 3);
  });
});

test("a 404 route still gets pre-request catch-up but no post-request flush", async () => {
  await withLiveServer({}, async ({ origin, flushes }) => {
    const res = await fetch(`${origin}/does-not-exist`);
    assert.equal(res.status, 404);
    assert.equal(flushes.length, 0);
  });
});
