---
title: "Promote task horizon"
type: jural-relation
kind: power
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: modify-file
scope: work/tasks/
duties: [maintain-roadmap-enrichment-discipline]
enables-skills: [promoting-task-horizons]
theory-basis: [roadmap-enrichment, dispatch-readiness, jural-relation]
---


Admits the holder to advance a task's `horizon:` cell along the cascade ladder (`captured` → `later` → `soon` → `doing`).
Distinct from the broader [`modify-work-record`](modify-work-record.md) power: this power's scope is *only* the `horizon:` frontmatter cell, and its exercise is gated by cascade-discipline checks (depends-on satisfaction, capability availability, parent-milestone horizon).

The narrower scope makes promotions auditable as their own substrate event class.
A bulk `modify-work-record` action that incidentally changes `horizon:` is not a horizon-promotion; only an explicit exercise of this power, with the [`promoting-task-horizons`](../skills/promoting-task-horizons.md) skill applied, counts.

## Attached duties

- [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) — verify cascade rules before promotion: parent milestone's horizon, depends-on satisfaction, capability availability.

## Does not require

- [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md) — promotion does not author new theory-grounding; the task's existing `theory-basis:` (inherited from the goal) is unaffected.

## Enables

- Skill: [`promoting-task-horizons`](../skills/promoting-task-horizons.md)

## Relationship to demotion

Demotion (advancing in the reverse direction, e.g., `doing` → `soon`) is also exercised through this power.
The [`promoting-task-horizons`](../skills/promoting-task-horizons.md) skill's discipline notes cover demotion mechanics.
Both directions update the task's progress cells with a witness line.
