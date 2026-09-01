---
title: "Event log is JSONL"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [witness-as-increment, operations-settling]
---


## What

The PyFARS event log is an append-only JSONL file at `<substrate-root>/.pyfars/event-log/<YYYY-MM-DD>.jsonl` (one JSON object per line).
All runtime events — clock ticks, rule firings, agent invocations, service start/stop, session boundaries, observations — are written to this log by `runtime/event_log.py`.
Markdown files are projections *from* the log or from the theory corpus, never the primary record of runtime state.

## Why

The FARS spec's `event-sourcing` concept requires that every state change be recorded as an immutable event; the substrate's current state is the fold of those events.
JSONL is the simplest format that satisfies:

- Append-only write (no rewrite of existing lines)
- Line-delimited parsing without holding the full file in memory
- Direct mapping to the FARS `Event` object's fields (entity, predicate, value, truth, evidence, at, witness, channel, origin)
- Machine-readable without a parser round-trip (unlike markdown frontmatter)

`runtime/event_log.py` implements JSONL emission.
The dual-write anti-pattern that violated this decision (the earlier `cli/work/_emit.py`'s `write_workitem` writing markdown workitem files as if those were the source of truth) was removed when the CLI was stripped to lifecycle-only in the May 2026 refactor.
The engine no longer auto-emits markdown workitem records; operational state lives in the JSONL log, with markdown projections optional and derived.

## Rules out

- Writing execution events, assignment records, observation records, or rate-limit observations as primary markdown files.
  These must be written first to the JSONL event log; markdown projections are derived views.
- Reintroducing helpers like `write_workitem` that emit markdown as the canonical record.
- Splitting the event log into per-task or per-agent files.
  One JSONL log per substrate, with channel/origin fields for filtering.
  The current daily-rotation (`<YYYY-MM-DD>.jsonl`) is admissible because each segment is append-only during its active period.

## Does not constrain

- Whether markdown projections exist at all.
  Projections are useful for human readability and for corpus queries; they just aren't primary state.
- The internal format of the `value` field in an event — it's a JSON object, structure is per-event-kind.
- Whether the log is rotated.
  Log rotation (by date or size) is admissible; each rotation segment remains append-only during its active period.
