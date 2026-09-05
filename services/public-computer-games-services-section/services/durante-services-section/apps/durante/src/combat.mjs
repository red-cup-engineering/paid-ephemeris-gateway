// combat — the WEAPON, and the twist made kinetic: a shot's effect is not a subtracted hit-point, it is
// a ROW you append to the trace. The gun is HITSCAN — a single ray straight down the player's crosshair.
// If that ray reaches a living demon before a solid wall stops it, the shot LANDS, and a landing shot
// produces exactly one piece of evidence: `wound(demonId, t)` — a deny on that demon's `alive` cell. The
// caller folds that row into the world; the demon's vitality is then the FOLD of all such wounds (held ⊤
// while wounded, settled f when the wounds reach its toughness). Evidence is linear: every shot that
// lands is a witness kept.
//
// Pure: combat reads the arena grid + the live demons + the player and returns a SHOT REPORT (did it
// land, on whom, at what range, the wound rows to append). It appends nothing itself and reads no clock.
//
// Ported from the legacy 2026-08-17-vps-561-group archive's apps/games/durante/src/combat.mjs. The ONLY
// change: the abrash imports point at the published @red-cup-engineering/abrash package.

import { castRay } from "@red-cup-engineering/abrash/raycaster";
import { dir, v2 } from "@red-cup-engineering/abrash/math";
import { wound, positionOf, vitalityOf } from "./demon.mjs";

// hitDemon(player, demons, opts) — among the live demons, which one does the crosshair ray strike first,
// and at what range? A demon is a point with a radius on the floor plane; the ray hits it if the demon's
// center lies within `radius` of the ray line AND ahead of the player within `range`. We project each
// demon onto the ray and keep the nearest in-cone hit. Pure geometry over abrash's vec2 kernel.
// `demons` is a list of { id, x, z, radius }. Returns { id, dist } or null.
export function hitDemon(player, demons, opts = {}) {
  const range = opts.range ?? 24;
  const facing = dir(player.angle); // unit forward
  let best = null;
  for (const d of demons) {
    const radius = d.radius ?? 0.4;
    const rel = v2.sub([d.x, d.z], [player.x, player.z]);
    const along = v2.dot(rel, facing);          // distance ALONG the ray to the demon's projection
    if (along <= 0 || along > range) continue;   // behind the player, or out of range
    const proj = v2.scale(facing, along);
    const perp = v2.length(v2.sub(rel, proj));   // perpendicular miss distance from the ray line
    if (perp > radius) continue;                 // the ray misses this demon's body
    if (!best || along < best.dist) best = { id: d.id, dist: along };
  }
  return best;
}

// shoot(world, player, demonIds, t, opts) — fire the weapon for tick `t`. THE SEAM from intent to
// evidence: (1) read each live demon's floating position from the trace; (2) cast the crosshair ray
// through the arena grid to find the nearest WALL distance (a wall occludes a shot); (3) find the nearest
// demon the ray strikes; (4) if a demon is struck nearer than any wall, the shot LANDS and we return the
// `wound` row to append. Returns { fired, landed, demonId, dist, wallDist, rows } — `rows` is the
// evidence the caller folds (empty on a miss). Pure: appends nothing.
export function shoot(world, grid, player, demonIds, t, opts = {}) {
  // 1. the live demons, with their settled positions (skip dead/absent — you cannot wound a corpse).
  const demons = [];
  for (const id of demonIds) {
    const vit = vitalityOf(world, id);
    if (!vit.alive) continue;
    const pos = positionOf(world, id);
    if (pos) demons.push({ id, x: pos.x, z: pos.z, radius: opts.demonRadius ?? 0.4 });
  }

  // 2. how far until a wall stops the shot? Cast the crosshair ray (cameraX=0) through the grid.
  const facing = dir(player.angle);
  const wallHit = castRay(grid, player.x, player.z, facing[0], facing[1], opts.range ?? 24);
  const wallDist = wallHit.hit ? wallHit.dist : (opts.range ?? 24);

  // 3. the nearest demon the ray strikes.
  const struck = hitDemon(player, demons, opts);

  // 4. a shot lands only if a demon is struck BEFORE the wall (a wall occludes the bullet).
  if (struck && struck.dist <= wallDist) {
    return {
      fired: true, landed: true, demonId: struck.id, dist: struck.dist, wallDist,
      rows: [wound(struck.id, t)],
    };
  }
  return { fired: true, landed: false, demonId: null, dist: struck?.dist ?? null, wallDist, rows: [] };
}

export { wound };
