---
title: "Implement the inbound boundary loader"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: inbound-only-boundary-records
depends-on: [author-inbound-boundary-template]
requires-capabilities: [python-editing, substrate-validation]
theory-basis: [boundary-as-fiber]
---


## Description

Add an inbound boundary loader to `runtime/boundary.py` (or extend the generic boundary loader).
On boot, it walks `governance/boundaries/` for records with `handedness: inbound-only`, validates them, and registers them with the FastAPI sub-app for the MCP server.

Validation per task is per-record: required fields, exposed-predicates sub-cap of office's jurisdiction, auth scheme is among accepted values.
Validation failure produces a $\top$ on the boundary's authenticity AND a finding under `work/findings/`; valid boundaries register and their MCP server endpoints become live.

## Acceptance

- [ ] Inbound boundary loader function in `runtime/boundary.py`.
- [ ] Boot walks `governance/boundaries/`, validates each, registers each with the MCP server sub-app.
- [ ] Validation failures produce $\top$ + finding records.
- [ ] Tests cover: well-formed inbound boundary loads cleanly; missing-field boundary fails; mismatched-jurisdiction-and-exposed-predicates fails.

## Progress cells

*(empty — task not yet started)*
