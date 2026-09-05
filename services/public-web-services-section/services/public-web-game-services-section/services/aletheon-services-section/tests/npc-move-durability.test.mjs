// npc-move-durability — pins the fix for the 2026-09-02 cold-red-gate incident: local-mode
// WORLD_LOG grew to 8.3GB in ~36h because ticking.mjs's bumpMoved() filed a durable "moved" row
// for essentially every wandering/hunting NPC on essentially every 15Hz tick. bumpMoved() now
// durable-writes an NPC's position at most once per NPC_DURABLE_MOVE_TICKS (60s); this file proves
// that cadence holds under real idle ticking, that player movement stays unthrottled (real actions
// still journal every tick, per the receiver's brief), and that a restore off the throttled trace
// still recovers a sane, restart-ready world.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorld, spawn, replay } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";
import { KIND } from "../shared/constants.mjs";

test("NPC 'moved' rows durable-write at most once per 60s of sim time, not every tick", () => {
  const rows = [];
  const world = createWorld({ onAppend: (r) => rows.push(r) });
  seedWorld(world);
  const npcIds = new Set([...world.entities.values()].filter((e) => e.kind !== KIND.player).map((e) => e.id));

  const TICKS = 1800; // 120s of sim time at 15Hz — two full 60s durability windows
  for (let i = 0; i < TICKS; i++) tick(world);

  const movedCountByNpc = new Map();
  for (const r of rows) {
    if (r.a !== "moved" || !npcIds.has(r.e)) continue;
    movedCountByNpc.set(r.e, (movedCountByNpc.get(r.e) ?? 0) + 1);
  }

  assert.ok(movedCountByNpc.size > 0, "expected at least some NPCs to have wandered/hunted and been durably recorded");
  for (const [id, count] of movedCountByNpc) {
    assert.ok(
      count <= 3,
      `NPC ${id} durably wrote ${count} "moved" rows over ${TICKS} ticks (120s of sim time) — ` +
      `expected at most 1 per 60s window (a couple extra allowed for boundary rounding); a large ` +
      `count here is the old per-tick flood (up to 1800) that filled the cold-red-gate disk`,
    );
  }
});

test("player 'moved' rows stay durable-written every tick they actually move (unthrottled, unlike NPCs)", () => {
  const rows = [];
  const world = createWorld({ onAppend: (r) => rows.push(r) });
  const player = spawn(world, { kind: KIND.player, name: "tester", x: 0, z: 0, maxHp: 60 });
  player.input = { f: 1, s: 0, y: 0, a: 0 }; // walk forward every tick

  const TICKS = 30; // 2s — far under the NPC 60s durability cadence
  for (let i = 0; i < TICKS; i++) tick(world);

  const playerMoves = rows.filter((r) => r.e === player.id && r.a === "moved").length;
  assert.ok(
    playerMoves >= TICKS - 2,
    `expected the player's continuous walk to durably record a "moved" row nearly every tick ` +
    `(got ${playerMoves} over ${TICKS} ticks) — player movement must not be gated by the NPC cadence`,
  );
});

test("throttled NPC trace still restores a sane, fully-populated world (restart-restore is preserved)", () => {
  const rows = [];
  const world = createWorld({ onAppend: (r) => rows.push(r) });
  seedWorld(world);
  const TICKS = 300; // 20s — enough for every live NPC to file its first (immediate) durable "moved" row
  for (let i = 0; i < TICKS; i++) tick(world);

  const restored = replay(rows);
  assert.equal(restored.entities.size, world.entities.size, "restored population should match the live world");
  for (const e of restored.entities.values()) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.z), `${e.id} restored with a non-finite position`);
  }
});
