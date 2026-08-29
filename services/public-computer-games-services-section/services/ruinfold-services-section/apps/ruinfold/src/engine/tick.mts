// tick — one autonomous advance of the daily. Ported from legacy engine/tick.mjs's phase
// structure, collapsed to solo play and the daily's scope (no quests/vendor/party/trade/craft —
// design §7). SINGLE-WRITER DISCIPLINE preserved exactly: runTick is the only place that mutates
// the world, in one deterministic phase order, so a replay of the same (seed, intents) sequence is
// byte-identical every time — no RNG, no wall clock, anywhere in this file.
//
// Phase order: player intents -> monster AI -> resolve monster kills (+ reward payout) -> hazard
// check -> floor/damage bookkeeping -> status effects.

import type { Entity, StrikeKill, World } from "#engine/world.mts";
import { dist2 } from "#engine/world.mts";
import type { Intent } from "#engine/intents.mts";
import { spawnPlayer, portal } from "#engine/zones.mts";
import { nudge } from "#engine/movement.mts";
import { attack } from "#engine/combat.mts";
import { useAbility } from "#engine/abilities.mts";
import { pickup, drop, equip, unequip } from "#engine/items.mts";
import { aiTurn } from "#engine/ai.mts";
import { resolveMonsterKill, resolvePlayerFatal, triggerVoid } from "#engine/death.mts";
import { dropLoot } from "#engine/loot.mts";
import { levelForXp } from "#engine/progression.mts";
import { recomputeStats } from "#engine/stats.mts";
import { tickEffects, isStunned } from "#engine/effects.mts";

export interface TickResult {
  clearedBoss: boolean; // the final-floor named boss died to a player-attributed kill this tick
  playerFatal: boolean; // the player's own ending (mortal or relic-continuation) fired this tick
}

export function runTick(world: World, tick: number, intents: readonly Intent[], actorId: string): TickResult {
  const kills: StrikeKill[] = [];
  let clearedBoss = false;
  let playerFatal = false;

  const healthBefore = world.entities.get(actorId)?.health ?? null;

  // ---- Phase 1: player intents — the only writes originating outside the tick, applied here. ---
  for (const intent of intents) applyIntent(world, intent, tick, kills);

  // ---- Phase 2: every hostile monster acts on its own perception (generic AI; data-driven). -----
  const player = world.entities.get(actorId);
  if (player && player.status !== "ghost" && player.status !== "voided") {
    for (const id of world.order) {
      const m = world.entities.get(id);
      if (!m || m.kind !== "monster") continue;
      const r = aiTurn(world, id, actorId, tick);
      if (r.kill) kills.push(r.kill);
    }
  }

  // ---- Phase 3: resolve the slain onto the bilattice, then pay out a player's kills. -----------
  for (const kill of kills) {
    const target = world.entities.get(kill.target);
    if (!target) continue;

    if (target.kind === "player") {
      resolvePlayerFatal(world, target, tick);
      playerFatal = true;
      continue;
    }

    const outcome = resolveMonsterKill(world, kill, tick);
    if (kill.killer !== actorId) continue; // only a PLAYER's kills reward or count toward score

    const killerEntity = world.entities.get(actorId);
    if (!killerEntity) continue;

    const xp = target.xpValue ?? 0;
    if (xp) awardXp(world, killerEntity, xp);
    world.stats.killXp += xp;

    const { gold } = dropLoot(world, kill.target);
    if (gold) killerEntity.gold += gold;

    if (outcome.route === "slain" && kill.target === world.bossId) {
      const zone = target.zoneId ? world.zones.get(target.zoneId) : undefined;
      if (zone && zone.floorIndex === world.floorCount) clearedBoss = true;
    }
  }

  // ---- Phase 4: hazard check — a seed-placed void tile the player has walked into. --------------
  const pAfterKills = world.entities.get(actorId);
  if (pAfterKills && world.hazard && !world.hazard.triggered && pAfterKills.zoneId === world.hazard.zoneId) {
    if (dist2(pAfterKills.pos, world.hazard.pos) <= world.hazard.radius * world.hazard.radius) {
      world.hazard.triggered = true;
      triggerVoid(world, pAfterKills);
      playerFatal = true;
    }
  }

  // ---- Phase 5: damage-this-floor bookkeeping (styleScore's floorsFlawless, design §4). ---------
  const healthAfter = world.entities.get(actorId)?.health ?? null;
  if (healthBefore != null && healthAfter != null && healthAfter < healthBefore) {
    world.stats.damageThisFloor = true;
  }

  // ---- Phase 6: ongoing effects (poison/regen DoT-HoT; expiry is implicit in effects.mts). ------
  const pFinal = world.entities.get(actorId);
  if (pFinal && pFinal.status === "up") tickEffects(world, actorId, tick);
  for (const id of world.order) {
    const m = world.entities.get(id);
    if (m && m.kind === "monster" && m.status !== "slain" && m.status !== "vanished") tickEffects(world, id, tick);
  }

  world.tick = tick;
  return { clearedBoss, playerFatal };
}

// awardXp — xp is scoped to the run (design §3.2): grant it, recompute the level curve, and if
// that crossed a threshold, recompute derived stats so attack-power/max-health never drift from it.
function awardXp(world: World, player: Entity, amount: number): void {
  player.xp += amount;
  const nextLevel = levelForXp(player.xp);
  if (nextLevel !== player.level) {
    player.level = nextLevel;
    recomputeStats(world, player);
  }
}

function applyIntent(world: World, intent: Intent, tick: number, kills: StrikeKill[]): void {
  const { kind, actor } = intent;
  if (kind === "join") {
    spawnPlayer(world, actor);
    return;
  }

  const me = world.entities.get(actor);
  if (!me) return;
  if (me.status === "ghost" || me.status === "voided") return; // the run is already over for this actor

  if (kind === "move") {
    nudge(world, actor, intent.dir);
    return;
  }
  if (kind === "portal") {
    const fromZoneId = me.zoneId;
    const r = portal(world, actor, intent.dir);
    if (r.moved && r.to) {
      const fromZone = fromZoneId ? world.zones.get(fromZoneId) : undefined;
      if (fromZone && fromZone.floorIndex >= 1 && !world.stats.damageThisFloor) {
        world.stats.floorsFlawless += 1;
      }
      world.stats.damageThisFloor = false;
      const toZone = world.zones.get(r.to);
      if (toZone && toZone.floorIndex > world.stats.maxFloorReached) {
        world.stats.maxFloorReached = toZone.floorIndex;
      }
    }
    return;
  }
  if (kind === "attack") {
    const r = attack(world, actor, intent.target, tick);
    if (r.killed) kills.push({ target: r.target as string, deathRule: r.deathRule as StrikeKill["deathRule"], killer: actor });
    return;
  }
  if (kind === "ability") {
    if (isStunned(me, tick)) return;
    const r = useAbility(world, actor, intent.ability, intent.target, tick);
    for (const k of r.kills) kills.push(k);
    return;
  }
  if (kind === "pickup") {
    pickup(world, actor, intent.item);
    return;
  }
  if (kind === "drop") {
    drop(world, actor, intent.item);
    return;
  }
  if (kind === "equip") {
    equip(world, actor, intent.item);
    return;
  }
  if (kind === "unequip") {
    unequip(world, actor, intent.slot);
    return;
  }
}
