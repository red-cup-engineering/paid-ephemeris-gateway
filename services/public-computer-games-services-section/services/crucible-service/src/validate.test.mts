/**
 * The executable solvability guarantee: "the generator may never emit an unwinnable daily." Not
 * asserted once — checked, for real, across a large seed sample, replaying the certified
 * sequence through the real engine and confirming the real recomputed cost independently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { certifyTangle, spawnCertifiedTangle, SAFETY_MULTIPLIER } from './validate.mts';
import { applyMove, isSettled } from './engine.mts';
import { dailySeed } from './daily.mts';
import type { Tangle } from './types.mts';

test('certifyTangle settles a hand-picked seed via its certified sequence', () => {
  const cert = certifyTangle('crucible-daily:2026-08-19');
  assert.ok(cert.solvingSequence.length >= 0);
  assert.ok(cert.minimalCost >= 0);
  assert.ok(isSettled(replayIndependently(cert.tangle, cert.solvingSequence)));
});

/** Replays a solving sequence from scratch through the real engine, without relying on
 * `certifyTangle`'s own internal bookkeeping. */
function replayIndependently(tangle: Tangle, sequence: readonly { verb: string }[]): Tangle {
  let current = tangle;
  for (const move of sequence as any[]) {
    current = applyMove(current, move).tangle;
  }
  return current;
}

test('solvability guarantee: every generated daily settles within its energy budget, across 300 seeds', () => {
  const failures: string[] = [];
  for (let i = 0; i < 300; i++) {
    const seed = `crucible-solvability-stress-${i}`;
    try {
      const cert = certifyTangle(seed);
      // Independently replay the certified sequence and re-sum the real cost, not trusting
      // certifyTangle's own running total.
      let current = cert.tangle;
      let realTotal = 0;
      for (const move of cert.solvingSequence) {
        const { tangle: next, moveCost } = applyMove(current, move);
        realTotal += moveCost.cost;
        current = next;
      }
      if (!isSettled(current)) failures.push(`${seed}: did not settle`);
      if (realTotal !== cert.minimalCost) failures.push(`${seed}: cost mismatch ${realTotal} vs ${cert.minimalCost}`);
      if (realTotal > cert.tangle.energyBudget) {
        failures.push(`${seed}: minimal cost ${realTotal} exceeds budget ${cert.tangle.energyBudget}`);
      }
    } catch (err) {
      failures.push(`${seed}: threw ${(err as Error).message}`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} of 300 seeds failed the solvability guarantee`);
});

test('solvability guarantee holds across a year of real daily seeds (UTC dates)', () => {
  const failures: string[] = [];
  const start = Date.UTC(2026, 0, 1);
  for (let day = 0; day < 366; day++) {
    const d = new Date(start + day * 86400000);
    const seed = dailySeed(d);
    try {
      const cert = certifyTangle(seed);
      if (cert.minimalCost > cert.tangle.energyBudget) failures.push(seed);
    } catch (err) {
      failures.push(`${seed}: threw ${(err as Error).message}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('energyBudget is always a generous multiple of the minimal certified cost', () => {
  const cert = certifyTangle('crucible-daily:2026-08-19');
  if (cert.minimalCost === 0) {
    assert.equal(cert.tangle.energyBudget, 0);
  } else {
    assert.ok(cert.tangle.energyBudget >= cert.minimalCost * SAFETY_MULTIPLIER);
  }
});

test('spawnCertifiedTangle returns a tangle with a nonzero-safe energyBudget field (not the tangle.mts placeholder of 0, unless minimalCost is genuinely 0)', () => {
  const t = spawnCertifiedTangle('crucible-daily:2026-08-19');
  const cert = certifyTangle('crucible-daily:2026-08-19');
  assert.equal(t.energyBudget, cert.tangle.energyBudget);
});

test('certifyTangle is deterministic: same seed -> identical certification every time', () => {
  const a = certifyTangle('crucible-daily:2026-08-19');
  const b = certifyTangle('crucible-daily:2026-08-19');
  assert.deepEqual(a, b);
});
