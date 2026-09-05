---
title: "Bind cloud-agent identifier to every inbound witness"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: signed-witness-chain-for-inbound-work
depends-on: [route-inbound-workitem-via-boundary-office, implement-witness-emission-with-actor-and-via-slots]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [witness-chain-bifurcation, first-class-provenance]
---


## Description

The witness-emission code, when called from an inbound-call execution path, must always populate the `via:` slot with the cloud-agent identifier.
This task ensures: every witness emitted during the execution of an inbound workitem (admit, per-step, response) carries the same `via: <cloud-agent-slug>` cell.

Implementation: thread the cloud-agent identifier through the dispatch context (similar to how M4's session-id is threaded — per [`bind-event-log-entries-to-session-id`](bind-event-log-entries-to-session-id.md)).
The runtime's witness-emission API reads the context and stamps `via:` on every emission during the inbound-execution scope.

## Acceptance

- [ ] All witnesses during an inbound call execution carry `via: <cloud-agent-slug>`.
- [ ] In-process dispatches do NOT carry `via:`; only inbound and outbound boundary-crossing emissions do.
- [ ] Tests verify: the admit witness, per-step workflow witnesses, response witness all share the same via.
- [ ] Replay determinism: replay reconstructs the same via on each witness.

## Progress cells

*(empty — task not yet started)*
