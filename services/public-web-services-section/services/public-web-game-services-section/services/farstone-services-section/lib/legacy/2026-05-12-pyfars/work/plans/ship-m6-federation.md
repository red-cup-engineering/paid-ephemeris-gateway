---
title: "Ship [M6 — Federation](../milestones/m6-federation.md) as a coordinated plan"
type: plan
status: planning
milestone: m6-federation
tasks:
  - draft-fars-federation-spec-section
  - review-spec-against-closure-merge-commutation-lemma
  - publish-fars-federation-spec-as-rfc
  - implement-content-hash-derivation-for-substrate-notes
  - extend-substrate-index-to-key-by-content-hash
  - emit-content-hash-cells-on-substrate-write
  - author-peer-record-type
  - author-trust-level-norms
  - implement-peer-record-loading-into-engine
  - implement-emit-federation-envelope-endpoint
  - implement-admit-federation-envelope-endpoint
  - implement-federation-cycle-as-recurrent-practice
  - test-predication-on-host-a-appears-on-host-b
  - test-partition-recovery-converges-without-last-write-wins
  - emit-top-cells-on-conflicting-federated-assertions
dependency-order:
  - [draft-fars-federation-spec-section, review-spec-against-closure-merge-commutation-lemma]
  - [review-spec-against-closure-merge-commutation-lemma, publish-fars-federation-spec-as-rfc]
  - [publish-fars-federation-spec-as-rfc, implement-content-hash-derivation-for-substrate-notes]
  - [publish-fars-federation-spec-as-rfc, author-peer-record-type]
  - [implement-content-hash-derivation-for-substrate-notes, extend-substrate-index-to-key-by-content-hash]
  - [extend-substrate-index-to-key-by-content-hash, emit-content-hash-cells-on-substrate-write]
  - [author-peer-record-type, author-trust-level-norms]
  - [author-peer-record-type, implement-peer-record-loading-into-engine]
  - [emit-content-hash-cells-on-substrate-write, implement-emit-federation-envelope-endpoint]
  - [implement-peer-record-loading-into-engine, implement-emit-federation-envelope-endpoint]
  - [implement-emit-federation-envelope-endpoint, implement-admit-federation-envelope-endpoint]
  - [implement-admit-federation-envelope-endpoint, implement-federation-cycle-as-recurrent-practice]
  - [implement-federation-cycle-as-recurrent-practice, test-predication-on-host-a-appears-on-host-b]
  - [test-predication-on-host-a-appears-on-host-b, test-partition-recovery-converges-without-last-write-wins]
  - [test-partition-recovery-converges-without-last-write-wins, emit-top-cells-on-conflicting-federated-assertions]
milestone-cells:
  - "(fars-federation-spec, published-as-rfc, true) = T"
  - "(content-hash-addressing, derived-and-emitted, true) = T"
  - "(peer-records-and-trust-levels, loaded, true) = T"
  - "(federation-envelope-wire-transport, working, true) = T"
  - "(cross-host-substrate-convergence, verified, true) = T"
normative-cleanup: tracked
revision-likely: true
revision-triggers: [m5-agential-self-generation-completion, distributed-coordination-primitives-question-resolution, consensus-as-h0-question-resolution]
---


## Revision-likely: this plan is fidelity-overspent

Per [roadmap-enrichment](../../concepts/roadmap-enrichment.md), [M6](../milestones/m6-federation.md) is at `horizon: captured` (≥9 months out).
A plan-record at this fidelity is *overspent*: details may shift before prerequisite milestones ship.
The records officer keeps this plan in place rather than retracting it (deletion would destroy substrate), but flags the following rescope-triggers — settlement of any one warrants reviewing the plan's tasks and `dependency-order:`:

- **[M5](../milestones/m5-agential-self-generation.md) completion**: M5's "agents author rules; rules dispatchable next tick" surface determines what the federation envelope must carry.
  If M5 ships with broader self-generation than currently scoped, M6 envelopes must carry rule-system-deltas, not just cell-deltas — see [`federated-learning-model-deltas-vs-raw-data-for-federation`](../../questions/federated-learning-model-deltas-vs-raw-data-for-federation.md).
- **Resolution of [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md)**: a yes-answer rescopes M6 itself by splitting it into content-federation (current scope) and coordination-federation (new) layers.
  The plan's task list would gain authoring of leader-record, quorum-record, distributed-lock-record schemas.
- **Resolution of [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md)**: a yes-answer makes consensus a *single* substrate primitive used uniformly across federation merge, charter ratification, and multi-witness completion.
  This would fold tasks from the current plan into a uniform consensus-primitive task chain, simplifying overall but redistributing scope.

The plan is structurally honest as long as a future enrichment-cycle that finds these triggers fired produces a revision-witness rather than silent-revision.
Per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability", silent revision is forbidden.

## What this plan does

[M6](../milestones/m6-federation.md) closes [Charter](../../governance/charter.md) C4 — federation by value-domain join.
The acceptance is concrete: a predication added on one host appears on the peer host after the next federation cycle, *without data loss or last-write-wins resolution*.

Three pipelines, each conceptually independent but all required jointly:

1. **Spec authoring** — theory before code.
  The FARS federation spec section gets drafted, reviewed against the closure-merge commutation lemma, and published as an RFC. **No wire-transport implementation begins until the RFC is published.**
2. **Substrate identifiers** — content-hash addressing.
  Every note gets a canonical content-hash; the index keys notes by it; substrate writes emit hash cells.
3. **Wire transport** — peer records, federation envelopes, the federation-cycle recurrent practice.
  This is the actual networking work.

The acceptance tests (cross-host propagation, partition recovery, $\top$-cell emission) verify the joint working.

## Discipline: spec gates implementation

The dependency-DAG shows the spec-authoring chain (`draft → review → publish`) gates ALL downstream implementation tasks.
This is intentional — per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md)'s defeasible-stability discipline, choosing to implement before the spec is published would be a substrate-witnessed plan revision requiring justification.

The spec exists to make the closure-merge commutation lemma operationally usable.
Implementing without the spec is implementing without the discipline; the result might converge under nice conditions but lose convergence under partition or charter-divergence.

## Dependency structure (high level)

```
draft-fars-federation-spec ──→ review-against-lemma ──→ publish-as-rfc
                                                              ↓
                                       ┌──────────────────────┴──────────────────────┐
                                       ↓                                              ↓
                       implement-content-hash-derivation        author-peer-record-type ─┬─→ author-trust-level-norms
                                       ↓                                              │
                       extend-substrate-index-to-key-by-hash    implement-peer-record-loading
                                       ↓                                              │
                       emit-content-hash-cells-on-write         ─────────────────────┘
                                       ↓                                              ↓
                                       └──────────────────→ implement-emit-federation-envelope ──→ implement-admit
                                                                                              ↓
                                                            implement-federation-cycle-as-recurrent-practice
                                                                                              ↓
                                       test-predication-propagation ──→ test-partition-recovery ──→ emit-top-cells-with-provenance
```

## Milestone cells

All five milestone-cells must reach $\mathbf{t}$.
The acceptance tests verify two of them (`federation-envelope-wire-transport, working`; `cross-host-substrate-convergence, verified`); the others are settled by the spec-publication task and the per-implementation-task acceptance.

## Defeasibility

[M6](../milestones/m6-federation.md) is the only milestone where the test-driven side of the plan must produce *all three* acceptance scenarios (simple propagation, partition recovery, $\top$-with-provenance).
A revision that drops one — for instance, "skip partition recovery for now" — fundamentally changes M6's content; that revision must be witnessed and the resulting plan must declare which scenarios it does verify.

## Normative profile

`normative-cleanup: tracked` — federated dispatch generates duty cells across federation members.
The plan tracks residue but doesn't block on it; cross-host duty cleanup is downstream of [M5](../milestones/m5-agential-self-generation.md)'s charter-binding work.
A federation cycle that propagates a duty-cell to a peer is itself a duty-creation event for the peer's office; the receiving office accepts or rejects per its local charter.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Closure-merge commutation lemma](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) — what the spec must preserve.
- [Multi-agent-work-as-CRDT](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/multi-agent-work-as-crdt.md) — the eventual-consistency property the acceptance tests exercise.
- [Sovereign-node + content-hash-addressing](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/content-hash-addressing.md) — what distinguishes federation-by-value-domain-join from a centralized event bus.
