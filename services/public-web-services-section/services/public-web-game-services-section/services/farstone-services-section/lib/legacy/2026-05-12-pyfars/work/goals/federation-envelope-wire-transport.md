---
title: "Federation envelope wire transport"
type: goal
milestone: m6-federation
status: open
horizon: captured
theory-basis: [closure-merge-commutation, federation-by-value-domain-join]
tasks:
  - implement-emit-federation-envelope-endpoint
  - implement-admit-federation-envelope-endpoint
  - implement-federation-cycle-as-recurrent-practice
---


After this goal, federation envelopes (the FederationCell-bundled increments to peers' substrates) cross the wire over HTTP per [wiring-protocols.md §4.6](../../governance/specifications/wiring-protocols.md).
Each engine exposes `emit-federation-envelope` (push) and `admit-federation-envelope` (pull/receive) endpoints; a [recurrent practice](../recurrent-practices/_index.md) (federation-cycle) fires on cadence and exchanges envelopes per the peer records.

## Why

Once the spec is authored, content-hash addressing exists, and peer records are loaded, the actual wire transport is the remaining engineering work.
The transport doesn't innovate — it serializes the existing FederationEnvelope dataclass, sends it over HTTP, and admits the response into the local store via cellwise $\vee_k$.

## Theory grounding

**1.
Closure-merge commutation** (FARS `runtime/federation.py`, [`flatfile-agentic-resource-system/_index.md`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)). $\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$. **The wire transport must preserve this property**: arbitrary delivery ordering of envelopes converges to the same final state.
This is what makes the transport correctness-by-construction rather than correctness-by-protocol-engineering.

**2.
Federation-by-value-domain-join as the protocol** ([Charter](../../governance/charter.md) C4).
The HTTP transport is just a delivery mechanism. **The semantics is the bilattice algebra**, not the HTTP semantics.
HTTP timeouts, retries, ordering — none of these affect correctness as long as eventually-delivered envelopes apply to the local store.

### Design constraints from this grounding

- **At-least-once delivery is sufficient; exactly-once is unnecessary.** Per the closure-merge commutation lemma, applying the same envelope twice produces the same result as applying it once (idempotent).
  HTTP retry on timeout is correct.
- **Envelope ordering is irrelevant.** A peer can send envelope A then B, or B then A, or both at once; the local store reaches the same state.
  This is the operational realization of "the algebra is the protocol."
- **Envelope content is content-hash-addressed.** Each cell in the envelope references its content-hash; receivers can de-duplicate by hash without comparing content.
- **The federation cycle is a [recurrent practice](../recurrent-practices/_index.md).** Authored at `work/recurrent-practices/federation-cycle.md` with cadence (e.g., per minute), peer-iteration logic, and witness emission.

## Acceptance

- [ ] HTTP endpoints `POST /federation/emit` and `POST /federation/admit` exposed via the engine's UDS-bound API.
- [ ] FederationEnvelope serialization is canonical (replay-stable).
- [ ] A `work/recurrent-practices/federation-cycle.md` record declares the cadence and peer-iteration semantics.
- [ ] On each federation-cycle firing: walk peer records, emit envelopes per peer's sync-scope, admit envelopes received from each peer.
- [ ] Idempotency: re-applying an envelope is a no-op (verified by test).
- [ ] Replay determinism preserved: replaying both engines' event logs produces the same converged state.
