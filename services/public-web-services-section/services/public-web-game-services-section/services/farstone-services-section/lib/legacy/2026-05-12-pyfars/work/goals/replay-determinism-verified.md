---
title: "Replay determinism verified"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [operations-loop, federation-by-value-domain-join, recurrent-practice]
tasks:
  - add-event-log-replay-test
---


After this goal, the test suite carries a regression test that replays the event log produced by a representative engine run, reconstructs the substrate state, and asserts the reconstructed state matches the live state.
Drift in determinism is caught at CI time, not in the field.

## Why

The closure runner already stamps each dispatch run with a deterministic `rsv_hash` over `(active rule slugs, instantiated rules, store cells)`.
Federation correctness (M6) depends on this determinism: peers running the same `rsv_hash` over the same store must produce the same closure.
Continuous-loop reliability (M3) depends on it too: replaying the event log to recover from a crash must produce the same state the engine had before the crash.

The property is in place; what's missing is a test that *would catch its violation*.
Without that test, a refactor that breaks determinism (e.g., introduces dict-iteration order dependence, non-deterministic instantiator output) won't surface until the next federation attempt or recovery.

## Theory grounding

**1.
Federation-by-value-domain-join (charter C4)** rests on closure-merge commutation:

$$\mathrm{cl}_p\big(\mathrm{cl}_p(X) \,\vee_k\, Y\big) \;=\; \mathrm{cl}_p\big(X \,\vee_k\, Y\big)$$

(see [`flatfile-agentic-resource-system/_index.md`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) and `runtime/federation.py`'s docstring).
Two engines federating must reach the same closed store from the same input regardless of the order in which they apply the rules. **Replay determinism is the single-engine special case of federation determinism.** If a single engine doesn't replay deterministically, federation between two engines cannot converge.

**2.
The `rsv_hash` semantics** ([`runtime/closure_runner.compute_rsv_hash`](../../../src/pyfars/runtime/closure_runner.py); see also `claims/dispatch-derives-from-governance.md`).
The hash is a SHA-256 over `(active rule slugs sorted, instantiated rules canonicalized + sorted, store cells canonicalized + sorted)`. **The hash is invariant under any reordering that preserves the underlying mathematical structure** — dict iteration order, set membership order, etc. A replay test that passes for one parametrized case but fails for another typically catches a path through the closure runner that depends on insertion order rather than structural identity.

**3.
Multi-agent-work-as-CRDT** ([`predicated-work/theorems/multi-agent-work-as-crdt`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/multi-agent-work-as-crdt.md)).
The substrate's cellwise $\vee_k$ merge is associative, commutative, and idempotent — the CRDT property.
Two engines that take divergent updates during a partition reconcile to the same substrate state under bilattice join when the partition heals, regardless of the order of the merges. **Replay is the CRDT property applied to a single engine's history**: replay is the merge of the empty store with the event log's increments, which is associative-commutative-idempotent in the same way.

### Design constraints from this grounding

- **Test cell-by-cell equality, not store object equality.** Two `PredicationStore` instances with the same cells but different internal dict iteration order are equal as substrate states but may not be `==` as Python objects.
  Compare `dict(store_a._values) == dict(store_b._values)` (or sort-then-compare).
- **`rsv_hash` equality is the strong guarantee.** If `hash_a == hash_b` and the cells differ, there's a bug in `compute_rsv_hash`'s canonicalization, not in the closure runner.
- **The contradiction-case test is the most important one.** Determinism for clean stores is the easy half; determinism when $\top$-cells appear is where bugs live (because $\top$ is produced by the order-independent knowledge-join, but the *firing record* that produced it depends on which rule fired first).
  The test should verify that the cell-set converges even if the `RuleFiring` chain differs in order.
- **Parametrize over `--autonomous` off and on.** With `--autonomous` off, `invoke_agent_node` is gated and produces no agent invocations; the test is pure substrate manipulation.
  With `--autonomous` on, real model calls fire — these are non-deterministic by construction (LLM responses vary).
  The replay test should run with `--autonomous` off to isolate the substrate-determinism property; agent-invocation determinism is a separate concern (and is partly impossible by nature).

## Acceptance

- [ ] A test (`tests/test_runtime_replay_determinism.py` or similar) runs an engine on a fixture substrate, captures the final store and `rsv_hash`, replays the event log against a fresh engine, and asserts the final stores match cell-by-cell and the `rsv_hash`es match.
- [ ] The test runs as part of `nix flake check`.
- [ ] The test is parameterized over multiple fixture substrates (one minimal, one with all five default eligibility rules active, one with a contradiction so `⊤` cells appear).
- [ ] Failure modes are clearly diagnosed: which cell differs, which rule firing differs, what the hash diff is.
