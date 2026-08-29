---
type: claim
status: draft
depends-on: [substrate, witness, jsonl-event-log, verb]
---

# Substrate purity

**Claim.** PyFARS does not modify substrate state outside of explicit substrate-transitioning verbs whose modifications are recorded as witness events in the JSONL log.
Runtime processes (caches, in-memory indices, derived computations, reads) do not write to substrate.
Implementation choices that look like substrate writes (e.g., a render that updates a freshness marker) are either (a) actually witnesses, or (b) not substrate writes — they're projection-target writes.

## Statement

For every substrate state transition $S(\tau) \to S(\tau')$ between two PyFARS quiescent states:

$$S(\tau') \;=\; \mathrm{Cl}_{R(\tau')}\big(S(\tau) \sqcup \mathrm{cells}(\Delta L)\big)$$

where $\Delta L$ is the set of JSONL events appended between $\tau$ and $\tau'$, and $\mathrm{Cl}$ is the closure operator at $\tau'$.
No transition occurs without corresponding events in $\Delta L$.

Equivalently: the cells that change between $S(\tau)$ and $S(\tau')$ are exactly the cells fired by the closure of $\Delta L$.
Nothing changes silently.
Nothing changes without a witness chain.

## Sketch

The proof has two parts: (1) substrate transitions only fire through verbs that produce witnesses, (2) verbs that produce witnesses do exactly what their witnesses claim.

### (1) Verbs are the only substrate transitions

PyFARS's CLI, MCP, and FastAPI surfaces all dispatch to the verb-registry.
Direct substrate manipulation (e.g., editing the JSONL log by hand, or modifying frontmatter without a verb) is not part of the runtime; if a process bypasses the verb layer (which is technically possible in a flatfile system — anyone can append to the log file), the result is captured in the next corpus reload but does not have an authorized witness.
Such bypass is, by discipline, an external transition, not a PyFARS-internal one.

This is a *commitment*, not a structural impossibility.
The flatfile substrate is filesystem-readable and -writable; an out-of-band edit can change disk state.
The substrate-purity claim says PyFARS-the-package does not perform such edits.
External edits are, in principle, discoverable (via diff-based reconciliation) and can be either witnessed retroactively or rejected.

### (2) Verb witnesses are accurate

For each verb $V$ that produces witnesses, the cells the verb claims to introduce in its witness equal the cells the verb actually changes in substrate.
This is enforced by:

- The verb's implementation directly emits the witness cells; substrate is updated *through* the witness, not in addition to it.
- Closure runs over the witness's cells, producing consequence cells (which are derivable, not separately witnessed).
- The verb's projection (its printed output) is rendered against the post-witness substrate.

[Gap: the realization's actual code paths must be audited to confirm no verb has a side-effect that the witness doesn't capture.
The audit is partly mechanized (validate has rules that flag substrate edits not coming from witnesses); fully proving witness-accuracy across all verbs is open.]

### (3) The runtime does not touch substrate

In-memory indices (the predication-graph cache, the slug-index, the verb-registry's runtime form) are *derived* from substrate.
They are computed by reading; they are invalidated and rebuilt as substrate transitions occur; they are never written to substrate.
The runtime's job is to project, dispatch, and surface — never to silently mutate.

## Discussion

### What this claim does

Substrate-purity is what makes PyFARS *auditable*.
Every cell can be traced to a witness; every witness names an actor and a verb; every actor's authority chain is itself substrate content.
The result: a question like "why is task-42 assigned to agent-X?" has a definite answer (the witness that recorded the assignment), and a question like "is the substrate currently consistent?" has a definite truth (validate over the closure of the log).

It is also what makes PyFARS *reproducible*.
Given the JSONL log and the closure-rule-system, anyone can reconstruct substrate.
There is no hidden state, no undocumented mutation.

### What would have to change for this claim to fail

- If a verb's implementation were to update substrate state without producing a corresponding witness, the claim would be refuted for that verb.
  The fix would be to either add the witness or remove the substrate update.
- If the runtime introduced caches that wrote back to substrate (e.g., a perf optimization that materialized a derived cell as a "real" cell), the claim would fail.
  The fix is to keep caches read-only.
- If a harness produced files that PyFARS later re-read as substrate without re-witnessing the harness's outputs, the claim would fail.
  The fix is for harnesses to either be projection-only (no inbound) or to produce witnesses for inbound.
- If a heartbeat tick performed substrate writes outside the dispatch-witness pattern (e.g., wrote a "tick happened" cell directly), the claim would fail.
  The fix is to either route the cell through a witness or recognize it as runtime-only metadata, not substrate.

### What this claim does not say

- It does not say PyFARS is bug-free.
  A bug that violates substrate-purity is an *implementation defect*; the claim is a discipline that the implementation aspires to and that violations of are findings to be fixed.
- It does not say *no* substrate write happens.
  Substrate transitions happen all the time (every verb that produces a witness).
  It says *every* substrate transition has a witness — there is a 1-to-1 correspondence.
- It does not say substrate state is read-only with respect to all observers.
  Many observers (agents, captain, audit tools) read substrate; the claim concerns *writes*.

## Specializations

Substrate-purity is the foundational claim; its discipline propagates to specialized morphisms and operations whose purity is a special case.
Specializations may have their own claim files when audit-tractability benefits from the specificity:

- [`render-as-http-response-is-pure`](render-as-http-response-is-pure.md) — the HTTP response render specialization preserves substrate-purity across the transport boundary; the HTTP wrapper adds no substrate writes.

When a new substrate-pure morphism enters the realization (a new render specialization, a new transport, a new caching layer), its purity may be stated as a specialization claim and connected here.
The general substrate-purity claim continues to govern any operation whose purity isn't separately stated.

## Connection to upstream

Substrate-purity is PyFARS's realization-level expression of the predicated-computing commitment to substrate as the *primary computational medium*.
The upstream commitment says substrate is what computers compute *with*; substrate-purity says substrate is also what they *commit to* — every change is explicit, witnessed, and auditable.
The two together carve PyFARS out as the kind of system where audit is structural, not bolted on.
