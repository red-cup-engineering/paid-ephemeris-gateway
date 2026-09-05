---
title: "Emit assignment cells from the dispatch graph"
type: task
area: engineering
status: open
horizon: doing
milestone: m2-substrate-dispatch
goal: assignment-cells-written-back
depends-on: [design-assignment-closure-rule]
requires-capabilities: [python-editing]
theory-basis: [dispatch-readiness, assignment]
---


## Description

Once the design from `design-assignment-closure-rule` is settled, implement the cell-write half: each `(W, D)` winner produces a `(W, assigned-to, D) = T` cell in the closed store and a corresponding witness in the event log.

If the design uses a closure rule (option 1), implement its instantiator in `runtime/eligibility_rules.py` and register it.
If imperative (option 2), modify `runtime/dispatch_graph.select_winners_node` to write the cell and emit a `RuleFiring` via the closure runner's witness path.

The witness should carry: workitem slug, dispatchable slug, rule slug (or `"selection"`), the active `rsv_hash`, the tick number.
Channel `dispatch`, kind `mutation` (if the cell is being written) or `analysis` (if it derives from a closure rule firing — same convention `closure_runner.firing_to_witness` uses).

## Acceptance

- [ ] After each tick with a winner, `(W, assigned-to, D) = T` is in the closed store.
- [ ] An `assignment_settled` witness is written to the JSONL event log with the fields above.
- [ ] Replaying the event log reproduces the cell.
- [ ] Tests cover one-winner, no-winner, and multiple-workitems-one-winner-each cases.
- [ ] The selection-rule-as-substrate goal's `current-load` computation (via `(W', assigned-to, D)` cells where W' is not `done`/`abandoned`) works against the cells this task produces.

## Progress cells

*(empty — task not yet started)*
