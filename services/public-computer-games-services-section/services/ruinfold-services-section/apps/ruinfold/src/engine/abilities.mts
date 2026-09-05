// abilities — the player's active combat moves, ported from legacy engine/abilities.mjs. Each
// ability is DATA (cost/cooldown/which cooldown field it stamps) and funnels every hit through
// combat.strike — it never decides what a kill MEANS.

import type { World, StrikeKill } from "#engine/world.mts";
import { view, dist2 } from "#engine/world.mts";
import { strike, MELEE_RANGE } from "#engine/combat.mts";
import { apply as applyEffect } from "#engine/effects.mts";
import { glyphOf } from "#engine/bilattice.mts";

const BOLT_RANGE = 14;

export type AbilityName = "heavy" | "cleave" | "bolt" | "second-wind";

interface AbilitySpec {
  cost: number;
  cooldown: number;
  cd: "heavy" | "cleave" | "bolt" | "heal";
}

export const ABILITIES: Record<AbilityName, AbilitySpec> = {
  heavy: { cost: 6, cooldown: 4, cd: "heavy" }, // melee, 2x attack-power
  cleave: { cost: 8, cooldown: 6, cd: "cleave" }, // melee AoE, every hostile in reach
  bolt: { cost: 5, cooldown: 3, cd: "bolt" }, // ranged (14), round(1.5x attack-power)
  "second-wind": { cost: 8, cooldown: 10, cd: "heal" }, // self-heal 10 + 2*level
};

export interface AbilityResult {
  used: boolean;
  reason?: string;
  kills: StrikeKill[];
}

function isUp(world: World, id: string): boolean {
  const a = view(world, id);
  if (!a) return false;
  if (a.status === "ghost" || a.status === "dead" || a.status === "slain") return false;
  const g = glyphOf(a.alive);
  return g !== "f" && g !== "⊥";
}

export function useAbility(world: World, actorId: string, ability: AbilityName, targetId: string | null, tick: number): AbilityResult {
  const spec = ABILITIES[ability];
  if (!spec) return { used: false, reason: "unknown", kills: [] };

  const a = view(world, actorId);
  if (!a) return { used: false, reason: "unknown-actor", kills: [] };
  if (!isUp(world, actorId)) return { used: false, reason: "down", kills: [] };
  if (a.stamina < spec.cost) return { used: false, reason: "stamina", kills: [] };
  if (a.cooldowns[spec.cd] > tick) return { used: false, reason: "cooldown", kills: [] };

  a.stamina -= spec.cost;
  a.cooldowns[spec.cd] = tick + spec.cooldown;

  const kills: StrikeKill[] = [];

  if (ability === "heavy" || ability === "bolt") {
    const target = targetId ? view(world, targetId) : undefined;
    if (target) {
      const range = ability === "heavy" ? MELEE_RANGE : BOLT_RANGE;
      const sameZone = a.zoneId === target.zoneId;
      const inReach = dist2(a.pos, target.pos) <= range * range;
      if (sameZone && inReach) {
        const amount = ability === "heavy" ? 2 * a.attackPower : Math.round(1.5 * a.attackPower);
        const r = strike(world, actorId, targetId as string, amount, tick);
        if (r.killed) kills.push({ target: r.target as string, deathRule: r.deathRule as StrikeKill["deathRule"], killer: actorId });
        else if (r.hit) applyEffect(world, targetId as string, ability === "heavy" ? "stun" : "poison", ability === "heavy" ? 1 : 4, tick);
      }
    }
  } else if (ability === "cleave") {
    const r2 = MELEE_RANGE * MELEE_RANGE;
    for (const [id, m] of world.entities) {
      if (id === actorId || m.kind !== "monster" || !m.hostile) continue;
      const g = glyphOf(m.alive);
      if (g === "f" || g === "⊥") continue;
      if (m.zoneId !== a.zoneId) continue;
      if (dist2(a.pos, m.pos) > r2) continue;
      const r = strike(world, actorId, id, a.attackPower, tick);
      if (r.killed) kills.push({ target: r.target as string, deathRule: r.deathRule as StrikeKill["deathRule"], killer: actorId });
    }
  } else if (ability === "second-wind") {
    const heal = 10 + 2 * a.level;
    a.health = Math.min(a.maxHealth, a.health + heal);
  }

  return { used: true, kills };
}
