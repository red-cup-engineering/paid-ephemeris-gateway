---
title: "Maintain roadmap-enrichment discipline"
type: jural-relation
kind: duty
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: encode-or-modify-planning-record-or-extend-roadmap
triggering-powers:
  - create-milestone-record
  - create-goal-record
  - create-plan-record
  - create-task-record
  - promote-task-horizon
  - extend-roadmap-with-future-arc-milestone
required-action: ensure-fidelity-matches-horizon-and-roadmap-reach-tracks-promotion
enforcement: substrate-violation
stronger-than: derive-from-theory-before-planning
rule-type: N→N
theory-basis: [roadmap-enrichment, fidelity-level, recurrent-practice]
---


When the records officer creates or modifies any planning record (milestone, goal, plan, task), it MUST ensure that the planning record's [fidelity-level](../../concepts/fidelity-level.md) matches the work's `horizon:` cell per the [roadmap-enrichment](../../concepts/roadmap-enrichment.md) concept's required-fidelity table.
Additionally, when an enrichment cycle promotes any milestone to `soon` or `doing`, the records officer MUST ask the [extension question](../../concepts/roadmap-enrichment.md) — *what far-future work has the cycle made authorable?* — and either author or document the extension.

A milestone at `horizon: doing` whose tasks lack records is **fidelity-violating** and a duty breach.
A milestone at `horizon: captured` with full plan-and-task fidelity is **fidelity-overspent** and is also a duty breach (premature commitment to detail).
A roadmap whose reach has not grown for ≥3 cycles despite mid-arc promotions is **reach-stagnant** — also a duty breach (the substrate's representation of *what is becoming possible* has stopped tracking what *is* becoming possible).

This duty is stricter than [`derive-from-theory-before-planning`](derive-from-theory-before-planning.md).
The general duty requires theory-grounding for any milestone or goal record.
This one requires that the *complete suite of fidelity-rungs* matches the work's horizon AND the roadmap's reach grows in step with promotion.

This duty governs *integration-stage discipline* only — fidelity matching, reach growth, structural completeness of planning records.
The *upstream cycle stages* (question selection, research, claim-authoring, objects/morphisms-authoring) are governed separately by [`run-full-cycle-not-just-integration`](run-full-cycle-not-just-integration.md), held by the [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md).
When the records officer integrates content commissioned by a cycle, both duties are active: this one governs *how* the integration is done; the other governs *whether the upstream stages were done at all*.
Integration of content with no originating claim is an absorption-not-derivation move that puts both duties under tension.

## Required action

When creating or modifying a planning record (promotion pass):

1. **Identify the work's current horizon** from the milestone-record's frontmatter (or, if no milestone-record exists, from the [roadmap](../../work/milestones/roadmap.md)).
2. **Identify required fidelity** per the [roadmap-enrichment](../../concepts/roadmap-enrichment.md) concept's table:
   - `doing` → tasks have records, depends-on satisfied, acceptance specific
   - `soon` → plan with DAG exists; tasks slug-listed; foundational tasks have records
   - `later` → milestone record with goals enumerated; goal records with theory-grounding
   - `captured` → sketch in roadmap or milestone record without goals decomposed
3. **Author missing fidelity-rungs**, OR — if blocked by missing theory or captain-decision — file a finding and pause enrichment for that milestone.
4. **Do not over-author**: if the work's horizon is `captured` or `later`, do not write task records.
  Premature commitment to task-fidelity wastes effort and dies on first contact with prerequisite milestones.

When any milestone advances to `soon` or `doing` in a cycle (extension pass):

5. **Ask the extension question**: what far-future work has this advance made authorable?
  Apply the three diagnostic patterns from [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md) §"Extension pass" — prerequisite-discharged extension, question-cluster extension, substrate-realization extension.
6. **For each candidate**, author at the right fidelity (sketch in roadmap or full milestone-record; per [`authoring-future-arc-milestone-records`](../skills/authoring-future-arc-milestone-records.md)).
7. **If no extension is warranted** (e.g., the cycle's promotion was small and didn't open new reach), record the negative observation in the cycle's witnessing finding.
  A cycle that does no extension *and* does not record why is a reach-stagnation contributor.

## Why stricter

Without enrichment-discipline, the substrate's representation of work drifts in three ways: distant milestones get over-detailed (waste); near milestones get under-detailed (un-dispatchable); the roadmap stops growing (reach-truncation).
This is a [substrate-purity violation](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md): the substrate carries representation that does not match its claim of work-state-and-horizon.

Worse: dispatch reads the active task frontier per [dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md).
An enrichment-violating substrate produces dispatch decisions that look settled but resolve to half-formed work.
This couples enrichment-discipline directly to runtime correctness.
And: a reach-stagnant roadmap means the polity loses track of what is becoming possible — *strategic* drift on top of operational drift.

## Enforcement

Pre-M5: manual.
The records officer applies the [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md) skill at session boundaries and emits a [`work/findings/`](../../work/findings/_index.md) record (slug pattern `roadmap-enrichment-cycle-<YYYY-MM-DD>`) listing fidelity-violations resolved, extensions authored, and any deferred observations.
Legacy findings authored before the rename use slug pattern `cascade-application-<YYYY-MM-DD>` — both are valid history.

Post-M5: the closure rule system can audit enrichment-discipline by checking that for every `kind: milestone` record, the count of authored goal/plan/task records matches the milestone's `horizon:` cell, AND that the roadmap's reach growth-rate (across the last N cycles' findings) is non-zero when at least one milestone advanced.
Mismatches emit `fidelity-violation` and `reach-stagnation` diagnostics.
The [`pyfars audit-roadmap`](../../tools/) tool (planned per [`implement-pyfars-audit-roadmap-verb`](../../work/tasks/engineering/implement-pyfars-audit-roadmap-verb.md)) automates this audit.
