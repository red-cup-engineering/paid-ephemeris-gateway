// The Hum — anomaly #2: bound to SOUND, not sight. No line-of-sight check anywhere in this module —
// it hears through walls, which is the whole point of the contract a player learns: staying quiet
// (crouching, walking rather than sprinting, holding fire) is the counter, not staying hidden.
//
// `noiseOf` is a PURE, in-core signal — Carrier-Audit-style honesty (the same posture durante's own
// ammo/health disclosure uses): the game's core decides what counts as loud, the cosmetic audio layer
// in the browser face never gets to silently redefine it. Heat accumulates through walls (distance
// alone, no occlusion test) and decays over time; once heat crosses a threshold, The Hum COMMITS to a
// multi-tick beeline toward the LAST noisy position it heard (not the player's live position) — this is
// what makes it lurable and juke-able: make noise somewhere, go quiet, and it beelines to a memory, not
// to you.

import { predicate, frontier, settleOpts } from "@red-cup-engineering/abrash/world";
import { v2 } from "@red-cup-engineering/abrash/math";

export const subjectKey = (id: string): string => `anomaly:hum:${id}`;

export interface Vec2 {
  x: number;
  z: number;
}

export interface HumIntent {
  forward?: number;
  strafe?: number;
  fire?: boolean;
  sprint?: boolean;
  crouch?: boolean;
}

/** noiseOf(intent) — the CORE loudness signal for one tick's player intent. Crouch is silent
 *  (overrides everything else); firing is the loudest single act; sprinting is loud; ordinary
 *  movement carries a modest baseline; standing still (or crouched) makes no noise at all. */
export function noiseOf(intent: HumIntent): number {
  if (intent.crouch) return 0;
  if (intent.fire) return 1.5;
  if (intent.sprint) return 1.0;
  const moving = Math.abs(intent.forward ?? 0) > 0 || Math.abs(intent.strafe ?? 0) > 0;
  return moving ? 0.4 : 0;
}

export const HEAT_THRESHOLD = 3;
export const HEAT_DECAY_PER_TICK = 0.05;

/** accumulateHeat(heat, noise, distance, dt) — noise attenuates with distance (no occlusion — sound
 *  passes walls) and heat decays passively every tick regardless of noise. Pure arithmetic. */
export function accumulateHeat(heat: number, noise: number, distance: number, dt: number): number {
  const contribution = (noise / (1 + distance)) * dt * 60; // normalize against a 60Hz tick so the
  // threshold/decay constants read in "per-second-ish" units regardless of the caller's dt.
  const decayed = Math.max(0, heat - HEAT_DECAY_PER_TICK);
  return decayed + contribution;
}

export function spawn(id: string, x: number, z: number, opts: { speed?: number } = {}) {
  const s = subjectKey(id);
  const speed = opts.speed ?? 0.11;
  return [
    predicate(s, "kind", "hum", 0),
    predicate(s, "at", `${x},${z}`, 0),
    predicate(s, "speed", String(speed), 0),
    predicate(s, "heat", "0", 0),
    predicate(s, "hunting", "false", 0),
  ];
}

const OPTS = settleOpts({ functional: new Set(["at", "speed", "heat", "hunting", "lastHeard"]) });

function objOf(folded: { fiber: { predicate: string; object: string }[] }, predicateName: string): string | null {
  const cell = folded.fiber.find((c) => c.predicate === predicateName);
  return cell ? cell.object : null;
}

export function positionOf(world: unknown, id: string): Vec2 | null {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "at");
  if (!v) return null;
  const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(v);
  return m ? { x: Number(m[1]), z: Number(m[2]) } : null;
}

export function speedOf(world: unknown, id: string): number {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "speed");
  return v != null ? Number(v) : 0.11;
}

export function heatOf(world: unknown, id: string): number {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "heat");
  return v != null ? Number(v) : 0;
}

export function isHunting(world: unknown, id: string): boolean {
  return objOf(frontier(world, subjectKey(id), OPTS), "hunting") === "true";
}

export function lastHeardOf(world: unknown, id: string): Vec2 | null {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "lastHeard");
  if (!v) return null;
  const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(v);
  return m ? { x: Number(m[1]), z: Number(m[2]) } : null;
}

function chaseStep(from: Vec2, to: Vec2, speed: number): Vec2 {
  const d = v2.sub([to.x, to.z], [from.x, from.z]);
  const dist = v2.length(d);
  if (dist < 1e-6) return { ...from };
  const unit = v2.scale(d, 1 / dist);
  const step = Math.min(speed, dist); // don't overshoot the memory once close
  return { x: from.x + unit[0] * step, z: from.z + unit[1] * step };
}

/** decideStep(world, id, player, intent, t, dt) — one tick: accumulate heat from the player's own
 *  intent this tick (through walls, distance-only), and either commit to hunting (once heat crosses
 *  threshold, latching `lastHeard` to the player's CURRENT position at the moment of the trigger) or
 *  continue toward the already-latched `lastHeard` memory while hunting. Returns the rows to append. */
export function decideStep(
  world: unknown,
  id: string,
  player: Vec2,
  intent: HumIntent,
  t: number,
  dt = 1 / 60,
) {
  const pos = positionOf(world, id);
  if (!pos) return [];
  const s = subjectKey(id);
  const distance = v2.length(v2.sub([player.x, player.z], [pos.x, pos.z]));
  const noise = noiseOf(intent);
  const heat = accumulateHeat(heatOf(world, id), noise, distance, dt);
  const wasHunting = isHunting(world, id);
  const triggersThisTick = !wasHunting && heat >= HEAT_THRESHOLD;
  const nowHunting = wasHunting || triggersThisTick;
  // reset heat on the exact tick a hunt commits: residual heat from the triggering noise must not
  // instantly re-trigger a fresh hunt the moment this one ends (e.g. right after reaching a stale
  // memory) — a player who goes quiet and relocates has genuinely earned a clean slate, matching
  // "lurable, juke-able" in the design. Computed once, before any row is built, so exactly ONE `heat`
  // row is ever filed for tick `t` — never two competing rows on the same (subject,predicate,t) whose
  // relative order a reader would have to guess.
  const heatToFile = triggersThisTick ? 0 : heat;
  const rows = [predicate(s, "heat", String(heatToFile), t)];

  if (triggersThisTick) {
    rows.push(predicate(s, "hunting", "true", t));
    rows.push(predicate(s, "lastHeard", `${player.x},${player.z}`, t));
  }
  if (!nowHunting) return rows; // idle: heat tracked, no movement.

  const target = triggersThisTick ? player : lastHeardOf(world, id) ?? player;
  const speed = speedOf(world, id);
  const next = chaseStep(pos, target, speed);
  rows.push(predicate(s, "at", `${next.x},${next.z}`, t));

  // reached the memory with nothing new heard: stop hunting (heat will have to re-cross threshold).
  if (Math.hypot(next.x - target.x, next.z - target.z) < 1e-6) {
    rows.push(predicate(s, "hunting", "false", t));
  }
  return rows;
}
