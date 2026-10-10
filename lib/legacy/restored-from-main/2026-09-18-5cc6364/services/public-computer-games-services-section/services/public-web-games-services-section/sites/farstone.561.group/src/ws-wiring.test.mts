// ws-wiring.test — the qwzspace push transport wired ALONGSIDE the JSON API on the SAME
// `http.Server` (world-hosting's http-wiring's "PUSH TRANSPORT, ADDITIVE"): a real WS client joins, submits
// commands, and receives perception frames pushed over the socket; a dropped connection resumes
// (qwzspace's Tier-1 resume-token) without losing its persisted feltos actor; the OLD JSON routes
// keep answering unchanged on the same server, seeing the SAME engine a WS client just mutated
// (single source of truth — see farstone-room.mts's own header). Uses Node's built-in `WebSocket`
// (mirrors Tidepool's `agents/ws-transport.mjs`) and qwzspace's raw `protocol.mjs` helpers
// directly, so each assertion is against the literal wire shape, not a library's interpretation.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { closeMudHttpServer, listenMudHttpServer } from "@red-cup-engineering/feltos/http";
import { decode, encode, intent, join as joinMsg } from "@red-cup-engineering/qwzspace/protocol";
import { FARSTONE_GAME } from "./farstone-game.mts";
import { createFarstoneRoom } from "./farstone-room.mts";
import { createWorldRuntime } from "@red-cup-engineering/world-hosting/world-runtime";
import { createWorldHttpServer } from "@red-cup-engineering/world-hosting/http-wiring";

const TICK_MS = 20;

// warmUpLocalPort — mirrors http-wiring.test.mts's own helper: this sandbox's loopback networking
// refuses the very first connection attempt to a freshly bound ephemeral port.
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
  run: (args: { origin: string; wsOrigin: string }) => Promise<void>,
): Promise<void> {
  const bootEngine = createEngine(FARSTONE_GAME);
  const { room, liveMud } = createFarstoneRoom(bootEngine, { intervalMs: TICK_MS });
  const mud = liveMud();
  const runtime = createWorldRuntime(
    { tick: () => room.stepOnce(), engine: () => mud.engine() },
    { tickIntervalMs: TICK_MS, maxCatchUpTicksPerRequest: 50, lastTickAt: Date.now(), store: null, clockStore: null },
  );
  await runtime.preRequestCatchUp();
  const server = createWorldHttpServer(mud, runtime, { tickIntervalMs: TICK_MS, room, processLabel: "Farstone" });
  const { origin } = await listenMudHttpServer(server, { host: "127.0.0.1", port: 0 });
  await warmUpLocalPort(origin);
  const wsOrigin = origin.replace("http://", "ws://");
  try {
    await run({ origin, wsOrigin });
  } finally {
    room.destroy();
    await closeMudHttpServer(server);
  }
}

/** Collect decoded qwzspace frames off a live WebSocket into an array, plus a helper that waits for
 *  the next frame matching a predicate (polling, since `onmessage` fires asynchronously). */
function collector(ws: WebSocket) {
  const frames: any[] = [];
  ws.onmessage = (ev) => {
    const message = decode(String(ev.data));
    if (message) frames.push(message);
  };
  return {
    frames,
    async waitFor(predicate: (m: any) => boolean, timeoutMs = 3000): Promise<any> {
      const start = Date.now();
      for (;;) {
        const found = frames.find(predicate);
        if (found) return found;
        if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for a matching frame; saw: ${JSON.stringify(frames.map((f) => f.k))}`);
        await new Promise((r) => setTimeout(r, 10));
      }
    },
  };
}

function nudge(origin: string): Promise<Response> {
  // any plain HTTP request drives runtime.preRequestCatchUp() (world-hosting's http-wiring) — the same
  // mechanism a browser page load or a health probe already provides in production.
  return fetch(`${origin}/health`);
}

async function untilTickRuns(origin: string): Promise<void> {
  await new Promise((r) => setTimeout(r, TICK_MS + 20));
  await nudge(origin);
}

test("a WS client connects, joins, and receives its own farstone.perception.v1 frame once a tick admits the join", async () => {
  await withLiveServer(async ({ origin, wsOrigin }) => {
    const ws = new WebSocket(wsOrigin);
    const c = collector(ws);
    await new Promise((resolve, reject) => { ws.onopen = () => resolve(undefined); ws.onerror = reject; });

    const hello = await c.waitFor((m) => m.k === "hello");
    assert.equal(typeof hello.id, "string");
    assert.equal(typeof hello.world?.resumeToken, "string");

    ws.send(encode(joinMsg("kip")));
    await untilTickRuns(origin);

    const delta = await c.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));
    const own = delta.c.find((e: any) => e.kind === "farstone.perception.v1");
    assert.equal(own.place.id, "harbor-quay", "a freshly joined actor starts at the game's own start room");

    ws.close();
  });
});

test("a WS client submits a command and the resulting world state is pushed back over the socket", async () => {
  await withLiveServer(async ({ origin, wsOrigin }) => {
    const ws = new WebSocket(wsOrigin);
    const c = collector(ws);
    await new Promise((resolve, reject) => { ws.onopen = () => resolve(undefined); ws.onerror = reject; });
    await c.waitFor((m) => m.k === "hello");

    ws.send(encode(joinMsg("wanderer-b")));
    await untilTickRuns(origin);
    await c.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));

    ws.send(encode(intent(1, { kind: "command", args: { command: "go north" } })));
    await untilTickRuns(origin);

    const moved = await c.waitFor((m) =>
      m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1" && e.place?.id === "downtown-farston"));
    const own = moved.c.find((e: any) => e.kind === "farstone.perception.v1");
    assert.equal(own.place.id, "downtown-farston");

    ws.close();
  });
});

test("2026-09-01 web-transport verb-parity lot: who/whoami/finger/chat reach a real WS client's command form, same as the JSON API and telnet", async () => {
  await withLiveServer(async ({ origin, wsOrigin }) => {
    const kip = new WebSocket(wsOrigin);
    const kipEvents = collector(kip);
    await new Promise((resolve, reject) => { kip.onopen = () => resolve(undefined); kip.onerror = reject; });
    await kipEvents.waitFor((m) => m.k === "hello");
    kip.send(encode(joinMsg("kip")));
    await untilTickRuns(origin);
    await kipEvents.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));

    const reed = new WebSocket(wsOrigin);
    const reedEvents = collector(reed);
    await new Promise((resolve, reject) => { reed.onopen = () => resolve(undefined); reed.onerror = reject; });
    await reedEvents.waitFor((m) => m.k === "hello");
    reed.send(encode(joinMsg("reed")));
    await untilTickRuns(origin);
    await reedEvents.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));

    function lastLineFor(events: ReturnType<typeof collector>): string {
      const seen = [...events.frames].reverse().find((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1" && e.recentEvents?.length));
      const own = seen?.c.find((e: any) => e.kind === "farstone.perception.v1");
      return own?.recentEvents.at(-1)?.text ?? "";
    }

    kip.send(encode(intent(1, { kind: "command", args: { command: "who" } })));
    await untilTickRuns(origin);
    assert.match(lastLineFor(kipEvents), /clients currently connected/u);

    kip.send(encode(intent(2, { kind: "command", args: { command: "whoami" } })));
    await untilTickRuns(origin);
    assert.equal(lastLineFor(kipEvents), "Your name is kip.");

    kip.send(encode(intent(3, { kind: "command", args: { command: "finger reed" } })));
    await untilTickRuns(origin);
    assert.match(lastLineFor(kipEvents), /^reed\nRole: unset/u);

    kip.send(encode(intent(4, { kind: "command", args: { command: "chat hi from the browser" } })));
    await untilTickRuns(origin);
    assert.equal(lastLineFor(kipEvents), "[one] kip: hi from the browser");

    // HONEST, DISCLOSED LIMITATION (see farstone-room.mts's own comment on this): reed, the chat's
    // recipient, does not receive it over this transport yet — only kip (the sender) does.

    kip.send(encode(intent(5, { kind: "command", args: { command: "register kip" } })));
    await untilTickRuns(origin);
    assert.match(lastLineFor(kipEvents), /^register is not available over the browser session yet/u);

    kip.close();
    reed.close();
  });
});

test("resume after disconnect: a dropped connection reclaims its SAME persisted feltos actor and its location survives the drop", async () => {
  await withLiveServer(async ({ origin, wsOrigin }) => {
    const ws1 = new WebSocket(wsOrigin);
    const c1 = collector(ws1);
    await new Promise((resolve, reject) => { ws1.onopen = () => resolve(undefined); ws1.onerror = reject; });
    const hello1 = await c1.waitFor((m) => m.k === "hello");
    const resumeToken: string = hello1.world.resumeToken;

    ws1.send(encode(joinMsg("resumer")));
    await untilTickRuns(origin);
    await c1.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));

    ws1.send(encode(intent(1, { kind: "command", args: { command: "go north" } })));
    await untilTickRuns(origin);
    const beforeDrop = await c1.waitFor((m) =>
      m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1" && e.place?.id === "downtown-farston"));
    const lastTick: number = beforeDrop.tick;

    ws1.close();
    await new Promise((r) => setTimeout(r, 50)); // well inside the resume-grace window

    const ws2 = new WebSocket(wsOrigin);
    const c2 = collector(ws2);
    await new Promise((resolve, reject) => { ws2.onopen = () => resolve(undefined); ws2.onerror = reject; });
    await c2.waitFor((m) => m.k === "hello"); // every fresh connection gets one, resuming or not

    ws2.send(encode({ k: "resume", token: resumeToken, sinceTick: lastTick }));
    const resumed = await c2.waitFor((m) => m.k === "resumed" || m.k === "resume-failed");
    assert.equal(resumed.k, "resumed", "the resume token must still be valid inside the grace window");

    // the SAME persisted feltos actor, not a fresh one: ask it to look and confirm it is still at
    // downtown-farston, exactly where it moved before the drop — never reset to the start room.
    ws2.send(encode(intent(2, { kind: "command", args: { command: "look" } })));
    await untilTickRuns(origin);
    const afterResume = await c2.waitFor((m) =>
      m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1" && e.place?.id === "downtown-farston"));
    assert.ok(afterResume, "the resumed connection's actor is still at downtown-farston, not reset");

    ws2.close();
  });
});

test("the old JSON HTTP API keeps working, unchanged, on the SAME server the WS transport is attached to — and sees the SAME engine a WS client just mutated", async () => {
  await withLiveServer(async ({ origin, wsOrigin }) => {
    // a WS client joins and moves.
    const ws = new WebSocket(wsOrigin);
    const c = collector(ws);
    await new Promise((resolve, reject) => { ws.onopen = () => resolve(undefined); ws.onerror = reject; });
    await c.waitFor((m) => m.k === "hello");
    ws.send(encode(joinMsg("ws-actor")));
    await untilTickRuns(origin);
    await c.waitFor((m) => m.k === "delta" && m.c.some((e: any) => e.kind === "farstone.perception.v1"));
    ws.close();

    // the plain JSON API, exercised exactly as http-wiring.test.mts already proves it works.
    const connectRes = await fetch(`${origin}/connect`, { method: "POST", body: JSON.stringify({ name: "json-actor" }), headers: { "content-type": "application/json" } });
    assert.equal(connectRes.status, 201);
    const { actor } = await connectRes.json();
    assert.ok(String(actor).startsWith("actor:"));

    const commandRes = await fetch(`${origin}/command`, { method: "POST", body: JSON.stringify({ actor, command: "look" }), headers: { "content-type": "application/json" } });
    assert.equal(commandRes.status, 202);

    const tickRes = await fetch(`${origin}/tick`, { method: "POST" });
    assert.equal(tickRes.status, 200);

    const eventsRes = await fetch(`${origin}/events?actor=${encodeURIComponent(actor)}`);
    assert.equal(eventsRes.status, 200);
    assert.ok(Array.isArray((await eventsRes.json()).events));

    // both the WS-joined actor and the JSON-connected actor live in the SAME engine — proof there is
    // no forked, second world underneath the WS transport.
    const metricsRes = await fetch(`${origin}/metrics`);
    const metrics = await metricsRes.json();
    assert.equal(metrics.actors, 2, "the WS-joined feltos actor and the JSON-connected one are both present in the ONE shared engine");
  });
});
