// world — the state shape every other engine module reads and mutates, plus the small scalar
// vocabulary (dist2, clamp, zone lookup) legacy split across `_world.mjs`/`functional.mjs`.
//
// This is a from-scratch, in-memory reimplementation of what those two files gave the rest of
// the engine, not a port of their code: legacy sat on `@561-group/tab`'s general append-only EAVT
// trace + settle/supersede machinery, an external workspace package this app does not depend on
// (zero external deps, per the task). What DOES transfer, exactly, is the observable contract the
// rest of the ported modules (combat/abilities/effects/death/ai/...) were written against:
//   - "functional" fields (health, pos, level, cooldowns, ...) are single-valued and latest-write-
//     wins by construction (they're just object properties mutated in place — there is no other
//     kind of write to race against inside one synchronous tick);
//   - the paraconsistent `alive`/`human` cells are real bilattice.mts BilatticeCell values, not
//     flattened booleans, so death.mts's five-way routing is genuine bilattice arithmetic, not a
//     switch statement pretending to be one;
//   - the engine is 100% synchronous and RNG-free — a tick is a pure function of (world, intents).

import type { BilatticeCell, DeathRule } from "#engine/bilattice.mts";
import { unknown } from "#engine/bilattice.mts";

export interface Vec2 {
  x: number;
  z: number;
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function clamp(v: number, bound: number): number {
  return Math.max(-bound, Math.min(bound, v));
}

export type EntityKind = "player" | "monster" | "item" | "hazard";
export type Status = "up" | "ghost" | "slain" | "vanished" | "risen" | "voided";
export type Form = "flesh" | "ghost" | "beast";

export interface Cooldowns {
  heavy: number;
  cleave: number;
  bolt: number;
  heal: number;
}

export type EffectName = "poison" | "regen" | "stun" | "might" | "weaken";

// EffectTable — one `effect-<name>` cell per status effect, each holding the tick it expires at
// (null = never applied). Ported semantics from legacy engine/effects.mjs: a re-apply is a clean
// supersede of the expiry, never a stack.
export type EffectTable = Record<EffectName, number | null>;

export function freshEffects(): EffectTable {
  return { poison: null, regen: null, stun: null, might: null, weaken: null };
}

export interface Equipped {
  weapon: string | null;
  armor: string | null;
  trinket: string | null;
}

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;

  // --- placement --------------------------------------------------------------------------
  zoneId: string | null;
  pos: Vec2;
  facing: number;
  homeX: number;
  homeZ: number;
  moveTargetX?: number | null; // transient click-to-move / AI-chase steering goal
  moveTargetZ?: number | null;

  // --- vitals -------------------------------------------------------------------------------
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  xp: number;
  attackPower: number;
  armor: number;
  gold: number;
  status: Status;
  form: Form;
  lastCombat: number; // tick of most recent combat action (out-of-combat regen gate)

  // --- the bilattice cells (death.mts routes these) ------------------------------------------
  alive: BilatticeCell;
  human?: BilatticeCell; // player only — lycanthropy curse (§3.3 "cursed")

  // --- monster-only data ----------------------------------------------------------------------
  deathRule?: DeathRule;
  hostile?: boolean;
  aggro?: number;
  attackRange?: number;
  xpValue?: number;
  goldValue?: number;
  drops?: string[]; // archetype ids dropped on true death
  species?: string;
  aliveRevives: number;
  respawnAt: number | null;
  respawnCooldown?: number;

  // --- combat resources -------------------------------------------------------------------
  cooldowns: Cooldowns;
  effects: EffectTable;

  // --- items / equipment ------------------------------------------------------------------
  equipped: Equipped;
  inventory: string[]; // item ids this entity carries
  archetypeId?: string; // item entities only
  carriedBy?: string | null; // item entities only: owner id, or null if on the ground

  // --- player relic state -------------------------------------------------------------------
  relicSpent?: boolean; // the Heart of the Hollow has already been consumed this run
}

export interface Zone {
  id: string;
  name: string;
  floorIndex: number; // 0 = the-gate (hub, unscored); 1..floorCount = generated floors
  bound: number;
  spawn: Vec2;
  exits: Record<string, string>; // "north" | "south" -> zoneId
}

export interface Hazard {
  id: string;
  zoneId: string;
  pos: Vec2;
  radius: number;
  triggered: boolean;
}

// RunStats — the score-relevant counters the tick accumulates as the run plays out (design §4).
// Kept on World rather than derived after the fact, because two of its inputs (kill xp attributed
// to the player, whether ANY damage landed while on the current floor) are only observable in the
// moment they happen, not reconstructible from the final settled state alone.
export interface RunStats {
  maxFloorReached: number; // deepest floorIndex the player has ever stood on (0..floorCount)
  floorsFlawless: number; // floors EXITED (via portal) having taken zero damage while on them
  damageThisFloor: boolean; // has the player taken any damage since arriving at the current floor?
  killXp: number; // sum of xp-value over every monster whose kill is attributed to the player
}

export function freshStats(): RunStats {
  return { maxFloorReached: 0, floorsFlawless: 0, damageThisFloor: false, killXp: 0 };
}

export interface World {
  seed: number;
  floorCount: number;
  zones: Map<string, Zone>;
  entities: Map<string, Entity>;
  order: string[]; // insertion order, for deterministic iteration over movers
  tick: number;
  bossId: string;
  relicItemId: string | null; // the one Heart-of-the-Hollow instance placed this daily, if any
  hazard: Hazard | null;
  stats: RunStats;
}

// StrikeKill — the shape every kill-producing system (combat/abilities/ai) reports up to the tick
// loop, which hands the whole batch to death.mts to route onto the bilattice.
export interface StrikeKill {
  target: string;
  deathRule: DeathRule;
  killer: string;
}

export function view(world: World, id: string): Entity | undefined {
  return world.entities.get(id);
}

export function zoneOf(world: World, id: string): Zone | undefined {
  const e = world.entities.get(id);
  if (!e || !e.zoneId) return undefined;
  return world.zones.get(e.zoneId);
}

export function movers(world: World): Entity[] {
  const out: Entity[] = [];
  for (const id of world.order) {
    const e = world.entities.get(id);
    if (e && e.kind === "monster") out.push(e);
  }
  return out;
}

export function addEntity(world: World, e: Entity): void {
  world.entities.set(e.id, e);
  world.order.push(e.id);
}

// freshEntity — the shared field defaults every entity factory (player/monster/item/hazard)
// starts from, so no factory forgets a field the rest of the engine reads unconditionally.
export function freshEntity(id: string, kind: EntityKind, name: string): Entity {
  return {
    id,
    kind,
    name,
    zoneId: null,
    pos: { x: 0, z: 0 },
    facing: 0,
    homeX: 0,
    homeZ: 0,
    health: 1,
    maxHealth: 1,
    stamina: 0,
    maxStamina: 0,
    level: 1,
    xp: 0,
    attackPower: 0,
    armor: 0,
    gold: 0,
    status: "up",
    form: "flesh",
    lastCombat: -Infinity,
    alive: unknown(),
    aliveRevives: 0,
    respawnAt: null,
    cooldowns: { heavy: 0, cleave: 0, bolt: 0, heal: 0 },
    effects: freshEffects(),
    equipped: { weapon: null, armor: null, trinket: null },
    inventory: [],
  };
}
