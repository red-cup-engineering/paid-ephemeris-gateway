---
title: "Implement web UI substrate browser and predication-cell view"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: knowledge-app-view
depends-on: [implement-read-side-api-endpoints]
requires-capabilities: [frontend-authoring]
theory-basis: [substrate-purity, predication-cell]
---


## Description

Web UI for navigating the substrate's predication graph: browse by subject, predicate, or object; drill from a cell to its provenance witnesses; filter by bilattice value; show $\top$-cells (contradictions) prominently.

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] Browser shows a navigable view of substrate cells with subject/predicate/object/value columns.
- [x] Click on a cell shows the witnesses that introduced or refined it.
- [x] $\top$-cells are visually distinguished (anomaly indicator).

## Progress cells

`(implement-web-ui-substrate-browser-and-predication-cell-view, status, completed) = t` per Arc D shipped 2026-05-09.
