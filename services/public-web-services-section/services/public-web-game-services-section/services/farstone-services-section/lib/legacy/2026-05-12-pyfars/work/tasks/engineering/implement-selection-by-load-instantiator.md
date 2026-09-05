---
title: "Implement the selection-by-load instantiator and registry entry"
type: task
area: engineering
status: open
horizon: doing
milestone: m2-substrate-dispatch
goal: selection-rule-as-substrate
depends-on: [author-selection-by-load-rule-record, assignment-cells-written-back]
requires-capabilities: [python-editing]
theory-basis: [dispatch-readiness]
---


## Description

Once the rule record exists at `objects/selection-by-load.md` and assignment cells are being written back into the substrate (so `current-load` can actually be computed), implement `runtime.eligibility_rules.instantiate_selection_by_load(store)`.
The function walks the typed `PredicationStore` for `(W, eligible-by-capabilities, D) = T` cells, computes each `D`'s current-load from `(W', assigned-to, D) = T` cells (where `W'` is in any state other than `done`/`abandoned`), and emits a `pypredcalc.
StoreRule` per `(W, D)` pair declaring the preferred-by-load cell.

Register the instantiator in `RULE_INSTANTIATORS` so its activation is governed by the presence of `objects/selection-by-load.md`.

Update `dispatch_graph.select_winners_node` to read `(W, preferred-by-X, D) = T` cells from the closed store rather than applying a lexicographic tiebreak directly.
The new selection algorithm: for each workitem, the winner is the dispatchable preferred on the most active selection axes; ties broken lexicographically as a last-resort fallback.

## Acceptance

- [ ] `instantiate_selection_by_load` exists in `runtime/eligibility_rules.py` and is registered in `RULE_INSTANTIATORS["selection-by-load"]`.
- [ ] `select_winners_node` reads `preferred-by-*` cells from the closed store and chooses the dispatchable preferred on the most axes, with lex-slug as last-resort tiebreak.
- [ ] Adding a new selection rule record (with its instantiator registered) changes selection without modifying `select_winners_node`.
- [ ] Tests cover: no selection rule (lex fallback), one selection rule firing, multiple rules with consistent preferences, multiple rules with conflicting preferences (winner stays consistent under ties).

## Progress cells

*(empty — task not yet started; blocked on `assignment-cells-written-back` because current-load reads assignment cells)*
