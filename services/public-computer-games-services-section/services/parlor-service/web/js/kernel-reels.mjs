/**
 * `kernel-reels` — the browser's single door into Fair Spin's rules engine. A straight
 * re-export of `../../src/games/reels/*.mts`, matching `kernel-pig.mjs`'s pattern.
 * `cartridge.mts`/`manifest.mts` are Node/server-side-only and deliberately not re-exported —
 * the browser client only needs `data`, `disclosure`, `engine`, and `daily`.
 */
export * from '../../src/games/reels/data.mts';
export * from '../../src/games/reels/disclosure.mts';
export * from '../../src/games/reels/engine.mts';
export * from '../../src/games/reels/daily.mts';
