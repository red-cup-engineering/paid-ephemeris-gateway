---
title: "Work item paths from profile"
type: goal
milestone: m1-operational-housekeeping
status: superseded
date-superseded: "2026-05-08"
horizon: doing
theory-basis: [operations-loop, task-cell-system, normative-operational-layering]
tasks:
  - normalize-work-item-write-paths
---


**Status: superseded.** The original problem — `cli/work/_emit.py`'s `write_workitem()` / `write_spoke_event()` writing markdown records to a hardcoded path under a discovered `.pyfars/`, plus `cli/work/heartbeat.py`'s `DEFAULT_TASK_DIR` constant — was dissolved by the May 2026 refactor:

1. **The CLI was stripped to lifecycle-only** (`pyfars run / install / clean / help`).
  All `cli/work/*` modules including `_emit.py` and `heartbeat.py` were removed; the engine no longer writes markdown workitem-record files at all.
2. **JSONL is canonical for operational state** (per `governance/decisions/event-log-is-jsonl.md`).
  The engine's event log is the substrate-shaped record of operational events, written to `<substrate-root>/.pyfars/event-log/<YYYY-MM-DD>.jsonl` by `runtime/event_log.py`.
  The path is root-relative; the root is supplied by the operator via `pyfars run <root>`, with no need for a hardcoded constant.
3. **Markdown workitem records remain authored content** under `work/tasks/` etc. They are written by humans/agents, not auto-emitted by pyfars; the projector framework reads them via `substrate.projector.compound.extract_tree(root)` each tick.

The original goal's core concern — that paths shouldn't be hardcoded source constants — is satisfied by the new architecture's substrate-root parameterization.
The associated task `normalize-work-item-write-paths` is also superseded.

## Theory grounding (preserved)

Per `event-log-is-jsonl`: the JSONL event log is canonical for runtime operational state.
The new engine writes to a root-relative event log; markdown projections remain authored content.
