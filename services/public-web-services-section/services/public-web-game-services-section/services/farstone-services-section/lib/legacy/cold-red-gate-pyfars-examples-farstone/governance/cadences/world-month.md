---
type: cadence
kind: world
title: "World-month"
period-resolution: gregorian-month-roll
boundary-at: first-instant-of-month
timezone: polity-fixed-mainland
current-cycle-began-at: "2026-05-01T00:00:00+00:00"
current-cycle-ends-at:  "2026-06-01T00:00:00+00:00"
current-month-name: may
cycle-#: 0
status: active
---


A calendar-month cadence — fires when the world-clock crosses the first instant of the next month.
Months align with the standard Gregorian calendar; period is variable (28–31 sim-days), resolved by reading `(world-calendar, month, ?)
` to detect a month-roll and writing the next month's first-instant into `current-cycle-ends-at`.

Pulse subscribers declare `pulses-on: [world-month]`.
The canonical example is the finance director, whose monthly reconciliation duty under Charter Article I C2 is the substrate of record for budget claims.

At the default `sim-seconds-per-heartbeat: 60`, one sim-month takes ~36 real hours.
