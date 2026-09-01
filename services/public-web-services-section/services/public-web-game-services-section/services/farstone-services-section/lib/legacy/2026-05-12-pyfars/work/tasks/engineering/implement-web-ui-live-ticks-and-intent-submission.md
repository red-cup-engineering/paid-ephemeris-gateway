---
title: "Implement web UI for live ticks and intent submission"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: tasks-app-view
depends-on: [implement-sse-witness-stream-endpoint]
requires-capabilities: [frontend-authoring]
theory-basis: [substrate-purity]
---


## Description

Web UI showing live tick activity (consuming the SSE witness stream) and a form for the operator to submit a new intent (workitem or directive) which posts to `/intent` and queues it for the next tick.

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] Live-tick view renders SSE events as they arrive; clear visual cadence per tick boundary.
- [x] Intent submission form posts to `/intent`; substrate cell appears within next tick.
- [x] Submission failures surface visible error to the operator.

## Progress cells

`(implement-web-ui-live-ticks-and-intent-submission, status, completed) = t` per Arc D shipped 2026-05-09.
