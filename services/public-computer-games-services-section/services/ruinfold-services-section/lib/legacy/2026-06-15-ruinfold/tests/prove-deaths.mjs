// prove-deaths — the five deaths, one per bilattice reading, all selected by DATA (`death-rule`
// + the converse declaration), never by special-case code:
//   undead    → alive ⊤ (rises)          mortal/named → alive f (corpse)
//   construct → alive ⊥ (un-made)         cursed       → corpse + the slayer's `human` cell ⊤
// Plus: a slain mortal respawns when its cooldown comes, and the boss drops its loot.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { attack } from "#engine/combat.mjs";
import { resolveDeaths, resolveRespawns } from "#engine/death.mjs";
import { dropLoot } from "#engine/loot.mjs";
import changing from "#changing";
import { view, numOf, valOf, glyphOf } from "#engine/_world.mjs";
import { locationOf } from "#substrate";

const { root, t, cleanup } = await world();

async function slay(target, tick) {
  const dirty = new Set();
  const v = await view(root, target);
  await changing({ root, subject: "hero", predicate: "located-in", object: valOf(v, "kind") === "monster" ? await locationOf(root, target) : "the-gate", t: t() });
  await changing({ root, subject: "hero", predicate: "pos-x", object: numOf(v, "pos-x", 0), t: t() });
  await changing({ root, subject: "hero", predicate: "pos-z", object: numOf(v, "pos-z", 0), t: t() });
  let r;
  let guard = 0;
  do {
    r = await attack(root, "hero", target, t, dirty);
  } while (r.hit && !r.killed && guard++ < 60);
  await resolveDeaths(root, [{ target, deathRule: r.deathRule, killer: "hero" }], t, dirty, { tick });
  return view(root, target);
}

try {
  const d0 = new Set();
  await spawnPlayer(root, "hero", t, d0);
  await changing({ root, subject: "hero", predicate: "attack-power", object: 100, t: t() });

  section("each death-rule routes to its own bilattice value");
  assert(glyphOf(await slay("skeleton-1", 1), "alive", "skeleton-1") === "⊤", "undead    → ⊤ (alive AND slain, rises)");
  assert(glyphOf(await slay("goblin-1", 1), "alive", "goblin-1") === "f", "mortal    → f (a corpse)");
  assert(glyphOf(await slay("wraith-1", 1), "alive", "wraith-1") === "⊥", "construct → ⊥ (un-made, no corpse)");
  assert(glyphOf(await slay("the-hollow-king", 1), "alive", "the-hollow-king") === "f", "named     → f (true death)");

  section("the boss drops its loot (via engine/loot.mjs, as the tick does on a player kill)");
  const drop = await dropLoot(root, "the-hollow-king", t, new Set());
  assert(drop.gold === 100, "the boss yields 100 gold");
  assert(drop.items.length === 2, "two loot items spawn (crown-of-rust + iron-hauberk)");
  const crownId = "loot-the-hollow-king-crown-of-rust";
  assert(valOf(await view(root, crownId), "kind") === "item", "a loot item exists after the boss falls");
  assert((await locationOf(root, crownId)) === "the-throne", "loot lies where the boss fell");

  section("a cursed kill lays lycanthropy on the slayer (permanent ⊤)");
  await slay("moon-stalker", 1);
  const hero = await view(root, "hero");
  assert(glyphOf(hero, "human", "hero") === "⊤", "hero's `human` cell is ⊤ (human AND beast)");
  assert(valOf(hero, "cursed-with") === "lycanthropy", "hero is marked cursed-with lycanthropy");

  section("a slain mortal respawns when its cooldown comes");
  let gob = await view(root, "goblin-1");
  assert(valOf(gob, "status") === "slain", "goblin is slain, awaiting respawn");
  const due = Number(valOf(gob, "respawn-at"));
  await resolveRespawns(root, due, t, new Set());
  gob = await view(root, "goblin-1");
  assert(glyphOf(gob, "alive", "goblin-1") === "t", "respawned goblin's alive folds clean to t again");
  assert(valOf(gob, "status") === "up" && numOf(gob, "health", 0) > 0, "it stands again at full health");
} finally {
  cleanup();
}
report("prove-deaths");
