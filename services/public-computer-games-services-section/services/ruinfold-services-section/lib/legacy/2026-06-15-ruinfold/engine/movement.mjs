// movement — locomotion as scalar intra-actions on the trace. The server NEVER does geometry:
// it only stores and advances plain numeric predicates (pos-x, pos-z on the ground plane,
// facing as a yaw in radians) and a transient steering goal (move-target-x/z). All real vector
// math — meshes, raycasts, camera projection, the actual look of a step — is the client's
// three.js. Here a "step" is just: read two numbers (goal), read two numbers (pos), move toward
// the goal by at most SPEED, clamp to the zone's square bound, write the numbers back. pos-y is
// left untouched (always the ground plane, 0). facing is derived once, with the only trig the
// server is allowed: Math.atan2 of the movement delta.
//
//   SPEED                                  -> world units a subject covers in one tick step
//   step(root, subject, t, dirty)          -> advance toward stored click-to-move goal, one tick
//   nudge(root, subject, dir, t, dirty)    -> a single WASD step in a cardinal direction
//   setGoal(root, subject, x, z, t, dirty) -> store a click-to-move goal (clamped to the zone)
//
// All position predicates (pos-x/pos-z/facing) and move-target-x/z are in RUIN_FUNCTIONAL, so
// every write goes through `changing` (latest-t wins), never `doing`. As with the other engine
// modules: `t` is a () => string clock thunk (call it per row so seq advances), and `dirty` is a
// Set the caller collects touched subjects in for the tick's snapshot.

import changing from "#changing";
import { view, posOf, numOf, zoneOf } from "#engine/_world.mjs";

export const SPEED = 2; // world units per tick step

// boundOf — the zone's half-extent for the subject's current zone. A zone is an entity with a
// numeric `bound`; valid x,z ∈ [-bound, bound]. Absent zone or bound → Infinity (no clamp), so a
// subject with no located-in just moves freely rather than snapping to 0.
async function boundOf(root, subjectId) {
  const zoneId = await zoneOf(root, subjectId); // e-filtered: correct even when carrying items
  if (zoneId == null) return Infinity;
  const zone = await view(root, zoneId);
  return numOf(zone, "bound", Infinity);
}

// clamp — keep a coordinate inside [-b, b]. Pure scalar; b may be Infinity (no-op).
function clamp(v, b) {
  return Math.max(-b, Math.min(b, v));
}

// step — advance `subject` one tick toward its stored click-to-move goal. No goal → no move.
// Returns { moved, arrived }: arrived is true on the tick the subject reaches (snaps to) the goal.
export async function step(root, subject, t, dirty) {
  const me = await view(root, subject);

  const gx = numOf(me, "move-target-x", null);
  const gz = numOf(me, "move-target-z", null);
  if (gx == null || gz == null) return { moved: false, arrived: false };

  const { x, z } = posOf(me);
  const dx = gx - x;
  const dz = gz - z;
  const dist = Math.hypot(dx, dz);

  if (dist === 0) return { moved: false, arrived: false }; // already on the goal

  const b = await boundOf(root, subject);
  const facing = Math.atan2(dz, dx); // yaw toward the goal; the one trig the server does

  let nx, nz, arrived;
  if (dist <= SPEED) {
    // Closer than a full step: snap to the goal this tick.
    nx = clamp(gx, b);
    nz = clamp(gz, b);
    arrived = true;
  } else {
    // Move a fraction (SPEED/dist) of the way along the straight line to the goal.
    nx = clamp(x + (dx / dist) * SPEED, b);
    nz = clamp(z + (dz / dist) * SPEED, b);
    arrived = false;
  }

  await changing({ root, subject, predicate: "pos-x", object: nx, t: t() });
  await changing({ root, subject, predicate: "pos-z", object: nz, t: t() });
  await changing({ root, subject, predicate: "facing", object: facing, t: t() });
  dirty.add(subject);

  return { moved: true, arrived };
}

// Cardinal-direction unit deltas for WASD. CONVENTION (matches the task brief):
//   n: -z   s: +z   e: +x   w: -x
// i.e. north decreases z, south increases z, east increases x, west decreases x.
const DIRS = {
  n: { dx: 0, dz: -1 },
  s: { dx: 0, dz: 1 },
  e: { dx: 1, dz: 0 },
  w: { dx: -1, dz: 0 },
};

// nudge — a single WASD step of SPEED units in a cardinal direction. Clamps to the zone bound and
// sets facing from the delta. To keep `step` from fighting a manual nudge, the click-to-move goal
// is reset to the subject's NEW position (so step sees dist 0 and does nothing until a fresh goal
// is set). Returns { moved }; moved is false for an unknown direction.
export async function nudge(root, subject, dir, t, dirty) {
  const d = DIRS[dir];
  if (!d) return { moved: false };

  const me = await view(root, subject);
  const { x, z } = posOf(me);
  const b = await boundOf(root, subject);

  const nx = clamp(x + d.dx * SPEED, b);
  const nz = clamp(z + d.dz * SPEED, b);
  const facing = Math.atan2(d.dz, d.dx);

  await changing({ root, subject, predicate: "pos-x", object: nx, t: t() });
  await changing({ root, subject, predicate: "pos-z", object: nz, t: t() });
  await changing({ root, subject, predicate: "facing", object: facing, t: t() });
  // Cancel any standing click-to-move goal by parking it on the new position.
  await changing({ root, subject, predicate: "move-target-x", object: nx, t: t() });
  await changing({ root, subject, predicate: "move-target-z", object: nz, t: t() });
  dirty.add(subject);

  return { moved: true };
}

// setGoal — store a click-to-move goal for `subject`, clamped to the zone bound so the goal is
// always reachable inside the zone. step() consumes it over the following ticks. Returns { set }.
export async function setGoal(root, subject, x, z, t, dirty) {
  const me = await view(root, subject);
  const b = await boundOf(root, subject);

  await changing({ root, subject, predicate: "move-target-x", object: clamp(x, b), t: t() });
  await changing({ root, subject, predicate: "move-target-z", object: clamp(z, b), t: t() });
  dirty.add(subject);

  return { set: true };
}
