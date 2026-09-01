---
title: "Task-readiness policy in heartbeat"
type: goal
milestone: m2-substrate-dispatch
status: completed
date-completed: "2026-05-08"
horizon: soon
theory-basis: [dispatch-readiness, operations-loop, task-cell-system]
tasks:
  - wire-task-readiness-policy-into-heartbeat
---


**Status: completed.** The earlier `runtime/heartbeat.py`'s split between `diagnostics_policy` and a missing `task_readiness_policy` was dissolved when heartbeat was replaced by the lifecycle StateGraph.
The dispatch graph now runs every tick over substrate-readable workitems and dispatchables; closure-rule failures and task-readiness firings flow through the same closure-rule application path with per-firing provenance.

## Realized via

- `runtime/lifecycle.py`'s `tick_node` calls `runtime.dispatch_graph.run_dispatch(state.root, tick=...)
  ` every tick.
- `runtime/dispatch_graph.py`:
  - `load_store_node` lifts every cell from disk into a `pypredcalc.
    PredicationStore`, including all `type: task` and `type: workitem` records.
  - `apply_eligibility_rules_node` runs the substrate-authorized eligibility / disqualification rules against the store; firings produce `RuleFiring` provenance and `Witness` records.
  - `select_winners_node` picks at most one dispatchable per workitem from the closed store via knowledge-meet across positive and disqualifying axes.
  - `invoke_agent_node` (gated by `state.invoke`) runs the compiled PydanticAI agent for each `(W, D)` winner.
- Closure validation/lint over the markdown view (the old `diagnostics_policy`) lives in `closure/` and runs via `compose_rules.run` + `compose_lint.run`; it's a separate, complementary path from the runtime dispatch graph.

## Theory grounding (preserved)

Per PredWork's operations-loop: the dispatch phase fires closure rules that match active-frontier tasks against agents.
The lifecycle's tick now realizes the operations-loop tick directly — closure rules are applied each tick over the substrate's `PredicationStore`, and selection follows from the closure result.

## Acceptance (all met)

- [x] Tick fires on `(W, D)` pairs when ready workitems exist with eligible dispatchables.
- [x] Closure-rule failures (in the runtime sense, e.g. `⊤` cells from contradictory firings) and task-readiness firings flow through the same closure-rule pipeline with provenance.
- [x] Substrate validation/lint coexists as a separate `closure/` layer.
