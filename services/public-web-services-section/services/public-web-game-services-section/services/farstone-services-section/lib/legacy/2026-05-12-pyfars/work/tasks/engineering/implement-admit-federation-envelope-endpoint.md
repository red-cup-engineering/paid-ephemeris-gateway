---
title: "Implement the admit-federation-envelope endpoint"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: federation-envelope-wire-transport
depends-on: [implement-emit-federation-envelope-endpoint]
requires-capabilities: [python-editing, fastapi, http-protocols]
theory-basis: [closure-merge-commutation, multi-agent-work-as-crdt]
---


## Description

Add `POST /federation/admit` to the engine's UDS-bound API.
This endpoint:

1. Accepts a FederationEnvelope JSON body and the originating peer-id.
2. Verifies the originating peer is a valid peer record (rejects with 403 otherwise).
3. Filters cells outside the peer's declared sync-scope (rejects them with substrate witness `ultra-vires-from-peer`).
4. Applies admitted cells via `runtime/federation.py:apply_envelope` — cellwise $\vee_k$ into the local store.
  Conflicts produce $\top$ cells per the closure-merge commutation discipline.
5. Emits witnesses: `(federation-admit, from-peer, <peer-id>, at, <ts>) = T`, `(federation-admit, cells-admitted, <count>) = T`, `(federation-admit, cells-rejected, <count>) = T`, `(federation-admit, top-cells-produced, <count>) = T`.
6. Returns 200 with a summary (counts).

Idempotency: applying the same envelope twice produces the same final state (per the lemma).

## Acceptance

- [ ] `POST /federation/admit` route registered.
- [ ] Sync-scope filtering enforced; out-of-scope cells produce ultra-vires-from-peer witnesses.
- [ ] Idempotency verified by test (double-apply same envelope, final state unchanged).
- [ ] $\top$-cell production verified by test (apply two envelopes with conflicting cells, $\top$ appears).
- [ ] No last-write-wins behavior.

## Progress cells

*(empty — task not yet started)*
