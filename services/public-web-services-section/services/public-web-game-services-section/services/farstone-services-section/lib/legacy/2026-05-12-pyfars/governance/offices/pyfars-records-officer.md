---
title: "PyFARS Records Officer"
type: office
scope: pyfars-governance
action-domain:
  - create-governance-record
  - modify-governance-record
  - create-work-record
  - modify-work-record
  - create-milestone-record
  - create-goal-record
  - create-task-record
  - create-plan-record
  - promote-task-horizon
deontic-profile:
  create-governance-record: power
  modify-governance-record: power
  create-work-record: power
  modify-work-record: power
  create-milestone-record: power
  create-goal-record: power
  create-task-record: power
  create-plan-record: power
  promote-task-horizon: power
provides-skill:
  - consulting-predwork-theory
  - deriving-pyfars-development-goals
  - writing-milestone-records
  - writing-goal-records
  - writing-task-records
  - writing-plan-records
  - applying-roadmap-enrichment
  - promoting-task-horizons
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, roadmap-enrichment]
---


Presides over the creation and maintenance of PyFARS governance and work records.
The records officer has authority to create and modify records under `governance/` and `work/`.

The defining characteristic of this office is that its powers carry a non-trivial duty: the officer may not encode a new record without first consulting existing records AND the PredWork theory stack for improvements to structuration.
This is not courtesy — it is an enforceable constraint on the power to create records.

## Scope

- `governance/` — decisions, conventions, charter, offices, powers, duties
- `work/` — objectives, campaigns, milestones, goals, tasks, references

## Powers held

- [`create-governance-record`](../powers/create-governance-record.md): create a new file under `governance/`
- [`modify-governance-record`](../powers/modify-governance-record.md): edit frontmatter or body of an existing governance record
- [`create-work-record`](../powers/create-work-record.md): create a new file under `work/`
- [`modify-work-record`](../powers/modify-work-record.md): edit frontmatter or body of an existing work record
- [`create-milestone-record`](../powers/create-milestone-record.md): create a milestone record under [`work/milestones/`](../../work/milestones/)
- [`create-goal-record`](../powers/create-goal-record.md): create a goal record under [`work/goals/`](../../work/goals/)
- [`create-task-record`](../powers/create-task-record.md): create a task record under [`work/tasks/`](../../work/tasks/)
- [`create-plan-record`](../powers/create-plan-record.md): create a plan record under [`work/plans/`](../../work/plans/) sequencing a milestone's tasks via dependency-DAG
- [`promote-task-horizon`](../powers/promote-task-horizon.md): advance a task's `horizon:` cell along the cascade ladder (gated by [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md))

## Duties attached

- [`consult-predwork-before-encoding`](../duties/consult-predwork-before-encoding.md) (all create/modify powers): before encoding, complete the theory-derivation review loop
- [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md) (create-milestone-record, create-goal-record): run `deriving-pyfars-development-goals` and collect `theory-basis:` slugs before writing
- [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) (all planning-record powers, plus promote-task-horizon): ensure fidelity-level matches horizon per the [roadmap-enrichment](../../concepts/roadmap-enrichment.md) concept; never over- or under-author at horizon
- [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md) (all planning-record powers): cross-references must use markdown links to substrate cells, not bare shortcodes
- [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md) (create-milestone-record, create-goal-record): include explicit "What X does NOT claim" sections grounded in upstream theorems for milestones and load-bearing goals

## Skills held

- [`consulting-predwork-theory`](../skills/consulting-predwork-theory.md): read and apply PredWork theory to record structuration
- [`deriving-pyfars-development-goals`](../skills/deriving-pyfars-development-goals.md): trace theory → derivation chain → identify implementation gaps → name goals
- [`writing-milestone-records`](../skills/writing-milestone-records.md): create milestone records from derived goal sets
- [`writing-goal-records`](../skills/writing-goal-records.md): create goal records with theory grounding
- [`writing-task-records`](../skills/writing-task-records.md): create task records within a goal
- [`writing-plan-records`](../skills/writing-plan-records.md): create plan records that sequence a milestone's tasks via dependency-DAG and milestone-cells
- [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md): meta-skill — walk the roadmap milestone-by-milestone and promote each milestone's work one fidelity-level closer per session
- [`promoting-task-horizons`](../skills/promoting-task-horizons.md): advance a task's `horizon:` cell when depends-on and capabilities are satisfied

## Boundary with roadmap-enrichment officer

The [`pyfars-roadmap-enrichment-officer`](pyfars-roadmap-enrichment-officer.md) owns the upstream cycle stages (question → research → claim → objects/morphisms).
When that office's cycle reaches stage 5 (integration), it commissions *this* office via [`commission-roadmap-integration`](../powers/) hand-off; the cycle record carries `commissioned-integration:` cells listing roadmap touchpoints.
This office then exercises its own planning-record powers (`create-milestone-record`, `create-goal-record`, etc.) against those touchpoints, with [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) governing fidelity-vs-horizon match.

The boundary: roadmap-enrichment officer authors *substrate-side derivation* (claims, objects, morphisms) under cycles; this office authors *planning records* (milestones, goals, plans, tasks) — typically commissioned by a cycle, optionally standalone for routine maintenance.
Neither office writes the other's record kinds.

## Notes on personnel vs. office

Any agent (human or LLM) that `holds(personnel, pyfars-records-officer)` inherits these powers and duties.
The office is the stable governance entity; personnel change.
Currently the office is held informally by the captain and any engineering agent tasked with records work.
