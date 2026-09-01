---
title: "M20 — Algebraic Learning Calculus (Full Instinct Calculus)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m18-publishing-and-learning, m4-memory-feedback]
goals:
  - shadow-class-barcode-replaces-float-confidence
  - padovan-paced-formality-progression
  - closure-convergence-as-confidence-metric
  - pqs-style-promotion-gates
  - dreams-as-self-composition-consolidation
  - abduction-as-composition-gap
theory-basis: [consolidation-as-settlement, closure-rule-language, four-regime-dichotomy, algebraic-learning-calculus]
prior-art: [engineering-archive/operations/command/ideas/triage/algebraic-learning-calculus.md]
backing-gaps:
  - pyfars/objects/shadow-class-barcode.md (NOT YET AUTHORED — four-dimensional instinct confidence measure over FreeShadow/SatShadow/TrShadow/H*_t)
  - pyfars/objects/formality-record.md (NOT YET AUTHORED — F0→F3 formality level with evidence witnesses)
  - pyfars/objects/consolidation-dream.md (NOT YET AUTHORED — respond(self, self) internal fiber composition record)
  - pyfars/morphisms/consolidating-by-self-composition.md (NOT YET AUTHORED)
  - pyfars/claims/padovan-governs-consolidation-timescale.md (NOT YET AUTHORED)
acceptance: "At least one production instinct whose confidence was previously a float (from M4's observation-count heuristic) is now measured by a shadow-class barcode trajectory. Promotion from instinct → skill requires the instinct's fiber to reach F5.3 (settled AND partnered) rather than observation-count threshold. Between-session consolidation runs as a self-composition pass; new bypass adjacencies surface as proto-pattern observations the next tick reads. The algebraic learning calculus documentation passes the theory-officer office's review."
---

# M20 — Algebraic Learning Calculus

[M4](m4-memory-feedback.md) wires memory feedback into the dispatch loop; [M18](m18-publishing-and-learning.md) ships the promotion ladder and Tier-2 model training surface.
M20 deepens the *theory* of learning: replacing the naive float-confidence instinct model with the algebraic learning calculus the substrate's bilattice already implies.

The insight driving M20: an instinct's confidence is not a scalar.
It is proximity to a fixed point under a closure operator.
"Learned" means idempotent — applying the training operator produces no further change.
This is a mathematically exact statement about the predication graph, not a threshold on an observation count.

## What's built

### Shadow-class barcode replaces float confidence

M4's `composite.score()` returns a float (0.0–1.0) derived from observation count.
This is naive: it treats all observations as equivalent, ignores context, and has no theory of what convergence means.

The replacement: every instinct carries a **shadow-class barcode** — a distribution over four settlement classes:

| Class | Meaning |
|---|---|
| `H*_t` (fully settled) | predicate is grounded, contextually validated, partnered |
| `SatShadow` (experienced, uncertain) | predicate has been observed but not partnered |
| `TrShadow` (fated, ungrounded) | predicate is entailed but lacks empirical support |
| `FreeShadow` (pure potential) | predicate is unreached |

An instinct is "learned" when all its relevant predicates have migrated to `H*_t`.
The distribution IS the confidence — not a single float but a four-dimensional trajectory toward the fixed point.

This replaces `composite.score()` not as a code change but as a theory-grounded measurement: the existing closure-runner already computes settlement state; the barcode reads that state rather than counting observations.

### Padovan-paced formality progression

The current promotion ladder (M4/M18: observation → instinct → skill → tool → hook) uses observation count as the promotion gate.
M20 replaces this with **formality-graded promotion**:

- **F0 (implicit)**: work isn't yet specified; no promotion eligible.
- **F1 (narrative)**: prose instinct; can promote if the observation barcode shows ≥ 60% `H*_t` coverage.
- **F2 (structured)**: checklist instinct; can promote if the barcode shows ≥ 80% `H*_t` AND the instinct has been validated across ≥ 2 distinct offices.
- **F3 (algebraic)**: deterministic instinct; can promote to tool if F5.3 (settled + partnered) holds AND captain ratifies.

The **Padovan recurrence** ($a_n = a_{n-2} + a_{n-3}$, limiting constant ρ ≈ 1.3247) governs the consolidation timescale: the three-level lookback reflects the genuine cognitive cost of reaching the next formality level.
Learning is slower than Fibonacci (two-level lookback) because genuine settlement requires three-level witness.

This replaces the arbitrary `2+ observations` threshold with a structurally grounded gate derived from the bilattice algebra.

### PQS-style promotion gates

Per the algebraic learning calculus, **demonstrated competency** = the instinct's fiber reaching F5.3 (settled AND partnered) on the relevant duty predicates.
"Demonstrated" requires the partnership condition: other entities (test cases, other officers, completed tasks) must be settlement partners.
Solo settlement (F5.1, untested knowledge) doesn't qualify.

This is the **PQS-style gate**: an instinct doesn't promote when it's been seen N times; it promotes when it has been tested and the test has a co-signing witness.
The governance-app (from [M17](m17-561-productivity-stack.md)) surfaces the partnership witness as the ratification evidence.

### Dreams: self-composition consolidation

Between sessions, an office's accumulated observations produce new bypass adjacencies through **self-composition**: `respond(office, office)`.
The adjacencies ARE the proto-patterns that, when they settle on the next tick, become instinct proposals.

This mechanism — called **dreams** — is the substrate-side equivalent of sleep consolidation: the algebra processes its own entanglements between active sessions rather than burning dispatch budget.
The M4 session lifecycle (open/close) now brackets a consolidation step at session close: a lightweight self-composition pass over the session's observation cells.

The dream-step is substrate-resident: the consolidation closure rule is itself a substrate record (F3-algebraic closure rule firing on session-close events).
Captain review is not required per dream; captain ratification is required per instinct-to-skill promotion.

### Abduction as composition gap

The algebraic learning calculus identifies **abduction** as the composition gap: when two observations compose and bypass holds at their boundary, the composition reaches states neither observation contained alone.
The new reachable state IS the abduced hypothesis.

This makes abduction a substrate operation, not a prompt.
When the closure runner finds a non-empty composition gap during a dreams step, it emits an `abduction-candidate` observation record.
The M18 promotion ladder treats abduction-candidate observations as high-priority instinct proposals.

## What M20 does NOT claim

- **Not a replacement for LLM inference.** The algebraic learning calculus measures convergence; it does not replace the LLM that does F0/F1 work.
  What it *does* is identify when LLM-derived behaviour has converged enough to be captured by a cheaper model (the [M18](m18-publishing-and-learning.md) Tier-2 path).
- **Not Bayesian inference.** The shadow-class barcode is not a probability distribution.
  It is a four-valued settlement measure derived from the bilattice.
  The analogy to Bayesian confidence is informal; the formal model is the closure-operator fixed point, not Bayes updating.
- **Not universal pedagogy.** The Padovan timescale applies to instinct promotion within the dispatch loop.
  It does not claim to model human learning in general; it claims only that the algebraic structure of the substrate's learning loop follows the plastic number recurrence.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `shadow-class-barcode-replaces-float-confidence` | Every instinct has a shadow-class barcode; `composite.score()` replaced with barcode trajectory | open |
| `padovan-paced-formality-progression` | Promotion gates derived from formality level + Padovan recurrence, not observation count | open |
| `closure-convergence-as-confidence-metric` | "Learned" = idempotent under training operator = all predicates in H*_t | open |
| `pqs-style-promotion-gates` | F5.3 (settled + partnered) required for instinct→skill; partnership witness surfaced in governance-app | open |
| `dreams-as-self-composition-consolidation` | Session-close fires respond(office, office) pass; new adjacencies surface as instinct proposals next tick | open |
| `abduction-as-composition-gap` | Closure runner identifies non-empty composition gaps and emits abduction-candidate observations | open |

## Done when

At least one production instinct is measured by shadow-class barcode trajectory rather than float confidence.
The between-session dreams step runs and produces at least one new proto-pattern on a real polity substrate.
An instinct whose barcode reaches H*_t in all dimensions is promoted through the F5.3 gate to skill under captain ratification.
The algebraic learning calculus documentation passes theory-officer review.
The float-confidence `composite.score()` is deprecated in the substrate spec.

## Theoretical shape

**Learning as closure-operator fixed point.** The instinct calculus is a direct reading of the predication-categories closure theory: an instinct is "learned" when it is a fixed point of the training closure operator, not when an observation counter crosses a threshold.
The shadow-class barcode tracks where in the settlement space the instinct's predicates currently live — and convergence toward H*_t IS convergence toward the fixed point.

**Padovan timescale from three-level lookback.** The closure-2-monad's lax-idempotence (Kelly-Lack K2) implies that the learning operator needs three-level lookback to guarantee stability; two-level lookback (Fibonacci ratio) is insufficient because it misses the third-degree bypass condition.
The Padovan recurrence ($a_n = a_{n-2} + a_{n-3}$) governs both the finite algebra and infinite coalgebra of the bilattice algebra — and therefore the natural pace of genuine learning within it.

**Dreams as substrate self-application.** Self-composition (`respond(self, self)`) is the substrate's reading of sleep consolidation (Groos, Piaget accommodation).
The composition gap (abduction as I.
6) surfaces novel hypotheses from existing observations.
The formality staircase (F0→F3) follows Piaget's stages translated into settlement depth.

## Related

- [Roadmap](roadmap.md)
- [M4 — Memory and Session Feedback](m4-memory-feedback.md), [M18 — Publishing & Continuous Learning](m18-publishing-and-learning.md) — prerequisites
- [Engineering archive source](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/algebraic-learning-calculus.md)
