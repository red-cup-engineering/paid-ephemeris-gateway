---
title: "Emit session-open and session-close witnesses in the lifecycle"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: sessions-wrap-each-tick
depends-on: [author-session-record-type]
requires-capabilities: [python-editing, langgraph-state-machines]
theory-basis: [session-as-entity, tick-as-iteration]
---


## Description

Extend `runtime/lifecycle.py` so that:

- The **boot** phase, after substrate projection completes, emits a `(session, is-a, session) = T` record at the configured session location with a content-derived `session-id`.
  The content-derivation must be replay-stable: the same boot context (substrate snapshot hash + boot timestamp truncated to the tick boundary) produces the same session-id.
- The **halt** phase, before final witness emission, closes the session: writes `(session, closed-at, <ts>) = T`, plus aggregate counts (`dispatch-count`, `observation-count`, `agents-active` derived by walking the tick's emitted events).

Existing tick-witness emission stays unchanged in shape; new cells just get added.

## Acceptance

- [ ] `runtime/lifecycle.py` has `boot_node` writing the session record at boot.
- [ ] `runtime/lifecycle.py` has `halt_node` updating the session record with close-time aggregates before final tick-witness.
- [ ] Replay test: same event log replayed produces the same session-id (content-stable derivation, not wall-clock).
- [ ] A halted-mid-tick crash does not leave a session "half-closed" in a way replay can't recover — the session-close cells are emitted by the halt phase OR the next boot detects the missing close and emits a `(session, terminated-uncleanly, true) = T` cell to mark it.
- [ ] Tests cover boot-emit, halt-close-clean, halt-close-after-crash-recovery.

## Progress cells

*(empty — task not yet started)*
