// movement — the Quake-momentum kernel. Owned entirely by BNSF (per the design's EXT-1: this is
// a NEW module, not an abrash change) because abrash's own `engine.applyIntent` computes a FIXED
// per-tick displacement (`moveSpeed * intent.forward`, straight into `collision.move` — see
// abrash's engine.mjs) with no velocity, no gravity, no jump, no air state anywhere in the
// package (confirmed by reading engine.mjs/collision.mjs/math.mjs directly — there is no
// integrated-velocity code path to extend, only to add beside).
//
// This module owns velocity/gravity/jump state and, every tick, hands the *resolved* horizontal
// delta to abrash's real `collision.move(grid, body, dx, dz, opts)` — never reimplemented — so
// wall-slide and t/⊤-blocking behavior is byte-identical to the engine's own tested collision.
// Vertical (jump/rocket) motion is a second, independent integration abrash's raycaster never
// sees directly (abrash has no eye-height/pitch field — see raycaster.mjs's `camera()`, which
// takes only x,z,angle,fov,width,height,maxDist); EXT-2's canvas-level view-lift (web/js/render.mjs)
// is what makes `zHeight` visible, honestly, within a flat 2.5D raycaster's real limits.
//
// The acceleration formula (`accelerate`) is the well-documented Quake PM_Accelerate/
// PM_AirAccelerate shape: `addSpeed = wishSpeed - dot(velocity, wishDir)`, clamped relative to
// the CURRENT velocity's component along the wish direction, not to a flat speed cap. That
// relative clamp is the whole mechanism — not a special case bolted on — that lets a wish
// direction misaligned with the current velocity keep `addSpeed > 0` even once speed already
// exceeds the nominal max, which is what bunnyhop/strafe-jump speed gain actually *is*. The
// constants below are disclosed as TUNED, ported from the known shape of Quake's own movement
// code, not derived from first principles — the same honesty posture onestone-service's DESIGN.md
// uses for its own Chaos Six constant ("a tuning constant, not a computed result, and naming it
// honestly is the corner where this doc previously overclaimed").

import { move as abrashMove } from "@red-cup-engineering/abrash/collision";
import { movePerVoxel } from "./ext/collision-per-voxel.mts"; // EXT-3: only engaged when opts.passContestedWhere is actually supplied

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

// Tuned constants (see header). Units: distance in abrash grid cells, time in seconds.
export const GROUND_ACCEL = 10;
export const GROUND_FRICTION = 6;
export const STOP_SPEED = 1;
export const AIR_ACCEL = 0.7;
export const MAX_GROUND_SPEED = 7;
export const MAX_AIR_WISH_SPEED = 7;
export const GRAVITY = 20;
export const JUMP_IMPULSE = 8;
export const JUMP_BUFFER_TICKS = 6;
export const COYOTE_TICKS = 4;
export const ROCKET_KNOCKBACK_IMPULSE = 14;
export const ROCKET_BLAST_RADIUS = 4;

export interface MovementState {
  x: number;
  z: number;
  angle: number;
  vx: number;
  vz: number;
  zHeight: number;
  vHeight: number;
  grounded: boolean;
  radius: number;
  /** ticks remaining that a buffered jump press is still honored once grounded (0 = none). */
  jumpBufferTicks: number;
  /** ticks remaining that a jump is still honored despite having just left the ground (0 = none). */
  coyoteTicks: number;
}

export interface MoveIntent {
  forward?: number; // -1..1
  strafe?: number; // -1..1
  turn?: number; // radians this tick, already scaled by sensitivity at the browser boundary
  jump?: boolean;
}

export function initialMovementState(opts: Partial<MovementState> = {}): MovementState {
  return {
    x: opts.x ?? 1.5,
    z: opts.z ?? 1.5,
    angle: opts.angle ?? 0,
    vx: opts.vx ?? 0,
    vz: opts.vz ?? 0,
    zHeight: opts.zHeight ?? 0,
    vHeight: opts.vHeight ?? 0,
    grounded: opts.grounded ?? true,
    radius: opts.radius ?? 0.2,
    jumpBufferTicks: opts.jumpBufferTicks ?? 0,
    coyoteTicks: opts.coyoteTicks ?? 0,
  };
}

/** wishDir(angle, forward, strafe) — the SAME forward/strafe-along-heading formula abrash's own
 *  `engine.applyIntent` uses (cos/sin with the strafe axis at angle+PI/2), returned as a unit
 *  vector (or [0,0] if the wish magnitude is zero) plus the raw (unnormalized) wish speed
 *  magnitude the caller scales against MAX_*_SPEED. Kept in the two-return-value shape (not a
 *  single scaled vector) because Accelerate's math wants direction and speed separately. */
function wishDir(angle: number, forward: number, strafe: number): { dx: number; dz: number; mag: number } {
  const dx = Math.cos(angle) * forward + Math.cos(angle + Math.PI / 2) * strafe;
  const dz = Math.sin(angle) * forward + Math.sin(angle + Math.PI / 2) * strafe;
  const mag = Math.hypot(dx, dz);
  if (mag === 0) return { dx: 0, dz: 0, mag: 0 };
  return { dx: dx / mag, dz: dz / mag, mag };
}

/** accelerate — Quake's PM_Accelerate: the addSpeed is relative to how much velocity ALREADY
 *  lies along wishDir, not to the resultant speed. This is the mechanism (not a special case)
 *  that keeps addSpeed positive even once |velocity| exceeds wishSpeed, provided wishDir is
 *  misaligned enough from the current velocity heading — the real source of bunnyhop/strafe-jump
 *  speed gain, tested explicitly below in movement.test.mts. */
function accelerate(
  vx: number,
  vz: number,
  wdx: number,
  wdz: number,
  wishSpeed: number,
  accel: number,
  dt: number,
): { vx: number; vz: number } {
  if (wishSpeed === 0) return { vx, vz };
  const currentSpeed = vx * wdx + vz * wdz;
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return { vx, vz };
  const accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
  return { vx: vx + wdx * accelSpeed, vz: vz + wdz * accelSpeed };
}

/** applyFriction — ground-only. STOP_SPEED prevents infinite asymptotic skating: below it, the
 *  drop is computed against STOP_SPEED itself rather than the (tiny) current speed, so a slow
 *  body actually reaches exactly zero within a bounded number of ticks instead of decaying
 *  forever. */
function applyFriction(vx: number, vz: number, dt: number): { vx: number; vz: number } {
  const speed = Math.hypot(vx, vz);
  if (speed < 1e-9) return { vx: 0, vz: 0 };
  const control = Math.max(speed, STOP_SPEED);
  const drop = control * GROUND_FRICTION * dt;
  const newSpeed = Math.max(speed - drop, 0);
  const scale = newSpeed / speed;
  return { vx: vx * scale, vz: vz * scale };
}

export interface RocketBlast {
  x: number;
  z: number;
  zHeight: number;
  radius?: number;
  impulse?: number;
}

/** applyRocketKnockback — an explosion ADDS a velocity impulse (never sets), split by the true
 *  3D direction from blast center to the body, scaled by radial falloff. Called once per blast
 *  event, not per tick — the caller decides when a rocket/rocket-jump-pad explosion occurs. */
export function applyRocketKnockback(state: MovementState, blast: RocketBlast): MovementState {
  const radius = blast.radius ?? ROCKET_BLAST_RADIUS;
  const impulse = blast.impulse ?? ROCKET_KNOCKBACK_IMPULSE;
  const dx = state.x - blast.x;
  const dz = state.z - blast.z;
  const dy = state.zHeight - blast.zHeight;
  const dist3 = Math.hypot(dx, dz, dy);
  if (dist3 >= radius || dist3 < 1e-6) return state;
  const falloff = 1 - clamp01(dist3 / radius);
  const scale = (impulse * falloff) / dist3;
  return {
    ...state,
    vx: state.vx + dx * scale,
    vz: state.vz + dz * scale,
    vHeight: state.vHeight + dy * scale + impulse * falloff * 0.15, // a small guaranteed upward component, matching Quake's own rocket-jump feel (a blast directly underfoot still lifts you)
    grounded: false,
  };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export interface StepOpts {
  passContested?: boolean;
  passContestedWhere?: (subjectKey: string) => boolean; // EXT-3 hook, see src/ext/collision-per-voxel.mts
}

/** stepMovement — one fixed 1/TICK_HZ physics tick. Composes abrash's real `collision.move` for
 *  the horizontal resolve (byte-identical wall-slide/⊤-blocking to the engine's own tested
 *  behavior); everything vertical, and the ground/air acceleration split, is BNSF's own. */
export function stepMovement(
  state: MovementState,
  intent: MoveIntent,
  grid: unknown,
  opts: StepOpts = {},
): MovementState {
  const dt = DT;
  const angle = state.angle + (intent.turn ?? 0);
  const { dx: wdx, dz: wdz, mag } = wishDir(angle, intent.forward ?? 0, intent.strafe ?? 0);

  let vx = state.vx;
  let vz = state.vz;
  let grounded = state.grounded;
  let vHeight = state.vHeight;
  let zHeight = state.zHeight;
  let jumpBufferTicks = intent.jump ? JUMP_BUFFER_TICKS : Math.max(0, state.jumpBufferTicks - 1);
  let coyoteTicks = grounded ? COYOTE_TICKS : Math.max(0, state.coyoteTicks - 1);

  // Jump is resolved BEFORE ground friction/accel, matching Quake's own PM_CheckJump-before-
  // PM_WalkMove order: a jump triggered on a grounded tick leaves the ground for the REST of that
  // same tick, so this tick's horizontal accel below uses AIR_ACCEL (no friction at all) rather
  // than ground friction+accel. This ordering is not cosmetic — it is the entire mechanism that
  // lets a bunnyhop preserve speed across the landing tick: applying ground friction first (even
  // for one tick) bleeds speed every hop and bunnyhopping could never net-gain. Landing itself
  // (zHeight<=0, below) still sets `grounded=true` for the FOLLOWING tick, so a player who does not
  // immediately re-jump pays ordinary ground friction from the next tick on — only the jump-tick
  // itself is exempted, exactly matching the source engine this is ported from.
  const wantsJump = jumpBufferTicks > 0;
  let jumpedThisTick = false;
  if (grounded && wantsJump) {
    vHeight = JUMP_IMPULSE;
    grounded = false;
    jumpBufferTicks = 0;
    coyoteTicks = 0;
    jumpedThisTick = true;
  } else if (!grounded && intent.jump && coyoteTicks > 0) {
    vHeight = JUMP_IMPULSE;
    coyoteTicks = 0;
    jumpBufferTicks = 0;
  } else if (!grounded) {
    vHeight -= GRAVITY * dt;
  }

  if (grounded && !jumpedThisTick) {
    const fr = applyFriction(vx, vz, dt);
    vx = fr.vx;
    vz = fr.vz;
    const wishSpeed = Math.min(mag, 1) * MAX_GROUND_SPEED;
    const acc = accelerate(vx, vz, wdx, wdz, wishSpeed, GROUND_ACCEL, dt);
    vx = acc.vx;
    vz = acc.vz;
  } else {
    const wishSpeed = Math.min(mag, 1) * MAX_AIR_WISH_SPEED;
    const acc = accelerate(vx, vz, wdx, wdz, wishSpeed, AIR_ACCEL, dt);
    vx = acc.vx;
    vz = acc.vz;
  }

  // horizontal integration + collision, composing abrash's real collision.move (or, when the caller
  // supplies EXT-3's per-voxel hook, this file's own movePerVoxel adapter — see
  // src/ext/collision-per-voxel.mts's header for why abrash's own move() can't express "some ⊤ cells
  // pass, others in the same grid don't" and why the adapter reuses abrash's real blocks() per cell
  // rather than reimplementing the blocking semantic). Either way, resolution is never reimplemented
  // here — only which per-axis-slide implementation gets called is a choice.
  const dx = vx * dt;
  const dz = vz * dt;
  const body0 = { x: state.x, z: state.z, radius: state.radius };
  const { body, hit } = opts.passContestedWhere
    ? movePerVoxel(grid as Parameters<typeof movePerVoxel>[0], body0, dx, dz, opts)
    : abrashMove(grid as Parameters<typeof abrashMove>[0], body0, dx, dz, opts);
  // a resolved axis (hit.x / hit.z) means the wall stopped that component: zero the matching
  // velocity component too, else the body keeps "wanting" to move into the wall every tick and
  // the reported speed lies about what's actually happening on screen.
  if (hit.x) vx = 0;
  if (hit.z) vz = 0;

  // vertical integration + landing.
  zHeight += vHeight * dt;
  if (zHeight <= 0) {
    zHeight = 0;
    vHeight = 0;
    grounded = true;
    coyoteTicks = COYOTE_TICKS;
  }

  return {
    x: body.x,
    z: body.z,
    angle,
    vx,
    vz,
    zHeight,
    vHeight,
    grounded,
    radius: state.radius,
    jumpBufferTicks,
    coyoteTicks,
  };
}

export function speedOf(state: MovementState): number {
  return Math.hypot(state.vx, state.vz);
}
