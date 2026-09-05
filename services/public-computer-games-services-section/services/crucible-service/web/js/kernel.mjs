/**
 * `kernel` — the browser's (and this directory's tests') single door into the rules engine.
 *
 * Every export here is a straight re-export of `../../src/*.mts` — nothing is reimplemented,
 * ported, or duplicated (ANATOMY digest's pattern 3, "serve real .mts", following
 * solitaire-service exactly). This file exists only because `<script type="module">` needs
 * *one* stable import specifier for the whole client to share, and because a plain `.mjs`
 * re-export file works identically in both places this code runs:
 *
 *  - under Node (this file, `web/test/*.test.mts`, `web/server.mjs`'s own boot) Node loads the
 *    `../../src/*.mts` specifiers below through its native TypeScript type-stripping — the same
 *    mechanism `package.json`'s `check`/`test` scripts already rely on for `src/*.mts` itself;
 *  - in a real browser, `web/server.mjs` intercepts any request for a `*.mts` path, strips its
 *    types with `node:module`'s `stripTypeScriptTypes` and serves the result as
 *    `text/javascript`, so the browser's module loader receives plain, valid JS for the
 *    identical source file Node runs directly.
 *
 * The engine's own bare-specifier import of `@lenticule-science/metrologic/obstruction/...` (inside
 * `src/obstruction.mts`) is resolved by `web/index.html`'s `<script type="importmap">`, not by
 * anything in this file — one source of truth, two loaders, plus one import map. See
 * `web/server.mjs`'s module doc for the vendor-serving side of that story.
 */
export * from '../../src/types.mts';
export * from '../../src/seed.mts';
export * from '../../src/daily.mts';
export * from '../../src/tangle.mts';
export * from '../../src/obstruction.mts';
export * from '../../src/engine.mts';
export * from '../../src/validate.mts';
export * from '../../src/replay.mts';
export * from '../../src/history.mts';
