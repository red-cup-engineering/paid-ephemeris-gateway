---
title: "Implement promote.py runner as the consolidation-cycle's settlement step"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: instinct-cells-via-consolidation
depends-on: [author-consolidation-cycle-recurrent-practice-record, bind-observations-to-session-and-dispatchable]
requires-capabilities: [python-editing, settlement-path-operator]
theory-basis: [consolidation-as-settlement, recurrent-practice]
---


## Description

Wire the existing `runtime/promote.py` settlement-path operator to fire on the cadence declared in [`work/recurrent-practices/consolidation-cycle.md`](../../recurrent-practices/consolidation-cycle.md).
The runner reads observation cells emitted since the prior cycle (using the reverse-edge index from [`bind-observations-to-session-and-dispatchable`](bind-observations-to-session-and-dispatchable.md)), groups by `(dispatchable, workitem-class)`, applies the consolidation rule set, and produces the input-set for the instinct emission step.

This task does NOT rewrite `runtime/promote.py`.
It binds the existing operator to the cycle: a thin scheduler that fires it on the right tick boundaries, with the right input set, and routes its output to the instinct-emission step.

The scheduler hook lives in `runtime/lifecycle.py`'s halt phase: at the close of every Nth tick (where N comes from the consolidation-cycle record's `cadence:` field), invoke the consolidation runner before the lifecycle's final witness emission.

## Acceptance

- [ ] `runtime/lifecycle.py`'s halt phase checks whether the current tick closes a consolidation cycle and, if so, invokes the consolidation runner.
- [ ] The runner reads observations via `substrate.query_observations_in(<sessions-since-last-cycle>)` and groups them per the consolidation-cycle record's spec.
- [ ] The runner does NOT modify `runtime/promote.py`; it calls into it.
- [ ] Per-cycle witness emission: `(consolidation-cycle-N, completed-at, <ts>) = T`, `(consolidation-cycle-N, observations-consumed, <count>) = T`, `(consolidation-cycle-N, instincts-emitted, <count>) = T`, `(consolidation-cycle-N, rsv-hash, <hash>) = T`.
- [ ] Tests cover: cycle fires at boundary N, no observations produces no-op witness, observations from multiple sessions group correctly.

## Progress cells

*(empty — task not yet started)*
