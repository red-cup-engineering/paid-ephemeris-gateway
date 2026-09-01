// stats — derive a wearer's combat stats from LEVEL + EQUIPPED items, ported from legacy
// engine/stats.mjs. The one place attack-power/armor/max-health are computed, so level-ups and
// equip changes never drift apart.

import type { World, Entity } from "#engine/world.mts";
import { view } from "#engine/world.mts";
import { statsForLevel } from "#engine/progression.mts";
import { archetype } from "#engine/archetypes.mts";

const SLOTS = ["weapon", "armor", "trinket"] as const;

export function recomputeStats(world: World, subject: Entity): void {
  const base = statsForLevel(subject.level);

  let attack = base.attackPower;
  let armor = 0;
  let health = base.maxHealth;

  for (const slot of SLOTS) {
    const instId = subject.equipped[slot];
    if (!instId) continue;
    const inst = view(world, instId);
    const a = inst ? archetype(inst.archetypeId) : null;
    if (!a) continue;
    attack += a.grantsAttack ?? 0;
    armor += a.grantsArmor ?? 0;
    health += a.grantsHealth ?? 0;
  }

  subject.attackPower = attack;
  subject.armor = armor;
  subject.maxHealth = health;
  // current health never exceeds the recomputed max (unequipping +health gear can lower it)
  if (subject.health > health) subject.health = health;
}
