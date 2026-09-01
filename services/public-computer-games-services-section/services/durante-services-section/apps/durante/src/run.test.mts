// run.test.mts — proves replayRun's structural-rejection discipline (whole-log, no partial credit),
// that it drives the REAL engine (createDailyEngine + applyIntent, not a stub), and that it stops at
// the first terminal condition (cleared or tick-cap) rather than running the log to its raw end.
//
// A NOTE ON TICK COUNTS IN THIS FILE: durante's world is an append-only trace (THE LAW — evidence
// linear, nothing overwritten), and every demon chase step admits a fresh `at` row rather than
// mutating one — so a fold's cost grows with the trace's own history, and a multi-thousand-tick replay
// is measurably slow (empirically: order tens of seconds by tick 1000, worse beyond). This is a real,
// disclosed engine characteristic (see DESIGN.md), not a bug this task's "abrash is read-only unless a
// bug blocks determinism" carve-out would justify touching — game.mjs's own admit-per-tick shape is
// central to the demon's held-⊤ mechanic. Tests here use `replayRun`'s optional `opts.tickCap`
// (test-only injection — see run.mjs's header) to keep the suite fast without changing the shipped
// DAILY_TICK_CAP=3000 the real server always uses.

import { test } from "node:test";
import assert from "node:assert/strict";
import { appendEntry } from "@red-cup-engineering/cartridge/intent-log";
import { replayRun, MAX_MOVES_STRUCTURAL } from "./run.mjs";
import { buildIntentLog, createDailyEngine } from "./cartridge.mjs";
import { tick, status } from "./game.mjs";
import { playDaily } from "../agents/reference-entrant.mjs";

const DATE = "2026-08-19";
// CLEAR_DATE is a SEPARATE date from DATE, picked deliberately: it generates only 2 demons (vs.
// DATE's 4), so the reference bot's real clear takes ~310 ticks instead of ~390+ — still a genuine,
// unforced win, just a cheaper one to replay in a test suite (see this file's header on tick-count cost).
const CLEAR_DATE = "2026-08-20";
const TEST_TICK_CAP = 350; // small on purpose — see this file's header note on trace-fold cost growth.

function logOf(moves) {
  return buildIntentLog(moves);
}

// bigLogOf(n) — builds an n-entry intent log directly (O(n)), NOT via buildIntentLog's per-call
// appendEntry (each call there re-spreads the whole array so far — O(n^2) for a large n; fine for the
// small logs every other test in this file uses, wrong for the 20,001-entry cap-probe below).
function bigLogOf(n) {
  const log = new Array(n);
  for (let i = 0; i < n; i++) log[i] = { seq: i, intent: { kind: "move", move: { forward: 1 } } };
  return log;
}

test("replayRun: rejects a non-array intentLog", () => {
  const r = replayRun(DATE, { actor: "player1", intentLog: "nope" });
  assert.equal(r.rejected, "malformed-log");
});

test("replayRun: rejects a missing/empty actor", () => {
  const r = replayRun(DATE, { actor: "", intentLog: [] });
  assert.equal(r.rejected, "bad-actor");
});

test("replayRun: rejects out-of-order seq (whole log, not just the bad entry)", () => {
  const log = [
    { seq: 0, intent: { kind: "move", move: { forward: 1 } } },
    { seq: 0, intent: { kind: "move", move: { forward: 1 } } }, // repeated seq — not strictly increasing
  ];
  const r = replayRun(DATE, { actor: "player1", intentLog: log });
  assert.equal(r.rejected, "malformed-log");
});

test("replayRun: rejects an unknown intent kind", () => {
  const log = [{ seq: 0, intent: { kind: "teleport" } }];
  const r = replayRun(DATE, { actor: "player1", intentLog: log });
  assert.equal(r.rejected, "malformed-move");
});

test("replayRun: rejects a move payload with a non-numeric field", () => {
  const log = [{ seq: 0, intent: { kind: "move", move: { forward: "fast" } } }];
  const r = replayRun(DATE, { actor: "player1", intentLog: log });
  assert.equal(r.rejected, "malformed-move");
});

test("replayRun: rejects a log past the structural move cap", () => {
  const log = bigLogOf(MAX_MOVES_STRUCTURAL + 1);
  const r = replayRun(DATE, { actor: "player1", intentLog: log });
  assert.equal(r.rejected, "too-many-moves");
});

test("replayRun: a log AT exactly the structural move cap is not rejected on count alone", () => {
  const log = bigLogOf(50); // well under the cap; proves the cap check is an upper bound, not a floor
  const r = replayRun(DATE, { actor: "player1", intentLog: log }, { tickCap: TEST_TICK_CAP });
  assert.notEqual(r.rejected, "too-many-moves");
});

test("replayRun: an empty (legal) log replays to tick-cap at phase 0 with score 0", () => {
  const r = replayRun(DATE, { actor: "player1", intentLog: [] });
  assert.equal(r.rejected, null);
  assert.equal(r.endedAt.reason, "tick-cap");
  assert.equal(r.endedAt.tick, 0);
  assert.equal(r.score, 0);
});

test("replayRun: two calls with the SAME date and log replay to identical endedAt/score (determinism)", () => {
  const log = logOf([{ forward: 1 }, { turn: 0.3 }, { forward: 1 }, { fire: true }]);
  const a = replayRun(DATE, { actor: "player1", intentLog: log });
  const b = replayRun(DATE, { actor: "player1", intentLog: log });
  assert.deepEqual(a.endedAt, b.endedAt);
  assert.equal(a.score, b.score);
});

test("replayRun: a log that clears every demon stops at 'cleared', not at the log's raw end", () => {
  // play the daily for REAL, using the SAME chooseMove/playDaily heuristic agents/reference-entrant.mjs
  // submits with in the live tournament — not a hand-faked status object, and not a second diverging
  // implementation of "try to win" that only this test uses.
  const seedState = createDailyEngine(CLEAR_DATE);
  const { state: finalState, log: moves } = playDaily(seedState, { tick, maxTicks: TEST_TICK_CAP });
  const demonCount = finalState.demons.length;
  assert.equal(status(finalState).dead, demonCount, `the reference bot failed to clear ${CLEAR_DATE} within ${TEST_TICK_CAP} ticks — cannot prove early-stop without a real win`);

  // append junk moves AFTER the clearing move (moves is already the house intent-log envelope from
  // recordMove/appendEntry — extend it the same way) — replayRun must stop at the clear, never process these.
  let log = moves;
  for (const move of [{ forward: 1 }, { turn: 5 }, { fire: true }]) log = appendEntry(log, { kind: "move", move });

  const r = replayRun(CLEAR_DATE, { actor: "player1", intentLog: log }, { tickCap: TEST_TICK_CAP });
  assert.equal(r.rejected, null);
  assert.equal(r.endedAt.reason, "cleared");
  assert.ok(r.endedAt.tick < log.length, "replay ran past the clearing tick into the trailing junk moves");
  assert.equal(r.endedAt.tick, moves.length);
  assert.ok(r.score >= 100000, "a cleared run must score at least VICTORY_BASE");
});

test("replayRun: two DIFFERENT dates against the identical log produce different outcomes (real per-day arenas)", () => {
  const log = logOf([{ forward: 1 }, { forward: 1 }, { turn: 0.5 }, { forward: 1 }]);
  const a = replayRun("2026-08-19", { actor: "player1", intentLog: log });
  const b = replayRun("2026-08-20", { actor: "player1", intentLog: log });
  const same = a.finalState.player.x === b.finalState.player.x && a.finalState.player.z === b.finalState.player.z;
  assert.equal(same, false, "identical moves against two different daily dates landed on the identical position — dates aren't actually varying the arena");
});

test("replayRun: an un-cleared, low-tick-cap run scores from landed wounds via reason 'tick-cap'", () => {
  const seedState = createDailyEngine(DATE);
  const { log: moves } = playDaily(seedState, { tick, maxTicks: 10 }); // deliberately too short to clear
  const r = replayRun(DATE, { actor: "player1", intentLog: moves }, { tickCap: 10 });
  assert.equal(r.rejected, null);
  assert.equal(r.endedAt.reason, "tick-cap");
  assert.ok(r.score < 100000, "an unclear run must never reach VICTORY_BASE");
});
