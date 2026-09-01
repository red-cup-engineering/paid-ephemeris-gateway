// projection.mjs — World -> a plain-data render model. PURE: no DOM, no fetch, no timers, no
// Math.random()/Date.now() anywhere in this file. This is "the client's state-projection (pure
// function)" the build report's test-harness item asks to be driven through a scripted engine run
// and checked directly — src/tests/web-projection.test.mts does exactly that, importing this file
// straight off disk the same way render.mjs does in the browser.
//
// It reuses #engine/bilattice.mts's glyphOf and #engine/items.mts's inventoryOf rather than
// re-deriving either — the bilattice charge (design §6.2's "aura driven directly by glyphOf,
// unchanged from _world.mjs") and the held-inventory list are both already-correct engine read
// models; this file's only job is turning world+actorId into flat, renderer-friendly data.
//
// Field of view: engine/*.mts does not carry a perception.mts — the legacy fog-of-war module
// (design §3.1/§6.2's "reused as the actual game mechanic") is not among this app's ported engine
// modules (see src/engine/*.mts for the full set that IS present), so this is a simple radius-based
// stand-in instead: every entity within FOV_RADIUS world-units of the player, on the player's own
// zone, is visible. That is a v0 simplification, not a port of anything — a future pass that ports
// perception.mts can replace this function's body without touching its callers' contract.

import { glyphOf } from "#engine/bilattice.mts";
import { archetype } from "#engine/archetypes.mts";
import { inventoryOf } from "#engine/items.mts";

export const FOV_RADIUS = 18;

// SPECIES_GLYPH — design §6.2's glyph table, keyed by the monster's `species` (set by
// dungeon.mts's MONSTER_ROSTER/BOSS_SPEC).
export const SPECIES_GLYPH = {
  goblin: "g",
  skeleton: "s",
  wraith: "w",
  "moon-stalker": "M",
  "keep-warden": "K",
};

function itemGlyph(archetypeId) {
  const a = archetype(archetypeId);
  const slot = a?.slot ?? null;
  if (slot === "weapon") return ")";
  if (slot === "armor") return "[";
  if (slot === "trinket") return "=";
  return "*";
}

function projectPlayer(player) {
  const aliveGlyph = glyphOf(player.alive);
  const humanGlyph = glyphOf(player.human);
  return {
    id: player.id,
    kind: "player",
    glyph: "@",
    x: player.pos.x,
    z: player.pos.z,
    facing: player.facing,
    health: player.health,
    maxHealth: player.maxHealth,
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    level: player.level,
    xp: player.xp,
    gold: player.gold,
    status: player.status,
    form: player.form,
    aliveGlyph,
    risen: aliveGlyph === "⊤", // ⊤ — the relic-continuation held contradiction (design §3.3)
    cursed: humanGlyph === "⊤", // ⊤ — lycanthrope curse, permanent for the run
    relicSpent: Boolean(player.relicSpent),
  };
}

function projectMonster(entity) {
  if (entity.status === "slain" || entity.status === "vanished") return null; // no corpse tile (v0)
  const aliveGlyph = glyphOf(entity.alive);
  return {
    id: entity.id,
    kind: "monster",
    species: entity.species,
    glyph: SPECIES_GLYPH[entity.species] ?? "?",
    x: entity.pos.x,
    z: entity.pos.z,
    health: entity.health,
    maxHealth: entity.maxHealth,
    deathRule: entity.deathRule,
    aliveGlyph,
    // "held contradiction" tell (design §6.2): a risen (⊤) undead pulses gold while it holds that
    // dual state — the exact same aura the player wears if THEY hold the relic-continuation.
    risen: entity.deathRule === "undead" && aliveGlyph === "⊤",
  };
}

function projectItem(entity) {
  if (entity.carriedBy) return null; // not on the ground — nothing to render here
  const a = archetype(entity.archetypeId);
  return {
    id: entity.id,
    kind: "item",
    archetypeId: entity.archetypeId ?? null,
    name: entity.name,
    glyph: itemGlyph(entity.archetypeId),
    rarity: a?.rarity ?? "junk",
    x: entity.pos.x,
    z: entity.pos.z,
  };
}

function withinFov(player, entity) {
  const dx = entity.pos.x - player.pos.x;
  const dz = entity.pos.z - player.pos.z;
  return dx * dx + dz * dz <= FOV_RADIUS * FOV_RADIUS;
}

function projectHud(world, player, currentTick) {
  const zone = player.zoneId ? world.zones.get(player.zoneId) : undefined;
  const tick = currentTick ?? world.tick;
  return {
    floorIndex: zone ? zone.floorIndex : 0,
    floorCount: world.floorCount,
    zoneName: zone ? zone.name : "",
    inventory: inventoryOf(world, player.id),
    equipped: { ...player.equipped },
    cooldownReadyIn: {
      heavy: Math.max(0, player.cooldowns.heavy - tick),
      cleave: Math.max(0, player.cooldowns.cleave - tick),
      bolt: Math.max(0, player.cooldowns.bolt - tick),
      "second-wind": Math.max(0, player.cooldowns.heal - tick),
    },
    stats: { maxFloorReached: world.stats.maxFloorReached, floorsFlawless: world.stats.floorsFlawless, killXp: world.stats.killXp },
    tick,
  };
}

// projectWorld — the one export render.mjs/app-play.mjs actually call. Returns `{ player: null }`
// if the actor hasn't joined (or has been removed from `world.entities`, which never happens in
// practice — a spawned player only ever changes status, never disappears).
export function projectWorld(world, actorId, currentTick) {
  const player = world.entities.get(actorId);
  if (!player) return { player: null, zone: null, tiles: [], hud: null };

  const tiles = [];
  for (const id of world.order) {
    const e = world.entities.get(id);
    if (!e || e.id === actorId) continue;
    if (e.zoneId !== player.zoneId) continue;
    if (!withinFov(player, e)) continue;
    const projected = e.kind === "monster" ? projectMonster(e) : e.kind === "item" ? projectItem(e) : null;
    if (projected) tiles.push(projected);
  }

  const zone = player.zoneId ? world.zones.get(player.zoneId) : undefined;
  return {
    player: projectPlayer(player),
    zone: zone ? { id: zone.id, name: zone.name, floorIndex: zone.floorIndex, bound: zone.bound } : null,
    tiles,
    hud: projectHud(world, player, currentTick),
  };
}
