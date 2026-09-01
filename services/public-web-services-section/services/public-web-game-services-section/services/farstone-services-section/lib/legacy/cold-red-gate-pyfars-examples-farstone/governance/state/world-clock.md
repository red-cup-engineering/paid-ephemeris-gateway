---
type: world-clock
title: "Farstone world-clock"
status: active

current-time: "2026-05-09T08:00:00+00:00"
sim-seconds-per-heartbeat: 60
last-advanced-at-tick: 0

cell-shape:
  - subject: world-clock
    predicate: current-time
    domain: timestamp-iso8601
  - subject: world-clock
    predicate: sim-seconds-per-heartbeat
    domain: integer-positive
  - subject: world-clock
    predicate: last-advanced-at-tick
    domain: integer

written-by-skill: advancing-world-clock
written-by-workitem: advance-world-clock
read-by-rules:
  - world-calendar-derivation
  - world-cadence-boundary-detection
  - tide-derivation
  - opening-hours-derivation
  - weather-roll
---


The polity's notion of *now*.
Substrate-resident; mutated each engine [`heartbeat`](../cadences/heartbeat.md) by the [`advancing-world-clock`](../skills/advancing-world-clock.md) skill, dispatched as the recurring workitem [`advance-world-clock`](../../work/tasks/world/advance-world-clock.md).

The frontmatter declares the current values, the cell-shape projection contract, and the explicit reverse index — which skill writes the cells, and which closure rules read them.
That makes a one-pass enumerator possible: a script can read this record and know everything that touches the world-clock without scanning the whole substrate.

The world-clock is a state cell, not a cadence — the [`world-second`](../cadences/world-second.md) cadence governs how the cell advances; the [`world-day`](../cadences/world-day.md), [`world-month`](../cadences/world-month.md), [`world-season`](../cadences/world-season.md) cadences are derived from it.
