// ai — what a monster does on its tick. There is NO per-monster code: a monster IS its fiber.
// The behaviour is read from data — `mover:tick` enrolls it, `hostile`/`aggro` set its reach,
// `attack-power` its bite, `attack-range` how far that bite reaches (melee 3, longer for a
// `ranged` caster), `home-x`/`home-z` the post it patrols and leashes back to — and the same
// generic turn runs for a skeleton, a wraith, or the boss.
//
// The turn (v2):
//   acquire  the nearest targetable player in MY zone within my aggro radius;
//   leash    if I have wandered farther from home than aggro*1.6 chasing, abandon and walk home;
//   engage   if a target is within my attack-range, strike it; otherwise close the gap one step;
//   idle     with no target, drift back toward my home post if I have strayed > ~2 units.
//
// Deterministic: NO RNG. Given the same trace, the same monsters chase the same players the same
// way (nearest-by-squared-distance, ties broken by playerIds order), so a replay of the log
// reproduces the world exactly — the tick is a pure function of state.
//
// aiTurn(root, monsterId, playerIds, t, dirty) -> { acted, kill? }
//   kill (when a blow is fatal) = { target, deathRule, killer } for the caller's death resolution.

import { strike, MELEE_RANGE } from "#engine/combat.mjs";
import { setGoal, step } from "#engine/movement.mjs";
import { view, posOf, dist2, numOf, valOf, glyphOf, zoneOf } from "#engine/_world.mjs";
import { topThreat } from "#engine/threat.mjs";
import { activeEvent, modifiersOf } from "#engine/events.mjs";

const LEASH = 1.6; // a chase is abandoned past aggro*LEASH from home — keeps mobs from being dragged
const HOME_SLACK = 2; // an idle monster within this many units of home is "at post" and does nothing
const HOME_SLACK2 = HOME_SLACK * HOME_SLACK;

// targetable — a player a monster may hunt: in the SAME zone, on its feet (not a ghost, not a
// settled corpse), and still affirmed alive (an undead player held at ⊤ would still count).
async function targetable(root, playerId, zone) {
  if ((await zoneOf(root, playerId)) !== zone) return null;
  const p = await view(root, playerId);
  const status = valOf(p, "status", "up");
  if (status === "ghost" || status === "dead" || status === "slain") return null;
  const g = glyphOf(p, "alive", playerId);
  if (g === "f" || g === "⊥") return null;
  return p;
}

export async function aiTurn(root, monsterId, playerIds, t, dirty) {
  const me = await view(root, monsterId);

  // A monster only acts while it is up. A slain/vanished one is waiting on its respawn timer; a
  // risen undead (status "risen", alive ⊤) IS up and keeps fighting.
  const status = valOf(me, "status", "up");
  if (status === "slain" || status === "vanished") return { acted: false };
  if (numOf(me, "health", 1) <= 0) return { acted: false };
  if (!valOf(me, "hostile", false)) return { acted: false };

  const myZone = await zoneOf(root, monsterId);
  if (!myZone) return { acted: false };

  const here = posOf(me);
  // A world event (blood-moon / undead-tide) empowers the undead: wider aggro and a harder bite.
  const isUndead = valOf(me, "death-rule") === "undead";
  const mods = isUndead ? modifiersOf((await activeEvent(root)).id) : {};
  const aggro = numOf(me, "aggro", 10) + (mods.undeadAggro ?? 0);
  const aggro2 = aggro * aggro;
  const home = { x: numOf(me, "home-x", here.x), z: numOf(me, "home-z", here.z) };
  const reach = numOf(me, "attack-range", MELEE_RANGE);
  const reach2 = reach * reach;

  // Walk one step back toward my home post. Shared by leash and idle-return.
  const goHome = async () => {
    await setGoal(root, monsterId, home.x, home.z, t, dirty);
    await step(root, monsterId, t, dirty);
    return { acted: true };
  };

  // ---- Acquire: nearest targetable player in my zone within aggro. -------------------------
  let best = null;
  let bestD = Infinity;
  for (const pid of playerIds) {
    const p = await targetable(root, pid, myZone);
    if (!p) continue;
    const d = dist2(here, posOf(p));
    if (d <= aggro2 && d < bestD) {
      bestD = d;
      best = { id: pid, pos: posOf(p) };
    }
  }

  // Threat overrides proximity: whoever has hurt me most pulls my aggro, even if not the closest
  // (this is what lets a tank hold a monster off the squishy players behind them).
  const tt = await topThreat(root, monsterId);
  if (tt) {
    const p = await targetable(root, tt, myZone);
    if (p) best = { id: tt, pos: posOf(p) };
    if (p) bestD = dist2(here, posOf(p));
  }

  if (best) {
    // ---- Leash: dragged too far from home? abandon the chase and walk back to post. --------
    const leashR = aggro * LEASH;
    if (dist2(here, home) > leashR * leashR) return goHome();

    // ---- Engage: strike if within attack-range, else close the gap one step. ----------------
    if (bestD <= reach2) {
      const power = numOf(me, "attack-power", 1) + (mods.undeadAttack ?? 0);
      const r = await strike(root, monsterId, best.id, power, t, dirty);
      if (r.killed) return { acted: true, kill: { target: best.id, deathRule: r.deathRule, killer: monsterId } };
      return { acted: true };
    }
    // Chase: steer onto the player and take one step (ranged mobs keep closing until within
    // their longer attack-range, then strike on a later tick).
    await setGoal(root, monsterId, best.pos.x, best.pos.z, t, dirty);
    await step(root, monsterId, t, dirty);
    return { acted: true };
  }

  // ---- Idle/return: no target. Drift back to my post if I have strayed; else hold. ---------
  if (dist2(here, home) > HOME_SLACK2) return goHome();
  return { acted: false };
}
