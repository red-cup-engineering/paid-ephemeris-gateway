---
type: definition
class: system-morphism
status: draft
realizes: [dispatching, deriving]
depends-on: [dispatch-closure-rule-system, eligibility-by-capabilities, eligibility-by-charter-binding, predication-cell]
implementation: pyfars.runtime.dispatch_graph.match_strength
---

# Dispatching by twist-product fusion

The morphism that computes a workitem's *match strength* against a candidate dispatchable in a single pass via [twist-product fusion](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/twist-product-fusion.md) ($\odot$) on the [predication fiber algebra](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md).
Replaces the prior filter-then-rank pattern (eligibility filter removes unauthorized candidates, then capability-rank orders survivors) with a single $\odot$-composition that simultaneously incorporates capability-match and authorization-status into one bilattice value.

This morphism realizes the upstream [`dispatch-composes-authorization`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/dispatch-composes-authorization.md) theorem at the substrate-runner level.
It is what makes partial-authorization a first-class outcome (rather than silent filtration) and what eliminates the read-discipline violation of branching dispatch on system content.

## Signature

$$\mathrm{match\text{-}strength}\colon \mathrm{Workitem} \times \mathrm{Dispatchable} \;\longrightarrow\; \mathbf{FOUR}$$

For a workitem $W$ with required-capability fiber $\rho_W$ (capability + authorization predications) and a candidate $C$ with offered-capability fiber $\omega_C$ and authorization fiber $\alpha_C$:

$$\mathrm{match\text{-}strength}(W, C) \;=\; \rho_W \;\odot\; (\omega_C \vee_k \alpha_C)$$

The output is a value in the Belnap-Fitting FOUR bilattice — $\mathbf{t}$ (matched and authorized), $\bot$ (matched, authorization unknown), $\mathbf{f}$ (matched but explicitly denied, or unmatched), $\top$ (contradictory authorization).

## $\odot$ on FOUR

The twist-product on FOUR satisfies (with $\mathbf{f}$ absorbing):

| $\odot$ | $\mathbf{t}$ | $\bot$ | $\mathbf{f}$ | $\top$ |
|---|---|---|---|---|
| $\mathbf{t}$ | $\mathbf{t}$ | $\bot$ | $\mathbf{f}$ | $\top$ |
| $\bot$ | $\bot$ | $\bot$ | $\mathbf{f}$ | $\top$ |
| $\mathbf{f}$ | $\mathbf{f}$ | $\mathbf{f}$ | $\mathbf{f}$ | $\mathbf{f}$ |
| $\top$ | $\top$ | $\top$ | $\mathbf{f}$ | $\top$ |

Per the truth-order $\leq_t$ ($\mathbf{f} \leq_t \bot \leq_t \mathbf{t}$), candidates are ranked: $\mathbf{t}$-candidates above $\bot$-candidates above $\mathbf{f}$-candidates. $\top$-candidates surface as adjudication-required.

## Three properties

### Authorization-respecting

A candidate producing $\mathbf{f}$ on any required authorization absorbs the whole composition to $\mathbf{f}$ — the candidate is *strictly* below any candidate without that explicit denial.
This makes authorization gating mechanical: revoking a capability cell flips the candidate's match strength to $\mathbf{f}$ on the next dispatch tick, without code change.

### Partial-authorization-aware

A $\bot$ on any required authorization (the substrate has no opinion on whether this candidate holds it) produces $\bot$ overall.
The substrate may *select* the partial-authorization candidate when no fully-authorized candidate exists, recording partial-authorization status in the dispatch witness.
This is the discipline that lets bootstrap dispatch (no agent yet has full authorization) terminate gracefully rather than dead-locking.

### Single-pass

Per the [`frobenius-for-fusion-fails`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/frobenius-for-fusion-fails.md) theorem, query-planner pushdown does not commute with $\odot$ on three of four predicate-generator classes.
The dispatch composition must remain at the dispatch site; factoring `exists candidate. capability(c, w) ⊙ authorized(c, w)` as `(exists candidate. capability(c, w)) ⊙ authorized(c, w)` is *unsound*.
The morphism enforces this by computing $\odot$ before any quantifier reduction.

## What the morphism does

1. **Read workitem fibers.** Read `(W, requires-capability, ?cap)` and `(W, requires-authorization, ?auth)` cells; assemble required-capability fiber $\rho_W$.
2. **Read candidate fibers.** For each candidate $C$, read `(C, offers-capability, ?cap)` and `(C, holds-authorization, ?auth)` cells; assemble offered fiber $\omega_C$ and authorization fiber $\alpha_C$.
3. **Compute join.** $\omega_C \vee_k \alpha_C$ in the bilattice's knowledge-order.
4. **Compute twist product.** $\rho_W \odot (\omega_C \vee_k \alpha_C)$ produces match strength.
5. **Emit cell.** `(W, match-strength-with, C, <value>) = t` — one cell per (workitem, candidate) pair.
6. **Select.** Choose the candidate(s) at $\leq_t$-maximum; emit `(W, assigned-to, C) = t` for the winner.

## What this morphism commits to

1. **No filter-then-rank.** The morphism refuses the two-stage pattern; eligibility and ranking compose in a single $\odot$.
2. **Witnessable dispatch.** Every match strength is recorded as a system cell.
  Reconstructing why a candidate was or was not selected is a system read, not a log-trawl.
3. **Federation-cleanly composable.** When dispatch crosses a federation boundary, the receiving substrate composes the message's required fiber against the local candidate's offered+authorization fiber; per [federation-convergence](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/), both substrates compute the same match-strength.

## What this morphism does not specify

- Tie-breaking among multiple $\leq_t$-maximum candidates.
  Currently lexicographic by candidate slug (a determinism-preserving choice); whether to use a system-resident cost-quantale ordering is the next refinement.
- Aggregate workitems' dispatch (per [`quantifier-adjoints-and-aggregate-workitems`](../questions/dispatch-workitems-plans-and-external-surfaces.md)).
  For class-aggregated workitems, the match-strength composes through the quantifier adjoint; the per-member dispatch is unchanged but the class-level rule fires differently.
  Open for M2's post-landing phase.
- Match-strength recomputation cadence under substrate hot-edits.
  Currently per-tick at dispatch-pass; per-edit recomputation would be more responsive but expensive.
