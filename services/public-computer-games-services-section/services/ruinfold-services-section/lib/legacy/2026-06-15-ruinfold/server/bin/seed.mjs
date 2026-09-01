// seed — build the Ruinfold world by DOING. Like build-farstone, the world is constructed with
// the package's own operations (doing / declareConverse) so dual-filing, reification, and the
// converse declaration are exercised exactly as play exercises them. The world IS the resulting
// on-disk EAVT trace under <root>; ticking, combat, and death only ever APPEND to it.
//
//   node server/bin/seed.mjs            # (re)build into ./world
//   node server/bin/seed.mjs <dir>      # build a fresh copy elsewhere
//
// Ruinfold is a fallen keep: a safe gate, a monster-choked courtyard, a crypt of worse things,
// and a throne where a named boss waits. Position is plain numbers (pos-x/y/z) — geometry lives
// in the browser. The bilattice governs TRUTH of state: a monster's `alive` cell can settle to
// ⊤ (undead), f (truly dead), or ⊥ (un-made), depending on its `death-rule`.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rm } from "node:fs/promises";
import doing, { declareConverse } from "#doing";
import { seedClock } from "#engine/functional.mjs";
import { ARCHETYPES } from "#engine/archetypes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(HERE, "..", "..", "world");
export const DIMENSION = "ruinfold";

export default async function buildWorld(root = DEFAULT_ROOT) {
  let seq = 0;
  const t = () => seedClock(++seq);
  // The seed is the AMBIENT ground of the world — no agent — so every actor perceives it.
  const say = (subject, predicate, object) => doing({ root, subject, predicate, object, t: t() });

  // ---- The dimension: the world-plane carrying the clock the tick advances. -------------------
  await say(DIMENSION, "kind", "dimension");
  await say(DIMENSION, "naming", "Ruinfold");
  await say(DIMENSION, "describing", "A keep that fell and did not finish falling. The dead here are not done.");
  await say(DIMENSION, "tick", 0);

  // ---- Zones. A zone is a place with a square ground of half-extent `bound` (movement clamp),
  // a spawn point, and exit-<dir> portals (RELATIONAL, dual-filed) to neighbours. ---------------
  const zone = async (id, name, desc, bound, spawn, exits) => {
    await say(id, "kind", "zone");
    await say(id, "naming", name);
    await say(id, "describing", desc);
    await say(id, "bound", bound);
    await say(id, "spawn-x", spawn[0]);
    await say(id, "spawn-z", spawn[1]);
    for (const [dir, dest] of Object.entries(exits)) await say(id, `exit-${dir}`, dest);
    await say(DIMENSION, "contains", id);
  };

  await zone("the-gate", "The Gate", "A broken gatehouse, the one quiet ground in Ruinfold. A pale shrine still stands.", 18, [0, 12], { north: "the-courtyard" });
  await zone("the-courtyard", "The Courtyard", "Flagstones cracked by roots and old violence. Bones reassemble themselves in the corners.", 26, [0, -20], { south: "the-gate", north: "the-crypt" });
  await zone("the-crypt", "The Crypt", "Cold vaulted dark. Things that are not quite here drift between the pillars.", 22, [0, -16], { south: "the-courtyard", north: "the-throne" });
  await zone("the-throne", "The Throne Room", "A hall of fallen banners. At its head, something named is still seated.", 30, [0, -22], { south: "the-crypt" });

  // ---- Shrines: re-embodiment points for ghosts. A ghost that reaches a shrine returns to flesh.
  const shrine = async (id, where, x, z) => {
    await say(id, "kind", "shrine");
    await say(id, "naming", "a pale shrine");
    await say(id, "located-in", where);
    await say(id, "pos-x", x);
    await say(id, "pos-y", 0);
    await say(id, "pos-z", z);
  };
  await shrine("gate-shrine", "the-gate", 0, 14);

  // ---- Monsters. Behaviour is DATA: `mover:tick` enrolls it in the tick; `hostile` + `aggro`
  // drive the generic chase/attack AI; `death-rule` selects its bilattice death semantics.
  // No per-monster code anywhere — a monster IS its fiber. ------------------------------------
  const monster = async (id, name, where, x, z, deathRule, stats, extra = {}) => {
    await say(id, "kind", "monster");
    await say(id, "naming", name);
    await say(id, "species", stats.species ?? "beast"); // bounties target a species
    await say(id, "mover", "tick");
    await say(id, "located-in", where);
    await say(id, "pos-x", x);
    await say(id, "pos-y", 0);
    await say(id, "pos-z", z);
    await say(id, "home-x", x); // leash anchor + wander origin (AI v2)
    await say(id, "home-z", z);
    await say(id, "facing", 0);
    await say(id, "alive", id); // the positive face of the alive-cell
    await say(id, "health", stats.hp);
    await say(id, "max-health", stats.hp);
    await say(id, "attack-power", stats.atk);
    await say(id, "armor", stats.armor ?? 0);
    await say(id, "attack-range", stats.range ?? 3); // melee unless a ranged caster
    if (stats.ranged) await say(id, "ranged", true);
    await say(id, "xp-value", stats.xp); // xp a player gains for slaying it
    await say(id, "gold-value", stats.gold ?? 0); // coin dropped on death
    for (const arch of stats.drops ?? []) await say(id, "drops", arch); // loot archetype ids
    await say(id, "death-rule", deathRule);
    await say(id, "hostile", true);
    await say(id, "aggro", stats.aggro ?? 10);
    await say(id, "respawn-cooldown", stats.cooldown ?? 25);
    for (const [k, v] of Object.entries(extra)) await say(id, k, v);
    // EVERY monster declares `slain` the CONVERSE of `alive`: a slain row then folds as negative
    // evidence into the alive-cell. This single declaration — data, on the entity's own log — IS
    // the death engine. What the cell SETTLES to then depends on what death.mjs does with the
    // positive face: undead keep it (alive=⊤, rise); everyone else retracts it (alive=f, die);
    // constructs retract both faces (alive=⊥, vanish). Same evidence, five readings.
    await declareConverse(root, id, "alive", "slain", t());
  };

  // The courtyard: rising dead (⊤) and living goblins (mortal → respawn). Goblins are the bounty.
  await monster("skeleton-1", "a clattering skeleton", "the-courtyard", -8, -14, "undead", { hp: 8, atk: 2, xp: 12, aggro: 12, species: "skeleton", gold: 2, drops: ["bone-shard"] });
  await monster("skeleton-2", "a clattering skeleton", "the-courtyard", 10, -26, "undead", { hp: 8, atk: 2, xp: 12, aggro: 12, species: "skeleton", gold: 2, drops: ["bone-shard"] });
  await monster("goblin-1", "a sneering goblin", "the-courtyard", 6, -8, "mortal", { hp: 6, atk: 3, xp: 8, aggro: 10, species: "goblin", gold: 3, drops: ["goblin-ear"] });
  await monster("goblin-2", "a sneering goblin", "the-courtyard", -12, -28, "mortal", { hp: 6, atk: 3, xp: 8, aggro: 10, species: "goblin", gold: 3, drops: ["goblin-ear"] });
  await monster("goblin-3", "a sneering goblin", "the-courtyard", 16, -4, "mortal", { hp: 6, atk: 3, xp: 8, aggro: 10, species: "goblin", gold: 3, drops: ["goblin-ear"] });

  // The crypt: wraiths that VANISH to ⊥ when slain (no corpse) and fight at RANGE; a moon-touched
  // stalker whose death curses its slayer's `human` cell to ⊤ (lycanthropy).
  await monster("wraith-1", "a drifting wraith", "the-crypt", -6, -10, "construct", { hp: 10, atk: 4, xp: 18, aggro: 14, species: "wraith", gold: 5, drops: ["ectoplasm"], ranged: true, range: 11 });
  await monster("wraith-2", "a drifting wraith", "the-crypt", 8, -18, "construct", { hp: 10, atk: 4, xp: 18, aggro: 14, species: "wraith", gold: 5, drops: ["ectoplasm"], ranged: true, range: 11 });
  await monster("moon-stalker", "a moon-touched stalker", "the-crypt", 0, -16, "cursed", { hp: 16, atk: 5, xp: 30, aggro: 16, species: "stalker", gold: 20, drops: ["wolf-fang"] }, { curse: "lycanthropy" });

  // The throne: the named boss — a TRUE death (f, settled), drops the good loot, long respawn.
  await monster("the-hollow-king", "the Hollow King", "the-throne", 0, -22, "named", { hp: 60, atk: 8, xp: 200, aggro: 20, cooldown: 120, species: "boss", gold: 100, drops: ["crown-of-rust", "iron-hauberk"] });

  // ---- Items on the ground. An item is an INSTANCE of an archetype (engine/archetypes.mjs); its
  // stats/slot/value are read from there. located-in is relational (dual-filed) + functional. -----
  const item = async (id, archetypeId, where, x, z) => {
    const a = ARCHETYPES[archetypeId];
    await say(id, "kind", "item");
    await say(id, "archetype", archetypeId);
    await say(id, "naming", a?.name ?? archetypeId);
    await say(id, "located-in", where);
    await say(id, "pos-x", x);
    await say(id, "pos-y", 0);
    await say(id, "pos-z", z);
  };
  await item("rusted-sword", "rusted-sword", "the-gate", 4, 10);
  await item("bone-charm", "bone-charm", "the-courtyard", 0, -2);

  // ---- Friendly NPCs at the gate: a quest-giver and a vendor. They neither move nor fight. ------
  const npc = async (id, name, desc, x, z, role, facts = {}) => {
    await say(id, "kind", "npc");
    await say(id, "naming", name);
    await say(id, "describing", desc);
    await say(id, "located-in", "the-gate");
    await say(id, "pos-x", x);
    await say(id, "pos-y", 0);
    await say(id, "pos-z", z);
    await say(id, "facing", 0);
    await say(id, "role", role);
    await say(id, "friendly", true);
    for (const [k, v] of Object.entries(facts)) await say(id, k, v);
  };
  // The Shrine-Keeper offers a bounty (data the quest system reads): slay 3 goblins for coin, xp,
  // and a leather jerkin.
  await npc("shrine-keeper", "the Shrine-Keeper", "A hooded figure who pays for the courtyard kept clear.", -5, 12, "quest-giver", {
    offers: { id: "cull-the-courtyard", name: "Cull the Courtyard", species: "goblin", goal: 3, rewardGold: 25, rewardXp: 30, rewardItem: "leather-jerkin" },
  });
  // The Rag-Merchant sells gear for the gold the dead leave behind.
  await npc("rag-merchant", "the Rag-Merchant", "A pack-laden trader dealing in what the dead leave behind.", 5, 14, "vendor");
  for (const arch of ["iron-blade", "leather-jerkin", "iron-hauberk", "wolf-fang"]) await say("rag-merchant", "sells", arch);

  return { root, rows: seq };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || DEFAULT_ROOT;
  await rm(target, { recursive: true, force: true });
  const { rows } = await buildWorld(target);
  console.log(`✓ built Ruinfold seed: ${rows} intra-actions under ${target}`);
}
