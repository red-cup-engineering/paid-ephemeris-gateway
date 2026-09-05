---
type: closure-rule-record
class: closure-rule
status: active
realizes: closure-rule-record
fires-during: settling
fires-on-cadence: heartbeat
idempotent: true
quantified-over:
  variable: C
  domain-predicate: "type=cadence,kind=world"
reads:
  - subject: C
    predicate: current-cycle-ends-at
  - subject: C
    predicate: cycle-#
  - subject: world-clock
    predicate: current-time
  - subject: world-calendar
    predicate: day-of-month
  - subject: world-calendar
    predicate: month
guard:
  predicate: world-clock-current-time-geq-cycle-end
writes:
  - subject: C
    predicate: cycle-boundary-fired-at
    domain: timestamp
  - subject: C
    predicate: cycle-#
    domain: integer
  - subject: C
    predicate: current-cycle-began-at
    domain: timestamp
  - subject: C
    predicate: current-cycle-ends-at
    domain: timestamp
period-resolution:
  world-day: fixed-24-sim-hours
  world-week: fixed-7-sim-days
  world-month: gregorian-month-roll
  world-season: astronomical-equinox-or-solstice
  world-year: fixed-365.25-sim-days
---

# World cadence boundary detection (Farstone)

A closure rule that fires `cycle-boundary-fired-at` witnesses when the world-clock crosses any world-cadence's `current-cycle-ends-at`, and rolls the cycle forward.

Quantified over each cadence record `C` of `kind: world`.
Guard: `world-clock.current-time ≥ C.current-cycle-ends-at`.
When the guard holds, write the four consequent cells (cycle-boundary-fired-at, cycle-# incremented, current-cycle-began-at = old end, current-cycle-ends-at = old end + period(C)).

Period for fixed-period cadences is constant and read from `period-resolution` above.
Period for `world-month` and `world-season` is computed by reading the calendar cells and projecting forward to the next month-roll or solstice/equinox.

The `cycle-boundary-fired-at` cells are the antecedent of the (forthcoming) pulse-eligibility rule: an agent with `pulses-on: [C]` becomes pulse-eligible when this cell is freshly written.
