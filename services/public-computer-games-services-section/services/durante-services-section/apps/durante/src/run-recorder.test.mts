import { test } from "node:test";
import assert from "node:assert/strict";
import { recordMove, encodeRun } from "./run-recorder.mjs";

test("recordMove: appends a house-shape intent-log entry with a monotonic seq", () => {
  let log = [];
  log = recordMove(log, { forward: 1 });
  log = recordMove(log, { turn: 0.3, fire: true });
  assert.equal(log.length, 2);
  assert.equal(log[0].seq, 0);
  assert.equal(log[1].seq, 1);
  assert.deepEqual(log[0].intent, { kind: "move", move: { forward: 1 } });
  assert.deepEqual(log[1].intent, { kind: "move", move: { turn: 0.3, fire: true } });
});

test("recordMove: an undefined move records as an empty move object, not undefined", () => {
  const log = recordMove([], undefined);
  assert.deepEqual(log[0].intent, { kind: "move", move: {} });
});

test("encodeRun: builds the durante-run/1 POST body with every required field", () => {
  const body = encodeRun({ date: "2026-08-19", actor: "alice", entrantKind: "human", mode: "scored", intentLog: [] });
  assert.equal(body.schema, "durante-run/1");
  assert.equal(body.date, "2026-08-19");
  assert.equal(body.actor, "alice");
  assert.equal(body.entrantKind, "human");
  assert.equal(body.mode, "scored");
  assert.deepEqual(body.intentLog, []);
  assert.equal("seed" in body, false, "seed is optional and must be omitted, not null, when not supplied");
});

test("encodeRun: passes through an optional seed when given", () => {
  const body = encodeRun({ date: "2026-08-19", actor: "alice", entrantKind: "agent", mode: "practice", intentLog: [], seed: "0xdeadbeef" });
  assert.equal(body.seed, "0xdeadbeef");
});

test("encodeRun: rejects an invalid entrantKind", () => {
  assert.throws(() => encodeRun({ date: "2026-08-19", actor: "a", entrantKind: "robot", mode: "scored", intentLog: [] }), TypeError);
});

test("encodeRun: rejects an invalid mode", () => {
  assert.throws(() => encodeRun({ date: "2026-08-19", actor: "a", entrantKind: "human", mode: "casual", intentLog: [] }), TypeError);
});

test("encodeRun: rejects a missing date/actor, and a non-array intentLog", () => {
  assert.throws(() => encodeRun({ actor: "a", entrantKind: "human", mode: "scored", intentLog: [] }), TypeError);
  assert.throws(() => encodeRun({ date: "2026-08-19", entrantKind: "human", mode: "scored", intentLog: [] }), TypeError);
  assert.throws(() => encodeRun({ date: "2026-08-19", actor: "a", entrantKind: "human", mode: "scored", intentLog: "nope" }), TypeError);
});
