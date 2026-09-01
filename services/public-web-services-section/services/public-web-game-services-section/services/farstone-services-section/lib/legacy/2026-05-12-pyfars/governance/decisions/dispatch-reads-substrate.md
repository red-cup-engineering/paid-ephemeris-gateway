---
title: "Dispatch reads substrate"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [enterprise, dispatch-readiness, normative-operational-layering]
---


## What

The dispatch eligibility — which agents handle which workitems, under what conditions — is derived from substrate records (agent records, office records, endpoint records) and substrate-authorized closure rules, not from Python code or configuration files.
Adding a new agent record, endpoint record, or rule record to the substrate takes effect on the next tick without any Python restart or code change.

## Why

The FARS spec commits to agential self-generation: every operative element is a substrate entity.
Eligibility policy is an operative element; it must be substrate content.

This decision is **realized** by the May 2026 PyPredCalc + LangGraph + PydanticAI refactor:

- `runtime/dispatch_graph.py` runs the dispatch LangGraph each tick: `load_store → apply_eligibility_rules → select_winners → invoke_agent`.
- `runtime/eligibility_rules.py` exposes a `RULE_INSTANTIATORS` registry keyed by rule slug.
  Each slug under `objects/<slug>.md` activates a rule; `discover_active_rule_slugs(root)` walks the substrate to find activated rules.
- `runtime/closure_runner.py` runs the active rules through `pypredcalc.
  StoreClosureRuleSystem` over the typed `PredicationStore` with per-firing provenance and a deterministic `rsv_hash`.
- `runtime/agent_compiler.py` compiles substrate agent records at `governance/agents/<slug>.md` into PydanticAI Agents; the model is inferred via `EndpointRouter.resolve(required_capabilities)` against the registered endpoint records.

## Rules out

- Hardcoding agent capabilities, skill mappings, or endpoint preferences in Python source files.
  These belong in substrate records.
- Requiring a process restart to change which agents are eligible for which work.
  The dispatch graph re-walks the substrate each tick.
- Dispatch configuration in `.pyfars/config.toml` or similar instance-config files.
  Instance config is for infrastructure (paths, credentials, intervals); dispatch policy is substrate content.

## Does not constrain

- Whether to cache the lifted store within a single tick.
  Caching within one tick is admissible; stale across ticks is not (each tick re-walks the substrate via `extract_tree`).
- The specific record fields used in eligibility (these are specced in [implementation/substrate-driven-dispatch.md](../../work/implementation/substrate-driven-dispatch.md) and visible in `runtime/eligibility_rules.py`'s instantiators).
- Whether selection (winner choice from the eligible set) is itself a substrate-authored closure rule.
  Currently it is a lexicographic slug-tiebreak in `select_winners_node`; moving it into a substrate rule is the remaining alignment work.
