---
title: "Dispatch table bootstrapped from substrate"
type: goal
milestone: m2-substrate-dispatch
status: completed
date-completed: "2026-05-08"
horizon: soon
theory-basis: [dispatch-readiness, assignment, normative-operational-layering]
tasks:
  - bootstrap-dispatch-table-from-substrate
---


**Status: completed.** The dispatch-table-as-Python-configuration was removed in the May 2026 refactor.
Dispatch eligibility is now populated by reading agent / endpoint / skill records from the substrate via the projector framework, applying substrate-authorized closure rules over the typed `pypredcalc.
PredicationStore`.
Adding a new agent or endpoint to the substrate takes effect on the next tick without restart.

## Realized via

- `runtime/dispatch_graph.py` — LangGraph `load_store → apply_eligibility_rules → select_winners → invoke_agent`.
  The `load_store_node` walks the substrate via `substrate.projector.compound.extract_tree` and lifts every cell into a `pypredcalc.
  PredicationStore`.
- `runtime/eligibility_rules.py` — instantiator registry.
  Each slug under `objects/<slug>.md` activates a rule; `discover_active_rule_slugs` walks the substrate at boot to find activated rules.
- `runtime/closure_runner.py` — Kleene closure with per-firing provenance and a deterministic `rsv_hash` (rule-system-version hash) stamping the run for replay / federation.
- `runtime/agent_compiler.py` — substrate agent records at `governance/agents/<slug>.md` compiled to PydanticAI Agents at dispatch time.
  The `EndpointRouter` resolves required capabilities against endpoint records.

## Theory grounding (preserved)

Per PredWork's dispatch-readiness concept: the dispatch morphism's authority component requires that normative standing (the agent holds the power to accept the task) be post-closure settled.
The realization satisfies this — eligibility is post-closure of the substrate's authorized rules; agent invocation is gated by the closure result.

## Acceptance (all met)

- [x] Dispatch eligibility populated from `type: agent`, `type: llm-endpoint`, `type: skill`, and `type: office` substrate records.
- [x] Adding a new `type: llm-endpoint` record registers it without code change.
- [x] The lifecycle's tick uses the substrate-derived eligibility for routing.
- [x] The dispatch run's `rsv_hash` changes when a new agent record is added (proves the rule system updated).
