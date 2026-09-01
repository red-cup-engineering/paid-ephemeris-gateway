---
title: "Theory for developers"
kind: reference
status: active
---


Translation layer between the mathematical/engineering theory and the PyFARS Python implementation.
When a module docstring cites a FARS spec slug, this document tells you what that slug means in code terms.

## Theory → code vocabulary

| Theory term | Where it lives | PyFARS realization |
|---|---|---|
| `predication cell (s,p,o,v)` | predication-categories/concepts/predication-cell | A markdown frontmatter entry: `{slug, key, value}`. Also: JSONL event with `{e, p, o, v}` fields. |
| `flatfile` | FARS/concepts/flatfile | A `Flatfile` dataclass in `substrate/flatfile.py` |
| `predication-graph store` | predicated-computing/objects/predication-graph-store | The corpus directory walked by `substrate/load/` |
| `closure-rule system` | predication-categories/concepts/closure-rule-system | `pypredcalc.StoreClosureRuleSystem` driven by `runtime/eligibility_rules.py` instantiator registry |
| `closure operator` | predication-categories/morphisms/closure-operator | `runtime/closure_runner.py` `run_closure_with_provenance` (Kleene iteration over `pypredcalc.StoreClosureRuleSystem` with per-firing provenance + `rsv_hash`) |
| `settle` | FARS/morphisms/settle | `runtime/closure_runner.py` for the runtime closure; `closure/rule/compose_rules.py` + `closure/valuation/composite.py` for substrate validation/lint |
| `heartbeat cycle` | FARS/morphisms/heartbeat-cycle | `runtime/lifecycle.py` `validate → boot → tick → halt` LangGraph StateGraph driving `runtime/dispatch_graph.run_dispatch` each tick |
| `tick` | FARS/concepts/tick-as-iteration | The `tick_node` in `runtime/lifecycle.py`'s StateGraph (sleeps, increments counter, runs dispatch graph) |
| `dispatch` | FARS/morphisms/dispatch | `runtime/dispatch_graph.py` LangGraph: `load_store → apply_eligibility_rules → select_winners → invoke_agent` |
| `witness` | FARS/objects/witness | `runtime/event_log.py` append + `operator/witness.py` `make_witness()` |
| `event log` | FARS/objects/event (log of) | `<substrate-root>/.pyfars/event-log/<YYYY-MM-DD>.jsonl` (JSONL append-only, daily-rotated) |
| `session record` | FARS/objects/session-record | `runtime/session.py` open/close + substrate note `type: session-record` |
| `observation record` | FARS/objects/observation-record | Substrate note `type: workitem, kind: observation` |
| `instinct record` | FARS/objects/instinct-record | Substrate note `type: instinct-record` (not yet written) |
| `agent record` | FARS/objects/agent-record | Substrate note `type: agent` under `operations/engineering/agents/` |
| `skill record` | FARS/objects/skill-record | Substrate note `type: skill` under `operations/engineering/skills/` |
| `office record` | FARS/objects/office-record | Substrate note `type: office` (M2 addition) |
| `kit assembly` | FARS/concepts/kit-assembly | `harnesses/` directory + `install-harness` verb |
| `scope as fiber` | FARS/concepts/scope-as-fiber | `--scope` flag on verbs; path-restricted corpus walk |
| `three-tier memory` | FARS/concepts/three-tier-memory | Session observations + instinct records + corpus (see [../implementation/session-and-memory.md](../implementation/session-and-memory.md)) |
| `agential self-generation` | AOP/concepts/agential-self-generation | M5 goal: dispatch table bootstrapped from substrate records |
| `federation` | FARS/morphisms/merge-peer | M6: `runtime/federation.py` (skeleton only) |

## Module → theory mapping

| Module | Implements |
|---|---|
| `substrate/parse/` | FARS `load` morphism (parse phase) |
| `substrate/load/` | FARS `load` morphism (filesystem walk) |
| `substrate/index/` | FARS `interpret` morphism (graph construction) |
| `operator/traversal/` | predicated-computing traversal operators |
| `operator/edit/` | FARS `apply-edit` morphism |
| `closure/rule/` | FARS `ClosureRuleSystem` (validation rules) |
| `closure/valuation/` | predication-categories valuation functions |
| `closure/lint/` | FARS lint layer (suggestion generation) |
| `analyze/` | Multi-signal analyses (not a single FARS morphism) |
| `runtime/lifecycle.py` | FARS `heartbeat-cycle` morphism (LangGraph StateGraph) |
| `runtime/dispatch_graph.py` | FARS `dispatch` morphism (LangGraph StateGraph over `pypredcalc.PredicationStore`) |
| `runtime/eligibility_rules.py` | Substrate-authorized closure-rule instantiator registry; activates rules from `objects/<slug>.md` records |
| `runtime/closure_runner.py` | Kleene closure iteration with per-firing provenance and `rsv_hash` |
| `runtime/agent_compiler.py` | Substrate agent record → PydanticAI Agent; model inferred via `EndpointRouter` capability matching |
| `runtime/event_log.py` | FARS event log (append-only JSONL) |
| `runtime/session.py` | FARS `open-session` / `close-session` / `resume-session` |
| `runtime/federation.py` | FARS `merge-peer` / `admit-federation-envelope` (cellwise ∨_k merge; wire transport pending) |
| `runtime/services.py` | Service supervisor for long-running coroutines (web, control); discovers website assets on boot |
| `runtime/ledger.py` | FARS `ledger` morphism — lens over the witness log as double-entry postings |
| `runtime/promote.py` | FARS settlement-path operator (observation → instinct → skill → tool, idea → plan) |
| `harnesses/openclaw/` | FARS `kit-assembly` + `harness-surfaces` (spec section TBD) |
| `cli/` | Lifecycle CLI: `run`, `install`, `clean`, `help` (operational verbs go through the engine API) |
