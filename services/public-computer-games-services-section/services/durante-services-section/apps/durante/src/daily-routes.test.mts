// daily-routes.test.mts — the daily tournament's HTTP surface: GET /daily, POST /runs, GET
// /leaderboard/:date, GET /replay/:runId. One server per file (scratch data root — never the app's
// real apps/durante/data/), matching server.test.mts's own before/after pattern.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./server.mjs";
import { buildIntentLog } from "./cartridge.mjs";
import { dailySeed, hexSeed } from "./daily.mjs";
import { todayUTC, addDaysUTC } from "@red-cup-engineering/footing/dates";

let app;
let base;
let dataRoot;

before(async () => {
  dataRoot = mkdtempSync(join(tmpdir(), "durante-daily-routes-test-"));
  app = createApp(dataRoot);
  await new Promise((resolve) => app.listen(0, "127.0.0.1", () => resolve()));
  const addr = app.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => app.close(() => resolve()));
  rmSync(dataRoot, { recursive: true, force: true });
});

const TODAY = todayUTC();

function encodeMoves(moves) {
  return buildIntentLog(moves);
}

test("GET /daily (no ?date) returns today's date, a hex seed, and mode:scored — no positions/roster leaked", async () => {
  const res = await fetch(`${base}/daily`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.date, TODAY);
  assert.equal(body.mode, "scored");
  assert.match(body.seed, /^0x[0-9a-f]{8}$/);
  assert.equal(body.seed, hexSeed(dailySeed(TODAY)));
  assert.ok(body.floorBound >= 10 && body.floorBound <= 16, "floorBound (arena metadata) must be present and in range");
  assert.ok(body.demonCount >= 2 && body.demonCount <= 4, "demonCount (arena metadata) must be present and in range");
  assert.equal(body.demonSpawns, undefined, "GET /daily must never leak the demon roster");
  assert.equal(body.playerSpawn, undefined, "GET /daily must never leak player spawn position");
});

test("GET /daily?date=<past date> returns mode:practice", async () => {
  const past = addDaysUTC(TODAY, -1);
  const res = await fetch(`${base}/daily?date=${past}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.date, past);
  assert.equal(body.mode, "practice");
});

test("GET /daily?date=<future date> is rejected", async () => {
  const future = addDaysUTC(TODAY, 5);
  const res = await fetch(`${base}/daily?date=${future}`);
  assert.equal(res.status, 400);
});

test("GET /daily?date=<malformed> is rejected", async () => {
  const res = await fetch(`${base}/daily?date=not-a-date`);
  assert.equal(res.status, 400);
});

test("POST /runs: a legal empty log submits as scored, tick-cap, score 0", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "human-alice", entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mode, "scored");
  assert.equal(body.entrantKind, "human");
  assert.equal(body.endedAt.reason, "tick-cap");
  assert.equal(body.score, 0);
  assert.equal(body.leaderboardEligible, true); // score 0 is still non-null -> eligible
});

test("POST /runs: missing entrantKind is rejected", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "no-kind-actor", mode: "scored", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "bad-entrant-kind");
});

test("POST /runs: an unrecognized entrantKind (not human/agent) is rejected, never silently accepted", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "weird-actor", entrantKind: "robot", mode: "scored", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "bad-entrant-kind");
});

test("POST /runs: a scored attempt on the live date, then a SECOND scored attempt by the same actor, is 409'd (one-scored-attempt-per-day)", async () => {
  const actor = "lock-test-actor";
  const first = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor, entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(first.status, 200);
  const second = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor, entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(second.status, 409);
  assert.equal((await second.json()).rejected, "already-scored-today");
});

test("POST /runs: mode:'practice' on the live date is rejected (practice-not-allowed-on-live-date)", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "practice-live-actor", entrantKind: "human", mode: "practice", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "practice-not-allowed-on-live-date");
});

test("POST /runs: mode:'scored' on a past date is rejected (scored-only-valid-on-live-date)", async () => {
  const past = addDaysUTC(TODAY, -2);
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: past, actor: "scored-past-actor", entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "scored-only-valid-on-live-date");
});

test("POST /runs: practice on a past date DOES NOT consume the scored lock (practice runs freely, unlimited)", async () => {
  const past = addDaysUTC(TODAY, -3);
  const actor = "practice-actor";
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`${base}/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: past, actor, entrantKind: "human", mode: "practice", intentLog: [] }),
    });
    assert.equal(res.status, 200, `practice attempt ${i} should not be locked`);
  }
});

test("POST /runs: whole-log structural rejection on out-of-order (tick,seq) — no partial credit", async () => {
  const badLog = [
    { seq: 0, intent: { kind: "move", move: { forward: 1 } } },
    { seq: 0, intent: { kind: "move", move: { forward: 1 } } },
  ];
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "malformed-actor", entrantKind: "human", mode: "scored", intentLog: badLog }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "malformed-log");
});

test("POST /runs: a claimed seed that mismatches the canonical server-derived seed is rejected", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "seed-mismatch-actor", entrantKind: "human", mode: "scored", seed: "0xdeadbeef", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "seed-mismatch");
});

test("POST /runs: an unsafe actor id (path-injection shape) is rejected before it ever touches the store", async () => {
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "../../etc/passwd", entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).rejected, "bad-actor");
});

test("POST /runs: a body over MAX_BODY_BYTES is rejected with 413 before JSON.parse ever runs", async () => {
  const past = addDaysUTC(TODAY, -10); // a distinct date so this doesn't collide with the lock tests above
  const huge = "x".repeat(5 * 1024 * 1024);
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: past, actor: "huge-actor", entrantKind: "human", mode: "practice", intentLog: [], padding: huge }),
  });
  assert.equal(res.status, 413);
});

test("GET /leaderboard/:date: two scored runs on the SAME date rank honestly, labeling human and agent distinctly", async () => {
  const date = addDaysUTC(TODAY, -20);
  // both scored on a PAST date requires mode:"practice" per the live-date-only rule — so instead
  // submit both on TODAY (the live date), each a distinct actor, both scored.
  const human = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "leaderboard-human", entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  assert.equal(human.status, 200);
  const agent = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "leaderboard-agent", entrantKind: "agent", mode: "scored", intentLog: [] }),
  });
  assert.equal(agent.status, 200);

  const lb = await fetch(`${base}/leaderboard/${TODAY}`);
  assert.equal(lb.status, 200);
  const body = await lb.json();
  const humanEntry = body.entries.find((e) => e.actor === "leaderboard-human");
  const agentEntry = body.entries.find((e) => e.actor === "leaderboard-agent");
  assert.ok(humanEntry, "human entry must appear on the leaderboard");
  assert.ok(agentEntry, "agent entry must appear on the leaderboard");
  assert.equal(humanEntry.entrantKind, "human");
  assert.equal(agentEntry.entrantKind, "agent");
  assert.notEqual(humanEntry.entrantKind, agentEntry.entrantKind, "human and agent entries must never be conflated");
  void date;
});

test("GET /leaderboard/:date for a date with no scores returns an empty entries array, not an error", async () => {
  const empty = addDaysUTC(TODAY, -30);
  const res = await fetch(`${base}/leaderboard/${empty}`);
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).entries, []);
});

test("GET /replay/:runId returns the stored run, GET /replay/<bad-id> 404s", async () => {
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: TODAY, actor: "replay-actor", entrantKind: "human", mode: "scored", intentLog: [] }),
  });
  const { runId } = await submit.json();
  const replay = await fetch(`${base}/replay/${encodeURIComponent(runId)}`);
  assert.equal(replay.status, 200);
  const record = await replay.json();
  assert.equal(record.actor, "replay-actor");
  assert.equal(record.entrantKind, "human");

  const missing = await fetch(`${base}/replay/${TODAY}__nobody__not-a-real-id`);
  assert.equal(missing.status, 404);
});

test("full loop: fetch daily, build+submit a legal intent log via encodeRun, appears on the leaderboard", async () => {
  const dailyRes = await fetch(`${base}/daily`);
  const daily = await dailyRes.json();
  const { encodeRun } = await import("./run-recorder.mjs");
  const log = encodeMoves([{ forward: 1 }, { turn: 0.2 }]);
  const body = encodeRun({ date: daily.date, actor: "full-loop-actor", entrantKind: "agent", mode: daily.mode, intentLog: log, seed: daily.seed });
  const res = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200);
  const lb = await fetch(`${base}/leaderboard/${daily.date}`);
  const entries = (await lb.json()).entries;
  assert.ok(entries.some((e) => e.actor === "full-loop-actor"));
});
