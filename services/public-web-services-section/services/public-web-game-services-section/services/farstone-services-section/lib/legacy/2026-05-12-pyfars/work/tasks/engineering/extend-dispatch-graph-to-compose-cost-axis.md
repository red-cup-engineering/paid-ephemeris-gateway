---
title: "Extend the dispatch graph to compose the selection-by-cost axis"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: dispatch-chooses-endpoint-by-cost-quantale
depends-on: [implement-selection-by-cost-instantiator]
requires-capabilities: [python-editing, dispatch-graph]
theory-basis: [dispatch-monotonicity, normative-operational-layering]
---


## Description

Modify `runtime/dispatch_graph.py`'s `select_winners_node` to include `selection-by-cost` in its composition.
Per [predwork dispatch-monotonicity](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md): adding the new axis is $\leq_k$-monotone — additional positive selection axes refine ranking within the eligible set; they cannot admit ineligible dispatchables.

Composition order:

1. Disqualification axes (charter-binding, budget, rate-limit, eligibility-by-budget, **selection-by-cost when budget-exhausted**) gate eligibility.
2. Positive selection axes (selection-by-load, selection-by-instinct from M4, **selection-by-cost when ranking**) compose.
  Ranking is by composite cost-quantale-min.
3. Lex-tiebreak at the floor.

The composition is **rule-system-driven** — `select_winners_node` reads which selection rules are active from the substrate (via the rule registry) and applies them in order.
Adding cost is one more rule; future axes follow the same path.

## Acceptance

- [ ] `select_winners_node` reads selection rules from the rule registry; selection-by-cost is among them when active.
- [ ] When cost cells are absent (no M7 yet, or in tests bypassing M7), the node's behavior is identical to the M2/M4 baseline (regression-free).
- [ ] When two endpoints have equal cost, lex-tiebreak fires (regression-preserving).
- [ ] When one endpoint is rate-limit-exhausted, it's disqualified; other endpoints rank by cost.
- [ ] Tests cover: cost-only dispatch (M7 path), instinct+cost composition (M4+M7), all-axes composition (M2+M4+M5+M7).

## Progress cells

*(empty — task not yet started)*
