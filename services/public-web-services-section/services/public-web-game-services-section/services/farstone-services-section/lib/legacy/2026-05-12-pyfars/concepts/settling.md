---
type: concept
class: closure-dynamic
status: draft
depends-on: [substrate, closure-2-monad, four-regime-classification]
realizes: [predication-settling]
---

# Settling

The closure-driven dynamic by which [substrate](substrate.md) cells reach quiescent values.
Realizes the [predication-categories closure 2-monad](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/) over PyFARS's predication base.
Settling is what fires when new cells are introduced (via verb invocation) or when closure rules change.

## The settling step

A closure-rule-system $R$ over a predication base $\mathcal{C}$ defines a closure operator $\mathrm{Cl}_R$ that takes a system state $S$ to its closure $\mathrm{Cl}_R(S)$.
Settling is the iterated application of $\mathrm{Cl}_R$ until quiescence — the fixed-point of $\mathrm{Cl}_R$ from the starting state.

Per the [four-regime classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), the closure ordinal $\kappa$ at which quiescence is reached classifies the closure-rule-system:

- **Strict** ($\kappa < \omega$) — finite predicates, finite entities, finite rules; settling completes in finitely many steps.
- **Scott-continuous** ($\kappa = \omega$) — infinite entity space, finitary rules; settling completes at the first limit ordinal.
- **Transfinite-bounded** ($\kappa$ a definable transfinite ordinal) — non-Scott-continuous closure rules, but a definable bound exists.
- **Aperiodic** ($\kappa$ unbounded) — settling does not complete in any definable ordinal.

Most of PyFARS's day-to-day operation lives in strict and Scott-continuous regimes.
Some of its commitments (governance under aperiodic-regime functions; sub-domains with infinitary closure) live in higher regimes.

## What settling is for in PyFARS

Settling is the mechanism by which system state becomes *stable enough to read*.
When a verb introduces new cells (a witness event arrives, an intent is queued, a task is assigned), the substrate is momentarily out of closure — there are cells whose closure consequences haven't been computed.
Settling fires the closure rules, and the substrate reaches a new quiescent state.

The corpus projection — what humans read in markdown — is computed against quiescent system state.
PyFARS does not project mid-settling; the markdown corpus is a snapshot of the substrate after closure converges (or after a checkpoint, in higher regimes).

## Settling vs. dispatch

These are distinct. *Settling* is closure-driven: it computes consequences of cells that already exist. *Dispatch* is work-driven: it moves system state forward by introducing new cells (assignments, executions, witnesses).
Dispatch produces inputs to settling; settling produces the consequence cells that dispatch reads.

The [heartbeat](heartbeat.md) is the cadence under which dispatch and settling alternate.
A heartbeat tick: dispatch one step (introduce new cells via verb invocation) → settle (close under rules) → repeat.

## Settling and projection

After settling reaches quiescence, the resulting state is projection-ready.
Projections are computed against quiescent state.
If a verb's system transition leaves substrate non-quiescent (e.g., a witness arrives that hasn't been settled yet), projections from that state are *partial* and PyFARS marks them as such (validation diagnostics, freshness markers, etc.).

In aperiodic-regime sub-domains, full settling is not achievable in finite time.
PyFARS commits to ship-trajectory there rather than ship-state — see the upstream [scott-continuity-as-checkpointability](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) result for the discipline.

## What this concept does not specify

- The PyFARS-side specifics of how closure rules are executed.
  The current realization mixes Python-coded rules with substrate-cell-declared rules; settling rules being system content is a program-shaping question.
- Convergence guarantees per sub-domain.
  Some sub-domains are easy to classify (work tracking is mostly strict), some are harder (governance is partly aperiodic).
- The relation to settling in [predicated-work](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/) — work-stream completion, plan-completion-as-meet, etc. PyFARS realizes those settlings as specific instances of this concept.
