// death — the headline. There is no single "death": there are FIVE, and which one a slain entity
// gets is read from its `death-rule` (data on its own log), routed onto the four-valued bilattice.
// Every monster declares `slain ⊣ alive` at seed, so a killing blow's `slain` row folds as
// NEGATIVE evidence into the alive-cell. What death.mjs does next decides the cell's final value:
//
//   undead    → KEEP the positive alive face. alive = ⊤ (alive AND slain). Heal, revives++, RISE.
//               The contradiction is the monster's resting state — it stays ⊤ forever.
//   named     → RETRACT positive alive. alive = f (only the slain-as-neg remains). True death.
//               Drops loot, long respawn. The clean, settled f.
//   mortal    → (monster) RETRACT positive alive → f; respawn on cooldown.
//               (player)  no corpse: status→ghost, form→ghost. You wander dead and must reach a
//                         shrine to re-embody, or choose to respawn (the Project Gorgon choice).
//   construct → RETRACT positive alive AND retract slain → alive = ⊥. Un-made: returns to mystery
//               (the kernel's void cone), no corpse, no loot. Reforms elsewhere on cooldown.
//   cursed    → the monster itself dies like `named` (f), but its death CURSES its slayer: the
//               killer's `human` cell is contradicted by a `beast` row (declared its converse),
//               settling to ⊤ — a permanent, irreversible dual identity (PG lycanthropy).
//
// resolveDeaths(root, kills, t, dirty, ctx) — kills: [{target, deathRule, killer}], ctx:{tick}
// resolveRespawns(root, tick, t, dirty)     — re-embody monsters whose respawn-at has come
// embody(root, subject, t, dirty)           — bring a ghost/dead subject back to flesh

import changing from "#changing";
import doing, { declareConverse, retract } from "#doing";
import { view, numOf, valOf, glyphOf } from "#engine/_world.mjs";
import { clearThreat } from "#engine/threat.mjs";

export async function resolveDeaths(root, kills, t, dirty, { tick } = {}) {
  for (const { target, deathRule, killer } of kills) {
    const thing = await view(root, target);
    const max = numOf(thing, "max-health", 1);
    dirty.add(target);
    await clearThreat(root, target, t, dirty); // a felled/rising thing forgets its old aggro

    if (deathRule === "undead") {
      // RISE. alive is already ⊤ (converse declared + slain landed). Heal and scar it; leave the
      // slain face in place so the alive-cell stays ⊤ — the undead is a standing contradiction.
      const revives = numOf(thing, "alive-revives", 0) + 1;
      await changing({ root, subject: target, predicate: "health", object: max, t: t() });
      await changing({ root, subject: target, predicate: "alive-revives", object: revives, t: t() });
      await changing({ root, subject: target, predicate: "status", object: "risen", t: t() });
      continue;
    }

    if (deathRule === "construct") {
      // VANISH to ⊥. Retract BOTH faces: the body un-happens. No corpse, no loot, reforms later.
      await retract({ root, subject: target, predicate: "alive", t: t() });
      await retract({ root, subject: target, predicate: "slain", t: t() });
      await changing({ root, subject: target, predicate: "status", object: "vanished", t: t() });
      await changing({ root, subject: target, predicate: "respawn-at", object: tick + numOf(thing, "respawn-cooldown", 25), t: t() });
      continue;
    }

    if (deathRule === "mortal" && valOf(thing, "kind") === "player") {
      // A PLAYER does not get a corpse — they get a ghost-run. Keep the trace honest (no retract);
      // status/form gate control and rendering. They re-embody at a shrine or respawn by choice.
      await changing({ root, subject: target, predicate: "status", object: "ghost", t: t() });
      await changing({ root, subject: target, predicate: "form", object: "ghost", t: t() });
      await changing({ root, subject: target, predicate: "health", object: 0, t: t() });
      continue;
    }

    // mortal monster, named boss, or cursed monster: a TRUE death. Retract the positive alive so
    // the slain-as-neg stands alone — the cell settles to f. Then schedule respawn; for the cursed,
    // lay the lycanthropy on the slayer. (Loot/gold drops are a tick concern — see engine/loot.mjs,
    // dropped in the tick's reward phase for any kill a PLAYER lands — so death.mjs stays about the
    // bilattice, not the economy.)
    await retract({ root, subject: target, predicate: "alive", t: t() });
    await changing({ root, subject: target, predicate: "status", object: "slain", t: t() });
    await changing({ root, subject: target, predicate: "respawn-at", object: tick + numOf(thing, "respawn-cooldown", 25), t: t() });

    if (deathRule === "cursed" && killer) {
      await curse(root, killer, t, dirty);
    }
  }
}

// curse — lay an irreversible lycanthropy on the slayer. Declare `beast` the converse of `human`
// and assert both: the `human` cell settles to ⊤ (human AND not-human / beast), a permanent held
// dual identity. We NEVER retract it — Project Gorgon's curse can't be removed, ever.
async function curse(root, who, t, dirty) {
  const thing = await view(root, who);
  if (glyphOf(thing, "human", who) === "⊤") return; // already cursed; once is forever
  await declareConverse(root, who, "human", "beast", t());
  await doing({ root, subject: who, predicate: "human", object: who, t: t() });
  await doing({ root, subject: who, predicate: "beast", object: who, t: t() });
  await changing({ root, subject: who, predicate: "cursed-with", object: "lycanthropy", t: t() });
  dirty.add(who);
}

export async function resolveRespawns(root, tick, t, dirty) {
  const { subjects } = await import("#substrate");
  for (const s of await subjects(root)) {
    const thing = await view(root, s);
    const due = valOf(thing, "respawn-at", null);
    const status = valOf(thing, "status", "up");
    if (due != null && Number(due) <= tick && (status === "slain" || status === "vanished")) {
      await embody(root, s, t, dirty);
    }
  }
}

// embody — bring a slain/vanished/ghost subject back to flesh: clear the slain face (retract so
// alive folds clean to t again), re-assert alive, refill health, stand it back up at its spawn.
export async function embody(root, subject, t, dirty) {
  const thing = await view(root, subject);
  await retract({ root, subject, predicate: "slain", t: t() }); // tombstone the neg face
  await doing({ root, subject, predicate: "alive", object: subject, t: t() });
  await changing({ root, subject, predicate: "health", object: numOf(thing, "max-health", 1), t: t() });
  await changing({ root, subject, predicate: "status", object: "up", t: t() });
  await changing({ root, subject, predicate: "form", object: "flesh", t: t() });
  await changing({ root, subject, predicate: "respawn-at", object: -1, t: t() });
  // return to the spawn point of the zone it is in
  const zoneId = valOf(thing, "located-in");
  if (zoneId) {
    const zone = await view(root, zoneId);
    await changing({ root, subject, predicate: "pos-x", object: numOf(zone, "spawn-x", 0), t: t() });
    await changing({ root, subject, predicate: "pos-z", object: numOf(zone, "spawn-z", 0), t: t() });
  }
  dirty.add(subject);
}
