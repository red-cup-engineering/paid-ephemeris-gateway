---
title: "Implement the emit-federation-envelope endpoint"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: federation-envelope-wire-transport
depends-on: [implement-peer-record-loading-into-engine, emit-content-hash-cells-on-substrate-write]
requires-capabilities: [python-editing, fastapi, http-protocols]
theory-basis: [federation-by-value-domain-join, closure-merge-commutation]
---


## Description

Add `POST /federation/emit` to the engine's UDS-bound API per [wiring-protocols.md §4.6](../../../governance/specifications/wiring-protocols.md).
This endpoint:

1. Accepts a peer-id parameter naming which peer the envelope is destined for.
2. Reads the local substrate's increments since the last federation cycle for that peer.
3. Filters by the peer's sync-scope.
4. Serializes a FederationEnvelope dataclass canonically.
5. Returns the envelope as JSON in the response body.

The actual HTTP push to the peer is performed by the federation cycle (next task), which calls this endpoint internally and then POSTs to the peer's address.

## Acceptance

- [ ] `POST /federation/emit` route registered with the FastAPI app.
- [ ] Endpoint reads sync-scope from peer record.
- [ ] Envelope serialization is canonical (replay-stable; same inputs produce same bytes).
- [ ] Endpoint emits a witness `(federation-emit-attempt, for-peer, <peer-id>, at, <ts>) = T`.
- [ ] Tests cover: empty envelope (no increments), full envelope (many cells), filtered envelope (some cells outside sync-scope).

## Progress cells

*(empty — task not yet started)*
