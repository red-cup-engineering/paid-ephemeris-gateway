---
title: "Capability closure from substrate"
type: goal
milestone: m2-substrate-dispatch
status: completed
date-completed: "2026-05-08"
horizon: soon
theory-basis: [dispatch-readiness, normative-operational-layering, task-cell-system]
tasks:
  - fix-hardcoded-capability-closure
---


**Status: completed.** Capability matching is computed by walking the substrate's `requires-capabilities` (workitem) and `provides-capabilities` (dispatchable) cells through a substrate-authorized closure rule, not a hardcoded Python dict.

## Realized via

- `runtime/eligibility_rules.instantiate_eligibility_by_capabilities`: walks the typed `PredicationStore` for workitems and dispatchables, emits a `pypredcalc.
  StoreRule` per `(W, D)` pair where `D`'s `provides-capabilities` cell-set covers `W`'s `requires-capabilities` cell-set.
  The grounded rule's consequent is `(W, eligible-by-capabilities, D) = T`.
- `objects/eligibility-by-capabilities.md` — the substrate record that authorizes the rule.
  Removing this record deactivates the rule.
- `substrate/endpoint.
  Endpoint.covers` — the same matching logic exposed for the `EndpointRouter` to resolve agents' required capabilities at compile time.

The matching is **subset-cover**: `D` is eligible iff every `requires-capabilities` cell on `W` is matched by a corresponding `provides-capabilities` cell on `D`.
There is no implicit-implies dictionary; capability semantics are explicit in the substrate.
A polity that wants implication semantics authors an additional closure rule that pre-computes the closure into cells before `eligibility-by-capabilities` fires.

## Theory grounding (preserved)

Per PredWork's dispatch-readiness: the capability component requires the dispatchable's provided-capability section to be post-closure settled.
Realization: the closure-rule system runs to fixed point each tick before `select_winners_node` reads cells; per-firing provenance is captured in `RuleFiring` witnesses.

## Acceptance (all met)

- [x] Capability matching reads `requires-capabilities` and `provides-capabilities` from substrate cells via the projector framework.
- [x] No hardcoded capability dict.
- [x] Adding a new capability to a substrate record takes effect on the next tick without code change.
- [x] Per-firing provenance: each `(W, eligible-by-capabilities, D) = T` cell produced by the rule is attributable via `RuleFiring` and renders as a `Witness` for the event log.
