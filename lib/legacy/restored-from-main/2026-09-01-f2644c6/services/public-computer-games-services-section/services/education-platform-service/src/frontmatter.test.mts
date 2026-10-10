import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, asList } from './frontmatter.mts';

test('no frontmatter block: data empty, body is the whole input', () => {
  const { data, body } = parseFrontmatter('# Just a heading\n\nbody text\n');
  assert.deepEqual(data, {});
  assert.equal(body, '# Just a heading\n\nbody text\n');
});

test('scalar fields, quoted and unquoted', () => {
  const raw = '---\ntitle: Hello World\ndescription: "A quoted value"\n---\nbody\n';
  const { data, body } = parseFrontmatter(raw);
  assert.equal(data.title, 'Hello World');
  assert.equal(data.description, 'A quoted value');
  assert.equal(body, 'body\n');
});

test('block list and flow list', () => {
  const raw = '---\nrequires:\n  - a.md\n  - b.md\ntags: [foo, bar]\nempty: []\n---\nbody\n';
  const { data } = parseFrontmatter(raw);
  assert.deepEqual(data.requires, ['a.md', 'b.md']);
  assert.deepEqual(data.tags, ['foo', 'bar']);
  assert.deepEqual(data.empty, []);
});

test('nested map is recognized and skipped, never mis-parsed', () => {
  const raw = '---\ntitle: X\nreferences:\n  citation: something\n  nested: true\ntags: [a]\n---\nbody\n';
  const { data } = parseFrontmatter(raw);
  assert.equal(data.title, 'X');
  assert.equal(data.references, undefined);
  assert.deepEqual(data.tags, ['a']);
});

test('asList coerces scalar/list/undefined uniformly', () => {
  assert.deepEqual(asList(undefined), []);
  assert.deepEqual(asList('x'), ['x']);
  assert.deepEqual(asList(''), []);
  assert.deepEqual(asList(['x', '', 'y']), ['x', 'y']);
});

test('malformed stray lines are defensively skipped, never crash', () => {
  const raw = '---\n:::not a key line:::\ntitle: OK\n---\nbody\n';
  const { data } = parseFrontmatter(raw);
  assert.equal(data.title, 'OK');
});
