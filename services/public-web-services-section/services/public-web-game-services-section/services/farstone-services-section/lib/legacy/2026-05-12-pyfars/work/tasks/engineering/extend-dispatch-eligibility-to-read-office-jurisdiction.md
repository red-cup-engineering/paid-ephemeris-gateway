---
title: "Extend dispatch eligibility to read office and jurisdiction cells"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: office-records-gate-authority
depends-on: []
requires-capabilities: [python-editing, dispatch-graph, closure-rule-instantiation]
theory-basis: [office-as-fuzzy-cell, jurisdiction]
---


## Description

Add an `eligibility-by-office-authority` axis to the dispatch graph's eligibility composition.
The instantiator reads, per `(workitem, dispatchable)` pair:

1. The dispatchable's office (via `office:` cell on the dispatchable record, or the agent's incumbency that names the office).
2. The office's jural-relations of `kind: power` whose `scope-action` matches the workitem's class.
3. The jurisdiction record bound to the office: does the workitem's predicate fall within `predicate-sub-category`?
  Does the current stage fall within `T_J`?

Emits T when all three settle to admit; F when any settles to refuse; ⊥ otherwise.

## Acceptance

- [ ] An `objects/eligibility-by-office-authority.md` rule record exists.
- [ ] The instantiator at `runtime/eligibility_rules.py` reads the office, jural-relations, jurisdiction, and emits per-axis cells.
- [ ] The dispatch graph composes the new axis alongside existing axes.
- [ ] Tests cover: full authority admits, missing power F-disqualifies, vacant office (no incumbency) F-disqualifies, out-of-jurisdiction F-disqualifies.

## Progress cells

*(empty — task not yet started)*
