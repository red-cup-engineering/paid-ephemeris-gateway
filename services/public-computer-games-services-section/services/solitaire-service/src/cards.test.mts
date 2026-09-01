/**
 * `cards.test` — the deck: deterministic shuffling and correct per-variant composition.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUITS, hashSeed, makeDeck, rngFrom, shuffle, shuffledDeck } from './cards.mts';

test('hashSeed is deterministic for the same string', () => {
  assert.equal(hashSeed('hello-world'), hashSeed('hello-world'));
});

test('hashSeed differs across distinct strings (no trivial collisions on close inputs)', () => {
  const values = new Set(['a', 'b', 'seed-1', 'seed-2', 'klondike-draw1:abc', 'klondike-draw1:abd'].map(hashSeed));
  assert.equal(values.size, 6);
});

test('rngFrom is a deterministic, repeatable stream for a given numeric seed', () => {
  const a = rngFrom(42);
  const b = rngFrom(42);
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
});

test('makeDeck(1, 4) is a standard 52-card deck: every suit x rank exactly once', () => {
  const deck = makeDeck(1, 4);
  assert.equal(deck.length, 52);
  const seen = new Set(deck.map((c) => `${c.suit}${c.rank}`));
  assert.equal(seen.size, 52);
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) assert.ok(seen.has(`${suit}${rank}`));
  }
  assert.ok(deck.every((c) => c.faceUp === false));
});

test('makeDeck(2, 1) is 104 cards, all one suit, 8 of each rank', () => {
  const deck = makeDeck(2, 1);
  assert.equal(deck.length, 104);
  assert.ok(deck.every((c) => c.suit === 'C'));
  const counts = new Map<number, number>();
  for (const c of deck) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  for (let rank = 1; rank <= 13; rank++) assert.equal(counts.get(rank), 8);
});

test('makeDeck(2, 2) is 104 cards, two suits, 4 of each rank per suit', () => {
  const deck = makeDeck(2, 2);
  assert.equal(deck.length, 104);
  const suits = new Set(deck.map((c) => c.suit));
  assert.deepEqual([...suits].sort(), ['C', 'D']);
  const counts = new Map<string, number>();
  for (const c of deck) {
    const k = `${c.suit}${c.rank}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const suit of ['C', 'D']) {
    for (let rank = 1; rank <= 13; rank++) assert.equal(counts.get(`${suit}${rank}`), 4);
  }
});

test('shuffle does not mutate its input and preserves the multiset of cards', () => {
  const deck = makeDeck(1, 4);
  const snapshot = deck.map((c) => ({ ...c }));
  const shuffled = shuffle(deck, rngFrom(7));
  assert.deepEqual(deck, snapshot); // input untouched
  const before = deck.map((c) => `${c.suit}${c.rank}`).sort();
  const after = shuffled.map((c) => `${c.suit}${c.rank}`).sort();
  assert.deepEqual(before, after);
});

test('shuffledDeck(seed, ...) is byte-identical across repeated calls and processes', () => {
  const a = shuffledDeck('the-same-seed', 1, 4);
  const b = shuffledDeck('the-same-seed', 1, 4);
  assert.deepEqual(a, b);
});

test('shuffledDeck differs for different seeds', () => {
  const a = shuffledDeck('seed-alpha', 1, 4);
  const b = shuffledDeck('seed-beta', 1, 4);
  assert.notDeepEqual(a, b);
});
