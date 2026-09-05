/**
 * `kernel` — the browser's (and this directory's tests') single door into the domain engine.
 *
 * Every export here is a straight re-export of `../../src/*.mts` — nothing is reimplemented,
 * ported, or duplicated (gambling-trainer-service's `kernel.mjs` pattern, copied in shape). This
 * file exists only because `<script type="module">` needs one stable specifier the whole client
 * can share, and because a plain `.mjs` re-export file works identically in both places this code
 * runs:
 *
 *  - under Node (this file, `web/test/*.test.mts`, `web/server.mjs`'s own boot) Node loads the
 *    `../../src/*.mts` specifiers below through its native TypeScript type-stripping;
 *  - in a real browser, `web/server.mjs` intercepts any request for a `*.mts` path, strips its
 *    types with `node:module`'s `stripTypeScriptTypes` and serves the result as
 *    `text/javascript`, so the browser's module loader receives plain, valid JS for the identical
 *    source file Node runs directly. No file under `src/` is ever duplicated for the browser.
 *
 * `../../src/cartridge.mts`'s one runtime (non-type-only) import of `@red-cup-engineering/cartridge/replay`
 * is resolved by `web/index.html`'s `<script type="importmap">`, not by anything in this file —
 * see `web/server.mjs`'s module doc for the vendor-serving side of that story. Every OTHER
 * `@red-cup-engineering/cartridge/*` import anywhere under `src/` is `import type` (erased entirely by
 * type-stripping, per this codebase's `verbatimModuleSyntax` tsconfig setting), so it never
 * reaches the browser's module loader at all.
 *
 * No name collisions exist between `cartridge.mts`'s exports (`createEngine`, `applyIntent`,
 * `replay`, `serialize`, `deserialize`, `stokeCartridge`) and any other domain module's exports —
 * unlike flickering-delve's/onestone's `kernel.mjs`, which had to omit `cartridge.mts` for exactly
 * that reason, stoke's `cartridge.mts` is included below without qualification. `cartridge.manifest.mts`
 * is deliberately NOT re-exported: it is the one Node/server-side-only concern here (`web/server.mjs`
 * imports it directly for the `/api/manifest` route), and the browser client never needs it.
 */
export * from "../../src/graph.mts";
export * from "../../src/eigen.mts";
export * from "../../src/tick.mts";
export * from "../../src/prestige.mts";
export * from "../../src/provenance.mts";
export * from "../../src/state.mts";
export * from "../../src/intents.mts";
export * from "../../src/cartridge.mts";
