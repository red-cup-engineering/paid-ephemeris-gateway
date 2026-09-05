// level-gen — seeded backrooms-grade level generation over abrash's real voxel-trace world.
//
// Authored with the SAME primitives durante's arena.mjs already proves work: `predicate(cellKey(x,z),
// "solid", "wall", t)` files a wall, `deny(...)` files the converse (carved/open). The whole bounded
// rectangle starts fully solid (every cell gets an explicit `predicate` row) and rooms/corridors are
// carved by filing `deny` rows over that — an UNLISTED cell would read as ⊥ fog (passable, per
// world.mjs's `solidityAt`), which is wrong for a level that must have real, enclosing walls, so every
// cell in bounds gets EXPLICIT evidence one way or the other. No unlisted cell.
//
// SEED STREAM DISCIPLINE (see rng.mts's header, updated to match this file's real behavior): one
// `makeRng` call per depth tier (`${seed}:tier${n}`), then that single Rng instance is threaded through
// every stage of that tier's generation in sequence — room placement, corridor carving, pre-seeded
// contested walls, extraction beacons, anomaly placement, loot placement — never restarted mid-tier.
// Restarting per stage would risk two related (but not independent) namespaced seeds echoing each
// other's draws; one continuous stream sidesteps the whole question.
//
// Rejection-sampled rooms, skewed 70% toward long "hallway" rooms (aspect 4:1–8:1) and 30% toward small
// square rooms, near-identical repeated dimensions are the point (machine-stamped rooms read as
// wrongness, not a generator bug) so no extra dimension-jitter knob is bolted on beyond the size ranges
// themselves. Rooms connect via a minimum-spanning-tree of corridors plus a tunable chance of extra loop
// edges (so the level is not a pure tree — a loop is an escape route, a tree is a trap). Corridors are
// 80% one voxel wide (uncomfortably narrow) and 20% two wide (thoroughfares).
//
// Extraction beacons use their OWN predicate (`extraction`), not overloaded onto `solid` — one early
// (reachable without full clearance) and one deep, both solvability-checked by construction (BFS from
// the entry over the carved-cell graph; see the file's own `bfsDistances` and the test suite that runs
// this generator across hundreds of seeds per tier asserting every beacon stays reachable).
//
// Anomaly and loot placement is biased AWAY from the entry room and TOWARD dead ends (carved cells with
// at most one carved neighbor) and greater BFS depth from entry — "further and lonelier" is the whole
// bias, expressed as a simple composite score, not a second geometry pass.

import { predicate, deny, cellKey } from "@red-cup-engineering/abrash/world";
import { makeRng, type Rng } from "./rng.mts";

export type Row = { e: string; a: string; v: string; t: number };

export interface RoomRect {
  x: number;
  z: number;
  w: number;
  h: number;
  cx: number; // integer center, used as the corridor-graph node position
  cz: number;
}

export type AnomalyKind = "unwitnessed" | "hum" | "warden" | "toll";

export interface AnomalySlot {
  id: string;
  kind: AnomalyKind;
  x: number;
  z: number;
}

export type LootRarity = "common" | "rare" | "valuable";

export interface LootSlot {
  id: string;
  x: number;
  z: number;
  rarity: LootRarity;
  wardedBy?: "toll";
}

export interface ExtractionBeacon {
  id: string;
  x: number;
  z: number;
  depth: "early" | "deep";
}

export interface ContestedSite {
  id: string;
  x: number;
  z: number;
}

export interface GeneratedLevel {
  seed: string;
  tier: 1 | 2 | 3;
  width: number;
  height: number;
  rows: Row[];
  entry: { x: number; z: number };
  rooms: RoomRect[];
  extractionBeacons: ExtractionBeacon[];
  anomalySlots: AnomalySlot[];
  lootSlots: LootSlot[];
  contestedSites: ContestedSite[];
  transition: { x: number; z: number } | null; // the descend-to-next-tier voxel; null on tier 3
}

const TIER_DIMS: Record<1 | 2 | 3, { width: number; height: number; rooms: number }> = {
  1: { width: 34, height: 34, rooms: 9 },
  2: { width: 44, height: 44, rooms: 13 },
  3: { width: 54, height: 54, rooms: 17 },
};

const EXTRA_LOOP_CHANCE = 0.35;
const ANOMALOUS_WALL_CHANCE = 0.03; // ~2-4% of interior walls pre-seeded ⊤ per the design
const ROOM_ATTEMPTS_PER_ROOM = 40;
const ROOM_MARGIN = 1; // cells kept solid between two rooms so they never touch directly

function key(x: number, z: number): string {
  return `${x},${z}`;
}

/** One rejection-sampled room, skewed 70% toward a long "hallway" room (aspect 4:1-8:1, orientation
 *  random) and 30% toward a small square room. */
function sampleRoomDims(rng: Rng): { w: number; h: number } {
  if (rng.chance(0.7)) {
    const long = rng.int(8, 14);
    const short = rng.int(2, 3);
    return rng.chance(0.5) ? { w: long, h: short } : { w: short, h: long };
  }
  const side = rng.int(3, 5);
  return { w: side, h: side };
}

function overlapsWithMargin(a: { x: number; z: number; w: number; h: number }, b: RoomRect, margin: number): boolean {
  return (
    a.x - margin < b.x + b.w &&
    a.x + a.w + margin > b.x &&
    a.z - margin < b.z + b.h &&
    a.z + a.h + margin > b.z
  );
}

function placeRooms(rng: Rng, width: number, height: number, roomCount: number): RoomRect[] {
  const rooms: RoomRect[] = [];
  const attempts = roomCount * ROOM_ATTEMPTS_PER_ROOM;
  for (let i = 0; i < attempts && rooms.length < roomCount; i++) {
    const { w, h } = sampleRoomDims(rng);
    const maxX = width - w - 1;
    const maxZ = height - h - 1;
    if (maxX < 1 || maxZ < 1) continue;
    const x = rng.int(1, maxX);
    const z = rng.int(1, maxZ);
    const candidate = { x, z, w, h };
    if (rooms.some((r) => overlapsWithMargin(candidate, r, ROOM_MARGIN))) continue;
    rooms.push({ x, z, w, h, cx: x + (w >> 1), cz: z + (h >> 1) });
  }
  return rooms;
}

/** Prim's-style MST over room centers (Manhattan distance — the corridors are axis-aligned anyway),
 *  plus a tunable chance of extra loop edges from each room to its nearest not-yet-connected-by-MST
 *  neighbor, so the level is a connected graph with cycles, not a bare tree. */
function connectRooms(rng: Rng, rooms: RoomRect[]): [number, number][] {
  if (rooms.length <= 1) return [];
  const dist = (i: number, j: number) => Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cz - rooms[j].cz);
  const inTree = new Set<number>([0]);
  const edges: [number, number][] = [];
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    let bestDist = Infinity;
    for (const i of inTree) {
      for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(i, j);
        if (d < bestDist) {
          bestDist = d;
          best = [i, j];
        }
      }
    }
    if (!best) break;
    edges.push(best);
    inTree.add(best[1]);
  }
  // extra loop edges: for each room, maybe connect it to its nearest neighbor not already an edge.
  const edgeKey = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);
  const existing = new Set(edges.map(([i, j]) => edgeKey(i, j)));
  for (let i = 0; i < rooms.length; i++) {
    if (!rng.chance(EXTRA_LOOP_CHANCE)) continue;
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 0; j < rooms.length; j++) {
      if (j === i || existing.has(edgeKey(i, j))) continue;
      const d = dist(i, j);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = j;
      }
    }
    if (nearest >= 0) {
      edges.push([i, nearest]);
      existing.add(edgeKey(i, nearest));
    }
  }
  return edges;
}

function carveRect(carved: Set<string>, x: number, z: number, w: number, h: number, width: number, height: number): void {
  for (let cz = z; cz < z + h; cz++) {
    for (let cx = x; cx < x + w; cx++) {
      if (cx < 0 || cz < 0 || cx >= width || cz >= height) continue;
      carved.add(key(cx, cz));
    }
  }
}

/** Carve an axis-aligned L-shaped corridor between two room centers: X-then-Z or Z-then-X (chosen by
 *  `rng`), at width 1 (80% of the time — deliberately narrow) or 2 (20% — a thoroughfare). */
function carveCorridor(rng: Rng, carved: Set<string>, from: RoomRect, to: RoomRect, width: number, height: number): void {
  const corridorWidth = rng.chance(0.2) ? 2 : 1;
  const half = corridorWidth - 1;
  const xFirst = rng.chance(0.5);
  const carveH = (z: number, x0: number, x1: number) => {
    const [lo, hi] = x0 <= x1 ? [x0, x1] : [x1, x0];
    carveRect(carved, lo, z, hi - lo + 1, 1 + half, width, height);
  };
  const carveV = (x: number, z0: number, z1: number) => {
    const [lo, hi] = z0 <= z1 ? [z0, z1] : [z1, z0];
    carveRect(carved, x, lo, 1 + half, hi - lo + 1, width, height);
  };
  if (xFirst) {
    carveH(from.cz, from.cx, to.cx);
    carveV(to.cx, from.cz, to.cz);
  } else {
    carveV(from.cx, from.cz, to.cz);
    carveH(to.cz, from.cx, to.cx);
  }
}

/** BFS distances (4-connectivity) over the carved-cell graph from `start`. Exported so the test suite
 *  can independently verify solvability across many seeds without duplicating this logic. */
export function bfsDistances(carved: Set<string>, start: { x: number; z: number }): Map<string, number> {
  const dist = new Map<string, number>();
  const startKey = key(start.x, start.z);
  if (!carved.has(startKey)) return dist;
  dist.set(startKey, 0);
  const queue: [number, number][] = [[start.x, start.z]];
  let head = 0;
  const deltas: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (head < queue.length) {
    const [x, z] = queue[head++];
    const d = dist.get(key(x, z))!;
    for (const [dx, dz] of deltas) {
      const nx = x + dx;
      const nz = z + dz;
      const nk = key(nx, nz);
      if (!carved.has(nk) || dist.has(nk)) continue;
      dist.set(nk, d + 1);
      queue.push([nx, nz]);
    }
  }
  return dist;
}

function carvedNeighborCount(carved: Set<string>, x: number, z: number): number {
  let n = 0;
  if (carved.has(key(x + 1, z))) n++;
  if (carved.has(key(x - 1, z))) n++;
  if (carved.has(key(x, z + 1))) n++;
  if (carved.has(key(x, z - 1))) n++;
  return n;
}

/** Weighted picks, biased away from the entry room and toward dead ends: score = BFS distance from
 *  entry + a flat bonus for a dead-end cell (<=1 carved neighbor). Picks the top-scoring candidates
 *  and draws from among them (never deterministically "the single best cell" — that would make every
 *  seed's placements suspiciously identical in shape), never repeating a cell already used. */
function biasedPick(
  rng: Rng,
  carved: Set<string>,
  dist: Map<string, number>,
  excluded: Set<string>,
  count: number,
): { x: number; z: number }[] {
  const DEAD_END_BONUS = 6;
  const scored: { x: number; z: number; score: number }[] = [];
  for (const k of carved) {
    if (excluded.has(k)) continue;
    const [xs, zs] = k.split(",");
    const x = Number(xs);
    const z = Number(zs);
    const d = dist.get(k) ?? 0;
    const deadEnd = carvedNeighborCount(carved, x, z) <= 1 ? DEAD_END_BONUS : 0;
    scored.push({ x, z, score: d + deadEnd });
  }
  scored.sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, Math.max(count * 6, 12));
  const picked: { x: number; z: number }[] = [];
  const used = new Set<string>();
  while (picked.length < count && pool.length > used.size) {
    const candidate = rng.pick(pool.filter((c) => !used.has(key(c.x, c.z))));
    if (!candidate) break;
    used.add(key(candidate.x, candidate.z));
    picked.push({ x: candidate.x, z: candidate.z });
  }
  return picked;
}

/** pickTollSpawn(rng, carved, lootPos) — a real, BFS-reachable placement for the tier's single Toll
 *  instance, offset from its own warded loot by a genuine gap (see TOLL_SPAWN_MIN_DIST/MAX_DIST's
 *  own comment for the balance problem this fixes). Candidates are collected in BFS-nearest-first
 *  order from the loot's own cell, filtered to Euclidean distance in [TOLL_SPAWN_MIN_DIST,
 *  TOLL_SPAWN_MAX_DIST] from the loot's own raw (x,z) — the SAME point convention the anomaly's
 *  `at` predicate and the loot's own (x,z) already share, not a rendered cell-center — and drawn
 *  from with `rng.pick` (part of the tier's single continuous seeded stream, same discipline as
 *  `biasedPick` above), so the choice is unpredictable per seed but still fully deterministic.
 *  Falls back outward (a loosened ceiling, then "nearest reachable cell at all") rather than ever
 *  throwing — a real, tested level must always generate, even from an unusually cramped dead end;
 *  see level-gen.test.mts for how rare that fallback actually is across the seeded solvability
 *  sweep. */
function pickTollSpawn(rng: Rng, carved: Set<string>, lootPos: { x: number; z: number }): { x: number; z: number } {
  const dist = bfsDistances(carved, lootPos);
  const ordered = [...dist.entries()].sort((a, b) => a[1] - b[1]);
  const collect = (min: number, max: number): { x: number; z: number }[] => {
    const pool: { x: number; z: number }[] = [];
    for (const [k] of ordered) {
      const [xs, zs] = k.split(",");
      const x = Number(xs);
      const z = Number(zs);
      const d = Math.hypot(x - lootPos.x, z - lootPos.z);
      if (d >= min && d <= max) pool.push({ x, z });
      if (pool.length >= 12) break; // a bounded pool, same spirit as biasedPick's own cap
    }
    return pool;
  };
  const primary = collect(TOLL_SPAWN_MIN_DIST, TOLL_SPAWN_MAX_DIST);
  if (primary.length > 0) return rng.pick(primary)!;
  const loosened = collect(TOLL_SPAWN_MIN_DIST, TOLL_SPAWN_MAX_DIST * 2); // cramped tier: widen the ceiling, keep the floor
  if (loosened.length > 0) return rng.pick(loosened)!;
  const farthestReachable = ordered.length > 1 ? ordered[ordered.length - 1] : null;
  if (farthestReachable) {
    const [xs, zs] = farthestReachable[0].split(",");
    return { x: Number(xs), z: Number(zs) };
  }
  return lootPos; // last resort: a fully isolated 1-cell pocket — today's old (pre-fix) behavior
}

const ANOMALY_KINDS_BY_TIER: Record<1 | 2 | 3, AnomalyKind[]> = {
  1: ["unwitnessed", "hum"],
  2: ["unwitnessed", "hum", "warden"],
  3: ["unwitnessed", "hum", "warden", "toll"],
};

const ANOMALY_COUNT_BY_TIER: Record<1 | 2 | 3, number> = { 1: 3, 2: 5, 3: 8 };
const LOOT_COUNT_BY_TIER: Record<1 | 2 | 3, number> = { 1: 5, 2: 8, 3: 12 };

// TOLL BALANCE FIX (playtest finding, live-verified): the original build paired the Toll instance
// with its warded loot at the LOOT'S OWN (x,z) — same cell, distance ~0 by construction. Contact
// radius (0.6) plus the pickup radius (1.2) a player necessarily stands within to grab the item at
// all meant the real gap at the trigger instant measured 0.71-0.89 units in practice: both a
// stationary grab and a full-momentum grab-and-run died within 1-2 ticks, zero counterplay, contra
// the game's own learnable-rules thesis (DESIGN.md §3's "learn the rule, survive it").
//
// Tuned by testing (see src/anomalies/toll-escape.test.mts): the Toll's own chase speed
// (toll.mts's 0.14 units/tick = 8.4 u/s) exceeds MAX_GROUND_SPEED (movement.mts's 7 u/s) outright —
// a flat-out sprint alone can NEVER out-distance it, by design ("faster than the other three...
// should read as dangerous", toll.mts's own header). The one thing that DOES clear 8.4 u/s is the
// game's own learnable bunnyhop tech (movement.test.mts: hop-over-hop speed gain reaches >8.4 u/s
// within a single hop cycle, 15+ u/s after a handful). So the real, INTENDED counterplay was never
// "have momentum" — it's "know the strafe-jump tech" — and that only works at all if the guardian
// isn't already standing on top of the loot when it triggers. TOLL_SPAWN_MIN_DIST=3.0 is the tested
// floor: a real running-start bhop grab-and-run reliably clears the Toll's reach (proven never
// caught in toll-escape.test.mts's own scripted proof), while a stationary or flat-ground-speed
// ("sloppy") grab-and-run still dies every time at this same distance — the dread stays; only real
// skill escapes it. TOLL_SPAWN_MAX_DIST=4.5 keeps the guardian meaningfully near its prize (this is
// a tight escape window, not "spawn it across the map").
// Exported (not just module-private) so the tuning proof (src/anomalies/toll-escape.test.mts) tests
// the REAL constant this file actually uses, never a hand-copied duplicate that could drift.
export const TOLL_SPAWN_MIN_DIST = 3.0;
export const TOLL_SPAWN_MAX_DIST = 4.5;

/** generateLevel(seed, tier) — the whole seeded pass for one depth tier: rooms, MST+loop corridors,
 *  pre-seeded contested walls, extraction beacons (one early, one deep — both BFS-verified reachable
 *  by construction), anomaly slots, loot slots, and (tier 1-2 only) a transition voxel to the next
 *  tier. Pure: two calls with the same (seed, tier) produce byte-identical output. */
export function generateLevel(seed: string, tier: 1 | 2 | 3): GeneratedLevel {
  const rng = makeRng(`${seed}:tier${tier}`);
  const { width, height, rooms: roomCount } = TIER_DIMS[tier];

  const rooms = placeRooms(rng, width, height, roomCount);
  const carved = new Set<string>();
  for (const room of rooms) carveRect(carved, room.x, room.z, room.w, room.h, width, height);

  const edges = connectRooms(rng, rooms);
  for (const [i, j] of edges) carveCorridor(rng, carved, rooms[i], rooms[j], width, height);

  const entry = { x: rooms[0].cx, z: rooms[0].cz };
  const dist = bfsDistances(carved, entry);

  // extraction beacons: pick an "early" cell (a modest BFS distance — reachable without clearing the
  // level) and a "deep" cell (the far end of the reachable graph).
  const reachableSorted = [...dist.entries()].sort((a, b) => a[1] - b[1]);
  const maxDist = reachableSorted.length ? reachableSorted[reachableSorted.length - 1][1] : 0;
  const earlyBand = reachableSorted.filter(([, d]) => d >= Math.max(2, Math.floor(maxDist * 0.15)) && d <= Math.max(3, Math.floor(maxDist * 0.4)));
  const deepBand = reachableSorted.filter(([, d]) => d >= Math.floor(maxDist * 0.7));
  const pickFromBand = (band: [string, number][]): { x: number; z: number } => {
    const choice = band.length ? rng.pick(band) : reachableSorted[reachableSorted.length - 1];
    const [xs, zs] = (choice?.[0] ?? `${entry.x},${entry.z}`).split(",");
    return { x: Number(xs), z: Number(zs) };
  };
  const earlyPos = pickFromBand(earlyBand);
  const deepPos = pickFromBand(deepBand.length ? deepBand : reachableSorted);
  const extractionBeacons: ExtractionBeacon[] = [
    { id: `${seed}:tier${tier}:beacon-early`, x: earlyPos.x, z: earlyPos.z, depth: "early" },
    { id: `${seed}:tier${tier}:beacon-deep`, x: deepPos.x, z: deepPos.z, depth: "deep" },
  ];

  const excluded = new Set<string>([key(entry.x, entry.z), key(earlyPos.x, earlyPos.z), key(deepPos.x, deepPos.z)]);

  const kinds = ANOMALY_KINDS_BY_TIER[tier];
  const anomalyPositions = biasedPick(rng, carved, dist, excluded, ANOMALY_COUNT_BY_TIER[tier]);
  const anomalySlots: AnomalySlot[] = anomalyPositions.map((pos, i) => {
    excluded.add(key(pos.x, pos.z));
    return { id: `${seed}:tier${tier}:anomaly${i}`, kind: kinds[i % kinds.length], x: pos.x, z: pos.z };
  });

  const lootPositions = biasedPick(rng, carved, dist, excluded, LOOT_COUNT_BY_TIER[tier]);
  const lootSlots: LootSlot[] = lootPositions.map((pos, i) => {
    excluded.add(key(pos.x, pos.z));
    const isValuable = i === 0 && kinds.includes("toll"); // the tier's single Toll-warded prize, when Toll is present
    const rarity: LootRarity = isValuable ? "valuable" : rng.chance(0.25) ? "rare" : "common";
    return {
      id: `${seed}:tier${tier}:loot${i}`,
      x: pos.x,
      z: pos.z,
      rarity,
      ...(isValuable ? { wardedBy: "toll" as const } : {}),
    };
  });
  // pair a Toll anomaly instance near (never AT — see TOLL_SPAWN_MIN_DIST's own comment) the warded
  // loot's position, if the tier has one.
  const warded = lootSlots.find((l) => l.wardedBy === "toll");
  if (warded) {
    const tollPos = pickTollSpawn(rng, carved, { x: warded.x, z: warded.z });
    anomalySlots.push({ id: `${seed}:tier${tier}:anomaly-toll`, kind: "toll", x: tollPos.x, z: tollPos.z });
  }

  // contested reflip sites: narrow (non-room) corridor cells, away from the entry, that the game loop
  // periodically re-asserts (The Contested, §3.4) — picked here so site selection is seed-derived, not
  // chosen ad hoc at runtime.
  const corridorOnly = new Set<string>();
  for (const k of carved) {
    const [xs, zs] = k.split(",");
    const x = Number(xs);
    const z = Number(zs);
    const inRoom = rooms.some((r) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.h);
    if (!inRoom) corridorOnly.add(k);
  }
  const contestedCount = tier; // 1 site in tier 1, up to 3 in tier 3
  const contestedPositions = biasedPick(rng, corridorOnly, dist, excluded, contestedCount);
  const contestedSites: ContestedSite[] = contestedPositions.map((pos, i) => ({
    id: `${seed}:tier${tier}:contested${i}`,
    x: pos.x,
    z: pos.z,
  }));

  // transition voxel to the next tier: the deepest reachable corridor dead end, tiers 1-2 only.
  const transition = tier < 3 ? deepPos : null;

  // ── emit the trace rows: every cell in bounds gets EXPLICIT solidity evidence (no unlisted cell). ──
  // A contested REFLIP SITE (The Contested, §3.4) is a CARVED cell that ALSO carries the `predicate`
  // (solid) face alongside its `deny` (carved) face — both faces filed at generation time, folding it
  // to ⊤ from the start (THE LAW: nobody erases evidence, so once both faces exist the cell is ⊤
  // forever; there is no "un-contesting" it later). What makes it periodically openable/closeable is
  // NOT the trace — it's the game loop's own per-tick EXT-3 `passContestedWhere` gate (see
  // src/contested-gate.mts), which decides whether THIS ALREADY-⊤ cell currently blocks, exactly
  // matching arena.mjs's own established "a ⊤ voxel is a phase gate you can sometimes walk through"
  // idiom — reused, not invented fresh. The raycaster still renders it shivering at all times (castRay
  // stops on ⊤ regardless of passContested — only collision reads that opt), so a reflip site always
  // LOOKS untrustworthy even during its passable half of the cycle. An "ambient" pre-seeded ⊤ wall
  // (`ANOMALOUS_WALL_CHANCE`, below) is a non-carved WALL cell and is never gated open at all — it is
  // permanent background wrongness, not an interactive route.
  const contestedSiteKeys = new Set(contestedSites.map((s) => key(s.x, s.z)));
  const rows: Row[] = [];
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const k = key(x, z);
      const subject = cellKey(x, z);
      if (carved.has(k)) {
        if (contestedSiteKeys.has(k)) rows.push(predicate(subject, "solid", "wall", 0));
        rows.push(deny(subject, "solid", "wall", 0));
        continue;
      }
      // an interior wall (adjacent to at least one carved cell) has a small chance of being
      // pre-seeded contested (⊤ from generation, not only from later gameplay).
      const adjacentToCarved =
        carved.has(key(x + 1, z)) || carved.has(key(x - 1, z)) || carved.has(key(x, z + 1)) || carved.has(key(x, z - 1));
      if (adjacentToCarved && rng.chance(ANOMALOUS_WALL_CHANCE)) {
        rows.push(predicate(subject, "solid", "wall", 0));
        rows.push(deny(subject, "solid", "wall", 0));
      } else {
        rows.push(predicate(subject, "solid", "wall", 0));
      }
    }
  }
  for (const beacon of extractionBeacons) {
    rows.push(predicate(cellKey(beacon.x, beacon.z), "extraction", beacon.id, 0));
  }

  return {
    seed,
    tier,
    width,
    height,
    rows,
    entry,
    rooms,
    extractionBeacons,
    anomalySlots,
    lootSlots,
    contestedSites,
    transition,
  };
}
