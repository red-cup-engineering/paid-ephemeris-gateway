---
title: "Test that Farston ticks unfold visible actions"
type: task
area: engineering
status: open
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: [implement-per-entity-fiber-bundle-endpoint-and-operator-ui-clickable-names, author-opening-hours-closure-rule-and-instantiator]
requires-capabilities: [testing, integration-testing]
theory-basis: [polity-as-substrate]
---


## Description

Acceptance test for the Farston-as-living-world plan: with the world-clock advancing, businesses opening and closing on schedule, citizens following their daily routines, the operator watching through the web UI sees the polity *unfold* — actions happening, witnesses streaming, fibers updating — rather than just static records sitting in the substrate.

The test runs the engine for a simulated week of world-time, advancing the clock at 60-second-real-time-per-world-hour cadence, and asserts that: 1.
At least 100 substrate-cell updates occur per simulated day.
2.
Business statuses transition at their opening-hours boundaries.
3.
Citizen-routine workitems dispatch and emit witnesses.
4.
The web UI's live-tick view shows continuous activity, not gaps.

## Acceptance

- [ ] Test fixture seeds Farston state.
- [ ] Test runs the engine with world-clock advancing.
- [ ] Test asserts the four observable patterns above.
- [ ] Manual operator spot-check confirms the UI feels alive.

## Progress cells

*(empty — task not yet started)*
