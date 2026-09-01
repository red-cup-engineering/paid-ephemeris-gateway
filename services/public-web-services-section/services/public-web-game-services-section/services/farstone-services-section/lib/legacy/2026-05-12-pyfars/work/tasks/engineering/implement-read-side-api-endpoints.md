---
title: "Implement read-side API endpoints (witnesses, dispatch, sessions, cells)"
type: task
area: engineering
status: completed
horizon: doing
milestone: m17-561-productivity-stack
goal: governance-app-view
depends-on: []
requires-capabilities: [code-authoring, api-design]
theory-basis: [substrate-purity]
---


## Description

Implement the read-side FastAPI endpoints exposing substrate state for the web UI: `GET /witnesses` (paged, filterable by actor/verb/session/time), `GET /dispatch` (current dispatch state, eligibility, assignments), `GET /sessions` (open and recent), `GET /cells` (substrate cell query with predicate filters).

These endpoints are read-only projections of substrate state.
They satisfy substrate-purity: each response is a function of substrate cells at request time, no hidden state, no per-response derivation that doesn't trace to a substrate cell.

Per the dump's note: D.
0–D.
7 code shipped 2026-05-09 — this task is captured for substrate-completeness but its work is done.

## Acceptance

- [x] FastAPI handlers for the four endpoint groups exist.
- [x] Each endpoint's response shape is a projection of substrate cells, not bespoke aggregation.
- [x] Endpoints documented in OpenAPI; web UI consumes them.

## Progress cells

`(implement-read-side-api-endpoints, status, completed) = t` per pyfars commit history (Arc D shipped 2026-05-09).
