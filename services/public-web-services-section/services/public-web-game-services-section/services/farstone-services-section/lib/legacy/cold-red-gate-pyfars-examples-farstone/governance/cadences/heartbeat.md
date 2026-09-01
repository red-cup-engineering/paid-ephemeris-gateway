---
type: cadence
kind: engine
title: "Heartbeat (engine tick)"
real-period-seconds: 3
period-resolution: real-time
realizes: heartbeat
last-tick-at: null
tick-#: 0
status: active
---


The engine's tick rate.
Every 3 real seconds, the PyFARS engine running this polity ticks once: it loads substrate, settles closure rules, dispatches ready workitems, witnesses the results, reaches quiescence, and waits for the next tick.

The heartbeat is the only cadence whose period is wall-clock; every other cadence on Farstone is world-time-indexed.
The heartbeat triggers the world-clock-advance workitem each tick (see [`advance-world-clock`](../../work/tasks/world/advance-world-clock.md)) and triggers settling, which in turn fires every closure rule on the polity.

The cells `last-tick-at` and `tick-#` are written by the engine on each tick.
The 3-second figure is the launch parameter (`pyfars run --tick-interval 3 examples/farstone/`); making it substrate-resident (so the engine reads `real-period-seconds` from this cell) is a forthcoming refactor.

No agent on Farstone subscribes to the heartbeat directly — heartbeat-rate work would be excessive.
Agents subscribe to world-cadences (day, month) instead.
