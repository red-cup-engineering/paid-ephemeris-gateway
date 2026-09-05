// ai — what a monster does on its tick. Ported from legacy engine/ai.mjs, collapsed to solo play
// (design §7 drops threat.mjs's multiplayer tanking half: "the monster targets the one player in
// the zone" is the whole acquisition rule now, no threat table to consult). There is still no
// per-monster code: behaviour is read off the monster's own data (hostile/aggro/attack-power/
// attack-range/home) and the same generic turn runs for a goblin, a wraith, or the boss.
//
// The turn: acquire the player if in my zone, within aggro, and targetable; leash home if dragged
// too far chasing; engage (strike) if in range, else close the gap one step; idle-return to my
// home post otherwise.
//
// Deterministic: no RNG anywhere. Given the same trace, the same monster does the same thing on
// the same tick, every time — a tick is a pure function of (world, tick).

import type { World, StrikeKill } from "#engine/world.mts";
import { view, dist2 } from "#engine/world.mts";
import { strike, MELEE_RANGE } from "#engine/combat.mts";
import { setGoal, step } from "#engine/movement.mts";
import { glyphOf } from "#engine/bilattice.mts";
import { isStunned, attackDelta } from "#engine/effects.mts";

const LEASH = 1.6; // a chase beyond aggro*LEASH from home is abandoned
const HOME_SLACK = 2; // an idle monster within this many units of home is "at post"
const HOME_SLACK2 = HOME_SLACK * HOME_SLACK;

export interface AiResult {
  acted: boolean;
  kill?: StrikeKill;
}

// targetable — is the player, right now, a legal thing for a monster to hunt: in this zone, on
// their feet (not a ghost, not voided, not a settled corpse). A risen (⊤) player still counts.
function targetable(world: World, playerId: string, zoneId: string): boolean {
  const p = view(world, playerId);
  if (!p || p.zoneId !== zoneId) return false;
  if (p.status === "ghost" || p.status === "voided" || p.status === "slain") return false;
  const g = glyphOf(p.alive);
  return g !== "f" && g !== "⊥";
}

export function aiTurn(world: World, monsterId: string, playerId: string, tick: number): AiResult {
  const me = view(world, monsterId);
  if (!me) return { acted: false };
  if (me.status === "slain" || me.status === "vanished") return { acted: false };
  if (me.health <= 0) return { acted: false };
  if (!me.hostile) return { acted: false };
  if (!me.zoneId) return { acted: false };
  if (isStunned(me, tick)) return { acted: false };

  const here = me.pos;
  const aggro = me.aggro ?? 10;
  const aggro2 = aggro * aggro;
  const home = { x: me.homeX, z: me.homeZ };
  const reach = me.attackRange ?? MELEE_RANGE;
  const reach2 = reach * reach;

  const goHome = (): AiResult => {
    setGoal(world, monsterId, home.x, home.z);
    step(world, monsterId);
    return { acted: true };
  };

  let target: { id: string; pos: { x: number; z: number } } | null = null;
  if (targetable(world, playerId, me.zoneId)) {
    const p = view(world, playerId)!;
    if (dist2(here, p.pos) <= aggro2) target = { id: playerId, pos: p.pos };
  }

  if (target) {
    // Leash: dragged too far from home? Abandon the chase and walk back to post.
    const leashR = aggro * LEASH;
    if (dist2(here, home) > leashR * leashR) return goHome();

    // Engage: strike if in reach, else close the gap one step.
    if (dist2(here, target.pos) <= reach2) {
      const power = Math.max(0, (me.attackPower ?? 1) + attackDelta(me, tick));
      const r = strike(world, monsterId, target.id, power, tick);
      if (r.killed) {
        return { acted: true, kill: { target: target.id, deathRule: r.deathRule as StrikeKill["deathRule"], killer: monsterId } };
      }
      return { acted: true };
    }
    setGoal(world, monsterId, target.pos.x, target.pos.z);
    step(world, monsterId);
    return { acted: true };
  }

  // Idle/return: no target. Drift back to my post if I have strayed; else hold.
  if (dist2(here, home) > HOME_SLACK2) return goHome();
  return { acted: false };
}
