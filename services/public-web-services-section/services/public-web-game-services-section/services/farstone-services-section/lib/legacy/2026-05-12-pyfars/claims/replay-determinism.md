---
type: claim
status: sketch
depends-on: [jsonl-event-log, jsonl-is-canonical-state, dispatch-closure-rule-system, substrate-purity, witnessing-completion]
---

# Replay determinism

**Claim.** For any PyFARS instance, replaying the [JSONL event log](../objects/jsonl-event-log.md) $L$ against the closure-rule-system $R$ active at the original-run time produces a substrate state byte-identical to the original-run's state at the corresponding time.
Furthermore, on a fixed $(L, R, \tau)$, the replay is deterministic: the same input triple produces the same byte-output across runs, hosts, and engine versions that share $R$'s implementation contract.

## Statement

Let $L = (e_1, e_2, \ldots)$ be a JSONL event log, $R$ the closure-rule-system, and $\tau$ a moment such that all $e_i$ with $\mathrm{ts}(e_i) \leq \tau$ are present in $L$.
Define replay:

$$\mathrm{Replay}(L, R, \tau) \;=\; \mathrm{Cl}_R\big(\bigsqcup_{i:\, \mathrm{ts}(e_i) \leq \tau} \mathrm{cells}(e_i)\big)$$

— exactly the substrate-state expression from [`jsonl-is-canonical-state`](jsonl-is-canonical-state.md).
The claim is that the *byte-serialization* of $\mathrm{Replay}(L, R, \tau)$ — the sequence of $(s, p, o, v)$ tuples in canonical sort order, written through the substrate's projector framework — is identical across all conformant runs.

Formally: for any two PyFARS-conformant runtimes $\rho_1, \rho_2$ and any $(L, R, \tau)$:

$$\mathrm{serialize}(\rho_1\text{-}\mathrm{Replay}(L, R, \tau)) \;=\; \mathrm{serialize}(\rho_2\text{-}\mathrm{Replay}(L, R, \tau))$$

with byte-equality.

## Sketch

The proof factors through three lemmas:

### (1) Cell composition is determined by the log

By [`jsonl-is-canonical-state`](jsonl-is-canonical-state.md), the multiset of cells asserted by $L$ up to $\tau$ is determined by $L$ alone.
The bilattice's join $\sqcup$ is associative, commutative, and idempotent, so the order of event-application does not affect the joined cell-set. ✓

### (2) Closure under $R$ is deterministic

Closure-rule application is a fixed-point operation: $\mathrm{Cl}_R(X) = \bigcup_n R^n(X)$ where $R^n$ is the $n$-fold iteration.
The fixed-point exists and is unique because $R$ is monotone over the bilattice's knowledge-order $\leq_k$ (per the upstream [`closure-rule-system`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/closure-rule-system.md) definition).

The fixed-point's *content* is determined by $R$ and the seed $X$; the *order* in which intermediate cells appear during iteration may vary by implementation, but the final cell-set is invariant. ✓

[gap: requires a proof that the closure-fixpoint computation in `pypredcalc.
PredicationStore.close()` is canonical-form output — i.e., that the iteration's final cell-multiset is sort-stable.
The current implementation appears to be, but this has not been formally verified.]

### (3) Serialization is canonical

The substrate's projector framework writes cells in `(s, p, o, v)`-lexicographic order; the JSON projector writes object keys in alphabetical order; the markdown projector writes frontmatter keys in declaration-or-alphabetical order per the projector's declared discipline.
Two runtimes producing the same cell-set produce the same byte-string. ✓

[gap: assumes all projector implementations agree on canonical sort order.
The test suite's `test_projector_round_trip_is_byte_identical` test covers JSON; markdown round-trip is tested for a fixture but not exhaustively over the cell-space.]

$\square$ (modulo gaps)

## Discussion

Replay-determinism is the load-bearing claim that makes [federation by value-domain join](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/algebra-as-protocol.md) actually work: two peers exchanging event logs can each replay the other's log against their own closure-rule-system and compare the resulting substrate states byte-for-byte.
Without byte-equality, cross-peer "do we agree?" reduces to a fuzzy semantic-equivalence check; with byte-equality, it is a hash comparison.

Replay-determinism is also the testable claim that the engine's behavior is *purely* a function of $(L, R)$ — no hidden state, no clock-dependent randomness, no race-conditional ordering.
Failures of replay-determinism are findings that the engine has acquired implicit state outside the substrate, which is a [substrate-purity](substrate-purity.md) violation.

## What this claim does not say

- It does not say the original run's `current-consumption` cells (or any other derived/reset-dependent cells) are deterministic *across reset events* — replay before vs. after a reset gives different consumption totals, by design.
- It does not say two different rule-systems $R_1 \neq R_2$ replaying the same $L$ produce identical states.
  They generally do not; the claim is conditional on $R$.
- It does not claim wall-clock equivalence: replay is deterministic in the substrate cells, not in the timing or duration of the replay computation.

## Realization status

The claim is currently `sketch` rather than `proved` because gaps (1) and (3) of the proof depend on formal verification of `pypredcalc` and the projector framework.
M3's `replay-determinism-verified` goal is the realization-side empirical check that catches drift before the formal-verification gap is closed.
