/**
 * play — the Farstone command loop, built honestly on `@red-cup-engineering/fizzos/engine`.
 *
 * A turn is pure: `step(state, input) -> { state, output, quit }`. The state is
 * `{ world, content, actor }`; the world is a FizzOS settled charge valuation and
 * every verb here is one of the engine's:
 *
 *   look / go    — perception (the fiber you can read) and movement (`go`)
 *   take / drop  — the linear `located-in` retraction: a thing is in exactly one
 *   give           place, and moving it vacates the old one (conservation, for free
 *                  from the engine, not re-implemented here)
 *   examine      — read one perceivable thing's prose
 *   inventory    — what is `located-in` you
 *   say / exits / help — table-stakes interface
 *
 * The command loop owns *parsing and prose*; the engine owns *mechanics and truth*.
 * That boundary is the point: Farstone is the proof that the library is playable.
 */
import { contentsOf, drop as engineDrop, give as engineGive, go as engineGo, perceive, placeOf, take as engineTake } from "@red-cup-engineering/fizzos/engine";
import { isTakeable, loadHarbor, PLAYER, readHarborBible } from "./world-load.mjs";

/** Canonical compass directions, with the short aliases players actually type. */
const DIRECTIONS = {
  n: "north", s: "south", e: "east", w: "west",
  ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest",
  north: "north", south: "south", east: "east", west: "west",
  northeast: "northeast", northwest: "northwest", southeast: "southeast", southwest: "southwest",
  u: "up", d: "down", up: "up", down: "down",
};

/** Start a new game from a bible (defaults to the shipped harbor). */
export function newGame(bible = readHarborBible(), player = PLAYER) {
  const { world, content } = loadHarbor(bible, { player });
  return { world, content, actor: player };
}

/** Where the actor is right now. */
const here = (state) => placeOf(state.world, state.actor);

/** The display name for an id (room, item, or npc). */
const name = (state, id) => state.content.nameOf(id);

/**
 * The things co-located with the actor (everything in the room but the actor),
 * split into the npcs you can talk to/fight and the items lying about.
 */
function around(state) {
  const room = here(state);
  const ids = contentsOf(state.world, room).filter((id) => id !== state.actor);
  const npcs = [];
  const items = [];
  for (const id of ids) {
    const thing = state.content.things[id];
    (thing?.kind === "npc" ? npcs : items).push(id);
  }
  return { room, npcs, items };
}

/** Render the room the actor stands in — the `look` representation. */
export function describe(state) {
  const roomId = here(state);
  const room = state.content.rooms[roomId];
  if (!room) return `You are nowhere (${roomId}).`;
  const { npcs, items } = around(state);
  const lines = [room.name, "", room.description];

  const dirs = Object.keys(room.exits);
  if (dirs.length) lines.push("", `Exits: ${dirs.join(", ")}.`);

  if (items.length) {
    lines.push("");
    for (const id of items) lines.push(`  ${name(state, id)} is here.`);
  }
  if (npcs.length) {
    lines.push("");
    for (const id of npcs) lines.push(`  ${name(state, id)} stands here.`);
  }
  return lines.join("\n");
}

/** Find a perceivable thing by id or name substring among the given candidate ids. */
function resolve(state, query, candidates) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // exact id, then exact name, then substring of name, then substring of id.
  const byId = candidates.find((id) => id.toLowerCase() === q);
  if (byId) return byId;
  const named = candidates.map((id) => [id, name(state, id).toLowerCase()]);
  const exactName = named.find(([, n]) => n === q || n === `a ${q}` || n === `the ${q}`);
  if (exactName) return exactName[0];
  const subName = named.find(([, n]) => n.includes(q));
  if (subName) return subName[0];
  const subId = candidates.find((id) => id.toLowerCase().includes(q));
  if (subId) return subId;
  // token-subset: every word the player typed appears in the name or id (with
  // hyphens read as spaces), so "fish knife" finds `a-fish-knife`.
  const words = q.split(/[\s-]+/);
  const tokenMatch = candidates.find((id) => {
    const hay = `${id} ${name(state, id)}`.toLowerCase().replace(/-/g, " ");
    return words.every((word) => hay.includes(word));
  });
  return tokenMatch ?? null;
}

/** The ids the actor is holding. */
const inventory = (state) => contentsOf(state.world, state.actor);

const ok = (state, output) => ({ state, output, quit: false });

/**
 * Advance one turn. Returns the next state, the text to show, and whether the
 * player asked to leave. Unknown input is reported, never thrown.
 */
export function step(state, input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return ok(state, "");
  const [head, ...rest] = trimmed.split(/\s+/);
  const verb = head.toLowerCase();
  const arg = rest.join(" ");

  // bare direction: "north", "n"
  if (DIRECTIONS[verb] && !arg) return doGo(state, DIRECTIONS[verb]);

  switch (verb) {
    case "look":
    case "l":
      if (arg) return doExamine(state, arg);
      return ok(state, describe(state));
    case "examine":
    case "x":
    case "inspect":
      return doExamine(state, arg);
    case "go":
    case "move":
    case "walk":
      return doGo(state, DIRECTIONS[arg.toLowerCase()] ?? arg.toLowerCase());
    case "exits":
      return ok(state, exitsLine(state));
    case "take":
    case "get":
    case "pick":
      return doTake(state, arg.replace(/^up\s+/, ""));
    case "drop":
      return doDrop(state, arg);
    case "give":
      return doGive(state, arg);
    case "inventory":
    case "inv":
    case "i":
      return doInventory(state);
    case "say":
      return ok(state, arg ? `You say, "${arg}"` : "Say what?");
    case "help":
    case "?":
    case "commands":
      return ok(state, HELP);
    case "quit":
    case "exit":
    case "q":
      return { state, output: "You step back from the quay. Fair winds.", quit: true };
    default:
      return ok(state, `You don't know how to "${verb}". Try "help".`);
  }
}

function exitsLine(state) {
  const room = state.content.rooms[here(state)];
  const entries = Object.entries(room?.exits ?? {});
  if (!entries.length) return "There is no way out of here.";
  return entries.map(([dir, dest]) => `${dir} -> ${name(state, dest)}`).join("\n");
}

function doGo(state, direction) {
  const room = state.content.rooms[here(state)];
  const dest = room?.exits?.[direction];
  if (!dest) return ok(state, `You can't go ${direction} from here.`);
  const next = { ...state, world: engineGo(state.world, state.actor, dest) };
  return ok(next, describe(next));
}

function doExamine(state, query) {
  if (!query) return ok(state, "Examine what?");
  const roomId = here(state);
  const seen = perceive(state.world, state.actor);
  const candidates = [
    roomId,
    ...around(state).items,
    ...around(state).npcs,
    ...inventory(state),
    ...seen.facts.map((f) => f.e),
  ];
  const id = resolve(state, query, [...new Set(candidates)]);
  if (!id) return ok(state, `You don't see "${query}" here.`);
  const thing = state.content.rooms[id] ?? state.content.things[id];
  if (!thing) return ok(state, `You look at ${name(state, id)}, but there's nothing more to say.`);
  return ok(state, thing.description ?? `It's ${thing.name}.`);
}

function doTake(state, query) {
  if (!query) return ok(state, "Take what?");
  const { items } = around(state);
  const id = resolve(state, query, items);
  if (!id) return ok(state, `There is no "${query}" here to take.`);
  const thing = state.content.things[id];
  if (!isTakeable(thing?.tags)) return ok(state, `You can't take ${name(state, id)}.`);
  const next = { ...state, world: engineTake(state.world, state.actor, id) };
  return ok(next, `You take ${name(state, id)}.`);
}

function doDrop(state, query) {
  if (!query) return ok(state, "Drop what?");
  const id = resolve(state, query, inventory(state));
  if (!id) return ok(state, `You aren't carrying "${query}".`);
  const next = { ...state, world: engineDrop(state.world, state.actor, id) };
  return ok(next, `You drop ${name(state, id)}.`);
}

function doGive(state, arg) {
  // "give <item> to <recipient>"  or  "give <recipient> <item>"
  const toMatch = arg.match(/^(.*)\s+to\s+(.*)$/i);
  let itemQuery;
  let whoQuery;
  if (toMatch) {
    itemQuery = toMatch[1];
    whoQuery = toMatch[2];
  } else {
    const parts = arg.split(/\s+/);
    whoQuery = parts.shift() ?? "";
    itemQuery = parts.join(" ");
  }
  const item = resolve(state, itemQuery, inventory(state));
  if (!item) return ok(state, `You aren't carrying "${itemQuery}".`);
  const who = resolve(state, whoQuery, around(state).npcs);
  if (!who) return ok(state, `There is no "${whoQuery}" here to give to.`);
  const next = { ...state, world: engineGive(state.world, state.actor, item, who) };
  return ok(next, `You give ${name(state, item)} to ${name(state, who)}.`);
}

function doInventory(state) {
  const ids = inventory(state);
  if (!ids.length) return ok(state, "You are carrying nothing.");
  return ok(state, ["You are carrying:", ...ids.map((id) => `  ${name(state, id)}`)].join("\n"));
}

export const HELP = [
  "Commands:",
  "  look / l            — look around the room",
  "  examine <thing>     — look closely at something (also: x, look <thing>)",
  "  go <dir> / <dir>    — move (north, n, southeast, se, ...)",
  "  exits               — list the ways out",
  "  take <thing>        — pick something up (also: get)",
  "  drop <thing>        — put something down",
  "  give <thing> to <who> — hand something to someone",
  "  inventory / i       — what you are carrying",
  "  say <words>         — speak",
  "  help                — this list",
  "  quit                — leave",
].join("\n");
