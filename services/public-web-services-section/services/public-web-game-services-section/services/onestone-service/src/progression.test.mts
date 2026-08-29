import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_LEVELS,
  LEVELS_PER_CHAPTER,
  CHAPTER_TILINGS,
  chapterOf,
  isUnlocked,
  totalStars,
  gardenPieces,
  applyResult,
} from './progression.mts';
import { freshMeta } from './economy.mts';
import type { LevelResult, PlayerMeta } from './types.mts';

const T0 = 1_700_000_000_000;

function result(overrides: Partial<LevelResult> = {}): LevelResult {
  return { levelId: 1, won: true, score: 100, stars: 3, movesLeft: 2, chaosSix: false, ...overrides };
}

test('chapterOf maps the 20-per-chapter ladder onto square/hex/rhombille boundaries', () => {
  assert.equal(chapterOf(1), 0);
  assert.equal(chapterOf(LEVELS_PER_CHAPTER), 0);
  assert.equal(chapterOf(LEVELS_PER_CHAPTER + 1), 1);
  assert.equal(chapterOf(2 * LEVELS_PER_CHAPTER), 1);
  assert.equal(chapterOf(2 * LEVELS_PER_CHAPTER + 1), 2);
  assert.equal(chapterOf(TOTAL_LEVELS), 2);
});

test('isUnlocked reflects the unlocked frontier, inclusive', () => {
  const meta: PlayerMeta = { ...freshMeta(), unlocked: 5 };
  assert.equal(isUnlocked(meta, 1), true);
  assert.equal(isUnlocked(meta, 5), true);
  assert.equal(isUnlocked(meta, 6), false);
});

test('totalStars sums best-ever stars across levels', () => {
  const meta: PlayerMeta = { ...freshMeta(), stars: { 1: 3, 2: 1, 3: 2 } };
  assert.equal(totalStars(meta), 6);
});

test('gardenPieces surfaces meta.garden verbatim', () => {
  const meta: PlayerMeta = { ...freshMeta(), garden: ['square'] };
  assert.deepEqual(gardenPieces(meta), ['square']);
});

// ── applyResult: loss path ───────────────────────────────────────────────────

test('applyResult on a loss only resets the streak — no unlock, stars, reward, or garden change', () => {
  const meta: PlayerMeta = { ...freshMeta(), streak: 4, unlocked: 3, stars: { 1: 2 } };
  const after = applyResult(meta, result({ levelId: 2, won: false, stars: 0 }), T0);
  assert.equal(after.streak, 0);
  assert.equal(after.unlocked, 3);
  assert.deepEqual(after.stars, { 1: 2 });
  assert.deepEqual(after.wallet, meta.wallet);
  assert.deepEqual(after.garden, meta.garden);
});

// ── applyResult: unlock path ─────────────────────────────────────────────────

test('applyResult unlocks the next level id on a win, capped at TOTAL_LEVELS', () => {
  const meta = freshMeta();
  const after = applyResult(meta, result({ levelId: 1, stars: 1 }), T0);
  assert.equal(after.unlocked, 2);

  const capped = applyResult({ ...meta, unlocked: TOTAL_LEVELS }, result({ levelId: TOTAL_LEVELS, stars: 1 }), T0);
  assert.equal(capped.unlocked, TOTAL_LEVELS);
});

test('applyResult never regresses the unlock frontier on a replay of an earlier level', () => {
  const meta: PlayerMeta = { ...freshMeta(), unlocked: 10 };
  const after = applyResult(meta, result({ levelId: 3, stars: 1 }), T0);
  assert.equal(after.unlocked, 10);
});

// ── applyResult: star-max path ───────────────────────────────────────────────

test('applyResult records stars max-wise: a worse replay never overwrites a better clear', () => {
  const meta: PlayerMeta = { ...freshMeta(), stars: { 5: 3 } };
  const after = applyResult(meta, result({ levelId: 5, stars: 1 }), T0);
  assert.equal(after.stars[5], 3);
});

test('applyResult raises stars when a replay does better', () => {
  const meta: PlayerMeta = { ...freshMeta(), stars: { 5: 1 } };
  const after = applyResult(meta, result({ levelId: 5, stars: 3 }), T0);
  assert.equal(after.stars[5], 3);
});

test('the prism reward only lands on a level\'s first 3-star clear, not on a repeat', () => {
  const meta: PlayerMeta = { ...freshMeta(), stars: {} };
  const first = applyResult(meta, result({ levelId: 1, stars: 3 }), T0);
  assert.equal(first.wallet.prisms, 1);
  const second = applyResult(first, result({ levelId: 1, stars: 3, won: true }), T0);
  assert.equal(second.wallet.prisms, 1, 'replaying an already-3-star level must not mint another prism');
});

// ── applyResult: garden-trophy path ──────────────────────────────────────────

test('applyResult mints a chapter\'s garden trophy exactly on the win that clears its last level', () => {
  let meta = freshMeta();
  // Win levels 1..19 of chapter 0 (square) — no trophy yet.
  for (let id = 1; id < LEVELS_PER_CHAPTER; id++) {
    meta = applyResult(meta, result({ levelId: id, stars: 1 }), T0);
  }
  assert.deepEqual(meta.garden, []);

  // The 20th and final level of the chapter mints the trophy.
  meta = applyResult(meta, result({ levelId: LEVELS_PER_CHAPTER, stars: 1 }), T0);
  assert.deepEqual(meta.garden, [CHAPTER_TILINGS[0]]);

  // A subsequent replay of any level in the completed chapter must not mint it again.
  meta = applyResult(meta, result({ levelId: 1, stars: 2 }), T0);
  assert.deepEqual(meta.garden, [CHAPTER_TILINGS[0]]);
});

test('garden trophies accumulate independently per chapter, in completion order', () => {
  let meta = freshMeta();
  for (let id = 1; id <= LEVELS_PER_CHAPTER; id++) {
    meta = applyResult(meta, result({ levelId: id, stars: 1 }), T0);
  }
  assert.deepEqual(meta.garden, ['square']);
  for (let id = LEVELS_PER_CHAPTER + 1; id <= 2 * LEVELS_PER_CHAPTER; id++) {
    meta = applyResult(meta, result({ levelId: id, stars: 1 }), T0);
  }
  assert.deepEqual(meta.garden, ['square', 'hex']);
});

test('completing a chapter out of level order still mints exactly one trophy', () => {
  let meta = freshMeta();
  const ids = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => i + 1).reverse();
  for (const id of ids) meta = applyResult(meta, result({ levelId: id, stars: 1 }), T0);
  assert.deepEqual(meta.garden, ['square']);
});
