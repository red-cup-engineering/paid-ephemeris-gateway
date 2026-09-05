// loot — what a corpse leaves behind, ported from legacy engine/loot.mjs. When a monster dies,
// the tick asks dropLoot to turn its `drops` catalogue (archetype ids) into real item instances on
// the ground at the corpse, and to report the gold the killer should be credited. dropLoot owns
// only the WORLD side (spawning grounded loot) and stays out of the killer's purse — the caller
// credits gold, so the same routine works whoever struck the killing blow.

import type { World } from "#engine/world.mts";
import { view, freshEntity, addEntity } from "#engine/world.mts";
import { archetype } from "#engine/archetypes.mts";

// SCATTER — horizontal gap between successive drops so two items from the same corpse don't land
// exactly on top of each other. Deterministic offset by index: x + i*SCATTER.
export const SCATTER = 1.5;

export interface DropResult {
  items: string[];
  gold: number;
}

// dropLoot — spawn the monster's drops at its corpse; report the gold to credit. A monster with no
// drops and no gold-value yields { items: [], gold: 0 }. Re-killing a re-risen undead recycles the
// SAME instance ids rather than minting a fresh pile each time.
export function dropLoot(world: World, monsterId: string): DropResult {
  const corpse = view(world, monsterId);
  if (!corpse) return { items: [], gold: 0 };
  const drops = corpse.drops ?? [];
  const gold = corpse.goldValue ?? 0;
  const zoneId = corpse.zoneId;

  const items: string[] = [];
  drops.forEach((archetypeId, i) => {
    const a = archetype(archetypeId);
    if (!a) return;
    const id = `loot-${monsterId}-${archetypeId}`;
    const pos = { x: corpse.pos.x + i * SCATTER, z: corpse.pos.z };
    let inst = world.entities.get(id);
    if (!inst) {
      inst = freshEntity(id, "item", a.name);
      inst.archetypeId = archetypeId;
      addEntity(world, inst);
    }
    inst.zoneId = zoneId;
    inst.carriedBy = null;
    inst.pos = pos;
    items.push(id);
  });

  return { items, gold };
}
