---
type: world-calendar
title: "Farstone world-calendar"
status: active

day-of-week: friday
day-of-month: 9
day-of-year: 129
month: 5
month-name: may
week-of-year: 19
year: 2026
is-weekend: false
season: spring
is-frost-free-day: true
today-is-holiday: false
next-holiday: memorial-day-observed
next-holiday-at: "2026-05-25T00:00:00+00:00"

cell-shape:
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
  - subject: world-calendar
    predicate: is-frost-free-day
    domain: boolean
  - subject: world-calendar
    predicate: today-is-holiday
    domain: boolean
  - subject: world-calendar
    predicate: next-holiday
    domain: holiday-slug
  - subject: world-calendar
    predicate: next-holiday-at
    domain: timestamp

written-by-rule: world-calendar-derivation
holiday-source-record: holidays
---


Calendar cells derived each engine settling pass from `(world-clock, current-time, T)` by [`world-calendar-derivation`](../../objects/world-calendar-derivation.md).
The values in frontmatter are the *current snapshot*; they're rewritten each tick.
The `cell-shape` block declares the projection contract for tooling.

Holidays come from [`holidays.md`](holidays.md) (forthcoming).
The derivation rule consults that record to compute the next-holiday cells.
