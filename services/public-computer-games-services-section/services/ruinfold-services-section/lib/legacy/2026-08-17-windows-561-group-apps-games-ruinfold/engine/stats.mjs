// stats — derive a wearer's combat stats from LEVEL + EQUIPPED items, and write them back. This is
// the one place attack-power / armor / max-health are computed, so level-ups and equip changes can
// never drift apart: both call recomputeStats and get the same answer. Base stats come from the
// level curve (progression.statsForLevel); each equipped slot adds its archetype's grants.

import { statsForLevel } from "#engine/progression.mjs";
import { SLOTS, archetype } from "#engine/archetypes.mjs";
import changing from "#changing";
import { view, valOf, numOf } from "#engine/_world.mjs";

// recomputeStats(root, subject, t, dirty) — set attack-power/armor/max-health from level + gear,
// and clamp current health to the (possibly lowered) max. Call after any equip/unequip or level-up.
export async function recomputeStats(root, subject, t, dirty) {
  const me = await view(root, subject);
  const level = numOf(me, "level", 1);
  const base = statsForLevel(level); // { maxHealth, attackPower }

  let attack = base.attackPower;
  let armor = 0;
  let health = base.maxHealth;

  for (const slot of SLOTS) {
    const instId = valOf(me, `equipped-${slot}`, null);
    if (!instId) continue;
    const inst = await view(root, instId);
    const a = archetype(valOf(inst, "archetype", null));
    if (!a) continue;
    attack += a.grantsAttack ?? 0;
    armor += a.grantsArmor ?? 0;
    health += a.grantsHealth ?? 0;
  }

  await changing({ root, subject, predicate: "attack-power", object: attack, t: t() });
  await changing({ root, subject, predicate: "armor", object: armor, t: t() });
  await changing({ root, subject, predicate: "max-health", object: health, t: t() });

  // current health never exceeds the recomputed max (unequipping +health gear can lower it)
  const cur = numOf(me, "health", health);
  if (cur > health) await changing({ root, subject, predicate: "health", object: health, t: t() });

  dirty.add(subject);
  return { attackPower: attack, armor, maxHealth: health };
}
