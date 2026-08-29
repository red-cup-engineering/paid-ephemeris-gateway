// items — carrying, equipping, dropping. Ported from legacy engine/items.mjs, stripped of the
// tab-substrate trace plumbing (see world.mts's header for why): an item is just an Entity of kind
// "item" whose `carriedBy` (in a pack) or `zoneId`+`pos` (on the ground) says where it is, and a
// slot on the wearer's `equipped` record holds the id of whatever is worn. Stats live in exactly
// one place (stats.mts), recomputed on every equip/unequip so nothing drifts.

import type { World, Equipped } from "#engine/world.mts";
import { view, dist2 } from "#engine/world.mts";
import { archetype } from "#engine/archetypes.mts";
import { recomputeStats } from "#engine/stats.mts";

export const PICKUP_RANGE = 3;
const PICKUP_R2 = PICKUP_RANGE * PICKUP_RANGE;

export interface ItemResult {
  ok: boolean;
  reason?: string;
}

// pickup — take a grounded item in reach into the pack. No stat change; equipping is separate.
export function pickup(world: World, subjectId: string, itemId: string): ItemResult {
  const me = view(world, subjectId);
  const item = view(world, itemId);
  if (!me || !item || item.kind !== "item") return { ok: false, reason: "not-an-item" };
  if (item.carriedBy) return { ok: false, reason: "not-here" };
  if (item.zoneId !== me.zoneId) return { ok: false, reason: "not-here" };
  if (dist2(me.pos, item.pos) > PICKUP_R2) return { ok: false, reason: "too-far" };
  item.carriedBy = subjectId;
  item.zoneId = null;
  me.inventory.push(itemId);
  return { ok: true };
}

// drop — put a carried item back on the ground at the carrier's feet. Unequips it first if worn.
export function drop(world: World, subjectId: string, itemId: string): ItemResult {
  const me = view(world, subjectId);
  const item = view(world, itemId);
  if (!me || !item || item.carriedBy !== subjectId) return { ok: false, reason: "not-carried" };
  for (const slot of Object.keys(me.equipped) as (keyof Equipped)[]) {
    if (me.equipped[slot] === itemId) unequip(world, subjectId, slot);
  }
  const idx = me.inventory.indexOf(itemId);
  if (idx >= 0) me.inventory.splice(idx, 1);
  item.carriedBy = null;
  item.zoneId = me.zoneId;
  item.pos = { ...me.pos };
  return { ok: true };
}

// equip — slot a carried, slottable item; whatever was there stays carried. Recomputes stats.
export function equip(world: World, subjectId: string, itemId: string): ItemResult {
  const me = view(world, subjectId);
  const item = view(world, itemId);
  if (!me || !item || item.carriedBy !== subjectId) return { ok: false, reason: "not-carried" };
  const a = archetype(item.archetypeId);
  if (!a || !a.slot) return { ok: false, reason: "not-equippable" };
  me.equipped[a.slot] = itemId;
  recomputeStats(world, me);
  return { ok: true, reason: a.slot };
}

// unequip — empty a slot (the item stays carried). Recomputes stats.
export function unequip(world: World, subjectId: string, slot: keyof Equipped): ItemResult {
  const me = view(world, subjectId);
  if (!me) return { ok: false, reason: "unknown-actor" };
  me.equipped[slot] = null;
  recomputeStats(world, me);
  return { ok: true };
}

// inventoryOf — every item a subject carries, with archetype facts and worn state. Read model
// only, used by clients/tests, never by the tick itself.
export function inventoryOf(world: World, subjectId: string) {
  const me = view(world, subjectId);
  if (!me) return [];
  const worn = new Set(Object.values(me.equipped).filter((v): v is string => Boolean(v)));
  return me.inventory.map((id) => {
    const item = view(world, id);
    const a = archetype(item?.archetypeId);
    return {
      id,
      archetypeId: item?.archetypeId ?? null,
      name: item?.name ?? id,
      slot: a?.slot ?? null,
      value: a?.value ?? 0,
      equipped: worn.has(id),
    };
  });
}
