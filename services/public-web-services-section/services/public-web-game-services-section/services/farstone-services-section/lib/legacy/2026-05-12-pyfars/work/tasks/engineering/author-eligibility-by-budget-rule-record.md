---
title: "Author the eligibility-by-budget substrate rule record"
type: task
area: engineering
status: open
horizon: doing
milestone: m3-continuous-loop
goal: budget-gated-dispatch
depends-on: []
requires-capabilities: [corpus-editing, theory-derivation]
theory-basis: [dispatch-readiness]
---


## Description

Author `objects/eligibility-by-budget.md` declaring the disqualification closure rule.
Mirror the existing `objects/eligibility-by-rate-limit.md` and `objects/eligibility-by-charter-binding.md` structurally — those are the working examples of disqualification rules.

The rule's antecedent: `(B, budget-exhausted, true) = T` for some budget record `B` plus `(D, draws-on-budget, B) = T` for some dispatchable `D`.
The consequent: `(W, eligible-by-budget, D) = F` for every workitem `W`.

This requires a parallel `objects/budget-record.md` (or similar) defining the budget record shape: `budget-window`, `budget-total`, `budget-spent`, `budget-remaining`, `budget-exhausted` (a derived cell — `budget-remaining ≤ 0`).
That object record is not written by this task but should be referenced.

## Acceptance

- [ ] `objects/eligibility-by-budget.md` exists with `type: definition`, `class: substrate-tracked-closure-rules`.
- [ ] The body states the antecedent, consequent, and bilattice value (`F`) in formal notation.
- [ ] The body cites `objects/eligibility-by-rate-limit.md` and `objects/eligibility-by-charter-binding.md` as the structural precedents.
- [ ] The body documents the contract for `draws-on-budget` cells (emitted on dispatchables that should be gated by a given budget).

## Progress cells

*(empty — task not yet started)*
