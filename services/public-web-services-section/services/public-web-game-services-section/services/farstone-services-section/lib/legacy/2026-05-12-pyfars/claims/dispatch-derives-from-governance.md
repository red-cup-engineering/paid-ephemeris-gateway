---
type: claim
status: draft
depends-on: [substrate, dispatch, scheduling-policy, capability-table, dispatch-closure-rule-system, governance-frontmatter-is-substrate]
---

# Dispatch derives from governance

**Claim.** Every dispatch decision PyFARS makes is computable as a closure step over governance cells + work cells + capability-table cells, under the polity's [dispatch-closure-rule-system](../objects/dispatch-closure-rule-system.md).
No Python-hardcoded eligibility, authority, or selection logic is *load-bearing* for the truth of any dispatch decision.
The Python implementation is the realization (it has to compute the closure somehow); the *correctness* of the realization is judged against the substrate-declared rules, not the other way round.

## Statement

For any dispatch decision $D$ producing assignment cell $(W, \texttt{assigned-to}, A) = \mathbf{t}$ in PyFARS, the cell's truth is determined by:

$$\mathrm{Cl}_{R^{\mathrm{dispatch}}}\big( \text{Governance-cells}(P) \;\cup\; \text{Work-cells}(P) \;\cup\; \text{Capability-table}(P) \big) \;\ni\; (W, \texttt{assigned-to}, A) = \mathbf{t}$$

where $P$ is the polity, $R^{\mathrm{dispatch}}$ is its dispatch-closure-rule-system, and $\mathrm{Cl}$ is the closure operator.
The cell is in the substrate iff the closure produces it.

In particular: a Python implementation that produces an assignment cell *not* derivable from this closure is a substrate-purity violation; an implementation that *fails to* produce a cell that closure derives is incomplete.
The substrate is the truth; Python is the runtime.

## Sketch

The proof is by reduction:

### (1) Eligibility derives from substrate

Per [capability-table](../concepts/capability-table.md), eligibility is the closure of governance cells (offices, deontic-profiles, jurisdictions, delegations) under capability-table-construction rules.
No out-of-substrate input.

### (2) Authority derives from substrate

Authority chains are delegation cells (`delegated-from`, `delegated-to`); their composition under transitive-closure is the authority-table.
No out-of-substrate input.

### (3) Capacity derives from substrate

Each office's current load is the count of open assignment cells naming that office.
Substrate-derived; no out-of-substrate state.

### (4) Selection derives from substrate

Polity-declared preference rules (provider rank, freshness, priority weights) live in substrate cells.
Selection is the application of these rules over the eligible-and-authorized-and-with-capacity set.

### (5) Combining the above

Each of (1)–(4) reads only substrate.
Their composition is a closure step; its output is the dispatch decision.
The closure is fully substrate-derivable.

**Realization status (May 2026):** the realization implements the closure form of dispatch via `runtime/eligibility_rules.py` (substrate-authorized rule instantiators) + `runtime/closure_runner.py` (Kleene closure with per-firing provenance and a deterministic `rsv_hash`) + `runtime/dispatch_graph.py` (LangGraph driver).
The eligibility and disqualification axes (capabilities, skills, jurisdiction, rate-limit, charter-binding) are substrate-driven; the selection step (winner choice from the eligible set) currently uses a lexicographic slug-tiebreak in `select_winners_node` rather than a substrate-declared selection rule — that final step is the remaining alignment-with-claim work.
Assignment-as-substrate-cell is also future work; winners are currently returned as `(W, D)` tuples in `DispatchState` rather than written back as `(W, assigned-to, D) = T` cells.

## Discussion

### What this claim does

It establishes the *direction of correctness*: governance is the source; Python is the implementation.
When the two disagree, governance wins.
When governance is incomplete, the realization may have stopgap behavior, but that behavior is hardcoding-in-need-of-substrate-replacement, not authoritative truth.

This re-orients dispatch development.
Instead of asking "what should the Python code do?", ask "what should the substrate cells say?"
The Python code follows.

### What this claim does not say

- It does not say the realization is *currently* substrate-driven.
  It is largely hardcoded; this claim is a constraint on what the realization ought to satisfy.
- It does not say substrate cells must *literally* be parsed-and-evaluated each tick at runtime.
  A practical realization may *compile* substrate-declared rules into runtime data structures (a closure-rule-engine) for efficiency; the compiled form is substrate-derived; refresh on rule changes.
- It does not say all of dispatch is policy.
  There are mechanisms (the closure runtime, the witness writer, the heartbeat loop) that are implementation, not policy.
  Policy is what's in substrate; mechanism is what's in code.
  The two are kept distinct.

### What would have to change for this claim to fail

- If dispatch decisions came to depend on out-of-substrate state (an environment variable, a config file outside the corpus, an external service), the claim would fail for those dependencies.
  Fix: bring the dependency into substrate, or treat the dependency as input that's substrate-witnessed (e.g., observation cells about external state).
- If a polity wanted dispatch decisions to be opaque (intentionally non-derivable from substrate, e.g., for stochastic load balancing), the claim would weaken.
  Stochastic decisions can still be substrate-derivable if the seed is substrate-witnessed.
- If the realization grew dispatch-side optimizations that genuinely couldn't be expressed as closure rules, the claim's "load-bearing" qualifier would become subtle.
  (Currently no such case is on the roadmap.)

## Discussion (continued): why this is load-bearing

PyFARS's auditability story depends on this claim.
The captain reading a dispatched task asks "why was this routed here?"
The answer must be derivable from substrate — not "because the Python code felt like it," but "because office X holds skill Y and work-record Z requires Y."
The audit chain runs through substrate; the Python is the computation; the cells are the truth.

This is the same audit story as [`substrate-purity`](substrate-purity.md), specialized to dispatch.
Substrate-purity says PyFARS doesn't write outside witnesses; this claim says PyFARS doesn't decide outside substrate-derivable closure.
Both are necessary for the polity to be substrate-readable end-to-end.

## Connection to upstream

The claim is PyFARS's strongest statement of the predicated-computing commitment to substrate as the *primary computational medium*.
Upstream commits substrate as what the system computes *with*; PyFARS's claim says substrate is also what the system *decides through*.
Decisions are closures, not procedures.
