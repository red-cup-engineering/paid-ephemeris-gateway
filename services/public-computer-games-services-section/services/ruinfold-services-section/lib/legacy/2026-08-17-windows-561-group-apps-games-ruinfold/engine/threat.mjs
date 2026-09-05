// threat — an aggro/threat table per monster, so a monster fights whoever has earned the most
// threat (not merely whoever is nearest). This is the substrate under MMO-style TANKING: a tank
// taunts to top the table and hold the monster while squishier party members deal damage. Each
// monster carries ONE structured `threat-table` cell — a plain JSON object {attackerId: amount}
// — and that predicate is FUNCTIONAL (see engine/functional.mjs), so each write is read-modify-
// write of the whole object and latest-t simply wins. (We read the object through valOf, NOT
// numOf: valOf returns the held cell's object verbatim, and EAVT object values may themselves be
// objects — exactly how seed stores `offers`/`intends` as one structured cell. numOf would
// Number() it into NaN.)
//
//   addThreat(root, monsterId, attackerId, amount, t, dirty) -> new total for that attacker
//   topThreat(root, monsterId)                               -> highest-threat attackerId, or null
//   threatOf(root, monsterId)                                -> the {attackerId: amount} object
//   clearThreat(root, monsterId, t, dirty)                   -> reset table to {} (death/respawn)
//   decay(root, monsterId, factor, t, dirty)                 -> scale all entries, drop the dregs
//
//   t     : a () => string clock thunk (orders sub-events within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import changing from "#changing";
import { view, valOf } from "#engine/_world.mjs";

// tableOf — the monster's current threat object, defaulting to {} when no cell is held (or it
// somehow holds a non-object). Always copy-on-read so callers can't mutate the settled view.
async function tableOf(root, monsterId) {
  const raw = valOf(await view(root, monsterId), "threat-table", null);
  return raw && typeof raw === "object" ? { ...raw } : {};
}

// write — land the updated object as the new `threat-table` cell. The monster is the subject; the
// attacker is named as the agent so the trace records WHO drove threat up. Functional ⇒ latest-t
// wins, so this whole-object write is the canonical state.
async function write(root, monsterId, agent, table, t, dirty) {
  await changing({ root, agent, subject: monsterId, predicate: "threat-table", object: table, t: t() });
  if (dirty) dirty.add(monsterId);
}

// addThreat — credit `attackerId` with `amount` more threat on `monsterId`. Read the table, add to
// the attacker's running total (0 if first), write it back. Returns that attacker's NEW total
// (handy for callers that want to react to a taunt crossing the lead).
export async function addThreat(root, monsterId, attackerId, amount, t, dirty) {
  const table = await tableOf(root, monsterId);
  const total = (table[attackerId] || 0) + amount;
  table[attackerId] = total;
  await write(root, monsterId, attackerId, table, t, dirty);
  return total;
}

// topThreat — the attackerId holding the most threat, or null when the table is empty. Ties resolve
// to whichever the iteration meets first; v0 doesn't need a tie-break rule.
export async function topThreat(root, monsterId) {
  const table = await tableOf(root, monsterId);
  let top = null;
  let best = -Infinity;
  for (const [attacker, amount] of Object.entries(table)) {
    if (amount > best) { best = amount; top = attacker; }
  }
  return top;
}

// threatOf — the raw {attackerId: amount} object, for the AI to inspect and for debugging.
export async function threatOf(root, monsterId) {
  return tableOf(root, monsterId);
}

// clearThreat — wipe the table back to {}. Call on death/respawn so a returned monster doesn't
// resume hating its last killer.
export async function clearThreat(root, monsterId, t, dirty) {
  await write(root, monsterId, monsterId, {}, t, dirty);
}

// decay — ambient forgetting: multiply every entry by `factor` (e.g. 0.95 each tick) and DROP any
// entry that falls below 1, so threat bled off long ago stops naming a phantom target. Optional;
// the table is correct without it, this just lets aggro cool when nobody keeps hitting.
export async function decay(root, monsterId, factor, t, dirty) {
  const table = await tableOf(root, monsterId);
  const next = {};
  for (const [attacker, amount] of Object.entries(table)) {
    const scaled = amount * factor;
    if (scaled >= 1) next[attacker] = scaled;
  }
  await write(root, monsterId, monsterId, next, t, dirty);
  return next;
}
