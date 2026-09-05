---
name: "Writing task records"
description: "Creates a task record in work/tasks/<area>/ encoding one concrete single-sitting implementation unit with goal linkage and dispatch fields. Use only after the parent goal record exists."
---


## Requirements

- Parent goal record exists in work/goals/
- Task is a single-sitting unit — not decomposable further

## Steps

1. Check no existing task already covers this work (grep `work/tasks/` for the capability slug or use `analyze.search` against the substrate).
2. Write the file in `work/tasks/<area>/` with frontmatter: `type: task`, `area`, `goal`, `horizon`, `requires-capabilities`.
3. Write the body with exactly three sections: Description, Acceptance (checklist), Progress cells (empty initially).
4. Add the task slug to the parent goal's `tasks:` list.

## Outcomes

A new file in `work/tasks/<area>/` with `type: task` and `requires-capabilities` set, visible to the runtime dispatch graph (per `runtime.eligibility_rules.
WORKITEM_TYPES`).
Parent goal references it.
