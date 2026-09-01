import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractEquivoExercises } from '../extract.mts';
import type { Room } from '../../../src/types.mts';

function room(body: string, id = 'unit-1-the-descent/test.md'): Room {
  return { id, wingId: 'equivo', title: 'Test', aliases: [], kind: 'lesson', body, frontmatter: {} };
}

test('a room with zero equivo-exercise blocks produces zero exercises', () => {
  const r = room('Just prose, no fenced blocks here.');
  assert.deepEqual(extractEquivoExercises(r), []);
});

test('a single-object fenced block produces one exercise, spec excludes kind/prompt', () => {
  const r = room([
    '```equivo-exercise',
    JSON.stringify({ kind: 'measure', prompt: 'Charge it.', utterance: ['a', 'b'] }),
    '```',
  ].join('\n'));
  const out = extractEquivoExercises(r);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.kind, 'measure');
  assert.equal(out[0]?.prompt, 'Charge it.');
  assert.deepEqual(out[0]?.spec, { utterance: ['a', 'b'] });
  assert.equal(out[0]?.id, 'unit-1-the-descent/test.md#measure#0');
});

test('a JSON-array fenced block produces multiple exercises, per-kind index increments', () => {
  const specs = [
    { kind: 'measure', prompt: 'One.', utterance: ['a', 'b'] },
    { kind: 'measure', prompt: 'Two.', utterance: ['c', 'd'] },
    { kind: 'distinguish', prompt: 'Three.', utterance: ['e', 'f'] },
  ];
  const r = room(['```equivo-exercise', JSON.stringify(specs), '```'].join('\n'));
  const out = extractEquivoExercises(r);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((e) => e.id), [
    'unit-1-the-descent/test.md#measure#0',
    'unit-1-the-descent/test.md#measure#1',
    'unit-1-the-descent/test.md#distinguish#0',
  ]);
});

test('multiple fenced blocks in one body all contribute, indices keep incrementing across blocks', () => {
  const block1 = ['```equivo-exercise', JSON.stringify({ kind: 'settle', prompt: 'A.', cells: [{ subject: 'x', predicate: 'p', object: 'y' }] }), '```'].join('\n');
  const block2 = ['```equivo-exercise', JSON.stringify({ kind: 'settle', prompt: 'B.', cells: [{ subject: 'y', predicate: 'p', object: 'z' }] }), '```'].join('\n');
  const r = room(`prose\n${block1}\nmore prose\n${block2}\n`);
  const out = extractEquivoExercises(r);
  assert.deepEqual(out.map((e) => e.id), ['unit-1-the-descent/test.md#settle#0', 'unit-1-the-descent/test.md#settle#1']);
});

test('invalid JSON in a fence throws, naming the room -- a build failure, not a silent drop', () => {
  const r = room(['```equivo-exercise', '{ not valid json', '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /invalid JSON/);
});

test('missing kind throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ prompt: 'no kind' }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /missing or unknown "kind"/);
});

test('unknown kind throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'not-a-real-kind', prompt: 'x' }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /missing or unknown "kind"/);
});

test('missing prompt throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'measure', utterance: ['a', 'b'] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /no non-empty "prompt"/);
});

test('measure/distinguish/relate without a 2-element utterance throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'measure', prompt: 'x', utterance: ['only-one'] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /requires a 2-element "utterance"/);
});

test('settle without a non-empty cells array throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'settle', prompt: 'x', cells: [] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /requires a non-empty "cells"/);
});

test('settle with a malformed cell (missing object) throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'settle', prompt: 'x', cells: [{ subject: 'a', predicate: 'p' }] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /every cell needs subject\/predicate\/object/);
});

test('observe without a non-empty stages array throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'observe', prompt: 'x', stages: [] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /requires a non-empty "stages"/);
});

test('observe with a stage missing "designated" throws', () => {
  const r = room(['```equivo-exercise', JSON.stringify({ kind: 'observe', prompt: 'x', stages: [{ limit: true }] }), '```'].join('\n'));
  assert.throws(() => extractEquivoExercises(r), /every stage needs a "designated" array/);
});

test('a valid observe spec with opts.cofinal round-trips into spec verbatim', () => {
  const spec = { kind: 'observe', prompt: 'Classify.', stages: [{ designated: ['a'] }, { designated: ['a', 'b'], limit: true }], opts: { cofinal: 'uncountable' } };
  const r = room(['```equivo-exercise', JSON.stringify(spec), '```'].join('\n'));
  const out = extractEquivoExercises(r);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0]?.spec, { stages: spec.stages, opts: spec.opts });
});
