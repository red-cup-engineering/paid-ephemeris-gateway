/**
 * `kernel` — the browser's (and this directory's tests') single door into the rules engine.
 *
 * Every export here is a straight re-export of `../../src/*.mts` — nothing is reimplemented,
 * ported, or duplicated. `src/*.mts` is the one rules engine (DESIGN.md); this file exists only
 * because `<script type="module">` needs *one* stable import specifier for the whole client to
 * share, and because a plain `.mjs` re-export file happens to work identically in both places
 * this code runs:
 *
 *  - under Node (this file, `web/test/*.test.mts`, `web/server.mjs`'s own boot) Node loads the
 *    `../../src/*.mts` specifiers below through its native TypeScript type-stripping — the exact
 *    mechanism `package.json`'s `check`/`test` scripts already rely on for `src/*.mts` itself;
 *  - in a real browser, `web/server.mjs` intercepts any request for a `*.mts` path, strips its
 *    types with `node:module`'s `stripTypeScriptTypes` (the same stripper, not a reimplementation
 *    of it) and serves the result as `text/javascript`, so the browser's module loader receives
 *    plain, valid JS for the identical source file Node runs directly.
 *
 * One source of truth, two loaders. See `web/server.mjs`'s module doc for the serving side.
 */
export * from '../../src/cards.mts';
export * from '../../src/engine.mts';
export * from '../../src/daily.mts';
