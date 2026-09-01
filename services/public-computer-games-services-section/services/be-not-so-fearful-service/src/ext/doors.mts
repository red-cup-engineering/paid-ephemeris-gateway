// EXT-4 — ordinary doors, needing NO abrash change at all: reuses the exact hook demon.mjs already
// proves works (`settleOpts({ functional: Set })`), applied to a `door-open` predicate instead of
// `alive`. A door is a subject of its own (`door:<id>`), independent of the voxel cell(s) it sits on;
// the level declares which voxel(s) a door occupies, and the collision wrapper below checks the
// door's functional open/closed state ALONGSIDE the voxel's own `solid` charge.
//
// WHY THIS IS THE RIGHT MECHANISM (not the ⊤-shiver): a door isn't a contradiction two witnesses
// disagree about — it's a single, ordinary, single-valued fact that changes over time ("open" is
// FUNCTIONAL: latest-t wins, no held ⊤, no shiver). Using the contested-wall machinery for a door
// would make every door read as anomalous, which is exactly wrong — the shiver is reserved for real
// disagreement (level-gen's pre-seeded contested walls, The Contested's periodic re-assertion), and a
// door swinging open on a normal hinge should never borrow that visual/mechanical vocabulary.

import { predicate, frontier, settleOpts } from "@red-cup-engineering/abrash/world";
import { blocks } from "@red-cup-engineering/abrash/collision";

export const doorKey = (id: string): string => `door:${id}`;

const OPTS = settleOpts({ functional: new Set(["open"]) });

/** spawn(id, t) — a door starts closed: an explicit `open:"false"` row, not silence, because an
 *  unlisted functional cell reads as "no evidence" and this door's closedness should be a stated
 *  fact from the moment it exists, not an absence a reader has to interpret. */
export function spawn(id: string, t = 0) {
  return [predicate(doorKey(id), "open", "false", t)];
}

export function open(id: string, t: number) {
  return predicate(doorKey(id), "open", "true", t);
}

export function close(id: string, t: number) {
  return predicate(doorKey(id), "open", "false", t);
}

export function isOpen(world: unknown, id: string): boolean {
  const folded = frontier(world, doorKey(id), OPTS);
  const cell = folded.fiber.find((c: { predicate: string }) => c.predicate === "open");
  return cell ? cell.object === "true" : false; // unlisted (never spawned) reads as closed — the safe default
}

/** doorBlocks(charge, world, doorIdAtCell) — the collision wrapper a game's own grid.at() shim calls
 *  for a door-bearing voxel: an OPEN door passes regardless of the underlying voxel's own `solid`
 *  charge (a closed-off passage that's been opened reads as passable, full stop — no ⊤ churn, no
 *  partial states); a CLOSED (or never-declared) door falls straight through to abrash's own real
 *  `blocks(charge, opts)` for that voxel's charge, so a closed door behaves exactly like an ordinary
 *  wall in every other respect (still occludes LOS via castRay's own charge read, still stops a shot). */
export function doorBlocks(charge: string, world: unknown, doorIdAtCell: string | undefined, opts: { passContested?: boolean } = {}): boolean {
  if (doorIdAtCell && isOpen(world, doorIdAtCell)) return false;
  return blocks(charge, opts);
}
