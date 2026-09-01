// contested-gate — The Contested (anomaly #4), the periodic half of it: level-gen.mts pre-seeds each
// reflip site as a permanently-held ⊤ voxel (both solid faces filed at generation — see that file's
// own header for why the trace itself can never "un-contest" a cell). What makes a reflip site
// PERIODICALLY passable is entirely this module: a pure, deterministic function of the current game
// tick, fed to movement.mts's `stepMovement` as its EXT-3 `passContestedWhere` hook (see
// src/ext/collision-per-voxel.mts). "Bounded, disclosed timeout" is the whole contract: a route you
// already walked can close on you, but it always reopens on a fixed, learnable cycle — never a random
// closure, never a permanent one.

import { cellKey } from "@red-cup-engineering/abrash/world";

export interface ContestedSiteLike {
  x: number;
  z: number;
}

export const REFLIP_CYCLE_TICKS = 300; // 5 seconds at 60Hz per half-phase (10s full cycle)

/** isOpenAt(tick, cycleTicks) — the site-independent half of the gate: true during the "open" half
 *  of the cycle. Exported standalone because the browser face's HUD wants to show a countdown to the
 *  next flip without recomputing the whole passContestedWhere closure. */
export function isOpenAt(tick: number, cycleTicks: number = REFLIP_CYCLE_TICKS): boolean {
  return Math.floor(Math.max(0, tick) / cycleTicks) % 2 === 1;
}

/** ticksUntilFlip(tick, cycleTicks) — how many ticks remain until this site's open/closed state next
 *  flips (a HUD affordance so "learn the rule by watching it" has something concrete to watch). */
export function ticksUntilFlip(tick: number, cycleTicks: number = REFLIP_CYCLE_TICKS): number {
  const intoCycle = Math.max(0, tick) % cycleTicks;
  return cycleTicks - intoCycle;
}

/** passContestedWhereFor(sites, tick, cycleTicks) — builds the EXT-3 hook: true only for a voxel
 *  that IS one of the level's named reflip sites AND is currently in its open half-cycle. Every other
 *  ⊤ voxel (an ambient pre-seeded hazard, or any other contested cell) falls through to abrash's own
 *  default (blocks) — a reflip site is deliberately the ONLY kind of ⊤ cell this game ever opts open. */
export function passContestedWhereFor(
  sites: readonly ContestedSiteLike[],
  tick: number,
  cycleTicks: number = REFLIP_CYCLE_TICKS,
): (subjectKey: string) => boolean {
  const siteKeys = new Set(sites.map((s) => cellKey(s.x, s.z)));
  const open = isOpenAt(tick, cycleTicks);
  return (subjectKey: string) => open && siteKeys.has(subjectKey);
}
