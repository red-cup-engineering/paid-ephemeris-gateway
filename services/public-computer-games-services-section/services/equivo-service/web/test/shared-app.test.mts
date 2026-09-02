import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createEducationAppConfig } from '../js/app.js';
import { createStateStore } from '../js/state.js';
import { renderMarkdown, stripExerciseFences } from '../js/markdown.js';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
}

test('two course configurations retain distinct worlds and theme-keyed player state', () => {
  const first = createEducationAppConfig({ themeId: 'course-one', worldUrl: 'data/course-one.json', checkers: {}, createAnswerForm() {} });
  const second = createEducationAppConfig({ themeId: 'course-two', worldUrl: 'data/course-two.json', checkers: {}, createAnswerForm() {} });
  assert.notEqual(first.worldUrl, second.worldUrl);

  const storage = memoryStorage();
  const firstStore = createStateStore(first.themeId, storage);
  const secondStore = createStateStore(second.themeId, storage);
  const firstState = firstStore.load();
  firstStore.save({ ...firstState, exercises: { lesson: { stability: 3, difficulty: 4, lastReviewedAt: 12 } } });
  assert.deepEqual(secondStore.load().exercises, {});
  assert.equal(firstStore.load().exercises.lesson.stability, 3);
});

test('state store falls back safely when the localStorage getter is denied', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, get() { throw new Error('denied'); } });
  try {
    const store = createStateStore('denied-storage');
    assert.equal(store.load().themeId, 'denied-storage');
    assert.equal(store.mode, 'session');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test('shared controller has no theme-specific dependency', async () => {
  const source = await readFile(fileURLToPath(new URL('../js/app.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /equivo/i);
});

test('adapter-declared exercise fences survive app configuration and are hidden from lesson prose', () => {
  const body = ['before', '```course-exercise', '{"answer":"metadata"}', '```', '```js', 'const visible = true;', '```', 'after'].join('\n');
  const adapter = createEducationAppConfig({
    themeId: 'course-fences',
    worldUrl: 'data/course-fences.json',
    checkers: {},
    createAnswerForm() {},
    exerciseFenceLabels: ['course-exercise'],
  });
  const rendered = stripExerciseFences(body, adapter.exerciseFenceLabels);
  assert.doesNotMatch(rendered, /metadata/);
  assert.match(rendered, /const visible = true/);
});

test('lesson markdown uses the upstream inline renderer for admitted links and rejects unsafe targets', () => {
  assert.match(renderMarkdown('Read [the source chart](https://example.test/chart).'), /<a href="https:\/\/example\.test\/chart">the source chart<\/a>/);
  const unsafe = renderMarkdown('Never run [this](javascript:alert(1)).');
  assert.match(unsafe, /this/);
  assert.doesNotMatch(unsafe, /href=/);
});
