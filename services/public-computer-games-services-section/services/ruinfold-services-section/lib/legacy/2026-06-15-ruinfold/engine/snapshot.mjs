// snapshot — fold ONE settled entity into the compact JSON the browser renders. This is the ONLY
// contract between the server (authoritative scalar state + bilattice truth) and the client (all
// three.js geometry). It carries plain numbers (positions) and bilattice glyphs (the truth of
// each entity's `alive`/`form` cell) — never meshes, never matrices.
//
// This module is DOMAIN ONLY: ruinfold's per-entity projection of the settled trace. The cache,
// the bootstrap/resettle/full diffing, and the per-tick delta machinery now live in
// @561-group/qwzspace's snapshot-manager — qwzspace calls the `snapOf(id, tick)` we hand it (and
// `subjectsOf(tick)`), caches what it returns, and diffs it into deltas. We own WHAT an entity's
// render state is; qwzspace owns the projection-over-the-trace bookkeeping.
//
//   const { snapOf, subjectsOf } = createSnapshot(root)
//   await subjectsOf(tick)  -> every subject id in the world   (qwzspace's bootstrap pass)
//   await snapOf(id, tick)  -> a flat render entry, or null when the subject must not render
//                             (vanished / carried / not in a zone / unpositioned / the dimension)

import { subjects, locationOf } from "#substrate";
import { view, numOf, valOf, glyphOf, posOf } from "#engine/_world.mjs";
import { inventoryOf, equippedOf } from "#engine/items.mjs";
import { activeBountyOf } from "#engine/quests.mjs";
import { stockOf } from "#engine/vendor.mjs";
import { activeEffects } from "#engine/effects.mjs";
import { skillsOf } from "#engine/skills.mjs";
import { partyOf } from "#engine/party.mjs";
import { activeEvent } from "#engine/events.mjs";

// The client renders these kinds; `kind:"dimension"` (the world-plane) is never drawn.
const ACTOR_KINDS = new Set(["player", "monster", "item", "shrine", "npc"]);

export function createSnapshot(root) {
  // zoneSnap — a zone is the ground the client lays down: a square of half-extent `bound`. No
  // position (it IS the place); the client centres it at the origin per the player's current zone.
  function zoneSnap(thing, id) {
    // exits as { north: dest, ... } — scan held `exit-<dir>` cells so the client can draw portals.
    const exits = {};
    for (const c of thing.fiber) {
      if (c.predicate.startsWith("exit-") && c.value.pos === 1) exits[c.predicate.slice(5)] = c.object;
    }
    return {
      id,
      type: "zone",
      kind: "zone",
      name: valOf(thing, "naming", id),
      describing: valOf(thing, "describing", ""),
      bound: numOf(thing, "bound", 20),
      spawnX: numOf(thing, "spawn-x", 0),
      spawnZ: numOf(thing, "spawn-z", 0),
      exits,
    };
  }

  // actorSnap — a positioned thing (player / monster / item / shrine). Carries its bilattice glyphs
  // so the client can render the WEIRDNESS directly: aliveGlyph "⊤" = undead (alive AND slain),
  // "f" = a corpse, "⊥" = unmade; formGlyph "⊤" = a cursed dual identity (human AND beast).
  async function actorSnap(thing, id, zoneId, tick) {
    const kind = valOf(thing, "kind");
    const monsterRule = valOf(thing, "death-rule", null);
    const snap = {
      id,
      type: renderType(kind, monsterRule),
      kind,
      name: valOf(thing, "naming", id),
      zone: zoneId,
      x: numOf(thing, "pos-x", 0),
      y: numOf(thing, "pos-y", 0),
      z: numOf(thing, "pos-z", 0),
      facing: numOf(thing, "facing", 0),
      health: numOf(thing, "health", 0),
      maxHealth: numOf(thing, "max-health", 0),
      stamina: numOf(thing, "stamina", 0),
      maxStamina: numOf(thing, "max-stamina", 0),
      gold: numOf(thing, "gold", 0),
      aliveGlyph: glyphOf(thing, "alive", id), // ⊥ / t / f / ⊤
      formGlyph: glyphOf(thing, "human", id), // ⊤ once lycanthropy-cursed
      status: valOf(thing, "status", "up"),
      form: valOf(thing, "form", "flesh"),
      revives: numOf(thing, "alive-revives", 0),
      level: numOf(thing, "level", 1),
      deathRule: monsterRule,
    };
    // A player carries the full character-sheet the HUD needs: pack, gear, cooldowns, and bounty.
    if (kind === "player") {
      snap.inventory = await inventoryOf(root, id);
      snap.equipment = await equippedOf(root, id);
      snap.bounty = await activeBountyOf(root, id);
      snap.cooldowns = {
        heavy: numOf(thing, "cooldown-heavy", 0),
        cleave: numOf(thing, "cooldown-cleave", 0),
        bolt: numOf(thing, "cooldown-bolt", 0),
        heal: numOf(thing, "cooldown-heal", 0),
      };
      snap.effects = activeEffects(thing, tick ?? 0); // [{name, until}] for the buff/debuff HUD
      snap.skills = await skillsOf(root, id); // skill-by-use levels (Project-Gorgon-style)
      snap.party = await partyOf(root, id); // party id, or null
      snap.event = (await activeEvent(root)).name; // the active world event banner
    }
    // An NPC carries what the client needs to talk to it: its role, and a quest offer or shop stock.
    if (kind === "npc") {
      snap.role = valOf(thing, "role", null);
      snap.friendly = true;
      if (snap.role === "quest-giver") snap.offers = valOf(thing, "offers", null);
      if (snap.role === "vendor") snap.stock = await stockOf(root, id);
    }
    return snap;
  }

  // renderType — the visual family the client picks a mesh by. Monsters split by death-rule so the
  // undead, the constructs, and the boss look distinct.
  function renderType(kind, deathRule) {
    if (kind !== "monster") return kind; // player / item / shrine
    return deathRule ?? "monster"; // undead / construct / cursed / named / mortal
  }

  // isZone — a zone is the ground a positioned thing must stand in to render. Read on demand (the
  // settled trace is the source of truth); qwzspace makes no pre-pass, so we check the kind here.
  async function isZone(id) {
    if (!id) return false;
    return valOf(await view(root, id), "kind") === "zone";
  }

  // snapOf — qwzspace's projection contract: read the SETTLED section of ONE subject and return a
  // flat render entry, or null when it must not render (the dimension, anything unpositioned, a
  // carried item whose located-in is its holder not a zone, or a VANISHED ⊥ construct).
  async function snapOf(id, tick) {
    const thing = await view(root, id);
    const kind = valOf(thing, "kind");
    if (kind === "zone") return zoneSnap(thing, id);
    if (!ACTOR_KINDS.has(kind)) return null; // dimension and anything unpositioned
    const zoneId = await locationOf(root, id); // e-filtered true place
    if (!(await isZone(zoneId))) return null; // not standing in a real zone (carried / placeless)
    if (valOf(thing, "status", "up") === "vanished") return null; // a ⊥ construct is un-made
    return actorSnap(thing, id, zoneId, tick);
  }

  // subjectsOf — every subject id in the world, for qwzspace's bootstrap pass (it snaps each once).
  async function subjectsOf(_tick) {
    return subjects(root);
  }

  return { snapOf, subjectsOf };
}
