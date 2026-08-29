// store — the world as an append-only EAVT trace (the TIME axis: voidmath's aperiodic corner,
// the one regime that extends the base with new facts and never retracts). Each intra-action is
// a row {e, a, v, t}: entity, attribute, value, tick. Entities are the FOLD of the trace — a fast
// in-memory projection we keep alongside the journal, so reads are O(1) but history stays total.
// (Modeled on tab's _substrate / being: the world IS the log; memory is its settled shadow.)
//
// The journal optionally streams to <root>.jsonl so a crashed world replays from disk; for tests
// and ephemeral sessions it stays in memory. Either way `append` is the only writer.

import { assertRow } from "@561-group/computer/typed-resource-catalog/eavt";
import eavtAppend from "@561-group/computer/posix-holography/eavt-append";
import readText from "@561-group/computer/posix-holography/read-text";
import { vital, reading, BOTTOM } from "./value.mjs";
import { terrainHeight, clampToWorld } from "./spacetime.mjs";
import { createField } from "./field.mjs"; // [field]
import { mint } from "../../shared/items.mjs"; // [economy] the procedural item catalog

// `onAppend` (optional) — a second, additive sink for every row `append()` writes, alongside the
// unchanged `logPath` file write. It exists for the GCS bucket persistence backend (log-store.mjs):
// a per-row *network* write would stall the 15Hz tick loop, so the bucket store gives us a cheap
// synchronous buffering callback here instead and flushes the batch itself on its own schedule.
// Local-file behavior (`logPath` alone) is completely unchanged by this parameter's existence.
export function createWorld({ logPath = null, onAppend = null } = {}) {
  return {
    tick: 0, // τ — monotone world time
    nextId: 1,
    entities: new Map(),
    journal: [], // the EAVT trace (kept bounded; see TRACE_CAP)
    logPath,
    onAppend,
    events: [], // transient per-tick outbound events (combat, chat) drained by the net layer
    field: createField(), // [field] the Laplacian void-tension field over the world
  };
}

const TRACE_CAP = 4000; // keep the in-memory trace bounded; the disk log (if any) is the full one

// append — record one intra-action onto the trace (and disk). The aperiodic step: history grows.
// The row is an EXACT {e,a,v,t} (computer's eavt contract, asserted here so a malformed row never
// reaches the trace); the disk side is computer's eavt-append — the canonical, append-only G-Set
// writer (it serialises the row itself, so we no longer hand-roll a non-canonical JSON.stringify).
export function append(world, row) {
  const r = assertRow({ e: row.e, a: row.a, v: row.v, t: world.tick });
  world.journal.push(r);
  if (world.journal.length > TRACE_CAP) world.journal.splice(0, world.journal.length - TRACE_CAP);
  if (world.logPath) { try { eavtAppend(world.logPath, r); } catch {} }
  if (world.onAppend) { try { world.onAppend(r); } catch {} }
  return r;
}

// spawn — bring an entity into being: place it, seed its life-evidence, settle its first verdict.
export function spawn(world, { kind, name, x, z, yaw = 0, maxHp = 1, hostile = false }) {
  const id = `${kind}-${world.nextId++}`;
  const y = terrainHeight(x, z);
  const e = {
    id, kind, name: name ?? kind,
    x, y, z, yaw,
    vx: 0, vz: 0, grounded: true,
    hp: maxHp, maxHp, killed: false, raised: false,
    marks: 0, // [marks] life-evidence count this entity carries (conserved; transfers on kill)
    inventory: [], // [economy] items this entity holds (loot drops here; trade moves rows between)
    charge: BOTTOM, state: "unknown",
    hostile, target: null, intends: "wander", lastAttackAt: 0, wanderUntil: 0,
    bornTick: world.tick, diedTick: 0, corpseUntil: 0,
    dirty: true,
  };
  clampToWorld(e);
  settleEntity(world, e); // ⊥ → t
  world.entities.set(id, e);
  // name/maxHp/hostile ride the row (not just kind/x/z) so `replay()` can rebuild a creature that
  // has never taken a hit (no "vitality" row yet) with its REAL vitality cap and combat behavior,
  // not the placeholder hp:1/hostile:false a bare kind-guess would produce. Old logs written before
  // this field existed simply fall back to that placeholder (replay() below), unchanged from before.
  append(world, { e: id, a: "spawned", v: { kind, name: e.name, x: e.x, z: e.z, maxHp: e.maxHp, hostile: e.hostile } });
  return e;
}

// settleEntity — recompute an entity's bilattice verdict from its current life-evidence, via the
// kernel (value.vital -> joinKnowledge). Called whenever evidence changes (damage, heal, raise).
// This is the only place `charge`/`state` are written — the cache stays honest.
export function settleEntity(world, e) {
  e.charge = vital({ hp: e.hp, killed: e.killed, raised: e.raised }, world.tick);
  const wasState = e.state;
  e.state = reading(e.charge).state;
  if (e.state !== wasState) {
    e.dirty = true;
    append(world, { e: e.id, a: "settled", v: e.state });
  }
  return e.state;
}

export function remove(world, id) {
  if (world.entities.delete(id)) append(world, { e: id, a: "left", v: null });
}

// [economy] mintItem — make a fresh catalog item with a world-unique id (the monotone nextId keeps
// two dropped copies distinct), and FILE its coming-into-being onto the trace. Returns the item or
// null for an unknown catalog id. The item is not yet held by anyone (the caller files held-by).
export function mintItem(world, catalogId) {
  const item = mint(catalogId, world.nextId++);
  if (!item) return null;
  append(world, { e: item.id, a: "minted", v: { catalog: catalogId } });
  return item;
}

export const get = (world, id) => world.entities.get(id);
export const all = (world) => [...world.entities.values()];
export const players = (world) => all(world).filter((e) => e.kind === "player");

// near — entities within radius r of a point (server-side interest query; small worlds, linear).
export function near(world, p, r) {
  const r2 = r * r, out = [];
  for (const e of world.entities.values()) {
    const dx = e.x - p.x, dz = e.z - p.z;
    if (dx * dx + dz * dz <= r2) out.push(e);
  }
  return out;
}

// replay — rebuild a world's entities from a saved trace (crash recovery / determinism tests).
// Folds spawn/move/evidence rows back into live records; verdicts re-settle from the kernel.
//
// nextId restoration: `spawn`/`mintItem` both consume `world.nextId` for their id's numeric
// suffix (`kind-N` for entities, `item:catalog#N` for items). A naive replay that leaves
// `nextId` at its fresh default of 1 would hand a FUTURE spawn/mint an id already used by a
// replayed entity — `world.entities.set(id, e)` would silently overwrite the older record. We
// scan every row's `e` for a trailing `-N` or `#N` and track the max, then set `nextId` one past
// it, so ids minted after a restore never collide with ids restored from the trace.
export function replay(rows, opts = {}) {
  const world = createWorld(opts);
  let maxSeq = 0;
  for (const r of rows) {
    world.tick = Math.max(world.tick, r.t | 0);
    const seq = trailingSeq(r.e);
    if (seq !== null && seq > maxSeq) maxSeq = seq;

    if (r.a === "spawned") {
      const id = r.e;
      const [kind] = id.split("-");
      // v.name/v.maxHp/v.hostile only exist on rows written after this fix (see spawn() above);
      // an older log falls back to the same placeholder shape replay() always used.
      const maxHp = Number.isFinite(r.v?.maxHp) ? r.v.maxHp : 1;
      const e = {
        id, kind, name: typeof r.v?.name === "string" ? r.v.name : kind,
        x: r.v.x, y: terrainHeight(r.v.x, r.v.z), z: r.v.z, yaw: 0,
        vx: 0, vz: 0, grounded: true, hp: maxHp, maxHp, killed: false, raised: false,
        marks: 0, inventory: [], // [economy] — never restored; see module note below
        charge: BOTTOM, state: "unknown", hostile: !!r.v?.hostile, target: null, intends: "wander",
        lastAttackAt: 0, wanderUntil: 0, bornTick: r.t, diedTick: 0, corpseUntil: 0, dirty: true,
      };
      world.entities.set(id, e);
    }
    const e = world.entities.get(r.e);
    if (!e) continue;
    if (r.a === "moved") { e.x = r.v.x; e.y = r.v.y; e.z = r.v.z; e.yaw = r.v.yaw; }
    else if (r.a === "vitality") { e.hp = r.v.hp; e.maxHp = r.v.maxHp ?? e.maxHp; }
    else if (r.a === "killed") { e.killed = true; e.hp = 0; }
    else if (r.a === "raised") {
      // mirror combat.corrupt()'s mutation exactly (kind/hostile/name/maxHp all change on a
      // raise, not just hp) — otherwise a replayed Anomaly still reads as its old peaceable kind.
      // corrupt() itself guards on `t.killed` being true before it will ever run (see combat.mjs),
      // so a "raised" row is proof the entity was killed even on the one path that never files
      // its own "killed" row (seed.mjs's Hollow Reiver mutates `.killed` directly, in-memory, to
      // build the world's seed Anomaly) — without this, that entity would fold to "alive" (only
      // the positive face ever gets asserted) instead of the ⊤ it actually is.
      e.killed = true;
      e.raised = true;
      e.kind = "anomaly";
      e.hostile = true;
      if (!e.name.startsWith("Corrupted ")) e.name = `Corrupted ${e.name}`;
      e.hp = r.v?.hp ?? e.maxHp;
      e.maxHp = e.hp;
    }
    else if (r.a === "left") { world.entities.delete(r.e); continue; }
    settleEntity(world, e);
  }
  world.nextId = maxSeq + 1;
  return world;
}

// trailingSeq — the numeric suffix of an eavt row's subject id, however it's shaped:
// `kind-N` (entities, store.spawn) or `item:catalog#N` (items, store.mintItem). Null if neither
// pattern matches (e.g. the altar-claim substrate's synthetic "altar-claim" subject).
function trailingSeq(id) {
  if (typeof id !== "string") return null;
  const m = /[-#](\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

// rowsFromLog — read an append-only EAVT log back into raw {e,a,v,t} rows, via computer's canonical
// file read (posix-holography owns every filesystem touch) and the eavt row contract (assertRow). The
// bytes were written by eavt-append; identity of any row is jcs(row)->sha256 (the canonical-JSON), so a
// row round-trips byte-for-byte. Returns the rows in trace order; a malformed/blank line is skipped.
export function rowsFromLog(logPath) {
  let text;
  try { text = readText(logPath); } catch { return []; }
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row;
    try { row = assertRow(JSON.parse(line)); } catch { continue; }
    rows.push(row);
  }
  return rows;
}

// replayFromLog — crash-recovery convenience: read the on-disk EAVT trace (computer's canonical read +
// eavt row contract) and fold it through the domain `replay`. The disk plumbing is computer's; the
// spawn/move/evidence fold is the game's.
export function replayFromLog(logPath, opts = {}) {
  return replay(rowsFromLog(logPath), { ...opts, logPath });
}
