// archetypes — the item catalogue, as plain data. An item INSTANCE in the world is a subject with
// an `archetype` predicate pointing here; its stats/slot/value are read from this table rather than
// copied onto every instance. loot.mjs spawns instances, items.mjs equips them, vendor.mjs prices
// them — all from this one source. Equipment grants are applied to a wearer by stats.mjs.
//
// slot ∈ { weapon, armor, trinket } (or null for trash/consumable). grants* fold into the wearer's
// derived stats while equipped. value is the vendor base price (sells for half, buys for full).

export const SLOTS = ["weapon", "armor", "trinket"];

export const ARCHETYPES = {
  // --- weapons --------------------------------------------------------------------------------
  "rusted-sword": { name: "a rusted sword", slot: "weapon", grantsAttack: 2, value: 5, rarity: "common" },
  "iron-blade": { name: "an iron blade", slot: "weapon", grantsAttack: 5, value: 30, rarity: "uncommon" },
  "bone-cleaver": { name: "a bone cleaver", slot: "weapon", grantsAttack: 8, value: 70, rarity: "rare" },
  // --- armor ----------------------------------------------------------------------------------
  "leather-jerkin": { name: "a leather jerkin", slot: "armor", grantsArmor: 2, grantsHealth: 10, value: 25, rarity: "common" },
  "iron-hauberk": { name: "an iron hauberk", slot: "armor", grantsArmor: 5, grantsHealth: 20, value: 60, rarity: "uncommon" },
  // --- trinkets -------------------------------------------------------------------------------
  "bone-charm": { name: "a bone charm", slot: "trinket", grantsArmor: 1, value: 8, rarity: "common" },
  "wolf-fang": { name: "a wolf fang", slot: "trinket", grantsAttack: 3, value: 40, rarity: "uncommon" },
  "crown-of-rust": { name: "the Crown of Rust", slot: "trinket", grantsAttack: 5, grantsHealth: 20, value: 200, rarity: "rare" },
  // --- trash / loot (no slot; sell for coin) --------------------------------------------------
  "bone-shard": { name: "a bone shard", slot: null, value: 2, rarity: "junk" },
  "goblin-ear": { name: "a goblin ear", slot: null, value: 3, rarity: "junk" },
  "ectoplasm": { name: "a vial of ectoplasm", slot: null, value: 6, rarity: "junk" },
};

export function archetype(id) {
  return ARCHETYPES[id] ?? null;
}

// price — what a vendor charges to BUY (full value) or pays to SELL (half, floored at 1).
export function price(id, mode = "buy") {
  const a = archetype(id);
  if (!a) return null;
  return mode === "sell" ? Math.max(1, Math.floor((a.value ?? 0) / 2)) : a.value ?? 0;
}
