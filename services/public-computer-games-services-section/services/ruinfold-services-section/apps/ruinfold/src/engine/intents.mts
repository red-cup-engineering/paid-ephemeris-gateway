// intents — the trust-boundary validator, ported from legacy engine/intents.mjs and trimmed to
// the v0 kinds the daily actually needs (design §7 drops party-*/trade-*/buy/sell/craft/accept/
// turnin as multiplayer- or NPC-economy-only, out of scope for a solo permadeath run). validate()
// never touches the world — it only shapes raw JSON into one of the known intents, or returns null
// to reject. This is the ENTIRE trust boundary: replay.mts calls this over every move in a
// submitted log before a single tick runs (design §2.2), and a malformed intent poisons the whole
// submission, not just itself.

export type Dir4 = "n" | "s" | "e" | "w";
export type PortalDir = "north" | "south";
export type AbilityName = "heavy" | "cleave" | "bolt" | "second-wind";
export type Slot = "weapon" | "armor" | "trinket";

export type Intent =
  | { kind: "join"; actor: string }
  | { kind: "move"; actor: string; dir: Dir4 }
  | { kind: "portal"; actor: string; dir: PortalDir }
  | { kind: "attack"; actor: string; target: string }
  | { kind: "ability"; actor: string; ability: AbilityName; target: string | null }
  | { kind: "pickup"; actor: string; item: string }
  | { kind: "drop"; actor: string; item: string }
  | { kind: "equip"; actor: string; item: string }
  | { kind: "unequip"; actor: string; slot: Slot };

const DIRS_4 = new Set(["n", "s", "e", "w"]);
const PORTAL_DIRS = new Set(["north", "south"]); // the daily is a linear chain (design §1.3) — no e/w
const ABILITY_NAMES = new Set(["heavy", "cleave", "bolt", "second-wind"]);
const SLOTS = new Set(["weapon", "armor", "trinket"]);

// id — a safe entity id: non-empty, sane length/charset (no path tricks, no log injection).
function id(v: unknown): string | null {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v) ? v : null;
}

export function validate(raw: unknown): Intent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const actor = id(r.actor);
  if (!actor) return null;

  switch (r.kind) {
    case "join":
      return { kind: "join", actor };
    case "move":
      return typeof r.dir === "string" && DIRS_4.has(r.dir) ? { kind: "move", actor, dir: r.dir as Dir4 } : null;
    case "portal":
      return typeof r.dir === "string" && PORTAL_DIRS.has(r.dir) ? { kind: "portal", actor, dir: r.dir as PortalDir } : null;
    case "attack": {
      const target = id(r.target);
      return target ? { kind: "attack", actor, target } : null;
    }
    case "ability": {
      if (typeof r.ability !== "string" || !ABILITY_NAMES.has(r.ability)) return null;
      const target = id(r.target);
      return { kind: "ability", actor, ability: r.ability as AbilityName, target };
    }
    case "pickup":
    case "drop":
    case "equip": {
      const item = id(r.item);
      return item ? { kind: r.kind, actor, item } : null;
    }
    case "unequip":
      return typeof r.slot === "string" && SLOTS.has(r.slot) ? { kind: "unequip", actor, slot: r.slot as Slot } : null;
    default:
      return null;
  }
}
