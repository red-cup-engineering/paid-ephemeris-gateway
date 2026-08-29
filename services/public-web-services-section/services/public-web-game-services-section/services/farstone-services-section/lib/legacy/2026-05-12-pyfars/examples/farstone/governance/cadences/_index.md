---
type: index
status: open

contents:
  - slug: heartbeat
    kind: engine
    real-period-seconds: 3
  - slug: world-second
    kind: world
    sim-seconds-per-heartbeat: 60
  - slug: world-minute
    kind: world
    sim-seconds-per-cycle: 60
  - slug: world-hour
    kind: world
    sim-minutes-per-cycle: 60
  - slug: world-day
    kind: world
    sim-hours-per-cycle: 24
  - slug: world-week
    kind: world
    sim-days-per-cycle: 7
  - slug: world-month
    kind: world
    period-resolution: gregorian-month-roll
  - slug: world-season
    kind: world
    period-resolution: astronomical-equinox-or-solstice
  - slug: world-year
    kind: world
    sim-days-per-cycle: 365.25

cadence-boundary-detection-rule: world-cadence-boundary-detection
pulse-subscription-cell: pulses-on
---

# Farstone cadences

Substrate-resident [cadences](../../../../concepts/cadence.md) — Farstone's named rhythms.
Two kinds:

- **Engine cadence** — driven by the host engine's tick.
  Only `heartbeat`.
  Every other tick-driven motion is downstream of it.
- **World cadences** — Farstone's in-fiction rhythms.
  Each is *derived* from the world-clock cell by [`world-cadence-boundary-detection`](../../objects/world-cadence-boundary-detection.md); their cycle-boundaries fire only when the world-clock crosses the boundary.

This split matches `concepts/heartbeat.md`: the heartbeat tick is a trigger, not a time event.
Farstone's notion of *now* is the world-clock cell; world-cadences index that cell, not the engine's tick counter.

Agents declare which cadences they pulse on via a `pulses-on:` cell in their record.
Dispatch reads the subscription; when a world-cadence boundary fires, dispatch enqueues a pulse for each subscriber.
