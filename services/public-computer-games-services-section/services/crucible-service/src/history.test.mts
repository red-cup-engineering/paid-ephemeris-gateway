import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStore, addRecord, recordsForSeed, recordFromRun, buildHistogram, bucketIndexFor,
  HISTORY_KIND,
} from './history.mts';
import { replay } from './replay.mts';
import { certifyTangle } from './validate.mts';
import type { HistoryRecord, RunState } from './types.mts';

test('emptyStore carries the current schema kind and no records', () => {
  const s = emptyStore();
  assert.equal(s.kind, HISTORY_KIND);
  assert.deepEqual(s.records, []);
});

test('addRecord appends without mutating the original store', () => {
  const s0 = emptyStore();
  const rec: HistoryRecord = { seed: 'x', moveLog: [], totalCost: 5, finishedAt: '2026-08-19T00:00:00.000Z' };
  const s1 = addRecord(s0, rec);
  assert.equal(s0.records.length, 0);
  assert.equal(s1.records.length, 1);
  assert.deepEqual(s1.records[0], rec);
});

test('recordsForSeed filters correctly', () => {
  let s = emptyStore();
  s = addRecord(s, { seed: 'a', moveLog: [], totalCost: 1, finishedAt: 't1' });
  s = addRecord(s, { seed: 'b', moveLog: [], totalCost: 2, finishedAt: 't2' });
  s = addRecord(s, { seed: 'a', moveLog: [], totalCost: 3, finishedAt: 't3' });
  assert.equal(recordsForSeed(s, 'a').length, 2);
  assert.equal(recordsForSeed(s, 'b').length, 1);
  assert.equal(recordsForSeed(s, 'c').length, 0);
});

test('recordFromRun builds the exact leaderboard-shaped record from a real replayed RunState', () => {
  const seed = 'crucible-daily:2026-08-19';
  const cert = certifyTangle(seed);
  const log = cert.solvingSequence.map((move) => ({ move }));
  const run: RunState = replay(seed, log);
  const rec = recordFromRun(run, '2026-08-19T12:00:00.000Z');
  assert.equal(rec.seed, seed);
  assert.deepEqual(rec.moveLog, run.log);
  assert.equal(rec.totalCost, run.totalCost);
  assert.equal(rec.finishedAt, '2026-08-19T12:00:00.000Z');
});

test('buildHistogram on an empty list returns zero buckets and zero total', () => {
  const h = buildHistogram([]);
  assert.deepEqual(h.buckets, []);
  assert.equal(h.total, 0);
});

test('buildHistogram buckets by bucketSize and every cost lands in exactly one bucket', () => {
  const costs = [0, 1, 4, 5, 6, 9, 10, 23];
  const h = buildHistogram(costs, 5);
  assert.equal(h.total, costs.length);
  const sum = h.buckets.reduce((acc, b) => acc + b.count, 0);
  assert.equal(sum, costs.length);
  // 0,1,4 in [0,5); 5,6,9 in [5,10); 10 in [10,15); 23 in [20,25)
  assert.equal(h.buckets[0]?.count, 3);
  assert.equal(h.buckets[1]?.count, 3);
  assert.equal(h.buckets[2]?.count, 1);
});

test('buildHistogram rejects a non-positive bucketSize', () => {
  assert.throws(() => buildHistogram([1, 2, 3], 0));
  assert.throws(() => buildHistogram([1, 2, 3], -1));
});

test('bucketIndexFor locates the bucket a given cost falls in', () => {
  const h = buildHistogram([0, 6, 12], 5);
  assert.equal(bucketIndexFor(h, 6), 1);
  assert.equal(bucketIndexFor(h, 0), 0);
  assert.equal(bucketIndexFor(h, 999), -1);
});
