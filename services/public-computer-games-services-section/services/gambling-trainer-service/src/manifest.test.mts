import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateManifest } from '@red-cup-engineering/cartridge/manifest';
import { manifest, verify } from './manifest.mts';
import { createEngine, applyIntent, currentOffer } from './engine.mts';
import { replay } from './replay.mts';
import { WAGER_CONFIGS } from './wagers.mts';
import type { WagerIntent } from './types.mts';

const SEED = 'manifest-test-seed';

function buildLog(seed: string, configId: string): WagerIntent[] {
  let state = createEngine(seed, configId);
  const log: WagerIntent[] = [];
  for (let i = 0; i < 3 && !state.finished; i++) {
    const offer = currentOffer(state);
    if (offer === undefined) break;
    const adjust: WagerIntent = { kind: 'adjust-stake', fraction: 0.04 };
    state = applyIntent(state, adjust).state;
    log.push(adjust);
    const commit: WagerIntent = { kind: 'commit-stake' };
    state = applyIntent(state, commit).state;
    log.push(commit);
  }
  return log;
}

test('the manifest validates against @red-cup-engineering/cartridge\'s own schema checker, with every WAGER_CONFIGS entry as a config', () => {
  const result = validateManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(manifest.configs?.length, WAGER_CONFIGS.length);
  assert.equal(manifest.seedPolicy.kind, 'daily-utc');
});

test('manifest.replayVerifier\'s function (verify) matches direct replay output for a real log', () => {
  const log = buildLog(SEED, 'novice');
  const entries = log.map((intent, i) => ({ seq: i, intent }));
  const viaVerify = verify(SEED, 'novice', entries);
  const viaReplay = replay(SEED, log, 'novice');
  assert.equal(viaVerify.stateHash, viaReplay.stateHash);
  assert.deepEqual(viaVerify.finalState, viaReplay.finalState);
});

// ---- HARD ECONOMY LINE, as a structural test, not just policy ----

test('manifest carries no `energy` field — earn-only, no real-currency settlement, per the HARD ECONOMY LINE', () => {
  assert.equal('energy' in manifest, false);
  assert.equal((manifest as Record<string, unknown>)['energy'], undefined);
});

test('no source file in this package imports energy-bank (old or new scope) or defines a live `energy:` field — grep-level structural check', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const files = ['types.mts', 'engine.mts', 'cartridge.mts', 'manifest.mts', 'wagers.mts', 'disclosure.mts', 'paths.mts'];
  for (const f of files) {
    const contents = readFileSync(path.join(here, f), 'utf8');
    // Prose mentions of "@red-cup-engineering/energy-bank" (or the old, deprecated
    // "@561-group/energy-bank" name) are fine (manifest.mts's own header explains the omission
    // deliberately) — what must never appear is an actual import of either name, or a live
    // `energy:`-keyed manifest field. Both scopes are checked: the old name is deprecated but
    // still resolves, so importing it would be just as real a violation as the new one.
    assert.doesNotMatch(contents, /from ['"]@red-cup-engineering\/energy-bank/, `${f} must not import @red-cup-engineering/energy-bank`);
    assert.doesNotMatch(contents, /from ['"]@561-group\/energy-bank/, `${f} must not import @561-group/energy-bank`);
    assert.doesNotMatch(contents, /^\s*energy\s*:/m, `${f} must not define a live "energy" field`);
  }
});
