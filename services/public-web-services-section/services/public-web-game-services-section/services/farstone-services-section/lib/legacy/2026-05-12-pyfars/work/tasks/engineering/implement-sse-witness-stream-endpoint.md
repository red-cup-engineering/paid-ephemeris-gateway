---
title: "Implement SSE witness stream endpoint"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: governance-app-view
depends-on: [implement-read-side-api-endpoints]
requires-capabilities: [code-authoring, sse]
theory-basis: [witnessing-completion, substrate-purity]
---


## Description

Implement a Server-Sent Events endpoint streaming new witnesses as they're emitted: `GET /witnesses/stream` opens a long-lived connection; the server pushes each new witness event as an SSE message.
Web UI consumes this for live tick visualization and the witness-arrival-as-trigger pattern in the operator dashboard.

The stream is a substrate-pure projection: each pushed event corresponds to a witness cell that was just emitted; the order of pushes matches the witness emission order in the JSONL event log.

Shipped 2026-05-09 per Arc D.

## Acceptance

- [x] `GET /witnesses/stream` endpoint exists; returns text/event-stream content-type.
- [x] Each new witness emitted by the engine is pushed to all connected SSE clients.
- [x] Connection-disconnect is handled gracefully (no engine-side state leak).
- [x] Web UI consumes the stream for live tick display.

## Progress cells

`(implement-sse-witness-stream-endpoint, status, completed) = t` per Arc D shipped 2026-05-09.
