---
title: "Author opening-hours closure rule and instantiator"
type: task
area: engineering
status: open
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: [author-world-clock-substrate-records-and-advance-clock-command]
requires-capabilities: [code-authoring, corpus-editing]
theory-basis: [closure-rule-system]
---


## Description

Author the substrate closure-rule record and instantiator that fires per-business: when the world-clock enters a business's opening-hours window, the rule fires `(business, status, open) = t`; when it leaves, `(business, status, closed) = t`.
The rule reads the business record's `opening-hours:` field (e.g., `mon-fri:09:00-17:00`) and the world-clock's current value.

This is what makes Farston businesses time-responsive: their open/closed status follows the world-clock automatically rather than requiring manual updates.

## Acceptance

- [ ] `objects/opening-hours-rule.md` exists as a closure-rule record.
- [ ] Instantiator in `runtime/eligibility_rules.py` registers the rule.
- [ ] A test asserts: setting world-clock to a time inside the opening-hours window produces `status: open`; outside produces `status: closed`.
- [ ] Multiple businesses with overlapping/disjoint hours produce per-business correct statuses.

## Progress cells

*(empty — task not yet started)*
