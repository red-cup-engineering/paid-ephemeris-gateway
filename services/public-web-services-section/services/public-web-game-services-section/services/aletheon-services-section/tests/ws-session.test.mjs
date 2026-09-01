// ws-session — a real client, over the real wire. Connects with Node's native `WebSocket` (the
// same RFC 6455 client the buried-games-revival session's live exercise used) through the actual
// qwzspace `attach()` handshake this server runs in production — no mock transport, no in-process
// shortcut. Drives join, movement+attack (combat), speech (illocution/codex), and chat, and
// asserts the server's real reply stream is coherent throughout, plus that the connection and the
// world are both still alive and sane afterward (the "no crashes" bar).
//
// Ticks are driven by hand (`step()`, the same deterministic sibling the net layer was designed
// for — see app.mjs's own doc) rather than waiting on the real 15Hz timer, so this test is fast
// and exact about which tick produced which message, instead of racing a live clock.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGameServer } from "../server/app.mjs";
import { KIND } from "../shared/constants.mjs";

function openSocketOnce(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", (ev) => reject(new Error(`ws error: ${ev.message ?? ev}`)), { once: true });
  });
}

// Node's built-in (undici) WebSocket client occasionally fails the very first handshake attempt
// right after a PRIOR test in the same process just closed a different server (observed directly,
// intermittently, only when tests run back-to-back — never when a test runs alone; not this
// server's own RFC 6455 handshake, which the first test in this file already proves works cleanly
// end to end). One retry absorbs that client-side flake without hiding a real server-side failure
// (a genuinely broken server fails the retry identically). On slower/sandboxed hosts the flake is
// reliably reproducible rather than merely intermittent, and an IMMEDIATE retry lands in the same
// not-yet-settled window and fails again identically — so the retry waits one short beat first.
// That beat is the whole fix: a real server-side break still fails the (delayed) retry the same.
async function openSocket(port) {
  try {
    return await openSocketOnce(port);
  } catch {
    await new Promise((r) => setTimeout(r, 30));
    return openSocketOnce(port);
  }
}

function messageCollector(ws) {
  const received = [];
  ws.addEventListener("message", (ev) => {
    try { received.push(JSON.parse(ev.data)); } catch { /* not JSON — leave it out, a real bug would show as a missing expected message */ }
  });
  return {
    all: received,
    async waitFor(predicate, label, timeoutMs = 2000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const hit = received.find(predicate);
        if (hit) return hit;
        if (Date.now() > deadline) {
          throw new Error(`timed out waiting for ${label}; got kinds: ${received.map((m) => m.k).join(",")}`);
        }
        await new Promise((r) => setTimeout(r, 5));
      }
    },
  };
}

test("ws-session: connect, join, attack, speak, chat — coherent messages, no crash", async (t) => {
  const { world, server, step } = createGameServer({ root: null, seed: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  t.after(() => server.close());

  let crashed = null;
  const onUncaught = (err) => { crashed = err; };
  process.on("uncaughtException", onUncaught);
  t.after(() => process.off("uncaughtException", onUncaught));

  const ws = await openSocket(port);
  t.after(() => ws.close());
  const msgs = messageCollector(ws);

  // 1. hello arrives unsolicited, on connect.
  const hello = await msgs.waitFor((m) => m.k === "hello", "hello");
  assert.equal(typeof hello.v, "number");

  // 2. join spawns a player and streams snapshot + codex(⊥) + inventory.
  ws.send(JSON.stringify({ k: "join", name: "tester" }));
  const snap = await msgs.waitFor((m) => m.k === "snapshot", "snapshot");
  assert.equal(typeof snap.you, "string");
  assert.ok(Array.isArray(snap.e));
  await msgs.waitFor((m) => m.k === "codex" && m.glyph === "⊥", "codex(⊥) on arrival");
  await msgs.waitFor((m) => m.k === "inventory", "inventory on join");

  const me = world.entities.get(snap.you);
  assert.ok(me, "the joined player entity must exist in the live world");
  assert.equal(me.kind, KIND.player);

  // 3. reposition onto a live, attackable NPC — a player's valid attack targets are `hostile`
  // (brigands) or KIND.anomaly (ticking.mjs's nearestEnemy), never peaceful critters/keepers, so
  // the target must actually be one of those (direct world access is the test's own privilege,
  // not something a real client could do; it only picks WHERE, combat itself still runs for real).
  const target = [...world.entities.values()].find((e) => e.hostile === true && e.state !== "dead");
  assert.ok(target, "expected at least one live hostile NPC in the seeded world");
  me.x = target.x; me.z = target.z; me.y = target.y;

  ws.send(JSON.stringify({ k: "input", seq: 1, f: 0, s: 0, y: me.yaw, a: 1 }));
  // the WS frame is real network I/O (a socket write, drained by the server's own 'data' handler
  // asynchronously) — give the loop a beat to actually deliver it before hand-driving the tick
  // that reads e.input, or the tick can run against last tick's (attack-less) intent instead.
  await new Promise((r) => setTimeout(r, 30));
  step(); // the single-writer tick: integrates the input, resolves the swing, syncs sessions

  // NOTE: the world's autonomous events can also queue a "combat" message this same tick (e.g.
  // the seed Anomaly's own corrupt() call queues an outcome:"corrupted" event at seed time, which
  // sits in world.events until the very first tick drains it — nothing to do with this player at
  // all) and, since brigand-20 was spawned before player-39, its own aggro can land a hit on the
  // player in the SAME tick before the player's swing resolves (Map iteration = spawn order). So
  // this asserts on the specific event this player's own attack produced, not just "any combat".
  const combat = await msgs.waitFor((m) => m.k === "combat" && m.at === me.id, "a combat event this player's own attack produced");
  assert.equal(combat.tg, target.id);
  assert.ok(combat.dmg > 0, "a landed swing should carry positive damage");
  assert.ok(["hit", "slain"].includes(combat.out), `unexpected combat outcome: ${combat.out}`);

  await msgs.waitFor((m) => m.k === "delta", "a delta reflecting the target's changed hp/state");

  // 4. speak an illocutionary force — a real "said" broadcast, glyph-carrying.
  ws.send(JSON.stringify({ k: "speak", force: "assert" }));
  const said = await msgs.waitFor((m) => m.k === "said" && m.from === "tester", "said(assert) broadcast");
  assert.equal(said.force, "assert");
  assert.equal(said.glyph, "t");

  // 5. chat — echoed back over the hub broadcast.
  ws.send(JSON.stringify({ k: "chat", line: "hello harbor" }));
  const chat = await msgs.waitFor((m) => m.k === "chat" && m.line === "hello harbor", "chat broadcast");
  assert.equal(chat.from, "tester");

  // 6. no crash: the uncaughtException guard never fired, and the world is still ticking sanely.
  assert.equal(crashed, null, `an uncaught exception occurred during the session: ${crashed}`);
  assert.equal(ws.readyState, WebSocket.OPEN);
  assert.doesNotThrow(() => step(), "the world must still tick cleanly after a real play session");
});

test("ws-session: garbage frames are ignored, not fatal (decode() returns null, no throw)", async (t) => {
  const { server, step } = createGameServer({ root: null, seed: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  t.after(() => server.close());

  const ws = await openSocket(port);
  t.after(() => ws.close());
  const msgs = messageCollector(ws);
  await msgs.waitFor((m) => m.k === "hello", "hello");

  ws.send("not json at all");
  ws.send(JSON.stringify({ no_k_field: true }));
  ws.send(JSON.stringify({ k: "join", name: "gremlin" }));

  await msgs.waitFor((m) => m.k === "snapshot", "join still succeeds after garbage frames");
  assert.doesNotThrow(() => step());
});
