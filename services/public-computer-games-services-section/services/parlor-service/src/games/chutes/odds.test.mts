import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard } from '@red-cup-engineering/parlor-kernel/board';
import { createChutesBoard, BOARD_SIZE } from './board.mts';
import { finishTurnDistribution, expectedTurnsToFinish } from './odds.mts';

test('a player already on the goal has a degenerate zero-turn distribution', () => {
  const board = createChutesBoard();
  const dist = finishTurnDistribution(board, BOARD_SIZE);
  assert.deepEqual(dist.turns, [{ turn: 0, probability: 1 }]);
  assert.equal(dist.truncatedTail, 0);
});

test('hand-derived exact case, no jumps: size=2 board, 2-sided die', () => {
  // From 0: face 1 -> pos 1 (not finished). face 2 -> steps=2, clamped to pos 2 = goal, in 1 turn.
  // From 1 (reached after face 1): ANY face finishes next turn (clamped at size=2).
  // So P(finish turn 1) = 1/2, P(finish turn 2) = 1/2, exactly.
  const board = createBoard(2, []);
  const dist = finishTurnDistribution(board, 0, { dieSides: 2, maxTurns: 10 });
  assert.equal(dist.turns.length <= 10, true);
  const t1 = dist.turns.find((t) => t.turn === 1).probability;
  const t2 = dist.turns.find((t) => t.turn === 2).probability;
  assert.ok(Math.abs(t1 - 0.5) < 1e-12, `turn 1 should be exactly 0.5, got ${t1}`);
  assert.ok(Math.abs(t2 - 0.5) < 1e-12, `turn 2 should be exactly 0.5, got ${t2}`);
  assert.ok(dist.truncatedTail < 1e-12);
});

test('hand-derived exact case, no jumps: size=3 board, 2-sided die (three-turn closed form)', () => {
  // From 0: face1 -> 1, face2 -> 2 (both not finished; turn 1 finish prob = 0).
  // From 1: face1 -> 2, face2 -> 3 (finish). From 2: any face -> 3 (finish, clamped).
  // P(turn1)=0. P(turn2) = P(at 1)*P(face2) + P(at 2)*1 = 0.5*0.5 + 0.5*1 = 0.75.
  // Remaining mass 0.25 (path 0->1->2) finishes turn 3 for sure. P(turn3) = 0.25.
  const board = createBoard(3, []);
  const dist = finishTurnDistribution(board, 0, { dieSides: 2, maxTurns: 10 });
  const p = (k) => dist.turns.find((t) => t.turn === k).probability;
  assert.ok(Math.abs(p(1) - 0) < 1e-12);
  assert.ok(Math.abs(p(2) - 0.75) < 1e-9);
  assert.ok(Math.abs(p(3) - 0.25) < 1e-9);
  assert.ok(dist.truncatedTail < 1e-12);
});

test('a chute changes the exact distribution — proves jumps are honored inside the multi-turn walk, not just single moves', () => {
  // Same size=3, 2-sided-die board as above, but node 2 now chutes back to 0.
  // From 0: face1 -> 1 (unaffected by the chute). face2 -> steps 2, lands on 2, chute -> 0.
  // Turn 1 finish prob = 0 either way (neither face reaches the goal directly).
  // From 1: face1 -> 2, chute -> 0 (looped back). face2 -> 3 (finish).
  //   So of the 0.5 mass sitting at node 1 after turn 1, only the face2 half (0.25) finishes on
  //   turn 2 (the "no chute" version had BOTH branches from node 2 finish, giving 0.75 at turn 2
  //   — this is the differential proof the chute is actually applied inside the walk).
  const board = createBoard(3, [{ from: 2, to: 0 }]);
  const dist = finishTurnDistribution(board, 0, { dieSides: 2, maxTurns: 200 });
  const p = (k) => dist.turns.find((t) => t.turn === k)?.probability ?? 0;
  assert.ok(Math.abs(p(1) - 0) < 1e-12);
  assert.ok(Math.abs(p(2) - 0.25) < 1e-9, `turn 2 should be exactly 0.25 with the chute, got ${p(2)}`);
  // Total probability (resolved + truncated tail) must still sum to 1 — the chute creates an
  // infinite-in-principle, geometrically-decaying chain (each full loop back to 0 halves the
  // remaining mass roughly every two turns), so "negligible" here means "far below anything a
  // UI would round to a nonzero digit," not "exactly zero" at any finite maxTurns.
  const resolved = dist.turns.reduce((sum, t) => sum + t.probability, 0);
  assert.ok(Math.abs(resolved + dist.truncatedTail - 1) < 1e-9);
  assert.ok(dist.truncatedTail < 1e-3, `truncated tail should be negligible by turn 200, got ${dist.truncatedTail}`);
});

test('every distribution sums to (resolved + truncatedTail) === 1 on the real classic board', () => {
  const board = createChutesBoard();
  for (const start of [0, 1, 16, 50, 80, 99]) {
    const dist = finishTurnDistribution(board, start, { maxTurns: 300 });
    const resolved = dist.turns.reduce((sum, t) => sum + t.probability, 0);
    assert.ok(Math.abs(resolved + dist.truncatedTail - 1) < 1e-9, `start=${start}: resolved=${resolved} tail=${dist.truncatedTail}`);
    assert.ok(dist.truncatedTail < 1e-3, `start=${start}: tail should be negligible (<0.1%) by turn 300, got ${dist.truncatedTail}`);
  }
});

test('expectedTurnsToFinish is closer to the goal from a position nearer the goal', () => {
  const board = createChutesBoard();
  const near = expectedTurnsToFinish(finishTurnDistribution(board, 95, { maxTurns: 300 }));
  const far = expectedTurnsToFinish(finishTurnDistribution(board, 5, { maxTurns: 300 }));
  assert.ok(near < far, `expected turns from 95 (${near}) should be less than from 5 (${far})`);
});

test('finishTurnDistribution rejects an out-of-range position', () => {
  const board = createChutesBoard();
  assert.throws(() => finishTurnDistribution(board, -1), RangeError);
  assert.throws(() => finishTurnDistribution(board, 101), RangeError);
});
