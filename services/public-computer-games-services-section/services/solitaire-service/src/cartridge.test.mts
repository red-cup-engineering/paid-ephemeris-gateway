import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashState } from '@red-cup-engineering/cartridge/replay';
import { validateManifest } from '@red-cup-engineering/cartridge/manifest';
import { applyIntent, createEngine, solitaireCartridge, replay, type SolitaireIntent } from './cartridge.mts';
import { manifest, verify } from './cartridge.manifest.mts';
import { legalTargets, VARIANTS, VARIANT_LIST } from './engine.mts';

const SEED = 'test-seed-cartridge';
const CONFIG_ID = 'klondike-draw1'; // matches cartridge.manifest.mts's generated configs

/** Play `steps` real, legal single-card moves (discovering one fresh from the board each time,
 * exactly the way a real client would), drawing from stock whenever no tableau/waste move is
 * currently legal. Stops early once neither a move nor a draw is available. */
function buildPlayableLog(seed: string, configId: string, steps: number): SolitaireIntent[] {
  const variant = VARIANTS[configId];
  assert.ok(variant, `variant ${configId} must exist`);
  let state = createEngine(seed, configId);
  const log: SolitaireIntent[] = [];
  for (let i = 0; i < steps; i++) {
    let intent: SolitaireIntent | undefined;
    for (const pileId of Object.keys(state.piles)) {
      if ((state.piles[pileId]?.length ?? 0) === 0) continue;
      const targets = legalTargets(variant!, state, pileId, 1);
      if (targets.length > 0) {
        intent = { kind: 'move', from: pileId, to: targets[0]!, count: 1 };
        break;
      }
    }
    if (!intent && (state.piles['stock']?.length ?? 0) > 0) intent = { kind: 'draw' };
    if (!intent) break;
    const result = applyIntent(state, intent);
    state = result.state;
    log.push(intent);
  }
  return log;
}

test('createEngine is a pure function of (seed, configId)', () => {
  const a = createEngine(SEED, CONFIG_ID);
  const b = createEngine(SEED, CONFIG_ID);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, createEngine('a-different-seed', CONFIG_ID));
  assert.equal(a.variantId, 'klondike-draw1');
  assert.equal(a.log.length, 0);
});

test('createEngine defaults configId to klondike-draw1 and rejects an unknown variant id', () => {
  const defaulted = createEngine(SEED);
  assert.equal(defaulted.variantId, 'klondike-draw1');
  assert.throws(() => createEngine(SEED, 'not-a-real-variant'), RangeError);
});

test('replay determinism: same seed + same intent log twice yields identical finalState and stateHash', () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 8);
  assert.ok(log.length > 0, 'at least one legal move or draw should be discoverable');
  const r1 = replay(SEED, log, CONFIG_ID);
  const r2 = replay(SEED, log, CONFIG_ID);
  assert.equal(r1.valid, true);
  assert.deepEqual(r1.finalState, r2.finalState);
  assert.equal(r1.stateHash, r2.stateHash);
  assert.equal(r1.stateHash, hashState(r1.finalState));
  const r3 = replay('a-completely-different-seed', log, CONFIG_ID);
  assert.notEqual(r3.stateHash, r1.stateHash, 'a different seed must produce a different dealt table');
});

test('replay determinism holds across every shipped variant', () => {
  for (const variant of VARIANT_LIST) {
    const log = buildPlayableLog(SEED, variant.id, 5);
    const r1 = replay(SEED, log, variant.id);
    const r2 = replay(SEED, log, variant.id);
    assert.equal(r1.stateHash, r2.stateHash, `variant ${variant.id} must replay deterministically`);
  }
});

test('a structurally illegal move throws, and replay marks the log invalid rather than accepting it', () => {
  const state = createEngine(SEED, CONFIG_ID);
  // Stock cards are dealt face down; legalTargets refuses any pile whose top cards aren't
  // face up, so this is illegal regardless of seed.
  assert.throws(() => applyIntent(state, { kind: 'move', from: 'stock', to: 'waste', count: 1 }), /illegal move/);
  const result = replay(SEED, [{ kind: 'move', from: 'stock', to: 'waste', count: 1 }], CONFIG_ID);
  assert.equal(result.valid, false);
  assert.deepEqual(result.finalState, createEngine(SEED, CONFIG_ID));
});

test('a legal move emits an event mirroring the LogEntry the move just appended', () => {
  const state = createEngine(SEED, CONFIG_ID);
  const variant = VARIANTS[CONFIG_ID]!;
  let from: string | undefined;
  let to: string | undefined;
  for (const pileId of Object.keys(state.piles)) {
    if ((state.piles[pileId]?.length ?? 0) === 0) continue;
    const targets = legalTargets(variant, state, pileId, 1);
    if (targets.length > 0) {
      from = pileId;
      to = targets[0]!;
      break;
    }
  }
  assert.ok(from && to, 'a fresh Klondike deal always has at least one legal move');
  const result = applyIntent(state, { kind: 'move', from: from!, to: to!, count: 1 });
  assert.equal(result.events[0]?.kind, 'move');
  assert.equal(result.events[0]?.from, from);
  assert.equal(result.events[0]?.to, to);
  assert.equal(result.state.log.length, 1);
});

test('draw is legal on a fresh Klondike deal and advances the movelog', () => {
  const state = createEngine(SEED, CONFIG_ID);
  const result = applyIntent(state, { kind: 'draw' });
  assert.equal(result.events[0]?.kind, 'draw');
  assert.equal(result.state.log.length, 1);
  assert.equal(result.state.piles['waste']?.length, 1);
});

test('redeal before the stock is exhausted throws, matching engine.mts::redealStock', () => {
  const state = createEngine(SEED, CONFIG_ID);
  assert.throws(() => applyIntent(state, { kind: 'redeal' }), /cannot redeal/);
});

test('solitaireCartridge satisfies the Cartridge contract end to end, including serialize/deserialize round-trip', () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 6);
  const r = solitaireCartridge.replay(SEED, log as never, CONFIG_ID);
  assert.equal(r.valid, true);
  const serialized = solitaireCartridge.serialize(r.finalState);
  const roundTripped = solitaireCartridge.deserialize(serialized);
  assert.deepEqual(roundTripped, r.finalState);
});

test('the manifest validates against @red-cup-engineering/cartridge\'s own schema checker, with all variants as configs', () => {
  const result = validateManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(manifest.configs?.length, VARIANT_LIST.length);
});

test('manifest.replayVerifier\'s function (verify) matches direct replay output for a real log', () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 6);
  const entries = log.map((intent, i) => ({ seq: i, intent }));
  const viaVerify = verify(SEED, CONFIG_ID, entries);
  const viaReplay = replay(SEED, log, CONFIG_ID);
  assert.equal(viaVerify.stateHash, viaReplay.stateHash);
  assert.deepEqual(viaVerify.finalState, viaReplay.finalState);
});
