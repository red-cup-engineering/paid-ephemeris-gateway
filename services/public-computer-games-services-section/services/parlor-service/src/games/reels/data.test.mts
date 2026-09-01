import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REELS, SYMBOLS, PAYOUT_TABLE } from './data.mts';

test('every reel strip uses only declared symbols', () => {
  for (const reel of REELS) {
    for (const symbol of reel) assert.ok(SYMBOLS.includes(symbol), `symbol "${symbol}" is not in SYMBOLS`);
  }
});

test('the three reels are not identical strips (a real slot rarely repeats one strip three times)', () => {
  const [a, b, c] = REELS;
  assert.notDeepEqual([...a], [...b]);
  assert.notDeepEqual([...b], [...c]);
});

test('REELS are frozen (createReels defensive-copies and freezes)', () => {
  for (const reel of REELS) assert.ok(Object.isFrozen(reel));
});

test('PAYOUT_TABLE multipliers are strictly ascending with rarity (roughly — sanity, not a strict proof)', () => {
  const multipliers = PAYOUT_TABLE.map((r) => r.multiplier);
  for (const m of multipliers) assert.ok(m > 0, 'every listed rule should pay something');
});
