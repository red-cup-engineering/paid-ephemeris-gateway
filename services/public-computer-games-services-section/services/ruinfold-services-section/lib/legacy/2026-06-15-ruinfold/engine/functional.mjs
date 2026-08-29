// functional — the two load-bearing contracts every other ruinfold module imports.
//
// (1) RUIN_FUNCTIONAL — the set of predications that are SINGLE-VALUED OVER TIME in ruinfold.
// tab's substrate supersedes functional predicates to their latest-t row at settle, but tab's
// own FUNCTIONAL set knows nothing of a game's health/position/level. settle()/supersede()
// accept opts.functional, so ruinfold extends the base set and passes RUIN_FUNCTIONAL on EVERY
// settle. Without this, two `health` rows would BOTH count (knowledgeJoin), not supersede — a
// monster's health would never go down. This is the single most important integration point.
//
// (2) clock(tick, seq) — the ONLY place a `t` string is built. assertRow requires `t` to be a
// non-empty string, and supersede compares `t` with `>` (STRING comparison). So the padding is
// not cosmetic: "tick:000042/seq:0010" must sort after "tick:000042/seq:0009", which it only
// does zero-padded. Every appended row in a tick shares the tick number; seq orders the moves
// within the tick. Lexical order == chronological order, by construction.

import { FUNCTIONAL } from "#substrate";

// The game-state predications layered on tab's base functional set. Each is "the latest value
// wins": an entity has ONE health, ONE position per axis, ONE level, etc.
export const RUIN_FUNCTIONAL = new Set([
  ...FUNCTIONAL, // located-in, tick, phase, status, weather, ringing, overdue, age-days
  "health",
  "max-health",
  "pos-x",
  "pos-y",
  "pos-z",
  "facing",
  "form", // current embodied form (human / beast / ghost) — can settle to ⊤ when cursed
  "level",
  "xp",
  "attack-power",
  "armor",
  "respawn-at", // tick number at which a dead mortal re-embodies
  "alive-revives", // how many times an undead has risen (the durable scar of ⊤)
  "death-rule", // which death semantics this entity follows (mortal/undead/cursed/named/construct)
  "move-target-x", // transient steering goal for click-to-move
  "move-target-z",
  // --- combat resources & cooldowns -------------------------------------------------------------
  "stamina",
  "max-stamina",
  "last-combat", // tick of the most recent combat action — gates out-of-combat regen
  "cooldown-heavy", // per-ability "usable again at tick N" gates
  "cooldown-cleave",
  "cooldown-bolt",
  "cooldown-heal",
  // --- equipment slots (each holds the id of the equipped item, or absent) ----------------------
  "equipped-weapon",
  "equipped-armor",
  "equipped-trinket",
  // --- economy ----------------------------------------------------------------------------------
  "gold",
  // --- AI leashing: a monster's home it wanders near and returns to --------------------------
  "home-x",
  "home-z",
  // --- the player's single active bounty (one at a time, kept simple for v0) ------------------
  "active-bounty",
  "bounty-progress",
  "bounty-goal",
  "bounty-target-kind",
  "bounty-reward-gold",
  "bounty-reward-xp",
  "bounty-reward-item",
  "bounty-giver",
  // --- status effects: each holds the tick it expires at (engine/effects.mjs) -----------------
  "effect-poison",
  "effect-regen",
  "effect-stun",
  "effect-might",
  "effect-weaken",
  // --- threat: one JSON object cell {attackerId: amount} per monster (engine/threat.mjs) -------
  "threat-table",
  // --- parties (engine/party.mjs) -------------------------------------------------------------
  "party-id",
  "party-leader",
  // --- player-to-player escrow trade (engine/playertrade.mjs) ---------------------------------
  "trade-with",
  "trade-offer",
  "trade-confirmed",
  // --- world events on the dimension (engine/events.mjs) --------------------------------------
  "world-event",
  "event-until",
]);

const TICK_PAD = 6;
const SEQ_PAD = 4;

// clock — build the canonical ordered `t` for a row. tick is the world heartbeat; seq orders
// the sub-events the engine appends within one tick. Both zero-padded so string `>` is time `>`.
export function clock(tick, seq) {
  return `tick:${String(tick).padStart(TICK_PAD, "0")}/seq:${String(seq).padStart(SEQ_PAD, "0")}`;
}

// seedClock — the `t` for world construction (before tick 0). Sorts BEFORE any tick:* row, so
// the seed is always the earliest layer of the trace. Mirrors build-farstone's `seed:NNNNNN`.
export function seedClock(seq) {
  return `seed:${String(seq).padStart(TICK_PAD, "0")}`;
}

// tickOf — parse the integer tick out of a `t` string (for respawn-at comparisons etc.).
export function tickOf(t) {
  const m = /^tick:(\d+)/.exec(t);
  return m ? Number(m[1]) : 0;
}
