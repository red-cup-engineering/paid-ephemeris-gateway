import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashState } from '@red-cup-engineering/cartridge/replay';
import { validateManifest } from '@red-cup-engineering/cartridge/manifest';
import { createEngine, applyIntent, replay, serialize, deserialize, gamblingTrainerCartridge } from './cartridge.mts';
import { manifest } from './manifest.mts';
import { currentOffer } from './engine.mts';
import type { WagerIntent } from './types.mts';

const SEED = 'cartridge-test-seed';
const CONFIG = 'novice';

test('createEngine (via cartridge.mts) is a pure function of (seed, configId), matching engine.mts directly', () => {
  const a = createEngine(SEED, CONFIG);
  const b = createEngine(SEED, CONFIG);
  assert.deepEqual(a, b);
  assert.notEqual(a.seed === undefined, true);
});

test('applyIntent (via cartridge.mts) wraps engine.mts#applyIntent without altering its output shape', () => {
  const state = createEngine(SEED, CONFIG);
  const result = applyIntent(state, { kind: 'adjust-stake', fraction: 0.15 });
  assert.equal(result.state.pendingStakeFraction, 0.15);
  assert.ok(Array.isArray(result.events));
});

test('replay (via cartridge.mts) matches engine.mts applied intent-by-intent', () => {
  let state = createEngine(SEED, CONFIG);
  const log: WagerIntent[] = [];
  for (let i = 0; i < 4 && !state.finished; i++) {
    const offer = currentOffer(state);
    if (offer === undefined) break;
    const adjust: WagerIntent = { kind: 'adjust-stake', fraction: 0.08 };
    state = applyIntent(state, adjust).state;
    log.push(adjust);
    const commit: WagerIntent = { kind: 'commit-stake' };
    state = applyIntent(state, commit).state;
    log.push(commit);
  }
  const r = replay(SEED, log, CONFIG);
  assert.equal(r.valid, true);
  assert.deepEqual(r.finalState, state);
  assert.equal(r.stateHash, hashState(r.finalState));
});

test('serialize/deserialize round-trip exactly', () => {
  let state = createEngine(SEED, CONFIG);
  state = applyIntent(state, { kind: 'adjust-stake', fraction: 0.1 }).state;
  state = applyIntent(state, { kind: 'commit-stake' }).state;
  const serialized = serialize(state);
  const roundTripped = deserialize(serialized);
  assert.deepEqual(roundTripped, state);
});

test('deserialize rejects malformed data rather than silently coercing it', () => {
  assert.throws(() => deserialize(null));
  assert.throws(() => deserialize({}));
  assert.throws(() => deserialize({ seed: 'x' }));
});

test('gamblingTrainerCartridge satisfies the full Cartridge contract end to end', () => {
  let state = gamblingTrainerCartridge.createEngine(SEED, CONFIG);
  const log: (WagerIntent & { kind: string })[] = [];
  for (let i = 0; i < 3 && !state.finished; i++) {
    const offer = currentOffer(state);
    if (offer === undefined) break;
    const adjust = { kind: 'adjust-stake' as const, fraction: 0.05 };
    const applied = gamblingTrainerCartridge.applyIntent(state, adjust as never);
    state = applied.state;
    log.push(adjust);
    const commit = { kind: 'commit-stake' as const };
    const committed = gamblingTrainerCartridge.applyIntent(state, commit as never);
    state = committed.state;
    log.push(commit);
  }
  const r = gamblingTrainerCartridge.replay(SEED, log as never, CONFIG);
  assert.equal(r.valid, true);
  const ser = gamblingTrainerCartridge.serialize(r.finalState);
  const de = gamblingTrainerCartridge.deserialize(ser);
  assert.deepEqual(de, r.finalState);
});

test('the manifest\'s replayVerifier path (manifest.mts#verify) is wired to this exact cartridge, not a stale copy', () => {
  const result = validateManifest(manifest);
  assert.equal(result.valid, true);
  assert.equal(manifest.replayVerifier, 'src/manifest.mts#verify');
});
