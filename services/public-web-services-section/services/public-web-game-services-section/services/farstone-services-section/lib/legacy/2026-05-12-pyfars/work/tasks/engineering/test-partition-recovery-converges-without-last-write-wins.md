---
title: "Test: partition recovery converges without last-write-wins"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: cross-host-substrate-convergence
depends-on: [test-predication-on-host-a-appears-on-host-b]
requires-capabilities: [integration-testing, partition-simulation]
theory-basis: [closure-merge-commutation, multi-agent-work-as-crdt]
---


## Description

Integration test that simulates network partition by holding envelopes in a queue rather than delivering them.

Setup: two engines A and B, mutual full-trust peer records.

Run: simulate partition (envelopes held).
During the partition, A authors `(C, p, x) = T` and B authors `(C, p, y) = T` with $x \ne y$ (divergent assertions on the same cell).
Run federation cycles locally; envelopes accumulate in queues but don't deliver.

Heal: deliver all queued envelopes (in arbitrary order — the test should run with multiple orderings).

Verify: after partition heals, both A and B's substrates have `(C, p, x) = ⊤` AND `(C, p, y) = ⊤` (or equivalently, the cell `(C, p, ?)
` is at $\top$ — exact predicate-cell representation TBD).

The contradiction is substrate-visible.
There is no last-write-wins; neither x nor y "wins."

## Acceptance

- [ ] Test at `tests/test_federation_partition_recovery.py`.
- [ ] Test runs the scenario with at least three different envelope-delivery orderings; all produce the same converged state.
- [ ] Test asserts: $\top$ cell present on the conflicting predicate after heal.
- [ ] Test asserts: neither value "wins"; both are evidenced.

## Progress cells

*(empty — task not yet started)*
