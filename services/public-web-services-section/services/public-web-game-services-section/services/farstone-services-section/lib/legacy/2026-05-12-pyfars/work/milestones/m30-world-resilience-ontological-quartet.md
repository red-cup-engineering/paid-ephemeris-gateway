---
title: "M30 — World Resilience and Ontological Quartet (Sheaf Erasure Code, QUARTERMASTER, Four Aspects)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m24-predication-native-simulation, m25-stratified-substrate-architecture, m29-relational-hyperverse-modal-collapse]
goals:
  - sheaf-erasure-code-resilience-metric
  - covering-family-count-as-world-density
  - ontological-quartet-as-entity-view
  - quartermaster-as-fiber-loadout-designer
  - stabilization-envelope-dyad-visible
  - nuclear-depth-uncertainty-as-gameplay-mechanic
theory-basis: [predication-fiber-algebra, predication-fiber-functor, settling-convergence, closure-algebra-coalgebra-correspondence, bilattice-two-orders-duality, stratified-predication-fiber, predication-settling-category-completeness, two-internal-logics]
prior-art: [engineering-archive/operations/command/ideas/triage/predication-world-sim.md]
backing-gaps:
  - pyfars/objects/covering-family-record.md (NOT YET AUTHORED — a collection of local entity observations sufficient to reconstruct a global proposition)
  - pyfars/objects/world-resilience-metric.md (NOT YET AUTHORED — count of covering families; how many entities must be destroyed to breach the erasure threshold)
  - pyfars/objects/ontological-quartet-view.md (NOT YET AUTHORED — four simultaneous views of any entity: data/language/space/process)
  - pyfars/objects/entity-loadout.md (NOT YET AUTHORED — QUARTERMASTER-assembled predication fiber; the kit the player inhabits)
  - pyfars/objects/stabilization-envelope-pair.md (NOT YET AUTHORED — [Env_t(a), π_t(a)] instability interval per entity)
  - pyfars/morphisms/assembling-loadout.md (NOT YET AUTHORED — QUARTERMASTER operation: choose predicates → compose entity fiber)
  - pyfars/claims/world-data-is-sheaf-erasure-coded.md (NOT YET AUTHORED)
acceptance: "A world-resilience-metric cell exists at stratum 2 in the simulation substrate, showing the count of covering families. When entities are removed from the simulation, the resilience metric decreases. When enough entities are removed to breach the minimum covering family threshold, a reconstruction-failed cell appears at stratum 1 (cl^S fires the failure detection rule). The QUARTERMASTER tool is available: a player can select predicates to include in their entity-fiber before entering a world; the assembled fiber is a stratum-0 record that the settling endofunctor closes into a stratum-2 loadout. The ontological-quartet display in the world UI shows all four views of any selected entity: data (fiber cells), language (available predications), space (graph position and neighbors), process (firable cl^S premises and N_Δ-unstabilized cells)."
---

# M30 — World Resilience and Ontological Quartet

Every entity in the simulation is simultaneously four things: raw data (its fiber cells), a language (what propositions it can support), a position in space (where it sits in the predication graph), and a self-sustaining process (how it persists through settlement).
These four aspects are not separate subsystems to synchronize — they are four views of the same mathematical object, guaranteed to be coherent by the predication-categories structure.

M30 surfaces these views, makes world resilience visible and meaningful, and gives players the QUARTERMASTER system to design their entity-fiber before entering the world.

## What's built

### The sheaf erasure code and world resilience

The predication graph underlying the simulation has a sheaf structure: the global settled state H*_t can be reconstructed from sufficiently many local observations.
A **covering family** is a set of entity fibers (local observations) from which the global proposition can be recovered — by the presheaf gluing condition, if the local observations agree on their overlaps, the global section exists and is unique.

This is an erasure code: if some entities are destroyed (their fiber atoms removed), the global proposition can still be reconstructed from the surviving entities, as long as the surviving set contains at least one covering family.
The **world-resilience-metric** is the count of covering families: how many distinct minimal sufficient observation sets exist.

A sparse world (few covering families) is fragile: removing one entity may destroy the only covering family, making reconstruction impossible.
A dense world (many covering families) is resilient: many entities would have to be destroyed to breach the erasure threshold. **World-building IS increasing the count of covering families** — adding new entity fibers that overlap with existing ones adds redundancy to the sheaf structure and increases the erasure threshold.

The predication-settling-category-completeness theorem establishes that the predication settling category has all limits and colimits.
The gluing lemma (sheaf condition) is a limit condition: it requires that the limit of the overlap diagram exists and is the global section.
The theorem guarantees this limit exists for every world whose entity fibers form a compatible diagram.

**Practical implications for gameplay:** - Creating new entities and establishing predicate relationships between them increases resilience - Destroying entities decreases resilience - A destruction event that breeches the minimum covering family threshold emits a `reconstruction-failed` cell: some global proposition can no longer be reconstructed from surviving local observations - The world UI shows the resilience metric as a live value; players who care about world preservation can use it to guide their actions

### The ontological quartet: every entity as four simultaneous aspects

Every entity in the simulation is simultaneously:

| Aspect | What it IS | How it appears | Mathematical ground |
|---|---|---|---|
| **Data** | Its predication fiber — the raw cells (s, p, o, v) at strata 0/1/2 | The frontmatter, predicates, values | Predication fiber algebra A_p |
| **Language** | What propositions it can support — which predicates have nonempty cl^S-closable rules | What can be SAID about it | The T_k knowledge-order logic from two-internal-logics |
| **Space** | Where it lives in the predication graph — its neighbors, exits, connections | Where it IS; its neighborhood structure | Predicate-category morphisms (the predication-fiber-functor) |
| **Process** | How it sustains through settlement — which cl^S premises are firable, which N_Δ-orbits are incomplete | How it PERSISTS | The settling endofunctor F_U dynamics |

Traditional game engines maintain these as separate subsystems (data layer, logic layer, rendering layer, physics layer) that must be synchronized.
In the predication substrate, they are four projections of the same mathematical object.
No synchronization is needed because there is nothing to synchronize: the entity is all four at once.

The **Baez-Stay Rosetta Stone** correspondence establishes that frameworks supporting computation, logic, topology, and physics simultaneously (which Grothendieck toposes do) naturally present all four aspects as different lenses on the same structure.
The predication hyperdoctrine is a Grothendieck topos-adjacent construction; the four aspects are the four Rosetta columns applied to it.

The ontological-quartet display in the world UI shows all four views of any selected entity simultaneously.
A player selecting an entity sees: - **Data:** the entity's stratum-2 predication cells (the stratum-2 projection π₂) - **Language:** the T_k-derivable propositions given the entity's current stratum-2 state - **Space:** the entity's predicate-category neighborhood — which entities it has `exit-morphism`-reachable fibers with, and their stratum-2 values - **Process:** the entity's currently-firable cl^S premises and N_Δ-unstabilized cells (the settling horizon from M28)

The four views are computed from the same substrate atoms.
They are always mutually consistent because they all read from the same stratum-2 projection.

### QUARTERMASTER: entity-fiber loadout design

The QUARTERMASTER is the entity-selection interface: before entering a world, the player designs their entity-fiber by choosing which predicates to include.

"Choose your entity" = choose which fiber to wear.
"Customize your build" = which predicates to include.
"Accept the mission" = compose your fiber with the world's constraint-fiber (the game rules, the current H*_t of the world).

The QUARTERMASTER operation:

1. Player selects an entity type (person, wind, debt, rumor — any settled entity type in the world's H*_t)
2. Player selects which predicates from that entity type's fiber to include in their loadout
3. QUARTERMASTER assembles the loadout as a new entity-fiber record at stratum 0: a set of predication cells authored from the selected predicates
4. Player enters the world via the green ring (M29's re-expansion morphism): the loadout fiber is seeded at stratum 0 in the world; the next F_U pass settles the loadout to stratum 2, composing it with the world's constraint-fiber

The loadout is not a character sheet — it is a predication fiber.
It evolves as the player interacts with the world: - Interactions that produce new settled atoms add to the loadout - Interactions that retract atoms remove from the loadout - The loadout at turn N is different from the loadout at turn 1 not because the player re-equipped, but because the settling endofunctor has run N times over the player's fiber, composing it with everything the player has encountered

The QUARTERMASTER is the perception system in reverse: instead of "what do you perceive given your fiber?"
(the world queries the player's fiber for compatible predicates), it is "what fiber do you want to perceive through?"
(the player designs the Umwelt before entering the world).

The settling endofunctor's outer alternation determines how the chosen loadout fiber composes with the world's constraint-fiber.
A player who chooses predicates that are compatible with the world's cl^S rule system will find their loadout settles quickly (few outer-alternation steps).
A player who chooses predicates in tension with the world's rules will find their loadout in FreeShadow (high spectral complexity, large τ variance), creating a different gameplay experience.

### Stabilization-envelope dyad visible in the UI

Every entity has a **stabilization-envelope dyad**: two poles that characterize where it sits in the truth-order lattice.

- **Settling pole π_t(a):** the least stable element above the entity's current fiber value — what the entity WILL become under the settling endofunctor (the closure-2-monad's image applied to the entity's current state)
- **Stable envelope Env_t(a):** the greatest stable element below the entity's current fiber value — what the entity already IS at its most settled reading (the largest stratum-2 content compatible with the current fiber)

The **instability interval [Env_t(a), π_t(a)]** measures the entity's distance from settlement in the truth order.
Width zero = fully settled at H*_t.
Width large = far from settlement, with both a large stratum-2 lower bound and a large stratum-2 upper bound between which the entity is currently oscillating.

The world UI renders the dyad as a visible quality: - "This sword is nearly settled — its instability interval is narrow" = Env_t(sword) ≈ π_t(sword) in the truth order - "This kingdom is deeply unstable — its interval spans many predicate values" = Env_t(kingdom) ≪ π_t(kingdom)

The two poles offer complementary views: the settling pole shows what settling WILL produce (the nuclei's destination); the stable envelope shows what settling HAS already secured (the nuclei's floor).
Together they bracket the entity's identity in the ordering.

### Nuclear depth uncertainty as gameplay mechanic

The σ/Δ pass decomposition identifies an uncertainty principle: knowing an entity's cl^S-depth (how many rule-saturation passes deep it is in its trajectory) and knowing its N_Δ-depth (how many per-cell T_a-orbit steps deep it is) are not simultaneously achievable with perfect precision by the player.

The reason: the cl^S pass and N_Δ pass are oriented differently (knowledge-order vs. truth-order).
Measuring cl^S-depth requires reasoning about which rules have fired — a knowledge-order query (T_k, paraconsistent).
Measuring N_Δ-depth requires reasoning about which per-cell orbits are complete — a truth-order query (T_t, classical).
The two-internal-logics theorem establishes that T_t and T_k are distinct logics on the same hyperdoctrine; sentences derivable in one need not be derivable in the other.

**For gameplay:** divination (seeing an entity's N_Δ-depth, its future stability) costs precision on its cl^S-depth (its past recognition).
An oracle who measures N_Δ-depth precisely (knows the entity's destiny) loses precision on cl^S-depth (doesn't know its history).
A historian who measures cl^S-depth precisely (knows all the history) loses precision on N_Δ-depth (doesn't know the destiny).
This is not a design choice — it is what the two-internal-logics theorem implies for joint reasoning over the two orderings.

The QUARTERMASTER can assemble a fiber that is cl^S-oriented (many rule-saturation predicates, good historical recognition, poor destiny-sensing) or N_Δ-oriented (many bilattice-stabilization-favorable predicates, good destiny-sensing, poor historical recognition).
The choice of loadout determines the player's epistemic orientation.

## What M30 does NOT claim

- **Not a full sheaf theory implementation.** The covering-family-count metric is computed by a closure rule, not by a full sheaf-cohomology calculation.
  The full sheaf theory (with cohomological obstruction classes) is an open research question, not an engineering milestone.
- **Not physics simulation.** The ontological quartet's "process" aspect is the entity's settling dynamics, not Newtonian physics.
  The world sim is not a physics engine.
- **Not a perfect uncertainty principle.** The nuclear-depth uncertainty is a heuristic game mechanic inspired by the two-internal-logics theorem's structural distinction.
  It is not a proved theorem in the engineering theory that cl^S-depth and N_Δ-depth are formally incompatible measurements.
- **Not a complete QUARTERMASTER.** The QUARTERMASTER designs the loadout fiber at entry.
  Changes during play are driven by the settling endofunctor, not by explicit re-equipping.
  The loadout designer is a pre-game interface, not an inventory management system.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `sheaf-erasure-code-resilience-metric` | World-resilience-metric cell at stratum 2; count of covering families; decreases as entities are destroyed | open |
| `covering-family-count-as-world-density` | Covering-family-count cells per world; reconstruction-failed fires when minimum threshold breached | open |
| `ontological-quartet-as-entity-view` | World UI shows four simultaneous entity views: data/language/space/process; all read from same stratum-2 projection | open |
| `quartermaster-as-fiber-loadout-designer` | QUARTERMASTER interface: select predicates → assemble stratum-0 loadout fiber → enter world via green ring | open |
| `stabilization-envelope-dyad-visible` | π_t(a) (settling pole) and Env_t(a) (stable envelope) computed per entity; instability interval shown in world UI | open |
| `nuclear-depth-uncertainty-as-gameplay-mechanic` | cl^S-depth and N_Δ-depth measurements trade off; QUARTERMASTER loadout choices reflect epistemic orientation | open |

## Done when

A world-resilience-metric cell exists and decreases when entities are removed.
A reconstruction-failed cell fires when enough entities are destroyed.
The QUARTERMASTER assembles at least one entity-fiber loadout from a menu of predicates; the assembled loadout enters a world and settles to stratum 2.
The ontological-quartet display shows all four views of a selected entity in the world UI.
The stabilization-envelope dyad is computed for at least three entities with different spectral complexity levels.
A gameplay interaction demonstrates the nuclear-depth tradeoff: a player using a cl^S-oriented loadout gains historical recognition and loses N_Δ-depth precision; an N_Δ-oriented loadout does the reverse.

## Theoretical shape

**Every entity as four aspects of one object.** The predication hyperdoctrine is the single mathematical object; the fiber algebra (data), the T_k knowledge-order logic (language), the predicate-category morphism structure (space), and the settling endofunctor dynamics (process) are four ways of looking at the same structure.
The Baez-Stay Rosetta Stone correspondence establishes that any framework supporting computation, logic, topology, and physics simultaneously presents all four naturally.
No architectural synchronization is needed because there is nothing to synchronize — the entity is not four parts, it is one thing seen from four angles.

**World data as self-correcting.** The sheaf structure of the predication graph is not an implementation choice — it is a mathematical property of the presheaf construction.
The gluing lemma is a limit; it holds whenever the predication settling category has limits (which the predication-settling-category-completeness theorem guarantees).
World data is therefore structurally self-correcting: as long as covering families survive, global propositions are recoverable.
The world does not need explicit backup mechanisms — the algebra provides them.

**QUARTERMASTER as Umwelt design.** Every entity perceives the world through its predication fiber: what predicates it has determine what interactions are available.
Designing the loadout fiber IS designing the player's Umwelt (the experienced world from that entity's perspective).
The QUARTERMASTER does not create game-mechanical advantages — it creates different phenomenological experiences.
A wind-fiber perceives atmospheric predicates.
A debt-fiber perceives obligation predicates.
A rumor-fiber perceives credibility predicates.
The player chooses not how strong they are, but what they can see.

## Related

- [Roadmap](roadmap.md)
- [M24 — Predication-Native Simulation](m24-predication-native-simulation.md), [M25 — Stratified Substrate](m25-stratified-substrate-architecture.md), [M29 — Relational Hyperverse](m29-relational-hyperverse-modal-collapse.md) — prerequisites
- [Engineering archive source](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-world-sim.md)
