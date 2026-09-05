---
type: closure-rule-record
class: closure-rule
status: active
realizes: closure-rule-record
fires-during: settling
fires-on-cadence: heartbeat
idempotent: true
model: simplified-semidiurnal
reads:
  - subject: world-clock
    predicate: current-time
  - subject: farston-harbor
    predicate: mean-tide-range-m
  - subject: farston-harbor
    predicate: spring-tide-range-m
  - subject: farston-harbor
    predicate: tidal-base-epoch
  - subject: farston-harbor
    predicate: tidal-period-hours
  - subject: world-calendar
    predicate: day-of-month
defaults:
  mean-tide-range-m: 2.6
  spring-tide-range-m: 3.4
  tidal-period-hours: 12.42
  lunar-cycle-days: 14.77
writes:
  - subject: farston-harbor
    predicate: tide-height-m
    domain: real
  - subject: farston-harbor
    predicate: tide-state
    domain: [rising, falling]
  - subject: farston-harbor
    predicate: next-high-tide-at
    domain: timestamp
  - subject: farston-harbor
    predicate: next-low-tide-at
    domain: timestamp
---

# Tide derivation (Farstone)

A simplified semidiurnal tide model.
Phase ϕ(T) = 2π · ((T − T₀) mod P) / P.
Lunar modulation L(d) = ½ (R + (S − R)·|cos(2π d / 14.77)|).
Height(T) = mean-sea-level + L(d) · cos(ϕ(T)).
Tide-state is rising if d/dT height > 0, else falling.
Next-high and next-low projected from the next zero-crossings of the derivative.

Defaults are taken from the biome cells when the harbor record doesn't override them.
Pure projection of substrate cells; no actor; no external action.
Cheap to recompute each settling pass.

A real harmonic prediction (multi-constituent, calibrated to the harbor's bathymetry) is out of scope here.
The simplified model gets the shape right; an arc that needs accuracy can swap the rule without touching consumers of the consequent cells.
