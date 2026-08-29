// server-submit-flow — full HTTP end-to-end coverage of server.mts (build-report item 6): the
// submit -> verify -> leaderboard -> replay flow with fixture runs (one honest, one tampered), plus
// one-scored-run-per-day enforcement and the oversized-log/oversized-body abuse guards. Runs a real
// node:http server (createApp) on an ephemeral port against a scratch temp-dir store, so nothing
// here touches the real apps/ruinfold/data/ directory.
//
// Every fixture log here is intentionally tiny (join + one move) so it terminates at "tick-cap"
// within a couple of ticks — the point of these tests is the HTTP/storage contract, not exercising
// deep combat, which the engine's own test suite (determinism/dungeon/death-routes/fuzz/scoring)
// already covers exhaustively.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApp } from "../server.mts";
import { todayUTC } from "@red-cup-engineering/footing/dates";
import { MAX_LOG_MOVES } from "@red-cup-engineering/footing/guard";

let server: Server;
let base: string;
let dataDir: string;

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "ruinfold-http-"));
  server = createApp(dataDir);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dataDir, { recursive: true, force: true });
});

function honestMoves(actor: string) {
  return [
    { tick: 0, seq: 0, intent: { kind: "join", actor } },
    { tick: 1, seq: 0, intent: { kind: "move", actor, dir: "n" } },
  ];
}

test("GET /daily returns today's seed and metadata, scored", async () => {
  const r = await fetch(`${base}/daily`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.date, todayUTC());
  assert.match(body.seed, /^0x[0-9a-f]{8}$/);
  assert.ok(body.floorCount >= 4 && body.floorCount <= 7);
  assert.equal(body.mode, "scored");
});

test("GET /daily rejects a future date", async () => {
  const r = await fetch(`${base}/daily?date=2099-01-01`);
  assert.equal(r.status, 400);
});

test("full flow: submit an honest run -> verified score -> appears on the leaderboard -> replayable", async () => {
  const actor = "hero-honest";
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: honestMoves(actor) }),
  });
  assert.equal(submit.status, 200);
  const submitted = await submit.json();
  assert.equal(submitted.actor, actor);
  assert.equal(submitted.mode, "scored");
  assert.notEqual(submitted.score, null);
  assert.equal(submitted.leaderboardEligible, true);
  assert.ok(typeof submitted.runId === "string" && submitted.runId.length > 0);

  const date = todayUTC();
  const lb = await fetch(`${base}/leaderboard/${date}`);
  assert.equal(lb.status, 200);
  const board = await lb.json();
  assert.equal(board.date, date);
  const row = board.entries.find((e: { actor: string }) => e.actor === actor);
  assert.ok(row, "honest actor should appear on today's leaderboard");
  assert.equal(row.score, submitted.score);
  assert.equal(row.rank, 1); // sole entrant so far in this scratch store

  const replayRes = await fetch(`${base}/replay/${submitted.runId}`);
  assert.equal(replayRes.status, 200);
  const replayed = await replayRes.json();
  assert.equal(replayed.actor, actor);
  assert.deepEqual(replayed.moves, honestMoves(actor));
});

test("one-scored-run-per-player-per-daily is enforced: a second scored submission from the same actor is rejected", async () => {
  const actor = "hero-repeat";
  const first = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: honestMoves(actor) }),
  });
  assert.equal(first.status, 200);

  const second = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: honestMoves(actor) }),
  });
  assert.equal(second.status, 409);
  const body = await second.json();
  assert.equal(body.rejected, "already-scored-today");

  // and the leaderboard still shows exactly one row for this actor, not two
  const lb = await fetch(`${base}/leaderboard/${todayUTC()}`);
  const board = await lb.json();
  const rows = board.entries.filter((e: { actor: string }) => e.actor === actor);
  assert.equal(rows.length, 1);
});

test("a tampered (malformed-intent) log is rejected outright and never reaches the leaderboard", async () => {
  const actor = "hero-tampered";
  const tamperedMoves = [
    { tick: 0, seq: 0, intent: { kind: "join", actor } },
    { tick: 1, seq: 0, intent: { kind: "move", actor, dir: "north-by-northwest" } }, // not a valid dir
  ];
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: tamperedMoves }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "malformed-intent");

  const lb = await fetch(`${base}/leaderboard/${todayUTC()}`);
  const board = await lb.json();
  assert.equal(board.entries.some((e: { actor: string }) => e.actor === actor), false);

  // and the attempt was NOT consumed — a structurally invalid submission never locks the daily
  const retry = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: honestMoves(actor) }),
  });
  assert.equal(retry.status, 200);
});

test("a forged seed embedded in the submission is rejected as a seed mismatch", async () => {
  const actor = "hero-forged-seed";
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, seed: "0xdeadbeef", intentLog: honestMoves(actor) }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "seed-mismatch");
});

test("a practice submission against today's (live) date is rejected — practice is never allowed on the locked date", async () => {
  const actor = "hero-practice-today";
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, mode: "practice", intentLog: honestMoves(actor) }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "practice-not-allowed-on-live-date");
});

test("a 'scored' submission against an earlier (non-live) date is rejected — only today's daily is ever scored", async () => {
  const actor = "hero-scored-past";
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, date: "2026-01-01", mode: "scored", intentLog: honestMoves(actor) }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "scored-only-valid-on-live-date");
});

test("a practice submission against an earlier date is accepted but never touches the leaderboard", async () => {
  const actor = "hero-practice-past";
  const pastDate = "2026-01-01"; // earlier than any real "today" this suite runs under
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, date: pastDate, mode: "practice", intentLog: honestMoves(actor) }),
  });
  assert.equal(submit.status, 200);
  const body = await submit.json();
  assert.equal(body.mode, "practice");
  assert.equal(body.leaderboardEligible, false);

  const lb = await fetch(`${base}/leaderboard/${pastDate}`);
  const board = await lb.json();
  assert.equal(board.entries.length, 0);
});

test("an oversized move-log (too many moves) is rejected before replay runs", async () => {
  const actor = "hero-oversized";
  const moves = [{ tick: 0, seq: 0, intent: { kind: "join", actor } }];
  for (let i = 1; i <= MAX_LOG_MOVES + 1; i++) {
    moves.push({ tick: i, seq: 0, intent: { kind: "move", actor, dir: "n" } });
  }
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: moves }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "too-many-moves");
});

test("an oversized request body is rejected at the transport level (413)", async () => {
  const actor = "hero-huge-body";
  const padding = "x".repeat(5 * 1024 * 1024); // over MAX_BODY_BYTES (4MB)
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: actor, intentLog: honestMoves(actor), padding }),
  });
  assert.equal(submit.status, 413);
});

test("GET /boons/:player reports inactive for a player with no boon this week", async () => {
  const r = await fetch(`${base}/boons/nobody-special`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.active, false);
  assert.equal(body.boon, null);
});

test("GET /replay/:runId 404s for an unknown run id", async () => {
  const r = await fetch(`${base}/replay/2026-01-01__nobody__00000000-0000-0000-0000-000000000000`);
  assert.equal(r.status, 404);
});

test("a submission missing an actor id is rejected", async () => {
  const submit = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intentLog: honestMoves("whoever") }),
  });
  assert.equal(submit.status, 400);
  const body = await submit.json();
  assert.equal(body.rejected, "bad-actor");
});
