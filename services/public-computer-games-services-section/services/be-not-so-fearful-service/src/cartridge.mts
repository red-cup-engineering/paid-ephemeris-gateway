// cartridge — the whole run, wired into @red-cup-engineering/cartridge's real `Cartridge<State,
// Intent>` contract (see that package's `src/replay.mjs`/`src/fixtures/toy-engine.mjs`: the only
// required method is `applyIntent`; `createEngine` builds the seeded initial state; `replay` is
// `defaultReplay` verbatim, exactly as the toy-engine fixture demonstrates). This is the module a
// `manifest.replayVerifier` points at.
//
// STATE SHAPE, and why: everything in `GameState` is plain JSON-safe data (strings/numbers/booleans/
// plain objects/arrays) — no abrash `Map`-based world is EVER stored in state, because
// `intent-log.mjs`'s `canonicalStringify` (which `hashState`/replay-verification hash over) only
// understands JSON-safe values; a `Map` would silently serialize as `{}` and two DIFFERENT worlds
// could hash identically, which would make replay verification a lie. Instead `state.dynamicRows`
// holds the append-only {e,a,v,t} evidence (anomaly positions/heat/hunting/triggered, all small,
// game-authored rows) as a plain array; the abrash `world`/`grid` Map is rebuilt FRESH inside
// `applyIntent` every call via `dynamicWorldOf()` (see below — a fresh fold of just `dynamicRows`,
// deliberately never merged with the static geometry world; see that function's own comment for why
// there is nothing to merge) and thrown away at the end of the call — never persisted. `level.rows`
// themselves (the large, static per-tier
// geometry — thousands of cells) are NOT stored in state at all: `generateLevel(seed, tier)` is pure,
// so they're regenerated (memoized per-process in `levelCache`, a pure-function cache that cannot
// affect determinism) rather than replicated into every state snapshot.
//
// PERFORMANCE: naively calling abrash's own `worldFromRows` on `[...level.rows, ...dynamicRows]`
// every tick is quietly quadratic — confirmed directly by reading `federation.mjs`'s `admitLog`,
// which does `new Map(world)` (a full copy of every subject the world holds so far) on EVERY row it
// admits, and `worldFromRows` calls `admitLog` once per row. Since level geometry files ONE distinct
// subject per voxel (1000-3000+ for a tier), replaying that through `worldFromRows` every tick is
// O(rows²) of Map copying — this is what actually caused this file's own test suite to hang past a
// two-minute timeout during development, not a hypothetical. `federate` avoids that specific
// per-row-copy shape (it builds its output by iterating the subject union once), but even a single
// federate-with-the-static-world PER TICK still touches every static subject every tick, which is
// still wasted work when the static geometry never changes at all after generation. The actual fix,
// still built entirely from abrash's real, unmodified exports: the static per-tier geometry is
// folded into a world AND READ INTO A GRID exactly ONCE per (seed,tier) (`staticGridFor`, memoized
// beside `levelCache`), and every tick only ever folds the SMALL `dynamicWorldOf(dynamicRows)` —
// bounded by anomaly count × ticks-since-spawn, never by level size — because nothing dynamic ever
// touches a voxel subject (see `staticGridFor`'s own comment), so there is nothing to merge the two
// worlds FOR: collision/LOS reads the cached static grid, anomaly/economy reads the small dynamic
// world, and neither ever needs the other's subjects. `dynamicRows` itself still grows unboundedly
// over a long run (Hum's heat tracking appends nearly every tick) — that remains a real, disclosed
// debt (the same honest category durante's own DESIGN.md admits for its own per-tick row growth).
//
// V1 SCOPE CUTS, stated plainly (not silently narrowed): anomalies are NOT combat targets in v1 — no
// weapon-vs-anomaly damage/health-fold system (demon.mjs's wound-fold template is the right template
// FOR a damage system, and is exactly what BNSF does NOT need for evasion-based SCP-style anomalies).
// Rocket jumping is a direct, immediate self-blast (`altFire`, on a cooldown) rather than a simulated
// travelling rocket projectile with splash damage against anomalies — the movement-kernel mechanic
// (bunnyhop, rocket-jump verticality) is real and tested (movement.test.mts); a full projectile/damage
// system is Later, not silently pretended to exist.

import { worldFromRows, grid as abrashGrid } from "@red-cup-engineering/abrash/world";
import { castRay } from "@red-cup-engineering/abrash/raycaster";
import {
  stepMovement, initialMovementState, applyRocketKnockback, speedOf as playerSpeedOf,
} from "./movement.mts";
import type { MovementState } from "./movement.mts";
import { generateLevel } from "./level-gen.mts";
import type { GeneratedLevel, AnomalyKind } from "./level-gen.mts";
import * as unwitnessed from "./anomalies/unwitnessed.mts";
import * as hum from "./anomalies/hum.mts";
import * as warden from "./anomalies/warden.mts";
import * as toll from "./anomalies/toll.mts";
import {
  initialEconomy, pickUp as bankPickUp, extract as bankExtract, die as economyDie, tickCap as economyTickCap,
} from "./economy.mts";
import type { EconomyState, LootItem } from "./economy.mts";
import { passContestedWhereFor } from "./contested-gate.mts";
import { defaultReplay } from "@red-cup-engineering/cartridge/replay";

export type Row = { e: string; a: string; v: string; t: number };

export interface TickIntent {
  kind: "tick";
  forward?: number;
  strafe?: number;
  turn?: number;
  jump?: boolean;
  fire?: boolean;
  altFire?: boolean;
  interact?: boolean;
  sprint?: boolean;
  crouch?: boolean;
}

export interface PickupIntent {
  kind: "pickup";
  lootId: string;
}

export interface ExtractIntent {
  kind: "extract";
}

export interface TransitionIntent {
  kind: "transition";
}

export type GameIntent = TickIntent | PickupIntent | ExtractIntent | TransitionIntent;

export interface GameEvent {
  kind: string;
  [key: string]: unknown;
}

export interface GameState {
  seed: string;
  configId: string;
  tick: number;
  tier: 1 | 2 | 3;
  player: MovementState;
  dynamicRows: Row[];
  tollLosBreakTicks: Record<string, number>;
  rocketCooldownTicks: number;
  economy: EconomyState;
}

const ROCKET_COOLDOWN_TICKS = 90; // 1.5s at 60Hz
// Exported (not just module-private) so the Toll spawn-distance tuning proof
// (src/anomalies/toll-escape.test.mts) checks contact against the REAL constant this file uses,
// never a hand-copied duplicate that could drift.
export const CONTACT_RADIUS = 0.6;
const PICKUP_RADIUS = 1.2;
const EXTRACTION_RADIUS = 1.2;
const TRANSITION_RADIUS = 1.2;
const MAX_TICKS = 60 * 60 * 20; // a 20-minute hard cap — a tick-cap safety net, well above the 5-15min design target
const WARDEN_SPEED = 0.13;

// generateLevel is pure — memoizing it per process cannot change any output, only avoid re-walking
// the same rejection-sampling/BFS passes on every tick. Never read cross-request in a way that
// matters to correctness: two identical (seed,tier) calls give byte-identical rows with or without
// the cache (proven by level-gen.test.mts's own determinism test).
const levelCache = new Map<string, GeneratedLevel>();
function levelFor(seed: string, tier: 1 | 2 | 3): GeneratedLevel {
  const cacheKey = `${seed}:${tier}`;
  let level = levelCache.get(cacheKey);
  if (!level) {
    level = generateLevel(seed, tier);
    levelCache.set(cacheKey, level);
  }
  return level;
}

// staticGridFor — the level's geometry folded into an abrash world, and read into an abrash GRID,
// exactly ONCE per (seed,tier), never rebuilt per tick (see the file header's PERFORMANCE note).
// Sound to cache for the same "pure function of (seed,tier)" reason `levelCache` is, AND because
// nothing in this game ever appends a `solid`/geometry row at runtime (anomalies only ever predicate
// their OWN subjects — `at`/`heat`/`hunting`/`triggered`/`rect` — never a voxel's `solid` cell; The
// Contested's reflip sites are pre-seeded ⊤ at GENERATION, not mutated at runtime — see
// level-gen.mts's header), so the static grid is truly immutable for the whole life of a tier.
const staticGridCache = new Map<string, ReturnType<typeof abrashGrid>>();
function staticGridFor(seed: string, tier: 1 | 2 | 3): ReturnType<typeof abrashGrid> {
  const cacheKey = `${seed}:${tier}`;
  let grid = staticGridCache.get(cacheKey);
  if (!grid) {
    grid = abrashGrid(worldFromRows(levelFor(seed, tier).rows));
    staticGridCache.set(cacheKey, grid);
  }
  return grid;
}

/** dynamicWorldOf(dynamicRows) — a fresh fold of ONLY the small, anomaly/door-authored evidence.
 *  Deliberately never federated with the static geometry world (see `staticGridFor`'s own comment:
 *  nothing dynamic ever touches a voxel subject, so there is nothing to federate FOR — every anomaly
 *  read below only ever queries its own subject, never a `voxel:x,z` one). This keeps every per-tick
 *  fold bounded by anomaly count, never by level size. */
function dynamicWorldOf(dynamicRows: Row[]): unknown {
  return worldFromRows(dynamicRows);
}

/** pruneDynamicRows(rows) — keeps `dynamicRows` bounded across an arbitrarily long run instead of
 *  growing one row per active anomaly EVERY tick forever. Sound because EVERY predicate BNSF's own
 *  anomaly modules ever file into `dynamicRows` is read back either through a FUNCTIONAL fold
 *  (`at`/`speed`/`heat`/`hunting`/`rect` — each module's own `settleOpts({functional: ...})` already
 *  means only the latest-t row per (subject,predicate) is ever read) or through a bare PRESENCE scan
 *  (toll.mts's `triggered` latch — `isTriggered` only asks "does at least one row exist", which the
 *  single latest row alone still satisfies just as well as keeping every historical one). So keeping
 *  at most ONE row per (subject,predicate) — the highest-`t` one, later array position wins a tie —
 *  is observably IDENTICAL to keeping the full history for every read this codebase ever performs,
 *  while bounding `dynamicRows`'s size by (anomaly count × predicates per anomaly), never by tick
 *  count. This is a property of THIS GAME's own read patterns, not a general abrash guarantee — a
 *  future consumer that wanted to count wound-style evidence (demon.mjs's own `woundsOf` pattern)
 *  over `dynamicRows` would need to exempt that predicate from pruning. */
function pruneDynamicRows(rows: Row[]): Row[] {
  const latest = new Map<string, Row>();
  for (const row of rows) {
    const key = `${row.e}|${row.a}`;
    const existing = latest.get(key);
    if (!existing || row.t >= existing.t) latest.set(key, row);
  }
  return [...latest.values()];
}

function spawnAnomaliesFor(level: GeneratedLevel): Row[] {
  const rows: Row[] = [];
  for (const slot of level.anomalySlots) {
    switch (slot.kind) {
      case "unwitnessed":
        rows.push(...unwitnessed.spawn(slot.id, slot.x, slot.z));
        break;
      case "hum":
        rows.push(...hum.spawn(slot.id, slot.x, slot.z));
        break;
      case "warden": {
        const rect = { x: slot.x - 3, z: slot.z - 3, w: 6, h: 6 };
        rows.push(...warden.spawn(slot.id, rect, { x: slot.x, z: slot.z }));
        break;
      }
      case "toll":
        rows.push(...toll.spawn(slot.id, slot.x, slot.z));
        break;
    }
  }
  return rows;
}

/** hasLineOfSight(grid, from, to, maxDist) — a plain position-to-position occlusion check (no FOV
 *  cone — an anomaly checking whether it can currently see the player looks in every direction, only
 *  a WALL should block it), reusing abrash's own real `castRay`. */
function hasLineOfSight(grid: unknown, from: { x: number; z: number }, to: { x: number; z: number }, maxDist: number): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) return true;
  if (dist > maxDist) return false;
  const hit = castRay(grid as Parameters<typeof castRay>[0], from.x, from.z, dx / dist, dz / dist, dist);
  return !(hit.hit && hit.dist < dist - 1e-6);
}

export function createEngine(seed: string, configId?: string): GameState {
  const level = levelFor(seed, 1);
  return {
    seed,
    configId: configId ?? "default",
    tick: 0,
    tier: 1,
    player: initialMovementState({ x: level.entry.x + 0.5, z: level.entry.z + 0.5, angle: 0 }),
    dynamicRows: spawnAnomaliesFor(level),
    tollLosBreakTicks: {},
    rocketCooldownTicks: 0,
    economy: initialEconomy(),
  };
}

/** isCurrentlyDangerous — whether contact with this anomaly instance, in its CURRENT folded state,
 *  should end the run. Unwitnessed: always (contact means it just closed the distance on you).
 *  Hum: only while hunting. Warden: only while hostile. Toll: whenever triggered (unconditional). */
function isCurrentlyDangerous(world: unknown, kind: AnomalyKind, id: string): boolean {
  switch (kind) {
    case "unwitnessed":
      return true;
    case "hum":
      return hum.isHunting(world, id);
    case "warden":
      return warden.isHostile(world, id);
    case "toll":
      return toll.isTriggered(world, id);
  }
}

function processTick(state: GameState, intent: TickIntent): { state: GameState; events: GameEvent[] } {
  const level = levelFor(state.seed, state.tier);
  const grid = staticGridFor(state.seed, state.tier);
  const world = dynamicWorldOf(state.dynamicRows);
  const passContestedWhere = passContestedWhereFor(level.contestedSites, state.tick);
  const t = state.tick + 1;
  const events: GameEvent[] = [];

  let player = state.player;
  let rocketCooldownTicks = Math.max(0, state.rocketCooldownTicks - 1);
  if (intent.altFire && rocketCooldownTicks === 0) {
    // the blast center sits BELOW the player's feet (a manual "aim down, fire" rocket jump — no
    // travelling-projectile simulation in v1, see the file header's disclosed scope cut), deliberately
    // NOT clamped to zHeight>=0: applyRocketKnockback's own falloff is a real 3D distance from this
    // point, and a same-position (dist3≈0) blast is defined to have NO effect (see movement.mts) — a
    // grounded player (zHeight=0) needs a genuinely offset blast center to get a real vertical impulse,
    // exactly like aiming at the floor beneath you rather than at your own feet.
    player = applyRocketKnockback(player, { x: player.x, z: player.z, zHeight: player.zHeight - 0.75 });
    rocketCooldownTicks = ROCKET_COOLDOWN_TICKS;
    events.push({ kind: "rocket-jump", speed: playerSpeedOf(player) });
  }
  player = stepMovement(
    player,
    { forward: intent.forward, strafe: intent.strafe, turn: intent.turn, jump: intent.jump },
    grid,
    { passContestedWhere },
  );

  const newRows: Row[] = [];
  const tollLosBreakTicks: Record<string, number> = {};
  for (const slot of level.anomalySlots) {
    switch (slot.kind) {
      case "unwitnessed":
        newRows.push(...unwitnessed.decideStep(world, slot.id, player, grid, t));
        break;
      case "hum":
        newRows.push(...hum.decideStep(world, slot.id, player, {
          forward: intent.forward, strafe: intent.strafe, fire: intent.fire, sprint: intent.sprint, crouch: intent.crouch,
        }, t));
        break;
      case "warden":
        newRows.push(...warden.decideStep(world, slot.id, player, { x: slot.x, z: slot.z }, WARDEN_SPEED, t));
        break;
      case "toll": {
        const pos = toll.positionOf(world, slot.id);
        const hadLos = pos ? hasLineOfSight(grid, pos, player, 40) : false;
        const priorBreak = state.tollLosBreakTicks[slot.id] ?? 0;
        const nextBreak = hadLos ? 0 : priorBreak + 1;
        tollLosBreakTicks[slot.id] = nextBreak;
        newRows.push(...toll.decideStep(world, slot.id, player, nextBreak, t));
        break;
      }
    }
  }

  const dynamicRows = newRows.length ? pruneDynamicRows([...state.dynamicRows, ...newRows]) : state.dynamicRows;
  const worldAfter = newRows.length ? dynamicWorldOf(dynamicRows) : world;

  // contact death: any currently-dangerous anomaly within CONTACT_RADIUS of the player's NEW position.
  let economy = state.economy;
  if (!economy.ended) {
    for (const slot of level.anomalySlots) {
      const posFn = slot.kind === "unwitnessed" ? unwitnessed.positionOf : slot.kind === "hum" ? hum.positionOf : slot.kind === "warden" ? warden.positionOf : toll.positionOf;
      const pos = posFn(worldAfter, slot.id);
      if (!pos) continue;
      const dist = Math.hypot(pos.x - player.x, pos.z - player.z);
      if (dist <= CONTACT_RADIUS && isCurrentlyDangerous(worldAfter, slot.kind, slot.id)) {
        economy = economyDie(economy, `${slot.kind}-caught-you`, state.tier, t);
        events.push({ kind: "died", cause: `${slot.kind}-caught-you`, tier: state.tier, tick: t });
        break;
      }
    }
  }
  if (!economy.ended && t >= MAX_TICKS) {
    economy = economyTickCap(economy, t);
    events.push({ kind: "tick-cap", tick: t });
  }

  return {
    state: { ...state, tick: t, player, dynamicRows, tollLosBreakTicks, rocketCooldownTicks, economy },
    events,
  };
}

function processPickup(state: GameState, intent: PickupIntent): { state: GameState; events: GameEvent[] } {
  const level = levelFor(state.seed, state.tier);
  const slot = level.lootSlots.find((s) => s.id === intent.lootId);
  if (!slot) return { state, events: [{ kind: "pickup-failed", reason: "unknown-loot-id" }] };
  const dist = Math.hypot(slot.x - state.player.x, slot.z - state.player.z);
  if (dist > PICKUP_RADIUS) return { state, events: [{ kind: "pickup-failed", reason: "too-far" }] };
  const alreadyHeld = state.economy.carrying.some((i) => i.id === slot.id) || state.economy.banked.some((i) => i.id === slot.id);
  if (alreadyHeld) return { state, events: [{ kind: "pickup-failed", reason: "already-held" }] };

  const item: LootItem = { id: slot.id, rarity: slot.rarity, tier: state.tier, ...(slot.wardedBy ? { wardedBy: slot.wardedBy } : {}) };
  const economy = bankPickUp(state.economy, item);
  let dynamicRows = state.dynamicRows;
  const events: GameEvent[] = [{ kind: "picked-up", lootId: slot.id, rarity: slot.rarity }];
  if (slot.wardedBy === "toll") {
    // Paired by ID convention (`${seed}:tier${tier}:anomaly-toll`, filed once per tier alongside
    // the ONE toll-warded loot slot — see level-gen.mts), NOT by position: the TOLL BALANCE FIX
    // deliberately spawns the guardian a real distance from its loot (level-gen.mts's
    // TOLL_SPAWN_MIN_DIST/MAX_DIST), so an `a.x === slot.x && a.z === slot.z` position match would
    // never find it again and the trigger would silently never fire — a real regression this ID
    // lookup exists to avoid, not a hypothetical.
    const tollSlot = level.anomalySlots.find((a) => a.kind === "toll" && a.id.endsWith(":anomaly-toll"));
    if (tollSlot) {
      dynamicRows = pruneDynamicRows([...dynamicRows, toll.trigger(tollSlot.id, state.tick)]);
      events.push({ kind: "toll-triggered", anomalyId: tollSlot.id });
    }
  }
  return { state: { ...state, dynamicRows, economy }, events };
}

function processExtract(state: GameState): { state: GameState; events: GameEvent[] } {
  const level = levelFor(state.seed, state.tier);
  const nearBeacon = level.extractionBeacons.some((b) => Math.hypot(b.x - state.player.x, b.z - state.player.z) <= EXTRACTION_RADIUS);
  if (!nearBeacon) return { state, events: [{ kind: "extract-failed", reason: "not-at-beacon" }] };
  const economy = bankExtract(state.economy, state.tier, state.tick);
  return { state: { ...state, economy }, events: [{ kind: "extracted", tier: state.tier, tick: state.tick, score: economy.banked.reduce((s, i) => s + i.rarity.length, 0) }] };
}

function processTransition(state: GameState): { state: GameState; events: GameEvent[] } {
  const level = levelFor(state.seed, state.tier);
  if (!level.transition || state.tier >= 3) return { state, events: [{ kind: "transition-failed", reason: "no-deeper-tier" }] };
  const dist = Math.hypot(level.transition.x - state.player.x, level.transition.z - state.player.z);
  if (dist > TRANSITION_RADIUS) return { state, events: [{ kind: "transition-failed", reason: "too-far" }] };
  const nextTier = (state.tier + 1) as 1 | 2 | 3;
  const nextLevel = levelFor(state.seed, nextTier);
  return {
    state: {
      ...state,
      tier: nextTier,
      player: initialMovementState({ x: nextLevel.entry.x + 0.5, z: nextLevel.entry.z + 0.5, angle: 0 }),
      dynamicRows: spawnAnomaliesFor(nextLevel),
      tollLosBreakTicks: {},
    },
    events: [{ kind: "descended", tier: nextTier }],
  };
}

/** applyIntent — the ONE required Cartridge method (per @red-cup-engineering/cartridge's real
 *  contract). A run that has already ended (economy.ended) ignores every further intent as a
 *  harmless no-op rather than throwing — a log that keeps ticking after death is a normal artifact
 *  of real play (the browser face doesn't stop sending input the instant the death screen renders),
 *  not an illegal move a replay verifier should reject. */
export function applyIntent(state: GameState, intent: GameIntent): { state: GameState; events: GameEvent[] } {
  if (state.economy.ended) {
    // a finished run ignores everything: a `tick` still advances the clock (so a log that just keeps
    // ticking after death stays a normal, harmless artifact of real play), anything else is a no-op.
    return { state: intent.kind === "tick" ? { ...state, tick: state.tick + 1 } : state, events: [] };
  }
  switch (intent.kind) {
    case "tick":
      return processTick(state, intent);
    case "pickup":
      return processPickup(state, intent);
    case "extract":
      return processExtract(state);
    case "transition":
      return processTransition(state);
    default: {
      const exhaustive: never = intent;
      throw new TypeError(`applyIntent: unknown intent kind ${(exhaustive as { kind: string }).kind}`);
    }
  }
}

export function serialize(state: GameState): GameState {
  return state;
}

export function deserialize(data: unknown): GameState {
  const d = data as GameState;
  if (typeof d !== "object" || d === null || typeof d.seed !== "string" || typeof d.tick !== "number") {
    throw new TypeError("deserialize: malformed BNSF GameState data");
  }
  return d;
}

/** replay(seed, intents, configId) — delegates verbatim to cartridge's own `defaultReplay`, exactly
 *  as the package's own toy-engine fixture does (`src/fixtures/toy-engine.mjs`'s `replay`). This is
 *  the function `manifest.mts`'s `replayVerifier` module path resolves to, via `createVerifier`. */
export function replay(seed: string, intents: GameIntent[], configId?: string) {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

export const bnsfCartridge = { createEngine, applyIntent, replay, serialize, deserialize };

export { levelFor };
