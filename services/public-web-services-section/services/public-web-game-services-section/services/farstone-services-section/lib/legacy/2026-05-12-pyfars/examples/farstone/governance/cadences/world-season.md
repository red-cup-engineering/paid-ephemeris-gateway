---
type: cadence
kind: world
title: "World-season"
period-resolution: astronomical-equinox-or-solstice
boundary-at: equinox-or-solstice-instant
timezone: polity-fixed-mainland
current: spring
current-cycle-began-at: "2026-03-20T09:06:00+00:00"
current-cycle-ends-at:  "2026-06-21T02:32:00+00:00"
cycle-#: 0
season-domain: [spring, summer, fall, winter]
status: active
---


Astronomical-season cadence — fires four times per sim-year at the equinoxes and solstices.
Period is variable (~89–93 sim-days); next cycle-end is computed by projecting from current-time to the next astronomical event.

The `current` cell governs growing-season-active, fire-watch base-rate, ferry-schedule (winter has reduced sailings), shellfish-closure default, and other biome-coupled cells.

Pulse subscribers declare `pulses-on: [world-season]` for transition-coupled work (route adjustments, mooring assignments).
Records that need only the current value read the cell directly without subscribing.
