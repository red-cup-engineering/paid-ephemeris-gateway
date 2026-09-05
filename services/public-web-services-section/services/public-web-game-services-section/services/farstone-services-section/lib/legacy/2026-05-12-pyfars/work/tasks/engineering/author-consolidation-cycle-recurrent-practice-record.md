---
title: "Author the consolidation-cycle recurrent-practice record"
type: task
area: engineering
status: completed
horizon: later
milestone: m4-memory-feedback
goal: instinct-cells-via-consolidation
depends-on: []
requires-capabilities: [substrate-authoring, recurrent-practice-design]
theory-basis: [recurrent-practice, consolidation-as-settlement]
---


## Description

Author [`work/recurrent-practices/consolidation-cycle.md`](../../recurrent-practices/consolidation-cycle.md) as a [recurrent-practice](../../recurrent-practices/_index.md) record.
The record declares the cadence, aggregation structure (finite-history depth 1), constituent rules, fire condition, regime, and synchronization with the [tick](../../recurrent-practices/tick.md) practice.

This is the substrate-side authorization for the consolidation cycle: subsequent implementation tasks read this record's frontmatter for cadence, depth, and rule references rather than hardcoding values.

## Acceptance

- [x] [`work/recurrent-practices/consolidation-cycle.md`](../../recurrent-practices/consolidation-cycle.md) exists and is theory-grounded.
- [x] The record references the existing `runtime/promote.py` and the to-be-authored `instinct-emission-rule` closure rule.
- [x] The record's regime is documented (strict; depth-1 finite-history).
- [x] The record names its synchronization with the [tick](../../recurrent-practices/tick.md) practice and the selection-by-instinct goal.

## Progress cells

- 2026-05-08: Authored at [`work/recurrent-practices/consolidation-cycle.md`](../../recurrent-practices/consolidation-cycle.md) by `claude-opus-4-7` under [`pyfars-executive-officer`](../../../governance/incumbents/pyfars-executive-officer--claude-opus-4-7--2026-04.md) incumbency.
