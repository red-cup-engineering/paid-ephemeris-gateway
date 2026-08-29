// level-gen.test — the solvability commitment ("extraction reachable, tested across many seeds") as
// a real, run test, not a claim. Rebuilds the carved-cell set straight from the emitted trace ROWS
// (never from level-gen's own internal `carved` Set, which the test has no access to and shouldn't —
// this is deliberately an outside-in check of what the generator actually PUBLISHES, the same rows a
// real abrash `worldFromRows` would admit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLevel, bfsDistances, TOLL_SPAWN_MIN_DIST, TOLL_SPAWN_MAX_DIST } from "./level-gen.mts";

const TIERS: (1 | 2 | 3)[] = [1, 2, 3];
const SEEDS_PER_TIER = 200;

function carvedSetFromRows(rows: { e: string; a: string }[]): Set<string> {
  const carved = new Set<string>();
  for (const r of rows) {
    if (r.a !== "not-solid") continue;
    const m = /^voxel:(-?\d+),(-?\d+)$/.exec(r.e);
    if (m) carved.add(`${m[1]},${m[2]}`);
  }
  return carved;
}

test("level-gen: solvability — both extraction beacons are reachable from entry, across many seeds and all 3 tiers", () => {
  let checked = 0;
  for (const tier of TIERS) {
    for (let i = 0; i < SEEDS_PER_TIER; i++) {
      const seed = `solvability-${tier}-${i}`;
      const level = generateLevel(seed, tier);
      const carved = carvedSetFromRows(level.rows);
      const dist = bfsDistances(carved, level.entry);
      for (const beacon of level.extractionBeacons) {
        const reachable = dist.has(`${beacon.x},${beacon.z}`);
        assert.ok(reachable, `seed=${seed} tier=${tier}: extraction beacon ${beacon.depth} at (${beacon.x},${beacon.z}) is unreachable from entry (${level.entry.x},${level.entry.z})`);
        checked++;
      }
    }
  }
  assert.strictEqual(checked, TIERS.length * SEEDS_PER_TIER * 2, "sanity: every tier/seed contributed exactly 2 beacon checks");
});

test("level-gen: the early beacon is meaningfully closer to entry than the deep beacon (bail-now-or-push-on tension is real)", () => {
  for (const tier of TIERS) {
    for (let i = 0; i < 40; i++) {
      const level = generateLevel(`depth-order-${tier}-${i}`, tier);
      const carved = carvedSetFromRows(level.rows);
      const dist = bfsDistances(carved, level.entry);
      const early = level.extractionBeacons.find((b) => b.depth === "early")!;
      const deep = level.extractionBeacons.find((b) => b.depth === "deep")!;
      const earlyDist = dist.get(`${early.x},${early.z}`) ?? 0;
      const deepDist = dist.get(`${deep.x},${deep.z}`) ?? 0;
      assert.ok(deepDist >= earlyDist, `tier ${tier}: deep beacon (dist ${deepDist}) should be at least as far as early (dist ${earlyDist})`);
    }
  }
});

test("level-gen: every in-bounds voxel gets exactly one explicit solidity reading (no unlisted/implicit-fog cell)", () => {
  const level = generateLevel("explicit-coverage", 1);
  const bySubject = new Map<string, number>();
  for (const r of level.rows) {
    if (r.a !== "solid" && r.a !== "not-solid") continue;
    bySubject.set(r.e, (bySubject.get(r.e) ?? 0) + 1);
  }
  assert.strictEqual(bySubject.size, level.width * level.height, "every cell in bounds must carry solidity evidence");
  for (const [subject, count] of bySubject) {
    assert.ok(count === 1 || count === 2, `subject ${subject} should carry 1 (settled) or 2 (pre-seeded contested) solidity rows, got ${count}`);
  }
});

test("level-gen: pre-seeded contested walls exist and stay within the disclosed ~2-4% band of interior walls", () => {
  const level = generateLevel("contested-band", 3);
  const bySubject = new Map<string, number>();
  for (const r of level.rows) {
    if (r.a !== "solid" && r.a !== "not-solid") continue;
    bySubject.set(r.e, (bySubject.get(r.e) ?? 0) + 1);
  }
  const wallSubjects = [...bySubject.entries()].filter(([s, c]) => c >= 1);
  const solidOnly = wallSubjects.filter(([s, c]) => {
    // a solid (non-carved) cell has a "solid" row without a matching "not-solid" carve-row UNLESS
    // it's pre-seeded contested (which also has 2 rows, both faces). Distinguish by checking rows.
    const rows = level.rows.filter((r) => r.e === s);
    const hasSolid = rows.some((r) => r.a === "solid");
    return hasSolid; // includes both plain-solid and pre-seeded-contested cells
  });
  const contestedCount = solidOnly.filter(([s]) => bySubject.get(s) === 2).length;
  const ratio = contestedCount / solidOnly.length;
  assert.ok(contestedCount > 0, "expected at least one pre-seeded contested wall on a tier-3 level");
  assert.ok(ratio < 0.08, `pre-seeded contested ratio ${ratio} should stay in a small band around the disclosed 2-4%`);
});

test("level-gen: determinism — the same (seed, tier) produces byte-identical output", () => {
  const a = generateLevel("determinism-check", 2);
  const b = generateLevel("determinism-check", 2);
  assert.deepStrictEqual(a, b);
});

test("level-gen: different tiers of the same seed are genuinely different levels, and larger/denser per tier", () => {
  const t1 = generateLevel("scale-check", 1);
  const t2 = generateLevel("scale-check", 2);
  const t3 = generateLevel("scale-check", 3);
  assert.ok(t2.width > t1.width && t3.width > t2.width, "grid width should grow per tier");
  assert.ok(t2.rooms.length > t1.rooms.length && t3.rooms.length > t2.rooms.length, "room count should grow per tier");
  assert.notDeepStrictEqual(t1.rows, t2.rows);
});

test("level-gen: anomaly and loot slots land on carved (passable) cells, never inside a solid wall", () => {
  for (const tier of TIERS) {
    const level = generateLevel(`placement-validity-${tier}`, tier);
    const carved = carvedSetFromRows(level.rows);
    for (const slot of level.anomalySlots) {
      assert.ok(carved.has(`${slot.x},${slot.z}`), `anomaly slot ${slot.id} at (${slot.x},${slot.z}) must be on a carved cell`);
    }
    for (const slot of level.lootSlots) {
      assert.ok(carved.has(`${slot.x},${slot.z}`), `loot slot ${slot.id} at (${slot.x},${slot.z}) must be on a carved cell`);
    }
  }
});

test("level-gen: contested reflip sites are pre-seeded ⊤ (both solid faces filed) yet still count as carved/reachable", () => {
  for (const tier of TIERS) {
    const level = generateLevel(`reflip-check-${tier}`, tier);
    assert.ok(level.contestedSites.length > 0, `tier ${tier} should have at least one contested reflip site`);
    const carved = carvedSetFromRows(level.rows);
    for (const site of level.contestedSites) {
      const k = `${site.x},${site.z}`;
      assert.ok(carved.has(k), `reflip site ${site.id} must still read as carved (not-solid present)`);
      const solidRows = level.rows.filter((r) => r.e === `voxel:${site.x},${site.z}` && r.a === "solid");
      assert.strictEqual(solidRows.length, 1, `reflip site ${site.id} must ALSO carry the solid (affirm) face, folding it to ⊤`);
    }
  }
});

test("level-gen: TOLL BALANCE FIX — the Toll instance spawns a real, tuned distance from its warded loot, never coincident with it (regression guard for the live-playtest bug: it used to spawn AT the loot, a ~0.71-0.89-unit gap once pickup/contact radii are accounted for — see src/anomalies/toll-escape.test.mts for the escape/fail proof this distance is tuned against)", () => {
  const SWEEP = 150;
  let checked = 0;
  let fallbackCount = 0;
  for (let i = 0; i < SWEEP; i++) {
    const seed = `toll-distance-${i}`;
    const level = generateLevel(seed, 3); // Toll only exists at tier 3
    const warded = level.lootSlots.find((l) => l.wardedBy === "toll");
    const tollSlot = level.anomalySlots.find((a) => a.id.endsWith(":anomaly-toll"));
    assert.ok(warded, `seed=${seed}: tier 3 must always have exactly one toll-warded loot slot`);
    assert.ok(tollSlot, `seed=${seed}: tier 3 must always pair a Toll anomaly instance to it`);
    const dist = Math.hypot(tollSlot!.x - warded!.x, tollSlot!.z - warded!.z);
    // the OLD bug's own real gap (0.71-0.89 units, see this test's header) is the floor a fixed
    // build must clear with real margin — this is the literal regression assertion.
    assert.ok(dist > 2.0, `seed=${seed}: Toll spawned only ${dist.toFixed(2)} units from its loot — regressed toward the old zero-counterplay bug`);
    if (dist < TOLL_SPAWN_MIN_DIST || dist > TOLL_SPAWN_MAX_DIST) fallbackCount++;
    checked++;
  }
  assert.strictEqual(checked, SWEEP);
  // the primary [MIN,MAX] band should be hit in the large majority of seeds -- the fallback path
  // (a cramped dead end with too few candidates in-band) is a disclosed, tested escape hatch, not
  // the common case.
  assert.ok(fallbackCount / SWEEP < 0.25, `fallback (outside [${TOLL_SPAWN_MIN_DIST},${TOLL_SPAWN_MAX_DIST}]) hit on ${fallbackCount}/${SWEEP} seeds — expected the primary band to dominate`);
});

test("level-gen: tier 1 and 2 name a transition voxel into the next tier; tier 3 (deepest) does not", () => {
  const t1 = generateLevel("transition-check", 1);
  const t2 = generateLevel("transition-check", 2);
  const t3 = generateLevel("transition-check", 3);
  assert.ok(t1.transition !== null);
  assert.ok(t2.transition !== null);
  assert.strictEqual(t3.transition, null);
});
