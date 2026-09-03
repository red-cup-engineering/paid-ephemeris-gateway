/**
 * `parity` — asserts the browser-facing JS ports under `web/js/engine/` produce bit-identical
 * output to the real `.mts` engine modules they transliterate, across a grid of inputs. The
 * ports exist only because a zero-build static face cannot load `.mts` (see each port's own
 * header comment); this test is what keeps them honest instead of trusting eyeballs.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as realSrs from '../../src/srs.mts';
import * as realLightcone from '../../src/lightcone.mts';
import * as portSrs from '../js/engine/srs.js';
import * as portLightcone from '../js/engine/lightcone.js';
import * as portStability from '../js/engine/stability.js';
import * as portKata from '../js/engine/kata.js';
import { scoreCard as realScoreCard, kataRatio as realKataRatio, beltForRatio as realBeltForRatio, awardedBelt as realAwardedBelt, ratioToGrade as realRatioToGrade } from '../../src/kata.mts';

test('srs port: recallProbability matches the real engine across a grid', () => {
  const ts = [0, 0.5, 1, 2, 3.7, 10, 50, 200];
  const Ss = [0.1, 0.4, 1, 2.5, 4.5, 10, 100];
  for (const t of ts) {
    for (const S of Ss) {
      assert.equal(portSrs.recallProbability(t, S), realSrs.recallProbability(t, S), `t=${t} S=${S}`);
    }
  }
  // degenerate guards
  assert.equal(portSrs.recallProbability(5, 0), realSrs.recallProbability(5, 0));
  assert.equal(portSrs.recallProbability(0, 5), realSrs.recallProbability(0, 5));
});

test('srs port: daysUntilRetention matches the real engine', () => {
  for (const S of [0.4, 1, 2.5, 4.5, 10, 30]) {
    for (const R of [0.5, 0.7, 0.9, 0.95, 0.99]) {
      assert.equal(portSrs.daysUntilRetention(S, R), realSrs.daysUntilRetention(S, R), `S=${S} R=${R}`);
    }
  }
});

test('srs port: reviewCard matches the real engine, new card and existing card, every grade', () => {
  const grades = [1, 2, 3, 4];
  for (const grade of grades) {
    const real = realSrs.reviewCard({ stability: 0, difficulty: 0, lastReviewedAt: undefined }, grade, 100);
    const port = portSrs.reviewCard({ stability: 0, difficulty: 0, lastReviewedAt: undefined }, grade, 100);
    assert.deepEqual(port, real, `new card grade=${grade}`);
  }
  const priorStates = [
    { stability: 2.5, difficulty: 5, lastReviewedAt: 10 },
    { stability: 0.4, difficulty: 8, lastReviewedAt: 0 },
    { stability: 30, difficulty: 1.5, lastReviewedAt: 50 },
  ];
  const nows = [12, 15, 100, 400];
  for (const state of priorStates) {
    for (const now of nows) {
      for (const grade of grades) {
        const real = realSrs.reviewCard(state, grade, now);
        const port = portSrs.reviewCard(state, grade, now);
        assert.deepEqual(port, real, `state=${JSON.stringify(state)} now=${now} grade=${grade}`);
      }
    }
  }
});

test('srs port: STAGE_CUTS and constants match', () => {
  assert.equal(portSrs.DECAY, realSrs.DECAY);
  assert.equal(portSrs.FACTOR, realSrs.FACTOR);
  assert.deepEqual(portSrs.STAGE_CUTS, realSrs.STAGE_CUTS);
  assert.equal(portSrs.DEFAULT_TARGET_RETENTION, realSrs.DEFAULT_TARGET_RETENTION);
});

function fixtureWorld() {
  const rooms = [
    { id: 'a', wingId: 'w', title: 'A', aliases: [], kind: 'term', body: '' },
    { id: 'b', wingId: 'w', title: 'B', aliases: [], kind: 'term', body: '' },
    { id: 'c', wingId: 'w', title: 'C', aliases: [], kind: 'term', body: '' },
    { id: 'd', wingId: 'w', title: 'D', aliases: [], kind: 'term', body: '' },
  ];
  const doors = [
    { from: 'a', to: 'b', weight: 'hard', reason: 'x' },
    { from: 'b', to: 'c', weight: 'hard', reason: 'x' },
    { from: 'c', to: 'd', weight: 'soft', reason: 'x' },
  ];
  const halls = [{ id: 'hall:0', intent: ['type:term'], rooms: ['a', 'b'], stable: true }];
  return { rooms, doors, halls };
}

test('lightcone port: classifyStage matches the real engine', () => {
  for (const R of [1, 0.95, 0.9, 0.89, 0.7, 0.69, 0.5, 0.49, 0.1, 0]) {
    assert.equal(portLightcone.classifyStage(R), realLightcone.classifyStage(R), `R=${R}`);
  }
});

test('lightcone port: computeLightCone matches the real engine across a review timeline', () => {
  const { rooms, doors, halls } = fixtureWorld();
  const cardScenarios = [
    [],
    [{ id: 'a#1', roomId: 'a', kind: 'cloze', front: 'f', back: 'b', stability: 2.5, difficulty: 5, lastReviewedAt: 0 }],
    [
      { id: 'a#1', roomId: 'a', kind: 'cloze', front: 'f', back: 'b', stability: 2.5, difficulty: 5, lastReviewedAt: 0 },
      { id: 'b#1', roomId: 'b', kind: 'cloze', front: 'f', back: 'b', stability: 0.5, difficulty: 5, lastReviewedAt: 0 },
    ],
    [
      { id: 'a#1', roomId: 'a', kind: 'cloze', front: 'f', back: 'b', stability: 2.5, difficulty: 5, lastReviewedAt: 0 },
      { id: 'b#1', roomId: 'b', kind: 'cloze', front: 'f', back: 'b', stability: 10, difficulty: 5, lastReviewedAt: 0 },
      { id: 'c#1', roomId: 'c', kind: 'cloze', front: 'f', back: 'b', stability: 4, difficulty: 5, lastReviewedAt: 0 },
    ],
  ];
  const nows = [0, 1, 5, 20, 100];
  for (const cards of cardScenarios) {
    for (const now of nows) {
      const real = realLightcone.computeLightCone(rooms as any, doors as any, cards as any, halls as any, now);
      const port = portLightcone.computeLightCone(rooms, doors, cards, halls, now);
      assert.deepEqual([...port.reachable].sort(), [...real.reachable].sort(), `now=${now} cards=${cards.length}`);
      for (const room of rooms) {
        assert.deepEqual(port.states.get(room.id), real.states.get(room.id), `room=${room.id} now=${now}`);
      }
    }
  }
});

test('lightcone port: revealedTerritory and rootRooms match', () => {
  const { rooms, doors } = fixtureWorld();
  const cards = [{ id: 'a#1', roomId: 'a', kind: 'cloze', front: 'f', back: 'b', stability: 1, difficulty: 5, lastReviewedAt: 3 }];
  assert.deepEqual([...portLightcone.revealedTerritory(cards)], [...realLightcone.revealedTerritory(cards as any)]);
  assert.deepEqual([...portLightcone.rootRooms(rooms, doors)].sort(), [...realLightcone.rootRooms(rooms as any, doors as any)].sort());
});

test('stability port: STABLE_HALL_BONUS matches the real engine constant', async () => {
  const realStability = await import('../../src/stability.mts');
  assert.equal(portStability.STABLE_HALL_BONUS, realStability.STABLE_HALL_BONUS);
});

test('kata port: scoreCard/kataRatio/belts/ratioToGrade match the real engine', () => {
  const outcomes = ['again', 'hard', 'good', 'easy'];
  for (const outcome of outcomes) {
    for (const responseTimeMs of [1000, 8000, 20000]) {
      const result = { outcome, responseTimeMs, tFastMs: 8000 };
      assert.equal(portKata.scoreCard(result), realScoreCard(result as any), JSON.stringify(result));
    }
  }
  const resultSets = [
    [],
    [{ outcome: 'good', responseTimeMs: 1000, tFastMs: 8000 }],
    [
      { outcome: 'again', responseTimeMs: 1000, tFastMs: 8000 },
      { outcome: 'hard', responseTimeMs: 1000, tFastMs: 8000 },
      { outcome: 'good', responseTimeMs: 20000, tFastMs: 8000 },
      { outcome: 'easy', responseTimeMs: 1000, tFastMs: 8000 },
    ],
  ];
  for (const results of resultSets) {
    assert.equal(portKata.kataRatio(results), realKataRatio(results as any));
  }
  for (const ratio of [0, 0.3, 0.5, 0.65, 0.75, 0.85, 0.92, 0.97, 1]) {
    assert.equal(portKata.beltForRatio(ratio), realBeltForRatio(ratio));
    assert.equal(portKata.ratioToGrade(ratio), realRatioToGrade(ratio));
  }
  const ratioSets = [[], [0.5], [0.9, 0.9], [0.9, 0.5, 0.9], [0.97, 0.98, 0.99], [1, 1, 0.4]];
  for (const rs of ratioSets) {
    assert.equal(portKata.awardedBelt(rs), realAwardedBelt(rs));
  }
});
