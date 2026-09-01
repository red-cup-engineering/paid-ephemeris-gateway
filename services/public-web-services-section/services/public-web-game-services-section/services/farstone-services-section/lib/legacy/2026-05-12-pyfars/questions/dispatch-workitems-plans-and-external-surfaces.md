---
type: question
status: open
explores: [quantifier-adjoints-on-work-fibers, dispatch-composes-authorization, plan-as-tensor-of-task-cobordisms, skill-composition-cost, http-method-discipline-via-fibration-generators, idempotent-methods-via-closure-2-monad-lax-idempotence, status-code-classes-as-four-bilattice-values, bearer-token-as-bound-evidence-vector, m2-substrate-dispatch, m5-agential-self-generation, m8-inbound-participation-mcp-clients, m10-cost-and-energy-ledger-extension]
---

# How does PyFARS realize dispatch — workitem aggregation, capability-and-authorization composition, plan structure, skill cost, HTTP method discipline, and bearer-token authentication — as one substrate-algebraic surface, rather than as several ad-hoc primitives?

PyFARS's dispatch graph at [`runtime/dispatch_graph.py`](../src/pyfars/runtime/dispatch_graph.py) is one substrate operation that surfaces in many forms: individual workitem dispatch, aggregate workitems with class-quantifiers, plans with dependency structure, skill compositions with cost, HTTP / MCP request handling, and the authentication that gates them all.
The web-server-platform, agential-orchestration-platform, and predicated-work theorems together account for these surfaces with one set of substrate primitives.

The dispatch operator's match-strength is twist-product fusion $\odot$ over capability and authorization fibers in one pass.
Aggregate workitems use quantifier adjoints $\exists_f^k$ and $\forall_f$ on work fibers.
Plans are 1-morphisms in the settling cobordism category — sequential composition $\circ$ vs parallel $\otimes$ are categorically distinct.
Skill composition cost is bounded by the constituent sum, with tool-promote collapsing it.
HTTP routing IS predication-fibration base-change; idempotent methods inherit from closure-2-monad lax-idempotence; status codes ARE the four bilattice values; bearer tokens are evidence vectors with a four-corner authorization verdict.

---

## Dispatch composes authorization in one pass

The agential-orchestration theorem [`dispatch-composes-authorization`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/dispatch-composes-authorization.md):

**Claim.** When dispatch composes a workitem's required-capability fiber with a candidate agent's offered-capability fiber to produce a match-strength value, the same composition simultaneously incorporates the candidate's authorization fiber. **An agent that *could* perform the work but is *not authorized* for it produces a strictly lower match-strength than an agent with the same capability and the required authorization.** The substrate does not need a separate authorization check; the composition's value-domain output expresses both capability-match and authorization-status in one step.

The dispatch operator computes match-strength via [twist-product fusion](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/twist-product-fusion.md) $\odot$ on the [predication fiber algebra](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md).
Capability and authorization are both predications on the agent entity, valued in the same fiber algebra.
The bilattice's $\odot$ on $\mathbf{FOUR}$:

- $\odot(\mathbf{t}, \mathbf{t}) = \mathbf{t}$ — matched and authorized
- $\odot(\mathbf{t}, \bot) = \bot$ — capability matched, authorization unknown (no opinion)
- $\odot(\mathbf{t}, \mathbf{f}) = \mathbf{f}$ — capability matched, authorization explicitly denied ($\mathbf{f}$ is absorbing for $\odot$)

Per the truth-order $\leq_t$ ($\mathbf{f} \leq_t \bot \leq_t \mathbf{t}$), an agent producing $\mathbf{f}$ on a required authorization ranks below an agent producing $\bot$, which ranks below an agent producing $\mathbf{t}$.

PyFARS's `runtime/dispatch_graph.py` currently runs eligibility rules ([M2](../work/milestones/m2-substrate-dispatch.md)'s `eligibility-by-charter-binding`, `eligibility-by-capabilities`) as a *filter* before `select_winners_node` — failing candidates are removed, surviving ones ranked by capability.
Per the theorem this is structurally wrong — it cannot represent **partial authorization** ($\bot$ on a required authorization), and it loses [`read-discipline`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/read-discipline.md) by branching on substrate content to gate the second stage.

The corrected single-pass form:

```python
def match_strength(workitem, candidate):
    required = workitem.required_fiber       # capability + authorization predications
    offered = candidate.offered_fiber         # candidate's capabilities
    held = candidate.authorization_fiber      # candidate's office's authorizations
    composite = required ⊙ (offered ∨_k held) # twist-product fusion
    return composite                          # value in FOUR
```

Selection picks the candidate(s) at the $\leq_t$-maximum match-strength.
The selection is now: - **Authorization-respecting.** A $\mathbf{f}$ on any required authorization absorbs to $\mathbf{f}$ overall. - **Partial-authorization-aware.** A $\bot$ candidate ranks below $\mathbf{t}$ but above $\mathbf{f}$; substrate may select the partial agent in a context where no fully-authorized agent is available, recording partial-authorization status in the dispatch witness. - **Same-pass.** Required capabilities and authorizations are predications on the same fiber; $\odot$ composes them in one operation.

**Authorization changes are immediate.** Per [`scope-as-predication`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/scope-as-predication.md), authorization predications are substrate content; adding/revoking a power is a substrate edit; the next dispatch composition produces a different match-strength immediately, no deploy cycle.

**Audit covers both dimensions.** The dispatch witness records match-strength and its inputs (required-capability fiber, offered-capability fiber, authorization fiber).
Reconstructing why an agent was or was not selected is reading past substrate state.

**Federation crosses cleanly.** When dispatch crosses a federation boundary, the receiving substrate composes the message's required-capability against the local agent's offered-capability and authorization.
Per [`federation-convergence`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/), the composition is deterministic; both substrates agree on match-strength.

**Why query-planner pushdown CANNOT short-cut $\odot$.** Per [`frobenius-for-fusion-fails`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/frobenius-for-fusion-fails.md), Frobenius reciprocity holds for $\wedge_k$ and $\wedge_t$ but **fails** for $\odot$ on three of four predicate-generator classes.
So the rewrite $\exists_f^\bullet (f^* \alpha \odot \phi) \mapsto \alpha \odot \exists_f^\bullet \phi$ is **unsound** for $\odot$.
Engineering implication: dispatch's authorization composition must remain a one-pass $\odot$ at the dispatch site; the query planner cannot reorder it through quantifiers.
PyFARS's `runtime/dispatch_graph.py` must NOT factor `exists candidate. capability(c, w) ⊙ authorized(c, w)` as `(exists candidate. capability(c, w)) ⊙ authorized(c, w)`.

---

## Quantifier adjoints for aggregate workitems

PyFARS dispatch is *individual*: a single workitem matches against eligible dispatchables.
It is silent on *aggregate* workitems: existential ("some agent in the eligible set should run a daily-roll review"), universal ("every agent that touches the codebase this cycle must read CLAUDE.md before authoring"), and class-aggregated ("the class of `routine-validation` workitems should consume no more than 30% of the day's settlement-fuel budget").

[`quantifier-adjoints-on-work-fibers`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/quantifier-adjoints-on-work-fibers.md) lifts the predication-hyperdoctrine's existential / universal adjoints to work fibers: $\exists_f$ (pushforward, "exists a workitem in this class such that") and $\forall_f$ (pullback, "every workitem in this class satisfies").
These ARE the substrate-algebraic versions of "any" and "all" workitems — load-bearing structure for representing any workitem that scopes over a class rather than a single member.

A *workitem class* is a cell-set with a shared predicate (e.g., `class: routine-validation`).
The quantifier adjoints lift cells from the individual layer to the class layer:

- **$\exists$-pushforward.** "T-valued completion is achieved when *some* member's completion cell is `T`."
  Used for any-of workitems.
  Realized as a closure rule: `(class-K, satisfied-by-some, complete) = T` whenever any K-member completes.
- **$\forall$-pullback.** "T-valued precondition holds only when *all* members' preconditions are `T`."
  Used for all-of preconditions.
  Realized as a closure rule: `(class-K, all-preconditions-T, ready) = T` when every K-member's precondition cell is `T`.
- **Beck-Chevalley.** Aggregating across two dimensions (across-agents AND across-tick-windows) commutes when the relevant pullback square commutes.
  This is the substrate-algebraic verification that a class-level constraint can be re-aggregated under restriction.

The fiber-bundle structure is named: [`capability-fiber-bundle`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/capability-fiber-bundle.md) makes the workitem class IS-a-fiber over a capability requirement, with the quantifier adjoints as the structure-preserving maps.

The structural shift in `runtime/dispatch_graph.py`:

- **Store-loading.** Load workitem *classes* alongside individual workitems.
  Class membership is derivable from substrate cells (`class:` field, `kind:` field, or substrate-classification rules).
- **Eligibility tier.** Per-class eligibility (pre-aggregated cells) feeds into per-member eligibility.
  [M2](../work/milestones/m2-substrate-dispatch.md)'s `eligibility-by-rate-limit` already aggregates naturally; making this explicit clarifies the structure.
- **Class-completion check.** If the class's $\exists$ has settled, no further members are admitted.
  If the class's $\forall$ has not yet settled, no member's completion fires class-completion until all do.
- **Assignment cells gain a class coordinate.** `(W, assigned-to, D) = T` becomes `(W, assigned-to, D, in-class, K) = T`.

The `RuleFiring` provenance and `rsv_hash` from [M2](../work/milestones/m2-substrate-dispatch.md) extend naturally — rule firings that aggregate across class members are themselves recorded.

**What this enables in adjacent milestones:**

- **[M3](../work/milestones/m3-continuous-loop.md) budget records.** A budget-record at `governance/budgets/<scope>.md` becomes a $\forall$-quantified constraint on the workitem class within scope.
  A tick that has dispatched 30% of the day's fuel disqualifies further class-members for that period — directly, via the closure rule.
- **[M4](../work/milestones/m4-memory-feedback.md) consolidation.** Consolidation IS a $\exists$-pushforward: gather observations from class members, synthesize one instinct cell for the class.
- **[M6](../work/milestones/m6-federation.md) federation.** A class-level cell can be federated as a single envelope, even when its individual members differ across peers.
- **`conflict-of-laws-as-beck-chevalley-failure` governance pattern.** When two class-aggregations across orthogonal dimensions fail to commute, it's a substrate-detectable BC failure.

---

## Plans as 1-morphisms in the cobordism category

Multi-task workitems with dependencies are realized today as flat lists with implicit dependencies; agents read the implicit dependencies from natural-language task descriptions; concurrent execution is opportunistic.
Per [`plan-as-tensor-of-task-cobordisms`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-as-tensor-of-task-cobordisms.md), plans are *first-class* substrate objects with a substrate-algebraic structure.

**Setup: tasks as 1-morphisms.** Each task presents as a [handoff cobordism](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/handoff-cobordism.md) in the [settling cobordism category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md).
For task $T$:

- **Source boundary** $\partial_- T$: predication settling at task-start — cells that must hold for $T$ to be dispatchable.
  Per [`dispatch-readiness-regime-is-strict`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-readiness-regime-is-strict.md), this is a strict-regime sub-settling.
- **Target boundary** $\partial_+ T$: predication settling at task-completion — cells produced by $T$.
  Per [completion-as-quiescence](substrate-algebra-closure-and-replay.md), this is the closure of the bulk.
- **Bulk settling** $T_\bullet$: the predication settling between source and target.

The 1-morphism is $T : \partial_- T \to \partial_+ T$.

**Two compositions.** Two tasks $T_1, T_2$ admit:

- **Sequential composition $T_2 \circ T_1$** when $\partial_+ T_1 = \partial_- T_2$: gluing of cobordisms along their shared boundary.
  "$T_2$ depends on $T_1$'s completion."
  Composition is $T_2 \circ T_1 : \partial_- T_1 \to \partial_+ T_2$.
- **Parallel composition $T_1 \otimes T_2$** when $\partial_- T_1$ and $\partial_- T_2$ are disjoint: disjoint union of cobordisms.
  "$T_1$ and $T_2$ are independent, can be dispatched concurrently."
  Composition is $T_1 \otimes T_2 : \partial_- T_1 \sqcup \partial_- T_2 \to \partial_+ T_1 \sqcup \partial_+ T_2$, taken via [`settling-tensor-product`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-tensor-product.md).

These satisfy the **interchange law** of a monoidal 1-category: $(T_2 \circ T_1) \otimes (T_4 \circ T_3) = (T_2 \otimes T_4) \circ (T_1 \otimes T_3)$ when both sides are defined.
Substrate-algebraically, this says "dispatching independent tasks in different orders gives the same result" — bedrock of parallel work.

**Theorem (plan as monoidal-cobordism expression).** Let $P$ be a plan presented as $\{T_i\}_{i=1}^k$ with dependency partial order $\preceq$.
Suppose boundary compatibility (each cover relation $i \preceq j$ has $\partial_+ T_i \supseteq B_{ij} \subseteq \partial_- T_j$) and plan-cells closure (the plan's full cell-system is closed under polity closure rules).
Then:

For **series-parallel** $\preceq$ (built from singletons by series and parallel composition only — N-free posets), $P$ presents as

$$P : \bigsqcup_{i \in \min(\preceq)} \partial_- T_i \to \bigsqcup_{i \in \max(\preceq)} \partial_+ T_i$$

built from the $T_i$ by alternating $\circ$ and $\otimes$ as prescribed by $\preceq$.
Per [`tqft-structure`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md), the action of $P$ on cohomology, $Z(P) : H^*(\partial_- P) \to H^*(\partial_+ P)$, is the composite of constituent task-actions.

For **non-series-parallel** $\preceq$ — plans with genuine fan-in/fan-out (e.g., the N-shaped poset $\{a < c, b < c, b < d\}$) — the 1-morphism representation requires Frobenius-multiplication ($\nabla$) and Frobenius-comultiplication ($\Delta$) primitives from [`settling-frobenius-structure`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/settling-frobenius-structure.md), beyond binary $\circ, \otimes$.

**Cell-sharing as the test of sequential vs parallel.** Consider two tasks $T_1, T_2$ producing a cell pattern with shared cell $c$.
In sequential composition $T_2 \circ T_1$ with $T_2$ taking $c \in \partial_+ T_1 = \partial_- T_2$ as input, $c$ is *consumed* by $T_2$ — the bulk of $T_2 \circ T_1$ contains $c$ as an internal cell.
In parallel composition $T_1 \otimes T_2$ with disjoint source-boundaries (so $T_2$ does not take $c$ as input), both copies of $c$ appear in $\partial_+(T_1 \otimes T_2)$ as distinct cells in disjoint sub-settlings.
The cohomological action differs: $Z(T_2 \circ T_1)$ may have non-trivial $H^1$ at $c$ from the sequential firing; $Z(T_1 \otimes T_2)$ has the two copies as independent generators with no $H^1$ relation. **Sequential and parallel are categorically distinct compositions; the interchange law is the only identity relating them.**

**Plan completion is bulk closure of the cobordism.** Per [completion-as-quiescence](substrate-algebra-closure-and-replay.md), each task's completion is its quiescence; the plan's completion is the *coherent simultaneous* quiescence across the cobordism — every constituent task's goal cells quiescent at target valuation, with the gluings/tensorings respected.

**TQFT-style invariants of plans.** Per `tqft-structure`, every plan-1-morphism inherits TQFT-style invariants:

- **State space** $Z(\partial_- P)$ — cohomological signature of cells the plan consumes.
- **State space** $Z(\partial_+ P)$ — cohomological signature of cells the plan produces.
- **Partition function** $Z(P) : Z(\partial_- P) \to Z(\partial_+ P)$ — cohomological action.
- **Amplitudes** $\langle s_+ | Z(P) | s_- \rangle$ — cohomological-class probability that the plan, started at source-state $s_-$, lands at target-state $s_+$.

For PyFARS, plan-amplitudes give a substrate-algebraic plan-quality metric: for a workitem-class with empirical historical inputs/outputs, the plan with highest amplitude has the highest cohomological-class probability of completing as expected.
Per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s consolidation pattern, this is naturally a stigmergic feedback target.

**Decomposition / refinement / consolidation are duality.**

- **Refining** a task into a plan = presenting a 1-morphism as a non-trivial composite.
- **Consolidating** a plan into a task = treating the composite as opaque.

Both are inverse operations on the cobordism category.
PyFARS's [`decompose-task`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/) IS this duality.

A new substrate object kind, `plan-record`:

```yaml
type: plan-record
constituent-tasks: [T1, T2, ..., Tk]
dependency-poset:
  - { task: T1, depends-on: [] }
  - { task: T2, depends-on: [T1] }
  - { task: T3, depends-on: [T1] }
  - { task: T4, depends-on: [T2, T3] }   # fan-in (Frobenius mult required if non-series-parallel)
poset-shape: series-parallel | n-shaped | general
boundary-identifications:
  - { source: T1.partial-output, target: T2.required-input }
plan-source-boundary: ⨆_{i ∈ min(≤)} ∂− T_i
plan-target-boundary: ⨆_{i ∈ max(≤)} ∂+ T_i
```

Closure rules: `compute-plan-1-morphism` (parses dependency-poset; classifies series-parallel via N-free graph algorithms; builds the 1-morphism from $\circ, \otimes$ recursively for series-parallel, invokes Frobenius mult/comult for general); `verify-plan-completion` (fires when constituent tasks complete, checks bulk closure of the cobordism).

---

## Skill-composition cost is bounded by constituent sum; tool-promote collapses it

The agential-orchestration theorem [`skill-composition-cost-is-bounded-by-constituent-sum`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/skill-composition-cost-is-bounded-by-constituent-sum.md):

**Claim.** Let $\mathcal{C} = s_1, s_2, \ldots, s_n$ be a sequential skill composition and $C(s_i)$ its per-invocation cost at its current formality layer.
Then:

$$C(\mathcal{C}) \leq \sum_{i=1}^{n} C(s_i)$$

(plus data-flow overhead at $C_{F_3}$ — substrate-side operation cost — absorbed in the $\leq$).

**Tool-promote collapse.** When $\mathcal{C}$ is promoted to a tool via [`promote`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/morphisms/promote.md) (every constituent reduces to substrate-only operations), the promoted tool's per-invocation cost is:

$$C(\mathrm{promote}(\mathcal{C}, F_3)) \leq C_{F_3} \ll \sum_{i=1}^{n} C(s_i)$$

with strict inequality whenever any $s_i$ operates above $F_3$.
Per [`promote-is-strictly-cost-reducing`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/promote-is-strictly-cost-reducing.md), each successful promote moves the skill from $F_j > F_3$ to $F_3$, strictly reducing cost.

The formality-layer hierarchy:

- **$F_0$** — model-invocation-bearing (LLM call required).
- **$F_1$** — multi-step reasoning with tool calls but reproducible policy.
- **$F_2$** — deterministic-path-with-validation.
- **$F_3$** — pure substrate operations; closure-rule evaluations only.

**Why the sum bound holds.** Composition invocation is constituent-invocation sequence.
Per [`skill-composition`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/skill-composition.md), invoking a composed skill is operationally the platform's runtime expanding the composition's predications and dispatching each constituent in declared order.
The composition does not add work beyond constituent invocations and the data-flow propagation between them.
Data-flow propagation is substrate-side predication operations — substrate reads and writes — costing at most $C_{F_3}$.
Total cost is at most $\sum C(s_i) + n \cdot C_{F_3}^{\mathrm{data-flow}}$, with the data-flow overhead absorbed.

**Why parallelism does not increase the sum.** For parallel composition $s_1 \parallel s_2 \parallel \cdots \parallel s_n$, constituents are dispatched concurrently and outputs joined via $\vee_k$.
Total resource consumption is at most the sum; parallelism reduces *wall-clock* cost but not total resource cost.

**Why tool-promote collapses cost strictly below the sum.** When $\mathcal{C}$ is promoted, the promoted tool's invocation is a single deterministic substrate procedure.
Cost is bounded by the procedure's substrate-operation count times $C_{F_3}^{\mathrm{op}}$:

$$C(\mathrm{promote}(\mathcal{C}, F_3)) = k \cdot C_{F_3}^{\mathrm{op}} \quad \text{for some } k \geq 1$$

This is strictly less than $\sum C(s_i)$ whenever any $s_i$ was above $F_3$ because: 1.
Each $s_i$ promoted from $F_j > F_3$ to $F_3$ strictly reduces cost.
2.
The composition's tool-promote *also* eliminates dispatch overhead between constituents.
3.
The tool's procedure may be *shorter* than the sum: data-flow propagations that were inter-skill round-trips become intra-procedure variable bindings.

A new substrate object kind, `skill-cost-record`:

```yaml
type: skill-cost-record
target-skill: <slug>
formality-layer: F0 | F1 | F2 | F3
per-invocation-cost-bound:
  tokens: 10000
  wall-clock-seconds: 30
  substrate-operations: 50
constituent-skills:                   # for compositions only
  - { slug: parse-input, layer: F2, cost: { tokens: 500 } }
  - { slug: synthesize-output, layer: F0, cost: { tokens: 8000 } }
  - { slug: format-result, layer: F3, cost: { substrate-operations: 5 } }
tool-promote-eligible: true | false   # all constituents reducible to F3?
tool-promote-projected-cost:
  substrate-operations: 60            # the F3-only cost if promoted
maturation-target: F3
last-measurement-witness: <event-id>
```

Closure rules: `compute-composition-cost-bound` (sums constituents per the bound), `record-invocation-cost` (records actual cost; emits anomaly cell if exceeds bound), `prioritize-promotion-targets` (ranks skills by `(invocation-frequency × per-invocation-cost-savings-from-promotion)` and emits `promotion-target-record` for the captain's maturation queue).

**Engineering consequences.**

- **Skill library scaling has predictable cost.** Composed skill never costs *more* than its constituents directly.
- **Tool-promote of compositions is the highest-value optimization path.** A composition of $n$ F₀ skills has cost at most $n \cdot C_{F_0}$.
  Tool-promoting collapses it to $C_{F_3}$ (constant, independent of $n$).
  For large or frequently-invoked compositions, this is the highest-leverage optimization the platform's maturation machinery can perform — more valuable than promoting individual skills one at a time.
- **Composition-level learning target identification.** A composition whose most expensive constituent is F₀ or F₁ is a candidate for targeted promotion: promoting that constituent reduces cost toward the bound's next plateau.
- **Sequential decomposition for cost attribution.** The bound makes attribution exact up to data-flow overhead: each constituent's cost is attributable to that constituent's invocation; an auditor sees per-step costs.

---

## Orchestration patterns as cobordism instances; choreography as the dual

Multi-agent harness practice (Anthropic Agent SDK; ECC; W3C WS-CDL 2005; Milner 1999) recognizes four concrete dispatch patterns: **parallel dispatch**, **sequential pipeline**, **phased orchestration**, **worktree isolation**.
Each is a particular cobordism shape on the plan-as-1-morphism category established above; the orchestration/choreography distinction is the dual between substrate-as-router and cell-merge-as-shared-protocol.

**Parallel dispatch as $\otimes$.** Sending the same workitem to multiple offices simultaneously — `reviewer + security-reviewer` on one auth-module review — is parallel composition $s_1 \otimes s_2$.
Each branch is an independent 1-morphism; results merge at the closing $\vee_k$.
This is Gerkey–Matarić's *single-task, multi-robot allocation* (IJRR 2004): one task, multiple agents, distinct capability signatures.
The substrate's role is capability-matching ($\odot$-fusion of authorization with each office's capability vector), non-interference (read-only background dispatch + write-serialization on overlapping cells), and result-merging ($\vee_k$ at workitem closure).

**Sequential pipeline as $\circ$.** Agents execute in declared order, each consuming the previous agent's output: `planner → reviewer`.
This is Mintzberg's *standardization of output* (1979) — the handoff document is the typed interface.
The handoff IS exactly a [`handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/handoff-cobordism.md) (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) with content-preserving interior.
Honda–Yoshida–Carbone session types (POPL 2008) classify well-typed handoffs: a session type holds iff the receiving agent's read-grammar is satisfied by the sending agent's write-grammar, which IS the cobordism's source-slice ⊆ target-slice predication.

**Phased orchestration as interchange.** `architect → planner → [user] → reviewer + security-reviewer → doc-updater` mixes both shapes.
The interchange law $(s_1 \otimes s_2) \circ (t_1 \otimes t_2) = (s_1 \circ t_1) \otimes (s_2 \circ t_2)$ governs whether reordering is sound.
PyFARS verifies the law by checking that the parallel-stage's reads are disjoint from the previous stage's writes — equivalently, that sequential-after-parallel is BC-commutative on the jurisdiction pullback (per [cohomological-coordination question](cohomological-coordination-and-audit.md)).
Where interchange holds, dispatch is free to schedule; where it fails, dispatch must serialize.

**Worktree isolation as disjoint-cover restriction.** Concurrent writes to overlapping files are resolved by isolated git worktrees — each agent works on a fresh checkout, conflicts surface at merge-time.
Substrate-algebraically: $\mathrm{cl}_p(X_A \vee_k X_B) = \mathrm{cl}_p(X_A) \vee_k \mathrm{cl}_p(X_B)$ is automatic on disjoint covers; it is the *non-disjoint* case that requires the closure-merge commutation lemma to assure convergence.
ECC `dmux` and the harness's `EnterWorktree`/`ExitWorktree` tools encode this: the worktree boundary is the cover element, and the merge step is $\vee_k$ at the parent branch. **Worktree isolation is a free corollary of disjoint-cover commutation**, not a special-case engineering pattern.

**Hybrid: PyFARS is orchestrated outside, choreographed inside.** The substrate dispatches workitems via centralized routing (orchestration); cells respond to closure-rule firings via local listeners (choreography).
This matches the Reactive Manifesto (2014): message-driven event handling at the cell-merge layer, message-routing at the dispatch layer.
The orchestration/choreography duality maps cleanly to the predication frame — orchestration places the substrate as agent and offices as patients; choreography is the dual where every cell is simultaneously agent (publisher of cell-update events) and patient (subscriber to closure-rule firings).
Hayek's *Use of Knowledge in Society* (1945) is the dual of Mintzberg's *direct supervision*: orchestration centralizes the decision and decentralizes the work; choreography centralizes the protocol and decentralizes the decision.
PyFARS does both at different layers, deliberately: orchestration is **visible** (audit-friendly, replay-deterministic), choreography is **scalable** (loosely coupled, partial-failure-resilient).

A substrate object kind, `dispatch-pattern-record`:

```yaml
type: dispatch-pattern-record
target-workitem: <id>
pattern: parallel | sequential | phased | worktree-isolated
constituent-offices:
  - { office: <slug>, role: agent | patient }
interchange-soundness:                  # phased only
  verified: true | false
  pullback-square: <BC-square-id>
disjoint-cover:                         # worktree-isolated only
  cover-elements: [ <branch-id>, ... ]
  merge-target: <branch-id>
session-type:                           # sequential only
  source-write-grammar: <schema-id>
  target-read-grammar: <schema-id>
  type-checked: true | false
```

Closure rules: `verify-interchange-soundness` (BC-commutation check on phased patterns), `check-session-type-compatibility` (Honda-Yoshida-Carbone discipline on sequential), `enforce-disjoint-cover` (worktree-isolated branches do not share write-cells), `route-by-pattern` (dispatch chooses pattern from workitem shape).

**Engineering consequences.**

- **The four practical patterns are not four primitives** — they are four restricted projections of the cobordism category.
  A unified compiler chooses among them by inspecting the workitem's dependency-poset shape (per the plans-as-1-morphisms section above).
- **Three open problems from Anthropic's harness practice resolve as substrate features**: (a) formal non-interference is BC-commutation on jurisdiction pullbacks; (b) dynamic role composition is $\odot$-fusion of capability vectors at dispatch-time; (c) accountability tracing is the witness-chain projection per [governance question](governance-charter-and-accountability.md) — none requires a new primitive.
- **Saturation matters at the orchestration layer, not the choreography layer.** Pure orchestration saturates at ~4 agents per MASFT (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)); pure choreography is opaque and audit-hostile.
  The hybrid splits the difference correctly only because the substrate-as-cell-merge does the choreography (verifiable, replay-deterministic) and dispatch-as-routing does the orchestration (visible, accountable).

---

## Instruction-resolution as fiber-local rule sheaf

The agent-instruction-file ecosystem (AGENTS.md, CLAUDE.md, SOUL.md, .cursorrules, .github/copilot-instructions.md) has converged on three architectural patterns: **co-located** (AGENTS.md, root-down concatenation), **centralized + glob targeting** (Cursor's `.cursor/rules/`), and **hybrid** (Copilot's `.github/instructions/` with `applyTo` frontmatter).
The AGENTS.md spec (formalized August 2025; under Linux Foundation Agentic AI Foundation since December 2025; 60K+ open-source adoptions; OpenAI's repository reportedly 88 AGENTS.md files) walks root-to-cwd, concatenates instructions root-first, with nearest-ancestor effectively winning via prompt positioning, capped at 32 KiB.
PyFARS's `_index.md` per directory and harness-installed CLAUDE.md occupy this ecosystem deliberately.

**The cascade IS sheaf-section restriction.** A repository is a topological space whose open cover is the directory tree.
Each instruction file is a *section* over the open set rooted at that directory.
Concatenation in root-first order is restriction-then-extension along the inclusion of the smaller directory into the parent.
The 32 KiB cap is a *bounded-section* discipline. **The AGENTS.md cascade is exactly the sheaf-section presheaf restriction map** $\rho_{V \subseteq U}: \mathcal{F}(U) \to \mathcal{F}(V)$ on the directory cover — the same machinery that powers the audit projector and Beck-Chevalley jurisdiction transfer (per [cohomological-coordination question](cohomological-coordination-and-audit.md)).

**Bazel-package-disjointness IS sheaf-cover discipline.** Bazel's rule "no file may belong to two packages" makes the cover-by-BUILD-file *strict cover with disjoint refinement*.
AGENTS.md does not enforce this strictly, but the cascading-discipline ensures *for each leaf-cell, exactly one cascade applies*.
This is the closure-merge commutation lemma's free corollary on disjoint covers (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)) — concurrent edits to AGENTS.md files in disjoint subtrees commute trivially; only sibling-AGENTS.md edits at overlapping levels need to invoke the full closure-merge.

**The fragment correspondence.** Per the [governance question](governance-charter-and-accountability.md)'s charter-language-fragment hierarchy, a *fragment* is a finitely-generated subalgebra of the closure-rule language — bounded vocabulary, bounded reasoning style, bounded interpretive commitments.
The per-directory AGENTS.md instructs in a *bounded fragment of the substrate's overall closure-rule language*: a math directory's fragment privileges constructive proof; a sociology directory's fragment privileges grounded-claim citation.
Vasilopoulos (2026) names this *epistemic instruction* as distinct from the *procedural instruction* of code-repository AGENTS.md.
PyFARS's `_index.md` per directory is the exact realization: each directory's `_index.md` declares which fragment is active locally; substrate-resident closure rules read it as authoritative for that directory's leaf cells.

**The Vasilopoulos three-tier architecture matches the substrate's cell-tier discipline.** The "Codified Context" paper (Vasilopoulos 2026; 283 development sessions on a 108K-line C# system) deployed three tiers:

- **Tier 1: Hot memory (~660 lines).** Constitution loaded into every session — universal conventions, build commands, orchestration protocols.
- **Tier 2: Specialized agents (~9,300 lines across 19 agents).** Domain-expert specifications; over half is project-domain knowledge.
- **Tier 3: Cold memory (~16,250 lines across 34 documents).** On-demand specifications retrieved selectively via MCP.

PyFARS's substrate already exposes this tiering: hot = `governance/charter.md` + root CLAUDE.md (always-loaded); specialized = `governance/agents/<office>.md` (office-scoped, loaded when that office is dispatched); cold = `theories/.../*` content (on-demand via MCP per [M8](../work/milestones/m8-inbound-participation-mcp-clients.md)).
The three-tier architecture is *not* a separate engineering discipline — it's the *cell-fiber tiering* the substrate produces by construction, with the Vasilopoulos size ratios (~1 : ~14 : ~25) as empirical anchors for what works at LLM-tool-surface scale.

**The four-axis convention taxonomy.** Per the agent-instruction-file-standards survey:

| | Project-scoped | Agent-scoped |
|---|---|---|
| **Tool-agnostic** | AGENTS.md | SOUL.md |
| **Tool-specific** | .cursorrules / .github/copilot-instructions.md | CLAUDE.md |

PyFARS occupies all four corners deliberately: `governance/charter.md` + per-directory `_index.md` is project-scoped tool-agnostic (AGENTS.md role); `governance/agents/<office>.md` is agent-scoped tool-agnostic (SOUL.md role); harness-installed CLAUDE.md is the agent-scoped tool-specific (Claude Code) projection; harness templates can author analogous AGENTS.md / .cursorrules for foreign harnesses without changing substrate content. **The substrate is the source-of-truth; harness instruction files are projections** — exactly the closure-rule pattern of `materialized view at quiescence` (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)).

**Identity vs instruction is the morphism-vs-object split.** SOUL.md (identity: who the agent IS) and AGENTS.md / CLAUDE.md (instruction: what the agent should DO) split agent-configuration along an axis that maps to predication-categories: *what the agent IS* is the office-record (an object); *what the agent DOES* is the dispatch-rule (a morphism — a closure rule on the office's authority cell).
PyFARS's `governance/agents/<office>.md` carries both halves in a single file by convention, but closure rules read them as separate predication-fragments: the office-identity fragment governs which workitems the office is *eligible* for; the office-instruction fragment governs *how* the office discharges them.

A substrate object kind, `instruction-cascade-record`:

```yaml
type: instruction-cascade-record
target-directory: <path>
cascade-stack:                          # root-first, nearest wins via positioning
  - { source: governance/charter.md, scope: polity-wide, role: project-tool-agnostic }
  - { source: theories/_index.md, scope: theory-root, role: project-tool-agnostic }
  - { source: theories/<domain>/_index.md, scope: discipline, role: project-tool-agnostic }
fragment-active:
  vocabulary: [<term-slug>, ...]
  reasoning-style: constructive | grounded-claim | mathematical | ...
  interpretive-commitments: [<commitment-slug>, ...]
size-bytes: 14820                       # cap 32 KiB per AGENTS.md spec
projected-foreign-files:                # harness-installed, not authoritative
  - { path: AGENTS.md, format: agents-md-1.0 }
  - { path: CLAUDE.md, format: claude-code }
  - { path: .cursorrules, format: cursor }
```

Closure rules: `compute-cascade-stack` (walks root-down per the AGENTS.md spec), `derive-active-fragment` (intersects fragments along the cascade), `enforce-cascade-size-cap` (warns when cascade exceeds 32 KiB), `project-foreign-instruction-files` (regenerates AGENTS.md / .cursorrules / .github/copilot-instructions.md from the cascade as harness-managed projections), `detect-cascade-drift` (an `_index.md` not re-fired since a structural change is a stale projection — the [Vasilopoulos cautionary finding](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/per-directory-agent-instructions.md) on outdated context documents).

**Engineering consequences.**

- **Per-directory `_index.md` is the AGENTS.md role for PyFARS** — already the convention; the substrate does not need a separate AGENTS.md *per* directory; harness-projection produces them when foreign harnesses need them.
- **Quality matters more than presence.** The Vasilopoulos companion evaluation found context files improved performance by ~4% but increased cost by ~20%.
  PyFARS's substrate-resident `_index.md` files are *active content* — read by closure rules and updated by the substrate, not author-once-and-forget.
  The 4%/20% finding is the cost/benefit anchor for active-content discipline.
- **Context drift IS stale-cell drift.** "Outdated context documents caused agents to generate code conflicting with recent refactors" → an `_index.md` not re-fired by closure rules since a structural change is a stale projection; substrate-resident drift detection is the remedy.
- **No-schema (AGENTS.md) vs schema (PyFARS frontmatter).** AGENTS.md's quality-varies-enormously is the cost of its no-schema policy; PyFARS's typed frontmatter is the deliberate alternative.
  The two coexist: AGENTS.md is the harness-projection format for tools that don't read frontmatter; the substrate's frontmatter is the source-of-truth.

---

## OpenClaw Gateway as orchestrator prior art; ACP as orchestrator-of-orchestrators

OpenClaw's architecture (per [`openclaw-summary-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/openclaw-summary-march-2026.md), [`companion-tools-for-openclaw-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/companion-tools-for-openclaw-march-2026.md), and [`openclaw-research-and-math-assistant-patterns-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/openclaw-research-and-math-assistant-patterns-march-2026.md)) is the most-developed working implementation of the orchestration patterns established above.
It supplies prior art for three structural claims: the Gateway-as-control-plane pattern, the ACP-agent orchestrator-of-orchestrators pattern, and the channel-multiplexing dispatch surface.

### The Gateway as long-running orchestrator

The OpenClaw Gateway is a single persistent process that owns sessions, channels, tools, configuration, routing, and events.
The README's central architectural claim: *the Gateway is only the control plane; the product is the assistant itself*.
The Gateway runs on a machine the operator controls (default `~/.openclaw/`); the operator interacts via browser dashboard, configured chat channels, or paired [`openclaw-node`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-node.md) instances on mobile/desktop.
Default runtime is the Pi agent in RPC mode.
The project name iterated through Warelay → Clawdbot → Moltbot → OpenClaw before stabilizing; v2026.3.7 stable as of March 2026.

This is exactly the *centralized-orchestration-with-decentralized-cells* pattern from the [orchestration-patterns section above](#orchestration-patterns-as-cobordism-instances-choreography-as-the-dual): the Gateway is the orchestrator (visible, audit-friendly, accountable); cells respond to closure-rule firings via local listeners (choreography).
PyFARS-as-substrate is structurally the Gateway-equivalent. **OpenClaw's market position confirms that the Gateway-as-single-process pattern is the correct shape for long-running agent systems** — the convergence after several rename iterations and stable production status (60K+ open-source installs) is empirical evidence that this is what the architecture wants to be.

The Gateway's architectural disciplines map directly onto PyFARS's substrate:

| OpenClaw Gateway property | PyFARS-substrate generalization |
|---|---|
| Local-first; loopback bind by default | Substrate-bounded by default; federation explicit |
| Single-user / operator-controlled | Multi-office under the captain-as-apex pattern |
| Pi-agent-RPC default; ACP for foreign runtimes | Closure-rule runtime; cobordism with foreign interior for foreign runtimes |
| Filesystem-rooted state at `~/.openclaw/` | Substrate-cell-rooted state at `theories/`/`governance/`/`work/` |
| Plugins in-process (trusted code) | Closure rules in-substrate (trusted by closure-rule-language fragment) |
| MCP via `mcporter` (out-of-core) | MCP via [M8](../work/milestones/m8-inbound-participation-mcp-clients.md) (decoupled from closure-rule core) |

The Gateway-architecture analogue is structurally the right shape; PyFARS extends it with the closure 2-monad's algebra, the four-regime classification, and the substrate-resident closure-rule discipline that OpenClaw approximates with hooks.

### ACP agents as orchestrator-of-orchestrators (cobordism with foreign interior)

OpenClaw's ACP (Agent Communication Protocol) backend lets the Gateway route work to external coding harnesses: Pi, Claude Code, Codex, OpenCode, Gemini CLI (per [`openclaw-acp-agent`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-acp-agent.md)). **OpenClaw is itself an orchestrator that can dispatch to other orchestrators.** Carl Vellotti's framing: *OpenClaw is the 24/7 system; Claude Code is the focused-work tool*.
Jason Cochran's: *have OpenClaw plan and supervise specialized tools rather than forcing OpenClaw to do all technical work directly*.

The dispatch question's [plan-as-1-morphism cobordism category](#plans-as-1-morphisms-in-the-cobordism-category) generalizes naturally.
A 1-morphism whose interior is "delegate to Claude Code" is a *black-box morphism* in the cobordism category.
The interior's structure is opaque to the substrate (Claude Code runs its own agent loop), but the boundary cells are visible:

- **Foreign-interior 1-morphism** $f: A \to B$ where the cobordism interior is sealed against substrate inspection but the boundary cells $A$ (source-slice) and $B$ (target-slice) are substrate-resident.
- **Composability** is preserved: $g \circ f$ where $f$ delegates to Claude Code and $g$ delegates to Codex composes via standard cobordism composition; the substrate sees only the $A \to B \to C$ chain, not the foreign interiors.
- **Verifiability** is at the boundary: the substrate cannot replay $f$'s interior (it ran in another process / another harness), but it CAN verify that the source-slice $A$ satisfies $f$'s precondition and the target-slice $B$ satisfies $f$'s postcondition.
  This is the [function-purity replay-byte-identity discipline in the substrate-algebra question](substrate-algebra-closure-and-replay.md) at the foreign-call boundary: the substrate replays the *delegation event*, not the foreign computation.
- **Witness chain** at the foreign-interior boundary: the substrate records `(delegated-by, delegated-to-runtime, at, output-hash)` as a witness chain; replay reproduces the witness chain even when the interior is non-deterministic.

The substrate-algebraic statement: **PyFARS's cobordism category extends to a category-of-cobordisms-with-foreign-interior**, where foreign interiors are black boxes equipped with source/target boundary cells and a witness chain certifying the delegation.
ACP-style routing is the harness-projected realization.
This unifies several patterns under one algebra:

- ECC `dmux` parallel agent dispatch (via `EnterWorktree`) — multiple foreign-interior cobordisms in parallel ($\otimes$ of foreign-interior morphisms).
- OpenClaw → Claude Code ACP routing — sequential foreign-interior cobordisms.
- PyFARS → OpenClaw → Claude Code chained delegation — composition of foreign-interior cobordisms across two harness boundaries (a 2-cell whose two 1-cells are themselves foreign-interior morphisms).
- Anthropic's subagent dispatch (Agent tool / Task tool) — foreign-interior cobordism with the foreign runtime being a subordinate Claude session.

A new substrate object kind, `foreign-interior-cobordism-record`:

```yaml
type: foreign-interior-cobordism-record
target-workitem: <workitem-id>
delegating-orchestrator: pyfars | openclaw | claude-code | ...
interior-runtime: claude-code | codex | opencode | gemini-cli | pi | external-process
source-slice:
  cells: [<cell-id>, ...]
  precondition: <closure-rule-id>
target-slice:
  cells: [<cell-id>, ...]
  postcondition: <closure-rule-id>
witness-chain:
  - { delegated-by: <office>, delegated-to-runtime: <runtime>, at: <timestamp> }
  - { delegate-returned: <runtime>, at: <timestamp>, output-hash: <hash> }
replay-discipline: boundary-only | full   # full requires deterministic foreign runtime
foreign-runtime-determinism: true | false # claude-code at T=0 is approximate; openclaw is not
```

Closure rules:

- `verify-foreign-interior-precondition` — checks that source-slice $A$ satisfies the declared precondition before delegation.
- `verify-foreign-interior-postcondition` — checks that target-slice $B$ satisfies the declared postcondition after delegation; on failure produces a $\top$-cell.
- `replay-boundary-witness-chain` — the replay engine reproduces the source/target boundary cells and the witness chain, but does not re-execute the interior unless `replay-discipline: full` and the foreign runtime is deterministic.
- `compose-foreign-interior-cobordisms` — when an outbound delegation is itself nested inside an inbound delegation, the witness chains compose; the audit projector reads the composed chain.

### Channel multiplexing as inbound-MCP prior art

OpenClaw supports **22 messaging platforms** as first-class inbound channels: WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, BlueBubbles, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, Zalo Personal, WebChat.
Plus macOS, iOS, and Android as device surfaces with voice / camera / screen capture / Canvas-rendering capabilities exposed to the agent.

This is **prior art for [M8](../work/milestones/m8-inbound-participation-mcp-clients.md)** (inbound participation via MCP clients).
Two findings are load-bearing:

- **Channel adapters are projections of an underlying input cell-kind.** A WhatsApp message and a Slack message become *the same workitem class* once routed past the channel adapter; the adapter does message-format translation, the orchestrator dispatches the channel-agnostic workitem.
  PyFARS's MCP-client surface is the same pattern: every inbound channel becomes a substrate cell of the same kind once past the adapter; the substrate routes channel-agnostically.
  The adapter is **a fibration functor** from the channel-specific message category to the substrate's workitem category — the universal mapping property is that the substrate sees only the workitem-cell, never the channel-specific format.
- **Per-channel DM policy is per-channel trust gating.** Each channel can have its own DM policy (`pairing`, `allowlist`, `open`, `disabled` per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section); the channel-level trust-gate is composed with the agent-level eligibility. **Trust composes through channels.** The [bearer-token four-corner verdict above](#bearer-tokens-as-bound-evidence-vectors-with-four-corner-verdict) extends naturally: the channel-level trust gate produces one $\langle t, k \rangle$ corner; the bearer-token verdict produces another; they compose via $\odot$-fusion just like capability and authorization (per the [dispatch-composes-authorization section](#dispatch-composes-authorization-in-one-pass)).

Substrate object kind, `channel-adapter-record`:

```yaml
type: channel-adapter-record
channel: whatsapp | telegram | signal | slack | discord | matrix | ...
inbound-format: <message-schema>
outbound-format: <message-schema>
fibration-functor: <closure-rule-id>      # the adapter mapping
channel-level-dm-policy: pairing | allowlist | open | disabled
device-capabilities:                       # only for device-channel adapters
  voice: true | false
  camera: true | false
  screen-capture: true | false
  canvas-rendering: true | false
```

### QMD as filesystem-with-retrieval-on-top, ClawHub as federated skill distribution, OpenProse as plan-as-1-morphism

Three companion-tool primitives in OpenClaw's stack instance dispatch-question structures already established:

- **QMD** ([`qmd`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/qmd.md)) — experimental memory-retrieval backend combining BM25 + dense vectors + reranking, *while keeping Markdown as source-of-truth*.
  This is the architectural pattern PyFARS already uses: substrate-cells-as-source-of-truth; retrieval indices as *materialized views at quiescence* (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)).
  The substrate's `materialized-view-record` cell-kind hosts QMD-style indices natively; closure rules trigger rebuild on file-modification; quiescence is the index-coherent moment.
- **ClawHub** ([`clawhub`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/clawhub.md)) — public skill registry with 13,729+ community-contributed skills (February 2026).
  Search/install/update programmatically. **Structurally a federated skill distribution channel** — exactly the federation-of-skills story from the [federation-resilience question](federation-resilience-and-degradation.md).
  The ship-deltas-not-data discipline (FedAvg-style) extends naturally: a skill is a closure-rule-bundle; what gets shipped between polities is the *closure-rule body*, not the substrate state it operated over.
  ClawHub demonstrates this works at 13,729-skill scale — a future PyFARS extension can adopt the same architecture for inter-polity skill distribution.
- **OpenProse** ([`openprose`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openprose.md)) — markdown-first workflow format running through the `/prose` command.
  Documented use cases: multi-agent research and synthesis with explicit parallelism, repeatable approval-safe workflows. **A working realization of plan-as-1-morphism** — a markdown file IS a 1-morphism in the cobordism category, and `/prose <plan>` is "execute this plan."
  OpenProse's choice of markdown-first is the same essence-claim as PyFARS: plans are content, not code.
  The plan's structure (parallelism, approval gates) maps directly to the plan-as-cobordism algebra ($\circ, \otimes$, Frobenius primitives where needed for general posets).

### Hooks as in-Gateway event-driven dispatch (cross-link to memory-feedback)

OpenClaw hooks (per [`openclaw-hook`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-hook.md)) are directory-discovered handlers — `HOOK.md` + `handler.ts` — fired on command or lifecycle events.
Bundled hooks: `session-memory`, `bootstrap-extra-files`, `command-logger`, `boot-md`.
These ARE substrate closure rules with directory-discovery overlay; the full mapping to PyFARS closure-rule kinds appears in the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section.
For the dispatch surface specifically, hooks provide a *pre-dispatch interception point* — workspace-level hooks can intercept commands before the substrate dispatches the workitem, providing per-workspace policy enforcement (permission checks, validation, custom audit).
PyFARS's substrate exposes the same interception point as a closure-rule-firing precondition.

### Substrate consequences

- **The Gateway-as-control-plane pattern is the correct shape for long-running agent systems.** OpenClaw's market success (60K-installed-base community, year-on-year stability) is empirical confirmation.
  PyFARS's substrate-as-orchestrator IS the same pattern at the substrate-algebraic level.
- **Foreign-interior-cobordism is the right algebraic shape for cross-harness delegation.** ACP's working integration with Pi / Claude Code / Codex / OpenCode / Gemini CLI demonstrates that the boundary-only-replay discipline composes across heterogeneous runtimes.
- **22-channel multiplexing demonstrates the channel-adapter-then-substrate-routing pattern at scale.** [M8](../work/milestones/m8-inbound-participation-mcp-clients.md) inherits this discipline directly; MCP-client routing is one channel adapter among many.
  Per-channel DM policy composes with bearer-token authorization via $\odot$-fusion.
- **QMD validates the materialized-view-on-files architecture.** PyFARS's retrieval future is QMD-style sidecar, not a database migration.
- **ClawHub-style federated skill distribution scales.** 13,729+ skills demonstrate the format works at community-distributed authoring scale; a future PyFARS feature can adopt the same architecture for inter-polity skill sharing.
- **OpenProse plans ARE 1-morphisms in the cobordism category.** OpenClaw has converged on the substrate's algebraic primitives in operationally-named form.

---

## MCP ecosystem at scale; OPC-UA semantic ontologies as typed substrate-frontmatter

The Model Context Protocol (MCP) ecosystem (per [`industrial-control-overview`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-control-overview.md), [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md), and [`mcp-ecosystem-for-knowledge-repositories`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/mcp-ecosystem-for-knowledge-repositories.md)) has reached **97M+ SDK downloads + 5,800+ servers** as of 2026 (up from ~100k downloads in November 2024 and 8M+ in April 2025).
MCP is now the universal standard for agent tool access — comparable in adoption to OPC-UA and HTTP at this scale point.
The substrate's [M8](../work/milestones/m8-inbound-participation-mcp-clients.md) inbound surface lands in this ecosystem; the dispatch question's foreign-interior-cobordism algebra extends to cover MCP-style tool-call delegation under the same boundary-only-replay discipline.

### MCP server architecture extends foreign-interior-cobordism

An MCP server exposes tools and data; an MCP client calls tools; tools have input/output schemas.
From the example in [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md):

```json
{
  "server": "erp-tool",
  "tools": [
    {
      "name": "query_parts_inventory",
      "description": "Check if spare parts are in stock",
      "inputSchema": {
        "type": "object",
        "properties": {
          "part_number": { "type": "string" },
          "warehouse_id": { "type": "string" }
        }
      }
    },
    {
      "name": "schedule_technician",
      "description": "Reserve a technician for a job",
      "inputSchema": {
        "type": "object",
        "properties": {
          "technician_id": { "type": "string" },
          "job_type": { "enum": ["bearing_replacement", "motor_overhaul"] },
          "preferred_shift": { "enum": ["morning", "afternoon", "night"] }
        }
      }
    }
  ]
}
```

This is the same shape as the [foreign-interior-cobordism algebra above](#openclaw-gateway-as-orchestrator-prior-art-acp-as-orchestrator-of-orchestrators): **an MCP tool call is a foreign-interior cobordism with structured boundary cells**.
The `inputSchema` is the source-slice precondition; the tool's output is the target-slice; the client's witness chain records the delegation.
PyFARS extends this naturally:

- **MCP tool call as foreign-interior cobordism** $f: A \to B$ where $A$ matches `inputSchema`, $B$ is the tool output.
  The substrate verifies the schema match (precondition) and the postcondition; the interior is sealed (the tool's implementation is opaque).
- **MCP servers as projection of substrate cells.** A PyFARS substrate exposes its cells via M8 as MCP-tool-callable surface; foreign MCP clients see the substrate as a tool collection.
  The substrate's typed frontmatter generates the `inputSchema` definitions automatically — no hand-authored MCP-tool boilerplate.
- **MCP client as substrate-internal calling agent.** When the substrate's office calls an external MCP server (e.g., Brave Search, an ERP system, an LSP server), the call is a foreign-interior cobordism with the foreign runtime being the MCP server's process.
- **The industrial principle "if the ERP API changes, only the MCP server changes; agent code is unchanged"** maps to the substrate-algebraic principle that materialized-view projections shield agents from source-of-truth changes — the MCP server is a projection cache; the source-of-truth (ERP) is decoupled.

### MCP server scope hierarchy IS the cascade-restriction pattern

MCP server configuration in Claude Code uses three scopes (per [`mcp-ecosystem-for-knowledge-repositories`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/mcp-ecosystem-for-knowledge-repositories.md)):

| Scope | Location | Shared? |
|---|---|---|
| Project | `.mcp.json` (project root) | Yes, version-controlled |
| Local | `~/.claude.json` (per-project) | No, personal |
| User | `~/.claude.json` (global) | No, all projects |

CLI management: `claude mcp add | list | remove | get`.

**This IS the cascade-restriction pattern from the [instruction-resolution section above](#instruction-resolution-as-fiber-local-rule-sheaf)** applied to tool definitions instead of instruction text.
Project-scope is the directory-rooted section over the project-root open set; local-scope is per-project per-operator overrides; user-scope is the operator's global section.
Cascade rules: project-scope < local-scope < user-scope in *visibility* (more local sees more); user-scope < local-scope < project-scope in *authority over the project* (project decisions bind across operators).
The substrate's `instruction-cascade-record` cell-kind extends naturally to `mcp-cascade-record`:

```yaml
type: mcp-cascade-record
target-directory: <path>
cascade-stack:                          # root-first, nearest wins
  - { source: governance/.mcp.json, scope: polity-wide, role: project-tool-agnostic }
  - { source: <project>/.mcp.json, scope: project-wide, role: project-tool-agnostic }
  - { source: ~/.claude.json:project, scope: per-project, role: per-operator }
  - { source: ~/.claude.json:user, scope: global, role: per-operator }
mcp-servers-active:
  - { name: lean-lsp-mcp, transport: stdio, scope: project }
  - { name: mcp-rdf-explorer, transport: stdio, scope: project }
  - { name: mcp-obsidian-tools, transport: stdio, scope: project }
foreign-interior-cobordism-budget:
  per-tick-max-calls: 50
  per-tool-max-calls: 10
```

### The MCP-knowledge-repository ecosystem is direct M8 prior art

The MCP-server categories cataloged in [`mcp-ecosystem-for-knowledge-repositories`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/mcp-ecosystem-for-knowledge-repositories.md) are the *exact peers* PyFARS's M8 surface needs to interoperate with.
The catalog as of March 2026:

**RDF / Knowledge graph servers**:

- **`mcp-rdf-explorer`** (Python; conversational interface to RDF/Turtle knowledge graphs; tools: `text_to_sparql`, full-text search, federated SPARQL queries; supports local Turtle files and remote SPARQL endpoints; github.com/emekaokoye/mcp-rdf-explorer). **The substrate's predication-fibration IS an RDF-shaped predication graph**; the substrate exposes its cells as a SPARQL endpoint via M8, and the closure-rule layer is the inference engine.
- **`mcp-jena`** (Node.js bridge to Apache Jena Fuseki; SPARQL queries and updates; requires running Fuseki server — heavier than needed for ~3000-cell scale).

**Markdown / Frontmatter servers**:

- **`markdown-frontmatter-mcp`** (extracts YAML frontmatter; single tool `query_recent_notes`; designed for Obsidian vaults; github.com/caffeinatedwes/markdown-frontmatter-mcp).
- **`mcp-obsidian-tools`** (rich read-only toolkit: `obsidian_get_frontmatter`, `obsidian_list_tags`, `obsidian_query`; works with any markdown directory; github.com/dp-veritas/mcp-obsidian-tools).
- **`markdown-editor-mcp-server`** (15 tools for structured markdown editing; parses to JSON AST with semantic paths; can update/add YAML frontmatter; pypi.org/project/markdown-editor-mcp-server).

**PyFARS substrates are markdown-with-frontmatter at scale**; M8 exposes the `pyfars` CLI's 55+ verbs as MCP tools; substrate cells become MCP-callable.
The substrate generalizes all three Markdown-MCP categories: frontmatter extraction is `pyfars show`; tag/query is `pyfars context`; structured editing is `pyfars validate` + closure-rule firings.

**Proof-assistant servers**:

- **`lean-lsp-mcp`** (already INSTALLED in the polity per the text's "INSTALLED" status; bridges Lean 4 LSP with MCP over stdio; 304 GitHub stars, beta, MIT licensed; ~20 tools organized in three categories — File/LSP, Search, Project; install: `uvx lean-lsp-mcp`; requires elan + Lean 4 toolchain; supports `--repl` for ~5x speedup; environment variables `LEAN_PROJECT_PATH`, `LEAN_REPL`, `LEAN_LOG_LEVEL`; github.com/oOo0oOo/lean-lsp-mcp).
  The 20-tool inventory:
  - *File/LSP tools*: `lean_file_outline`, `lean_diagnostic_messages`, `lean_goal`, `lean_term_goal`, `lean_hover_info`, `lean_declaration_file`, `lean_completions`, `lean_run_code`, `lean_multi_attempt`, `lean_code_actions`, `lean_profile_proof`, `lean_verify`, `lean_get_widgets`.
  - *Search tools*: `lean_local_search` (ripgrep), `lean_leansearch` (natural language), `lean_loogle` (type-based), `lean_leanfinder` (semantic), `lean_state_search` (proof state), `lean_hammer_premise`.
  - *Project tools*: `lean_build`.
- **`LeanTool`** ("Code interpreter" for Lean; Python library, CLI, OpenAI-compatible API, or MCP server; lets LLMs talk directly to the Lean compiler; github.com/GasStationManager/LeanTool).
- **`lean-aristotle-mcp`** (wraps Harmonic's Aristotle automated theorem prover; can fill `sorry` statements, verify lemmas, formalize natural language to Lean; cloud-based, requires API key; github.com/septract/lean-aristotle-mcp).
- **`agda-mcp`** (NOT YET INSTALLABLE; Haskell-based MCP server for interactive Agda development; 24 interactive commands — proof search, case splitting, module exploration, goal listing, type checking; persistent REPL session; HTTP transport on `localhost:3000/mcp`; **blockers**: requires Nix with flakes for building, uses HTTP transport not stdio, early-stage with 22 commits and single author, BSD-3-Clause; links against Agda's Haskell API ≥ 2.8.0; GHC 9.10 required; github.com/faezs/agda-mcp).

**PyFARS's predication-categories' formal-proof formalizations naturally interface with these servers** — the substrate's theorem-records become Lean-callable; proof obligations become MCP tool calls; predicated-categories' Lean formalization (when built) is callable from the substrate's audit-projector.

**Code / Filesystem search servers**:

- **`Code-Index-MCP`** (local-first code indexer with hybrid search, 48-language support, sub-100ms queries).
- **`DeepContext MCP`** (symbol-aware semantic search via Tree-sitter AST parsing + vector search + BM25 + reranker).

**PyFARS's substrate retrieval discipline (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)'s materialized-view section) is structurally the same pattern** — file-first source-of-truth + retrieval indices as projections; QMD-style.

The polity's existing `lean-lsp-mcp` installation is direct prior-art evidence that the M8 surface composes with the existing MCP ecosystem.
Per the text's phased recommendation for the emsemioverse (~3000 markdown files):

- Phase 1: custom MCP server wrapping Python scripts, ~7 tools (already done as `scripts/mcp-server.py`).
- Phase 2: rdflib-based SPARQL queries in the MCP server; build RDF graph from frontmatter at startup; gives structured graph queries without external database.
- Phase 3: lean-lsp-mcp + agda-mcp for proof formalization (lean-lsp-mcp INSTALLED; agda-mcp blocked on Nix).
- Phase 4: evaluate full RDF backend (Fuseki) at scale.

PyFARS's M8 lands somewhere between Phase 1 and Phase 2 of this progression; the foreign-interior-cobordism algebra makes the phase-progression algebraically uniform (each phase adds tools; the cobordism-algebra remains the same).

### Transport-layer taxonomy

MCP transports observed in production:

- **stdio** (most common; agda-mcp, lean-lsp-mcp, mcp-rdf-explorer, etc.) — process-local; suitable for local tool integration.
- **HTTP** (agda-mcp on `localhost:3000/mcp`) — network-local; suitable for cross-process or cross-machine integration.
- **SSE / WebSocket** (some MCP servers) — event-streaming for long-running tools.

PyFARS's M8 surface defaults to stdio for local closure-rule-callable tools and HTTP for cross-substrate federation MCP routing (per the [federation-resilience question](federation-resilience-and-degradation.md)'s federation-of-extensions section).
The transport choice is itself a substrate-resident cell:

```yaml
type: mcp-server-record
name: <server-name>
transport: stdio | http | sse | websocket
endpoint: <command | url>
auth-mode: none | bearer-token | mtls    # composes with bearer-token four-corner verdict
scope: project | local | user
foreign-runtime-determinism: true | false # affects replay-discipline
tool-inventory:                          # enumerated tools the server exposes
  - { name: <tool>, input-schema-id: <id>, output-schema-id: <id> }
```

### OPC-UA semantic ontologies as substrate-frontmatter discipline

OPC-UA Unified Architecture (per [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md)) defines machine-readable information models for industrial equipment.
The example NodeSet for a Motor:

```
OPC-UA NodeSet for a Motor:
├── Motor::Status (Running | Idle | Error)
├── Motor::Temperature (current: 75C, warning-threshold: 85C, shutdown-threshold: 95C)
├── Motor::Vibration
│   ├── RMS (current: 2.1mm/s, normal-range: 0-3mm/s)
│   └── Bearing_Health_Score (0-100, derived from FFT)
├── Motor::Maintenance
│   ├── Last_Service (2026-02-15)
│   ├── Service_Interval_Days (90)
│   └── Next_Due (2026-05-15)
└── Motor::Commands
    ├── StartMotor (requires: key=authorized_user)
    ├── StopMotor
    └── DiagnosticScan
```

**This is exactly the typed-frontmatter discipline at industrial scale.** The substrate-algebraic statement: **PyFARS substrate cells with typed YAML frontmatter ARE OPC-UA NodeSets** at the cell-substrate level, just as OPC-UA NodeSets ARE OWL/RDF-shaped semantic predications at the equipment level.
The frontmatter declares semantic-rich predications about the cell's content; closure rules query the predication structure; agents reason across cell types because all cells expose the same predication shape — exactly the OPC-UA claim that *agents trained on one equipment type can reason about similar equipment without retraining, because all equipment exposes the same semantic structure*.
(See the [cohomological-coordination question](cohomological-coordination-and-audit.md)'s semantic-ontologies section for the BC-commutation formalization of cross-type reasoning.)

The OWL/RDF formal-semantics extension of OPC-UA models lifts naturally to PyFARS:

```turtle
# OPC-UA NodeSet enriched with formal semantics
Motor ex:hasComponent Bearing .
Bearing ex:hasCondition Condition .
Condition rdf:type owl:Class ;
  owl:oneOf (Good Degrading Failed) .
Technician ex:canService Motor .
MaintenanceTask ex:requires Technician ;
  ex:requires Part ;
  ex:mustComplete ex:before DateTime .
```

PyFARS's predication-categories formalization is the substrate-algebraic generalization of this: cells carry typed predications in the frontmatter; closure rules apply the predication-fibration's BC discipline (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)) to transport predications across substrate boundaries. **The substrate's frontmatter discipline IS OPC-UA + OWL/RDF + SPARQL-callable at the cell-substrate level**, with the additional algebraic structure of the predication 2-monad.

### The four-role multi-agent pattern (Detector / Checker / Scheduler / Orchestrator)

The industrial multi-agent orchestration pattern names four canonical roles with message-based coordination:

- **Anomaly Detector** — watches sensor data, identifies equipment problems → publishes "bearing degradation detected".
- **Parts Checker** — subscribes, queries inventory, validates part availability → publishes "parts available".
- **Scheduler** — subscribes, schedules technician/repair → publishes "repair scheduled".
- **Orchestrator** — coordinates across agents, enforces approval logic, escalates when agents disagree.

This is a domain-specific instance of the [orchestration-patterns section above](#orchestration-patterns-as-cobordism-instances-choreography-as-the-dual): a phased orchestration with approval-gate checkpoint.
Mapping to the cobordism algebra:

- Each role is an office; the four-role split IS the orthogonal-fiber decomposition (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)'s SOUL/USER/MEMORY/HEARTBEAT four-axis section) applied to operational concerns: detection / validation / scheduling / orchestration.
- The message-based coordination is the cell-write-as-pub-sub pattern; the substrate is the broker.
- The Orchestrator role IS the substrate's safety-envelope precheck closure rule plus the captain-attestation-required lifecycle state for inter-agent disagreement.
- The industrial-text claim — *each agent is expert in one domain; new agents added without modifying existing ones; failures in one agent don't cascade to others (if Parts Checker is offline, Anomaly Detector still runs; decision escalates to human)* — is the substrate's stigmergic communication discipline (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) plus graceful-degradation cascade (per [federation-resilience question](federation-resilience-and-degradation.md)) applied jointly.

### Substrate consequences

- **MCP at 97M+ SDK downloads + 5,800+ servers anchors M8** as the default external-surface protocol; the foreign-interior-cobordism algebra extends naturally to cover all MCP-style tool calls.
- **MCP scope hierarchy (project / local / user) IS the cascade-restriction pattern** applied to tool definitions; substrate-resident `mcp-cascade-record` extends `instruction-cascade-record` straightforwardly.
- **The MCP-knowledge-repository ecosystem (lean-lsp-mcp INSTALLED + mcp-rdf-explorer + mcp-obsidian-tools + LeanTool + lean-aristotle-mcp + agda-mcp + Code-Index-MCP + DeepContext + others) is direct M8 prior art**; PyFARS's substrate exposes itself as MCP-callable while consuming external MCP servers symmetrically.
- **OPC-UA NodeSet semantic ontologies ARE the substrate's typed-frontmatter discipline at industrial scale.** The substrate generalizes via predication-categories; agents reason across cell types because all cells expose the same predication shape.
  (See [cohomological-coordination question](cohomological-coordination-and-audit.md) for the BC-commutation formalization.)
- **The four-role multi-agent pattern (Detector / Checker / Scheduler / Orchestrator) is a domain-specific instance of phased orchestration**; the substrate's stigmergic communication + safety-envelope precheck + captain-attestation-required lifecycle state realize the pattern at the substrate level.

---

## Skill-as-directory anatomy; tool-use history; the orchestration-ecosystem catalog

The skill-composition cost theorem above operates over skill-records as cost-bearing entities.
The MCP ecosystem section established that 97M+ SDK downloads and 5,800+ servers anchor M8 as the universal tool-protocol surface.
This section completes the dispatch surface picture by filing four pieces of prior art: the **SKILL.md anatomy** that has converged across the industry (per [`how-to-write-a-skill`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/how-to-write-a-skill.md)), the **history of tool use** from Toolformer through MCP (per [`history-of-tool-use`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/history-of-tool-use.md)), the **orchestration-framework catalog** (per [`agent-orchestration-ecosystem-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/agent-orchestration-ecosystem-2026.md)), and the **MCP + A2A protocol complementarity**.

### SKILL.md anatomy as substrate-cell projection

The SKILL.md format has stabilized across the industry.
The convergence observation in `agent-orchestration-ecosystem-2026`: *Claude Code uses `.md` files for skills; OpenHands uses SOUL.md for agent identity; GitHub Agentic Workflows define workflows in markdown*.
OpenClaw skills are SKILL.md + tools/ + examples/ + tests/ directories per the [OpenClaw section above](#openclaw-gateway-as-orchestrator-prior-art-acp-as-orchestrator-of-orchestrators).
The convergence is on a single architectural pattern.

A skill is a directory with a SKILL.md file.
The structure:

```
skills/<skill-slug>/
  SKILL.md          # YAML frontmatter + markdown body
  tools/            # tool definitions and implementation (optional; OpenClaw)
  examples/         # usage patterns (optional; OpenClaw)
  tests/            # verification and correctness checks (optional; OpenClaw)
```

The SKILL.md frontmatter:

```yaml
---
name: <skill-slug>
description: <activation-trigger-text>
---
```

The body has a five-section structure per `how-to-write-a-skill`:

1. **Title and overview** — what this skill covers, in one paragraph.
2. **When to Activate** — concrete scenarios where this skill should fire.
3. **Core guidance** — actual instructions, organized by section.
4. **Anti-patterns** — what NOT to do, with examples.
5. **Related skills** — links to complementary skills.

**The description field IS the activation trigger** — load-bearing infrastructure.
A vague description produces unreliable activation; a precise description names the content type, scope, and variants.
Effective trigger: *"Conventions for writing term definition files.
Covers structure, voice, frontmatter, and patterns for simple, lesson-style, and formal terms."* Ineffective trigger: *"Writing guidelines."* The PROACTIVELY pattern (`Use PROACTIVELY when users request feature implementation, architectural changes, or complex refactoring`) signals invocation without explicit user request.

This is the substrate's skill-record cell-kind, with the activation trigger as a closure-rule's `fires-on:` predicate.
PyFARS substrate cells project to SKILL.md format via harness-template projection (per the [instruction-resolution section above](#instruction-resolution-as-fiber-local-rule-sheaf)); the substrate is source-of-truth, the SKILL.md projection is materialized view (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)).

A substrate object kind, `skill-record-extended`:

```yaml
type: skill-record
slug: <skill-slug>
description: <activation-trigger-text>             # closure-rule firing predicate
when-to-activate:                                  # fine-grained matching criteria
  - <scenario-1>
  - <scenario-2>
core-guidance: <markdown-body>
anti-patterns:
  - { pattern: <description>, example: <example> }
related-skills:
  - <skill-slug>
formality-layer: F0 | F1 | F2 | F3                 # per skill-composition-cost section
proactive: true | false                            # PROACTIVELY pattern
companion-tools:                                   # OpenClaw skill structure
  tools-dir: <relative-path>
  examples-dir: <relative-path>
  tests-dir: <relative-path>
projection-targets:                                # harness projections
  - { harness: claude-code, format: skill-md }
  - { harness: openclaw, format: claw-skill-md }
  - { harness: agents-md, format: agents-md-1.0 }
body-line-cap: 800                                 # per how-to-write-a-skill cap
```

### Five extensibility mechanisms taxonomy

`how-to-write-a-skill` distinguishes five extensibility mechanisms, each with a distinct activation pattern:

| Mechanism | What it is | When to use | PyFARS substrate analog |
|---|---|---|---|
| **Skill** | Guidance that loads on demand | Domain knowledge, workflow procedures, style conventions | `skill-record` cell-kind; closure rule's `fires-on:` matches description |
| **Command** | User-invoked workflow | Multi-step interactive procedures | `command-record` cell-kind; user-attested workitem |
| **Agent** | Specialized role with own tools | Autonomous tasks requiring delegation | `governance/agents/<office>.md` (per OpenClaw four-axis decomposition) |
| **Rule** | Guidance that loads every session | Constraints that always apply | `governance/charter.md` rules-tier per [governance question](governance-charter-and-accountability.md) |
| **Hook** | Shell command on tool lifecycle events | Mechanical guardrails, validation, formatting | Closure rule with directory-discovery overlay (per [substrate-algebra question's hooks-as-closure-rules section](substrate-algebra-closure-and-replay.md)) |

The taxonomic distinction is *what the content does*: Skills give domain knowledge ("how should I do this?"); Commands give procedures ("do this for me"); Agents give specialized delegation; Rules give universal constraints; Hooks give lifecycle automation. **PyFARS's substrate captures all five orthogonally as distinct cell-kinds with distinct closure-rule activation cadences** (on-demand / user-attested / autonomous / always-loaded / lifecycle-event); the substrate-algebraic generalization is that all five are projections of the same substrate-cell + closure-rule pattern at different activation cadences.

### History of tool use as substrate-callable evolution

Per `history-of-tool-use`, the trajectory from Toolformer (February 2023) to MCP (November 2024) shows a stable-pattern convergence on the JSON Schema contract:

- **Toolformer** (Schick et al., Meta AI, February 2023, arXiv 2302.04761) — language model self-supervised to learn tool use; inserted API calls into training data, kept the ones that improved prediction. *Demonstrated tool use could be learned, not hand-coded.*
- **ChatGPT Plugins** (March 2023) — first commercial deployment; ChatGPT-interface only, no API access.
- **OpenAI function calling API** (June 13, 2023) — `gpt-4-0613`, `gpt-3.5-turbo-0613`. **Established the JSON Schema contract pattern: developer provides JSON Schema, model returns conforming JSON.** Every subsequent provider adopted this.
- **OpenAI parallel function calls** (November 2023) — migration from `functions` to `tools` parameter; a model could request multiple calls in a single turn.
- **Google Gemini 1.0 with function calling** (December 2023) — same JSON Schema contract pattern.
- **Anthropic tool use** (May 30, 2024) — GA across Claude / Bedrock / Vertex AI; *added explicit chain-of-thought reasoning before tool calls, making the decision process visible*.
- **Computer use** (October 2024) — Claude interprets screenshots, produces mouse/keyboard actions.
  Tool use applied to a visual environment rather than an API.
- **Model Context Protocol** (November 2024) — standardized tool-protocol; decoupled tool definitions from any single provider's API format.

By 2026, tool use is a commodity feature; the differentiators have moved from *whether a model can call functions* to *how reliably it selects the right function, how well it handles errors, and how efficiently it uses tool calls within a token budget*. **PyFARS's contribution at this point** is the substrate-algebraic discipline above the contract pattern: foreign-interior cobordism with witness-chain replay (per the [OpenClaw section above](#openclaw-gateway-as-orchestrator-prior-art-acp-as-orchestrator-of-orchestrators)); cost-quantale for tool-call efficiency (per the [skill-composition cost section above](#skill-composition-cost-is-bounded-by-constituent-sum-tool-promote-collapses-it)); $\odot$-fusion of capability and authorization for tool-call governance (per the [dispatch-composes-authorization section](#dispatch-composes-authorization-in-one-pass)).

The chain-of-thought-before-tool-calls pattern (Anthropic, May 2024) maps to the substrate's *reasoning-cell-before-action-cell* discipline: the substrate records a reasoning-cell (the model's chain-of-thought) before the action-cell (the tool call), making the decision process substrate-resident and replay-byte-identical given the same prompt + temperature.

The computer-use pattern (Anthropic, October 2024) is a foreign-interior cobordism whose target-slice is a *visual environment* rather than a structured API.
The substrate's foreign-interior-cobordism algebra accommodates this: the boundary cells include screenshot-cells and mouse/keyboard-action cells; the witness chain records the visual-state transitions.
PyFARS's [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) substrate-as-supervisor-of-layered-control extends naturally to computer-use boundaries — the substrate sees screenshot-cells as input, action-cells as output, sealed visual-environment as foreign interior.

### The orchestration-framework catalog as foreign-interior runtime taxonomy

Per `agent-orchestration-ecosystem-2026`, the 2026 orchestration ecosystem includes ten major frameworks.
PyFARS interacts with each via foreign-interior-cobordism; the catalog is the *foreign-runtime taxonomy*:

- **Claude Agent SDK (Anthropic)** — powers Claude Code; conversation loop, file/shell tools, automatic context compaction, session persistence, subagent spawning, MCP extensibility, **agent teams (TeammateTool) for peer-to-peer messaging removing parent-relay bottleneck**.
  Locked to Claude.
  MIT license. *PyFARS substrate addresses Claude Code via foreign-interior cobordism; replay-discipline is `boundary-only` (Claude Code's interior is non-deterministic by default; approximately deterministic at $T = 0$).*
- **PydanticAI** — Python; type-safe; **model-agnostic** (Claude / GPT / Gemini / open-source); MCP client AND server; A2A protocol; durable execution across failures; dynamic toolsets.
  MIT. ***The strongest candidate for a model-agnostic agent-side layer.*** *PyFARS substrate may host PydanticAI as the agent-side runtime layer for non-Claude polities; PydanticAI's Pydantic-models-as-tool-schemas pattern is the typed-schema discipline applied at the agent-side.*
- **CrewAI** — Python; role-based multi-agent; agents have roles/goals/backstories; sequential / hierarchical / consensual coordination; **memory system: short-term, long-term, entity, contextual** (a four-tier memory decomposition reconciled with the OpenClaw four-axis pattern in the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
  MIT.
- **AutoGen / Microsoft Agent Framework** — event-driven multi-agent; merging into Microsoft Agent Framework (RC, GA Q1 2026); graph-based workflows; session management; middleware; telemetry; **security proxies for role-based tool access**.
  Model-agnostic.
  MIT. *Architecturally heavy; PyFARS would not adopt the framework but may interoperate with its security-proxy pattern.*
- **LangGraph** — graph-based stateful workflows; nodes are agent steps, edges are transitions; **built-in checkpoint persistence (SQLite, Postgres); time travel (rollback to any state); human-in-the-loop**.
  Model-agnostic via LangChain.
  MIT. *Direct substrate-algebraic prior art for materialized-view-at-quiescence pattern (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)).*
- **OpenHands (formerly OpenDevin)** — coding-agent platform; sandboxed Docker execution; **event-sourced state model with deterministic replay**; hierarchical agent delegation; 100+ providers.
  MIT. *Direct substrate-algebraic prior art for operations-causal-settling and replay-byte-identity (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)).*
- **OpenClaw** — covered in the [OpenClaw section above](#openclaw-gateway-as-orchestrator-prior-art-acp-as-orchestrator-of-orchestrators).
- **OpenAI Swarm / Agents SDK** — lightweight handoff-based; OpenAI-locked; Swarm was educational; Agents SDK is production.
- **Mastra** — TypeScript-first; MCP client AND server.
  Not Python; not the polity's preferred runtime layer.
- **smolagents (HuggingFace)** — minimalist (~1000 lines); agents write Python code; Apache 2.0; good for prototyping.

**PyFARS positions beneath these frameworks as the substrate-algebra layer** (per the [federation-resilience question](federation-resilience-and-degradation.md)'s vendor-landscape positioning).
Each framework lands as a foreign-runtime addressable via ACP-style routing; the substrate's foreign-interior-cobordism algebra composes uniformly across them.
The substrate is *not a competitor* to the frameworks; it is the substrate-resident algebra that the frameworks compose against.

### MCP + A2A protocol complementarity

The 2026 protocol landscape distinguishes two complementary protocols:

- **MCP** (Model Context Protocol) — agent-to-tool.
  Linux Foundation Agentic AI Foundation (Anthropic, OpenAI, Block).
  5,800+ servers, 300+ clients, 97M+ monthly SDK downloads.
  Adopted by OpenAI, Google, Microsoft, major IDEs.
- **A2A** (Agent-to-Agent) — Google-originated.
  Agents discover each other via **Agent Cards (JSON capability descriptions)**, exchange Tasks with lifecycle states, communicate via HTTP/gRPC.
  Linux Foundation June 2025.
  100+ enterprise partners.
  PydanticAI integrates it.

**The clean dichotomy**: MCP connects agents to tools; A2A connects agents to agents.
The two protocols are complementary surfaces of the same substrate-algebraic foreign-interior cobordism: MCP-call has structured boundary-cells (input/output schemas) on a tool's interior; A2A-call has structured boundary-cells (Task lifecycle states) on an agent's interior.

The substrate's [M8](../work/milestones/m8-inbound-participation-mcp-clients.md) inbound surface lands in MCP; **a future M-something extension lands in A2A** for inter-substrate coordination beyond the OpenClaw / Claude Code subagent model.
PyFARS's substrate exposes Agent Cards (per the four-axis SOUL/USER/MEMORY/HEARTBEAT decomposition's identity fragment) directly to A2A peers; the substrate's office-records ARE Agent Cards in PyFARS-native format.
The substrate's `agent-card-projection-record`:

```yaml
type: agent-card-projection-record
target-office: <office-slug>
agent-card:                              # JSON capability description per A2A
  identity-fragment:                     # from SOUL.md axis
    name: <office-slug>
    description: <office-description>
    voice-and-values: <soul-md-body>
  capabilities:                          # tools the office can invoke
    - { tool: <slug>, schema: <input-output-schema> }
  task-lifecycle-states:                 # A2A Task states the office handles
    - <state>
  protocol-bindings:
    - { protocol: a2a, transport: http | grpc }
    - { protocol: mcp, transport: stdio | http | sse | websocket }
```

ANP (Agent Network Protocol) is the third candidate — community-driven, three-layer (identity/encryption, meta-protocol negotiation, application protocol), IETF draft.
Less mature than A2A; not production-ready.
The substrate may engage ANP at a later milestone if decentralized agent networks become a polity priority.

### What no framework provides (PyFARS's distinctive contribution)

`agent-orchestration-ecosystem-2026` names three things no framework implements that PyFARS-or-the-emsemioverse have formalized:

1. **Region-restricted agents with formal non-interference** (commutativity of operators on disjoint regions, proven via the sheaf condition).
  The closest mechanisms are Claude Code's worktree isolation, AutoGen's security proxies, and PydanticAI's dynamic toolsets — none with formal guarantees. **PyFARS's closure-merge commutation lemma + cohomological-coordination's BC discipline IS the formalization** (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md) and the [cohomological-coordination question](cohomological-coordination-and-audit.md)).
2. **Skills as mathematical operators with formal admissibility conditions** (fragment-preservation, closure-compatibility, provenance extension, failure monotonicity). **PyFARS's predication-categories formalization IS this** — skills are predication-action-morphisms with closure-rule-decidable preconditions; the formal-admissibility conditions are substrate-resident.
3. **The library/engine boundary** — operators in the library, engine as thin execution kernel. **PyFARS's substrate-as-content + closure-rule-as-runtime IS this split**; the `pyfars` CLI's 55+ verbs are the engine; the substrate cells are the library.

These are **PyFARS's distinctive contributions** to the 2026 orchestration ecosystem — the substrate-algebraic discipline that no other framework in the catalog provides.

### Substrate consequences

- **SKILL.md-as-configuration is the industry-converged pattern**; PyFARS's substrate-cell projection to SKILL.md (and to OpenClaw skills, AGENTS.md, Cursor rules, etc.) is the harness-projection discipline.
  The substrate is source-of-truth; SKILL.md is materialized view.
- **The five extensibility-mechanisms taxonomy (Skill / Command / Agent / Rule / Hook)** maps to five PyFARS cell-kinds with distinct closure-rule activation cadences.
  The substrate's algebra captures all five orthogonally.
- **The history of tool use** — from Toolformer through MCP — converges on the JSON Schema contract pattern; PyFARS's foreign-interior cobordism is the substrate-algebraic generalization.
  By 2026, tool-use differentiators are reliability + error-handling + token-efficiency, all substrate-resident measurements.
- **The orchestration-framework catalog** is the foreign-runtime taxonomy; each framework is addressable via ACP-style routing in the substrate's foreign-interior-cobordism algebra.
- **MCP + A2A are complementary surfaces of the same foreign-interior cobordism**: MCP connects agents to tools, A2A connects agents to agents.
  M8 lands in MCP; a future milestone lands in A2A.
- **PyFARS's distinctive contributions to the 2026 ecosystem** are region-restricted agents with formal non-interference (closure-merge commutation), skills-as-mathematical-operators (predication-action-morphisms), and library/engine boundary (substrate cells + closure-rule runtime).
  No other framework in the catalog provides these.

---

## HTTP method discipline as substrate-derived

PyFARS already serves HTTP via FastAPI for [M8](../work/milestones/m8-inbound-participation-mcp-clients.md).
Three web-server-platform theorems together account for the HTTP surface — every HTTP convention is a corollary of predication-categories machinery the substrate already realizes.

### Idempotent methods inherit from closure-2-monad lax-idempotence

[`idempotent-methods-via-closure-2-monad-lax-idempotence`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/idempotent-methods-via-closure-2-monad-lax-idempotence.md):

**Claim.** For handler $h$ with method $m \in \{\texttt{GET}, \texttt{HEAD}, \texttt{OPTIONS}, \texttt{PUT}, \texttt{DELETE}\}$, route morphism $f : p \to q$, and request $r$, if $G' = h(r)(G)$ and $G'' = h(r)(G')$, then $G'' = G'$.

The proof is method-specific:

- **`GET` / `HEAD` / `OPTIONS`** — read-only; per [http-method-discipline-via-fibration-generators](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/http-method-discipline-via-fibration-generators.md), no in-fiber insertion or retraction; only $f^*$ is applied. $G' = G$; $G'' = G' = G$.
- **`PUT`** — full-value insertion at cell $(s, p, o)$: $G'[\!
  [s, p, o]\!] = G[\!
  [s, p, o]\!] \vee_k v$.
  By $\vee_k$-idempotence: $$G''[\!
  [s, p, o]\!] = G'[\!
  [s, p, o]\!] \vee_k v = (G[\!
  [s, p, o]\!] \vee_k v) \vee_k v = G[\!
  [s, p, o]\!] \vee_k v = G'[\!
  [s, p, o]\!]$$
- **`DELETE`** — sublocale-bounded retraction; the nucleus update is a join in the nucleus algebra (joining absence-witness with prior visibility); idempotent by the nucleus algebra's join-idempotence.

`POST` and `PATCH` are excluded:

- **`POST` is $\exists_f^k$.** Per [`predicate-subject-projection-quantifier-adjoints`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/predicate-subject-projection-quantifier-adjoints.md), $\exists_f^k$ is the *left adjoint* of $f^*$, not a closure-monad algebra action.
  Two `POST`s produce two distinct diagonal cells $(s_1, s_1)$ and $(s_2, s_2)$ with $s_1 \neq s_2$; no closure-monad reduction collapses them.
- **`PATCH` is partial-value insertion.** $G'' = G'$ holds only when the second `PATCH`'s body $u$ satisfies $u \leq_k G'[\!
  [s, p, o]\!]$.
  In general fails; `PATCH` is *conditionally* idempotent.

The three idempotent-write cases share a single mathematical reason: per [`settlement-via-closure-2-monad`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/), the substrate's per-step transition is $\mathrm{Cl}$-application; the closure 2-monad is lax-idempotent; applying a lax-idempotent monad's action twice produces the same algebra element as applying it once.

**HTTP idempotency does not mean.** Per [`witness`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/objects/witness.md), the second invocation is observable as a distinct event in the audit trail.
Substrate-state idempotence ($G'' = G'$) ≠ audit-trail idempotence (witness chain still records each invocation).
Wire-level idempotence is partially true: a `PUT` that creates returns `201` first then `200` (HTTP convention), reflecting the audit-trail distinction even though substrate state is identical.
Per status-code-classes-as-four-bilattice-values (below), both responses lie in the 2xx (truth-told) class — *bilattice-corner* of the response is idempotent even though specific code is not.

### Routing is predication-fibration base-change

Per [`routing-as-predication-fibration-base-change`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/routing-as-predication-fibration-base-change.md), URL routing is a $\mathcal{C}$-morphism $f : p \to q$ on the predicate category — the route's bindings produce the base change.
The handler then runs the method-specific generator action ($f^*$, $\exists_f^k$, insertion, retraction) on the routed fiber.
This is the *same* base-change discipline as jurisdiction transfers, sharding, delegation, and succession (per [cohomological-coordination question](cohomological-coordination-and-audit.md)'s Beck-Chevalley section).

### Status codes are four-bilattice values

Per [`status-code-classes-as-four-bilattice-values`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/status-code-classes-as-four-bilattice-values.md):

| HTTP class | Bilattice corner | Reading |
|---|---|---|
| 2xx | $\mathbf{t}$ (truth-told) | request succeeded; substrate observed-and-accepted |
| 4xx | $\mathbf{f}$ (refusal) | client error; substrate refused on stated grounds |
| 5xx | $\top$ (paraconsistent inconsistency) | server-side contradiction or unavailability |
| 1xx (informational) | $\bot$ (no claim yet) | progress signal; substrate not yet committed |

3xx redirects are a separate dimension — route-morphism rewrites factoring through a redirect predication.

A new substrate object kind, `endpoint-record`:

```yaml
type: endpoint-record
route: /polity/{slug}/charter
method: GET | HEAD | OPTIONS | PUT | DELETE | POST | PATCH
route-morphism: <f : p → q>
generator-action: f-pullback | exists-k | insertion | retraction | partial-insertion
idempotency-class: substrate-state-idempotent | conditionally-idempotent | freshness-introducing
status-code-class: 2xx | 4xx | 5xx | 1xx
authorization-fiber: <fiber-record>
caching-policy: <cache-control-record>
```

Closure rules: `enforce-method-discipline` (verifies handler's substrate operation matches declared `generator-action`; mis-classifications rejected at parse-time per [M5](../work/milestones/m5-agential-self-generation.md) self-generation precheck); after execution, project the substrate-side outcome to its bilattice corner and emit response with matching status code class.

**Engineering consequences.**

- **Retry without compensation.** For idempotent methods, network failure or timeout is safely retried by the client without producing duplicate effects.
  Per [`transport`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/concepts/transport.md), the substrate's at-least-once delivery is sound for these methods.
- **Idempotency-key as forced-`PUT`.** The HTTP `Idempotency-Key:` header convention can be derived from the theorem: an `Idempotency-Key`-bearing `POST` is structurally a `PUT` against the predicate $f_{\mathrm{idempotency-key}} \circ f$, where the idempotency-key serves as the client-chosen subject.
  Substrate middleware can rewrite such requests at admission, recovering the lax-idempotence guarantee.
- **Cacheability.** Idempotent reads (`GET`, `HEAD`, `OPTIONS`) are unconditionally cacheable per content-addressed materialized views.
  The cached value is $f^*(v)$, the request's effect is $f^*(v)$, and lax-idempotence guarantees these agree on repeat invocation.

---

## Bearer tokens as bound evidence vectors with four-corner verdict

The web-server-platform theorem [`bearer-token-as-bound-evidence-vector`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/bearer-token-as-bound-evidence-vector.md):

**Claim.** A bearer token (JWT, PASETO, OAuth opaque, signed cookie, Macaroon, Biscuit) is structurally an evidence vector — a tuple of canonical-form digests over (issuer, subject, audience, scope, freshness window, nonce) with a signature binding to identity.
Verifying a bearer token is *canonical-form recompute and signature-check* against the trusted issuer's identity-key.
Verification *binds* the request to the issuer's claim — it does not *attest* that the issuer's underlying authorization decision was sound.

**Two structural shapes.**

- **Self-contained tokens** (JWT, PASETO, signed cookies, Macaroons, Biscuits).
  Canonical-form bytes encoded in the token (typically base64url-canonicalized JSON or CBOR).
  Signature in the token.
  Verifier reconstructs the evidence vector from the token's bytes alone and checks the signature against the issuer's public identity-key.
- **Handle tokens** (opaque session, OAuth opaque).
  Token is a high-entropy random handle naming a substrate-recorded `principal-session` entry; evidence-vector entries live in that entry.
  Verification dereferences the handle.
  The substrate's audit discipline plays the role of the signature.

Both shapes are evidence vectors per [`evidence-vector-as-canonical-binding-attestation`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/); they differ in *the locus of canonical-form bytes* and *the binding mechanism*.
Self-contained tokens are federation-portable but harder to revoke (must wait for `exp` or use revocation list); handle tokens revoke instantly but require the issuer online for verification.

**Evidence-vector contents:**

- **Issuer (`iss`):** canonical-form-hash of issuer identifier.
- **Subject (`sub`):** canonical-form-hash of subject's principal-record reference.
- **Audience (`aud`):** canonical-form-hash of substrate's audience identifier; tokens with `aud` not matching the verifier are refused.
- **Scope:** canonical-form-hash of capability claims.
- **Freshness window (`iat`, `exp`):** substrate-clock ordinals bounding the token's necessity along time-accessibility per [`cache-control-as-modal-necessity-along-time-accessibility`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/cache-control-as-modal-necessity-along-time-accessibility.md).
  Tokens past `exp` are *outside the issuer's necessity claim*; substrate refuses them.
- **Nonce (`jti`):** canonical-form-hash of per-issuance random handle.
- **Signature** (or substrate-recorded entry for handle tokens).

Per [`signature-binds-witness-to-identity`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/signature-binds-witness-to-identity.md), self-contained tokens carry a signature over canonical-form encoding using the issuer's identity-key.
Verification with the issuer's public key has *bound* the request to the issuer's claim: the issuer committed at issuance to those exact canonical-form bytes.
By existential-unforgeability, only a holder of the signing key could have produced that signature.

**Why binding does not attest derivation.** The token attests *that the issuer said this*.
It does not attest *that what the issuer said is justified*:

- That the issuer verified the principal's identity correctly (issuer's authentication discipline).
- That the issuer had authority to grant the scope (issuer's authorization discipline).
- That the issuer's policy at issuance still holds at request time (revocation discipline).
- That the issuer is trusted by the substrate to grant that scope (verifier's federation-trust discipline).

These derivation attestations must be obtained separately:

- **Issuer trust.** Per [`federation-trust-bilattice-graded`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/), trust is a `FOUR`-valued accessibility cell.
  Token binding is in $\mathbf{t}$ only when *both* signature-verification succeeds AND $R_{\mathrm{fed}}(\mathrm{this}, I) = \mathbf{t}$.
- **Revocation.** Self-contained tokens revoke at `exp` or via revocation-list lookup; handle tokens revoke instantly via session-record deletion.
- **Authorization decision.** Verifier confirms token's `scope` covers the requested operation — substrate-local check against verifier's policy.

**The four-corner verification verdict.** Composing token binding, issuer trust, freshness, and revocation produces a `FOUR`-valued verdict on the token's authorization for this request:

- $\mathbf{t}$ — *valid authorization*: signature binds, issuer trusted ($\mathbf{t}$), within freshness, not revoked, scope covers operation.
  Wire: substrate proceeds with the request under the principal's authority.
- $\mathbf{f}$ — *explicit refusal*: signature binds but issuer denied ($\mathbf{f}$), or past `exp`, or on revocation list, or scope insufficient.
  Wire: `401 Unauthorized` (signature/freshness/revocation) or `403 Forbidden` (scope).
- $\bot$ — *binding failure*: signature does not verify, malformed, issuer unknown ($\bot$-trust).
  Wire: `401` with `WWW-Authenticate: Bearer error="invalid_token"`.
- $\top$ — *contested*: issuer trust is at $\top$ (federation-disputed), revocation sources disagree, substrate's revocation list at $\top$.
  Wire: `5xx` until [`repair-as-top-cell-resolution`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/) resolves.

These match exactly the status-code-classes-as-four-bilattice-values decomposition, applied to the authorization sub-question.

A new substrate object kind, `principal-session-record`:

```yaml
type: principal-session-record
token-shape: self-contained-jwt | handle-opaque
canonical-form-bytes:                # for self-contained
  iss: ...
  sub: ...
  aud: ...
  scope: [...]
  iat: ...
  exp: ...
  jti: ...
signature-key: <issuer-identity-key-record>
signature-bytes: ...
issuer-trust-grade: t | f | top | bot       # from federation-trust-bilattice-graded
revocation-status: not-revoked | revoked-at | unknown | contested
```

Closure rule `evaluate-token-four-corner-verdict` fires per request: parses token; verifies signature (or substrate-record integrity); records binding cell; looks up issuer-trust-grade; checks freshness against substrate-clock; checks revocation; takes bilattice-meet of binding × trust × freshness × revocation; emits verdict cell; projects to HTTP status code class.

**Three structural failure modes** the theorem rules out:

- **Signature-validity-as-authorization-sufficiency.** A substrate that admits any request bearing a valid signature without checking `aud`, `exp`, scope, or revocation has elided the derivation-attestation step.
  Per the theorem: the signature only attests that the issuer said this; the substrate must additionally check that what the issuer said authorizes the request.
- **Confused-deputy.** A token issued by $I_1$ for audience $A_1$ accepted by $A_2$ because $A_2$ shares the trust-list with $A_1$.
  Per the theorem: verify `aud == self`, not just `aud ∈ trust-list`.
  PyFARS's MCP server must check the token's audience matches its own substrate-instance identity.
- **Token reflection.** A verifier proxying a request by forwarding the bearer token shares a credential bound to itself with another principal.
  Per the theorem: multi-hop authorization uses token-exchange (RFC 8693) or sender-constrained tokens (DPoP, mTLS-bound), not credential forwarding.

**`alg: none` JWTs are automatically refused** per the theorem: "`alg: none` is a binding-discipline failure, not a feature."
A JWT with `alg: none` carries no signature; the evidence vector is structurally absent.

**`exp`-less tokens** are refused unless an out-of-band agreement justifies unbounded necessity (e.g., long-lived API keys with separate revocation discipline).

**Bearer tokens stored unencrypted at rest in the substrate** are credentials being recorded; tokens must be encrypted at rest, redacted from logs, and treated as credentials.

**Macaroons / Biscuits add caveat-attenuation as additional vector entries.** Each caveat is a canonical-form-hash entry; verification recomputes each caveat's hash and confirms substrate's local state satisfies the caveat predicate.
Additional to the issuer's binding, not a replacement.

---

## What this commits to

Substrate-resident records: `endpoint-record`, `principal-session-record`, `plan-record`, `skill-cost-record`, plus class-coordinate-bearing assignment cells.

Substrate-resident closure rules: `dispatch-by-twist-product-fusion` (replaces two-stage filter-then-rank), `enforce-method-discipline`, `evaluate-token-four-corner-verdict`, `compute-plan-1-morphism`, `verify-plan-completion`, `compute-composition-cost-bound`, `record-invocation-cost`, `prioritize-promotion-targets`.

Eligibility-tier closure rules per [M2](../work/milestones/m2-substrate-dispatch.md) for class-aggregation: pre-aggregated cells feed per-member eligibility.

Anti-pushdown discipline in pypredcalc: query planner's pushdown rules gated on operator; pushdown holds for $\wedge_k, \wedge_t$ but NOT $\odot$.

## What this connects to

- **The [substrate-algebra question](substrate-algebra-closure-and-replay.md)** — HTTP idempotent methods are corollaries of closure-2-monad lax-idempotence; pure functions are F₃ skills; completion-as-quiescence governs plan-bulk closure; materialized views back GET responses.
- **The [cohomological-coordination question](cohomological-coordination-and-audit.md)** — routing IS Beck-Chevalley base-change; plan completion is Mayer–Vietoris on the cobordism's bulk; aggregate workitems' commutation across orthogonal dimensions is captured by $H^1$.
- **The [federation-resilience question](federation-resilience-and-degradation.md)** — federation-time, the dispatch's authorization fiber composes per the dispatch composition; W-MSR-rejected outliers feed dispatch with $\bot$-trust grades; the `issuer-trust-grade` field reads from federation-trust-bilattice-graded.
- **The [governance question](governance-charter-and-accountability.md)** — accountability-totality reads dispatch-witness records to attribute outcomes; conduct-teaching violations participate in dispatch as $\mathbf{f}$ on the corresponding authorization, ranking violators below clean candidates without manual exclusion.
- **The [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)** — saturation-threshold caps in-flight LLM-agent dispatch at ~4; skill self-generation per [M5](../work/milestones/m5-agential-self-generation.md) feeds skill-cost-records; tool-promote IS the maturation pathway.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) realizes *foreign-interior cobordism* algebraically: it is exactly the [settling-cobordism-category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md) $\mathrm{Cob}_\mathrm{settling}$, with composition by gluing settlings along shared boundaries.

### Foreign-interior cobordism IS the settling cobordism category

The [settling-cobordism-category object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md) gives the algebra directly:

- **Objects** are *boundary predication systems* $\mathcal{B} = (B, \mathcal{C}_B, v_B)$ where $v_B$ is closure-stable on $\mathcal{C}_B$.
- **Morphisms** are *settling cobordisms* $S : \mathcal{B}_\mathrm{in} \to \mathcal{B}_\mathrm{out}$ with bulk cell-system $\mathcal{C}_S$ extending both boundaries and a settling trajectory $v : \kappa_S \to \mathrm{Val}(\mathcal{C}_S)$.
- **Composition** glues settlings along the shared boundary; closure ordinal of composition is the *ordinal sum* $\kappa_{S_1} + \kappa_{S_2}$.
- **Symmetric monoidal structure**: $\otimes$ on objects is disjoint union of boundary systems; $\otimes$ on morphisms is parallel settling trajectories on disjoint cell-systems.
- **Duality**: $\mathcal{B}^\vee$ is $(B, \mathcal{C}_B^\mathrm{op}, \sim v_B)$ — opposite category and Klein-four-negated valuation.

The "boundary cells" in the substrate are PyFARS's substrate cells with declared `boundary: true` discipline; the "bulk" is the foreign runtime's interior; "boundary compatibility" is the substrate's witness-chain replay constraint at the boundary.
Plan composition (workitem $W_1$ followed by workitem $W_2$) is settling-cobordism composition — the closure ordinal of the composite plan is the ordinal sum of the constituent plans.

### TQFT structure: boundary-only replay IS the cohomology functor

The [tqft-structure theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md) establishes that the cohomology functor

$$Z := H^\bullet(\mathcal{F}_{(-)}) : \mathrm{Cob}_\mathrm{settling} \to \mathrm{Mod}_\mathbb{Z}$$

is a symmetric monoidal functor satisfying Atiyah's axioms:

1. $Z(\emptyset) = \mathbb{Z}$;
2. $Z(\mathcal{B}_1 \otimes \mathcal{B}_2) \cong Z(\mathcal{B}_1) \otimes_\mathbb{Z} Z(\mathcal{B}_2)$;
3. $Z(S_2 \circ S_1) = Z(S_2) \circ Z(S_1)$;
4. $Z(\mathcal{B}^\vee) \cong Z(\mathcal{B})^\vee$;
5. For closed cobordism $\Sigma : \emptyset \to \emptyset$, $Z(\Sigma) \in \mathbb{Z}$ is the partition function.

**$Z(\mathcal{B})$ is a commutative Frobenius algebra over $\mathbb{Z}$, refined by the $\widehat{K_4}$ gauge grading**: $Z(\mathcal{B}) = \bigoplus_{\chi \in \widehat{K_4}} Z^\chi(\mathcal{B})$.

This decisively answers Q26 (foreign-interior-cobordism replay discipline): the cohomology functor $Z$ *is* the boundary-only-replay discipline. $Z(\mathcal{B})$ depends *only* on the boundary state $v_B$, not on the bulk trajectory.
Replaying ACP delegations through $Z$ is structurally byte-identical regardless of foreign-runtime stochasticity, because the bulk is integrated out cohomologically.
Full replay = re-running the bulk trajectory; boundary-only replay = applying $Z$ to boundary states; both are realized in the same algebra.

The Klein-four grading $Z(\mathcal{B}) = \bigoplus_\chi Z^\chi(\mathcal{B})$ with $\mu : Z^{\chi_1} \otimes Z^{\chi_2} \to Z^{\chi_1 \cdot \chi_2}$ means the substrate's foreign-interior-cobordism table naturally decomposes into four sectors corresponding to the bilattice gauge characters.
This is structural; the `replay-discipline` field on a `foreign-interior-cobordism-record` need not be free-form — it is one of four characters of $K_4$, and the per-runtime determinism profile lives in this small finite set.

### Plan amplitude is computable: partition function = Euler characteristic

Atiyah's partition-function-of-a-closed-cobordism is realized in the corpus as the *Euler characteristic of the bulk*:

$$Z(\Sigma) = \chi(v) = |\mathrm{Apex}_v| - |L_\mathrm{ns}(\kappa_v)|$$

via [settling Gauss-Bonnet](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-gauss-bonnet.md). $|\mathrm{Apex}_v|$ counts the apex cells of the closure trajectory; $|L_\mathrm{ns}(\kappa_v)|$ counts the non-Scott-continuous firing ordinals.

This decisively answers Q8 (plan amplitude computation cost): for plans realized as closed cobordisms, the amplitude is *not* exponential in $k$ — it is a single integer computed by Gauss-Bonnet.
The simplicity cap ensures $H^n = 0$ for $n \geq 2$ in strict/Scott-continuous fragments; combined with finite Apex / finite $L_\mathrm{ns}$, partition-function computation is *polynomial in cell count*.

### Series-parallel vs general posets: pair-of-pants gives general

Q7 (series-parallel vs general posets for plans) reduces to a structural fact about $\mathrm{Cob}_\mathrm{settling}$.
The [settling Frobenius structure](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/settling-frobenius-structure.md) provides:

- **Identity** = the trivial cobordism on a single boundary.
- **Series composition** = ordinary cobordism composition $S_2 \circ S_1$.
- **Parallel composition** = monoidal product $S_1 \otimes S_2$ (disjoint union).
- **Fan-in** = pair-of-pants cobordism $P : \mathcal{B}_1 \otimes \mathcal{B}_2 \to \mathcal{B}_3$ (multiplication).
- **Fan-out** = the dual cobordism $\Delta : \mathcal{B}_3 \to \mathcal{B}_1 \otimes \mathcal{B}_2$ (comultiplication).

The Frobenius axioms (relating $\mu, \Delta, \eta, \epsilon$) hold in $\mathrm{Cob}_\mathrm{settling}$, so **general posets are decomposable into compositions of the Frobenius primitives**.
Series-parallel is the restriction to plans without genuine fan-in / fan-out; general posets need pair-of-pants and its dual.
The substrate's plan language can ship initially with series-parallel and add Frobenius primitives when N-shaped fan-in/fan-out plans appear — without re-doing the algebra, since the algebra already accommodates them.

### Beck-Chevalley = routing IS base-change

Routing across authority boundaries is structurally Beck-Chevalley base-change on the predication fibration.
The [beck-chevalley-commutation-on-predication-bilattices theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/beck-chevalley-commutation-on-predication-bilattices.md) holds for *every* pullback square in $\mathcal{C}$, with the four predicate-category generators (specialization, converse, subject-projection, object-projection) plus their compositions exhausting the cases.

For dispatch Q1 (combined-fiber representation): the candidate's $(\text{offered} \vee_k \text{held})$ fiber is the bilattice join in the predication fiber algebra.
BC commutation means the join *commutes* with the routing pullback — `compute-per-dispatch` is substrate-coherent because the join is computed cellwise and BC ensures the result is the same regardless of whether the join is taken before or after the routing pullback.

### Closure-rule fragments determine choreography-layer escalation decidability

The [closure-rule-language concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md) and the [rule-language-fragment-realizability-refinement theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md) establish the fragment hierarchy with proved levels at bare-$\Pi_1+<$ and named-ordinal-entity-equality, and sketch-only at $\Pi_2$ schemas and second-order quantifiers.

For Q21 (choreography-layer escalation predicate), the substrate's escalation predicate must be in the bare-$\Pi_1+<$ fragment for the projector to terminate.
"Threshold predicate substrate-decidable — bounded fragment of the closure-rule language" is exactly correct: the bounded fragment IS bare-$\Pi_1+<$, and the realizable family is initial segments of countable limits — sufficient for cell-listener escalation conditions like "fired more than $N$ times in window $W$".

### Temporal Beck-Chevalley: routing across time is 2-categorical

The [temporal-beck-chevalley theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/temporal-beck-chevalley.md) extends BC to the [temporal 2-category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/temporal-2-category.md) $\mathbf{T}(\mathcal{C}, \lambda)$.
Every pseudo-pullback square has an invertible 2-cell BC iso.
Regime-dependent simplification:

- **Strict regime:** 2-cells trivialize; $\mathbf{T}(\mathcal{C}, \lambda)$ collapses to $\lambda$ as a 1-category.
  Standard 1-categorical BC suffices.
- **Aperiodic regime:** 2-cells are essential; the full machinery applies.

This sharpens Q21 (choreography-layer escalation predicate) and Q22 (cascade-projection cadence): escalation across temporal pullback squares uses 2-categorical BC.
In strict-regime workitems, the escalation predicate is *substrate-decidable* via 1-categorical pullback computation — checks the new authority cell against the prior tick's authority cell.
In transfinite-bounded/aperiodic workitems, the predicate must use the 2-categorical pseudo-pullback; the substrate translates 1-cells to a uniform ordinal $\rho' \geq \max(\sigma, \tau, \rho)$, computes the pseudo-pullback there, and translates back via the unit/counit 2-cells of $\mathbb{M} \dashv \mathbb{N}$ ([emmenegger-fibration-comonad](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/emmenegger-fibration-comonad.md)).

**Cascade-projection cadence per temporal regime:** strict per-commit (cheap; 1-categorical), Scott-continuous per-quiescence ($\omega$-limit), transfinite-bounded per-ordinal-stage (substrate-coherent at $\kappa < \omega_1$), aperiodic per-substrate-tick (full 2-categorical machinery).
The cadence is regime-derived, not free.

### Forward-trajectory-via-Galois fails on multi-rule-same-consequent — anti-pushdown is structural

The [forward-trajectory-via-galois-adjunction theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/forward-trajectory-via-galois-adjunction.md) is *conditional*: works only when $T$ preserves meets.
The corpus's counterexample is the *standard* polity authorization shape — multiple delegation paths producing the same authority cell breaks meet-preservation:

> Cells $C = \{a, b, d\}$.
> Rules: $R_1: \{a\} \Rightarrow d$; $R_2: \{b\} \Rightarrow d$.
> Take $x_1 = \{a\}, x_2 = \{b\}$.
> Then $\bigcap x_i = \emptyset$ but $T(x_1) \cap T(x_2) = \{d\}$.
> Meet-preservation fails.

This decisively answers Q3 (anti-pushdown verification): the dispatch query's "partial-authorization" structural pattern is *structurally* multi-rule-same-consequent — multiple authorization paths can produce the same authority cell.
The Galois primitive is *not* available; the dispatch must use the general construction. **Anti-pushdown is structural, not a regression test.** A two-stage dispatch (pushdown) would require meet-preservation to be sound, but the polity's authorization graph generically has multi-rule-same-consequent shape, so two-stage dispatch is structurally unsafe.
One-pass dispatch with combined-fiber computation is the only sound shape; the regression test verifies *implementation* correctness, not algebraic correctness.

### Equivariant cohomology decomposition: K_4 graded plan amplitudes

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) decomposes the cohomology along $\widehat{K_4}$ characters; combined with the [tqft-structure theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md)'s $\widehat{K_4}$-grading on $Z(\mathcal{B}) = \bigoplus_\chi Z^\chi(\mathcal{B})$, plan amplitudes carry sector structure:

- $Z^\mathrm{id}$: symmetric content (passes through identity gauge).
- $Z^{\chi_\sim}$: epistemic-flip content (acts under negation).
- $Z^{\chi_-}$: paraconsistent content (acts under conflation).
- $Z^{\chi_{\sim\circ-}}$: full re-frame content (acts under both).

This sharpens Q8 (plan amplitude computation cost): the partition function $Z(\Sigma) = \chi(v) = |\mathrm{Apex}_v| - |L_\mathrm{ns}(\kappa_v)|$ is the *total* Euler characteristic; the sector-by-sector Euler characteristics $\chi^\chi_\mathrm{Euler}(v)$ give four conservation laws (per Equivariant Gauss-Bonnet) summing to the total. **Plan amplitudes are 4-vectors of integers**, computable in polynomial time per the simplicity cap, and the four sectors give the structural decomposition of plan-cost into orthogonal axes.

For dispatch-cost-record schema (Q18 token-cost measurement granularity): per-workitem `dispatch-cost-record` should carry the 4-vector amplitude per workitem, not just a scalar.
The cost-quantale composition (Q9) operates per-sector independently — this is exactly the Lawvere-quantale's product structure on the four-sector decomposition.

### Verdier duality for replay: forward = sheaf, backward = cosheaf

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) gives the dual presentation of the cobordism's bulk:

- **Sheaf cohomology ($H^1$):** equality testing via cocycle witnesses; refinement under sub-site inclusion.
  Natural for "did this replay produce the same MLD-class?"
- **Cosheaf homology ($H_1$):** local-generator construction; coarsening under sub-site projection.
  Natural for "build the replay state from per-event firing data."

This sharpens Q26 (foreign-interior-cobordism replay discipline) and Q27 (ACP-routing as substrate-resident vs harness-installed): the substrate's foreign-interior-cobordism algebra has *two* canonical replay presentations.
Boundary-only replay via $Z(\mathcal{B})$ (the cohomology functor — sheaf-side) is the default; cosheaf-homology-based "construction from boundary" gives a dual primitive useful when the foreign runtime emits per-event generators (e.g., OpenHands-style event logs).
Both-simultaneously is structurally correct; choosing one loses the dual primitive.

For the 22-channel adapter authoring (Q28): each channel's adapter naturally fits one presentation.
Real-time channels (WhatsApp, Telegram with live message events) fit cosheaf-homology (per-event local generators); batch channels (email digest, web export) fit sheaf-cohomology (cocycle-witness equality testing).
The substrate's `channel-adapter-record` schema should carry a `replay-presentation:` field with `{sheaf, cosheaf, both}` discriminator.

### Two internal logics: dispatch can use both

The [two-internal-logics theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md) gives every predication hyperdoctrine *both* classical $T_t$ and paraconsistent $T_k$ theories.
For dispatch:

- **Classical dispatch** ($T_t$): two-valued authorization, classical-equality on entities.
  Compatible with HTTP idempotent methods (which are corollaries of closure-2-monad lax-idempotence and assume two-valued response semantics).
- **Paraconsistent dispatch** ($T_k$): bilattice-graded authorization with $\top$-cells (paraconsistent equality $\Delta_E^k$).
  Required when multiple authorization paths produce conflicting verdicts on the same authority cell.

Q5 (bilattice extent of quantifier adjoints — full $\mathbf{FOUR}$ vs truth-order subset) is decided by the logic choice: full $\mathbf{FOUR}$ is structurally correct because the substrate has both logics; restricting to truth-order subset would force the dispatch into $T_t$ exclusively, losing the paraconsistent register that captures multi-path authorization conflicts.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Combined-fiber representation.** **Theory: BC commutes.** Candidate's $(\text{offered} \vee_k \text{held})$ fiber computed per-dispatch is substrate-coherent because BC commutation guarantees the join commutes with routing pullback.
  Caching is pure performance optimization, not correctness.
2. **Partial-authorization fallback policy.** When no candidate has full $\mathbf{t}$, substrate selects highest $\bot$-bearing candidate.
  Make this a `governance/dispatch-policy.md` substrate-content choice.
3. **Anti-pushdown verification.** Regression test: dispatch query with partial-authorization should produce one-pass result, not two-stage.
4. **Class layer realization** — projection of substrate cells (class K is whatever workitems carry `kind: K`) vs substrate-resident object (`governance/classes/<K>.md` with explicit membership predicate).
  First cheaper; second more substrate-coherent.
5. **Bilattice extent of quantifier adjoints.** Full `FOUR` (so $\top$-cells aggregate as $\top$-class) vs truth-order subset.
  Full is structurally correct.
6. **Whether aggregate workitems author new individual workitems on closure.** Class-budget overrun fires `review-budget` workitem (integrates with M5) vs only labels existing.
7. **Series-parallel vs general posets for plans.** Most operational plans are series-parallel; N-shaped fan-in/fan-out cases need Frobenius primitives.
  Whether [M2](../work/milestones/m2-substrate-dispatch.md) ships with general support or restricts initially.
8. **Plan amplitude computation cost.** $O(2^k)$ for general bilattice TQFTs; per the simplicity cap, fits within $H^0$/$H^1$.
9. **Cost-bound canonicalization.** Cost units (tokens / wall-clock / substrate-ops) compose differently; per [M10](../work/milestones/m10-cost-and-energy-ledger-extension.md)'s cost-quantale, by Lawvere-quantale arithmetic.
  Commit to a normalized cost-coordinate.
10. **Promotion-eligibility verification.** "All constituents reduce to substrate-only operations" is a closure-rule-language fragment check; run at promotion-attempt time.
11. **Maturation-office authority.** Captain alone, or designated maturation office?
  First conservative; second matches the polity's growing-into-rotation pattern.
12. **Endpoint-record location.** Co-located with FastAPI handler (frontmatter on `.py` docstring) vs separate `governance/endpoints/`.
13. **MCP-tool unification.** MCP `list-tools` and HTTP `OPTIONS` are structurally similar; whether they share an endpoint-record schema.
14. **3xx redirect's place.** Own field in `endpoint-record` vs separate `redirect-record` kind.
15. **Token-shape default for [M8](../work/milestones/m8-inbound-participation-mcp-clients.md).** Self-contained federation-portable; handle tokens easy to revoke.
  For two-peer cold-red-gate ↔ bare-cedar-fog setup, handle tokens are simplest.
16. **Canonical-form discipline.** JWS RFC 7515 specifies canonicalization; use a vetted JWT library rather than rolling canonicalization.
17. **`aud` value format.** Explicit format like `urn:561-polity:rsc-quiescent:cold-red-gate`.
18. **Token-verification rate-limiting.** Composes with cost-quantale per [`rate-limiting-as-cost-quantale-residuated-authority-gate`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/).
19. **Pattern detection from workitem shape.** Substrate-resident classifier (parses dependency-poset, picks parallel/sequential/phased/worktree-isolated) vs explicit `pattern:` field on the workitem.
  Classifier is principled but expensive on first dispatch; explicit field is cheap but loses the "free corollary" property.
20. **Worktree-isolation as default for write-conflicting workitems.** Default-on (any workitem with `writes:` overlapping another in-flight workitem auto-routes to a worktree) or captain-authorized (substrate flags but doesn't auto-isolate).
  Default-on is safer; captain-authorized avoids over-invocation on benign overlaps.
21. **Choreography-layer escalation predicate.** When does a cell-listener-fired event escalate to orchestrated dispatch?
  Some events should never block (tick-close, audit-snapshot); some must (charter-rule-violation, federation-admission-rejection).
  Threshold predicate must be substrate-decidable — bounded fragment of the closure-rule language.
22. **Cascade-projection cadence for foreign harnesses.** When a foreign harness (Cursor, Copilot, generic AGENTS.md consumer) is installed alongside Claude Code, the substrate projects its source-of-truth into the foreign harness's expected file format.
  Per-commit (cheap; may produce churn), per-quiescence (substrate-coherent; aligns with [`materialized-views-as-content-addressed-projection-caches-at-quiescence`](substrate-algebra-closure-and-replay.md)), or harness-install-time-only (lightest; defers drift to manual `pyfars install-harness` re-run).
23. **Cascade-size-cap policy.** AGENTS.md's 32 KiB cap is advisory in spec; the substrate could enforce strictly (refuse to project a cascade exceeding cap), warn (emit a $\top$-cell at audit-export), or split (decompose oversize cascade into hot/specialized/cold tiers per the Vasilopoulos discipline).
  Splitting is most substrate-coherent.
24. **Drift-detection time-window.** Per the Vasilopoulos cautionary finding, stale `_index.md` actively degrades agent performance.
  Detection window: per-commit (heaviest), per-tick (default), per-export (cheapest).
  Default per-tick aligns with session-record-open/close cadence.
25. **Identity vs instruction split policy.** PyFARS conflates them in `governance/agents/<office>.md`; closure rules treat them as separate predication-fragments.
  Whether to split into two files (`<office>.identity.md` + `<office>.instruction.md`) for clarity, or keep conflated for human-readability.
  Conflated-with-discriminating-frontmatter is the lightest-touch path.
26. **Foreign-interior-cobordism replay discipline.** Boundary-only replay (default; the substrate replays the witness chain but does not re-execute the foreign interior) vs full replay (requires deterministic foreign runtime, e.g. Claude Code at $T = 0$).
  Per-runtime declaration in `foreign-interior-cobordism-record` is the right shape.
27. **ACP-routing as substrate-resident vs harness-installed.** OpenClaw's ACP backend is harness-installed; PyFARS's foreign-interior-cobordism mechanics could live at the substrate layer (closure-rule-driven routing across runtimes) or at the harness layer (per-harness ACP adapter).
  Substrate-resident is more substrate-coherent but requires implementing routing logic the substrate doesn't currently have.
28. **Channel-adapter authoring as substrate cell-kind.** Each of OpenClaw's 22 channels (WhatsApp/Telegram/Signal/...) has its own adapter.
  PyFARS could author each as a substrate `channel-adapter-record`, or import OpenClaw's adapter library wholesale via the bridge.
  Importing is faster; authoring is substrate-coherent and gives the closure-rule layer access to per-channel disciplines.
29. **QMD adoption timing.** Per the materialized-view-at-quiescence pattern, QMD-style indexing is a future feature.
  Trigger condition — when grep+frontmatter-walk demonstrably saturates (some closure-rule-detectable threshold), or captain-discretionary.
  First aligns with the maturation-ladder pattern.
30. **OpenProse vs PyFARS plan format.** Both are markdown-first 1-morphism realizations.
  Whether the polity adopts OpenProse for `/prose`-style workflow execution alongside PyFARS plans, or PyFARS plan-records subsume the OpenProse use cases.
  Subsumption is cleaner; co-existence accepts that OpenProse is the operationally-named version of the same algebra.
31. **Per-channel DM-policy frontmatter location.** Per-channel-adapter cell, per-office-record cell, or both with composition rule.
  Per-channel-adapter is the most substrate-coherent; per-office allows finer per-recipient gating; composition uses $\odot$-fusion.
32. **MCP cascade vs instruction cascade composition.** `mcp-cascade-record` and `instruction-cascade-record` are structurally similar (project < local < user); whether they share a single `cascade-record` schema with a `cascade-kind:` discriminator, or remain separate.
  Shared is cleaner; separate allows per-kind closure-rule logic without overloaded dispatch.
33. **MCP server tool-inventory verification.** When the substrate consumes an external MCP server (lean-lsp-mcp, mcp-rdf-explorer, etc.), the server's tool inventory should be verified at install time and re-verified on each invocation (transport-layer schema mismatch detection).
  Per-call verification is conservative; per-install + drift-detection is the practical compromise.
34. **OPC-UA NodeSet import discipline.** When the polity wants to integrate an industrial system's NodeSet (e.g., a Siemens equipment ontology), wholesale-import vs author-as-substrate-cells.
  Wholesale is faster; author-as-cells is substrate-coherent and gives the substrate's predication-fibration full BC discipline over the ontology.
35. **Anomaly-Detector / Parts-Checker / Scheduler / Orchestrator pattern as substrate template.** Whether the polity ships a default four-role pattern as a template office-set, or each polity authors its own role decomposition.
  First gives polities a working baseline; second respects per-polity authority.
36. **MCP-server transport choice for substrate exposure.** stdio (process-local; default for closure-rule-callable tools), HTTP (cross-process or cross-machine), SSE/WebSocket (long-running tools).
  The substrate exposes itself by default via stdio for local agent-callers and HTTP for cross-substrate federation (per the [federation-resilience question](federation-resilience-and-degradation.md)).
37. **Lean-lsp-mcp as theory-research office's default toolset.** The lean-lsp-mcp installation is already in the polity.
  Whether the substrate makes lean-lsp-mcp's 20-tool inventory the default for theory-research offices (predication-theory-lifter, theorem-auditor, math-researcher) or per-office opt-in.
  Default is more substrate-coherent for theory-bearing offices; opt-in respects per-office authority.
38. **Skill activation-trigger validation discipline.** Per the load-bearing-infrastructure observation, vague descriptions produce ghost skills.
  Substrate-resident closure rule `validate-skill-activation-trigger` could enforce minimum-specificity (e.g., trigger must name content type AND scope AND variants).
  Closure-rule-decidable threshold vs LLM-as-judge.
39. **Five-extensibility-mechanism cell-kind unification.** Skill / Command / Agent / Rule / Hook are five distinct cell-kinds today.
  Whether to keep them separate (clearer typing) or unify under a single `extensible-record` cell-kind with `mechanism:` discriminator (more substrate-coherent if all five share the same closure-rule activation pattern).
  Separate is the lightest-touch path.
40. **Foreign-runtime determinism declaration cadence.** Each foreign runtime's $T = 0$ determinism profile (deterministic / approximate / non-deterministic) needs to be declared.
  Per-runtime registration vs per-call declaration.
  Per-runtime is cleaner; per-call lets the substrate adapt to runtime-version drift.
41. **A2A protocol surface scope.** When PyFARS adds A2A support (post-M8), whether to expose office-records as Agent Cards directly (substrate-coherent) or via per-office adapter (lighter-touch).
  Direct exposure means substrate IS the Agent-Card source; adapter means substrate is the source-of-truth that projects to Agent-Cards.
42. **PROACTIVELY pattern adoption.** Per `how-to-write-a-skill`, the PROACTIVELY trigger signals invocation without explicit user request.
  Whether PyFARS skills/agents adopt this pattern as a `proactive: true` frontmatter field, or whether all proactive invocation goes through scheduled recurrent-practice (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
  Recurrent-practice is more substrate-coherent; PROACTIVELY-frontmatter is the lighter-touch import from the surveyed convention.
