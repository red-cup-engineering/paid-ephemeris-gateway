// dungeon — generation snapshot + the presence invariant design §1.3 requires: every daily seats
// at least one of each of mortal/undead/construct/cursed on a floor before the last, and exactly
// one named boss on the final floor. Never a coin-flip absence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySeed } from "#engine/daily.mts";
import { buildDaily } from "#engine/dungeon.mts";
import type { DeathRule } from "#engine/bilattice.mts";

test("a fixed seed always yields the same floor count, boss id, and monster roster", () => {
  const seed = dailySeed("2026-08-19");
  const world = buildDaily(seed);

  // Pin the concrete shape for THIS seed so any future change to the generator's call order is
  // caught as a snapshot break, not a silent drift.
  assert.equal(world.floorCount, 6);
  assert.equal(world.bossId, "keep-warden-boss");
  assert.equal(world.relicItemId, "heart-of-the-hollow-relic");
  assert.ok(world.hazard);
  assert.equal(world.hazard?.zoneId, "floor-3");
  assert.deepEqual(world.hazard?.pos, { x: 9, z: -9 });
});

test("the-gate hub is fixed regardless of seed", () => {
  const a = buildDaily(dailySeed("2026-08-19"));
  const b = buildDaily(dailySeed("2099-01-01"));
  assert.deepEqual(a.zones.get("the-gate"), b.zones.get("the-gate"));
});

test("floor count is always in [4, 7]", () => {
  for (const date of ["2026-08-19", "2026-08-20", "2026-08-21", "2026-09-01", "2027-03-15", "2030-12-31"]) {
    const world = buildDaily(dailySeed(date));
    assert.ok(world.floorCount >= 4 && world.floorCount <= 7, `floorCount ${world.floorCount} out of range for ${date}`);
  }
});

test("every daily seats all five death-rules: four monster rules before the last floor, one named boss on the last", () => {
  for (const date of ["2026-08-19", "2026-08-20", "2026-08-21", "2026-09-01", "2027-03-15", "2030-12-31", "1999-01-01", "2050-06-30"]) {
    const world = buildDaily(dailySeed(date));
    const lastFloor = world.floorCount;

    const rulesBeforeLast = new Set<DeathRule>();
    let namedOnLast = 0;
    for (const e of world.entities.values()) {
      if (e.kind !== "monster" || !e.deathRule || !e.zoneId) continue;
      const zone = world.zones.get(e.zoneId);
      if (!zone) continue;
      if (zone.floorIndex > 0 && zone.floorIndex < lastFloor) rulesBeforeLast.add(e.deathRule);
      if (zone.floorIndex === lastFloor && e.deathRule === "named") namedOnLast += 1;
    }

    for (const rule of ["mortal", "undead", "construct", "cursed"] as DeathRule[]) {
      assert.ok(rulesBeforeLast.has(rule), `date ${date}: missing death-rule "${rule}" before the last floor`);
    }
    assert.equal(namedOnLast, 1, `date ${date}: expected exactly one named boss on the final floor, got ${namedOnLast}`);
  }
});

test("relic and hazard are each placed exactly once, on a floor before the last", () => {
  for (const date of ["2026-08-19", "2026-08-20", "2027-03-15"]) {
    const world = buildDaily(dailySeed(date));
    const relics = [...world.entities.values()].filter((e) => e.archetypeId === "heart-of-the-hollow");
    assert.equal(relics.length, 1, `date ${date}: expected exactly one relic instance`);
    const relicZone = relics[0]?.zoneId ? world.zones.get(relics[0].zoneId as string) : undefined;
    assert.ok(relicZone && relicZone.floorIndex > 0 && relicZone.floorIndex < world.floorCount);

    assert.ok(world.hazard);
    const hazardZone = world.zones.get(world.hazard!.zoneId);
    assert.ok(hazardZone && hazardZone.floorIndex > 0 && hazardZone.floorIndex < world.floorCount);
  }
});
