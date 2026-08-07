/**
 * @emsenn/game-logic — the linear-logic proof layer of concurrent game systems.
 *
 * Where `@emsenn/game-algebra` gives the carriers (designs, polarities, arenas,
 * the interaction join) and `@emsenn/game-topology` gives the settling
 * (orthogonality, behaviours, formulas), this package gives the PROOF THEORY: the
 * connectives of classical linear logic as a typed vocabulary, linear negation as
 * the structural De Morgan involution `dualProp` (reusing game-algebra `dual` at
 * atoms), the MLL < MALL < {ILL, CLL} < LL fragment lattice as an explicit finite
 * poset (predication-typed-subtheory-lattice-is-linear-logic-fragment-lattice.md),
 * Andreoli focusing polarity (reusing the game-algebra `Polarity` carrier), the
 * exponential-as-closure note ($!$ = bi-orthogonal closure of game-topology), and
 * the Caires-Pfenning session-types-as-propositions map (Caires-Pfenning 2010;
 * Wadler 2012). It mirrors `@emsenn/meme-logic`, the proof layer over the meme
 * apex.
 *
 * The corpus theorem: "the theory of computing is CGS", and its typed subtheory
 * lattice IS the linear logic fragment lattice — so CLL is the proof-theoretic
 * name of the $*$-autonomous structure these packages realize.
 */
export * from "./proposition.mjs";
export * from "./fragment.mjs";
export * from "./focusing.mjs";
export * from "./exponential.mjs";
export * from "./session.mjs";
export * from "./dialectica.mjs";
export * from "./embeddings.mjs";
export * from "./computational-ludics.mjs";
