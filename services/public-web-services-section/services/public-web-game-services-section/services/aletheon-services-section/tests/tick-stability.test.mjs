// tick-stability — the world runs itself with zero player input (Director-less here, but the
// same "does it keep advancing without falling over" question the Farstone stability test asks).
// Aletheon's tick is cheap (a few dozen entities, no fold-replay-exactness contract to prove — see
// README for why this suite doesn't claim byte-exact replay determinism the way Farstone's does:
// ticking.mjs uses Math.random() directly for NPC wander headings/corruption rolls, unseeded, by
// design), so this drives several thousand real ticks by hand (step()) and asserts the world stays
// internally sane throughout: no exceptions, no NaN/Infinity leaking into position or vitals, the
// bounded in-memory trace actually stays bounded, and the population doesn't runaway or vanish.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGameServer } from "../server/app.mjs";

const TICKS = 3000; // ≈ 200s of sim time at 15Hz — cheap to run, long enough to exercise ecology/corruption/reaping

test("tick-stability: 3000 unattended ticks, zero player input, no crash, no NaN, trace stays bounded", () => {
  const { world, step } = createGameServer({ root: null, seed: true });
  const startCount = world.entities.size;

  for (let i = 0; i < TICKS; i++) {
    assert.doesNotThrow(() => step(), `step() threw on tick ${i + 1}`);
  }

  assert.equal(world.tick, TICKS);
  assert.ok(world.journal.length <= 4000, `journal should stay bounded (TRACE_CAP), got ${world.journal.length}`);

  let checked = 0;
  for (const e of world.entities.values()) {
    checked++;
    for (const field of ["x", "y", "z", "yaw", "hp", "maxHp"]) {
      const v = e[field];
      assert.ok(Number.isFinite(v), `entity ${e.id}.${field} is not finite: ${v}`);
    }
    assert.ok(e.hp >= 0, `entity ${e.id} has negative hp: ${e.hp}`);
    assert.ok(["unknown", "alive", "dead", "anomaly"].includes(e.state), `entity ${e.id} has an unrecognized state: ${e.state}`);
  }
  assert.ok(checked > 0, "expected a non-empty world to still exist after 3000 ticks");

  // the φ-paced ecology (thermo.mjs) caps critters at TIDE.critterCap; corruption/combat only
  // ever happens between NPCs here (no player), so the world shouldn't have silently emptied out.
  assert.ok(world.entities.size > 0, "world entirely depopulated after 3000 unattended ticks");
  assert.ok(world.entities.size < startCount * 5, `entity count exploded: ${startCount} -> ${world.entities.size}`);
});

test("tick-stability: a second independent 3000-tick run also survives (not a one-off seed)", () => {
  const { world, step } = createGameServer({ root: null, seed: true });
  for (let i = 0; i < TICKS; i++) step();
  assert.equal(world.tick, TICKS);
  assert.ok(world.entities.size > 0);
});
