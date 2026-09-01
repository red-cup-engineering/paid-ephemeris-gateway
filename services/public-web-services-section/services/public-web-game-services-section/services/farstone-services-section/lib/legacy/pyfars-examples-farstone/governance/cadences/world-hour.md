---
description: "The world-hour cadence — the hour-boundary cycle of Farston's simulated world clock, on which weather rolls."
keywords: ["governance", "farstone", "polity", "municipal", "council-manager", "prior-art", "cadence"]
type: cadence
kind: world
title: "World-hour"
sim-minutes-per-cycle: 60
sim-seconds-per-cycle: 3600
period-resolution: fixed
boundary-at: hour-boundary
current-cycle-began-at: "2026-05-09T08:00:00+00:00"
current-cycle-ends-at:  "2026-05-09T09:00:00+00:00"
cycle-#: 0
status: active
---


A 60-sim-minute cadence.
The cadence the [`weather-roll`](../../objects/weather-roll.md) closure rule fires on — once per world-hour, the weather Markov chain advances.
No agent currently subscribes via `pulses-on:`, but a future urgent-care arc may want hour-resolution clinic intake projections.
