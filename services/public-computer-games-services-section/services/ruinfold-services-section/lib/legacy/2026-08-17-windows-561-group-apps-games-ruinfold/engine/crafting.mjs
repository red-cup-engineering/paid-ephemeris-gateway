// crafting — recipes (DATA) consume item INSTANCES from a player's pack and produce a new item
// instance. Our items are instances of archetypes (engine/archetypes.mjs): an item in the world is
// a subject bearing an `archetype` predicate, minted by grantItem and removed by destroyItem
// (engine/items.mjs). Crafting therefore never invents its own storage — it reads inventoryOf,
// COUNTS instances by archetype, and on success destroyItem's the right number of each input and
// grantItem's the output. This mirrors vendor.mjs (buy/sell) which sits on the same primitives.
//
// A recipe is plain content: { id, name, inputs: { archetypeId: count, ... }, output: archetypeId }.
// Adding one is permissionless — no code changes, just a row in RECIPES, exactly like the
// archetype catalogue itself. The output is always an EXISTING archetype (archetypes.mjs is the
// source of truth for what items can be), so a recipe just names a path between archetypes.
//
// Atomicity: canCraft is a PURE read (no writes). craft re-checks via canCraft and, only when every
// input is satisfied, performs the consume+grant writes. If anything is short, it writes NOTHING
// and returns the same { ok:false, missing } shape — so a failed craft leaves the pack untouched.
//
// Contract shape matches the rest of the engine: (root, ...args, t, dirty); `t` is a ()=>string
// clock thunk, `dirty` a Set the caller flushes. The intent/tick layer calls craft(actor, recipeId);
// a client can call recipesFor(actor) to show what's currently makeable.

import { inventoryOf, grantItem, destroyItem } from "#engine/items.mjs";
import { archetype } from "#engine/archetypes.mjs";

// RECIPES — the recipe catalogue, as plain data. Each input archetype and each output archetype
// MUST exist in archetypes.mjs (validated lazily by canCraft/craft via archetype()). Inputs are a
// map of archetypeId → required count; the output is a single archetypeId minted on success.
export const RECIPES = {
  // 2× bone-shard → a bone charm (junk shards bound into a wearable trinket).
  "bind-charm": {
    id: "bind-charm",
    name: "bind a bone charm",
    inputs: { "bone-shard": 2 },
    output: "bone-charm",
  },
  // 3× ectoplasm + 1× iron-blade → a bone cleaver (an iron blade steeped in ectoplasm).
  "forge-cleaver": {
    id: "forge-cleaver",
    name: "forge a bone cleaver",
    inputs: { "ectoplasm": 3, "iron-blade": 1 },
    output: "bone-cleaver",
  },
  // 2× goblin-ear → a leather jerkin (goblin hide stitched into armor).
  "stitch-jerkin": {
    id: "stitch-jerkin",
    name: "stitch a leather jerkin",
    inputs: { "goblin-ear": 2 },
    output: "leather-jerkin",
  },
};

export function recipe(id) {
  return RECIPES[id] ?? null;
}

// countByArchetype — fold a pack's instance list into { archetypeId: howMany }. The unit of supply
// is the INSTANCE (each row from inventoryOf is one item); crafting counts instances, not values.
function countByArchetype(inv) {
  const counts = {};
  for (const it of inv) counts[it.archetype] = (counts[it.archetype] ?? 0) + 1;
  return counts;
}

// canCraft — PURE: can `actor` craft `recipeId` right now from what they carry? Returns
// { ok, missing:[{archetype, have, need}] }. `missing` lists every short ingredient (have < need);
// ok is true iff missing is empty. An unknown recipe is { ok:false, missing:[] } (nothing to make).
export async function canCraft(root, actor, recipeId) {
  const r = recipe(recipeId);
  if (!r) return { ok: false, missing: [] };
  const counts = countByArchetype(await inventoryOf(root, actor));
  const missing = [];
  for (const [archId, need] of Object.entries(r.inputs)) {
    const have = counts[archId] ?? 0;
    if (have < need) missing.push({ archetype: archId, have, need });
  }
  return { ok: missing.length === 0, missing };
}

// craft — atomically turn inputs into the output. Re-checks canCraft FIRST; if short, writes
// nothing and returns { ok:false, missing }. On success: destroyItem the required count of each
// input archetype (taking specific carried instances), then grantItem the output, returning
// { ok:true, output:itemId }. A bad/unknown output archetype fails clean before any writes.
export async function craft(root, actor, recipeId, t, dirty) {
  const r = recipe(recipeId);
  if (!r) return { ok: false, missing: [] };
  if (!archetype(r.output)) return { ok: false, reason: "unknown-output", missing: [] };

  // Check before write — no partial crafts.
  const check = await canCraft(root, actor, recipeId);
  if (!check.ok) return { ok: false, missing: check.missing };

  // Pick the concrete instances to consume: the first `need` carried instances of each input
  // archetype. canCraft guarantees enough exist, so every needed id is found.
  const inv = await inventoryOf(root, actor);
  const toDestroy = [];
  for (const [archId, need] of Object.entries(r.inputs)) {
    const ids = inv.filter((it) => it.archetype === archId).slice(0, need).map((it) => it.id);
    toDestroy.push(...ids);
  }

  // Consume the inputs, then mint the output. destroyItem/grantItem each mark their own dirty.
  for (const id of toDestroy) await destroyItem(root, id, t, dirty);
  const g = await grantItem(root, actor, r.output, t, dirty);
  return { ok: true, output: g.item };
}

// recipesFor — every recipe `actor` can currently craft (canCraft.ok). For a client's craft menu.
export async function recipesFor(root, actor) {
  const out = [];
  for (const id of Object.keys(RECIPES)) {
    if ((await canCraft(root, actor, id)).ok) out.push(RECIPES[id]);
  }
  return out;
}
