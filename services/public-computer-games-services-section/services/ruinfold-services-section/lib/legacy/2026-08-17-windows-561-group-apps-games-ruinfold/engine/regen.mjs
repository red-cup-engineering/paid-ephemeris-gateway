// regen — passive recovery between fights. Each tick a subject trickles back STAMINA always, and
// HEALTH only once it has been OUT OF COMBAT long enough. Like combat, this is an intra-action on
// the trace: it `changing`s the FUNCTIONAL `health`/`stamina` cells (latest-t wins, so the value
// actually climbs) and collects the subject in `dirty` for the snapshot. It NEVER resurrects the
// fallen: a dead/slain/vanished/ghost subject regenerates nothing.
//
// regenTick(root, subjectId, tick, t, dirty) -> { regen }
//   tick  : the integer world heartbeat for this turn (used for the out-of-combat gap)
//   t     : a () => string clock thunk (orders the appended rows within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import changing from "#changing";
import { view, valOf, numOf } from "#engine/_world.mjs";
import { tickOf } from "#engine/functional.mjs";

// How many ticks since the last combat action before health begins to mend, and how much each
// resource recovers per regenerating tick.
export const OUT_OF_COMBAT = 5;
export const HEALTH_REGEN = 2;
export const STAMINA_REGEN = 3;

// statuses that mean "this thing is not a living body" — no recovery of any kind for them.
const NO_REGEN = new Set(["dead", "slain", "vanished", "ghost"]);

export async function regenTick(root, subjectId, tick, t, dirty) {
  const subject = await view(root, subjectId);

  // A corpse, a slain undead, a vanished thing, or a disembodied ghost mends nothing. Embodiment
  // and resurrection are death.mjs's job; regen only ever tops up an already-living body.
  if (NO_REGEN.has(valOf(subject, "status", "up"))) return { regen: false };

  let changedAnything = false;

  // STAMINA always trickles back, in or out of combat — it is the resource you spend to act, not
  // a wound. Clamp to max so a high regen never overshoots the cap.
  const stamina = numOf(subject, "stamina", 0);
  const maxStamina = numOf(subject, "max-stamina", 0);
  if (stamina < maxStamina) {
    const next = Math.min(maxStamina, stamina + STAMINA_REGEN);
    await changing({ root, subject: subjectId, predicate: "stamina", object: next, t: t() });
    changedAnything = true;
  }

  // HEALTH only mends OUT OF COMBAT. `last-combat` is the clock string combat stamped on the
  // subject; tickOf parses its tick. Note: tickOf("") === 0, so a subject that has NEVER fought
  // (no last-combat cell, fallback "") reads a gap of `tick - 0 === tick`, and so begins
  // regenerating naturally once tick ≥ OUT_OF_COMBAT — exactly the desired "fresh spawn heals"
  // behaviour without a special case.
  const gap = tick - tickOf(valOf(subject, "last-combat", ""));
  const health = numOf(subject, "health", 0);
  const maxHealth = numOf(subject, "max-health", 0);
  // health > 0 guards the dead-by-hp case: a thing at 0 health is a corpse, not a patient, and
  // must be raised by death.mjs, never quietly regenerated back to life here.
  if (gap >= OUT_OF_COMBAT && health > 0 && health < maxHealth) {
    const next = Math.min(maxHealth, health + HEALTH_REGEN);
    await changing({ root, subject: subjectId, predicate: "health", object: next, t: t() });
    changedAnything = true;
  }

  // Only mark the subject dirty if a cell actually moved — an at-cap, in-combat subject is a no-op.
  if (changedAnything) dirty.add(subjectId);
  return { regen: changedAnything };
}
