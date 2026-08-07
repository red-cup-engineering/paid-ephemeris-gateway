/**
 * @emsenn/game-analysis — the dynamics of games over $\mathbf{CGS}$.
 *
 * Where `@emsenn/game-algebra` and `@emsenn/game-topology` give the static
 * objects of the theory of computing (arenas, plays, strategies, designs,
 * interaction, behaviours, formulas), this package reads their *motion*,
 * mirroring `@emsenn/meme-analysis` (evidence / spectral) one layer up:
 *
 *   - **trajectory** — a play read as a sequence of positions, with
 *     maximality (the stuck position) as a witness/obstruction judgment.
 *   - **regime** — the four Caillois modes (agon / alea / mimicry / ilinx) as
 *     commensurable structural scores of an arena, with a dominant classifier.
 *     Agon ↔ balanced polarity, alea ↔ conflict-branching, mimicry ↔ symmetry
 *     richness, ilinx ↔ causal depth (cultural-ludic embedding, corpus).
 *   - **flow** — Csikszentmihalyi's challenge↔skill matching: challenge as
 *     arena complexity, skill as strategy coverage, flow within a band.
 *   - **cascade** — the settlement cascade (ilinx): iterated interaction depth
 *     to the Daimon, measured over `interactionReport` / `convergenceJudgment`.
 *
 * On top of those four dynamics this package operationalizes the lab's
 * cultural-ludic theory (the 2026-05-24 ludics journals) — the *meaning* of
 * games, not just their motion:
 *
 *   - **regime-conditions** — each Caillois regime's *necessary condition* as a
 *     witness/obstruction (agon fairness, alea indeterminacy, mimicry boundary,
 *     ilinx reversibility), refining `classifyRegime` from "how much" to
 *     "whether at all," reusing the regime scores and the settling cascade.
 *   - **lusory-attitude** — Suits' four-part game (prelusory goal, constitutive
 *     rules, lusory means, lusory attitude): voluntarily accepting unnecessary
 *     constraints to reach the goal = image-condition (I1).
 *   - **rhetorics** — Sutton-Smith's seven rhetorics as a frozen vocabulary, and
 *     play's constitutive ambiguity: incompatible rhetorics in tension take the
 *     designated paraconsistent charge $\top$ = `stable`.
 *   - **deep-play** — Geertz: play is deep (symbolic) when its stakes exceed
 *     instrumental rationality.
 *   - **cultural-embedding** — the functor $\Phi$: its thirteen object
 *     correspondences as data, and the five image-conditions (I1)–(I5) as the
 *     witness/obstruction that a cultural structure is *ludically structured*.
 *
 * Pure, total, frozen carriers; witness/obstruction judgments; exact `Rational`
 * scores with float reads kept to none — every measure here is exact.  The meme
 * bilattice, the join, duality, and the closure are reused, never reinvented.
 */
export * from "./trajectory.mjs";
export * from "./regime.mjs";
export * from "./flow.mjs";
export * from "./cascade.mjs";
export * from "./regime-conditions.mjs";
export * from "./lusory-attitude.mjs";
export * from "./rhetorics.mjs";
export * from "./deep-play.mjs";
export * from "./cultural-embedding.mjs";
