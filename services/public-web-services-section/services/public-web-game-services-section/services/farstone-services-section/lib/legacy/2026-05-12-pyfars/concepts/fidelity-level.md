---
type: concept
depends-on: [plan, work-record, dispatch-readiness]
see-also: [roadmap-enrichment, dispatch, formality-layer]
---

# Fidelity level

The structural-decomposition rung at which a piece of work is currently encoded in the substrate.
Fidelity ranges from **roadmap-sketch** (a paragraph of prose) at the lowest rung to **task-record-with-progress-cells** at the highest, with intermediate rungs for milestone records, goal records, and plan records.

## What fidelity-level pins down

Work in PyFARS is encoded across multiple rungs of structural decomposition simultaneously.
A milestone exists at *milestone fidelity* (one record summarizing what the milestone delivers and why); the same work also exists at *goal fidelity* (records for each deliverable axis); at *plan fidelity* (a record sequencing the goal's tasks via dependency-DAG); at *task fidelity* (records each enacting a single-sitting unit of execution).
Each rung carries different cells, different dispatch behavior, different theory-grounding requirements.

Fidelity-level names *which rung* a given piece of work currently has reached.
It is a property of the work's *substrate representation*, not of the work itself.

## The fidelity ladder

| Rung | Form | Cells settled |
|---|---|---|
| **Sketch** | One paragraph in [`work/milestones/roadmap.md`](../work/milestones/roadmap.md) | Title, brief description |
| **Milestone-record** | File at `work/milestones/<slug>.md` | `theory-basis`, goals listed, "what this does NOT claim" |
| **Goal-record** | File at `work/goals/<slug>.md` | `milestone`, `theory-basis`, design-constraints, `tasks: []` |
| **Plan-record** | File at `work/plans/<slug>.md` | `milestone-cells`, dependency-DAG, slug-listed tasks |
| **Task-record** | File at `work/tasks/<area>/<slug>.md` | `goal`, `depends-on`, `requires-capabilities`, acceptance criteria |
| **Sub-task-record** | File at `work/tasks/<area>/<slug>.md` with parent task linkage | All of the above plus `parent-task` |

Each rung **structurally subsumes** the rung below: a goal record references one or more task slugs; a plan record references the task slugs it sequences; a milestone record references its goals.

## Fidelity is monotonic in time but not in scope

Once authored, a fidelity-rung doesn't disappear: a milestone with goal-records doesn't lose them.
But fidelity *grows* — the milestone gains goal-records first, then plan-records and task-records as work approaches dispatch.

Fidelity-rungs are not all required: a small milestone may skip the plan rung if the dependency structure is trivial; a goal with one task may not need a plan; a task without sub-tasks doesn't fabricate them.
The ladder is *available rungs*, not *required rungs*.

## Position relative to roadmap-enrichment

The [roadmap-enrichment](roadmap-enrichment.md) is the *discipline* that fidelity grows in lockstep with the work's `horizon:` cell shrinking.
Without enrichment, fidelity grows ad-hoc: some near work has no task records, some far work has 30 of them.
With enrichment, fidelity grows monotonically with horizon-shrink, and *only* with horizon-shrink — never beyond.

Enrichment and fidelity-level are paired: enrichment is the *operation*, fidelity-level is the *state* the operation acts on.
A fidelity-violation is detected by checking fidelity-level against horizon, per the [roadmap-enrichment](roadmap-enrichment.md)'s required-fidelity-by-horizon table.

## Position relative to formality-layer

Fidelity-level is the *planning* analog of [formality-layer](../governance/conventions.md) (F1 prose → F2 structured → F3 algebraic).
Both ladder upward as work matures from informal sketch to the system-checkable form.
The two are independent axes: a goal at goal-fidelity may carry F1 prose constraints; the same goal at task-fidelity may carry F3 algebraic acceptance gates.
A typical cascade-step raises fidelity *and* sometimes raises formality, but not necessarily together.

## What fidelity-level is not

- *Not a measure of work-progress.* A task at task-fidelity may have zero progress cells settled (just-authored) or all cells settled (complete).
  Fidelity is about *encoding-depth*, not *completion*.
- *Not a quality measure.* A milestone at milestone-fidelity may be excellent or poor; fidelity does not adjudicate.
- *Not a dispatch-readiness measure.* [Dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md) is the *separate* concept that asks whether a task's `depends-on` are satisfied and `requires-capabilities` are available.
  A task at task-fidelity may still be unready for dispatch.
