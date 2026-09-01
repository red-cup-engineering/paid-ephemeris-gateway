---
type: closure-rule-record
class: closure-rule
status: active
realizes: closure-rule-record
fires-during: settling
fires-on-cadence: heartbeat
idempotent: true
quantified-over:
  variable: B
  domain-predicate: "type=business"
reads:
  - subject: B
    predicate: opening-hours
  - subject: B
    predicate: closes-on-holidays
  - subject: world-clock
    predicate: current-time
  - subject: world-calendar
    predicate: day-of-week
  - subject: world-calendar
    predicate: today-is-holiday
  - subject: world-calendar
    predicate: next-holiday
  - subject: world-calendar
    predicate: next-holiday-at
writes:
  - subject: B
    predicate: open-now
    domain: boolean
  - subject: B
    predicate: next-open-at
    domain: timestamp
  - subject: B
    predicate: next-close-at
    domain: timestamp
opening-hours-shape:
  type: map-of-day-to-interval-list
  keys: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
  value-shape: "list of [hh:mm, hh:mm] intervals; empty list = closed all day"
holiday-override:
  when: "(world-calendar, today-is-holiday, true) AND (B, closes-on-holidays, true)"
  result: "open-now = false regardless of intervals"
---

# Opening-hours derivation (Farstone)

For each business `B` carrying `opening-hours:` cells, derive `open-now`, `next-open-at`, `next-close-at` from the world-clock + world-calendar cells.

Procedure: let `today-hours = B.opening-hours[world-calendar.day-of-week]`.
If the time-of-day component of `world-clock.current-time` falls inside any interval in `today-hours`, write `open-now = true`; else `false`.
Compute `next-open-at` as the start of the next future interval (today's next, or — if today is exhausted — the next open day's first interval).
Compute `next-close-at` as the end of the current interval if open, else absent.

Holiday override: when `world-calendar.today-is-holiday = true` AND `B.closes-on-holidays = true`, force `open-now = false` and project `next-open-at` past the holiday.

Pure cells-in → cells-out.
Settles to fixed-point in one pass once inputs stabilize.

Consumers: the website's homepage reads `open-now` to render open/closed badges; the (forthcoming) ferry-status display reads `ferry-terminal-cafe.open-now` to shape the suggested-actions panel.
