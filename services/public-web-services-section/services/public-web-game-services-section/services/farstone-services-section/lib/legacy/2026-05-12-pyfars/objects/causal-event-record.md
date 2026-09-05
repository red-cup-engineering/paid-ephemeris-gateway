---
type: definition
class: system-entity
status: draft
realizes: [event, witness]
depends-on: [jsonl-event-log, witness, predication-cell]
implementation: pyfars.runtime.event_log
---

# Causal event record

A specialization of [`jsonl-event-log`](jsonl-event-log.md) entries that carries explicit *causal predecessors* — the set of prior events whose outputs the present event read or witnessed.
The causal predecessor edges form a DAG over the event log; a `causal_hash` field records a canonicalization of that DAG over the present event's transitive closure of predecessors.

A causal event record extends the base event schema with two fields:

- **`caused-by`** — a list of event IDs (or content hashes) that the present event read.
- **`causal_hash`** — SHA-256 over the canonical serialization of the present event's reachable causal DAG, up to graph isomorphism.

## Why DAG-up-to-isomorphism rather than total order

The base event log's `ts` field gives a total order, but two events whose causes are independent (neither reads what the other wrote) may have been produced in *either* order without changing the system's eventual state.
The total order is an artifact of wall-clock; the causal DAG is the substrate-essential ordering.

Replay-determinism at the byte-of-event-log level requires preserving the wall-clock order.
Replay-determinism at the *system-state* level only requires preserving the causal DAG.
The `causal_hash` field separates these: two event logs with the same `causal_hash` over a window produce the same post-closure system state, even if their wall-clock interleavings differ.

This matters at federation merge time: when two peers' event logs are interleaved into one history, the merge is correct iff causal predecessors are preserved.
A `causal_hash` comparison verifies this in $O(1)$ rather than re-walking the event-pair partial-order.

## Cells

A causal event record's projection adds to the base event:

- `(event-id, caused-by, <predecessor-id>) = t` — one per predecessor.
- `(event-id, causal-hash, <hex>) = t` — the present event's causal_hash.
- `(event-id, causal-depth, <int>) = t` — depth in the causal DAG (number of predecessor edges to reach a root).
  Useful for windowed audits.

## Computation of `causal_hash`

For an event $e$ with reachable predecessor set $P^*(e)$:

$$\mathrm{causal\_hash}(e) \;=\; \mathrm{SHA{\text -}256}\big(\mathrm{canonical{\text -}DAG{\text -}encoding}(P^*(e) \cup \{e\})\big)$$

The canonical DAG encoding sorts nodes by content hash, sorts each node's edge-list by target content hash, and emits the sorted node-list as a byte stream.
Two DAGs that are isomorphic (same nodes, same edges, ignoring node identity) produce the same encoding; two DAGs that differ structurally produce different encodings.

The canonicalization runs in $O(|P^*(e)| \log |P^*(e)|)$ amortized; for windowed audits the predecessor set is bounded.

## What this object commits to

1. **Causal predecessors are recorded at write time, not derived later.** When the closure-runner fires a rule, it knows which cells the antecedent matched against — those cells' originating events become `caused-by`.
  Reconstructing this post-hoc from the event log alone is intractable for non-pure rules.
2. **`causal_hash` is over the *transitive* closure of predecessors.** Just listing immediate predecessors is not enough — two events sharing immediate predecessors but with different histories upstream have different substrate-impact.
  The transitive closure makes the hash the right granularity for federation merge correctness.
3. **Wall-clock `ts` is preserved alongside.** The causal layer adds to, does not replace, the existing event-log discipline.
  Replay can verify both layers; federation merge primarily cares about the causal layer.

## What this object does not specify

- Whether `caused-by` should record event IDs or event content hashes.
  Content hashes are more federation-portable (no ID-collision concerns across peers) but heavier.
  Currently event IDs locally, content hashes in federation envelopes.
- The cadence of causal-DAG canonicalization.
  Per-event is correct but expensive for high-throughput closure runs; per-tick batched canonicalization is the practical compromise.
  M3's replay-determinism gate is per-tick.
- The discipline for *ambiguous* causality — when two cells could have triggered the same rule firing, which is the predecessor?
  Currently both are recorded; the canonical-DAG-encoding produces the same hash regardless of which is "primary."
- Garbage collection of deep causal histories.
  Long-running polities accumulate large predecessor sets; whether to checkpoint causal hashes at audit-export boundaries and treat pre-checkpoint events as opaque is open work for [M11](../work/milestones/m11-assurance-audit-chain-export.md).
