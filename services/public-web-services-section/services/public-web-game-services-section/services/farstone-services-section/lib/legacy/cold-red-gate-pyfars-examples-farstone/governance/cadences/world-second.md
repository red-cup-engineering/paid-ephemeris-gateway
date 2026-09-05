---
type: cadence
kind: world
title: "World-second"
sim-seconds-per-heartbeat: 60
period-resolution: per-heartbeat
status: active
---


The finest in-fiction cadence — the unit by which Farstone's [`world-clock`](../state/world-clock.md) advances.
Each engine [`heartbeat`](heartbeat.md), the world-clock's `current-time` cell advances by `sim-seconds-per-heartbeat` sim-seconds (default 60).

At default: 1 real second ↔ 20 sim-seconds; 1 sim-day ↔ 72 real minutes.
Tunable per run by editing the frontmatter cell.
Slower (`3`) ↔ near real-time.
Faster (`1440`) ↔ one sim-day per real minute.

The `(world-clock, current-time, T)` cell is mutated by the [`advancing-world-clock`](../skills/advancing-world-clock.md) skill, dispatched as the [`advance-world-clock`](../../work/tasks/world/advance-world-clock.md) every-heartbeat workitem.
The skill's act-slot calls a substrate-mutation verb; no script body.
