import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { posix } from 'node:path';
import { renderTufteDocument } from '@red-cup-engineering/web-tufte-gui-services-section';

const RUNTIME_MODULES = [
  ['../web/js/app.js', 'js/app.js'],
  ['../web/js/state.js', 'js/state.js'],
  ['../web/js/markdown.js', 'js/markdown.js'],
  ['checker.mts', 'js/vendor/src/checker.js'],
  ['srs.mts', 'js/vendor/src/srs.js'],
  ['session.mts', 'js/vendor/src/session.js'],
  ['mastery.mts', 'js/vendor/src/mastery.js'],
  ['persistence.mts', 'js/vendor/src/persistence.js'],
  [import.meta.resolve('@red-cup-engineering/browser-local-state-service'), 'js/vendor/browser-local-state.js'],
  [import.meta.resolve('@red-cup-engineering/read-markdown-features-service'), 'js/vendor/markdown/read-markdown-features.js'],
  [import.meta.resolve('@red-cup-engineering/admit-markdown-link-target-service'), 'js/vendor/markdown/admit-markdown-link-target.js'],
  [import.meta.resolve('@red-cup-engineering/render-markdown-inline-html-service'), 'js/vendor/markdown/render-markdown-inline-html.js'],
];

const EDUCATION_STYLES = `
.education-app{display:grid;grid-template-columns:minmax(12rem,16rem) minmax(0,1fr);gap:1rem;align-items:start}
.education-app #load-status,.education-app #storage-status,.education-app .education-actions{grid-column:1/-1;margin:0}
.education-app #room-list{display:flex;flex-direction:column;gap:.35rem;position:sticky;top:1rem}
.education-app .room-item{display:flex;align-items:center;gap:.5rem;width:100%;text-align:left}
.education-app .room-title{flex:1}.education-app .room-mastery{font-size:.8em}
.education-app .room-dot,.education-app .progress-dot{display:inline-block;background:currentColor;opacity:.25}
.education-app .room-dot{width:.65rem;height:.65rem;border-radius:50%;flex:none}
.education-app .room-item.unlocked .room-dot,.education-app .room-item.mastered .room-dot,.education-app .progress-dot.current,.education-app .progress-dot.done{opacity:1}
.education-app #content-panel{min-width:0;padding:.25rem 0;min-height:18rem}
.education-app .answer-form{display:flex;flex-direction:column;gap:.65rem;max-width:34rem}.education-app .answer-form label{display:grid;gap:.3rem}
.education-app .grade-row,.education-app .toggle-row,.education-app .radio-row,.education-app .progress-strip,.education-app .education-actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.education-app .progress-dot{width:1.4rem;height:.35rem}.education-app .verdict{margin-top:.9rem;padding:.65rem;border:1px solid currentColor}.education-app .verdict.fail{border-style:dashed}.education-app .verdict.pass{border-style:double}
.education-app pre{overflow:auto}.education-app table{width:100%;border-collapse:collapse}.education-app th,.education-app td{border:1px solid currentColor;padding:.35rem;text-align:left}
@media(max-width:42rem){.education-app{grid-template-columns:1fr}.education-app #room-list{position:static}}
`;

function mountDirectory(mountPath) {
  if (mountPath === '/') return '';
  if (typeof mountPath !== 'string' || !/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/i.test(mountPath)) {
    throw new TypeError('mountPath must be / or a slash-terminated path of URL segments');
  }
  return mountPath.slice(1, -1);
}

function artifactPath(directory, path) {
  return directory ? `${directory}/${path}` : path;
}

function browserModule(source, path) {
  const url = source instanceof URL ? source : new URL(source);
  if (typeof path !== 'string' || !path) {
    throw new TypeError('course browser modules need URL sources and relative output paths');
  }
  return { source: url, path };
}

function safeCourseId(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value)) throw new TypeError('course id must be a lowercase URL-safe token');
  return value;
}

function safeModulePath(value) {
  if (typeof value !== 'string' || !/^(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.js$/i.test(value) || value.includes('..')) {
    throw new TypeError('browser module paths must be relative .js paths without dot segments');
  }
  return value;
}

function safeExportName(value) {
  if (typeof value !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) throw new TypeError('adapter exportName must be a JavaScript identifier');
  return value;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

async function emittedModule({ source, path }, directory) {
  const text = await readFile(source, 'utf8');
  const body = source.pathname.endsWith('.mts')
    ? stripTypeScriptTypes(text, { mode: 'strip' }).replace(/(from\s+['"])(\.\.?\/[^'"]+)\.mts(['"])/g, '$1$2.js$3').replace("'@red-cup-engineering/browser-local-state-service'", "'../browser-local-state.js'")
    : text;
  return {
    path: artifactPath(directory, path),
    body: body
      .replace('"@red-cup-engineering/read-markdown-features-service"', '"./read-markdown-features.js"')
      .replace('"@red-cup-engineering/admit-markdown-link-target-service"', '"./admit-markdown-link-target.js"'),
    source: source.href,
  };
}

function educationShell({ brand, course, bootstrapHref }) {
  const title = brand?.title ?? course.id;
  const subtitle = brand?.subtitle ?? '';
  const orientation = brand?.orientationHtml ?? '';
  const source = brand?.sourceHtml ?? '';
  const appHtml = `<div class="education-app" lang="${escapeAttribute(brand?.language ?? 'en')}"><p id="load-status" role="status">Loading course…</p><nav id="room-list" aria-label="Course rooms"></nav><section id="content-panel" aria-live="polite"></section><p id="storage-status" role="status" hidden></p><p class="education-actions"><button type="button" id="btn-export">Export save</button><button type="button" id="btn-import">Import save</button><input type="file" id="file-import" accept="application/json" hidden></p></div>`;
  return renderTufteDocument({
    title,
    subtitle,
    tiles: [
      { id: 'orientation', title: brand?.orientationTitle ?? 'Start here', html: orientation || '<p>Choose a room to begin.</p>' },
      { id: 'course', title: brand?.courseTitle ?? 'Practice', html: appHtml, span: 8 },
      { id: 'source', title: brand?.sourceTitle ?? 'Source', html: source || '<p>Course material is identified with the lesson.</p>', span: 4 },
    ],
  }, {
    theme: brand?.tufteTheme,
    language: brand?.language ?? 'en',
    documentTitle: brand?.documentTitle ?? title,
    styles: EDUCATION_STYLES,
    headHtml: `<script type="module" src="${escapeAttribute(bootstrapHref)}"></script>`,
  });
}

function educationBootstrap({ adapterPath, adapterExportName, worldPath }) {
  const relativeAdapterPath = posix.relative('js', adapterPath);
  const adapterHref = relativeAdapterPath.startsWith('.') ? relativeAdapterPath : `./${relativeAdapterPath}`;
  return `import { mountEducationApp } from './app.js';\n` +
    `import { ${adapterExportName} } from ${JSON.stringify(adapterHref)};\n` +
    `mountEducationApp({ root: document, adapter: { ...${adapterExportName}, worldUrl: new URL(${JSON.stringify(`../${worldPath}`)}, import.meta.url).href } });\n`;
}

/** Create a VICTOR projector for one parameterized education course. */
export function createEducationProjector({ mountPath = '/', course, brand = {} } = {}) {
  if (!course?.id || typeof course.buildWorld !== 'function' || !course.adapter?.exportName || !Array.isArray(course.browserModules)) {
    throw new TypeError('course needs an id, buildWorld(), adapter export metadata, and browserModules');
  }
  const courseId = safeCourseId(course.id);
  const directory = mountDirectory(mountPath);
  const modules = [
    ...RUNTIME_MODULES.map(([source, path]) => browserModule(new URL(source, import.meta.url), path)),
    ...course.browserModules.map(({ source, path }) => browserModule(source, safeModulePath(path))),
  ];
  const adapterPath = safeModulePath(course.adapter.path);
  safeExportName(course.adapter.exportName);
  if (!modules.some((module) => module.path === adapterPath)) throw new TypeError('course adapter path must be included in browserModules');

  return Object.freeze({
    name: `education-${courseId}`,
    priority: 15,
    async project() {
      const world = await course.buildWorld();
      const worldPath = `data/${courseId}-world.json`;
      const bootstrapPath = 'js/education-bootstrap.js';
      const artifacts = await Promise.all(modules.map((module) => emittedModule(module, directory)));
      artifacts.push(
        { path: artifactPath(directory, worldPath), body: `${JSON.stringify(world, null, 2)}\n`, source: `course:${courseId}:world` },
        { path: artifactPath(directory, bootstrapPath), body: educationBootstrap({ adapterPath, adapterExportName: course.adapter.exportName, worldPath }), source: `course:${courseId}:bootstrap` },
        { path: artifactPath(directory, 'index.html'), body: educationShell({ brand, course: { ...course, id: courseId }, bootstrapHref: `./${bootstrapPath}` }), source: `course:${courseId}:shell` },
      );
      return { artifacts };
    },
  });
}
