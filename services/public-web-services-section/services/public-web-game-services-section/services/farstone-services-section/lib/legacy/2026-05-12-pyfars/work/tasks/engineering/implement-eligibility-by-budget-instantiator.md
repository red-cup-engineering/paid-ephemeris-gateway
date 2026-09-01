---
title: "Implement the eligibility-by-budget instantiator"
type: task
area: engineering
status: open
horizon: soon
milestone: m3-continuous-loop
goal: budget-gated-dispatch
depends-on: [author-eligibility-by-budget-rule-record]
requires-capabilities: [python-editing]
theory-basis: [dispatch-readiness]
---


## Description

Implement `runtime.eligibility_rules.instantiate_eligibility_by_budget(store)`.
Mirror the structure of `instantiate_eligibility_by_rate_limit` — both are disqualification rules.
The instantiator walks the store for `(B, budget-exhausted, true) = T` cells, finds every dispatchable `D` with `(D, draws-on-budget, B) = T`, and emits a `pypredcalc.
StoreRule` per `(W, D)` pair where `W` ranges over workitems.

Register it in `RULE_INSTANTIATORS["eligibility-by-budget"]`.
Add `eligibility-by-budget` to `_DISQUALIFICATION_PREDICATES` in `runtime/dispatch_graph.py` so `_is_disqualified_on_any_axis` reads the new axis.

## Acceptance

- [ ] `instantiate_eligibility_by_budget` exists and is registered in `RULE_INSTANTIATORS`.
- [ ] `_DISQUALIFICATION_PREDICATES` in `dispatch_graph.py` includes `ELIGIBLE_BY_BUDGET`.
- [ ] Tests cover budget-intact, budget-exhausted-for-one-endpoint, budget-exhausted-for-all-endpoints cases.
- [ ] Removing `objects/eligibility-by-budget.md` deactivates the rule (per the substrate-activation discipline) — the rule fires only when its record is present.

## Progress cells

*(empty — task not yet started)*
