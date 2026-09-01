---
title: "Implement ScriptEnactor for processual and procedural workitems"
type: task
area: engineering
status: completed
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: []
requires-capabilities: [code-authoring]
theory-basis: [workitem-vs-agent-taxonomy]
---


## Description

The ScriptEnactor invokes a substrate-declared script body for processual (continuous) and procedural (step-sequence) workitems.
Pairs with the routing task (combined in the same commit).

Shipped pyfars commit `f762255`.

## Acceptance

- [x] ScriptEnactor class exists; consumes workitem's script-body cells.
- [x] Per-step witnesses emitted for procedural workitems.
- [x] Continuous-tick witnesses emitted for processual workitems.

## Progress cells

`(implement-script-enactor-for-processual-and-procedural-workitems, status, completed) = t` per pyfars commit `f762255`.
