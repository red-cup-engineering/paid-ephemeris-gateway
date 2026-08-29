import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed, makeRng } from './seed.mts';

test('hashSeed is deterministic for the same string', () => {
  assert.equal(hashSeed('crucible-daily:2026-08-19'), hashSeed('crucible-daily:2026-08-19'));
});

test('hashSeed differs for different strings (no trivial collision on adjacent days)', () => {
  assert.notEqual(hashSeed('crucible-daily:2026-08-19'), hashSeed('crucible-daily:2026-08-20'));
});

test('hashSeed always returns an unsigned 32-bit integer', () => {
  for (const s of ['', 'a', 'crucible-daily:2026-08-19', 'x'.repeat(500)]) {
    const h = hashSeed(s);
    assert.ok(Number.isInteger(h));
    assert.ok(h >= 0 && h <= 0xffffffff);
  }
});

test('makeRng produces the same stream for the same seed', () => {
  const a = makeRng('seed-a');
  const b = makeRng('seed-a');
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('makeRng produces different streams for different seeds', () => {
  const a = makeRng('seed-a');
  const b = makeRng('seed-b');
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('Rng.next stays within [0, 1)', () => {
  const r = makeRng('bounds');
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
  }
});

test('Rng.int is inclusive on both ends and never exceeds them', () => {
  const r = makeRng('int-bounds');
  const seen = new Set<number>();
  for (let i = 0; i < 500; i++) {
    const v = r.int(3, 5);
    assert.ok(v >= 3 && v <= 5);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});

test('Rng.pick returns undefined for an empty list', () => {
  const r = makeRng('pick-empty');
  assert.equal(r.pick([]), undefined);
});

test('Rng.shuffle does not mutate the input and returns a permutation', () => {
  const r = makeRng('shuffle');
  const input = [1, 2, 3, 4, 5];
  const frozen = [...input];
  const out = r.shuffle(input);
  assert.deepEqual(input, frozen);
  assert.deepEqual([...out].sort(), frozen);
});

test('Rng.shuffle is deterministic given the same seed', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = makeRng('shuffle-det').shuffle(items);
  const b = makeRng('shuffle-det').shuffle(items);
  assert.deepEqual(a, b);
});
