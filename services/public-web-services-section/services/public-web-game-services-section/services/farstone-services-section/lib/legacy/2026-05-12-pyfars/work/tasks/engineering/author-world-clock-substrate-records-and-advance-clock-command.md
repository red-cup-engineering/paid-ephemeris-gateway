---
title: "Author world-clock substrate records and advance-clock command"
type: task
area: engineering
status: doing
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: [route-enactment-by-workitem-subtype]
requires-capabilities: [code-authoring, corpus-editing]
theory-basis: [recurrent-practice]
---


## Description

Substrate records declaring the Farston world-clock (current world-time, tick rate, calendar conventions); CLI verb `pyfars advance-clock <duration>` that advances the world-clock by the specified duration and fires any time-triggered closure rules.

Per the dump: records and Python module are committed in pyfars `82e844f` but live verification is blocked behind the in-flight pyfars install pipeline state (system pyfars binary post-flake-bump exposes only `clean/help/install/run` — captain to confirm whether expected refactor state or regression).

## Acceptance

- [x] World-clock substrate records authored.
- [x] `pyfars advance-clock <duration>` Python implementation committed.
- [ ] Live verification on the engine (blocked on pyfars install pipeline state).
- [ ] Time-triggered closure rules fire when world-clock advances past their trigger.

## Progress cells

`(author-world-clock-substrate-records-and-advance-clock-command, status, in-progress) = t`.
Records and module shipped; live verification blocked per pyfars `82e844f` commit notes.
