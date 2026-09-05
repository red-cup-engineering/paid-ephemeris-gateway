// vendor — buying and selling with a merchant NPC. There is no per-vendor code: a vendor IS an NPC
// whose fiber carries `sells` rows (archetype ids). What it charges and pays comes straight from
// the one catalogue in archetypes.mjs (price buy = full value, sell = half floored at 1), so a
// price never drifts from the gear it names. The player's purse is a single functional `gold` cell,
// moved by `changing` (current ± price) exactly like health or xp; items themselves are minted and
// unmade by items.mjs (grantItem / destroyItem). Equipping is items.mjs's concern too — selling a
// worn item just unequips it first so no slot is left pointing at a thing that no longer exists.

import changing from "#changing";
import { locationOf } from "#substrate";
import { archetype, price } from "#engine/archetypes.mjs";
import { grantItem, destroyItem, unequip } from "#engine/items.mjs";
import { view, valOf, numOf, held } from "#engine/_world.mjs";

// buy — purchase an archetype the vendor sells, for gold. Gated twice: the vendor must list the
// archetype in its `sells` rows, and the player must hold at least its buy price in `gold`. On
// success we deduct the gold (current − price, written as the new functional value) and mint a
// fresh instance straight into the player's pack via grantItem.
export async function buy(root, player, npcId, archetypeId, t, dirty) {
  const npc = await view(root, npcId);
  if (!held(npc, "sells").includes(archetypeId)) return { bought: false, reason: "not-sold" };
  const cost = price(archetypeId, "buy");
  const me = await view(root, player);
  const purse = numOf(me, "gold", 0);
  if (purse < cost) return { bought: false, reason: "poor" };
  // Deduct first, then grant — gold is a single functional cell, so we write its new value, not a delta.
  await changing({ root, subject: player, predicate: "gold", object: purse - cost, t: t() });
  const { item } = await grantItem(root, player, archetypeId, t, dirty);
  dirty.add(player);
  return { bought: true, item, spent: cost };
}

// sell — hand a carried item to the vendor for coin. Gated: the item must be in the player's pack
// (located-in === player) and resolve to a known archetype. If it is worn, unequip it first so the
// slot is not left pointing at a destroyed instance. Then credit half-value gold and unmake it.
export async function sell(root, player, itemId, t, dirty) {
  if ((await locationOf(root, itemId)) !== player) return { sold: false, reason: "not-carried" };
  const item = await view(root, itemId);
  const archId = valOf(item, "archetype");
  if (!archetype(archId)) return { sold: false, reason: "no-archetype" };
  // Clear it out of any slot it currently fills before it leaves the world.
  const me = await view(root, player);
  for (const slot of ["weapon", "armor", "trinket"]) {
    if (valOf(me, `equipped-${slot}`) === itemId) await unequip(root, player, slot, t, dirty);
  }
  const earned = price(archId, "sell");
  const purse = numOf(await view(root, player), "gold", 0);
  await changing({ root, subject: player, predicate: "gold", object: purse + earned, t: t() });
  await destroyItem(root, itemId, t, dirty);
  dirty.add(player);
  return { sold: true, earned };
}

// stockOf — the catalogue a vendor offers, each row resolved to its display name and buy price, for
// the client's shop UI. Reads `sells` straight off the NPC's settled fiber; archetypes that no
// longer exist in the catalogue are skipped rather than listed as broken rows.
export async function stockOf(root, npcId) {
  const npc = await view(root, npcId);
  const out = [];
  for (const archId of held(npc, "sells")) {
    const a = archetype(archId);
    if (!a) continue;
    out.push({ archetype: archId, name: a.name, price: price(archId, "buy") });
  }
  return out;
}
