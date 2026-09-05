---
title: "Ship [M5 — Agential Self-Generation](../milestones/m5-agential-self-generation.md) as a coordinated plan"
type: plan
status: planning
milestone: m5-agential-self-generation
tasks:
  - author-runbook-record-type
  - implement-runbook-firing-in-dispatch-graph
  - test-runbook-composition-from-skills
  - extend-dispatch-eligibility-to-read-office-jurisdiction
  - author-jural-relation-closure-firings
  - implement-incumbency-verification-rule
  - emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts
  - migrate-charter-clauses-to-norm-records
  - author-charter-violation-detection-rules
  - emit-charter-binding-violations-as-disqualification
  - implement-skill-to-tool-spec-projector
  - reformat-existing-skill-records-as-gerunding-phrases
  - confirm-projector-rebuilds-store-on-each-tick
  - test-mid-tick-skill-authorship-and-next-tick-dispatch
  - document-skill-authorship-mid-session-as-substrate-norm
  - extend-on-complete-emission-to-learning-outputs
  - wire-learning-outputs-into-consolidation-cycle
  - test-end-to-end-work-n-produces-skill-for-work-n-plus-one
dependency-order:
  - [author-runbook-record-type, implement-runbook-firing-in-dispatch-graph]
  - [implement-runbook-firing-in-dispatch-graph, test-runbook-composition-from-skills]
  - [extend-dispatch-eligibility-to-read-office-jurisdiction, implement-incumbency-verification-rule]
  - [extend-dispatch-eligibility-to-read-office-jurisdiction, emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts]
  - [extend-dispatch-eligibility-to-read-office-jurisdiction, author-jural-relation-closure-firings]
  - [author-runbook-record-type, implement-skill-to-tool-spec-projector]
  - [implement-skill-to-tool-spec-projector, test-mid-tick-skill-authorship-and-next-tick-dispatch]
  - [migrate-charter-clauses-to-norm-records, author-charter-violation-detection-rules]
  - [author-charter-violation-detection-rules, emit-charter-binding-violations-as-disqualification]
  - [confirm-projector-rebuilds-store-on-each-tick, test-mid-tick-skill-authorship-and-next-tick-dispatch]
  - [test-mid-tick-skill-authorship-and-next-tick-dispatch, document-skill-authorship-mid-session-as-substrate-norm]
  - [test-mid-tick-skill-authorship-and-next-tick-dispatch, extend-on-complete-emission-to-learning-outputs]
  - [emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts, extend-on-complete-emission-to-learning-outputs]
  - [extend-on-complete-emission-to-learning-outputs, wire-learning-outputs-into-consolidation-cycle]
  - [wire-learning-outputs-into-consolidation-cycle, test-end-to-end-work-n-produces-skill-for-work-n-plus-one]
milestone-cells:
  - "(runbooks, first-class-substrate, true) = T"
  - "(office-records, gate-authority, true) = T"
  - "(governance-rules, fire-as-closure-rules, true) = T"
  - "(new-skills, dispatchable-next-tick, true) = T"
  - "(on-complete, cycles-into-learning, true) = T"
normative-cleanup: required
---


## What this plan does

[M5](../milestones/m5-agential-self-generation.md) closes [Charter](../../governance/charter.md) C3 — agential self-generation.
The acceptance is concrete: an agent completing a workitem can write a new skill record to the substrate and that skill is dispatched on the next tick without any Python restart or code change.

Five parallel-ish pipelines:

1. **Runbooks as first-class substrate** — multi-step procedures the dispatch graph can fire as single dispatchables.
2. **Office records gate authority** — dispatch reads office, incumbent, jurisdiction; ultra-vires is substrate-visible.
3. **Governance rules as closure rules** — charter clauses and norms fire on the same machinery as eligibility rules.
4. **New skill records dispatchable next tick** — the bare regression-test guarantee that authoring is live-on-next-tick.
5. **on-complete cycles into learning** — explicit learning artifacts (skills, runbooks, norms) authored from work outputs.

The pipelines are mostly independent within M5 but converge in the **end-to-end test** (work N produces skill, work N+1 dispatches against it) which requires all five to be working.

## Why `normative-cleanup: required`

This is the only plan among ship-M3/M4/M5/M6 with `normative-cleanup: required`: M5 is where the substrate's *own governance* becomes operative.
Charter clauses become enforceable closure rules; office authority becomes substrate-checked; an agent authoring a new skill claims an authoring power.

If a duty-cell hasn't discharged at plan completion, that's a *governance* failure — not a tracked observation, but a blocking failure. **The plan is complete only when all duties are discharged.** Per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Normative residue", the normative-cleanup-milestone cell sits in the milestone-cells set; without it at $\mathbf{t}$, the plan-completion meet is not satisfied.

## Dependency structure (high level)

```
runbook-record-type ──→ runbook-firing-in-dispatch ──→ runbook-composition-test
                                       ↓                          ↓
extend-dispatch-eligibility-office-jurisdiction ──┬─→ implement-incumbency-verification-rule
                                                  └─→ emit-ultra-vires-witnesses
                                                                   ↓
migrate-charter-to-norm-records ──→ charter-violation-detection-rules ──→ charter-binding-disqualification
                                                                                       ↓
confirm-projector-rebuilds-store ──→ test-mid-tick-skill-authorship ──→ document-as-substrate-norm
                                                                                       ↓
                                                          extend-on-complete-to-learning ──→ wire-into-consolidation ──→ end-to-end-test
```

The end-to-end test is the load-bearing acceptance gate.

## Milestone cells

All five milestone-cells must reach $\mathbf{t}$ for plan completion.
The end-to-end test (`test-end-to-end-work-n-produces-skill-for-work-n-plus-one`) is what validates the joint settlement; tests for individual goals validate per-goal partial settlement.

## Defeasibility

Normative-residue audit happens at plan completion (per `normative-cleanup: required`).
A duty-cell that hasn't discharged cleanly produces a [finding](../findings/_index.md); the finding's [adjustment](../adjustments/_index.md) names the steps to discharge or formally release the duty.

Plan abandonment with un-discharged duties is itself a charter-clause violation (no abandonment without discharge or witnessed release) and triggers an ultra-vires witness.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition; particularly the normative-residue corollary.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion as the meet of milestone cells AND the normative-cleanup cell.
- [Charter-as-closure-system](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md) — what M5 makes operational.
