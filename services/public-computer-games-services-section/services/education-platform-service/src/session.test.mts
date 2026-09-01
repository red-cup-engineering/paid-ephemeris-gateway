import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, seededShuffle, buildGateSession, buildReviewSession } from './session.mts';
import type { GateExercise } from './checker.mts';

function ex(roomId: string, index: number): GateExercise {
  return {
    id: `${roomId}#echo#${index}`,
    roomId,
    kind: 'echo',
    spec: index,
    prompt: `p${index}`,
    checker: (s, a) => ({ pass: s === a, diagnosis: '' }),
  };
}

test('mulberry32 is deterministic: same seed produces the same sequence every time', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test('mulberry32 produces values in [0, 1)', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 50; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('different seeds produce different sequences (not a constant generator)', () => {
  const a = mulberry32(1)();
  const b = mulberry32(2)();
  assert.notEqual(a, b);
});

test('seededShuffle does not mutate its input', () => {
  const items = [1, 2, 3, 4, 5];
  const copy = items.slice();
  seededShuffle(items, 7);
  assert.deepEqual(items, copy);
});

test('seededShuffle is a permutation: same elements, same length', () => {
  const items = [1, 2, 3, 4, 5];
  const shuffled = seededShuffle(items, 7);
  assert.equal(shuffled.length, items.length);
  assert.deepEqual([...shuffled].sort(), [...items].sort());
});

test('buildGateSession is deterministic given the same seed', () => {
  const exercises = [ex('r', 0), ex('r', 1), ex('r', 2), ex('other', 0)];
  const s1 = buildGateSession('r', exercises, 99);
  const s2 = buildGateSession('r', exercises, 99);
  assert.deepEqual(s1.map((e) => e.id), s2.map((e) => e.id));
  assert.equal(s1.length, 3); // filters to the requested room only
});

test('buildGateSession with different seeds can (and generally does) produce different orders', () => {
  const exercises = [ex('r', 0), ex('r', 1), ex('r', 2), ex('r', 3), ex('r', 4)];
  const s1 = buildGateSession('r', exercises, 1).map((e) => e.id);
  const s2 = buildGateSession('r', exercises, 2).map((e) => e.id);
  assert.notDeepEqual(s1, s2);
});

test('buildReviewSession orders weakest-recall-first and excludes never-reviewed exercises', () => {
  const strong = { exercise: ex('a', 0), stability: 1000, lastReviewedAt: 0 };
  const weak = { exercise: ex('b', 0), stability: 0.001, lastReviewedAt: 0 };
  const neverReviewed = { exercise: ex('c', 0), stability: 5 }; // lastReviewedAt absent
  const session = buildReviewSession([strong, weak, neverReviewed], 100, 1);
  assert.equal(session.length, 2);
  assert.equal(session[0]?.exercise.roomId, 'b'); // weakest first
  assert.equal(session[1]?.exercise.roomId, 'a');
});

test('buildReviewSession respects an explicit limit deterministically', () => {
  const candidates = Array.from({ length: 10 }, (_, i) => ({ exercise: ex('r', i), stability: 5, lastReviewedAt: 0 }));
  const s1 = buildReviewSession(candidates, 10, 3, 4);
  const s2 = buildReviewSession(candidates, 10, 3, 4);
  assert.equal(s1.length, 4);
  assert.deepEqual(s1.map((c) => c.exercise.id), s2.map((c) => c.exercise.id));
});
