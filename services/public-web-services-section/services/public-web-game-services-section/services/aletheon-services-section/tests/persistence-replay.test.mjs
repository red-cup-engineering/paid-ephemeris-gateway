// persistence-replay — the save/load round trip through store.mjs's own EAVT fold (`replay`),
// the mechanism BOTH persistence backends (local WORLD_LOG file and the new GCS bucket log-store)
// ultimately share: both just hand `replay()` a list of rows read back off disk/bucket. This file
// tests that fold directly, against the real local-file write path (`rowsFromLog`/`replayFromLog`,
// unchanged plumbing), so it also stands as the regression test for the two real bugs this pass
// found and fixed in `replay()` itself — see the assertions below for what each one exposed.

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createWorld, spawn, replayFromLog } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tryAttack, corrupt } from "../server/world/combat.mjs";
import { KIND, COMBAT } from "../shared/constants.mjs";

async function tmpLogPath() {
  const dir = await mkdtemp(join(tmpdir(), "aletheon-replay-"));
  return { dir, path: join(dir, "world.jsonl") };
}

test("replay round trip: a fresh, un-fought world restores id-for-id, byte-for-byte on the fields it owns", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));

  const world = createWorld({ logPath: path });
  seedWorld(world);

  const restored = replayFromLog(path);

  assert.equal(restored.entities.size, world.entities.size);
  for (const [id, e] of world.entities) {
    const r = restored.entities.get(id);
    assert.ok(r, `entity ${id} missing after replay`);
    assert.equal(r.kind, e.kind, `${id}.kind`);
    // BUG #1 this test would have caught: replay() used to hardcode name:kind and hp/maxHp:1 for
    // every entity, so anything that had never taken a "vitality" row (i.e. anything that hasn't
    // been hit yet — true of the whole freshly-seeded world here) replayed with the WRONG name
    // and a broken 1hp cap instead of its real one. Fixed by riding name/maxHp/hostile on the
    // "spawned" row itself (store.spawn()).
    assert.equal(r.name, e.name, `${id}.name`);
    assert.equal(r.maxHp, e.maxHp, `${id}.maxHp`);
    assert.equal(r.hp, e.hp, `${id}.hp`);
    assert.equal(r.hostile, e.hostile, `${id}.hostile`);
    assert.equal(r.state, e.state, `${id}.state`);
    assert.equal(r.x, e.x, `${id}.x`);
    assert.equal(r.z, e.z, `${id}.z`);
  }
});

test("replay round trip: combat damage, a kill, and a raise (⊤ anomaly) all survive", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));

  const world = createWorld({ logPath: path });
  seedWorld(world);

  const brigand = [...world.entities.values()].find((e) => e.kind === KIND.brigand && e.hostile);
  assert.ok(brigand);
  const player = spawn(world, { kind: "player", name: "restorer", x: brigand.x, z: brigand.z, maxHp: COMBAT.playerMaxHp });

  // beat the brigand down to a kill, then raise it — exercising "vitality", "killed", and "raised" rows.
  let guard = 0;
  while (brigand.state !== "dead" && guard++ < 20) {
    player.lastAttackAt = 0; // bypass the ATTACKER's wall-clock cooldown (tryAttack gates on it, not the target's)
    tryAttack(world, player.id, brigand.id);
  }
  assert.equal(brigand.state, "dead", "test setup: expected the brigand to actually die");
  corrupt(world, brigand);
  assert.equal(brigand.state, "anomaly", "test setup: expected the brigand to actually rise ⊤");

  const restored = replayFromLog(path);
  const r = restored.entities.get(brigand.id);
  assert.ok(r, "the corrupted brigand must exist after replay");

  // BUG #2 this test would have caught: replay()'s "raised" handling used to only touch hp,
  // leaving kind/hostile/name at their stale pre-corruption values — a replayed Anomaly that
  // still read (and behaved, per ticking.mjs's nearestEnemy/spreadCorruption kind checks) as an
  // ordinary peaceful-by-default brigand. Fixed by mirroring combat.corrupt()'s full mutation.
  assert.equal(r.kind, KIND.anomaly, "kind must become anomaly, mirroring combat.corrupt()");
  assert.equal(r.hostile, true, "a raised Anomaly must be hostile");
  assert.ok(r.name.startsWith("Corrupted "), `expected the "Corrupted " name prefix, got ${r.name}`);
  assert.equal(r.state, "anomaly");
  assert.equal(r.hp, brigand.hp);
  assert.equal(r.maxHp, brigand.maxHp);
});

test("replay round trip: nextId is restored past every id in the trace — no post-restore id collision", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));

  const world = createWorld({ logPath: path });
  seedWorld(world);
  const preExistingIds = new Set(world.entities.keys());

  const restored = replayFromLog(path);
  // BUG #3 this test would have caught: replay() used to leave nextId at its fresh default (1),
  // so a spawn AFTER a restore would mint an id ALREADY held by a replayed entity, and
  // `world.entities.set(id, e)` would silently overwrite (not append) the older record.
  const fresh = spawn(restored, { kind: "critter", name: "Newcomer", x: 0, z: 0, maxHp: 10 });
  assert.ok(!preExistingIds.has(fresh.id), `newly spawned id ${fresh.id} collided with a restored entity`);
  assert.equal(restored.entities.size, preExistingIds.size + 1, "the collision would have made this size stay flat, not grow");
});

test("replay round trip: a corpse mid-tick (killed but not yet raised) also survives", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));

  const world = createWorld({ logPath: path });
  seedWorld(world);
  const critter = [...world.entities.values()].find((e) => e.kind === KIND.critter);
  const player = spawn(world, { kind: "player", name: "slayer", x: critter.x, z: critter.z, maxHp: COMBAT.playerMaxHp });
  let guard = 0;
  while (critter.state !== "dead" && guard++ < 10) {
    player.lastAttackAt = 0; // the attacker's cooldown, not the target's
    tryAttack(world, player.id, critter.id);
  }
  assert.equal(critter.state, "dead");

  const restored = replayFromLog(path);
  const r = restored.entities.get(critter.id);
  assert.equal(r.killed, true);
  assert.equal(r.raised, false);
  assert.equal(r.state, "dead");
  assert.equal(r.hp, 0);
});

test("honest gap, asserted rather than assumed: marks and inventory are NOT recorded on the trace, so they do not survive a replay", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));

  const world = createWorld({ logPath: path });
  seedWorld(world);
  const brigand = [...world.entities.values()].find((e) => e.kind === KIND.brigand && e.hostile);
  const player = spawn(world, { kind: "player", name: "looter", x: brigand.x, z: brigand.z, maxHp: COMBAT.playerMaxHp });
  let guard = 0;
  while (brigand.state !== "dead" && guard++ < 20) {
    player.lastAttackAt = 0; // the attacker's cooldown, not the target's
    tryAttack(world, player.id, brigand.id);
  }
  assert.ok(player.marks > 0, "test setup: the kill should have minted marks onto the slayer");

  const restored = replayFromLog(path);
  const r = restored.entities.get(player.id);
  // This is a real, pre-existing gap (marks/inventory mutations never call store.append at all —
  // see combat.mjs/trade.mjs/powers.mjs/claims.mjs/dispute.mjs), not something this pass could fix
  // without redesigning several subsystems' write paths. Asserted here so it's a documented,
  // enforced fact rather than a silent surprise in production.
  assert.equal(r.marks, 0, "marks are not restored by replay — a real, documented gap (see README)");
  assert.deepEqual(r.inventory, [], "inventory is not restored by replay — a real, documented gap (see README)");
});
