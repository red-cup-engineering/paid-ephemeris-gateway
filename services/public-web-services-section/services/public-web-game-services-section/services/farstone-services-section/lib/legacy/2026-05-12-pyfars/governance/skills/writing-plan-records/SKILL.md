---
name: "Writing plan records"
description: "Creates a plan record in work/plans/ that sequences a milestone's tasks via dependency-DAG and milestone-cells. Use after the milestone's goal records exist and the captain has approved committing the milestone to plan-fidelity (typically when its horizon advances to `soon`)."
---


## Requirements

- Parent milestone record exists in [`work/milestones/`](../../work/milestones/) with goals enumerated
- Goal records for the milestone exist in [`work/goals/`](../../work/goals/) with theory-grounding and design-constraints
- The milestone's `horizon:` cell is `soon` or `doing` (per [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md), don't author plans for `later` or `captured` work)
- Tasks belonging to the plan have been identified at slug-level (records may not yet all exist; the plan can predate task records)

## Steps

1. **Identify the slug** as `ship-<milestone-slug>` (convention from existing plans like [`ship-m7-outbound-endpoints`](../../work/plans/ship-m7-outbound-endpoints.md)).

2. **Author frontmatter** with these required cells:
   - `title:` — link-back to the milestone record using a markdown link per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)
   - `type: plan`, `slug:`, `status: planning` (or `executing` once tasks begin)
   - `milestone:` — slug of parent milestone (substrate reference, not display string)
   - `tasks:` — flat list of task-slugs the plan sequences
   - `dependency-order:` — list of `[predecessor, successor]` pairs forming the DAG
   - `milestone-cells:` — quoted list of bilattice-valued claims the plan will settle (e.g., `"(boundary-records, with-handedness-coordinate, true) = T"`); these are the cells whose settlement *is* the plan's completion
   - `theory-basis:` — at least one theory slug grounding the plan's structural choices

3. **Author the body** with these sections:
   - **Overview** — one paragraph on what the plan delivers when complete; cite the milestone record
   - **Dependency-DAG** — visualization of the task DAG (text or mermaid); explains foundational tasks vs. dependent ones
   - **Milestone-cells settled** — list of substrate cells whose values change when the plan completes; cross-reference each cell to the goal record motivating it
   - **Risks and gates** — what could block plan completion (theory gap, captain decision needed, prerequisite milestone not shipped); cite the duties that would fire if blocked

4. **Add the plan slug to the parent milestone record** under a `plan:` cell in the milestone's frontmatter.

5. **Validate cycle-freedom** of the `dependency-order:` DAG before committing — a cycle is a fidelity-violation and a plan-authoring error.

6. **Witness** the plan's authorship via a finding under [`work/findings/`](../../work/findings/_index.md) if the plan is part of a roadmap-enrichment application; otherwise the plan record itself is the witness.

## Outcomes

A new file in [`work/plans/`](../../work/plans/) with `type: plan`, slug `ship-<milestone-slug>`, dependency-DAG, and milestone-cells.
Parent milestone record references it via a `plan:` frontmatter cell.
The plan is dispatchable: heartbeat-driven dispatch can read the DAG and identify the active task frontier per [dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md).

## Discipline notes

- **Plans are not project schedules.** A plan record carries DAG dependencies, not Gantt-chart timelines or due-dates.
  Time-ordering belongs in the `horizon:` cell of constituent tasks, not in the plan itself.
- **Plans don't duplicate goal content.** Each goal carries its theory-grounding and design-constraints; the plan references goals by slug and explains *only* the cross-goal sequencing logic.
  Duplication is a substrate-purity violation.
- **A milestone may not need a plan record.** If the milestone has one or two goals each with one or two tasks and no cross-goal dependencies, plan-fidelity is unnecessary; jump from goals directly to tasks.
  Per the [fidelity-level](../../concepts/fidelity-level.md) ladder, plan-fidelity is *available*, not *required*.
