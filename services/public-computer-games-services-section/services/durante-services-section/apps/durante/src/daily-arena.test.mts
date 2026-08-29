// daily-arena.test.mts — the SOLVABILITY SWEEP, mirroring apps/ruinfold/src/tests/dungeon.test.mts's
// own structure exactly: construction (daily-arena.mjs's maze-carve-is-a-spanning-tree guarantee) is
// re-verified here a SECOND, INDEPENDENT way. Independence means two things, both honored below:
//   1. reachability is re-derived from the REAL merged abrash world (arenaGrid + collision's own
//      `blocks()` predicate), never from daily-arena.mjs's internal sketch/grid arrays — a future edit
//      to the generator's internals cannot silently agree with itself.
//   2. the sweep spans 366 UTC dates (one full leap year, so every possible day-of-year is exercised)
//      PLUS a spread of raw numeric stress seeds outside any real calendar date's hash — the generator
//      never emits an unwinnable daily, for any 32-bit seed, not just ones dailySeed() happens to
//      produce.

import { test } from "node:test";
import assert from "node:assert/strict";
import { arenaGrid } from "./arena.mjs";
import { blocks } from "@red-cup-engineering/abrash/collision";
import { dailySeed } from "./daily.mjs";
import { dailyArena, bfsReachable, ARENA_MIN_N, ARENA_MAX_N } from "./daily-arena.mjs";

// independentReachable(world, N, startX, startZ) — BFS over the REAL merged world's grid, reading
// solidity through arena.mjs's own arenaGrid + collision.mjs's own blocks() predicate (passContested
// true — the deathmatch default every face uses). This is deliberately NOT daily-arena.mjs's
// bfsReachable+passable pairing (that one reads the pre-merge sketch arrays); it is a second read path
// over the actual world object callers receive.
function independentReachable(world, N, startX, startZ) {
  const g = arenaGrid(world, { passContested: true });
  const passable = (x, z) => !blocks(g.at(x, z).charge, { passContested: true });
  return bfsReachable(passable, N, startX, startZ);
}

function daysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

// a full leap year of UTC dates (366 distinct calendar days — every day-of-year value occurs).
function leapYearDates(year) {
  const out = [];
  const total = daysInYear(year);
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(year, 0, 1 + i));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  return out;
}

const SWEEP_DATES = leapYearDates(2028); // 2028 is a leap year: 366 distinct dates

// raw stress seeds — arbitrary 32-bit values with no calendar-date provenance at all, so the sweep
// covers the generator's behavior over the full seed space, not just what SHA-256 of a date string
// happens to produce.
const STRESS_SEEDS = [
  0, 1, 2, 0xffffffff, 0x7fffffff, 0x80000000, 0xdeadbeef, 0xcafebabe, 0x12345678,
  0x00000001, 0x0f0f0f0f, 0xf0f0f0f0, 0x561561, 0x11111111, 0x22222222, 0x99999999,
  0xa5a5a5a5, 0x5a5a5a5a, 0x13371337, 0x8badf00d,
];

test(`solvability sweep: all ${SWEEP_DATES.length} dates of a leap year (2028) yield a reachable, in-range daily`, () => {
  assert.equal(SWEEP_DATES.length, 366);
  for (const date of SWEEP_DATES) {
    const seed = dailySeed(date);
    const arena = dailyArena(seed);
    assertSolvable(arena, `date ${date} (seed ${seed})`);
  }
});

test(`solvability sweep: ${STRESS_SEEDS.length} raw numeric stress seeds outside any date's hash yield a reachable, in-range daily`, () => {
  for (const seed of STRESS_SEEDS) {
    const arena = dailyArena(seed >>> 0);
    assertSolvable(arena, `stress seed 0x${(seed >>> 0).toString(16)}`);
  }
});

function assertSolvable(arena, label) {
  const { world, floorBound: N, playerSpawn, demonSpawns } = arena;

  assert.ok(N >= ARENA_MIN_N && N <= ARENA_MAX_N, `${label}: floorBound ${N} out of [${ARENA_MIN_N},${ARENA_MAX_N}]`);
  assert.ok(demonSpawns.length >= 2 && demonSpawns.length <= 4, `${label}: demonSpawns.length ${demonSpawns.length} out of [2,4]`);

  const startX = Math.floor(playerSpawn.x), startZ = Math.floor(playerSpawn.z);
  const reachable = independentReachable(world, N, startX, startZ);

  for (const d of demonSpawns) {
    const key = `${Math.floor(d.x)},${Math.floor(d.z)}`;
    assert.ok(reachable.has(key), `${label}: demon:${d.id} at ${key} is NOT reachable from player spawn (${startX},${startZ}) — unwinnable daily`);
    assert.ok(d.toughness >= 2 && d.toughness <= 5, `${label}: demon:${d.id} toughness ${d.toughness} out of [2,5]`);
    assert.ok(d.speed >= 0.06 && d.speed <= 0.14, `${label}: demon:${d.id} speed ${d.speed} out of [0.06,0.14]`);
  }

  // the perimeter is fully solid (never touched by the carve, never flipped for sketchB either, since
  // sketchB's flip pool is drawn only from INTERIOR solid cells — see daily-arena.mjs) — the player can
  // never walk off-grid.
  const g = arenaGrid(world, { passContested: true });
  for (let x = 0; x < N; x++) {
    assert.ok(blocks(g.at(x, 0).charge, {}), `${label}: perimeter breach at (${x},0)`);
    assert.ok(blocks(g.at(x, N - 1).charge, {}), `${label}: perimeter breach at (${x},${N - 1})`);
  }
  for (let z = 0; z < N; z++) {
    assert.ok(blocks(g.at(0, z).charge, {}), `${label}: perimeter breach at (0,${z})`);
    assert.ok(blocks(g.at(N - 1, z).charge, {}), `${label}: perimeter breach at (${N - 1},${z})`);
  }

  // the player's own spawn cell must itself be reachable/passable (trivially true — BFS always seeds
  // it — but assert it is not, say, sitting inside a solid cell by an off-by-one in spawn math).
  assert.ok(!blocks(g.at(startX, startZ).charge, { passContested: true }), `${label}: player spawn (${startX},${startZ}) is itself solid`);
}

test("dailyArena is a pure function of seed: same seed twice yields byte-identical demon placement", () => {
  const seed = dailySeed("2026-08-19");
  const a = dailyArena(seed);
  const b = dailyArena(seed);
  assert.equal(a.floorBound, b.floorBound);
  assert.deepEqual(a.demonSpawns, b.demonSpawns);
  assert.deepEqual(a.playerSpawn, b.playerSpawn);
});

test("dailyArena: two different dates diverge (the daily actually varies, not a disguised fixed arena)", () => {
  const a = dailyArena(dailySeed("2026-08-19"));
  const b = dailyArena(dailySeed("2026-08-20"));
  const same = a.floorBound === b.floorBound && JSON.stringify(a.demonSpawns) === JSON.stringify(b.demonSpawns);
  assert.equal(same, false, "two different dates produced an identical daily — the generator is not actually seed-derived");
});
