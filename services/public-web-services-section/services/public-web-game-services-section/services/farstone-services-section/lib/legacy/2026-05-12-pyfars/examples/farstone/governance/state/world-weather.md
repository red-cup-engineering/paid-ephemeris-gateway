---
type: world-weather
title: "Farstone weather state"
status: active

weather: clear
weather-seed: 42
weather-changed-at: "2026-05-09T08:00:00+00:00"
last-rain-ended-at: "2026-05-02T14:00:00+00:00"
dry-streak-days: 7
last-hour-rolled: 0

cell-shape:
  - subject: world-weather
    predicate: weather
    domain: [clear, cloudy, rain, storm, fog]
  - subject: world-weather
    predicate: weather-seed
    domain: integer
  - subject: world-weather
    predicate: weather-changed-at
    domain: timestamp
  - subject: world-weather
    predicate: last-rain-ended-at
    domain: timestamp
  - subject: world-weather
    predicate: dry-streak-days
    domain: real
  - subject: world-weather
    predicate: last-hour-rolled
    domain: integer

written-by-rule: weather-roll
fires-on-cadence-boundary: world-hour
transition-matrix-source: world-weather-transition-matrix
---


Substrate-resident weather cells.
Rewritten on each `world-hour` cadence-boundary by [`weather-roll`](../../objects/weather-roll.md) — *not* every heartbeat; weather changes on a slower cadence than the clock.

The `weather-seed` cell is the deterministic-RNG seed; advancing the chain consumes seed bits in a defined order so replays match.
An arc that wants to test "what if" can fork the substrate, change the seed cell, and re-run.

Coupling: the (forthcoming) `fire-watch-trigger` rule reads `dry-streak-days` and `season`; the (forthcoming) ferry-status rule reads `weather`; the (forthcoming) marsh shellfish-closure rule reads `last-rain-ended-at`.
