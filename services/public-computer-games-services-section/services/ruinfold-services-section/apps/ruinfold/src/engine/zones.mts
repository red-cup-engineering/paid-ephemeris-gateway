// zones — places, and the linear portals between them. Ported from legacy engine/zones.mjs,
// collapsed to the daily's single linear floor chain (design §1.3: no branching for v0) and
// stripped of the trace-write plumbing (world.mts's header explains why). A zone is a square
// ground (half-extent `bound`) with a spawn point and `exits` by cardinal direction; moving
// through a portal is just reassigning `zoneId`/`pos`.

import type { World } from "#engine/world.mts";
import { view, freshEntity, addEntity } from "#engine/world.mts";
import { asserted, unknown } from "#engine/bilattice.mts";
import { statsForLevel } from "#engine/progression.mts";

const GATE = "the-gate";

export interface SpawnResult {
  spawned: boolean; // true only on the actor's FIRST join this run
}

// spawnPlayer — stand a NEW player up at the gate. Idempotent by design: a repeated "join" intent
// (duplicate, replay noise) is a no-op, never a free reset-to-full-health-and-position — the daily
// is permadeath, so "rejoin refreshes you" (legacy's MMO behaviour) would be an exploit here.
export function spawnPlayer(world: World, playerId: string): SpawnResult {
  if (world.entities.has(playerId)) return { spawned: false };

  const me = freshEntity(playerId, "player", playerId);
  const base = statsForLevel(1);
  me.level = 1;
  me.xp = 0;
  me.gold = 0;
  me.maxHealth = base.maxHealth;
  me.attackPower = base.attackPower;
  me.armor = 0;
  me.maxStamina = 20;
  me.stamina = 20;
  me.health = me.maxHealth;
  me.status = "up";
  me.form = "flesh";
  me.alive = asserted();
  me.human = unknown(); // untouched — the lycanthropy curse (§3.3) is the only thing that ever sets this

  const gate = world.zones.get(GATE)!;
  me.zoneId = GATE;
  me.pos = { ...gate.spawn };
  me.homeX = gate.spawn.x;
  me.homeZ = gate.spawn.z;

  addEntity(world, me);
  return { spawned: true };
}

export interface PortalResult {
  moved: boolean;
  to?: string;
}

// portal — traverse the subject's current zone's exit in `dir` ("north" deeper, "south" back).
// No-ops (impossible move, not an error) if there is no exit that way — the same "the engine
// already no-ops it" contract the replay contract (design §2.2) relies on.
export function portal(world: World, subjectId: string, dir: "north" | "south"): PortalResult {
  const me = view(world, subjectId);
  if (!me || !me.zoneId) return { moved: false };
  const from = world.zones.get(me.zoneId);
  if (!from) return { moved: false };
  const dest = from.exits[dir];
  if (!dest) return { moved: false };
  const to = world.zones.get(dest);
  if (!to) return { moved: false };

  me.zoneId = dest;
  me.pos = { ...to.spawn };
  return { moved: true, to: dest };
}
