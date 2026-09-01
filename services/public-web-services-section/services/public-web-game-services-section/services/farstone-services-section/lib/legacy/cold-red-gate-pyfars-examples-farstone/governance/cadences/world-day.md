---
type: cadence
kind: world
title: "World-day"
sim-hours-per-cycle: 24
sim-seconds-per-cycle: 86400
period-resolution: fixed
boundary-at: midnight
timezone: polity-fixed-mainland
current-cycle-began-at: "2026-05-09T00:00:00+00:00"
current-cycle-ends-at:  "2026-05-10T00:00:00+00:00"
cycle-#: 0
status: active
---


A 24-sim-hour cadence.
World-day boundaries fire when the world-clock crosses local midnight (Farstone uses a single fixed time zone — the mainland's — for all in-fiction timestamps).

The frontmatter cells `current-cycle-began-at`, `current-cycle-ends-at`, `cycle-#` are read-and-written by [`world-cadence-boundary-detection`](../../objects/world-cadence-boundary-detection.md): the rule rewrites the boundaries on each fired boundary, and writes a `cycle-boundary-fired-at` cell as the witness.

Pulse subscribers — agents that should activate once per sim-day — declare `pulses-on: [world-day]` in their frontmatter.

At the default `sim-seconds-per-heartbeat: 60` (3-real-second heartbeat), one sim-day takes 72 real minutes.
