// combat — a melee attack as intra-actions on the trace. An attack is `changing` the target's
// health (FUNCTIONAL → latest-t wins, so health actually descends) and, on a killing blow,
// `doing` a `slain` predication attributed to the attacker. For undead/cursed targets `slain` is
// the converse of `alive`, so the kill drives the alive-cell to ⊤; death.mjs reads that and
// decides what the death MEANS. Combat itself never branches on death kind — it only lands hits.
//
// attack(root, attacker, targetId, t, dirty) -> { hit, killed, deathRule, target, dmg }
//   t     : a () => string clock thunk (orders sub-events within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import changing from "#changing";
import doing from "#doing";
import { view, posOf, dist2, numOf, valOf, glyphOf, zoneOf } from "#engine/_world.mjs";
import { addThreat } from "#engine/threat.mjs";

export const MELEE_RANGE = 3;
const MELEE_R2 = MELEE_RANGE * MELEE_RANGE;

// strike — apply `amount` damage to a target and resolve a killing blow, with NO range/zone gate
// (the caller decides reach: a melee swing, a ranged bolt, an AoE cleave all land here once they
// have chosen their victim). This is the shared damage primitive combat/abilities/ai all funnel
// through, so "what a hit does to the bilattice" lives in exactly one place. It also stamps
// `last-combat` on both parties so regen knows they are fighting.
export async function strike(root, attacker, targetId, amount, t, dirty) {
  const target = await view(root, targetId);
  // already a corpse / gone? nothing to hit. (An undead held at ⊤ is still hittable.)
  const aliveGlyph = glyphOf(target, "alive", targetId);
  const status = valOf(target, "status", "up");
  if (aliveGlyph === "f" || status === "dead" || status === "slain" || status === "vanished") return { hit: false };

  const armor = numOf(target, "armor", 0);
  const dmg = Math.max(1, Math.round(amount - armor)); // armor soaks; a hit always stings ≥1
  const hp = numOf(target, "health", numOf(target, "max-health", 1));
  const next = hp - dmg;

  const stamp = t();
  await changing({ root, agent: attacker, subject: targetId, predicate: "health", object: next, t: stamp });
  await changing({ root, subject: targetId, predicate: "last-combat", object: stamp, t: t() });
  await changing({ root, subject: attacker, predicate: "last-combat", object: stamp, t: t() });
  // accumulate threat on the target so it fights whoever hurts it most (tanking), not just nearest
  await addThreat(root, targetId, attacker, dmg, t, dirty);
  dirty.add(targetId);
  dirty.add(attacker);

  if (next <= 0) {
    // The killing blow. Attributed to the attacker (reified enacted-by) so xp/loot/⊤-evidence all
    // know who did it. For undead/cursed this `slain` row IS negative evidence for alive ⇒ ⊤.
    await doing({ root, agent: attacker, subject: targetId, predicate: "slain", object: targetId, t: t() });
    return { hit: true, killed: true, deathRule: valOf(target, "death-rule", "mortal"), target: targetId, dmg };
  }
  return { hit: true, killed: false, target: targetId, dmg };
}

// attack — a basic MELEE swing: gate on same-zone + reach, then strike for (attack-power − armor).
export async function attack(root, attacker, targetId, t, dirty) {
  const a = await view(root, attacker);
  const target = await view(root, targetId);
  if (glyphOf(target, "alive", targetId) === "f" || valOf(target, "status", "up") === "dead") return { hit: false };
  if ((await zoneOf(root, attacker)) !== (await zoneOf(root, targetId))) return { hit: false };
  if (dist2(posOf(a), posOf(target)) > MELEE_R2) return { hit: false };
  return strike(root, attacker, targetId, numOf(a, "attack-power", 1), t, dirty);
}
