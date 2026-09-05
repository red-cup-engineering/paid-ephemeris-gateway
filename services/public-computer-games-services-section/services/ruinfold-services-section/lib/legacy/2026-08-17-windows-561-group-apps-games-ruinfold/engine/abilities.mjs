// abilities — the player's active combat moves, each a tiny intra-action script over the trace.
// An ability is DATA (cost / cooldown / which cooldown cell it stamps) plus an effect resolved by
// useAbility. Like combat.attack, an ability NEVER decides what a kill MEANS — it funnels every
// hit through combat.strike (the single damage primitive) and only collects the kills strike
// reports, leaving death.mjs to read the resulting bilattice cell. The cost/cooldown bookkeeping
// is the new part: stamina is FUNCTIONAL (latest-t wins, so it actually drains) and each ability
// stamps a `cooldown-<x>` cell with the tick it becomes usable again.
//
// useAbility(root, actor, ability, targetId, tick, t, dirty)
//   ability : a key into ABILITIES ("heavy" / "cleave" / "bolt" / "second-wind")
//   targetId: the victim for the targeted abilities (ignored by cleave / second-wind)
//   tick    : the integer world tick (cooldowns are compared against it, NOT against the t-string)
//   t       : a () => string clock thunk (orders the sub-events this ability appends)
//   dirty   : a Set the caller collects touched subjects in (for the snapshot)
// -> { used:boolean, reason?, kills?:[{target, deathRule, killer}] }  (NO xp — the tick attaches it)

import changing from "#changing";
import { containedBy } from "#substrate";
import { strike, MELEE_RANGE } from "#engine/combat.mjs";
import { view, valOf, numOf, glyphOf, posOf, dist2, zoneOf } from "#engine/_world.mjs";
import { apply as applyEffect } from "#engine/effects.mjs";

const BOLT_RANGE = 14;

// ABILITIES — the data table. `cd` names the FUNCTIONAL cooldown cell the ability stamps; `cost`
// is stamina spent up front; `cooldown` is how many ticks until it may be used again. The effect
// itself is branched on by name inside useAbility (small, fixed set — no per-ability code files).
export const ABILITIES = {
  heavy: { cost: 6, cooldown: 4, cd: "cooldown-heavy" }, // melee, 2× attack-power
  cleave: { cost: 8, cooldown: 6, cd: "cooldown-cleave" }, // melee AoE, every hostile in reach
  bolt: { cost: 5, cooldown: 3, cd: "cooldown-bolt" }, // ranged (14), round(1.5× attack-power)
  "second-wind": { cost: 8, cooldown: 10, cd: "cooldown-heal" }, // self-heal 10 + 2×level
};

// up — is an entity able to act? A ghost/dead/slain status, or an alive-cell already cut to f/⊥,
// means it cannot spend an ability. (Mirrors strike's "is the target still hittable" gate, but on
// the ACTOR side.)
function isUp(thing, id) {
  const status = valOf(thing, "status", "up");
  if (status === "ghost" || status === "dead" || status === "slain") return false;
  const g = glyphOf(thing, "alive", id);
  return g !== "f" && g !== "⊥";
}

export async function useAbility(root, actor, ability, targetId, tick, t, dirty) {
  // 1. Unknown ability — nothing to do.
  const spec = ABILITIES[ability];
  if (!spec) return { used: false, reason: "unknown" };

  const a = await view(root, actor);

  // 2. The actor must be up.
  if (!isUp(a, actor)) return { used: false, reason: "down" };

  // 3. Stamina gate — must afford the cost.
  const stamina = numOf(a, "stamina", 0);
  if (stamina < spec.cost) return { used: false, reason: "stamina" };

  // 4. Cooldown gate — the cell holds the tick at which it becomes usable again.
  const ready = numOf(a, spec.cd, 0);
  if (ready > tick) return { used: false, reason: "cooldown" };

  // 5. Spend the resource and arm the cooldown BEFORE the effect, so a no-reach swing still costs.
  await changing({ root, agent: actor, subject: actor, predicate: "stamina", object: stamina - spec.cost, t: t() });
  await changing({ root, agent: actor, subject: actor, predicate: spec.cd, object: tick + spec.cooldown, t: t() });
  dirty.add(actor);

  const kills = [];

  // 6. Apply the effect.
  if (ability === "heavy" || ability === "bolt") {
    // A single targeted strike, gated on same-zone + reach (melee 3 / bolt 14, squared compare).
    const target = await view(root, targetId);
    const range = ability === "heavy" ? MELEE_RANGE : BOLT_RANGE;
    const sameZone = (await zoneOf(root, actor)) === (await zoneOf(root, targetId));
    const inReach = dist2(posOf(a), posOf(target)) <= range * range;
    if (sameZone && inReach) {
      const power = numOf(a, "attack-power", 1);
      const amount = ability === "heavy" ? 2 * power : Math.round(1.5 * power);
      const r = await strike(root, actor, targetId, amount, t, dirty);
      if (r.killed) kills.push({ target: r.target, deathRule: r.deathRule, killer: actor });
      // on-hit riders: a heavy blow STUNS briefly; a bolt leaves POISON ticking.
      else if (r.hit) await applyEffect(root, targetId, ability === "heavy" ? "stun" : "poison", ability === "heavy" ? 1 : 4, tick, t, dirty);
    }
  } else if (ability === "cleave") {
    // Melee AoE: every HOSTILE monster in the actor's zone within MELEE_RANGE, each struck for
    // attack-power. containedBy gives the ids in the place; we filter to live hostile monsters.
    const zone = await zoneOf(root, actor);
    const power = numOf(a, "attack-power", 1);
    const r2 = MELEE_RANGE * MELEE_RANGE;
    const here = await containedBy(root, zone);
    for (const id of here) {
      if (id === actor) continue;
      const m = await view(root, id);
      if (valOf(m, "kind", null) !== "monster") continue;
      if (!valOf(m, "hostile", null)) continue;
      const g = glyphOf(m, "alive", id);
      if (g === "f" || g === "⊥") continue;
      if (dist2(posOf(a), posOf(m)) > r2) continue;
      const r = await strike(root, actor, id, power, t, dirty);
      if (r.killed) kills.push({ target: r.target, deathRule: r.deathRule, killer: actor });
    }
  } else if (ability === "second-wind") {
    // Self-heal, clamped to max-health. No target, no kills.
    const level = numOf(a, "level", 1);
    const heal = 10 + 2 * level;
    const hp = numOf(a, "health", numOf(a, "max-health", 1));
    const max = numOf(a, "max-health", hp);
    await changing({ root, agent: actor, subject: actor, predicate: "health", object: Math.min(max, hp + heal), t: t() });
    dirty.add(actor);
  }

  // 7. The ability was used (even if a targeted swing whiffed on reach). Kills may be empty.
  return { used: true, kills };
}
