---
title: "Extend cost-quantale to product shape (fuel × dollars × tokens-against-budget)"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: cost-discipline-as-substrate-cells
depends-on: []
requires-capabilities: [python-editing, lawvere-quantale-implementation]
theory-basis: [cost-discipline, monetary-cost-as-quantale-extension]
---

# Extend cost-quantale to product shape

## Description

Extend the cost-quantale's value space from $\mathbb{R}_{\geq 0}$ to $\mathbb{R}_{\geq 0}^3$ — settlement fuel × dollars × tokens-against-budget — with componentwise arithmetic.
The implementation:

1. Define `ProductCost` as a dataclass / namedtuple with three fields (`fuel`, `dollars`, `tokens_against_budget`).
2. Implement `compose(a, b)` as componentwise addition.
3. Implement `choose(*candidates)` as componentwise lex-min over `(tokens_against_budget, dollars, fuel)` — exhausted budget first, then cheapest dollars, then cheapest fuel.
4. Add bilattice-bound semantics: `tokens_against_budget = 0` is hard-disqualifying (the choose function returns a sentinel "disqualified" marker, not a candidate; the calling rule emits F).
5. Replace existing single-dimension cost in the runtime with the product shape; backward-compat: in-process agents whose cost is just fuel get $0$ in dollars and tokens dimensions.

The implementation lives at `runtime/cost.py` (or extends an existing cost module).

## Acceptance

- [ ] `runtime/cost.py` exports `ProductCost`, `compose`, `choose`.
- [ ] Tests: composition associativity (componentwise), choose-min correctness over various inputs, bilattice-bound disqualification on zero `tokens_against_budget`.
- [ ] Tests: backward-compat — in-process agent dispatches produce `ProductCost(fuel=N, dollars=0, tokens_against_budget=N_max)` and integrate with the runtime as before.
- [ ] Documentation in [`prose/explanation/cost-discipline.md`](../../../prose/explanation/) (or new) explains the product structure and the lex-min default.

## Progress cells

*(empty — task not yet started)*
