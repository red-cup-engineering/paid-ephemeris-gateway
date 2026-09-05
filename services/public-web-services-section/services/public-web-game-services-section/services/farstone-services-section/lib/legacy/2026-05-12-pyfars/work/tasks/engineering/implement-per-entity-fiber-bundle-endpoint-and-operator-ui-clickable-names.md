---
title: "Implement per-entity fiber-bundle endpoint and operator-UI clickable names"
type: task
area: engineering
status: open
horizon: doing
milestone: null
plan: ship-farston-as-living-world
depends-on: [seed-farston-world-state-businesses-citizens-calendar, implement-web-ui-substrate-browser-and-predication-cell-view]
requires-capabilities: [code-authoring, frontend-authoring]
theory-basis: [predication-fiber-algebra]
---


## Description

API endpoint `GET /entity/<slug>/fiber` returning the entity's full predication fiber (every cell with the entity as subject, plus inferred-role cells).
Operator UI consumes this so that when a business or citizen name appears anywhere in the UI (in a witness, a workitem, a dispatch view), it's clickable and opens the entity's fiber view.

Makes Farston explorable from any entry point — see a witness mentioning "alice" → click → see Alice's full fiber → click on a business she works at → see that business's fiber → etc.

## Acceptance

- [ ] `GET /entity/<slug>/fiber` endpoint exists; returns JSON with the entity's cells.
- [ ] Web UI auto-detects entity names in any rendered text and wraps them as clickable links.
- [ ] Click navigates to the entity's fiber view; back-button returns to prior view.
- [ ] Cross-entity navigation (Alice → her employer → another employee → that employee's home address → that address's neighborhood) works without dead-ends.

## Progress cells

*(empty — task not yet started)*
