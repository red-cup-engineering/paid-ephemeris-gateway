// determinism — the concrete proof obligation the design imposes (§2.3): build the same daily
// twice from the same seed, replay the same move-log against both, assert the two final states
// are byte-identical and the two computed scores are equal. Every run, no tolerance — this is the
// property the whole anti-cheat argument rests on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySeed } from "#engine/daily.mts";
import { buildDaily } from "#engine/dungeon.mts";
import { replay } from "#engine/run.mts";
import type { RunLog } from "#engine/run.mts";

const ACTOR = "wanderer-w1vxpa";

function snapshot(world: ReturnType<typeof buildDaily>): string {
  // A stable, order-independent serialization of everything that matters for equality: zones,
  // entities (sorted by id), and the run stats. Map iteration order is insertion order in both
  // builds since buildDaily is a pure function of seed alone, but we sort explicitly anyway so
  // the assertion doesn't quietly depend on that.
  const zones = [...world.zones.entries()].sort(([a], [b]) => a.localeCompare(b));
  const entities = [...world.entities.entries()].sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({ seed: world.seed, floorCount: world.floorCount, bossId: world.bossId, relicItemId: world.relicItemId, hazard: world.hazard, zones, entities, stats: world.stats, tick: world.tick });
}

function fixtureLog(seed: number, moves: RunLog["moves"]): RunLog {
  return { schema: "ruinfold-run/1", date: "2026-08-19", seed, actor: ACTOR, mode: "scored", moves };
}

test("same seed, same log, twice -> byte-identical final state and equal score", () => {
  const seed = dailySeed("2026-08-19");
  const moves: RunLog["moves"] = [
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
    { tick: 2, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
    { tick: 3, seq: 0, intent: { kind: "portal", actor: ACTOR, dir: "north" } },
    { tick: 4, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "e" } },
    { tick: 5, seq: 0, intent: { kind: "attack", actor: ACTOR, target: "goblin-does-not-exist" } },
  ];

  const r1 = replay(seed, fixtureLog(seed, moves));
  const r2 = replay(seed, fixtureLog(seed, moves));
  assert.equal(r1.rejected, null);
  assert.equal(r2.rejected, null);
  if (r1.rejected || r2.rejected) throw new Error("unreachable");

  assert.equal(snapshot(r1.world), snapshot(r2.world));
  assert.equal(r1.score, r2.score);
  assert.deepEqual(r1.endedAt, r2.endedAt);
});

test("buildDaily(seed) is itself byte-identical across calls", () => {
  const seed = dailySeed("2026-08-20");
  const a = buildDaily(seed);
  const b = buildDaily(seed);
  assert.equal(snapshot(a), snapshot(b));
});

test("different seeds produce different worlds", () => {
  const a = buildDaily(dailySeed("2026-08-19"));
  const b = buildDaily(dailySeed("2026-08-20"));
  assert.notEqual(snapshot(a), snapshot(b));
});
