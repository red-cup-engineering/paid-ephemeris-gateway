/**
 * `sync-vendor` -- the web face's build step (self-education-platform-design.md §8 point 5:
 * "vendor a copy, not a cross-service import"), applied here at the browser boundary rather than
 * the service boundary: the deployed `web/` directory must be fully self-contained
 * (`web/server.mjs`'s own discipline: "never needs to reach outside its own root"), so this
 * script produces a REAL, deterministic, checked-in browser-runnable copy of exactly the two
 * things the client needs, both DERIVED from the real source rather than hand-duplicated:
 *
 *   1. The platform kernel + Equivo theme `.mts` modules the client actually uses (checker,
 *      register, srs, session, persistence, mastery; the equivo registry + registers), run through
 *      Node's own `stripTypeScriptTypes` (the identical primitive the server-side `.mts` execution
 *      path already uses, and `check-mts.mjs` already validates against) -- NOT a hand-ported
 *      re-implementation like Lantern's `web/js/engine/*.js` (that file's own header explains
 *      that choice was about a *pre-native-TS-stripping* Node; this service requires Node >=24,
 *      where the stripper is a stable public primitive, so mechanical stripping is strictly more
 *      faithful than a hand port and carries zero risk of the two copies drifting apart).
 *   2. `@lenticule-science/metrologic`'s `bilattice` and `obstruction/{settling,cochain}` sources, copied
 *      BYTE-IDENTICAL (they are already zero-dependency, browser-safe ESM -- no Node builtins,
 *      confirmed by grep before this script was written) -- this is what makes the browser's own
 *      grading a REAL run of the same math the server/tests run, not a client-side mock.
 *
 * Bare `@lenticule-science/metrologic/...` specifiers are left untouched in the stripped output; `index.html`'s
 * own `<script type="importmap">` resolves them to the vendored copies -- no bundler, no CDN, no
 * network origin beyond the page's own.
 *
 * Run: `node web/build/sync-vendor.mjs` (also driven by `npm run build:vendor` / `build:web`).
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
  const rewritten = stripped.replace(/(from\s+['"])(\.\.?\/[^'"]+)\.mts(['"])/g, '$1$2.js$3');
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
}

/** Copy `@lenticule-science/metrologic`'s bilattice + obstruction/{settling,cochain} sources byte-identical --
 * already zero-dependency, browser-safe ESM (verified: no `node:*` imports anywhere in either
 * package directory as of this script's own authoring). */
function syncMath() {
  const mathRoot = join(SERVICE_ROOT, 'node_modules', '@561-group', 'math');
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

function main() {
  syncModules();
  syncMath();
  process.stdout.write(`sync-vendor: wrote ${MODULES.length} stripped platform/theme modules + 6 bilattice + 2 obstruction math files to ${VENDOR_ROOT}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
