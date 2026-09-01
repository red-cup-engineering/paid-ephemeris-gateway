---
title: "Ship M3 — Continuous Autonomous Loop as a coordinated plan"
type: plan
status: planning
milestone: m3-continuous-loop
tasks:
  - bootstrap-installs-and-starts-engine-service
  - author-systemd-user-service-template
  - author-eligibility-by-budget-rule-record
  - implement-eligibility-by-budget-instantiator
  - lift-rate-limit-headers-into-substrate-cells
  - detect-top-cells-and-queue-review-workitems
  - add-event-log-replay-test
  - implement-on-complete-followon-emission
  - implement-bigraded-common-knowledge-separation-in-eligibility-witnesses
dependency-order:
  - [author-eligibility-by-budget-rule-record, implement-eligibility-by-budget-instantiator]
  - [author-systemd-user-service-template, bootstrap-installs-and-starts-engine-service]
  - [lift-rate-limit-headers-into-substrate-cells, add-event-log-replay-test]
  - [detect-top-cells-and-queue-review-workitems, add-event-log-replay-test]
  - [implement-on-complete-followon-emission, add-event-log-replay-test]
  - [detect-top-cells-and-queue-review-workitems, implement-bigraded-common-knowledge-separation-in-eligibility-witnesses]
milestone-cells:
  - "(engine, supervised-and-running, true) = T"
  - "(budget-gate, exhausts-cleanly, true) = T"
  - "(rate-limit-observation-loop, closed, true) = T"
  - "(replay-determinism-test, passing, true) = T"
  - "(on-complete-followons, emitting, true) = T"
  - "(anomaly-witnesses, surfacing-as-review-workitems, true) = T"
normative-cleanup: tracked
---

# Ship [M3 — Continuous Autonomous Loop](../milestones/m3-continuous-loop.md) as a coordinated plan

## What this plan does

[M3 — Continuous Autonomous Loop](../milestones/m3-continuous-loop.md)'s acceptance is *joint*: the engine runs unattended for 24 hours with budget gating, rate-limit feedback, anomaly surfacing, and replay determinism — all simultaneously.
Each goal alone is partial; only the joint settlement is the milestone.
That's the structural mark of a plan rather than a flat list of goals.

The dependency-DAG (frontmatter `dependency-order`) makes the work admissible-in-stages: the supervised-service goal cannot land until its template task lands; the rate-limit feedback goal needs the eligibility-by-rate-limit rule (already authored), but its end-to-end correctness depends on the replay test, which depends on all loop-closing goals having landed.

## Dependency structure

```
author-systemd-user-service-template ─→ bootstrap-installs-and-starts-engine-service
                                                       │
                                                       ▼
                              (engine-runs-as-supervised-service goal lands)

author-eligibility-by-budget-rule-record ─→ implement-eligibility-by-budget-instantiator
                                                       │
                                                       ▼
                                         (budget-gated-dispatch goal lands)

lift-rate-limit-headers-into-substrate-cells ─┐
detect-top-cells-and-queue-review-workitems ─┼─→ add-event-log-replay-test
implement-on-complete-followon-emission ─────┘
                                             │
                                             ▼
                              (replay-determinism-verified goal lands)
```

Each subordering exists because the successor's antecedents read cells the predecessor settles:

- The instantiator reads the rule record's frontmatter; absent the record, the instantiator's antecedents are at $\bot$.
- The bootstrap step's installer reads the systemd template; absent the template, the bootstrap antecedents are at $\bot$.
- The replay test must observe all of `(rate-limit-loop-closed, true)`, `(top-cells-detected, true)`, `(on-complete-emitted, true)` to test the joint determinism of the system; absent any one, the test's antecedents are at $\bot$ on at least one axis and the test cannot run end-to-end.

## Milestone cells

The plan completes when *all* milestone-cells in the frontmatter are at $\mathbf{t}$.
By [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md), the plan-level completion is the meet over the milestone-cell set.
A subset's settlement is partial completion; full completion requires all six.

This is also why the plan exists as a record: the milestone's `acceptance:` line ("the engine has run for 24 hours…") is a single prose statement, but the operational reality is six joint settlements.
The plan record makes the conjunction substrate-readable.

## Defeasibility

If the captain abandons the plan, the abandonment increment $(\text{ship-m3-continuous-loop}, \texttt{abandoned-by}, \text{captain}) = \mathbf{t}$ propagates: the eight tasks' settled witnesses survive (event-sourcing direction; abandonment doesn't retract history), but each task's `status: open` flips to `abandoned` and any pending work stops.

Plan revision (adding or removing a task) requires: - A revision-witness with `justified-by: <reason-cell>` - An update to the frontmatter `tasks:` and `dependency-order:` lists - Witness emission (a substrate write that records the revision)

Silent revision is forbidden — per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability".
The substrate's audit trail must show *why* the plan changed, not just *that* it changed.

## Normative profile

Each task in this plan, when dispatched, generates a duty cell on the assigned agent (per O→N rule in [normative-operational-layering](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md)).
At plan completion, the *normative residue* — duty cells settled at $\mathbf{t}$ without a corresponding duty-discharge — is tracked but not blocking (`normative-cleanup: tracked` in frontmatter).
A future M3 retrospective review may surface unrediscarged duties as findings; they don't prevent the plan from being marked complete.

The plan would set `normative-cleanup: required` if duty-discharge were a condition of plan completion (e.g., for charter-amendment plans where every action under amended authority must be duty-cleared).
Engineering plans don't need this stricture.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion as the meet of milestone cells.
- [Settling-CALM-corollary](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md) — the active-frontier query (which tasks are currently dispatchable) is coordination-free.
