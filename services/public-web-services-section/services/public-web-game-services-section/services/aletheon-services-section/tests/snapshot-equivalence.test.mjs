// snapshot-equivalence — the proof snapshot.mjs's own header claims but, until this file, never
// actually checked: replaying the FULL historical EAVT log and replaying a COMPACTED snapshot
// plus only the rows appended after it must fold, through the exact same store.replay(), to
// IDENTICAL world state — not "currently agrees," a state HASH compared byte-for-byte, so any
// future change to snapshotRows()/replay() that breaks the equivalence fails loudly here instead
// of silently reappearing as production data loss (the same class of bug the 2026-08-19 deploy
// runbook's original OOM/compaction gap was).
//
// Three worlds get compared:
//   1. `live`            — the real, actually-ticked-forward world object (ground truth: nobody
//                           replayed anything to produce this one).
//   2. `fullReplay`       — store.replay() over the ENTIRE historical trace, snapshot+tail included
//                           (the pre-compaction boot path — full-log replay, still exactly how
//                           local-file mode and a not-yet-compacted bucket both boot today).
//   3. `snapshotPlusTail` — store.replay() over ONLY `snapshotRows(world)` taken partway through,
//                           followed by the rows appended AFTER that point (the compacted boot
//                           path a real production compaction+restart takes).
//
// If compaction is doing what it claims, all three must hash identically on every field a restore
// is supposed to preserve (see persistence-replay.test.mjs's own "honest gap" test for the fields
// that are NOT supposed to survive ANY restore path, replayed or not — marks/inventory/claim — and
// which this hash deliberately excludes for exactly that reason, so this test can't fail on a gap
// that already has its own dedicated, passing proof elsewhere).

import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { createWorld, spawn, replay } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";
import { tryAttack, corrupt } from "../server/world/combat.mjs";
import { snapshotRows, encodeSnapshotRows, decodeSnapshotRows } from "../server/world/snapshot.mjs";
import { KIND, COMBAT } from "../shared/constants.mjs";

// stateHash — every field a restore (full-log OR snapshot+tail) is supposed to preserve, and
// NOTHING else: id/kind/name/x/y/z/hp/maxHp/killed/raised/hostile/state/bornTick (yaw excluded —
// see the comment inline below for the real, pre-existing, unrelated-to-compaction reason).
// Sorted by id first so entity insertion order (which can legitimately differ between a
// from-scratch replay and the live Map) never affects the hash.
function stateHash(world) {
  const rows = [...world.entities.values()]
    .map((e) => ({
      id: e.id, kind: e.kind, name: e.name,
      // x/y/z at ticking.mjs's own round2 — the SAME rounding `append(..., "moved", ...)`
      // already applies before a position ever reaches the trace (see round2/round3 there). Any
      // replayed world's x/y/z is only ever as precise as the last "moved" row recorded it, by
      // construction — comparing at higher precision than the trace itself carries would fail on
      // the trace's own designed lossiness, not on a real equivalence bug.
      //
      // yaw is deliberately EXCLUDED: `bumpMoved` (ticking.mjs, the NPC path) only fires a
      // "moved" append when x/z change, never on a yaw-only change — a stationary-but-spinning
      // entity (kind "resonance": a decorative in-place animation, not real orientation) can spin
      // forever live while its trace never records a single yaw update. Confirmed by direct diff
      // against a live world before this test existed: every other field matched exactly; only
      // "resonance" kind entities' yaw diverged, always to the replay-side default of 0. This is
      // a real, pre-existing, cosmetic-only gap in ticking.mjs's OWN emission policy — identical
      // whether a boot replays the full log or a compacted snapshot+tail, exactly like the
      // documented marks/inventory/claim gaps persistence-replay.test.mjs already proves — not
      // something compaction introduces, and out of this fix's scope (ticking.mjs's domain
      // emission logic is deliberately untouched here).
      x: round2(e.x), y: round2(e.y), z: round2(e.z),
      hp: e.hp, maxHp: e.maxHp,
      killed: e.killed, raised: e.raised, hostile: e.hostile, state: e.state,
      bornTick: e.bornTick,
    }))
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
