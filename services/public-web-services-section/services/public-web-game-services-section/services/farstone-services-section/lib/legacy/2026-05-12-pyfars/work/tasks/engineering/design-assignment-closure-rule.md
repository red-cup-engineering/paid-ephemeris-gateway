---
title: "Design the assignment closure rule"
type: task
area: engineering
status: open
horizon: doing
milestone: m2-substrate-dispatch
goal: assignment-cells-written-back
depends-on: []
requires-capabilities: [theory-derivation, corpus-editing]
theory-basis: [dispatch-readiness, assignment, charter-as-closure-system]
---


## Description

The assignment cell needs to be produced by a closure rule rather than written imperatively, so it carries the same per-firing provenance and `rsv_hash` discipline as eligibility cells.

Two design options:

1. **Selection-as-rule**: the closure rule's antecedent is "(W, preferred-by-X, D) = T for the unique-most-preferred D"; the consequent is `(W, assigned-to, D) = T`.
  The rule fires once per workitem after selection rules have run.
  Requires substrate-readable "unique-most-preferred" semantics.

2. **Imperative-with-witness**: `select_winners_node` writes the cell directly via `store.insert(cell)` and emits a `RuleFiring` whose `rule_slug = "selection"` is bookkeeping.
  Less pure but simpler.

This task is theory-side: pick the design, author `objects/assignment-by-selection.md` (or whatever the rule is named), specify the antecedent/consequent, and document how the rule composes with the selection-by-X rules from the parallel `selection-rule-as-substrate` goal.

## Acceptance

- [ ] A design decision is documented (which option, with reasoning) — likely as a new `governance/decisions/<slug>.md` record.
- [ ] If option 1: the rule record at `objects/<slug>.md` exists with antecedent/consequent specified.
- [ ] If option 2: the contract for the imperative writer is documented, including the `RuleFiring` shape it emits.
- [ ] The interaction between this rule and the selection-by-X rules is documented (selection-by-X emits preferences; assignment fires on the unique winner; tiebreak when not unique is specified).

## Progress cells

*(empty — task not yet started)*
