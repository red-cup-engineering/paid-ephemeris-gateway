/**
 * @emsenn/game-topology — the closure/settling engine of concurrent game systems.
 *
 * Where game-algebra gives the carriers (designs, polarities, arenas) and the
 * raw interaction morphism (knowledge-join), this package gives the settling:
 * orthogonality (interaction converges by reaching the Daimon), behaviours (the
 * bi-orthogonal closures of design-sets), and formulas (the names of
 * behaviours).  This mirrors how `@emsenn/meme-topology` hosts the closure
 * engine over `@emsenn/meme-algebra`; indeed the corpus's slogan is that
 * "settling IS dialogical interaction" — closing a valuation under a
 * closure-rule system is interacting against a behaviour and converging.
 */
export * from "./orthogonality.mjs";
export * from "./behaviour.mjs";
export * from "./formula.mjs";
export * from "./incarnation.mjs";
export * from "./internal-completeness.mjs";
export * from "./locativity.mjs";
export * from "./chronicle-convergence.mjs";
