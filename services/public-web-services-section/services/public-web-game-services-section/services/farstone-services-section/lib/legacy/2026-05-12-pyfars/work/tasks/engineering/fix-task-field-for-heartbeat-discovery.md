---
title: Fix task record field so heartbeat can find work records
type: task
area: engineering
status: completed
horizon: doing
milestone: m1-operational-housekeeping
goal: work-records-visible-to-heartbeat
depends-on: []
requires-capability:
- corpus-editing
- python-editing
theory-basis:
- task-cell-system
- dispatch-readiness
completed-at: '2026-05-07T07:31:28Z'
---


**Status: completed.** `type: task` is now the canonical workitem-discovery field (per `runtime/eligibility_rules.
WORKITEM_TYPES = frozenset({"task", "workitem"})`).
The earlier convention mismatch (`kind: task` vs `type: task`) was resolved in favor of `type:` as the substrate's canonical record classifier, aligning with `INTERNAL_FIELDS` in `convention.py`.
`kind:` remains available as an optional sub-classification field.

## Realized via

- `runtime/eligibility_rules.
  WORKITEM_TYPES` — the canonical set the dispatch graph reads.
- `substrate/projector/markdown_frontmatter.py` — projects every frontmatter `(key, value)` pair into a cell, including `type:` cells the eligibility rules read.
- `runtime/dispatch_graph._subjects_of_type(store, WORKITEM_TYPES)` — picks workitem subjects from the loaded store.

## Acceptance (all met)

- [x] The substrate scan returns the task records under `work/tasks/`.
- [x] All existing task records have `type: task` in frontmatter.
- [x] `conventions.md` specifies `type: task` as the canonical workitem field.
- [x] The lifecycle's tick selects workitems without error.
