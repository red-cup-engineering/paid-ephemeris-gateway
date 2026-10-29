// prove-farstone-world — the REST/JSON carrier, proven two ways:
//  (1) the carrier itself: connect + drain against a scripted fake Farstone HTTP server serving a
//      RECORDED session fixture (test/fixtures/session.mjs), asserting the exact onLine
//      sequence and the exact POST /command body sent.
//  (2) a DETERMINISTIC RENDER test: the same fixture driven through the real Wheatstone app + arnold
//      Buffer (a mock Screen, no real terminal), asserting the exact rendered lines at each step —
//      no live network, no real elapsed wall-clock ticks (pollMs:0, draining is driven by hand via
//      the carrier's exposed `_poll()`), so the same fixture always renders to the same frame.

import assert from "node:assert/strict";
import { Wheatstone } from "@red-cup-engineering/wheatstone/app";
import { farstoneWorld } from "../src/world.mjs";
import { startFakeFarstoneServer } from "./lib/fake-server.mjs";
import { CONNECT_RESPONSE, EVENTS_SEQUENCE } from "./fixtures/session.mjs";

import { Buffer as ABuffer } from "@red-cup-engineering/arnold/buffer";
import { rect } from "@red-cup-engineering/arnold/layout";

const ok = (value, message) => assert.ok(value, message);
const eq = (actual, expected, message) => assert.deepEqual(actual, expected, message);
const includes = (text, fragment, message) => assert.ok(text.includes(fragment), message);

// the same mock Screen prove-smoke.mjs uses: records each rendered frame as plain text so a test
// can assert on it with no real terminal.
class MockScreen {
  constructor(w = 80, h = 24) { this.w = w; this.h = h; this.keyHandler = null; this.frames = []; this.started = false; }
  start() { this.started = true; return this; }
  stop() { this.started = false; return this; }
  onKey(fn) { this.keyHandler = fn; return this; }
  onInterrupt() { return this; }
  render(draw) {
    const buf = new ABuffer(this.w, this.h);
    draw(buf, rect(0, 0, this.w, this.h));
    let s = ""; for (let r = 0; r < buf.height; r++) { for (let c = 0; c < buf.width; c++) s += buf.get(r, c).ch; s += "\n"; }
    this.frames.push(s);
    return this;
  }
  lastFrame() { return this.frames[this.frames.length - 1] || ""; }
  // lastFrameRows() — the last frame's rows, each with its box-drawing border glyphs (│) and
  // trailing padding stripped, so a test can compare a row's CONTENT exactly without hardcoding
  // where the box's inner width happens to end.
  lastFrameRows() { return this.lastFrame().split("\n").map((r) => r.replace(/^│/, "").replace(/│$/, "").replace(/\s+$/, "")); }
  type(text) { for (const ch of text) this.keyHandler?.({ name: "char", char: ch }); }
  press(name, extra = {}) { this.keyHandler?.({ name, ...extra }); }
}

// waitFor — poll a predicate until true or timeout. The connect/command round trips below are REAL
// (loopback) HTTP, so their completion time is not fixed; this is the same pattern
// prove-smoke.mjs's real-socket section uses rather than a guessed fixed sleep, so the test is
// robust under load instead of intermittently racing a slow fetch.
function waitFor(pred, ms = 2000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - t0 > ms) return reject(new Error("waitFor timed out"));
      setTimeout(tick, 10);
    };
    tick();
  });
}

// Both fake servers are started UP FRONT, before either is used or closed, so the OS assigns them
// two genuinely distinct ephemeral ports that never get reused mid-file — closing `fakeCarrier`
// before `fakeRender` is even created would risk the OS handing `fakeRender` the just-freed port
// while a stray keep-alive socket from the fetch client is still pooled against it, an intermittent
// ECONNREFUSED that has nothing to do with the carrier logic under test.
const fakeCarrier = await startFakeFarstoneServer({ connectResponse: CONNECT_RESPONSE, eventsSequence: EVENTS_SEQUENCE });
const fakeRender = await startFakeFarstoneServer({ connectResponse: CONNECT_RESPONSE, eventsSequence: EVENTS_SEQUENCE });

// === (1) the carrier alone: connect + drain against the fixture, exact onLine sequence =========
{
  const fake = fakeCarrier;
  const lines = [];
  const statuses = [];
  const world = farstoneWorld({ base: fake.base, name: "wanderer", pollMs: 0 });
  world.onLine((l) => lines.push(l));
  world.onStatus((s) => statuses.push(s.state));

  await world.connect();
  eq(world.actor, CONNECT_RESPONSE.actor, "connect() adopts the actor id from the fixture's POST /connect response");
  eq(statuses, ["connecting", "connected"], "connect() emits connecting then connected, in order");

  // drain each of the fixture's 4 scripted /events responses by hand (pollMs:0 disabled the timer)
  await world._poll();
  await world._poll();
  await world._poll();
  await world._poll();

  eq(lines, [
    "You are standing on the wharf. Salt wind off the harbor.",
    "Exits: north, east.",
    "A gull cries overhead.",
    "The chandlery is shuttered for the night.",
  ], "four polls against the fixture yield EXACTLY these lines, in order (the empty second poll contributes none)");
  eq(fake.pollCount(), 4, "exactly 4 GET /events requests were made — one per _poll() call, no extra polling from a stray timer");

  // send() posts the exact command body Farstone's /command route expects
  world.send("look");
  await waitFor(() => fake.commands.length >= 1);
  eq(fake.commands, [{ actor: CONNECT_RESPONSE.actor, command: "look" }],
    "send() posts exactly one /command body: the connected actor id and the literal command text");

  world.close();
}

// === (2) a deterministic render, through the real Wheatstone app + arnold Buffer ================
{
  const fake = fakeRender;
  const world = farstoneWorld({ base: fake.base, name: "wanderer", pollMs: 0 });
  const screen = new MockScreen();
  const app = new Wheatstone({ screen, world, target: "fixture" });
  app.start();
  // wait for connect()'s POST /connect (a real, if loopback, HTTP round trip) to actually resolve
  // and adopt an actor id before polling — see waitFor()'s own comment for why this is not a fixed
  // sleep.
  await waitFor(() => world.actor != null);

  await world._poll();
  let rows = screen.lastFrameRows();
  // row 0 is the box's top border, row 1 the startup banner Wheatstone.start() pushes, row 2 the
  // "connected to fixture" notice wireWorld's onStatus pushes on the connected transition, and row
  // 3+ is the world's own output — scrollback is append-only, so these row numbers are stable.
  eq(rows[3].replace(/^│/, ""), "You are standing on the wharf. Salt wind off the harbor.",
    "after the first poll, the room description's first line renders on its own output row, EXACTLY");
  eq(rows[4].replace(/^│/, ""), "Exits: north, east.",
    "the room description's second line renders on the row directly below it, EXACTLY");
  includes(screen.lastFrame(), "● connected", "the status line shows the connected state (CALM connection indicator)");

  // type "look", press enter — a local echo renders (world.supports.localEcho is not false here,
  // since farstoneWorld.supports is {}), and the command is posted to the fixture server.
  screen.type("look");
  screen.press("enter");
  await waitFor(() => fake.commands.length >= 1);
  rows = screen.lastFrameRows();
  eq(rows[5].replace(/^│/, ""), "look", "the typed command's local echo renders on the next output row, EXACTLY");
  eq(fake.commands, [{ actor: CONNECT_RESPONSE.actor, command: "look" }],
    "the world dispatch really sent the command to the fixture server, actor + text exact");

  // the second scripted poll is empty (nothing drains); the third carries the world's reply
  await world._poll(); // empty
  await world._poll(); // "A gull cries overhead."
  rows = screen.lastFrameRows();
  eq(rows[6].replace(/^│/, ""), "A gull cries overhead.",
    "after the reply-bearing poll, its line renders directly under the echoed command, EXACTLY — the empty poll in between rendered nothing");

  ok(!screen.lastFrame().includes("HP"), "no GMCP vitals ever render over this carrier (Farstone's wire has none) — the panel stays honest, not synthesized");

  world.close();
}

await fakeCarrier.close();
await fakeRender.close();

process.exit(0);
