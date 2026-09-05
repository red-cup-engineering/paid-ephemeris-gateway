---
title: "Bind every event-log entry to the active session-id"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: sessions-wrap-each-tick
depends-on: [emit-session-open-and-close-witnesses]
requires-capabilities: [python-editing, event-log-structure]
theory-basis: [session-as-entity, observation-fiber-isolation]
---


## Description

Every JSONL event the lifecycle, dispatch graph, or any other tick-time component writes to the event log carries the active session's id in its envelope.
The session-id lives at the event level (the JSONL line's `session-id` field), not on the events the line describes — fiber-isolation: a dispatch witness has its own fiber, and the cell `(event, in-session, <session-id>) = T` is on the event, not on the dispatchable or workitem the event references.

Implementation: extend `runtime/event_log.py`'s emit function to accept (or read from a thread-local context set at boot) the active session-id and stamp it on every emitted line.

## Acceptance

- [ ] `runtime/event_log.py`'s emission attaches `session-id` to every JSONL line written during a tick.
- [ ] The dispatch graph, lifecycle, and any other tick-time emitter reads from the same context (no separate session-id stamping per emitter).
- [ ] A walker query "all events in session `<id>`" runs in $O(\text{matched events})$ via grep on `session-id` in the event log.
- [ ] Replay determinism preserved: the session-id stamp is replay-stable.
- [ ] Tests cover: boot emits with session-id, dispatch graph emits with session-id, halt emits with session-id; no log entry is missing the field during a normal tick.

## Progress cells

*(empty — task not yet started)*
