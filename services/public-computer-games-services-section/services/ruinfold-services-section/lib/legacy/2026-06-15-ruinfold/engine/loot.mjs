// loot — what a corpse leaves behind. When a monster dies, the death handler asks dropLoot to turn
// the monster's catalogue of `drops` (archetype-id rows) into actual item INSTANCES lying on the
// ground at the corpse, and to report the `gold-value` the killer should be credited. The split is
// deliberate: dropLoot owns the WORLD side (spawning grounded loot) and stays out of the killer's
// purse — the caller credits gold, so the same routine works whoever struck the killing blow.
//
// An instance here is the same shape items.mjs/grantItem mints: a subject with `kind`="item",
// an `archetype` pointing into the catalogue (stats/slot/value are read from there, never copied),
// a `naming`, and a `located-in` place plus pos-x/y/z. We file kind/archetype/naming AMBIENTLY with
// `doing` (the loot is a fact of the world, perceivable by all — matching how the seed files items),
// and the place/position with `changing` so a re-kill restitutes the same cells cleanly.

import changing from "#changing";
import doing from "#doing";
import { locationOf } from "#substrate";
import { ARCHETYPES } from "#engine/archetypes.mjs";
import { view, numOf, held, posOf } from "#engine/_world.mjs";

// SCATTER — horizontal gap (in world units) between successive drops so two items from the same
// corpse don't land exactly on top of each other. Deterministic offset by index: x + i*SCATTER.
export const SCATTER = 1.5;

// dropLoot — spawn the monster's drops on the ground at its corpse and report the gold to credit.
// Returns { items:[spawned ids], gold:number }. Touches only the loot and the world floor; the
// killer's gold is the caller's business. A monster with no drops and no gold yields {items:[],gold:0}.
export async function dropLoot(root, monsterId, t, dirty) {
  const corpse = await view(root, monsterId);
  const drops = held(corpse, "drops"); // the archetype ids this monster leaves behind
  const gold = numOf(corpse, "gold-value", 0); // coin to credit the killer (we don't credit it)
  const zone = await locationOf(root, monsterId); // the place the corpse lies in
  const { x, z } = posOf(corpse); // where on that floor

  const items = [];
  for (let i = 0; i < drops.length; i++) {
    const archetypeId = drops[i];
    // Stable per-(monster,archetype) id: re-killing recycles the SAME instance rather than minting a
    // fresh pile each time. That's fine — the cells just restitute to the same grounded values.
    const id = `loot-${monsterId}-${archetypeId}`;
    await doing({ root, subject: id, predicate: "kind", object: "item", t: t() });
    await doing({ root, subject: id, predicate: "archetype", object: archetypeId, t: t() });
    await doing({ root, subject: id, predicate: "naming", object: ARCHETYPES[archetypeId].name, t: t() });
    await changing({ root, subject: id, predicate: "located-in", object: zone, t: t() });
    await changing({ root, subject: id, predicate: "pos-x", object: x + i * SCATTER, t: t() });
    await changing({ root, subject: id, predicate: "pos-y", object: 0, t: t() });
    await changing({ root, subject: id, predicate: "pos-z", object: z, t: t() });
    dirty.add(id);
    items.push(id);
  }

  return { items, gold };
}
