// ticking — the autonomous advance. Every tick the world changes itself: players integrate their
// intents, NPCs act on theirs, corruption creeps outward, the dead rot or rise. Replaying the
// trace reproduces it (the world DOES something; nobody hand-drives it). This is tab's `ticking`
// for a continuous 3D, many-actor world.

import { TICK_MS, MOVE, COMBAT, KIND } from "../../shared/constants.mjs";
import { all, players, near, remove, append, get } from "./store.mjs";
import { terrainHeight, clampToWorld, dangerAt, within, dist2 } from "./spacetime.mjs";
import { tryAttack, heal, corrupt } from "./combat.mjs";
import { stepField, sampleField } from "./field.mjs"; // [field]
import { repopulate, maybeResonance, bloomResonances } from "./thermo.mjs"; // [tide]
import { TIDE } from "../../shared/constants.mjs"; // [tide]
import { stepAltars } from "./claims.mjs"; // [claims] CLAIM ALTARS — erupt / decay / pay dividends

const DT = TICK_MS / 1000;
const AGGRO = 18; // NPC notices a player within this radius
const CORRUPT_RADIUS = 10; // a fresh corpse this close to an Anomaly may rise
const REGEN_PER_TICK = 0.6; // player vitality regained per tick when out of combat
const REGEN_DELAY_MS = 4000;

// NPC_DURABLE_MOVE_TICKS — closes the 2026-09-02 cold-red-gate incident: bumpMoved() used to file
// a durable "moved" row on essentially every 15Hz tick for every wandering/hunting NPC (~61 of
// them), growing WORLD_LOG to 8.3GB in ~36h. NPC positions are now durably journaled at most once
// per this many ticks (60s); live position/`.dirty` still update every tick (see bumpMoved below),
// so real-time network sync — which reads those fields directly, never the journal — is unaffected.
// Player movement (stepPlayer) is untouched: real player actions stay journaled every tick.
const NPC_DURABLE_MOVE_TICKS = Math.round(60000 / TICK_MS);

export function tick(world) {
  world.tick++;
  const ps = players(world);

  for (const e of all(world)) {
    if (e.kind === KIND.player) stepPlayer(world, e);
    else stepNpc(world, e, ps);
  }

  stepField(world.field, world); // [field] diffuse the void-tension before reading it for corruption
  spreadCorruption(world);
  reapCorpses(world);
  stepAltars(world); // [claims] CLAIM ALTARS: raise eruptions for ⊤ claims, decay cleared ones, pay sanctuary dividends

  // [tide] THE SETTLING TIDE: φ-paced ecology regrows wildlife; Bragg resonances rarely bloom.
  if (world.tick % TIDE.repopulateEvery === 0) repopulate(world); // φ-multiplicative regrowth, capped
  maybeResonance(world); // a transient a+bφ pickup, only on Fibonacci-aligned ticks
  bloomResonances(world); // any node a player has stepped onto blooms into a marks burst (event queued)
}

// --- players: integrate WASD intent + mouse yaw, follow terrain, regen, swing -----------------
function stepPlayer(world, e) {
  if (e.state === "dead") return;
  const inp = e.input ?? { f: 0, s: 0, y: e.yaw, a: 0 };
  e.yaw = Number.isFinite(inp.y) ? inp.y : e.yaw;

  // local move axes rotated into world by yaw (forward = -z when yaw 0, screen-into-the-world)
  const sin = Math.sin(e.yaw), cos = Math.cos(e.yaw);
  const fwdX = -sin * inp.f, fwdZ = -cos * inp.f;
  const strX = cos * inp.s, strZ = -sin * inp.s;
  let dx = fwdX + strX, dz = fwdZ + strZ;
  const len = Math.hypot(dx, dz);
  if (len > 0) {
    dx /= len; dz /= len;
    e.x += dx * MOVE.walk * DT;
    e.z += dz * MOVE.walk * DT;
    clampToWorld(e);
    e.dirty = true;
  }
  e.y = terrainHeight(e.x, e.z);

  if (inp.a) {
    const target = nearestEnemy(world, e, COMBAT.attackRange);
    const out = tryAttack(world, e.id, target?.id ?? null);
    if (out === "slain" && target) maybeMarkForCorruption(world, target);
  }

  // out-of-combat regen
  if (Date.now() - (e.lastHurtAt ?? 0) > REGEN_DELAY_MS && e.hp < e.maxHp) {
    heal(world, e, REGEN_PER_TICK);
  }
  if (e.x !== e._lx || e.z !== e._lz || e.yaw !== e._ly) {
    append(world, { e: e.id, a: "moved", v: { x: round2(e.x), y: round2(e.y), z: round2(e.z), yaw: round3(e.yaw) } });
    e._lx = e.x; e._lz = e.z; e._ly = e.yaw;
  }
}

// --- NPCs: critters wander, brigands & anomalies hunt the nearest player ----------------------
function stepNpc(world, e, ps) {
  if (e.state === "dead") return; // corpses don't act (until reaped or raised)
  if (e.kind === KIND.cairn) return; // [marks] a Cairn stands still — it neither hunts nor wanders
  if (e.kind === KIND.resonance) return; // [tide] a Bragg resonance is immobile — it stands and waits to bloom
  if (e.kind === KIND.altar) return; // [claims] a CLAIM ALTAR stands still — it neither hunts nor wanders
  if (e.boundUntil && world.tick < e.boundUntil) return; // [powers] BIND (necessitate): rooted — no move

  // Keepers are peaceful by their nature: they never hunt, only amble the heart (handled below).
  if (e.kind !== KIND.keeper && (e.hostile || e.kind === KIND.anomaly)) {
    const prey = nearestPlayer(ps, e, AGGRO);
    if (prey) {
      e.intends = "hunt";
      moveToward(e, prey, MOVE.walk * 0.7);
      if (within(e, prey, COMBAT.attackRange)) {
        const out = tryAttack(world, e.id, prey.id);
        if (out === "hit" || out === "slain") prey.lastHurtAt = Date.now();
      }
      bumpMoved(world, e);
      return;
    }
  }
  // wander: pick a heading, amble; anomalies drift slowly outward into higher grades
  if (world.tick >= (e.wanderUntil ?? 0)) {
    e.wanderHeading = Math.random() * Math.PI * 2;
    e.wanderUntil = world.tick + 15 + Math.floor(Math.random() * 40);
  }
  const sp = (e.kind === KIND.critter || e.kind === KIND.keeper ? 0.35 : 0.5) * MOVE.walk;
  e.x += Math.cos(e.wanderHeading ?? 0) * sp * DT;
  e.z += Math.sin(e.wanderHeading ?? 0) * sp * DT;
  clampToWorld(e);
  e.y = terrainHeight(e.x, e.z);
  e.yaw = e.wanderHeading ?? e.yaw;
  bumpMoved(world, e);
}

function moveToward(e, p, speed) {
  const dx = p.x - e.x, dz = p.z - e.z;
  const d = Math.hypot(dx, dz) || 1;
  e.x += (dx / d) * speed * DT;
  e.z += (dz / d) * speed * DT;
  e.y = terrainHeight(e.x, e.z);
  e.yaw = Math.atan2(-dx, -dz);
  e.dirty = true;
}

// --- corruption: the ⊤ spread. Fresh corpses near an Anomaly rise Corrupted -------------------
function maybeMarkForCorruption(world, corpse) {
  corpse._corruptCheck = world.tick + 2; // a beat after death, see if the void claims it
}

function spreadCorruption(world) {
  const anomalies = all(world).filter((e) => e.kind === KIND.anomaly && e.state === "anomaly");
  if (anomalies.length === 0) return;
  for (const c of all(world)) {
    if (!c.killed || c.raised || c.kind === KIND.anomaly) continue;
    if (c.corpseUntil && world.tick > c.corpseUntil) continue;
    for (const a of anomalies) {
      if (dist2(c, a) <= CORRUPT_RADIUS * CORRUPT_RADIUS) {
        // [field] corruption takes where the void-tension has POOLED; the settled heart still resists
        const p = 0.05 + 0.04 * dangerAt(c.x, c.z) + 0.45 * sampleField(world.field, c.x, c.z);
        if (Math.random() < p) corrupt(world, c);
        break;
      }
    }
  }
}

function reapCorpses(world) {
  for (const e of all(world)) {
    if (e.state === "dead" && e.corpseUntil && world.tick > e.corpseUntil) remove(world, e.id);
  }
}

// --- target selection -------------------------------------------------------------------------
function nearestEnemy(world, e, radius) {
  let best = null, bd = radius * radius;
  for (const o of near(world, e, radius)) {
    if (o.id === e.id || o.state === "dead") continue;
    if (o.kind === KIND.keeper) continue; // Keepers are never a valid combat target — peaceful, always
    if (o.kind === KIND.cairn) continue; // [marks] a Cairn is a standing marker — never a valid target
    if (o.kind === KIND.resonance) continue; // [tide] a Bragg resonance is peaceful — never a valid target
    if (o.kind === KIND.altar) continue; // [claims] a CLAIM ALTAR is peaceful — never a valid attack target
    const enemy = e.kind === KIND.player ? (o.hostile || o.kind === KIND.anomaly) : o.kind === KIND.player;
    if (!enemy) continue;
    const d = dist2(e, o);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function nearestPlayer(ps, e, radius) {
  let best = null, bd = radius * radius;
  for (const p of ps) {
    if (p.state === "dead") continue;
    const d = dist2(e, p);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function bumpMoved(world, e) {
  e.dirty = true; // real-time sync (session.mjs reads .dirty + live x/y/z) — every tick, unthrottled
  const moved = e.x !== e._lx || e.z !== e._lz;
  if (moved) { e._lx = e.x; e._lz = e.z; }
  // Durable write: coarse cadence only (NPC_DURABLE_MOVE_TICKS, see its own comment above) — this
  // is the actual disk-flood fix; the change-detection above stays so a stationary NPC never files
  // a redundant identical row even once the cadence elapses.
  if (moved && world.tick - (e._lastDurableMoveTick ?? -Infinity) >= NPC_DURABLE_MOVE_TICKS) {
    append(world, { e: e.id, a: "moved", v: { x: round2(e.x), y: round2(e.y), z: round2(e.z), yaw: round3(e.yaw) } });
    e._lastDurableMoveTick = world.tick;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
