---
title: "Implement web UI dispatch-graph visualizer"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: dispatch-app-view
depends-on: [implement-read-side-api-endpoints]
requires-capabilities: [frontend-authoring, graph-visualization]
theory-basis: [dispatch-derives-from-governance]
---


## Description

Web UI visualizing the live dispatch graph: workitems on one side, dispatchables (offices/agents) on the other, edges representing eligibility and assignment with bilattice-value coloring (t green, ⊥ amber, f red, ⊤ purple).

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] Graph renders current dispatch state; updates live as the engine ticks.
- [x] Click on an edge shows the dispatch witness (rule firing, rsv_hash, match-strength).
- [x] Filters by office, by workitem class, by status.

## Progress cells

`(implement-web-ui-dispatch-graph-visualizer, status, completed) = t` per Arc D shipped 2026-05-09.
