// wire — the message-framing boundary Aletheon itself owns: shared/encoding.mjs ((de)serialization)
// and shared/protocol.mjs (the message shape constructors). The hand-rolled RFC 6455 BYTE framing
// (fragmentation, masking, opcodes) lives one layer down, in the qwzspace transport this server
// mounts — tests/ws-session.test.mjs already drives that over a REAL socket end to end. This file
// is the layer Aletheon's own code writes and can regress on its own: `decode` must never throw
// into the socket loop no matter what garbage arrives, and every protocol builder must emit the
// exact flat shape session.mjs and the client agree on (kept small deliberately — they ride the
// 15Hz tick).

import assert from "node:assert/strict";
import { test } from "node:test";

import { encode, decode } from "../shared/encoding.mjs";
import * as P from "../shared/protocol.mjs";
import { MSG, PROTOCOL_VERSION } from "../shared/constants.mjs";

// --- encoding: the JSON (de)serialization boundary ------------------------------------------

test("encode/decode: round-trips a well-formed message", () => {
  const msg = { k: "chat", from: "a", line: "hi" };
  const wire = encode(msg);
  assert.equal(typeof wire, "string");
  assert.deepEqual(decode(wire), msg);
});

test("decode: returns null (never throws) on frames that are not valid JSON at all", () => {
  assert.equal(decode("not json at all"), null);
  assert.equal(decode("{unterminated"), null);
  assert.equal(decode(""), null);
  assert.equal(decode(undefined), null);
});

test("decode: returns null on JSON that parses but is not a { k: string } object — arrays, " +
     "primitives, objects missing k, and objects with a non-string k are all garbage on this wire", () => {
  assert.equal(decode("null"), null);
  assert.equal(decode("42"), null);
  assert.equal(decode('"just a string"'), null);
  assert.equal(decode("[1,2,3]"), null);
  assert.equal(decode(JSON.stringify({ no_k_field: true })), null);
  assert.equal(decode(JSON.stringify({ k: 5 })), null, "a numeric k is not a valid message kind");
});

test("decode: accepts any object carrying a string k, even with unexpected extra fields " +
     "(decode does not validate the payload shape, only the envelope)", () => {
  const m = decode(JSON.stringify({ k: "join", name: "gremlin", extra: { nested: true } }));
  assert.ok(m);
  assert.equal(m.k, "join");
  assert.equal(m.extra.nested, true);
});

// --- protocol: the message shape constructors ------------------------------------------------

test("hello: carries the protocol version and the world payload verbatim", () => {
  const h = P.hello("player-1", { tick: 42 });
  assert.equal(h.k, MSG.hello);
  assert.equal(h.v, PROTOCOL_VERSION);
  assert.equal(h.id, "player-1");
  assert.deepEqual(h.world, { tick: 42 });
});

test("join: trims a name to 24 chars and defaults an empty/missing name to 'wanderer'", () => {
  assert.equal(P.join("tester").name, "tester");
  assert.equal(P.join(undefined).name, "wanderer");
  assert.equal(P.join(null).name, "wanderer");
  const long = "x".repeat(40);
  assert.equal(P.join(long).name, long.slice(0, 24));
  assert.equal(P.join(long).name.length, 24);
});

test("input: clamps the move axes to {-1,0,1}, coerces yaw to a finite number (0 default), and " +
     "reduces attack to a 0/1 flag", () => {
  const i = P.input(7, 5, -9, "not-a-number", "yes");
  assert.equal(i.k, MSG.input);
  assert.equal(i.seq, 7);
  assert.equal(i.f, 1, "any positive forward intent clamps to 1");
  assert.equal(i.s, -1, "any negative strafe intent clamps to -1");
  assert.equal(i.y, 0, "a non-finite yaw falls back to 0");
  assert.equal(i.a, 1, "a truthy attack flag reduces to 1");

  const zeroed = P.input(1, 0, 0, 1.25, 0);
  assert.equal(zeroed.f, 0);
  assert.equal(zeroed.s, 0);
  assert.equal(zeroed.y, 1.25);
  assert.equal(zeroed.a, 0);
});

test("view: rounds position to 2 decimals and yaw to 3, and only carries marks/worth when present " +
     "on the input (mirrors session.mjs's 'only the local player's own view carries it' rule)", () => {
  const bare = P.view({ id: "e1", kind: "critter", name: "Fox", x: 1.23456, y: 0, z: -2.6789, yaw: 0.123456, hp: 10, maxHp: 10, charge: "t" });
  assert.equal(bare.x, 1.23);
  assert.equal(bare.z, -2.68);
  assert.equal(bare.yaw, 0.123);
  assert.ok(!("marks" in bare));
  assert.ok(!("worth" in bare));

  const mine = P.view({ id: "p1", kind: "player", name: "me", x: 0, y: 0, z: 0, yaw: 0, hp: 10, maxHp: 10, charge: "t", marks: 5, worth: 12 });
  assert.equal(mine.marks, 5);
  assert.equal(mine.worth, 12);
});

test("combat/chat/said/altar/dispute/claim/trade/inventory: each builder emits the documented flat shape", () => {
  assert.deepEqual(P.combat(9, "a1", "t1", 9, "hit"), { k: MSG.combat, tick: 9, at: "a1", tg: "t1", dmg: 9, out: "hit" });

  const c = P.chat("Aletheon", "x".repeat(250));
  assert.equal(c.k, MSG.chat);
  assert.equal(c.from, "Aletheon");
  assert.equal(c.line.length, 200, "chat lines are truncated to 200 chars");

  const said = P.said("tester", "assert", "t", 1.239, -2.001);
  assert.deepEqual(said, { k: MSG.said, from: "tester", force: "assert", glyph: "t", x: 1.24, z: -2 });

  const altar = P.altar("altar-1", "⊤", "3", "1.9", "erupt", 10.005, -3.001);
  assert.equal(altar.k, MSG.altar);
  assert.equal(altar.pos, 3, "pos/neg are coerced to integers");
  assert.equal(altar.neg, 1, "a fractional neg count truncates via |0");
  assert.equal(altar.x, 10.01);

  const claim = P.claim("contest");
  assert.deepEqual(claim, { k: MSG.claim, force: "contest", altar: null });
  assert.equal(P.claim("assert", "altar-9").altar, "altar-9");

  const move = P.move("abstain");
  assert.deepEqual(move, { k: MSG.move, force: "abstain" });

  const parley = P.parley("foe-1");
  assert.deepEqual(parley, { k: MSG.parley, tg: "foe-1" });
  assert.equal(P.parley(undefined).tg, null);

  const dv = { you: "t", foe: "f", ended: false };
  assert.deepEqual(P.dispute(dv), { k: MSG.dispute, ...dv });

  const tradeNoOffer = P.trade("cancel", "p2");
  assert.deepEqual(tradeNoOffer, { k: MSG.trade, op: "cancel", to: "p2" });
  const tradeWithOffer = P.trade("propose", "p2", { marks: 5 }, { marks: 10 });
  assert.deepEqual(tradeWithOffer, { k: MSG.trade, op: "propose", to: "p2", offer: { marks: 5 }, ask: { marks: 10 } });

  const inv = P.inventory([{ id: "i1" }], 12.9, 40.1);
  assert.equal(inv.marks, 12, "marks/worth are coerced with |0 (truncated, not rounded)");
  assert.equal(inv.worth, 40);
});

test("field: carries the downsampled grid dims/digits plus the rounded settledness scalar", () => {
  const f = P.field({ dim: 4, q: "0123456789012345" }, 0.123456);
  assert.equal(f.k, MSG.field);
  assert.equal(f.dim, 4);
  assert.equal(f.q, "0123456789012345");
  assert.equal(f.s, 0.123);
  assert.equal(P.field({ dim: 1, q: "0" }).s, 0, "settledness defaults to 0 when omitted");
});

test("bye/settle/codex: the bare, argument-light shapes carry exactly their one payload field", () => {
  assert.deepEqual(P.bye("e9"), { k: MSG.bye, id: "e9" });
  assert.deepEqual(P.settle(), { k: MSG.settle });
  assert.deepEqual(P.codex("⊥"), { k: MSG.codex, glyph: "⊥" });
});

test("every MSG kind used by a protocol builder round-trips through encode/decode unchanged", () => {
  const samples = [
    P.hello("p1", { tick: 1 }), P.join("x"), P.input(1, 1, 0, 0, 0),
    P.snapshot(1, "p1", []), P.delta(1, 1, [], []), P.combat(1, "a", "b", 1, "hit"),
    P.chat("a", "b"), P.bye("p1"), P.codex("t"), P.field({ dim: 1, q: "0" }),
    P.speak("assert"), P.said("a", "assert", "t", 0, 0), P.settle(), P.power("reflect"),
    P.trade("cancel", "p2"), P.inventory([], 0, 0), P.parley("f"), P.move("assert"),
    P.dispute({}), P.claim("assert"), P.altar("a1", "t", 0, 0, "sanctuary", 0, 0),
  ];
  for (const m of samples) {
    const back = decode(encode(m));
    assert.deepEqual(back, m, `round trip failed for k="${m.k}"`);
  }
});
