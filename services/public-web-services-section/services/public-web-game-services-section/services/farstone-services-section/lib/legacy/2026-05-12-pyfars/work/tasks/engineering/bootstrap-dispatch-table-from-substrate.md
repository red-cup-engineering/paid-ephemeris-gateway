---
title: "Bootstrap dispatch table from substrate records"
type: task
area: engineering
status: completed
date-completed: "2026-05-08"
horizon: soon
milestone: m2-substrate-dispatch
goal: dispatch-table-bootstrapped-from-substrate
requires-capability: [python-editing]
theory-basis: [dispatch-readiness, assignment, normative-operational-layering]
---


**Status: completed.** The earlier `runtime/dispatch.py` `DispatchTable` class and its hand-rolled bootstrap path were removed in the May 2026 refactor.
Dispatch is now substrate-authorized via the LangGraph `dispatch_graph` and the instantiator registry over `pypredcalc.
StoreClosureRuleSystem`.

## Realized via

- `runtime/dispatch_graph.py` — replaces the `DispatchTable` class.
  Each tick:
  1. `load_store_node` lifts cells from disk via projectors.
  2. `apply_eligibility_rules_node` runs the substrate-authorized rules through `pypredcalc.
    StoreClosureRuleSystem` with per-firing provenance.
  3. `select_winners_node` knowledge-meets the eligibility axes against the disqualification axes and picks a winner per workitem.
  4. `invoke_agent_node` (gated by `state.invoke`) compiles each winner's agent record and runs it against a substrate-derived prompt.
- `runtime/eligibility_rules.discover_active_rule_slugs(root)` — substitutes for the hand-rolled bootstrap by walking the substrate for activated rule records.
- `runtime/closure_runner.compute_rsv_hash` — the rule-system-version hash now comes from `(active rule slugs, instantiated rules canonicalized, store cells)`, providing the same auditability the old `DispatchTable.system_version` was meant to.

## Acceptance (all met)

- [x] No bespoke `DispatchTable` class; the LangGraph + closure-rule-system replaces it.
- [x] Adding a new `type: llm-endpoint` or `type: agent` record causes it to be picked up on the next tick without code change.
- [x] The lifecycle uses the dispatch graph for routing.
- [x] The dispatch run's `rsv_hash` changes when a new agent record is added.
- [x] Tests cover the flow end-to-end (`tests/test_runtime_eligibility_rules.py`, `tests/test_runtime_lifecycle.py`).
