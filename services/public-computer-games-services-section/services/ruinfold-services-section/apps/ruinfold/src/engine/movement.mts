// movement — locomotion as scalar state advance, ported from legacy engine/movement.mjs. The
// server never does geometry: pos-x/pos-z on the ground plane, facing a yaw, clamped to the
// current zone's square bound. Click-to-move (setGoal/step) and WASD (nudge) both survive; only
// the trace-write plumbing is gone (direct field mutation replaces changing()).

import type { World } from "#engine/world.mts";
import { view, zoneOf, clamp } from "#engine/world.mts";

export const SPEED = 2; // world units per tick step

const DIRS: Record<string, { dx: number; dz: number }> = {
  n: { dx: 0, dz: -1 },
  s: { dx: 0, dz: 1 },
  e: { dx: 1, dz: 0 },
  w: { dx: -1, dz: 0 },
};

function boundOf(world: World, subjectId: string): number {
  return zoneOf(world, subjectId)?.bound ?? Infinity;
}

// nudge — a single WASD step of SPEED units in a cardinal direction.
export function nudge(world: World, subjectId: string, dir: string): { moved: boolean } {
  const d = DIRS[dir];
  const me = view(world, subjectId);
  if (!d || !me) return { moved: false };

  const b = boundOf(world, subjectId);
  me.pos = { x: clamp(me.pos.x + d.dx * SPEED, b), z: clamp(me.pos.z + d.dz * SPEED, b) };
  me.facing = Math.atan2(d.dz, d.dx);
  return { moved: true };
}

// setGoal + step — click-to-move: store a goal, advance toward it by at most SPEED per tick.
export function setGoal(world: World, subjectId: string, x: number, z: number): void {
  const me = view(world, subjectId);
  if (!me) return;
  const b = boundOf(world, subjectId);
  me.moveTargetX = clamp(x, b);
  me.moveTargetZ = clamp(z, b);
}

export function step(world: World, subjectId: string): { moved: boolean; arrived: boolean } {
  const me = view(world, subjectId);
  if (!me || me.moveTargetX == null || me.moveTargetZ == null) return { moved: false, arrived: false };

  const dx = me.moveTargetX - me.pos.x;
  const dz = me.moveTargetZ - me.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist === 0) return { moved: false, arrived: false };

  const b = boundOf(world, subjectId);
  me.facing = Math.atan2(dz, dx);

  if (dist <= SPEED) {
    me.pos = { x: clamp(me.moveTargetX, b), z: clamp(me.moveTargetZ, b) };
    return { moved: true, arrived: true };
  }
  me.pos = { x: clamp(me.pos.x + (dx / dist) * SPEED, b), z: clamp(me.pos.z + (dz / dist) * SPEED, b) };
  return { moved: true, arrived: false };
}
