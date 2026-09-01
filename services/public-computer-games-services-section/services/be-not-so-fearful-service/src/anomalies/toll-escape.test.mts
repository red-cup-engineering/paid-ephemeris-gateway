// toll-escape.test — the TOLL BALANCE FIX's own tuning proof. A real playtest (recorded live
// against fearful.561.group, see the shipped report) found the Toll guardian spawning 0.71-0.89
// units from the loot it guards — inside CONTACT_RADIUS (0.6) plus a single 0.14-unit-per-tick
// step — so BOTH a stationary grab and a full-momentum grab-and-run died within 1-2 ticks, zero
// counterplay, contradicting the game's own learnable-rules thesis (DESIGN.md §3: "learn the rule,
// survive it"). level-gen.mts's fix (TOLL_SPAWN_MIN_DIST/MAX_DIST) spawns the Toll a real distance
// from its loot instead. This file is the failing-first proof of BOTH bounds the fix has to hold at
// once, at the TIGHTEST edge of that tuned band (the hardest case — anything farther only helps the
// runner more):
//
//   1. a well-executed momentum grab-and-run (a real running start, then the game's own learnable
//      bunnyhop/air-strafe tech — movement.test.mts's own closed-form controller, the SAME
//      technique the shipped playtest's BFS+optimal-strafe controller used) must ESCAPE: the Toll
//      never closes to CONTACT_RADIUS over a long horizon.
//   2. a stationary grab, and a "sloppy" full-speed-but-flat-ground grab-and-run (no strafe-jump
//      tech at all), must both still DIE — the dread stays; distance alone, without the learnable
//      skill, is not enough. This is arithmetic, not a coincidence: toll.mts's own chase speed
//      (0.14 units/tick = 8.4 u/s) is deliberately set ABOVE movement.mts's MAX_GROUND_SPEED
//      (7 u/s) — "faster than the other three... should read as dangerous" (toll.mts's own header)
//      — so flat-out sprinting can mathematically never out-distance it; only bunnyhop tech, which
//      DOES clear 8.4 u/s within a single hop cycle (movement.test.mts), can.
//
// Run on an open grid (matching movement.test.mts's own `openGrid` idiom) rather than a generated
// level: this isolates the MECHANISM (speed vs. speed, over a real gap) the spawn-distance fix is
// responsible for, the same way toll.test.mts's own tests isolate `decideStep`'s rules rather than
// re-proving corridor navigation. A generated level's own corridor geometry is a SEPARATE, already-
// disclosed variable (see level-gen.mts's TOLL_SPAWN_MIN_DIST comment and DESIGN.md §3.4) — real
// dead-end topology can still make a specific seed's escape route awkward; this file proves the
// mechanical floor the distance fix guarantees, not "every seed is equally easy."
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import { stepMovement, initialMovementState, AIR_ACCEL, MAX_AIR_WISH_SPEED, DT, type MovementState, type MoveIntent } from "../movement.mts";
import { spawn, trigger, decideStep, positionOf } from "./toll.mts";
import { CONTACT_RADIUS } from "../cartridge.mts";
import { TOLL_SPAWN_MIN_DIST } from "../level-gen.mts";

const openGrid = { at: () => ({ charge: "bot" }) };

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

/** The closed-form optimal air-strafe turn (movement.test.mts's own controller, generalized to aim
 *  at an arbitrary fixed bearing instead of whatever the current heading happens to be) — the exact
 *  "circle-strafe while turning the view" mechanism a human bunnyhops by feel, applied toward
 *  `bearing` every airborne tick. */
function skilledFleeIntent(state: MovementState, bearing: number): MoveIntent & { jump: true } {
  const speed = Math.hypot(state.vx, state.vz);
  const accelCap = AIR_ACCEL * DT * MAX_AIR_WISH_SPEED;
  if (speed < 1e-6) return { forward: 1, strafe: 0, turn: 0, jump: true };
  const cosTheta = Math.max(-1, Math.min(1, (MAX_AIR_WISH_SPEED - accelCap) / speed));
  const theta = Math.acos(cosTheta);
  const velocityAngle = Math.atan2(state.vz, state.vx);
  const velToGoal = ((bearing - velocityAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const strafeSign = velToGoal >= 0 ? 1 : -1;
  const targetHeading = velocityAngle + strafeSign * theta - strafeSign * (Math.PI / 2);
  const turn = ((targetHeading - state.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return { forward: 0, strafe: strafeSign, turn, jump: true };
}

/** A real running start: 2 full seconds accelerating to ground max speed BEFORE the encounter
 *  begins — "never stopping," a genuine momentum grab-and-run, not a standing start. Matches
 *  movement.test.mts's own bunnyhop benchmark, which warms up to ground max the same way before
 *  its own hop-cycle measurement starts. */
function runningStart(): MovementState {
  let s = initialMovementState({ x: -1000, z: 0, angle: 0 });
  for (let i = 0; i < 120; i++) s = stepMovement(s, { forward: 1 }, openGrid);
  return { ...s, x: 0, z: 0 }; // reposition to the encounter origin, keep the built-up velocity
}

const FLEE_BEARING = 0; // +x: directly away from the Toll, spawned behind at -TOLL_SPAWN_MIN_DIST

function runEncounter(mode: "stationary" | "sloppy" | "skilled", maxTicks: number) {
  const player = mode === "stationary" ? initialMovementState({ x: 0, z: 0, angle: 0 }) : runningStart();
  let p = player;
  let world = worldFromRows(spawn("escape-proof", -TOLL_SPAWN_MIN_DIST, 0));
  world = admit(world, [trigger("escape-proof", 0)]);
  let minDist = TOLL_SPAWN_MIN_DIST;
  for (let t = 1; t <= maxTicks; t++) {
    const intent: MoveIntent =
      mode === "stationary" ? { forward: 0 } : mode === "sloppy" ? { forward: 1, strafe: 0, turn: 0 } : skilledFleeIntent(p, FLEE_BEARING);
    p = stepMovement(p, intent, openGrid);
    const rows = decideStep(world, "escape-proof", p, 0, t); // ticksSinceLosBreak=0: the open grid has no wall to break LOS on — the fix must not rely on that either
    world = admit(world, rows);
    const tollPos = positionOf(world, "escape-proof")!;
    const dist = Math.hypot(tollPos.x - p.x, tollPos.z - p.z);
    minDist = Math.min(minDist, dist);
    if (dist <= CONTACT_RADIUS) return { caught: true, atTick: t, minDist };
  }
  return { caught: false, atTick: null as number | null, minDist };
}

test(`toll-escape: at the TUNED minimum spawn distance (${TOLL_SPAWN_MIN_DIST} units, the tightest edge of the fix's own band), a well-executed running-start bunnyhop grab-and-run ESCAPES — never caught over a long horizon`, () => {
  const r = runEncounter("skilled", 1200); // 20 real seconds at 60Hz — plenty long enough to show real, growing separation, not a photo finish
  assert.strictEqual(r.caught, false, `a skilled grab-and-run should never be caught, but died at tick ${r.atTick}`);
  assert.ok(r.minDist > CONTACT_RADIUS, "should maintain real separation, not just barely avoid exact contact");
});

test(`toll-escape: at the SAME tuned distance, a STATIONARY grab (no flee at all) still dies — the dread stays`, () => {
  const r = runEncounter("stationary", 600); // 10 real seconds is generous; standing still, this should be fast
  assert.strictEqual(r.caught, true, "a player who does not even try to flee must still be caught");
  assert.ok(r.atTick! < 600, "should die well within the horizon, not barely scrape by");
});

test(`toll-escape: at the SAME tuned distance, a SLOPPY grab-and-run (full ground speed, but no bunnyhop tech) still dies — momentum alone, without the learnable skill, is not enough`, () => {
  const r = runEncounter("sloppy", 1200);
  assert.strictEqual(
    r.caught,
    true,
    "flat-out ground sprinting (MAX_GROUND_SPEED=7 u/s) can never out-distance the Toll's own chase speed (0.14 units/tick = 8.4 u/s) — only real bunnyhop tech clears that bar",
  );
});

test("toll-escape: the fix is genuinely tuned, not accidentally generous — a distance below the old bug's own measured gap (~0.8 units) still kills a skilled grab-and-run too, proving the two outcomes above are actually distance-sensitive, not a controller artifact", () => {
  // A direct regression check on the ORIGINAL bug's own numbers (0.71-0.89 units, see this file's
  // header) rather than TOLL_SPAWN_MIN_DIST: even the best controller cannot out-run a guardian
  // that already started inside striking distance.
  let p = runningStart();
  let world = worldFromRows(spawn("regression-proof", -0.8, 0));
  world = admit(world, [trigger("regression-proof", 0)]);
  let caught = false;
  for (let t = 1; t <= 60 && !caught; t++) {
    p = stepMovement(p, skilledFleeIntent(p, FLEE_BEARING), openGrid);
    const rows = decideStep(world, "regression-proof", p, 0, t);
    world = admit(world, rows);
    const tollPos = positionOf(world, "regression-proof")!;
    if (Math.hypot(tollPos.x - p.x, tollPos.z - p.z) <= CONTACT_RADIUS) caught = true;
  }
  assert.strictEqual(caught, true, "at the OLD bug's own ~0.8-unit gap, even a skilled grab-and-run should still die — confirms the fix's escape above is really about the tuned distance, not just a lenient controller");
});
