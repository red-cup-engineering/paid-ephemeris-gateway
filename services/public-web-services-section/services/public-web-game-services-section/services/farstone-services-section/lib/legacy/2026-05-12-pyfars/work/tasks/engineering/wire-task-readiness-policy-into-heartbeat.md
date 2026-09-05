---
title: "Wire task-readiness policy into heartbeat"
kind: task
type: task
area: engineering
status: completed
date-completed: "2026-05-08"
horizon: soon
milestone: m2-substrate-dispatch
---


**Status: completed.** The earlier `runtime/heartbeat.py` `Heartbeat.tick()` and its split between `diagnostics_policy` and a missing `task_readiness_policy` were dissolved when the heartbeat was replaced by `runtime/lifecycle.py`'s LangGraph StateGraph.
Task readiness, closure-rule application, winner selection, and agent invocation now flow through the dispatch graph every tick.

## Realized via

- `runtime/lifecycle.py`'s `tick_node` calls `runtime.dispatch_graph.run_dispatch(state.root, tick=new_count, invoke=state.autonomous_invoke)` every tick.
- `runtime/dispatch_graph.py`'s pipeline (`load_store → apply_eligibility_rules → select_winners → invoke_agent`) replaces the bespoke heartbeat-policy plumbing with substrate-authorized closure-rule application over the typed `PredicationStore`.
- Substrate validation/lint (the old `diagnostics_policy` role) lives in `closure/{rule, lint}` and is a complementary, non-runtime path that surfaces authoring errors over the markdown view.

## Acceptance (all met)

- [x] The lifecycle's tick fires on `(W, D)` pairs when ready workitems exist with eligible dispatchables.
- [x] Closure-rule application fires every tick; per-firing provenance is captured as `RuleFiring` records and rendered as `Witness` for the event log.
- [x] Substrate validation/lint coexists as a separate `closure/` layer.
- [x] Tests cover the end-to-end flow (`tests/test_runtime_eligibility_rules.py`, `tests/test_runtime_lifecycle.py`).
