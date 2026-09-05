---
title: "M27 — Voidfleet Academy (Officer Training and Nuclear Quartet Certification)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m5-agential-self-generation, m19-self-developing-pyfars, m20-algebraic-learning-calculus]
goals:
  - nuclear-quartet-as-certification-ladder
  - curriculum-as-duty-predication
  - training-as-substrate-transaction
  - certification-as-stratum-2-witness
  - emergency-succession-as-nuclear-recomposition
  - ecc-learning-loop-feeds-academy
theory-basis: [predication-settling-category-completeness, settling-convergence, quiescence-as-closure-algebra, closure-algebra-coalgebra-correspondence, sigma-delta-pass-decomposition, stratified-predication-fiber, closure-2-monad-lax-idempotence]
prior-art:
  - engineering-archive/operations/command/ideas/triage/voidfleet-academy.md
  - engineering-archive/library/triage/from-tech-bucket-2/captain-as-nuclear-witness.md
  - engineering-archive/library/triage/from-tech-bucket-2/first-officer-as-transfer-nucleus.md
backing-gaps:
  - pyfars/objects/academy-curriculum-record.md (NOT YET AUTHORED — curriculum as ordered duty-predication cells)
  - pyfars/objects/certification-witness.md (NOT YET AUTHORED — stratum-2 doubly-settled record of duty completion)
  - pyfars/objects/nuclear-quartet-stage.md (NOT YET AUTHORED — the four progression stages as fixed-point characterizations)
  - pyfars/morphisms/certifying.md (NOT YET AUTHORED — writing a certification-witness at stratum 2 requires both cl^S and N_Δ to have settled the duty cell)
  - pyfars/morphisms/succeeding.md (NOT YET AUTHORED — emergency recomposition of π_t from persisting cl^S and N_Δ)
  - pyfars/claims/certification-requires-stratum-2.md (NOT YET AUTHORED)
acceptance: "A Voidfleet Academy curriculum record exists in the substrate with at least one defined office (first-officer). The curriculum's required duties are predication cells: a duty is complete when its performance cell reaches stratum 2. A training exercise completes, emitting a certification-witness at stratum 2 with provenance pointing to the stratum-1 rule-saturation record and the stratum-2 N_Δ stabilization record. An emergency succession test demonstrates that when a captain-record's incumbent is removed, the persisting cl^S + N_Δ structure reconstitutes the composite command office π_t from the first-officer's N_Δ position without re-investiture."
---

# M27 — Voidfleet Academy

> "Voidfleet because it's like Starfleet, but grounded in the Void, philosophically." — captain directive, 2026-04-04

The Void is the empty history — the minimal state from which all structure grows.
Voidfleet officers grow from that empty starting point through the four stages of the nuclear quartet: from unbound (no fixed-point structure), through the rule-saturation fixed-point (clerk), through the bilattice-stabilization fixed-point (first officer), to the doubly-settled intersection (captain).
The Academy is the formal system that witnesses, records, and certifies that progression.

## What's built

### The nuclear quartet as certification ladder

The four stages of officer progression are the four fixed-point regimes of the predication settling system:

| Stage | Nuclear position | Fixed-point characterization | Institutional role |
|---|---|---|---|
| Unbound | id | H_t — the full predication fiber, no constraints | Cadet: can observe, cannot commit |
| Clerk | Fix(cl^S) | Fixed point of the rule-saturation closure operator cl^S | Can recognize what has occurred; issues authentic records |
| First officer | Fix(N_Δ) | Fixed point of the bilattice stabilization nucleus N_Δ | Can ensure forward stability of operations; executes but does not command |
| Captain | H*_t = Fix(cl^S) ∩ Fix(N_Δ) | Doubly-settled intersection — joint fixed point of both nuclei | Commands; issues non-delegable doubly-stable witnesses |

The quartet is not a metaphor applied to the mathematics — it is the mathematics applied to institutional structure.
The **captain-as-nuclear-witness** principle establishes that a non-delegable duty d is non-delegable precisely because its discharge requires the captain c such that the duty's performance cell `φ_d(c)` is in H*_t: both cl^S-stable (recognized as having occurred) and N_Δ-stable (forward-stable: no future extension of the history can re-open whether c was the correct party).
Substituting another agent c' produces `φ_d(c')` outside H*_t — it may be cl^S-stable (the substitute did something) but not N_Δ-stable (future extensions could revise whether that was the right discharge).
Non-delegability is the structural consequence of the N_Δ-stability requirement.

The **first-officer-as-transfer-nucleus** principle establishes that the first officer IS the N_Δ-nucleus — not a restriction of the composite command office π_t = cl^S ∘ N_Δ to a sub-site, but one of its two factors.
The first officer's compliance space is Fix(N_Δ): the obligation is to ensure forward-stability of operations within the internal scope.
The obligation gap is N_Δ-residual alone, not the full cl^S ∧ N_Δ gap the captain bears.

### Curriculum as duty predication

A curriculum is a set of duty cells: predication cells that define what an officer at each nuclear stage must be able to demonstrate.
Each duty is a cell:

```
(curriculum:first-officer-track, requires-duty, duty:manage-dispatch-queue, t)
(duty:manage-dispatch-queue, required-at-stage, nuclear-stage:first-officer)
(duty:manage-dispatch-queue, demonstrated-by, capability:dispatch-queue-management)
```

An officer's progress is their current duty-completion cells: which duties they have performance cells for at stratum 2.
The Academy's cl^S rule set includes: if all duties for a stage have stratum-2 performance cells, fire a `promotion-eligible` cell at stratum 1 for that officer.
N_Δ stabilizes the promotion-eligibility cell to stratum 2 when the evidence is forward-stable.

Curriculum structure is substrate content.
Adding a duty to a curriculum is writing a predication cell.
Removing a duty is retracting it.
The curriculum evolves as the substrate evolves — no code change required to add training requirements.

### Training as substrate transaction

When an officer completes a training exercise, the training is a substrate transaction:

1. The officer's agent emits a `duty-attempted` cell at stratum 0: `(officer:X, attempted-duty, duty:manage-dispatch-queue, t)`
2. The Academy's cl^S rule fires against the attempt record and the officer's demonstrated capability cells.
  If the capability is demonstrated, a new stratum-1 cell is produced: `(officer:X, duty-completed, duty:manage-dispatch-queue, t)`
3. N_Δ stabilizes the duty-completed cell to stratum 2.
  The stratum-2 stabilization record IS the certification-witness.

A training exercise that fails produces no stratum-1 completion cell — the attempt record remains at stratum 0.
The officer can reattempt.
The event log carries the full attempt history; the stratum-2 projection π₂ shows only successful completions.
The audit trail is the full stratified fiber A^♭_p.

Training that "debits the budget" (the ledger integration from M21) is an additional cl^S rule: a training attempt fires a `training-token-spent` event at stratum 1; N_Δ stabilizes it to stratum 2 as a debit cell in the agent's account.

### Certification as stratum-2 witness

Certification is a stratum-2 atom.
A certification-witness carries: - `certified-for: duty:<slug>` — which duty - `achieved-at-stage: nuclear-stage:<stage>` — which nuclear quartet stage - `derived_from: [duty-completed-cell-id, ...]
` — provenance pointing to the stratum-1 duty-completion cells that justified it - `derived_via: cl^S-firing-record:<id>` — the rule-saturation record - `stabilized_by: N_Δ-stabilization-record:<id>` — the bilattice-stabilization record

A certification that is only at stratum 1 (cl^S-stable but not N_Δ-stable) is not a certification — it is a tentative recognition that can be revised.
Only the stratum-2 atom is authoritative.
This is the formal definition of "certification" in the Academy system: a predication cell atom that has passed both the rule-saturation pass and the bilattice-stabilization pass.

The **predication-settling-category-completeness** theorem establishes that the predication settling category has all limits and colimits needed for comparing certification records across officers and curricula.
Batch promotions, certification transfers, and curriculum coverage calculations are computable from the settling category structure without special aggregation code.

### Emergency succession as nuclear recomposition

Normal succession (investiture): the outgoing captain performs the investiture act; the composite command office π_t passes intact to the new captain.

Emergency succession (recomposition): the captain's incumbent is removed without investiture.

1. cl^S persists — the rule-saturation closure operator is a structural property of the institution (the body politic never dies).
  The clerk's position (Fix(cl^S)) remains.
2. N_Δ persists — its incumbent (the first officer) is aboard.
  Fix(N_Δ) remains.
3. The σ/Δ pass decomposition's commutation property guarantees that cl^S ∘ N_Δ = N_Δ ∘ cl^S = π_t (the joint fixed point is the same regardless of which nucleus runs first in the outer alternation).
4. The first officer's assumption of command executes the recomposition: they now occupy both Fix(N_Δ) and, by succession, Fix(cl^S) — bringing the composite H*_t position to themselves.

Emergency succession is recomposition from structurally available components.
The documentary record (the log entry) is the cl^S act that formally recognizes the recomposition has occurred — a stratum-1 atom fired by the recognition rule, stabilized to stratum 2 by N_Δ as the new captain's first commissioned act.

The Academy trains specifically for this.
An officer at the first-officer stage (Fix(N_Δ)) practices the recomposition under simulation: a captain-removal event fires, and the officer must demonstrate that the composite command office is reconstituted from Fix(cl^S) + Fix(N_Δ) without re-investiture.
Certification for the captain's stage requires passing this simulation.

### ECC learning loop feeds the Academy

The observer-pattern-classifier-instinct cycle from M20 feeds the Academy:

1. The observer detects patterns in officer behavior.
2. Successful patterns become instincts (M20's shadow-class consolidation).
3. Mature instincts become skill records in the substrate.
4. Skills are duty-training material: an Academy curriculum cell references the skill as the `demonstrated-by` predicate for a duty.

The learning system and the Academy are not separate.
New training material emerges from settled institutional behavior.
An officer who repeatedly demonstrates a non-standard approach that the observer detects and the instinct system consolidates contributes to the curriculum automatically.
The Academy's curriculum is a living substrate object, not a static document.

## What M27 does NOT claim

- **Not a human HR system.** Voidfleet Academy certifies AI officers (agents) and human officers (captains) through the same substrate mechanism.
  The distinction between human and AI officer is substrate-encoded (an agent record vs. a personnel record) but the certification process is identical.
- **Not a replacement for judgment.** The Academy certifies that a duty was demonstrated under curriculum conditions.
  It does not certify that the officer can exercise judgment in novel situations.
  Judgment is H*_t knowledge — doubly-settled experience that requires real deployment, not simulation.
- **Not a rigid curriculum.** The curriculum is substrate content.
  It evolves.
  Duties added after an officer's certification do not retroactively uncertify them unless a cl^S rule explicitly fires a `certification-lapsed` cell.
- **Not a performance evaluation system.** The Academy records completion, not quality.
  Quality assessment is a separate substrate capability (the audit and anomaly system from M22's transcript-watcher) that may trigger duty-reassignment but does not interact with the certification stratum directly.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `nuclear-quartet-as-certification-ladder` | Four stages (unbound, clerk, first-officer, captain) as fixed-point characterizations; each stage is a defined nuclear position | open |
| `curriculum-as-duty-predication` | Academy curriculum is substrate cells; duties are predication cells with required-at-stage and demonstrated-by predicates | open |
| `training-as-substrate-transaction` | Training exercise completion emits duty-completed cell at stratum 1; N_Δ stabilizes to stratum 2; no completion without both passes | open |
| `certification-as-stratum-2-witness` | Certification-witness atom at stratum 2 with full provenance (derived_from, derived_via, stabilized_by) | open |
| `emergency-succession-as-nuclear-recomposition` | Captain removal → recomposition from Fix(cl^S) + Fix(N_Δ); demonstrated in simulation before captain-stage certification | open |
| `ecc-learning-loop-feeds-academy` | Observer-detected patterns → consolidated instincts → skill records → Academy duty training material | open |

## Done when

An Academy curriculum record exists with at least the first-officer track defined.
An agent completes a training exercise and a certification-witness atom appears at stratum 2 with full provenance.
An emergency succession simulation runs: captain-record's incumbent is removed; first-officer's recomposition produces a command-reconstituted cell at stratum 2.
A curriculum duty is added after an officer's certification; the officer's existing certifications are not retroactively lapsed.
The ECC loop produces at least one new skill record that the curriculum references as a duty demonstration route.

## Theoretical shape

**Nuclear quartet as the institutional mathematics.** The four fixed-point regimes Fix(id) ⊇ Fix(cl^S) ⊇ Fix(N_Δ) ⊇ H*_t are not metaphors for institutional roles — they are the mathematical characterization of what it means to hold each role.
A clerk who cannot recognize what has occurred (cannot produce Fix(cl^S)-stable records) is not a clerk at the algebra level.
A first officer whose operations are not N_Δ-stable (forward-revisable) is not a first officer at the algebra level.
The Academy's certification is the substrate's formal recognition that the officer's performance cells are in the correct fixed-point regime.

**Non-delegability as N_Δ-stability requirement.** The captain-as-nuclear-witness principle establishes that non-delegable duties are those whose discharge requires the captain's performance cell to be in H*_t.
The mathematical content: substituting another agent yields a performance cell that may be cl^S-stable (recognized) but not N_Δ-stable (forward-revisable).
The Academy trains for this by simulation: an officer must demonstrate that their performance cells reach stratum 2 under both nuclei, not just stratum 1.

**Emergency succession as joint-fixed-point recovery.** The σ/Δ pass decomposition establishes that cl^S and N_Δ are structurally distinct but their joint fixed point H*_t = Fix(cl^S) ∩ Fix(N_Δ) is recoverable from either factor.
Emergency succession is the institutional analog: with one factor (N_Δ = first officer) present and the structural nucleus cl^S persisting, the composite is recomposable.
The Academy's emergency succession training is the practical exercise of this algebraic fact.

## Related

- [Roadmap](roadmap.md)
- [M5 — Agential Self-Generation](m5-agential-self-generation.md), [M19 — Self-Developing PyFARS](m19-self-developing-pyfars.md), [M20 — Algebraic Learning Calculus](m20-algebraic-learning-calculus.md) — prerequisites
- [Engineering archive sources](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/voidfleet-academy.md)
- [Captain as nuclear witness](../../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/captain-as-nuclear-witness.md)
- [First officer as transfer nucleus](../../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/first-officer-as-transfer-nucleus.md)
