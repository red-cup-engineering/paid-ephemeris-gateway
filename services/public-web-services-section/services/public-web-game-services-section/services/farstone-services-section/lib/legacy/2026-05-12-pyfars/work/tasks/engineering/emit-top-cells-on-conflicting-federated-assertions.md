---
title: "Emit ⊤ cells with provenance on conflicting federated assertions"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: cross-host-substrate-convergence
depends-on: [test-partition-recovery-converges-without-last-write-wins]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [anomaly-as-contradiction, federation-by-value-domain-join]
---


## Description

When the closure-merge produces a $\top$ cell from federated input (i.e., two peers' envelopes asserted divergent values on the same predicate), emit a witness binding the $\top$ to its source: `(top-cell-C, asserted-by-peer, A, value, x) = T`, `(top-cell-C, asserted-by-peer, B, value, y) = T`.
The $\top$ is auditable to the conflicting peers.

This integrates with the [M3 anomaly-surfacing-via-contradiction-cells](../../goals/anomaly-surfacing-via-contradiction-cells.md) discipline: the $\top$ cell queues a review-workitem; the review reads the federated provenance to identify which peers conflicted.

## Acceptance

- [ ] When the federation cycle's admit phase produces a $\top$ cell, the runtime emits per-peer provenance witnesses.
- [ ] The review-workitem queued for the $\top$ cell carries pointers to the conflicting peers' envelopes.
- [ ] Tests verify: $\top$ from federation produces audit-traceable provenance; $\top$ from local conflict (non-federated) doesn't produce cross-peer witnesses (correct disambiguation).
- [ ] Documentation in [`prose/explanation/`](../../../prose/explanation/) on how to interpret federated $\top$ cells.

## Progress cells

*(empty — task not yet started)*
