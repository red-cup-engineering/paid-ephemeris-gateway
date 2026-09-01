// combat — the one shared damage primitive, ported from legacy engine/combat.mjs. strike()
// applies damage and resolves a killing blow; attack() gates a melee swing on same-zone + reach
// before calling strike(). Neither decides what a kill MEANS — death.mts reads the report and
// routes the bilattice. threat.mjs is dropped for v0 (solo play collapses "who does the monster
// fight" to "the one player in the zone" — see ai.mts), so strike no longer touches a threat table.

import type { World, DeathRule } from "#engine/world.mts";
import { view, dist2 } from "#engine/world.mts";
import { glyphOf } from "#engine/bilattice.mts";
import { attackDelta, isStunned } from "#engine/effects.mts";

export const MELEE_RANGE = 3;
const MELEE_R2 = MELEE_RANGE * MELEE_RANGE;

export interface StrikeResult {
  hit: boolean;
  killed?: boolean;
  deathRule?: DeathRule;
  target?: string;
  dmg?: number;
}

// isHittable — already a corpse / gone? An undead held at ⊤ is still hittable (it's up).
function isHittable(world: World, targetId: string): boolean {
  const target = view(world, targetId);
  if (!target) return false;
  if (glyphOf(target.alive) === "f") return false;
  if (target.status === "slain" || target.status === "vanished" || target.status === "ghost" || target.status === "voided") return false;
  return true;
}

export function strike(world: World, attackerId: string, targetId: string, amount: number, tick: number): StrikeResult {
  const attacker = view(world, attackerId);
  const target = view(world, targetId);
  if (!attacker || !target) return { hit: false };
  if (!isHittable(world, targetId)) return { hit: false };

  const dmg = Math.max(1, Math.round(amount - target.armor)); // armor soaks; a hit always stings >= 1
  const next = target.health - dmg;

  target.health = next;
  target.lastCombat = tick;
  attacker.lastCombat = tick;

  if (next <= 0) {
    // The killing blow. Attributed to the attacker so xp/loot/scoring all know who did it.
    return { hit: true, killed: true, deathRule: target.deathRule ?? "mortal", target: targetId, dmg };
  }
  return { hit: true, killed: false, target: targetId, dmg };
}

// attack — a basic melee swing: gate on same-zone + reach, then strike for attack-power (net of
// any active might/weaken delta). A stunned attacker's swing never lands.
export function attack(world: World, attackerId: string, targetId: string, tick: number): StrikeResult {
  const attacker = view(world, attackerId);
  const target = view(world, targetId);
  if (!attacker || !target) return { hit: false };
  if (isStunned(attacker, tick)) return { hit: false };
  if (!isHittable(world, targetId)) return { hit: false };
  if (attacker.zoneId !== target.zoneId) return { hit: false };
  if (dist2(attacker.pos, target.pos) > MELEE_R2) return { hit: false };
  const amount = Math.max(0, attacker.attackPower + attackDelta(attacker, tick));
  return strike(world, attackerId, targetId, amount, tick);
}
