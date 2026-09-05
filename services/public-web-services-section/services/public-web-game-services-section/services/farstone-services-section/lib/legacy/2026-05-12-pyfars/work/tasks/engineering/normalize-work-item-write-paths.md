---
title: "Normalize work-item write paths"
type: task
area: engineering
status: superseded
date-superseded: "2026-05-08"
horizon: doing
milestone: m1-operational-housekeeping
goal: work-item-paths-from-profile
depends-on: []
requires-capability: [python-editing]
theory-basis: [operations-loop, task-cell-system]
---


**Status: superseded.** The original target — `cli/work/_emit.py`'s `write_workitem()` / `write_spoke_event()` and `cli/work/heartbeat.py`'s `DEFAULT_TASK_DIR` constant — was dissolved by the May 2026 refactor when the CLI was stripped to lifecycle-only and the entire `cli/work/*` tree was removed.

The new architecture parameterizes paths off the substrate root supplied by `pyfars run <root>`:

- The event log writes to `<root>/.pyfars/event-log/<YYYY-MM-DD>.jsonl` per `runtime/event_log.py`.
- The profile loads `<root>/.pyfars/config.toml` per `runtime/profile.py`.
- The dispatch graph reads the substrate from `<root>` via the projector framework each tick.

There is no `write_workitem` function to refactor — the engine doesn't auto-emit markdown workitem records.
JSONL is canonical for operational events (per `governance/decisions/event-log-is-jsonl.md`); markdown workitem records remain authored content.
