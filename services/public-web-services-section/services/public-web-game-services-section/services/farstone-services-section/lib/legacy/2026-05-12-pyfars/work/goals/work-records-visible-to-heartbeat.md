---
title: "Work records visible to heartbeat"
type: goal
milestone: m1-operational-housekeeping
status: completed
date-completed: "2026-05-08"
horizon: doing
theory-basis: [task-cell-system, dispatch-readiness, operations-loop]
tasks:
  - fix-task-field-for-heartbeat-discovery
---


**Status: completed.** The lifecycle's tick walks the substrate every tick via `runtime.dispatch_graph.load_store_node`, which uses `substrate.projector.compound.extract_tree(root)` to lift every cell from disk into a `pypredcalc.
PredicationStore`.
Workitems are identified by `type: task` or `type: workitem` cells (per `WORKITEM_TYPES` in `runtime/eligibility_rules.py`).
Records under `work/tasks/` whose frontmatter declares `type: task` are projected into cells and become visible to dispatch on the next tick.

## Realized via

- `substrate/projector/compound.extract_tree(root)` — walks every regular file under `root`, dispatches to atomic projectors by extension.
  The markdown projector emits `(subject, key, value) = T` cells for every frontmatter `(key, value)` pair.
- `runtime/eligibility_rules.
  WORKITEM_TYPES = frozenset({"task", "workitem"})` — workitem identification.
- `runtime/dispatch_graph._subjects_of_type(store, WORKITEM_TYPES)` — picks workitem subjects out of the loaded store for eligibility rule grounding.

## Theory grounding (preserved)

Per PredWork's task cell system, a task's initial valuation includes `requires-capability` cells; these are only meaningful if the substrate scan locates the task record.
Realization: the projector framework lifts every workitem record's frontmatter into cells before the closure-rule system runs, so requirements and provisions are present in the store when subset-cover and disqualification rules fire.

## Acceptance (all met)

- [x] The substrate scan returns workitems from `work/tasks/` and any other location for any record with `type: task` or `type: workitem` in frontmatter.
- [x] Task records use `type: task` in frontmatter (per `conventions.md`); `kind:` is an optional sub-classification.
- [x] The lifecycle's tick selects workitems without error.
