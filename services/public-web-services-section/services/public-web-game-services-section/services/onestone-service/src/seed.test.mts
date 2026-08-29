import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed, makeRng } from './seed.mts';

test('hashSeed is deterministic for the same text', () => {
  assert.equal(hashSeed('level-1'), hashSeed('level-1'));
});

test('hashSeed distinguishes different text', () => {
  assert.notEqual(hashSeed('level-1'), hashSeed('level-2'));
});

test('hashSeed returns an unsigned 32-bit integer', () => {
  const h = hashSeed('anything at all');
  assert.ok(Number.isInteger(h));
  assert.ok(h >= 0 && h <= 0xffffffff);
});

test('makeRng with the same seed string produces identical streams', () => {
  const a = makeRng('board:square:1');
  const b = makeRng('board:square:1');
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('makeRng with different seeds diverges', () => {
  const a = makeRng('board:square:1');
  const b = makeRng('board:square:2');
  assert.notEqual(a.next(), b.next());
});

test('next() stays within [0, 1)', () => {
  const rng = makeRng('range-check');
  for (let i = 0; i < 500; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
  }
});

test('int(min, max) is inclusive on both ends and never escapes the range', () => {
  const rng = makeRng('int-check');
  let sawMin = false;
  let sawMax = false;
  for (let i = 0; i < 2000; i++) {
    const v = rng.int(0, 2);
    assert.ok(v >= 0 && v <= 2);
    assert.ok(Number.isInteger(v));
    if (v === 0) sawMin = true;
    if (v === 2) sawMax = true;
  }
  assert.ok(sawMin && sawMax);
});

test('range(min, max) stays within [min, max)', () => {
  const rng = makeRng('range2-check');
  for (let i = 0; i < 500; i++) {
    const v = rng.range(5, 10);
    assert.ok(v >= 5 && v < 10);
  }
});

test('pick returns undefined for an empty list and an element otherwise', () => {
  const rng = makeRng('pick-check');
  assert.equal(rng.pick([]), undefined);
  const items = ['a', 'b', 'c'];
  const picked = rng.pick(items);
  assert.ok(picked !== undefined && items.includes(picked));
});

test('chance(0) is always false and chance(1) is always true', () => {
  const rng = makeRng('chance-check');
  for (let i = 0; i < 50; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
});

test('shuffle is deterministic for the same seed', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = makeRng('shuffle-check').shuffle(items);
  const b = makeRng('shuffle-check').shuffle(items);
  assert.deepEqual(a, b);
});

test('shuffle does not mutate its input array', () => {
  const items = [1, 2, 3, 4, 5] as const;
  const before = items.slice();
  makeRng('mutate-check').shuffle(items);
  assert.deepEqual(items.slice(), before);
});

test('shuffle is a permutation: same multiset, same length', () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  const shuffled = makeRng('perm-check').shuffle(items);
  assert.equal(shuffled.length, items.length);
  assert.deepEqual(
    shuffled.slice().sort((x, y) => x - y),
    items.slice().sort((x, y) => x - y),
  );
});

test('shuffle actually reorders a nontrivial array (seed exercised, not identity)', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const shuffled = makeRng('reorder-check').shuffle(items);
  assert.notDeepEqual(shuffled, items);
});

test('shuffle of an empty or single-element array is stable', () => {
  const rng = makeRng('edge-check');
  assert.deepEqual(rng.shuffle([]), []);
  assert.deepEqual(rng.shuffle([42]), [42]);
});

test('different seeds produce different rng streams end to end (board vs board)', () => {
  // Sanity check mirroring how levels.mts / engine.mts will actually derive per-board and
  // per-salt streams: distinct seed strings must not collide in practice.
  const seeds = ['sq-1', 'sq-1#1', 'sq-1#2', 'hex-1', 'rhombille-1'];
  const firsts = seeds.map((s) => makeRng(s).next());
  const unique = new Set(firsts);
  assert.equal(unique.size, seeds.length);
});
