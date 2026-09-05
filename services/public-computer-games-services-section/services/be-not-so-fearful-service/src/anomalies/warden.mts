// The Warden — anomaly #3: territorial, bound to a pre-authored rectangle. Fully deterministic
// geometric containment, no hidden aggro fuzz: hostile exactly while the player is inside the rect
// (expanded outward by a small hysteresis margin on the way OUT only, so standing on the boundary line
// doesn't flicker hostile/patrol every tick), returns to patrol the instant the player is truly clear.
// The "bait it to the doorway" contract falls out of this directly: lure it toward the rect's edge, step
// back past the margin, and it turns around — no timer, no random chance, just geometry.

import { predicate, frontier, settleOpts } from "@red-cup-engineering/abrash/world";

export const subjectKey = (id: string): string => `anomaly:warden:${id}`;

export interface Rect {
  x: number;
  z: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export function spawn(id: string, rect: Rect, patrolPos: Vec2) {
  const s = subjectKey(id);
  return [
    predicate(s, "kind", "warden", 0),
    predicate(s, "at", `${patrolPos.x},${patrolPos.z}`, 0),
    predicate(s, "rect", `${rect.x},${rect.z},${rect.w},${rect.h}`, 0),
    predicate(s, "hostile", "false", 0),
  ];
}

const OPTS = settleOpts({ functional: new Set(["at", "rect", "hostile"]) });

function objOf(folded: { fiber: { predicate: string; object: string }[] }, predicateName: string): string | null {
  const cell = folded.fiber.find((c) => c.predicate === predicateName);
  return cell ? cell.object : null;
}

export function rectOf(world: unknown, id: string): Rect | null {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "rect");
  if (!v) return null;
  const [x, z, w, h] = v.split(",").map(Number);
  return { x, z, w, h };
}

export function positionOf(world: unknown, id: string): Vec2 | null {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "at");
  if (!v) return null;
  const [x, z] = v.split(",").map(Number);
  return { x, z };
}

export function isHostile(world: unknown, id: string): boolean {
  return objOf(frontier(world, subjectKey(id), OPTS), "hostile") === "true";
}

const EXIT_MARGIN = 1.5; // cells of hysteresis: the rect the player must clear to become non-hostile

function insideRect(rect: Rect, pos: Vec2, margin: number): boolean {
  return pos.x >= rect.x - margin && pos.x < rect.x + rect.w + margin && pos.z >= rect.z - margin && pos.z < rect.z + rect.h + margin;
}

/** hostileStateFor(rect, playerPos, wasHostile) — pure geometric containment with one-sided
 *  hysteresis: entering the BARE rect always turns hostile on; leaving only turns it off once the
 *  player clears the rect expanded by `EXIT_MARGIN`. Exported standalone (no world/trace needed) so
 *  the containment rule itself is directly testable as pure geometry. */
export function hostileStateFor(rect: Rect, playerPos: Vec2, wasHostile: boolean): boolean {
  const insideBare = insideRect(rect, playerPos, 0);
  if (insideBare) return true;
  if (wasHostile) return insideRect(rect, playerPos, EXIT_MARGIN);
  return false;
}

function chaseStep(from: Vec2, to: Vec2, speed: number): Vec2 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) return { ...from };
  const step = Math.min(speed, dist);
  return { x: from.x + (dx / dist) * step, z: from.z + (dz / dist) * step };
}

/** decideStep(world, id, player, patrolPos, speed, t) — hostile: chase the player. Patrol (not
 *  hostile): drift back toward the rect's own patrol anchor (a calm, bounded default rather than
 *  standing frozen). */
export function decideStep(
  world: unknown,
  id: string,
  player: Vec2,
  patrolPos: Vec2,
  speed: number,
  t: number,
) {
  const rect = rectOf(world, id);
  const pos = positionOf(world, id);
  if (!rect || !pos) return [];
  const wasHostile = isHostile(world, id);
  const hostile = hostileStateFor(rect, player, wasHostile);
  const s = subjectKey(id);
  const rows = [];
  if (hostile !== wasHostile) rows.push(predicate(s, "hostile", hostile ? "true" : "false", t));
  const target = hostile ? player : patrolPos;
  const next = chaseStep(pos, target, speed);
  if (next.x !== pos.x || next.z !== pos.z) rows.push(predicate(s, "at", `${next.x},${next.z}`, t));
  return rows;
}
