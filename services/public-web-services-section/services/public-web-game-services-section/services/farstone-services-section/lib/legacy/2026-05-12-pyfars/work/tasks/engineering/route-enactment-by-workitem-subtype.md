---
title: "Route enactment by workitem subtype"
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

Dispatch routes workitems to enactors based on the workitem's `kind:` (process / procedure / derivation / inquiry).
Procedural and processual workitems route to a script-based enactor; derivations route to a transform-enactor; inquiries route to research-class agents.

Shipped pyfars commit `f762255` (combined with L.
2; the script enactor and the routing belong in the same module).

## Acceptance

- [x] `runtime/dispatch_graph.py` reads workitem `kind:` and routes to the corresponding enactor.
- [x] Tests cover the four kinds.

## Progress cells

`(route-enactment-by-workitem-subtype, status, completed) = t` per pyfars commit `f762255`.
