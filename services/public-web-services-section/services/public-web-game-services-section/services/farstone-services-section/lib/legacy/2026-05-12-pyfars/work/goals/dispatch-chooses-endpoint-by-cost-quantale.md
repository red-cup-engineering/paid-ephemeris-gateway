---
title: "Dispatch chooses endpoint by cost-quantale"
type: goal
milestone: m7-boundary-handedness-and-outbound-endpoints
status: open
horizon: captured
theory-basis: [cost-discipline, dispatch-readiness, dispatch-monotonicity]
tasks:
  - author-selection-by-cost-rule-record
  - implement-selection-by-cost-instantiator
  - extend-dispatch-graph-to-compose-cost-axis
---


After this goal, the [dispatch graph](../workflows/dispatch-graph.md)'s selection step composes cost cells across endpoint candidates and chooses the quantale-minimum.
Lex-tiebreak survives only at quantale-equality (which is rare given three independent dimensions).
This is what closes the captain's "lowest-cost-to-swarm" requirement.

## Why

[Cost cells exist after cost-discipline-as-substrate-cells](cost-discipline-as-substrate-cells.md) lands.
They sit unused until selection reads them.
This goal makes selection consume them — a new selection-axis `selection-by-cost` that reads each candidate endpoint's cost cells (or projects fresh cost cells per the inference call's expected token counts), composes them across the candidate set, picks the minimum.

This is structurally a **new selection axis among existing axes** — not a special-case path for endpoints.
The `selection-by-cost` rule fires on every selection (not just endpoint-bound dispatches); for in-process agents whose cost is just settlement fuel, the dollar and token dimensions are zero, and selection-by-cost ranks them by fuel only.

## Theory grounding

**1.
Selection axis composition under dispatch-monotonicity** ([`predicated-work/theorems/dispatch-monotonicity`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md)).
Adding `selection-by-cost` is an additional positive selection axis.
Per dispatch-monotonicity in $\leq_k$, **adding more selection axes can only refine ranking within the eligible set; it cannot admit new dispatchables to the eligible set.** Existing eligibility axes (capabilities, skills, jurisdiction, rate-limit, charter-binding) gate eligibility; selection axes (load, instinct, cost) rank within.
M7's cost axis composes with [M2](../milestones/m2-substrate-dispatch.md)'s selection-by-load and [M4](../milestones/m4-memory-feedback.md)'s selection-by-instinct.

**2.
Cost-quantale-min as selection consequent** ([FARS [`monetary-cost-as-quantale-extension`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension.md) closure).
The product quantale's choice operation is componentwise min.
The selection rule emits T on `(W, selection-by-cost, D)` for the candidate `D` that minimizes the product cost; F on candidates with strictly higher cost; $\bot$ on candidates with no cost cells (selection abstains; other axes determine).

**3.
Bilattice-bounded dimensions** (from [`cost-discipline-as-substrate-cells`](cost-discipline-as-substrate-cells.md)).
Some cost dimensions have hard upper bounds: `tokens-against-budget` at zero is rate-limit-exhausted, which is *disqualifying*, not just expensive.
The cost rule must distinguish: a dimension at bound is F (disqualification axis fires), not just last-place in ranking. **This is what makes the rate-limit observations from [`rate-limit-observations-ground-availability-cells`](rate-limit-observations-ground-availability-cells.md) compose with selection cleanly** — exhausted budgets disqualify; non-exhausted budgets contribute to ranking.

### Design constraints from this grounding

- **Selection-by-cost is a closure rule, not a function call.** Per the [dispatch-derives-from-governance](../../claims/dispatch-derives-from-governance.md) claim and [M2](../milestones/m2-substrate-dispatch.md)'s [`selection-rule-as-substrate`](selection-rule-as-substrate.md) goal, selection criteria are substrate-authored.
  The rule's instantiator reads cost cells; the rule's authority-grounding cites the cost-discipline.
- **Cost-as-of-now, not cost-historical.** The selection rule reads the *current* cost cells per endpoint (most-recent observation, possibly projected from current rate-limit budget).
  Dispatching against historical aggregates would defeat real-time cost-aware selection.
  The rule's instantiator walks cost-projection per the time-windowed availability discipline.
- **Lex-min default; weighted-min configurable.** The default choice is lex-min over `(tokens-against-budget, dollars, fuel)` — exhausted budget first, then cheapest dollars, then cheapest fuel.
  A polity that wants different weighting (e.g., always prefer free-tier even at fuel cost) can author an [adjustment](../adjustments/_index.md) modifying the rule's weighting cell.

## Acceptance

- [ ] An `objects/selection-by-cost.md` record exists, authorizing the rule.
- [ ] The instantiator at `runtime/eligibility_rules.py` (or the rule-instantiator module) emits the per-`(W, D)` cells per the rule's logic.
- [ ] Dispatch composition includes the new axis alongside selection-by-load, selection-by-instinct, lex-tiebreak.
- [ ] Cost-bound disqualification: an endpoint with zero `tokens-against-budget` is F-disqualified (matching the existing eligibility-by-rate-limit rule, but now via the cost axis with bilattice-bound semantics).
- [ ] Tests cover: choosing the cheaper of two endpoints, choosing the non-rate-limited of two endpoints when one is exhausted, lex-tiebreak when costs are exactly equal.
- [ ] No regression in existing dispatch behavior when cost cells are absent (selection-by-cost emits $\bot$; other axes determine).
