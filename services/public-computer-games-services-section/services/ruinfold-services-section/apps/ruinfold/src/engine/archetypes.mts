// archetypes — the item catalogue, ported verbatim (data only) from
// lib/legacy/2026-06-15-ruinfold/engine/archetypes.mjs. An item INSTANCE in the world carries an
// `archetypeId` pointing here; its slot/stat grants/value/rarity are read from this table rather
// than copied onto every instance. One addition beyond the legacy 11: `heart-of-the-hollow`, the
// new relic the daily design (§3.3) introduces — a rare, non-equippable floor drop that grants a
// player carrying it a one-time undead continuation instead of a mortal run-ending death.

export type Slot = "weapon" | "armor" | "trinket";
export type Rarity = "junk" | "common" | "uncommon" | "rare";

export interface Archetype {
  name: string;
  slot: Slot | null;
  value: number;
  rarity: Rarity;
  grantsAttack?: number;
  grantsArmor?: number;
  grantsHealth?: number;
}

export const ARCHETYPES: Record<string, Archetype> = {
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
  // --- the daily's new relic (§3.3) — carried, never equipped, consumed on use ----------------
  "heart-of-the-hollow": { name: "the Heart of the Hollow", slot: null, value: 0, rarity: "rare" },
};

export const RELIC_ARCHETYPE = "heart-of-the-hollow";

export function archetype(id: string | null | undefined): Archetype | null {
  if (!id) return null;
  return ARCHETYPES[id] ?? null;
}
