/**
 * A scripted, deterministic playthrough through `kernel.mjs` — the same door the browser uses —
 * asserting the engine stays internally consistent at every step, with no HTTP server or browser
 * needed (solitaire-service's `smoke.test.mts` pattern: `kernel.mjs`'s re-exports load fine
 * under plain `node --test` too, since it is nothing but `export * from '../../src/*.mts'`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailySeed, spawnCertifiedTangle, legalMoves, applyMove, isSettled, certifyTangle, replay,
} from '../js/kernel.mjs';

test('kernel.mjs re-exports load and produce the same tangle as importing src/*.mts directly', async () => {
  const direct = await import('../../src/tangle.mts');
  const seed = 'crucible-daily:2026-08-19';
  assert.deepEqual(spawnCertifiedTangle(seed), await (await import('../../src/validate.mts')).spawnCertifiedTangle(seed));
  assert.deepEqual(direct.spawnTangle(seed).claims, spawnCertifiedTangle(seed).claims);
});

test('scripted playthrough: greedily apply legal moves through the kernel until settled, staying consistent at every step', () => {
  const seed = dailySeed('2026-08-19');
  let tangle = spawnCertifiedTangle(seed);
  const log = [];
  let totalCost = 0;
  let steps = 0;
  const maxSteps = 200;

  while (!isSettled(tangle) && steps < maxSteps) {
    const moves = legalMoves(tangle);
    assert.ok(moves.length > 0, `stuck at step ${steps} with an unsettled tangle and no legal moves`);
    // Deterministic choice: prefer a clean SPLIT (the cheapest resolving move), else the first
    // legal move — this is a scripted playthrough, not a solver; it only has to terminate.
    const move = moves.find((m) => m.verb === 'split' && m.mode === 'clean') ?? moves[0];
    const { tangle: next, moveCost } = applyMove(tangle, move);
    tangle = next;
    totalCost += moveCost.cost;
    log.push({ move });
    steps++;

    // Consistency check every step: the running total matches what replay recomputes fresh.
    const replayed = replay(seed, log);
    assert.deepEqual(replayed.tangle, tangle);
    assert.equal(replayed.totalCost, totalCost);
  }

  assert.ok(isSettled(tangle), `did not settle within ${maxSteps} steps`);
  assert.ok(steps > 0);
});

test('certifyTangle via the kernel door matches certifyTangle via the direct src import', async () => {
  const direct = await import('../../src/validate.mts');
  const seed = 'crucible-daily:2026-08-20';
  assert.deepEqual(certifyTangle(seed), direct.certifyTangle(seed));
});

test('30-day sweep: every daily tangle resolved through the kernel settles', () => {
  for (let day = 1; day <= 30; day++) {
    const seed = dailySeed(`2026-08-${String(day).padStart(2, '0')}`);
    const cert = certifyTangle(seed);
    const result = replay(seed, cert.solvingSequence.map((move) => ({ move })));
    assert.equal(result.settled, true, `seed ${seed} did not settle via its certified sequence`);
  }
});
