---
title: "Implement the selection-by-cost rule instantiator"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: dispatch-chooses-endpoint-by-cost-quantale
depends-on: [author-selection-by-cost-rule-record]
requires-capabilities: [python-editing, closure-rule-instantiation]
theory-basis: [dispatch-monotonicity, cost-discipline]
---


## Description

Implement `runtime.eligibility_rules.instantiate_selection_by_cost`.
The instantiator:

1. For each pending workitem `W`, identify the candidate dispatchable set (post-eligibility).
2. For each candidate `D`: project the expected `ProductCost` of dispatching `W` to `D`.
  For endpoint dispatches this composes per-token cost from the endpoint record + estimated token count from `W`'s payload; for in-process agents, fuel-only.
3. Composite cost = `compose(...)
  ` per [`extend-cost-quantale-to-product-shape`](extend-cost-quantale-to-product-shape.md).
4. Apply the rule record's `choose-strategy`: lex-min default; weighted-min configurable.
5. Emit `(W, selection-by-cost, D) = T` for the chosen; `F` for strictly-higher-cost; `⊥` for ties or no-cost-data.
6. Bilattice-bound: any candidate with `tokens_against_budget = 0` produces F regardless of other dimensions (disqualifying).

The instantiator integrates with the existing dispatch graph's `select_winners_node` per [`extend-dispatch-graph-to-compose-cost-axis`](extend-dispatch-graph-to-compose-cost-axis.md).

## Acceptance

- [ ] `instantiate_selection_by_cost` exists in `runtime/eligibility_rules.py`.
- [ ] Reads thresholds at runtime from the rule record (not hardcoded).
- [ ] Composes per-candidate ProductCost correctly; lex-min selection is tested.
- [ ] Bilattice-bound disqualification on zero `tokens_against_budget` is tested.
- [ ] No-cost-data → $\bot$, falls through to other axes; tested.
- [ ] Tests cover: cheaper-of-two endpoints, all-equal endpoints (lex-tiebreak takes over), one-rate-limited (others rank), all-rate-limited (no winner from this axis).

## Progress cells

*(empty — task not yet started)*
