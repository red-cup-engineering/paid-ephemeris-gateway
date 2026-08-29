// intents — ruinfold's intent VALIDATOR: the trust boundary that shapes raw JSON from the network
// into one of ruinfold's ~20 known intents, or returns null to reject. This is DOMAIN: the engine
// (@561-group/qwzspace) has no opinion about a game's intents, only about the single-writer
// discipline. qwzspace's intent-queue takes this `validate` as its argument and owns the queueing;
// we own only WHAT a valid ruinfold intent is.
//
// An intent is a small plain object: { kind, actor, ...args }. validate() never touches the world —
// it only shapes input. The tick (engine/tick.mjs) is the single writer that applies the drained,
// validated intents.
//
// `id`/`num` mirror qwzspace's intent-queue primitives (they were lifted from here); kept local so
// the validator is self-contained domain.

const DIRS_4 = new Set(["n", "s", "e", "w"]);
const DIRS_CARDINAL = new Set(["north", "south", "east", "west"]);
const ABILITY_NAMES = new Set(["heavy", "cleave", "bolt", "second-wind"]);
const SLOTS = new Set(["weapon", "armor", "trinket"]);
// ASCII control chars (0x00–0x1F and DEL) — stripped from chat so it can't injure the log/stream.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// num — coerce to a finite number or null (rejects NaN/Infinity/strings-that-aren't-numbers).
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// id — a safe entity id: a non-empty string of a sane length and charset (no path tricks, no log
// injection). Actors and targets are addressed by id, which becomes a filename, so keep it tight.
function id(v) {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v) ? v : null;
}

export function validate(raw) {
  if (!raw || typeof raw !== "object") return null;
  const actor = id(raw.actor);
  if (!actor) return null;

  switch (raw.kind) {
    case "join":
    case "respawn":
      return { kind: raw.kind, actor };
    case "move": {
      // Either a WASD nudge { dir } or a click-to-move goal { x, z }.
      if (DIRS_4.has(raw.dir)) return { kind: "move", actor, dir: raw.dir };
      const x = num(raw.x);
      const z = num(raw.z);
      if (x != null && z != null) return { kind: "move", actor, x, z };
      return null;
    }
    case "portal": {
      const dir = DIRS_CARDINAL.has(raw.dir) ? raw.dir : null;
      return dir ? { kind: "portal", actor, dir } : null;
    }
    case "attack": {
      const target = id(raw.target);
      return target ? { kind: "attack", actor, target } : null;
    }
    case "pickup":
    case "drop":
    case "equip": {
      const item = id(raw.item);
      return item ? { kind: raw.kind, actor, item } : null;
    }
    case "unequip": {
      return SLOTS.has(raw.slot) ? { kind: "unequip", actor, slot: raw.slot } : null;
    }
    case "ability": {
      if (!ABILITY_NAMES.has(raw.ability)) return null;
      const target = id(raw.target); // optional (second-wind has none) — id() returns null if absent
      return { kind: "ability", actor, ability: raw.ability, target: target ?? null };
    }
    case "accept":
    case "turnin": {
      const npc = id(raw.npc);
      return npc ? { kind: raw.kind, actor, npc } : null;
    }
    case "buy": {
      const npc = id(raw.npc);
      const archetype = id(raw.archetype);
      return npc && archetype ? { kind: "buy", actor, npc, archetype } : null;
    }
    case "sell": {
      const npc = id(raw.npc);
      const item = id(raw.item);
      return npc && item ? { kind: "sell", actor, npc, item } : null;
    }
    case "say": {
      // trust boundary for chat: a non-empty string, control chars stripped, capped to 200 chars.
      const text = typeof raw.text === "string" ? raw.text.replace(CONTROL_CHARS, "").trim().slice(0, 200) : "";
      return text ? { kind: "say", actor, text } : null;
    }
    case "craft": {
      const recipe = id(raw.recipe);
      return recipe ? { kind: "craft", actor, recipe } : null;
    }
    case "party-create":
    case "party-leave":
      return { kind: raw.kind, actor };
    case "party-join": {
      const party = id(raw.party);
      return party ? { kind: "party-join", actor, party } : null;
    }
    case "trade-open": {
      const target = id(raw.target);
      return target && target !== actor ? { kind: "trade-open", actor, target } : null;
    }
    case "trade-offer": {
      const items = Array.isArray(raw.items) ? raw.items.map(id).filter(Boolean).slice(0, 32) : [];
      const gold = num(raw.gold);
      return { kind: "trade-offer", actor, items, gold: gold != null && gold >= 0 ? gold : 0 };
    }
    case "trade-confirm":
    case "trade-cancel":
      return { kind: raw.kind, actor };
    default:
      return null;
  }
}
