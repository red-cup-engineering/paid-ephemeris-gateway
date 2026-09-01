---
type: question
status: open
explores: [closure-2-monad-lax-idempotence, kelly-lack-property-like, four-regime-dichotomy, two-internal-logics, completion-as-quiescence, function-purity-replay-fidelity, capability-non-amplification, operations-causal-settling, materialized-view-as-functorial-projection-cache, m2-substrate-dispatch, m3-continuous-loop, m6-federation, m11-assurance-audit-chain-export]
---

# How does PyFARS expose its substrate-algebra core — closure 2-monad fixed points, regime classification, dual logics, replay-fidelity, causal settling, content-addressed caching — as the unifying machinery underneath every other PyFARS discipline?

A small set of predication-category and platform theorems supplies the algebraic core PyFARS already implicitly relies on.
Surfacing them explicitly is what makes the rest of the substrate's disciplines composable.
Closure-2-monad lax-idempotence underwrites federation determinism, audit replay, materialized-view caching, completion semantics, and pure-function replay-byte-identity.
The four-regime classification gates which closure rules are admissible and bounds audit complexity.
The two-internal-logics dichotomy gives the substrate its dual query API: classical $T_t$ for binary verdicts, paraconsistent $T_k$ for evidence-gathering.
Operations causal-settling supplies the Lorentzian replay frame.
Materialized views fall out as content-addressed projection caches.

---

## Closure 2-monad lax-idempotence and runner invariants

The [closure 2-monad](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) $\mathrm{Cl}$ on $\mathbf{PrFib}$ is **lax-idempotent** (Kock-Zöberlein) per [`closure-2-monad-lax-idempotence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md).
The proof verifies Kelly–Lack (K1), constructing an adjunction $\mu \dashv \eta_\mathrm{Cl}$ in $[\mathbf{PrFib}, \mathbf{PrFib}]$ with counit $\mu \cdot \eta_\mathrm{Cl} = 1_\mathrm{Cl}$.
The fiber-trace is

$$\mathrm{cl}_p(v) \xrightarrow{\eta} \mathrm{cl}_p(\mathrm{cl}_p(v)) \xrightarrow{\mu} \mathrm{cl}_p(v) = 1_{\mathrm{cl}_p(v)}$$

— the composite is the identity by inflationarity and idempotence.

The corollary, by Kelly–Lack's property-like theorem (K2), is structurally load-bearing: **every predication fibration admits at most one $\mathrm{Cl}$-algebra structure up to unique iso.
Being a $\mathrm{Cl}$-algebra is a property, not additional structural data.**

Per [`quiescence-as-closure-algebra`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/quiescence-as-closure-algebra.md), a quiescent substrate state IS a $\mathrm{Cl}$-algebra.
Therefore: **whether PyFARS's substrate is at quiescence is a property of the substrate's current state, decidable without re-running closure.** The runner does not need to fixpoint-iterate to verify quiescence; it needs only to verify the algebra-structure-map equation $\mathrm{cl}_p(v) = v$ at each fiber.

### Consequence 1: post-closure short-circuit

Currently the closure runner runs Kleene iteration until no rule fires.
By K1, the iteration $v \mapsto \mathrm{cl}(\mathrm{cl}(v))$ is the identity once $v$ is a $\mathrm{Cl}$-algebra.
The runner can detect "already closed" by testing the algebra equation rather than running another iteration: a single rule-pass that produces zero new firings IS the algebra-equation check.
The current pattern (run-until-no-firings) is correct but the *justification* is the lax-idempotence, not just the absence of new rule firings:

- Under [M6](../work/milestones/m6-federation.md) federation, a peer receiving a new envelope needs to know whether to re-close.
  By K2, it suffices to check the algebra equation on the merged state's incoming cells.
  If the merge introduced no $\leq_k$-strict additions, the merged state is *already* a $\mathrm{Cl}$-algebra (unique iso) and re-running closure is a no-op.
- Under [M3](../work/milestones/m3-continuous-loop.md) tick recurrence, a tick that produces no substrate writes leaves the substrate as the same $\mathrm{Cl}$-algebra it was.
  The runner can skip closure on no-op ticks without affecting the determinism guarantee.

### Consequence 2: closure-merge commutation as the lazy-closure foundation

The lemma proved in [`crdt-convergence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence.md) and load-bearing for [M6](../work/milestones/m6-federation.md):

$$\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$$

The proof, in full: by inflationarity, $X \leq_k \mathrm{cl}_p(X)$, so $X \vee_k Y \leq_k \mathrm{cl}_p(X) \vee_k Y$; by monotonicity, $\mathrm{cl}_p(X \vee_k Y) \leq_k \mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y)$.
Conversely, $\mathrm{cl}_p(X) \leq_k \mathrm{cl}_p(X \vee_k Y)$ and $Y \leq_k \mathrm{cl}_p(X \vee_k Y)$, so $\mathrm{cl}_p(X) \vee_k Y \leq_k \mathrm{cl}_p(X \vee_k Y)$; applying $\mathrm{cl}_p$ and using idempotence gives the reverse direction.
Both inequalities give equality.

What this licenses operationally:

- **Lazy closure during federation merge.** A peer receiving an envelope can cellwise-merge the envelope's cells *before* closing.
  The closure of the merged state equals the closure of (unclosed peer state $\vee_k$ unclosed envelope), and equals the closure of (closed peer state $\vee_k$ unclosed envelope).
  The peer chooses based on cost (re-closing fully vs incrementally).
- **Batched closure for delta-state CRDTs.** Per the theorem's delta-state remark, ship deltas (individual writes), not full states.
  The lemma guarantees that batch-applying many deltas before closing equals applying-then-closing each one, so the runner can amortize closure across delta-batches.
- **Provenance correctness across batching.** The `RuleFiring` records emitted by `closure_runner.py` and the `rsv_hash` are preserved under the lemma: same rule firings, same hash, regardless of when closure was applied relative to the merge.
  This is what makes [M2](../work/milestones/m2-substrate-dispatch.md)'s replay-determinism survive [M6](../work/milestones/m6-federation.md).

### Consequence 3: orbit-coloring extends 2-monadically

Per [`orbit-coloring-closure-2-monad-extension`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/orbit-coloring-closure-2-monad-extension.md), the closure 2-monad's KZ structure extends naturally to settling-orbit colorings.
A runner that tracks *which rules fired* during a closure walk gets a 2-coherent diagram of intermediate states for free — not just a fixpoint, but a labelled trajectory.
This is the structure [M11](../work/milestones/m11-assurance-audit-chain-export.md)'s certification artifact projector should consume: not "the substrate's closure", but "the substrate's closure trajectory with its KZ-coherent labelling."

### Substrate consequences

- **Federation handshake primitive.** A `closure_state_hash` covering the algebra-structure of the state itself: two states are isomorphic-as-$\mathrm{Cl}$-algebras iff their `closure_state_hash` matches.
  Peers exchange hashes; equal hashes mean no envelope needed.
- **Lazy-merge soundness.** The closure-merge commutation lemma is the structural permission for the [federation-resilience question](federation-resilience-and-degradation.md)'s event-triggered-sync, distillation, and W-MSR layering.
  All three rest on this lemma.

---

## Four-regime dichotomy as rule metadata

The [`four-regime-dichotomy`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md) theorem states: for a [predication settling](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-settling.md) $(\mathcal{E}, c)$ with closure ordinal $\kappa := \kappa(F_U, \mathcal{E}_0)$, exactly one of four regimes holds:

- **Strict.** $\kappa < \omega$.
  Equivalent to $\mathbf{L}$, $E$, $\mathcal{C}$ all finite. $\mathrm{Cl}$ is strict-idempotent; the [temporal 2-category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/temporal-2-category.md) collapses to a 1-category.
- **Scott-continuous.** $\kappa = \omega$.
  Equivalent to Scott-continuity of $\mathrm{cl}$ plus at least one of $\mathbf{L}, E, \mathcal{C}$ infinite. $\mathrm{Cl}$ is *effectively* strict-idempotent at $\omega$.
- **Transfinite-bounded.** $\omega < \kappa < \omega_1$.
  Equivalent to non-Scott-continuous $\mathrm{cl}$ + state-space cofinality countable. $\mathrm{Cl}$ is genuinely lax-idempotent; the temporal 2-category is genuinely 2-dimensional in a bounded countable range.
- **Aperiodic.** $\omega_1 \leq \kappa$.
  Equivalent to non-Scott-continuous $\mathrm{cl}$ + cofinality $\geq \omega_1$.
  The orbit is strictly $\leq_k$-ascending across $\omega_1$-many stages.

The cohomological-content cut: strict and Scott-continuous regimes have $H^1 = 0$ on the [`settling-associated-sheaf`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-associated-sheaf.md); transfinite-bounded and aperiodic carry non-trivial $H^1$.

The classifier is **visible at the rule level**, per the closure-operator generators remark: rules with quantifier-free antecedents generate Scott-continuous closures; rules with $\forall$-blocks over infinite domains generate non-Scott-continuous closures.
[pypredcalc](../../../../tools/math/pypredcalc/) already implements `is_quantifier_free` as the Scott-continuity classifier.
Per [`rule-language-fragment-realizability-refinement`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md), the rule-language hierarchy refines this further: bare $\Pi_1$+$<$ realizes initial segments of countable limits; named-ordinal-entity-equality literals realize initial-segment-modulo-finite; $\Pi_2$-schemas, ordinal-arithmetic primitives, and second-order quantifiers each unlock specific classes.

Each substrate closure rule record at `objects/<rule-slug>.md` carries a `regime:` field, derived by pypredcalc from the rule's antecedent shape:

```yaml
regime:
  classification: strict | scott-continuous | transfinite-bounded | aperiodic
  closure-ordinal-bound: ω | ω·2 | ω₁ | ...
  rule-language-fragment: bare-pi1 | named-ordinal-equality | ordinal-arithmetic | pi2-schema | second-order
  cohomology: trivial-h1 | non-trivial-h1
```

Derivation is mechanical: `is_quantifier_free` distinguishes Scott-continuous from non-Scott-continuous; finiteness of the rule's relevant base distinguishes strict from Scott-continuous; cofinality of the antecedent's quantifier domain distinguishes transfinite-bounded from aperiodic.

The runtime reads regime metadata at three points:

### Use 1: Scheduling

`runtime/lifecycle.py`'s `tick → halt` decision uses regime classification to predict halting:

- **Strict** rules halt in $< \omega$ steps.
  The runner gives a finite per-tick bound.
- **Scott-continuous** rules halt at $\omega$ — they stabilize within the tick if the tick is long enough.
  With finitary rule firings each tick, a tick is one such step.
- **Transfinite-bounded** rules need ordinal-many steps.
  PyFARS's tick model — finite per-tick work — cannot reach the limit within a single tick.
  The runner marks these rules as "settling continues across ticks" and guards the tick-close from claiming quiescence prematurely.
- **Aperiodic** rules cannot stabilize at all in any finite or countable tick sequence.
  PyFARS rejects aperiodic rules in production substrates, or accepts them only with explicit operator authorization.

### Use 2: Federation safety

CRDT convergence per [`crdt-convergence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence.md) is proved **for finite $\mathbf{L}$** and a common closure operator.
In the strict regime this is fully met.
In Scott-continuous, convergence holds at $\omega$.
In transfinite-bounded and aperiodic regimes, the CRDT convergence proof's finiteness assumption fails — peers may produce *different* closures of the same merged write-set if their tick budgets reach different ordinals.
Federation across non-strict regimes requires additional discipline (peer agreement on closure-ordinal cap, or substrate-resident leader-election for closure scheduling).

Regime classification is checked at federation handshake, alongside `rsv_hash`.
Peers federating with different regime classifications must reconcile to the strictest common regime or refuse the federation envelope.

### Use 3: Audit and assurance

Per [M11](../work/milestones/m11-assurance-audit-chain-export.md), certification artifacts must distinguish regime — a NIST-CSF-2-mapped audit produced from a strict-regime substrate is structurally cheaper than one from a transfinite-bounded substrate (the former has $H^1 = 0$, no cohomological obstructions; the latter must include $H^1$-class evidence).
The certification projector reads regime metadata to determine which audit shape to produce.

The substrate publishes a substrate-wide *settled regime* — the strictest classification covering all currently-active rules.
Per [`regime-stratification-non-semicontinuity`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/regime-stratification-non-semicontinuity.md), this stratification is non-semi-continuous: adding a single transfinite-bounded rule lifts the whole substrate's regime.
The settled-regime cell is what federation handshakes and audit projectors read.

---

## Two internal logics as substrate query API

[`two-internal-logics`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md) proves every [predication hyperdoctrine](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-hyperdoctrine.md) $\mathcal{E}$ supports two distinct first-order theories:

- A **classical first-order theory** $T_t(\mathcal{E})$ over the truth-order adjoint system, with [classical equality](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/classical-equality.md) $=_E$ and [classical Lawvere comprehension](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/lawvere-comprehension-classical.md) $\{-\}_\mathbf{t}$.
- A **paraconsistent first-order theory** $T_k(\mathcal{E})$ over the knowledge-order adjoint system, with [paraconsistent equality](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/paraconsistent-equality.md) $\Delta_E^k$ and [paraconsistent Lawvere comprehension](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/lawvere-comprehension-paraconsistent.md) $\{-\}_\top$.

These theories are distinct: a sentence derivable in one need not be derivable in the other.
A concrete divergence: $\forall x, y.\, x = y \vee x \neq y$ is classically derivable from excluded middle on $=_E$ (two-valued), but is *not* paraconsistently derivable — $\Delta_E^k$ admits $\top$ as a non-classical value at off-diagonal cells in inconsistent states.

The two comprehensions correspond to different *designated truth values*:

- **Classical:** $\{p : \psi\}_\mathbf{t}$ — "$\psi$ holds (is $\mathbf{t}$)."
  Right adjoint to the truth-extension functor $\mathrm{Ext}^t(g) = \exists_g^t(\mathbf{1}_q^t)$ (taking $\mathbf{t}$ on $\mathrm{dom}(q)$ and $\mathbf{f}$ elsewhere).
  Returns the specialization $q_\psi \to p$ with $\mathrm{dom}(q_\psi) := \psi^{-1}(\mathbf{t})$.
- **Paraconsistent:** $\{p : \psi\}_\top$ — "$\psi$ is information-maximal (is $\top$)."
  Right adjoint to the knowledge-extension functor $\mathrm{Ext}^k(g) = \exists_g^k(\mathbf{1}_q^k)$ (taking $\top$ on $\mathrm{dom}(q)$ and $\bot$ elsewhere).
  Returns the specialization $q_\psi \to p$ with $\mathrm{dom}(q_\psi) := \psi^{-1}(\top)$.

Classical Lawvere comprehension corresponds to the SQL-like `WHERE ψ = TRUE` filter; paraconsistent comprehension corresponds to the conflict-detection-aware filter `WHERE ψ has both positive and negative evidence`.

Per the remark in `two-internal-logics`: distributed/CRDT/paraconsistent reasoning uses $T_k$ ($\top$ on $\Delta_E^k$'s diagonal means "information-maximal"; $\bot$ off means "no claim"; stable under $\vee_k$-merge); classical knowledge-base/database queries use $T_t$ (two-valued, compatible with classical entailment).

**PyFARS gets both as a single substrate, no extra structure.**

A `pyfars query` operation takes: - A **logic mode** (`classical` or `paraconsistent`). - A **predicate** $\psi$ defined over the substrate's predicate category. - A **base** $p$ (which fiber to comprehend over).

And returns the corresponding sub-fiber:

- `pyfars query --logic=classical "honest-reportage(_, x) AND has-completed(x, _)" --base=workitems` — workitems where the predicate is two-valued $\mathbf{t}$.
  Familiar SQL/SPARQL semantics.
- `pyfars query --logic=paraconsistent "honest-reportage(_, x) AND has-completed(x, _)" --base=workitems` — workitems where the predicate is information-maximal $\top$.
  Includes workitems with *both* positive and negative evidence — conflict-detection-aware.

**Why both, layered.** A substrate exposing only $T_t$ collapses contradictions.
A substrate exposing only $T_k$ cannot answer "is this proposition simply true?" because the answer in $T_k$ is "information-maximal", not "true".
PyFARS needs both:

- $T_t$ for charter-binding queries: "is this rule violated?" must collapse to `yes` or `no`.
- $T_k$ for evidence-gathering queries: "what does the substrate currently know about this candidate?" must surface contradictions as $\top$-cells.

Per the [Frobenius theorem for the dual meets](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/frobenius-for-knowledge-and-truth-meets.md), the two systems' meets satisfy Frobenius reciprocity — composing across the two logics' boundaries (e.g., a $T_k$ query whose result is then $T_t$-restricted) is well-behaved.

For the 561 polity that runs on consensus and restorative-accountability rather than rights-and-duties, the paraconsistent query is often the *correct* query: "which candidates have both demonstrated honesty AND demonstrated dishonesty in the relevant period?" cannot be expressed in classical first-order logic without losing the contradiction; in $T_k$ it returns the $\top$-valued cells exactly.

---

## Operations causal-settling and replay-determinism

[M3](../work/milestones/m3-continuous-loop.md) requires "idempotent re-runs: replaying the event log produces the same substrate state."
The current model is *linear*: events are totally ordered in JSONL append-order, replay walks the order, the resulting state is determined by order plus the `rsv_hash`-stamped rule-system version.
This is a Newtonian view of operations.

[`operations-causal-settling`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-causal-settling.md) supplies the Lorentzian frame: events have *causal* order (some events must precede others because their inputs depend on outputs), but events that are *causally independent* may have any temporal ordering without affecting the final settling.
State is determined by causal order, not wall-clock order.
[`consensus-causal-order-via-lorentzian-settling`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/consensus-causal-order-via-lorentzian-settling.md) extends this to consensus protocols.

The closure runner's $\leq_k$-monotonicity already guarantees the closure morphism is order-independent on causally-independent inputs.
The linear-event-log model needlessly imposes a serialization that has no algebraic basis: two concurrent firings with no shared inputs and no shared outputs produce the same substrate state regardless of order, but recording them as `event-1, event-2` vs `event-2, event-1` gives two different event logs — a naive log-comparison check would flag them as nondeterministic.

The runtime continues to produce a linear event log (file appends are linear; that's fine).
Replay-correctness verifies up to causal equivalence: two event logs replay to the same substrate state iff their causal-order DAGs are isomorphic, even if their linear orders differ.

Concretely:

1. **Causal predecessors recorded per event.** Each event records the events whose outputs it consumed — a partial order, not a total order.
  This is largely already derivable from `closure_runner.py`'s `RuleFiring` records (the rule's antecedent cells and the events that wrote them).
  The addition is making the predecessor relation explicit at write time.
2. **A `causal_hash` covering the causal DAG.** Pairs with the existing `rsv_hash`.
  Two replays are equivalent iff `rsv_hash` matches (same rule-system version) AND `causal_hash` matches (same causal DAG up to isomorphism), regardless of total-order differences.
3. **Replay verification.** A `replay --check-causal` mode walks any topological-sort of the causal DAG and verifies state equivalence.
  The closure runner's $\leq_k$-monotonicity is what makes this provable: replaying any linearization of a causal DAG produces the same substrate state.

The `(W, assigned-to, D) = T` cell-write of [M2](../work/milestones/m2-substrate-dispatch.md) becomes a single causal vertex; the surrounding rule firings that produced its inputs become its predecessors.
Within a tick the causal DAG is fine-grained; between ticks the tick boundary is a coarse-grained causal cut (everything in tick $N+1$ depends causally on everything in tick $N$).

The "Done when" criterion of [M3](../work/milestones/m3-continuous-loop.md) strengthens: the event log is *causally* deterministic — any topological replay produces the same state.
This is the criterion that survives [M6](../work/milestones/m6-federation.md) federation, where peers will receive events out-of-linear-order.

The `causal_hash` covers the DAG-up-to-isomorphism, not the DAG-as-recorded.
Two peers whose linear logs differ but whose causal DAGs are isomorphic produce identical `causal_hash` values — what makes federation-replay consistent across peers without a serialization arbiter.

---

## Completion as quiescence at goal cells

Per [`completion-as-quiescence`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/completion-as-quiescence.md):

**Claim.** A task cell system $T = (G_T, \mathcal{S}_T, v^T_0)$ embedded in operations settling $v^{\mathrm{op}}$ is *complete at stage $\tau^*$* iff $v^{\mathrm{op}}$ is quiescent at $\tau^*$ on $G_T$ with the target valuation $v^*_T$:

$$T \text{ complete at } \tau^* \iff \bigl(\forall \phi \in G_T : v^{\mathrm{op}}_{\tau^*}(\phi) = v^*_T(\phi)\bigr) \wedge \bigl(\forall \tau \geq \tau^*, \forall \phi \in G_T : v^{\mathrm{op}}_\tau(\phi) = v^{\mathrm{op}}_{\tau^*}(\phi)\bigr)$$

Goal cells reach the target value AND remain stable.
Per the four-regime dichotomy:

- **Strict regime** ($\kappa < \omega$): $\tau^*$ exists and is finite.
  Decidable in polynomial time per [`finite-settling-h0-polynomial-time`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/finite-settling-h0-polynomial-time.md).
  Most operational tasks.
- **Scott-continuous** ($\kappa = \omega$): $\tau^*$ exists at $\omega$.
  Asymptotic completion ("eventually all $X$ are tagged").
- **Transfinite-bounded** ($\omega < \kappa < \omega_1$): $\tau^*$ at countable ordinal.
  Cycle-aggregating tasks.
- **Aperiodic** ($\kappa \geq \omega_1$): no countable $\tau^*$.
  Task does not stabilize.

The theorem identifies four operationally distinct task-endings:

1. **Completion** = goal-cell quiescence at target valuation.
2. **Abandonment** = an `(T, abandoned-by, A) = T` cell, leaving goal cells in whatever state work stopped at.
  NOT goal-cell quiescence.
3. **Suspension** = activation guard set; lifecycle rules inert; goal cells frozen but resumable.
  NOT quiescence at target; just *deferred* quiescence.
4. **Cancellation** = the working community's decision to abandon without assigning liability.
  Goal cells unchanged.
  NOT quiescence; coordination-decision rather than individual-agent decision.

PyFARS today might mark all four as "done" — a structural conflation.

Suspension's preservation property: a task suspended before completion has its activation-permitted cell at $\bot$, freezing all lifecycle rules.
The settling ordinal upon resumption is the *sum* of pre-suspension and post-resumption ordinals; settling-monotonicity holds throughout. **A task in the strict regime in a single run remains in the strict regime after suspension+resumption**, because total closure steps are still finite.
Operationally important: long-running workitems spanning multiple ticks are not "stuck" — they're suspended between ticks; their closure ordinal accumulates across ticks.

A new substrate object kind, `task-cell-system-record`, on each workitem:

```yaml
type: task-cell-system-record
goal-cells: [<cell-tuple>, ...]                    # G_T
target-valuation: { (s,p,o): t-or-other-value, ... } # v^*_T
initial-valuation: { ... }                         # v^T_0
closure-rules: [<rule-slug>, ...]                  # 𝒮_T
regime: strict | scott-continuous | transfinite-bounded | aperiodic
```

A closure rule, `verify-completion-quiescence`, fires when an agent claims completion: 1.
Read goal cells' current values.
2.
Compare against `target-valuation`; if any differ, emit `(W, claim-vs-actual-mismatch, _) = T` and route to review.
3.
Run a closure step on the goal cells; if values change, the substrate is not quiescent.
Emit `(W, claim-but-not-quiescent, _) = T`.
4.
If goal cells match target AND closure step is fixed-point, emit `(W, completion-verified, _) = T`.

Four endings get distinct cell encodings:

| Ending | Cell encoding | Goal cells |
|---|---|---|
| **Completion** | `(W, completion-verified, _) = T` | quiescent at target valuation |
| **Abandonment** | `(W, abandoned-by, A) = T` | unchanged; whatever value work stopped at |
| **Suspension** | `(W, activation-permitted, _) = ⊥` | frozen at current value (resumable) |
| **Cancellation** | `(W, cancelled-by-polity, _) = T` | unchanged (no individual liability) |

---

## Function-purity replay-fidelity and capability non-amplification

Two functional-runtime-platform theorems together account for two structural commitments PyFARS already implicitly relies on:

### Pure functions replay byte-identically

[`function-purity-replay-fidelity`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/function-purity-replay-fidelity.md):

**Claim.** Let $f$ be a function-record declared `pure`.
For any inputs $x$, replaying `invoke-function` on $(f, x)$ produces byte-identical output as the original invocation.
For all pure functions, $\mathrm{invoke}(f, x)$ at substrate ordinal $\tau_1$ and at $\tau_2$ produce byte-identical outputs as long as the substrate's relevant state on the inputs is the same.

The proof's structural reason: pure evaluation restricts the runtime's settling-equipped predication hyperdoctrine coalgebra map to the function-record fiber alone — no neighboring fibers (capabilities, effects, channels) participate.
Per closure-2-monad-lax-idempotence, the algebra structure on a single fiber is unique up to unique iso. **For pure functions, "up to unique iso" collapses to byte-identity** because the canonical-form hash is the iso class's representative.
Effectful functions live on a larger fiber and do not collapse the same way; their replay-fidelity is graded per [`graded-effects-via-q-enriched-fusion`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/), not byte-identical.

### Capability non-amplification

[`capability-non-amplification`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/capability-non-amplification.md):

**Claim.** A function holding capability $c$ cannot construct a stronger capability $c' > c$ from $c$ alone — the only way to obtain $c'$ is to receive it explicitly from a delegating principal.

Capabilities are residuated authority-gates per [`distributed-lock-as-residuated-authority-gate`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/distributed-lock-as-residuated-authority-gate.md).
Residuation $c\backslash$ provides the *strongest-action-permitted-given-c* operation, never $c \to c'$ for $c' > c$.
The bilattice's order $\leq_t$ governs capability strength; non-amplification is monotonicity of this order under function composition.

**Replay-fidelity is what makes [M3](../work/milestones/m3-continuous-loop.md)'s replay-determinism work.** Per [M3](../work/milestones/m3-continuous-loop.md), replaying the event log produces the same substrate state.
This is *only* true for the pure-function part of the runtime.
The closure-rule applications (per [`evaluation-as-closure-2-monad-algebra`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/evaluation-as-closure-2-monad-algebra.md)) are pure; the LLM-agent invocations are not.
Replay-determinism holds at the substrate-cell level *because* the substrate operations are pure; the agent invocations' outputs are recorded as substrate cells, and replay relies on those cells, not on re-running the LLM.

**Non-amplification is what makes [M5](../work/milestones/m5-agential-self-generation.md) self-generation safe.** An agent self-authoring a skill must NOT be able to grant itself stronger capabilities than its delegating office holds.

Per [`type-soundness-regime-parametric`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/type-soundness-regime-parametric.md), pypredcalc's type system is regime-parametric: types are sound *modulo* the substrate's regime classification.
A function whose effects produce non-strict-regime closure rules has its type soundness graded by the regime — the type system is not blanket-sound, it's regime-conditioned.

A new substrate object kind, `pypredcalc-function-record`:

```yaml
type: pypredcalc-function-record
function-name: <slug>
purity: pure | effectful | mixed
effect-fibers:                              # for effectful only
  - { kind: substrate-write, scope: <cell-pattern> }
  - { kind: federation-emit, target: <peer> }
  - { kind: clock-read }
required-capabilities: [<cap-record>, ...]
constructed-capabilities: [<cap-record>, ...] # ≤ required by non-amplification
canonical-form-discipline: jcs-rfc-8785 | substrate-cell-encoding
```

Closure rules: `enforce-purity-classification` (parses function body; if it contains any operation in {substrate-write, federation-emit, clock-read, randomness, external-call}, declares effectful; otherwise pure; verifies declared purity matches), and `enforce-capability-non-amplification` (verifies $c' \leq_t c$ for every constructed capability).

Effectful functions need graded effects per [`graded-effects-via-q-enriched-fusion`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/theorems/).
The $\mathcal{Q}$-grade records what aspects of the function's output depend on what aspects of runtime state.
A function reading the substrate-clock has $\mathcal{Q}$-grade including the clock-fiber; replay produces *graded-equal* output.
A function invoking an LLM has $\mathcal{Q}$-grade including the LLM-fiber; replay reads the LLM's response from the substrate, not from re-invoking.

---

## Materialized views as content-addressed projection caches

Per [`materialized-view-as-functorial-projection-cache`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/database-platform/theorems/materialized-view-as-functorial-projection-cache.md):

**Claim.** A materialized view $V$ over a substrate predication scope is a content-addressed cache keyed by the canonical hash of the *quiescent* substrate state restricted to $V$'s [predication-fibration](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md) base — the projection $g^* : A_q \to A_p$ that defines $V$.

A materialized view is defined by:

- A *base scope* $S \subseteq A_q$ — the predications the view depends on.
- A *projection functor* $g^* : A_q \to A_p$ — the view's defining transformation.
- A *cache* $C : K \rightharpoonup A_p$ — the stored view value, keyed on canonical hash of the base state.

The coherence chain:

1. The base state $v \in A_q$ reaches quiescence $v^* = \mathrm{cl}(v)$.
2. Per [`hash-injectivity-under-canonical-form`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/database-platform/theorems/), the canonical hash $\kappa(v^*)$ uniquely determines $v^*$.
3. Per the fibration's functoriality, $g^*(v^*)$ is uniquely determined.
4. The cache entry $C(\kappa(v^*)) = g^*(v^*)$ is the materialized-view value — *forever correct* relative to $v^*$.

When the base state becomes non-quiescent, $\kappa$ changes; the cache lookup misses; refresh fires — *not* as side-effecting bulk-update but as projection $g^*$ on the new quiescent base.

**Per the engineering-consequence section: "Materialized views need no invalidation policy on the projection."** The cache is content-addressed and unconditionally coherent.
The "invalidation" required is not invalidation-of-result but *re-keying-on-base-change*: the base predication moved, so the cache lookup misses and refresh fires.
This is the closure-2-monad lax-idempotence applied to caching: correctness comes from the projection's functoriality AND the input being at $\mathrm{Cl}$-algebra fixed-point, *not* from invalidation diligence.

**Federation-time:** two peers sharing base predications converge to byte-identical view values *without coordination* per [`federation-convergence`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/).
The cache's content-addressing is the structural reason.

**PyFARS applications:**

- **`pyfars show <slug>`** — projection is "context-resolved markdown render of slug"; base scope is the slug's note + transitively-resolved frontmatter dependencies; canonical hash over the resolved file set.
- **`pyfars list` filtered by predicate** — projection is "list of slugs matching predicate"; base scope is the substrate's filtered cell-set; cache keyed on predicate's canonical hash + filtered cell-set's hash.
- **MCP `list-resources`** — same as `list` but exposed at the MCP surface.
- **The polity homepage** — the homepage IS the public projection of the substrate's polity-public scope; caching it as content-addressed gives federation-friendly homepage serving for free.

A `materialized-view-record` substrate kind:

```yaml
type: materialized-view-record
projection-functor: <g^*-record>             # the f : p → q in the fibration
base-scope: <cell-set-predicate>
canonical-form: deterministic-canonicalizer
cache-store: <storage-backend>
quiescence-policy: closure-fixed-point | tick-boundary | explicit-checkpoint
stale-tolerance: false
```

Per [`canonical-form-via-settling-quiescence`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/database-platform/theorems/), canonical form is *defined only at quiescence*.
A view computed mid-settling has no canonical form and no structural coherence guarantee.
The runtime must distinguish quiescent from non-quiescent reads.

What this rules out:

- **Push-based view invalidation** as the primary mechanism — a view system depending on event-triggered invalidation cannot make the structural-coherence claim.
- **Views computed from non-quiescent bases** — mid-settling values have no canonical form.
- **Views whose projection is not a fibration functor** — non-functorial transformations (depending on external clock or out-of-band parameter) are not in the predication-fibration's coherence frame.

---

## OpenClaw QMD and hooks as substrate-algebra prior art

OpenClaw's experimental QMD memory backend, its directory-discovered hooks, and its `isolatedSession: true` heartbeat mode are working realizations of three substrate-algebraic claims established above: *materialized views as content-addressed projection caches at quiescence*, *closure rules as the substrate-resident runtime primitive*, and *function-purity replay-byte-identity as the load-bearing reliability case*.
The OpenClaw experience supplies concrete cell-schema and replay-determinism evidence at production scale.

### QMD: BM25 + vectors + reranking as materialized view at quiescence

QMD ([`qmd`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/qmd.md)) is OpenClaw's experimental memory-retrieval backend.
It combines BM25 keyword search, dense vector retrieval, and reranking — three retrieval primitives — *while keeping Markdown as the source of truth*.
The QMD index is rebuilt from the Markdown files; the files are authoritative; the index is a projection cache.

This instantiates the [materialized-views section above](#materialized-views-as-content-addressed-projection-caches) exactly.
The view-coherence chain:

1. **Markdown files** are substrate cells (each a content-addressed object with cell-hash over `(s, p, o)` triples or content-frontmatter).
2. **The QMD index** is a materialized view derived from the cells via the projection $\pi: C \to V$ where $C$ is the cell-set and $V$ is the index.
3. **The closure rule** that fires on file-modification re-derives the index entries for the modified cells.
  This is a fibration functor in the coherence frame: $\pi(c \vee_k c') = \pi(c) \vee_k \pi(c')$ on the index reads.
4. **Quiescence** of the file-modification rule produces a coherent index — index reads after quiescence return the same answers that direct file-traversal would return.

The view-coherence theorem applied: if $V = \pi(C)$ is the view (QMD index $V$ projected from cell-set $C$), then $V$ is coherent iff the file-modification closure rule has reached quiescence on $C$. **QMD is a working substrate-algebraic projection cache** — its sidecar architecture composes with PyFARS's substrate without modification: the substrate's `materialized-view-record` cells host the QMD index; closure rules trigger rebuild on file-modification; quiescence is the index-coherent moment.

The empirical anchor: QMD's *design-against-replacing-Markdown-as-truth* is the correct architectural choice.
Three independent triangulations:

- **The Letta benchmark** (74.0% file-ops vs 68.5% Mem0; per the [memory-feedback question's production-reliability section](memory-feedback-self-generation-and-failure-modes.md)) — direct empirical evidence that filesystem operations beat specialized graph memory by 5.5pp on LoCoMo.
- **QMD's working production status** — OpenClaw users running QMD as a sidecar over their Markdown memory files are demonstrating the pattern at small-to-medium scale.
- **The 13,729-skill ClawHub registry** — community-distributed authoring works at this scale on the file-first format.

Together these demonstrate that **filesystem-as-substrate scales to LLM-agent-coordination workloads** — replacing it with a database is the wrong direction; augmenting it with retrieval projections is the right one.
The substrate-algebraic statement: $\pi$ is a fibration functor over the cell-set $C$; a non-functorial $\pi$ (one that depends on out-of-band state, or breaks the closure-merge commutation) is not coherent and must be rejected.
QMD's BM25 + vectors + reranking is functorial because it is content-addressed by the source Markdown files; modifying a file forces re-derivation of its index entries.

### OpenClaw hooks as directory-discovered closure rules

OpenClaw hooks (per [`openclaw-hook`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-hook.md)) have a fixed shape:

```
hooks/<hook-slug>/
  HOOK.md       # YAML metadata + trigger conditions
  handler.ts    # TypeScript/JavaScript implementation (or .js)
```

Discovery: **workspace > managed > bundled** precedence.
Workspace hooks override managed hooks override bundled hooks.
Hooks fire on:

- **Command events** — before/after a command is executed (permission checks, validation).
- **Lifecycle events** — session-open, session-close, startup, etc.

**OpenClaw hooks ARE substrate closure rules with directory-discovery overlay.** The mapping is exact:

| OpenClaw hook component | PyFARS closure-rule component |
|---|---|
| `HOOK.md` frontmatter | closure-rule trigger predicate (the `fires-on:` field) |
| `handler.ts` body | closure-rule body (the `effect:` block) |
| workspace > managed > bundled | cascade restriction $\rho_{V \subseteq U}$ on the directory cover (per the dispatch question) |
| command-event trigger | per-cell-write trigger |
| lifecycle-event trigger | per-tick-{open,close} trigger |
| handler return value | closure-rule output cell |
| handler throw | closure-rule $\top$-cell emission |

Bundled OpenClaw hooks instance the substrate's closure-rule kinds:

- **`session-memory`** — fires at session-close, captures memory artifacts → PyFARS's `consolidate-session-record` (the M4 OpenClaw memory-sync rule, formed as a [`handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/handoff-cobordism.md) per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
- **`bootstrap-extra-files`** — fires at session-open, injects additional files → PyFARS's `lifecycle-startup` rule.
- **`command-logger`** — fires before each command, audit-logs it → PyFARS's `audit-witness-emission` rule (per the [governance question](governance-charter-and-accountability.md)'s administrative-accountability cell).
- **`boot-md`** — fires at startup, runs configured actions → PyFARS's `load-recurrent-practice` rule (per [`recurrent-practice`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md)).

The substrate-algebraic claim *closure rules are the runtime primitive* is supported by the OpenClaw experience: hooks (event-driven, directory-discovered, precedence-cascaded handlers) are operationally what the runtime layer needs. **PyFARS's closure-rule architecture is the substrate-resident formalization of the same pattern OpenClaw has converged on operationally** — but with the additional algebraic structure: closure rules participate in the closure 2-monad's lax-idempotence (per the [closure 2-monad section above](#closure-2-monad-lax-idempotence-and-runner-invariants)), in the four-regime classification, in the two-internal-logics query API, in operations causal-settling, in materialized-view coherence.
OpenClaw hooks are TypeScript functions; PyFARS closure rules are predication objects with full algebraic structure available to the substrate's verification, replay, and audit machinery.

### Heartbeat isolation as load-bearing replay-determinism case

OpenClaw's HEARTBEAT.md feature (per [`openclaw-heartbeat`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-heartbeat.md)) supports an **`isolatedSession: true`** mode where each heartbeat task runs in a fresh session with no prior conversation history.
The reported empirical effect: **60–80% token cost savings** for continuous monitoring loops.

Per the [function-purity replay-fidelity section above](#function-purity-replay-fidelity-and-capability-non-amplification): replay-byte-identity requires the operation to be a function of (substrate-state, inputs) only — no hidden context, no implicit prior-session loading. **The 60–80% savings is the cost-quantale signal that hidden context dominates token cost** in non-isolated sessions.
The substrate-algebraic claim:

- A substrate operation $f: \Sigma \times I \to \Sigma$ has replay-byte-identity iff $f$ depends only on the substrate-state $\Sigma$ and the operation's inputs $I$.
- A non-isolated session loads prior session history $H$ into the LLM context, making the effective operation $f': \Sigma \times I \times H \to \Sigma$.
  Even if $H$ is reproducible, its $|H|$-token cost dominates: empirically 60–80% of the session cost is $H$'s tokens, not the operation's actual computation.
- An isolated session is exactly $f$ (no $H$), making replay-byte-identity trivial: the substrate-state is the entire context.

**OpenClaw's empirical 60–80% savings is direct evidence that the substrate-state-as-context architecture is the structurally correct memory architecture** for long-running agent systems.
PyFARS's M4 substrate-as-context pattern is the substrate-algebraic generalization; OpenClaw's `isolatedSession: true` is one operational instance.

The function-purity classification of the [section above](#function-purity-replay-fidelity-and-capability-non-amplification) extends:

- **`pure: substrate`** — no LLM call; deterministic; replay byte-identity always holds.
  (Closure rules in this class.)
- **`pure: deterministic-llm-at-T-0`** — LLM call at temperature 0; approximately deterministic given (substrate-state, prompt).
  (Some Anthropic-API workitems in this class.)
- **`pure: substrate-state-only-context`** — LLM call where the prompt is a function of (substrate-state, inputs) only; no prior-session history loaded. **This is the OpenClaw `isolatedSession: true` case.**
- **`impure: session-loaded-context`** — LLM call where the prompt includes prior-session history $H$ that is not a function of substrate-state.
  Replay must reproduce $H$ exactly to achieve byte-identity. *Cost dominated by $H$'s tokens; OpenClaw's 60–80% savings is the empirical signal.*

**The substrate's preferred mode is `pure: substrate-state-only-context`** — the substrate-algebra discipline favors isolated execution, with substrate-state as the only context.

### The four-axis fiber decomposition (SOUL/USER/MEMORY/HEARTBEAT) as substrate-state taxonomy

The OpenClaw four-file boot pattern (`SOUL.md` / `USER.md` / `MEMORY.md` / `HEARTBEAT.md` per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section) decomposes agent configuration into four orthogonal fibers:

| File | Substrate-algebraic role | Closure-rule reading |
|---|---|---|
| `SOUL.md` | morphism-source (identity) | office-eligibility predicate |
| `USER.md` | attention-target (what the office watches) | workitem-scope predicate |
| `MEMORY.md` | substrate-state cells (instinct + observation) | accumulator state for closure-rule firings |
| `HEARTBEAT.md` | recurrent-practice (when the office acts) | scheduled rule-firing trigger |

This is a fiber decomposition of the substrate state $\Sigma$ along **identity / attention / state / practice** axes — four orthogonal coordinates of agent-as-substrate-resident.
The substrate's closure-rule machinery operates on each fiber distinctly:

- The identity fiber is read by `eligibility-by-conduct-teaching` and `eligibility-by-saturation-cap` (per the [governance question](governance-charter-and-accountability.md) and the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
- The attention fiber is read by quantifier adjoints $\exists_f^k, \forall_f$ on workitem-fibers (per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)).
- The state fiber is the core substrate $\Sigma$.
- The practice fiber is read by `load-recurrent-practice` and per-recurrent-practice closure rules.

**The four-axis decomposition is empirical confirmation of the predication-categories' fiber decomposition pattern** — agent configuration projects onto four orthogonal fibers, each with its own algebraic role.
PyFARS's substrate captures all four orthogonally; OpenClaw's empirical convergence on this exact split is independent triangulation that the predication-categories' fiber decomposition is the right shape for agent configuration.

### Engineering consequences

- **QMD-style retrieval is a future PyFARS feature, not an architectural change.** The substrate's `materialized-view-record` cell-kind hosts QMD-style indices natively; closure rules trigger rebuild on file-modification; quiescence is the index-coherent moment.
- **Hooks ARE closure rules; PyFARS already has the formalization.** OpenClaw hooks are the harness-projected operational view; PyFARS's closure-rule architecture is the substrate-resident formalization with full algebraic structure.
- **Isolated-session execution is the load-bearing replay-determinism case.** The 60–80% empirical savings is the cost-quantale signal; substrate-state-as-context (not session-loaded-as-context) is the correct architecture.
  The function-purity classification gains a `pure: substrate-state-only-context` class as the substrate's preferred mode.
- **The four-axis fiber decomposition (identity/attention/state/practice) is PyFARS-substrate-native.** Each axis has a distinct closure-rule reading; OpenClaw's empirical convergence on this exact split confirms the predication-categories' fiber pattern.
- **The file-first thesis is empirically validated three ways**: Letta 5.5pp + QMD working + 13,729 ClawHub skills.
  Filesystem-as-substrate scales.

---

## Falsifiable agency conditions and the autopoietic threshold

Bent (arXiv 2508.05338, 2025) — supported by the survey of competing definitions in [`toward-a-falsifiable-definition-of-agentic-systems`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/toward-a-falsifiable-definition-of-agentic-systems.md) — proposes three jointly-necessary-and-sufficient conditions for an agentic system.
The survey reviews five competing definitions: Anthropic's workflows-vs-agents distinction (locus-of-control; too broad to falsify, qualifies most LLM applications); Andrew Ng's four design patterns (reflection / tool-use / planning / multi-agent collaboration; pattern catalog, not a definition); MIT 2025 AI Agent Index's four operational requirements (autonomy / goal-complexity-with-≥3-tool-calls / environmental-interaction / generality); Sapkota–Roumeliotis–Karkee's AI-Agents-vs-Agentic-AI distinction (single vs multi-entity collaborative); and Bent's three-condition floor.

The substrate-algebraic claim: **PyFARS's substrate is the structure that makes Bent's three conditions formally checkable as substrate properties**, and PyFARS's [M5](../work/milestones/m5-agential-self-generation.md) self-generation is the *autopoietic threshold* that the falsifiable-agency literature identifies as currently uncrossed in any production system as of March 2026.

### Bent's three conditions as substrate-resident predicates

- **Condition 1: Environmental action.** The system performs actions that modify persistent state outside itself through tool use. *Test*: remove the system; do the changes it caused remain? **Substrate reading**: every cell-write produces a content-addressed substrate cell whose `cell_hash` persists across system removal.
  The substrate IS the persistent environment.
  Closure rule `verify-environmental-action` checks that a candidate-agent's outputs include $\geq 1$ substrate-cell write to a non-self-fiber.
- **Condition 2: Goal-directed planning.** The system decomposes high-level objectives through multi-step reasoning, selects among alternative action sequences based on expected goal-contribution. *Test*: present a goal requiring two causally dependent actions (output of $A$ required as input to $B$); the system identifies and executes the dependency without external specification of execution order. **Substrate reading**: the [plan-as-1-morphism cobordism category from the dispatch question](dispatch-workitems-plans-and-external-surfaces.md) IS the planning structure.
  The causal-dependency check is closure-rule-decidable: does $\mathrm{output}(A) \in \mathrm{input}(B)$ in the plan's source-target slice graph?
  Closure rule `verify-goal-directed-planning` checks that the candidate-agent's plan-record carries at least one $\circ$-composition (sequential dependency) decided at runtime, not hardcoded.
- **Condition 3: Persistent state.** The system maintains representations that persist across interaction boundaries. *Test*: interrupt the system between actions; resume it; does it recover context and continue without re-deriving the plan? **Substrate reading**: this is exactly the [operations-causal-settling and replay-byte-identity discipline above](#operations-causal-settling-and-replay-determinism).
  The substrate's `causal_hash` over the cell-DAG IS the persistent representation; replay reconstructs context byte-identically; the candidate-agent's plan-record is recoverable from the substrate.
  Closure rule `verify-persistent-state` checks that the candidate-agent's runtime can be re-instantiated from its substrate state alone.

**The substrate's contribution to falsifiable agency** is that all three conditions are reducible to substrate-cell-and-closure-rule queries.
PyFARS does not just satisfy the conditions; it *makes them mechanically decidable*.
This is the critical move from "we think it's an agent" to "the substrate certifies it is."
A new substrate object kind, `falsifiable-agency-certificate`:

```yaml
type: falsifiable-agency-certificate
target-system: <office | polity | foreign-runtime>
condition-1-environmental-action:
  verified: true | false
  evidence-cells: [<cell-id>, ...]      # substrate-cell writes attributable to the system
condition-2-goal-directed-planning:
  verified: true | false
  evidence-plan-records: [<plan-id>, ...] # plan-records with ≥ 1 ∘-composition decided at runtime
condition-3-persistent-state:
  verified: true | false
  evidence-replay-trace: <replay-id>     # successful interrupt-and-resume run
overall-classification: agentic | non-agentic | borderline
spectrum-coordinates:                    # Bent's five-dimensional gradient ABOVE the floor
  environmental-interaction-sophistication: <ordinal>
  goal-directed-complexity: <ordinal>
  temporal-coherence: <ordinal>
  learning-and-adaptation: <ordinal>
  autonomy: <ordinal>
```

Closure rule `compute-falsifiable-agency-certificate` aggregates the three condition-checks; closure rule `update-spectrum-coordinates` fires per substrate-tick to update the five-dimensional spectrum.
The certificate is read by [M11](../work/milestones/m11-assurance-audit-chain-export.md) audit export as the EU-AI-Act-shaped output for "is this an agentic system, and how agentic is it?"

**What the substrate's anti-classification excludes from agency**:

- **Chatbots without substrate-cell writes** fail Condition 1; the substrate refuses the agentic certificate.
- **Predefined workflows** with hardcoded plan-records (no $\circ$-composition decided at runtime, only at authoring time) fail Condition 2.
- **Stateless tool-calling systems** that hold state only in conversation-context fail Condition 3 — *conversation context is not persistent state*, per Bent.
  The substrate's `causal_hash`-over-cell-DAG IS the persistence test; conversation-context-loaded LLM session-history is excluded.
- **RAG systems** that retrieve and generate text but never write substrate cells fail Condition 1.
- **Single-turn function-calling systems** fail Condition 2 (no multi-step plan).

What it includes: Claude Code in agent mode (writes files, plans multi-step, maintains session state), OpenHands / OpenDevin (writes and executes code, plans across files, event-sourced state), Devin (autonomous SWE agent with persistent workspace state).
PyFARS's polity instances pass all three conditions by substrate construction.

### The autopoietic threshold

Bent (and the [`toward-a-falsifiable-definition-of-agentic-systems`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/toward-a-falsifiable-definition-of-agentic-systems.md) survey) names a stronger threshold inherited from Maturana–Varela's [autopoiesis](../../../../theories/theories/science/theories/information/theories/cybernetics/terms/autopoiesis.md): a system that is *self-producing* — modifies its own tools, updates its own instructions, persists its own memory — moves toward *operational closure*. **The text states explicitly that no existing agentic system has crossed this threshold as of March 2026.**

PyFARS's substrate makes the threshold crossable by structure:

- **Self-modification of tools** = [M5](../work/milestones/m5-agential-self-generation.md) agential-self-generation.
  An office authoring a new skill-record in the substrate IS modifying its own tool surface.
  The OpenClaw skill-creation loop (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section) and ClawHub's 13,729+ skills demonstrate the *operational pattern*; PyFARS's closure-rule layer adds the substrate-resident *certification* (Condition 1 + 2 + 3 satisfied for the new skill).
- **Self-update of instructions** = harness-template re-installation + per-directory `_index.md` revision + governance/agents/<office>.md updates.
  The substrate's `enforce-charter-tier-discipline` (per the [governance question](governance-charter-and-accountability.md)) governs which instruction-changes are valid.
- **Self-persistence of memory** = the substrate's instinct cells + observation cells + handoff-cobordisms across sessions (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).

**The substrate-algebraic statement: PyFARS [M5](../work/milestones/m5-agential-self-generation.md), once shipped, is the autopoietic threshold realized.** No existing agentic system has crossed this threshold because no existing agentic system has a substrate-resident closure-rule layer that certifies self-modifications under predicate-level guarantees.
AutoGPT's failure mode (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s production-reliability section) — *infinite loops, hallucinated corrections, token-cost spirals* — IS the failure mode of unbounded self-modification.
PyFARS prevents it via:

- Bounded $H_\rho$ entropy cap at the agent layer (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
  The trajectory volume bound $2^{N \cdot T \cdot H_\rho}$ remains tight under self-modification because each modification is itself a substrate cell with bounded entropy contribution.
- Saturation cap of ~4 in-flight self-generation events (per MASFT 2025).
- Substrate-resident graders (closure rules over candidate self-generation cells, per the three-stage self-improvement pattern in [memory-feedback](memory-feedback-self-generation-and-failure-modes.md)).
  Deterministic graders first; LLM-as-judge only when deterministic insufficient; single LLM-as-judge prompt over multiple specialized.
- The four-regime classification preventing aperiodic-rule activation without operator authorization (per the [four-regime section above](#four-regime-dichotomy-as-rule-metadata)).
  Self-modifications that would introduce aperiodic regimes require explicit captain attestation.
- The `falsifiable-agency-certificate` re-verifies the three conditions after each self-modification; a self-modification that breaks any condition is rejected. **The certificate is the substrate's gate against autopoietic-runaway**.

This is the substrate-algebraic answer to the autopoiesis question: **operational closure is reachable, but only with a substrate that certifies self-modifications under bounded entropy + saturation + grader caps + four-regime authority + falsifiable-agency re-verification**.
PyFARS is the substrate that makes autopoiesis safe; OpenClaw + Claude Code + Anthropic's 1M-context Opus are the per-component implementations that ride on top.

The Sapkota–Roumeliotis–Karkee distinction (AI Agents = single-entity systems performing goal-directed tasks via tools; Agentic AI = multi-agent systems where specialized agents collaboratively decompose goals) maps to a substrate-algebraic difference: a single-office instance is an AI Agent; a polity (multiple offices coordinating via stigmergic cell-merge + dispatch) is Agentic AI.
PyFARS's substrate supports both; the four-cap stack applies at both granularities.

### The cybernetic feedback frame

In [cybernetic](../../../../theories/theories/science/theories/information/theories/cybernetics/terms/cybernetics.md) terms (Wiener 1948), an agentic system is a goal-seeking system with negative feedback: observe the gap between current state and goal state, select actions to reduce the gap, adjust based on results.

The substrate's closure-rule firing pattern IS Wiener's helmsman feedback loop:

- **Observation** = substrate-cell read by the closure rule (the current-state input).
- **Goal** = the closure rule's `target-valuation` (per the [completion-as-quiescence section above](#completion-as-quiescence-at-goal-cells)).
- **Gap** = the bilattice distance between current cell value and target valuation, measured in $\leq_t$ and $\leq_k$ orders.
- **Action selection** = the closure rule's body (the morphism that produces a substrate state-update).
- **Adjustment** = the next firing iterates with the post-update cell as the new current-state.

The substrate-algebraic generalization of Wiener: **closure rules over the closure 2-monad ARE the structurally-correct generalization of the cybernetic feedback loop to the predication-categories' bilattice.** Wiener's loop assumes a real-valued reference signal and a real-valued state-error; the substrate generalizes to:

- Bilattice-valued reference (the target-valuation can be any element of $\mathbf{FOUR}$, not just $\top$ or a real number).
- Bilattice-valued state-error (the gap is a partial-order distance in two orthogonal axes — truth-order $\leq_t$ and knowledge-order $\leq_k$).
- Lax-idempotent fixed-point convergence (per the [closure 2-monad section above](#closure-2-monad-lax-idempotence-and-runner-invariants)).
  The closure 2-monad's $\mu \cdot \eta_{\mathrm{Cl}} = 1_{\mathrm{Cl}}$ is *exactly* the property that makes the feedback loop converge: re-applying the closure adds no new information once a fixed point is reached.

Bent identifies the difference between classical cybernetic controllers and contemporary agentic AI as: *generality of goal specification (natural language vs reference signal) and breadth of the action space (arbitrary tool calls vs fixed actuators)*. **PyFARS's substrate is the closure-rule-language fragment hierarchy that bridges natural-language goals to bilattice target-valuations**: per the [governance question](governance-charter-and-accountability.md), goals expressed at the rules tier must be in bare $\Pi_1+<$; goals expressed at the guidelines tier admit bounded FOL; richer expressivity is permitted only at lower-precedence tiers.
The fragment hierarchy IS the controlled translation from natural-language goal-spec to substrate-decidable target-valuation.
The action space's breadth (arbitrary tool calls) is gated by the formality-layer hierarchy ($F_0 \to F_3$); at the substrate-decidable end ($F_3$) the action space is bounded and replay-byte-identical; at the agential end ($F_0$) the action space is broad but governed by the four-cap stack.

### Engineering consequences

- **Falsifiable agency is mechanically decidable on PyFARS substrates.** Bent's three conditions reduce to substrate-cell + closure-rule queries; the `falsifiable-agency-certificate` cell-kind is the audit-projector output.
  The substrate moves agency from a definitional debate to a substrate-resident measurement.
- **PyFARS [M5](../work/milestones/m5-agential-self-generation.md) is the autopoietic threshold realized.** Operational closure is structurally achievable on PyFARS substrates with closure-rule certification of self-modifications; no other production system as of 2026 has the substrate-resident certification layer.
  The four-cap stack + falsifiable-agency re-verification is the structural answer to AutoGPT-style runaway.
- **The substrate IS the cybernetic feedback loop generalized to bilattice target-valuations.** Closure rules over the closure 2-monad are Wiener's helmsman feedback loop on $\mathbf{FOUR}$, with lax-idempotence as the convergence guarantee.
- **The five-dimensional spectrum above the agency floor (Bent)** maps to substrate-resident measurements: environmental-interaction-sophistication = cell-write-rate per fiber; goal-directed-complexity = plan-cobordism-shape (series-parallel vs general N-shaped); temporal-coherence = `causal_hash`-DAG-depth; learning-and-adaptation = self-generation-rate per saturation cap; autonomy = ratio of closure-firings without captain-attestation to total firings.
- **The Sapkota distinction (AI Agents vs Agentic AI) maps to single-office vs polity at the substrate level.** Both pass the falsifiable-agency-certificate; the polity additionally satisfies multi-entity-collaboration via stigmergic cell-merge.

---

## Event-sourced state and checkpoint persistence as substrate-algebra prior art

The 2026 orchestration ecosystem (per [`agent-orchestration-ecosystem-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/agent-orchestration-ecosystem-2026.md)) supplies two pieces of direct substrate-algebraic prior art: **OpenHands' event-sourced state model with deterministic replay** and **LangGraph's built-in checkpoint persistence with time travel**.
Both extend the operations-causal-settling and replay-byte-identity disciplines established above with concrete production-grade implementations, and the cross-framework convergence on markdown-with-frontmatter as agent-configuration substantiates the file-first thesis a fourth way.

### OpenHands' event-sourced state with deterministic replay

OpenHands (formerly OpenDevin) is a coding-agent platform with sandboxed Docker execution, hierarchical agent delegation, and 100+ provider support.
Its distinctive feature: **an event-sourced state model with deterministic replay**.
State is reconstructed by replaying the event log from origin; given the same event log, the state at any point is byte-identical.

This is structurally identical to the [operations-causal-settling and replay-determinism section above](#operations-causal-settling-and-replay-determinism).
The substrate-algebraic mapping:

| OpenHands concept | PyFARS substrate analog |
|---|---|
| Event log | Cell-DAG with `causal_hash` ordering |
| Event replay | `replay --check-causal` mode |
| Deterministic state reconstruction | Replay-byte-identity at the strict regime |
| Sandboxed Docker execution | Closure-rule firing at $F_3$ formality (substrate-decidable) |
| Hierarchical agent delegation | Foreign-interior cobordism with witness-chain replay (per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)) |
| 100+ provider support | Foreign-runtime taxonomy via ACP-style routing |

**OpenHands is the production validation that event-sourced state with deterministic replay works at scale for coding-agent platforms.** PyFARS's substrate generalizes the pattern: every cell-write is an event in the cell-DAG; the `causal_hash` is the event-log identifier; replay reconstructs substrate state byte-identically given the same closure-rule firings.
The substrate adds:

- **Bilattice-valued state** ($\mathbf{FOUR}$ rather than concrete file content) — permits paraconsistent reasoning during replay.
- **Closure-rule lax-idempotence** — replay terminates because the closure 2-monad has no non-trivial periodic orbits (per the [closure 2-monad section above](#closure-2-monad-lax-idempotence-and-runner-invariants)).
- **Function-purity classification** including the `pure: substrate-state-only-context` class added in the [OpenClaw QMD section above](#openclaw-qmd-and-hooks-as-substrate-algebra-prior-art) — explicitly distinguishes deterministic replay from session-loaded replay.

The OpenHands experience confirms that event-sourcing is the *correct* substrate-state architecture for agent platforms — not session-snapshot, not periodic-checkpoint, but full-event-log replay.
PyFARS's `causal_hash`-DAG IS this architecture.
The convergence with the falsifiable-agency Condition 3 (per the [section above](#falsifiable-agency-conditions-and-the-autopoietic-threshold)) — *interrupt the system between actions; resume it; recovers context without re-deriving the plan* — is exact: OpenHands' event-sourced replay IS the substrate-resident realization of Condition 3 at production scale.

### LangGraph's checkpoint persistence and time travel

LangGraph (per `agent-orchestration-ecosystem-2026`) is a graph-based stateful agent workflow framework.
Its distinctive feature: **built-in checkpoint persistence (SQLite, Postgres backends), time travel (rollback to any prior state), and human-in-the-loop**.
Nodes are agent steps; edges are transitions; the framework checkpoints state at every node-firing.

This is the *checkpoint subset* of full event-sourcing — periodic state snapshots rather than event-log replay.
The substrate-algebraic statement:

- **Checkpoint persistence** = a materialized view of the substrate state at quiescence (per the [materialized-views section above](#materialized-views-as-content-addressed-projection-caches)).
  Each checkpoint is a content-addressed snapshot.
- **Time travel** = replay from any checkpoint (a partial-event-log replay starting at the checkpoint's `causal_hash`).
- **Human-in-the-loop** = captain-attestation-required lifecycle state (per the [federation-resilience question](federation-resilience-and-degradation.md)'s graceful-degradation cascade).

The LangGraph approach is *strictly weaker* than full event-sourcing (it cannot replay arbitrary intermediate states without checkpoint metadata) but operationally simpler to implement.
PyFARS's substrate generalizes both: every closure-rule firing produces a cell with `causal_hash` (event-sourcing), and the materialized-view-record cells project to checkpoint-shaped backups (checkpoint persistence).
The substrate provides both surfaces from one underlying machinery.

The substrate-algebraic relationship:

- LangGraph checkpoint at node $n$ = materialized-view of the substrate state at the closure-rule firing whose `causal_hash` corresponds to node $n$'s firing.
- LangGraph time-travel to checkpoint $n$ = replay-from-causal-hash starting at $n$'s `causal_hash`.
- LangGraph human-in-the-loop at node $n$ = `governance-precheck` closure rule firing at $n$ before transition to node $n+1$.

A substrate object kind, `replay-architecture-record`:

```yaml
type: replay-architecture-record
target-deployment: <polity-instance>
event-sourcing:
  enabled: true
  causal-hash-algorithm: <hash-id>
  replay-discipline: byte-identity | boundary-only
checkpoint-persistence:
  enabled: true
  cadence: per-tick | per-quiescence | per-N-ticks
  backend: filesystem | sqlite | postgres
  retention-policy: <policy>
time-travel:
  enabled: true
  granularity: per-event | per-checkpoint
human-in-the-loop:
  cadence: per-irreversible-action | per-tick | never
  captain-attestation: required | optional
foreign-runtime-replay:
  - { runtime: claude-code, replay-discipline: boundary-only, t-zero-determinism: approximate }
  - { runtime: openhands, replay-discipline: full, t-zero-determinism: true }
  - { runtime: langgraph, replay-discipline: checkpoint, t-zero-determinism: per-node }
  - { runtime: openclaw, replay-discipline: boundary-only, t-zero-determinism: false }
  - { runtime: pydantic-ai, replay-discipline: durable-execution, t-zero-determinism: model-dependent }
  - { runtime: crewai, replay-discipline: boundary-only, t-zero-determinism: false }
```

Closure rules: `verify-event-sourcing-coherence` (every cell-write produces a `causal_hash`-bearing event), `materialize-checkpoint` (per-quiescence projection), `replay-from-causal-hash` (event-log replay), `time-travel-to-checkpoint` (LangGraph-style rollback), `route-replay-by-foreign-runtime-determinism` (chooses replay-discipline per the foreign-runtime's $T = 0$ behavior).

### The four-way convergence: SKILL.md-as-configuration is the industry pattern

Per the convergence observation in `agent-orchestration-ecosystem-2026`: *Claude Code uses `.md` files for skills; OpenHands uses SOUL.md for agent identity; GitHub Agentic Workflows define workflows in markdown*.
The industry has converged on **markdown-with-frontmatter as the substrate-cell shape for agent configuration**.

PyFARS's file-first essence is empirically validated *four ways*:

1. **Letta benchmark** (74.0% file-ops vs 68.5% Mem0; per the [memory-feedback question's production-reliability section](memory-feedback-self-generation-and-failure-modes.md)) — direct measurement that filesystem operations beat specialized graph memory by 5.5pp on LoCoMo.
2. **OpenClaw's 13,729+ ClawHub skills** (per the [OpenClaw section above](#openclaw-qmd-and-hooks-as-substrate-algebra-prior-art)) — community-distributed authoring at scale on file-first format.
3. **QMD's working production status** — file-first source-of-truth + retrieval indices as projections, deployed in production.
4. **Cross-framework architectural agreement** (this section) — Claude Code, OpenHands, OpenClaw, GitHub Agentic Workflows have all converged on markdown-with-frontmatter as agent configuration.

**The substrate-algebraic statement: PyFARS's typed-frontmatter discipline IS the formalization of the four-way convergence**.
Claude Code's `.md`, OpenHands' SOUL.md, OpenClaw's SKILL.md, GitHub Agentic Workflows' markdown — all are different harness-projections of the same underlying substrate-cell pattern.
PyFARS's substrate is the source-of-truth; each framework's `.md` format is a materialized view at quiescence.
The four-way convergence is no longer a thesis to defend; it is the prevailing industry practice that PyFARS's substrate-algebra completes formally.

### Engineering consequences

- **OpenHands' event-sourced state IS the operations-causal-settling discipline** at production scale.
  PyFARS's `causal_hash`-DAG is the substrate-algebraic generalization with bilattice-valued state and lax-idempotent termination.
  The convergence with falsifiable-agency Condition 3 is exact.
- **LangGraph's checkpoint persistence + time travel** is the *materialized-view subset* of event-sourcing.
  PyFARS's substrate provides both surfaces from one underlying machinery: full event-log replay + per-quiescence materialized-view checkpoints.
- **The replay-architecture-record cell-kind** captures replay-discipline per foreign-runtime; full replay for deterministic runtimes (OpenHands, $T = 0$ LLM calls), boundary-only for stochastic (OpenClaw, default LLM calls), checkpoint for graph-based (LangGraph), durable-execution for PydanticAI.
- **SKILL.md-as-configuration is the industry-converged pattern**; PyFARS's typed-frontmatter discipline is the substrate-algebraic formalization.
  The substrate is source-of-truth; cross-framework `.md` formats are harness-projected materialized views.
- **The four-way convergence (Letta + ClawHub + QMD + cross-framework) makes the file-first thesis no longer a thesis to defend** — it is prevailing industry practice that PyFARS's substrate-algebra completes formally.

---

## What this commits to

Substrate-resident records and machinery:

- **`closure_state_hash`** alongside `rsv_hash`.
  Federation-handshake primitive; equal hashes mean no envelope needed.
- **Regime metadata** in every closure-rule record (mechanically derived via `pypredcalc.regime_classify(rule)`).
  Aperiodic-rule activation requires explicit operator authorization.
  Substrate-wide *settled regime* published as a cell.
- **Dual-logic query API** (`pyfars query --logic={classical,paraconsistent}`).
- **`task-cell-system-record`** per workitem with explicit goal cells and target valuation; `verify-completion-quiescence` closure rule.
- **`pypredcalc-function-record`** with `purity` classifier and non-amplification check.
- **Causal predecessor recording** per event; `causal_hash` = DAG-up-to-isomorphism hash; `replay --check-causal` mode.
- **`materialized-view-record`** at `governance/views/<slug>.md`.
  Cache backing as filesystem cells named by canonical hash.
  Refresh as closure-rule firing on base-hash mismatch.

Closure rules: `enforce-purity-classification`, `enforce-capability-non-amplification`, `verify-completion-quiescence`, `materialized-view-refresh`, `compute-spectral-gap` (referenced in [federation-resilience question](federation-resilience-and-degradation.md)), per-regime scheduling rules.

## What this connects to

- **The [cohomological-coordination question](cohomological-coordination-and-audit.md)** — Mayer–Vietoris uses the closure-2-monad's algebra; Čech-cocycle audits run on materialized-view content; the simplicity cap rests on the four-regime classification keeping $H^n = 0$ for $n \geq 2$; consensus terminates because the closure 2-monad has no non-trivial periodic orbits.
- **The [federation-resilience question](federation-resilience-and-degradation.md)** — closure-merge commutation underwrites every federation discipline (lazy closure, distillation, event-triggered sync); Read-Only-Quiescent IS the algebra fixed-point; CRDT convergence holds in strict and Scott-continuous regimes; federation handshake checks regime alongside `rsv_hash`.
- **The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)** — completion-as-quiescence governs workitem lifecycle; pure functions are F₃ skills (post-promote); causal DAGs record dispatch ordering; HTTP idempotent methods are corollaries of closure-2-monad lax-idempotence.
- **The [governance question](governance-charter-and-accountability.md)** — charter compliance is fixed-point status of the rules-tier closure operator; CALM asymmetry follows from $\leq_k$-monotonicity; estoppel rests on $\mathrm{Fix}(C_\mathcal{N})$ being a complete lattice.
- **The [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)** — pure consolidation is a closure rule; effectful agent invocations have $\mathcal{Q}$-graded replay; bounded $H_\rho$ is what makes substrate-state replay byte-identical despite stochastic agent calls.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented.
The theorems below resolve several substrate-algebraic questions decisively, leaving only implementation-policy choices in the planner-question list.

### Cl-algebra structure is property-like, not data

The [closure-2-monad-lax-idempotence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md) establishes Kelly-Lack (K1): the closure 2-monad $\mathrm{Cl}$ satisfies $\mu \dashv \eta_{\mathrm{Cl}}$ with identity counit, hence is lax-idempotent.
The corollary via Kelly-Lack (K2) is decisive:

> Every [predication fibration](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md) admits **at most one** $\mathrm{Cl}$-algebra structure up to unique iso. **Being a $\mathrm{Cl}$-algebra is a property, not additional structural data.**

This collapses planner-questions Q1 and Q2: explicit `is_cl_algebra(state) -> bool` and a separate `closure_state_hash` field are *structurally redundant*.
The substrate already has an `rsv_hash` over reduced cell-states; if `rsv_hash` equals its post-closure value, the state is a $\mathrm{Cl}$-algebra.
The Cl-algebra check is implicit in `rule-pass-with-zero-firings`; explicit surfacing is diagnostic-only and cannot disagree with the implicit form.
The substrate-coherent decision: **drop `closure_state_hash`; fold any explicit Cl-algebra check into the rule-pass termination signal.**

### Quiescence IS Cl-algebra structure

The [quiescence-as-closure-algebra theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/quiescence-as-closure-algebra.md) establishes the equivalence directly: under eventually-zero increments, $c^{\tau^*+1} = c^{\tau^*}$ (settling fixed point at $\tau^*$) iff $\mathrm{Cl}(\mathcal{E}_{\tau^*}) = \mathcal{E}_{\tau^*}$ (Cl-algebra structure on the state).

This unifies questions Q5 (settled-regime cell update cadence) and Q11 (completion-verification cadence).
The substrate's "Read-Only-Quiescent" mode and the workitem's "completion-as-quiescence" condition are *the same algebraic condition*.
The cadence question reduces to the regime question:

- **Strict regime:** Cl is strict-idempotent; $\mu = \mathrm{id}$.
  Per-rule-activation cadence is correct (recomputation cost bounded; finite ascending chain in each fiber).
- **Scott-continuous regime:** Cl is effectively strict-idempotent at $\omega$.
  Per-tick cadence at $\omega$-limits is correct.
- **Transfinite-bounded / aperiodic regimes:** Cl is genuinely lax-idempotent.
  Quiescence-checking requires waiting until $\kappa$, which can exceed any per-tick budget.

The substrate's cadence policy is mechanically derivable from the regime, not a free choice.

### The closure 2-monad has no non-trivial periodic orbits

The [closure-monad-no-non-trivial-periodic-orbits theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md) proves: for every presheaf $v$ and every $k \geq 1$, $T^k(v) = v \implies T(v) = v$. **Period 1 only; no orbit of minimal period $\geq 2$ exists.**

> The corpus is structurally a **fixed-point theory**, not a dynamical-systems theory.

Three substrate-algebraic consequences:

1. **No oscillation in the algebra.** Substrate-cell states cannot oscillate under closure-rule firing; if the substrate appears to oscillate, the cause is *outside the closure-rule layer* — observational noise (sensor reads), session-loaded LLM context drift, or non-monotone external-runtime calls projected back into cells.
  Closure rules are inflationary-monotone-idempotent by axiom; the theorem shows their composite cannot have period-2 behavior.

2. **The four-regime classification is the *only* dynamical classification.** No spectral theory, no strange attractors, no genuine periodic phenomena exist.
  This means substrate-algebraic reasoning never needs to handle "the algebra is in cycle X with frequency f"; the only states are pre-fixed-point (still ascending) and fixed-point (quiescent).

3. **Period-2 detection is structurally absent.** Where periodic-orbit detection would appear (federation φ-accrual heartbeat, dispatch retry-loop detection, memory-feedback consolidation cycles), the source must be observational noise, session-context drift, or external-runtime non-determinism — not the closure-rule algebra.

This decisively answers federation Q3 (heartbeat detector class default): the $\Diamond$P (eventually perfect) detector's transient false positives are killed by closure-2-monad lax-idempotence — the algebra cannot create them; only network noise can.

### Four-regime cohomology concentration

The [four-regime-dichotomy theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md) establishes mutual-exclusivity and joint-exhaustiveness of the four regimes via the closure ordinal $\kappa$ at boundaries $\omega$ and $\omega_1$:

| Regime | $\kappa$ | $\mathrm{Cl}$ | $\mathbf{T}(\mathcal{C}, \lambda)$ | $H^1$ for $\mathcal{F}_U$ |
|---|---|---|---|---|
| Strict | $< \omega$ | strict-idempotent | collapses to $\lambda$ as 1-category | $= 0$ |
| Scott-continuous | $= \omega$ | effectively strict at $\omega$ | strictifies at limit | $= 0$ |
| Transfinite-bounded | $\omega < \kappa < \omega_1$ | genuinely lax-idempotent | genuinely 2-dimensional in bounded countable range | live |
| Aperiodic | $\omega_1 \leq \kappa$ | genuinely lax-idempotent throughout | genuinely 2-dimensional, $\omega_1$-or-longer orbit | live |

The decisive remark from the theorem:

> The cohomological content is concentrated in the transfinite-bounded and aperiodic regimes; the strict and Scott-continuous regimes have $H^1 = 0$ for the [settling-associated sheaf](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-associated-sheaf.md).

This collapses several questions across the corpus:

- **The simplicity cap ($H^n = 0$ for $n \geq 2$)** is structural for strict/Scott-continuous fragments, not a substrate-policy.
  The cohomological-coordination question's `simplicity-cap-detection-rule` need only fire for rules in the transfinite-bounded/aperiodic fragments.
- **Per-substrate aggregate $H^1$ as quality metric** (cohomological Q22) is *meaningful only* for transfinite-bounded/aperiodic disciplines; strict/Scott-continuous disciplines have $H^1 = 0$ by structure and yield no quality signal.
- **The accretion-trajectory's cohomological signature** (cohomological Q26) tracks discipline migration *between regimes*, not free $H^1$ growth within a regime.

### Closure-rule language fragments determine regime

The [closure-rule-language concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md) establishes the syntactic-semantic correspondence directly:

- **Quantifier-free antecedents** $\Rightarrow$ Scott-continuous closure $\Rightarrow$ strict or Scott-continuous regime $\Rightarrow$ $H^1 = 0$.
- **Single $\forall$-block over infinite domain** $\Rightarrow$ non-Scott-continuous $\Rightarrow$ transfinite-bounded or aperiodic regime $\Rightarrow$ $H^1$ live.

The fragment hierarchy via [rule-language-fragment-realizability-refinement](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md):

| Fragment | Realizable family | Decidability |
|---|---|---|
| Bare $\Pi_1 + <$ | Initial segments of countable limits | proved |
| + Named-ordinal entity-equality literals | Initial segments modulo finite | proved |
| + Ordinal-arithmetic primitives | Subsets definable in ordinal arithmetic | open conjecture |
| + $\Pi_2$-rule schemas | Higher arithmetic-hierarchy definability | open conjecture (sketch) |
| + Second-order quantifiers | Borel/analytic subsets | open conjecture |

This decisively answers governance Q21 (Π₁ vs Π₂ detection cost): the projector terminates only for fragments at "proved" status (bare $\Pi_1+<$ and named-ordinal-entity-equality). $\Pi_2$ schemas are sketch-only — using them within the substrate is a *research action*, not a substrate-policy choice.

It also answers substrate-algebra Q7 (predicate-language scope): "bare $\Pi_1+<$ is enough for most engineering use" is *correct* and corresponds exactly to the strict/Scott-continuous fragment.
Ordinal-arithmetic and $\Pi_2$ schemas put the substrate into territory where realizability characterization is open.

### Per-cell convergence on FOUR is one composite step

The [four-bilattice mixed-orbit convergence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-bilattice-mixed-orbit-convergence.md) proves that for every $a, x_0 \in \mathbf{FOUR}$, the orbit of $T_a(x) := a \Rightarrow (a \odot x)$ satisfies $x_1 = x_2$ — **one composite step suffices**.
The full 4×4 value table is computed exhaustively.

This bounds engineering implementations: per-cell stabilization on $\mathbf{FOUR}$ is *2 substeps* ($a \odot \cdot$ followed by $a \Rightarrow \cdot$) or *1 fused step*.
The substrate's per-cell iteration count is structurally bounded by 1 (composite) or 2 (substep).

### Boundary cobordism + TQFT supplies replay-discipline algebra

The [settling-cobordism-category object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md) gives the algebraic structure of foreign-interior cobordisms directly: $\mathrm{Cob}_\mathrm{settling}$ is symmetric monoidal with composition by gluing settlings along shared boundaries (closure ordinal of composition is $\kappa_{S_1} + \kappa_{S_2}$, ordinal sum), $\otimes$ by disjoint union, and duality by Klein-four-negation on opposite category.
The [TQFT structure theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md) establishes:

> $Z := H^\bullet(\mathcal{F}_{(-)}) : \mathrm{Cob}_\mathrm{settling} \to \mathrm{Mod}_\mathbb{Z}$ is a symmetric monoidal functor satisfying Atiyah's axioms. $Z(\mathcal{B})$ is a commutative Frobenius algebra over $\mathbb{Z}$, refined by the $\widehat{K_4}$ gauge grading.
> The partition function of a closed cobordism equals the Euler characteristic $\chi(v) = |\mathrm{Apex}_v| - |L_\mathrm{ns}(\kappa_v)|$ via [Gauss-Bonnet](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-gauss-bonnet.md).

This answers substrate-algebra Q23 (replay-byte-identity for ACP-routed delegations) decisively.
The cohomology functor $Z$ IS the boundary-only-replay discipline: $Z(\mathcal{B})$ depends *only* on the boundary state $v_B$, not on the bulk trajectory.
Replaying ACP delegations through the cohomology functor is structurally byte-identical regardless of the foreign runtime's stochasticity, because the bulk is integrated out.

The Klein-four grading $Z(\mathcal{B}) = \bigoplus_\chi Z^\chi(\mathcal{B})$ means the substrate's replay-discipline naturally decomposes into four sectors corresponding to the bilattice's gauge characters — the *structural* refinement of the foreign-interior-cobordism replay table.

### Two internal logics: classical and paraconsistent are BOTH structural

The [two-internal-logics theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md) establishes that *every* predication hyperdoctrine supports both:

- **Classical first-order theory $T_t(\mathcal{E})$** over the truth-order adjoint system, with classical equality $=_E$ and classical Lawvere comprehension $\{-\}_\mathbf{t}$.
- **Paraconsistent first-order theory $T_k(\mathcal{E})$** over the knowledge-order adjoint system, with paraconsistent equality $\Delta_E^k$ and paraconsistent Lawvere comprehension $\{-\}_\top$.

These theories are *distinct*: the corpus gives an explicit divergence — $\forall x, y.\ x = y \vee x \neq y$ is classically derivable but *not* paraconsistently derivable, because $\Delta_E^k$ admits $\top$ as a non-classical value at off-diagonal cells in inconsistent states.

This decisively answers Q6 (dual-logic CLI surface): the dual-logic API is *not* a substrate-policy choice — the substrate has two internal logics *by structure*, and they prove different things.
The substrate-coherent path is `--logic={classical,paraconsistent}` as a *first-class* CLI flag (not separate commands), with both available simultaneously.
The flag is ergonomic *and* honest: forcing a choice would obscure the structural fact that both theories live in the same fibration.

The corpus's recommendation directly: *distributed/CRDT/paraconsistent reasoning use $T_k$* (the $\top$-on-diagonal and $\bot$-off-diagonal of $\Delta_E^k$ is stable under $\vee_k$-merge); *classical knowledge-base/database queries use $T_t$* (two-valued, compatible with classical entailment).
Per-substrate selection of one logic loses the cohomological guarantee: by the [truth-knowledge cohomology long exact sequence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md), $H^n_t \cong H^n_k$ holds **iff** the inconsistency sheaf $\mathcal{F}_U^{(\top)}$ vanishes — i.e., iff the substrate has no $\top$-cells.
Once a $\top$-cell appears (which is the load-bearing event in the multi-observer disagreement structure), the two cohomologies *genuinely differ*, and the substrate needs both queries.

### Aperiodicity characterization: the gate is two structural conditions

The [aperiodicity-characterization theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md) gives the gate criterion directly:

> A settling is aperiodic iff its closure operator is non-Scott-continuous AND its state space has cofinality at least $\omega_1$.

This decisively answers Q4 (aperiodic-authorization gate location): the gate is a closure rule (`eligibility-by-regime-authorization`) inspecting two substrate-decidable structural conditions:

1. **Non-Scott-continuity** — closure-rule-language fragment classifier on the rule body.
  Rules with quantifier-free antecedents are Scott-continuous; rules with $\forall$-block antecedents over infinite domains are non-Scott-continuous (per [closure-rule-language](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md)).
2. **State-space cofinality $\geq \omega_1$** — substrate-resident inspection of $|E|$ and $\mathcal{C}$'s structure.
  Polity entity-sets of countable cardinality cannot reach the aperiodic regime regardless of rule language.

**Both must hold** for the rule to enter the aperiodic regime.
The substrate-resident gate is a 2-clause closure rule; the gate fires only when the polity has both an unrestricted-$\forall$ rule fragment AND an uncountable-cofinality entity space.
This is rare in practice (polity entity-sets are typically finite or countable); the aperiodic regime is structurally hard to enter, which sharpens the "explicit operator authorization" requirement to "structurally rare gate, requiring captain attestation when triggered."

### Realizability cardinality bound: substrate expressivity is capped at $2^{\aleph_0}$

The [realizability-cardinality-bound theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md) proves: under countable-support increment sequences and bare-$\Pi_1$ rule language, the realizable family of $L_\mathrm{ns}$-subsets has cardinality at most $2^{\aleph_0}$ — strictly smaller than the $2^{\aleph_1}$ subsets of countable limits below $\omega_1$.

> The realizable subsets form a strict sub-collection of all possible subsets.

This sharpens Q7 (predicate-language scope): bare-$\Pi_1+<$ bounds the substrate's *expressive horizon*; richer fragments do not lift the cardinality bound (which depends only on the alphabet size and countable syntax) — they reorganize *which* $2^{\aleph_0}$-cardinal-many subsets are realizable. **Adding ordinal-arithmetic primitives or $\Pi_2$ schemas does not give the substrate access to more states; it changes the parametrization.** The countable-support restriction on increment sequences is what makes realizability non-trivial; lifting it to $\aleph_1$-many cell updates trivially gives every subset.

For the substrate's regime selection (the four-regime classification's *realizable image*):

- Strict regime: finite set of $\mathcal{C}$-natural cell configurations — the *smallest* realizable family.
- Scott-continuous regime: countable set.
- Transfinite-bounded regime (bare $\Pi_1+<$): one-parameter family of initial segments.
- Aperiodic regime (bare $\Pi_1+<$): same one-parameter family at the $\omega_1$-scale.

The realizable family in each regime is *much* smaller than $2^{\aleph_0}$.
The substrate's expressivity is *not* the cardinality of states; it is the *structure* of the realizable family, which is what the four-regime classification decomposes.

### Verdier duality: backward replay = cosheaf homology

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) establishes (across all four regimes) a derived equivalence between $\mathsf{Q}$-enriched sheaves and cosheaves on the bitopological settling site:

$$\mathrm{Sh}_{\mathsf{Q}}(\mathbf{T}^*, J) \simeq \mathrm{coSh}_{\mathsf{Q}}(\mathbf{T}^*, J).$$

In d-frame setting, the duality has *two dualities composing*: the spatial Verdier (sheaf $\leftrightarrow$ cosheaf) plus the value-category-level swap $L_+ \leftrightarrow L_-$ via bilattice negation (the [internal-z2-gauge](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/internal-z2-gauge.md)).
The composed duality identifies $\top$-firings as **self-dual fixed points** and exchanges truth-only with falsity-only firings.

This sharpens Q30 (replay-architecture-record's foreign-runtime-replay table currency) and Q32 (event-log replay vs checkpoint replay): forward replay = sheaf cohomology presentation ($H^1$); backward replay = cosheaf homology presentation ($H_1$); both encode the same MLD-class data via dual constructions.

The [aperiodic-co-classification theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md) makes the operational distinction explicit:

- **Sheaf cohomology ($H^1$ presentation):** *equality testing* via cocycle witnesses; refinement under sub-site inclusion.
  Natural for "do these two replays produce the same MLD-class?"
- **Cosheaf homology ($H_1$ presentation):** *construction* via local generators; coarsening under sub-site projection.
  Natural for "build a replay state from firing-ordinal data."

OpenHands-style event-log replay is naturally cosheaf-homology (local generators per event); LangGraph-style checkpoint replay is naturally sheaf-cohomology (global cocycle data). **Both-simultaneously is substrate-coherent because Verdier duality identifies them as equivalent presentations**; one-per-deployment loses one of the two computational primitives.

### Forward-trajectory-via-Galois fails on multi-rule-same-consequent

The [forward-trajectory-via-galois-adjunction theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/forward-trajectory-via-galois-adjunction.md) is *conditional*: it works only when the closure operator $T$ preserves meets, equivalently when $T$ has a left adjoint $T_!$.
The corpus exhibits a counterexample to meet-preservation:

> Cells $C = \{a, b, d\}$.
> Rules: $R_1: \{a\} \Rightarrow d$; $R_2: \{b\} \Rightarrow d$.
> Take $x_1 = \{a\}, x_2 = \{b\}$.
> Then $\bigcap x_i = \emptyset$ but $T(x_1) \cap T(x_2) = \{d\}$.
> Meet-preservation fails.

The structural pattern is **multi-rule-same-consequent**: any rule system with two rules producing the same cell from disjoint antecedents breaks meet-preservation.

This is the *standard* shape of polity authorization: multiple delegation paths can produce the same authority cell, multiple restorative-handlers can produce the same teaching-confirmation cell, multiple federation peers can produce the same content-cell.
The polity is structurally *not* meet-preserving in general.

This sharpens Q14 (purity classifier coverage): the Galois-adjunction primitive (`compute T_!
`) is *not* available substrate-wide; static analysis cannot rely on a unique pre-image structure.
The substrate's purity classifier must use the *general* construction ([backward-closure-recovers-forward-trajectory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/backward-closure-recovers-forward-trajectory.md)) or the closure-cover-hypergraph path, neither of which assumes meet-preservation.
The Galois primitive is an optimization for tree-shaped rule subsets only.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Algebra-equation check** — explicit `is_cl_algebra(state) -> bool` vs implicit "rule-pass-with-zero-firings" termination. **Theory: redundant.** Per Kelly-Lack (K2), the Cl-algebra structure is property-like; the explicit check cannot disagree with the implicit one.
  Drop the explicit check or surface it as diagnostic-only.
2. **`closure_state_hash` as separate field** vs merged into `rsv_hash`. **Theory: merge.** Property-like uniqueness means a single hash suffices; separate is diagnostic-only.
3. **Regime metadata storage** — embedded in rule frontmatter (mutating; cheap) vs separate registry (non-mutating).
  Embedded is more substrate-coherent.
4. **Aperiodic-authorization gate location.** Closure rule (`eligibility-by-regime-authorization`) consistent with [M2](../work/milestones/m2-substrate-dispatch.md)'s pattern, or hardcoded `runtime/lifecycle.py` precondition.
  First respects substrate-as-primitive.
5. **Settled-regime cell update cadence** — per rule activation vs tick boundary.
  Recomputation cost is bounded ($O(|\text{active rules}|)$); per-activation is fine.
6. **Dual-logic CLI surface** — `--logic` flag vs separate commands.
  Flag is ergonomic; separate forces acknowledgment.
7. **Predicate-language scope.** Bare $\Pi_1$+$<$ is enough for most engineering use; ordinal-arithmetic primitives expand the parser surface.
  Scope explicitly.
8. **Equality semantics in classical queries.** Entity-identity ($=_E$) vs paraconsistent equality restricted to truth-order.
  First is faithful to $T_t$.
9. **Causal-DAG granularity.** Within-tick fine-grained vs tick-boundary coarse-grained.
  Defer fine-grained until intra-tick parallelism arrives.
10. **`causal_hash` separate from `rsv_hash`** — separate is more diagnostic.
11. **Completion-verification cadence** — strict-regime workitems eagerly; Scott-continuous at tick boundaries; transfinite-bounded only at audit-export.
12. **Target-valuation specification language.** Bare $\Pi_1$ + $<$ for most workitems.
13. **Partial-completion handling.** Per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md), naturally a $\forall$-pullback over goal cells.
14. **Purity classifier coverage.** Static analysis catches most cases; LLM-invocation detection requires whitelist of known endpoints.
15. **Canonical-form choice.** JCS RFC 8785 is the practitioner standard.
16. **Regime-parametric type-checker integration.** Surface conditioning to user (function annotated with regime-soundness class) vs hide it.
17. **Cache-store backend for materialized views.** Filesystem (substrate-coherent), in-memory with persistence (faster).
18. **View-refresh cadence** — per-tick / on-demand / lazy with eager invalidation.
19. **Stale-tolerance policy surface** — explicit at the API.
20. **Function-purity class for substrate-state-only-context LLM calls.** Add `pure: substrate-state-only-context` as a fourth class in the purity classifier, distinguished from `pure: deterministic-llm-at-T-0` and from `impure: session-loaded-context`.
  The OpenClaw 60–80% empirical signal motivates this as the substrate's preferred mode for LLM calls.
21. **QMD-style index as a substrate-resident materialized-view kind.** Whether the substrate authors a dedicated `qmd-index-record` cell-kind (BM25 + vectors + reranking-specific schema) or a generic `materialized-view-record` with the QMD-specific projection encoded in the closure rule.
  Generic-with-encoded-projection is cleaner; QMD-specific schema may be needed for closure-rule fragment-checks.
22. **Hooks-as-closure-rules import path.** OpenClaw hooks are `HOOK.md` + `handler.ts`; PyFARS closure rules are predication objects.
  Whether to import OpenClaw hooks wholesale (closure-rule-with-foreign-handler) or transpile (closure-rule body re-authored from `handler.ts` semantics).
  Import is faster; transpile gives substrate-native algebraic structure.
23. **Replay-byte-identity discipline for ACP-routed delegations.** The foreign-interior cobordism's replay-discipline (boundary-only vs full) interacts with the substrate's purity classifier.
  ACP routing to a deterministic foreign runtime (Claude Code at $T = 0$) admits full replay; ACP routing to OpenClaw (with stochastic agent calls) requires boundary-only.
  The classifier needs a foreign-runtime-determinism field per delegation cell.
24. **Materialized-view-coherence verification frequency.** OpenClaw QMD's index-rebuild fires on file-modification; PyFARS could do per-file-modification (live), per-tick (batched), or per-quiescence (correct-by-construction).
  Per-quiescence aligns with the algebra; per-tick is the practical compromise.
25. **Falsifiable-agency certificate scope and refresh cadence.** Per-office (each candidate-agent gets a certificate), per-foreign-runtime (Claude Code, OpenClaw, etc. each receive certificates), per-polity (whole polity certified as agentic).
  Likely all three; refresh per-substrate-tick for offices; per-runtime-version for foreign runtimes; per-charter-amendment for the polity-level certificate.
26. **Spectrum-coordinate measurement source.** Bent's five-dimensional gradient — environmental-sophistication, goal-complexity, temporal-coherence, learning-adaptation, autonomy — measured directly from substrate cells (cell-write rate, plan-cobordism shape, causal_hash-DAG depth, self-generation rate, captain-attestation ratio) vs hand-authored per-office.
  Substrate-derived is more substrate-coherent; hand-authored captures intent that may not yet be observable in cells.
27. **Autopoietic-threshold gating discipline.** When [M5](../work/milestones/m5-agential-self-generation.md) ships, who attests that a self-modification has crossed the threshold safely?
  Substrate's `falsifiable-agency-certificate` re-verification (mechanical) vs captain-attestation (human in the loop) vs both (belt-and-suspenders).
  The four-cap stack is mechanical; captain-attestation adds the meaningful-human-control discipline.
28. **Cybernetic-feedback target-valuation language.** The closure rule's target-valuation drives the cybernetic-loop's reference signal.
  Restrict to bare $\Pi_1+<$ for rules-tier (mechanically decidable), allow bounded FOL for guidelines-tier, accept richer expressivity at lower tiers.
  The fragment-tier discipline IS the controlled translation from natural-language goals to substrate-decidable target-valuations.
29. **Single-office vs polity falsifiable-agency distinction.** The Sapkota AI-Agents-vs-Agentic-AI split maps to single-office vs polity at substrate level.
  Whether the substrate emits separate `single-office-falsifiable-agency-certificate` and `polity-agentic-ai-certificate` cell-kinds, or one schema with a `granularity:` field.
  Single-schema is cleaner; separate kinds may be needed for differential audit-export.
30. **Replay-architecture-record's foreign-runtime-replay table currency.** As foreign runtimes update (Claude Code releases, OpenHands version-bumps, LangGraph backend changes), the replay-discipline table needs maintenance.
  Per-runtime version-pinning (substrate-cell tracks runtime version + replay-discipline) vs operator-curated table refresh.
  Version-pinning is the substrate-coherent default.
31. **Checkpoint cadence policy default.** Per-quiescence is substrate-coherent; per-tick is cheaper but less aligned; per-N-ticks is a middle ground.
  Default for production polities likely per-quiescence with per-tick override available; default for research/exploration polities possibly per-tick for finer time-travel granularity.
32. **OpenHands-style event-log replay vs LangGraph-style checkpoint replay as polity-level choice.** Different deployments may prefer different replay surfaces.
  Whether the substrate supports both simultaneously (event-log primary, checkpoint as projection) or only one per deployment.
  Both-simultaneously is more substrate-coherent; one-per-deployment is operationally simpler.
33. **`pure: substrate-state-only-context` enforcement scope.** Per the OpenClaw 60-80% empirical signal, this should be the substrate's preferred mode for LLM calls.
  Whether the substrate refuses session-loaded LLM calls outright (strict) or warns and tracks (lenient).
  Strict is conservative-by-default; lenient lets the polity grow into the discipline.
34. **Cross-framework `.md` projection compatibility matrix.** When the substrate projects a single source-of-truth cell to Claude Code SKILL.md AND OpenClaw SKILL.md AND AGENTS.md AND Cursor rules simultaneously, format differences may produce drift.
  Substrate-resident `projection-compatibility-record` tracking which projections agree byte-for-byte; closure rule warns on incompatible projections.
