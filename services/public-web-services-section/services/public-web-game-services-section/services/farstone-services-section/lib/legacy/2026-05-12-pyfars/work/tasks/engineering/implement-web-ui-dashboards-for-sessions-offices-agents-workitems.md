---
title: "Implement web UI dashboards for sessions, offices, agents, workitems"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: governance-app-view
depends-on: [implement-read-side-api-endpoints]
requires-capabilities: [frontend-authoring]
theory-basis: [office-as-fuzzy-cell]
---


## Description

Per-entity dashboards: sessions (per-tick session record + observations + instincts produced), offices (incumbency, current load, recent dispatches), agents (capabilities offered, recent invocations, cost-record), workitems (status, goal-cell satisfaction, witness chain).

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] Four dashboard views accessible from the main navigation.
- [x] Each renders the entity's substrate-cell projection plus links to related entities.
- [x] Live updates via SSE for in-flight entities (current session, in-flight workitems).

## Progress cells

`(implement-web-ui-dashboards-for-sessions-offices-agents-workitems, status, completed) = t` per Arc D shipped 2026-05-09.
