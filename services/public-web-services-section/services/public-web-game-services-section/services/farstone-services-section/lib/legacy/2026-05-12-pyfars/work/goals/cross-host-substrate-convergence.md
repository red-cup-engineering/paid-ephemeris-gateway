---
title: "Cross-host substrate convergence"
type: goal
milestone: m6-federation
status: open
horizon: captured
theory-basis: [closure-merge-commutation, multi-agent-work-as-crdt]
tasks:
  - test-predication-on-host-a-appears-on-host-b
  - test-partition-recovery-converges-without-last-write-wins
  - emit-top-cells-on-conflicting-federated-assertions
---


After this goal, a predication added on `vps-mini-cold-red-gate` is visible on `loc-lap-bare-cedar-fog` after one federation cycle.
Two engines that took divergent updates during a partition reconcile to a single substrate state under bilattice join when the partition heals — no last-write-wins, contradictions surface as $\top$ cells.

This is the acceptance gate for [M6](../milestones/m6-federation.md) and the operational realization of [Charter](../../governance/charter.md) C4.

## Why

The prior goals — spec, content-hash, peer records, wire transport — are infrastructure.
This goal is the **demonstrated convergence property**.
Without this acceptance test passing, federation is at best plausible-by-theory; with it, federation is verified.

## Theory grounding

**1.
Closure-merge commutation lemma** (FARS [`_index.md`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)).
The lemma guarantees convergence; this goal verifies the implementation realizes it. **The lemma is the convergence theorem; this goal is the theorem's witness.**

**2.
Multi-agent-work-as-CRDT** ([`predicated-work/theorems/multi-agent-work-as-crdt`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/multi-agent-work-as-crdt.md)).
The substrate's cellwise $\vee_k$ is associative-commutative-idempotent. **The CRDT property gives eventual consistency under arbitrary message ordering**; this goal exercises that property under genuine partition.

### Design constraints from this grounding

- **The acceptance test must include a partition.** Without partitioning, convergence is trivial (every envelope arrives in order).
  With partitioning, both engines write divergent cells; partition healing must converge them.
  The test should *simulate* partition (e.g., by holding envelopes in a queue) rather than requiring an actual network split.
- **Conflicting cells produce $\top$, not a winner.** "Last-write-wins" is forbidden.
  If host A asserts `(C, p, x) = T` and host B asserts `(C, p, y) = T` with $x \ne y$, the cell goes to $\top$.
  The test verifies this; the runtime emits an anomaly witness.
- **Replay correctness is verified.** Both engines' event logs replayed produce the converged state.
  This is what closes the federated replay-determinism property.

## Acceptance

- [ ] Acceptance test at `tests/test_federation_convergence.py`.
- [ ] Test scenario A: simple propagation.
  Host A authors a workitem; host B sees it after one federation cycle.
- [ ] Test scenario B: partition recovery.
  Hold envelopes for 3 cycles while both hosts write divergent cells.
  Release; verify convergence to a single state with $\top$ cells on conflicting predicates.
- [ ] Test scenario C: replay determinism under federation.
  Replay both event logs from a checkpoint; final state matches the live state.
- [ ] No last-write-wins behavior (verified by direct cell inspection).
- [ ] The test is run in CI on every change to `runtime/federation.py` or the federation-cycle recurrent-practice record.
