---
type: question
status: open
explores: [stigmergy-decouples-coordination-cost, swarm-vs-orchestration-dichotomy, emergence-requires-local-determinism, llm-swarms-fail-classical-conditions, saturation-threshold, single-agent-parity-below-saturation, ctde, federated-learning-fedavg, masft-failure-mode-taxonomy, handoff-cobordism, succession-as-handoff-cobordism, m4-memory-feedback, m5-agential-self-generation, m11-assurance-audit-chain-export]
---

# How does PyFARS realize memory-feedback, agential self-generation, and runtime failure-handling — stigmergic cell-update beneath orchestrated dispatch, CTDE training, saturation/entropy caps, MASFT failure-mode taxonomy, and handoff cobordism — as one coherent substrate discipline?

[M4](../work/milestones/m4-memory-feedback.md)'s memory-feedback loop is structurally distinct from [M2](../work/milestones/m2-substrate-dispatch.md)'s dispatch: the consolidator step is deterministic (a closure rule), the agent invocation is stochastic.
PyFARS is *layered*: orchestrated dispatch above stigmergic cell-update feedback.
The swarm-intelligence and agents-theory theorems make this layering rigorous, supply quantitative caps (saturation-threshold ~4 agents, bounded $H_\rho$), classify failures (MASFT 14-mode taxonomy), and structure cross-session/cross-incumbency continuity (handoff-cobordism).
[M5](../work/milestones/m5-agential-self-generation.md) self-generation rests on the CTDE separation of training-time global-critic from execution-time local-actor.

The dispatch layer fails the classical swarm conditions per [`llm-swarms-fail-classical-conditions`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md); the cell-update layer satisfies them.
The substrate's memory-feedback discipline lives in the latter; the saturation cap and entropy bound live in the former.

---

## Stigmergic cell-update beneath orchestrated dispatch

PyFARS dispatch is orchestrated, not classical-swarm-coordinated, per [`swarm-vs-orchestration-dichotomy`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md).
The roadmap rightly disclaims classical-swarm guarantees at the dispatch layer.

[M4](../work/milestones/m4-memory-feedback.md)'s memory-feedback loop is a *different* layer with a different algebraic character.
Its pattern — agents deposit observation cells; a deterministic consolidator aggregates traces into instinct cells; subsequent agent decisions read instinct cells; no agent observes another agent's reasoning — is exactly what [`stigmergy-decouples-coordination-cost`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/stigmergy-decouples-coordination-cost.md) formalizes.
The local-determinism precondition from [`emergence-requires-local-determinism`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/emergence-requires-local-determinism.md) is satisfied at this layer: consolidation is a closure rule, deterministic — not an LLM call.

PyFARS is therefore layered: **orchestrated dispatch above stigmergic cell-update feedback**.
The stigmergy theorem's cost-decoupling claim — coordination cost grows independently of agent count — applies to the cell-update layer.
Two new agents joining a federation share the substrate's observation+instinct cells at zero additional coordination cost.
They cannot jointly *dispatch* without invoking the orchestrated layer, where cost scales with agent count.

This layered reading is a refinement of the swarm-vs-orchestration dichotomy: the dichotomy is system-wide for *flat* systems; PyFARS shows it splits across layers when the system is layered with deterministic-cell-update beneath nondeterministic-dispatch.
The dispatch layer fails the classical conditions; the cell-update layer satisfies them.

**[M4](../work/milestones/m4-memory-feedback.md) commitments under this view:**

- **Trace decay.** Stigmergic pheromones decay.
  Instinct cells must too — a `decay` closure rule firing at consolidation cadence drops the knowledge-order weight on instinct cells whose supporting observations age out.
  Without decay, the layer accumulates monotonically and selection over-fits to deep history.
  This is a non-negotiable consequence of the stigmergy theorem; if PyFARS doesn't decay, the cost-decoupling claim does not hold.
- **Composability.** Two consolidation agents synthesizing instincts from the same observations must produce reconcilable instinct cells (cellwise-merge-friendly, no $\top$).
  Implied by closure-monotonicity at the cell-update layer; should be tested directly when [M6](../work/milestones/m6-federation.md) federation lands.
- **Substrate-cost-decoupling regression.** Adding agents to the cell-update layer (more observation producers, more consolidation candidates) must not slow per-tick consolidation by more than a constant factor.
  This is the stigmergy theorem's empirical signature.
- **Honest naming.** The roadmap's [M9–M12 closing remark](../work/milestones/roadmap.md) ("PyFARS is small, orchestrated, expensive, with no convergence guarantees") is true at the dispatch layer and false at the cell-update layer.
  The honest framing is *layered*: orchestrated above, stigmergic below.

---

## CTDE: substrate-as-global-critic, office-scoped context-as-local-actor

The drone-swarm engineering literature establishes Centralized Training, Decentralized Execution (CTDE) as the dominant MARL paradigm.
From [`emergent-intelligence-drone-swarms`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/emergent-intelligence-drone-swarms.md) §3:

> During training, drones utilize a "global critic" with access to all data.
> However, during execution, they act only on local sensor data.
> This ensures that if a drone loses its communication link in the field, it remains an intelligent agent capable of independent action.

The mathematical content.
The MADDPG actor-critic gradient (Lowe et al. 2017):

$$\nabla_{\theta_i} J \approx \mathbb{E}\bigl[\nabla_{\theta_i} \pi_i(o_i) \cdot \nabla_{a_i} Q_i(x, a_1, \ldots, a_n)\bigr]$$

— per-agent policy $\pi_i$ takes only local observation $o_i$, but the critic $Q_i(x, a_1, \ldots, a_n)$ at training time has access to global state $x$ and joint action.

QMIX adds a monotonicity constraint $\partial Q_{\text{tot}} / \partial Q_a \geq 0$ on a value-factorization that guarantees decentralized greedy action is consistent with maximizing the centralized value (Rashid et al. 2018).
HAPPO supplies the sequential trust-region monotonic-improvement theorem for heterogeneous cooperative agents (Kuba et al. 2022).

PyFARS today does training and execution in a single context.
As [M5](../work/milestones/m5-agential-self-generation.md) realizes self-generated skill records and [M4](../work/milestones/m4-memory-feedback.md) realizes consolidation-as-stigmergic-feedback, the substrate gains a structural opportunity to insert a CTDE separation that the agent-theory literature already validates.

**The substrate IS the global critic.** At any tick, the substrate's full cell-set is the joint state $x$; each agent's per-tick context is its local observation $o_i$ (cells the agent's office grants access to via [M2](../work/milestones/m2-substrate-dispatch.md) eligibility rules).
The CTDE pattern translates as:

- **Centralized training:** the *skill-authoring* and *skill-tuning* phases (per [M5](../work/milestones/m5-agential-self-generation.md)) read the entire substrate snapshot (limited only by office authority).
  Training has full visibility — like the global critic.
- **Decentralized execution:** at dispatch time, the agent receives *only* its office-scoped context (per [M2](../work/milestones/m2-substrate-dispatch.md) eligibility-by-scope), not the full substrate.
  Execution is local — like the actor.

A new substrate object kind, `agent-skill-training-record`, at `governance/skills/<slug>/training/<date>.md`:

```yaml
type: agent-skill-training-record
target-skill: <slug>
training-substrate-snapshot: <snapshot-id>
training-cell-scope: full-substrate-readable    # CTDE: training reads everything
execution-cell-scope: office-bounded             # CTDE: execution reads only what office grants
training-authorized-by: <office>                 # captain or designated training office
training-output-format: skill-policy-update | skill-record-revision
```

A skill running in execution mode must declare its execution-time scope, *narrower* than its training-time scope by construction.
A new closure rule, `enforce-ctde-scope-boundary`, fires at dispatch time:

1. Look up the agent's currently-active skill.
2. Verify the skill's execution-time cell scope is satisfiable from the agent's office authority alone.
3. If the agent's invocation context contains cells outside its execution-scope, reject and emit `(skill, ctde-scope-violation, cell) = T`.

The training boundary is also substrate-bounded: an agent in execution mode cannot author or modify its own skill record.
Training is a distinct workitem class (`workitem-class: skill-training`) dispatchable only by a training-authorized office.

**Why this is structurally correct, not just an optimization.** CTDE is not just a training convenience — it's a **resilience invariant**.
Per the engineering literature: "if a drone loses its communication link in the field, it remains an intelligent agent capable of independent action."
Translated: the local actor must be runnable from local context alone.
This is exactly the [federation-resilience question](federation-resilience-and-degradation.md)'s "Federation-Partition" state — the agent's execution must continue without federation visibility into the global critic.

The CTDE separation also bounds the agent's per-step entropy $H_\rho$ (see below).
At execution time, the agent's input is the office-scoped context — a smaller cell set than the substrate, hence smaller vocabulary, hence lower per-step entropy.
Training time can be high-entropy; execution must be bounded.

QMIX's monotonicity is the MARL-side analogue of the closure-merge commutation lemma: per-agent decisions composed monotonically yield the same result as the joint decision.
The substrate's $\vee_k$-merge has this property at the cell level; QMIX would extend it to the policy-action level if PyFARS adopted MARL training.

---

## Saturation-threshold and bounded entropy as runtime caps

Two related theorems make hard quantitative claims about LLM-agent collectives.

### Theorem 1: saturation-threshold

[`saturation-threshold`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/saturation-threshold.md) (empirically proven via the MASFT study, arXiv 2503.13657, March 2025): performance gains from adding agents to an orchestrated multi-agent system **plateau at approximately four agents**.
Above this threshold, adding agents increases coordination overhead faster than capability, producing diminishing or negative returns.

The MASFT findings:

1. Capability-gain curve: substantial 1→2 (specialization benefit), moderate 2→3, minimal 3→4, ~zero or negative ≥4.
2. Multi-agent systems often performed *worse* than best-of-N single-agent sampling — the [`single-agent-parity-below-saturation`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/single-agent-parity-below-saturation.md) baseline.
3. Prompt-optimization and topology-redesign produced only +5% to +14% — saturation reflects fundamental coordination-overhead growth, not poor engineering.

The structural source per [`coordination-overhead-grows-superlinearly`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/coordination-overhead-grows-superlinearly.md): coordination overhead is $O(N^2)$ peer-to-peer or $\omega(N)$ orchestrator-workers; capability gain is bounded above.
Empirical latency: ~200ms at 2 agents, ~800ms at 4, ~2000ms at 6, >4000ms at 8+.
Power law $\approx c \cdot n^\alpha$ with $\alpha \approx 2$.
Anthropic's production multi-agent system uses ~15× more tokens than equivalent single-turn chats.

### Theorem 2: emergence requires local determinism (bounded $H_\rho$)

[`emergence-requires-local-determinism`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/emergence-requires-local-determinism.md) gives the precise condition for reproducible emergent behavior: the conditional entropy

$$H(a^{(i)}_{t+1} \mid a^{(i)}_t, s^{(i)}_t)$$

must be bounded by a constant $H_\rho$ independent of population size, time, and environment state.

The proof's quantitative consequence: per-step trajectory volume increase is bounded by $2^{N \cdot H_\rho}$ — each of $N$ agents adds entropy $H_\rho$ to the joint state per step.
After $T$ steps, trajectory volume is bounded by $2^{N \cdot T \cdot H_\rho}$.
For populations $N \gtrsim 10^2$ and run-times $T \gtrsim 10^2$ (the regime where emergent patterns manifest), $H_\rho$ must be a small constant for reproducibility.

LLM agents at temperature $T = 1.0$ with full vocabulary contexts violate this: per-step entropy grows with vocabulary size and context length.
PyFARS's [M4](../work/milestones/m4-memory-feedback.md) consolidation is partly insulated — the consolidation step is a closure rule, deterministic — but the *agent invocations* producing observation cells are not.

The theorem gives a **falsifiable test**: a global pattern that does not survive re-runs from the same initial conditions is not emergent, just incidentally correlated.
"Reproducibility is a falsifiable test for emergence."

### Cap 1: dispatch-saturation-cap

A new substrate-authorized closure rule, `eligibility-by-saturation-cap`, in [M2](../work/milestones/m2-substrate-dispatch.md)'s eligibility-rule registry.
Evaluates in-flight LLM-agent-invocation count for the current tick; disqualifies further LLM-agent assignments above the threshold:

```yaml
type: saturation-cap-record
threshold: 4                    # the empirical saturation threshold
applies-to-class: llm-agent     # not all dispatchables; only LLM-agent ones
override-conditions:
  - parallelism-mode: true      # pure parallelism exception per the theorem
  - operator-authorization: <office>
exempt-classes:
  - background-validator        # non-LLM; doesn't count toward the cap
```

Threshold is captain-set (4 by default; adjustable for highly-specialized agent populations or future technology that shifts it).
The "parallelism-mode" exemption is per the theorem's stated exception: pure parallelism with no inter-agent coordination doesn't trigger saturation.
The rule fires before [M2](../work/milestones/m2-substrate-dispatch.md)'s `select_winners_node`.
Saturation-cap violations produce `T` cells routed to back-off / queue handling, not $\top$ (no contradiction; just constraint).

### Cap 2: emergence-reproducibility-regression

Per [M3](../work/milestones/m3-continuous-loop.md)'s replay-determinism guarantee and the bounded-entropy theorem, PyFARS can run a regression that:

1. Captures substrate state at tick $t$.
2. From that state, runs the same set of workitems through dispatch $K$ times (e.g., $K = 5$).
3. For each run, captures resulting substrate state at tick $t + T$ (e.g., $T = 10$).
4. Computes cell-level variance across runs.
5. Compares against the bounded-entropy expectation: variance should be bounded above by $K \cdot 2^{N \cdot T \cdot H_\rho}$ for the substrate's measured $H_\rho$.

A run whose variance exceeds the bound has either (a) genuinely high $H_\rho$ for the dispatched agents (acknowledge and accept), or (b) a substrate non-determinism bug.
Both are diagnostic.

A new substrate object kind, `emergence-reproducibility-bound`:

```yaml
type: emergence-reproducibility-bound
target-class: dispatch-tick-replay
replays-K: 5
horizon-T: 10
H-rho-bound: 2.0                # bits per step per agent — operator-set
expected-variance-bound: 2^(N·T·H_rho)
last-measurement: 2026-05-08T14:00:00Z
last-measured-variance: 1.7     # actual; below bound
```

Failure cases: variance exceeds bound for $> 3$ consecutive measurements → emit `(substrate, fails-reproducibility-bound, dispatch-tick-replay) = T`, route to review.

The variance bound is a complementary check at the *agent-invocation* layer (where LLM stochasticity dominates) rather than at the *cell-update* layer (where determinism is required).

Per [`tool-schema-bounds-action-space`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/tool-schema-bounds-action-space.md): tighter schemas → lower $H_\rho$.
The substrate's tool/skill records' frontmatter quality directly affects the entropy bound.
Tool-promote per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md) collapses entropy to zero (deterministic substrate operations).

The honest-framing roadmap mandate makes "small" precise (~4 agents) and "no convergence guarantees" precise (no reproducibility above a measurable threshold).
Both substrate-encoded rather than narrative caveats.

---

## MASFT 14-mode failure taxonomy as substrate anomaly classes

The MASFT study (arXiv 2503.13657, March 2025) — analyzed in [`multi-agent-failure-modes`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/multi-agent-failure-modes.md) — gives the empirically grounded taxonomy of how multi-agent LLM systems fail.
14 failure modes in 3 categories, established via 150+ execution-trace analysis with Cohen's Kappa 0.88.

**FC1: Specification failures.** Task is poorly specified to the multi-agent system.
Would also fail single-agent systems; not coordination-specific.

**FC2: Inter-agent misalignment** — the 6 coordination-specific failures:

1. **Communication breakdown** — agents fail to transmit critical information.
2. **Task derailment** — one agent's output sends the system off track.
3. **Information withholding** — agents omit context the receiver needs.
4. **Role violation** — agents act outside their designated scope.
5. **Conflicting actions** — agents produce contradictory outputs on shared state.
6. **Cascading misinterpretation** — one agent's error propagates and amplifies through subsequent agents.

**FC3: Verification failures.** System's output isn't checked for correctness.

A new substrate object kind, `failure-mode-record`, at `governance/failure-modes/<class>--<mode>.md`:

```yaml
type: failure-mode-record
category: FC1 | FC2 | FC3
mode: specification | communication-breakdown | task-derailment | information-withholding | role-violation | conflicting-actions | cascading-misinterpretation | verification
detection-closure-rule: <rule-slug>
audit-category: <category-name>
example-cell-pattern: <substrate-pattern>
mitigation-pattern: <pattern-slug>
```

Each failure mode gets one record.
The 14 modes are inventoried; substrate's anomaly cells reference them by `failure-mode: <slug>`.

**FC2 detection rules** — each substrate-resident:

- **1.
  Communication breakdown.** Substrate cell `(agent-A, sent-output-to, agent-B)` exists but no corresponding `(agent-B, received-input-from, agent-A)` cell.
  Per dispatch-determinism, every produced output should have a matching consumed-input.
  Closure rule `detect-communication-breakdown` fires per workitem-class.

- **2.
  Task derailment.** An agent's output cells produce dispatch routings far from the workitem's stated goal.
  The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)'s pushforward $\exists_f$ tracks dispatch-graph evolution; a sudden divergence between the workitem's class-tree branch and the actual dispatch path is detectable.

- **3.
  Information withholding.** An agent's output references a substrate cell its receiver cannot read (per office-scope eligibility), but the receiver needed it.
  Detected by `cell-reference-vs-readability-mismatch`.

- **4.
  Role violation.** Per the [governance question](governance-charter-and-accountability.md)'s scope-exclusivity check: an agent action whose outcome falls outside its delegating office's scope IS a role violation.
  Same rule, different framing.

- **5.
  Conflicting actions.** Two agents produce contradictory cells `(s, p, o_1) = T` and `(s, p, o_2) = T` for non-multi-valued $p$.
  The cellwise $\vee_k$-merge produces $(s, p, \cdot) = \top$.
  The $\top$ IS the conflict cell.
  Per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)'s paraconsistent regime, this is normal observation; detection is reading $\top$-cells filtered to FC2-conflicts class.

- **6.
  Cascading misinterpretation.** A $\top$-cell whose causal predecessors include another $\top$-cell.
  The cell-graph's transitive closure under "produced-by" reveals cascades.
  Closure rule `detect-anomaly-cascade` fires on the predecessor-relation. **Requires the explicit causal predecessors recorded per the operations-causal-settling discipline** (see [substrate-algebra question](substrate-algebra-closure-and-replay.md)).

**FC1 detection.** Caught at workitem-creation time: workitem's frontmatter must satisfy a "specification-completeness" predicate (declared scope, declared output type, declared evaluation criterion).
Workitems missing any required field rejected at parse-time.
Per the accountability-tracing text's "specification gap" pattern, structurally the same check.

**FC3 detection.** Caught at workitem-completion time: workitem must produce a `verified-by-rule` cell pointing to a closure rule that evaluated its output.
Per [conduct-teachings](governance-charter-and-accountability.md), every workitem completion passes through evaluation; a completion without verification cell is FC3.

**[M11](../work/milestones/m11-assurance-audit-chain-export.md) commitments:**

- A failure-mode-tagged audit projector.
  Audit export carries per-failure-mode count.
- A failure-mode-prevalence regression.
  MASFT's empirical baseline gives expected failure-mode rates per coordination topology.
- Per-mode mitigation cross-references.
  Each `failure-mode-record` references a mitigation pattern.

A new closure rule, `recommend-single-agent-fallback`, fires when the FC2 detection rate exceeds a threshold.
This is **honest framing** per the [M9–M12 closing remark](../work/milestones/roadmap.md): the substrate doesn't pretend coordination is paying off when it isn't.
When dispatch FC2-rate is high enough that single-agent best-of-N would outperform, the substrate recommends that.

Per the [accountability-tracing text](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/accountability-tracing-in-multi-agent-systems.md), three failure-pattern matches:

- **Pattern 1 (Local Error, Unvalidated Output)** maps to FC2.1+FC3.
- **Pattern 2 (Cascading Misalignment)** maps to FC2.6.
- **Pattern 3 (Specification Gap)** maps to FC1.

The MASFT 2025 study's methodology and quantitative anchors (per [`multi-agent-failure-modes`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/multi-agent-failure-modes.md)) bear directly on the substrate's runtime caps:

- **Methodology**: 150+ execution traces across 5 multi-agent frameworks, **6 expert annotators with Cohen's Kappa 0.88** (substantial inter-annotator agreement).
  The substrate's MASFT detector closure rules can therefore treat the 14-mode taxonomy as *operationally well-defined*, not contested.
- **The central finding sharpened**: multi-agent architectures showed *minimal* performance gains over single-agent baselines on popular benchmarks; *some multi-agent systems performed worse than best-of-N sampling from a single agent* — running the same agent N times and taking the best result outperformed the coordinated multi-agent system.
- **Topology-redesign empirical bounds**: optimizing prompts and redesigning coordination topology produced only modest improvements — **+5% for AG2 MathChat, +14% maximum for ChatDev with topology redesign**.
  The substrate's saturation-threshold work cannot expect more than ~14% gain from topology optimization alone; multi-agent benefit comes from task structure, not topology tuning.
- **Coordination-latency curve**: substrate-resident measurement should track latency growth — observed curve is **~200ms with 2 agents → over 4 seconds with 8+ agents**, approximately quadratic in agent count.
  The substrate's `dispatch-cost-record` (per the production-reliability section above) captures this directly.
- **The three-condition threshold for multi-agent benefit**: multi-agent coordination overcomes overhead in three situations only:
  1. The task requires capabilities a single agent cannot hold simultaneously — *isolated tool environments* (coding sandbox + web browser).
  2. The task decomposes into independent subtasks — *parallel execution reduces wall-clock time*.
  3. The task benefits from *diverse perspectives* — debate/consensus patterns reduce hallucination at the cost of N× token consumption.

In all other cases, a single agent with well-designed tools outperforms a multi-agent system at lower cost and higher reliability. **The substrate's dispatch-pattern selection should default to single-agent unless the workitem matches one of the three conditions** — substrate-resident closure rule `verify-multi-agent-justification` checks the workitem's properties against the three-condition threshold before authorizing parallel dispatch.

Per the stigmergy theorem: substrate-mediated communication is structurally better than direct agent-to-agent.
The MASFT failure modes are dominantly FC2 (inter-agent misalignment) — exactly the failures stigmergic communication eliminates by structure. **Detecting FC2 should be rare for well-stigmergized PyFARS deployments**; if it isn't, it's a sign the substrate isn't actually mediating communication and direct-coupling has crept in.

---

## Production-reliability findings as substrate calibration

Anthropic's "Building Effective Agents" (December 2024), the production multi-agent engineering blog (2025), the Letta agent-memory benchmarks (2025), the enterprise agent-evaluation framework (arXiv 2511.14136, November 2025), and the ICML 2025 position paper on intrinsic metacognitive learning together form a calibration set for runtime caps and self-generation discipline.
Several findings are direct constraints on PyFARS's substrate-resident discipline.

**Token cost is 80% of performance variance; multi-agent costs ~15× single-turn.** Anthropic production data: token usage per step explains ~80% of performance variance on complex tasks; multi-agent architectures consume ~15× the tokens of equivalent single-turn interactions; coordination cost grows approximately quadratically with agent count.
Per [skill-composition cost](dispatch-workitems-plans-and-external-surfaces.md) the bound is $C(\mathcal{C}) \leq \sum C(s_i)$; the empirical 15× factor is the constant absorbed by the bound's $\leq$.
The cost-quantale's `tokens` coordinate is the load-bearing dispatch-time signal — token consumption per workitem is a substrate-resident measurement, not a model-side concern.
The saturation threshold of ~4 agents (per [the saturation section above](#saturation-threshold-and-bounded-entropy-as-runtime-caps)) and the 15× multi-agent overhead together justify single-agent-with-good-tools as the *default*; multi-agent dispatch is opt-in, not opt-out.

**The complexity ladder is a dispatch-pattern hierarchy.** Anthropic's six-step progression — (1) augmented LLM, (2) prompt chaining, (3) routing, (4) parallelization, (5) orchestrator-workers, (6) autonomous agent — is a chain of dispatch shapes, each adding latency, token cost, and failure surface.
Each rung is a particular cobordism (per [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)).
The discipline "move to the next step only when the current step demonstrably fails on the task" maps to PyFARS's promotion ladder *in reverse*: skill-authoring climbs the ladder when the simpler dispatch produces FC2 cascading-misalignment cells; it descends via tool-promote (which strictly reduces formality-layer per [skill-composition cost](dispatch-workitems-plans-and-external-surfaces.md)).
Anthropic's warning against frameworks that obscure prompts maps to the substrate-resident principle that dispatch is *visible* — every dispatch is a substrate cell, every routing decision is replayable.

**Letta benchmark: filesystem operations beat specialized graph-memory by 5.5pp on LoCoMo (74.0% vs Mem0's 68.5%).** This is *direct empirical evidence for the PyFARS thesis*: agents using `grep` / `search_files` / `open` / `close` on markdown files outperform agents using bespoke memory APIs because the LLM is well-trained on filesystem operations.
The 5.5pp advantage comes from *using tools the LLM is well-trained on rather than specialized memory APIs*.
This materially supports the [PyFARS-essence claim](../../../../.claude/projects/-home-emsenn-561/memory/project_pyfars_essence.md) that markdown-file-with-frontmatter is the right substrate shape because (a) it is the LLM's native tool surface, (b) frontmatter already encodes the graph that GraphRAG would extract, and (c) substrate-resident closure rules are deterministic over file content. **Implementation discipline**: PyFARS does not need a vector index or graph database for memory until file-based retrieval demonstrably fails — typically when knowledge volume exceeds keyword-search navigability or when queries require multi-hop relationship traversal that cannot be expressed via frontmatter walks.

**Auto-generated instruction files DECREASE success rates by ~0.5%.** The February 2026 context-engineering study found that LLM-generated CLAUDE.md / AGENTS.md files perform *worse* than no instruction file at all; human-curated, problem-driven, ≤50-line files perform best.
The "lost in the middle" effect produces ~30% accuracy drop for mid-context information.
This is a hard constraint on PyFARS's harness-template machinery: harness templates must be human-curated source-of-truth (the templates ship with PyFARS at `src/pyfars/harnesses/repo-instructions/templates/` per the [working-instructions discipline](../../../../CLAUDE.md)), and harness-installed files must NOT be hand-edited (drift produces stale instructions, which actively degrade performance).
The discipline is already correct — this finding upgrades it from a developer-experience choice to an empirically-grounded reliability requirement.

**Self-improvement works within bounds; AutoGPT-style autonomy does not.** The OpenAI cookbook three-stage pattern (baseline + graders + metaprompt optimizer) improves agent performance on measured criteria *without* fine-tuning — the system prompt changes, model weights stay fixed.
Bounds: graders must start with deterministic checks (schema valid, entities present, length in bounds) and add LLM-as-judge only when deterministic is insufficient; 20 test queries reveal dramatic prompt-change impacts; a single LLM-as-judge prompt is more consistent than multiple specialized judges; **fully autonomous self-improvement produces infinite loops, hallucinated corrections, and token-cost spirals** (the AutoGPT lesson, 2023–2025).
The ICML 2025 position paper formalizes the gap: truly self-improving agents require *intrinsic metacognitive learning* — the ability to evaluate and adapt their own learning processes, not just their outputs — and *no existing system demonstrates this*. **For PyFARS**: M5 agential-self-generation is bounded by (a) the saturation threshold capping in-flight self-generation events at ~4, (b) the bounded-$H_\rho$ entropy cap producing replayability, and (c) substrate-resident graders (closure rules over the candidate self-generation cell) gating commitment.
PyFARS does not solve metacognition; it bounds the search space such that AutoGPT-style spirals are *structurally impossible*.

**Errors compound in stateful systems; durable execution is the only viable defense.** Anthropic's reliability finding: "agents are stateful and errors compound" — a wrong tool call in step 3 changes step 4's state, which produces a goal-divergent step 5 output.
Three defenses: (a) durable execution (LangGraph checkpoints, PydanticAI+Temporal) so a restarted workflow resumes from a known state rather than starting over; (b) tool-failure adaptation — let the agent know a tool failed, let it adapt; (c) human-in-the-loop checkpoints before irreversible actions.
PyFARS's [operations-causal-settling](substrate-algebra-closure-and-replay.md) is durable execution at the substrate level: every operation has a `causal_hash` over the cell-DAG up to isomorphism, and every operation's resumption is byte-identical to its original execution given the same closure-rule firings. **Tool-failure adaptation is FC2.6 cascading-misalignment detection** at runtime — when a tool reports failure, the substrate's anomaly-cell-cascade fires, the dispatch surfaces the failure to the agent, and the agent adapts rather than retrying blindly. **Human-in-the-loop is the captain's quorum-discipline override** at safety-envelope-precheck rejection points (per [governance question](governance-charter-and-accountability.md)).

A substrate object kind, `dispatch-cost-record`:

```yaml
type: dispatch-cost-record
target-workitem: <id>
pattern: single-agent | parallel-2 | parallel-4 | orchestrator-workers
tokens-consumed:
  total: 12500
  per-step-breakdown: { ... }
latency-breakdown:
  llm-inference: 4.2
  tool-execution: 0.8
  retrieval: 0.3
  coordination: 1.5
classification: under-saturation | at-saturation | over-saturation
recommendation:                          # if over-saturation
  fall-back-to: single-agent | parallel-2
```

Closure rules: `record-dispatch-cost`, `classify-saturation-by-token-overhead` (compares to per-pattern bounds: single-turn × 1; parallel-2 × ~3; parallel-4 × ~9; orchestrator-workers × ~15), `recommend-pattern-downgrade` (when a workitem-class repeatedly produces over-saturation classifications, surfaces a downgrade recommendation to the captain).

**Engineering consequences.**

- **Token-cost is a substrate-resident measurement.** Every dispatch produces a `dispatch-cost-record` cell; the cost-quantale's `tokens` coordinate is read directly from these records, not from model-API-side accounting.
- **Filesystem-only memory is the empirically-validated default.** PyFARS does not author a vector index or graph DB until grep+frontmatter-walk demonstrably saturates.
  Letta's 5.5pp gap is the load-bearing evidence.
- **Auto-generated harness files are never hand-edited.** Closure rules can warn on edits to files carrying `harness-generated: true` frontmatter; the substrate replay regenerates from templates at install-time.
- **The metacognitive-learning gap is a theory-gap nomination.** Per the [predicated-drone-swarm theory-gap question](predicated-drone-swarm-theory-as-theory-gap.md), unsolved upstream problems can be lifted to predicated-theory authoring.
  Predicated-self-generation theory should formalize what bounded $H_\rho$ + saturation-cap + closure-rule-graders produces *in lieu of* metacognition.

---

## OpenClaw's six-mechanism continuous-learning architecture as PyFARS prior art

OpenClaw (https://github.com/openclaw/openclaw; v2026.3.7 stable as of March 2026; ~60K open-source installs) is a self-hosted personal-AI-assistant platform whose architecture has converged on six interlocking mechanisms for continuous learning and behavioral evolution across sessions.
The polity already runs OpenClaw — Codi (per [`governance/agents/codi.md`](../../../../governance/agents/codi.md)) is configured as an OpenClaw agent with `manage-gateway-configuration-and-connections` and `maintain-persistent-context-across-sessions-and-machines` as core duties; the harness-config file [`governance/harnesses/openclaw.md`](../../../../governance/harnesses/openclaw.md) is `status: active`.
OpenClaw's published architecture is *living prior art*, not a hypothetical reference point.
Each of the six mechanisms maps to a PyFARS substrate-resident equivalent, and the OpenClaw experience reduces the design space for [M4](../work/milestones/m4-memory-feedback.md) memory-feedback and [M5](../work/milestones/m5-agential-self-generation.md) agential-self-generation substantially.

### Mechanism 1: Memory-as-Markdown-on-disk

OpenClaw maintains memory as plain Markdown files on the filesystem, with two default layers and an exclusive plugin slot:

- **`MEMORY.md`** — curated, long-term context; stable facts, user preferences, learned patterns; written by agent or operator.
- **`memory/YYYY-MM-DD.md`** — dated session logs capturing running context, decisions made, observations, intermediate states; creates an audit trail of discovery.
- **Memory plugin slot** — exactly one memory plugin active at a time (an [`openclaw-plugin-slot`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-plugin-slot.md)).
  Experimental QMD backend combines BM25 + dense vectors + reranking while keeping Markdown as source-of-truth.

The architectural fact: *files are the source of truth*; retrieval indices augment but never replace them.
This is exactly the [PyFARS-essence claim](../../../../.claude/projects/-home-emsenn-561/memory/project_pyfars_essence.md) ("non-Shannon/Turing computer over ANY unix flatfiles via predication-category projection") — and OpenClaw is a working realization of the file-first thesis Letta benchmarked at 74.0% (vs Mem0 at 68.5%) per the [production-reliability section above](#production-reliability-findings-as-substrate-calibration). **PyFARS's M4 memory-feedback substrate IS the same architecture, expressed at the closure-rule level**: instinct cells = `MEMORY.md`; observation cells = `memory/YYYY-MM-DD.md`; the consolidator step = the closure rule that promotes high-evidence observation cells into instinct cells.
The two-layer separation between curated (intentional) and emergent (discovery-driven) is the [`recurrent-practice`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md)-vs-witness-cell distinction.

### Mechanism 2: Skills as autonomous capability extension

OpenClaw skills are directories with a fixed shape:

```
skills/<skill-slug>/
  SKILL.md        # YAML frontmatter + instructions
  tools/          # tool definitions and implementation (optional)
  examples/       # usage patterns (optional)
  tests/          # verification and correctness checks (optional)
```

Loading precedence: **workspace > shared > bundled**.

- Bundled skills ship with OpenClaw (baseline capabilities).
- Managed skills under `~/.openclaw/skills/` (persistent across workspaces).
- Workspace skills under `<workspace>/skills/` (highest priority).

Agents request skill creation autonomously: encounter problem → identify missing capability → write `SKILL.md` and supporting code → place in workspace → next heartbeat or conversation cycle discovers and loads it without manual restart.
The skill persists; the next agent (or same agent in next session) inherits it.

**ClawHub** is the public skill registry — **13,729+ community-contributed skills as of February 2026**.
Agents can search/install/update programmatically; CLI flows are search/install/update/sync.

This is exactly [M5](../work/milestones/m5-agential-self-generation.md) agential-self-generation.
The skill-record substrate kind is the `SKILL.md` analog; the workspace>shared>bundled precedence is the cascade restriction $\rho_{V \subseteq U}$ (per the [instruction-resolution section in the dispatch question](dispatch-workitems-plans-and-external-surfaces.md)); ClawHub is *federated skill distribution* — structurally a federation-of-skills (per [federation question](federation-resilience-and-degradation.md)) on the same FedAvg-discipline as model deltas. **The 13,729+ scale demonstrates that the skill-record format works for community-distributed authoring**, which is one of M5's open questions: would community-authored skills produce coherent runtime behavior or fragment into incompatible formality layers?
OpenClaw's empirical answer (the registry works; skills compose) is evidence the format scales.

The community guidance — Vellotti, Cochran, official docs — converges on *do not add many skills at once; install only what the workflow needs; verify; expand gradually*.
This **IS the maturation-discipline** PyFARS already encodes via the formality-layer hierarchy ($F_0 \to F_3$ promotion ladder per [skill-composition cost in the dispatch question](dispatch-workitems-plans-and-external-surfaces.md) and [`promote-is-strictly-cost-reducing`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/promote-is-strictly-cost-reducing.md)).
OpenClaw practice confirms this is the load-bearing operational discipline, not a developer preference.

### Mechanism 3: HEARTBEAT.md as natural-language scheduler

`HEARTBEAT.md` is a per-workspace file defining what the agent should check or notice when idle.
Tasks are written in **natural language, not cron syntax**:

- "Every Monday at 9 AM, check for pending action items"
- "Every 2 hours, scan for new messages"
- "Friday at 5:00 PM, summarize the week's work"

The heartbeat is read every 30 minutes (opportunistic awareness); for exact timing OpenClaw uses cron-jobs as a separate mechanism.

**`isolatedSession: true`** runs each heartbeat task in a fresh session with no prior conversation history.
The reported empirical effect: **60–80% token cost savings** for continuous monitoring loops.
The agent's learned context lives in `MEMORY.md` and memory plugins; heartbeat sessions are *stateless shells executing checks and updating memory*.

This is the substrate's tick-close + recurrent-practice discipline implemented exactly:

- The *natural-language task* is a workitem-with-success-criteria — not a cron entry.
  The natural-language statement parses into a workitem-record's `triggers:` and `success-criteria:` fields by closure rule.
- The *30-minute opportunistic cadence* is the substrate's tick-close cadence.
- The *isolated session* is replay-determinism with no loaded prior session: the substrate state at tick-open is the only context; the heartbeat-task fires; the substrate state at tick-close is the new content.

**The 60–80% empirical savings is direct evidence that loaded session history dominates token cost** in non-isolated execution — and that PyFARS's substrate-state-as-context (not session-replay-as-context) is the structurally correct memory architecture.
The substrate's [bounded $H_\rho$ entropy cap](#saturation-threshold-and-bounded-entropy-as-runtime-caps) reads HEARTBEAT-style isolated-session as the *load-bearing replay-determinism case*: the lower the loaded prior context, the lower the per-tick entropy, the lower the trajectory volume bound $2^{N \cdot T \cdot H_\rho}$.
Isolated-session execution is what makes substrate-replay byte-identical despite stochastic agent calls — the empirical 60–80% savings is the cost-quantale signal that the substrate's preferred mode is isolated tick-close, not session-loaded.

### Mechanism 4: Hooks as directory-discovered event handlers

Hooks are directory-discovered handlers fired on command or lifecycle events.
Each hook is a directory:

```
hooks/<hook-slug>/
  HOOK.md       # YAML metadata + trigger conditions
  handler.ts    # TypeScript/JavaScript implementation (or .js)
```

Discovery: **workspace > managed > bundled** (same precedence as skills).

Bundled hooks are the baseline patterns:

- **`session-memory`** — captures memory artifacts at session end.
- **`bootstrap-extra-files`** — injects additional files at startup.
- **`command-logger`** — audit-logs all commands executed.
- **`boot-md`** — runs startup actions (e.g., load today's agenda).

Hooks intercept commands before execution (permission checks, validation), capture observations and store them in memory, trigger downstream actions when patterns are detected.
The model: an agent that learns it should monitor something *proposes a new hook*; an operator reviews and enables.

**OpenClaw hooks ARE substrate closure rules with directory-discovery overlay.** The `HOOK.md` frontmatter is the closure-rule's trigger predicate; `handler.ts` is the rule body; workspace>managed>bundled precedence is the cascade restriction (per the [instruction-resolution section](dispatch-workitems-plans-and-external-surfaces.md)).
Mapping the bundled hooks to PyFARS's closure-rule kinds:

| OpenClaw bundled hook | PyFARS closure-rule analog |
|---|---|
| `session-memory` | `consolidate-session-record` (tick-close memory consolidator; M4 OpenClaw memory-sync) |
| `bootstrap-extra-files` | `lifecycle-startup` (tick-open file injection) |
| `command-logger` | `audit-witness-emission` (per [governance question](governance-charter-and-accountability.md)'s administrative-accountability cell) |
| `boot-md` | `load-recurrent-practice` (per [`recurrent-practice`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md)) |

The mapping is congruent: **PyFARS's closure-rule architecture is the substrate-resident formalization of the same pattern OpenClaw has converged on operationally.** The substrate-algebraic claim — that closure rules are the runtime primitive — is supported by OpenClaw's experience that hooks (event-driven, directory-discovered, precedence-cascaded handlers) are the right shape for the runtime layer, but PyFARS's formalization additionally exposes the closure 2-monad's lax-idempotence (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)), the four-regime classification, and the dual-logic query API as algebraic structure unavailable to hooks-as-handler.ts.

### Mechanism 5: SOUL.md as behavioral-boundary configuration

[SOUL.md](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-soul-md.md) (per Mars 2026) defines the agent's identity, style, values, and behavioral boundaries — not knowledge, but *prescriptive configuration*:

- How the assistant should speak (tone, voice, formality).
- What it should prioritize (user goals, organizational values).
- Where it should stop (explicit refusals, guardrails).
- What kind of reasoning it should show (transparency, confidence levels).

`SOUL.md` changes are lightweight (no code rebuild); the next conversation/heartbeat reads the updated file.
Distinct from skills (code artifacts) and memory (factual accumulation): `SOUL.md` is *prescriptive*, telling the agent how to behave, not what happened.

In PyFARS terms, `SOUL.md` is the **office-record's identity-fragment** (per the identity-vs-instruction split in the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)): the office-identity is what the agent IS (the morphism source); the office-instruction is what it should DO (the morphism body); `SOUL.md` carries the identity half.
PyFARS's [`governance/agents/<office>.md`](../../../../governance/agents/) files (e.g., the [`codi.md`](../../../../governance/agents/codi.md) record) carry both halves in one file — frontmatter `serves:` / `duties:` / `powers:` / `privileges:` / `immunities:` / `autonomous:` / `escalates:` is the identity-fragment; the body's "Working Method" + "Current Focus" is the instruction-fragment.

### Mechanism 6: DM Policy as four-mode input gating

Inbound DMs are gated by a four-mode policy (per [`openclaw-dm-policy`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-dm-policy.md)):

- **`pairing`** (default) — unknown sender receives a short code; no message-processing until approval.
  Pairing-as-investiture: the short-code IS the investiture-witness.
- **`allowlist`** — only approved senders can reach the agent.
- **`open`** — any sender if the channel allowlist opted in (channel-level trust takes over).
- **`disabled`** — inbound DMs ignored entirely.

**The four modes are exactly a four-corner trust classifier on the substrate's bilattice $\mathbf{FOUR}$**:

| Mode | $\langle \text{trust}, \text{know} \rangle$ |
|---|---|
| `disabled` | $\langle \bot, \bot \rangle$ — refuse to consider |
| `pairing` | $\langle \bot, \bot \rangle \to \langle \top, \top \rangle$ via investiture witness |
| `allowlist` | $\langle \top, \top \rangle$ for known set; $\langle \bot, \bot \rangle$ otherwise |
| `open` | $\langle \top, \bot \rangle$ — permitted but unverified |

This composes cleanly with the [bearer-token four-corner verdict in dispatch](dispatch-workitems-plans-and-external-surfaces.md) and the [failure-detection sheaf's four heartbeat states in federation](federation-resilience-and-degradation.md): **trust gating is FOUR-bilattice classification by structure**, not a one-off security policy.
PyFARS's substrate-resident `dm-policy-record` is the closure-rule reading; the four modes' truth-order ranking $\bot \leq_t \top$ and knowledge-order ranking $\bot \leq_k \top$ are read directly off the table above.

DM Policy also gates *what learning opportunities reach the agent*.
The agent learns from what it receives; controlling who can send messages controls the input distribution and therefore the behavioral patterns the agent might learn:

- `pairing` mode means the agent learns from trusted senders first, building reliable patterns before expanding.
- `allowlist` mode means the agent only learns from a curated set of users, preventing adversarial or off-topic inputs from shaping behavior.
- `disabled` on a channel means the agent doesn't learn from that surface, avoiding noisy or low-signal inputs.

This is the substrate's bounded-$H_\rho$ entropy discipline applied at the input boundary: lower-entropy inputs produce more replay-deterministic substrate state. **DM Policy is bounded-entropy-discipline at the inbound trust gate** — choosing `pairing` or `allowlist` is choosing a lower-entropy input distribution, which produces a tighter trajectory volume bound $2^{N \cdot T \cdot H_\rho}$ at the substrate-state level.

### The four-file boot pattern as orthogonal fiber decomposition

Carl Vellotti's setup guide and the official OpenClaw bootstrapping docs converge on a four-file pattern that produces working agents:

| File | Role | PyFARS analog |
|---|---|---|
| **`SOUL.md`** | identity / style / values (prescriptive) | office-identity-fragment of `governance/agents/<office>.md` |
| **`USER.md`** | topics, organizations, people, journals worth following (descriptive of attention) | `governance/agents/<office>.md`'s `serves:` field expanded; or per-office `attention-record` cells |
| **`MEMORY.md`** | durable findings (descriptive of state) | instinct cells in PyFARS's M4 substrate |
| **`HEARTBEAT.md`** | proactive checks (operational) | `recurrent-practice` records firing on tick-close |

This is **exactly four orthogonal axes of agent configuration** — *identity / attention / state / practice* — each with a distinct algebraic role:

- **Identity** is morphism-source (what the office IS); read by `eligibility-by-conduct-teaching` and similar eligibility predicates.
- **Attention** is the workitem-eligibility predicate (what the office is *for*); read by quantifier adjoints $\exists_f^k, \forall_f$ on workitem-fibers (per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)).
- **State** is the substrate-cell content (what the office knows); the substrate $\Sigma$ proper.
- **Practice** is the recurrent-rule firing schedule (when the office acts); read by `load-recurrent-practice` and per-recurrent-practice closure rules.

PyFARS's substrate captures all four orthogonally; OpenClaw's empirical convergence on this exact decomposition is independent triangulation of the predication-categories' fiber decomposition pattern — agent configuration projects onto four orthogonal fibers, each with its own algebraic role, none reducible to the others.

### Codi as polity-internal proof-of-concept

The polity already runs an OpenClaw agent definition in [`governance/agents/codi.md`](../../../../governance/agents/codi.md):

- **Identity**: "AI familiar - a digital companion created to assist in liberation work, serving the 561 Group as a coding agent.
  Codi is sharp and supportive - technically precise while aligned with the group's values of Black Liberation and Indigenous Sovereignty."
- **Duties**: include `leverage-openclaw-capabilities-for-agentic-workflows` and `maintain-persistent-context-across-sessions-and-machines` — directly the OpenClaw memory/heartbeat thesis.
- **Powers**: `manage-gateway-configuration-and-connections` — Gateway access privilege.
- **Skills**: include `memory-get`, `memory-search`, `sessions_list`, `sessions_history`, `sessions_yield`, `subagents` — the OpenClaw vocabulary leaks into the office's skill list.

**The Codi case study is the polity's own proof-of-concept** that the OpenClaw architecture composes with PyFARS's substrate-resident office discipline.
The harness-config file [`governance/harnesses/openclaw.md`](../../../../governance/harnesses/openclaw.md) is `status: active`; OpenClaw agent definitions are projected into `.openclaw/agents/`.
PyFARS's substrate is the source-of-truth; the OpenClaw projection is the harness-installed materialized view (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)'s materialized-view-at-quiescence pattern).

### Substrate object kinds

A new substrate object kind, `openclaw-bridge-record`:

```yaml
type: openclaw-bridge-record
target-office: <office-slug>
boot-files:                              # the four-file boot pattern projection
  soul-md: governance/agents/<office>.md          # identity-fragment projected
  user-md: governance/agents/<office>.md          # attention-fragment projected
  memory-md: governance/agents/<office>/memory.md # instinct-cell aggregate
  heartbeat-md: governance/agents/<office>/heartbeat.md  # recurrent-practice projection
skills:                                  # workspace skills projected from substrate
  - { slug: <skill>, source: governance/skills/<slug>.md, formality-layer: F0 | F1 | F2 | F3 }
hooks:                                   # event-driven closure rules projected
  - { slug: <hook>, trigger: command | lifecycle, source: <closure-rule-slug> }
dm-policy: pairing | allowlist | open | disabled
channel-bindings:
  - { channel: <whatsapp|telegram|signal|slack|discord|...>, role: agent | patient }
acp-routing:                             # if Gateway-of-Gateways pattern in use
  - { foreign-runtime: claude-code | codex | gemini-cli, scope: <workitem-class> }
isolation-policy:
  heartbeat: isolated | session-loaded   # per the 60-80% empirical finding, default isolated
  command: isolated | session-loaded
```

Closure rules:

- `project-openclaw-bridge` — regenerates `.openclaw/agents/<office>/`, `.openclaw/skills/`, `.openclaw/hooks/` from substrate cells; substrate is source-of-truth, projection is materialized view.
- `enforce-soul-instruction-split` — closure rules read identity-fragment as eligibility, instruction-fragment as discharge.
- `consolidate-openclaw-session-into-instinct-cells` — the M4 OpenClaw memory-sync step, formed as a [`handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/handoff-cobordism.md) (see next section).
- `route-channel-input-via-dm-policy` — the four-mode trust classifier on inbound channels.
- `enforce-isolation-policy` — guards against accidental session-loaded heartbeat invocation per the 60–80%-savings finding.
- `validate-openclaw-bridge-coherence` — closure rule verifies that the projected `.openclaw/` tree is byte-identical to the substrate-derived projection (drift detection).

### Engineering consequences

- **The PyFARS-essence thesis (file-first source-of-truth) is empirically validated by OpenClaw at scale.** OpenClaw's market position — a self-hosted long-running agent platform that durably accumulates memory across sessions — IS the file-first thesis.
  The Letta 5.5pp finding plus QMD's working-implementation status plus 13,729+ ClawHub skills together are independent triangulation.
- **The six-mechanism architecture is one polity-instance; PyFARS generalizes it.** OpenClaw is single-user / operator-controlled; PyFARS extends to multi-host federation, multi-office governance, and substrate-resident closure rules.
  The OpenClaw mechanisms become *projections* of the PyFARS substrate — PyFARS does not reimplement them, it *projects them*.
- **The 60–80% isolated-session token savings is the load-bearing replay-determinism case.** Substrate-state-as-context, not session-loaded-as-context, is what produces low-cost reliable reproduction.
- **DM Policy's four modes ARE the substrate's four-corner trust classifier.** The substrate already has $\mathbf{FOUR}$; OpenClaw's DM modes are the same shape applied to inbound trust gating.
- **ClawHub-style federated skill distribution is a future M-something feature** (likely between [M5](../work/milestones/m5-agential-self-generation.md) and a federation milestone — once self-generation and federation both exist, the polity can publish skills to a registry).
  The 13,729-skill scale evidence shows the format scales.
- **OpenClaw hooks are PyFARS closure rules with directory-discovery overlay.** The closure-rule architecture is the substrate-resident formalization with full algebraic structure (closure 2-monad lax-idempotence, four-regime classification, dual-logic query API); OpenClaw hooks are the harness-projected operational view of the same pattern at runtime.
- **The four-axis fiber decomposition (identity/attention/state/practice) is empirically confirmed.** OpenClaw's convergence on this exact split is independent triangulation that the predication-categories' fiber decomposition is the right shape for agent configuration.
- **Codi is concrete prior art INSIDE the polity, not just survey material.** The polity's lived experience with OpenClaw is the working baseline against which PyFARS's substrate-resident equivalents must be evaluated — not a hypothetical.

---

## Skill-authoring failure modes and CrewAI's four-tier memory as substrate detectors and reconciliation

The skill-as-directory pattern surveyed in [`how-to-write-a-skill`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/how-to-write-a-skill.md) and the orchestration-ecosystem catalog in [`agent-orchestration-ecosystem-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/agent-orchestration-ecosystem-2026.md) supply two extensions to the memory-feedback discipline: a **five-failure-mode taxonomy for skill-authoring** (anti-patterns the substrate detects automatically before runtime) and a **four-tier memory decomposition from CrewAI** (a different fiber decomposition than the OpenClaw four-axis pattern, requiring substrate-algebraic reconciliation).

### Five skill-authoring failure modes as substrate-resident detectors

`how-to-write-a-skill` identifies five common failure modes in skill design.
Each maps to a substrate-resident detector closure rule; flagged skills become $\langle \bot, \top \rangle$ in $\mathbf{FOUR}$ (knowledge-order $\top$ — we know about the issue; truth-order $\bot$ — the skill is not authoritative as-written).

| Failure mode | Description | Substrate detector | Detection signal |
|---|---|---|---|
| **Ghost skill** | Description too vague to match any context; skill exists but never activates | `detect-ghost-skill` | Activation rate below threshold over $N$ ticks (substrate-resident measurement of closure-rule firings) |
| **False positive** | Description too broad; skill fires on irrelevant tasks | `detect-false-positive-skill` | Skill-firing rate but post-fire workitem-success rate below threshold |
| **Encyclopedia** | Skill tries to cover entire domain in one file; agent loads 800+ lines when 50 needed | `detect-encyclopedia-skill` | Skill body exceeds 800 lines AND covers > 1 domain per the predication-ontology (per [cohomological-coordination question](cohomological-coordination-and-audit.md)) |
| **Orphan** | Skill provides useful guidance but references undefined concepts/tools/conventions | `detect-orphan-skill` | Skill body references slugs that don't exist in substrate (closure-rule-decidable cross-reference check in $\Pi_1+<$) |
| **Stale skill** | Written for a workflow that has since changed; provides outdated guidance | `detect-stale-skill` | Skill last-updated cell older than $T$ ticks AND referenced workflow's cell-DAG has changed since |

These failure-mode detectors compose with the [MASFT 14-mode failure taxonomy section above](#masft-14-mode-failure-taxonomy-as-substrate-anomaly-classes) — skill-authoring failures are the *anti-pattern* counterparts to MASFT runtime failures: MASFT detects failures *during* multi-agent execution; skill-authoring detection prevents failures *before* execution begins.
The two-layer detection (ahead-of-time skill authoring + runtime MASFT) is *belt-and-suspenders by design*.

The substrate's per-tick closure-rule layer fires the five detectors against newly-authored or recently-modified skill cells; flagged cells route to the captain's review queue (via the [governance question](governance-charter-and-accountability.md)'s accountability-projector).
The five detectors take a small fragment of substrate computation per tick (each is closure-rule-decidable in $\Pi_1+<$ over the skill-cells' content) — well within the per-tick budget.

The testing checklist from `how-to-write-a-skill` ports as the substrate's `validate-skill-record` closure rule:

- YAML frontmatter parses correctly → substrate-decidable via `pyfars validate`.
- Name follows convention (lowercase-with-hyphens) → frontmatter-tier discipline.
- Description specific enough for activation → `detect-ghost-skill` and `detect-false-positive-skill` joint check.
- Body readable as agent → not substrate-decidable; routes to LLM-as-judge grader (per the [production-reliability section above](#production-reliability-findings-as-substrate-calibration)).
- File paths/commands/references current → cross-reference check.
- No sensitive data → blacklist match (closure-rule-decidable).

A substrate object kind, `skill-failure-mode-record`:

```yaml
type: skill-failure-mode-record
target-skill: <skill-slug>
detected-mode: ghost | false-positive | encyclopedia | orphan | stale
detection-signal:
  measurement: <substrate-cell-id>      # the cell that produced the detection signal
  threshold-violated: <numerical-value>
detected-at: <timestamp>
captain-review-queued: true | false
remediation:
  action: rewrite | split | retire | refresh
  responsible-office: <office-slug>
masft-cross-reference:                   # which runtime MASFT mode this anti-pattern correlates with
  - { masft-mode: <FC1|FC2|FC3-subclass>, correlation-strength: <0-1> }
```

Closure rules: `detect-ghost-skill`, `detect-false-positive-skill`, `detect-encyclopedia-skill`, `detect-orphan-skill`, `detect-stale-skill`, `aggregate-failure-mode-statistics` (substrate-cell tracking which failure modes are most common per discipline; informs polity's skill-authoring training).

### CrewAI's four-tier memory as a different decomposition

CrewAI (per `agent-orchestration-ecosystem-2026`) implements a four-tier memory system: **short-term, long-term, entity, contextual**.
This is a *different* four-tier decomposition than OpenClaw's SOUL/USER/MEMORY/HEARTBEAT pattern (per the [OpenClaw section above](#openclaws-six-mechanism-continuous-learning-architecture-as-pyfars-prior-art)).
The reconciliation is substantive: the two decompositions cut along different axes.

| CrewAI tier | What it holds | Cadence | OpenClaw analog | PyFARS substrate analog |
|---|---|---|---|---|
| **Short-term** | Current task / session content | Per-session | Active session conversation | Session-record cells (per-tick) |
| **Long-term** | Stable cross-session knowledge | Cross-session | MEMORY.md curated layer | Instinct cells (per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)) |
| **Entity** | Information about specific entities | Cross-session, per-entity | (No direct OpenClaw analog) | Entity-fiber cells (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)'s ontology section) |
| **Contextual** | Situational/environmental context | Per-task, situational | USER.md attention-focus | Attention-fiber cells (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)'s four-axis section) |

**The two decompositions cut along orthogonal axes**: OpenClaw's SOUL/USER/MEMORY/HEARTBEAT decomposes by *role* (identity / attention / state / practice); CrewAI's short-term/long-term/entity/contextual decomposes by *temporal-and-referential structure* (session-scoped / cross-session / per-entity / situational).
Both are valid; both capture genuine substrate-state structure; the substrate's algebra accommodates both as orthogonal projections.

The substrate-algebraic reconciliation: **a substrate cell sits at the intersection of an OpenClaw-axis position and a CrewAI-axis position**.
An instinct cell about a specific drone is both *long-term* (CrewAI) and *state* (OpenClaw); a session's currently-active workitem is both *short-term* (CrewAI) and *attention* (OpenClaw); a charter's normative content is both *long-term* (CrewAI) and *identity* (OpenClaw).
The two-decomposition cross-product gives 16 substrate-cell categories, not all populated:

| | Short-term | Long-term | Entity | Contextual |
|---|---|---|---|---|
| **Identity** | Session-active office-instance | governance/agents/<office>.md | Office-as-entity | (rare; per-context identity-shift) |
| **Attention** | Current workitem | Standing watch-list | Per-entity attention-record | USER.md focus |
| **State** | Tick-active observation cells | Instinct cells | Entity-specific knowledge cells | Contextual derivations |
| **Practice** | Currently-firing recurrent-practice | governance/recurrent-practices/ | Entity-specific procedures | HEARTBEAT.md per-context |

This 4×4 grid is the substrate's *memory-fiber bilattice*; the substrate's closure-rule queries traverse the grid along either axis (CrewAI temporal-referential queries) or along the OpenClaw axes (role queries) — both produce coherent results because the grid's axes commute (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)'s BC-commutation discipline).

A substrate object kind, `memory-fiber-bilattice-record`:

```yaml
type: memory-fiber-bilattice-record
target-cell: <cell-id>
openclaw-axis: identity | attention | state | practice
crewai-axis: short-term | long-term | entity | contextual
fiber-position: [<openclaw-axis>, <crewai-axis>]      # the grid coordinate
referenced-entities:                                   # for entity-axis cells
  - { slug: <entity-slug>, predicate-fiber: <fiber-id> }
temporal-validity:                                     # for short-term/contextual cells
  expires-at: <timestamp>
  refreshes-on: <event-class>
cross-axis-query-coherence: true | false               # BC-commutation verified
```

Closure rules: `compute-memory-fiber-position`, `route-query-by-axis` (substrate dispatches retrieval queries along whichever axis is most efficient given the query shape), `verify-fiber-bilattice-coverage` (substrate emits warning cells when a memory-fiber-bilattice-position has no cells in it for an active office), `verify-cross-axis-query-coherence` (BC-commutation check on cross-axis traversals).

### What the orthogonal-decomposition recurrence tells us

Three orthogonal four-component decompositions have now appeared across the question files:

- **OpenClaw SOUL/USER/MEMORY/HEARTBEAT** (identity / attention / state / practice) — agent-configuration axis (per the [OpenClaw section above](#openclaws-six-mechanism-continuous-learning-architecture-as-pyfars-prior-art)).
- **OPC-UA entities/properties/relations/permitted-actions** — predication-ontology axis (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)).
- **CrewAI short-term/long-term/entity/contextual** — memory-temporality-and-reference axis (this section).

The recurrence is structural, not accidental. **Four-component orthogonal decompositions appear across substrate-resident representations because the predication-fibration's natural fiber-structure has four orthogonal axes.** The substrate-algebraic statement: every substrate cell sits at the intersection of these orthogonal axes; closure-rule queries can traverse the substrate along any axis; the BC-commutation discipline ensures coherent results across axis-traversals.

This is a **structural prediction**: future substrate-decompositions will also exhibit four-component orthogonal patterns, because the substrate's fiber-structure is the underlying geometry.
Decompositions with five or seven components are likely overcomplete (collapsing onto four) or overcommitted (the fifth component is a derived axis).
REPRODUCE-ME's eight-component decomposition (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)) is the four-axis pattern with each axis 2-resolved into structural + operational sub-components — confirming rather than refuting the four-axis recurrence.

### Engineering consequences

- **The five skill-authoring failure modes are substrate-resident detector closure rules** — Ghost / False-positive / Encyclopedia / Orphan / Stale.
  Each is closure-rule-decidable in $\Pi_1+<$ over skill-cell content; the substrate flags as $\langle \bot, \top \rangle$ for captain review.
- **Skill-authoring detection composes with MASFT runtime detection as belt-and-suspenders.** Skill-authoring catches failures *before* execution; MASFT catches failures *during* execution.
- **CrewAI's four-tier memory and OpenClaw's four-axis decomposition are orthogonal, not competing.** The 4×4 cross-product gives the substrate's memory-fiber bilattice; closure-rule queries traverse either axis efficiently.
- **The orthogonal-four-decomposition recurrence is a structural prediction.** Future substrate decompositions will also exhibit four-component orthogonal patterns because the substrate's fiber-structure has four orthogonal axes.
  Decompositions with five or seven components are likely overcomplete or overcommitted.
- **The substrate's `validate-skill-record` closure rule** ports the testing checklist from `how-to-write-a-skill` directly: YAML parsing, name convention, activation specificity (joint Ghost + False-positive check), body readability (LLM-as-judge), reference currency, no-sensitive-data.

---

## Handoff cobordism for cross-session and cross-incumbency continuity

[M4](../work/milestones/m4-memory-feedback.md) commits to "session records are opened at the start of each tick and closed at the end" and "OpenClaw memory sync: when an OpenClaw session closes, the session's memory file is translated into observation and instinct cells."
The implicit model is *file-translation*: a session's memory becomes a flat set of cells; the next session reads those cells.
Correct as data-flow but loses structural information that subsequent milestones will need to reconstruct.

[`handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/handoff-cobordism.md) and the governance-side [`succession-as-handoff-cobordism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/succession-as-handoff-cobordism.md) formalize the structurally correct shape: a handoff is a *2-cell* between two state slices, with a cobordism interior recording the transition's character — what was preserved, what was rewritten, what was novel-to-the-receiving-context.
The same shape applies to office succession AND to agent-session continuity.

Structural information lost in pure file-translation:

- **Who attests the handoff.** A session's memory file is signed by the session itself; a recognizing-party-of-the-receiving-session attests legitimacy.
- **The cobordism's discipline.** Some handoffs are content-preserving (verbatim), some summarizing (lossy compression with accountable provenance), some restructuring (the receiver re-organizes the sender's content under a different schema).
  The current model treats them uniformly.
- **Validity conditions.** A succession-cobordism with no recognizing party is invalid for offices.
  The same validity discipline applies to memory handoffs: an instinct cell inherited from an unwitnessed handoff has lower knowledge-order weight than one inherited from a witnessed handoff.

A handoff-cobordism in PyFARS is a substrate object with four parts:

- **Source slice** — the closing session's tail-state.
- **Target slice** — the opening session's head-state.
- **Interior** — the transformation rule and its parameters: verbatim, summarizing, restructuring.
- **Witness chain** — what attested the handoff.
  For OpenClaw memory sync, the consolidator agent.
  For cross-tick continuity, the lifecycle's `runtime/lifecycle.py` tick-close step.
  For human-deferred-office succession (when a human takes a seat), the human's attestation.

Realized as substrate cells: a record at `governance/handoffs/<source-id>--<target-id>.md`, or as a witness-chain attachment to the next session-record.
Closure rules check validity and gate downstream cell-reads:

- **Selection's reading-of-instinct-cells is gated by handoff validity.** Instinct cells inherited from an invalid handoff are demoted in $\leq_k$ — treated as $\bot$ rather than $T$ until reaffirmed by a subsequent valid handoff.
- **Self-generation events ([M5](../work/milestones/m5-agential-self-generation.md)) are themselves handoffs.** An agent authoring a new skill record is a handoff from "agent without skill X" to "agent with skill X authored."
  The cobordism interior records *how* the skill was authored (which observations informed it, which prior skills it composes from).
  This makes the agential-self-generation provenance trail naturally substrate-resident.
- **Office succession reuses the same machinery.** When a human-deferred office activates (a human takes the seat), the cobordism shape is the same; only the witness changes.
  The polity's office records gain handoff-cobordism support without per-office bespoke logic.

**Why 2-cells are realizable on the current substrate.** A handoff is a 2-cell; the substrate's primary cell-shape is 1-cell `(s, p, o)`.
The 2-cell content is realized as a 1-cell record describing the transition — the cobordism is *content* in the substrate, not a new shape of cell.
The cobordism's algebraic properties (composability, identity, associativity) are properties of records-with-this-shape, verifiable by closure rules, not properties of a new substrate primitive.

Handoff-cobordism doesn't require architectural change to the substrate.
It requires:

- A new record kind `type: handoff-cobordism` with frontmatter conventions for source-id, target-id, interior, witness.
- A small set of closure rules that check validity and propagate $\leq_k$-demotion to inherited cells under invalid handoffs.

**[M4](../work/milestones/m4-memory-feedback.md) commitments:**

- The "OpenClaw memory sync" item gains the handoff-cobordism shape — the translation step records source, target, interior, witness instead of flattening session memory into cells without provenance.
- Session-close fires a cobordism-authoring closure rule, not a custom translation step.
- The selection step's instinct-cell reads are gated by handoff validity.

**Enables for later milestones:**

- **[M2](../work/milestones/m2-substrate-dispatch.md) `RuleFiring` provenance generalizes.** The `rsv_hash` already captures one form of handoff (rule-version transitions).
  Handoff-cobordism is the general case: every substrate-state-transition that crosses a session/incumbency/version boundary is a handoff.
- **[M11](../work/milestones/m11-assurance-audit-chain-export.md) audit chains are direct.** Substrate organized around handoff-cobordisms produces audit chains naturally: cobordism interiors record what changed, witness chains record who attested.
- **Rotation discipline.** Per the captain's growing-into-rotation pattern, rotation discipline IS a handoff-cobordism interior — the "how does the office transfer" rule.
  A polity that adopts rotation reuses the cobordism machinery rather than authoring rotation-specific transition logic.

A handoff IS a 1-cochain on session-pair overlap: $d^0(\sigma_{\text{source}}, \sigma_{\text{target}})$ measures the structural difference between source-tail and target-head states.
A valid handoff has cocycle representative recoverable from the recorded interior; an invalid one shows up as $\delta^0 \neq 0$.
Office succession across terms IS a $\mathcal{C}$-pullback square; the cobordism's validity is BC commutation on that square.
The accountability projector reads cobordism witness chains to attribute outcomes correctly across incumbencies — office succession transfers operational authority but does NOT transfer accountability per `delegation-does-not-transfer-accountability`.

---

## What this commits to

Substrate-resident records: `agent-skill-training-record`, `saturation-cap-record`, `emergence-reproducibility-bound`, `failure-mode-record` (one per of the 14 modes), `handoff-cobordism` records.

Substrate-resident closure rules: `decay` (instinct-cell decay), `enforce-ctde-scope-boundary`, `eligibility-by-saturation-cap`, `regression-emergence-reproducibility`, per-failure-mode detectors (`detect-communication-breakdown`, `detect-anomaly-cascade`, etc.), `recommend-single-agent-fallback`, cobordism-authoring closure rules, validity-check closure rules that demote invalid-handoff inheritances.

Captain-authority parameters in `governance/runtime-caps/<id>.md`: saturation threshold, $H_\rho$ bound, MASFT-mode mitigation patterns.

Recurrent practices per [`recurrent-practice`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md): emergence-reproducibility-bound regression (default weekly), substrate-cost-decoupling regression for federation.

## What this connects to

- **The [substrate-algebra question](substrate-algebra-closure-and-replay.md)** — pure consolidation is a closure rule (deterministic; $\mathcal{Q}$-grade trivial); effectful agent invocations have $\mathcal{Q}$-graded replay; bounded $H_\rho$ is what makes substrate-state replay byte-identical despite stochastic agent calls; the four-regime classification gates the closure-rule layer's halting; bounded-entropy gates the agent-invocation layer's reproducibility (orthogonal axes).
- **The [federation-resilience question](federation-resilience-and-degradation.md)** — federation-time, the consolidation step is structurally FedAvg model-delta production: ship the closure outputs, not the raw observations.
  Distillation IS structurally a tool-promote at the federation boundary.
  Federation bandwidth efficiency and reproducibility-bound improvement come together.
- **The [cohomological-coordination question](cohomological-coordination-and-audit.md)** — handoffs are 1-cochains on session-pair overlap; their validity is BC commutation on succession squares; their audit is the same Čech-cocycle evaluation as every other substrate-content disagreement.
- **The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)** — saturation-threshold caps in-flight LLM-agent dispatch at ~4; tool-promote IS the maturation pathway; failure-mode classification feeds dispatch's selection.
- **The [governance question](governance-charter-and-accountability.md)** — accountability-totality reads cobordism witness chains to attribute outcomes across incumbencies; FC2 inter-agent misalignment is accountability-chain-overlap; FC1 specification failure is accountability-chain underspecification (gap from vague scope); a high-$H_\rho$ agent producing a substrate-state-violating proposal is caught by the safety-envelope precheck.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented.
The theorems below resolve several memory/feedback questions decisively.

### No-non-trivial-periodic-orbits: consolidation cannot oscillate algebraically

The [closure-monad-no-non-trivial-periodic-orbits theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md) proves: the closure 2-monad has only period-1 orbits ($T^k(v) = v \implies T(v) = v$).
Three consequences for memory-feedback:

1. **Consolidation cycles are not cycles.** The "consolidation cycle" naming is operational ("we run consolidation periodically"), not algebraic.
  Each consolidation is an ascending step; the algebra cannot oscillate.
  Where consolidation appears to oscillate, the cause is observational drift — session-loaded LLM context churn, sensor-read variance, or external-runtime non-determinism — not the closure-rule layer.

2. **The four-regime classification IS the consolidation classification.** Strict and Scott-continuous closure rules consolidate in finitely many or $\omega$-many steps; transfinite-bounded and aperiodic rules require ordinal-windowed cadence by structure.
  This decisively answers Q1 (decay closure rule's window): closure-ordinal-windowed is correct *because* the algebra has no other natural windowing — wall-clock is observational, count-windowed is operational, but the algebra's own clock is the closure ordinal $\kappa$.

3. **Three-stage self-improvement (Q22) is not iterative.** The "iterate-with-graders" pattern is realized algebraically as a single closure-rule firing with graders embedded as substrate-resident closure rules over candidate self-generation cells.
  The closure-2-monad's no-period-2 result ensures the pattern *converges* — it cannot ping-pong between candidate states.

### Quiescence IS Cl-algebra structure: byte-identical replay condition

The [quiescence-as-closure-algebra theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/quiescence-as-closure-algebra.md) establishes that a settling reaches its fixed point at $\tau^*$ iff the state is a $\mathrm{Cl}$-algebra.
By Kelly-Lack (K2) (per [closure-2-monad-lax-idempotence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md)), being a $\mathrm{Cl}$-algebra is *property-like* — at most one structure up to unique iso.

This decisively answers the byte-identical-replay condition: the substrate-state at quiescence is *uniquely determined* by the closure-rule system and the increment sequence; replay-byte-identity is a structural consequence of property-likeness, not a runtime invariant to be checked.

For Q15 (handoffs as discrete events vs aggregations): the property-like Cl-algebra means handoffs aggregate naturally — multiple handoffs into the same operational scope produce the same Cl-algebra fixed point, so aggregation does not lose information.
Discrete events are a presentation choice; the algebra collapses them.

### Foreign-interior cobordism = settling cobordism category

The [settling-cobordism-category object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md) realizes the foreign-interior-cobordism algebra directly.
The handoff-cobordism is a settling cobordism $S : \mathcal{B}_\mathrm{session\ N} \to \mathcal{B}_\mathrm{session\ N+1}$ between session boundaries; the closure ordinal of the composition $S_2 \circ S_1$ is the *ordinal sum* $\kappa_{S_1} + \kappa_{S_2}$.

The [tqft-structure theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md) gives: $Z := H^\bullet(\mathcal{F}_{(-)})$ is a TQFT functor; $Z(\mathcal{B})$ is a commutative Frobenius algebra over $\mathbb{Z}$, $\widehat{K_4}$-graded:

$$Z(\mathcal{B}) = \bigoplus_{\chi \in \widehat{K_4}} Z^\chi(\mathcal{B}).$$

For Q13 (substrate format for cobordism interior): the cobordism's bulk is the settling trajectory $v : \kappa_S \to \mathrm{Val}(\mathcal{C}_S)$; the interior format is *the trajectory*, not a free-form description.
Parameterized expression over a small set of interior kinds maps onto the four characters of $K_4$ (verbatim ↔ $e$, summarizing ↔ $\sim$, restructuring ↔ $-$, full reframe ↔ $\sim\circ-$); the four characters give the *structural* interior-kind taxonomy, replacing the substrate's free-form description with a Klein-four classification.

For Q16 (human-deferred-office cobordism shape): the placeholder semantics (`awaiting-handoff-witness:`) are realized algebraically as a partial cobordism with specified out-boundary $\mathcal{B}_\mathrm{out}$ but undefined trajectory — a "cobordism slot" awaiting bulk-fill.
The substrate-coherent representation: a `boundary-predication-system` cell with `closure-stable: true` declared, but no associated settling-trajectory cell yet.

### Per-cell convergence on FOUR is one composite step

The [four-bilattice-mixed-orbit-convergence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-bilattice-mixed-orbit-convergence.md) bounds per-cell convergence: $x_1 = x_2$ for every $a, x_0 \in \mathbf{FOUR}$. **One composite step suffices.**

For Q10 (regression compute cost — running $K$ replays of $T$ ticks): the per-cell budget is bounded structurally. $K \times T$ replays involve $O(K \times T \times |\text{cells}|)$ per-cell operations, each bounded by 1 composite step (or 2 substeps) on $\mathbf{FOUR}$.
The compute cost is *linear* in $K \times T \times |\text{cells}|$, not exponential — making sampled-cells weekly + captain-triggered the natural cadence.

### Closure-rule fragments determine CTDE scope-narrowing decidability

The [rule-language-fragment-realizability-refinement theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md) establishes the proved/sketch hierarchy.
CTDE scope-narrowing (Q4) requires "execution-scope $\subseteq$ training-scope" to be substrate-decidable.

This is decidable in bare $\Pi_1+<$ (the scope is a Boolean combination of cell-pattern-matchers; subset-test is finite enumeration) but undecidable in unrestricted $\Pi_1+\Pi_2$. **The CTDE scope language must be in the proved fragment for substrate enforcement to terminate.** Q4's "decidable iff the scope language is bounded" is exactly correct — and "bounded" means bare-$\Pi_1+<$ or named-ordinal-entity-equality.

For Q7 (QMIX-style monotonicity check): substrate-resident closure rule (substrate detects non-monotone policy interactions) is decidable for closure rules in the bare-$\Pi_1+<$ fragment and undecidable above. *Out-of-substrate verifier* is a research action when the policies are written in $\Pi_2$ schemas.

### Multi-observer disagreement as substrate-resident audit primitive

The [multi-observer-system object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md) and [bilattice-network-sheaf-consensus theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md) give the algebraic shape of multi-agent failure detection directly.
Disagreement loci are the $\top$-cells of the joint settling; consensus is the categorical limit.

For MASFT FC1/FC2/FC3 detection (Q11, Q12): the substrate-resident detection rule is a closure rule that fires on $\top$-cell emergence within a session-pair overlap. **MASFT FC1 (specification failure) is a $\top$-cell within a single agent's session**; FC2 (inter-agent misalignment) is a $\top$-cell within an agent-pair's session-overlap; FC3 (verification failure) is a $\top$-cell within the verification step's overlap.
The cell-class is uniform; the failure-mode classification is the *position* of the $\top$-cell in the multi-observer category $O$, computed by the substrate per-cell-firing.

This decisively answers Q11 (14-vs-aggregated MASFT taxonomy): track all 14 (informative) is the substrate-coherent path because the position-of-$\top$-cell-in-$O$ gives the 14-way classification structurally; collapsing to FC1/FC2/FC3 loses the position information.

### Verdier duality: handoffs admit dual presentations

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) gives a derived equivalence between sheaves and cosheaves.
For handoff-cobordisms:

- **Sheaf presentation ($H^1$):** equality testing — "did this handoff produce the same MLD-class as expected?"
  Cocycle witnesses verify the handoff matched the intended cobordism shape.
- **Cosheaf presentation ($H_1$):** local-generator construction — "build the handoff state from per-event firing data."
  Useful when each session-event is a local generator.

This sharpens Q15 (handoffs as discrete events vs aggregations across event ranges): *both* are correct in dual presentations.
Discrete events are natural in the cosheaf-homology presentation (each event is a local generator); aggregations are natural in the sheaf-cohomology presentation (the aggregate is a cocycle).
Pairing with [operations-causal-settling](substrate-algebra-closure-and-replay.md) per the existing connection: the operations-causal-settling provides the aggregation; the cosheaf side provides the per-event presentation.

For Q14 (per-session-pair vs aggregated handoff records): the substrate should carry *both* presentations — per-session-pair as cosheaf-side local generators, aggregated as sheaf-side cocycle data.
Verdier identifies them, so storage cost is structural redundancy not data redundancy; one is computable from the other.

### MLD-equivalence: handoff aggregation is structurally lossless

The [mutually-locally-derivable concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md) gives the equivalence relation classified by $H^1$:

> MLD includes settling-shift; it does NOT include arbitrary relabeling — the morphism must commute with both settlings' endofunctors, so any equivalence respects the structural closure pattern.

For handoff records: two handoffs differing only in *settling-shift* (same content, different ordinal index) are MLD-equivalent.
The substrate's handoff-aggregation closure rule (`aggregate-handoffs-by-mld-class`) collapses MLD-equivalent handoffs structurally. **Aggregation is lossless when the handoffs are MLD-equivalent**; lossy otherwise — and the loss is exactly the $H^1$-class distinction, which is what the substrate audits.

This decisively answers Q13 (substrate format for cobordism interior — parameterized expression vs free-form description): parameterized expression with kind-specific parameters (verbatim/summarizing/restructuring) is substrate-coherent, *and* the kinds map onto the four characters of $\widehat{K_4}$ via [equivariant-cohomology-decomposition](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md): verbatim ↔ $e$ (identity gauge), summarizing ↔ $\sim$ (epistemic-flip), restructuring ↔ $-$ (factual conflation), full reframe ↔ $\sim\circ-$.
The four characters give the *structural* taxonomy; the substrate's interior-kind classifier is decidable from the bilattice action of the cobordism's interior on its boundary.

### Equivariant cohomology decomposition: MASFT 14-mode taxonomy refines via $K_4$

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) decomposes $H^1$ into four isotypic sectors.
Combined with the multi-observer-system identification of FC1/FC2/FC3 as positions of $\top$-cells in $O$, the MASFT 14-mode taxonomy refines:

- $H^1_\mathrm{id}$ failures: symmetric truth-plus-falsity content (witnesses agree on both positive and negative claims; rare, but structurally distinct).
- $H^1_{\chi_\sim}$ failures: epistemic-frame disagreements — FC2.1 (information misalignment), FC2.4 (role violation under different interpretive frames).
  Resolvable by frame clarification.
- $H^1_{\chi_-}$ failures: $\top$-firings — FC1.1 (specification ambiguity producing inconsistent interpretations), FC2.2 (reasoning-action mismatch resolved as $\top$), FC3.x (verification failure detecting inconsistency).
  Require fact resolution.
- $H^1_{\chi_{\sim\circ-}}$ failures: double-curvature — FC2.3 (cascade misinterpretation that ALSO produces inconsistency), the worst-case multi-mode failure.
  Require both frame clarification AND fact resolution.

The 14 MASFT modes distribute across the 4 sectors; the sector decomposition is a structural classifier *finer* than FC1/FC2/FC3 but coarser than the 14 modes. **The substrate emits the 4-vector per failure event; the FC1/FC2/FC3 aggregation is a coarsening that loses the sector structure.**

### Aperiodicity characterization: consolidation rarely enters aperiodic regime

The [aperiodicity-characterization theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md) gives aperiodic ⟺ non-Scott-continuous closure AND state-space cofinality $\geq \omega_1$.
For consolidation:

- The polity's entity-set is typically finite or countable (offices, workitems, witnesses).
- State-space cofinality $\geq \omega_1$ requires uncountable entity sets.
- Therefore consolidation is *structurally* in the strict, Scott-continuous, or transfinite-bounded regime — never aperiodic in standard polity scale.

This decisively answers Q1 (decay closure rule's window): closure-ordinal-windowed is correct, but the ordinal is bounded by $\omega_1$ — typically much smaller.
For the standard polity scale, consolidation completes in a countable ordinal; the window is finite or $\omega$-bounded.

For Q22 (three-stage self-improvement): the iteration converges in a bounded number of closure-ordinal stages — *not* in the aperiodic regime, *not* requiring uncountable cofinality.
Substrate-resident closure rules over candidate cells with substrate-resident graders converge in finitely many stages by the four-regime classification.

### Truth-knowledge LES: consolidation's consistency cohomology

The [truth-knowledge-cohomology-long-exact-sequence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md) gives the LES for memory consolidation's two cohomologies.
The polity's audit-export should compute both $H^n_t$ and $H^n_k$ per consolidation cycle; their gap IS the consolidation's accumulated paraconsistent inconsistency.

For Q19 (auto-saturation-recommendation surface): the `recommend-pattern-downgrade` substrate emit fires on $H^1_{\chi_-}$ growth (Sector $\chi_-$ is the $\top$-firings; growth indicates accumulating paraconsistent inconsistency).
The threshold is structurally derivable: when $|H^1_{\chi_-}|$ exceeds a polity-set fraction of total $|L_\mathrm{ns}|$, downgrade the workitem-class's saturation cap. **Recommendation form: alert + auto-downgrade-with-attestation** is substrate-coherent because the threshold-crossing is itself an audit-witnessed event.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Substrate format for the `decay` closure rule's window** — **Theory: closure-ordinal-windowed, bounded.** Per the aperiodicity characterization, the window is bounded by $\omega_1$ but typically much smaller for finite/countable polity entity-sets.
  Wall-clock is observational, count-windowed is operational, ordinal-windowed is structural.
  Closure-ordinal-windowed with explicit bound is most substrate-coherent.
2. **Composability test** — on [M4](../work/milestones/m4-memory-feedback.md) (single-host: two concurrent consolidations) or [M6](../work/milestones/m6-federation.md) (multi-host: two peers consolidating overlapping observation sets).
3. **Songlines connection** — governing-by-kinship has substrate-path-as-cohomology-class shape.
  If PyFARS adopts kinship-substrate, the cell-update layer's cohomological signature inherits a Songlines structure.
4. **Scope-narrowing relation for CTDE.** Execution-scope ⊆ training-scope must be substrate-decidable.
  Per the four-regime question's restricted fragments, decidable iff the scope language is bounded.
5. **Training-output format** — skill-policy-update (MARL analogue, parameter delta) vs skill-record-revision (substrate-native, revised closure-rule body).
  PyFARS's current skills are records, not parameters; second is the natural starting point.
6. **Training cadence** — per-batch (one training run per substrate-snapshot) vs continuous (training in parallel with execution).
7. **QMIX-style monotonicity check** — substrate-resident closure rule (substrate detects non-monotone policy interactions) vs out-of-substrate verifier (training-time guarantee).
8. **Saturation-threshold's source** — hardcoded `4` per MASFT, or runtime-derived measurement (compute capability/overhead curves; find crossover empirically per polity).
  First shippable; second adaptive.
9. **"Parallelism mode" exemption detection.** Workitem's `coordination-required: false` frontmatter?
  Office's authority-scope?
  Mechanical detector needed.
10. **Regression compute cost.** Running $K$ replays of $T$ ticks for variance is expensive.
  Scope: full-substrate vs sampled-cells, weekly vs per-release, captain-triggered vs scheduled.
11. **14-vs-aggregated MASFT taxonomy.** Track all 14 (informative) vs collapse to FC1/FC2/FC3 categories (simpler).
12. **Detection-rule overhead.** Cascading-misinterpretation requires transitive-closure on the cell-graph, $O(n^3)$ worst case.
  Scope to incremental-detection (track only newly-emitted ⊤-cells' causal closure) rather than full re-computation.
13. **Substrate format for cobordism interior** — parameterized expression over a small set of interior kinds (verbatim, summarizing, restructuring) with kind-specific parameters, vs free-form description.
  First is closure-rule-friendly.
14. **Per-session-pair vs aggregated handoff records.**
15. **Handoffs as discrete events vs aggregations across event ranges.** Second naturally pairs with [operations-causal-settling](substrate-algebra-closure-and-replay.md).
16. **Human-deferred-office cobordism shape** — placeholder *now* (so office records gain `awaiting-handoff-witness:` semantics) or deferred until human-deferred offices activate.
17. **Belt-and-suspenders layering.** Saturation/entropy caps + safety-envelope precheck — confirm intended layering rather than treating them as alternatives.
18. **Token-cost measurement granularity.** Per-workitem `dispatch-cost-record` (granular, lets the cost-quantale read directly) vs aggregated per-tick (cheaper, loses per-step attribution).
  First aligns with operations-causal-settling.
19. **Auto-saturation-recommendation surface.** When MASFT FC2 cells emerge above threshold for a workitem-class, substrate emits `recommend-pattern-downgrade`.
  Threshold and recommendation form (alert / queue-for-captain / auto-downgrade-with-attestation) need substrate-resident definition.
20. **Filesystem-only memory as default; vector/graph indices as opt-in.** Default-no-index (current PyFARS) vs auto-promote-when-grep-saturates (closure rule detects retrieval-failure patterns and recommends a graph index).
  First is principled; second matches the maturation-ladder pattern.
21. **Harness-generated frontmatter discipline.** Files installed by `pyfars install-harness` carry `harness-generated: true`; closure rules warn (or refuse) hand-edits to such files.
  Edge case: captain attestation overrides.
  Per the auto-generated-instruction-files reliability finding, this is a *correctness* property, not a developer-experience nicety.
22. **Three-stage self-improvement pattern's substrate shape.** Graders are closure rules over candidate self-generation cells; metaprompt is governance-amend-rule; baseline is the substrate-current-state.
  M5 self-generation IS one instance of this pattern — confirm the shape rather than authoring per-instance scaffolding.
23. **OpenClaw bridge regeneration cadence.** The `project-openclaw-bridge` closure rule regenerates `.openclaw/agents/`, `.openclaw/skills/`, `.openclaw/hooks/` from substrate cells.
  Per-substrate-tick (catches drift fast, cheap if no changes), per-quiescence (substrate-coherent, aligns with materialized-views-at-quiescence), or per-harness-restart (lightest, defers drift to manual restart).
  Per-quiescence aligns with the rest of the substrate's projection-cache discipline.
24. **Conflated vs split office-identity/instruction files.** Currently `governance/agents/<office>.md` carries both halves; closure rules read them as separate fragments via frontmatter discrimination.
  Whether to keep conflated (lighter human-author surface) or split into `<office>.identity.md` + `<office>.instruction.md` (closer to OpenClaw's SOUL.md/USER.md split).
  Conflated-with-discrimination is the lightest-touch path; split is more substrate-coherent.
25. **Heartbeat isolation policy default.** Per OpenClaw's 60–80% empirical savings, isolated-session should be the default for recurrent-practice firings.
  Whether to make it a substrate-wide default or per-recurrent-practice-record.
  Per-record allows session-loaded only when explicitly justified.
26. **DM-policy default on PyFARS-HTTP inbound (M8).** Per the four-mode classifier, `pairing` is OpenClaw's default.
  PyFARS's M8 inbound surface default — `disabled` (closed by default, opt-in per channel), `pairing` (investiture-required), or `allowlist` (admin-curated).
  `disabled` is most conservative; `pairing` matches OpenClaw's working default.
27. **ClawHub-style federated skill registry timeline.** Once M5 self-generation and M6 federation both ship, the polity can publish skills to a registry.
  Skill-registry milestone (call it M-skill-distribution) — what's its position in the dependency DAG, what's its deliverable shape (per-polity local registries, federated global registry, or both via the two-level recursion).
28. **Codi-vs-PyFARS authority precedence.** When PyFARS's substrate-resident closure rules say one thing about Codi's behavior and the OpenClaw-installed `.openclaw/agents/codi.md` projection says another (drift case), which is authoritative?
  Per the substrate-as-source-of-truth claim, PyFARS wins; closure rule `validate-openclaw-bridge-coherence` warns of drift.
29. **Skill-failure-mode detection cadence per skill-modification.** Per-modification (closure rule fires on every skill-cell write; catches issues immediately at substantial substrate cost), per-tick (batched; cheaper but defers diagnostics), per-export (cheapest; only at audit-export).
  Per-tick aligns with closure-rule firing pattern.
30. **Skill-failure-mode threshold tuning.** Each detector has a threshold (activation rate for ghost; success rate for false-positive; line count for encyclopedia; etc.).
  Whether thresholds are per-polity (substrate-resident in `governance/runtime-caps/<polity>.md`) or per-discipline.
  Per-polity is the lightest-touch; per-discipline allows finer calibration for theory-bearing vs operations-bearing disciplines.
31. **MASFT-cross-reference correlation strength measurement.** The `skill-failure-mode-record.masft-cross-reference.correlation-strength` field requires substrate-resident measurement (over time, how often does a Ghost-flagged skill correlate with FC1 or FC2 runtime failures?).
  Substrate-cell-tracked over $N$ ticks; reported in the audit-projector.
32. **Memory-fiber bilattice population density alerts.** The 4×4 grid (OpenClaw axis × CrewAI axis) has 16 cell-categories; not all populated for every office.
  Whether the substrate emits warning cells for offices with sparse-grid coverage (e.g., an office with no entity-axis-state cells may be operating with insufficient entity-knowledge).
  Per-office grid-coverage report with thresholds.
33. **CrewAI-decomposition cell-class mechanical inference.** The `crewai-axis:` field in `memory-fiber-bilattice-record` could be inferred from cell-properties (cell with `expires-at:` is short-term or contextual; cell referencing entities is entity-axis; etc.) or declared explicitly per cell.
  Mechanical inference is substrate-coherent; explicit declaration is more reviewable.
34. **Four-axis recurrence verification on new substrate decompositions.** When the polity discovers a new substrate decomposition (e.g., a new method ontology imported), `verify-four-axis-orthogonality` (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)) checks whether it fits the four-axis pattern.
  Whether a non-fit triggers research (the decomposition is genuinely new structure) vs refactor (the decomposition is overcomplete and should collapse to four).
