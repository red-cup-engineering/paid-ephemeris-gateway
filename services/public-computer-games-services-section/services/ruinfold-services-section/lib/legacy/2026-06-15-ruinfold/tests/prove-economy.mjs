// prove-economy — coin and gear. A vendor sells from its stock for gold and buys back at half; a
// slain monster yields loot on the ground and coin for its killer. Drives the vendor + loot engines
// directly over a temp world.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { buy, sell, stockOf } from "#engine/vendor.mjs";
import { dropLoot } from "#engine/loot.mjs";
import { inventoryOf } from "#engine/items.mjs";
import { view, numOf, valOf } from "#engine/_world.mjs";
import { locationOf } from "#substrate";
import changing from "#changing";

const { root, t, cleanup } = await world();
try {
  const d = new Set();
  await spawnPlayer(root, "hero", t, d);
  await changing({ root, subject: "hero", predicate: "gold", object: 50, t: t() });

  section("a vendor sells from its stock for gold");
  assert((await stockOf(root, "rag-merchant")).some((w) => w.archetype === "iron-blade"), "the rag-merchant stocks an iron blade");
  const b = await buy(root, "hero", "rag-merchant", "iron-blade", t, d);
  assert(b.bought === true && b.spent === 30, "bought the iron blade for 30");
  assert(numOf(await view(root, "hero"), "gold", 0) === 20, "gold 50 → 20");
  assert((await buy(root, "hero", "rag-merchant", "iron-blade", t, d)).reason === "poor", "can't afford a second (only 20 gold)");
  assert((await buy(root, "hero", "rag-merchant", "bone-shard", t, d)).reason === "not-sold", "the vendor won't sell what it doesn't stock");

  section("…and buys it back at half");
  const blade = (await inventoryOf(root, "hero")).find((i) => i.archetype === "iron-blade");
  const s = await sell(root, "hero", blade.id, t, d);
  assert(s.sold === true && s.earned === 15, "sold the blade back for 15 (half of 30)");
  assert(numOf(await view(root, "hero"), "gold", 0) === 35, "gold 20 → 35");
  assert((await locationOf(root, blade.id)) !== "hero", "the sold blade left the pack");

  section("a slain monster yields loot on the ground and coin");
  const drop = await dropLoot(root, "skeleton-1", t, d);
  assert(drop.gold === 2, "skeleton yields 2 gold to its killer");
  assert(drop.items.length === 1, "and one loot item on the ground");
  const lootId = drop.items[0];
  assert(valOf(await view(root, lootId), "kind") === "item", "the loot is a real item instance");
  assert((await locationOf(root, lootId)) === "the-courtyard", "lying where the skeleton fell");
} finally {
  cleanup();
}
report("prove-economy");
