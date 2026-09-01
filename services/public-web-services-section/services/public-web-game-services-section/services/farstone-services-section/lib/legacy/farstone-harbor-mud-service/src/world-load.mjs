/**
 * world-load — turn the engine-neutral `world/harbor.json` bible into a live FizzOS
 * world plus the descriptive `content` the engine does not carry.
 *
 * The split is deliberate and is the whole architecture in miniature:
 *
 *   - the **world** is a `@red-cup-engineering/fizzos` settled charge valuation: who/what is
 *     `located-in` where, and which room exits to which. That is the part with
 *     mechanics — perception, conservation, the tick — so it lives in the engine.
 *   - **content** is prose: the names, descriptions, exit *directions*, and tags
 *     that the engine has no opinion about. The command loop reads it to render.
 *
 * Loading is pure: `loadHarbor(bible)` returns `{ world, content }` and mutates
 * nothing. Every place/containment relation in the bible becomes a `located-in`
 * fact; every room exit becomes an `exit` fact (with the human direction kept in
 * `content`); the player is dropped in at `meta.playerStart`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { world } from "@red-cup-engineering/fizzos/engine";

export const PLAYER = "player";

/** The default location of the shipped bible, resolved relative to this module. */
export const HARBOR_BIBLE_URL = new URL("../world/harbor.json", import.meta.url);

/** Read and parse the shipped harbor bible from disk. */
export function readHarborBible(url = HARBOR_BIBLE_URL) {
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

/** Classify a bible entry into a kind from its tags, for rendering decisions. */
function kindOf(tags = []) {
  if (tags.includes("npc")) return "npc";
  if (tags.includes("resource") || tags.includes("fixed")) return "fixture";
  if (tags.includes("item")) return "item";
  return "thing";
}

/** Whether a thing can be picked up: takeable loose gear or a purchasable ware. */
export function isTakeable(tags = []) {
  return tags.includes("takeable") || tags.includes("ware");
}

/**
 * Load the harbor bible into a playable world.
 *
 * @param {object} bible  the parsed `harbor.json`
 * @param {object} [opts]
 * @param {string} [opts.player]  the player entity id (default `"player"`)
 * @returns {{ world: import("@red-cup-engineering/fizzos/engine").World, content: object }}
 */
export function loadHarbor(bible = readHarborBible(), opts = {}) {
  const player = opts.player ?? PLAYER;
  const facts = [];

  const rooms = {};
  for (const room of bible.rooms ?? []) {
    rooms[room.id] = {
      id: room.id,
      name: room.name,
      description: room.description,
      exits: { ...(room.exits ?? {}) },
      tags: room.tags ?? [],
    };
    for (const dest of Object.values(room.exits ?? {})) {
      facts.push({ e: room.id, a: "exit", v: dest });
    }
  }

  const things = {};
  for (const entry of [...(bible.items ?? []), ...(bible.npcs ?? [])]) {
    things[entry.id] = {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      location: entry.location,
      tags: entry.tags ?? [],
      kind: kindOf(entry.tags),
    };
    if (entry.location) facts.push({ e: entry.id, a: "located-in", v: entry.location });
  }

  const start = bible.meta?.playerStart ?? bible.rooms?.[0]?.id;
  facts.push({ e: player, a: "located-in", v: start });

  const content = {
    meta: bible.meta ?? {},
    player,
    rooms,
    things,
    /** Look up any nameable thing — room or item or npc — by id. */
    nameOf(id) {
      return rooms[id]?.name ?? things[id]?.name ?? id;
    },
  };

  return { world: world(facts), content };
}
