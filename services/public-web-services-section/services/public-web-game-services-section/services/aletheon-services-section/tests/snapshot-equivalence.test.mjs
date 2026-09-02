// snapshot-equivalence — proves snapshot.mjs's compaction claim: replaying the FULL historical
// EAVT log and replaying a COMPACTED snapshot + only the rows appended after it must fold, via
// the same store.replay(), to state HASHES that agree on every field a restore preserves (see
// stateHash() below for exactly which fields, and why NPC x/y/z and all yaw are excluded — both
// real, documented, pre-existing gaps, not something compaction introduces). Three worlds
// compared: `live` (ground truth, never replayed), `fullReplay` (store.replay() over the entire
// trace — today's boot path pre-compaction), `snapshotPlusTail` (replay over snapshotRows()
// taken partway through + the rows appended after — the real compacted-boot path).

import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { createWorld, spawn, replay } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";
import { tryAttack, corrupt } from "../server/world/combat.mjs";
import { snapshotRows, encodeSnapshotRows, decodeSnapshotRows } from "../server/world/snapshot.mjs";
import { KIND, COMBAT } from "../shared/constants.mjs";

/**
 * Hash the fields a restore (full-log OR snapshot+tail) is supposed to preserve, and nothing
 * else. Sorted by id first so entity insertion order (which can legitimately differ between a
 * from-scratch replay and the live Map) never affects the hash.
 * @param {object} world A live or replayed game world (`createWorld()`/`replay()` shape).
 * @returns {string} A sha256 hex digest of the comparable state.
 */
function stateHash(world) {
  const rows = [...world.entities.values()]
    .map((e) => {
      const isPlayer = e.kind === KIND.player;
      return {
        id: e.id, kind: e.kind, name: e.name,
        // x/y/z: STRICT only for players (stepPlayer still journals every tick a player moves).
        // NPC position is excluded here — ticking.mjs's NPC_DURABLE_MOVE_TICKS (2026-09-02 fix)
        // durable-writes an NPC position at most once per 60s, so a replay can legitimately lag
        // live by up to that window; see tests/npc-move-durability.test.mjs for the cadence's own
        // proof. round2 matches the SAME rounding append(..., "moved", ...) applies on write.
        // yaw is excluded for all kinds: bumpMoved/stepPlayer only fire on x/z change, so a
        // spinning-in-place "resonance" entity's yaw never lands on the trace (pre-existing,
        // cosmetic-only gap, confirmed by direct live-world diff before this test existed).
        x: isPlayer ? round2(e.x) : null, y: isPlayer ? round2(e.y) : null, z: isPlayer ? round2(e.z) : null,
        hp: e.hp, maxHp: e.maxHp,
        killed: e.killed, raised: e.raised, hostile: e.hostile, state: e.state,
        bornTick: e.bornTick,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
function round2(n) { return typeof n === "number" ? Math.round(n * 100) / 100 : n; }


test("snapshot+tail replay produces the IDENTICAL state hash as full-log replay (not just 'looks right')", () => {
  const fullLog = [];
  const world = createWorld({ onAppend: (r) => fullLog.push(r) });
  seedWorld(world);

  // real combat before the snapshot point: a kill AND a raise (⊤ Anomaly), the two mutations
  // replay()'s fold treats specially — if compaction's snapshot rows got either wrong, this is
  // exactly the case that would catch it (persistence-replay.test.mjs proves the same for
  // full-log replay alone; this test is the same proof extended across a compaction boundary).
  const victim = [...world.entities.values()].find((e) => e.kind === KIND.brigand && e.hostile);
  const player = spawn(world, { kind: "player", name: "equivalence-tester", x: victim.x, z: victim.z, maxHp: COMBAT.playerMaxHp });
  let guard = 0;
  while (victim.state !== "dead" && guard++ < 30) { player.lastAttackAt = 0; tryAttack(world, player.id, victim.id); }
  assert.equal(victim.state, "dead", "setup: the victim must actually die before the snapshot point");
  corrupt(world, victim);
  assert.equal(victim.state, "anomaly", "setup: the victim must actually rise as an Anomaly before the snapshot point");

  // idle ticking before the snapshot point too, so compaction is exercised against a world that
  // has genuinely moved, not just spawned.
  for (let i = 0; i < 150; i++) tick(world);

  // THE SNAPSHOT POINT — everything above is what compaction is allowed to throw away wholesale;
  // everything below is what a real tail would still carry.
  const snapshotPointLen = fullLog.length;
  const snap = snapshotRows(world);

  // round-trip the snapshot through its own wire encoding too (encodeSnapshotRows/
  // decodeSnapshotRows) — the actual bucket path never hands replay() in-memory objects
  // directly, it hands it whatever survived a real jsonl round trip.
  const snapViaWire = decodeSnapshotRows(encodeSnapshotRows(snap));
  assert.deepEqual(snapViaWire, snap, "snapshot rows must round-trip the jsonl wire encoding losslessly");

  // more real activity AFTER the snapshot point: more idle ticking, plus a second kill, so the
  // tail itself carries genuine new history, not just more of the same.
  for (let i = 0; i < 150; i++) tick(world);
  const victim2 = [...world.entities.values()].find((e) => e.kind === KIND.critter && e.state === "alive");
  if (victim2) {
    const p2 = spawn(world, { kind: "player", name: "equivalence-tester-2", x: victim2.x, z: victim2.z, maxHp: COMBAT.playerMaxHp });
    let guard2 = 0;
    while (victim2.state !== "dead" && guard2++ < 30) { p2.lastAttackAt = 0; tryAttack(world, p2.id, victim2.id); }
  }
  for (let i = 0; i < 100; i++) tick(world);

  const tail = fullLog.slice(snapshotPointLen);
  assert.ok(tail.length > 0, "setup: the tail must carry at least some post-snapshot activity");
  assert.ok(snapshotPointLen > 0, "setup: there must be real pre-snapshot history to compact away");

  const live = world;
  const fullReplay = replay(fullLog);
  const snapshotPlusTail = replay([...snapViaWire, ...tail]);

  const liveHash = stateHash(live);
  const fullReplayHash = stateHash(fullReplay);
  const snapshotPlusTailHash = stateHash(snapshotPlusTail);

  assert.equal(fullReplay.entities.size, live.entities.size, "full-log replay must restore the same entity COUNT as the live world");
  assert.equal(snapshotPlusTail.entities.size, live.entities.size, "snapshot+tail replay must restore the same entity COUNT as the live world");

  assert.equal(fullReplayHash, liveHash, "full-log replay must hash IDENTICAL to the live world it was replayed from");
  assert.equal(
    snapshotPlusTailHash, fullReplayHash,
    "snapshot+tail replay must hash IDENTICAL to full-log replay — this is the whole equivalence claim compaction depends on",
  );

  // and the compaction actually shrank something, not a vacuous pass (a threshold of "always
  // compact everything down to nothing meaningful" would trivially "match" an empty world).
  assert.ok(
    snap.length < snapshotPointLen,
    `snapshot (${snap.length} rows) should be smaller than the history it replaces (${snapshotPointLen} rows) — otherwise compaction isn't compacting`,
  );
});

test("snapshot+tail replay is identical even when the tail alone contains a NEW entity's entire lifecycle (spawn, death, raise)", () => {
  // The narrower, adversarial case: an entity that exists ONLY in the tail (never appears in the
  // snapshot at all) must still fold correctly when the tail is replayed on top of an unrelated
  // snapshot — this is the ordinary "someone joins after a compaction" case in production.
  const fullLog = [];
  const world = createWorld({ onAppend: (r) => fullLog.push(r) });
  seedWorld(world);
  for (let i = 0; i < 60; i++) tick(world);

  const snapshotPointLen = fullLog.length;
  const snap = snapshotRows(world);

  const newcomer = spawn(world, { kind: "brigand", name: "Tail-Only Brigand", x: 3, z: 3, maxHp: 20, hostile: true });
  const hero = spawn(world, { kind: "player", name: "tail-only-hero", x: 3, z: 3, maxHp: COMBAT.playerMaxHp });
  let guard = 0;
  while (newcomer.state !== "dead" && guard++ < 30) { hero.lastAttackAt = 0; tryAttack(world, hero.id, newcomer.id); }
  assert.equal(newcomer.state, "dead");
  corrupt(world, newcomer);
  assert.equal(newcomer.state, "anomaly");
  for (let i = 0; i < 40; i++) tick(world);

  const tail = fullLog.slice(snapshotPointLen);
  const fullReplay = replay(fullLog);
  const snapshotPlusTail = replay([...snap, ...tail]);

  assert.equal(stateHash(snapshotPlusTail), stateHash(fullReplay));
  assert.equal(stateHash(snapshotPlusTail), stateHash(world));

  const restoredNewcomer = snapshotPlusTail.entities.get(newcomer.id);
  assert.ok(restoredNewcomer, "a tail-only entity's full lifecycle must still restore");
  assert.equal(restoredNewcomer.kind, KIND.anomaly);
  assert.equal(restoredNewcomer.hostile, true);
});
