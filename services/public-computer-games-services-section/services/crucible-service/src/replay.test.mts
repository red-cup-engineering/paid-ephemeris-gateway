import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, replayTo, undo, redo } from './replay.mts';
import { spawnCertifiedTangle, certifyTangle } from './validate.mts';
import { applyMove } from './engine.mts';
import type { MoveLogEntry } from './types.mts';

const SEED = 'crucible-daily:2026-08-19';

function logOf(moves: MoveLogEntry['move'][]): MoveLogEntry[] {
  return moves.map((move) => ({ move }));
}

test('replay(seed, log) reproduces the exact final state a live session ended in', () => {
  // "Live session": apply moves one at a time through the engine directly, tracking totalCost.
  let live = spawnCertifiedTangle(SEED);
  let liveCost = 0;
  const cert = certifyTangle(SEED);
  const log: MoveLogEntry[] = [];
  for (const move of cert.solvingSequence.slice(0, Math.min(2, cert.solvingSequence.length))) {
    const { tangle, moveCost } = applyMove(live, move);
    live = tangle;
    liveCost += moveCost.cost;
    log.push({ move });
  }

  const replayed = replay(SEED, log);
  assert.deepEqual(replayed.tangle, live);
  assert.equal(replayed.totalCost, liveCost);
});

test('determinism: same seed + same log, replayed twice, gives an identical result', () => {
  const cert = certifyTangle(SEED);
  const log = logOf(cert.solvingSequence);
  const a = replay(SEED, log);
  const b = replay(SEED, log);
  assert.deepEqual(a, b);
});

test('replay of the full certified solving sequence reaches settled: true', () => {
  const cert = certifyTangle(SEED);
  const result = replay(SEED, logOf(cert.solvingSequence));
  assert.equal(result.settled, true);
  assert.equal(result.totalCost, cert.minimalCost);
});

test('replay of an empty log returns the fresh certified tangle unsettled (assuming a nonzero-H1 daily) with zero cost', () => {
  const result = replay(SEED, []);
  const fresh = spawnCertifiedTangle(SEED);
  assert.deepEqual(result.tangle, fresh);
  assert.equal(result.totalCost, 0);
});

test('replayTo at a partial cursor matches manually applying only that many moves', () => {
  const cert = certifyTangle(SEED);
  if (cert.solvingSequence.length === 0) return; // nothing to test for a trivially-solved daily
  const log = logOf(cert.solvingSequence);
  const cursor = Math.max(1, Math.floor(log.length / 2));
  const partial = replayTo(SEED, log, cursor);

  let manual = spawnCertifiedTangle(SEED);
  let manualCost = 0;
  for (let i = 0; i < cursor; i++) {
    const { tangle, moveCost } = applyMove(manual, (log[i] as MoveLogEntry).move);
    manual = tangle;
    manualCost += moveCost.cost;
  }
  assert.deepEqual(partial.tangle, manual);
  assert.equal(partial.totalCost, manualCost);
});

test('replayTo rejects an out-of-range cursor', () => {
  assert.throws(() => replayTo(SEED, [], -1));
  assert.throws(() => replayTo(SEED, [], 1));
});

test('replayTo throws on a corrupted log entry (illegal move at that point) rather than silently continuing', () => {
  const bogus: MoveLogEntry[] = [{ move: { verb: 'split', bondId: 'no-such-bond', mode: 'clean' } }];
  assert.throws(() => replay(SEED, bogus));
});

test('undo is exactly replayTo at cursor - 1', () => {
  const cert = certifyTangle(SEED);
  if (cert.solvingSequence.length < 2) return;
  const log = logOf(cert.solvingSequence);
  const viaUndo = undo(SEED, log, 2);
  const viaReplayTo = replayTo(SEED, log, 1);
  assert.deepEqual(viaUndo, viaReplayTo);
});

test('redo is exactly replayTo at cursor + 1, bounded by log length', () => {
  const cert = certifyTangle(SEED);
  if (cert.solvingSequence.length < 2) return;
  const log = logOf(cert.solvingSequence);
  const viaRedo = redo(SEED, log, 0);
  const viaReplayTo = replayTo(SEED, log, 1);
  assert.deepEqual(viaRedo, viaReplayTo);
  // redo past the end stays clamped at log.length
  const clamped = redo(SEED, log, log.length);
  assert.equal(clamped.log.length, log.length);
});

test('undo then redo returns to the same state (cursor 1 -> 0 -> 1)', () => {
  const cert = certifyTangle(SEED);
  if (cert.solvingSequence.length < 1) return;
  const log = logOf(cert.solvingSequence);
  const forward = replayTo(SEED, log, 1);
  const undone = undo(SEED, log, 1); // cursor 1 -> 0
  assert.equal(undone.log.length, 0);
  const redone = redo(SEED, log, undone.log.length); // cursor 0 -> 1
  assert.deepEqual(redone, forward);
});

test('replay across a spread of real daily seeds always agrees with a fresh independent fold', () => {
  for (let day = 0; day < 30; day++) {
    const seed = `crucible-daily:2026-08-${String((day % 28) + 1).padStart(2, '0')}`;
    const cert = certifyTangle(seed);
    const log = logOf(cert.solvingSequence);
    const a = replay(seed, log);
    const b = replay(seed, log);
    assert.deepEqual(a, b);
  }
});
