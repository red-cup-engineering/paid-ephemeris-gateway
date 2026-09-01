---
type: definition
class: system-morphism
status: draft
realizes: [messaging, witnessing-completion]
depends-on: [federation-envelope-record, peer-record, content-hash, closure-state-hash, jsonl-event-log]
implementation: pyfars.federation.emit_envelope
---

# Emitting federation envelope

The morphism that bundles cells from a shared scope into a [federation-envelope-record](../objects/federation-envelope-record.md), signs it with the local instance's key, records the envelope as a system cell *before* sending, and ships it to a peer's address per the peer's [peer-record](../objects/peer-record.md).

The pre-send recording discipline is load-bearing: the envelope is a system-resident artifact at every moment in its lifecycle, including before transmission.
If the send fails, the envelope record persists and the next federation cycle retries; if the send succeeds but the peer's ack is lost, the recorded envelope is the witness that the send happened.
The morphism never has a "ghost envelope" state where bytes are in flight without a corresponding system cell.

## Signature

$$\mathrm{emit\text{-}envelope}\colon \mathrm{Peer} \times \mathrm{Scope} \times \mathrm{Substrate} \;\longrightarrow\; \mathrm{Substrate}'$$

— takes a target peer, a shared scope, and the local substrate; produces the same substrate extended with the envelope record cells and the per-cell shipped-at witness.

## What the morphism does

1. **Read peer record.** Read `(peer, address, ?addr) = t`, `(peer, public-key, ?pk) = t`, `(peer, shared-scopes, ?scopes) = t`.
  Verify the requested scope is in `?scopes`; if not, refuse and fire `(peer, scope-not-shared, ?scope) = top` on `guard`.
2. **Compute scope hashes.** Compute [`closure-state-hash`](../objects/closure-state-hash.md) over the local scope's post-closure substrate.
  Read the peer's last-known closure-state-hash (`(peer, last-known-closure-state-hash-for-scope, ?scope, ?
  H) = t`).
3. **Short-circuit on hash equality.** If local hash equals peer's last-known hash, no envelope needed; emit `(peer, sync-skipped-at, <ts>, hash-match) = t` and exit.
  This is the federation-handshake primitive's payoff.
4. **Bundle cells.** Walk the scope's post-closure cells; serialize per [content-hash](../objects/content-hash.md) canonicalization rules (lexicographic $(s, p, o, v)$-sort, NFC-normalized strings).
5. **Construct envelope.** Build the envelope JSON per the federation-envelope-record schema: `{from-peer, to-peer, scope, cells, sender-closure-state-hash, payload-content-hash, sent-at}`.
6. **Sign.** Sign the envelope JSON with the local instance's private key (Ed25519 default); attach the signature.
7. **Record envelope as system cell BEFORE send.** Write the envelope record to `governance/federation/envelopes/<envelope-id>.md` with cells:
   - `(envelope, type, "federation-envelope-record") = t`
   - `(envelope, to-peer, ?peer) = t`
   - `(envelope, scope, ?scope) = t`
   - `(envelope, payload-content-hash, ?hash) = t`
   - `(envelope, recorded-at, <ts>) = t`
   - `(envelope, status, "pending-send") = t`
8. **Send.** HTTP POST the envelope JSON to `?addr`.
  On success: `(envelope, status, "sent") = t`, `(envelope, sent-at, <ts>) = t`.
  On failure: `(envelope, status, "send-failed") = t`, `(envelope, send-failure-reason, <error>) = t`; the next federation cycle retries.
9. **Emit causal event.** A `federation-envelope-emitted` event on the `inter-office` channel; `caused-by` includes the events that produced the cells in the envelope's payload.

## What this morphism commits to

1. **Substrate-record-before-send.** The envelope exists as a system cell before any byte leaves the host.
  No envelope transmits without a corresponding substrate-record.
2. **Sovereignty-preserving.** The morphism only ships cells from `shared-scopes`; cells outside the shared scope never appear in any envelope.
  The peer's substrate cannot read the local instance's full state from envelopes.
3. **Idempotent retry.** A send that fails is retried by the next federation cycle reading `(envelope, status, "send-failed")`.
  Re-emitting the same envelope produces the same content-hash (because the canonicalization is deterministic); the receiver may use this for deduplication.
4. **Hash-skip discipline.** When local and peer hashes match, no envelope is constructed at all — saves bandwidth in the common case where two peers are already in sync.

## What this morphism does not specify

- The retry-backoff policy for failed sends.
  Currently linear retry per federation cycle; exponential backoff with jitter is the practical extension for unreliable peer networks.
- Envelope batching across scopes (one HTTP POST carrying envelopes for multiple scopes).
  Currently one envelope per scope; batching reduces HTTP overhead but complicates per-scope failure attribution.
- Per-cell distillation per [`federation-distill`](../questions/federation-resilience-and-degradation.md).
  When the polity's system carries a `federation-distillation-record` for a scope, the morphism would ship distilled-closure-outputs rather than raw cells.
  Currently raw-only; distillation is open work.
- Envelope-stream (rather than envelope-discrete-message) federation.
  Current shape is HTTP-discrete; long-lived federation streams (WebSocket, gRPC bidi-streaming) would change the shape but not the substrate-record-before-emission discipline.
