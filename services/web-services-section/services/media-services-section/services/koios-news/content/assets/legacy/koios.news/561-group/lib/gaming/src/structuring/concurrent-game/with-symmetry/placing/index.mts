/**
 * @emsenn/game-geometry — the causal/spatial geometry of games.
 *
 * Mirrors @emsenn/meme-geometry (spatial/temporal) on the game-algebra side:
 * the geometry of arenas, event structures, configurations, and loci.
 *
 *   - `covering`       — the causal order as a covering (Hasse) relation:
 *                        immediate causation edges.
 *   - `configurations` — configurations as a Scott / dI-domain ordered by
 *                        inclusion: total meets, partial (bounded) joins, and
 *                        the domain's single-event covering relation.
 *   - `locus-tree`     — the prefix-tree geometry of a design's loci: depth,
 *                        subtree, siblings, children.
 *   - `magic-circle`   — Huizinga's (1938) boundary between in-play and outside,
 *                        with a down-closure witness that the inside is a
 *                        sub-event-structure.
 *   - `boundary`       — the magic circle as the full Huizinga apparatus: the
 *                        inside as a restricted sub-arena, a polarity-grounded
 *                        *voluntary*-entry judgment, and the boundary-crossing
 *                        $\top$ that suspends ordinary rules (the porous-boundary
 *                        closure-regime change).
 *   - `ludus`          — Caillois's (1958) paidia<->ludus axis as the density of
 *                        causal order, an exact Rational in $[0, 1]$.
 *   - `paidia-ludus`   — that axis structured into named bands, plus the four
 *                        Caillois categories × paidia-ludus grid.
 *   - `homo-ludens`    — Huizinga's player as defined by magic-circle
 *                        participation: a player carrier and a participation
 *                        judgment.
 */
export * from "./covering.mjs";
export * from "./configurations.mjs";
export * from "./locus-tree.mjs";
export * from "./magic-circle.mjs";
export * from "./boundary.mjs";
export * from "./ludus.mjs";
export * from "./paidia-ludus.mjs";
export * from "./homo-ludens.mjs";
