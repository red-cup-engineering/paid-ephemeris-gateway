// The Toll — anomaly #4: bound to one specific high-value loot pickup. Passive until that item is
// taken; then an UNCONDITIONAL pursuit (no territory, no LOS escape — see warden.mts/unwitnessed.mts
// for those rules, deliberately NOT reused here) until a sustained line-of-sight break or extraction.
// The economic tie-in is stated plainly, not hidden: the price of a Toll-warded item is known before
// the pickup (see level-gen.mts's `wardedBy: "toll"` loot slots and economy.mts's own pricing), never
// discovered only after the fact.
//
// "Triggered" is modeled as a MONOTONIC LATCH over the trace, not a mutable flag: once ANY `triggered`
// row exists for this subject, it is triggered forever (append-only evidence — the substrate has no
// retraction, so "permanently triggered once" falls directly out of "at least one row exists" without
// a fold or converse at all).

import { predicate, allRows, frontier, settleOpts } from "@red-cup-engineering/abrash/world";

export const subjectKey = (id: string): string => `anomaly:toll:${id}`;

export interface Vec2 {
  x: number;
  z: number;
}

export function spawn(id: string, x: number, z: number, opts: { speed?: number } = {}) {
  const s = subjectKey(id);
  const speed = opts.speed ?? 0.14; // faster than the other three — an unconditional pursuit should read as dangerous
  return [
    predicate(s, "kind", "toll", 0),
    predicate(s, "at", `${x},${z}`, 0),
    predicate(s, "speed", String(speed), 0),
  ];
}

/** trigger(id, t) — the row an item-taken event appends. Never call this speculatively — it is a
 *  ONE-WAY latch (see file header): once filed, `isTriggered` is true for the rest of the run. */
export function trigger(id: string, t: number) {
  return predicate(subjectKey(id), "triggered", "taken", t);
}

const OPTS = settleOpts({ functional: new Set(["at", "speed"]) });

function objOf(folded: { fiber: { predicate: string; object: string }[] }, predicateName: string): string | null {
  const cell = folded.fiber.find((c) => c.predicate === predicateName);
  return cell ? cell.object : null;
}

export function positionOf(world: unknown, id: string): Vec2 | null {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "at");
  if (!v) return null;
  const [x, z] = v.split(",").map(Number);
  return { x, z };
}

export function speedOf(world: unknown, id: string): number {
  const v = objOf(frontier(world, subjectKey(id), OPTS), "speed");
  return v != null ? Number(v) : 0.14;
}

/** isTriggered(world, id) — true iff at least one `trigger` row has EVER been filed for this
 *  subject. A direct scan of the linear evidence (allRows), not a fold — there is nothing to fold:
 *  presence alone is the whole predicate, matching the "permanent once" semantics exactly. */
export function isTriggered(world: unknown, id: string): boolean {
  const s = subjectKey(id);
  for (const r of allRows(world)) {
    if (r.e === s && r.a === "triggered") return true;
  }
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

const BREAK_TICKS_TO_CALM = 180; // 3 seconds at 60Hz of a sustained LOS break ends the pursuit

/** decideStep(world, id, player, hasLos, ticksSinceLosBreak, t) — passive (never triggered): stand
 *  still, no row at all. Triggered: unconditional pursuit UNLESS the caller reports a sustained LOS
 *  break of at least `BREAK_TICKS_TO_CALM` ticks (the caller owns LOS tracking — this module only
 *  decides what to do with the count it's handed, so it stays pure and trivially testable). */
export function decideStep(
  world: unknown,
  id: string,
  player: Vec2,
  ticksSinceLosBreak: number,
  t: number,
) {
  if (!isTriggered(world, id)) return []; // passive: no evidence, no movement.
  const pos = positionOf(world, id);
  if (!pos) return [];
  if (ticksSinceLosBreak >= BREAK_TICKS_TO_CALM) return []; // sustained break: pursuit ends, it holds position.
  const speed = speedOf(world, id);
  const next = chaseStep(pos, player, speed);
  if (next.x === pos.x && next.z === pos.z) return [];
  return [predicate(subjectKey(id), "at", `${next.x},${next.z}`, t)];
}

export { BREAK_TICKS_TO_CALM };
