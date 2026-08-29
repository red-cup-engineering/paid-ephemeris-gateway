# Autonomous-swarm report enrichment notes

Status: development note Source basis: `deep-research-report(1).md`, attached in the ChatGPT working session on 2026-05-05.
Scope: translate the report into PyFARS development work without turning the repository into a domain-specific drone-swarm project.

## Purpose

The attached report is useful to PyFARS because it is a dense example of a research synthesis that mixes mathematical claims, software-architecture claims, regulatory claims, safety claims, hardware constraints, and unresolved public-evidence gaps.
That mixture makes it a good stress case for PyFARS features that extract, normalize, weigh, and render research claims.

This note converts the report into requirements and fixtures for PyFARS development.
It should be read as an enrichment layer for future implementation, test, and documentation work.

## Source characteristics worth preserving

The report does not present a single linear argument.
It uses a layered structure:

1. An executive synthesis that distinguishes mature bounded applications from immature open-world autonomy.
2. A taxonomy of autonomous agents and swarms across embodiment, control architecture, homogeneity, topology, information structure, decision model, and assurance class.
3. A mathematical core built from graph-coupled dynamical systems, consensus, formation control, flocking, distributed optimization, game theory, and estimation.
4. A learning and AI layer that treats MARL, imitation learning, federated learning, meta-learning, model-based learning, and graph control-barrier functions as distinct families with different assurance status.
5. A systems layer in which communication, middleware, energy, sensing, and simulation constrain feasible autonomy.
6. A verification, security, and resilience layer that includes simulation, digital twins, Hamilton-Jacobi reachability, neural-network verification, resilient consensus, GNSS spoofing, zero trust, and Remote ID.
7. A civic/defense governance layer where regulation, accountability, human judgment, privacy, and international legal uncertainty shape what counts as deployable autonomy.

PyFARS should preserve that kind of layered heterogeneity rather than flattening it into a single claim list.

## Development requirements derived from the report

### 1. Represent layered claims explicitly

The report repeatedly distinguishes low-level control guarantees, middle-layer coordination, high-level planning, learned perception/policy components, operational constraints, and governance constraints.
PyFARS should support an explicit `layer` or `stratum` field on extracted claims.

Suggested controlled vocabulary:

- `mathematical_foundation`
- `learning_method`
- `systems_architecture`
- `communication_hardware`
- `verification_assurance`
- `security_resilience`
- `regulation_governance`
- `deployment_readiness`
- `open_question`

This matters because the same lexical form can mean different things at different layers.
For example, "safe" in a control-barrier-function section means forward-invariance of a safe set under assumptions; "safe" in a regulatory section means airspace compliance, accountability, or human oversight.

### 2. Distinguish evidence type from confidence

The report combines theorem-backed results, public product specifications, regulatory requirements, survey claims, and explicit gaps in public data.
PyFARS should not infer confidence solely from citation density.
It needs a separate `evidence_type` field.

Suggested evidence types:

- `theorem_or_proof`
- `simulation_result`
- `hardware_demonstration`
- `benchmark_result`
- `public_specification`
- `official_policy_or_regulation`
- `survey_synthesis`
- `expert_interpretation`
- `negative_evidence_or_gap`

A claim can have high confidence and still be limited in scope.
Example: a public product page can support an endurance figure, but not a general claim about swarm endurance under payload, wind, and communication load.

### 3. Track operational envelope as first-class metadata

The report's central conclusion is conditional: drone-swarm autonomy is mature for bounded tasks but not for unrestricted, open-world, safety-critical operation under adversarial sensing, communications denial, and dense civilian airspace interaction.
PyFARS should capture those conditions in structured form rather than burying them in prose.

Suggested fields:

```yaml
operational_envelope:
  task_bound: bounded | open_world | unknown
  airspace: structured | managed | dense_civilian | adversarial | unknown
  communication: reliable | lossy | denied | contested | unspecified
  sensing: cooperative | degraded | adversarial | unspecified
  human_oversight: direct | supervisory | delayed | unspecified
  deployment_domain: civic | defense | dual_use | research | unspecified
```

This would allow renderers to distinguish "works in structured inspection settings" from "works in contested, unstructured, safety-critical settings."

### 4. Represent mathematical artifacts directly

The report includes equations for consensus, formation control, flocking, ADMM, mean-field games, Kalman filtering, control barrier functions, energy budgets, and Hamilton-Jacobi reachability.
PyFARS should treat these as structured artifacts connected to claims, not as disposable text blocks.

Suggested artifact model:

```yaml
artifact:
  kind: equation | algorithm | table | diagram | benchmark | regulation
  label: consensus_rate_bound
  notation_scope: local | global | ambiguous
  supports_claims:
    - claim_id
  assumptions:
    - connected undirected graph
    - compatible weights
  limitations:
    - does not cover directed switching graphs with packet loss
```

The useful extraction target is not merely "an equation exists."
The useful target is the relationship among equation, assumptions, theorem-like guarantee, and limitation.

### 5. Add claim polarity and limitation handling

The report frequently makes negative or limiting claims.
Examples include public quantitative data being sparse, formal verification not scaling to end-to-end multimodal stacks, and learning methods needing safety wrappers in critical deployments.

PyFARS should preserve negative evidence and limitation claims.
A renderer should be able to surface them in sections such as "Known limits," "Unsupported extrapolations," and "Open questions."

Suggested `claim_polarity` values:

- `affirming`
- `limiting`
- `contrasting`
- `open_question`
- `scope_condition`
- `risk_warning`

### 6. Add assurance-status extraction

The report uses an important recurring distinction: empirical-only systems, partially certified systems, theorem-backed components, and governance-backed deployment controls.
PyFARS should have an `assurance_status` field.

Suggested values:

- `empirical_only`
- `structural_guarantee`
- `formal_guarantee_under_assumptions`
- `policy_or_process_requirement`
- `hardware_demonstrated`
- `unverified_or_unspecified`

This field would support automated review questions such as: "Which claims are being presented as deployable but only have empirical support?"

### 7. Model source freshness and volatility

The report is explicitly time-sensitive as of May 2026.
Regulatory status, platform specs, middleware behavior, and public defense programs can change.
PyFARS should mark volatile domains so future update workflows know where recency checks matter.

Suggested volatility classes:

- `stable_mathematical_result`
- `active_research_frontier`
- `software_stack_behavior`
- `public_product_spec`
- `regulatory_status`
- `policy_position`
- `public_program_status`

This can guide revalidation.
A theorem from 2007 may be stable; a BVLOS regulatory pathway or product endurance figure may require a freshness check.

## Candidate fixtures from the report

The report can seed a compact fixture set for tests that exercise claim extraction and rendering.

### Fixture A: bounded-readiness claim

```yaml
claim: Drone-swarm autonomy is technically mature for tightly bounded tasks such as search, mapping, inspection, communication relay, coordinated surveillance, and selected logistics in structured airspace or managed operational envelopes.
layer: deployment_readiness
evidence_type: survey_synthesis
claim_polarity: affirming
operational_envelope:
  task_bound: bounded
  airspace: structured
  communication: unspecified
  sensing: unspecified
  human_oversight: supervisory
limitations:
  - Does not imply open-world safety-critical autonomy.
  - Does not imply performance under adversarial sensing or communications denial.
```

### Fixture B: open-world limitation claim

```yaml
claim: Large-scale unrestricted open-world safety-critical autonomy is not yet mature under adversarial sensing, communications denial, and dense civilian airspace interaction without substantial human oversight and infrastructure support.
layer: deployment_readiness
evidence_type: survey_synthesis
claim_polarity: limiting
operational_envelope:
  task_bound: open_world
  airspace: dense_civilian
  communication: denied
  sensing: adversarial
  human_oversight: supervisory
```

### Fixture C: formal-assurance claim

```yaml
claim: Control barrier functions can define forward-invariant safe sets under suitable regularity assumptions.
layer: verification_assurance
evidence_type: theorem_or_proof
claim_polarity: affirming
assurance_status: formal_guarantee_under_assumptions
artifact:
  kind: equation
  label: cbf_condition
assumptions:
  - suitable regularity assumptions
  - valid dynamics and state estimate
limitations:
  - certificate quality depends on function class and sensing assumptions
```

### Fixture D: communication-system constraint

```yaml
claim: Communication is part of the swarm control plant, not merely a support channel.
layer: communication_hardware
evidence_type: expert_interpretation
claim_polarity: affirming
assurance_status: unverified_or_unspecified
implications:
  - event-triggered coordination should be modeled
  - message loss and QoS incompatibility can change system behavior
  - degraded-mode autonomy should be represented in system assumptions
```

### Fixture E: public-data gap

```yaml
claim: Public quantitative data are sparse for very large heterogeneous swarms, communication-denied missions, aerodynamic interaction effects, authenticated Remote ID deployments, and defense-only platforms.
layer: open_question
evidence_type: negative_evidence_or_gap
claim_polarity: open_question
assurance_status: unverified_or_unspecified
renderer_hint: Include under limitations or evidence gaps, not under established findings.
```

## Suggested development tasks

1. Extend the internal claim schema with `layer`, `evidence_type`, `claim_polarity`, `assurance_status`, `operational_envelope`, and `volatility` fields.
2. Add lint rules that flag unsupported escalation from bounded operational envelopes to general deployment claims.
3. Add renderer support for a "Scope and limits" block that is populated from `claim_polarity: limiting`, `scope_condition`, and `open_question` claims.
4. Add citation-density review that treats official policy, public specifications, theorem-backed results, and survey synthesis differently rather than counting all citations uniformly.
5. Add equation/artifact extraction tests that require assumptions and limitations to travel with the formula.
6. Add a freshness-review command or report section for volatile claims.
7. Add a dual-use sensitivity marker for research domains where defense, policing, surveillance, and civilian safety implications overlap.

## Non-goals

This enrichment should not make PyFARS produce operational drone-swarm tactics, targeting advice, evasion guidance, or weaponization guidance.
The report should be used as a research-synthesis and assurance-modeling stress case.
PyFARS should emphasize bounded claims, evidence provenance, limitations, uncertainty, and governance-aware rendering.

## Review questions for future PyFARS runs

When PyFARS processes a similarly mixed technical report, it should be able to answer:

1. Which claims are theorem-backed, which are empirical, and which are policy-based?
2. Which claims are valid only under a specific operational envelope?
3. Which claims depend on current regulation or public product data and need freshness review?
4. Which mathematical artifacts support which claims, and under which assumptions?
5. Which safety claims rely on learned components, formal shields, or governance process rather than direct proof?
6. Which claims describe evidence gaps and should not be rendered as positive findings?
7. Which conclusions are dual-use sensitive and should be phrased as governance or assurance requirements rather than operational instructions?

## Implementation notes

The strongest immediate PyFARS value is not domain knowledge about drones.
It is better machinery for scoped synthesis.
The attached report shows that high-quality synthesis needs to preserve uncertainty, operational envelope, evidence class, and assurance status together.
Those are cross-domain development priorities for PyFARS.
