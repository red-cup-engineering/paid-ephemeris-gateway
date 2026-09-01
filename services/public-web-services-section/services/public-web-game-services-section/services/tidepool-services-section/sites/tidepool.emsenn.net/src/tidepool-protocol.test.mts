// tidepool-protocol.test — protocol round-trips (design §2.3): `gameValidate` is wire-identical
// to qwzspace's own `intent(seq, body)` envelope with exactly one Tidepool-defined kind. These
// tests round-trip THROUGH qwzspace's real `intent()`/`encode()`/`decode()` (not a hand-rolled
// stand-in for them) to prove the two protocols actually compose, then exercise gameValidate's
// own trust-boundary edges.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, encode, intent } from "@red-cup-engineering/qwzspace/protocol";
import { gameValidate, MAX_COMMAND_LENGTH, PROTOCOL_VERSION } from "./tidepool-protocol.mts";

test("protocol version is stamped as documented", () => {
  assert.equal(PROTOCOL_VERSION, "tidepool.protocol.v1");
});

test("round-trip: a command intent built with qwzspace's own intent() survives encode -> decode -> gameValidate unchanged", () => {
  const wire = intent(17, { kind: "command", args: { command: "harvest mussels" } });
  assert.equal(wire.k, "intent");
  assert.equal(wire.seq, 17);
  const onWire = encode(wire);
  const decoded = decode(onWire);
  assert.deepEqual(decoded, wire);
  const shaped = gameValidate(decoded, "actor:kip");
  assert.deepEqual(shaped, { kind: "command", args: { command: "harvest mussels" } });
});

test("round-trip: room.mjs's own wireConnection destructures {k, seq, ...body} before calling gameValidate — simulate that exact shape", () => {
  // room.mjs (qwzspace) reads raw.k/raw.seq itself and hands gameValidate the WHOLE raw object —
  // see tidepool-protocol.mts's own header note. Confirm gameValidate tolerates (ignores) the
  // envelope fields it doesn't care about (k, seq) sitting alongside kind/args.
  const raw = { k: "intent", seq: 3, kind: "command", args: { command: "look" } };
  const shaped = gameValidate(raw, "actor:reed");
  assert.deepEqual(shaped, { kind: "command", args: { command: "look" } });
});

test("gameValidate trims surrounding whitespace", () => {
  const shaped = gameValidate({ kind: "command", args: { command: "  look  " } }, "a");
  assert.equal(shaped.args.command, "look");
});

test("gameValidate rejects: null / non-object", () => {
  assert.equal(gameValidate(null, "a"), null);
  assert.equal(gameValidate(undefined, "a"), null);
  assert.equal(gameValidate("look", "a"), null);
  assert.equal(gameValidate(42, "a"), null);
});

test("gameValidate rejects: wrong kind", () => {
  assert.equal(gameValidate({ kind: "presence.join", args: { command: "look" } }, "a"), null);
  assert.equal(gameValidate({ args: { command: "look" } }, "a"), null);
});

test("gameValidate rejects: missing / malformed args", () => {
  assert.equal(gameValidate({ kind: "command" }, "a"), null);
  assert.equal(gameValidate({ kind: "command", args: null }, "a"), null);
  assert.equal(gameValidate({ kind: "command", args: "look" }, "a"), null);
  assert.equal(gameValidate({ kind: "command", args: {} }, "a"), null);
  assert.equal(gameValidate({ kind: "command", args: { command: 42 } }, "a"), null);
});

test("gameValidate rejects: empty / whitespace-only command", () => {
  assert.equal(gameValidate({ kind: "command", args: { command: "" } }, "a"), null);
  assert.equal(gameValidate({ kind: "command", args: { command: "   " } }, "a"), null);
});

test("gameValidate rejects: command over MAX_COMMAND_LENGTH, accepts exactly at the boundary", () => {
  const atLimit = "a".repeat(MAX_COMMAND_LENGTH);
  assert.deepEqual(gameValidate({ kind: "command", args: { command: atLimit } }, "a"), { kind: "command", args: { command: atLimit } });
  const overLimit = "a".repeat(MAX_COMMAND_LENGTH + 1);
  assert.equal(gameValidate({ kind: "command", args: { command: overLimit } }, "a"), null);
});

test("gameValidate is agnostic to actorId (the trust boundary is shape, not identity — identity is room.mjs's job)", () => {
  const a = gameValidate({ kind: "command", args: { command: "look" } }, "actor:one");
  const b = gameValidate({ kind: "command", args: { command: "look" } }, "actor:two");
  assert.deepEqual(a, b);
});

test("one grammar: a hand-typed command string and a program-emitted one are byte-identical once validated (design §2.3)", () => {
  // "human-typeable and program-emittable identically" — the SAME raw intent shape works whether
  // a human's terminal client or the reference bot produced args.command.
  const humanTyped = gameValidate({ kind: "command", args: { command: "trade buy fish 2" } }, "human:1");
  const programEmitted = gameValidate(intent(1, { kind: "command", args: { command: "trade buy fish 2" } }), "bot:1");
  assert.deepEqual(humanTyped.args, programEmitted.args);
});
