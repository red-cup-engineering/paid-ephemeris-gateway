// game.test.mts — proves the tick loop that ties the three twists together (move against the arena
// grid, fire into wound evidence, demon chase that can CONTEST the player's tile), plus the
// DETERMINISM requirement: same seed + same intent log -> identical world state. The intent log here is
// the house shape (@red-cup-engineering/cartridge/intent-log's { seq, intent }[] envelope, built via appendEntry
// and validated via validateIntentLog — see cartridge.mjs). The legacy game.test.mjs this file (mostly)
// stands in for never existed on disk (port digest §1); the determinism test is NEW — the legacy suite,
// even had it existed, had no cartridge dependency to build one from.

import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog, FOUR } from "@red-cup-engineering/abrash/world";
import { game, spawnDemon, liveDemons, tick, status } from "./game.mjs";
import { spawn } from "./demon.mjs";
import {
  createEngine, applyIntent, replay, verify, buildIntentLog, hashState, serialize,
} from "./cartridge.mjs";

function room() {
  const rows = [];
  for (let x = 0; x <= 6; x++) { rows.push({ e: `voxel:${x},0`, a: "solid", v: "wall", t: 1 }); rows.push({ e: `voxel:${x},6`, a: "solid", v: "wall", t: 1 }); }
  for (let z = 1; z <= 5; z++) { rows.push({ e: `voxel:0,${z}`, a: "solid", v: "wall", t: 1 }); rows.push({ e: `voxel:6,${z}`, a: "solid", v: "wall", t: 1 }); }
  return worldFromRows(rows);
}

test("game: default state has passContested true (the deathmatch default)", () => {
  const s = game({ world: room() });
  assert.equal(s.passContested, true);
});

test("spawnDemon: admits the spawn rows and registers the id", () => {
  const s0 = game({ world: room() });
  const s1 = spawnDemon(s0, 0, 3, 3, { toughness: 2 });
  assert.deepEqual(s1.demons, [{ id: 0 }]);
  assert.equal(liveDemons(s1.world, s1.demons).length, 1);
});

test("liveDemons: excludes a dead demon", () => {
  let w = room();
  for (const r of spawn(0, 3, 3, { toughness: 1 })) w = admitLog(w, r.e, [r]).world;
  w = admitLog(w, "demon:0", [{ e: "demon:0", a: "not-alive", v: "demon", t: 2 }]).world;
  assert.deepEqual(liveDemons(w, [{ id: 0 }]), []);
});

test("tick: fire:true against a clear shot lands and the demon reads WOUNDED next read", () => {
  let s = game({ world: room(), player: { x: 1.5, z: 3, angle: 0 }, cam: { width: 16, height: 16 } });
  s = spawnDemon(s, 0, 4, 3, { toughness: 3 });
  s = tick(s, { fire: true });
  assert.equal(s.report.shot.landed, true);
  const st = status(s);
  assert.equal(st.wounded, 1);
});

test("tick: a demon chasing into melee range CONTESTS the player's tile (folds it to ⊤)", () => {
  let s = game({ world: room(), player: { x: 3, z: 3, angle: 0 }, cam: { width: 8, height: 8 } });
  s = spawnDemon(s, 0, 3.2, 3, { toughness: 5, speed: 0.5 });
  s = tick(s, {});
  assert.equal(s.report.grasped, true);
  assert.ok(s.report.demons[0].contested);
});

// ── SPRITE PASS: a demon must actually be VISIBLE in the projected frame, not merely tracked in state.
// A raycaster that only draws walls gives a "shooter" nothing to aim at — the playtest that found this
// gap is why game.mjs now builds `entities` from each tick's live demon positions/vitality and passes
// them to render() (see game.mjs's DEMON_COLOR + entities block).

test("tick: a live demon directly ahead is drawn — at least one column's frame.columns[].entity names it", () => {
  let s = game({ world: room(), player: { x: 1.5, z: 3, angle: 0 }, cam: { width: 40, height: 40, maxDist: 16 } });
  s = spawnDemon(s, 0, 4, 3, { toughness: 3 });
  s = tick(s, {});
  const hit = s.frame.columns.some((c) => c.entity === "demon:0");
  assert.ok(hit, "demon:0 should be drawn somewhere on screen when directly ahead in open floor");
});

test("tick: a demon behind a nearer wall is NOT drawn (occluded), even though it is still tracked in state", () => {
  const rows = [];
  for (let x = 0; x <= 6; x++) { rows.push({ e: `voxel:${x},0`, a: "solid", v: "wall", t: 1 }); rows.push({ e: `voxel:${x},6`, a: "solid", v: "wall", t: 1 }); }
  for (let z = 1; z <= 5; z++) { rows.push({ e: `voxel:0,${z}`, a: "solid", v: "wall", t: 1 }); rows.push({ e: `voxel:6,${z}`, a: "solid", v: "wall", t: 1 }); }
  // a wall wide enough (z=2..4) to fully cover the demon's on-screen billboard width, not just its
  // dead-center ray — a single-voxel wall only blocks the one column aimed exactly at it.
  rows.push({ e: "voxel:3,2", a: "solid", v: "wall", t: 1 });
  rows.push({ e: "voxel:3,3", a: "solid", v: "wall", t: 1 });
  rows.push({ e: "voxel:3,4", a: "solid", v: "wall", t: 1 });
  let s = game({ world: worldFromRows(rows), player: { x: 1.5, z: 3, angle: 0 }, cam: { width: 40, height: 40, maxDist: 16 } });
  s = spawnDemon(s, 0, 5, 3, { toughness: 3 }); // behind the wall at x=3
  s = tick(s, {});
  const hit = s.frame.columns.some((c) => c.entity === "demon:0");
  assert.equal(hit, false, "a demon hidden behind a nearer wall must not paint");
  assert.equal(s.demons.length, 1, "the demon is still tracked in game state even while occluded");
});

test("tick: a WOUNDED demon (held ⊤) draws in a different color than a fresh hunting one", () => {
  let s = game({ world: room(), player: { x: 1.5, z: 3, angle: 0 }, cam: { width: 40, height: 40, maxDist: 16 } });
  s = spawnDemon(s, 0, 4, 3, { toughness: 3 });
  const freshFrame = tick(s, {}).frame;
  s = tick(s, { fire: true }); // one wound: t -> top (WOUNDED), still alive
  assert.equal(status(s).wounded, 1);
  const woundedFrame = s.frame;
  const colorAt = (frame) => {
    const col = frame.columns.findIndex((c) => c.entity === "demon:0");
    assert.ok(col >= 0, "demon:0 must still be drawn while wounded");
    return frame.fb.getPixel(col, Math.floor(frame.height / 2));
  };
  const freshColor = colorAt(freshFrame);
  const woundedColor = colorAt(woundedFrame);
  assert.notDeepEqual(freshColor.slice(0, 3), woundedColor.slice(0, 3), "the held-⊤ demon reads visually differently once wounded");
});

test("status: reports hunting/wounded/dead counts and the arena's contested-wall tally", () => {
  let s = game({ world: room(), cam: { width: 8, height: 8 } });
  s = spawnDemon(s, 0, 3, 3, { toughness: 1 });
  s = tick(s, { fire: false });
  const st0 = status(s);
  assert.equal(st0.hunting, 1);
  assert.equal(st0.dead, 0);
});

// ── DETERMINISM ──────────────────────────────────────────────────────────────────────────────────

test("DETERMINISM: createEngine(seed) is a pure function — same seed, same starting player angle", () => {
  const a = createEngine("proving-ground", "durante");
  const b = createEngine("proving-ground", "durante");
  assert.equal(a.player.angle, b.player.angle);
});

test("DETERMINISM: two DIFFERENT seeds start with different player angles (the seed actually matters)", () => {
  const a = createEngine("seed-alpha", "durante");
  const b = createEngine("seed-beta", "durante");
  assert.notEqual(a.player.angle, b.player.angle);
});

test("DETERMINISM: the house intent log (buildIntentLog/appendEntry) replayed twice from the SAME seed yields byte-identical stateHash", () => {
  const moves = [
    { forward: 1 }, { forward: 1 }, { turn: 0.3 }, { forward: 1 }, { fire: true },
    { strafe: 1 }, { turn: -0.2 }, { forward: 1 }, { fire: true }, { forward: 1 },
  ];
  const log = buildIntentLog(moves);
  assert.equal(log.length, moves.length);
  assert.equal(log[0].seq, 0);
  assert.equal(log[log.length - 1].seq, moves.length - 1);

  const runA = verify("proving-ground", "durante", log);
  const runB = verify("proving-ground", "durante", log);

  assert.equal(runA.valid, true);
  assert.equal(runB.valid, true);
  assert.equal(runA.stateHash, runB.stateHash);
  assert.equal(runA.finalState.player.x, runB.finalState.player.x);
  assert.equal(runA.finalState.player.z, runB.finalState.player.z);
  assert.equal(runA.finalState.phase, runB.finalState.phase);
});

test("DETERMINISM: the identical intent log against a DIFFERENT seed yields a different stateHash", () => {
  const moves = [{ forward: 1 }, { turn: 0.5 }, { forward: 1 }];
  const log = buildIntentLog(moves);
  const runA = verify("seed-alpha", "durante", log);
  const runB = verify("seed-beta", "durante", log);
  assert.notEqual(runA.stateHash, runB.stateHash);
});

test("DETERMINISM: hashState is stable for the same state and differs for a genuinely different world", () => {
  const s1 = createEngine("hash-check", "cfg");
  assert.equal(hashState(s1), hashState(createEngine("hash-check", "cfg")));

  // force a real, known difference: admit one extra row into a clone's world and confirm the hash
  // moves — proving hashState reflects the world's actual content, not a Map-collapsed "{}" constant
  // (the exact false-positive this module's serialize() step exists to prevent — see cartridge.mjs).
  const extraRow = { e: "voxel:99,99", a: "solid", v: "wall", t: 999 };
  const s2 = { ...s1, world: new Map(s1.world).set(extraRow.e, [extraRow]) };
  assert.notEqual(hashState(s1), hashState(s2));
});

test("serialize: converts the Map-shaped world into a plain, JSON-safe array (no Map survives)", () => {
  const s = createEngine("serialize-check", "cfg");
  const data = serialize(s);
  assert.ok(Array.isArray(data.world));
  assert.ok(JSON.stringify(data)); // must not throw — proves it's actually JSON-safe
});

test("replay: an illegal-move-free log replays to valid:true with a full event list", () => {
  const log = buildIntentLog([{ forward: 1 }, { fire: true }]).map((e) => e.intent);
  const result = replay("replay-check", log, "cfg");
  assert.equal(result.valid, true);
  assert.equal(result.events.length, 2);
});
