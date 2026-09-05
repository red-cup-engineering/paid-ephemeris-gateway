---
title: "Federation cycle"
type: recurrent-practice
status: planning
cadence: per-peer
aggregation: per-peer-window
history-depth: 1
constitutes: [emitting-federation-envelope, admitting-federation-envelope]
fires-at: per-peer-cadence-boundary
formality-layer: F2
phases: [hash-handshake, emit-or-skip, admit-incoming, settle]
nested-in: tick
---


The recurrent practice that drives [federation-envelope](../../objects/federation-envelope-record.md) exchange between the local PyFARS instance and each known [peer](../../objects/peer-record.md).
Fires per-peer at the cadence each peer's record declares (`per-hour`, `per-day`, etc.); each firing exchanges envelopes for shared scopes and merges incoming cells into the local substrate.

The cycle is **not a tick** — it doesn't dispatch workitems, doesn't invoke agents, doesn't write assignment cells.
It walks peer records, computes scope hashes, emits envelopes for divergent scopes, admits incoming envelopes, and settles the merged substrate.
Federation is the algebra ($\vee_k$); the cycle is the schedule.

## What this practice is

A periodic per-peer execution of the four-phase federation pipeline.
The output: substrate cells from peers' shared scopes merged into the local substrate, with envelope records carrying the audit trail of every exchange.

## Cycle structure

Four phases per peer, per cycle firing:

1. **Hash handshake.** Read the peer's `(peer, last-known-closure-state-hash-for-scope, ?scope, ?
  H_remote) = t` cell; compute the local [`closure-state-hash`](../../objects/closure-state-hash.md) for the scope ($H_{local}$).
  Compare.
  Equal hashes mean the scope is in sync; record `(peer, sync-skipped-at, ?scope, hash-match) = t` and proceed to next scope.
2. **Emit-or-skip.** For each scope where $H_{local} \neq H_{remote}$, fire [`emitting-federation-envelope`](../../morphisms/emitting-federation-envelope.md).
  The morphism handles substrate-record-before-send and signing.
3. **Admit incoming.** Walk the peer's incoming-envelope queue (HTTP responses received since the prior cycle, batched).
  For each, fire [`admitting-federation-envelope`](../../morphisms/admitting-federation-envelope.md).
  The morphism handles signature verification, hash check, and cellwise $\vee_k$ merge.
4. **Settle.** After all admitted cells are present in the local substrate, run a closure-rule pass to settle any rules whose antecedents now match (e.g., a peer-asserted cell completes a workitem's goal-cell-system).
  The settle phase is bounded by the strict-regime rules' iteration count.

## Per-peer cadence

The cycle's *firing rate* is per-peer, not polity-wide.
A peer record's `(peer, sync-cadence, ?cadence) = t` cell determines when the cycle fires for that peer:

- **`per-hour`** (default) — fires at top of each hour.
- **`per-day`** — fires once per day at a polity-configured offset.
- **`event-triggered`** — fires when local substrate changes exceed a threshold (per the [event-triggered synchronization](../../questions/federation-resilience-and-degradation.md) discipline).
- **`on-demand`** — fires only when an operator invokes `pyfars federate <peer-slug>`.

Different peers may sync at different cadences.
A peer with high-bandwidth/low-cost connection syncs hourly; a peer over a satellite link syncs daily; a development-only peer syncs on-demand.

## Aggregation

**Per-peer window, depth 1.** Each cycle firing for a peer reads only the cells changed in the *current peer-window* — the substrate cells from prior to last-known-closure-state-hash.
Earlier history is implicit in the closure-state-hash; the cycle does not walk further back.

Per [`replay-determinism`](../../claims/replay-determinism.md), this is replay-deterministic: given the same event log and the same peer cadences, replay produces byte-identical envelope content.

## Constituent rules

- **`emitting-federation-envelope`** — the morphism that bundles cells, signs, records, and ships.
- **`admitting-federation-envelope`** — the morphism that verifies, records, and merges incoming envelopes.
- **`hash-handshake-skip-rule`** — closure rule that emits sync-skipped cells when local and remote hashes match (no envelope construction).
- **`peer-cadence-fire-rule`** — closure rule that fires the cycle for a peer when its cadence boundary is reached.

## Fire condition

For each peer with `(peer, sync-cadence, ?cadence) = t`, the cycle fires when:

- **Cadence-boundary** is reached (e.g., top of hour for `per-hour`).
- **Event-trigger** condition is met for `event-triggered` peers (per `(peer, event-trigger-threshold, ?n)`).
- **On-demand** invocation explicitly fires the cycle.

A peer with `(peer, status, "offline") = t` (set by a heartbeat-failure detector, per [graceful-degradation](../../questions/federation-resilience-and-degradation.md)) skips its cadence boundary; the cycle next fires when the peer transitions back to online.

## Theory grounding

- [Predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — formal definition; this is a per-peer-window practice.
- [`cellwise-merge-converges`](../../claims/cellwise-merge-converges.md) — the convergence claim the cycle's pipeline realizes.
- [FARS algebra-as-protocol](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/algebra-as-protocol.md) — the algebraic content: cellwise $\vee_k$ IS the federation protocol.

## Regime

**Strict per-firing.** Each cycle firing's constituent rules are strict-regime; the cycle is bounded by (peer count) × (shared-scope count) × (cells-per-scope).
One cycle firing is computable in bounded time.

The polity-level federation behavior across many cycles converges to a fixed point per the cellwise-merge-converges claim — that's the scott-continuous regime at the convergence-of-cycles level, but each individual cycle firing is strict.

## Synchronization

The federation cycle is **nested inside** the [tick](tick.md) practice — its cycle-firings happen at tick boundaries (cadence boundaries align with ticks).
It **synchronizes with**:

- **`materialized-view-record`** with `projects-from-scope` covering federated scopes — the federation cycle fires the view's refresh on next tick.
- **`anomaly-witness`** — $\top$-cells produced by cellwise merge surface as anomaly witnesses, queued for adjudication.
- **`session-record`** — the cycle's firings are nested in per-tick sessions; envelope records carry the session reference for replay.

## What this practice does not specify

- Coordination-federation (multi-writer contended writes, leader election, quorum).
  M6's content-federation scope is single-writer-friendly; coordination-federation is M6'.
- Discovery — how peers find each other initially.
  Currently each peer-record is captain-authored; auto-discovery (mDNS, well-known endpoints, DHT) is open.
- Encryption-in-transit beyond Ed25519 signing.
  Currently signing-only (envelopes are integrity-protected but not confidentiality-protected); TLS at the transport layer is per-deployment.
