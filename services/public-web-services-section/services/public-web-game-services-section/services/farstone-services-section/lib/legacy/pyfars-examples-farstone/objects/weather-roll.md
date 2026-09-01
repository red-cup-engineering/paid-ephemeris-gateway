---
type: closure-rule-record
class: closure-rule
status: active
realizes: closure-rule-record
fires-during: settling
fires-on-cadence-boundary: world-hour
idempotent-per-boundary: true
model: deterministic-markov-chain
weather-states: [clear, cloudy, rain, storm, fog]
seed-source-cell:
  subject: world-weather
  predicate: weather-seed
hour-counter-source-cell:
  subject: world-hour
  predicate: cycle-#
season-conditioned: true
transition-matrix-source-cell:
  subject: world-weather-transition-matrix
  predicate: matrix-by-season
reads:
  - subject: world-hour
    predicate: cycle-boundary-fired-at
  - subject: world-weather
    predicate: weather
  - subject: world-weather
    predicate: weather-seed
  - subject: world-weather
    predicate: dry-streak-days
  - subject: world-weather
    predicate: last-hour-rolled
  - subject: world-calendar
    predicate: season
guard:
  predicate: cycle-boundary-fresh-relative-to-last-hour-rolled
writes:
  - subject: world-weather
    predicate: weather
    domain: [clear, cloudy, rain, storm, fog]
  - subject: world-weather
    predicate: weather-changed-at
    domain: timestamp
  - subject: world-weather
    predicate: dry-streak-days
    domain: real
  - subject: world-weather
    predicate: last-rain-ended-at
    domain: timestamp
  - subject: world-weather
    predicate: last-hour-rolled
    domain: integer
dry-streak-policy:
  per-dry-hour-increment-days: 0.0417
  reset-on-states: [rain, storm]
---

# Weather roll (Farstone)

Deterministic Markov chain over five states, advancing once per `world-hour` cadence-boundary.
The seed cell + the hour-counter cell determine the entire weather sequence — same seed + same hour-counter index → same next state.

The transition matrix is season-conditioned and lives as substrate cells under [`governance/specifications/biome/world-weather-transition-matrix.md`](../governance/specifications/biome/world-weather-transition-matrix.md) (forthcoming) so the rule can be re-tuned without code changes.

Procedure each fresh world-hour boundary: compute the transition draw from `(seed, hour-counter)`, look up the row for the current weather state in the season's matrix, sample the next state, write the consequent cells.
The `last-hour-rolled` cell prevents double-rolls if the rule fires twice within a settling pass on the same boundary.

`dry-streak-days` increments by 1/24 per dry-hour roll (clear or cloudy outcome) and resets to 0 on rain or storm.
Coupled to fire-watch via the (forthcoming) `fire-watch-trigger` rule.

Replay-deterministic: an operator who saves the substrate at moment T and re-runs from that moment with the same seed produces identical weather.
Forking with a different seed produces a counterfactual.
