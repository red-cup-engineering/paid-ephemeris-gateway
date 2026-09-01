// movement.test — the numeric feel tests: the design's own commitment ("Numeric assertions
// committed to as .mts tests") is that Quake-grade momentum is a PROVABLE property of the kernel,
// not a claim taken on faith. Every test here runs the real `stepMovement`, composing abrash's
// real `collision.move` through a tiny hand-rolled grid mock (matching abrash's own `g.at(x,z) ->
// { charge }` contract exactly — see world.mjs's `grid()` — so these tests exercise the real
// collision primitive abrash ships, not a stand-in for it).
//
// The bunnyhop test uses a "perfect strafe" controller — at each airborne tick it picks the wish
// angle relative to the CURRENT velocity that keeps `accelerate`'s addSpeed pinned exactly at its
// per-tick cap (the closed-form optimum: cos(theta) = (wishSpeed - accelCap) / |v|, derived from
// Accelerate's own formula) rather than a fixed alternating-key script. This is deliberate, not a
// simplification of the design doc's "alternate-strafe" language: circle-strafing while turning
// the view is what bunnyhopping actually IS in Quake (a controller optimizing this angle every
// tick is the mechanism a human eventually learns by feel); a fixed alternating-key script would
// only prove the mechanism exists in the degenerate case, not that the kernel supports the real
// technique at all air-speeds a player will actually reach.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stepMovement,
  initialMovementState,
  applyRocketKnockback,
  speedOf,
  MAX_GROUND_SPEED,
  MAX_AIR_WISH_SPEED,
  AIR_ACCEL,
  GRAVITY,
  JUMP_IMPULSE,
  DT,
} from "./movement.mts";

// An open grid: every voxel is ⊥ (fog) — abrash's own collision.blocks() treats bot/f as passable,
// so this is an infinite open floor. Matches abrash's real `g.at(x,z) -> { charge }` contract.
const openGrid = { at: () => ({ charge: "bot" }) };

/** A one-cell-thick wall spanning x in [wallX, wallX+1), open everywhere else — abrash's `t`
 *  charge, which both collision.move and castRay treat as blocking/stopping. */
function wallGridAt(wallX: number) {
  return { at: (x: number) => ({ charge: Math.floor(x) === wallX ? "t" : "bot" }) };
}

/** The closed-form optimal air-strafe turn for this tick: the relative angle `theta` between the
 *  wish direction and the CURRENT velocity that keeps `accelerate`'s addSpeed exactly at its
 *  per-tick cap (`AIR_ACCEL * DT * MAX_AIR_WISH_SPEED`) — any smaller theta wastes potential
 *  addSpeed on an add that's already capped; any larger theta lets addSpeed fall below the cap.
 *  Returns the `intent.turn` (radians this tick) that points a strafe-right wish (which sits at
 *  `angle + PI/2`) at that optimal angle relative to the velocity heading. */
function perfectStrafeTurn(state: { vx: number; vz: number; angle: number }): number {
  const speed = Math.hypot(state.vx, state.vz);
  const accelCap = AIR_ACCEL * DT * MAX_AIR_WISH_SPEED;
  const cosTheta = speed < 1e-6 ? 1 : Math.max(-1, Math.min(1, (MAX_AIR_WISH_SPEED - accelCap) / speed));
  const theta = Math.acos(cosTheta);
  const velocityAngle = Math.atan2(state.vz, state.vx);
  const targetHeading = velocityAngle + theta - Math.PI / 2; // strafe-right wish sits at angle+PI/2
  return targetHeading - state.angle;
}

test("movement: bunnyhopping gains speed hop over hop, ending well above ground max", () => {
  let state = initialMovementState({ x: 10, z: 10, angle: 0 });
  // build up to ground max speed first, exactly as a player would before their first jump.
  for (let i = 0; i < 60; i++) state = stepMovement(state, { forward: 1 }, openGrid);
  assert.ok(Math.abs(speedOf(state) - MAX_GROUND_SPEED) < 1e-6, "ground buildup should reach the ground speed cap");

  const hopSpeeds: number[] = [];
  const AIR_TICKS = 20;
  for (let hop = 0; hop < 5; hop++) {
    state = stepMovement(state, { jump: true }, openGrid); // leaves the ground THIS tick (jump-before-friction order)
    for (let i = 0; i < AIR_TICKS; i++) {
      const turn = perfectStrafeTurn(state);
      state = stepMovement(state, { strafe: 1, turn }, openGrid);
    }
    while (!state.grounded) state = stepMovement(state, {}, openGrid); // fall, no horizontal wish
    hopSpeeds.push(speedOf(state));
  }

  let increases = 0;
  for (let i = 1; i < hopSpeeds.length; i++) if (hopSpeeds[i] > hopSpeeds[i - 1]) increases++;
  assert.ok(increases >= 4, `expected >=4 of ${hopSpeeds.length - 1} hop-over-hop increases, got ${increases}: ${hopSpeeds}`);
  const finalSpeed = hopSpeeds[hopSpeeds.length - 1];
  assert.ok(
    finalSpeed > 1.3 * MAX_GROUND_SPEED,
    `expected final bunnyhop speed > ${1.3 * MAX_GROUND_SPEED}, got ${finalSpeed}`,
  );
});

test("movement: a normal jump's apex matches the closed-form projectile height", () => {
  let state = initialMovementState({ x: 10, z: 10, angle: 0 });
  state = stepMovement(state, { jump: true }, openGrid);
  let maxZ = state.zHeight;
  for (let i = 0; i < 300 && !state.grounded; i++) {
    state = stepMovement(state, {}, openGrid);
    maxZ = Math.max(maxZ, state.zHeight);
  }
  const closedForm = (JUMP_IMPULSE * JUMP_IMPULSE) / (2 * GRAVITY);
  assert.ok(
    Math.abs(maxZ - closedForm) / closedForm < 0.05,
    `apex ${maxZ} should be within 5% of the closed-form ${closedForm}`,
  );
});

test("movement: a rocket jump clears well above 1.4x a normal jump's apex", () => {
  let normal = initialMovementState({ x: 10, z: 10, angle: 0 });
  normal = stepMovement(normal, { jump: true }, openGrid);
  let normalMax = normal.zHeight;
  for (let i = 0; i < 300 && !normal.grounded; i++) {
    normal = stepMovement(normal, {}, openGrid);
    normalMax = Math.max(normalMax, normal.zHeight);
  }

  let rocket = initialMovementState({ x: 10, z: 10, angle: 0 });
  rocket = stepMovement(rocket, { jump: true }, openGrid); // a normal jump's impulse first...
  rocket = applyRocketKnockback(rocket, { x: 10, z: 10, zHeight: 0 }); // ...then a blast underfoot ADDS to it
  let rocketMax = rocket.zHeight;
  for (let i = 0; i < 300 && !rocket.grounded; i++) {
    rocket = stepMovement(rocket, {}, openGrid);
    rocketMax = Math.max(rocketMax, rocket.zHeight);
  }

  assert.ok(
    rocketMax > 1.4 * normalMax,
    `rocket apex ${rocketMax} should exceed 1.4x normal apex ${normalMax} (ratio ${rocketMax / normalMax})`,
  );
});

test("movement: ground friction actually stops you — monotonic decay, exact zero in bounded ticks", () => {
  let state = initialMovementState({ x: 10, z: 10, angle: 0, vx: 5, vz: 3, grounded: true });
  let prevSpeed = speedOf(state);
  let stoppedAtTick = -1;
  for (let i = 0; i < 200; i++) {
    state = stepMovement(state, {}, openGrid);
    const speed = speedOf(state);
    assert.ok(speed <= prevSpeed + 1e-9, `speed must not increase under friction+no-wish (tick ${i}: ${speed} > ${prevSpeed})`);
    prevSpeed = speed;
    if (speed === 0) {
      stoppedAtTick = i;
      break;
    }
  }
  assert.ok(stoppedAtTick >= 0, "expected speed to reach EXACTLY 0 within 200 ticks, never did");
  assert.ok(stoppedAtTick < 60, `expected friction to stop a body within 1 second (60 ticks), took ${stoppedAtTick + 1}`);
});

test("movement: determinism — identical intent sequence over an identical world gives byte-identical final state", () => {
  const grid = wallGridAt(20);
  const intents = [
    { forward: 1 }, { forward: 1, turn: 0.05 }, { forward: 1, strafe: 0.5 },
    { jump: true }, { strafe: 1, turn: -0.1 }, { forward: -0.5, turn: 0.2 },
    {}, { forward: 1 }, { jump: true }, { strafe: -1 },
  ];

  function run() {
    let s = initialMovementState({ x: 5, z: 5, angle: 0.3 });
    for (const intent of intents) s = stepMovement(s, intent, grid);
    return s;
  }

  const a = run();
  const b = run();
  assert.deepStrictEqual(a, b, "two independent runs of the identical fixed-tick intent sequence must match exactly");
  // exact float equality (not just deep-equal shape) — no run-to-run drift in any numeric field.
  for (const key of Object.keys(a) as (keyof typeof a)[]) {
    assert.strictEqual(a[key], b[key], `field "${key}" diverged between runs`);
  }
});

test("movement: no tunneling within the kernel's own achievable speed range", () => {
  const grid = wallGridAt(15);
  // vx=20 units/s * DT(1/60s) = ~0.33 cells/tick — comfortably inside bunnyhop's real achievable
  // range (peak ~13-15 units/s in the hop test above) and far under the wall's 1-cell width.
  let state = initialMovementState({ x: 10, z: 5.5, angle: 0, vx: 20, vz: 0, grounded: false, radius: 0.2 });
  for (let i = 0; i < 10; i++) {
    state = stepMovement(state, {}, grid);
    assert.ok(state.x <= 15 - state.radius + 1e-9, `body must not resolve past/into the wall at tick ${i}, x=${state.x}`);
  }
});

test("movement: opts.passContestedWhere (EXT-3) actually engages stepMovement's collision resolve, not just a documented-but-inert field", () => {
  // a ⊤ (contested) 1-cell-thick wall at x=5; the rest of the grid is open floor.
  const contestedGrid = { at: (x: number) => ({ charge: Math.floor(x) === 5 ? "top" : "bot" }) };

  // with no passContestedWhere at all: the ⊤ wall blocks, exactly like abrash's own default. Run
  // enough ticks (with forward wish, not just coasting velocity, so it doesn't merely stop
  // accelerating) to actually reach the wall.
  let blocked = initialMovementState({ x: 4.5, z: 5.5, angle: 0, grounded: true });
  for (let i = 0; i < 60; i++) blocked = stepMovement(blocked, { forward: 1 }, contestedGrid);
  assert.ok(blocked.x < 5, `with no per-voxel opt, the contested wall should still block, got x=${blocked.x}`);

  // with passContestedWhere naming this exact cell: the same wall now passes.
  let passed = initialMovementState({ x: 4.5, z: 5.5, angle: 0, grounded: true });
  for (let i = 0; i < 60; i++) {
    passed = stepMovement(passed, { forward: 1 }, contestedGrid, { passContestedWhere: (subjectKey) => subjectKey === "voxel:5,5" });
  }
  assert.ok(passed.x > 5, `expected the named contested cell to pass under EXT-3, got x=${passed.x}`);
});

test("movement: tunneling IS a real, disclosed limitation at velocities far outside the design range (no CCD/substepping)", () => {
  const grid = wallGridAt(15);
  // an extreme, deliberately unrealistic velocity (100x+ the kernel's own achievable speed) that
  // covers more than one full cell in a single 1/60s tick — this documents the honest limitation
  // named in the design (no continuous-collision/substepping in v1), rather than silently hoping
  // it never comes up.
  let fast = initialMovementState({ x: 14.5, z: 5.5, angle: 0, vx: 2000, vz: 0, grounded: false, radius: 0.2 });
  fast = stepMovement(fast, {}, grid);
  assert.ok(fast.x > 16, "at an extreme, out-of-range velocity the single-sample per-axis resolve tunnels through a thin wall — documented, not silently patched");
});
