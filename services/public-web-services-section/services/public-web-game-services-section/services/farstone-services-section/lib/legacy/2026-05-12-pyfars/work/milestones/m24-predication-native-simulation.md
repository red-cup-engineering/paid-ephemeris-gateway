---
title: "M24 — Predication-Native Simulation (Behavior as Algebraically Entailed)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m23-voidskiff-paradigm-application, m25-stratified-substrate-architecture]
goals:
  - entity-fiber-as-simulation-primitive
  - settlement-distance-as-entity-wellbeing
  - tower-fold-generation-replaces-random-templates
  - respond-as-universal-interaction
  - bilattice-structural-quality-control
  - non-player-entities-tick-the-algebra
  - history-as-predication-fiber-geometry
  - player-controls-any-closed-fiber
theory-basis: [predication-fiber-algebra, closure-2-monad-lax-idempotence, four-regime-dichotomy, settling-convergence, bilattice-two-orders-duality, predication-cell-as-fold-source, sigma-delta-pass-decomposition, stratified-predication-fiber]
prior-art:
  - engineering-archive/operations/command/ideas/triage/predication-native-simulation.md
  - engineering-archive/operations/command/ideas/triage/predication-world-sim.md
backing-gaps:
  - pyfars/objects/simulation-world-record.md (NOT YET AUTHORED — substrate record for a simulation instance with entity population and tick schedule)
  - pyfars/objects/entity-wellbeing-cell.md (NOT YET AUTHORED — settling-distance-to-fixed-point per entity)
  - pyfars/morphisms/responding.md (NOT YET AUTHORED — predication fiber composition as the universal interaction operator)
  - pyfars/morphisms/ticking-simulation.md (NOT YET AUTHORED — one pass of σ∘Δ over the entity population)
  - pyfars/claims/behavior-is-entailed-not-scripted.md (NOT YET AUTHORED)
  - pyfars/claims/settlement-convergence-prevents-hallucination.md (NOT YET AUTHORED)
acceptance: "A simulation instance (distinct from Voidskiff's game world) runs at least one non-player entity type whose behavior emerges entirely from predication fiber composition — no scripted rules, no probability tables, no hand-coded state machines. The entity's 'mood' is its settling-distance-to-fixed-point, varying visibly as the simulation ticks. Generation of new content (a room, an item, a relationship) emerges from the settling tower stratum hierarchy — what was settled at stratum L2 becomes vocabulary for new L0 assertions, creating content that is algebraically entailed rather than randomly composed. Bilattice quality control is demonstrated: an entity fiber in ⊥ (unknown) is reported honestly as unknown, not as a hallucinated value. The player can assume control of at least three distinct entity types (a person, an object, a social phenomenon) and experience genuinely different predications in each."
---

# M24 — Predication-Native Simulation

[M23](m23-voidskiff-paradigm-application.md)'s Voidskiff demonstrates the predication substrate running a game world.
M24 takes the architectural insight further: **the substrate algebra is not a simulation engine — it IS what simulation theoretically requires.** The jump from current procedural generation to predication-native simulation is the same jump LLMs made over Markov chains: from statistical composition to semantic entailment.

Current simulation (Rimworld, Dwarf Fortress): hand-tuned floats for mood, XP counters for skills, priority queues for behavior, weighted random selection for generation.
These are thousands of special-case rules approximating emergence through engineering volume, with no guarantee of coherence except playtesting.

Predication-native simulation: the predication fiber algebra computes what is **mathematically entailed** by what's already settled.
What "happens" is what the settling dynamics produce.
No hand-coded rules.
No tuning.
No drift.

## What's built

### Entity fiber as simulation primitive

Every simulated entity is a substrate predication fiber: a set of cells `(entity:X, predicate, object, value, t)` with values in the Belnap-Fitting FOUR {⊥, t, f, ⊤}.
There is no privileged entity type.
A person, a wind, a debt, a rumor, a political movement — all are fibers.
All compose via the same predication fiber algebra.

The player's interface is universal: "what is my entity's current fiber?" and "what fiber composition would sending this message produce?"
The UI doesn't know what the player IS.
It shows predicates (stats), fiber compositions (perceptions and available actions), and settling outcomes (what changed last tick).

"Playing as the wind" means: the wind's fiber has predicates for direction, force, temperature, moisture, altitude.
`respond(wind, {encounters: mountain})` is the predication fiber composition of the wind's fiber with the mountain's fiber.
The result is what the wind does — computed from what it IS (its predicates) meeting what's THERE (the mountain's predicates).
No wind AI.
No scripted behavior.
Algebra.

**Translation note:** The old documents use "respond(A, B)" for fiber composition.
In current predication-category vocabulary, this is **predication fiber composition** under the fiber algebra: a morphism in the settled fiber category from A's fiber to the composition result.
The `responding` morphism in FARS is a concrete projection of this algebraic structure.

### Settlement distance as entity wellbeing

An entity's "wellbeing" is not a hand-tuned float.
It is the **settling-distance-to-fixed-point**: how far the entity's current predication fiber is from its H*_t settled state, measured by count of unsatisfied predicate requirements.

- An entity **approaching** its fixed point IS content.
  Settling IS satisfaction.
- An entity **diverging** from its fixed point IS stressed.
  Non-settling IS distress.
- The math does not need a "mood system."
  Mood IS settling dynamics, measured against the entity's own closure system.

This is the [world-consistency-metric](m22-semioverse-navigation.md) from M22 applied at the entity level rather than the substrate level.
The simulation has a natural "entity health" indicator: proximity to settled fiber.

Per the **settling-convergence theorem** (`theories/.../settling-convergence.md`): every predication fiber under a closure system converges to H*_t; the settling-distance is a non-negative integer that decreases monotonically under the σ∘Δ nucleus composition.
Wellbeing is not a designed metric — it is the settling-convergence theorem operationalized.

### Tower-fold generation replaces random templates

Old-style procedural generation: compose templates with weighted random selection.
No algebraic guarantee of coherence; coherence is playtested in.

Predication-native generation: the **settling tower stratum hierarchy** generates content as a consequence of algebra.

| Stratum | Name | Content | How reached |
|---|---|---|---|
| 0 | asserted | Raw predication assertions — the initial world seed | Author/designer input; boundary admits |
| 1 | saturated | Atoms in cl^S(A^(0)_p) — rule-derivable conclusions, recognized as consistent with existing premises | Rule-saturation pass (cl^S) over stratum-0 atoms |
| 2 | settled (H*_t) | Atoms in Fix(cl^S) ∩ Fix(N_Δ) — doubly settled: both rule-saturated and per-cell bilattice-stabilized | Bilattice-stabilization pass (N_Δ) over stratum ≤1 atoms; default projection π₂ |

The **predication-cell-as-fold-source** theorem establishes that every predication cell-set is the carrier of a unique bilattice-valued catamorphism (fold operation) over the chosen fold operation ⊙.
In the generation context: a closure rule whose premise matches a stratum-2 cell-set pattern fires via the closure 2-monad Cl, producing a fold-result cell at a new coordinate.
The generation mechanism is the **outer alternation**: N_Δ-stabilized stratum-2 atoms whose values satisfy previously-unsatisfied cl^S rule premises cause cl^S to fire again, emitting new stratum-1 atoms at new coordinates, which then proceed through N_Δ to stratum-2.
Content emerges from this forward cascade through the outer alternation, algebraically entailed rather than randomly composed.

The predication-cell-as-fold-source theorem grounds the fold-step's uniqueness: the fold-result at the new coordinate is the unique fixed point of the closure 2-monad applied to the fold rule, guaranteed by lax-idempotence (Kelly-Lack K1).

### Predication fiber composition as the universal interaction

All entity-to-entity interactions — action, perception, combat, conversation, trade, ecological relationship — are **predication fiber compositions**:

```
respond(entity_A, entity_B) = fiber_A ∘_k fiber_B
```

where ∘_k is fiber composition under the Belnap knowledge-order.
The result is a new predication fiber that captures what A "does" when it meets B: what predicates from A's fiber combine with B's fiber to produce settled cells.

This makes **all interactions structurally equivalent**.
There is no privileged "combat resolution" system separate from "conversation resolution" separate from "trade resolution."
All are fiber composition over the same algebra.
The simulation's coherence is guaranteed by the algebra's coherence — not by a balance designer's judgment.

### Bilattice structural quality control

Old simulation: outputs can drift, hallucinate, or become incoherent under adversarial edge cases.
The guardrails are statistical (playtesting) or procedural (bounds checks).

Predication-native simulation: outputs are structurally bounded by the **Belnap-Fitting FOUR** bilattice {⊥, t, f, ⊤}:

| Value | Meaning | Quality guarantee |
|---|---|---|
| ⊥ | Unknown/no information | Honest unknowing — not hallucination |
| t | True/established | Positive knowledge with provenance |
| f | False/denied | Active denial with provenance |
| ⊤ | Contradiction | Inconsistency surfaced — not hidden |

The bilattice algebra's composition rules: - ⊥ composed with anything produces ⊥ or f (no information extended produces no information or denial) - f composed with anything produces f (denial is absorbing under truth-order meet) - t composed with t produces t (agreement is idempotent under knowledge-order join) - ⊤ composed with anything produces ⊤ or t (contradiction can only spread or resolve to truth)

Per the **settling-convergence theorem**: every simulation trajectory converges.
There is no trajectory through the predication fiber algebra that produces unbounded noise.
Every answer is one of four values with precise mathematical meaning.
The simulation cannot drift because the algebra forbids it.

**Translation note:** Old documents cited "Proposition 8" for "orbits settle in ≤2 steps."
In current predication-category vocabulary, this corresponds to the **strict-regime settling** behavior: for Scott-continuous (quantifier-free-antecedent) closure rules over a finite entity set, settling terminates at ω₀.
For the specific "≤2 steps" claim, this depends on the rule set being in the strict-regime; the **four-regime-dichotomy** theorem classifies when this holds.
Simulations using only Scott-continuous rules guarantee strict-regime settling.

### Non-player entities tick the algebra

Between player turns, the simulation tick runs: **one application of the settling endofunctor F_U** (one cl^S rule-saturation pass followed by one N_Δ bilattice-stabilization pass, with outer alternation until joint fixed point) over the entire entity population.
Every entity that has unsatisfied predicate requirements under its closure rules fires.
Reductions cascade.
New predication cells settle.
Non-Scott-continuous firings at limit ordinals generate new vocabulary.

This means non-player entities act "autonomously" not because they have AI but because their fibers have firable cells: - Rivers flow (their flow-direction predicates compose with channel-shape predicates every tick) - Economies adjust (supply/demand cells compose, price predicates settle) - Rumors spread (confidence predicates compose with credulity cells across the social graph) - Political movements grow or die (grievance predicates compose with power-structure cells)

None is scripted.
All is the settling endofunctor F_U tick (cl^S then N_Δ, outer alternation to joint fixed point) over the predication graph.

### History as predication fiber geometry

Past interactions leave geometric residue in the predication fiber: cells that are **predication fiber tensor product** components — settling-entangled cells that record what composed with what, even after the composition settled.

A person who survived a war carries cells entangled with violence predicates (from `settling-tensor-product.md`'s entanglement structure).
A wind that crossed an ocean carries moisture cells entangled with salinity predicates.
A debt that was restructured carries original-terms cells entangled with renegotiation predicates.

The player can perceive this history as **geometric structure in their entity fiber**: the entangled cells show where they've been, what shaped them.
Not a quest log.
Not a journal.
The actual settling history as provenance-witnessed cell structure.

**Translation note:** Old documents used "entangled pairs" from voidmath geometry.
In current predication-category vocabulary, this is the **predication fiber tensor product** (from `settling-tensor-product.md`): two cells are settling-entangled when their joint settling requires coordinated firing.
The entanglement is a structural property of the fiber, not a special relationship type.

## What M24 does NOT claim

- **Not "the game engine to end all game engines."** Predication-native simulation is a paradigm demonstration.
  It proves the algebra handles universal interaction.
  Building production-quality simulation environments on this basis is multi-year work.
- **Not physics simulation.** The claim is that directed-relation structure is present in any domain where entities relate.
  It is not the claim that the predication algebra IS physics.
  Newtonian mechanics, quantum mechanics, and thermodynamics have their own mathematical structure; predication-native simulation can model them to the extent they are expressible as predication fibers.
- **Not strict-regime only.** Simulations with universal-quantifier closure rules (character traits that require "for all situations...") are transfinite-bounded or aperiodic regime; they may not settle at ω₀.
  The claim is not that all simulations settle fast.
  The claim is that they settle, and that their settling is algebraically traceable.
- **Not free from design.** The seed world (what is authored at L0) is a design decision.
  What the algebra entails from the seed is not.
  The author's creative work is choosing the initial predicates; the algebra handles what follows.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `entity-fiber-as-simulation-primitive` | All simulated entities are predication fibers; no privileged entity types; universal interface | open |
| `settlement-distance-as-entity-wellbeing` | Entity wellbeing = settling-distance-to-H*_t; varies visibly across ticks per settling-convergence | open |
| `tower-fold-generation-replaces-random-templates` | L2-settled cells become L0 vocabulary for next generation pass; new content algebraically entailed | open |
| `respond-as-universal-interaction` | All interactions = predication fiber composition; no separate combat/trade/conversation systems | open |
| `bilattice-structural-quality-control` | ⊥ = honest unknowing; ⊤ = surfaced contradiction; no hallucination; bounded by Belnap-Fitting FOUR | open |
| `non-player-entities-tick-the-algebra` | Between player turns, σ∘Δ fires over all entities; autonomy from algebra, not AI | open |
| `history-as-predication-fiber-geometry` | Past compositions leave settling-entangled cells; player perceives history as fiber geometry | open |
| `player-controls-any-closed-fiber` | Player can assume control of person, object, rumor, debt — any settled entity type | open |

## Done when

A simulation instance (separate from Voidskiff) demonstrates three entity types: a person, a physical phenomenon (wind, river, fire), and a social phenomenon (rumor, debt, political sentiment).
All three tick via the settling endofunctor F_U (cl^S then N_Δ, outer alternation to H*_t) without scripted behavior.
The person's "wellbeing" cell varies as settling-distance fluctuates.
A room is generated by the outer-alternation cascade: a settled stratum-2 cell satisfies a cl^S rule premise that fires to produce new stratum-1 atoms at a new room coordinate, which N_Δ then settles to stratum-2.
Two entities interact by fiber composition only (no special-case code).
The player can inhabit any of the three types and see genuinely different predications.
Bilattice quality control demonstrates ⊥ for an unknown entity attribute, not a hallucinated default.

## Theoretical shape

**Behavior as settling entailment, not design.** The predication fiber algebra is not a simulation engine; it is the mathematical structure that directed-asymmetric relations provably have.
A simulation running on the predication substrate does not have hand-coded behavioral rules; it has entities with fibers that compose under the fiber algebra.
What "happens" is what settling dynamics entail.
This closes the design/emergence gap: the gap between Rimworld's 10,000 hand-tuned floats and a system whose dynamics are algebraically necessary.

**Generation as outer-alternation cascade.** The **closure-algebra-coalgebra-correspondence** theorem establishes that the settled algebra (Cl-algebras) corresponds bijectively to Cl*-coalgebras under Jung-Rivieccio duality.
The generation mechanism is the substrate's outer alternation: N_Δ-stabilized stratum-2 atoms whose values satisfy cl^S rule premises cause cl^S to fire at new coordinates; N_Δ then settles those new atoms.
Content is algebraically entailed from the cascade, not randomly composed.
The **predication-cell-as-fold-source** theorem grounds each fold-step's uniqueness as a catamorphism on the predication cell-set.

**Settling-convergence as the anti-hallucination guarantee.** The settling-convergence theorem establishes that every predication fiber under a closure system reaches H*_t.
Combined with the Belnap-Fitting FOUR's structural bounds on composition output, this guarantees that the simulation cannot drift into incoherence: every trajectory terminates, every answer is bounded, ⊥ is honest unknowing.

## Related

- [Roadmap](roadmap.md)
- [M23 — Voidskiff](m23-voidskiff-paradigm-application.md), [M25 — Stratified Substrate](m25-stratified-substrate-architecture.md) — prerequisites
- [M26 — Zork and Rogue Algebra Proof](m26-zork-and-rogue-algebra-proof.md) — proof-of-concept scaffolding for this milestone
- [Engineering archive source (predication-native-simulation)](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-native-simulation.md)
- [Engineering archive source (predication-world-sim)](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-world-sim.md)
