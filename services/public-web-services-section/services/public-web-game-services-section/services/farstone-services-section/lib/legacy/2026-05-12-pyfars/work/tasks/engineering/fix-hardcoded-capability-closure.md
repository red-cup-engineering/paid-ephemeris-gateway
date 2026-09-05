---
title: "Fix hardcoded capability closure in dispatch eligibility"
kind: task
type: task
area: engineering
status: completed
date-completed: "2026-05-08"
horizon: soon
milestone: m2-substrate-dispatch
---


**Status: completed.** The hardcoded capability-closure dict in the earlier `cli/dispatch.py` `_capability_closure()` was removed when the CLI was stripped to lifecycle-only and dispatch moved to `runtime/dispatch_graph.py`.
Capability matching is now computed by `runtime/eligibility_rules.instantiate_eligibility_by_capabilities` over substrate cells.

## Realized via

- `runtime/eligibility_rules.instantiate_eligibility_by_capabilities(store)` walks the `PredicationStore` for workitems and dispatchables, emits a `pypredcalc.
  StoreRule` per `(W, D)` pair whose `provides-capabilities` cell-set covers the workitem's `requires-capabilities` cell-set.
  No Python dict.
- `substrate/endpoint.
  Endpoint.covers` exposes the same subset-cover semantics for the `EndpointRouter` to resolve agents' required capabilities at compile time.
- Capability semantics are explicit in the substrate; if a polity wants implication semantics (e.g., `text-generation` implies `summarization`), it authors an additional closure rule that pre-computes the implications into cells before `eligibility-by-capabilities` fires.

## Acceptance (all met)

- [x] No hardcoded capability dict.
- [x] Capability matching reads cells from the projector-loaded `PredicationStore`.
- [x] Adding a new capability to a substrate record takes effect on the next tick without code change.
- [x] Tests cover empty store, single capability, multi-capability cover, and the disqualification interaction (rate-limit/charter-binding turning eligibility into `⊤` via knowledge-meet).
