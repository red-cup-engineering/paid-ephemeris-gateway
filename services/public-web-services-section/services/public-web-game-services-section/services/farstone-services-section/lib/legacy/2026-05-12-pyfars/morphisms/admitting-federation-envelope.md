---
type: definition
class: system-morphism
status: draft
realizes: [intaking, settling]
depends-on: [federation-envelope-record, peer-record, content-hash, closure-state-hash, anomaly-witness, jsonl-event-log]
implementation: pyfars.federation.admit_envelope
---

# Admitting federation envelope

The morphism that receives a federation envelope from a peer, verifies its signature and content-hash, records the envelope as a system cell *before* merging its payload, and applies cellwise $\vee_k$ merge of the envelope's cells against the local system's cells in the same scope.

Pairs with [`emitting-federation-envelope`](emitting-federation-envelope.md): the emit side records before send; the admit side records before merge.
Both sides keep envelopes system-resident throughout their lifecycle.
The merge itself is mechanical — cellwise $\vee_k$ on the Belnap-Fitting FOUR — but the surrounding discipline (verify, record, then merge) is what makes the merge auditable and replay-deterministic.

## Signature

$$\mathrm{admit\text{-}envelope}\colon \mathrm{Envelope} \times \mathrm{Substrate} \;\longrightarrow\; \mathrm{Substrate}'$$

— takes a received envelope (JSON parsed from the HTTP body) and the local substrate; produces the substrate extended by the envelope record cells AND the merge results.

## What the morphism does

1. **Locate sender peer.** Read the envelope's `from-peer` field; read `(?peer, address, ?addr) = t`, `(?peer, public-key, ?pk) = t`, `(?peer, trust-level, ?level) = t`.
  If the sender is not a known peer, fire `(envelope, unknown-sender, ?id) = top` on `guard` and refuse.
2. **Verify signature.** Read `(?peer, public-key, ?pk) = t`; verify the envelope's signature against `?pk`.
  If invalid, fire `(envelope, signature-invalid, ?id) = top` on `guard` and refuse.
3. **Verify content hash.** Read the envelope's `payload-content-hash`; recompute the hash over the envelope's payload per [content-hash](../objects/content-hash.md) canonicalization rules.
  If mismatch, fire `(envelope, content-hash-mismatch, ?id) = top` on `guard` and refuse.
4. **Record envelope as system cell BEFORE merge.** Write to `governance/federation/envelopes/incoming/<envelope-id>.md`:
   - `(envelope, type, "federation-envelope-record") = t`
   - `(envelope, from-peer, ?peer) = t`
   - `(envelope, scope, ?scope) = t`
   - `(envelope, payload-content-hash, ?hash) = t`
   - `(envelope, received-at, <ts>) = t`
   - `(envelope, status, "received-pending-merge") = t`
5. **Verify scope is shared.** Read `(?peer, shared-scopes, ?scopes) = t`; if `?scope` not in `?scopes`, fire `(envelope, scope-not-shared, ?scope) = top` on `guard`.
  The peer claimed a scope they don't share.
6. **Apply trust-level filter.** Read `(?peer, trust-level, ?level)`.
  For `untrusted`, the envelope is logged but not merged.
  For `observe-only`, cells are merged with `(merged-cell, source-trust, observe-only) = t` annotation.
7. **Cellwise $\vee_k$ merge.** For each cell in the envelope's payload, compute `local-value ∨_k envelope-value` per the Belnap-Fitting FOUR.
  Conflicting cells (one peer at $\mathbf{t}$, the other at $\mathbf{f}$) produce $\top$, which surfaces as an [`anomaly-witness`](../objects/anomaly-witness.md) on `guard`.
8. **Update peer's last-known hash.** Write `(?peer, last-known-closure-state-hash-for-scope, ?scope, ?envelope-sender-hash) = t`; the next federation cycle uses this for hash-skip discipline.
9. **Mark envelope merged.** `(envelope, status, "merged") = t`, `(envelope, merged-at, <ts>) = t`.
10. **Emit causal event.** A `federation-envelope-admitted` event on the `inter-office` channel; `caused-by` includes the merge cells and the envelope record.

## Cellwise $\vee_k$ on FOUR

The merge operation is the bilattice's knowledge-order join:

| $\vee_k$ | $\mathbf{t}$ | $\bot$ | $\mathbf{f}$ | $\top$ |
|---|---|---|---|---|
| $\mathbf{t}$ | $\mathbf{t}$ | $\mathbf{t}$ | $\top$ | $\top$ |
| $\bot$ | $\mathbf{t}$ | $\bot$ | $\mathbf{f}$ | $\top$ |
| $\mathbf{f}$ | $\top$ | $\mathbf{f}$ | $\mathbf{f}$ | $\top$ |
| $\top$ | $\top$ | $\top$ | $\top$ | $\top$ |

$\bot$ + $x$ = $x$ (knowledge-order: more information wins). $\mathbf{t}$ + $\mathbf{f}$ = $\top$ (contradictory information surfaces as anomaly). $\top$ is absorbing.

## What this morphism commits to

1. **Verify-then-record-then-merge.** The merge happens only after signature, hash, scope, and trust checks all pass *and* the envelope is recorded.
  No silent merge, no merge-of-unverified-data.
2. **Substrate-record-before-merge.** The envelope is a system cell before any merged cell appears.
  If merge fails partway, the envelope record persists; recovery reads it.
3. **Sovereignty-preserving.** No envelope can write cells outside its shared scope.
  A peer attempting to ship cells outside the shared scope produces a `(envelope, scope-violation, ?scope) = top` on `guard`; the cells are not merged.
4. **Idempotent.** Re-admitting the same envelope (same content-hash) is detected by the recorded envelope cell; the second admission is logged and skipped.

## Conflict adjudication

A cellwise merge that produces $\top$ is *not* silently resolved.
The substrate emits an [`anomaly-witness`](../objects/anomaly-witness.md) on `guard` with the conflicting cells and their sources (which peer asserted which value).
Adjudication routes per the polity's policy:

- **Captain-adjudication** (default) — captain reviews the anomaly and authors a resolution cell.
- **Reputation-weighted resolution** — the substrate weights peer values by `(peer, reputation, ?score)` cells; the higher-reputation value wins.
  Open work.
- **Quorum resolution** — when 3+ peers ship the same cell, majority wins.
  Routes through M6' (coordination-federation).

## What this morphism does not specify

- The discipline for envelopes whose payload is *partially* mergeable (some cells pass verification, some fail).
  Currently all-or-nothing per envelope; per-cell admission would require finer accounting.
- W-MSR Byzantine filtering (per the [federation-resilience question](../questions/federation-resilience-and-degradation.md)).
  When the polity has 3+ peers and a `byzantine-tolerance-record`, the morphism would filter outlier values before $\vee_k$.
  Open work.
- Distillation-aware admission (envelopes carrying distilled-closure-outputs rather than raw cells).
  Requires the local closure-rule-system to match the sender's; check-then-admit discipline is open work.
