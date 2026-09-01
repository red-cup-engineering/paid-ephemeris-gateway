---
title: "Create plan record"
type: jural-relation
kind: power
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: create-file
scope: work/plans/
duties: [consult-predwork-before-encoding, maintain-roadmap-enrichment-discipline, link-to-records-not-shortcodes]
enables-skills: [writing-plan-records]
theory-basis: [jural-relation, plan, dispatch-readiness]
---


Admits the holder to create a new file under [`work/plans/`](../../work/plans/).
Plan records sequence a milestone's tasks via dependency-DAG and milestone-cells; they are intermediate-fidelity between goals and tasks per the [fidelity-level](../../concepts/fidelity-level.md) ladder.

## Attached duties

- [`consult-predwork-before-encoding`](../duties/consult-predwork-before-encoding.md) — verify the plan schema against [conventions](../conventions.md) before writing.
- [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) — only author plans for milestones at `horizon: soon` or `horizon: doing`.
  Authoring a plan for a `captured` or `later` milestone is fidelity-overspent.
- [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md) — plan body and frontmatter cross-references must use markdown links to substrate cells.

## Does not require

- [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md) directly — plans inherit theory-grounding from their parent milestone and constituent goals, not independently.
  The plan's `theory-basis:` field documents the *structural* theory (e.g., dependency-DAG composition) rather than capability-grounding theory, which lives at the goal level.

## Enables

- Skill: [`writing-plan-records`](../skills/writing-plan-records.md)
