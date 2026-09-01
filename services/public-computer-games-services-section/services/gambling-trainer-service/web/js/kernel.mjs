/**
 * `kernel` — the browser's (and this directory's tests') single door into the rules engine.
 *
 * Every export here is a straight re-export of `../../src/*.mts` — nothing is reimplemented,
 * ported, or duplicated (crucible-service's `kernel.mjs` pattern, copied in shape). This file
 * exists only because `<script type="module">` needs one stable import specifier for the whole
 * client to share, and because a plain `.mjs` re-export file works identically in both places
 * this code runs:
 *
 *  - under Node (this file, `web/test/*.test.mts`, `web/server.mjs`'s own boot) Node loads the
 *    `../../src/*.mts` specifiers below through its native TypeScript type-stripping;
 *  - in a real browser, `web/server.mjs` intercepts any request for a `*.mts` path, strips its
 *    types with `node:module`'s `stripTypeScriptTypes` and serves the result as
 *    `text/javascript`, so the browser's module loader receives plain, valid JS for the
 *    identical source file Node runs directly.
 *
 * `../../src/*.mts`'s own bare-specifier import of `@red-cup-engineering/cartridge/*` (inside
 * `cartridge.mts`, `daily.mts`, `manifest.mts`, `replay.mts`) is resolved by `web/index.html`'s
 * `<script type="importmap">`, not by anything in this file — see `web/server.mjs`'s module doc
 * for the vendor-serving side of that story.
 *
 * `cartridge.mts` is also deliberately NOT re-exported here (a genuine gotcha worth naming): it
 * re-exports `createEngine`/`applyIntent`/`replay` under the *same names* as `engine.mts`/
 * `replay.mts` (by design — it is a thin `Cartridge<>`-contract wrapper around them, matching
 * onestone-service's `cartridge.mts` pattern). Adding it to this `export *` list would make those
 * names ambiguous, and ES modules silently drop an ambiguous star-export binding rather than
 * erroring — `import { replay } from './kernel.mjs'` would resolve to `undefined` with no
 * warning.
 *
 * `replay.mts` and `manifest.mts` are ALSO deliberately NOT re-exported here: `replay.mts`
 * delegates to `@red-cup-engineering/cartridge/replay`'s `defaultReplay`, and `manifest.mts`
 * separately imports that same package's `createVerifier` — both routes land in the identical
 * vendor module, whose top level does `import { createHash } from 'node:crypto'` for its
 * `hashState` helper. `export *` evaluates the entire module graph eagerly regardless of what's
 * actually used, so re-exporting either file here would make every real page load (`app.mjs`
 * importing this file) unconditionally try to load `node:crypto` in the browser — a scheme no
 * browser module loader can resolve, breaking the whole client bundle before `main()` ever runs.
 * Nothing in `web/js/` ever imports
 * `replay`/`hashState`/`verify`/`manifest` from this file (replay verification and the
 * cartridge manifest are server/testing/storefront concerns — `src/replay.test.mts` and
 * `src/manifest.test.mts`'s job, and `catalog.json`'s own hand-authored copy on the storefront
 * side — never something the in-browser UI needs), so dropping both re-exports changes no
 * browser behavior and removes the leak. See `web/test/frontdoor.test.mts` for the regression
 * coverage (every importmap-mapped and kernel-reachable module must load with no `node:` leak).
 */
export * from '../../src/types.mts';
export * from '../../src/seed.mts';
export * from '../../src/kelly.mts';
export * from '../../src/odds.mts';
export * from '../../src/wagers.mts';
export * from '../../src/engine.mts';
export * from '../../src/disclosure.mts';
export * from '../../src/paths.mts';
export * from '../../src/daily.mts';
