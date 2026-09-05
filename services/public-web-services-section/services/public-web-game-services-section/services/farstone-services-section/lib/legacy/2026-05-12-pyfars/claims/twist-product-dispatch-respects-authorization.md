---
type: claim
status: sketch
depends-on: [dispatching-by-twist-product-fusion, dispatch-closure-rule-system, eligibility-by-capabilities, eligibility-by-charter-binding]
---

# Twist-product dispatch respects authorization

**Claim.** When dispatch computes match-strength via [`dispatching-by-twist-product-fusion`](../morphisms/dispatching-by-twist-product-fusion.md) using the twist product $\odot$ on the predication fiber algebra, the resulting match-strength simultaneously expresses both *capability-match* and *authorization-status*.
A candidate without required authorization produces a strictly lower match-strength under $\leq_t$ than a candidate with the same capability profile and full authorization.
Equivalently: the substrate does not need a separate authorization check; $\odot$-composition is sufficient.

## Statement

For a workitem $W$ with required-capability fiber $\rho_W$, and candidates $C_1, C_2$ with offered fibers $\omega_{C_1} = \omega_{C_2}$ but authorization fibers $\alpha_{C_1} \neq \alpha_{C_2}$ such that $\alpha_{C_1} \leq_t \alpha_{C_2}$ on every required-authorization predication:

$$\mathrm{match\text{-}strength}(W, C_1) \;\leq_t\; \mathrm{match\text{-}strength}(W, C_2)$$

Strictly so when the inequality is strict on at least one required-authorization predication.

## Sketch

The proof factors through three properties of $\odot$ on Belnap-Fitting FOUR:

### (1) $\odot$ is monotone in $\leq_t$ on its second argument

For $x \in \mathbf{FOUR}$ and $y_1 \leq_t y_2$ in $\mathbf{FOUR}$:

$$x \odot y_1 \;\leq_t\; x \odot y_2$$

This is direct from the $\odot$ table: for any fixed $x$, the column for $y$ is monotone in $\leq_t$.
Verifiable by enumeration on the 4-element bilattice.

### (2) $\vee_k$ is monotone in $\leq_t$ on each argument

For $x_1 \leq_t x_2$ and any $y$:

$$x_1 \vee_k y \;\leq_t\; x_2 \vee_k y$$

This follows from $\vee_k$'s definition as the knowledge-order join: it preserves truth-order monotonicity because the bilattice's two orders are *bounded distributive*.

### (3) Composition

For candidates $C_1, C_2$ with $\omega_{C_1} = \omega_{C_2} =: \omega$ and $\alpha_{C_1} \leq_t \alpha_{C_2}$:

$$\omega \vee_k \alpha_{C_1} \;\leq_t\; \omega \vee_k \alpha_{C_2} \quad \text{(by 2)}$$

Then:

$$\rho_W \odot (\omega \vee_k \alpha_{C_1}) \;\leq_t\; \rho_W \odot (\omega \vee_k \alpha_{C_2}) \quad \text{(by 1)}$$

which is the claim.
The strict-inequality case follows because $\odot$ preserves strict $\leq_t$-inequalities except where $\mathbf{f}$-absorption collapses both sides; absorption into $\mathbf{f}$ requires the $\rho_W$-side to demand a $\mathbf{t}$ that neither candidate provides, which contradicts the assumption that authorization is the only varying axis. ✓

$\square$

## Discussion

This claim is what makes filter-then-rank an *anti-pattern* in the substrate.
The two-stage form (filter unauthorized candidates, then rank survivors by capability) cannot represent partial authorization ($\bot$ on a required authorization) — the filter discards $\bot$-candidates before the rank step sees them.
The single-pass $\odot$-form preserves $\bot$ as a meaningful intermediate value: a candidate with capability-match $\mathbf{t}$ and authorization $\bot$ ranks below a fully-authorized candidate but above an unauthorized one, and the substrate may select it when no $\mathbf{t}$-candidate exists.

Beyond ranking correctness, the claim is operationally load-bearing for two reasons:

1. **Audit-completeness.** The dispatch witness records match-strength and its constituent fibers; reconstructing "why was C selected" reads substrate cells, not the dispatch code's branching history.
  Filter-then-rank loses the rejected-candidate information unless explicitly logged; $\odot$-composition keeps it as a per-candidate cell.

2. **Federation-correctness.** When dispatch crosses a federation boundary, the receiving substrate composes the message's required fiber against the local candidate's fibers.
  Per [federation-convergence](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/), both substrates compute the same match-strength on shared inputs.
  Filter-then-rank with peer-specific filtering rules diverges; $\odot$-composition with shared bilattice values converges.

## What this claim does not say

- It does not say $\odot$-dispatch is *faster* than filter-then-rank.
  In the worst case (large candidate set, sparse required-fiber), $\odot$ touches every candidate while filter discards the obviously-unauthorized early.
  The substrate's commitment is to *correctness*, not raw speed; cost-aware short-circuiting is a separate optimization (a candidate's $\mathbf{f}$-collapse can be detected without full $\odot$ computation).
- It does not say the substrate can *automatically derive* authorization from non-authorization cells.
  A candidate's authorization fiber must be authored as substrate content; the morphism reads what is authored.
  Authoring discipline is a separate question per [`scope-as-predication`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/scope-as-predication.md).

## Realization status

`sketch` because the proof depends on properties of `pypredcalc.
PredicationStore`'s $\odot$-implementation matching the bilattice-algebra specification.
The current implementation passes a regression suite; formal verification of $\odot$-monotonicity is open work for [M11](../work/milestones/m11-assurance-audit-chain-export.md).

The structural conversion of `runtime/dispatch_graph.py` from filter-then-rank to single-pass $\odot$ is itself an [M2](../work/milestones/m2-substrate-dispatch.md) goal — `substrate-authorized-selection-rule`.
