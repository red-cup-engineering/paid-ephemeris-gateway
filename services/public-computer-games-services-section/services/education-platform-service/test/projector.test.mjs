import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEducationProjector } from '../src/projector.mjs';
import { iyappyCourse } from '../themes/iyappy/course.mjs';
import { buildSampleWorld } from './fixtures/sample-builder.mts';

const course = Object.freeze({
  id: 'sample',
  buildWorld: buildSampleWorld,
  adapter: Object.freeze({ path: 'js/vendor/themes/sample/adapter.js', exportName: 'sampleTheme' }),
  browserModules: Object.freeze([
    Object.freeze({ source: new URL('./fixtures/sample-adapter.mjs', import.meta.url), path: 'js/vendor/themes/sample/adapter.js' }),
  ]),
});

test('education projector emits a TUFTE shell, controller, course world, and adapter', async () => {
  const projector = createEducationProjector({ mountPath: '/', course, brand: { title: 'Sample course', tufteTheme: 'early-mac' } });
  const projected = await projector.project();
  const artifacts = new Map(projected.artifacts.map((artifact) => [artifact.path, artifact.body]));
  assert.match(artifacts.get('index.html'), /data-tufte-theme="early-mac"/);
  assert.match(artifacts.get('index.html'), /id="load-status"/);
  assert.match(artifacts.get('index.html'), /id="room-list"/);
  assert.match(artifacts.get('index.html'), /id="content-panel"/);
  assert.match(artifacts.get('index.html'), /src="\.\/js\/education-bootstrap\.js"/);
  assert.match(artifacts.get('data/sample-world.json'), /"rooms"/);
  assert.ok(artifacts.has('js/app.js'));
  assert.match(artifacts.get('js/education-bootstrap.js'), /from '\.\/app\.js'/);
  assert.match(artifacts.get('js/education-bootstrap.js'), /new URL\("\.\.\/data\/sample-world\.json", import\.meta\.url\)/);
  assert.ok(artifacts.has('js/vendor/themes/sample/adapter.js'));
});

test('education projector nests all course artifacts below a mount path', async () => {
  const projector = createEducationProjector({ mountPath: '/learn/', course });
  const projected = await projector.project();
  assert.ok(projected.artifacts.every((artifact) => artifact.path.startsWith('learn/')));
});

test('the iYappy preset emits its compiled course and browser adapter through the generic projector', async () => {
  const projected = await createEducationProjector({ mountPath: '/', course: iyappyCourse }).project();
  const artifacts = new Map(projected.artifacts.map((artifact) => [artifact.path, artifact.body]));
  assert.match(artifacts.get('data/iyappy-world.json'), /"form-recall"/);
  assert.match(artifacts.get('js/vendor/themes/iyappy/browser-adapter.js'), /iyappyTheme/);
  assert.match(artifacts.get('js/vendor/themes/iyappy/registry.js'), /formRecallChecker/);
  assert.ok(artifacts.has('js/vendor/browser-local-state.js'));
  assert.ok(artifacts.has('js/vendor/markdown/render-markdown-inline-html.js'));
  assert.ok(artifacts.has('js/vendor/markdown/read-markdown-features.js'));
  assert.ok(artifacts.has('js/vendor/markdown/admit-markdown-link-target.js'));
  assert.match(artifacts.get('js/vendor/markdown/render-markdown-inline-html.js'), /from "\.\/read-markdown-features\.js"/);
});
