/**
 * `scene.test` — exercises the one stateful module against real siblings where they exist.
 *
 * Everything below is a real integration test (no mocking of `engine`/`levels`/`economy`/
 * `progression`): onestone's determinism doctrine means the pure modules ARE the fixture — a
 * "tiny fixture" for a match-3 scene is just level 1 driven honestly through `legalMoves`, not
 * a hand-rolled fake board. See the bottom of this file for a note on which of these were
 * actually runnable at the time this module was written (some sibling modules were still being
 * built in parallel — see the return report, not this file, for the up-to-date blocked list).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PlayerMeta } from './types.mts';
import { createScene } from './scene.mts';

function tmpSavePath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'onestone-scene-test-'));
  return join(dir, 'save.json');
}

test('fresh login yields an empty-board frame with a full-lives fresh meta', () => {
  const scene = createScene({ now: () => 1_000 });
  const { token, account } = scene.login('Ada Lovelace');
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0);
  assert.equal(account, 'ada-lovelace');

  const frame = scene.frame(account);
  assert.equal(frame.kind, 'state');
  assert.equal(frame.finished, null);
  assert.deepEqual(frame.tiles, []);
  assert.equal(frame.geometry.cells.length, 0);
  assert.equal(frame.movesLeft, 0);
  assert.deepEqual(frame.goals, []);
  assert.equal(frame.meta.unlocked, 1);
  assert.equal(frame.meta.lives, 5); // LIFE_CAP, per economy.freshMeta
  assert.equal(frame.meta.streak, 0);
});
test('the same login name always resolves to the same account (token identity)', () => {
  const scene = createScene({ now: () => 1_000 });
  const first = scene.login('Player One');
  const second = scene.login('player one'); // case-insensitive same handle
  assert.equal(first.account, second.account);
  assert.notEqual(first.token, second.token); // each login mints a fresh session token
});

test('start consumes a life and yields a non-empty board', () => {
  const scene = createScene({ now: () => 1_000 });
  const { account } = scene.login('Board Starter');
  const before = scene.frame(account).meta.lives;

  const frame = scene.input(account, { kind: 'start', levelId: 1 });
  assert.equal(frame.finished, null);
  assert.equal(frame.levelId, 1);
  assert.ok(frame.geometry.cells.length > 0, 'expected a compiled board geometry');
  assert.equal(frame.tiles.length, frame.geometry.cells.length);
  assert.ok(frame.movesLeft > 0);
  assert.equal(frame.meta.lives, before - 1);

  // Starting again while a run is active is a no-op — the board/levelId don't change.
  const again = scene.input(account, { kind: 'start', levelId: 2 });
  assert.equal(again.levelId, 1);
  assert.equal(again.meta.lives, before - 1);
});

test('life-gate refusal at 0 lives: start is refused and no life goes negative', () => {
  // Craft a restore file with an account already at 0 lives, parked far from its next regen —
  // this exercises the life gate without needing to actually lose 5 real levels first.
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Zero Lives');

  const zeroMeta: PlayerMeta = {
    unlocked: 1,
    stars: {},
    wallet: { shards: 0, prisms: 0 },
    boosters: { hammer: 0, shuffle: 0, extraMoves: 0, prismStart: 0 },
    lives: 0,
    nextLifeAt: 1_000 + 999_999_999, // far beyond any `now` this test uses
    streak: 0,
    garden: [],
    passUntil: 0,
  };
  writeFileSync(
    savePath,
    JSON.stringify({
      kind: 'onestone.scene.snapshot.v1',
      accounts: { [account]: { meta: zeroMeta, run: null } },
    }),
  );

  const scene = createScene({ savePath, now: () => 1_000 });
  const frame = scene.input(account, { kind: 'start', levelId: 1 });
  assert.equal(frame.finished, null);
  assert.equal(frame.geometry.cells.length, 0, 'refused start must not spawn a board');
  assert.equal(frame.meta.lives, 0, 'life gate must not go negative');

  rmSync(savePath, { force: true });
});

// ── sparks (TILESLOTS-DESIGN.md §4.3): a same-level retry right after a loss spends a spark,
// never a life, and the offer only ever applies to the very next start ────────────────────────

function metaWith(overrides: Partial<PlayerMeta>): PlayerMeta {
  return {
    unlocked: 5,
    stars: {},
    wallet: { shards: 0, prisms: 0 },
    boosters: { hammer: 0, shuffle: 0, extraMoves: 0, prismStart: 0 },
    lives: 3,
    nextLifeAt: 0,
    streak: 0,
    garden: [],
    passUntil: 0,
    sparks: {},
    ...overrides,
  };
}

function writeCraftedAccount(savePath: string, account: string, meta: PlayerMeta, lastLossLevelId: number | null): void {
  writeFileSync(
    savePath,
    JSON.stringify({
      kind: 'onestone.scene.snapshot.v1',
      accounts: { [account]: { meta, run: null, lastLossLevelId } },
    }),
  );
}

test('starting the level just lost spends a spark, not a life', () => {
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Spark Retry');
  writeCraftedAccount(savePath, account, metaWith({}), 5);

  const scene = createScene({ savePath, now: () => 1_000 });
  const frame = scene.input(account, { kind: 'start', levelId: 5 });
  assert.equal(frame.levelId, 5);
  assert.equal(frame.meta.lives, 3, 'a spark-funded retry must not spend a life');
  assert.equal(frame.meta.sparks[5]?.n, 2, 'exactly one spark spent (cap 3 - 1)');

  rmSync(savePath, { force: true });
});

test('sparks never gate a start: at 0 lives with a spark available, the retry still succeeds', () => {
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Spark Over Lives');
  writeCraftedAccount(savePath, account, metaWith({ lives: 0, nextLifeAt: 1_000 + 999_999_999 }), 5);

  const scene = createScene({ savePath, now: () => 1_000 });
  const frame = scene.input(account, { kind: 'start', levelId: 5 });
  assert.ok(frame.geometry.cells.length > 0, 'a spark-funded retry must succeed even at 0 lives');
  assert.equal(frame.meta.lives, 0, 'lives stay untouched, not spent and not refused-into-negative');
  assert.equal(frame.meta.sparks[5]?.n, 2);

  rmSync(savePath, { force: true });
});

test('starting a different level after a loss spends a life as usual and never touches the lost level\'s sparks', () => {
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Spark Not Consumed');
  writeCraftedAccount(savePath, account, metaWith({}), 5);

  const scene = createScene({ savePath, now: () => 1_000 });
  const frame = scene.input(account, { kind: 'start', levelId: 1 });
  assert.equal(frame.levelId, 1);
  assert.equal(frame.meta.lives, 2, 'no pending spark offer for level 1 — the normal life spend applies');
  assert.equal(frame.meta.sparks[5], undefined, 'level 5\'s sparks were never touched');

  rmSync(savePath, { force: true });
});

test('consecutive immediate-retry losses drain the spark pool one at a time, then fall back to spending lives', () => {
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Spark Drain');
  writeCraftedAccount(savePath, account, metaWith({}), 5);

  const scene = createScene({ savePath, now: () => 1_000 });
  // Every one of these losses (an abandon mid-run, same as running out of moves per
  // `LevelResult.won === false`) re-arms the offer for the very next start of level 5, so a
  // player who keeps losing right away keeps drawing sparks — never lives — until the pool
  // itself (SPARK_CAP = 3) runs dry.
  for (let expectedSparksLeft = 2; expectedSparksLeft >= 0; expectedSparksLeft--) {
    const started = scene.input(account, { kind: 'start', levelId: 5 });
    assert.equal(started.meta.lives, 3, `spark-funded retry (expecting ${expectedSparksLeft} left) must not spend a life`);
    assert.equal(started.meta.sparks[5]?.n, expectedSparksLeft);
    scene.input(account, { kind: 'abandon' });
  }

  // Sparks are exhausted — the next immediate retry falls back to the ordinary life spend,
  // exactly as if sparks did not exist, never refused.
  const final = scene.input(account, { kind: 'start', levelId: 5 });
  assert.equal(final.meta.lives, 2, 'sparks exhausted: this retry spends a life like any other start');
  assert.equal(final.meta.sparks[5]?.n, 0);

  rmSync(savePath, { force: true });
});

test('once a level\'s sparks are exhausted, an immediate retry falls back to the ordinary life spend', () => {
  const savePath = tmpSavePath();
  const probe = createScene({});
  const { account } = probe.login('Sparks Exhausted');
  writeCraftedAccount(savePath, account, metaWith({ sparks: { 5: { n: 0, nextAt: 1_000 + 999_999_999 } } }), 5);

  const scene = createScene({ savePath, now: () => 1_000 });
  const frame = scene.input(account, { kind: 'start', levelId: 5 });
  assert.equal(frame.meta.lives, 2, 'no sparks left — falls through to spending a life exactly as before this feature existed');

  rmSync(savePath, { force: true });
});

test('persistence round-trip: a fresh scene restored from a persisted save sees the same meta', async () => {
  const savePath = tmpSavePath();
  const sceneA = createScene({ savePath, now: () => 1_000 });
  const { account } = sceneA.login('Persisted Player');
  // Move the meta away from freshMeta() defaults so the round-trip is actually asserting
  // something: spend a life via a real level start.
  const started = sceneA.input(account, { kind: 'start', levelId: 1 });
  assert.equal(started.meta.lives, 4);

  await sceneA.persist();
  const onDisk = JSON.parse(readFileSync(savePath, 'utf8')) as { kind: string };
  assert.equal(onDisk.kind, 'onestone.scene.snapshot.v1');

  const sceneB = createScene({ savePath, now: () => 2_000 });
  const frameB = sceneB.frame(account);
  assert.equal(frameB.meta.lives, 4);
  assert.equal(frameB.levelId, 1, 'the in-progress run round-trips too');
  assert.ok(frameB.geometry.cells.length > 0);

  rmSync(savePath, { force: true, recursive: true });
});

test('grantSku applies a payments-verified grant to the account wallet', async () => {
  const scene = createScene({ now: () => 1_000 });
  const { account } = scene.login('Buyer');
  const before = scene.frame(account).meta.wallet.prisms;
  scene.grantSku(account, { id: 'test-prisms', title: 'Test Prisms', cents: 99, grant: { kind: 'prisms', amount: 250 } });
  const after = scene.frame(account);
  assert.equal(after.meta.wallet.prisms, before + 250);
});

test('subscribe fanout: input pushes the resulting frame to a listener', () => {
  const scene = createScene({ now: () => 1_000 });
  const { account } = scene.login('Listener');
  const seen: unknown[] = [];
  const unsubscribe = scene.subscribe(account, (frame) => seen.push(frame));
  scene.input(account, { kind: 'start', levelId: 1 });
  assert.equal(seen.length, 1);
  unsubscribe();
  scene.input(account, { kind: 'abandon' });
  assert.equal(seen.length, 1, 'unsubscribed listener must not receive further frames');
});

test('an engineered playthrough of level 1 (real legalMoves) always reaches a terminal frame within its move budget', async () => {
  // "Tiny fixture" per the assignment: level 1 driven with real, honestly-found legal moves
  // (from engine.legalMoves) rather than a fabricated board — exercises applyMove, goal
  // progress bookkeeping, and the win/loss finalize path end to end.
  const { legalMoves } = await import('./engine.mts');
  const { levelById } = await import('./levels.mts');

  const scene = createScene({ now: () => 1_000 });
  const { account } = scene.login('Completionist');
  const spec = levelById(1);
  assert.ok(spec, 'level 1 must exist');

  let frame = scene.input(account, { kind: 'start', levelId: 1 });
  assert.equal(frame.finished, null);

  let guard = 0;
  while (frame.finished === null && guard <= spec.moves + 2) {
    guard++;
    const moves = legalMoves(frame.geometry, { tiles: frame.tiles, seed: spec.seed, draws: 0 });
    assert.ok(moves.length > 0, `expected at least one legal move at guard step ${guard}`);
    const move = moves[0];
    assert.ok(move);
    frame = scene.input(account, { kind: 'swap', a: move.a, b: move.b });
  }

  assert.ok(frame.finished !== null, `run must terminate within ${spec.moves} moves`);
  assert.equal(frame.finished.levelId, 1);
  if (frame.finished.won) {
    assert.ok(frame.finished.stars >= 1);
    assert.ok(frame.meta.unlocked >= 2, 'a win should unlock level 2');
  } else {
    assert.equal(frame.finished.stars, 0);
    assert.equal(frame.finished.movesLeft, 0);
  }

  // The run is cleared either way: a fresh frame() read shows the lobby (empty) board again.
  const after = scene.frame(account);
  assert.equal(after.finished, null);
  assert.equal(after.geometry.cells.length, 0);
});
