---
type: workitem
subtype: procedure
title: "Advance the world-clock by one heartbeat"
status: ready
priority: high
idempotent: true
recurrence: every-tick
requires-capabilities:
  - substrate.write
requires-skills:
  - advancing-world-clock
skill: advancing-world-clock
touches:
  - examples/farstone/governance/state/
---


A recurring procedural workitem that fires every engine heartbeat to advance Farstone's [`world-clock`](../../../governance/state/world-clock.md) by `sim-seconds-per-heartbeat` sim-seconds.
Status stays `ready` so dispatch keeps picking it up; `idempotent: true` declares the discipline (the [`advancing-world-clock`](../../../governance/skills/advancing-world-clock.md) skill's orient-step short-circuits if the clock has already advanced this tick).

The skill's act-slot calls a substrate-mutation verb. **No Python script.** The verb is the auditable substrate transition; the workitem is the dispatch hook that brings an authorized actor to the verb call.

## Why this is a workitem and not a closure rule

The world-clock is the only cell on Farstone that *must* change each tick regardless of any other antecedent's state.
A closure rule needs an antecedent that *changes* to drive the consequent forward — and the heartbeat itself isn't a substrate cell (per `concepts/heartbeat.md`: "the heartbeat tick is a trigger, not a time event").
So the clock-advance work is dispatched as a workitem with `recurrence: every-tick`, ensuring the engine's dispatch graph picks it up each tick, an authorized actor invokes the skill, and the verb performs the cell-rewrite.

Once the clock has advanced, every other tick-coupled motion — calendar derivation, cadence boundary detection, tide, weather, opening-hours — is a closure rule firing in the settling pass that follows.

## Dispatchable

The recipient of this workitem is whichever office holds the `advancing-world-clock` skill and has `substrate.write` on `governance/state/`.
Currently that is the records-clerk's automated process (re-authoring the office records to add the skill is part of the populated-world batch, forthcoming); until then, this workitem may be unrouted.
