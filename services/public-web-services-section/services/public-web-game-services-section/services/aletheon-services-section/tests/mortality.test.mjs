// mortality — combat as EVIDENCE, unit-focused (no seeded world, no persistence — that round trip
// is persistence-replay.test.mjs's job). This file pins the semantics value.mjs/combat.mjs's own
// header comments claim: damage is negative evidence on an `alive` cell, death is the kernel
// settling that cell to f, and corpse-revival (combat.corrupt) re-asserts positive evidence onto an
// already-slain cell so joinKnowledge yields ⊤ — the creature does not die again, it rises Corrupted.

import assert from "node:assert/strict";
import { test } from "node:test";

import { createWorld, spawn, get } from "../server/world/store.mjs";
import { tryAttack, damage, heal, corrupt } from "../server/world/combat.mjs";
import { vital, reading, isAlive, isDead, isAnomaly } from "../server/world/value.mjs";
import { KIND, COMBAT } from "../shared/constants.mjs";

// --- value.mjs: the bare evidence-fold, isolated from any world/tick machinery -------------------

test("vital: no evidence at all reads ⊥ (unknown) — an unspawned/untouched cell", () => {
  const charge = vital({ hp: 0, killed: false, raised: false });
  assert.equal(reading(charge).state, "unknown");
  assert.equal(reading(charge).glyph, "⊥");
});

test("vital: positive evidence only (hp > 0) reads t (alive)", () => {
  const charge = vital({ hp: 10, killed: false, raised: false });
  assert.equal(reading(charge).state, "alive");
  assert.ok(isAlive(charge));
  assert.ok(!isDead(charge));
  assert.ok(!isAnomaly(charge));
});

test("vital: negative evidence only (killed, hp <= 0) reads f (dead)", () => {
  const charge = vital({ hp: 0, killed: true, raised: false });
  assert.equal(reading(charge).state, "dead");
  assert.ok(isDead(charge));
  assert.ok(!isAlive(charge));
});

test("vital: killed=true is NEVER retracted by a later positive hp reading in the SAME fold — once " +
     "negative evidence is in the inputs, a positive hp alongside it settles to ⊤, not back to t", () => {
  // this is the load-bearing asymmetry: corpse-revival is exactly this shape (raised re-asserts the
  // positive face onto a cell whose killed=true never goes away).
  const charge = vital({ hp: 25, killed: true, raised: false });
  // raised is false here, but killed:true + hp>0 both fold in (vital ORs in "alive" whenever hp>0,
  // independent of raised) — the kernel joins both faces and the verdict is ⊤, not t.
  assert.equal(reading(charge).state, "anomaly");
  assert.ok(isAnomaly(charge));
});

test("vital: killed AND raised together read ⊤ (anomaly) — the exact corpse-revival shape", () => {
  const charge = vital({ hp: 30, killed: true, raised: true });
  assert.equal(reading(charge).glyph, "⊤");
  assert.equal(reading(charge).state, "anomaly");
});

// --- combat.mjs: the world-level evidence writer/reader ------------------------------------------

function freshWorld() {
  const world = createWorld();
  return world;
}

test("damage: accumulates negative evidence — hp falls, state stays alive above zero", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 20 });

  const out = damage(world, attacker, target, 9);
  assert.equal(out, "hit");
  assert.equal(target.hp, 11);
  assert.equal(target.state, "alive");
  assert.equal(target.killed, false);
});

test("damage: hp driven to <= 0 settles the cell to f (dead), exactly once (killed latches)", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 10 });

  const out = damage(world, attacker, target, 15); // overkill — hp should clamp to 0, not go negative
  assert.equal(out, "slain");
  assert.equal(target.hp, 0);
  assert.equal(target.killed, true);
  assert.equal(target.state, "dead");
  assert.ok(target.diedTick >= 0);
  assert.ok(target.corpseUntil > target.diedTick);

  // further damage to an already-dead target does not re-fire the "slain" transition. Note: hp
  // itself is only clamped to 0 on the transition INTO death (the `!t.killed` branch) — a hit that
  // lands on an already-dead corpse keeps subtracting unclamped (a minor, harmless quirk since the
  // kernel verdict is evidence-based, not hp-based: `state` stays "dead" regardless of the number).
  damage(world, attacker, target, 5);
  assert.equal(target.hp, -5, "hp is NOT re-clamped on a hit that lands after death (documented quirk)");
  assert.equal(target.state, "dead", "still dead — not re-killed, not un-killed, whatever hp reads");
});

test("damage: a player's kill converts the slain creature's vitality into MARKS on the slayer " +
     "(conserved — the count is not invented), one mark per ~3 maxHp plus any marks the slain " +
     "creature already carried", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 12 });
  target.marks = 2; // the slain cell's own condensed marks — must be inherited, not dropped

  damage(world, attacker, target, 999);
  assert.equal(target.state, "dead");
  const expected = Math.max(1, Math.round(12 / 3)) + 2;
  assert.equal(attacker.marks, expected);
});

test("damage: a NON-player attacker's kill mints no marks (only players condense marks from a kill)", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.brigand, name: "npc-attacker", x: 0, z: 0, maxHp: 30, hostile: true });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 10 });
  damage(world, attacker, target, 999);
  assert.equal(target.state, "dead");
  assert.equal(attacker.marks, 0);
});

test("heal: the dead are not healed — heal() is a deliberate no-op once killed is true " +
     "(you are raised, not mended)", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 10 });
  damage(world, attacker, target, 999);
  assert.equal(target.state, "dead");
  heal(world, target, 100);
  assert.equal(target.hp, 0, "a dead creature's hp must not move under heal()");
  assert.equal(target.state, "dead");
});

test("heal: a living creature's hp rises, capped at maxHp, and the cell re-settles (stays alive)", () => {
  const world = freshWorld();
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 20 });
  target.hp = 5;
  heal(world, target, 100);
  assert.equal(target.hp, 20, "heal must clamp to maxHp, never overshoot");
  assert.equal(target.state, "alive");
});

test("corrupt: RAISES a slain creature — re-asserting life onto an already-dead cell settles it to " +
     "⊤ (a Corrupted Anomaly), never back to plain t", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 20 });
  damage(world, attacker, target, 999);
  assert.equal(target.state, "dead");

  const ok = corrupt(world, target);
  assert.equal(ok, true);
  assert.equal(target.state, "anomaly");
  assert.equal(target.kind, KIND.anomaly);
  assert.equal(target.hostile, true);
  assert.ok(target.name.startsWith("Corrupted "), `expected the "Corrupted " prefix, got ${target.name}`);
  assert.equal(target.hp, Math.max(1, Math.round(20 * 0.6)));
  assert.equal(target.maxHp, target.hp);
  assert.equal(target.corpseUntil, 0, "a raised Anomaly is no longer a lingering corpse");
});

test("corrupt: refuses to raise a creature that was never killed", () => {
  const world = freshWorld();
  const alive = spawn(world, { kind: KIND.critter, name: "alive", x: 0, z: 0, maxHp: 10 });
  const ok = corrupt(world, alive);
  assert.equal(ok, false);
  assert.equal(alive.state, "alive", "an untouched living creature must not be silently raised");
});

test("corrupt: is idempotent — raising an already-raised creature a second time is a no-op, not a " +
     "double-corruption", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 20 });
  damage(world, attacker, target, 999);
  assert.equal(corrupt(world, target), true);
  const hpAfterFirstRaise = target.hp;
  const secondAttempt = corrupt(world, target);
  assert.equal(secondAttempt, false, "corrupt() must refuse a creature that is already raised");
  assert.equal(target.hp, hpAfterFirstRaise, "a refused second raise must not touch hp again");
});

// --- tryAttack: the authoritative, server-side-gated entry point ---------------------------------

test("tryAttack: enforces the attacker's cooldown, range, and refuses attacking the dead/self", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "attacker", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const near = spawn(world, { kind: KIND.critter, name: "near", x: 0.5, z: 0, maxHp: 20 });
  const far = spawn(world, { kind: KIND.critter, name: "far", x: 500, z: 500, maxHp: 20 });

  attacker.lastAttackAt = Date.now(); // just swung — inside cooldown
  assert.equal(tryAttack(world, attacker.id, near.id), "cooldown");

  attacker.lastAttackAt = 0;
  assert.equal(tryAttack(world, attacker.id, far.id), "out-of-range");

  attacker.lastAttackAt = 0;
  assert.equal(tryAttack(world, attacker.id, attacker.id), "swing", "attacking yourself is a harmless swing");

  attacker.lastAttackAt = 0;
  damage(world, attacker, near, 999);
  assert.equal(near.state, "dead");
  attacker.lastAttackAt = 0;
  assert.equal(tryAttack(world, attacker.id, near.id), "swing", "attacking a corpse lands no further damage");
});

test("tryAttack: a dead attacker cannot swing at all", () => {
  const world = freshWorld();
  const attacker = spawn(world, { kind: KIND.player, name: "corpse", x: 0, z: 0, maxHp: COMBAT.playerMaxHp });
  const target = spawn(world, { kind: KIND.critter, name: "target", x: 0, z: 0, maxHp: 10 });
  attacker.state = "dead";
  assert.equal(tryAttack(world, attacker.id, target.id), "blocked");
});
