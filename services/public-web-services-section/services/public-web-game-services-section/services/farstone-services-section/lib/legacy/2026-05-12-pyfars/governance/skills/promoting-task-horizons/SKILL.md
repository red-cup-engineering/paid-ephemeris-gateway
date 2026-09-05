---
name: "Promoting task horizons"
description: "Advances a task's `horizon:` cell from `later` → `soon` → `doing` when its `depends-on` are satisfied and required-capabilities are available. Use during a roadmap-enrichment application or when a prerequisite task completes and unblocks dependents."
---


## Requirements

- Task record exists in [`work/tasks/<area>/`](../../work/tasks/) with `horizon:` cell set
- Task's `depends-on:` list is readable; each prerequisite task's status is known
- Task's `requires-capabilities:` list is readable; capability availability is known
- The [roadmap-enrichment](../../concepts/roadmap-enrichment.md) concept is understood

## Steps

1. **Read the task record** to capture: current `horizon:`, `depends-on:`, `requires-capabilities:`, parent goal, parent milestone.

2. **Check parent milestone's horizon.** A task cannot be at higher horizon than its parent milestone:
   - If milestone is `captured`, task may not exceed `captured`.
   - If milestone is `later`, task may not exceed `later`.
   - If milestone is `soon`, task may be `soon` or below.
   - If milestone is `doing`, task may be `doing` or below.

If the proposed promotion would violate this, **escalate**: either the milestone itself needs to advance first (apply [`applying-roadmap-enrichment`](applying-roadmap-enrichment.md) at the milestone level), or the promotion is premature.

3. **Check `depends-on` satisfaction:**
   - For each predecessor task, confirm `status: completed` (or equivalent terminal status).
   - If any predecessor is incomplete, the task **cannot** be promoted to `doing`.
     It may still be promoted from `captured` to `later` or `later` to `soon` if other criteria are met.

4. **Check `requires-capabilities` availability:**
   - For each required capability, confirm an incumbent or office provides it (cross-reference [`governance/incumbents/`](../incumbents/) and [`governance/offices/`](../offices/)).
   - If a capability is missing, the task **cannot** be promoted to `doing`.
     File a finding noting the gap and which incumbent/office is needed.

5. **Determine the target horizon** per the cascade rules:
   - `captured` → `later` when the parent goal exists and is grounded
   - `later` → `soon` when the parent plan exists and the task is in its `tasks:` list
   - `soon` → `doing` when `depends-on:` are satisfied and capabilities are available

6. **Update the task record** by editing only the `horizon:` cell.
  Do not modify `depends-on:`, `requires-capabilities:`, or the body — promotion is a horizon-cell update, not a content rewrite.

7. **Witness the promotion** by appending a one-line entry to the task's `progress cells` section: `- promoted from <old> to <new> on <date> (cascade application)`.
  This makes the promotion auditable.

8. **Cascade-check the parent goal and milestone** after the promotion: if all of a goal's tasks are now `doing`, consider whether the goal's status cell should advance.
  If all of a milestone's plan-tasks are `doing`, consider whether the milestone's status should advance.

## Outcomes

The task's `horizon:` cell is updated.
The progress-cells section records the promotion with date.
Audit can trace which session promoted which task.
Dispatch's task-frontier computation will now consider the task as candidate for execution (if promoted to `doing`).

## When NOT to promote

- The task's parent milestone has not been advanced — promoting a task above its milestone is a [cascade-discipline](../duties/maintain-roadmap-enrichment-discipline.md) violation.
- Predecessors are incomplete — promoting to `doing` would put substrate in an inconsistent state where a task claims to be active but is in fact blocked.
- Required capability is missing and no incumbent provides it — promoting to `doing` would create an undispatchable active task, polluting the task-frontier.
- The captain has explicitly suspended the milestone or paused the campaign.

## Discipline notes

- **Demotion is rare but legitimate.** If a task at `doing` becomes blocked by an unforeseen dependency, demote it back to `soon` or `later` rather than leaving it active-but-stuck.
  Demotion is also witnessed in progress cells.
- **Bulk-promotion is suspect.** Promoting 30 tasks from `later` to `doing` in one cascade application usually indicates the milestone wasn't actually decomposed into a sequenced plan; reconsider whether plan-fidelity is correct.
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, the witness line in progress cells should reference any related enrichment-cycle finding by markdown link, not by date alone.
