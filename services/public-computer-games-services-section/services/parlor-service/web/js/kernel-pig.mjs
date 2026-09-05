/**
 * `kernel-pig` — the browser's single door into Pig's rules engine. A straight re-export of
 * `../../src/games/pig/*.mts` — nothing reimplemented or ported (crucible/gambling-trainer's
 * `kernel.mjs` pattern). Node loads the `.mts` specifiers below through native type-stripping;
 * in the browser, `web/server.mjs` intercepts `.mts` requests, strips them, and serves plain JS
 * for the identical source file. `cartridge.mts`/`manifest.mts` are Node/server-side-only
 * (bare `@red-cup-engineering/cartridge/manifest` import used only for verifier tooling) and are
 * deliberately not re-exported here — the browser client only needs `engine`, `odds`, `bot`,
 * and `daily`.
 */
export * from '../../src/games/pig/rules.mts';
export * from '../../src/games/pig/engine.mts';
export * from '../../src/games/pig/odds.mts';
export * from '../../src/games/pig/bot.mts';
export * from '../../src/games/pig/daily.mts';
