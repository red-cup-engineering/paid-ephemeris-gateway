/**
 * manifest.test.mts — proves the `cartridgeWrapped: true` claim `catalog-entry.json` makes for
 * blackjack actually verifies on disk: `manifest.mts#verify` (built from nothing but
 * `engine.mts`'s own `createEngine`/`applyIntent` via `@red-cup-engineering/cartridge/replay
 * #createVerifier`) must accept a real intent log recorded from real gameplay and reject one
 * doctored to smuggle in an illegal move — the same "a log that fails partway through is never
 * a valid record of a legal playthrough" contract `defaultReplay`'s own header documents.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendEntry, type IntentLog } from '@red-cup-engineering/cartridge/intent-log';
import { assertManifest } from '@red-cup-engineering/cartridge/manifest';
import { applyIntent, createEngine, type BlackjackIntent, type BlackjackState } from './engine.mts';
import { blackjackCartridge } from './cartridge.mts';
import { manifest, verify } from './manifest.mts';

const SEED = 'manifest-fixture-seed';

function recordRealGame(seed: string = SEED): { intents: BlackjackIntent[]; finalState: BlackjackState } {
  const intents: BlackjackIntent[] = [];
  let state = createEngine(seed, 'default');
  const dealIntent: BlackjackIntent = { kind: 'deal', bet: 25 };
  intents.push(dealIntent);
  state = applyIntent(state, dealIntent).state;
  let guard = 0;
  while (state.round?.phase === 'player-turn' && guard < 15) {
    const hand = state.round.playerHands[state.round.activeHandIndex]!;
    let hard = 0;
    let aces = 0;
    for (const c of hand.cards) {
      hard += c.rank === 1 ? 1 : Math.min(c.rank, 10);
      if (c.rank === 1) aces += 1;
    }
    const best = aces > 0 && hard + 10 <= 21 ? hard + 10 : hard;
    const next: BlackjackIntent = { kind: best < 17 ? 'hit' : 'stand' };
    intents.push(next);
    state = applyIntent(state, next).state;
    guard += 1;
  }
  return { intents, finalState: state };
}

test('manifest: assertManifest accepts the blackjack CartridgeManifest as well-formed', () => {
  assert.doesNotThrow(() => assertManifest(manifest));
  assert.equal(manifest.replayVerifier, 'src/games/blackjack/manifest.mts#verify');
});

test('cartridge: replay(seed, intents, configId) reconstructs the exact same final state as folding applyIntent by hand', () => {
  const { intents, finalState } = recordRealGame();
  const replayed = blackjackCartridge.replay(SEED, intents, 'default');
  assert.equal(replayed.valid, true);
  assert.deepEqual(replayed.finalState, finalState);
});

test('cartridge: serialize/deserialize round-trips state exactly (BlackjackState is already plain JSON)', () => {
  const { finalState } = recordRealGame();
  const serialized = blackjackCartridge.serialize(finalState);
  const restored = blackjackCartridge.deserialize(serialized);
  assert.deepEqual(restored, finalState);
});

test('manifest#verify: a real intent log replays valid, with a stable state hash matching a second identical run', () => {
  const { intents } = recordRealGame();
  const log: IntentLog<BlackjackIntent> = intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<BlackjackIntent>);
  const first = verify(SEED, 'default', log);
  const second = verify(SEED, 'default', log);
  assert.equal(first.valid, true);
  assert.equal(first.stateHash, second.stateHash);
  assert.deepEqual(first.finalState, second.finalState);
});

test('manifest#verify: a doctored log with an illegal move (e.g. a second deal mid-round) is rejected, not silently patched over', () => {
  const dealOnly: BlackjackIntent[] = [{ kind: 'deal', bet: 25 }, { kind: 'deal', bet: 25 }];
  const log: IntentLog<BlackjackIntent> = dealOnly.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<BlackjackIntent>);
  const result = verify(SEED, 'default', log);
  assert.equal(result.valid, false);
});

test('manifest#verify: two different seeds\' own real games verify valid with different state hashes', () => {
  const gameA = recordRealGame('manifest-fixture-seed-a');
  const gameB = recordRealGame('manifest-fixture-seed-b');
  const logA: IntentLog<BlackjackIntent> = gameA.intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<BlackjackIntent>);
  const logB: IntentLog<BlackjackIntent> = gameB.intents.reduce((acc, intent, i) => appendEntry(acc, intent, { seq: i }), [] as IntentLog<BlackjackIntent>);
  const a = verify('manifest-fixture-seed-a', 'default', logA);
  const b = verify('manifest-fixture-seed-b', 'default', logB);
  assert.equal(a.valid, true);
  assert.equal(b.valid, true);
  assert.notEqual(a.stateHash, b.stateHash);
});
