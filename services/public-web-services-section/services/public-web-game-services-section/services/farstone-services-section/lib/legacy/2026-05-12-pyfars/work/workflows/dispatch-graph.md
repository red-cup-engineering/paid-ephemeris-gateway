---
title: "Dispatch graph"
type: workflow
status: active
input-type: "PredicationStore-with-pending-workitems"
output-type: "PredicationStore-with-assignment-cells-and-execution-events"
work-units:
  - load-store-node
  - apply-eligibility-rules-node
  - select-winners-node
  - invoke-agent-node
edges:
  - from: load-store-node
    to: apply-eligibility-rules-node
    kind: dependency
    cell: "(store, loaded, true) = T"
  - from: apply-eligibility-rules-node
    to: select-winners-node
    kind: dependency
    cell: "(eligibility-axes, settled, true) = T"
  - from: select-winners-node
    to: invoke-agent-node
    kind: information-flow
    cell: "(workitem, selected-winner, dispatchable) = T"
  - from: invoke-agent-node
    to: load-store-node
    kind: information-flow
    cell: "(execution-event, emitted, true) = T"
composition-pattern: sequence
---


The LangGraph state-graph that runs once per [tick](../recurrent-practices/tick.md) (under `runtime/dispatch_graph.py`).
Its boundary type — `PredicationStore-with-pending-workitems` in, `PredicationStore-with-assignment-cells-and-execution-events` out — equals on both sides, which makes it a workflow in the [predwork workflow](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md) sense.

## What this workflow produces

A composition of four nodes that takes a `pypredcalc.
PredicationStore` projection of the substrate plus the workitems file as input, and produces an updated PredicationStore (with assignment cells written back) plus emitted execution events as output.

Treating it as a workflow is what unlocks: composition with other workflows (a future M3-era workflow may run the dispatch graph then a settle-execution-events workflow), CALM-stable boundary admissibility queries (which workitems are dispatch-eligible at this stage), and audit visibility (the edges, not just the nodes, are first-class substrate facts).

## Edges

| From | To | Kind | Cell |
|---|---|---|---|
| `load-store-node` | `apply-eligibility-rules-node` | dependency | `(store, loaded, true) = T` |
| `apply-eligibility-rules-node` | `select-winners-node` | dependency | `(eligibility-axes, settled, true) = T` |
| `select-winners-node` | `invoke-agent-node` | information-flow | `(workitem, selected-winner, dispatchable) = T` |
| `invoke-agent-node` | `load-store-node` (next tick) | information-flow | `(execution-event, emitted, true) = T` |

The cycle from `invoke-agent-node` back to `load-store-node` is **inter-tick**, not intra-tick: this tick's invoke completes; next tick's load-store reads the resulting cells.
Within a single tick the graph is acyclic.

The dependency edges are $\leq_k$-monotone: once `(store, loaded, true) = T` settles in a tick, eligibility rules can fire; that gate doesn't reverse mid-tick.

## Composition pattern

**Sequence.** Each node fires after the prior node's output cells settle.
There is no branching within the dispatch graph itself — branching happens at higher levels (per-workitem branches in `apply-eligibility-rules-node` are internal; the graph as a whole is sequential).

If [`selection-rule-as-substrate`](../goals/selection-rule-as-substrate.md) lands, `select-winners-node` becomes a closure-rule application step rather than a function-call step.
The workflow shape doesn't change; the *implementation* of the node does.
This is the substrate-derived-from-governance trajectory.

## Regime

**Strict.** All four nodes' rules are strict-regime (eligibility is finitary subset_cover/disqualification; selection is finitary; agent invocation is bounded by the agent's reply contract).
The dependency edges are finitary cell-checks.
The dispatch graph is in the strict regime; one execution is always computable in bounded time.

This is what makes [`replay-determinism-verified`](../goals/replay-determinism-verified.md) testable in [`m3-continuous-loop`](../milestones/m3-continuous-loop.md): a strict-regime workflow with `rsv_hash`-stamped inputs has a unique fixed point per execution.

## CALM-stable boundary admissibility

By the [settling-CALM-corollary](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md): confirming "is the eligibility-rules step admissible?" reduces to confirming `(store, loaded, true) = T` is settled — a positive, $\leq_k$-monotone query.
Any replica with a local snapshot can confirm without coordination.

This matters when [M6 — Federation](../milestones/m6-federation.md) lands: federated PyFARS engines can each independently confirm dispatch-graph admissibility on their local substrate without round-tripping.
The federation correctness depends on each engine running the same workflow over their post-merge stores; the [`closure-merge-commutation`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) lemma ensures the post-merge stores are consistent.

## Theory grounding

- [Predwork workflow](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md) — formal type-bounded composition.
- [Workflow-composition theorem](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md) — the algebra.
- [Dispatch morphism](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md) — what each invocation enacts.

## Related

- [Tick](../recurrent-practices/tick.md) — the recurrent practice this workflow runs inside
- [Ship M3 plan](../plans/ship-m3-continuous-loop.md) — the plan whose goals modify or test this workflow
- [`select-winners-node`](../tasks/engineering/) — the implementation task family
