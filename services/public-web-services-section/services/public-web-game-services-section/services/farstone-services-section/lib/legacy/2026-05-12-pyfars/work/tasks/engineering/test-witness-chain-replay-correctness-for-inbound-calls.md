---
title: "Test witness-chain replay correctness for inbound calls"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: signed-witness-chain-for-inbound-work
depends-on: [bind-cloud-agent-identifier-to-inbound-witness]
requires-capabilities: [property-testing, witness-emission]
theory-basis: [event-sourcing, replay-determinism]
---


## Description

Property test verifying that the inbound-call witness chain replays deterministically: starting from a captured event log of an inbound call, replay produces the same witnesses with the same actor signatures, the same via slots, the same consequents.

Test scenarios:

1. **Single inbound call** — captured event log of one cloud-agent call; replay; assert all witnesses match.
2. **Multiple inbound calls** — captured event log spanning multiple cloud agents; replay; assert all witnesses match per-call.
3. **Inbound-and-outbound interleaving** — captured event log with both inbound calls and outbound endpoint dispatches; replay; assert witnesses are correctly bifurcated (inbound has via=cloud-agent; outbound has via=endpoint).
4. **Failure paths** — captured event log with ultra-vires inbound attempts; replay; assert ultra-vires witnesses replay identically.

The test is the *replay-determinism acceptance gate* for [M8](../../milestones/m8-inbound-participation-mcp-clients.md), parallel to [M3](../../milestones/m3-continuous-loop.md)'s [`add-event-log-replay-test`](add-event-log-replay-test.md).

## Acceptance

- [ ] Test at `tests/test_inbound_witness_replay.py`.
- [ ] All four scenarios pass.
- [ ] Test runs in CI on changes to witness-emission code, dispatch graph, or boundary loader.
- [ ] Failure modes are diagnosed clearly: signature mismatch, via mismatch, consequent mismatch.

## Progress cells

*(empty — task not yet started)*
