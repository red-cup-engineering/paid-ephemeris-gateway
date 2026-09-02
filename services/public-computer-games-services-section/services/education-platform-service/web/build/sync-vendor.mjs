/**
 * Build step for the deployed `web/` face: derives browser-runnable copies of the platform/theme
 * `.mts` modules (`stripTypeScriptTypes`) plus a byte-identical copy of
 * `@lenticule-science/metrologic`'s `bilattice`/`obstruction` sources, so the page's import map
 * resolves bare specifiers locally with no bundler or network origin.
 * @module sync-vendor
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, '..');
const SERVICE_ROOT = join(WEB_ROOT, '..');
const VENDOR_ROOT = join(WEB_ROOT, 'js', 'vendor');

/** Strip one `.mts` source file to browser-runnable `.js`, rewriting relative `...mts` import
 * specifiers to `...js` (the stripped output's own real filenames) -- bare specifiers
 * (`@lenticule-science/metrologic/...`) are left alone for the page's import map to resolve. */
function stripModule(srcPath, destPath) {
  const source = readFileSync(srcPath, 'utf8');
  const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
  const rewritten = stripped.replace(/(from\s+['"])(\.\.?\/[^'"]+)\.mts(['"])/g, '$1$2.js$3').replace("'@red-cup-engineering/browser-local-state-service'", "'../browser-local-state.js'");
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, rewritten, 'utf8');
}

const MODULES = [
  ['src/checker.mts', 'vendor/src/checker.js'],
  ['src/register.mts', 'vendor/src/register.js'],
  ['src/srs.mts', 'vendor/src/srs.js'],
  ['src/session.mts', 'vendor/src/session.js'],
  ['src/persistence.mts', 'vendor/src/persistence.js'],
  ['src/mastery.mts', 'vendor/src/mastery.js'],
  ['themes/equivo/registry.mts', 'vendor/themes/equivo/registry.js'],
  ['themes/equivo/registers/concept-key.mts', 'vendor/themes/equivo/registers/concept-key.js'],
  ['themes/equivo/registers/obsmetrologia.mts', 'vendor/themes/equivo/registers/obsmetrologia.js'],
  ['themes/equivo/registers/semiotics.mts', 'vendor/themes/equivo/registers/semiotics.js'],
  ['themes/equivo/registers/relationality.mts', 'vendor/themes/equivo/registers/relationality.js'],
  ['themes/equivo/registers/lakotaean.mts', 'vendor/themes/equivo/registers/lakotaean.js'],
  ['themes/equivo/registers/index.mts', 'vendor/themes/equivo/registers/index.js'],
];

function syncModules() {
  for (const [rel, out] of MODULES) {
    stripModule(join(SERVICE_ROOT, rel), join(WEB_ROOT, 'js', out));
  }
  cpSync(join(SERVICE_ROOT, 'node_modules', '@red-cup-engineering', 'browser-local-state-service', 'src', 'browser-local-state.mjs'), join(VENDOR_ROOT, 'browser-local-state.js'));
}

/** Copy `@lenticule-science/metrologic`'s bilattice + obstruction/{settling,cochain} sources byte-identical --
 * already zero-dependency, browser-safe ESM (verified: no `node:*` imports anywhere in either
 * package directory as of this script's own authoring). */
function syncMath() {
  const mathRoot = join(SERVICE_ROOT, 'node_modules', '@lenticule-science', 'metrologic');
  const bilatticeSrc = join(mathRoot, 'bilattice', 'src');
  const bilatticeDest = join(VENDOR_ROOT, 'math', 'bilattice');
  mkdirSync(bilatticeDest, { recursive: true });
  for (const f of ['index.mjs', 'charge.mjs', 'descent.mjs', 'cone.mjs', 'void.mjs', 'internal.mjs']) {
    cpSync(join(bilatticeSrc, f), join(bilatticeDest, f));
  }

  const obstructionSrc = join(mathRoot, 'obstruction', 'src');
  const obstructionDest = join(VENDOR_ROOT, 'math', 'obstruction');
  mkdirSync(obstructionDest, { recursive: true });
  for (const f of ['settling.mjs', 'cochain.mjs']) {
    cpSync(join(obstructionSrc, f), join(obstructionDest, f));
  }
}

function syncMarkdownInlineRenderer() {
  const markdownRoot = join(SERVICE_ROOT, 'node_modules', '@red-cup-engineering');
  const output = join(VENDOR_ROOT, 'markdown');
  mkdirSync(output, { recursive: true });
  const modules = [
    ['read-markdown-features-service/scripts/read-markdown-features.mjs', 'read-markdown-features.js'],
    ['admit-markdown-link-target-service/scripts/admit-markdown-link-target.mjs', 'admit-markdown-link-target.js'],
    ['render-markdown-inline-html-service/scripts/render-markdown-inline-html.mjs', 'render-markdown-inline-html.js'],
  ];
  for (const [source, destination] of modules) {
    let body = readFileSync(join(markdownRoot, source), 'utf8');
    if (destination === 'render-markdown-inline-html.js') {
      body = body
        .replace('"@red-cup-engineering/read-markdown-features-service"', '"./read-markdown-features.js"')
        .replace('"@red-cup-engineering/admit-markdown-link-target-service"', '"./admit-markdown-link-target.js"');
    }
    writeFileSync(join(output, destination), body);
  }
}

function main() {
  syncModules();
  syncMath();
  syncMarkdownInlineRenderer();
  process.stdout.write(`sync-vendor: wrote ${MODULES.length} stripped platform/theme modules + 6 bilattice + 2 obstruction math + 3 markdown modules to ${VENDOR_ROOT}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
