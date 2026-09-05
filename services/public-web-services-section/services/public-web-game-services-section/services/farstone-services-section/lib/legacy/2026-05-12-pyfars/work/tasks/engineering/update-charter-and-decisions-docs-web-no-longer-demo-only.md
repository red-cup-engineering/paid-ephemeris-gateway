---
title: "Update charter and decisions docs to reflect web UI is no longer demo-only"
type: task
area: governance
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: governance-app-view
depends-on: [implement-web-ui-live-ticks-and-intent-submission, implement-web-ui-substrate-browser-and-predication-cell-view, implement-web-ui-dispatch-graph-visualizer, implement-web-ui-dashboards-for-sessions-offices-agents-workitems]
requires-capabilities: [corpus-editing]
theory-basis: [charter-as-closure-system]
---


## Description

Charter and decisions documents previously framed the web UI as a demonstrator (demo-quality, not load-bearing for operations).
With Arc D shipped and the operator using the web UI to drive Farston-class polities, the documents need updating: the web UI is now an operational surface; its availability is a captain-acknowledged commitment.

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] `governance/charter.md` (or relevant section) updated to acknowledge web UI as operational.
- [x] `governance/decisions/` carries a decision record explicitly transitioning the web UI from demo to operational.
- [x] No remaining doc strings call the web UI "demo-only" or equivalent.

## Progress cells

`(update-charter-and-decisions-docs-web-no-longer-demo-only, status, completed) = t` per Arc D shipped 2026-05-09.
