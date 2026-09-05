---
title: "[m2-substrate-dispatch](../milestones/m2-substrate-dispatch.md) dispatch's lex-tiebreak is a double-loop variance"
type: finding
status: actioned
observed: [m2-dispatch-execution-trace]
expected: dispatch-derives-from-governance
variance: "winner-selection logic lives in code (lex-order on slug), not in substrate cells"
cause-configuration:
  - rule-tier-incompleteness
  - selection-axis-not-modeled-as-predicate
  - haste-during-m2-implementation
scope: double-loop
severity: medium
contained-by: m2-completion-review
responds-to-via: [adopt-substrate-selection-rule, write-back-assignment-cells]
---

# [M2 — Substrate Dispatch](../milestones/m2-substrate-dispatch.md): dispatch's lex-tiebreak is a double-loop variance

## Observed

The runtime's `select_winners_node` in `runtime/dispatch_graph.py` resolves ties between equally-eligible dispatchables by lexical order on the dispatchable's slug.
This is correct *execution* — the function is deterministic, replay-stable, and produces a single winner per workitem.

What it is *not*: derived from substrate.
The selection criterion (lex-order) is hardcoded in Python; nothing in `governance/` or `objects/` authorizes it.

## Expected

Per the claim [`dispatch-derives-from-governance`](../../claims/dispatch-derives-from-governance.md): every dispatch decision is determined by closure rules over substrate cells.
Selection between equally-T-eligible dispatchables is itself a dispatch decision; therefore the criterion (whether lex-order, by-load, by-recency, by-priority) must be substrate-authored, not code-resident.

## Variance

The execution is correct against itself.
The variance is **between the plan and the execution as a whole**: the plan said "every dispatch decision derives from substrate"; the execution implemented one specific decision (the tiebreak) in code.
This is not a bug in the lex-tiebreak — it's a gap in what the substrate is authorized to determine.

Hence: **double-loop**.
Single-loop reading would be "the code does something different from what the spec says".
Double-loop reading is "the code does what we said, but what we said wasn't the right plan."
Both are simultaneously true; the substrate-derived spec is the one that closes C1 (predication substrate) end-to-end.

## Cause configuration

- **Rule-tier incompleteness.** The closure-rule machinery had eligibility rules (T-emitting subset_cover; F-emitting disqualifications) but no *selection* rule type.
  Selection wasn't a recognized axis; it was assumed to be "what dispatch does after eligibility settles."
- **Selection axis not modeled as predicate.** Per `dispatch-readiness`'s bilattice four-state reading, every dispatch axis should be a predicate cell (T = positively known, F = positively known not, ⊥ = unknown).
  Selection was modeled as a *function over* T-cells, not as its own cell.
- **Haste during [`m2-substrate-dispatch`](../milestones/m2-substrate-dispatch.md) implementation.** The author shipped the dispatch graph with a hardcoded tiebreak rather than blocking on substrate authorization for selection — defensible for time-to-first-witness, but the substrate-authorization debt was now encoded.

The configuration is *not* "Alice's mistake" — that label discards the geometry that made the outcome likely.
The conditions above are what made a code-resident tiebreak the path of least resistance.

## Single-loop vs. double-loop reading

Both: a single-loop $\mathbf{t}$ (execution realized the plan as authored) and a double-loop $\mathbf{f}$ (the plan as authored was incomplete) co-exist.
The Lambek adjunction $\odot \dashv \Rightarrow$ identifies these as two views of the same fact.
The double-loop reading is the load-bearing one — adjusting the plan is what closes the variance.

## Adjustment hooks

Both adjustments are substrate-authored, not code-only:

1. **`adopt-substrate-selection-rule`** ([goal: selection-rule-as-substrate](../goals/selection-rule-as-substrate.md)).
  Author `objects/selection-by-load.md` and instantiate a closure rule that emits T on the selection-by-load axis when a dispatchable's load is minimum among eligible dispatchables.
  Lex-tiebreak survives only as the bilattice-floor case.

2. **`write-back-assignment-cells`** ([goal: assignment-cells-written-back](../goals/assignment-cells-written-back.md)).
  Selection produces `(W, assigned-to, D) = T` cells in the substrate, not just tuples in process memory.
  Audit and federation can both query "who got dispatched what" by reading cells.

Both adjustments align the [`m2-substrate-dispatch`](../milestones/m2-substrate-dispatch.md) milestone's actual execution with the [dispatch-derives-from-governance](../../claims/dispatch-derives-from-governance.md) claim.
M2 acceptance is partially met without them; with them, M2 closes [charter](../../governance/charter.md) commitments C1 and C2 end-to-end.
