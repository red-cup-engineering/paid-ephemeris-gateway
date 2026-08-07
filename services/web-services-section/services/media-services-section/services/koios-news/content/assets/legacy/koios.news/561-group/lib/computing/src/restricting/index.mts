/**
 * The four computing paradigms as real sub-categories of $\mathbf{CGS}$.
 *
 * Each established tradition embeds as a full, pairwise-distinct
 * sub-$*$-autonomous-category of $\mathbf{CGS}$; together they span the typed
 * theory of computing. `@emsenn/gaming` names the four embeddings and the
 * fragment lattice as data — this layer makes each membership *executable* as a
 * witness/obstruction predicate over the actual arena/strategy/session carriers:
 *
 *   - `sequential` — Hyland-Ong $\mathbf{CGS}_{\mathrm{HO}}$ (PCF): trivial
 *     symmetry + alternating + innocent. This is where innocence — deliberately
 *     *excluded* from the ambient category law in Phase 2 — becomes the defining
 *     restriction.
 *   - `nominal` — AGMOS $\mathbf{CGS}_{\mathrm{AGMOS}}$ ($\nu$-calculus):
 *     non-trivial $\mathrm{FSym}(\mathbb{A})$ symmetry + equivariant strategies.
 *   - `dialectica` — $F(\mathbf{Dial}(\mathbf{Eff}))$ (realizability): trivial
 *     causality + intra-polarity conflict + no cross conflict + trivial symmetry.
 *   - `session` — Caires-Pfenning $\mathbf{CGS}_{\mathrm{CLL}}$: the session's
 *     CLL proposition lies in the CLL fragment.
 *
 * `theory` assembles the theorem object — all four embed simultaneously (exhibited
 * on concrete inhabitants) over the reused LL fragment-lattice subtheory poset.
 */
export * from "./structure.mjs";
export * from "./sequential.mjs";
export * from "./nominal.mjs";
export * from "./dialectica.mjs";
export * from "./session.mjs";
export * from "./theory.mjs";
