import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile as writeFileP, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { emptyStore, addRecord } from './history.mts';
import { loadStore, saveStore } from './history-store.mts';

test('loadStore on a missing file returns a fresh empty store, never throws', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'crucible-history-'));
  try {
    const s = loadStore(path.join(dir, 'does-not-exist.json'));
    assert.deepEqual(s, emptyStore());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('saveStore then loadStore round-trips exactly', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'crucible-history-'));
  try {
    const file = path.join(dir, 'nested', 'history.json');
    let s = emptyStore();
    s = addRecord(s, { seed: 'crucible-daily:2026-08-19', moveLog: [], totalCost: 12, finishedAt: 'now' });
    await saveStore(file, s);
    const loaded = loadStore(file);
    assert.deepEqual(loaded, s);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadStore on corrupt JSON returns a fresh empty store rather than throwing', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'crucible-history-'));
  try {
    const file = path.join(dir, 'corrupt.json');
    await writeFileP(file, 'not valid json {{{', 'utf8');
    const s = loadStore(file);
    assert.deepEqual(s, emptyStore());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadStore on a well-formed JSON file missing the schema kind starts fresh', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'crucible-history-'));
  try {
    const file = path.join(dir, 'wrong-kind.json');
    await writeFileP(file, JSON.stringify({ kind: 'something-else', records: [] }), 'utf8');
    const s = loadStore(file);
    assert.deepEqual(s, emptyStore());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('saveStore never leaves a stray .tmp- file behind after a successful save', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'crucible-history-'));
  try {
    const file = path.join(dir, 'history.json');
    await saveStore(file, emptyStore());
    const entries = await readdir(dir);
    assert.deepEqual(entries, ['history.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
