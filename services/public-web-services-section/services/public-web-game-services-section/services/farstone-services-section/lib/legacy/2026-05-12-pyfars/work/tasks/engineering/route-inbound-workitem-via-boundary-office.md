---
title: "Route inbound workitem via boundary office"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: cloud-agent-admission-via-dispatch
depends-on: [implement-inbound-call-to-workitem-projection]
requires-capabilities: [python-editing, dispatch-graph]
theory-basis: [office-as-fuzzy-cell, witness-chain-bifurcation]
---


## Description

Wire the projected inbound workitem (per [`implement-inbound-call-to-workitem-projection`](implement-inbound-call-to-workitem-projection.md)) into the dispatch graph so the dispatchable for the workitem is the boundary's office (not the cloud agent itself).

The dispatch graph's existing eligibility composition fires; the office's `admit-inbound-call` skill is the matched skill; the office's authority and jurisdiction (per [M5](../../milestones/m5-agential-self-generation.md)) gate eligibility.
The cloud agent is named in the workitem's `requested-by-cloud-agent` cell and propagates through the witness chain via the `via:` slot ([`implement-witness-emission-with-actor-and-via-slots`](implement-witness-emission-with-actor-and-via-slots.md)).

The dispatch's settle-action: execute the workflow corresponding to the requested tool-name, under the office's authority, capturing the result for response-projection back through the boundary.

## Acceptance

- [ ] Inbound workitems route to the boundary's office; verified by dispatch-witness inspection (actor=office).
- [ ] The cloud agent is named in via, never in actor.
- [ ] The matched skill is `admit-inbound-call`; the workflow associated with the requested tool-name is what executes.
- [ ] Tests cover: in-scope tool dispatches and runs; out-of-scope tool produces ultra-vires (per next task).

## Progress cells

*(empty — task not yet started)*
