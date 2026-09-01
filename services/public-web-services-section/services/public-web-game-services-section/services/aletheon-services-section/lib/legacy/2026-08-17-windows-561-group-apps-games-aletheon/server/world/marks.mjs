// marks — the MARK as the kernel's base quantum, made a playable, conserved, condensing substance.
//
// A mark is a single drawn distinction: Spencer-Brown's mark = Shannon's bit = the kernel's
// `articulate`. A creature's life-evidence (value.mjs witnesses) ARE marks. Combat already makes
// them CONSERVED — the slain cell's marks transfer to the slayer, never destroyed (combat.mjs;
// the evidence carrier only ever GROWS). This module lets a player SETTLE those marks back into
// FORM: spend COST marks to POSIT a claim through the REAL kernel descent, and on a `t` verdict
// raise a Cairn — a standing, peaceful marker that CALMS the void (field.mjs).
//
// We do not hand-build the verdict. We mint the utterance ["this", "settled"] and run the real
// four-regime descent articulate → predicate → posit → settle, then read the section's charge —
// exactly the shape world.test.mjs probes: out.sheaf.section["fiber-algebras"][0].assignments[0].

import { MARK, KIND } from "../../shared/constants.mjs";
import { articulate, predicate, posit, settle as kSettle } from "./kernel.mjs";
import { spawn } from "./store.mjs";

// positVerdict — run the REAL kernel descent on the settling utterance and read the section charge.
// Returns its `value` pair [pos, neg]; a `t` verdict is pos && !neg (the same read as present()).
export function positVerdict() {
  const out = kSettle(posit(predicate(articulate([{ const: "this" }, { const: "settled" }]))));
  const section = out.sheaf.section.fiber_algebras?.[0]?.assignments?.[0]
    ?? out.sheaf.section["fiber-algebras"][0].assignments[0];
  const [pos, neg] = section.charge.value;
  return { pos, neg, t: pos && !neg };
}

// settle — spend COST marks to POSIT a claim through the kernel and, on a `t` verdict, raise a
// Cairn at the player's position. Returns the Cairn entity, or null (not enough marks / not `t`).
// The marks are condensed into the standing form: they leave the player and become the Cairn.
export function settle(world, player) {
  if (!player || (player.marks || 0) < MARK.settleCost) return null;
  const verdict = positVerdict();
  if (!verdict.t) return null; // the kernel did not settle the claim to t — no Cairn rises
  player.marks -= MARK.settleCost;
  player.dirty = true;
  const cairn = spawn(world, {
    kind: KIND.cairn,
    name: "Cairn",
    x: player.x, z: player.z, yaw: player.yaw,
    maxHp: 1, hostile: false,
  });
  cairn.marks = MARK.settleCost; // the condensed marks now STAND in the Cairn (conserved)
  return cairn;
}
