---
type: definition
class: wire-format
status: draft
realizes: [federation-envelope-record, algebra-as-protocol]
depends-on: [predication-cell, peer-record, jsonl-event-log, witness, content-hash-addressing]
implementation: pyfars.federation.envelope
---

# Federation envelope record

The PyFARS-realization of upstream [federation-envelope-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/federation-envelope-record.md): the wire-format that crosses the boundary between two federating engines.
An envelope is a JSON document carrying a cell-set from a substrate scope, the source peer's signature, the source's `rsv_hash` for replay alignment, and the cadence-stamp.

The envelope is *the* federation protocol — there is no separate sync layer, no RPC, no leader-election.
Two engines federate by exchanging envelopes; the bilattice value-domain join performs the merge; per [`replay-determinism`](../claims/replay-determinism.md) plus the closure-merge commutation (upstream [`flatfile-federation-equivalence`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theorems/flatfile-federation-equivalence.md)), order of envelope arrival does not affect the converged state.

## Wire shape

```json
{
  "envelope-id": "env-2026-05-09T14:30:00-cold-red-gate-vps-mini",
  "from-peer": "cold-red-gate-561-peer",
  "to-peer": "vps-mini-quiescent-peer",
  "scope": "theories/",
  "ts": "2026-05-09T14:30:00.000Z",
  "rsv-hash": "sha256:XYZABC...",
  "rule-system-version": "0.7.3",
  "cells": [
    {"s": "predication-categories", "p": "depends-on", "o": "categorial-logic", "v": "t"},
    {"s": "predication-categories", "p": "status", "o": "settled", "v": "t"}
  ],
  "signature": "ed25519:DEFGHI..."
}
```

## Cells (envelope-as-substrate-record)

When an envelope is received, before merge, it is recorded in our substrate as a `(envelope-id, ...)
` cell-set:

- `(envelope-id, type, "federation-envelope") = t`
- `(envelope-id, from-peer, <peer-slug>) = t`
- `(envelope-id, scope, <path>) = t`
- `(envelope-id, ts, <iso>) = t`
- `(envelope-id, rsv-hash, <hash>) = t`
- `(envelope-id, rule-system-version, <semver>) = t`
- `(envelope-id, signature-verified, true|false) = t` (after verification)
- `(envelope-id, merged, true|false) = t` (after merge)
- `(envelope-id, contains-cells-count, <n>) = t`

The envelope's cells themselves are NOT projected as system cells until merge — they live as a sub-record (`envelope.cells`) that the merge morphism reads.

## Merge operation

For an envelope $E$ from peer $P$ with cells $C = \{(s_i, p_i, o_i, v_i)\}$ and our current substrate $S$:

$$\mathrm{merge}(S, E) \;=\; S \;\vee_k\; \mathrm{cells}(E)$$

— cellwise bilattice $\vee_k$ join over the Belnap–Fitting FOUR.
For each $(s_i, p_i, o_i)$ key: - If $S$ has no cell with that key: add $E$'s cell. - If $S$'s cell has the same value: no change (idempotent). - If $S$'s cell has $\bot$ and $E$'s has a definite value: take $E$'s. - If both have definite values that disagree (one $t$, other $f$): merge produces $\top$ on the key, surfacing as an [anomaly-witness](anomaly-witness.md).

## Signature and replay-alignment

The envelope's signature is verified against the peer's `public-key` cell (per [peer-record](peer-record.md)).
Unverified envelopes are recorded but not merged — the `signature-verified: false` cell flags them for captain review.

The `rsv-hash` and `rule-system-version` fields support replay-alignment: when our peer is on a different rule-system version than ours, the receiving engine can detect the divergence and (optionally) reject the envelope until the rule-system versions align.

## Discussion

The envelope-as-record discipline (recording the envelope's metadata in our substrate before merging its content) gives us full provenance for federation: we can answer "where did this cell come from?" by tracing back through the merge events to the envelope, then to the peer.
This is a substantive realization choice: a leaner federation protocol would merge envelopes and discard the wrapping.
PyFARS keeps the wrapping because audit and federation-debug requires it.

The envelope is *the* protocol per [`algebra-as-protocol`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/algebra-as-protocol.md): no separate negotiation, no protocol-version handshake, no message types beyond "here are cells."
The bilattice's algebra carries the convergence semantics; the envelope carries the cells; the merge happens.
