import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUNGEON, floorSpec, biomeAt, difficultyAt } from "./dungeon.mts";

test("floor generation is deterministic in (seed, depth)", () => {
  const a = floorSpec(DEFAULT_DUNGEON, 17);
  const b = floorSpec(DEFAULT_DUNGEON, 17);
  assert.deepEqual(a, b);
});

test("the same dungeon differs between depths", () => {
  const a = floorSpec(DEFAULT_DUNGEON, 3);
  const b = floorSpec(DEFAULT_DUNGEON, 4);
  assert.notDeepEqual(a, b);
});

test("a different seed yields a different cave", () => {
  // Compare the full descent over several floors — two seeds will differ somewhere
  // (monster pick, hazard, or trickster), even where a single floor's pool is small.
  const a = Array.from({ length: 12 }, (_, i) => floorSpec(DEFAULT_DUNGEON, i + 1));
  const b = Array.from({ length: 12 }, (_, i) => floorSpec({ ...DEFAULT_DUNGEON, seed: "another-cave" }, i + 1));
  assert.notDeepEqual(a, b);
});

test("difficulty and rewards climb with depth", () => {
  assert.ok(difficultyAt(DEFAULT_DUNGEON, 20) > difficultyAt(DEFAULT_DUNGEON, 1));
  const deep = floorSpec(DEFAULT_DUNGEON, 40);
  const shallow = floorSpec(DEFAULT_DUNGEON, 2);
  assert.ok(deep.monster.hp > shallow.monster.hp);
  assert.ok(deep.essenceReward > shallow.essenceReward);
});

test("biomes advance as you descend", () => {
  assert.equal(biomeAt(DEFAULT_DUNGEON, 1).id, "threshold");
  assert.notEqual(biomeAt(DEFAULT_DUNGEON, 50).id, "threshold");
});

test("monsters always have at least 1 hp and 1 atk", () => {
  for (let d = 1; d <= 80; d++) {
    const f = floorSpec(DEFAULT_DUNGEON, d);
    assert.ok(f.monster.hp >= 1 && f.monster.atk >= 1, `floor ${d}`);
    assert.ok(f.essenceReward >= 1);
  }
});
