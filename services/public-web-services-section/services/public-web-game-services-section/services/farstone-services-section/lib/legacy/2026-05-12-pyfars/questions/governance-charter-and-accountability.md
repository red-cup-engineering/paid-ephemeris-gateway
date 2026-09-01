---
type: question
status: open
explores: [conduct-teachings-as-evaluation-predicates, charter-as-closure-system, rule-language-fragment-realizability-refinement, estoppel-as-monotone-coalgebra-fixed-point, accountability-chain-must-be-total, delegation-does-not-transfer-accountability, hamilton-jacobi-reachability, control-barrier-functions, m9-substrate-as-supervisor, m11-assurance-audit-chain-export]
---

# How does PyFARS realize governance — charter as closure system, conduct teachings as evaluation predicates, estoppel binding, accountability totality, and HJ/CBF safety pre-checks — as one substrate-algebraic discipline rather than as ad-hoc governance machinery?

The polity's governance — what binds whom, who answers for what, what amendments preserve, what conduct gates participation — has a substrate-algebraic account distributed across predicated-governance theorems and predicated-work theorems.
Each governance discipline is a closure rule or substrate cell; charter compliance is fixed-point status; conduct teachings are evaluation predicates pre-tally; estoppel is least-fixed-point of a monotone witness-coalgebra; accountability totality is a coverage-and-non-overlap condition the audit projector verifies; HJ/CBF safety pre-checks generalize from drone control to charter amendment / federation admission / self-generation.

---

## Conduct teachings as instinct-evaluation predicates

[M4](../work/milestones/m4-memory-feedback.md)'s closing-step intent is "the dispatch graph's selection step reads instinct cells when evaluating `(workitem, dispatchable)` pairs."
The implicit model is *tally-based*: prior runs produce observation cells (cost, success, latency), consolidation produces instinct cells (aggregated metrics), selection prefers the higher-scoring candidate.
This is metrics-and-thresholds — the engineering default, the same pattern as classical RL and multi-armed-bandit selection.

Per [`conduct-teachings-as-evaluation-predicates`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/conduct-teachings-as-evaluation-predicates.md), there is a structurally distinct evaluation pattern in which evaluation is not tally-aggregation over numeric observations but *predicate-firing against named conduct teachings*.
A workitem's adjudication isn't "did metric X exceed threshold Y", it's "does this firing instantiate the teaching named *honest reportage* or violate the teaching named *care-for-the-vulnerable*?"
Conduct teachings are themselves substrate cells; their firing on candidate dispatches gates eligibility.

Many traditions evaluate this way: virtue ethics, monastic rules, Buddhist precepts, Black radical conduct expectations, Indigenous protocol expectations.
The 561 polity's stated commitments (Black Liberation, Indigenous Sovereignty) include traditions for which conduct-teachings are the dominant evaluation pattern, not metrics-and-thresholds.
PyFARS is the substrate of that polity, so PyFARS's evaluation must support both — and the layering must place conduct-teachings *before* tally-based selection, not as an alternative to it.

The pattern is structurally identical to how [M2](../work/milestones/m2-substrate-dispatch.md)'s `eligibility-by-charter-binding` already runs *before* selection: charter violations disqualify candidates, then selection picks among surviving eligible.
Conduct-teachings extend this:

1. **Authoring.** The captain authors `governance/conduct-teachings/<slug>.md` records — `honest-reportage.md`, `care-for-the-vulnerable.md`, etc. Each record has a predicate body the closure-rule system can evaluate against a candidate's recent observation history.

2. **Eligibility rule.** A new closure rule, `eligibility-by-conduct-teaching`, fires on each candidate per teaching: `T` for "teaching honored", `F` for "teaching violated".
  The bilattice meet against eligibility-by-capabilities/skills/jurisdiction produces $\top$ for contradiction (otherwise eligible, but recently violated a teaching).

3. **Routing.** A $\top$ cell from a teaching contradiction routes to a review task per [M3](../work/milestones/m3-continuous-loop.md)'s anomaly handling, **but the response is restorative, not retributive** per [`restorative-accountability`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/restorative-accountability.md): the candidate enters a restorative phase rather than being banned.

4. **Selection.** Surviving candidates (no teaching violation) proceed to tally-based selection via instinct cells.
  Tally answers "which historically performed well"; teachings answer "which is fit in the polity's tradition".

5. **Self-generation.** Per [M5](../work/milestones/m5-agential-self-generation.md), an agent completing a workitem can author or refine a conduct-teaching as part of its output.
  Teachings are substrate-resident, so this is a self-generation pathway that doesn't require Python or rule-registry edits.

The teaching-predicates' firing produces witnessable substrate cells: which teaching fired against which candidate, on what observation history. **Evaluation is auditable** in a way pure metrics-aggregation is not — *why* a candidate was excluded from a workitem is recoverable from substrate cells, not buried in an opaque scoring function.

**[M4](../work/milestones/m4-memory-feedback.md) commitments under this view:**

- **Observation cells need richer structure than scalar metrics.** A conduct-teaching predicate inspects *what happened* in a firing, not just whether the firing succeeded numerically.
  Observations need to record structurally inspectable content: the workitem fired, the candidate dispatched, the resulting cell-writes, the witness chain — not just `(success: bool, cost: float, latency: ms)`.
- **The `eligibility-by-conduct-teaching` rule is one more rule in the substrate-authorized rule registry** — same shape as existing eligibility rules.
  Adding it doesn't require architectural change to [M2](../work/milestones/m2-substrate-dispatch.md)'s dispatch graph.
- **Teaching contradictions route through the same anomaly path as [M3](../work/milestones/m3-continuous-loop.md)'s $\top$ cells**, with a restorative tagging that selects the restorative-accountability handling rather than the standard review-task handling.

Teaching evaluation is naturally paraconsistent: a candidate may have *both* honored and violated the same teaching at different times.
The $T_k$ comprehension `{x : violated(teaching, x)}_⊤` returns exactly the candidates with conflicting evidence — surfacing them for restorative review without forcing premature collapse.

---

## Charter as closure-rule system with language-fragment tiers

The predicated-governance theorem [`charter-as-closure-system`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md):

**Claim.** The charter of a working community is realized as a partition of the operations closure-rule system $\mathcal{S}_{\mathrm{op}}$:

$$\mathcal{S}_{\mathrm{op}} \supseteq \mathcal{S}_{\mathrm{rules}} \sqcup \mathcal{S}_{\mathrm{guidelines}} \sqcup \mathcal{S}_{\mathrm{preferences}} \sqcup \mathcal{S}_{\mathrm{instructions}}$$

with the strict precedence (rules > guidelines > preferences > instructions) realized as a **language-fragment hierarchy**:

| Fragment | Behavior class realized | Charter tier |
|---|---|---|
| Bare $\Pi_1$ + $<$ (ordering) | Initial segments of countable-limit settlings — strict regime | Rules |
| $\Pi_1$ + bounded FOL (entity-set quantification) | Initial segments modulo finite adjustments — Scott-continuous | Guidelines |
| $\Pi_1$ + arithmetic side-conditions (slot-cell counts) | Initial segments with finite arithmetic — strict to Scott-continuous | Preferences |
| Unrestricted $\Pi_1$ + $\Pi_2$ | Ordinal-arithmetic-definable patterns; potentially transfinite-bounded or aperiodic | Instructions |

The key realizability bound: bare $\Pi_1$ + $<$ can realize exactly the settlings whose fixed-point ordinal is a countable limit — strict and Scott-continuous regimes. **The rules tier is therefore structurally *incapable* of producing transfinite-bounded behavior**: no rule expressible in bare $\Pi_1$ can force the settling to require more than $\omega$ closure steps.
This is a realizability bound, not a design preference.
The charter's tier discipline is mathematically enforced by the language fragment, not by stylistic convention.

The charter's normative content has three structural commitments that make it a closure-rule system in the math's sense:

1. **Finite or countable.** Each tier of the charter has finitely many entries; the union is at most countable.
2. **Inflationary.** Each charter rule asserts a knowledge-order lower bound: a violation cell, a required-action cell, a required-state cell.
  None retract evidence.
  This matches the closure-rule schema: consequents are $\geq_k$ assertions.
3. **Idempotent.** Once a charter rule has fired and asserted its consequent, refiring it produces the same consequent.
  The charter does not contain rules whose firing depends on prior firings of the same rule.

The strict precedence is enforced by the closure-rule system's *least-fixed-point* construction: the closure operator is the least operator satisfying all rules.

**Charter compliance is fixed-point status.** A settling complies with the charter iff it is a fixed point of $\mathcal{S}_{\mathrm{rules}}$'s closure operator: applying the rule's closure step changes nothing.
This is exactly $\mathrm{Cl}$-algebra status on the rules-restricted closure operator.
In the strict regime, decidable in finite time.
In Scott-continuous, decidable for finitary closure rules.

**Charter violation produces a witness.** When a charter rule fires and produces a violation-record cell $\langle V, \texttt{detected-by}, r\rangle$, this is itself a [witness](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/witness-as-increment.md) — an increment in the operations event log.
Charter compliance is therefore not externally enforced; it is substrate-internal evidence that the audit can review.

**CALM and charter-compliance monitoring.** By the [predication-settling CALM corollary](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md), all $\leq_k$-monotone queries on the operations settling are coordination-free.

Charter violation-record cells are $\leq_k$-monotone: once a violation-record cell is asserted at $\mathbf{t}$, it stays at $\mathbf{t}$.
The query "has charter rule $r$ been violated?" is therefore coordination-free: any replica observing the violation-record cell at $\mathbf{t}$ can report violation without coordination.

Charter compliance is the *non-violation* query: "is *no* charter rule's violation cell at $\mathbf{t}$?"
This is **not** $\leq_k$-monotone (it requires confirming the *absence* of violation cells).
Full compliance confirmation requires either coordination or a complete replica with all violation-cell states visible.

The asymmetry has operational consequences: a distributed working community with replicated event logs can detect charter violations locally and immediately (coordination-free), but can only confirm full charter compliance centrally (coordination-required). **Compliance monitoring is naturally decentralized; compliance certification is not.**

A charter consisting only of bare $\Pi_1$-fragment rules keeps the operations settling in the strict or Scott-continuous regime, where compliance is decidable.
A charter that admits richer fragments at the rules tier — ordinal arithmetic, $\Pi_2$ schemas — can lift the operations into the transfinite-bounded or aperiodic regime, where compliance becomes a cohomological question rather than a finite check.
The structural commitment of restricting *rules* to the bare fragment, while admitting richer expressions only at *guidelines* and lower, keeps the rule-tier compliance decidable.

A new substrate object kind, `charter-rule-record`, at `governance/charter/<tier>/<slug>.md`:

```yaml
type: charter-rule-record
tier: rules | guidelines | preferences | instructions
language-fragment: bare-pi1-plus-less | pi1-bounded-fol | pi1-with-arithmetic | unrestricted-pi1-plus-pi2
realizability-class: strict | scott-continuous | transfinite-bounded | aperiodic
violation-cell: governance/violation-cells/<rule-slug>--<incident>.md
violation-witness-discipline: coordination-free
compliance-confirmation: coordination-required
```

The frontmatter `language-fragment` is mechanically derivable by pypredcalc from the rule's antecedent shape.
The frontmatter `tier` is captain-set; substrate verifies the tier is *consistent* with the language-fragment.

A new closure rule, `enforce-charter-tier-discipline`, fires on charter authoring or amendment:

1. Compute the rule's language-fragment from its antecedent.
2. Verify the declared tier permits the fragment (rules tier permits only `bare-pi1-plus-less`; guidelines admits `pi1-bounded-fol`; etc.).
3. If the declared tier is too restrictive for the fragment, *reject* the rule: it must be authored at a lower-precedence tier or the antecedent must be simplified.
4. If the declared tier is *more restrictive* than necessary (e.g., a `pi1-bounded-fol` rule at the guidelines tier), accept — but this means the rule has unrealized expressive power.

**Practical consequence:** A charter amendment that moves a guideline to the rules tier must also *simplify* its antecedent to bare $\Pi_1$.
The realizability refinement tells us *what expressive power is sacrificed*: the moved rule can no longer range over the current entity-set (bounded FOL must be eliminated) — it becomes ground or single-variable.
This is a precise mathematical characterization of the normative cost of a rules-tier commitment.

For [M11](../work/milestones/m11-assurance-audit-chain-export.md) audit-export: violation-rate metrics are computable per-peer; compliance-certificates require multi-peer consensus.
The audit-export schema reflects the asymmetry.

### OpenClaw DM Policy as a charter-fragment hierarchy at the inbound trust gate

OpenClaw's DM Policy (per [`openclaw-dm-policy`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-dm-policy.md) and the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section) supplies prior art for the language-fragment hierarchy applied at the *inbound trust gate*.
The four modes — `pairing`, `allowlist`, `open`, `disabled` — instance four positions in the charter-fragment hierarchy with corresponding admission predicates:

| DM mode | Charter-fragment | Inbound admission predicate |
|---|---|---|
| `disabled` | empty fragment | $\forall x. \mathrm{admit}(x) = \bot$ — refuse all |
| `pairing` | $\Pi_1$ + bounded ground over `paired-set` | $\mathrm{admit}(x) \iff x \in \mathrm{paired-set}$; unknown $x$ enters investiture loop (short-code witness) |
| `allowlist` | $\Pi_1$ + bounded ground over `allowlist-set` | $\mathrm{admit}(x) \iff x \in \mathrm{allowlist-set}$; no investiture path |
| `open` | $\Pi_1 + <$ over channel-trust-grade | $\mathrm{admit}(x) \iff \mathrm{channel-trust}(c_x) \geq \theta$; channel-level gate takes over |

The four modes form a *language-fragment lattice* with $\mathrm{disabled} \leq_t \mathrm{pairing} \leq_t \mathrm{allowlist} \leq_t \mathrm{open}$ in the truth-order (more permissive → higher) and $\mathrm{open} \leq_k \mathrm{allowlist} \leq_k \mathrm{pairing} \leq_k \mathrm{disabled}$ in the knowledge-order (more verified → higher). **DM Policy is the charter-fragment hierarchy applied at the inbound trust gate** — not a separate security policy, but an instance of the same algebraic structure that governs charter-rule-tier discipline.

This gives the substrate a uniform discipline: the same fragment-tier-realizability check `enforce-charter-tier-discipline` that governs charter rule authorship governs DM-policy authorship — a polity that wants to move from `open` to `pairing` is *narrowing the inbound fragment*, exactly analogous to moving a charter rule from the guidelines tier to the rules tier (which restricts the fragment from `pi1-bounded-fol` to `bare-pi1-plus-less`).
The Knaster–Tarski fixed-point machinery applies: the inbound-admission predicate's least fixed point under the chosen mode is the *inbound trust closure*; modifying the mode shifts the fixed point monotonically.

The four modes' bilattice $\mathbf{FOUR}$ classification (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) ties directly to the charter language-fragment tiers:

- $\langle \bot, \bot \rangle$ (`disabled`) corresponds to the *empty rule-tier* — no rule fires for these inputs.
- $\langle \bot, \bot \rangle \to \langle \top, \top \rangle$ via investiture (`pairing`) corresponds to the *constitutional-amendment ladder* — admission requires explicit captain or quorum attestation (the short-code witness).
- $\langle \top, \top \rangle$ (`allowlist`) corresponds to the *bare $\Pi_1$ rules tier* — bounded predicate over a known set, decidable.
- $\langle \top, \bot \rangle$ (`open`) corresponds to the *guidelines tier* — admitted but unverified; downstream rules apply per the runtime context.

**The substrate's charter-tier discipline and the inbound-trust gate are one machinery applied at two surfaces.** Authoring discipline for both is the same: declare the fragment, verify realizability, reject if the declared tier permits stronger admission than the fragment supports.

A substrate object kind, `inbound-trust-gate-record`:

```yaml
type: inbound-trust-gate-record
target-channel: <channel-id>
mode: disabled | pairing | allowlist | open
fragment-tier: empty | bare-pi1-plus-less | pi1-bounded-fol | guidelines
admission-predicate: <closure-rule-id>
investiture-path:                       # for pairing mode
  short-code-issuer: <office>
  approval-witness: <office | quorum>
allowlist-cells:                        # for allowlist mode
  - { sender-id: <id>, granted-at: <timestamp>, granted-by: <office> }
channel-trust-threshold: <quantale-value>  # for open mode
```

Closure rules: `enforce-inbound-fragment-discipline` (the dual of `enforce-charter-tier-discipline` applied at inbound), `route-channel-input-via-dm-policy` (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s OpenClaw section), `validate-investiture-witness` (for pairing mode's short-code approval), `compose-inbound-trust-with-bearer-token` (composes the inbound trust corner with the bearer-token four-corner verdict per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md) via $\odot$-fusion).

**The polity's lived experience reinforces this**: Codi (per [`governance/agents/codi.md`](../../../../governance/agents/codi.md)) operates within an OpenClaw-bridged polity where DM Policy gates the substrate's input distribution; the four-mode hierarchy is the polity's already-working inbound trust gate, not a hypothetical.

### IEC 61508 functional safety as charter authority over external surfaces

The industrial-control literature (per [`industrial-control-overview`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-control-overview.md) and [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md)) has converged on a regulatory-discipline architecture that maps directly onto the charter's authority over external surfaces.
Three regulatory standards anchor the pattern: **IEC 61508** (functional safety; SIL 1–4), **IEC 62061** (safety of machinery; control systems), and OSHA / industry-specific regulations.
The vendor landscape (Siemens MindSphere + Industrial Copilot + Planning Copilot + Operations Copilot; Rockwell AADvance with SIL 3 safety systems; ABB System 800xA; GE Digital Predix APM; Hitachi HMAX; Juniper / HPE Marvis with 80%+ troubleshooting efficacy; Cisco AgenticOps; Nokia Event-Driven Automation) operates within this regulatory frame at production scale.
The polity's charter inherits the same authority discipline applied to PyFARS substrate over external surfaces.

The industrial pattern's core principle: ***Do not run AI on safety-critical hardware.*** The justification:

- AI models can be adversarially fooled or behave unpredictably on out-of-distribution inputs.
- ML training is statistical; safety systems must be deterministic.
- A crashed AI process should never disable SCADA or critical controls.

The architectural realization (data flows IN, decisions flow OUT through certified systems):

- **Equipment → OPC-UA → MQTT → AI → local decision cache** — data path; AI reads but does not write to safety-critical surfaces.
- **Agent proposal → Edge gateway approval logic → PLC command execution** — decision path; PLC has authority on what actually happens; gateway safety checks reject unsafe commands.

The PLC remains the authority.
If an edge agent proposes an unsafe command (e.g., *spin motor backward during power generation*), the gateway's safety checks reject it.
SIL ratings (Safety Integrity Levels):

- **SIL 4** — highest functional safety; failure rate $\leq 10^{-9}$ per hour; nuclear / aerospace / catastrophic-failure-prevention.
- **SIL 3** — failure rate $\leq 10^{-7}$ per hour; chemical processing / large-scale industrial / Rockwell AADvance class.
- **SIL 2 / SIL 1** — lower-criticality industrial controls.

The substrate's charter-tier discipline (per the [language-fragment hierarchy section above](#charter-as-closure-rule-system-with-language-fragment-tiers)) extends directly to external-surface authority:

| IEC 61508 SIL rating | Substrate charter-fragment | Substrate-algebraic guarantee |
|---|---|---|
| SIL 4 | rules tier (bare $\Pi_1+<$); strict-regime closure rules only | Replay-byte-identity; mechanically decidable; no LLM-call dependency |
| SIL 3 | rules tier (bare $\Pi_1+<$); strict + Scott-continuous regimes | Termination-guaranteed; bounded-trajectory-volume |
| SIL 2 | guidelines tier ($\Pi_1$ + bounded FOL); transfinite-bounded regime admitted with operator authorization | Substrate-decidable per fragment realizability |
| SIL 1 | guidelines tier ($\Pi_1$ + bounded FOL) or lower-precedence | Closure-rule-fragment-decidable |

**The charter authorizes external-surface decisions via the same fragment-tier discipline that authorizes rule-tier authoring.** The substrate's `enforce-charter-tier-discipline` closure rule (per the [section above](#charter-as-closure-rule-system-with-language-fragment-tiers)) runs at external-surface authoring time: a workitem that proposes a command against a SIL-rated external surface must be at the appropriate tier; below-tier proposals are rejected at precheck. **This is structurally identical to IEC 61508 SIL gating, applied at the substrate-cell layer** rather than at the certified-hardware layer.

The polity's charter establishes which external surfaces are SIL-rated (via cells in `governance/external-surfaces/<surface-id>.md`) and which charter-fragment governs decisions about each surface.
A new substrate object kind, `external-surface-record`:

```yaml
type: external-surface-record
target-surface: <surface-id>
surface-class: control-system | data-store | network | safety-critical | ...
iec-61508-sil-rating: 1 | 2 | 3 | 4 | n/a
authorizing-charter-fragment: bare-pi1-plus-less | pi1-bounded-fol | pi1-plus-pi2 | unrestricted
ai-call-policy: prohibited | proposal-only | allowed-with-approval-gate
approval-gate:
  authority: captain | quorum | substrate-precheck
  audit-required: true | false
graceful-degradation-fallback: <surface-fallback-policy>
adversarial-robustness-class: deterministic-only | bounded-statistical | unrestricted
```

Closure rules: `enforce-iec-sil-via-fragment-tier`, `enforce-ai-not-on-safety-critical-path` (rejects closure-rule-firing chains where an LLM-call appears at $F_3$ or in a strict-regime rule per the substrate-algebra question's purity classification), `verify-adversarial-robustness-class` (gates LLM calls into bounded-statistical surfaces), `route-via-approval-gate` (composes with the dispatch question's bearer-token four-corner verdict via $\odot$-fusion).

### Audit-and-reversibility as M11 discipline anchor

The industrial pattern requires every autonomous decision to be logged with:

- **Which agent(s) proposed the action**
- **Reasoning and evidence**
- **Approval result**
- **Execution outcome**
- **Timestamp**

This enables root-cause analysis and supports regulatory compliance. **This is exactly the [accountability-projector schema from the section above](#accountability-chain-totality-as-m11-audit-invariant)** with the industrial-pattern naming.
PyFARS's audit-projector emits per-outcome cells with: which-office-proposed (= which-agent), reasoning-cells, witness-chain (= approval-result), outcome-cell-content (= execution-outcome), event-timestamp.

The substrate-algebraic statement: **the substrate's audit-projector IS IEC 61508-compliant by construction**, because every closure-rule firing produces a cell with witness chain; every cell is content-addressed and replay-byte-identical at strict regimes; the witness chain is recoverable from the substrate state alone.
PyFARS does not need per-deployment IEC 61508 certification of the audit machinery; the substrate guarantees the certification by closure-rule-language-fragment realizability.

### The 250%+ ROI vs 40% cancellation as substrate-cost-benefit anchor

The industrial-control text reports: *ROI exceeding 250% within 24 months on predictive-maintenance applications; 10,000+ man-hours saved annually per multi-agent factory deployment; 40-60% reduction in process cycle times; 43% reduction in unplanned downtime; 45% reduction in network outages.* Plus the cautionary anchor: **40% of agentic AI projects projected to be cancelled by 2027** due to escalating costs, unclear business value, or inadequate risk controls (Gartner).

The substrate-algebraic reading:

- The 250% ROI applies when the four-cap stack (bounded-$H_\rho$ + saturation cap + substrate-resident graders + four-regime aperiodic-authorization) is in place, because that's what prevents AutoGPT-style failure modes (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
- The 40% cancellation rate applies when *any* of the four caps are absent — escalating costs trace to unbounded $H_\rho$; unclear business value traces to absent grader cap; inadequate risk controls trace to absent four-regime aperiodic-authorization.
- **PyFARS's substrate is the structural answer to the 40% cancellation risk**: substrate-resident closure rules + charter-tier discipline + safety-envelope precheck + audit-projector all produce the *clear business value* and *adequate risk controls* the cancellation projects lack.

### Vendor-landscape positioning

The 2026 industrial AI vendor landscape:

- **Siemens** — MindSphere (predictive maintenance), Industrial Copilot (multi-agent orchestration), Planning Copilot (production scheduling), Operations Copilot (shop floor).
- **Rockwell Automation** — AADvance (SIL 3), Logix SIS (process + safety integration).
- **ABB** — System 800xA (distributed control + safety).
- **GE Digital** — Predix APM (asset management; power, oil & gas, aviation).
- **Hitachi** — HMAX Industry (December 2025 launch; AI agents for compressors, pumps, inkjet printers; combines real-time sensor data + equipment manuals + domain expertise; addresses skilled-labor shortages via knowledge-transfer mechanisms).
- **Juniper / HPE** — Marvis AI (80%+ troubleshooting efficacy; autonomous remediation; post-$14B HPE acquisition July 2025).
- **Cisco** — AgenticOps, AI Canvas (cross-domain network troubleshooting).
- **Nokia** — Event-Driven Automation (intent-based declarative configuration).

**PyFARS's position is the substrate-resident layer beneath this vendor stack**, not a competitor to it.
Each vendor's stack lands on a substrate; PyFARS provides the substrate-algebra (closure rules, four-regime classification, charter-tier discipline, audit-projector) that the vendor stack composes against.
The polity's charter authorizes which external surfaces (Siemens equipment, Rockwell PLCs, ABB controllers, GE turbines, Hitachi-monitored compressors, etc.) the substrate may propose commands against, at which charter-fragment tier, with which SIL rating.

### The four outstanding industrial-AI challenges as PyFARS theorem-claims

The industrial-control text names four outstanding challenges.
Each maps to a PyFARS theorem-claim or an open question:

1. *How do we certify agentic systems that learn and adapt?
  (Current approaches assume static rule sets.)* **PyFARS answer**: the four-cap stack (bounded-$H_\rho$ + saturation cap + substrate-resident graders + four-regime aperiodic-authorization) plus the falsifiable-agency-certificate (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)) provides substrate-resident certification of self-modifications.
  [M5](../work/milestones/m5-agential-self-generation.md) is the autopoietic threshold realized within the certification frame.
2. *What prevents 40% project cancellation rate?* **PyFARS answer**: the substrate's clear-business-value (closure-rule-firing rate; cost-quantale measurement; ROI metrics) + adequate-risk-controls (four-regime classification; safety-envelope precheck; charter-tier discipline) directly address Gartner's failure modes.
3. *How do we ensure safety when agents interact with each other in ways designers didn't explicitly anticipate?* **PyFARS answer**: the substrate's stigmergic communication discipline (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) + closure-merge commutation (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)) + W-MSR Byzantine filter (per the [federation-resilience question](federation-resilience-and-degradation.md)) prevent unanticipated interactions by structure.
4. *What is the economic break-even when does autonomous operation cost less than human monitoring?* **PyFARS answer**: the cost-quantale + saturation cap + skill-composition cost bound (per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)) provide substrate-resident measurements; the break-even is computable per workitem-class.

### Substrate consequences

- **The charter-fragment hierarchy + SIL ratings give substrate-resident IEC 61508 compliance.** The substrate provides industrial-grade safety guarantees at the cell-write layer; LLMs are kept off the safety-critical path by construction.
- **Audit-and-reversibility per autonomous decision IS the audit-projector schema.** The substrate is IEC 61508-compliant in audit machinery by construction.
- **The 250% ROI / 40% cancellation rate dichotomy maps to the four-cap stack.** Substrate-resident closure rules + charter-tier discipline + safety-envelope precheck + audit-projector produce the clear-business-value and adequate-risk-controls that the cancelled projects lack.
- **PyFARS positions beneath the industrial vendor stack as the substrate-algebra layer**, not as a competitor; the polity's charter authorizes which vendor surfaces the substrate may interact with at which fragment tier.
- **The four outstanding industrial-AI challenges all have PyFARS theorem-claim answers** that compose into one substrate discipline.

### Carter–Little hierarchy as charter-fragment discipline at the disciplinary level

[`encoding-disciplinary-methods`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/encoding-disciplinary-methods.md) (per Carter and Little 2007 [@carter2007epistemology] and Tennis 2008 [@tennis2008epistemology]) establishes a layered hierarchy that the knowledge-organization literature has broadly adopted.
The hierarchy specifies a four-level structure for representing how a discipline reasons:

| Level | Question answered | Example | PyFARS substrate analog |
|---|---|---|---|
| **Epistemology** | What counts as knowledge? | Constructivism / positivism / pragmatism | [`relationality`](../../../../theories/theories/humanities/theories/philosophy/theories/relating/) + discipline-level philosophical commitments (e.g., constructive reasoning) |
| **Methodology** | What approach, and why? | Grounded theory / axiomatic proof / ethnography | Discipline-level `methods/` directories; the *justification* layer |
| **Methods** | What specific techniques? | Semi-structured interview / induction / tactic proof | Specific techniques encoded as substrate skills and curricula |
| **Practice** | How is it actually done here? | "We use Lean 4 with Mathlib, constructive only" | CLAUDE.md, AGENTS.md per [the dispatch question](dispatch-workitems-plans-and-external-surfaces.md), operational skills |

Tennis (2008) extends this to knowledge-organization specifically, arguing that *epistemology is critical to KO because it reflects our assumptions about language, the primary material of KO systems*.
Each level constrains the next: epistemology constrains methodology; methodology constrains methods; methods are enacted as practice.
Using "methodology" as a synonym for "methods" is imprecise — methodology is the study and justification of methods, not the methods themselves.

**This hierarchy IS the charter-fragment-tier discipline applied at the disciplinary level.** The substrate-algebraic statement: the polity's charter operates at four parallel tiers of normative authority over disciplinary content (per the [language-fragment hierarchy section above](#charter-as-closure-rule-system-with-language-fragment-tiers)), and each tier corresponds to a level in the Carter-Little hierarchy:

| Carter-Little level | Charter-fragment tier | Authority pattern |
|---|---|---|
| Epistemology | Hard-core (rules tier; bare $\Pi_1+<$); constitutional | Polity-quorum required for amendment; substrate-decidable |
| Methodology | Rules tier ($\Pi_1+<$) | Rules-tier discipline; substrate-decidable; mechanically enforced |
| Methods | Guidelines tier ($\Pi_1$ + bounded FOL) | Guidelines-tier discipline; substrate-decidable per fragment realizability |
| Practice | Lower-precedence tier (per the captain's authority) | Practice-tier discipline; lighter authority but still substrate-resident |

**The polity's charter authorizes each level via the same `enforce-charter-tier-discipline` closure rule that governs charter-rule authoring.** A discipline's epistemology cannot be changed without polity-quorum (it's hard-core); its methodology cannot be changed without rules-tier amendment; its methods can be added or refined within the guidelines-tier; its practice is captain-authority and lighter to revise.
The four-tier discipline is uniformly applied at all four levels of the Carter-Little hierarchy.

### Method ontologies as prior art for substrate-resident method encoding

`encoding-disciplinary-methods` surveys five existing method ontologies, each encoding scientific methods as machine-readable artifacts:

- **EXPO (Ontology of Scientific Experiments)** — 200+ concepts covering experimental design.
  Distinguishes hypothesis-driven (Galilean) from exploratory (Baconian) approaches.
  General-purpose but experiment-focused.
- **OBI (Ontology for Biomedical Investigations)** — 2,500+ terms covering all investigation phases: planning, execution, reporting.
  Part of the OBO Foundry ecosystem.
- **P-Plan** — extends W3C PROV-O to represent the *plans* that guided scientific processes.
  Plans decompose into Steps with input/output Variables.
  Supports sub-plans.
  Enables linking workflow templates as Linked Data.
- **REPRODUCE-ME** — modular ontology for reproducibility, extending PROV-O and P-Plan.
  Eight core components: **Data, Agent, Activity, Plan, Step, Setting, Instrument, Material**.
  Applied to Jupyter notebooks.
- **SPAR family** — ontologies for scholarly publishing: FABIO (bibliographic data), CiTO (citation semantics), DoCO (document structure).

**The text identifies a genuine gap**: *None of these taxonomizes research methods across disciplines in a single artifact.
A comprehensive method ontology — covering qualitative, quantitative, experimental, ethnographic, formal, and computational methods — does not yet exist.*

PyFARS's substrate is the structural answer to this gap.
The substrate-algebraic statement: **PyFARS's predication-categories formalization, instantiated across multiple disciplines (manufacturing, governance, code, math, drone-swarm theory, etc.), realizes a comprehensive method-ontology by construction**.
Each discipline's methods are substrate cells; the predication-fibration is the cross-disciplinary unification; BC-commutation on type-shift morphisms (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)) provides the cross-disciplinary reasoning that the existing ontologies lack.

The five existing ontologies become *imports* into the substrate's predication-categories, not competitors.
Each maps to a substrate-cell-class (per the [cohomological-coordination question's method-ontology section](cohomological-coordination-and-audit.md)):

- EXPO → manufacturing + experimental-physics methods
- OBI → biomedical methods
- P-Plan → plan-as-1-morphism extension (already substrate-resident per [the dispatch question's plans-as-1-morphisms section](dispatch-workitems-plans-and-external-surfaces.md))
- REPRODUCE-ME → reproducibility methods (already substrate-resident per [the substrate-algebra question's operations-causal-settling section](substrate-algebra-closure-and-replay.md)); the eight-component decomposition is the four-axis pattern with each axis 2-resolved into structural + operational sub-components
- SPAR → bibliographic + citation + document-structure methods

The substrate's `methods-record` cell-kind generalizes:

```yaml
type: methods-record
discipline: <slug>                       # math, manufacturing, governance, etc.
epistemology: <slug>                     # constructivism, positivism, pragmatism
methodology: <slug>                      # grounded-theory, axiomatic-proof, ethnography
techniques: [<technique-slug>, ...]      # semi-structured-interview, tactic-proof, etc.
practice-realization: <link>             # CLAUDE.md, AGENTS.md, operational skills
external-ontology-imports:               # method ontologies imported
  - { ontology: expo | obi | p-plan | reproduce-me | spar | <other> }
charter-fragment-tier:                   # which tier governs this method
  epistemology: hard-core
  methodology: rules
  methods: guidelines
  practice: lower-precedence
accretion-trajectory:                    # learn → document → curricula → skills → scripts → formalization
  current-stage: documented | curriculated | skilled | scripted | formalized
external-grounding:                      # Policy-003 analog
  references: [<citation>, ...]
  divergence-from-canonical: <description>  # if any; substrate-flagged for review
```

Closure rules: `enforce-discipline-fragment-tier`, `route-method-import`, `compute-accretion-stage`, `verify-cross-disciplinary-bc-commutation` (per [cohomological-coordination question](cohomological-coordination-and-audit.md)), `verify-external-grounding` (closure-rule-decidable check that references exist and are canonical).

### The accretion trajectory as substrate maturation pathway

`encoding-disciplinary-methods` names an *accretion trajectory* that disciplinary methods follow:

> learn → document → curricula → skills → scripts → formalization

This is the substrate's maturation discipline applied to *methods* rather than *skills*.
The trajectory maps to the formality-layer hierarchy ($F_0 \to F_3$) per the [skill-composition cost section in the dispatch question](dispatch-workitems-plans-and-external-surfaces.md):

| Accretion stage | Formality layer | Substrate-cell shape |
|---|---|---|
| **Learn** | $F_0$ (LLM-call required) | Observation cells; high-$H_\rho$ |
| **Document** | $F_0$ → $F_1$ | Methods-record cells (this section's schema) |
| **Curricula** | $F_1$ | Reading-order curricula cells; per-discipline learning paths |
| **Skills** | $F_1$ → $F_2$ | Skill-records (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) |
| **Scripts** | $F_2$ | Closure-rule-supplied scripts (deterministic with validation) |
| **Formalization** | $F_3$ | Pure substrate operations; replay-byte-identical; SIL-rated where applicable |

**The accretion trajectory IS the maturation pathway** — methods start as documented prose (LLM-call territory), become curricula (structured learning order), become skills (substrate-resident closure rules), become scripts (deterministic substrate procedures), become formalizations (mechanically-decidable substrate cells).
Each stage strictly reduces the formality-layer; the [`promote-is-strictly-cost-reducing`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/promote-is-strictly-cost-reducing.md) theorem applies at the disciplinary-method level too.

### External grounding requirement as substrate citation discipline

`encoding-disciplinary-methods`'s recommendation: *Methods should cite the discipline's established methodological literature, not be invented ad hoc.
When our method diverges from established practice, document why.*

This is the substrate's *external-grounding discipline* — methods are not authored in isolation; they cite established literature; divergences from established practice are documented and substrate-witnessed.
The substrate-algebraic statement: every methods-record carries `references:` frontmatter with citations; closure rules verify that references exist and match the discipline's canonical-literature corpus; divergences are flagged as $\langle \top, \bot \rangle$ in $\mathbf{FOUR}$ (truth-order $\top$ — we accept the divergence; knowledge-order $\bot$ — we know the divergence is non-canonical and require justification).

The polity's existing skills-and-methods bear on this: when an OpenClaw skill is authored without external grounding, the substrate flags it; when a divergence from canonical practice is justified (e.g., predication-categories' novel formalization vs the broader category-theory literature), the divergence-from-canonical field carries the captain's attestation.

### The polity is the comprehensive method-ontology

The five existing method ontologies (EXPO + OBI + P-Plan + REPRODUCE-ME + SPAR) collectively gesture toward a comprehensive cross-disciplinary method-ontology that does not yet exist as a single artifact. **The polity's substrate IS this comprehensive method-ontology by construction**:

- The polity's `theories/` directory carries methods-records across mathematics, engineering, sociology, science, humanities, theology.
- The predication-fibration provides the cross-disciplinary unification.
- BC-commutation on type-shift morphisms (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)) provides cross-disciplinary reasoning.
- The Carter-Little hierarchy applied as charter-fragment-tier discipline gives the authority pattern.
- The accretion trajectory gives the maturation pathway.
- External-grounding requires citation against canonical literature with substrate-flagged divergences.

This is the polity's contribution to the broader knowledge-organization community: not just one polity's methods, but *the substrate-algebraic discipline by which any polity authors and maintains a cross-disciplinary methods-corpus*.

### Engineering consequences

- **The Carter-Little epistemology→methodology→methods→practice hierarchy IS the charter-fragment-tier discipline at the disciplinary level.** Each level corresponds to a charter-fragment tier with parallel authority pattern.
  The substrate's `enforce-charter-tier-discipline` closure rule applies uniformly.
- **The five existing method ontologies (EXPO / OBI / P-Plan / REPRODUCE-ME / SPAR) become imports into PyFARS's predication-categories**, not competitors.
  The substrate provides the cross-disciplinary unification that the gap-text identifies as missing.
- **The accretion trajectory (learn → document → curricula → skills → scripts → formalization) IS the maturation pathway** at the disciplinary-method level.
  Each stage strictly reduces the formality-layer per `promote-is-strictly-cost-reducing`.
- **The external-grounding discipline IS the substrate's citation discipline** for methods.
  Divergences from canonical literature are substrate-flagged as $\langle \top, \bot \rangle$, requiring captain-attestation justification.
- **The polity IS the comprehensive method-ontology** that the gap-text identifies as missing — by construction, via predication-categories instantiated across multiple disciplines with BC-commutation on cross-disciplinary type-shifts.

### Governed autonomy: regulatory anchors and the institutional-accountability requirement

The May 2026 drone-swarm surveys (per [`survey-of-autonomous-agents-and-swarms-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/survey-of-autonomous-agents-and-swarms-may-2026.md) and [`autonomous-agents-drone-swarms-standalone-report-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/autonomous-agents-drone-swarms-standalone-report-may-2026.md)) converge on a thesis the predicated-drone-swarm theory adopts as central, and that the polity's charter authority extends to embodied autonomous systems generally:

> *A swarm that is mathematically stable but institutionally unaccountable is not a mature technology.
> Conversely, strong governance without robust estimation, networking, and safety proofs will not keep systems reliable in complex airspace or adversarial conditions.
> The field's real frontier is therefore technical–legal integration: proving enough to justify deployment, instrumenting enough to enable audits, and limiting enough to preserve human responsibility.*

This is the **governed-autonomy thesis** — the substrate-algebraic claim that institutional accountability is not separable from technical reliability; both must compose into one substrate discipline.
(See the [predicated-drone-swarm theory-gap question](predicated-drone-swarm-theory-as-theory-gap.md) for the eight-clause substrate-algebraic decomposition of this thesis across the question files.)

#### Civil regulatory three pillars

Civil regulation has converged on three architectural pillars; each anchors a substrate-resident charter authority:

1. **Performance-based flight authorization for routine BVLOS** + UTM-like services.
  FAA BVLOS NPRM (2025) names central integration targets: package delivery, agriculture, aerial surveying, civic-interest uses, training, recreation, flight testing.
2. **Remote identification + operator traceability**.
  FAA Remote ID requires most registered drones to comply with three compliance pathways:
   - **Standard Remote ID drones** — built-in broadcast.
   - **Remote ID broadcast modules** — retrofit modules.
   - **FRIA** — operation inside a FAA-Recognized Identification Area.
3. **Structured airspace information + authorization services**.
  EASA U-space (Regulation EU 2021/664) makes mandatory services central: authorization / traffic information / weather support / certified providers / secure interoperable protocols.
  ICAO RPAS framework continues to emphasize harmonized integration into non-segregated airspace.

These rules are *technically consequential*: once flight authorization, remote identification, and traffic information become built-in assumptions, autonomy design is no longer just onboard control plus a radio — it becomes a socio-technical system touching identity, data governance, airspace services, human oversight, and incident response.
Purely research-stack swarms often fail to transfer directly into civic operations even when the core control algorithms work, *because the regulatory-substrate composition is not in the research-stack's frame*.

The substrate-algebraic mapping (extends the IEC 61508 functional-safety section above):

| Civil regulatory regime | Substrate charter-authority | Closure-rule enforcement | Charter-fragment tier |
|---|---|---|---|
| FAA Remote ID | Identity-axis substrate cells with `remote-id-pathway:` field | `enforce-remote-id-compliance` | Rules tier (bare $\Pi_1+<$) |
| FAA BVLOS NPRM | External-surface-record with `flight-authorization:` field | `enforce-bvlos-authorization` | Rules tier |
| EASA U-space | External-surface-record with `u-space-zone:` + `mandatory-services:` fields | `route-via-u-space-services` | Rules tier |
| ICAO RPAS framework | Polity-wide harmonization-record | `enforce-icao-harmonization` | Hard-core (constitutional) |

#### Defense governance anchors

Defense governance is more diffuse but anchors substrate authority via three streams:

- **DoD Directive 3000.09** (2023 update) — requires *appropriate human judgment over the use of force*; realistic operational testing; cyber survivability; legal review; procedures to avoid unintended engagements or unauthorized interference; senior-level approvals for relevant classes of systems.
- **NATO Autonomy Implementation Plan + Principles of Responsible Use for AI in Defence** — six principles: lawfulness / accountability / explainability-traceability / reliability / governability / bias-mitigation.
  Each principle becomes a substrate-resident charter predicate.
- **DARPA programs**: OFFSET (large-team human-swarm teaming and interfaces); AMASS (multi-domain adaptive swarms-of-swarms).
  These are research-grade rather than deployment-authoritative.

International law remains unsettled:

- **ICRC** describes autonomous weapon systems as *systems that select and apply force without human intervention after activation*; argues for new rules prohibiting unacceptable systems and restricting others.
- **CCW Group of Governmental Experts** sessions continued in 2025; no universal treaty settlement has emerged.
- **UNODA** materials track ongoing international debate.

The substrate-algebraic mapping for defense:

| Defense regulatory regime | Substrate charter-authority | Closure-rule enforcement | Charter-fragment tier |
|---|---|---|---|
| DoD Directive 3000.09 | Charter hard-core; meaningful-human-control predicate | `verify-meaningful-human-control` (per below) | Hard-core |
| NATO 6-principle | Charter rules tier; six-principle predicates | `verify-nato-principle-compliance` | Rules tier |
| ICRC / IHL | Charter hard-core; prohibition predicates | `verify-ihl-compliance` | Hard-core |

#### Meaningful-human-control as substrate-decidable predicate

The May 2026 surveys identify a *persistent definitional problem*: *autonomy levels, swarm thresholds, and what counts as "meaningful human control" or "appropriate human judgment" are not standardized across all civilian and defense frameworks*.
PyFARS's substrate addresses this gap *polity-internally* by making the polity's interpretation substrate-decidable.

The theorem `meaningful-human-control-as-charter-c3-extension` (per the [predicated-drone-swarm theory-gap question](predicated-drone-swarm-theory-as-theory-gap.md)): meaningful human control over a workitem $w$ holds iff:

1. The workitem's outcome cell carries a witness chain terminating at a captain-attested cell (accountability-totality, per the [accountability-chain totality section above](#accountability-chain-totality-as-m11-audit-invariant)).
2. The workitem's safety-envelope precheck has fired (HJ/CBF satisfied, per the [HJ/CBF section below](#hj-reachability-and-cbf-as-substrate-precheck-primitive)).
3. The workitem's authorization passes the charter-tier discipline at the appropriate fragment-tier (rules / guidelines / hard-core depending on workitem-class).
4. The workitem's `falsifiable-agency-certificate` (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)) shows persistent-state continuity (Bent's Condition 3) — the captain's interrupt-and-resume capability is preserved.

This is the polity's substrate-decidable definition.
It does not solve the field-wide standardization gap, but it makes the polity's interpretation *audit-exportable* and *closure-rule-enforceable*.
Different polities may author different definitions per their charter; the substrate-algebraic discipline ensures each polity's definition is internally consistent and externally auditable.

Substrate object kind, `meaningful-human-control-record`:

```yaml
type: meaningful-human-control-record
target-workitem: <workitem-id>
condition-1-captain-attestation:
  verified: true | false
  witness-chain-terminus: <cell-id>
condition-2-safety-envelope-precheck:
  verified: true | false
  hj-cbf-cells: [<cell-id>, ...]
condition-3-charter-tier-discipline:
  verified: true | false
  fragment-tier: bare-pi1-plus-less | pi1-bounded-fol | pi1-plus-pi2 | unrestricted
condition-4-falsifiable-agency-condition-3:
  verified: true | false
  replay-trace: <replay-id>
overall-verdict: meaningful-human-control | insufficient-human-control
audit-export-tier: civil-aviation | defense | dual-use
```

#### The eight-clause governed-autonomy decomposition

The governed-autonomy thesis decomposes substrate-algebraically into eight clauses, each realized as a substrate discipline:

| Thesis clause | Substrate discipline | Question file |
|---|---|---|
| "Mathematically stable" | Closure 2-monad lax-idempotence + four-regime classification + algebraic-connectivity convergence | [substrate-algebra](substrate-algebra-closure-and-replay.md), [federation-resilience](federation-resilience-and-degradation.md) |
| "Institutionally accountable" | Accountability-projector + audit-witness chain + Mulgan-administrative-and-legal-coverage | This question (above) |
| "Robust estimation" | Distributed Kalman filtering + W-MSR Byzantine resilience + secure state estimation | [federation-resilience](federation-resilience-and-degradation.md) |
| "Networking" | Communications-as-control-plant + protocol-family-aware data-pipeline | [federation-resilience](federation-resilience-and-degradation.md) |
| "Safety proofs" | HJ reachability + CBF + neural verification + safety-envelope precheck | This question (HJ/CBF section below) |
| "Technical-legal integration" | Charter-fragment hierarchy bridges natural-language regulation to substrate-decidable target-valuations | This question (above) |
| "Auditable instrumentation" | Typed-frontmatter discipline + content-addressed cells + replay-byte-identity | [substrate-algebra](substrate-algebra-closure-and-replay.md) |
| "Limited to preserve human responsibility" | Four-cap stack + captain-attestation-required lifecycle state + meaningful-human-control predicate | [memory-feedback](memory-feedback-self-generation-and-failure-modes.md), [federation-resilience](federation-resilience-and-degradation.md), this question |

**The substrate's contribution to the field**: every clause of the governed-autonomy thesis is realized as a substrate-resident discipline with closure-rule enforcement and audit-projector visibility.
PyFARS isn't gesturing at governed autonomy; it provides governed autonomy by construction.

### Engineering consequences

- **The civil regulatory three pillars (BVLOS + Remote ID + UTM/U-space) are substrate-resident charter authorities.** Each pillar corresponds to a closure-rule enforcement at the appropriate charter-fragment tier; the polity's external-surface-records carry the regulatory-pathway designation.
- **Defense governance anchors (DoD 3000.09 + NATO 6-principle + ICRC/IHL) extend the same charter-authority discipline.** PyFARS substrate per construction satisfies the institutional-accountability requirement; specific deployment paths (civil vs defense vs dual-use) determine which subset of regulatory anchors applies.
- **Meaningful-human-control is substrate-decidable polity-internally.** The four-condition definition (captain-witness-chain + safety-envelope-precheck + charter-tier-discipline + falsifiable-agency-Condition-3) gives the polity an audit-exportable, closure-rule-enforceable interpretation that the field-wide standardization gap leaves open.
- **The governed-autonomy thesis decomposes into eight substrate-resident clauses.** The substrate provides governed autonomy by construction; the eight-clause decomposition is the substrate-algebraic formalization of what governed autonomy means for embodied participants.

---

## Estoppel as least fixed point of a monotone witness-coalgebra

The predicated-governance theorem [`estoppel-as-monotone-coalgebra-fixed-point`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/estoppel-as-monotone-coalgebra-fixed-point.md):

**Claim.** Estoppel — *"agent $a$ is bound by their prior assertion of $\phi$ and cannot subsequently assert $\neg \phi$ in proceedings against a party that relied on the prior assertion"* — presents as the **least fixed point** of a closure-stable monotone endofunctor $\widehat{F}_{a, \phi}$ on the closure-fixed-point lattice of the polity's [normative system](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/normative-system.md).
By **classical Knaster–Tarski** on the complete lattice $\mathrm{Fix}(C_\mathcal{N})$:

$$\mathrm{Est}(a, \phi) = \mathrm{lfp}(\widehat{F}_{a, \phi}) = \bigcap \{X \in \mathrm{Fix}(C_\mathcal{N}) : \widehat{F}_{a,\phi}(X) \subseteq X\}$$

This is the substrate-algebraic content of *"the polity recognizes $a$ as estopped from asserting $\neg\phi$ against every party that has relied on $\phi$, plus all closure-consequences."*

The witness-coalgebra:

$$F_{a, \phi}^\circ(X) = X \cup \{\langle a, \mathrm{estopped}, \neg\phi\ \mathrm{against}\ b\rangle : (b, \phi) \in \mathrm{Reliance}(X)\}$$

— add the estoppel-binding cell against every party that has relied on $\phi$.
The closure-stabilized form is $\widehat{F}_{a, \phi}(X) := C(F^\circ_{a, \phi}(X))$, landing in $\mathrm{Fix}(C_\mathcal{N})$.

The reliance-witness sufficiency is by the truth-meet Frobenius (per [`frobenius-for-knowledge-and-truth-meets`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/frobenius-for-knowledge-and-truth-meets.md)): the joint cell *"$a$-asserts-$\phi$ AND $b$-relies-on-$\phi$"* requires the truth-meet to hold at $\mathbf{t}$.
A reliance-without-assertion or assertion-without-reliance has truth-meet at $\mathbf{f}$ or $\bot$, producing no estoppel cell.

**Why the "Tarski–Lawvere conjecture is refuted" matters.** The construction uses **classical Knaster–Tarski** on $\mathrm{Fix}(C_\mathcal{N})$ — a complete lattice.
The unrestricted [`tarski-lawvere-fixed-point-grothendieck-sites`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tarski-lawvere-fixed-point-grothendieck-sites.md) conjecture is **refuted** in its general form.
The estoppel construction *deliberately uses only the classical path* on the complete lattice, not the refuted machinery.

This is engineering-relevant: a tempting "fix" to estoppel-defeat edge cases (e.g., "what if the reliance is itself contested?") might invoke the more general fixed-point machinery.
The substrate must NOT — the refuted Tarski–Lawvere conjecture would silently corrupt the estoppel cell-system.
Stick to Knaster–Tarski on $\mathrm{Fix}(C_\mathcal{N})$.

**Closure-stability.** By closure-2-monad lax-idempotence, $\mathrm{Est}(a, \phi)$ is closure-stable: $C(\mathrm{Est}(a, \phi)) = \mathrm{Est}(a, \phi)$.
Operationally: the estoppel binding is consistent with all closure-rule consequences and cannot be defeated by re-deriving from the closed system.

**The four estoppel doctrines as coalgebra choices.** Per the theorem's part (d):

- **Detrimental reliance estoppel** (common-law tradition): adds the estoppel cell only when reliance is detrimental — requires `(relier, harm, from-reliance) = T` witness alongside.
- **Proprietary estoppel** (equity tradition): only when $\phi$ concerns a proprietary right transferred or promised.
- **Estoppel by convention**: the assertion need not be explicit; a shared-conduct convention recorded as joint-conduct cells suffices.
- **Estoppel by deed**: restricted to assertions in formal deed instruments.

Each doctrine specifies an additional witness-cell type that must be present alongside the assertion-reliance pair for the estoppel cell to be generated.

The 561 polity's stated commitments suggest a specific doctrinal mix: detrimental-reliance for direct inter-personal commitments (where harm-from-reliance is the substantive content); estoppel-by-convention for shared-practice norms (where a community's joint conduct creates binding without explicit declaration).
The polity's `governance/decisions/estoppel-doctrine.md` should commit to one or several variants.

**Estoppel-defeat is targeted, not categorical.** Per part (e), estoppel-defeat — *"a successful claim that estoppel does not apply"* — operates by removing an *antecedent witness* (typically: contesting whether reliance was reasonable, whether the assertion was clear, whether detriment was caused by the assertion).
Per [`norm-revision-as-cocompletion`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/norm-revision-as-cocompletion.md), this is an order-ideal collapse on the fixed-point lattice; the defeat propagates only to estoppel cells whose generation depended on the removed witness.

Why PyFARS today's failure modes need this:

- **Charter amendments can revoke prior commitments without notice.** The captain authors a charter rule binding offices; an agent's office is now subject to that discipline; the captain later revises the rule away.
  If other agents had relied on the rule, they have no substrate-resident binding to challenge the revocation.
- **Self-generated skills can shadow-revoke prior workitem outcomes.** Per [M5](../work/milestones/m5-agential-self-generation.md), an agent authors a new skill that re-interprets prior outcomes.
  Without estoppel, the agent could effectively retract its earlier work.
- **Federation-time reliance is unprotected.** A peer-substrate that relied on this substrate's prior assertion has no substrate-resident way to surface the reliance if this substrate retracts.

A new substrate object kind, `assertion-record`, at `governance/assertions/<id>.md`:

```yaml
type: assertion-record
asserter: <principal-or-office>
proposition: <predicate-substrate-cell>
asserted-at: <substrate-clock-ordinal>
witness: <event-id>
```

A new substrate object kind, `reliance-record`, at `governance/reliances/<assertion-id>--<relier>.md`:

```yaml
type: reliance-record
prior-assertion: <assertion-record-slug>
relier: <principal-or-office>
relied-at: <substrate-clock-ordinal>
reliance-detrimental: true | false  # for detrimental-reliance estoppel doctrine
witness: <event-id>
```

A new closure rule, `derive-estoppel-cells`, fires whenever a reliance-record is created and on every closure-pass:

1. For each `(assertion, relier)` pair where both records exist at $\mathbf{t}$, compute the truth-meet of `(asserter, asserts, proposition)` and `(relier, relies-on, proposition)`.
2. If the truth-meet is $\mathbf{t}$, add the estoppel cell `(asserter, estopped, ¬proposition, against, relier) = T`.
3. Apply closure $C$; the result lies in $\mathrm{Fix}(C_\mathcal{N})$.

**Estoppel is constructive, not declarative.** The polity *constructs* the estoppel cell-system from the witness-coalgebra, rather than *declaring* it as an axiom.
Substrates that treat estoppel as a procedural rule are mis-describing the operation; estoppel rulings are findings about the structure of the closure-fixed-point lattice, not adjudicative impositions.

---

## Accountability-chain totality as M11 audit invariant

The agents-theory theorem [`accountability-chain-must-be-total`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/accountability-chain-must-be-total.md) gives a hard governance condition.
Formally:

Let $D$ be the set of all delegation records and $O$ the set of all outcomes produced during a session.
The accountability chain is total iff:

1. **Coverage:** $\forall o \in O,\ \exists d \in D$ such that $\mathrm{scope}(d) \ni o$.
2. **Assignment:** $\forall d \in D,\ \mathrm{principal}(d)$ is a human principal (or transitively traces to one).
3. **Non-overlap:** $\nexists\ d_1 \neq d_2 \in D$ such that $\mathrm{scope}(d_1) \cap \mathrm{scope}(d_2) \ni o$.

(1) and (2) together exclude *gaps* (no principal); (3) excludes *conflicts* (two principals).

The companion theorem [`delegation-does-not-transfer-accountability`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/delegation-does-not-transfer-accountability.md) — derived from Bovens (2007), Mulgan (2000), and U.S. Navy Regulations Article 0802 — establishes that the principal of each delegation retains full accountability through the chain.
Sub-delegation does not shed it.

The companion text [`accountability-tracing-in-multi-agent-systems`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/accountability-tracing-in-multi-agent-systems.md) names four invariants — Totality, Non-Transferability, Installation-Anchoring, Scope-Exclusivity — that an audit export must satisfy to demonstrate governance compliance under the EU AI Act (in force August 2026) and similar regimes.

**Why non-transferability holds (Bovens / Mulgan / Navy framing).** Accountability is a *relational obligation*, not a transferable property.
Bovens establishes accountability as requiring forum, agent, explanation, and consequences.
An agentic system has no legal standing, no capacity to appear before a forum, no capacity to bear consequences.
When an agent makes an error, there is no forum before which the agent answers — only the human principal who deployed the agent.
Mulgan's positional argument: accountability is positional (A is accountable for $O$ if $O$ falls within A's scope), not causal (A is responsible for $O$ if A's action caused $O$).
Navy Article 0802: "Delegation of authority shall in no way relieve the commanding officer of continued responsibility."
If delegation transferred accountability, a principal could create unlimited sub-delegation chains and be accountable for none of them — accountability structures would collapse.

PyFARS already has the structural primitives: dispatch produces `(workitem, dispatched-to, agent) = T` cells; office-incumbency cells anchor authority to a person; charter records define delegation scopes.
What it does NOT yet do is **enforce** the totality/non-overlap invariants at the substrate boundary.
A dispatch could fire whose outcome fell outside any office's scope (gap), or two offices' scopes could legitimately both cover the outcome (conflict).
The substrate would silently absorb this.

A new substrate-authorized closure rule, `accountability-trace-totality`, fires when any dispatch produces an outcome cell.
It walks backward through the delegation chain to find the unique human principal — and emits $\top$ if it finds zero or two-or-more principals.

```yaml
type: accountability-trace-rule
applies-to-cells: dispatch-outcome, agent-action, federation-write
delegation-chain-source: governance/offices/<slug>::scope, governance/charter/<id>::delegations
gap-action: emit-top-cell-with-class(accountability-gap)
overlap-action: emit-top-cell-with-class(accountability-conflict)
human-principal-marker: governance/persons/<slug>.md::is-human=T
```

The walk: from outcome $o$, find all delegation records $d$ whose `scope` covers $o$.
For each $d$, if `principal(d)` is human-marked, count it.
If $\mathrm{count} = 1$, the outcome is well-accounted; emit `(o, accounted-by, principal) = T`.
If $\mathrm{count} = 0$, emit `(o, accountability-gap) = T`.
If $\mathrm{count} \geq 2$, emit `(o, accountability-conflict, {p1, p2, …}) = T`.

The pypredcalc-side substrate has a contradiction-style pivot: gap and conflict cells cannot be silently merged into the substrate's "settled" view.
They fire the [M11](../work/milestones/m11-assurance-audit-chain-export.md) audit-witness machinery and queue them for captain-resolution.

**[M11](../work/milestones/m11-assurance-audit-chain-export.md) commitments:**

- **A `governance-coverage-projector` audit projector**, derived from the Čech-cocycle-evaluation pattern.
  For every outcome cell in the export period, computes the principal-trace and certifies coverage = 1.
- **A `non-overlapping-scopes` precheck on charter amendments**.
  Per the HJ/CBF section below, an amendment that would create overlapping scopes is rejected at precheck.
  Per the theorem's part 3, totality follows from non-overlap; preserving it is a substrate invariant.
- **An `installation-anchoring` cell-kind**.
  Per the accountability-tracing text, accountability begins at investiture and ends at relief.
  The audit projector reads the *time-bounded incumbency* to attribute outcomes to the principal in office at the time the outcome was produced — not the current incumbent.
  This matters when an office has rotated.
- **A `delegation-record` substrate kind that wraps every dispatch.** Each dispatch produces, alongside its outcome cell, a delegation-record cell naming `(workitem, dispatched-by-office, dispatched-to-agent, scope-bounded-by, authority-grant)`.

**What this does NOT replace.** The non-transferability principle is **structural**, not enforceable at the substrate alone.
The substrate can refuse to record a delegation that *claims* to transfer accountability (a delegation cell whose `transfers-accountability: true` field would be rejected at parse-time).
But the principal still answers regardless of what the cells say — the substrate's job is to *show* the chain, not to declare absolution from it.
Per the theorem's collapse argument, if the substrate accepted accountability-transfer the entire structure would collapse into infinite-sub-delegation; refusing to accept the claim is the only option.

The accountability-tracing text's "did the principal have sufficient visibility" question (the question that settles everything) is answered by the substrate's observability: the audit chain's completeness IS the visibility evidence.

The accountability projector emits a per-outcome-class report: "outcome class C has $N$ outcomes; all $N$ trace to principal P; coverage = 1, gaps = 0, conflicts = 0."
This is the EU-AI-Act-shaped output.

**The captain-as-apex pattern.** Totality is satisfied by default at the polity-root: every outcome's chain ends at the captain.
The accountability projector confirms this is true *in fact* for every outcome, not merely *in principle*.

**Why choreography is accountability-hostile by default — and why PyFARS isn't.** The third open problem of multi-agent harness practice (per the orchestration/choreography survey) is *distributed accountability*: when a choreographed system produces a wrong result, each service executed correctly in isolation, but the interaction of independent decisions produced the error; there is no single chain to walk.
Choreography distributes responsibility, which is more resilient but harder to audit. **PyFARS resolves this by construction**: every closure-rule firing produces a substrate cell with witness chain; every cell is event-sourced; every reaction-listener (the choreography layer) executes within a single substrate's audit projector.
The choreography layer is *opaque to a session reader* but *fully visible to the audit projector* — exactly the property an event-sourced architecture should have.
The harness-practice text identifies this resolution as desirable but unimplemented in current harnesses; PyFARS *is* the implementation.

### Three error-propagation patterns as substrate-resident accountability classifiers

The accountability-tracing literature (Bovens 2007; Mulgan 2000; Navy Regulations Article 0802; MASFT March 2025) names three patterns of error-propagation in multi-agent systems — each ties causal-responsibility (where the error originated) to positional-accountability (where it should have been caught) at a different point in the chain.

- **Pattern 1 — Local Error, Unvalidated Output.** Agent B produces wrong output; Agent A (delegator) accepts without checking.
  Causal responsibility: B.
  Accountability: A's principal — the validation step within A's scope was not enforced. **Substrate detection**: a closure rule fires when an outcome cell ⊤ derives from a delegated-cell that has no companion validation cell.
- **Pattern 2 — Cascading Misalignment.** Two agents are supposed to coordinate but expect different output formats.
  Output is misinterpreted; downstream decision is wrong.
  Causal responsibility: misinterpreting agent.
  Accountability: the principal who delegated to both without ensuring format compatibility. **Substrate detection**: matches MASFT FC2.6 (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) — closure rule fires when format-mismatch error-cells derive from a sibling-pair whose delegating principal is shared.
- **Pattern 3 — Specification Gap.** Captain delegates a task with vague instructions; agent interprets narrowly and misses what the captain intended.
  Causal responsibility: the agent's narrow interpretation.
  Accountability: the captain (per Navy Regulations Article 0801, "delegations shall be clear and concise"). **Substrate detection**: matches MASFT FC1 — closure rule fires when an outcome cell's `delegation-record` scope is provably under-specified relative to the workitem's intended scope (the workitem's `success-criteria` cells are not entailed by the delegation-record's `bounded-scope`).

Each pattern is a substrate-resident classifier on the accountability-projector's output.
The three classifiers compose with the existing 14-mode MASFT taxonomy: Pattern 1 ↔ FC3 (verification failure); Pattern 2 ↔ FC2 (inter-agent misalignment); Pattern 3 ↔ FC1 (specification failure).

### The settling question as substrate-decidable predicate

The accountability-tracing text identifies one operational test that settles the chain: **"Did the principal have sufficient visibility into the agent's operation that the error should have been caught?"** This is the *operational form of accountability-totality*.
PyFARS's substrate makes the question substrate-decidable by exposing visibility as a substrate-resident property:

- **Was the relevant trace cell readable by the principal at the time the error propagated?** ($H^0$-membership of the principal's audit-projection over the cell-DAG, evaluated at the operation's `causal_hash`.)
- **If yes**: the principal *had* visibility; the failure is one of vigilance — accountability attaches and the remedy is process-strengthening within the existing chain.
- **If no**: the principal *did not have* visibility; the failure is one of oversight-structure — accountability still attaches (per non-transferability) but the remedy is to add observability or restructure delegation.
- **If the principal had no reasonable way to know**: the remedy is to *narrow the delegation* — move the agent into a non-delegable role, raise the oversight tier, or replace with a simpler-substrate agent producing predictable output.

The substrate's answer in each case is *mechanical*: the audit-projector reads the trace cells, computes the principal's $H^0$-section at the time of propagation, and emits a `settling-question-cell` with one of three classifications.
The captain reads the classification to decide the remedy.

### Validation-checkpoint cells as a distinct observability primitive

Trace cells (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s production-reliability findings) record what the model saw and what it chose. **Validation-checkpoint cells** are distinct: they record where validation *should have occurred* (Agent B should have checked Agent A's output format) and whether it *did*.
A *missing* validation-checkpoint cell is a breach of the delegating principal's answerability — it shows up in the audit-projector's coverage report as a `validation-gap` cell.

Substrate-resident closure rule: `enforce-validation-checkpoint-coverage` — when a workitem's `delegation-record` names downstream-validation-required, the absence of a corresponding validation cell at workitem closure produces a $\top$-cell to be resolved.

### Mulgan's five-form coverage and the substrate's scope

Mulgan (2000) names five forms of accountability — political, legal, administrative, professional, social.
Multi-agent systems must implement at least administrative + legal forms. **PyFARS implements both directly**:

- **Administrative**: documented procedures, delegations, decision traces — substrate cells with witness chains.
- **Legal**: clear assignment of responsibility to a named individual or office — substrate's `delegation-record` cells with `accountable-principal:` field.

The other three forms (political, professional, social) are *out of scope for the substrate*; they are properties of the polity's relationship to its outside (constituents, peer-disciplines, the community).
The substrate exposes the cells that *would* support these forms (a polity that wanted to expose its political accountability could publish a projection of the audit-projector to its constituents) but does not enforce their disciplines.

### The non-transferability collapse argument as algebraic necessity

Non-transferability (a principal cannot delegate accountability away) is sometimes treated as a normative principle.
It is in fact an **algebraic necessity**: if a subordinate could delegate accountability, the entire system would collapse via *infinite sub-delegation* — the subordinate could create an unbounded chain of sub-delegations and claim non-answerability for each.
The system has no fixed point; the closure-rule lattice has no minimum element. **The lattice's existence requires a $\bot$ — and that $\bot$ is the captain.** Per the captain-as-apex pattern, the polity-root is the algebraic terminus that makes the closure-rule lattice well-defined; non-transferability is the closure-condition that prevents the lattice from collapsing into infinite descent.

---

## HJ reachability and CBF as substrate-precheck primitive

[M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) names Hamilton-Jacobi reachability and Control Barrier Functions as the safety-precheck framework for embodied participants.
This is correct as scoped, but it understates the framework's reach. **HJ reachability and CBFs are general-purpose substrate-precheck mathematics; they apply to any high-stakes operation where the substrate must be able to prove an action stays within a verified-safe state-space.**

The drone-swarm engineering literature names three components of the layered safety stack:

- **Hamilton-Jacobi reachability.** Computes "safe sets" via dynamic-programming PDE: $V_t(x) = \min_u \max_d \nabla V \cdot f(x, u, d)$, where $f$ is the system dynamics, $u$ is control, $d$ is adversarial disturbance.
  The level sets of $V$ identify the exact boundaries of state space that must be avoided.
  Computational tractable to ~10D systems for near-hover quadcopter regimes.
- **Control Barrier Functions (CBF / GCBF+).** Define a forward-invariant safe set $\mathcal{C} = \{x : h(x) \geq 0\}$ via a barrier function $h$.
  The CBF condition $\dot h(x) + \alpha(h(x)) \geq 0$ ensures any control $u$ satisfying it keeps the system in $\mathcal{C}$. **Forward invariance**: if the system starts in $\mathcal{C}$, it is mathematically incapable of leaving it, regardless of what the high-level policy dictates.
- **Neural Network Verification (NNV).** Provides reachability guarantees for learning-enabled components.

The pattern: **a fail-safe mathematical envelope wraps non-deterministic (LLM, MARL, or otherwise unbounded-entropy) policies.** The policy proposes; the envelope disposes — accepting the proposal iff it provably preserves invariants.

**Three places PyFARS's substrate has high-stakes operations:**

### Generalization 1: charter-amendment precheck

A captain proposes a charter amendment.
The charter is a closure-rule subsystem (per the section above); an amendment changes which closure rules fire.
The CBF-style invariant: the amendment must preserve charter commitments C1–C5.
Mathematically, define $h_i(\text{substrate}) \geq 0$ for each commitment — a barrier function whose positive level set is "C_i is satisfied."
The amendment is safe iff $\dot h_i(\text{substrate-after-amendment}) \geq 0$ for all $i$ — i.e., applying the amendment doesn't move the substrate toward violating any commitment.

The HJ-reachability analogue: compute the *unsafe set* — substrate configurations that, under any subsequent closure-rule firing, would violate a commitment.
An amendment that would push the substrate into the unsafe set is rejected at precheck time.

### Generalization 2: federation-envelope admission precheck

Per the [federation-resilience question](federation-resilience-and-degradation.md)'s W-MSR section, incoming federation envelopes pass through Byzantine filtering before merge.
They should additionally pass a **CBF-style admissibility precheck**: does the envelope's content, when merged, keep the substrate in the verified-safe set?

The barrier $h(\text{substrate}) \geq 0$ encodes the substrate's invariants — no charter violations, no $\top$-cells exceeding a threshold density, no resource-class budget overruns.
An envelope whose merge would violate any invariant is *rejected at the boundary* with a cell explaining which invariant would have been violated.

### Generalization 3: agential-self-generation precheck

Per [M5](../work/milestones/m5-agential-self-generation.md), agents author new skill records.
A new skill, once authored, is immediately available to dispatch on the next tick.
This is the high-stakes case where the substrate's own machinery is being modified by a non-deterministic agent.

The CBF condition: the new skill record's effect on the substrate must remain within the verified-safe set.
The precheck examines the skill's `requires-capabilities`, `effects` (declared in frontmatter), and the rule-language fragment of any closure rules it introduces (per the four-regime classification per [substrate-algebra question](substrate-algebra-closure-and-replay.md)) — and rejects skills that would push the substrate into aperiodic territory or violate charter invariants.

The HJ-reachability analogue: compute the *backward-reachable unsafe set* from the substrate's safety boundary (charter violations, resource exhaustion, $\top$-cell saturation) and reject skills whose deployment would land the substrate in that backward-reachable set within a bounded number of dispatch cycles.

A new substrate object kind, `safety-envelope-record`, at `governance/safety-envelopes/<class>.md`:

```yaml
type: safety-envelope-record
class: charter-amendment | federation-envelope-admission | self-generated-skill | drone-dispatch
barrier-function: <closure-rule-slug>      # h(state) ≥ 0 condition
forward-invariance-proof: <theorem-slug>   # CBF condition verifier
backward-reachable-unsafe-set: <cell-set>  # HJ-derived
verification-cost: O(<n>)
operator-authorization: <office>           # who can override a precheck rejection
```

A new closure rule, `precheck-against-safety-envelope`, fires before any high-stakes operation completes:

1. Identify the operation's class (charter amendment, federation merge, self-generated skill, embodied dispatch).
2. Look up the corresponding `safety-envelope-record`.
3. Evaluate the barrier function on the proposed post-operation state.
4. If $h \geq 0$, allow; if $h < 0$, reject with cell `(operation, fails-precheck, envelope-class) = T`.

A rejection routes to the operator-authorization office for explicit override (per the meaningful-human-control mandate from [`strategic-deployment-raodmap-drone-swarms`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md), this is itself a substrate operation requiring captain attestation).

**A safety-envelope discipline that's substrate-resident.** The barrier functions and unsafe sets are themselves substrate cells that the closure-rule system evaluates.
Even safety machinery is substrate content.

**Forward-invariance as a substrate-checked property.** Per the CBF construction, forward invariance is verifiable cell-level: $\dot h \geq -\alpha(h)$ becomes "the closure-rule firings between the current state and the proposed state preserve $h \geq 0$."
The substrate doesn't simulate forward evolution; it computes the differential at the proposed step.

**Layered assurance per the engineering literature's stack.** Simulation layer (run the operation in a sandbox substrate first), formal layer (HJ/CBF precheck), neural layer (NNV-style bounds on learning-enabled agents).
PyFARS realizes the formal layer; the simulation layer is the captain's existing dev/test branches; the neural layer is open work.

**What this does NOT replace.** The CRDT convergence guarantee per [`crdt-convergence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence.md) is unaffected.
Federation still converges; the precheck just rejects envelopes whose admission would violate substrate invariants.
A *rejected* envelope's content does not enter the substrate — it sits in a quarantine cell awaiting operator authorization or expiry.

The Byzantine-resilience discipline per W-MSR (per [federation-resilience question](federation-resilience-and-degradation.md)) is also separate: W-MSR handles "this peer's writes may be adversarial"; CBF handles "this aggregate operation may violate invariants."
Both apply at federation; they compose (W-MSR filtered cells go through CBF precheck before merge).

---

## What this commits to

Substrate-resident records: `conduct-teaching` records, `charter-rule-record` (per tier), `assertion-record`, `reliance-record`, `delegation-record`, `safety-envelope-record`, `accountability-trace-rule`, `governance/decisions/estoppel-doctrine.md`.

Substrate-resident closure rules: `eligibility-by-conduct-teaching`, `enforce-charter-tier-discipline`, `derive-estoppel-cells`, `accountability-trace-totality`, `precheck-against-safety-envelope`.
Plus `governance-coverage-projector` audit projector; `non-overlapping-scopes` precheck on charter amendments; time-bounded incumbency lookup for accountability attribution across rotations.

The disciplines compose: charter is a closure-rule system → its violation cells feed conduct-teachings via the eligibility check → estoppel binds the polity's prior assertions through the closure-fixed-point lattice → accountability-totality verifies the resulting outcome chain → HJ/CBF prechecks preserve the substrate's safety envelope across charter amendments, federation admissions, and self-generation.

## What this connects to

- **The [substrate-algebra question](substrate-algebra-closure-and-replay.md)** — charter compliance is fixed-point status of the rules-tier closure operator; CALM asymmetry follows from $\leq_k$-monotonicity; estoppel rests on $\mathrm{Fix}(C_\mathcal{N})$ being a complete lattice; the four-regime classification IS the language-fragment classification at the charter level; the dual-logic query API is what makes paraconsistent teaching evaluation work.
- **The [cohomological-coordination question](cohomological-coordination-and-audit.md)** — accountability-totality is BC-equivalent on jurisdiction transfers; multi-witness teaching evaluation IS the H⁰ section construction; the audit projector reads accountability cells alongside cohomological cells; charter-amendment safety-envelope is HJ/CBF on the substrate's commitment shape (which IS rigidity).
- **The [federation-resilience question](federation-resilience-and-degradation.md)** — charter amendments are exempt from W-MSR (use quorum-discipline); a rejected federation envelope's content does not enter the substrate; estoppel propagates across federation and binds peer-assertions.
- **The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)** — conduct-teaching violations participate in dispatch as $\mathbf{f}$ on the corresponding authorization, ranking violators below clean candidates; accountability-totality reads dispatch witnesses to attribute outcomes; safety-envelope precheck gates self-generation.
- **The [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)** — FC1 specification failure is accountability-chain underspecification (gap from vague scope); FC2 inter-agent misalignment is accountability-chain-overlap; conduct-teaching violations are FC2.4 (role violation); a high-$H_\rho$ agent producing a substrate-state-violating proposal is caught by safety-envelope precheck.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented.
The theorems below resolve several governance-and-accountability questions decisively.

### Charter-as-closure-system: the algebra of compliance

Charter compliance is the fixed-point status of the rules-tier closure operator.
The [closure-rule-system concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-system.md) gives the algebra directly: $\mathcal{S}$ is a finite or countable set of closure rules; $\mathrm{cl}^\mathcal{S}$ is the *least* operator satisfying inflationarity, idempotence, and rule-respecting. **Existence and uniqueness follow from a standard fixpoint construction.**

The [quiescence-as-closure-algebra theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/quiescence-as-closure-algebra.md) makes "charter compliance" precise: a polity-state is *charter-compliant* iff it is a $\mathrm{Cl}^\mathcal{S}$-algebra (a fixed point of the charter's closure operator).
By the [closure-2-monad-lax-idempotence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md)'s Kelly-Lack (K2) corollary, **being a $\mathrm{Cl}^\mathcal{S}$-algebra is a property, not additional data**: every polity-state has at most one compliance status.

This decisively answers Q7 (compliance-confirmation cadence): per CALM, certification requires coordination, but the substrate's algebra has structurally one bit per polity-state. *Continuous certification* is the substrate-coherent path because the certification is implicit in rule-pass-with-zero-firings; *per-export certification* is purely operational batching, not separate work.

### Closure-rule language fragments determine $\Pi_n$ detection cost

The [closure-rule-language concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md) and [rule-language-fragment-realizability-refinement theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md) establish the fragment hierarchy with proved levels at bare-$\Pi_1+<$ and named-ordinal-entity-equality, and *sketch-only* status for higher fragments:

| Fragment | Realizable family | Status |
|---|---|---|
| Bare $\Pi_1+<$ | Initial segments of countable limits | **proved** |
| + Named-ordinal entity-equality | Initial segments modulo finite | **proved** |
| + Ordinal-arithmetic primitives | Subsets definable in ordinal arithmetic | open conjecture |
| + $\Pi_2$-rule schemas (quantifier alternation) | Higher arithmetic-hierarchy definability | open conjecture (sketch) |
| + Second-order quantifiers | Borel/analytic subsets | open conjecture |

This decisively answers Q21 (per-pattern detection cost).
The substrate's projector terminates *only* for fragments at proved status.
Pattern-3 (specification-gap) detection requires entailment between `success-criteria` cells and `bounded-scope` cells; the entailment-checker is decidable in $\Pi_1$, *undecidable* in unrestricted $\Pi_1+\Pi_2$ per the realizability hierarchy.
The substrate's audit-export must cap detection at $\Pi_1+<$ for the projector to terminate. **Using $\Pi_2$ schemas inside the substrate's closure rules is a research action, not a substrate-policy choice.**

The corollary for Carter-Little hierarchy declaration (Q33): each discipline's epistemology / methodology / methods / practice declaration carries an implicit fragment-tier classification.
Disciplines whose methodology requires $\Pi_2$ schemas (genuine quantifier alternation in their rules) cannot be substrate-decidable at the methodology tier without research investment; they must declare their fragment-class explicitly.

### Residuated-restriction as authority gate: four authority profiles

The [residuated-restriction-as-authority-gate theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md) gives the complete behavior of $\mathrm{R}_a(x) := a \Rightarrow x$ on $\mathbf{FOUR}$:

| $\mathrm{R}_a(x)$, with $a \backslash x$ | $\bot$ | $\mathbf{t}$ | $\mathbf{f}$ | $\top$ |
|---|---|---|---|---|
| $\bot$ (silent) | $\mathbf{t}$ | $\mathbf{t}$ | $\bot$ | $\bot$ |
| $\mathbf{t}$ (affirming) | $\bot$ | $\mathbf{t}$ | $\mathbf{f}$ | $\mathbf{f}$ |
| $\mathbf{f}$ (denying) | $\mathbf{t}$ | $\mathbf{t}$ | $\mathbf{t}$ | $\mathbf{t}$ |
| $\top$ (paraconsistent) | $\bot$ | $\mathbf{t}$ | $\mathbf{f}$ | $\top$ |

Three substrate-design corollaries follow directly, and they are *counterintuitive*:

- **Silent authority ($\bot$) does NOT let negative-content payloads through.** It collapses them to $\bot$.
  Specifications that require negative content to propagate through a silent authority gate must use a different operator.
- **Denying authority ($\mathbf{f}$) produces uniformly $\mathbf{t}$ — the opposite of the name's intuition.** This is paraconsistent linear logic's ex-falso-quodlibet at the twist-product level. *Deny-by-default* authority elements are undesirable as gates because every payload becomes affirmed.
- **Paraconsistent authority ($\top$) is the IDENTITY for the residuation — it does NO gating.** Substrates that use $\top$ as a "high-permission" or "system-administrator" authority value are inadvertently specifying *no gating at all*.

This decisively answers Q22 (DM-policy-mode default per channel) and Q27 (External-surface SIL classification authority): the authority value $a$ in `incoming-constrained := sender-authority ⇒ payload` must be chosen from the four profiles with full understanding of each row's behavior. *In particular*: a "deny-by-default" inbound-trust gate must NOT use $a = \mathbf{f}$ as the authority value (that produces uniformly $\mathbf{t}$ — uniform admission); the substrate-coherent deny-by-default uses an explicit knowledge-axis projection or the dual residual on the truth-axis.
The four profiles are structural; three diverge from prose intuitions.

### Beck-Chevalley = jurisdiction transfer's algebraic test

The [beck-chevalley-commutation-on-predication-bilattices theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/beck-chevalley-commutation-on-predication-bilattices.md) is unconditional: every pullback square in $\mathcal{C}$ produces BC isomorphisms in $\mathcal{E}$.
For governance, this means:

> Accountability-totality is BC-equivalent on jurisdiction transfers.

The four predicate-category generators provide the algebraic content of jurisdiction transfer.
A jurisdiction transfer from office $O_1$ to office $O_2$ is a [predicate-specialization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $f : O_1 \to O_2$ on the predicate category; BC commutation means accountability-records on the joint scope ($O_1 \cap O_2$) extend coherently to the union ($O_1 \cup O_2$).
The substrate's `accountability-totality` cell-class is exactly the BC-equivalence class.

For Q12 (accountability-trace frequency): per-tick is correct because BC commutation is *cellwise* and per-cell-firing — the trace is computed incrementally without batch reconstruction.
Per-export is purely an audit-format choice.

### Twisted-BC: meaningful-human-control's $\leq_k$-axis-only authority

The [twisted-beck-chevalley theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twisted-beck-chevalley.md) extends BC to gauge-twisted reindexings — but **only for $K_4^{\,k} = \{e, {\sim}\}$ (knowledge-axis involutions)**.
The $\leq_t$-axis (conflation $-$) and the order-reversing elements fail because $-(\bot) = \top$ doesn't commute with extension-by-$\bot$.

For meaningful-human-control's four-condition predicate (Q40, Q43): the four conditions are 1. captain witness chain; 2. safety-envelope precheck; 3. charter-tier discipline; 4. falsifiable-agency Condition 3 (persistent state).

Condition (3)'s charter-tier discipline interacts with twisted-BC: when an authority transfer carries a *normative-shift* (e.g., civil-jurisdiction → defense-jurisdiction with different binding interpretations), the twist must lie in $K_4^{\,k}$ for the substrate's accountability-totality to commute structurally.
Normative shifts that would require $K_4^{\,t}$ twists (factual polarity reversals — civil "lawful" $\to$ defense "lawful" via different definitions of the same fact) are *not* substrate-supported: the substrate must reject them or treat them as boundary discontinuities requiring explicit captain attestation.

This sharpens Q43 (polity-defined MHC vs externally-imposed): the polity wins on $K_4^{\,k}$-axis disagreements (epistemic-frame-flips between regulatory regimes — same facts, different interpretive frames), but on $K_4^{\,t}$-axis disagreements (factual polarity reversals — same fact, different polarity verdicts), the substrate has no algebraic resolution.
Such cases require explicit human resolution per MHC discipline.

### Multi-observer disagreement IS the cohomological trace

The [multi-observer-system object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md) gives the algebraic shape of multi-witness teaching evaluation directly: $V : O \to \mathrm{Settlings}_B$ where $O$ is the witness category.
For discrete $O$, consensus is pointwise meet; for non-discrete $O$, consensus is the categorical limit, and $H^1(O, \mathcal{V})$ measures coherent disagreement.

The [bilattice-network-sheaf-consensus theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md)'s con-failure-as-$\top$ identification is the load-bearing fact for governance: **the disagreement loci are the $\top$-cells of the joint settling**.
Multi-witness teaching evaluation that produces a $\top$-cell *is* the disagreement; the substrate's `accountability-totality` reading of $\top$-cells is the audit-projection of that disagreement.

This bears directly on Q3 (handoff from teaching-violation $\top$-cells to restorative-handling): the $\top$-cell IS the structural location of the violation; the `restorative-task-class:` field is the substrate's *response* to the $\top$-cell, not its definition.
Default handling (any teaching can override) is substrate-coherent because the $\top$-cell carries the disagreement structurally.

### Two internal logics: classical for legal export, paraconsistent for substrate-internal

The [two-internal-logics theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md) establishes that every predication hyperdoctrine supports both classical $T_t$ and paraconsistent $T_k$.
The corpus's recommendation, applied to governance:

> Classical knowledge-base / database queries: use $T_t$.
> Two-valued, compatible with classical entailment.
> Distributed / CRDT / paraconsistent reasoning: use $T_k$.
> The $\top$ on the diagonal of $\Delta_E^k$ means "information-maximal"; $\bot$ off means "no claim."
> Stable under $\vee_k$-merge.

For Q43 (polity-defined MHC vs externally-imposed): external regulators (FAA, DoD, NATO) operate in classical first-order logic — their compliance reports require $T_t$-derivations.
The polity's substrate operates in $T_k$ to handle multi-witness disagreement and paraconsistent inconsistencies. **The polity's external compliance-export is a $T_t$-projection of $T_k$-internal state.** Per the [truth-knowledge cohomology long exact sequence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md), the projection is *lossless* iff the substrate has no $\top$-cells in the export window — and *lossy by exactly $H^n(\mathcal{F}_U^{(\top)})$* otherwise.
The export must declare the inconsistency-cohomology gap explicitly to be honest with regulators.

This decisively answers Q31 (audit-export schema for industrial vs polity-internal decisions): one schema cannot satisfy both regulators if either of them requires the *substrate-internal* paraconsistent representation.
Two specialized exports are structurally correct: a $T_t$-export for classical regulators (EU AI Act, IEC 61508) and a $T_k$-export for substrate-internal audit (showing the full bilattice-graded state including $\top$-cells).
The two are related by the LES; the gap between them is the polity's published inconsistency-cohomology.

### Realizability cardinality bound: scope-membership tractability

The [realizability-cardinality-bound theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md) caps realizable subsets at $2^{\aleph_0}$ — strictly smaller than the universe of all subsets of countable limits ($2^{\aleph_1}$).
The realizable family in bare-$\Pi_1+<$ is a *one-parameter family of initial segments* — much smaller than $2^{\aleph_0}$.

This decisively answers Q11 (scope-membership predicate tractability): tractable iff the predicate language is bounded — and the corpus's "bounded" means *bare-$\Pi_1+<$ or named-ordinal-entity-equality*, where realizability is a one-parameter family. **Finite scope-membership predicates are tractable; infinite-but-bounded predicates have one-parameter realizability; unbounded $\Pi_2$ predicates are intractable.** Substrate-resident scope-membership tests must be in the proved fragment.

For Q5 (fragment-derivation in pypredcalc): the same infrastructure as the four-regime classifier.
Both compute the rule-language fragment of a closure rule; both decidable from the rule's syntactic structure.

### Equivariant cohomology decomposition: governance disagreement is sector-typed

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) splits $H^1$ into four sectors.
For governance (multi-witness teaching evaluation, accountability traces, audit projection):

- $H^1_{\chi_\sim}$ disagreement: epistemic-frame disagreement between offices (different interpretive frames, no inconsistency).
- $H^1_{\chi_-}$ disagreement: $\top$-firings — paraconsistent inconsistencies between witnesses.
- $H^1_{\chi_{\sim\circ-}}$ disagreement: mixed (frame-difference + inconsistency).
- $H^1_\mathrm{id}$ content: symmetric truth-plus-falsity (witnesses agree on both positive and negative content).

This refines Q12 (accountability-trace frequency): per-tick accountability traces should report the 4-vector decomposition, not just a scalar disagreement count.
A high-$\chi_\sim$ office (frequent epistemic-frame disagreements) is structurally different from a high-$\chi_-$ office (frequent paraconsistent inconsistencies); the conduct-teaching response should differ between them.

For Q3 (handoff from teaching-violation $\top$-cells to restorative-handling): the $\top$-cells are exactly the $H^1_{\chi_-}$ generators.
The restorative-handler's task-class can be sector-typed: $\chi_\sim$-violations need *interpretive-alignment* handling (clarify the frame); $\chi_-$-violations need *fact-correction* handling (resolve the inconsistency); mixed and symmetric sectors need different responses.
The substrate's `restorative-task-class:` field is sector-derivable.

### Settling cohomology vanishes above degree 1: charter-amendment safety bound

The [settling-cohomology-vanishes-above-degree-1 theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-cohomology-vanishes-above-degree-1.md) gives $H^n = 0$ for $n \geq 2$ under $\mathrm{cd}(\mathcal{C}^\mathrm{op}) \leq 1$.
The hypothesis holds for the standard four-predicate-generator structure; *fails* if the polity adds higher-order morphisms.

This sharpens Q15 (barrier-function representation) and Q17 (operator-authorization override): the safety-envelope precheck's $H^2$-anticipating components are *structurally absent* in the standard predicate-category structure, so the precheck operates entirely on $H^0, H^1$.
Charter amendments that introduce higher-arity predicates or modal operators *re-introduce* the $H^2$ possibility — and require explicit captain attestation that the cohomological-dimension hypothesis still holds.
The substrate-resident `verify-predicate-category-cd-bound` closure rule fires on charter amendments touching $\mathcal{C}$'s structure.

### MLD-equivalence: accountability-trace quotient

The [mutually-locally-derivable concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md) is the equivalence relation classified by $H^1$.
Settling-shift and structure-preserving relabelings are MLD-equivalent; arbitrary relabelings are not.

For Q13 (time-bounded incumbency lookup): MLD-equivalence collapses settling-shift, so two incumbency periods with the *same* conduct-pattern at *different* time spans are MLD-equivalent.
The accountability-trace's quotient is by MLD; the projector reports MLD-classes per audit-export window, not raw settlings. **Span-cell denormalization is correct only after MLD-quotient** — otherwise the same conduct-pattern shifted in time gets reported as a separate accountability event.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Substrate format for a conduct-teaching's predicate body.** **Theory: bare $\Pi_1+<$.** Per the rule-language-fragment-realizability hierarchy, the predicate body must be in the bare $\Pi_1+<$ fragment for substrate-decidable enforcement; richer fragments require research investment and may not terminate at audit-export.
  Free-form predicate is too unconstrained; the small set of predicate-combinators (cell-pattern-matchers, witness-chain-properties, observation-aggregations) is the substrate-coherent shape.
2. **Granularity of teachings the polity inherits** — small set (5–10) with strong predicates, or large set (50+) with weaker predicates.
3. **Handoff from teaching-violation $\top$ cells to restorative-handling** — explicit `restorative-task-class:` field on the teaching record vs default handling that any teaching can override.
4. **Observation-cell schema enrichment** — ships in [M4](../work/milestones/m4-memory-feedback.md) or in an [M4](../work/milestones/m4-memory-feedback.md) precondition task.
5. **Fragment-derivation in pypredcalc.** Shares infrastructure with the four-regime classifier per [substrate-algebra question](substrate-algebra-closure-and-replay.md).
6. **Tier-mismatch resolution.** Authoring tooling surfaces this *before* commit, not at commit time.
7. **Compliance-confirmation cadence.** Per CALM, certification requires coordination; expensive.
  Per-export (run certification only at audit-export time) vs continuous (long-running closure rule incrementally confirms).
8. **Estoppel doctrine commitment.** [`governance/decisions/`](../governance/decisions/) adopts one or more doctrines.
  Detrimental-reliance is the broadest; estoppel-by-convention captures shared-practice norms.
9. **Reliance-recording surface.** Reliance events are often implicit ("I delegated assuming the rule held"); make them explicit, perhaps as part of every delegation cell.
10. **Estoppel-defeat protocol.** Per part (e), defeat is witness removal; substrate should NOT permit silent witness-removal; defeat should be an audit-witnessed action.
11. **Scope-membership predicate.** Tractable iff the predicate language is bounded.
12. **Accountability-trace frequency** — per-tick (heaviest, most live) vs per-export (cheaper, lets gaps accumulate).
  Hybrid possible.
13. **Time-bounded incumbency lookup** — denormalize into a span-cell vs compute from raw cells per query.
14. **Skill-authoring interaction with self-generation per [M5](../work/milestones/m5-agential-self-generation.md).** When an agent self-generates a skill, accountability for skill *authoring* and skill *invocation* both attach to the agent's delegating principal — but the projector should treat them as distinct chain entries.
15. **Barrier-function representation.** Closure-rule body computing $h(\text{state})$ vs pypredcalc primitive `(barrier-formula, state-snapshot) -> bool`.
  First substrate-coherent; second reusable.
16. **HJ-reachability scope.** Full HJ PDE solving is overkill; the discrete analogue (compute backward-reachable unsafe set via fixed-point on closure-rule firings) is more tractable.
17. **Operator-authorization override.** A captain can override a precheck rejection by explicit attestation.
  Per `amend-hard-core` decision pattern, hard-core amendments require quorum-consensus.
18. **Settling-question evaluation cadence.** Per-error (substrate emits `settling-question-cell` as soon as an outcome ⊤ derives), per-export (computed only at audit-export time for the EU-AI-Act report), or hybrid (per-error for severity-above-threshold, per-export for the rest).
  Per-error catches drift earliest; per-export is cheapest.
19. **Validation-checkpoint declaration discipline.** Whether downstream-validation-required is *required-by-default* (every delegation cell must declare expected validation cells) or *opt-in* (delegation may omit, validation-gap detection skipped).
  Required-by-default catches gaps structurally; opt-in lets the polity grow into the discipline.
20. **Mulgan-form coverage projection.** Whether the substrate publishes a `mulgan-coverage-record` per audit-export period (administrative + legal explicitly tracked, others noted as out-of-scope), or treats the three out-of-scope forms as silent.
  Explicit publication satisfies regulators that *the polity knows what it is and isn't accountable for*.
21. **Per-pattern detection cost.** Pattern-3 (specification-gap) detection requires entailment-checking between `success-criteria` cells and `bounded-scope` cells; this is closure-rule-language-fragment-dependent (decidable in $\Pi_1$, undecidable in unrestricted $\Pi_1+\Pi_2$ per the charter-tier hierarchy).
  Detection scope must be capped at $\Pi_1+<$ for the projector to terminate.
22. **DM-policy-mode default per channel.** Per-channel default — `disabled` (closed by default, opt-in per channel; safest), `pairing` (investiture-required; matches OpenClaw's working default and the Navy-conservative posture), or `allowlist` (admin-curated; lowest friction once the allowlist exists).
  The first two are conservative-by-default; the third presumes operator setup work upfront.
23. **Investiture-witness for `pairing` mode.** OpenClaw uses a short-code; PyFARS could adopt the same (lightweight; phone-friendly), use captain-attestation (heavier; substrate-coherent), or use bearer-token-bound (composes with the dispatch question's token verdict).
  Multiple paths likely depending on channel risk-tier.
24. **Charter-fragment hierarchy applied at outbound surfaces.** The DM-policy hierarchy applies at inbound; symmetrically, outbound trust gating (when the polity replies/posts to external channels) could use the same four-mode classifier.
  Whether outbound mirrors inbound automatically (symmetric default) or requires separate authorship (asymmetric authority over outbound vs inbound).
25. **Inbound-trust-gate coverage in audit-export.** Per [M11](../work/milestones/m11-assurance-audit-chain-export.md), the audit-export should report inbound-trust-gate state per channel.
  Whether the audit projector emits a per-channel `inbound-trust-gate-record` snapshot per export period, or only emits change-cells (deltas).
  First produces complete state per export; second is cheaper but requires reconstruction.
26. **Pairing-mode investiture-loop closure.** When an unknown sender is short-coded but never approved, the investiture loop has no termination condition by default.
  Closure rule needs an `investiture-loop-timeout` parameter (after which the unapproved sender's pending state $\bot \to \top$ collapses back to $\bot$ permanently or for a cooldown period).
27. **External-surface SIL classification authority.** Who declares an external surface's SIL rating?
  Captain alone (authoritative), polity-quorum (deliberative), or substrate-derived (mechanically computed from the surface's safety-impact predication).
  All three layered: substrate-suggests, captain-or-quorum-confirms, audit-witnesses.
28. **AI-call-policy default per surface class.** The substrate's `external-surface-record.ai-call-policy:` field defaults — `prohibited` for SIL-4 surfaces, `proposal-only` for SIL-3, `allowed-with-approval-gate` for SIL-2/1, `allowed` for non-SIL-rated.
  Whether to encode this default in the substrate or require explicit per-surface declaration.
  Default-with-override is the lightest-touch path.
29. **Adversarial-robustness classification for LLM endpoints.** Each LLM endpoint (Anthropic Claude, OpenAI GPT, Google Gemini, local Ollama) has a different adversarial-robustness profile.
  Substrate-resident `llm-endpoint-record` with `adversarial-robustness-class` field; closure rule `verify-adversarial-robustness-class` gates LLM calls into bounded-statistical surfaces.
  Per-endpoint classification cadence — once at registration, periodically per drift-detection, or per-call.
30. **Vendor-stack composition policy.** When the polity composes with a vendor stack (Siemens MindSphere, Rockwell AADvance, etc.), the charter authorizes which surfaces are addressable via foreign-interior cobordism.
  Whether the polity authors a per-vendor composition record (heavyweight; explicit), or the substrate auto-derives composition from MCP-cascade-record + external-surface-record (lightweight; substrate-coherent).
31. **Audit-export schema for industrial vs polity-internal decisions.** [M11](../work/milestones/m11-assurance-audit-chain-export.md)'s audit export must satisfy both the EU AI Act's post-market monitoring requirements (focused on AI-system decisions) and IEC 61508 audit-and-reversibility requirements (focused on safety-critical decisions).
  Whether one schema satisfies both or two specialized exports.
  Single schema is cleaner if both regulators accept it; two exports if the schemas conflict.
32. **Four-cap-stack monitoring per workitem-class.** The 250%-ROI / 40%-cancellation dichotomy maps to whether all four caps are present.
  Substrate-resident `four-cap-monitor-record` per workitem-class tracking which caps are active; substrate emits warning cells when a cap goes inactive.
  Cadence — per-tick, per-cap-state-change, per-export.
33. **Carter-Little hierarchy declaration per discipline.** Each discipline's epistemology / methodology / methods / practice should be declared explicitly in a `methods-record` cell.
  Whether to require this declaration before a discipline can author substrate cells (strict; ensures epistemological grounding) or make it advisory (lenient; lets disciplines accumulate practice first then formalize).
  Strict for new disciplines; lenient for legacy disciplines being formalized.
34. **Method-ontology import authority.** When the polity imports an external ontology (EXPO, OBI, P-Plan, REPRODUCE-ME, SPAR), who declares it?
  Captain alone, theory-officer office, or substrate-derived (closure rule reads the import frontmatter and validates against canonical ontology spec).
  Theory-officer with captain-attestation is the lightest-touch governance path.
35. **External-grounding citation discipline scope.** The substrate's `verify-external-grounding` closure rule checks references exist; whether it also checks references are *canonical* (against a per-discipline canonical-literature corpus) requires the corpus to be substrate-resident.
  Per-discipline canonical-literature-record cells; closure rule cross-checks against the corpus.
36. **Accretion-trajectory stage classification frequency.** Per-method (each methods-record carries `current-stage:` which is updated when the method matures) vs per-tick (substrate computes per-tick stage classification across all methods).
  Per-method with manual updates is lightest; per-tick computation is substrate-coherent but expensive over many disciplines.
37. **Divergence-from-canonical justification tier.** When a polity's method diverges from canonical practice, the divergence requires justification.
  Whether justification is captain-attestation (rules-tier authority), polity-quorum (hard-core authority for epistemology-level divergences), or theory-officer authority (guidelines-tier).
  Per Carter-Little hierarchy mapping: the divergence's level dictates the required justification tier.
38. **Polity-as-comprehensive-method-ontology external publication.** Once the polity instantiates predication-categories across multiple disciplines with cross-disciplinary BC-commutation, the polity IS a comprehensive method-ontology.
  Whether to publish this externally as a contribution to the broader knowledge-organization community, and via what channel (academic publication, web-published ontology, polity-homepage projection).
  Per the [polity-homepage-as-public-projection](polity-homepage-as-public-projection.md) question.
39. **Civil-vs-defense-vs-dual-use deployment classification.** The polity's substrate satisfies the institutional-accountability requirement by construction; specific deployment paths determine which regulatory anchors apply.
  Whether the polity's external-surface-records carry an explicit `deployment-class:` field (civil / defense / dual-use) or auto-derives from the surface's regulatory bindings.
  Explicit is more reviewable; auto-derived is substrate-coherent.
40. **Meaningful-human-control verification cadence.** The four-condition predicate (captain-witness-chain + safety-envelope-precheck + charter-tier-discipline + falsifiable-agency-Condition-3) needs verification per workitem.
  Per-workitem-completion (substrate-resident closure rule fires at workitem-close; immediate diagnostics) vs per-export (cheap; defers diagnostics to audit-export time).
  Per-workitem for safety-critical; per-export for non-safety-critical.
41. **Eight-clause governed-autonomy compliance reporting.** The audit-projector should emit a `governed-autonomy-compliance-record` per audit-export period, scoring the polity's substrate against each of the eight clauses.
  Whether to report binary compliance (each clause: yes/no) or graded compliance (per-clause score with evidence cells).
  Graded is more substantive; binary is simpler regulatory-export.
42. **Regulatory-anchor authority-precedence resolution.** When multiple regulatory regimes bind (e.g., FAA Remote ID + DoD 3000.09 + EASA U-space all apply to a cross-jurisdictional dual-use polity), conflicts are inevitable.
  Substrate-resident `regulatory-precedence-record` declares which regime takes precedence on which axis; closure rule `resolve-regulatory-conflict` computes the binding decision per workitem.
43. **Polity-defined meaningful-human-control vs externally-imposed.** The polity authors its own substrate-decidable definition of meaningful human control via charter; whether external regulators (FAA, DoD, NATO) accept this or impose their own definition.
  Per the substrate-as-source-of-truth claim, polity wins on polity-internal disputes; for external compliance, the polity's definition must be *at least as strict* as the binding regulatory regime's interpretation.
