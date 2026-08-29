// The Unwitnessed — anomaly #1: moves ONLY when unobserved. The behavior contract a player learns by
// watching it: look at it, it is still; look away, it closes distance. Position is the anomaly's
// FUNCTIONAL trace face (`at`, latest-t wins — one anomaly occupies one cell), matching demon.mjs's own
// vitality-as-fold template's position half exactly. There is no health/wound fold here: this anomaly
// is not a combat target in v1 (a disclosed scope choice — see the service README's "what v1 cuts"),
// it is a pure evasion puzzle, so its ENTIRE state is "where is it" plus the LOS read that decides
// whether this tick's chase step is allowed to happen at all.
//
// THE MECHANISM, stated plainly because it is also the whole test: "raycast observation is free" is
// made LITERAL here — the same geometry combat.mjs proves cheap (a ray, a wall-occlusion distance
// check, a field-of-view cone) decides visibility every tick, and if the player currently sees the
// anomaly, this tick's behavior returns NO row at all. Not a zeroed step, not a suppressed move: simply
// nothing appended. A functional `at` cell's value is exactly its last-filed row, so "no row this tick"
// IS "the position did not change" — the mechanic falls directly out of the fold, not a special case
// bolted beside it.

import { predicate, frontier, settleOpts } from "@red-cup-engineering/abrash/world";
import { castRay } from "@red-cup-engineering/abrash/raycaster";
import { dir, v2 } from "@red-cup-engineering/abrash/math";

export const subjectKey = (id: string): string => `anomaly:unwitnessed:${id}`;

export interface Vec2 {
  x: number;
  z: number;
}

export function spawn(id: string, x: number, z: number, opts: { speed?: number } = {}) {
  const s = subjectKey(id);
  const speed = opts.speed ?? 0.09;
  return [
    predicate(s, "kind", "unwitnessed", 0),
    predicate(s, "at", `${x},${z}`, 0),
    predicate(s, "speed", String(speed), 0),
  ];
}

const OPTS = settleOpts({ functional: new Set(["at", "speed"]) });

function objOf(folded: { fiber: { predicate: string; object: string }[] }, predicateName: string): string | null {
  const cell = folded.fiber.find((c) => c.predicate === predicateName);
  return cell ? cell.object : null;
}

export function positionOf(world: unknown, id: string): Vec2 | null {
  const folded = frontier(world, subjectKey(id), OPTS);
  const v = objOf(folded, "at");
  if (!v) return null;
  const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(v);
  return m ? { x: Number(m[1]), z: Number(m[2]) } : null;
}

export function speedOf(world: unknown, id: string): number {
  const folded = frontier(world, subjectKey(id), OPTS);
  const v = objOf(folded, "speed");
  return v != null ? Number(v) : 0.09;
}

/** isObserved(grid, player, target, opts) — is `target` currently inside the player's view cone AND
 *  not occluded by a wall? Pure geometry: a field-of-view half-angle check (default matching a
 *  reasonable player FOV) plus abrash's real `castRay` for occlusion, exactly the "cast a ray to check
 *  a wall doesn't sit between the two points" combat.mjs already proves cheap. `grid` is an abrash
 *  grid (or raw world — castRay only needs the `.at(x,z)` reader abrash's own grid provides). */
export function isObserved(
  grid: Parameters<typeof castRay>[0],
  player: { x: number; z: number; angle: number; fov?: number },
  target: Vec2,
  opts: { maxDist?: number } = {},
): boolean {
  const maxDist = opts.maxDist ?? 24;
  const facing = dir(player.angle);
  const rel = v2.sub([target.x, target.z], [player.x, player.z]);
  const dist = v2.length(rel);
  if (dist < 1e-6) return true; // standing on top of it
  if (dist > maxDist) return false;
  const relDir = v2.normalize(rel);
  const cosAngle = v2.dot(facing, relDir);
  const halfFov = (player.fov ?? Math.PI / 3) / 2;
  if (cosAngle < Math.cos(halfFov)) return false; // outside the view cone
  const hit = castRay(grid, player.x, player.z, relDir[0], relDir[1], dist);
  if (hit.hit && hit.dist < dist - 1e-6) return false; // a wall sits between the player and the target
  return true;
}

function chaseStep(from: Vec2, to: Vec2, speed: number): Vec2 {
  const d = v2.normalize(v2.sub([to.x, to.z], [from.x, from.z]));
  return { x: from.x + d[0] * speed, z: from.z + d[1] * speed };
}

/** decideStep(world, id, player, grid, t, opts) — this tick's behavior, in the `unit.behavior` shape
 *  abrash's own `engine.runUnit` expects: return the rows to append (possibly empty). Empty EXACTLY
 *  when the player currently observes the anomaly — see the file header. */
export function decideStep(
  world: unknown,
  id: string,
  player: { x: number; z: number; angle: number; fov?: number },
  grid: Parameters<typeof castRay>[0],
  t: number,
) {
  const pos = positionOf(world, id);
  if (!pos) return [];
  if (isObserved(grid, player, pos, {})) return []; // watched: no row, no movement.
  const speed = speedOf(world, id);
  const next = chaseStep(pos, player, speed);
  return [predicate(subjectKey(id), "at", `${next.x},${next.z}`, t)];
}
