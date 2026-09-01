// daily-arena — the daily QUAKE tournament's SEEDED GENERATOR. NEW code, not a port: ruinfold's
// dungeon.mts generates rooms/monsters over a floor-chain world shape durante doesn't have; durante's
// OWN arena.mjs already supplies exactly the primitives a wall-maze generator needs (arenaRows,
// arenaWorld, mergeArena, worldFromRows), untouched. This module composes those, plus a seeded
// recursive-backtracker maze carve and demon.mjs's existing spawn(), into one daily arena per UTC date.
//
// SOLVABILITY BY CONSTRUCTION (the onestone doctrine — "solvability is a validated mathematical
// property of the content", never a post-hoc filter): a recursive-backtracker maze carve is a SPANNING
// TREE over its cell lattice by construction — every carved cell is reachable from every other carved
// cell, full stop, with zero possibility of an isolated pocket. The perimeter is never touched by the
// carve, so the player can never walk off-grid. Demons are placed only on cells the generator's own
// BFS (over that already-connected lattice) proves reachable from the player's spawn. This module's
// own guarantee is checked a SECOND, INDEPENDENT way by daily-arena.test.mts, which re-derives
// reachability from the actual merged abrash world (not from this module's internal maze arrays) —
// the same doubled discipline apps/ruinfold/src/engine/dungeon.mts + its test use.
//
// THE TWIST STAYS ALIVE PER-DAY: rather than authoring one fixed federated merge (the shipped
// BLOOD_MERGE_ROWS), every daily is itself a merge of two divergent sketches — the base maze
// (sketchA) and a variant (sketchB) with a small seed-derived set of interior walls carved open. Since
// sketchB's wall-set is a strict SUBSET of sketchA's, mergeArena(arenaWorld(sketchA), arenaWorld
// (sketchB)) folds exactly those flipped cells to ⊤ CONTESTED — additional phase-gate shortcuts on an
// already-fully-connected maze. Contested cells can only ADD routes, never remove one: this step is
// solvability-neutral by construction, matching blood-merge.jsonl's own hand-authored contested cell
// (voxel:4,4) but regenerated fresh, per day, from the seed.

import { arenaRows, arenaWorld, mergeArena, worldFromRows } from "./arena.mjs";
import { admitLog } from "@red-cup-engineering/abrash/world";
import { spawn as demonSpawnRows } from "./demon.mjs";

// ── seeded PRNG — mulberry32, the SAME small, dependency-free construction cartridge.mjs and
// ruinfold's own prng.mts both use, so no new randomness primitive enters the house's vocabulary.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// intBetween/pick — deterministic draws from `rng`, matching ruinfold's prng.mts shape exactly.
function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

export const ARENA_MIN_N = 10;
export const ARENA_MAX_N = 16;

// carveMazeSketch(rng, N) — a recursive-backtracker maze on the cell lattice { 1, 3, 5, ... } ⊂
// [1, N-2], leaving the perimeter (row/col 0 and N-1) and every even lattice position untouched
// (solid). Returns { grid, cellCount } where `grid` is an N×N array of '#'/'.' chars, grid[z][x].
// A spanning tree by construction: `visited` covers every cell reachable from (0,0) in the lattice
// graph, and the stack-based backtracker only ever stops when every reachable cell IS visited — i.e.
// when the whole M×M lattice (a fully connected grid graph) has been walked.
function carveMazeSketch(rng, N) {
  const M = Math.floor((N - 1) / 2); // maze cells per axis; cell i -> grid coord 1 + 2*i
  const cellCoord = (i) => 1 + 2 * i;
  const grid = Array.from({ length: N }, () => Array(N).fill("#"));
  const visited = Array.from({ length: M }, () => Array(M).fill(false));

  const openCell = (i, j) => { grid[cellCoord(j)][cellCoord(i)] = "."; };
  const openWallBetween = (i, j, ni, nj) => {
    // exactly one of di/dj is ±1 (orthogonal neighbors only).
    const wx = cellCoord(i) + (ni - i);
    const wz = cellCoord(j) + (nj - j);
    grid[wz][wx] = ".";
  };

  visited[0][0] = true;
  openCell(0, 0);
  const stack = [[0, 0]];
  let cellCount = 1;

  while (stack.length > 0) {
    const [ci, cj] = stack[stack.length - 1];
    const neighbors = [];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni >= 0 && ni < M && nj >= 0 && nj < M && !visited[ni][nj]) neighbors.push([ni, nj]);
    }
    if (neighbors.length === 0) { stack.pop(); continue; }
    const [ni, nj] = neighbors[Math.floor(rng() * neighbors.length)];
    visited[ni][nj] = true;
    openCell(ni, nj);
    openWallBetween(ci, cj, ni, nj);
    cellCount += 1;
    stack.push([ni, nj]);
  }

  return { grid, M, cellCoord, cellCount };
}

// gridToSketch(grid) — an N×N char grid (grid[z][x]) into arena.mjs's line-per-z sketch format.
function gridToSketch(grid) {
  return grid.map((row) => row.join(""));
}

// bfsReachable(passable, N, startX, startZ) — flood-fill over `passable(x,z)` from the start cell.
// Returns a Set of "x,z" keys. Pure, no world/abrash dependency — used both by this generator (demon
// placement) and independently re-derived (over the real merged world) by daily-arena.test.mts.
export function bfsReachable(passable, N, startX, startZ) {
  const seen = new Set([`${startX},${startZ}`]);
  const queue = [[startX, startZ]];
  while (queue.length > 0) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;
      const key = `${nx},${nz}`;
      if (seen.has(key)) continue;
      if (!passable(nx, nz)) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  return seen;
}

const DEMON_TOUGHNESS_MIN = 2;
const DEMON_TOUGHNESS_MAX = 5;
const DEMON_SPEED_MIN = 0.06;
const DEMON_SPEED_MAX = 0.14; // 0.06 + up to 0.08

// dailyArena(date, seed) — the whole daily generation pipeline, per §2.2 of the spec. `seed` is the
// already-derived dailySeed(date) (kept as a parameter, not recomputed here, so this module never
// needs to import daily.mjs / node:crypto itself — it stays a pure function of a NUMBER, exactly like
// ruinfold's buildDaily(seed: number)).
export function dailyArena(seed) {
  const rng = mulberry32(seed);

  const N = ARENA_MIN_N + intBetween(rng, 0, ARENA_MAX_N - ARENA_MIN_N); // 10..16
  const { grid: gridA, cellCoord } = carveMazeSketch(rng, N);
  const sketchA = gridToSketch(gridA);

  // sketchB — sketchA with K interior, non-perimeter, currently-solid cells flipped to '~' (carved).
  // A strict subset of sketchA's wall-set, so mergeArena can only ever fold these to ⊤ contested —
  // additional shortcuts, never a removed connection (see module header).
  const solidInterior = [];
  for (let z = 1; z <= N - 2; z++) {
    for (let x = 1; x <= N - 2; x++) {
      if (gridA[z][x] === "#") solidInterior.push([x, z]);
    }
  }
  const K = Math.min(intBetween(rng, 1, 3), solidInterior.length);
  const flipped = [];
  const flipPool = solidInterior.slice();
  for (let i = 0; i < K; i++) {
    const idx = Math.floor(rng() * flipPool.length);
    flipped.push(flipPool[idx]);
    flipPool.splice(idx, 1);
  }
  const gridB = gridA.map((row) => row.slice());
  for (const [x, z] of flipped) gridB[z][x] = "~";
  const sketchB = gridToSketch(gridB);

  const world = mergeArena(arenaWorld(sketchA, "generator-a"), arenaWorld(sketchB, "generator-b"));

  // player spawn — the maze's own (0,0) cell (cellCoord(0)=1), the natural starting corner, centered
  // in the voxel like the shipped arena's own 7.5/2.5-style half-cell placement.
  const spawnX = cellCoord(0);
  const spawnZ = cellCoord(0);
  const playerSpawn = { x: spawnX + 0.5, z: spawnZ + 0.5 };

  // demon placement — BFS from spawn over sketchA's passable cells UNION the flipped (contested,
  // passable-by-default) cells: exactly the reachability a passContested:true collision grid gives.
  const flippedSet = new Set(flipped.map(([x, z]) => `${x},${z}`));
  const passable = (x, z) => sketchA[z][x] !== "#" || flippedSet.has(`${x},${z}`);
  const reachable = bfsReachable(passable, N, spawnX, spawnZ);

  // BFS distance from spawn (re-walk, tracking depth) so demons prefer far cells, not right on top
  // of the player — the same reachable set, just also carrying distance this time.
  const dist = new Map([[`${spawnX},${spawnZ}`, 0]]);
  const q = [[spawnX, spawnZ]];
  while (q.length > 0) {
    const [x, z] = q.shift();
    const d = dist.get(`${x},${z}`);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      const key = `${nx},${nz}`;
      if (!reachable.has(key) || dist.has(key)) continue;
      dist.set(key, d + 1);
      q.push([nx, nz]);
    }
  }
  const byDistanceDesc = [...reachable]
    .filter((k) => k !== `${spawnX},${spawnZ}`)
    .sort((a, b) => (dist.get(b) ?? 0) - (dist.get(a) ?? 0));

  const DEMON_COUNT = Math.min(intBetween(rng, 2, 4), byDistanceDesc.length);
  const demonSpawns = [];
  // take from the far end of the distance-sorted reachable set, spread across it rather than
  // clustering all demons at the single farthest cell.
  const stride = Math.max(1, Math.floor(byDistanceDesc.length / Math.max(DEMON_COUNT, 1)));
  for (let i = 0; i < DEMON_COUNT; i++) {
    const idx = Math.min(i * stride, byDistanceDesc.length - 1);
    const [x, z] = byDistanceDesc[idx].split(",").map(Number);
    demonSpawns.push({
      id: i,
      x: x + 0.5,
      z: z + 0.5,
      toughness: intBetween(rng, DEMON_TOUGHNESS_MIN, DEMON_TOUGHNESS_MAX),
      speed: DEMON_SPEED_MIN + rng() * (DEMON_SPEED_MAX - DEMON_SPEED_MIN),
    });
  }

  const angleJitter = (rng() - 0.5) * 0.6; // matching cartridge.mjs's own start-angle jitter shape

  // admit each demon's spawn rows into the merged world, exactly as the shipped BLOOD_MERGE_ROWS
  // bundles wall rows and demon rows together into one world (see cartridge.mjs's createEngine) — so
  // the returned `world` is immediately playable via game()/tick() with no further admission step.
  let worldWithDemons = world;
  for (const d of demonSpawns) {
    for (const r of demonSpawnRows(d.id, d.x, d.z, { toughness: d.toughness, speed: d.speed })) {
      worldWithDemons = admitLog(worldWithDemons, r.e, [r]).world;
    }
  }

  return {
    world: worldWithDemons,
    floorBound: N,
    playerSpawn: { ...playerSpawn, angle: angleJitter },
    demonSpawns,
  };
}

export { worldFromRows };
