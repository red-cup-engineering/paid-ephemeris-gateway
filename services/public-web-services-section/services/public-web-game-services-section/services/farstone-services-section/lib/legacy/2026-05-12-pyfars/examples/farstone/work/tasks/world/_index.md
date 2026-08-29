---
type: index
status: open

per-heartbeat-order:
  - kind: workitem
    slug: advance-world-clock
    fires-on: heartbeat
    rationale: must-run-before-any-rule-reading-current-time
  - kind: closure-rule
    slug: world-calendar-derivation
    fires-on: heartbeat
    rationale: pure-projection-of-current-time
  - kind: closure-rule
    slug: world-cadence-boundary-detection
    fires-on: heartbeat
    rationale: detects-cadence-boundaries-from-current-time
  - kind: closure-rule
    slug: tide-derivation
    fires-on: heartbeat
    rationale: pure-projection-cheap-to-recompute
  - kind: closure-rule
    slug: opening-hours-derivation
    fires-on: heartbeat
    rationale: pure-projection-of-current-time-and-day-of-week
  - kind: closure-rule
    slug: weather-roll
    fires-on-cadence-boundary: world-hour
    rationale: weather-changes-on-hour-scale-not-tick-scale

contents:
  - slug: advance-world-clock
    kind: workitem
    subtype: procedure
    recurrence: every-tick
---

# World workitems

Recurring substrate-motion workitems — the tick-coupled work that advances Farstone's environmental cells.
Currently one workitem (the world-clock advance); the rest of the per-heartbeat motion is closure rules that settle automatically.

The `per-heartbeat-order` block declares the deterministic ordering: the world-clock advance must run first (it provides the input every other rule reads); calendar-derivation and cadence-boundary-detection follow; tide and opening-hours fire any time after; weather-roll fires only when its hour-cadence boundary just fired.

## Why workitems for some, closure rules for others

- **Closure rule** when the work is a pure projection of substrate cells.
  The engine settles them automatically — no dispatch, no agent, no skill, no witness about an agent doing work.
- **Workitem** when the work needs an actor — invokes a verb (substrate-mutation), invokes a runbook (composed external action), or makes a choice the substrate alone can't make.

The world-clock advance is a workitem because it mutates the world-clock cell, and substrate-mutation always routes through a verb invocation under an authorized actor — the verb call is the auditable substrate transition.
