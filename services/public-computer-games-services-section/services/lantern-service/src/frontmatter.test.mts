import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, asList } from './frontmatter.mts';

test('parses scalar and quoted-scalar values', () => {
  const { data } = parseFrontmatter('---\ntitle: atari\ndate-created: 2026-03-09\n---\nbody');
  assert.equal(data['title'], 'atari');
  assert.equal(data['date-created'], '2026-03-09');
});

test('parses a flat list with no indentation on the dash (this corpus\'s "aliases" style)', () => {
  const { data } = parseFrontmatter('---\naliases:\n- atari\n---\n');
  assert.deepEqual(data['aliases'], ['atari']);
});

test('parses a flat list with 2-space indentation on the dash (this corpus\'s "cites" style)', () => {
  const { data } = parseFrontmatter('---\ncites:\n  - "British Go Association, How to Play Go"\n---\n');
  assert.deepEqual(data['cites'], ['British Go Association, How to Play Go']);
});

test('parses an empty flow-sequence list ("tags: []") as an empty array, not the literal string "[]"', () => {
  const { data } = parseFrontmatter('---\ntags: []\n---\n');
  assert.deepEqual(data['tags'], []);
});

test('parses a populated flow-sequence list ("tags: [a, b, c]")', () => {
  const { data } = parseFrontmatter('---\ntags: [weiqi, market-research, platform]\n---\n');
  assert.deepEqual(data['tags'], ['weiqi', 'market-research', 'platform']);
});

test('a value containing a colon is captured whole, not truncated at the first inner colon', () => {
  const { data } = parseFrontmatter("---\ndescription: 'Audience: readers who already understand X.'\n---\n");
  assert.equal(data['description'], 'Audience: readers who already understand X.');
});

test('a nested map block (references:) is recognized and skipped, never mis-parsed as a scalar or list', () => {
  const raw = [
    '---',
    'title: atari',
    'references:',
    '  britgo2026howtoplaygo:',
    '    authors:',
    '    - Britgo2026howtoplaygo',
    '    title: Britgo2026howtoplaygo',
    '  ref1:',
    '    title: British Go Association, How to Play Go',
    'type: term',
    '---',
    'body text',
  ].join('\n');
  const { data, body } = parseFrontmatter(raw);
  assert.equal(data['references'], undefined, 'references should be deliberately unparsed, not present at all');
  assert.equal(data['title'], 'atari');
  assert.equal(data['type'], 'term'); // the field AFTER the nested block must still parse correctly
  assert.equal(body.trim(), 'body text');
});

test('returns the whole input as body, empty data, when there is no frontmatter block', () => {
  const { data, body } = parseFrontmatter('# just a heading\n\nsome text');
  assert.deepEqual(data, {});
  assert.equal(body, '# just a heading\n\nsome text');
});

test('asList coerces scalar, list, and absent values uniformly', () => {
  assert.deepEqual(asList(undefined), []);
  assert.deepEqual(asList('x'), ['x']);
  assert.deepEqual(asList(['x', 'y']), ['x', 'y']);
  assert.deepEqual(asList(''), []);
});

test('round-trips a real corpus-shaped frontmatter block end to end', () => {
  const raw = [
    '---',
    'title: atari',
    'description: "Atari in [weiqi](../topics/weiqi.md) is the state [@britgo2026howtoplaygo]."',
    'aliases:',
    '- atari',
    'date-created: 2026-03-09',
    'tags: []',
    'references:',
    '  ref1:',
    '    title: British Go Association, How to Play Go',
    'type: term',
    'authors:',
    '  - openai-chatgpt-5.4-fast',
    'defines:',
    '  - "atari"',
    'cites:',
    '  - "British Go Association, How to Play Go"',
    '---',
    '',
    'Atari body text.',
  ].join('\n');
  const { data, body } = parseFrontmatter(raw);
  assert.equal(data['title'], 'atari');
  assert.deepEqual(data['aliases'], ['atari']);
  assert.deepEqual(data['defines'], ['atari']);
  assert.deepEqual(data['cites'], ['British Go Association, How to Play Go']);
  assert.equal(data['type'], 'term');
  assert.equal(data['references'], undefined);
  assert.equal(body.trim(), 'Atari body text.');
});
