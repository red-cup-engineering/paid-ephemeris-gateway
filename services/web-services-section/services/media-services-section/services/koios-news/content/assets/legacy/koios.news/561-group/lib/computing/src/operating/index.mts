/**
 * The running concurrent computer — the SPOTCOMP pipeline.
 *
 *   $$\text{settled information} \xrightarrow{\;\texttt{observe}\;}
 *     \text{CGS arena} \xrightarrow{\;\text{strategy}\;}
 *     \xrightarrow{\;\texttt{run}\;} \text{player move}$$
 *
 * This is goal #1: $\mathbf{CGS}$ made to *operate*. The pieces:
 *
 *   - `provenance` — the finite-restriction record `articulating → predicating →
 *     positing → settling` beneath every declared arena (spec §1).
 *   - `observation` — `observe`: a frontier of settled relationality memes to a
 *     polarized arena, via the charge-IS-polarity identity; uncommitted charges
 *     kept as audit evidence.
 *   - `run` — one interaction step: a modeled player (a `Morphism`, e.g. a
 *     character's `morphismOf`) responds to an admitted Opponent move with its
 *     enabled (concurrent) Player moves.
 *   - `federation` — `federate`: many players composed by the parallel $\|$;
 *     disagreement *computed* as the bigraded class $H^1_t \oplus H^1_\top$ over
 *     the FOUR coordinates (`federationCohomology`), with the glued global
 *     section and projection-fixed-point witness — no longer deferred.
 */
export * from "./provenance.mjs";
export * from "./observation.mjs";
export * from "./run.mjs";
export * from "./federation.mjs";
export * from "./bilattice-projection.mjs";
