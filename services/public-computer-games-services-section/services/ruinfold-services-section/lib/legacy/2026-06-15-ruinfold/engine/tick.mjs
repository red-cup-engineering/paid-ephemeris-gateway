// tick — one autonomous advance of Ruinfold. Between this tick and the next: queued player intents
// land (move / attack / abilities / pickup / equip / quest / vendor / chat), every hostile thing
// acts, the slain are resolved onto the bilattice (rise / die / vanish / curse), a player's kills
// pay out (xp + gold + loot + bounty progress), the timed dead respawn, ghosts that reached a
// shrine re-embody, and everything out of combat regenerates. Ruinfold writes its OWN tick (tab's
// farstone ticking is hardcoded to a harbor); it reuses only the substrate operations beneath.
//
// SINGLE-WRITER DISCIPLINE: the HTTP layer never writes the world — it only QUEUES intents. ALL
// appends happen here, in one tick, in a deterministic order, so the append-only log is never
// raced. Given the same trace + intents, a tick is a pure function of state (no RNG): replay is exact.
//
// runTick(root, tick, intents, players) -> { dirty, chats }   (players: a mutable Set of player ids)

import changing from "#changing";
import { subjects, containedBy } from "#substrate";
import { clock } from "#engine/functional.mjs";
import { view, posOf, dist2, numOf, valOf, zoneOf } from "#engine/_world.mjs";
import { spawnPlayer, portal } from "#engine/zones.mjs";
import { nudge, setGoal } from "#engine/movement.mjs";
import { attack } from "#engine/combat.mjs";
import { pickup, drop, equip, unequip } from "#engine/items.mjs";
import { useAbility } from "#engine/abilities.mjs";
import { aiTurn } from "#engine/ai.mjs";
import { resolveDeaths, resolveRespawns, embody } from "#engine/death.mjs";
import { awardXp } from "#engine/progression.mjs";
import { dropLoot } from "#engine/loot.mjs";
import { regenTick } from "#engine/regen.mjs";
import { tickEffects } from "#engine/effects.mjs";
import { tickEvents } from "#engine/events.mjs";
import { practiceSkill, skillFor } from "#engine/skills.mjs";
import { craft } from "#engine/crafting.mjs";
import * as quests from "#engine/quests.mjs";
import * as vendor from "#engine/vendor.mjs";
import * as party from "#engine/party.mjs";
import * as ptrade from "#engine/playertrade.mjs";

const DIMENSION = "ruinfold";
const SHRINE_RANGE = 4;
const SHRINE_R2 = SHRINE_RANGE * SHRINE_RANGE;
const NPC_RANGE = 5; // how close you must stand to talk to / trade with an NPC
const NPC_R2 = NPC_RANGE * NPC_RANGE;
const GATE = "the-gate";

async function moversOf(root) {
  const out = [];
  for (const s of await subjects(root)) {
    if (valOf(await view(root, s), "mover") === "tick") out.push(s);
  }
  return out;
}

export async function runTick(root, tick, intents = [], players = new Set()) {
  let seq = 0;
  const t = () => clock(tick, seq++);
  const dirty = new Set();
  const kills = []; // { target, deathRule, killer } collected from every fatal blow this tick
  const chats = []; // { from, zone, text } to broadcast after the tick

  // ---- Phase 1: player intents (the only writes originating outside the tick are applied HERE).
  for (const intent of intents) await applyIntent(root, intent, players, tick, t, dirty, kills, chats);

  // ---- Phase 2: every hostile mover acts on its own perception (generic AI; behaviour is data).
  const movers = await moversOf(root);
  const playerIds = [...players];
  for (const m of movers) {
    if (players.has(m)) continue; // players move by intent, not AI
    const r = await aiTurn(root, m, playerIds, t, dirty);
    if (r.kill) kills.push(r.kill);
  }

  // ---- Phase 3: resolve the slain onto the bilattice (rise / die / vanish / curse).
  if (kills.length) await resolveDeaths(root, kills, t, dirty, { tick });

  // ---- Phase 4: pay out a player's kills — xp, gold, loot on the corpse, and bounty progress.
  for (const k of kills) {
    if (!players.has(k.killer)) continue; // only a player's kills reward (monster-on-player gives nothing)
    const victim = await view(root, k.target);
    const xp = numOf(victim, "xp-value", 0);
    if (xp) await awardXp(root, k.killer, xp, t, dirty);
    const { gold } = await dropLoot(root, k.target, t, dirty); // spawn item drops; gold credited directly
    if (gold) await creditGold(root, k.killer, gold, t, dirty);
    const species = valOf(victim, "species", null);
    if (species) await quests.onKill(root, k.killer, species, t, dirty);
  }

  // ---- Phase 5: timed respawns — slain monsters / vanished constructs whose cooldown has come.
  await resolveRespawns(root, tick, t, dirty);

  // ---- Phase 6: a ghost standing on a shrine returns to flesh (the Project Gorgon shrine-walk).
  for (const pid of players) await maybeEmbodyAtShrine(root, pid, t, dirty);

  // ---- Phase 7: ongoing effects (DoT/HoT/expiry) then out-of-combat regeneration.
  for (const pid of players) {
    await tickEffects(root, pid, tick, t, dirty);
    await regenTick(root, pid, tick, t, dirty);
  }
  for (const m of movers) {
    if (players.has(m)) continue;
    await tickEffects(root, m, tick, t, dirty);
    await regenTick(root, m, tick, t, dirty);
  }

  // ---- Phase 8: the world acts on itself — rotate the active world-event — then the heartbeat.
  await tickEvents(root, tick, t, dirty);
  await changing({ root, subject: DIMENSION, predicate: "tick", object: tick, t: t() });
  dirty.add(DIMENSION);

  return { dirty, chats };
}

async function creditGold(root, who, amount, t, dirty) {
  const have = numOf(await view(root, who), "gold", 0);
  await changing({ root, subject: who, predicate: "gold", object: have + amount, t: t() });
  dirty.add(who);
}

// nearNpc — the actor must stand in the npc's zone, within NPC_RANGE, to talk/trade with it.
async function nearNpc(root, actor, npcId) {
  if (!npcId) return false;
  if ((await zoneOf(root, actor)) !== (await zoneOf(root, npcId))) return false;
  return dist2(posOf(await view(root, actor)), posOf(await view(root, npcId))) <= NPC_R2;
}

async function applyIntent(root, intent, players, tick, t, dirty, kills, chats) {
  const { kind, actor } = intent;
  if (!actor) return;

  if (kind === "join") {
    await spawnPlayer(root, actor, t, dirty);
    players.add(actor);
    return;
  }

  const me = await view(root, actor);
  const isGhost = valOf(me, "status", "up") === "ghost";

  // Always-allowed (even as a ghost): speak, wander, and choose to respawn.
  if (kind === "say") {
    const text = String(intent.text ?? "").slice(0, 200);
    if (text) chats.push({ from: actor, zone: await zoneOf(root, actor), text });
    return;
  }
  if (kind === "move") {
    if (intent.dir) await nudge(root, actor, intent.dir, t, dirty);
    else if (intent.x != null && intent.z != null) await setGoal(root, actor, intent.x, intent.z, t, dirty);
    return;
  }
  if (kind === "respawn") {
    await changing({ root, subject: actor, predicate: "located-in", object: GATE, t: t() });
    await embody(root, actor, t, dirty);
    return;
  }

  if (isGhost) return; // everything below needs a living body

  if (kind === "attack") {
    const r = await attack(root, actor, intent.target, t, dirty);
    if (r.hit) await practiceSkill(root, actor, skillFor("melee"), "success", t, dirty); // skill-by-use
    if (r.killed) kills.push({ target: intent.target, deathRule: r.deathRule, killer: actor });
    return;
  }
  if (kind === "ability") {
    const r = await useAbility(root, actor, intent.ability, intent.target ?? null, tick, t, dirty);
    if (r.used) {
      const sk = skillFor(intent.ability);
      if (sk) await practiceSkill(root, actor, sk, "success", t, dirty); // the ability levels its skill
    }
    if (r.kills) for (const k of r.kills) kills.push(k);
    return;
  }
  if (kind === "portal") return void (await portal(root, actor, intent.dir, t, dirty));
  if (kind === "pickup") return void (await pickup(root, actor, intent.item, t, dirty));
  if (kind === "drop") return void (await drop(root, actor, intent.item, t, dirty));
  if (kind === "equip") return void (await equip(root, actor, intent.item, t, dirty));
  if (kind === "unequip") return void (await unequip(root, actor, intent.slot, t, dirty));
  if (kind === "craft") return void (await craft(root, actor, intent.recipe, t, dirty));
  if (kind === "party-create") return void (await party.create(root, actor, t, dirty));
  if (kind === "party-join") return void (await party.join(root, actor, intent.party, t, dirty));
  if (kind === "party-leave") return void (await party.leave(root, actor, t, dirty));
  // player-to-player trade — open requires standing by the other player; the session does the rest
  if (kind === "trade-open") return void ((await nearNpc(root, actor, intent.target)) && (await ptrade.open(root, actor, intent.target, t, dirty)));
  if (kind === "trade-offer") return void (await ptrade.setOffer(root, actor, { items: intent.items ?? [], gold: intent.gold ?? 0 }, t, dirty));
  if (kind === "trade-confirm") return void (await ptrade.confirm(root, actor, t, dirty));
  if (kind === "trade-cancel") return void (await ptrade.cancel(root, actor, t, dirty));

  // NPC interactions require standing next to the right NPC.
  if (kind === "accept" && (await nearNpc(root, actor, intent.npc))) return void (await quests.accept(root, actor, intent.npc, t, dirty));
  if (kind === "turnin" && (await nearNpc(root, actor, intent.npc))) return void (await quests.turnIn(root, actor, intent.npc, t, dirty));
  if (kind === "buy" && (await nearNpc(root, actor, intent.npc))) return void (await vendor.buy(root, actor, intent.npc, intent.archetype, t, dirty));
  if (kind === "sell" && (await nearNpc(root, actor, intent.npc))) return void (await vendor.sell(root, actor, intent.item, t, dirty));
}

// maybeEmbodyAtShrine — a ghost player within SHRINE_RANGE of any shrine in its zone returns to
// flesh where it stands. The shrine is the gentle re-entry; the death window's "respawn" is the
// hard reset to the gate. Both run through death.embody so the alive-cell folds clean to t again.
async function maybeEmbodyAtShrine(root, playerId, t, dirty) {
  const me = await view(root, playerId);
  if (valOf(me, "status", "up") !== "ghost") return;
  const zone = await zoneOf(root, playerId);
  if (!zone) return;
  const here = posOf(me);
  for (const s of await containedBy(root, zone)) {
    const thing = await view(root, s);
    if (valOf(thing, "kind") !== "shrine") continue;
    if (dist2(here, posOf(thing)) <= SHRINE_R2) {
      await embody(root, playerId, t, dirty);
      return;
    }
  }
}
