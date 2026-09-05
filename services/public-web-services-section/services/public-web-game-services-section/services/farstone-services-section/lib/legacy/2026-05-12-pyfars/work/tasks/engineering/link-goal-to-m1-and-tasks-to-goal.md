---
title: "Link claude-harness goal to M1 and verify all tasks reference the goal"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: []
requires-capabilities: [substrate-graph-edit]
theory-basis: [substrate-purity]
---


## Description

Per the [`writing-task-records`](../../../governance/skills/writing-task-records.md) skill, step 4: "Add the task slug to the parent goal's `tasks:` list."
The reverse linkage — adding the goal slug to the parent milestone's `goals:` list — is the analogous discipline at the milestone level.
Both directions of the dispatch graph need to be wired, or workitems are not visible to the heartbeat scan.

This task does the graph wiring for the `claude-code-harness-properly-installed` goal:

1. **Goal → milestone** — append `claude-code-harness-properly-installed` to the `goals:` list at the head of `tools/platform/pyfars/work/milestones/m1-operational-housekeeping.md`.
  Add a row to the M1 milestone's "Goals" table giving the goal's one-liner and current status.
2. **Tasks → goal** — verify each of the eleven other task records authored under this goal carries `goal: claude-code-harness-properly-installed` in frontmatter, and is listed in the goal's `tasks:` array.
  (The goal record was authored with the full `tasks:` list pre-populated; this verification is the cross-check.)
3. **No orphans** — `grep -l 'goal: claude-code-harness-properly-installed' work/tasks/engineering/*.md` should return exactly the set in the goal's `tasks:` array.
  Any difference is a substrate-graph defect.

## Acceptance

- [ ] M1 milestone's `goals:` list includes `claude-code-harness-properly-installed`.
- [ ] M1's "Goals" table includes a row for the new goal with one-liner and status.
- [ ] Every task in `goals/claude-code-harness-properly-installed.md`'s `tasks:` list exists under `work/tasks/engineering/`.
- [ ] The reverse cross-check (grep) returns exactly the same set.
- [ ] `_index.md` files in `work/goals/` and `work/tasks/engineering/` updated if those indices curate explicit lists (current both are kind:index stubs — likely no change needed).

## Progress cells

*(empty — task not yet started)*
