---
type: morphism
class: closure-application
status: draft
depends-on: [substrate, closure, closure-2-monad]
realizes: [closure-2-monad, predication-settling]
---

# Settling

The morphism that applies the active closure-rule-system to system state, producing the next closure step.
Iterated application of settling drives substrate from a starting state to its [closure](../concepts/closure.md); the closure ordinal at which iteration reaches a fixed point classifies the closure-rule-system per the [four-regime classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/).

Settling is the *operational verb* whose result-state is captured by [closure](../concepts/closure.md) (the concept) and whose per-cell completion is captured by [settled](../concepts/settled.md).
The substrate-as-a-whole reaching closure under iterated settling is what [quiescent](../concepts/quiescent.md) names.

## Action

For system state $S$ and active closure-rule-system $R$:

$$\mathrm{settling}_R \colon S \;\longrightarrow\; \mathrm{Cl}_R^{(1)}(S)$$

— one closure-step.
Iterating settling until the result is fixed yields the full closure $\mathrm{Cl}_R(S)$.

## Settling within and across ticks

In strict-regime sub-domains, full closure converges within one [tick](../concepts/tick.md) — settling is iterated until [quiescence](../concepts/quiescent.md) inside the tick.
In Scott-continuous regimes, closure reaches the limit at $\omega$; PyFARS commits to checkpointing at the $\omega$-limit per [scott-continuity-as-checkpointability](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/) — that is, the system state shipped between ticks is the $\omega$-limit, not a partial state.

In transfinite-bounded and aperiodic regimes, full closure does not converge in any tick.
PyFARS's discipline there is *trajectory-shipping*: settling continues across ticks; system state at any tick is partial; projections marker the partiality.
The captain (and any reader) can request the current trajectory state but cannot expect it to be a closure-fixed-point.

## Settling and verbs

Most verbs that introduce new cells also invoke settling (often implicitly) before returning.
The pattern: verb produces witness → witness's cells are added → settling runs → quiescent state results → verb's projection is rendered against quiescent state.

Verbs that *don't* invoke settling are pure projections (settling ran on the prior tick's substrate; the verb's read is from the same quiescent state).

The tick-and-pulse loop's structure (per [pulsing](pulsing.md)) is: agent's pulse produces witnesses → settling fires over the new cells → substrate is quiescent → next tick.
Settling is what makes the system read-ready by the next tick.

## Settling and the JSONL event log

Settling produces *consequence cells* — cells that aren't directly witnessed but are derived by closure rules from witnessed cells.
PyFARS's discipline for these cells:

- They are *computed* from the witness-supplied cells via $R$.
- They are *not* re-witnessed; the JSONL log carries the witness, and the consequences are derivable.
- This means the JSONL log + closure-rule-system $R$ + the timestamp are sufficient to reconstruct substrate at any time.
  (See [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md).)

Some consequence cells *do* get materialized in the corpus (frontmatter relations are projected; derived back-edges in some cases are rendered).
Materialization is a render concern, not a settling concern.

## Settling and conflict surfacing

When closure rules produce a $\top$-valued cell (paraconsistent — contradictory evidence), settling does not collapse the substrate.
Per [bilattice values](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) and the paraconsistent comprehension theorem, $\top$ cells are surfaced (not hidden), [validation](../concepts/validation.md) flags them, and adjudication is a separate process.
Settling's contribution: it produces the $\top$ cell; downstream tooling reads it.

This is essential for substrate purity: settling does not silently drop or coerce contradictions.
It makes them visible.

## Naturality

Settling is natural in the closure-rule-system: a refinement of $R$ to $R' \supseteq R$ produces consequence cells that the original $R$ does not produce.
Substrate states are partially ordered by closure-extension; settling commutes with closure-rule-system extension up to the bilattice's knowledge order.
This is what makes incremental rule additions monotonic — adding a new closure rule cannot undo a prior closure, only add more cells.

## What this morphism does not specify

- The exact algorithm for closure iteration.
  Naive iteration is sound but expensive; PyFARS's realization uses dirty-bit tracking and dependency-driven re-firing.
- The handling of cyclic closure rules (where $R$'s closure operator is non-monotonic locally).
  The current realization handles cycles via stratification; cases that defeat stratification are program-shaping questions.
- The relationship to the [closure 2-monad](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) at the 2-categorical level — the lax-idempotence of $\mathrm{Cl}$ as a 2-monad implies finer structure that PyFARS's runtime currently doesn't surface but the theory carries.
