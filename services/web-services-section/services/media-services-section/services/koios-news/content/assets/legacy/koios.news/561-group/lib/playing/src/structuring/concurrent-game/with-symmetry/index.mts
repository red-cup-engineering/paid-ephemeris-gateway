/**
 * playing's single-agent ludics substrate.
 *
 * playing keeps only the 2-party dialogical fragment: the ludics core (loci,
 * designs, chronicles, the real HO composition + copycat Fax), the closure/settling
 * topology, the CLL proof readings, and the ludics 2-party `interaction` (the cut).
 * The multi-agent CGS layer (arena-with-symmetry, concurrent strategizing, the
 * nominal/FSym symmetry, the placing geometry, and the social play readings) is
 * @emsenn/gaming-experimental's — the scale-2 lift along the agent-sheaf — not
 * playing's. See dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md.
 */
export * from "../../polarity.mjs";
export * from "../../event/structure.mjs";
export * from "./strategizing/index.mjs";
export * from "./ludicizing/index.mjs";
export * from "./ludicizing/settling/index.mjs";
export * from "./ludicizing/proving/index.mjs";
