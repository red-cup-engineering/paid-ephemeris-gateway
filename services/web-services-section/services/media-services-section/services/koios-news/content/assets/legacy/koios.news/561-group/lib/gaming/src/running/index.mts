/**
 * @emsenn/gaming/running — the operational core of a running game.
 *
 * Per the corpus, "the theory of computing is $\mathbf{CGS}$" (concurrent games
 * with symmetry): a running game IS a concurrent game system — a frozen
 * configuration of an arena, the designs in play, a current play, and the
 * interaction history, every part a carrier of `@emsenn/gaming` /
 * `@emsenn/gaming`, nothing invented. Transitions (`addDesign`,
 * `playMove`, `runInteraction`, `settle`) are pure functions returning new
 * `Game` states or obstructions; `GameComputer` is the thin immutable registry
 * around them; `snapshot`/`restore` bridge to JSON via `@emsenn/gaming/encoding`;
 * `store` is the filesystem boundary; `demo` offers named arenas; `analysis`
 * surfaces the operationalized ludic theory over a game's arena.
 *
 * This is the consolidated former `apps/game-computer` plus the reusable
 * operational pieces (store/demo/analysis) lifted out of the game server.
 */
export * from "./game.mjs";
export * from "./computer.mjs";
export * from "./snapshot.mjs";
export * from "./store.mjs";
export * from "./demo.mjs";
export * from "./analysis.mjs";
export * from "./cli.mjs";
