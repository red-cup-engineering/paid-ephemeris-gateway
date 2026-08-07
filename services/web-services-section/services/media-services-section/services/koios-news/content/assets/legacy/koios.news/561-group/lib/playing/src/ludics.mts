/**
 * ludics — playing's single-agent ludics core, exposed as a dependency surface.
 *
 * This is the subpath `@emsenn/playing/ludics`: the foundation that `gaming`
 * (scale-2 playing) lifts along the agent-sheaf, imported rather than duplicated.
 * It is exactly the 2-party dialogical fragment — loci, designs, chronicles, the
 * real HO composition + copycat Fax (identity), the settling/behaviour topology,
 * and the CLL proof layer — together with the shared polarity/event-structure
 * substrate they stand on. gaming owns the multi-agent layer (arenas-with-symmetry,
 * concurrent strategies, the nominal/FSym symmetry, the social play readings, the
 * running multiplayer game) and reuses THIS for the single-agent core.
 *
 * See dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md (the lift) and
 * dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md (the core).
 */
export * from "./structuring/polarity.mjs";
export * from "./structuring/event/structure.mjs";
export * from "./structuring/concurrent-game/with-symmetry/ludicizing/index.mjs";
export * from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/index.mjs";
export * from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/index.mjs";
