---
title: "Substrate-Driven Dispatch"
kind: implementation-guide
status: superseded
date-superseded: "2026-05-08"
date: "2026-05-07"
milestone: M2
---


**Status: superseded.** This implementation guide described the migration from the earlier `cli/dispatch.py` corpus-walking eligibility filter + `runtime/dispatch.py` `DispatchTable` parallel implementations to a unified substrate-driven dispatch path.
The migration landed in the May 2026 PyPredCalc + LangGraph + PydanticAI refactor; the realization is described below.

## Realized via

Dispatch is now a LangGraph StateGraph in `runtime/dispatch_graph.py`, run once per tick by the lifecycle's `tick_node`:

```
load_store → apply_eligibility_rules → select_winners → invoke_agent
```

- **`load_store_node`** walks the substrate via `substrate.projector.compound.extract_tree(root)` and lifts every cell into a `pypredcalc.
  PredicationStore`.
  Discovers active rule slugs by checking which `objects/<slug>.md` records exist in the substrate.
- **`apply_eligibility_rules_node`** runs `runtime.closure_runner.run_closure_with_provenance` over the store: each active rule's instantiator (in `runtime/eligibility_rules.
  RULE_INSTANTIATORS`) emits grounded `pypredcalc.
  StoreRule` objects; the closure operator runs to fixed point with per-firing `RuleFiring` provenance and a deterministic `rsv_hash` that stamps the run for federation/replay.
- **`select_winners_node`** picks at most one dispatchable per workitem from the closed store via knowledge-meet across positive eligibility (`(W, eligible-by-capabilities, D) = T`) and disqualification axes (`(W, eligible-by-rate-limit, D)`, `(W, eligible-by-charter-binding, D)`).
  Tiebreak is currently lexicographic slug order; a substrate-authored selection rule is the remaining alignment work.
- **`invoke_agent_node`** (gated by `state.invoke`) compiles each `(W, D)` winner's agent record via `runtime.agent_compiler.compile_agent` and runs it against a substrate-derived prompt.
  Each invocation emits an `agent_invoked` witness.

## Default rule-system (substrate-authorized)

Each rule activates by carrying its `objects/<slug>.md` record.
Default rules:

- `eligibility-by-capabilities` — subset-cover of `requires-capabilities` (workitem) against `provides-capabilities` (dispatchable).
  T-emitting.
- `eligibility-by-skills` — subset-cover of `requires-skills` against `provides-skill`.
  T-emitting.
- `eligibility-by-jurisdiction` — subset-cover of `touches` paths against `jurisdiction-write` paths.
  T-emitting.
- `eligibility-by-rate-limit` — disqualification when `rate-limit-remaining` reads `0`.
  F-emitting.
- `eligibility-by-charter-binding` — disqualification when `charter-binding-violated` reads `true`.
  F-emitting.

T from a positive rule plus F from a disqualification rule on the same `(W, D)` cell knowledge-joins to `⊤` (paraconsistent surfacing of the conflict).
Selection refuses `⊤`.

## Record schemas (what dispatch reads)

### workitem record

```yaml
---
type: task   # or "workitem"
title: ...
requires-capabilities: [cap-slug]
requires-skills: [skill-slug]
touches: [path/in/substrate]
---
```

### agent record (`governance/agents/<slug>.md`)

```yaml
---
type: agent
title: ...
description: ...
role: ...
duties: [...]
powers: [...]
immunities: [...]
provides-capabilities: [cap-slug]
provides-skill: [skill-slug]
requires-capabilities: [cap-slug]   # optional; defaults to DEFAULT_AGENT_REQUIRED_CAPABILITIES
jurisdiction-write: [path/in/substrate]
---
```

Agent records do not declare a model.
The model is inferred at dispatch time via `EndpointRouter.resolve(required_capabilities)` against the registered endpoints.

### endpoint record (`governance/assets/computing/endpoints/<slug>.md`)

```yaml
---
type: llm-endpoint
provider: cerebras
model-name: llama-3.1-8b-instant
base-url: https://...
auth-env-var: CEREBRAS_API_KEY
provides-capabilities: [text-generation, instruction-following, structured-output]
work-types: [...]
rate-limit-rpm: ...
rate-limit-rpd: ...
---
```

## Realization references

- [`src/pyfars/runtime/dispatch_graph.py`](../../src/pyfars/runtime/dispatch_graph.py) — the LangGraph
- [`src/pyfars/runtime/eligibility_rules.py`](../../src/pyfars/runtime/eligibility_rules.py) — instantiator registry
- [`src/pyfars/runtime/closure_runner.py`](../../src/pyfars/runtime/closure_runner.py) — Kleene closure with provenance + `rsv_hash`
- [`src/pyfars/runtime/agent_compiler.py`](../../src/pyfars/runtime/agent_compiler.py) — substrate record → PydanticAI Agent
- [`src/pyfars/runtime/lifecycle.py`](../../src/pyfars/runtime/lifecycle.py) — the tick that drives the dispatch graph
- [FARS dispatch morphism](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/morphisms/dispatch.md) — normative spec
- [AOP dispatch-as-closure-rule-system theorem](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/dispatch-as-closure-rule-system.md) — the upstream theorem grounding the design

## Remaining alignment

- **Selection rule as substrate**: winner choice in `select_winners_node` uses lexicographic slug-tiebreak in code.
  Moving the tiebreak into a substrate-authored selection closure rule (e.g., `objects/selection-by-load.md` plus an instantiator) is the next refinement.
- **Assignment cells**: winners are returned as `(W, D)` tuples in `DispatchState`.
  Writing `(W, assigned-to, D) = T` cells back into the substrate as part of the closure run is the further refinement.
