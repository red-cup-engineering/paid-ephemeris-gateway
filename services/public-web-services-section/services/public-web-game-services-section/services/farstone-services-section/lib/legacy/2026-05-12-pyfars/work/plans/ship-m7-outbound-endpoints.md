---
title: "Ship [M7 — Boundary Handedness and Outbound Endpoint Participation](../milestones/m7-boundary-handedness-and-outbound-endpoints.md) as a coordinated plan"
type: plan
status: planning
milestone: m7-boundary-handedness-and-outbound-endpoints
tasks:
  - author-boundary-record-type
  - extend-boundary-fiber-composition-to-accept-handedness
  - migrate-existing-boundary-references-to-explicit-handedness
  - author-llm-endpoint-record-template
  - migrate-existing-endpoint-router-records-to-spec-conformant
  - enforce-llm-endpoint-record-invariants-at-load-time
  - extend-cost-quantale-to-product-shape
  - emit-cost-witnesses-on-every-settle-action
  - implement-cost-ledger-as-substrate-projection
  - author-selection-by-cost-rule-record
  - implement-selection-by-cost-instantiator
  - extend-dispatch-graph-to-compose-cost-axis
  - design-evidence-graded-rate-limit-observation-projector
  - implement-provider-header-self-counted-and-429-pathways
  - integrate-rate-limit-observations-with-cost-quantale-tokens-dimension
dependency-order:
  - [author-boundary-record-type, extend-boundary-fiber-composition-to-accept-handedness]
  - [extend-boundary-fiber-composition-to-accept-handedness, migrate-existing-boundary-references-to-explicit-handedness]
  - [author-boundary-record-type, author-llm-endpoint-record-template]
  - [author-llm-endpoint-record-template, migrate-existing-endpoint-router-records-to-spec-conformant]
  - [migrate-existing-endpoint-router-records-to-spec-conformant, enforce-llm-endpoint-record-invariants-at-load-time]
  - [extend-cost-quantale-to-product-shape, emit-cost-witnesses-on-every-settle-action]
  - [emit-cost-witnesses-on-every-settle-action, implement-cost-ledger-as-substrate-projection]
  - [enforce-llm-endpoint-record-invariants-at-load-time, author-selection-by-cost-rule-record]
  - [implement-cost-ledger-as-substrate-projection, author-selection-by-cost-rule-record]
  - [author-selection-by-cost-rule-record, implement-selection-by-cost-instantiator]
  - [author-selection-by-cost-rule-record, extend-dispatch-graph-to-compose-cost-axis]
  - [enforce-llm-endpoint-record-invariants-at-load-time, design-evidence-graded-rate-limit-observation-projector]
  - [design-evidence-graded-rate-limit-observation-projector, implement-provider-header-self-counted-and-429-pathways]
  - [implement-provider-header-self-counted-and-429-pathways, integrate-rate-limit-observations-with-cost-quantale-tokens-dimension]
  - [emit-cost-witnesses-on-every-settle-action, integrate-rate-limit-observations-with-cost-quantale-tokens-dimension]
milestone-cells:
  - "(boundary-records, with-handedness-coordinate, true) = T"
  - "(llm-endpoint-record, fully-spec-conformant, true) = T"
  - "(cost-discipline, as-substrate-cells, true) = T"
  - "(dispatch, chooses-by-cost-quantale, true) = T"
  - "(rate-limit-observations, ground-availability-cells, true) = T"
normative-cleanup: tracked
revision-likely: true
revision-triggers: [m6-federation-completion, swarm-participation-handedness-question-resolution]
---


## Revision-likely: this plan is fidelity-overspent

Per [roadmap-enrichment](../../concepts/roadmap-enrichment.md), [M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md) is at `horizon: captured`.
A plan-record at this fidelity is *overspent*; rescope-triggers warrant reviewing the task list and dependency-order:

- **[M6](../milestones/m6-federation.md) completion**: M7's boundary-record schema must compose with M6's federation envelopes (a federated peer's outbound endpoints federate too).
  Concrete schema choices in M6 will pin which boundary-record fields are necessary versus optional in M7.
- **Resolution of the upstream [`swarm-participation-handedness`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md) question**: that question's resolution determines whether handedness is binary (in/out/bidirectional) or finer-grained (read-only-in, write-only-in, etc.).
  The plan currently assumes the binary form; a refined answer rescopes [`extend-boundary-fiber-composition-to-accept-handedness`](../tasks/engineering/extend-boundary-fiber-composition-to-accept-handedness.md).

Per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability", silent revision is forbidden — revision-on-trigger requires a witness.

## What this plan does

[M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md)'s acceptance has five joint settlements: (1) boundary records with handedness coordinate, (2) LLMEndpointRecords fully spec-conformant, (3) cost-discipline operationalized as substrate cells, (4) dispatch reading those cells via cost-quantale-min, (5) rate-limit observations grounding availability cells with bilattice-graded evidence.
None alone is the milestone; the joint settlement is.

The plan structure threads through these in dependency-order: handedness foundation first (without it, downstream goals can't compose into the same algebra); endpoint records next (the substrate-side declaration of what's outbound); cost-discipline next (the substrate-side machinery); selection-by-cost rule next (the substrate-side reading of cost cells); rate-limit observation pathways throughout (independent of cost composition until they integrate at the tokens-against-budget axis).

## Dependency structure

```
boundary-record-type ──→ handedness-fiber-composition ──→ migrate-existing-boundaries
                              ↓
                  llm-endpoint-record-template ──→ migrate-endpoint-router-records ──→ enforce-invariants
                                                                                              ↓
                                            cost-quantale-product ──→ cost-witness-emission ──→ cost-ledger ─┐
                                                                                                              ↓
                                            selection-by-cost-rule ──→ instantiator ──→ dispatch-cost-axis
                                                                                              ↓
                                            rate-limit-projector-design ──→ pathway-impl ──→ tokens-dimension-integration
                                                                                              ↓
                                                                          (M7 acceptance: cost-aware endpoint dispatch)
```

## Milestone cells and acceptance

The plan completes when all five milestone-cells are at $\mathbf{t}$.
The acceptance scenario from the milestone (multiple endpoints, dispatch picks cheapest non-rate-limited, rate-limit mid-tick triggers re-selection) verifies the joint settlement; per-goal acceptance verifies partial settlement.

## Defeasibility

Per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md): plan abandonment requires witness emission.
Plan revision (e.g., shipping M7 without cost-quantale because product Lawvere quantale infrastructure isn't ready) requires substrate-witnessed justification.
Without the cost dimension, M7 reduces to "endpoints with handedness and rate-limits" — still useful, but doesn't close the captain's lowest-cost-to-swarm requirement; that's a partial M7, not a complete one.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [LLMEndpointRecord (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) — the spec the milestone realizes.
- [LLM swarms fail classical conditions](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md) — what M7 honestly does NOT claim.
