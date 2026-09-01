// dungeon — the seeded daily generator. NEW work, not a port (design §1.2): legacy's own
// server/scripts/seed.mjs is hand-authored, fine for an MMO's one persistent world, wrong for a daily
// that needs a whole FAMILY of dungeons parameterized by one seed. mulberry32 (prng.mts) is used
// ONLY in this module — never by tick.mts/ai.mts/combat.mts, which stay pure functions of state.
//
// Floor chain shape (design §1.3): `the-gate` (hub, unscored, always identical) then a LINEAR
// chain of floorCount = 4 + (seed-derived 0..3) generated floors — 4 to 7, no branching.
//
// Invariant the generator always holds, deliberately: every daily places at least one monster of
// each of `mortal`/`undead`/`construct`/`cursed` on a floor before the last, and exactly one
// `named` boss on the final floor. The signature death mechanic must never be a coin-flip absence.

import type { DeathRule } from "#engine/bilattice.mts";
import { asserted } from "#engine/bilattice.mts";
import { ARCHETYPES, RELIC_ARCHETYPE, archetype } from "#engine/archetypes.mts";
import { intBetween, mulberry32, pick, shuffled } from "#engine/prng.mts";
import type { Vec2, World } from "#engine/world.mts";
import { addEntity, freshEntity, freshStats } from "#engine/world.mts";

export interface MonsterSpec {
  species: string;
  deathRule: DeathRule;
  baseHealth: number;
  baseAttack: number;
  xpValue: number;
  goldValue: number;
  aggro: number;
  attackRange?: number;
  drops: string[];
}

// MONSTER_ROSTER — the four death-rules a monster can carry. Placement/species are seed-derived;
// presence of every rule is not (see the invariant above).
export const MONSTER_ROSTER: MonsterSpec[] = [
  { species: "goblin", deathRule: "mortal", baseHealth: 18, baseAttack: 4, xpValue: 8, goldValue: 3, aggro: 10, drops: ["goblin-ear"] },
  { species: "skeleton", deathRule: "undead", baseHealth: 22, baseAttack: 5, xpValue: 12, goldValue: 4, aggro: 10, drops: ["bone-shard"] },
  { species: "wraith", deathRule: "construct", baseHealth: 16, baseAttack: 6, xpValue: 14, goldValue: 0, aggro: 12, drops: [] },
  { species: "moon-stalker", deathRule: "cursed", baseHealth: 24, baseAttack: 7, xpValue: 18, goldValue: 6, aggro: 14, drops: ["ectoplasm"] },
];

export const BOSS_SPEC: MonsterSpec = {
  species: "keep-warden",
  deathRule: "named",
  baseHealth: 80,
  baseAttack: 10,
  xpValue: 60,
  goldValue: 40,
  aggro: 20,
  drops: ["bone-cleaver", "crown-of-rust"],
};

const REQUIRED_RULES: DeathRule[] = ["mortal", "undead", "construct", "cursed"];
const RULE_TO_SPEC: Record<string, MonsterSpec> = Object.fromEntries(MONSTER_ROSTER.map((s) => [s.deathRule, s]));

export function buildDaily(seed: number): World {
  const rng = mulberry32(seed);
  const floorCount = 4 + intBetween(rng, 0, 3); // 4..7, design §1.3

  const world: World = {
    seed,
    floorCount,
    zones: new Map(),
    entities: new Map(),
    order: [],
    tick: 0,
    bossId: "",
    relicItemId: null,
    hazard: null,
    stats: freshStats(),
  };

  // ---- the-gate: fixed hub, always identical regardless of seed — orientation, not depth. -------
  world.zones.set("the-gate", { id: "the-gate", name: "The Gate", floorIndex: 0, bound: 20, spawn: { x: 0, z: 10 }, exits: { north: "floor-1" } });

  const floorIds: string[] = [];
  for (let f = 1; f <= floorCount; f++) floorIds.push(`floor-${f}`);
  for (let f = 1; f <= floorCount; f++) {
    const fid = `floor-${f}`;
    const exits: Record<string, string> = { south: f === 1 ? "the-gate" : `floor-${f - 1}` };
    if (f < floorCount) exits.north = `floor-${f + 1}`;
    world.zones.set(fid, { id: fid, name: `Floor ${f}`, floorIndex: f, bound: 24 + f * 2, spawn: { x: 0, z: -(6 + f * 2) }, exits });
  }

  let monsterCounter = 0;
  const placeMonster = (floorId: string, spec: MonsterSpec, idOverride?: string): string => {
    const zone = world.zones.get(floorId)!;
    const id = idOverride ?? `${spec.species}-${monsterCounter++}`;
    const e = freshEntity(id, "monster", spec.species);
    const pos: Vec2 = { x: intBetween(rng, -zone.bound + 2, zone.bound - 2), z: intBetween(rng, -zone.bound + 2, zone.bound - 2) };
    e.zoneId = floorId;
    e.pos = pos;
    e.homeX = pos.x;
    e.homeZ = pos.z;
    e.health = spec.baseHealth;
    e.maxHealth = spec.baseHealth;
    e.attackPower = spec.baseAttack;
    e.hostile = true;
    e.aggro = spec.aggro;
    e.attackRange = spec.attackRange;
    e.xpValue = spec.xpValue;
    e.goldValue = spec.goldValue;
    e.drops = spec.drops.slice();
    e.species = spec.species;
    e.deathRule = spec.deathRule;
    e.alive = asserted();
    addEntity(world, e);
    return id;
  };

  const nonLastFloors = floorIds.slice(0, -1);
  if (nonLastFloors.length === 0) throw new Error("dungeon: floorCount must exceed 1 to seat the presence invariant");

  // ---- guarantee: one of each required death-rule, seated on a floor before the last. -----------
  const seats = shuffled(rng, nonLastFloors);
  for (let i = 0; i < REQUIRED_RULES.length; i++) {
    placeMonster(seats[i % seats.length] as string, RULE_TO_SPEC[REQUIRED_RULES[i] as string] as MonsterSpec);
  }

  // ---- scatter extra roster monsters per non-last floor (1-3 each). ------------------------------
  for (const floorId of nonLastFloors) {
    const extra = intBetween(rng, 1, 3);
    for (let i = 0; i < extra; i++) placeMonster(floorId, pick(rng, MONSTER_ROSTER));
  }

  // ---- exactly one named boss, on the final floor. -----------------------------------------------
  const bossFloor = floorIds[floorIds.length - 1] as string;
  world.bossId = placeMonster(bossFloor, BOSS_SPEC, `${BOSS_SPEC.species}-boss`);

  // ---- loot scatter: 1-2 non-relic items per floor. ------------------------------------------------
  const lootable = Object.keys(ARCHETYPES).filter((aid) => aid !== RELIC_ARCHETYPE);
  let itemCounter = 0;
  for (const floorId of floorIds) {
    const zone = world.zones.get(floorId)!;
    const n = intBetween(rng, 1, 2);
    for (let i = 0; i < n; i++) {
      const archId = pick(rng, lootable);
      placeGroundItem(world, floorId, archId, `ground-item-${itemCounter++}`, {
        x: intBetween(rng, -zone.bound + 2, zone.bound - 2),
        z: intBetween(rng, -zone.bound + 2, zone.bound - 2),
      });
    }
  }

  // ---- the relic: exactly one Heart of the Hollow, a random floor before the last. ----------------
  const relicFloor = pick(rng, nonLastFloors) as string;
  const relicZone = world.zones.get(relicFloor)!;
  const relicId = "heart-of-the-hollow-relic";
  placeGroundItem(world, relicFloor, RELIC_ARCHETYPE, relicId, {
    x: intBetween(rng, -relicZone.bound + 2, relicZone.bound - 2),
    z: intBetween(rng, -relicZone.bound + 2, relicZone.bound - 2),
  });
  world.relicItemId = relicId;

  // ---- the hazard: exactly one void tile, a random floor before the last. -------------------------
  const hazardFloor = pick(rng, nonLastFloors) as string;
  const hazardZone = world.zones.get(hazardFloor)!;
  world.hazard = {
    id: "void-hazard",
    zoneId: hazardFloor,
    pos: { x: intBetween(rng, -hazardZone.bound + 2, hazardZone.bound - 2), z: intBetween(rng, -hazardZone.bound + 2, hazardZone.bound - 2) },
    radius: 2,
    triggered: false,
  };

  return world;
}

function placeGroundItem(world: World, zoneId: string, archId: string, id: string, pos: Vec2): void {
  const a = archetype(archId);
  const e = freshEntity(id, "item", a?.name ?? archId);
  e.archetypeId = archId;
  e.zoneId = zoneId;
  e.pos = pos;
  e.carriedBy = null;
  addEntity(world, e);
}
