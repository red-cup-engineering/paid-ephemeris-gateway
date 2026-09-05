/**
 * manifest.test.mts — proves "Tideline Treasures"'s `cartridgeWrapped: true` claim actually
 * verifies on disk, the identical proof `blackjack/manifest.test.mts` runs for that game:
 * `manifest.mts#verify` (built from nothing but `engine.mts`'s own `createEngine`/`applyIntent`
 * via `@red-cup-engineering/cartridge/replay#createVerifier`) must accept a real recorded intent
 * log and reject a doctored one, and `cartridge.mts`'s `replay`/`serialize`/`deserialize` must
 * round-trip exactly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendEntry, type IntentLog } from '@red-cup-engineering/cartridge/intent-log';
import { assertManifest } from '@red-cup-engineering/cartridge/manifest';
import { applyIntent, createEngine, type SlotsIntent, type SlotsState } from './engine.mts';
import { slotsCartridge } from './cartridge.mts';
import { manifest, verify } from './manifest.mts';

const SEED = 'slots-manifest-fixture-seed';

function recordRealGame(seed: string = SEED, rounds = 6): { intents: SlotsIntent[]; finalState: SlotsState } {
  const intents: SlotsIntent[] = [];
  let state = createEngine(seed, 'default');
  for (let i = 0; i < rounds; i++) {
    const spinIntent: SlotsIntent = { kind: 'spin', betPerLine: 5 };
    intents.push(spinIntent);
    state = applyIntent(state, spinIntent).state;
    const collectIntent: SlotsIntent = { kind: 'collect' };
    intents.push(collectIntent);
    state = applyIntent(state, collectIntent).state;
  }
  return { intents, finalState: state };
}

test('manifest: assertManifest accepts the slots CartridgeManifest as well-formed', () => {
  assert.doesNotThrow(() => assertManifest(manifest));
  assert.equal(manifest.replayVerifier, 'src/games/slots/manifest.mts#verify');
  assert.equal(manifest.id, 'slots');
});

test('cartridge: replay(seed, intents, configId) reconstructs the exact same final state as folding applyIntent by hand', () => {
  const { intents, finalState } = recordRealGame();
  const replayed = slotsCartridge.replay(SEED, intents, 'default');
  assert.equal(replayed.valid, true);
  assert.deepEqual(replayed.finalState, finalState);
});

test('cartridge: serialize/deserialize round-trips state exactly (SlotsState is already plain JSON)', () => {
  const { finalState } = recordRealGame();
  const serialized = slotsCartridge.serialize(finalState);
  const restored = slotsCartridge.deserialize(serialized);
  assert.deepEqual(restored, finalState);
});

test('manifest#verify: a real intent log replays valid, with a stable state hash matching a second identical run', () => {
  const { intents } = recordRealGame();
  const log: IntentLog<SlotsIntent> = intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<SlotsIntent>);
  const first = verify(SEED, 'default', log);
  const second = verify(SEED, 'default', log);
  assert.equal(first.valid, true);
  assert.equal(first.stateHash, second.stateHash);
  assert.deepEqual(first.finalState, second.finalState);
});

test('manifest#verify: a doctored log with an illegal move (spinning twice without collecting) is rejected', () => {
  const doubleSpin: SlotsIntent[] = [{ kind: 'spin', betPerLine: 5 }, { kind: 'spin', betPerLine: 5 }];
  const log: IntentLog<SlotsIntent> = doubleSpin.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<SlotsIntent>);
  const result = verify(SEED, 'default', log);
  assert.equal(result.valid, false);
});

test('manifest#verify: two different seeds\' own real games verify valid with different state hashes', () => {
  const gameA = recordRealGame('slots-manifest-fixture-seed-a');
  const gameB = recordRealGame('slots-manifest-fixture-seed-b');
  const logA: IntentLog<SlotsIntent> = gameA.intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<SlotsIntent>);
  const logB: IntentLog<SlotsIntent> = gameB.intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<SlotsIntent>);
  const a = verify('slots-manifest-fixture-seed-a', 'default', logA);
  const b = verify('slots-manifest-fixture-seed-b', 'default', logB);
  assert.equal(a.valid, true);
  assert.equal(b.valid, true);
  assert.notEqual(a.stateHash, b.stateHash);
});
