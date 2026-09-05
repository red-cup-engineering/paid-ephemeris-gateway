// items — carrying, equipping, and granting. An item is a subject whose `located-in` is a place
// (on the ground) or a player (in their pack); pickup/drop is just `changing` that relation — the
// dual filing makes "what's here / what am I carrying" a local read. EQUIPPING is separate from
// carrying: a slot (weapon/armor/trinket) holds a carried item's id, and stats.recomputeStats
// derives the wearer's attack/armor/health from level + whatever is slotted. Stats live in exactly
// one place (stats.mjs), so nothing drifts.

import changing from "#changing";
import doing, { retract } from "#doing";
import { containedBy, locationOf } from "#substrate";
import { archetype } from "#engine/archetypes.mjs";
import { recomputeStats } from "#engine/stats.mjs";
import { view, valOf, posOf, dist2 } from "#engine/_world.mjs";

export const PICKUP_RANGE = 3;
const PICKUP_R2 = PICKUP_RANGE * PICKUP_RANGE;

// pickup — take a grounded item in reach into the pack (located-in → the carrier). No stat change;
// equipping is a separate, deliberate act.
export async function pickup(root, subject, itemId, t, dirty) {
  const item = await view(root, itemId);
  if (valOf(item, "kind") !== "item") return { picked: false, reason: "not-an-item" };
  const here = await locationOf(root, subject);
  if ((await locationOf(root, itemId)) !== here) return { picked: false, reason: "not-here" };
  const me = await view(root, subject);
  if (dist2(posOf(me), posOf(item)) > PICKUP_R2) return { picked: false, reason: "too-far" };
  // file the move ambiently (matches how the seed files item located-in), so it stays in the
  // item's own settled view rather than being filtered out as someone else's attributed cut.
  await changing({ root, subject: itemId, predicate: "located-in", object: subject, t: t() });
  dirty.add(itemId);
  dirty.add(subject);
  return { picked: true, item: itemId };
}

// drop — put a carried item back on the ground at the carrier's feet. Unequips it first if worn.
export async function drop(root, subject, itemId, t, dirty) {
  if ((await locationOf(root, itemId)) !== subject) return { dropped: false, reason: "not-carried" };
  const me = await view(root, subject);
  for (const slot of ["weapon", "armor", "trinket"]) {
    if (valOf(me, `equipped-${slot}`) === itemId) await unequip(root, subject, slot, t, dirty);
  }
  const zone = await locationOf(root, subject);
  const { x, z } = posOf(await view(root, subject));
  await changing({ root, subject: itemId, predicate: "located-in", object: zone, t: t() });
  await changing({ root, subject: itemId, predicate: "pos-x", object: x, t: t() });
  await changing({ root, subject: itemId, predicate: "pos-y", object: 0, t: t() });
  await changing({ root, subject: itemId, predicate: "pos-z", object: z, t: t() });
  dirty.add(itemId);
  dirty.add(subject);
  return { dropped: true };
}

// equip — slot a carried, slottable item; whatever was in that slot stays in the pack. Recomputes
// the wearer's stats from level + all equipped gear.
export async function equip(root, subject, itemId, t, dirty) {
  if ((await locationOf(root, itemId)) !== subject) return { equipped: false, reason: "not-carried" };
  const a = archetype(valOf(await view(root, itemId), "archetype"));
  if (!a || !a.slot) return { equipped: false, reason: "not-equippable" };
  await changing({ root, subject, predicate: `equipped-${a.slot}`, object: itemId, t: t() });
  await recomputeStats(root, subject, t, dirty);
  dirty.add(subject);
  return { equipped: true, slot: a.slot };
}

// unequip — empty a slot (the item stays carried). Recomputes stats. We mark the slot empty with a
// retraction so the equipped-<slot> cell folds away cleanly.
export async function unequip(root, subject, slot, t, dirty) {
  await retract({ root, subject, predicate: `equipped-${slot}`, t: t() });
  await recomputeStats(root, subject, t, dirty);
  dirty.add(subject);
  return { unequipped: true, slot };
}

// grantItem — mint a fresh item instance straight into an owner's pack (vendor purchase, quest
// reward, loot). The id is derived from the archetype + the clock so it is unique within the run.
export async function grantItem(root, owner, archetypeId, t, dirty) {
  const a = archetype(archetypeId);
  if (!a) return { granted: false, reason: "unknown-archetype" };
  const stamp = t();
  const id = `${archetypeId}-${stamp.replace(/\D/g, "")}`;
  await doing({ root, subject: id, predicate: "kind", object: "item", t: stamp });
  await doing({ root, subject: id, predicate: "archetype", object: archetypeId, t: t() });
  await doing({ root, subject: id, predicate: "naming", object: a.name, t: t() });
  await changing({ root, subject: id, predicate: "located-in", object: owner, t: t() });
  dirty.add(id);
  dirty.add(owner);
  return { granted: true, item: id };
}

// destroyItem — remove an item from the world (sold to a vendor). Retract its located-in so it
// stops resolving anywhere; the snapshot then culls it.
export async function destroyItem(root, itemId, t, dirty) {
  await retract({ root, subject: itemId, predicate: "located-in", t: t() });
  dirty.add(itemId);
  return { destroyed: true };
}

// inventoryOf — the items a subject carries, with their archetype facts and whether each is worn.
export async function inventoryOf(root, subject) {
  const me = await view(root, subject);
  const worn = new Set(["weapon", "armor", "trinket"].map((s) => valOf(me, `equipped-${s}`)).filter(Boolean));
  const out = [];
  for (const id of await containedBy(root, subject)) {
    const thing = await view(root, id);
    if (valOf(thing, "kind") !== "item") continue;
    const a = archetype(valOf(thing, "archetype")) ?? {};
    out.push({ id, archetype: valOf(thing, "archetype"), name: valOf(thing, "naming", id), slot: a.slot ?? null, value: a.value ?? 0, equipped: worn.has(id) });
  }
  return out;
}

// equippedOf — the instance id in each slot (or null).
export async function equippedOf(root, subject) {
  const me = await view(root, subject);
  return {
    weapon: valOf(me, "equipped-weapon") ?? null,
    armor: valOf(me, "equipped-armor") ?? null,
    trinket: valOf(me, "equipped-trinket") ?? null,
  };
}
