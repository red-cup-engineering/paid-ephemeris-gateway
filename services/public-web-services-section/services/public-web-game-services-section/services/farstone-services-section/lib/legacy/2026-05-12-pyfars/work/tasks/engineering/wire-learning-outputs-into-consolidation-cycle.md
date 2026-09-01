---
title: "Wire learning outputs into the consolidation cycle"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: on-complete-cycles-into-learning
depends-on: [extend-on-complete-emission-to-learning-outputs, implement-promote-runner-as-consolidation-step]
requires-capabilities: [python-editing, settlement-path-operator]
theory-basis: [continuous-learning-loop, settlement-path]
---


## Description

When a workitem completes with learning outputs, the resulting authored records should appear in the next [consolidation cycle](../../recurrent-practices/consolidation-cycle.md)'s working set so they're considered alongside implicit instinct cells.

This means: the consolidation cycle's input includes both (a) observation cells emitted since the prior cycle (already wired) and (b) learning outputs (skills, runbooks, norms) authored since the prior cycle.
The cycle treats both as substrate increments and may produce composite instinct cells (e.g., "this dispatchable's success-rate after the new skill X was authored is 0.92, vs. 0.71 before").

## Acceptance

- [ ] The consolidation cycle's runner reads learning-output records emitted since the prior cycle.
- [ ] Composite instinct cells produced when an authored record changes the analysis context (e.g., a new skill changes which observations are class-relevant).
- [ ] Tests cover: a workitem produces a skill on-complete; the consolidation cycle picks it up; the next selection step reads the new skill alongside its instinct.

## Progress cells

*(empty — task not yet started)*
