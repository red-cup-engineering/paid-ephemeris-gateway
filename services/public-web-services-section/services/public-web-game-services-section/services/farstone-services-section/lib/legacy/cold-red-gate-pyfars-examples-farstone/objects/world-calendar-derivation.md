---
type: closure-rule-record
class: closure-rule
status: active
realizes: closure-rule-record
fires-during: settling
fires-on-cadence: heartbeat
idempotent: true
reads:
  - subject: world-clock
    predicate: current-time
writes:
  - subject: world-calendar
    predicate: day-of-week
    domain: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
  - subject: world-calendar
    predicate: day-of-month
    domain: integer-1-31
  - subject: world-calendar
    predicate: day-of-year
    domain: integer-1-366
  - subject: world-calendar
    predicate: month
    domain: integer-1-12
  - subject: world-calendar
    predicate: month-name
    domain: [january, february, march, april, may, june, july, august, september, october, november, december]
  - subject: world-calendar
    predicate: week-of-year
    domain: integer-1-53
  - subject: world-calendar
    predicate: year
    domain: integer
  - subject: world-calendar
    predicate: is-weekend
    domain: boolean
  - subject: world-calendar
    predicate: season
    domain: [spring, summer, fall, winter]
season-convention: astronomical
calendar-convention: gregorian
timezone: polity-fixed-mainland
---

# World calendar derivation (Farstone)

A pure cells-in → cells-out closure rule.
Antecedent: the world-clock's current-time cell.
Consequent: every cell on [`world-calendar`](../governance/state/world-calendar.md).
Fires during the engine's settling pass each tick.

Math (informal):

- `day-of-week`, `day-of-month`, `day-of-year`, `month`, `month-name`, `week-of-year`, `year`, `is-weekend` — Gregorian projection of the current-time timestamp in the polity's fixed time zone.
- `season` — astronomical: from vernal equinox to summer solstice → spring; from summer solstice to autumnal equinox → summer; etc.

Idempotent: same antecedent → same consequent.
Re-running across settling passes within a tick produces no further change.

Pure projection; no actor; no external action.
The settling pass recomputes the consequent each tick from the current value of current-time.
