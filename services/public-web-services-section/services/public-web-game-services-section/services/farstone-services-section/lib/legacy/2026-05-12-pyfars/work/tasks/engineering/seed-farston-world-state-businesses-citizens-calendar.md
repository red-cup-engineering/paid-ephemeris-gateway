---
title: "Seed Farston world-state: businesses, citizens, calendar"
type: task
area: engineering
status: open
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: [author-opening-hours-closure-rule-and-instantiator]
requires-capabilities: [corpus-editing]
theory-basis: [polity-as-substrate]
---


## Description

Author the seed substrate content for Farston: a small set of businesses (with names, addresses, opening hours, type), a small set of citizens (with names, addresses, occupations, daily routines), a calendar (holidays, recurring events).
Enough to make the polity feel like a living world rather than an empty testbed.

The seed is intentionally small (10–20 businesses, 30–50 citizens) — enough to exercise dispatch dynamics, observe behaviors, surface anomalies, but not so much that the substrate becomes unwieldy for inspection.

## Acceptance

- [ ] `examples/farstone/businesses/<slug>.md` records exist for 10–20 businesses with the required fields.
- [ ] `examples/farstone/citizens/<slug>.md` records exist for 30–50 citizens.
- [ ] `examples/farstone/calendar/<year>.md` records exist with at least one recurring event and a few one-off events.
- [ ] All records validate per `pyfars validate examples/farstone/`.

## Progress cells

*(empty — task not yet started)*
