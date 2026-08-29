import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultReplay } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent, parsePlayerConfig, activePlayer, MIN_PLAYERS, MAX_PLAYERS } from './engine.mts';

test('parsePlayerConfig defaults to one human, one bot', () => {
  assert.deepEqual(parsePlayerConfig(undefined), ['human', 'bot']);
  assert.deepEqual(parsePlayerConfig(''), ['human', 'bot']);
});

test('parsePlayerConfig accepts 1-4 players, rejects out-of-range counts and bad kinds', () => {
  assert.deepEqual(parsePlayerConfig('bot'), ['bot']);
  assert.deepEqual(parsePlayerConfig('human,bot,bot,bot'), ['human', 'bot', 'bot', 'bot']);
  assert.deepEqual(parsePlayerConfig(''), ['human', 'bot']); // empty falls back to the default, not a throw
  assert.throws(() => parsePlayerConfig('human,bot,bot,bot,bot'), RangeError);
  assert.throws(() => parsePlayerConfig('human,dragon'), TypeError);
});

test('createEngine is a pure function of (seed, configId): identical args -> byte-identical state', () => {
  const a = createEngine('seed-1', 'human,bot');
  const b = createEngine('seed-1', 'human,bot');
  assert.deepEqual(a, b);
});

test('a single roll moves the active player and hands the turn to the next player', () => {
  let state = createEngine('turn-order-seed', 'human,bot');
  const result = applyIntent(state, { kind: 'roll' });
  assert.equal(result.state.rollCount, 1);
  assert.equal(result.state.players[0].turnsTaken, 1);
  assert.equal(result.state.activePlayerIndex, 1); // moved on to the bot
  assert.ok(result.events.some((e) => e.kind === 'dice-roll'));
  assert.ok(result.events.some((e) => e.kind === 'move'));
});

test('the bot IS a die: relabeling every player "bot" changes nothing about how applyIntent handles them', () => {
  // Same seed, same roll sequence, only player kinds differ. Positions, jumps, and finish order
  // must be byte-identical, because applyIntent never branches on player.kind.
  function playOut(configId) {
    let state = createEngine('bot-is-a-die-seed', configId);
    const log = [];
    for (let i = 0; i < 60 && !state.gameOver; i++) {
      const result = applyIntent(state, { kind: 'roll' });
      state = result.state;
      log.push(state.players.map((p) => p.position));
    }
    return log;
  }
  const allHuman = playOut('human,human');
  const allBot = playOut('bot,bot');
  assert.deepEqual(allHuman, allBot);
});

test('a full race replays to a byte-identical final state via defaultReplay', () => {
  const seed = 'replay-seed-chutes';
  const configId = 'human,bot,bot';
  const intents = [];
  let state = createEngine(seed, configId);
  for (let i = 0; i < 200 && !state.gameOver; i++) {
    const result = applyIntent(state, { kind: 'roll' });
    state = result.state;
    intents.push({ kind: 'roll' });
  }
  assert.equal(state.gameOver, true);

  const replay1 = defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
  const replay2 = defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
  assert.equal(replay1.stateHash, replay2.stateHash);
  assert.deepEqual(replay1.finalState, state);
});

test('rolling after the race is over throws (defect-detector, not a UI-reachable path)', () => {
  let state = createEngine('short-race-seed', 'bot');
  for (let i = 0; i < 200 && !state.gameOver; i++) {
    state = applyIntent(state, { kind: 'roll' }).state;
  }
  assert.equal(state.gameOver, true);
  assert.throws(() => applyIntent(state, { kind: 'roll' }), TypeError);
});

test('an unknown intent kind throws (exhaustive dispatch, per house discipline)', () => {
  const state = createEngine('seed', 'human,bot');
  assert.throws(() => applyIntent(state, { kind: 'not-a-real-intent' }), TypeError);
});

test('a 1-player race is legal (MIN_PLAYERS) and finishes on its own', () => {
  let state = createEngine('solo-seed', 'human');
  assert.equal(state.players.length, MIN_PLAYERS);
  for (let i = 0; i < 200 && !state.gameOver; i++) {
    state = applyIntent(state, { kind: 'roll' }).state;
  }
  assert.equal(state.gameOver, true);
  assert.equal(state.players[0].finished, true);
});

test('a 4-player race tracks a finish order matching MAX_PLAYERS', () => {
  let state = createEngine('four-seed', 'human,bot,bot,bot');
  assert.equal(state.players.length, MAX_PLAYERS);
  for (let i = 0; i < 400 && !state.gameOver; i++) {
    state = applyIntent(state, { kind: 'roll' }).state;
  }
  assert.equal(state.finishedOrder.length, MAX_PLAYERS);
  assert.equal(new Set(state.finishedOrder).size, MAX_PLAYERS);
});

test('activePlayer() reads the player whose turn it is', () => {
  const state = createEngine('seed', 'human,bot');
  assert.equal(activePlayer(state).id, 'p0');
});
