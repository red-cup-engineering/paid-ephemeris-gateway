// [economy] items — a small procedural item catalog. An item is `{ id, name, kind, fiber }` where
// `fiber` is a few bilattice CELLS, each `{ predicate, value }`. The fiber is the WHOLE of the
// item's worth: value is NOT a number stamped on the item, it is the RICHNESS of how its fiber
// composes (server/world/richness.mjs reads it). GROUNDING (tab's richness.mjs + the economy note):
// "Value IS predicate richness" — a thing with more DETERMINED cells is worth more; ⊥ (honest
// ignorance) counts nothing; ⊤ (a thing the world argues about) COUNTS and is "contested value".
// Functional/settled cells weigh more, because "scarcity IS settledness".
//
// A cell's `value` is one of the four bilattice marks as a plain string:  "t" determined-true,
// "f" determined-false, "⊤" contested (both faces, COUNTS), "⊥" undetermined (counts nothing).
// Pure data, browser-safe (no imports) so the same catalog ships to client and server alike.

// FUNCTIONAL — the predicates that are single-valued / superseding (tab's FUNCTIONAL set). A
// settled functional cell weighs more in richness (scarcity = settledness). The rest are firable
// (many-valued, abundant) and weigh 1. Browser-safe Set; richness reads it for the weighting.
export const FUNCTIONAL = new Set(["material", "forged-by", "bound-to", "origin"]);

// the bilattice marks an item cell may carry (mirrors value.mjs's reading glyphs).
export const MARKS = Object.freeze(["t", "f", "⊤", "⊥"]);

// cell — a fiber cell {predicate, value}. value defaults to "t" (a determined, affirmed property).
const cell = (predicate, value = "t") => ({ predicate, value });

// the catalog — each entry is a template `{ name, kind, fiber }`; `mint` stamps a fresh id onto a
// copy so two dropped "Fenwood Bow"s are distinct entities (their fibers can later diverge by
// trade/use). The fibers are deliberately small and legible — three to five cells apiece.
export const CATALOG = Object.freeze({
  "fenwood-bow": {
    name: "Fenwood Bow", kind: "weapon",
    fiber: [cell("ranged"), cell("wooden"), cell("keen"), cell("material", "t")],
  },
  "river-pelt": {
    name: "River Pelt", kind: "hide",
    fiber: [cell("warm"), cell("supple"), cell("origin", "t")],
  },
  "brigand-coin": {
    name: "Brigand's Coin", kind: "trinket",
    fiber: [cell("minted"), cell("origin", "t"), cell("worn", "⊥")], // a ⊥ cell counts nothing
  },
  "hollow-shard": {
    name: "Hollow Shard", kind: "relic",
    // a relic of the rim: the world argues over whether it is sound or corrupt — a ⊤ cell COUNTS.
    fiber: [cell("strange"), cell("sound", "⊤"), cell("forged-by", "t"), cell("bound-to", "t")],
  },
  "keeper-token": {
    name: "Keeper's Token", kind: "trinket",
    fiber: [cell("blessed"), cell("origin", "t"), cell("calm")],
  },
});

// LOOT — a small loot table by creature KIND. A slain creature of `kind` drops the listed item
// ids (server/world/combat.mjs reads this on a player kill; conserved + additive). Critters drop
// pelts; brigands coins; anomalies the contested rim-relic; keepers/cairns/resonance drop nothing.
export const LOOT = Object.freeze({
  critter: ["river-pelt"],
  brigand: ["brigand-coin", "fenwood-bow"],
  anomaly: ["hollow-shard"],
});

// mint — make a fresh item entity from a catalog id, with a unique id stamped on. `seq` is the
// world's monotone counter so ids are stable and distinct. Returns null for an unknown id.
export function mint(id, seq) {
  const tpl = CATALOG[id];
  if (!tpl) return null;
  return {
    id: `item:${id}#${seq}`,
    catalog: id,
    name: tpl.name,
    kind: tpl.kind,
    fiber: tpl.fiber.map((c) => ({ predicate: c.predicate, value: c.value })),
  };
}

// lootFor — the item ids a slain creature of `kind` drops (an empty list for kinds with no table).
export const lootFor = (kind) => LOOT[kind] ?? [];
