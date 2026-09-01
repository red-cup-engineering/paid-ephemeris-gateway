// death — the headline. There is no single "death": there are FIVE, routed off the four-valued
// bilattice via bilattice.mts's `deathFace(rule)`. Ported from legacy engine/death.mjs's routing
// table, split per the daily design (§3.3) into two halves that fire on different entities:
//
//   resolveMonsterKill — a MONSTER the player kills. Unchanged from legacy in shape: undead rises
//   (⊤, heal, keep fighting), construct vanishes (⊥, un-made, no loot), mortal/named/cursed settle
//   to a true f death; cursed additionally curses the killer.
//
//   resolvePlayerFatal / triggerVoid — the player's OWN ending, which the daily reframes as three
//   distinct run outcomes rather than "what happens when you die": mortal death ends the run (f);
//   the Heart of the Hollow relic, once, lets the player rise instead (⊤ — the held contradiction
//   IS the mechanic: you cheated the ending, and styleScore never lets you forget it); a seed-placed
//   void hazard un-makes the attempt entirely (⊥ — the run is not scored at all, per §3.3).

import type { World, Entity, StrikeKill } from "#engine/world.mts";
import { view } from "#engine/world.mts";
import { deathFace, glyphOf } from "#engine/bilattice.mts";
import type { DeathRule } from "#engine/bilattice.mts";
import { RELIC_ARCHETYPE } from "#engine/archetypes.mts";

export type MonsterDeathRoute = "risen" | "voided" | "slain";

export interface MonsterDeathOutcome {
  target: string;
  route: MonsterDeathRoute;
  deathRule: DeathRule;
  cursedKiller: string | null;
}

// resolveMonsterKill — route a slain monster's `alive` cell per its death-rule. Reward bookkeeping
// (xp/gold/loot for a player-attributed kill) is the tick's job; death.mts stays about the bilattice.
export function resolveMonsterKill(world: World, kill: StrikeKill, tick: number): MonsterDeathOutcome {
  const target = view(world, kill.target);
  if (!target) return { target: kill.target, route: "slain", deathRule: kill.deathRule, cursedKiller: null };

  target.alive = deathFace(kill.deathRule);

  if (kill.deathRule === "undead") {
    // RISE. alive settles to ⊤ (alive AND slain) — the contradiction is the monster's resting
    // state, not a transient one. Heal it and scar it; it keeps fighting.
    target.aliveRevives += 1;
    target.health = target.maxHealth;
    target.status = "risen";
    return { target: kill.target, route: "risen", deathRule: kill.deathRule, cursedKiller: null };
  }

  if (kill.deathRule === "construct") {
    // VANISH to ⊥. Un-made: no corpse, no loot (the tick's loot phase reads `drops`, which the
    // construct roster leaves empty, but the status/health settle here regardless).
    target.status = "vanished";
    target.health = 0;
    return { target: kill.target, route: "voided", deathRule: kill.deathRule, cursedKiller: null };
  }

  // mortal / named / cursed monster: a true, settled f death.
  target.status = "slain";
  target.health = 0;
  let cursedKiller: string | null = null;
  if (kill.deathRule === "cursed" && kill.killer) {
    curse(world, kill.killer);
    cursedKiller = kill.killer;
  }
  return { target: kill.target, route: "slain", deathRule: kill.deathRule, cursedKiller };
}

// curse — lay an irreversible lycanthropy on the slayer of a `cursed` monster. The `human` cell
// settles to ⊤ (human AND beast), a permanent held dual identity. Never retracted — once is forever.
export function curse(world: World, whoId: string): void {
  const who = view(world, whoId);
  if (!who || !who.human) return;
  if (glyphOf(who.human) === "⊤") return; // already cursed
  who.human = { pos: true, neg: true };
}

// --- the player's own ending -----------------------------------------------------------------

export type PlayerDeathResolution =
  | { outcome: "continued"; healthAfter: number }
  | { outcome: "run-ended"; reason: "mortal-death" };

// RELIC_WEAKEN_TICKS — "for the remainder of the run": any expiry far past design's RUN_TICK_CAP
// (6000) reads as permanent within a single attempt, without effects.mts needing an "infinite"
// special case.
const RELIC_WEAKEN_TICKS = 1_000_000;

// resolvePlayerFatal — the player's health has been driven to <= 0. If they are carrying the
// (unspent) Heart of the Hollow, the relic is consumed and they rise instead of ending the run —
// deathFace("undead") on the PLAYER's own alive cell, the exact mechanic legacy built for a
// skeleton, retargeted. Otherwise: a true, settled mortal death, and the run is over.
export function resolvePlayerFatal(world: World, player: Entity, tick: number): PlayerDeathResolution {
  const relicIdx = !player.relicSpent
    ? player.inventory.findIndex((id) => world.entities.get(id)?.archetypeId === RELIC_ARCHETYPE)
    : -1;

  if (relicIdx >= 0) {
    const relicId = player.inventory[relicIdx] as string;
    player.inventory.splice(relicIdx, 1);
    world.entities.delete(relicId);
    player.relicSpent = true;
    player.alive = deathFace("undead"); // ⊤ — held contradiction, played straight as the mechanic
    player.status = "risen";
    player.health = Math.max(1, Math.floor(player.maxHealth / 2));
    player.effects.weaken = tick + RELIC_WEAKEN_TICKS;
    return { outcome: "continued", healthAfter: player.health };
  }

  player.alive = deathFace("mortal"); // f — true, settled
  player.status = "ghost";
  player.form = "ghost";
  player.health = 0;
  return { outcome: "run-ended", reason: "mortal-death" };
}

// triggerVoid — the player has stepped into a seed-placed void hazard. Retract BOTH faces (⊥):
// the attempt un-happens. No corpse, no score (score.mts reads player.status === "voided").
export function triggerVoid(world: World, player: Entity): void {
  player.alive = deathFace("construct"); // ⊥
  player.status = "voided";
  player.health = 0;
}
