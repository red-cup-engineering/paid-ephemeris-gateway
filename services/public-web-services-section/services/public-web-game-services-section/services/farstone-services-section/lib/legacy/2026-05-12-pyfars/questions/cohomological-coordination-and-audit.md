---
type: question
status: open
explores: [consensus-as-h0-construction, coordination-cohomologically-bounded-by-h1, audit-via-cech-cocycle-evaluation, beck-chevalley-commutation-on-predication-bilattices, replica-mayer-vietoris, husainov-acyclicity, formation-control-rigidity, distributed-coordination-primitives, m6-federation, m11-assurance-audit-chain-export]
---

# How does PyFARS realize agreement, audit, jurisdictional movement, and shape-preservation as one cohomological substrate primitive — $H^0$ for sections, $H^1$ for obstructions, nothing higher?

The DCP and predication-categories theorems together give a unifying account of every coordination-shaped operation in PyFARS — agreement, audit, jurisdictional movement, sharding, charter shape, conflict-of-laws detection — as cohomology on a replica cover.
PyFARS's many ad-hoc agreement points (charter ratification, federation merge, multi-witness completion, office succession) are surfaces of one operation; the substrate's coordination machinery doesn't need separate proofs for each context.

The simplicity cap is structural: every coordination problem on the platform discharges $H^0$ (section construction) and $H^1$ (obstruction); higher degrees are *provably useless* on PyFARS's regime.
This bounds the substrate-engineering surface and rules out three-level meta-consensus, meta-consensus-recursion, and spectral-sequence audit machinery as over-engineering.

---

## Consensus as $H^0$ construction

The DCP theorem [`consensus-as-h0-construction`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/consensus-as-h0-construction.md):

**Claim.** Let $C$ be a cluster-record presenting an $N$-element [replica cover](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/replica-cover.md) $\{U_i \to U\}_{i=1}^N$ on the bitopological settling site, and let $\mathcal{F}_U$ be the [settling-associated sheaf](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-associated-sheaf.md) for the coordination problem's predicate.
A successful execution of `propose-and-vote` on $C$ produces, as its substrate-recorded decided value, a unique element

$$s \in H^0(U, \mathcal{F}_U)$$

— a global section of $\mathcal{F}_U$ on $U$.

**Why this holds.**

- *Each member's vote is a local section.* Per [`vote-as-section`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/vote-as-section.md), member $m_i$'s recorded vote $\sigma_i$ is a section of $\mathcal{F}_U$ over $U_i$ — well-defined because the no-double-vote rule makes $\sigma_i$ a function (not multi-valued), signature-bound because [`signature-binds-witness-to-identity`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/) prevents retraction or reattribution.
- *A successful protocol reaches overlap-agreement.* For two members $i, j$ in the deciding quorum with overlapping clopens, the substrate-recorded agreement-on-value is exactly the sheaf agreement condition $\sigma_i|_{U_i \cap U_j} = \sigma_j|_{U_i \cap U_j}$.
- *Mayer–Vietoris lifts the local sections.* Per [`replica-mayer-vietoris`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/replica-mayer-vietoris.md), exactness at $H^0(U, \mathcal{F}_U)$ gives

$$0 \to H^0(U, \mathcal{F}_U) \xrightarrow{\mathrm{res}} \prod_i H^0(U_i, \mathcal{F}_U) \xrightarrow{\mathrm{diff}} \prod_{i<j} H^0(U_i \cap U_j, \mathcal{F}_U).$$

The family $(\sigma_i)_i$ satisfies $\mathrm{diff}(\sigma_i)_i = 0$ by overlap agreement, so it lies in $\ker(\mathrm{diff}) = \mathrm{im}(\mathrm{res})$.
The global section $s \in H^0(U, \mathcal{F}_U)$ with $s|_{U_i} = \sigma_i$ is unique by injectivity of $\mathrm{res}$.

The existing DCP theorems are projections of this construction:

- [`quorum-consensus-safety`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/quorum-consensus-safety.md) is the *uniqueness* clause: Mayer–Vietoris injectivity means two successful executions reaching agreement cannot have decided different values.
- [`quorum-safety-under-partition`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/quorum-safety-under-partition.md) is the degenerate-cover case ($U_i \cap U_j = \emptyset$ for cross-partition pairs); quorum-threshold supplies the agreement constraint when overlap doesn't.
- [`consensus-causal-order-via-lorentzian-settling`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/consensus-causal-order-via-lorentzian-settling.md) is the time-direction layer: where $H^0$ assembles sections across the *space* of cluster members, Lorentzian causal settling assembles them across the *time* of consensus rounds.
- [`leader-election-termination-via-no-periodic-orbits`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/leader-election-termination-via-no-periodic-orbits.md) is the iterative-construction layer: building the global section by iterating the cluster's closure-rule system terminates because the closure 2-monad has no non-trivial periodic orbits.

**The four PyFARS agreement contexts** factor through this single primitive:

- **Charter ratification.** $U$ = polity entity-set; $\{U_i\}$ = office incumbents' scopes; $\mathcal{F}_U$ = charter-content sheaf; $H^0$ section = ratified charter clause.
- **Federation merge.** $U$ = federated polity entity-set; $\{U_i\}$ = peer substrates; $\mathcal{F}_U$ = $\vee_k$-merged settling sheaf; $H^0$ section = merged substrate state.
- **Multi-witness completion.** $U$ = workitem outcome space; $\{U_i\}$ = witnesses' scopes; $\mathcal{F}_U$ = evaluation-result sheaf; $H^0$ section = agreed evaluation outcome.
- **Office succession.** $U$ = office authority space; $\{U_i\}$ = incumbents' temporal segments; $\mathcal{F}_U$ = incumbency-record sheaf; $H^0$ section = consensus succession trace.

A new substrate object kind, `agreement-instance-record`, at `governance/agreement-instances/<class>--<id>.md`:

```yaml
type: agreement-instance-record
class: charter-ratification | federation-merge | multi-witness-completion | office-succession | governance-amendment
replica-cover: <cluster-record-slug>           # the cover {U_i → U}
settling-sheaf: <sheaf-record-slug>            # 𝓕_U
predicate: <slug>                              # the predicate the consensus settles
quorum-threshold: <fraction>                   # for partial-cover acceptance
votes-as-sections: governance/agreement-votes/<id>--<member>.md
decided-value: <section-record-slug>           # the H⁰ section reached
delta-zero-witness: <cocycle-record-slug>      # δ⁰(σ_i)_i — the obstruction record
```

A closure rule, `propose-and-vote-h0-construct`, fires when an `agreement-instance-record` has gathered enough votes: 1.
Read the votes $(\sigma_i)_i$ from per-member `vote-as-section` cells.
2.
Compute $\delta^0(\sigma_i)_i := (\sigma_j|_{U_i \cap U_j} - \sigma_i|_{U_i \cap U_j})_{i < j}$.
3.
If $\delta^0 = 0$: emit the unique global section as `(agreement-instance, decided-value, s) = T`.
4.
If $\delta^0 \neq 0$: emit `(agreement-instance, fails-at-pair, (i,j)) = T` for the failing pair — exactly the cohomological diagnostic the theorem promises.

Per [`bigraded-common-knowledge`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bigraded-common-knowledge.md) and the consensus-as-$H^0$ theorem's bigraded refinement [`consensus-achieves-bigraded-common-knowledge`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/consensus-achieves-bigraded-common-knowledge.md), the $H^0$ reading captures the *truth-axis* (decided value); a complementary bigraded reading captures the *knowledge-axis* (the cluster's common possession of the witness chain).
PyFARS should track both: this construction handles $H^0$ production; bigraded common-knowledge handles learner-lag and stale-epoch detection.

---

## $H^1$ as the protocol-simplicity cap

The DCP theorem [`coordination-cohomologically-bounded-by-h1`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/coordination-cohomologically-bounded-by-h1.md):

**Claim.** For every coordination problem on the platform — leader election, quorum consensus, distributed locking, sharding agreement —

$$H^n(U, \mathcal{F}_U) = 0 \quad \text{for all } n \geq 2$$

on the cluster's replica cover.

**Why this holds.** Per [`settling-cohomology-vanishes-above-degree-1`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-cohomology-vanishes-above-degree-1.md), substrates built from the four predicate generators ([`specialization`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md), [`converse`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-converse.md), [`subject-projection`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-subject-projection.md), [`object-projection`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-object-projection.md)) have $\mathcal{C}^{\mathrm{op}}$ with cohomological dimension $\leq 1$.
Per [`four-regime-dichotomy`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md), every PyFARS substrate falls in this regime by construction.
The vanishing is automatic and inherits to every replica cover.

$H^0$ is the section construction; $H^1$ is the obstruction (via the connecting homomorphism $\delta^0$ in Mayer–Vietoris).
These are the only cohomological structures the protocol's machinery needs to address.

**What "only $H^0$ and $H^1$" rules out.** Per the theorem's structural exclusions:

- **Three-level meta-consensus.** Running consensus on the consensus *about* consensus would discharge $H^2$ obstructions; the bound says this is unnecessary.
- **Non-trivial higher coboundary tracking.** Quorum-record fields like "consensus on which member's view of the consensus is canonical" are over-engineered.
- **Spectral-sequence machinery in audit.** A Leray-spectral-sequence calculation across multiple cover refinements is doing work the substrate's cohomology has already collapsed to zero.

The risk for PyFARS is that during M5–M11 development, a self-generated closure rule (per [M5](../work/milestones/m5-agential-self-generation.md)) implicitly anticipates higher-degree obstructions — for instance, recursively consulting the meta-consensus on which closure rule's verdict applies.
The simplicity cap says such rules are unnecessary by construction; the substrate should *refuse* them.

A new substrate object kind, `cohomological-complexity-cap`, at `governance/protocol-discipline/h1-bound.md`:

```yaml
type: cohomological-complexity-cap
applies-to-classes: [coordination-protocol, audit-projector, federation-merge-rule, charter-amendment-protocol]
maximum-cohomological-degree: 1
proof-source: settling-cohomology-vanishes-above-degree-1
detection-rule: detect-higher-cohomology-anticipation
override-conditions:
  - off-platform-substrate-extension      # only legitimate reason to lift the cap
  - explicit-captain-override-with-justification
```

A closure rule, `detect-higher-cohomology-anticipation`, fires on every newly-authored or amended closure-rule:

1. Parse the closure rule's body (every closure rule is a Datalog-fragment formula with declared regime metadata).
2. Detect structural patterns anticipating $H^2$ obstructions: triply-nested cover quantification (formula of shape "for every triple $(U_i, U_j, U_k)$..." in a way $H^2$-meaningful — pairwise intersections, $H^1$-meaningful, are admissible); meta-consensus-recursion (formula consulting `consensus(consensus(...))
  ` cells); spectral-sequence-shape resolution (formula whose evaluation requires computing a sequence of refinements with non-trivial coboundary).
3. If detected, emit `(rule, anticipates-h2, pattern) = T` and reject (or accept with explicit captain override and justification).

Detection isn't a syntactic ban on triple-nested loops — many legitimate computations involve iterating over triples for non-cohomological reasons.
Detection targets specifically the cohomological pattern (coboundary-tracking in the formula's structure).

The bound is **structural, not operational** — machinery in degrees $\geq 2$ *does not exist* (provably useless), not that protocols handle $H^0$ and $H^1$ *cheaply*.
Discharging $H^1$ for a large cluster can still be expensive; the cap rules out *additional* expense from higher-degree machinery.

The cap is also a **falsification trigger**: if a protocol would benefit from higher-degree machinery, the substrate's regime classification is wrong.
An off-platform substrate with cohomological dimension $\geq 2$ would invalidate the bound.
PyFARS by construction is in the four-regime universe; an attempt to author a useful $H^2$-anticipating rule is evidence of substrate-regime drift, itself an audit-worthy event.

---

## Audit as Čech-1-cochain evaluation

The DCP theorem [`audit-via-cech-cocycle-evaluation`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/audit-via-cech-cocycle-evaluation.md) supplies the audit *primitive*.
The audit operation IS:

$$d^0(\sigma)_{ij} := \sigma_j|_{U_i \cap U_j} - \sigma_i|_{U_i \cap U_j}$$

— a Čech 1-cochain computed for every overlapping pair $(m_i, m_j)$ in the cluster's recorded membership.
The connecting homomorphism $\delta^0$ in the [`replica-mayer-vietoris`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/replica-mayer-vietoris.md) sequence sends $(\sigma_i)_i$ to the cohomology class of $d^0(\sigma)$ in $H^1(U, \mathcal{F}_U)$.
The class vanishes iff the family lifts to a global section iff every pair satisfies $d^0(\sigma)_{ij} = 0$.

**Why pairwise comparison suffices.** The cluster's membership poset is finite Alexandrov.
Per [Husainov acyclicity](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/husainov-acyclicity.md), finite Alexandrov posets satisfying the Dedekind–MacNeille cut condition have agreement between Čech and derived-functor cohomology in every degree.
The audit's per-pair calculation IS the Čech-1-cochain calculation, computing the *exact* Mayer–Vietoris obstruction.
And per the simplicity cap, $H^n(U, \mathcal{F}_U) = 0$ for $n \geq 2$, so there are no higher-degree obstructions for the audit to potentially miss.
The $H^1$ check is exhaustive.

**Audit cost is structurally $O(N^2)$** in cluster size.
Not heuristic.
There is no need to anticipate more expensive audit modes for higher-degree checks because higher-degree cohomology is structurally zero.

**Refutations are diagnostic.** A `refuted` result returns the offending pair as evidence — the operator can identify the disagreeing members and inspect their evidence chains directly.
This is "a direct cohomological diagnostic" — operators see the structural source of failure rather than just "consensus failed."

PyFARS realizes audit via:

1. **Substrate scan.** Identify auditable structures: closed quorum-records, assignment cells from dispatch, any cluster-with-overlapping-members structure.
2. **Per-pair cocycle evaluation.** For each auditable structure, compute $d^0(\sigma)_{ij}$ over recorded membership.
  Pairs where $d^0(\sigma)_{ij} \neq 0$ in $H^0(U_i \cap U_j, \mathcal{F}_U)$ are flagged as cohomological-obstruction witnesses.
3. **Audit-witness emission.** A `confirmed` audit emits substrate cell `(structure, audit-confirms, decided-value) = T`.
  A `refuted` audit emits `(structure, audit-refutes, offending-pair) = T` plus the offending pair's $d^0$ value.
4. **Certification projection.** The certification projector at [M11](../work/milestones/m11-assurance-audit-chain-export.md) reads audit-witness cells and produces NIST-CSF-2 / FAA-BVLOS / DoD-3000.09 artifacts.
  The artifact format encodes "this consensus reached the unique decision the cluster's votes mathematically permitted" with per-pair evidence as supporting detail.

**Limits.**

- **Soundness, not Byzantine-detection.** A `confirmed` result certifies recorded votes mathematically reach the recorded decision; it does not certify vote honesty.
  Byzantine-resilient audit requires the larger-quorum discipline of [`byzantine-cluster-as-finer-replica-cover`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/byzantine-cluster-as-finer-replica-cover.md) plus separate honesty-of-evidence checks.
- **Pinned membership.** Audit assumes the cluster's membership is the membership at the quorum-record's `current-term`.
  Cross-term audits decompose into per-term audits stitched along the cluster-record's term sequence.
- **Sheaf-completeness assumption.** Audit operates on post-threshold-check state; partial families (incomplete quorums) are detected separately.

Audit-witness cells are themselves substrate content; per the audit-substrate discipline, an audit-of-an-audit is a new Mayer–Vietoris computation on the audit-witness cluster.

---

## Beck–Chevalley as substrate invariant for jurisdiction, sharding, delegation, succession

[`beck-chevalley-commutation-on-predication-bilattices`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/beck-chevalley-commutation-on-predication-bilattices.md) proves every [predication fibration](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md) satisfies the Beck–Chevalley axiom of a [predication hyperdoctrine](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-hyperdoctrine.md): for every pullback square

$$\begin{array}{ccc} P & \xrightarrow{p_A} & A \\ p_B \downarrow & & \downarrow f \\ B & \xrightarrow{g} & C \end{array}$$

and every $\phi \in \mathcal{E}_B$, the canonical maps

$$\exists_{p_A}^{k}(p_B^*\phi) \to f^*(\exists_g^{k}\phi), \qquad \exists_{p_A}^{t}(p_B^*\phi) \to f^*(\exists_g^{t}\phi)$$

are isomorphisms in $\mathcal{E}_A$.
The dual statements for $\forall$ also hold.

**Three-part proof.**

- **Part I — reduction to cellwise.** All four predicate-category generators act on fibers by $f^*(v)(s, o) = v(\phi_f(s, o))$ for an equivariant partial function $\phi_f$.
  Left adjoints $\exists_f^{k/t}$ are cellwise extensions; compositions are cellwise reindexings plus extensions; BC at the fibration level reduces to a cellwise statement at each $(s, o) \in E \times E$.
- **Part II — predicate-generator pullback closure.** Per [`predicate-generator-pullback-closure`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/predicate-generator-pullback-closure.md), the four generator classes are closed under pullback in $\mathcal{C}$, so $\mathcal{C}$-pullback squares lift to pullback squares in $\mathbf{IndexMap}(E)$.
- **Part III — base-change lemma.** Classical: left Kan extension along a pullback equals pullback of a left Kan extension.
  BC follows cellwise.

The 2-categorical lift to the temporal 2-category is in [`temporal-beck-chevalley`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/temporal-beck-chevalley.md); gauge-twisted reindexing is in [`twisted-beck-chevalley`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md).

**Substrate operations realizing $\mathcal{C}$-pullback squares:**

- **Jurisdiction transfer** (workitem moves from office A's to office B's).
  Per [`jurisdiction-as-base-change`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md).
- **Sharding** (workitem assigned to a peer in [M6](../work/milestones/m6-federation.md)).
  Per [`sharding-as-fibration-pullback-cover`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/sharding-as-fibration-pullback-cover.md).
- **Delegation** (incumbent A delegates a power to incumbent B).
  Per [`delegation-transport-via-beck-chevalley`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/delegation.md).
- **Office succession** (incumbent rotation, term-end handoff).
  Per [`succession-as-handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/succession-as-handoff-cobordism.md), the cobordism IS a 2-cell over a $\mathcal{C}$-pullback square.

The theorem says: **for any of these operations, the substrate state computed by "restrict-then-aggregate" equals the substrate state computed by "aggregate-then-restrict", up to canonical iso.** This is the substrate-algebraic guarantee that operational boundary-crossings preserve substrate state.

The complementary failure-mode is named: per [`conflict-of-laws-as-beck-chevalley-failure`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/), Beck–Chevalley *failure* is the substrate-detectable signature of conflict-of-laws — the case where two governance patterns' aggregations across orthogonal boundary-crossings disagree.
The math says BC always holds for the predication fibration; the engineering says BC may fail when the substrate is being read through two different governance patterns simultaneously.
PyFARS gets the math guarantee for free; the operational question is whether to catch governance-pattern-induced apparent BC failures.

A new closure rule, `bc-commutation-on-base-change`, fires whenever a substrate cell crosses a $\mathcal{C}$-pullback boundary.
Concretely, when a workitem $W$ in office-A's jurisdiction is transferred to office-B:

1. Pre-transfer state has cells $(W, p, \cdot)$ in $\mathcal{E}_A$.
2. Transfer is a $\mathcal{C}$-morphism $g : B \to A$.
3. Post-transfer state should have cells $g^*(W, p, \cdot)$ in $\mathcal{E}_B$.
4. **BC says:** if cells were aggregated via $\exists$ in A first, then restricted to B, that equals first restricting to B and then aggregating via $\exists$ in B.

A *failure* of the BC closure rule fires `(W, bc-failure-on-transfer, A→B) = ⊤`, routing to conflict-of-laws handling.

The four common base-changes (jurisdiction, shard, delegation, succession) are well-defined; less-common cases (temporal restrictions, consumed-budget-class splits) may also be pullback squares — the planner needs to confirm scope.
Gauge-twisted reindexing per [`twisted-beck-chevalley`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md) is needed for delegations carrying normative-shift (e.g., a delegation that re-grades its content under a different normative system).

---

## Semantic ontologies as fiber decomposition; multi-agent reasoning across types as BC-commutation

The industrial AI literature (per [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md) and [`industrial-control-overview`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-control-overview.md)) has converged on **semantic ontologies** as the load-bearing primitive for multi-agent reasoning across equipment types.
The OPC-UA Unified Architecture exposes equipment as machine-readable information models with entities (Motor, Bearing, Technician, ShiftSchedule), properties (`Bearing.
Condition ∈ {Good, Degrading, Failed}`), relations (`Bearing → Location → Motor → ProductionLine`), and permitted actions (`Technician.
Reschedule (requires: shift_coverage > 1.0)`).
The architectural claim, repeated across the industrial literature: *agents trained on one equipment type can reason about similar equipment without retraining, because all equipment exposes the same semantic structure*.
This claim is a working assumption at industrial scale across Siemens MindSphere, Hitachi HMAX, Rockwell, ABB, GE Predix APM.

**This is the predication-fibration's BC-commutation property at industrial scale.** The substrate-algebraic statement: **OPC-UA semantic ontologies ARE the fiber decomposition of the predication 2-monad over equipment-typed substrate cells**, with cross-type reasoning enabled by the BC square commuting over the type-shift functor.
PyFARS's substrate generalizes — typed-frontmatter cells form fibers indexed by cell-class; closure rules transport predications across fibers via base-change; the BC commutation guarantees cross-type reasoning is structurally available, not merely an architectural convenience.

### Entities / properties / relations / permitted-actions as fiber components

The OPC-UA + OWL/RDF formalism decomposes a domain into four orthogonal components:

- **Entities** — the objects of the predication-fibration's base category (Motor, Bearing, Technician, ShiftSchedule).
  In OWL/RDF terms: classes with `rdf:type owl:Class`.
  Substrate reading: cell-classes declared via frontmatter `type:` field.
- **Properties** — the predicates ranged over by the entities ($\mathrm{Status} \in \{\mathrm{Running}, \mathrm{Idle}, \mathrm{Error}\}$ for Motor; $\mathrm{Condition} \in \{\mathrm{Good}, \mathrm{Degrading}, \mathrm{Failed}\}$ for Bearing).
  In OWL terms: `owl:DatatypeProperty` and `owl:ObjectProperty`.
  Substrate reading: predicate-fibers over entity classes.
- **Relations** — morphisms in the base category ($\mathrm{Bearing} \to \mathrm{Location} \to \mathrm{Motor} \to \mathrm{ProductionLine}$).
  In OWL terms: object-property chains with declared range and domain.
  Substrate reading: cell-to-cell links via frontmatter cross-references; the closure rule's transport along the link is the morphism's action.
- **Permitted actions** — the predication-fibration's action morphisms with substrate-decidable preconditions (`Technician.
  Reschedule (requires: shift_coverage > 1.0)`).
  In OWL terms: action-classes with precondition-axioms.
  Substrate reading: closure rules whose triggers carry decidable preconditions.

PyFARS's predication-categories formalization names these directly: entities are objects in the base category; properties are predicate-fibers over entities; relations are morphisms; permitted-actions are predication-action-morphisms with closure-rule-decidable preconditions.
The OPC-UA → OWL/RDF lifting is the substrate's typed-frontmatter discipline at industrial scale.

The four-component decomposition is *orthogonal* — entity-axis, property-axis, relation-axis, action-axis are independent dimensions.
Each contributes to the cell's predication structure; cross-type reasoning composes across all four. **This is the same orthogonal-fiber decomposition pattern as the OpenClaw four-axis SOUL/USER/MEMORY/HEARTBEAT split** (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md) and the [substrate-algebra question's four-axis section](substrate-algebra-closure-and-replay.md)) — structural confirmation that orthogonal-four-fiber decompositions are the right shape for substrate-resident representations.
Both decompositions split into "what it IS / what attributes it has / how it relates to others / what it can do" — the four-component pattern recurs because it captures the predication's natural axes.

### Cross-type reasoning as BC-commutation on type-shift morphisms

The industrial claim: *a maintenance agent trained on motors, pumps, and compressors can apply learned patterns because all expose `Status`, `Maintenance.
Next_Due`, and `Bearing_Health_Score` in consistent ontologies*.
The substrate-algebraic generalization:

Let $f: A \to B$ be a type-shift morphism (e.g., generalize-Motor-to-AnyEquipment) in the base category.
Let $\sigma: \mathcal{F}(A) \to \mathcal{F}(A)$ be a closure-rule-firing on equipment-of-type-$A$ (e.g., `detect-bearing-degradation` over Motors).
The cross-type reasoning property says: there exists a closure-rule-firing $\sigma': \mathcal{F}(B) \to \mathcal{F}(B)$ on equipment-of-type-$B$ such that the BC square commutes:

$$ \begin{array}{ccc} \mathcal{F}(A) & \xrightarrow{\sigma} & \mathcal{F}(A) \\ \downarrow f_* & & \downarrow f_* \\ \mathcal{F}(B) & \xrightarrow{\sigma'} & \mathcal{F}(B) \end{array} $$

Where $f_*$ is the pushforward induced by the type-shift.
The BC commutation is *exactly* the property that allows the agent to apply learned patterns — the closure rule on Motors lifts to an analogous closure rule on AnyEquipment because the predication structure is preserved by $f$.
Concretely:

- Motor's `Bearing_Health_Score` is ranged over by the same predicate-fiber as Pump's `Bearing_Health_Score` (because both are instances of the Bearing entity).
- The closure rule `detect-bearing-degradation` reads `Bearing_Health_Score`, fires when below threshold; on Motor, on Pump, on Compressor, the rule body is the same morphism in the predicate fiber, only the entity-instance changes.
- The pushforward $f_*$ along generalize-Motor-to-AnyEquipment is the identity on the `Bearing_Health_Score` fiber (the predicate is preserved across the type-shift); $\sigma'$ is the same closure rule.
- BC square commutes because $f_* \circ \sigma = \sigma' \circ f_*$ — the closure rule applied on Motor and then generalized equals the generalized closure rule applied on AnyEquipment.

The substrate's verification: closure rule `verify-bc-commutation-on-type-shift` checks that for each typed closure rule and each declared type-shift morphism, the BC square commutes (or exhibits a $\mathbf{f}$-cell when it doesn't, which is the "this rule does not generalize" diagnostic).
When the BC fails, the substrate emits a $\langle \bot, \top \rangle$-cell on the type-shift edge — knowledge-order $\top$ (we know this fails) but truth-order $\bot$ (the generalization is false).
This is the substrate's *negative* generalization signal.

The gauge-twisted variant (per [`twisted-beck-chevalley`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md)) applies when the type-shift carries normative-shift — e.g., generalize-Motor-to-Heritage-Motor where heritage equipment is governed by different maintenance norms.
The twisted BC is the correct discipline; vanilla BC fails because the predicate-fiber's normative content shifts under $f_*$.

### Multi-agent ontology coordination via shared base category

The industrial pattern: *each agent uses the same ontology; no custom mappings; new agents added to the system immediately understand the data*.
Substrate-algebraically, this is the *shared-base-category property*: all agents read substrate cells through the same predication-fibration; every agent's predication queries see the same entity types, the same predicate fibers, the same relation morphisms.
The substrate is the shared base; agents are functors into the substrate's fiber category.

The cohomological reading: the substrate's predication-fibration has

- $H^0$ = shared-base-sections (common-vocabulary cells visible to all agents) — corresponds to the [consensus-as-$H^0$ section above](#consensus-as-h0-construction).
- $H^1$ = obstructions-to-cross-type-reasoning (cells where the BC square fails to commute on a declared type-shift) — corresponds to the [protocol-simplicity-cap section above](#h1-as-the-protocol-simplicity-cap).

New agents added to the system see the same $H^0$; they encounter the same $H^1$ obstructions; their integration cost is the cost of resolving those obstructions, not the cost of building a custom mapping per agent. **The simplicity-cap claim ($H^n = 0$ for $n \geq 2$) extends to ontologies**: in a well-designed shared ontology, $H^1$ is small (most cross-type generalizations succeed); in a poorly-designed ontology, $H^1$ grows with each new agent type, and $H^2$ remains zero only because the four-regime classification refuses to admit aperiodic-rule generalizations.

Substrate-resident closure rule `compute-ontology-h1-rank` produces a per-substrate-tick measurement of the ontology's design quality: count BC-commutation failures across declared type-shifts; report the rank.

### The OPC-UA NodeSet structure as substrate-cell shape

The Motor NodeSet structure from [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md):

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

PyFARS substrate-cell equivalent (a Motor cell):

```yaml
type: motor                            # entity class
slug: motor-7654
status: running                        # property: Status (enum)
temperature:                           # property: Temperature (with thresholds)
  current: 75
  warning-threshold: 85
  shutdown-threshold: 95
vibration:                             # property: Vibration (sub-structured)
  rms-current: 2.1
  rms-normal-range: [0, 3]
  bearing-health-score: 87             # derived predicate
maintenance:                           # property: Maintenance (linked)
  last-service: 2026-02-15
  service-interval-days: 90
  next-due: 2026-05-15
commands:                              # permitted-actions
  - { name: start-motor, requires: { key: authorized-user } }
  - { name: stop-motor }
  - { name: diagnostic-scan }
relations:                             # explicit links
  - { kind: located-at, target: <location-cell-id> }
  - { kind: part-of, target: <production-line-cell-id> }
```

**The substrate-cell IS the OPC-UA NodeSet, expressed in YAML frontmatter rather than the OPC-UA binary protocol.** The semantic structure is identical; the encoding differs.
PyFARS's substrate exposes its cells via M8 as MCP tools that produce OPC-UA-shaped responses — direct interoperation with industrial OPC-UA clients.

### A substrate object kind for ontology-typed cells

A substrate object kind, `predication-ontology-record`:

```yaml
type: predication-ontology-record
domain: <slug>                          # e.g., manufacturing, governance, code, math
entities:
  - { name: Motor, predicate-fiber: <fiber-id> }
  - { name: Bearing, predicate-fiber: <fiber-id> }
  - { name: Technician, predicate-fiber: <fiber-id> }
  - { name: ShiftSchedule, predicate-fiber: <fiber-id> }
properties:
  - { entity: Motor, predicate: Status, domain: [Running, Idle, Error] }
  - { entity: Bearing, predicate: Condition, domain: [Good, Degrading, Failed] }
  - { entity: Bearing, predicate: Health_Score, domain: [0, 100] }
relations:
  - { source: Bearing, target: Motor, morphism: Location }
  - { source: Motor, target: ProductionLine, morphism: PartOf }
  - { source: Technician, target: Motor, morphism: CanService }
permitted-actions:
  - { actor: Technician, action: Reschedule, precondition: "shift_coverage > 1.0" }
  - { actor: Maintenance-Agent, action: ScheduleRepair, precondition: "parts_available AND technician_available" }
type-shift-morphisms:
  - { from: Motor, to: AnyEquipment, pushforward: <closure-rule-id>, twisted: false }
  - { from: HeritageMotor, to: Motor, pushforward: <closure-rule-id>, twisted: true, twist: <normative-shift-id> }
bc-commutation-witnesses:
  - { type-shift: <id>, closure-rule: <id>, verified: true | false }
ontology-h1-rank: <ordinal>             # measured per-tick
sparql-endpoint: <m8-mcp-endpoint>      # exposes ontology as SPARQL-callable
```

Closure rules: `verify-bc-commutation-on-type-shift`, `compute-ontology-h1-rank`, `enforce-shared-base-category` (rejects agent-additions that introduce custom-mapping bypasses), `lift-closure-rule-along-type-shift` (mechanical lifting of $\sigma$ to $\sigma'$ via the BC discipline), `expose-ontology-as-sparql` (the M8 projection).

### Engineering consequences

- **OPC-UA semantic ontologies ARE the predication-fibration's fiber decomposition.** Entities / properties / relations / permitted-actions map directly to the substrate's predication structure; the four-component decomposition is orthogonal.
- **Cross-type reasoning is BC-commutation on type-shift morphisms.** The substrate's `verify-bc-commutation-on-type-shift` closure rule mechanizes the industrial claim that *agents trained on one equipment type reason about similar equipment*.
  The gauge-twisted variant handles type-shifts that carry normative-shift.
- **The shared-base-category property unifies multi-agent coordination.** All agents read through the same predication-fibration; new agents inherit the shared $H^0$; integration cost is $H^1$-obstruction-resolution, not per-agent-mapping authoring.
- **Ontology design quality is measurable as $H^1$ rank.** The substrate exposes `compute-ontology-h1-rank` per-tick; rising $H^1$ flags ontology degradation; falling $H^1$ flags successful refinement.
  The simplicity-cap ($H^2 = 0$) holds when the four-regime classification refuses aperiodic-rule generalizations.
- **OWL/RDF formal semantics lifts to PyFARS via typed frontmatter.** The substrate's frontmatter discipline at industrial scale gives industrial-grade ontology-based agent coordination at the cell-substrate level.
- **The four-component orthogonal decomposition (entities/properties/relations/actions) recurs across substrate domains.** It matches the OpenClaw SOUL/USER/MEMORY/HEARTBEAT split and the predication-categories' fiber structure — the four-axis pattern is the right shape for substrate-resident representations.

---

## Method ontologies as additional fiber decompositions; the four-vs-eight-component recurrence

[`encoding-disciplinary-methods`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/encoding-disciplinary-methods.md) (per the [governance question](governance-charter-and-accountability.md)'s Carter-Little hierarchy section) catalogs five existing method ontologies — EXPO, OBI, P-Plan, REPRODUCE-ME, SPAR — each encoding scientific methods as machine-readable artifacts.
These ontologies extend the OPC-UA + OWL/RDF semantic-ontology pattern from the previous section into specific disciplinary domains.
Two extensions to the substrate's fiber decomposition emerge: the imports of these ontologies into PyFARS's predication-categories, and the question raised by REPRODUCE-ME's eight-component decomposition relative to the four-component recurrence observed across substrate-resident representations.

### Five method ontologies as substrate-imports

The catalog:

- **EXPO (Ontology of Scientific Experiments)** — 200+ concepts; experimental design; Galilean (hypothesis-driven) vs Baconian (exploratory); general-purpose experiment-focused.
- **OBI (Ontology for Biomedical Investigations)** — 2,500+ terms; all investigation phases (planning, execution, reporting); part of OBO Foundry ecosystem.
- **P-Plan** — extends W3C PROV-O for the plans guiding scientific processes; plans decompose into Steps with input/output Variables; supports sub-plans; Linked Data workflow templates.
- **REPRODUCE-ME** — modular ontology for reproducibility, extending PROV-O and P-Plan.
  Eight core components: **Data, Agent, Activity, Plan, Step, Setting, Instrument, Material**.
  Applied to Jupyter notebooks.
- **SPAR family** — scholarly publishing: FABIO (bibliographic), CiTO (citation), DoCO (document structure).

Each maps to PyFARS substrate cell-classes via the substrate's typed-frontmatter discipline:

- EXPO → manufacturing + experimental-physics methods → substrate-cells with `discipline: experimental-physics` or `discipline: manufacturing`.
- OBI → biomedical-investigation cells → substrate-cells with `discipline: biomedical`.
- P-Plan → plan-as-1-morphism cells (already substrate-resident per [dispatch question's plans-as-1-morphisms section](dispatch-workitems-plans-and-external-surfaces.md)) — P-Plan's Step IS the cobordism-component morphism; sub-plan support IS the cobordism's compositionality.
- REPRODUCE-ME → reproducibility-method cells (already substrate-resident per [substrate-algebra question's operations-causal-settling section](substrate-algebra-closure-and-replay.md)) — `causal_hash` IS the reproducibility witness.
- SPAR → bibliographic + citation + document-structure cells → substrate-cells for theory-records and reference-records.

**The substrate is the comprehensive method-ontology** that the encoding-disciplinary-methods text identifies as missing across the field.
The substrate-algebraic claim: PyFARS's predication-categories instantiated across multiple disciplines, with BC-commutation on cross-disciplinary type-shifts (per the previous section), is the cross-disciplinary unification that EXPO + OBI + P-Plan + REPRODUCE-ME + SPAR collectively gesture toward but do not achieve as a single artifact.

### REPRODUCE-ME's eight-component decomposition vs the four-component recurrence

REPRODUCE-ME decomposes a reproducible scientific activity into **eight core components**: Data, Agent, Activity, Plan, Step, Setting, Instrument, Material.
This is *eight* components, not four.
The previous sections of this question file have identified a four-component orthogonal-decomposition recurrence:

- OPC-UA: entities / properties / relations / permitted-actions (per the [section above](#semantic-ontologies-as-fiber-decomposition-multi-agent-reasoning-across-types-as-bc-commutation))
- OpenClaw boot files: SOUL.md / USER.md / MEMORY.md / HEARTBEAT.md (identity / attention / state / practice; per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md))
- CrewAI memory: short-term / long-term / entity / contextual (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md))
- The substrate's predication-fibration's natural fiber-axes

The substrate-algebraic question: is REPRODUCE-ME's eight-component decomposition genuinely orthogonal eight-axes, or does it collapse to four orthogonal axes plus four derived axes?

The reconciliation: **REPRODUCE-ME's eight components decompose into a four-orthogonal-axis pattern with two components per axis**:

| Substrate-axis | REPRODUCE-ME's two components |
|---|---|
| Identity | **Agent** (who) + **Activity** (what role) |
| Attention | **Plan** (intent) + **Step** (current focus) |
| State | **Data** (substrate cells) + **Material** (input substrate cells) |
| Practice | **Setting** (per-instance practice) + **Instrument** (per-tool practice) |

**REPRODUCE-ME's eight components are TWO components per the four-axis fiber decomposition**, where each axis splits into a "structural" and a "operational" sub-component:

- Identity: structural Agent + operational Activity-Role.
- Attention: structural Plan + operational Step-Focus.
- State: structural Data-Cells + operational Material-Inputs.
- Practice: structural Setting + operational Instrument.

This *confirms* the four-axis recurrence — REPRODUCE-ME doesn't break it; it refines each axis into a 2-component sub-structure (structural + operational).
The eight-component pattern is *not orthogonal eight-axes*; it is the four-axis pattern with each axis 2-resolved.

The structural prediction: **future substrate decompositions with $4 \cdot 2^k$ components for small $k$ ($k = 0, 1, 2, ...$) are likely refinements of the four-axis pattern**, not genuine higher-rank decompositions.
Decompositions that don't fit this pattern (5-component, 7-component, 9-component) should be examined for hidden orthogonality or for over-commitment.

A substrate object kind, `method-ontology-record`:

```yaml
type: method-ontology-record
ontology-name: expo | obi | p-plan | reproduce-me | spar | <other>
discipline: <slug>
component-decomposition:
  axes:                                  # the four orthogonal axes per the recurrence
    identity:
      structural: <component-slug>
      operational: <component-slug>
    attention:
      structural: <component-slug>
      operational: <component-slug>
    state:
      structural: <component-slug>
      operational: <component-slug>
    practice:
      structural: <component-slug>
      operational: <component-slug>
  total-components: 4 | 8 | 16 | ...
  axis-resolution: 1 | 2 | 4 | ...       # how finely each axis is split
imports-into-substrate:                  # which substrate cell-classes derive from this ontology
  - <cell-class-slug>
bc-commutation-with-substrate:           # whether the imported ontology's morphisms commute with substrate type-shifts
  verified: true | false
  failures: [<type-shift-id>, ...]
```

Closure rules:

- `verify-four-axis-orthogonality` — decomposes any imported ontology into the four-axis pattern; fires $\bot$ if the ontology has genuine non-four-axis structure; fires $\top$ if it cleanly decomposes.
- `compute-axis-resolution` — counts how finely each axis is split in the imported ontology.
- `route-import-by-axis` — substrate dispatch routes ontology-import workitems to the appropriate axis-handler (identity-axis handler, attention-axis handler, etc.).
- `aggregate-cross-ontology-bc-commutation` — substrate-cell tracking which cross-ontology type-shifts commute (e.g., does EXPO's "Hypothesis" axis-shift commute with OBI's "Investigation" axis-shift via the substrate's predication-fibration?).

### The cohomological reading

The four-axis recurrence has a cohomological reading: each axis is a fiber over the predication-fibration's base; the four axes commute (the BC squares commute pairwise on disjoint axis-shifts); the substrate's $H^0$ is the shared-base sections (the four-axis grid itself); the substrate's $H^1$ is the obstructions to cross-axis reasoning (per [the section above](#h1-as-the-protocol-simplicity-cap)); the simplicity cap $H^2 = 0$ holds because the four-axis decomposition is not arbitrarily refinable beyond axis-resolution.

**This is why the four-axis pattern is structural rather than incidental**: the predication-fibration has rank-4 fiber-structure, with each axis admitting binary refinement (structural + operational, per REPRODUCE-ME) but not higher independent rank.
The substrate's $H^1$ rank measures cross-axis-reasoning obstructions; the substrate's design quality is the simplicity-cap residue $H^2 = 0$ — guaranteed by the four-regime classification refusing aperiodic-rule decompositions.

The Mayer-Vietoris exact sequence (per the [consensus-as-$H^0$ section above](#consensus-as-h0-construction)) extends to ontology decompositions: when two ontologies are imported simultaneously (e.g., EXPO and OBI for a hybrid biomedical-experimental discipline), the joint $H^0$ is the intersection of the two ontologies' shared-base sections; the joint $H^1$ is the obstructions on the union; the long exact sequence relates them. **The substrate's `aggregate-cross-ontology-bc-commutation` closure rule computes the Mayer-Vietoris obstruction directly** — substrate-cell-tracked, audit-export-readable.

### The accretion trajectory's cohomological signature

The accretion trajectory ([learn → document → curricula → skills → scripts → formalization](governance-charter-and-accountability.md), per the governance question's Carter-Little section) has a cohomological signature: each stage of the trajectory reduces the substrate's $H^1$ rank for that discipline. **The trajectory IS the substrate's $H^1$-rank reduction process**:

- **Learn** stage: high $H^1$ rank (many cross-discipline reasoning obstructions; the discipline is not yet substrate-resident).
- **Document** stage: $H^1$ begins reducing (methods-records carry citations; substrate has anchors).
- **Curricula** stage: $H^1$ reduces further (reading-order is established; cross-discipline transitions are documented).
- **Skills** stage: $H^1$ reduces substantially (closure rules transport predications across disciplines).
- **Scripts** stage: $H^1$ approaches zero on substrate-decidable axes (deterministic procedures).
- **Formalization** stage: $H^1 = 0$ on the formalized axes (mechanically decidable; replay-byte-identical).

The substrate's `compute-discipline-h1-rank-by-stage` closure rule measures the trajectory's progress per discipline; falling $H^1$ flags successful maturation; rising $H^1$ flags discipline-degradation requiring captain attention.

### Engineering consequences

- **The five method ontologies (EXPO / OBI / P-Plan / REPRODUCE-ME / SPAR) become imports into PyFARS's predication-categories**, not competitors.
  The substrate IS the comprehensive method-ontology the gap-text identifies as missing.
- **REPRODUCE-ME's eight-component decomposition is the four-axis pattern with each axis 2-resolved into structural + operational sub-components.** The four-axis recurrence is preserved; REPRODUCE-ME confirms rather than refutes it.
- **The structural prediction**: future substrate decompositions with $4 \cdot 2^k$ components are likely refinements of the four-axis pattern; decompositions outside this pattern require examination for hidden orthogonality.
- **The cohomological reading** explains *why* the four-axis pattern is structural: the predication-fibration has rank-4 fiber-structure with the simplicity cap $H^2 = 0$ guaranteed by the four-regime classification.
- **Mayer-Vietoris extends to ontology decompositions** via `aggregate-cross-ontology-bc-commutation` — joint $H^1$ on cross-ontology unions is substrate-resident-computable.
- **The accretion trajectory has a cohomological signature**: each stage reduces $H^1$ rank for the discipline; substrate measurement of the trajectory is direct.
- **The substrate's `method-ontology-record` cell-kind** captures imported ontologies' four-axis decomposition explicitly; closure rules verify orthogonality, compute axis-resolution, and aggregate cross-ontology BC-commutation.

### Seven-axis embodied-participant taxonomy: refinement of the four-axis recurrence

The May 2026 drone-swarm surveys (per [`survey-of-autonomous-agents-and-swarms-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/survey-of-autonomous-agents-and-swarms-may-2026.md)) propose a **seven-axis technical taxonomy** for autonomous agents, adopted by the predicated-drone-swarm theory (per the [drone-theory-gap question](predicated-drone-swarm-theory-as-theory-gap.md)).
The seven axes:

1. **Embodiment** — software-only / embodied-robot / hybrid-human-machine
2. **Control architecture** — centralized / hierarchical / decentralized / distributed
3. **Homogeneity** — identical / role-specialized-homogeneous / heterogeneous
4. **Interaction topology** — metric-neighbor / topological-neighbor / all-to-all / leader-follower / tree / mesh / time-varying-switching
5. **Information structure** — full-state / partial-observability / delayed / lossy / event-triggered / adversarial
6. **Decision model** — rule-based / optimization-based / game-theoretic / learned
7. **Assurance class** — empirical-only / partially-certified / theorem-backed-with-explicit-safe-sets

The substrate-algebraic question raised by this taxonomy: is the seven-axis pattern a *genuine seven-orthogonal-axes* decomposition, refuting the four-axis recurrence observed across substrate-resident representations?
Or is it the four-axis pattern with embodiment-specific refinement?

**The reconciliation**: the seven axes decompose into the four-axis pattern with refinement on the practice and identity axes:

| Substrate axis | Seven-axis components | Refinement type |
|---|---|---|
| **Identity** | Embodiment + Homogeneity + Assurance class | 3-component refinement (participant-properties: physical / type-uniformity / safety-certification) |
| **Attention** | Information structure | 1-component (no refinement) |
| **State** | Decision model | 1-component (no refinement) |
| **Practice** | Control architecture + Interaction topology | 2-component refinement (authority-topology + communication-graph) |

The seven axes are the four-axis pattern with **identity-axis 3-resolution and practice-axis 2-resolution** (per the REPRODUCE-ME 2-resolution analysis above, but with asymmetric resolution across the four axes).
The recurrence is preserved: the seven-axis taxonomy *confirms* rather than refutes the four-axis pattern.
The asymmetric resolution reflects the *specific information density* of embodied-participant predication — embodiment + homogeneity + assurance class together give the participant's *physical-identity profile*; control architecture + interaction topology together give the participant's *operational-practice profile*.

#### Cross-axis BC-commutation for embodied participants

The seven-axis taxonomy provides additional type-shift morphisms for cross-type reasoning.
For example:

- **Generalize-Embodied-Robot-to-Hybrid-Human-Machine** — a type-shift in the embodiment refinement of the identity axis.
  BC-commutation tested by closure rule `verify-bc-commutation-on-type-shift` (per the [section above](#semantic-ontologies-as-fiber-decomposition-multi-agent-reasoning-across-types-as-bc-commutation)).
- **Generalize-Centralized-to-Distributed-Control** — a type-shift in the control-architecture refinement of the practice axis.
  The shift is *not* identity-pushforward; it carries normative-shift (the closure-rule's authority pattern changes); requires *gauge-twisted BC* (per [`twisted-beck-chevalley`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md)).
- **Generalize-Empirical-to-Theorem-Backed** — a type-shift in the assurance-class refinement of the identity axis.
  This *strengthens* the participant's commitment; closure rules over the new assurance class are stricter; the BC commutation follows the strengthening discipline.

The substrate-algebraic statement: **cross-type reasoning over embodied-participant axes IS the predication-fibration's BC-commutation discipline applied to the seven-axis refinement of the four-axis pattern**.
The substrate provides cross-type generalization mechanically (per the previous section); the seven-axis refinement gives finer-grained type-shifts than the bare four-axis structure.

A substrate object kind extension to `predication-ontology-record`:

```yaml
type: predication-ontology-record
domain: embodied-participants
axis-refinement:
  identity:
    components: [embodiment, homogeneity, assurance-class]
    resolution: 3
  attention:
    components: [information-structure]
    resolution: 1
  state:
    components: [decision-model]
    resolution: 1
  practice:
    components: [control-architecture, interaction-topology]
    resolution: 2
total-components: 7
seven-axis-bc-commutation-witnesses:
  - { type-shift: generalize-embodied-robot-to-hybrid-human-machine, verified: true | false }
  - { type-shift: generalize-centralized-to-distributed-control, verified: true | false, twisted: true }
  - { type-shift: generalize-empirical-to-theorem-backed, verified: true | false }
```

#### Cohomological reading of the seven-axis taxonomy

The cohomological reading of the seven-axis pattern extends the four-axis-as-rank-4-fiber-structure analysis: each axis remains a fiber over the predication-fibration's base; the four axes commute pairwise; the refinement (3-resolution on identity, 2-resolution on practice) introduces *intra-axis* sub-fibers that commute with each other but interact with the cross-axis BC-commutation in a controlled way.

The cohomology stays clean: - $H^0$ = shared-base sections (the seven-axis grid, with refinement structure). - $H^1$ = cross-axis-reasoning obstructions (BC-failure on declared type-shifts). - $H^2 = 0$ (the simplicity cap holds because the seven-axis decomposition is rank-4-with-resolution, not rank-7-independent).

The substrate's `compute-seven-axis-h1-rank` closure rule extends `compute-ontology-h1-rank` to include the refinement-axis-shifts. **The fact that $H^2 = 0$ is preserved is the structural confirmation that the seven-axis taxonomy is the four-axis pattern refined**, not a genuine higher-rank decomposition.
Genuine higher-rank decompositions would produce $H^2 \neq 0$ — which the four-regime classification refuses.

#### Engineering consequences

- **The seven-axis taxonomy IS the four-axis pattern refined** with identity-axis 3-resolution and practice-axis 2-resolution.
  The four-axis recurrence (per the [section above](#method-ontologies-as-additional-fiber-decompositions-the-four-vs-eight-component-recurrence) and the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) is preserved.
- **Cross-type reasoning over embodied-participant axes is BC-commutation over the seven-axis refinement.** The substrate's `verify-bc-commutation-on-type-shift` closure rule extends to the refined axes; gauge-twisted BC handles the normative-shift cases (centralized → distributed; etc.).
- **The cohomological simplicity cap $H^2 = 0$ is preserved.** The seven-axis taxonomy does not break the four-regime classification's structural guarantee; it refines the four-axis grid without introducing aperiodic-rule decompositions.
- **The asymmetric resolution (3 on identity, 1 on attention, 1 on state, 2 on practice) reflects information density.** Embodied-participant predication concentrates information in the participant's identity profile and operational practice; attention and decision-model are simpler axes for embodied participants.
  This asymmetry should NOT be over-generalized to non-embodied substrate domains.

---

## Formation-control rigidity as substrate-shape invariant

The drone-swarm engineering literature names formation control via rigidity theory as the rigorous mathematical discipline for "swarms holding shape."
Distance-based formation objective:

$$e_{ij}(p) = \|p_i - p_j\|^2 - d_{ij}^2$$

with gradient control:

$$u_i = -\sum_{j \in \mathcal{N}_i} \nabla_{p_i} \phi(e_{ij})$$

— and the rigidity-theoretic guarantee:

> Rigidity theory explains when the target shape is locally unique up to translations and rotations.
> A rigid interaction graph gives local shape identifiability; the Hessian of the potential near the target determines local stability properties.

Mathematical content (Krick, Broucke, Francis 2009; Anderson, Yu, Fidan, Hendrickx 2008): a graph $G = (V, E)$ with edge-distance constraints is **infinitesimally rigid** iff the rigidity matrix has rank $2|V| - 3$ (in 2D) or $3|V| - 6$ (in 3D). **Generic rigidity** (Laman 1970) gives a combinatorial characterization: in 2D, a graph is generically rigid iff it contains a spanning Laman graph (a graph with $2n-3$ edges in which every subset of $k$ vertices spans at most $2k-3$ edges).

PyFARS's substrate has analogous "shape" structure.
The polity's **commitment graph** — nodes are offices/persons/workitems, edges are authorities, dependencies, and accountability relations from delegation records — has a *shape* that the polity's charter implicitly defines.

**Where this generalizes.**

- **Charter commitment graph rigidity.** The charter encodes commitments C1–C5 (per the predicated-agentic-computing narrative).
  Each commitment is a relational predicate over offices/persons/workitems.
  Rigidity question: is the polity's commitment shape locally unique up to substrate-irrelevant transformations?
  "Substrate-irrelevant transformations" = rigid motions analogue: renaming offices without changing authorities, re-temporally-ordering office incumbencies that don't have causal dependencies, re-naming persons without changing their assignments.
  If the charter's graph is generically rigid, the polity's shape is locally identifiable; if not, two structurally different polities can produce the same observable behavior — accountability is ambiguous.

- **Charter amendment as edge-set modification.** An amendment adds/removes/modifies edges in the commitment graph.
  Shape-preserving iff the post-amendment graph remains rigid with the same edge-distance constraints (where "distance" is "authority strength").
  Per the simplicity cap, shape-preservation is a barrier function $h$; per Laman's theorem, the precheck is computable: count edges and check the spanning condition.

- **Federation as multi-shape composition.** Multiple peer-polities maintain their own commitment graphs.
  The federation's joint shape is the union; rigidity of the joint graph is governed by inter-peer edges.
  A federation graph that's not rigid lacks formation-stability — peers can drift in joint commitment shape without local violation.

A new substrate object kind, `commitment-shape-record`, at `governance/charter-shape/<id>.md`:

```yaml
type: commitment-shape-record
class: polity-shape | federation-shape | sub-substrate-shape
target-graph: commitment-graph | accountability-graph | dispatch-graph
rigidity-target: generic-rigid                   # or laman-rigid, or 3-rigid
edge-distance-source: governance/offices/<>::authority-strength
allowed-rigid-motions:
  - office-renaming
  - person-reassignment-within-class
  - non-causal-temporal-reordering
identifiability-proof: theorem-slug              # e.g. laman-spanning-counted
```

A closure rule, `enforce-commitment-shape-rigidity`, fires on any structural change: 1.
Construct post-change commitment graph.
2.
Check Laman's spanning condition (or dimensional analogue).
3.
If post-change graph remains generically rigid, allow.
4.
If not, emit `(change, breaks-shape-rigidity, current-shape-record) = T` and route to operator.

Per the rigidity-theory literature's local-stability addendum (the Hessian of the potential): once shape is preserved, the substrate also wants the equilibrium *stable*.
The Hessian-analogue at the substrate level is the closure-rule sensitivity matrix — for each pair of cells, how much does perturbing one affect the other.
Ill-conditioned sensitivity = unstable equilibrium = small change cascades into large shift.

**What this does NOT cover.** Rigidity is a **local** property. **Global** rigidity (uniqueness without ambiguity even far from the configuration) is stronger (3-connectivity in 2D, redundant rigidity, etc.).
Most structured polities won't be globally rigid — there are usually multiple substantively-different polity shapes that satisfy the charter.
Local rigidity is the realistic target.

The "rigid motions" analogy is also imperfect: in physical formation control, rigid motions are translations and rotations in $\mathbb{R}^d$ that preserve all distances.
In substrate-land, "irrelevant transformations" are operationalized choices (which renamings preserve commitments).
The substrate's rigidity discipline is rigorous only relative to a stipulated set of irrelevant transformations.

**BC and rigidity are the same shape-preservation invariant** in different mathematical languages.
A substrate move that satisfies BC commutation should also preserve graph rigidity (and vice versa).
A substrate move that breaks BC also breaks rigidity.

---

## Distributed-coordination primitives layered above cellwise merge

[M6](../work/milestones/m6-federation.md) decomposes into two layers, both substrate-resident:

1. **Content-federation layer.** Cellwise $\vee_k$ merge of substrate cells.
  Algebraically clean, eventually consistent, single-writer-friendly.
  Handles observation cells, instinct cells, theory content, completed-workitem cells.

2. **Coordination-federation layer.** Substrate-resident leader/quorum/lock/cluster records that the dispatch graph reads to gate concurrent operational decisions.
  Handles tick-leader selection, charter-amendment ratification quorum, dispatch locks on contended workitems, peer membership and failure detection.

The DCP subtheory already supplies predication-native primitives:

- [`leader-election`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/leader-election.md) — substrate-cell-firing tournament.
  Termination guaranteed per [`leader-election-termination-via-no-periodic-orbits`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/leader-election-termination-via-no-periodic-orbits.md).
- [`quorum-consensus`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/quorum-consensus.md) — safe under partition; realizes the $H^0$ construction.
- [`distributed-lock`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/distributed-lock.md) — formalized as a residuated authority gate per [`distributed-lock-as-residuated-authority-gate`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/distributed-lock-as-residuated-authority-gate.md).
- Failure-detection — bilattice-modal suspicion (covered in the [federation-resilience question](federation-resilience-and-degradation.md)).

Decision-class mapping: - Tick-driving on shared scopes → leader-election. - Charter-amendment ratification → quorum-consensus. - Workitem dispatch on contended workitems → distributed-lock. - Peer-membership churn → cluster-record + failure-detection.

The coordination layer's records are themselves ordinary substrate cells, federated via the content-federation layer.
PyFARS realizes them as `governance/leaders/<scope>.md`, `governance/quorums/<scope>.md`, `governance/locks/<scope>.md`, `governance/clusters/<id>.md`.
The closure-rule system fires their authority gates the same way it fires [M2](../work/milestones/m2-substrate-dispatch.md)'s eligibility rules.

The coordination layer is **substrate-resident**, not out-of-band.
Running a Raft cluster alongside PyFARS would be operationally simpler in the short term but would put coordination state outside the substrate's algebra — violating the agential-self-generation commitment that all operative state lives in the substrate.

---

## What this commits to

Substrate-resident records: `agreement-instance-record`, `cohomological-complexity-cap`, `audit-projector-record`, `commitment-shape-record`, plus `leader-record`, `quorum-record`, `distributed-lock-record`, `cluster-record` from DCP.

Substrate-resident closure rules: `propose-and-vote-h0-construct`, `detect-higher-cohomology-anticipation`, `bc-commutation-on-base-change`, `enforce-commitment-shape-rigidity`, plus per-pair Čech-cocycle audit primitives.

The discipline composes: $H^0$ produces the section; $\delta^0$ is the failure diagnostic; $H^1$ is the obstruction; nothing higher exists; BC commutation governs base-change correctness; rigidity is the same shape-preservation in graph language; the coordination primitives (leader, quorum, lock, cluster) are surfaces of the same machinery.

## What this connects to

- **The [federation-resilience question](federation-resilience-and-degradation.md)** — algebraic connectivity governs $H^0$ section-construction *speed*; W-MSR composes with the audit-projector via `byzantine-cluster-as-finer-replica-cover`; consistent-hashing rebalance is BC base-change with sheaf-section invariance on unchanged arcs; split-brain detection IS the same $\mathcal{F}_U^{(\top)}$-cohomology audit.
- **The [substrate-algebra question](substrate-algebra-closure-and-replay.md)** — the four-regime classification keeps $H^n = 0$ for $n \geq 2$; closure-2-monad lax-idempotence is the iterative-construction layer for terminating leader-election; materialized-view content-addressing rests on the same fibration functoriality.
- **The [governance question](governance-charter-and-accountability.md)** — accountability-totality is BC-equivalent on jurisdiction transfers; charter-as-closure-system supplies the closure operator $C_\mathcal{N}$ on which estoppel's fixed-point construction rests; the audit-projector reads accountability-totality cells alongside cohomological cells.
- **The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)** — plans are 1-morphisms in the cobordism category; their audit shape is Čech-resolution of the cobordism's bulk; routing IS BC base-change on the predication fibration.
- **The [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)** — handoff-cobordisms ARE 1-cochains on session-pair overlap; their validity is BC commutation on succession squares; their audit is the same Čech-cocycle evaluation.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented.
The theorems below resolve several cohomological questions decisively, leaving only implementation-policy choices in the planner-question list.

### Beck-Chevalley holds for every predication-fibration pullback square

The [beck-chevalley-commutation-on-predication-bilattices theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/beck-chevalley-commutation-on-predication-bilattices.md) is unconditional: every predication fibration is a [predication hyperdoctrine](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-hyperdoctrine.md), with BC isomorphisms holding for every pullback square in the [predicate category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predicate-category.md) $\mathcal{C}$:

$$\exists_{p_A}^{k}(p_B^*\phi) \xrightarrow{\cong} f^*(\exists_g^{k}\phi), \qquad \exists_{p_A}^{t}(p_B^*\phi) \xrightarrow{\cong} f^*(\exists_g^{t}\phi)$$

(and dually for $\forall$).
The proof has three parts:

1. **Cellwise reduction.** All four predicate-category generators ([specialization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md), [converse](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-converse.md), [subject-projection](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-subject-projection.md), [object-projection](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-object-projection.md)) act cellwise: $f^*(v)(s, o) = v(\phi_f(s, o))$ where $\phi_f : E \times E \rightharpoonup E \times E$ is an equivariant partial function.
  BC at the fibration level reduces to a cellwise statement at each $(s, o) \in E \times E$.

2. **Pullback closure.** By the [predicate-generator pullback closure result](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/predicate-generator-pullback-closure.md), the four generator classes are *closed under pullback in $\mathcal{C}$*.
  Thus every $\mathcal{C}$-pullback square lifts to a pullback square in $\mathbf{IndexMap}(E)$.

3. **Base change in $\mathbf{IndexMap}(E)$.** The classical base-change lemma for set-indexed categories (Jacobs 1999; Streicher 2018) gives BC cellwise.

This decisively answers two questions:

- **Q4 (pullback-detection scope):** the substrate's pullback-detection is *complete*.
  Every base-change worth detecting is generated by compositions of the four predicate-category generators.
  The four common cases — jurisdiction, shard, delegation, succession — *are* compositions of generators (jurisdiction = specialization on a sub-domain; shard = subject-projection along a partition function; delegation = specialization on an authority slice; succession = converse on the predecessor relation).
  Less-common cases (temporal restrictions, consumed-budget-class splits) are also compositions; the substrate need only verify that the new case decomposes into the four generators.

- **Q11 (per-pair Čech-cocycle implementation):** pypredcalc-primitive is correct.
  BC reduces to cellwise pullback in $\mathbf{IndexMap}(E)$ via Part I; the cellwise computation is the substrate's natural primitive.
  A separate verification library is structurally redundant.

> The predication-hyperdoctrine's Beck–Chevalley argument is unusually direct because of the uniform-fiber-algebra construction: in classical hyperdoctrines with fiber $P(X)$ varying by type $X$, BC involves non-trivial naturality of sub-object formation across pullback.
> Here the fibers are uniformly $\mathbf{L}^{\bowtie E \times E}$, and reindexing is cellwise; BC reduces to cellwise index-map pullback, which is immediate.

### Twisted Beck-Chevalley: $\leq_k$-axis only

The [twisted-beck-chevalley theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md) extends BC to gauge-twisted reindexings via [gauge-twisted reindexing](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/gauge-twisted-reindexing.md) — but **only for the $\leq_k$-preserving subgroup $K_4^{\,k} = \{e, {\sim}\}$**.
The $\leq_t$-axis with $K_4^{\,t} = \{e, -\}$ *fails*, and full-$K_4$ also fails.

The obstruction is structural and decidable.
For $g \in K_4^{\,k} = \{e, {\sim}\}$:

1. **Order preservation.** Both elements are $\leq_k$-monotone, so they admit themselves as $\leq_k$-self-adjoints.
2. **Bottom preservation.** Both elements fix $\bot$, so they commute with extension-by-$\bot$ used by $\exists_f^k$ on specialization.

For $g$ involving $-$ (negation/conflation), $-(\bot) = \top$ converts extension-by-$\bot$ into extension-by-$\top$, which corresponds to $\forall_f^k$ rather than $\exists_f^k$.
The Part III commutation fails at exactly this step.

This decisively answers questions Q5, Q18, and Q30:

- **Q5 (gauge-twisted reindexing for normative-shift delegations):** twisted reindexing is structurally available for the *epistemic frame-flips* (∼-twists: knowledge swap) but **not** for *factual polarity reversals* (—-twists).
  Delegations carrying epistemic perspective shifts (one office's view of "true" is another office's view of "false" by frame convention) admit twisted-BC.
  Delegations carrying factual conflation (where "told true" must be re-interpreted as "told both" or "told nothing") *do not* — the substrate must reject these or treat them as boundary discontinuities.

- **Q18 (twisted-BC detection cadence):** auto-detection is decidable from the participant's authority-fragment.
  The substrate inspects the type-shift's bilattice action on the predicate-fiber: if the action lies in $K_4^{\,k}$, twisted-BC applies; if it includes any $-$-component, twisted-BC fails *by structural obstruction*, not by policy.
  Closure rule `detect-practice-axis-twist` is a finite-case-check on the gauge value's bilattice action.

- **Q30 (twisted-BC on practice-axis shifts):** the control-architecture and interaction-topology shifts (centralized → distributed; metric-neighbor → topological-neighbor) carry normative-shift, but the substrate must check whether that shift is $\leq_k$-axis (e.g., epistemic-perspective change at constant ground truth) or $\leq_t$-axis (e.g., factual polarity reversal).
  Only the former admit twisted-BC.
  The current corpus does not have a coherent full-$K_4$ twisted-BC theorem; that is open work in [curvature from pseudo-functorial connections](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/questions/curvature-from-pseudo-functorial-connections.md).

### CRDT convergence via Mayer-Vietoris is structurally unconditional

The [crdt-convergence-via-mayer-vietoris theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-via-mayer-vietoris.md) proves: for every replica cover $(q, \tau, U = U_1 \cup U_2)$, the Mayer-Vietoris connecting homomorphism

$$\delta^0 : H^0(U_1 \cap U_2, \mathcal{F}_U) \to H^1(U, \mathcal{F}_U)$$

**is identically zero.** The proof rests on extension-by-zero on the symmetric difference $U_1 \triangle U_2$, which is canonically defined for the free-abelian-group sheaf $\mathcal{F}_U$.
Combined with the [cohomological-CALM theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/cohomological-calm.md), $\delta^0 = 0$ holds *abstractly* in the strict and Scott-continuous regimes — without needing the explicit construction.

This answers Q11 (per-pair Čech-cocycle): pairwise vanishing is *automatic* for the settling-associated sheaf in strict/Scott-continuous regimes; the substrate need not compute it.
The computation is needed only for richer sheaf-coefficients (constant-sheaves $\underline{A}$, finite-coefficient variants — the larger class for which the same vanishing holds).

It also answers Q24 (cross-ontology Mayer-Vietoris computation cost): pairwise vanishing extends by induction to every finite family of replicas, yielding coordination-free merge structurally.
Higher-order obstructions are absent in strict/Scott-continuous regimes; pairwise sampling captures everything in those regimes.

### Four-regime cohomology concentration

The [four-regime-dichotomy theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md) establishes the decisive concentration result:

> The cohomological content is concentrated in the transfinite-bounded and aperiodic regimes; the strict and Scott-continuous regimes have $H^1 = 0$ for the [settling-associated sheaf](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-associated-sheaf.md).

Three load-bearing consequences:

1. **The simplicity cap ($H^n = 0$ for $n \geq 2$)** is structural for strict/Scott-continuous fragments.
  The closure-rule-language fragment determines which regime a discipline operates in; bare $\Pi_1+<$ rules give strict/Scott-continuous, hence $H^1 = 0$ structurally.

2. **Per-substrate aggregate $H^1$ as quality metric (Q22)** is meaningful *only* for transfinite-bounded/aperiodic disciplines.
  For strict/Scott-continuous disciplines, $H^1 = 0$ by structure — no quality signal.
  The substrate-resident `discipline-h1-rank-by-stage` measurement should declare its regime; quality-comparison across regimes is not a uniform metric.

3. **Per-type-shift $H^1$ (Q17)** is the most diagnostic: each type-shift's regime determines whether $H^1$ is structurally zero (strict/Scott-continuous shifts are "free" — coordinate refinements of an existing fiber) or live (transfinite-bounded/aperiodic shifts genuinely add cohomological content).

### Multi-observer disagreement via bilattice network-sheaf consensus

The [multi-observer-system object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md) is a functor $V : O \to \mathrm{Settlings}_B$.
Consensus is the limit; disagreement is $H^1(O, \mathcal{V})$.
The [bilattice-network-sheaf-consensus theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md) lifts this to the d-frame level:

- **D-frame consensus.** $\lim_{\sigma \in \hat G} \mathbb F_{V_G}(\sigma) \in \mathbf{dFrm}$ is the consensus d-frame, with $L_+, L_-$ from componentwise consensus and $\mathrm{con}, \mathrm{tot}$ from largest-relations-making-projections-into-d-frame-morphisms.
- **D-frame disagreement-join.** Cellwise $\vee_k$ over agents has $\mathrm{con}$ failing exactly at $(\mathbf{t}, \mathbf{f})$-disagreement loci where both $L_+$ and $L_-$ co-witness the same cell. **The con-failure cells are exactly the $\top$-cells of the joint settling**, recording the disagreement.
- **Componentwise Mayer-Vietoris vanishing.** $\delta^0_\pm = 0$ on each shadow component for every replica cover.

This answers Q1 (cover-presentation choice) decisively: the multi-observer system's category $O$ is the cover; for an agent graph $G$, $\hat G$ is the incidence poset and the sheaf $\mathbb F_{V_G}$ is the d-frame-valued network sheaf.
The cover-record schema is the agent-graph incidence structure.

The con-failure-as-$\top$ identification answers Q6 (BC-failure cell-class): $\top$-cells *are* the structural cell-class for disagreement; a separate `bc-failure` cell-class is structurally redundant — disagreement is recorded by the bilattice's con-failure relation, projected to the substrate's $\top$-cells.

### Equivariant cohomology decomposition: $H^1$ splits into 4 isotypic sectors

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) decomposes the settling cohomology along the four characters of $\widehat{K_4}$:

$$H^1(\mathbf{T}^*, \mathcal{F}_v) \cong H^1_\mathrm{id} \oplus H^1_{\chi_\sim} \oplus H^1_{\chi_-} \oplus H^1_{\chi_{\sim\circ-}}$$

with each summand $H^1_\chi \cong \bigoplus_{\mu \in L_\mathrm{ns}(\kappa)^\chi} \mathbb{Z}$ generated by NSC firings in sector $\chi$:

- $H^1_\mathrm{id}$: symmetric truth-plus-falsity sector; invariant under all $K_4$ actions.
- $H^1_{\chi_\sim}$: truth-side and falsity-side firings; ${\sim}$-antisymmetric (epistemic-frame disagreements).
- $H^1_{\chi_-}$: $\top$-firings; $-$-antisymmetric (consistency-failure events).
- $H^1_{\chi_{\sim\circ-}}$: mixed firings; antisymmetric under both ${\sim}$ and $-$ (double-curvature events).

This decisively answers Q17 (per-substrate-aggregate $H^1$ vs per-domain $H^1$ vs per-type-shift $H^1$): the most-diagnostic per-type-shift $H^1$ is *structurally a 4-vector* $(|L_\mathrm{ns}^\mathrm{id}|, |L_\mathrm{ns}^{\chi_\sim}|, |L_\mathrm{ns}^{\chi_-}|, |L_\mathrm{ns}^{\chi_{\sim\circ-}}|)$, not a scalar.
The four sectors carry orthogonal structural information:

- High $|L_\mathrm{ns}^{\chi_\sim}|$: many epistemic-frame disagreements — different observers see different truth values without inconsistency.
- High $|L_\mathrm{ns}^{\chi_-}|$: many $\top$-cells — substrate has paraconsistent inconsistencies.
- High $|L_\mathrm{ns}^{\chi_{\sim\circ-}}|$: many double-curvature events — observers disagree AND produce inconsistencies simultaneously.
- High $|L_\mathrm{ns}^\mathrm{id}|$: high "symmetric" curvature — content present on both truth and falsity sides at NSC firings.

**Equivariant Gauss-Bonnet** gives four conservation laws — one per sector — that sum to the total Euler characteristic $\chi(v) = |\mathrm{Apex}_v| - |L_\mathrm{ns}(\kappa_v)|$.
The substrate's `discipline-h1-rank-by-stage` measurement should report all four sector counts; collapsing to a scalar $|L_\mathrm{ns}|$ loses the *structural* shape of the discipline's curvature.

This refines the strong-MLD invariant: **two settlings are MLD-equivalent iff they have the same isotypic decomposition** $(|L_\mathrm{ns}^\chi|)_{\chi \in \widehat{K_4}}$.
The 4-vector IS the strong-MLD class.

### Truth-knowledge cohomology long exact sequence: consistent ⟺ cohomologies agree

The [truth-knowledge-cohomology-long-exact-sequence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md) gives the LES

$$\cdots \to H^{n-1}(\mathcal{F}_U^{(\top)}) \to H^n_t(\mathcal{F}_U^{(t)}) \to H^n_k(\mathcal{F}_U^{(k)}) \to H^n(\mathcal{F}_U^{(\top)}) \to \cdots$$

with $\mathcal{F}_U^{(t)}$ truth-order, $\mathcal{F}_U^{(k)}$ knowledge-order, $\mathcal{F}_U^{(\top)}$ inconsistency.
Two structurally distinct cases:

- **Consistent settling** ($\mathcal{F}_U^{(\top)} = 0$): LES collapses to $\iota^n : H^n_t \xrightarrow{\sim} H^n_k$.
  Truth-order and knowledge-order cohomologies *coincide*.
- **Inconsistent settling** ($\mathcal{F}_U^{(\top)} \neq 0$): the two cohomologies *genuinely differ*; $H^n(\mathcal{F}_U^{(\top)})$ counts and classifies the inconsistencies.

This gives the substrate a *cohomological consistency test*: `compute-h1-truth-vs-h1-knowledge`.
If the two agree, the substrate has no $\top$-cells in the audit window.
If they disagree, the gap is precisely $H^n(\mathcal{F}_U^{(\top)})$ — the inconsistency-cohomology, which is the structural register of multi-observer disagreement (per [bilattice-network-sheaf-consensus](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md)).

The audit-projector should emit *both* truth-cohomology and knowledge-cohomology cell-counts per audit-export period.
Their gap IS the cohomological measure of paraconsistent inconsistency — Belnap's "the community is inconsistent on this claim" given a quantitative shadow.

### Settling cohomology vanishes above degree 1 — *under the standard predicate-category hypothesis*

The [settling-cohomology-vanishes-above-degree-1 theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-cohomology-vanishes-above-degree-1.md) proves $H^n(\mathbf{T}^*, \mathcal{F}_U) = 0$ for $n \geq 2$ — *under the load-bearing hypothesis* $\mathrm{cd}(\mathcal{C}^\mathrm{op}) \leq 1$.
The hypothesis holds for:

- Finite $\mathcal{C}$.
- Directed-poset $\mathcal{C}$ (cohomological dimension 0).
- $\mathcal{C}$ built from the four predicate generators ([specialization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md), [converse](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-converse.md), [subject-projection](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-subject-projection.md), [object-projection](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-object-projection.md)) on a finite predicate set.

The corpus surfaces an explicit counterexample direction:

> If $\mathcal{C}$ has order-complex dimension $\geq 2$ — e.g., a 3-chain $p_0 \to p_1 \to p_2$ with morphisms not factoring through the four predicate generators — then $H^2(\mathcal{C}^\mathrm{op}, A)$ can be non-zero for general coefficients $A$, and the conclusion may fail.

This decisively answers Q13 (override granularity for the simplicity cap): the simplicity cap is **structural** under the standard predicate-category structure, but the polity must *re-verify* the cohomological-dimension hypothesis whenever it adds higher-arity predicates, modal operators, or new morphism classes that don't factor through the four generators.
The substrate-resident closure rule `verify-predicate-category-cd-bound` should fire on any extension to $\mathcal{C}$ that introduces non-generator morphisms, and refuse rules anticipating $H^n$ for $n \geq 2$ unless the operator has explicitly attested the cohomological dimension.

Per-rule override (each $H^2$-anticipating rule individually approved) is the conservative path because the *hypothesis* is rule-specific (depends on which $\mathcal{C}$-extensions the rule needs); blanket override loses the structural protection.

### Verdier duality: $\top$-firings are self-dual; truth ↔ falsity exchange

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), combined with the d-frame's value-category negation, gives a *composed duality* $\mathbb{D} = \mathbb{D}_\mathrm{sp} \circ \mathbb{D}_\mathrm{val}$ with three structural cases per the [aperiodic-co-classification theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md):

- **Self-dual ($\mathbb{D}$-fixed) orbits:** settlings whose firings are all $\top$-firings.
  The pure paraconsistent stratum.
- **Exchange-paired ($\mathbb{D}$-orbit-of-size-2) orbits:** settlings with truth-only or falsity-only firings, paired with their negation.
- **Mixed orbits:** settlings with both $\top$- and asymmetric firings.

This refines the cohomological-coordination question's per-type-shift $H^1$ measurement (Q17): each type-shift's classifying invariant has a $\mathbb{D}$-orbit type that distinguishes paraconsistent (self-dual) shifts from epistemic-frame shifts (exchange-paired) from mixed shifts.
The substrate-resident `compute-d-orbit-type-per-shift` closure rule classifies the shift's structural character from its $H^1$ data.

### Mutually-locally-derivable: the audit's quotient

The [mutually-locally-derivable concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md) is the equivalence relation classified by $H^1$:

> Two aperiodic settlings $v, v'$ are MLD-equivalent iff there exists an invertible settling-morphism $v \to v'$.
> MLD includes settling-shift; it does NOT include arbitrary relabeling — the morphism must commute with both settlings' endofunctors, so any equivalence respects the structural closure pattern.

For audit-projection (Q12 audit granularity, Q26 accretion-trajectory cohomological signature publication): the audit-projector quotients by MLD before reporting.
Two audit-export periods with MLD-equivalent settlings are reported as *the same* cohomological state — settling-shift and structure-preserving relabelings are not material to the audit. **The audit reports MLD-classes, not raw settlings.** This collapses noise (same content, shifted ordinal index) without losing structural disagreement.

### Temporal Beck-Chevalley: 2-categorical BC across time

The [temporal-beck-chevalley theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/temporal-beck-chevalley.md) extends BC to the [temporal 2-category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/temporal-2-category.md) $\mathbf{T}(\mathcal{C}, \lambda)$: every pseudo-pullback square has an invertible 2-cell BC iso.
Regime-dependent simplification:

- **Strict regime:** 2-cells trivialize; $\mathbf{T}(\mathcal{C}, \lambda)$ collapses to $\lambda$ as a 1-category.
  Theorem reduces to 1-categorical BC.
- **Aperiodic regime:** 2-cells essential.
  Cohomological constructions targeting aperiodic settlings need pullback/pushforward sheaf coherence on the temporal 2-category; this is the input.

For the audit-projector's BC-verification cadence (Q3, Q16): in strict/Scott-continuous fragments, 1-categorical BC suffices and per-tick-batched verification is correct.
In transfinite-bounded/aperiodic fragments, the substrate must use 2-categorical BC, and the verification cadence aligns with the closure-ordinal stages — eager verification at each ordinal level $\rho'$ where pseudo-pullback computations are translated.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Cover-presentation choice.** **Theory: agent-graph incidence poset.** The multi-observer system's category $O$ is the cover; for a federated polity, $O$ is the federation peer graph; for cross-ontology MV, $O$ is the union of method-ontologies' incidence posets.
  Substrate-resident cover relations supporting pullback are the incidence morphisms.
2. **Quorum-threshold vs full-agreement.** Full-agreement gives $\delta^0 = 0$; quorum-threshold (e.g., 2/3) is a separate substrate-policy that picks one section from disagreement.
  Commit per agreement-context.
3. **BC verification cadence.** Eager (per cell-write across pullback boundary) catches conflicts immediately; lazy (defer to audit-export) is cheaper.
4. **Pullback-detection scope.** The four common base-changes (jurisdiction, shard, delegation, succession) are well-defined; less-common cases (temporal restrictions, consumed-budget-class splits) may also be pullback squares.
5. **Gauge-twisted reindexing.** Delegations carrying normative-shift need the twisted variant.
6. **BC-failure cell-class.** `⊤` (consistent with [M2](../work/milestones/m2-substrate-dispatch.md)'s contradiction discipline) vs separate `bc-failure` cell-class.
  First is structurally consistent; second more diagnostic.
7. **Detection-rule scope.** Simplest is "reject any rule body containing `consensus(consensus(...))
  ` substring or substrate-cell-graph analogue."
  Sophisticated detection requires a small static analyzer reading the rule's reduced shape.
8. **Dimensionality of commitment graph.** 2D (Laman) is simplest; 3D requires redundant Laman graphs; higher dimensions require more general rigidity matroids.
  For polity commitment graphs, 2D is probably right.
9. **Allowed rigid-motion set.** Renaming, person-reassignment, non-causal reordering — which transformations does the polity stipulate as substrate-irrelevant?
  Charter-level decision.
10. **Laman-test computation cost.** Generic-rigidity in 2D is computable in $O(n^2)$ time (Berg-Jordán 2003); 3D harder.
  For polities of $\sim 10^2$–$10^3$ entities, manageable.
  Run in precheck path, not audit-export.
11. **Per-pair Čech-cocycle implementation.** pypredcalc-primitive vs separate verification library.
  First more substrate-coherent.
12. **Audit granularity.** Every assignment-cell-firing auditable as $H^0$-section?
  Substrate-wide audit (whole substrate as single Alexandrov cluster)?
  First is local; third may have prohibitive $O(N^2)$ cost.
13. **Override granularity for the simplicity cap.** Per-rule (each $H^2$-anticipating rule individually approved) vs blanket override for an exploration session.
14. **Decision-class mapping commitment.** Tick-driving → leader-election; ratification → quorum; dispatch contention → distributed-lock; peer churn → cluster + failure-detection.
  Make explicit per-scope before [M6](../work/milestones/m6-federation.md) ships.
15. **Predication-ontology-record authoring discipline.** Whether each domain authors its own ontology-record (manufacturing, governance, code, math) with declared type-shifts and BC-commutation witnesses, or the substrate auto-derives the ontology from frontmatter type discipline.
  Auto-derivation is more substrate-coherent; explicit authoring is more reviewable.
16. **BC-commutation verification cadence on type-shifts.** Per-rule-firing (eager; catches generalization failures immediately at substantial cost), per-tick (batched), per-export (cheapest, defers diagnostics).
  Per-tick aligns with closure-rule firing pattern.
17. **$H^1$-rank as ontology-quality metric scope.** Per-substrate aggregate $H^1$ vs per-domain $H^1$ vs per-type-shift $H^1$.
  Per-type-shift is most diagnostic; per-substrate is the headline number; per-domain enables comparison across PyFARS-realized domains.
18. **Twisted-BC detection.** When does the substrate require twisted BC vs vanilla BC for a type-shift?
  Manual declaration (twist field on type-shift-morphism record) vs auto-detection (substrate inspects predicate-fiber's normative content for shift).
  First is reliable; second reduces authoring overhead.
19. **OPC-UA SPARQL endpoint exposure via M8.** Whether the substrate's `predication-ontology-record` cells are exposed as SPARQL-callable directly (via mcp-rdf-explorer-shaped MCP server) or only via the substrate's own pyfars CLI.
  Both is the substrate-coherent default.
20. **Foreign ontology import.** Importing OPC-UA NodeSets from external industrial systems (Siemens MindSphere, Hitachi HMAX) into PyFARS substrate cells — wholesale import (lighter), or per-NodeSet authored as substrate-cell with closure-rule transport (substrate-coherent).
  First lets the polity rapidly absorb existing ontologies; second integrates them into the substrate's algebra.
21. **Method-ontology import scope and conflict resolution.** When two ontologies (e.g., EXPO and OBI) cover overlapping disciplines (experimental biomedicine), conflicts are inevitable.
  Whether the substrate auto-merges via BC-commutation analysis (substrate-coherent) or requires per-conflict captain-attestation (lighter-substrate but heavier-governance).
  First aligns with the predication-fibration's discipline.
22. **Four-axis-orthogonality verification cadence.** When a new ontology is imported, `verify-four-axis-orthogonality` checks the decomposition.
  Whether the check fires once at import time (cheap) or continuously per-substrate-tick (catches drift if the imported ontology version-bumps).
  Per-import-with-drift-detection is the practical compromise.
23. **REPRODUCE-ME-style 2-resolution adoption.** The four-axis pattern with 2-resolution (structural + operational sub-components) gives 8 components.
  Whether PyFARS adopts this 2-resolution as default for substrate-cell decompositions (more granular; explicit operational sub-components) or keeps the 4-axis as the canonical level.
  4-axis canonical with 2-resolution as opt-in via `axis-resolution: 2` field is the lightest-touch.
24. **Cross-ontology Mayer-Vietoris computation cost.** `aggregate-cross-ontology-bc-commutation` requires computing the joint $H^1$ on cross-ontology unions; this is exponential in the worst case.
  Whether to scope to pairwise (lower cost; misses higher-order obstructions) or full joint (correct but expensive).
  Pairwise + sample-higher-order is the practical compromise.
25. **Discipline-h1-rank-by-stage measurement reliability.** Computing $H^1$ rank requires enumerating cross-axis-reasoning obstructions, which depends on which axis-shifts the substrate has declared.
  Sparse-axis-shift declarations produce artificially-low $H^1$ measurements.
  Whether to require complete-axis-shift declaration for $H^1$ measurement to be valid (substrate-resident closure rule `verify-axis-shift-completeness`).
26. **Accretion-trajectory cohomological-signature publication.** Per-discipline $H^1$-rank-by-stage trajectories are substantive evidence of polity maturation.
  Whether to publish per-discipline trajectories in audit-export (per [governance question](governance-charter-and-accountability.md)'s [M11](../work/milestones/m11-assurance-audit-chain-export.md) discipline) or keep polity-internal.
  Audit-export inclusion supports the "polity-as-comprehensive-method-ontology external publication" question in the governance file.
27. **Seven-axis taxonomy adoption discipline.** The seven-axis embodied-participant taxonomy refines the four-axis pattern (3-resolution on identity, 2-resolution on practice, 1-resolution elsewhere).
  Whether the substrate auto-detects the asymmetric resolution (substrate inspects which axes have multi-component refinement) or requires explicit declaration.
  Auto-detection is substrate-coherent; explicit is more reviewable.
28. **Asymmetric-resolution generality.** The seven-axis pattern's asymmetric resolution (3 on identity, 2 on practice) reflects embodied-participant information density.
  Whether other domains (governance, mathematics, code) exhibit different asymmetric-resolution patterns, and whether the substrate measures resolution-per-axis-per-domain to detect the structural shape of each domain.
29. **Refined-axis BC-commutation cost.** Each refinement (3-resolution, 2-resolution) multiplies the type-shifts that must be checked for BC-commutation.
  Computational scope: pairwise within axis (cheap; misses cross-axis-cross-resolution shifts) vs full Cartesian (correct but expensive).
  Hybrid: pairwise within-axis as default + sample-cross-axis-cross-resolution.
30. **Twisted-BC-detection on practice-axis shifts.** The control-architecture and interaction-topology shifts (centralized → distributed; metric-neighbor → topological-neighbor) carry normative-shift; require gauge-twisted BC.
  Substrate-resident closure rule `detect-practice-axis-twist` flags shifts requiring twisted BC; closure-rule-decidable from the participant's authority-fragment.
