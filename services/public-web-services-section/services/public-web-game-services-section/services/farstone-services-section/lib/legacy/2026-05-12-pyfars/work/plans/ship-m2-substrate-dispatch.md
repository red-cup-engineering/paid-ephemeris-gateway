---
title: "Ship M2 — Substrate-Driven Dispatch as a coordinated plan"
type: plan
status: planning
milestone: m2-substrate-dispatch
tasks:
  - author-selection-by-load-rule-record
  - implement-selection-by-load-instantiator
  - design-assignment-closure-rule
  - emit-assignment-cells-from-dispatch-graph
dependency-order:
  - [author-selection-by-load-rule-record, implement-selection-by-load-instantiator]
  - [design-assignment-closure-rule, emit-assignment-cells-from-dispatch-graph]
milestone-cells:
  - "(selection-rule, substrate-authored, true) = T"
  - "(selection-by-load, instantiator-registered, true) = T"
  - "(dispatch-graph, writes-assignment-cells, true) = T"
  - "(assignment-cell, visible-after-dispatch, true) = T"
normative-cleanup: tracked
---

# Ship [M2 — Substrate-Driven Dispatch](../milestones/m2-substrate-dispatch.md) as a coordinated plan

## What this plan does

[M2](../milestones/m2-substrate-dispatch.md) is **substantially landed** — eligibility, capability-closure, dispatch-as-LangGraph, agent-compilation, and per-firing provenance shipped in the May 2026 PyPredCalc + LangGraph + PydanticAI refactor.
Two goals remain: [`selection-rule-as-substrate`](../goals/selection-rule-as-substrate.md) and [`assignment-cells-written-back`](../goals/assignment-cells-written-back.md).
Both must land jointly before the milestone's "Done when" criterion is satisfied — a polity-authored selection rule that changes tiebreak behavior without code modification AND assignment cells visible in the substrate after each dispatch tick.

The dependency-DAG is shallow: each goal has a small two-task chain.
The plan record exists not because the dependency structure is intricate but because the milestone's [`acceptance:`](../milestones/m2-substrate-dispatch.md) is a *joint* settlement of both goals, and the substrate needs the plan-level meet visible.

## Dependency structure

```
author-selection-by-load-rule-record ─→ implement-selection-by-load-instantiator
                                                       │
                                                       ▼
                                  (selection-rule-as-substrate goal lands)

design-assignment-closure-rule ─→ emit-assignment-cells-from-dispatch-graph
                                                       │
                                                       ▼
                                  (assignment-cells-written-back goal lands)
```

The two chains are independent — selection-rule work and assignment-cell work can proceed in parallel.
They join only at the milestone-level meet.

Each subordering exists because the successor's antecedents read cells the predecessor settles:

- The instantiator at `runtime/eligibility_rules.py` reads `objects/selection-by-load.md`'s frontmatter to determine the rule's tiebreak axis (e.g., which office attribute scores "load").
  Absent the record, the instantiator's antecedents are at $\bot$.
- The dispatch-graph emit-assignment-cells node reads the assignment-closure-rule design to know what cells to write — `(W, assigned-to, D) = T` and (probably) `(W, assignment-rsv-hash, hash-value) = T` for replay-binding.
  Absent the design, the emission node's antecedents are at $\bot$.

## Milestone cells

The plan completes when *all* milestone-cells in the frontmatter are at $\mathbf{t}$.
Per [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md), the plan-level completion is the meet over the milestone-cell set.
Partial settlement (e.g., selection rule but no assignment cells) is partial completion; the milestone's "Done when" requires both.

The plan record makes the conjunction substrate-readable: the milestone's `acceptance:` is a single prose sentence; the operational reality is four joint cell settlements.

## Defeasibility

If the captain abandons the plan, the abandonment increment $(\text{ship-m2-substrate-dispatch}, \texttt{abandoned-by}, \text{captain}) = \mathbf{t}$ propagates: the four tasks' settled witnesses survive (event-sourcing direction; abandonment doesn't retract history), but each task's `status: open` flips to `abandoned` and pending work stops.

Plan revision (adding or removing a task) requires a revision-witness with `justified-by: <reason-cell>`, an update to frontmatter `tasks:` and `dependency-order:`, and witness emission.
Silent revision is forbidden — per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability".

## Normative profile

Each task in this plan, when dispatched, generates a duty cell on the assigned agent (per O→N rule in [normative-operational-layering](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md)).
At plan completion, normative residue (settled duty cells without corresponding duty-discharge) is tracked but not blocking — `normative-cleanup: tracked`.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion as the meet of milestone cells.
- [Settling-CALM-corollary](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md) — the active-frontier query is coordination-free.
- [`selection-rule-as-substrate`](../goals/selection-rule-as-substrate.md) — the goal motivating the first task chain.
- [`assignment-cells-written-back`](../goals/assignment-cells-written-back.md) — the goal motivating the second task chain.

## What this plan does NOT claim

Per [`author-honest-non-claims-section`](../../governance/duties/author-honest-non-claims-section.md): this plan does *not* claim that selection-by-load is the only or correct selection rule for all polity contexts.
It is one substrate-authored example whose presence proves the *mechanism* (substrate-driven selection) works.
Other polities will author other selection rules; this plan ships the mechanism, not a normative selection policy.

The plan does not claim that all assignment cells must use the `(W, assigned-to, D) = T` shape.
The [`design-assignment-closure-rule`](../tasks/engineering/design-assignment-closure-rule.md) task may discover that additional companion cells (assignment-rsv-hash, assignment-tick, assignment-witness) are needed for replay-determinism.
The plan commits to *some* cell-shape that makes assignment substrate-readable; the design task fixes the schema.
