# arena sheaf-Laplacian & best-response reachability

*2026-06-25.
From the HGR sheaf-Laplacian research sweep.
Records how gaming's arena (concurrent game systems with symmetry) carries a sheaf-Laplacian over its event structure, and how best-response reachability is a `ker(L)` fixed-point characterization. gaming is scale-2 playing — concurrent games with symmetry `FSym(𝔸)`, the scale-2 outside/evidence face.
Research note.*

## The reading

gaming's arena is a prime event structure `(E, ≤, #)` — events with a causal order `≤` and a conflict relation `#`.
The brief's key observation: **the prime-event relations `(≤, #)` define a Grothendieck topology on the event poset**, and the arena's event-stalk d-frame values form a sheaf.
So the Lawvere/Tarski Laplacian machinery (already proven on Grothendieck sites in `lawvere-laplacian-grothendieck-sites.md`) applies directly.
The diffusion operator `L : C⁰(E) → C⁰(E)` has each component a game-state value (flow field, reachability cost, strategy pressure); `L` is `Q`-continuous (respects the bilattice order), and its harmonic kernel `ker(L)` is the set of settled game states.

The headline identification: **best-response reachability = `ker(L)` fixed-point**.
A state is best-response-stable exactly when it is a fixed point of the arena diffusion — and the existing `reachability` reading (which already counts conflicted events and escapes best-response cycles via the no-periodic-orbit theorem) is the runtime shadow of that harmonic characterization.

Runtime status: `gamingFace(...).cohomology` now makes the arena conflict obstruction proof-carrying.
Its `first` field is a normalized `cohomologyTerms.settlingFirst` carrier whose generators are exactly the arena `#` conflict edges, and whose rank agrees with `gamingFace(...).obstruction`.

## Our edge

(1) **Best-response cycles dissolved**: classic game dynamics get stuck in best-response cycles (a periodic orbit); the closure-monad no-non-trivial-periodic-orbit theorem rules these out, so arena diffusion *settles* rather than cycling — `reachability` already escapes them.
(2) **Conflict as stable `⊤`-content**: a contested event (two strategies told-both) is stable harmonic content, not an oscillation — the multi-agent analog of playing's Daimon-as-attractor.
(3) Dependency-free, no inner product on event stalks; aperiodic step-n bounds on settling rate.
(4) The Grothendieck-site formulation means the machinery is *not* restricted to finite graphs — it covers the concurrent, symmetry-quotiented arena directly.
This is the natural home for the **multi-agent coordination / swarm** applications (formation, flocking, real-vs-rhetorical consensus among agents) that the application brief raises under distributed computing and agent swarms.

## Concrete builds (from the brief)

- **Tarski–Lawvere diffusion kernel on the arena membrane** *(top build)* — extend the Grothendieck-site Laplacian to the arena: prove `(≤, #)` give a topology, the event-stalk d-frame values form a sheaf, and `L` is `Q`-continuous; characterize Lean-verified reachability as the `ker(L)` fixed point.
- **Bilattice harmonic consensus** — conflict as stable `⊤`-content among concurrent strategies.
- **Sheaf-Hodge decomposition of the arena event membrane** — partially realized by `gamingFace(...).cohomology` for live conflict generators; remaining work is to attach the same receipt style to aperiodic orbits and redundant event/market cycles.
- **Best-response reachability as a sheaf-Laplacian iteration invariant** — connect the existing `reachability` carrier to the diffusion fixed point, with the no-periodic-orbit escape as the convergence guarantee.

## Grounding

`lib/gaming/src/.../reachability`, `lib/gaming/src/face.mts`, and the CGS arena/event-structure carriers; Lean `LawvereHarmonicCohomology`, the Grothendieck-site Laplacian note, `ClosureMonad.no_periodic_orbits`, `AperiodicClassification`.
Related: playing Tarski–bilattice-Laplacian (single-agent), computing proof-carrying-synchronization (multi-agent coordination), relating non-reductive-computation thesis.
See memory: gaming = multi-agent playing, layer-2 attacks impossibility (best-response-cycles).
