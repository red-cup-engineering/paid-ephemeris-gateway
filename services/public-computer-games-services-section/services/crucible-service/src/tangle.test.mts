import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnTangle, withEnergyBudget } from './tangle.mts';
import { spatialH1Rank } from './obstruction.mts';

test('spawnTangle is deterministic: same seed -> byte-identical tangle', () => {
  const a = spawnTangle('crucible-daily:2026-08-19');
  const b = spawnTangle('crucible-daily:2026-08-19');
  assert.deepEqual(a, b);
});

test('spawnTangle differs across seeds', () => {
  const a = spawnTangle('crucible-daily:2026-08-19');
  const b = spawnTangle('crucible-daily:2026-08-20');
  assert.notDeepEqual(a, b);
});

test('spawnTangle claim count is within the declared bounds', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'crucible-daily:2026-08-19']) {
    const t = spawnTangle(seed);
    assert.ok(t.claims.length >= 7 && t.claims.length <= 12, `seed ${seed}: ${t.claims.length} claims`);
  }
});

test('every claim id in bonds refers to a real claim', () => {
  const t = spawnTangle('crucible-daily:2026-08-19');
  const ids = new Set(t.claims.map((c) => c.id));
  for (const b of t.bonds) {
    assert.ok(ids.has(b.a), `bond ${b.id} references unknown claim ${b.a}`);
    assert.ok(ids.has(b.b), `bond ${b.id} references unknown claim ${b.b}`);
  }
});

test('bond ids are unique', () => {
  const t = spawnTangle('crucible-daily:2026-08-19');
  const ids = t.bonds.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('no two bonds connect the same unordered pair of claims', () => {
  const t = spawnTangle('crucible-daily:2026-08-19');
  const seen = new Set<string>();
  for (const b of t.bonds) {
    const key = b.a < b.b ? `${b.a}|${b.b}` : `${b.b}|${b.a}`;
    assert.ok(!seen.has(key), `duplicate edge ${key}`);
    seen.add(key);
  }
});

test('the pinned bonds form a spanning tree: exactly claimCount - 1 pinned bonds, and removing all non-pinned bonds leaves the graph connected with spatial H1 = 0', () => {
  for (const seed of ['s1', 's2', 's3', 'crucible-daily:2026-08-19']) {
    const t = spawnTangle(seed);
    const pinned = t.bonds.filter((b) => b.state === 'pinned');
    assert.equal(pinned.length, t.claims.length - 1, `seed ${seed}`);
    assert.equal(spatialH1Rank(pinned), 0, `seed ${seed}: pinned-only subgraph must be acyclic`);
  }
});

test('the initial spatial H1 equals exactly the number of exchangeable (non-pinned) bonds added', () => {
  for (const seed of ['s1', 's2', 's3', 'crucible-daily:2026-08-19']) {
    const t = spawnTangle(seed);
    const extra = t.bonds.filter((b) => b.state === 'exchangeable').length;
    assert.equal(spatialH1Rank(t.bonds), extra, `seed ${seed}`);
  }
});

test('claim phi is derived and within [0, 1]', () => {
  const t = spawnTangle('crucible-daily:2026-08-19');
  for (const c of t.claims) {
    assert.ok(c.phi >= 0 && c.phi <= 1);
  }
});

test('withEnergyBudget replaces only the budget field, keeps everything else identical', () => {
  const t = spawnTangle('crucible-daily:2026-08-19');
  const t2 = withEnergyBudget(t, 42);
  assert.equal(t2.energyBudget, 42);
  assert.deepEqual(t2.claims, t.claims);
  assert.deepEqual(t2.bonds, t.bonds);
  assert.equal(t2.freeReserve, t.freeReserve);
});

test('spawnTangle over many seeds always produces a non-empty claim set and non-negative free reserve', () => {
  for (let i = 0; i < 50; i++) {
    const t = spawnTangle(`stress-${i}`);
    assert.ok(t.claims.length > 0);
    assert.ok(t.freeReserve >= 0);
  }
});
