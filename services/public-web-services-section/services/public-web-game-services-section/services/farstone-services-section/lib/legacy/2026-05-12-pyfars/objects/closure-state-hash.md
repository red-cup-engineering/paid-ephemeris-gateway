---
type: definition
class: system-entity
status: draft
realizes: [substrate]
depends-on: [jsonl-event-log, dispatch-closure-rule-system, predication-cell]
implementation: pyfars.runtime.closure_runner.compute_closure_state_hash
---

# Closure-state hash

A canonical SHA-256 hash over the post-closure system state — every $(s, p, o, v)$ cell present after [`dispatch-closure-rule-system`](dispatch-closure-rule-system.md) closure has run to fixed point.
Two PyFARS instances with equal `closure_state_hash` have *byte-identical* substrate states under the canonical projector ordering; two with unequal hashes differ in at least one cell.

The hash is the substrate-algebra primitive on top of which two engineering disciplines rest: replay-determinism's verification surface, and federation's "envelope-needed?" handshake.

## Computation

For a system state $S = \mathrm{Cl}_{R(\tau)}(\bigsqcup_i \mathrm{cells}(e_i))$ at time $\tau$:

$$\mathrm{closure\_state\_hash}(S) \;=\; \mathrm{SHA{\text -}256}\big(\mathrm{canonical{\text -}sort}(S)\big)$$

where `canonical-sort` writes cells in lexicographic $(s, p, o, v)$ order, with bilattice values projected as fixed-width strings (`t`/`f`/`bot`/`top`) and string fields encoded as UTF-8 NFC.
The hash is computed over the byte stream of the sort, not over an in-memory representation.

## Cells

A closure-state hash is itself a system-resident cell:

- `(instance, closure-state-hash, <hex>) = t` — current hash for the local instance, refreshed at each settling pass.
- `(instance, closure-state-hash-at, <ts>, <hex>) = t` — historical hash at past tick boundaries (for time-travel verification).

Federation envelope records carry `(envelope, sender-closure-state-hash, <hex>) = t` to let the receiver short-circuit merge when hashes match.

## Two engineering uses

### Replay-determinism verification surface

[`replay-determinism`](../claims/replay-determinism.md) claims that $\mathrm{Replay}(L, R, \tau)$ is byte-identical across conformant runtimes.
The closure-state hash is the witness: a successful replay produces the same hash as the original run.
A drift in hashes localizes the violation to a closure-rule firing whose pre/post hashes differ between the two runs, which is the diagnostic surface that turns replay-determinism from a paper claim into a CI gate.

### Federation handshake primitive

When two peers exchange system state per [federation-envelope-record](federation-envelope-record.md), the receiver first compares its `closure-state-hash` for the shared scope against the sender's.
If equal, the receiver knows nothing in the scope has diverged and skips merge entirely — no envelope payload needs to be processed.
If unequal, the envelope's per-cell content is processed via $\vee_k$ merge.

This collapses the common case (two peers in sync at handshake time) to an $O(1)$ comparison — important for the M6 federation cycle running per-hour across many peers.

## Algebra-equation interpretation

The closure-state hash carries an algebra-equation interpretation per the [substrate-algebra question](../questions/substrate-algebra-closure-and-replay.md): the post-closure substrate $S$ satisfies $S = \mathrm{Cl}_R(S)$ — it is a fixed point of the closure operator.
Two states $S_1, S_2$ with equal hashes satisfy the same fixed-point equation; the hash is the system's external witness that `is_cl_algebra(state) = true`.

This is why the hash is post-closure rather than pre-closure: the pre-closure cell-set is implementation-iteration-order dependent in pathological cases; the post-closure fixed point is invariant.

## What this object commits to

1. **Hash is over post-closure state, not over event log.** The event log has its own hash (`rsv_hash` for the rule-system version, content-hash on the log file); the closure-state hash is over the *closure*, not the events that produced it.
2. **Canonical sort is fixed.** Lexicographic $(s, p, o, v)$ with bilattice values as fixed-width strings.
  Implementations diverging on sort produce divergent hashes; the canonical sort is part of the system's conformance contract.
3. **NFC normalization is required.** Unicode strings are normalized to NFC before encoding.
  Without this, federation between peers using different normalization forms would produce false hash mismatches.

## What this object does not specify

- The cadence of hash refresh.
  Currently per-settling-pass; whether to additionally publish hashes at sub-pass granularity (per closure-rule firing) for finer drift localization is an open optimization.
- The hash's relationship to *partial* substrate scopes.
  A federation handshake compares hashes over a *shared scope*, not the full substrate; computing scope-restricted hashes efficiently (without re-walking the whole substrate) is open.
  A Merkle tree over canonical-sort-buckets is the obvious extension.
- The discipline for hash mismatches that are not divergence but staleness (one peer is several ticks behind).
  Currently treated identically; whether to carry a `closure-state-hash-as-of-tick` cell for ordering is open.
