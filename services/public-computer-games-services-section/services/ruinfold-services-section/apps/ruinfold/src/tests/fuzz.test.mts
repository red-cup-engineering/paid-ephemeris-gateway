// fuzz — 1000 random but STRUCTURALLY LEGAL intents (every one shaped exactly the way
// intents.mts's validate() accepts, so the log is never rejected outright) driven through a full
// replay(), asserting the engine never throws and the final state stays internally consistent: no
// negative health, no player levitating outside its zone's bound, inventory/equip slots always
// pointing at real, currently-carried items, and the run always reaches SOME terminal endedAt
// reason. The fuzz's own randomness comes from mulberry32 (a seeded generator LOCAL to this test
// file, not the engine) so a failing run is byte-reproducible by fixing the fuzz seed — the engine
// itself never calls Math.random()/Date.now(), per the task's hard constraint.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32, pick, intBetween } from "#engine/prng.mts";
import { dailySeed } from "#engine/daily.mts";
import { buildDaily } from "#engine/dungeon.mts";
import { replay } from "#engine/run.mts";
import type { RunLog } from "#engine/run.mts";
import type { Intent } from "#engine/intents.mts";

const ACTOR = "fuzzer";

function randomIntent(rng: () => number, world: ReturnType<typeof buildDaily>): Intent {
  const kinds = ["move", "move", "move", "portal", "attack", "ability", "pickup", "drop", "equip", "unequip"] as const;
  const kind = pick(rng, kinds);
  const ids = [...world.entities.keys()];
  const someId = () => (ids.length ? pick(rng, ids) : "nothing");

  switch (kind) {
    case "move":
      return { kind: "move", actor: ACTOR, dir: pick(rng, ["n", "s", "e", "w"] as const) };
    case "portal":
      return { kind: "portal", actor: ACTOR, dir: pick(rng, ["north", "south"] as const) };
    case "attack":
      return { kind: "attack", actor: ACTOR, target: someId() };
    case "ability":
      return { kind: "ability", actor: ACTOR, ability: pick(rng, ["heavy", "cleave", "bolt", "second-wind"] as const), target: rng() < 0.5 ? someId() : null };
    case "pickup":
      return { kind: "pickup", actor: ACTOR, item: someId() };
    case "drop":
      return { kind: "drop", actor: ACTOR, item: someId() };
    case "equip":
      return { kind: "equip", actor: ACTOR, item: someId() };
    case "unequip":
      return { kind: "unequip", actor: ACTOR, slot: pick(rng, ["weapon", "armor", "trinket"] as const) };
  }
}

test("1000 random legal intents never corrupt state and always reach a terminal outcome", () => {
  const fuzzSeed = 0xf00dcafe;
  const rng = mulberry32(fuzzSeed);
  const seed = dailySeed("2026-08-19");
  const worldForIds = buildDaily(seed); // read-only, just to harvest plausible target ids

  const moves: RunLog["moves"] = [{ tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } }];
  let tick = 1;
  for (let i = 0; i < 1000; i++) {
    const gap = intBetween(rng, 1, 2); // strictly increasing ticks, one intent per tick
    tick += gap;
    moves.push({ tick, seq: 0, intent: randomIntent(rng, worldForIds) });
  }

  const log: RunLog = { schema: "ruinfold-run/1", date: "2026-08-19", seed, actor: ACTOR, mode: "scored", moves };

  assert.doesNotThrow(() => {
    const result = replay(seed, log);
    assert.equal(result.rejected, null, `fuzz log unexpectedly rejected: ${JSON.stringify((result as { rejected: string }).rejected)}`);
    if (result.rejected) return;

    assert.ok(["cleared", "mortal-death", "voided", "tick-cap"].includes(result.endedAt.reason));

    for (const e of result.world.entities.values()) {
      assert.ok(e.health >= 0, `entity ${e.id} has negative health`);
      assert.ok(e.health <= e.maxHealth || e.maxHealth === 0, `entity ${e.id} health exceeds max`);
      if (e.zoneId) {
        const zone = result.world.zones.get(e.zoneId);
        assert.ok(zone, `entity ${e.id} sits in an unknown zone ${e.zoneId}`);
        if (zone) {
          assert.ok(Math.abs(e.pos.x) <= zone.bound + 1e-9, `entity ${e.id} escaped its zone bound on x`);
          assert.ok(Math.abs(e.pos.z) <= zone.bound + 1e-9, `entity ${e.id} escaped its zone bound on z`);
        }
      }
      // every equipped slot must point at an item actually in this entity's own inventory
      for (const slotId of Object.values(e.equipped)) {
        if (!slotId) continue;
        assert.ok(e.inventory.includes(slotId), `entity ${e.id} has ${slotId} equipped but not carried`);
        const item = result.world.entities.get(slotId);
        assert.ok(item && item.carriedBy === e.id, `equipped item ${slotId} is not actually carried by ${e.id}`);
      }
      // every carried item must be carried by exactly the entity that lists it
      for (const itemId of e.inventory) {
        const item = result.world.entities.get(itemId);
        assert.ok(item, `${e.id} carries a nonexistent item ${itemId}`);
        if (item) assert.equal(item.carriedBy, e.id, `${itemId} thinks it's carried by someone else`);
      }
    }
  });
});

test("the fuzz is itself deterministic: same fuzz seed -> byte-identical generated log and outcome", () => {
  function runOnce() {
    const rng = mulberry32(0xf00dcafe);
    const seed = dailySeed("2026-08-19");
    const worldForIds = buildDaily(seed);
    const moves: RunLog["moves"] = [{ tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } }];
    let tick = 1;
    for (let i = 0; i < 200; i++) {
      tick += intBetween(rng, 1, 2);
      moves.push({ tick, seq: 0, intent: randomIntent(rng, worldForIds) });
    }
    const log: RunLog = { schema: "ruinfold-run/1", date: "2026-08-19", seed, actor: ACTOR, mode: "scored", moves };
    return replay(seed, log);
  }

  const a = runOnce();
  const b = runOnce();
  assert.deepEqual(a, b);
});
