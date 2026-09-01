/**
 * `kernel-chutes` — the browser's single door into Chutes & Ladders' rules engine. A straight
 * re-export of `../../src/games/chutes/*.mts` — nothing reimplemented or ported, matching
 * `kernel-pig.mjs`'s pattern. `cartridge.mts`/`manifest.mts` are Node/server-side-only (the
 * bare `@red-cup-engineering/cartridge/manifest` import is used only for verifier tooling) and are
 * deliberately not re-exported here — the browser client only needs `board`, `engine`, `odds`,
 * and `daily`.
 */
export * from '../../src/games/chutes/board.mts';
export * from '../../src/games/chutes/engine.mts';
export * from '../../src/games/chutes/odds.mts';
export * from '../../src/games/chutes/daily.mts';
