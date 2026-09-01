import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMove } from '@red-cup-engineering/parlor-kernel/board';
import { createChutesBoard, CLASSIC_JUMPS, LADDERS, CHUTES, BOARD_SIZE } from './board.mts';

test('createChutesBoard builds without throwing (jump table satisfies createBoard invariants)', () => {
  const board = createChutesBoard();
  assert.equal(board.size, BOARD_SIZE);
  assert.equal(board.jumps.size, CLASSIC_JUMPS.length);
});

test('9 ladders + 10 chutes, no duplicate "from" nodes, no chained jumps (re-derived independently of createBoard)', () => {
  assert.equal(LADDERS.length, 9);
  assert.equal(CHUTES.length, 10);
  const froms = CLASSIC_JUMPS.map((j) => j.from);
  assert.equal(new Set(froms).size, froms.length, 'every jump.from must be unique');
  const tos = new Set(CLASSIC_JUMPS.map((j) => j.to));
  for (const from of froms) {
    assert.equal(tos.has(from), false, `jump.from ${from} must not itself be a jump.to (chained jump)`);
  }
});

test('every ladder climbs and every chute descends', () => {
  for (const l of LADDERS) assert.ok(l.to > l.from, `ladder ${l.from}->${l.to} must climb`);
  for (const c of CHUTES) assert.ok(c.to < c.from, `chute ${c.from}->${c.to} must descend`);
});

test('a ladder and a chute travel the identical resolveMove code path (kernel property, re-checked here on the real board)', () => {
  const board = createChutesBoard();
  const ladderMove = resolveMove(board, 0, 1); // lands on 1, ladder to 38
  assert.equal(ladderMove.landedAt, 38);
  assert.equal(ladderMove.jumped, true);
  assert.equal(ladderMove.jumpKind, 'ladder');

  const chuteMove = resolveMove(board, 15, 1); // lands on 16, chute to 6
  assert.equal(chuteMove.landedAt, 6);
  assert.equal(chuteMove.jumped, true);
  assert.equal(chuteMove.jumpKind, 'chute');
});

test('landing on the goal exactly (clamped overshoot) finishes the race', () => {
  const board = createChutesBoard();
  const move = resolveMove(board, 96, 6); // would overshoot to 102, clamps to 100
  assert.equal(move.landedAt, 100);
  assert.equal(move.jumped, false);
});
