---
title: "M28 — Temporal Settlement Dynamics (Temporal Defect, Spectral Complexity, Padovan Transition)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m25-stratified-substrate-architecture, m24-predication-native-simulation]
goals:
  - temporal-defect-cell-per-entity
  - shadow-type-classification-visible
  - spectral-complexity-as-entity-quality
  - padovan-to-fibonacci-transition-metric
  - temporal-orientation-in-world-ui
  - settling-horizon-as-gameplay-surface
theory-basis: [settling-convergence, four-regime-dichotomy, bilattice-two-orders-duality, stratified-predication-fiber, sigma-delta-pass-decomposition, aperiodic-regime-classification, closure-2-monad-lax-idempotence]
prior-art: [engineering-archive/operations/command/ideas/triage/predication-native-simulation.md]
backing-gaps:
  - pyfars/objects/temporal-defect-cell.md (NOT YET AUTHORED — per-entity measure of distance from H*_t, decomposed into cl^S-gap and N_Δ-gap)
  - pyfars/objects/shadow-type-record.md (NOT YET AUTHORED — classification of an entity's dominant unsettled character: SatShadow, TrShadow, FreeShadow, or H*_t)
  - pyfars/objects/spectral-complexity-cell.md (NOT YET AUTHORED — count of cl^S-unsatisfied and N_Δ-unstabilized atoms in an entity's fiber)
  - pyfars/morphisms/computing-temporal-defect.md (NOT YET AUTHORED — subtract N_Δ-gap from cl^S-gap to produce τ)
  - pyfars/claims/padovan-arithmetic-governs-unsettled-world.md (NOT YET AUTHORED)
acceptance: "Every entity in the simulation substrate has a temporal-defect cell at stratum 2, carrying a τ value (cl^S-gap minus N_Δ-gap). Entities with τ < 0 surface in the world UI with a visual indicator of 'past-settled, future-open' (SatShadow-dominant). Entities with τ > 0 surface as 'future-determined, past-unresolved' (TrShadow-dominant). Entities at H*_t surface as timeless. The world UI shows a real-time metric for the fraction of entity atoms in each shadow class. At least one gameplay demonstration shows τ changing: a prophecy-receiving entity shifts from SatShadow (τ < 0) to TrShadow (τ > 0) when the prophecy cell settles."
---

# M28 — Temporal Settlement Dynamics

The predication settling system contains a theory of time — not time as a parameter, but time as a structural property of how far an entity is from its settled fixed point.
An entity whose past is recognized but whose future is unresolved has one temporal orientation.
An entity whose future is determined but whose past is unresolved has the opposite.
These are not design choices; they are mathematical consequences of which nucleus is doing more work in the entity's settling.

M28 makes this structural temporal theory visible in the simulation substrate and world UI.

## What's built

### Temporal defect decomposition

Every entity in the simulation has a **temporal defect** cell at stratum 2:

$$\tau(\text{entity}) = \lambda_{\text{cl}^S}(\text{entity}) - \lambda_{N_\Delta}(\text{entity})$$

where: - $\lambda_{\text{cl}^S}$ = cl^S-gap: the count of cl^S rule premises that are unsatisfied in this entity's current fiber (how far the entity is from the rule-saturation fixed point Fix(cl^S)) - $\lambda_{N_\Delta}$ = N_Δ-gap: the count of per-cell T_a-orbit substeps remaining before N_Δ stabilization is complete (how far the entity's cells are from the bilattice-stabilization fixed point Fix(N_Δ))

The temporal defect τ classifies entities into four categories by shadow type:

| Shadow type | cl^S-gap | N_Δ-gap | τ | Temporal experience |
|---|---|---|---|---|
| H*_t (image) | 0 | 0 | 0 | Fully settled; timeless; no defect |
| SatShadow | 0 | > 0 | < 0 | Past recognized (cl^S fixed point reached); future not yet N_Δ-stable. Time points forward: "I know what happened, not what will." |
| TrShadow | > 0 | 0 | > 0 | Future N_Δ-stable (already determined under all extensions); past not yet cl^S-recognized. Time points backward: "I know my fate, not my history." |
| FreeShadow | > 0 | > 0 | varies | Neither nucleus at fixed point; temporal direction undetermined |

This classification is Galois-odd: the map that would swap cl^S↔N_Δ (swapping past and future) sends τ → -τ.
The temporal defect changes sign under time reversal — its nonvanishing IS the substrate's arrow of time expressed as a per-entity quantity.

**Why cl^S is "past" and N_Δ is "future":** The rule-saturation closure cl^S operates on the knowledge order — it recognizes what has occurred, classifying asserted atoms as rule-consistent (stratum 1) or not.
Reaching Fix(cl^S) means the entity's history is fully recognized and consistent.
The bilattice-stabilization nucleus N_Δ operates on the truth order per-cell — it determines whether each cell's value is forward-stable under all future extensions of the history.
Reaching Fix(N_Δ) means the entity's predicates are forward-stable, i.e., the entity's future is algebraically determined.
The asymmetry cl^S = "history recognition" vs. N_Δ = "future stability" produces the directional temporal defect τ.

### Shadow type classification visible in the substrate

Every entity's shadow-type classification is a stratum-2 cell:

```
(entity:wind-over-ocean, shadow-type, SatShadow)
(entity:wind-over-ocean, temporal-defect-tau, -3)
(entity:oracle-figure, shadow-type, TrShadow)
(entity:oracle-figure, temporal-defect-tau, +7)
```

A cl^S rule fires the shadow-type classification: given the cl^S-gap and N_Δ-gap cells at stratum 2 for the entity, produce a shadow-type cell at stratum 1.
N_Δ stabilizes it.
The classification updates each settling endofunctor pass.

SatShadow entities (τ < 0) dominate the living world: entities with settled histories but open futures are the normal experience of time.
The **settling-convergence theorem** establishes that every predication fiber converges to H*_t; the SatShadow state is a transient — history closes faster than future determination, on average.

TrShadow entities (τ > 0) are rare and structurally uncanny: their future is algebraically determined before their past is recognized.
These are the prophesied characters, the fated objects, the things whose destiny is written before their history is understood.
A gameplay interaction that writes a strong N_Δ-stable prophecy cell to an entity can flip it from SatShadow to TrShadow — the entity's τ goes positive when the prophecy settles before the history does.

FreeShadow entities have large |τ| variance: neither nucleus has reached its fixed point.
These are the most dynamic entities — the most firable, the most interesting, the most computationally expensive.
The **four-regime-dichotomy** classifies how long it takes a FreeShadow entity to converge: strict-regime FreeShadow entities (Scott-continuous rules only) converge at ω₀; transfinite-bounded FreeShadow entities require ordinal stages beyond ω₀.

### Spectral complexity as entity quality

An entity's **spectral complexity** is a richer measure than τ alone.
It is the full distribution of unsettled atom counts across cl^S and N_Δ dimensions:

```
(entity:ancient-debt, cl^S-unsatisfied-count, 12)
(entity:ancient-debt, N_Δ-unstabilized-count, 3)
(entity:ancient-debt, spectral-complexity, high)
```

Entities with high spectral complexity have many unsatisfied rule premises (large cl^S-gap) and many unstabilized cells (large N_Δ-gap).
These are the "heavy" entities — internally complex, resistant to simple composition, full of unresolved tension.
In the engineering archive's framing: large spectral complexity corresponds to a large spectral mass that "resists settling" — each interaction with the entity opens more settling work than it closes.

An entity with low spectral complexity (all atoms near their fixed points) is "light" — mostly settled, internally simple, easy to compose with.
Composing a light entity with a heavy entity via the settling endofunctor produces rapid settling of the light entity's cells and slower settling of the heavy entity's (the heavy entity's unresolved premises dominate the outer alternation).

The gameplay surface: spectral complexity is visible in the world UI as a quality of entities.
Players perceive "heavy" entities as resistant to change, internally tense, difficult to reason about.
"Light" entities feel settled, consistent, easy to act on.
The spectral complexity cell is the algebraic basis for this perceived difference.

### Padovan to Fibonacci arithmetic transition

The settling dynamics of a living (not fully settled) world run on a different growth rate than the fully-settled world.
The engineering archive documents the computation:

- **Pre-settlement (FreeShadow-dominant):** world with free-shadow components grows at rate governed by the Padovan characteristic polynomial λ³ - λ - 1 with root ρ ≈ 1.3247 (the plastic number).
  The three-level lookback of the Padovan recurrence (a_n = a_{n-2} + a_{n-3}) reflects the three-nuclear-position structure: a fact that takes two nuclear steps to resolve contributes a different growth term than one that takes one.
- **Post-settlement (H*_t-dominant):** world approaches Fibonacci growth rate φ ≈ 1.618 (the golden ratio) as FreeShadow components are eliminated through settlement.

M28 exposes a **settlement-fraction metric** in the world UI: the fraction of entity atoms at stratum 2 (H*_t) vs. stratum 1 (saturated) vs. stratum 0 (asserted).
As gameplay settles more entities, the settlement fraction increases and the world's effective growth rate shifts from ρ toward φ.
The game's arc is the ρ→φ transition.

**What this means for the simulation:** A world early in its life (many FreeShadow entities, ρ-arithmetic) has different compositional dynamics than a world late in its life (many H*_t entities, φ-arithmetic).
A closure rule that fires in 3 outer-alternation steps in a ρ-world may fire in 2 steps in a φ-world, because the pre-existing settled stratum-2 atoms satisfy more premises immediately.
The transition is not a phase change — it is a continuous shift tracked by the settlement-fraction metric.

### Temporal orientation in the world UI

The world UI exposes three real-time metrics derived from shadow-type classification:

1. **Shadow-type distribution:** fraction of entity atoms classified as H*_t / SatShadow / TrShadow / FreeShadow
2. **Settlement fraction:** fraction of atoms at stratum 2 (the ρ→φ transition metric)
3. **τ histogram:** distribution of temporal defect values across the entity population

These metrics are substrate cells.
The world UI reads them via the MCP surface's stratum-2 projection π₂ — they are stratum-2 settled values updated by the settling endofunctor each tick.

The **settling-horizon** visualization: every entity has a settling horizon — the set of cl^S rule premises that are one outer-alternation step from firing.
The world UI can render this as "proximity to settling": entities near their settling horizon (few unsatisfied premises) appear close to resolution; entities far from their horizon appear embedded in complexity.

## What M28 does NOT claim

- **Not a full spectral theory.** The temporal defect τ is a coarse measure (scalar count difference).
  A full spectral theory would compute eigenvalues of the defect operator δ_t; M28 uses only the gap counts, not eigenvalue decomposition.
- **Not aperiodic regime.** The temporal dynamics described here are for strict-regime and transfinite-bounded entities.
  Aperiodic-regime entities (entities whose settling involves periodic or non-periodic limit ordinals) require the aperiodic-regime-classification theorem and are outside M28's scope.
- **Not physics.** The Padovan/Fibonacci arithmetic transition is an observation about the growth rate of settlement trajectories under the closure rule system.
  It is not a physical claim about spacetime or entropy.
- **Not real-time.** The temporal defect cell is computed each settling endofunctor pass.
  In a substrate with thousands of entities, this adds computation per tick.
  M28 is not a performance milestone; spectral complexity is computed on demand, not continuously.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `temporal-defect-cell-per-entity` | Every entity has a stratum-2 τ cell; τ = cl^S-gap minus N_Δ-gap; updated each F_U pass | open |
| `shadow-type-classification-visible` | Shadow-type (H*_t/SatShadow/TrShadow/FreeShadow) computed as stratum-2 cell per entity from τ | open |
| `spectral-complexity-as-entity-quality` | cl^S-unsatisfied-count and N_Δ-unstabilized-count cells per entity; spectral-complexity cell derived from them | open |
| `padovan-to-fibonacci-transition-metric` | Settlement-fraction metric (atoms at stratum 2 / total atoms) in world UI; tracks ρ→φ transition | open |
| `temporal-orientation-in-world-ui` | World UI shows shadow-type distribution, settlement fraction, and τ histogram as live substrate reads | open |
| `settling-horizon-as-gameplay-surface` | Settling-horizon visualization: proximity of entity to next outer-alternation firing; exposed in world UI | open |

## Done when

Every entity in the M24 simulation instance carries a stratum-2 τ cell.
The shadow-type distribution is shown in the world UI.
A gameplay sequence demonstrates a τ transition: an entity receives a strong N_Δ-stable prophecy cell and flips from SatShadow (τ < 0) to TrShadow (τ > 0).
The settlement-fraction metric is live in the world UI and moves as gameplay progresses.
Spectral complexity cells are present on entities with complex fibers (at least one entity with cl^S-unsatisfied-count > 5).

## Theoretical shape

**Temporal defect as arrow of time.** The σ/Δ pass decomposition establishes that cl^S and N_Δ are structurally distinct operators on different structural axes (knowledge-order vs. truth-order).
Their relative gap — how far an entity is from each fixed point — is the entity's temporal defect τ.
The nonvanishing of τ on unsettled entities IS the substrate's arrow of time: if both gaps were always equal, τ would be zero, and there would be no directional temporal experience.
The fact that cl^S and N_Δ close at different rates for a given entity is what gives that entity a temporal orientation.

**Padovan as three-level lookback.** The Padovan recurrence a_n = a_{n-2} + a_{n-3} is the minimal three-level lookback recurrence.
The three-level structure corresponds to the three nuclear positions (unbound, Fix(cl^S), Fix(N_Δ)) whose interaction governs a FreeShadow entity's settling trajectory.
A fact that requires two nuclear steps to resolve contributes at the n-2 level; a fact that requires one nuclear step contributes at the n-1 level; the interplay produces the Padovan arithmetic.
As FreeShadow components are eliminated (settlement fraction increases), the three-level lookback collapses to two-level, and the growth rate shifts toward φ (Fibonacci arithmetic).

**Spectral complexity as settling cost.** The bilattice-stabilization pass is bounded per-cell (≤2 substeps on FOUR per the delta-pass theorem in the engineering theory).
The rule-saturation pass is regime-dependent.
An entity's spectral complexity (large cl^S-unsatisfied-count, large N_Δ-unstabilized-count) directly determines how many outer-alternation steps it needs to reach H*_t.
This makes spectral complexity a substrate cost metric, not just a gameplay surface — high-complexity entities are expensive to settle.

## Related

- [Roadmap](roadmap.md)
- [M25 — Stratified Substrate](m25-stratified-substrate-architecture.md), [M24 — Predication-Native Simulation](m24-predication-native-simulation.md) — prerequisites
- [M29 — Relational Hyperverse](m29-relational-hyperverse-modal-collapse.md) — M28's temporal dynamics converge toward M29's modal collapse
- [Engineering archive source](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-native-simulation.md)
