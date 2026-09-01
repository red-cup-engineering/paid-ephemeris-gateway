---
type: definition
class: system-entity
status: draft
realizes: [resource]
depends-on: [predication-cell, jsonl-event-log]
implementation: pyfars.federation.content_hash
---

# Content hash

A canonical SHA-256 over the content of a system cell, cell-set, file, or envelope, computed under the polity's content-canonicalization discipline.
Where [`closure-state-hash`](closure-state-hash.md) is over the *post-closure* substrate (the algebra-equation fixed point), a content-hash is over *raw content* — what was authored, not what was derived.

The two hashes serve different purposes: closure-state-hash answers "do two substrates settle to the same state?"; content-hash answers "do two byte streams contain the same content?".
Federation uses both: content-hash addresses individual cells, files, and envelopes for routing and deduplication; closure-state-hash drives the merge-or-not handshake.

## Computation

For a content unit $C$ (one or more $(s, p, o, v)$ tuples, a file, or an envelope payload):

$$\mathrm{content\text{-}hash}(C) \;=\; \mathrm{SHA{\text -}256}\big(\mathrm{canonicalize}(C)\big)$$

where `canonicalize` produces a byte-stream:

- **For cell-sets**: lexicographic $(s, p, o, v)$-sort with bilattice values as fixed-width strings (`t`/`f`/`bot`/`top`); strings as UTF-8 NFC; integers as decimal; floats per IEEE 754 double-precision binary representation.
- **For files**: the file's bytes verbatim (no canonicalization — the file's content *is* the canonical form).
- **For envelopes**: the envelope's JSON body in JCS (RFC 8785) canonical-JSON serialization, with all keys NFC-normalized.

## Cells

A content-hash is itself a system-resident cell:

- `(content-id, content-hash, <hex>) = t` — for any addressable content unit (file, cell-set, envelope).
- `(content-id, hash-algorithm, "sha-256") = t` — algorithm version pinned for federation portability.
- `(content-id, canonicalization-version, <version>) = t` — when the canonicalization rules evolve, the version cell records which rules produced the hash.

## Three engineering uses

### File addressing

Files in the substrate (the markdown corpus, materialized-view backings, federation envelopes on disk) carry a content-hash cell.
Two files with equal hashes are byte-identical; deduplication, integrity verification, and replay-checks all read this cell.

### Cell-set addressing for federation envelopes

A federation envelope's payload is a cell-set; the envelope record carries `(envelope, payload-content-hash, <hex>) = t`.
Receivers verify hash before merge: if the envelope arrives with the wrong hash for its payload, `(envelope, hash-verify-failed, t) = top` fires on `guard`.

### Causal-event content addressing

A [causal-event-record](causal-event-record.md) may use content-hashes for its `caused-by` references rather than event IDs.
Content hashes are federation-portable (no cross-peer ID collision concerns); event IDs are not.
The substrate accepts both forms; federation envelopes prefer content-hashes.

## What this object commits to

1. **One algorithm, pinned.** SHA-256 across the polity.
  Algorithm changes require a substrate-recorded version bump (`hash-algorithm` cell update) and a federation handshake step where peers exchange algorithm versions before merge.
2. **Canonicalization discipline is shared.** Two peers must canonicalize identically for content-hash equality to mean what it should.
  The `canonicalization-version` cell is the federation-handshake check; mismatched versions block merge until reconciled.
3. **Hashes are over canonical bytes, not in-memory representations.** A peer that hashes its in-memory cell-set without canonicalization-sort produces a hash that no other peer matches.
  The system's hash-emitting code reads through the canonicalize-then-hash pipeline.

## What this object does not specify

- The migration path when SHA-256 needs to be replaced (post-quantum, or after an attack on SHA-256).
  Currently no migration discipline; whether to carry both old and new hashes during transition is open.
- The discipline for hashes over *partial* content (a cell-set's first N cells without the rest).
  Currently full-content only; partial-hash for streaming federation is open.
- Hashes over *substrate scopes* defined by predicates (rather than enumerable cell-sets).
  A scope-hash requires the canonicalization to enumerate all matching cells; currently each polity defines per-scope canonicalization rules in `governance/scopes/`.
