// events — the living world. Between turns the world acts on ITSELF: a calm gives way to a
// blood-moon that empowers the undead, then to an undead-tide, then back to calm — a rotation
// the design brief's "living world" prizes. Like every ruinfold mechanic this is DETERMINISTIC:
// the current event is a pure function of the tick number (no RNG), so replaying the same trace
// reproduces the same blood-moon at the same tick. The scheduler runs inside the tick (a single
// writer), writing the dimension subject "ruinfold"'s `world-event` and `event-until` cells —
// both already in RUIN_FUNCTIONAL (latest-t wins), so the cell always reads the current event.
//
//   tickEvents(root, tick, t, dirty) -> { event, changed }   the scheduler; call once per tick
//   activeEvent(root)                -> { id, name }         what is settled on the dimension now
//   modifiersOf(eventId)             -> { ...buffs }         the buffs an event declares (read-only)
//
// This module only DECLARES the rotation and its modifiers and writes the active-event cells.
// Applying the modifiers is the integrator's job: ai/combat read modifiersOf(activeEvent(...).id)
// for undead actors during a blood-moon; the client reads activeEvent for its event banner.

import changing from "#changing";
import { view, valOf, numOf } from "#engine/_world.mjs";

// The dimension subject — the same heartbeat subject tick.mjs writes its `tick` predicate onto.
const DIMENSION = "ruinfold";

// CYCLE — ticks between event changes. Every CYCLE ticks the world rotates to the next event in
// EVENTS. (durationTicks on each event records how long that event is "supposed" to last; here it
// equals CYCLE because the rotation is back-to-back, but it is stored on `event-until` so a reader
// can tell when the active event ends without re-deriving the schedule.)
export const CYCLE = 60;

// EVENTS — the rotation, in order. Index 0 (calm) is also the default when nothing is settled yet.
// Each: { id, name, durationTicks, describe }. Keep the list small; the world cycles through it
// forever, one event per CYCLE-tick window, wrapping at the end.
//
//   calm         — the baseline; the undead are no stronger than usual.
//   blood-moon   — the moon runs red and the undead are EMPOWERED (see modifiersOf).
//   undead-tide  — the dead surge; more of them press on the living (aggro-heavy, see modifiersOf).
export const EVENTS = [
  {
    id: "calm",
    name: "Calm",
    durationTicks: CYCLE,
    describe: "The ruin lies quiet. The dead keep their graves.",
  },
  {
    id: "blood-moon",
    name: "Blood Moon",
    durationTicks: CYCLE,
    describe: "A red moon empowers the undead — they strike harder and hunger for the living.",
  },
  {
    id: "undead-tide",
    name: "Undead Tide",
    durationTicks: CYCLE,
    describe: "The dead surge in a tide, rousing to the scent of anything that still breathes.",
  },
];

// MODIFIERS — the read-only buffs each event declares. The keys are the engine's own knobs; the
// integrator decides which ones it honors and where (ai aggro radius, combat attack bonus, ...).
// An event absent here (or "calm") declares nothing — modifiersOf returns an empty object.
const MODIFIERS = {
  "blood-moon": { undeadAttack: +2, undeadAggro: +4 },
  "undead-tide": { undeadAttack: +1, undeadAggro: +8 },
};

// eventIndexFor — the index into EVENTS for a given tick. Pure: floor(tick / CYCLE) mod length.
// Tick 0..CYCLE-1 -> EVENTS[0] (calm), CYCLE..2*CYCLE-1 -> EVENTS[1] (blood-moon), and so on,
// wrapping back to calm after the last event. This single function IS the schedule — every other
// "what event is it" question derives from here, so replay is exact.
function eventIndexFor(tick) {
  return Math.floor(tick / CYCLE) % EVENTS.length;
}

// eventFor — the full EVENTS entry that should be active at `tick`.
function eventFor(tick) {
  return EVENTS[eventIndexFor(tick)];
}

// windowStartFor — the first tick of the CYCLE-window containing `tick`. event-until is set to
// windowStart + durationTicks so a reader knows exactly when the current event lapses.
function windowStartFor(tick) {
  return Math.floor(tick / CYCLE) * CYCLE;
}

// tickEvents — the deterministic scheduler. Called once per tick (from tick.mjs). Computes the
// event that SHOULD be active at `tick`; if the dimension's settled `world-event` differs, it
// writes the new `world-event` and `event-until` cells and reports changed:true. Otherwise it is
// a no-op write-wise and reports changed:false. Returns { event, changed } — event is the full
// EVENTS entry now in force. Pure function of `tick` (no randomness): same tick => same event.
export async function tickEvents(root, tick, t, dirty) {
  const event = eventFor(tick);
  const current = valOf(await view(root, DIMENSION), "world-event", null);

  // Only write when the active event actually rotates (on a CYCLE boundary), or when nothing is
  // settled yet (world just seeded). Writing every tick would bloat the trace with no-op rows.
  const changed = current !== event.id;
  if (changed) {
    const until = windowStartFor(tick) + event.durationTicks;
    await changing({ root, subject: DIMENSION, predicate: "world-event", object: event.id, t: t() });
    await changing({ root, subject: DIMENSION, predicate: "event-until", object: until, t: t() });
    dirty.add(DIMENSION);
  }

  return { event, changed };
}

// activeEvent — the event currently settled on the dimension, as { id, name }. Falls back to calm
// (EVENTS[0]) when nothing is settled or the settled id is unknown. This reads the WRITTEN cell,
// not the schedule, so it reflects whatever the last tickEvents actually committed.
export async function activeEvent(root) {
  const id = valOf(await view(root, DIMENSION), "world-event", EVENTS[0].id);
  const e = EVENTS.find((x) => x.id === id) ?? EVENTS[0];
  return { id: e.id, name: e.name };
}

// eventUntil — the tick at which the settled event lapses (or 0 if none settled). Convenience for
// readers (client banner countdowns, etc.); the schedule itself never needs it.
export async function eventUntil(root) {
  return numOf(await view(root, DIMENSION), "event-until", 0);
}

// modifiersOf — the buffs the named event declares, as a fresh plain object the caller may read
// freely (a copy, so a caller can't mutate the shared table). calm / unknown => {}.
export function modifiersOf(eventId) {
  return { ...(MODIFIERS[eventId] ?? {}) };
}
