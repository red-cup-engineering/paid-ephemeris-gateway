import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashState } from '@red-cup-engineering/cartridge/replay';
import { replay } from './replay.mts';
import { createEngine, applyIntent, currentOffer } from './engine.mts';
import type { WagerIntent } from './types.mts';

const SEED = 'replay-test-seed';
const CONFIG = 'novice';

/** Play a full, legal day's worth of intents (small fixed stakes throughout) and return the log. */
function buildPlayableLog(seed: string, configId: string): WagerIntent[] {
  let state = createEngine(seed, configId);
  const log: WagerIntent[] = [];
  while (!state.finished) {
    const offer = currentOffer(state);
    if (offer === undefined) break;
    const adjust: WagerIntent = { kind: 'adjust-stake', fraction: 0.05 };
    state = applyIntent(state, adjust).state;
    log.push(adjust);
    const commit: WagerIntent = { kind: 'commit-stake' };
    state = applyIntent(state, commit).state;
    log.push(commit);
  }
  return log;
}

test('replay determinism: same seed + same intent log twice yields identical finalState and stateHash', () => {
  const log = buildPlayableLog(SEED, CONFIG);
  assert.ok(log.length > 0);
  const r1 = replay(SEED, log, CONFIG);
  const r2 = replay(SEED, log, CONFIG);
  assert.equal(r1.valid, true);
  assert.deepEqual(r1.finalState, r2.finalState);
  assert.equal(r1.stateHash, r2.stateHash);
  assert.equal(r1.stateHash, hashState(r1.finalState));
  const r3 = replay('a-completely-different-seed', log, CONFIG);
  assert.notEqual(r3.stateHash, r1.stateHash, 'a different seed must produce a different offer sequence and outcomes');
});

test('replay across dozens of independently generated (seed, log) pairs always round-trips to a valid, self-consistent result', () => {
  for (let i = 0; i < 40; i++) {
    const seed = `property-seed-${i}`;
    const configId = i % 2 === 0 ? 'novice' : 'sharp';
    const log = buildPlayableLog(seed, configId);
    const r1 = replay(seed, log, configId);
    const r2 = replay(seed, log, configId);
    assert.equal(r1.valid, true, `seed ${seed} produced an invalid replay`);
    assert.deepEqual(r1.finalState, r2.finalState, `seed ${seed} was not deterministic across replay calls`);
    assert.equal(r1.stateHash, r2.stateHash);
  }
});

test('a malformed intent (unknown kind) is marked invalid by replay, not silently accepted', () => {
  const r = replay(SEED, [{ kind: 'not-a-real-intent' } as unknown as WagerIntent], CONFIG);
  assert.equal(r.valid, false);
  assert.deepEqual(r.finalState, createEngine(SEED, CONFIG));
});
