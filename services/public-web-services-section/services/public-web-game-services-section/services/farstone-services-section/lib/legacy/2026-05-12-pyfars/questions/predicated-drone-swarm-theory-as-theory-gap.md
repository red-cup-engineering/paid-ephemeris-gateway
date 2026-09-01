---
type: question
status: open
explores: [predicated-drone-swarm-theory, swarm-vs-orchestration-dichotomy, llm-swarms-fail-classical-conditions, m9-substrate-as-supervisor, layered-control, charter-as-closure-system, theory-lifting-discipline]
---

# How does PyFARS author a predicated-drone-swarm theory before [M9–M12](../work/milestones/roadmap.md) ship, so the embodied-deployment milestones rest on predicated theory rather than on survey texts?

[M9–M12](../work/milestones/roadmap.md) extend PyFARS to embodied participants — drones, robots, sensor swarms — under a layered control architecture below the substrate.
The framing is correct: PyFARS is the substrate-and-governance layer above whatever control architecture the deployment requires.
The theoretical anchors named are:

- [`swarm-vs-orchestration-dichotomy`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md)
- [`llm-swarms-fail-classical-conditions`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md)
- [`stigmergy-decouples-coordination-cost`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/stigmergy-decouples-coordination-cost.md)
- [`emergence-requires-local-determinism`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/emergence-requires-local-determinism.md)
- The drone-swarm survey texts under [`agents/texts/`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/) — strategic-deployment-roadmap, emergent-intelligence-drone-swarms, autonomous-agents-drone-swarms-standalone-report, cyber-resilience-framework-for-decentralized-multi-agent-drone-swarms.

These are theorems about *classical-swarm-vs-orchestrated-LLM-collective* and survey texts.
The corpus does **not** contain a *predicated* drone-swarm theory at `theories/theories/.../predicated-computing/theories/predicated-drone-swarm/`.
Per the [predicated-computing index](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/_index.md), the discipline of this part of the corpus is engineering-as-predication — predicated databases, predicated web servers, predicated distributed coordination, predicated functional runtimes are each authored.
A predicated drone-swarm theory does the same for embodied collectives: cells, fibers, closure rules, convergence claims that describe an orchestrated-by-PyFARS embodied-collective on the substrate's algebra.

[M9–M12](../work/milestones/roadmap.md) currently cite the swarm-intelligence theorems and the survey texts directly.
Per the [working-instructions CLAUDE.md](../../../../CLAUDE.md), "Lifting wisdom across layers is a research claim, not a mechanical cross-reference."
The roadmap is using survey texts in a position where it should be citing predicated-theory; the lifting step has been deferred.
That step should happen before [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) implementation begins.

## What the predicated-drone-swarm theory contains

Authoring this theory is research work, not engineering.
Its scope and structure:

- **Location.** As a sub-theory under [`agential-orchestration-platform`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/_index.md), since PyFARS-the-orchestrator is what makes the embodied collective predicated.
  Path: `theories/theories/.../agential-orchestration-platform/theories/predicated-drone-swarm/`.
  Sibling-of-FARS, child-of-AgOP.

- **Theorems the theory must author.**
  - `predicated-drone-collective-fails-classical-stigmergy` — the predicated analogue of [`llm-swarms-fail-classical-conditions`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md), stating which classical conditions an orchestrated drone collective fails (and which the cell-update sub-layer satisfies, per the parallel finding in the [stigmergy-as-substrate-feedback-channel](stigmergy-as-substrate-feedback-channel.md) question).
  - `embodied-cost-quantale-extends-monetary` — formalizes [M10](../work/milestones/m10-cost-and-energy-ledger-extension.md)'s cost-quantale extension `(fuel, dollars, tokens) → (fuel, dollars, tokens, joules-against-battery, bandwidth-bytes-against-window)` as a quantale-theorem.
  - `safe-envelope-precheck-as-bilattice-modal-suspension` — formalizes [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md)'s safety-shield as a substrate-side modality.
    The pattern is structurally similar to [`failure-detection-as-bilattice-modal-suspicion`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/failure-detection-as-bilattice-modal-suspicion.md).
  - `meaningful-human-control-as-charter-c3-extension` — formalizes [M12](../work/milestones/m12-cross-substrate-handoff-protocol.md)'s human-control norm as a charter-binding rule rather than a deployment policy.
  - `coordination-across-handedness-asymmetric-participants` — extends [`coordination-cohomologically-bounded-by-h1`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/coordination-cohomologically-bounded-by-h1.md) to participants with asymmetric handedness coordinates (drones are receive-mostly with periodic state-broadcast; not symmetric peers).
    The cohomological bound differs.

- **Objects the theory must author.** `drone-record`, `control-layer-handoff`, `safety-envelope-cell`, `embodied-cost-coordinate`, `physical-budget-record`, `byzantine-resilience-witness`.
  Located per `pyfars where` directives.

- **Concepts the theory must author.** `embodied-handedness`, `physical-precondition`, `control-layer-rejection`, `meaningful-human-control`.

- **References consumed.** The drone-swarm survey texts under [`agents/texts/`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/) become reference inputs to the predicated theory; the predicated theory's theorem-bodies cite them as evidence for engineering claims, with the predicated formalization sitting on top.

## What this commits the roadmap to

- **[M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) "Theory section"** entries cite *the predicated theory* as the primary anchor; the survey texts and the swarm-intelligence theorems become supporting references.
  This satisfies the lifting-discipline.
- **A new theory-research deliverable appears.** "Predicated-drone-swarm theory authored" is a research milestone, not an engineering milestone.
  It precedes [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) implementation in the dependency DAG.
  The roadmap-enrichment planner should treat it as an [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) precondition.
- **The roadmap's M9–M12 closing remark** ("PyFARS is small, orchestrated, expensive, with no convergence guarantees") moves from a roadmap caveat to a *theorem statement* in the predicated theory.

## Drone-theory mining now feeding the predicated theory's authoring

The mining work since this question was opened has produced substrate-engineering material whose theorem statements would be load-bearing for the predicated-drone-swarm theory.
The material lives in the consolidated questions; the predicated theory's authoring task is to elevate and formalize the relevant chunks:

- **In [`federation-resilience-and-degradation`](federation-resilience-and-degradation.md):** graph Laplacian $L = D - A$ and $\lambda_2(L)$ Lyapunov rate bound (verbatim drone-swarm consensus); Tabuada / Heemels–Johansson–Tabuada Lyapunov triggers; LeBlanc–Zhang–Sundaram–Koutsoukos W-MSR Byzantine consensus with the $(2F+1)$-robust graph condition; phi-accrual as Lawvere-quantale-graded $\Diamond_{R_{\mathrm{hb}}}$; McMahan FedAvg ship-deltas-not-data discipline; the four-state graceful-degradation workflow from the cyber-resilience text.
- **In [`governance-charter-and-accountability`](governance-charter-and-accountability.md):** HJ reachability and CBF / GCBF+ forward-invariance, generalized from drone safety to a substrate-precheck primitive (charter amendment / federation admission / self-generation).
- **In [`memory-feedback-self-generation-and-failure-modes`](memory-feedback-self-generation-and-failure-modes.md):** MASFT saturation + bounded $H_\rho$ + reproducibility-test; CTDE (MADDPG / QMIX / HAPPO formulations) substrate-version; MASFT 14-mode taxonomy as substrate anomaly classification.
- **In [`cohomological-coordination-and-audit`](cohomological-coordination-and-audit.md):** distance-based formation control + Laman rigidity theory, mapped onto the polity's commitment graph.

The predicated-drone-swarm theory should consolidate these into theorem statements whose substrate-engineering instantiation is the question's content.
The questions' "Implementation questions for the planner" sections become open theory-research questions for the theory; the bodies become provisional theorem-bodies the theory either proves or refines.

## Seven-axis taxonomy for embodied autonomous agents

The May 2026 surveys ([`survey-of-autonomous-agents-and-swarms-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/survey-of-autonomous-agents-and-swarms-may-2026.md) and [`autonomous-agents-drone-swarms-standalone-report-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/autonomous-agents-drone-swarms-standalone-report-may-2026.md)) propose a **seven-axis technical taxonomy** for autonomous agents that the predicated-drone-swarm theory should adopt as the substrate-cell classification for embodied participants.
The seven axes:

| Axis | Values | Substrate predication-fiber |
|---|---|---|
| **Embodiment** | software-only / embodied-robot / hybrid-human-machine | Physical-locus predicate |
| **Control architecture** | centralized / hierarchical / decentralized / distributed | Authority-topology predicate |
| **Homogeneity** | identical / role-specialized-homogeneous / heterogeneous | Type-uniformity predicate |
| **Interaction topology** | metric-neighbor / topological-neighbor / all-to-all / leader-follower / tree / mesh / time-varying-switching | Communication-graph predicate |
| **Information structure** | full-state / partial-observability / delayed / lossy / event-triggered / adversarial | Observation-quality predicate |
| **Decision model** | rule-based / optimization-based / game-theoretic / learned | Decision-policy predicate |
| **Assurance class** | empirical-only / partially-certified / theorem-backed-with-explicit-safe-sets | Safety-certification predicate |

The taxonomy matters because *different theorems, software stacks, and regulations apply to different points in the taxonomy*.
The substrate-algebraic statement: predicated-drone-swarm cells carry these seven predicates as frontmatter; closure rules over the predicates determine which theorems apply, which engineering disciplines bind, and which regulatory regimes govern.

**The seven-axis taxonomy extends the four-axis fiber-decomposition recurrence** (per the [cohomological-coordination question](cohomological-coordination-and-audit.md) and the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)).
Of the seven, three (embodiment, homogeneity, assurance class) are *participant-properties* that decompose into the substrate's identity-axis; two (control architecture, interaction topology) decompose into the practice-axis; one (information structure) decomposes into the attention-axis; one (decision model) decomposes into the state-axis.
The seven-axis pattern is the four-axis pattern with embodiment-specific refinement, not a genuine seventh independent axis.
(See the [cohomological-coordination question's seven-axis section](cohomological-coordination-and-audit.md) for the full BC-commutation analysis.)

Substrate object kind, `embodied-participant-record`:

```yaml
type: embodied-participant-record
slug: <participant-slug>
embodiment: software-only | embodied-robot | hybrid-human-machine
control-architecture: centralized | hierarchical | decentralized | distributed
homogeneity: identical | role-specialized-homogeneous | heterogeneous
interaction-topology: metric-neighbor | topological-neighbor | all-to-all | leader-follower | tree | mesh | time-varying-switching
information-structure: full-state | partial-observability | delayed | lossy | event-triggered | adversarial
decision-model: rule-based | optimization-based | game-theoretic | learned
assurance-class: empirical-only | partially-certified | theorem-backed-with-explicit-safe-sets
applicable-theorems: [<theorem-slug>, ...]   # mechanically computed from the axis values
applicable-regulations: [<regulation-slug>, ...]   # mechanically computed from assurance-class + embodiment
```

## Mathematical-foundations inventory for predicated-drone-swarm theory

The May 2026 survey catalogs the eight mathematical families that constitute the field's load-bearing substrate.
Each becomes a substrate-resident theorem in the predicated-drone-swarm theory; this is the theorem-inventory the theory must author or import.

| Family | Representative idea | Typical assumptions | Main guarantee | Substrate-resident form |
|---|---|---|---|---|
| **Average consensus** | $\dot{x} = -Lx$ or $x_{k+1} = Wx_k$ on connected/rooted graphs | Compatible weights | Agreement on common value; rate $\lambda_2(L)$ | [`algebraic-connectivity-bounds-consensus-rate`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/) per [federation-resilience question](federation-resilience-and-degradation.md) |
| **Gossip** | Random pairwise averaging | Sparse asynchronous exchange | Consensus in expectation; second-largest eigenvalue mixing | Substrate-cell-pair merges as gossip-step |
| **Distance-based formation** | $u_i = -\sum_{j \in \mathcal{N}_i} \nabla_{p_i} \phi(e_{ij})$ where $e_{ij}(p) = \|p_i - p_j\|^2 - d_{ij}^2$ | Rigidity; local relative-state sensing | Local shape stabilization | [Formation-control rigidity in cohomological-coordination question](cohomological-coordination-and-audit.md) |
| **Flocking / alignment** | Cucker-Smale: $\dot{p}_i = v_i$, $\dot{v}_i = \sum_j a_{ij}(t)(v_j - v_i) - \nabla_{p_i} U(p)$ | Local interaction + sufficient connectivity | Velocity matching + coherent motion | Substrate-cell stigmergic-update with kinetic+potential energy Lyapunov |
| **Event-triggered consensus** | Update only when trigger fires; Tabuada/HJT-style | Trigger monitor + graph conditions | Consensus without Zeno under designed triggers | [Event-triggered sync in federation-resilience question](federation-resilience-and-degradation.md) |
| **Auction / bundle task allocation** | CBBA, MURDOCH; local bids + consensus conflict resolution | Task utilities, local communication, moderate delays | Feasible approximate assignment; CBBA polynomial-time | Substrate-resident bidding-record cells; closure-rule resolution |
| **Distributed ADMM / convex optimization** | Local proximal step + network averaging | Convexity, decomposability, connectivity | $O(1/k)$ ergodic convergence | Closure-rule-firing as ADMM iteration step |
| **Mean-field control / games** | $J_i(u_i) = \mathbb{E}[\int_0^T \ell(x_i, u_i, m_t) dt + g(x_i(T), m_T)]$; replace pairwise coupling by state distribution $m_t$ | Large populations, exchangeability | Tractable large-swarm planning | Aggregate cells as mean-field $m_t$; substrate-cell-density predicates |

**State estimation** (Kalman filtering) anchors the substrate's measurement-cell discipline.
The Kalman recursion:

$$ \hat{x}_{k|k-1} = A \hat{x}_{k-1|k-1}, \quad P_{k|k-1} = A P_{k-1|k-1} A^\top + Q $$ $$ K_k = P_{k|k-1} H^\top (H P_{k|k-1} H^\top + R)^{-1} $$ $$ \hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k (y_k - H \hat{x}_{k|k-1}) $$

is the substrate-resident state-estimation primitive.
Distributed Kalman filtering (estimate-sharing OR measurement-sharing + consensus stage) requires explicit attention to communication budget, covariance consistency, and Bayesian lower bounds — naive fusion produces inconsistency under correlated noise.
The substrate's `distributed-kalman-record` cell-kind captures the consensus-augmented filter; closure rule `verify-covariance-consistency` checks Bayesian lower bound at each merge.

**Open mathematical interfaces** (per the survey, "the field has elegant asymptotic results but still lacks enough deployable theory for large, heterogeneous swarms in cluttered, adversarial airspace") become the predicated-drone-swarm theory's open-research-question set:

- Switching directed graphs with delays and packet loss.
- Mixed continuous/discrete decision loops.
- Heterogeneous vehicle dynamics.
- Aerodynamic interaction.
- Uncertainty-aware convergence rates.
- Finite-team corrections to mean-field models.

The substrate-algebraic statement: the predication-categories' closure 2-monad provides the *uniform algebraic frame* in which all eight mathematical families compose; the open interfaces above become the theory's research-question records (per the [governance question](governance-charter-and-accountability.md)'s methods-record and accretion-trajectory discipline).

## Learning-and-AI-methods inventory

The survey's nine learning families form the *learned-decision-model axis* of the seven-axis taxonomy.
Each becomes a substrate-resident skill or foreign-interior cobordism per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md):

- **MADDPG** — centralized critic with decentralized actors: $\nabla_{\theta_i} J \approx \mathbb{E}[\nabla_{\theta_i} \pi_i(o_i) \nabla_{a_i} Q_i(x, a_1, \ldots, a_n)]$.
  Per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md).
- **QMIX** — monotonic factorization: $Q_{\text{tot}}$ as monotonic combination of per-agent $Q_a$ subject to $\partial Q_{\text{tot}} / \partial Q_a \geq 0$.
  Decentralized greedy action consistent with centralized maximum.
- **MAPPO** — PPO-style CTDE baseline; strong empirical performance with simple implementation. *Older folk wisdom said off-policy only; MAPPO refuted this.*
- **HAPPO** — trust-region MARL with sequential policy updates; theory-backed monotonic improvement; multi-agent advantage decomposition.
- **DAgger** — iterative expert-label aggregation on learner-visited states; addresses BC's compounding distribution shift; primary route to high-level navigation when demonstrations exist but online RL is unsafe.
- **FedAvg-style federated learning** — $w^{t+1} = \sum_i (n_i / \sum_j n_j) w_i^{t+1}$.
  Per [federation-resilience question](federation-resilience-and-degradation.md).
  Sensitive to non-IID data, link failures, energy.
- **MAML** — meta-learning for fast adaptation: $\theta_i' = \theta - \alpha \nabla_\theta \mathcal{L}_{\tau_i}(\theta)$.
  Rapid retuning to new conditions.
- **PETS / MBPO** — model-based RL; learned dynamics models for sample efficiency or monotonic-improvement analyses; vulnerable to model bias outside training envelope.
- **GCBF / GCBF+** — Graph Control Barrier Functions with neural parameterizations + LiDAR point clouds; CBF condition $\dot{h}(x, u) + \alpha(h(x)) \geq 0$ defines forward-invariant safe set; **strongest current learning-plus-safety option** with hardware demonstrations on drone swarms.

**Foundation models at the task-planning and human-swarm interface level** are emerging but *not yet a replacement for low-level verified control*.
The defensible architecture is hierarchical:

```
[Foundation model: intent + decomposition + multimodal scene interpretation]
    ↓
[Optimization/control: trajectory generation]
    ↓
[Certified safety shields: HJ reachability + CBF + neural verification]
    ↓
[Verified flight-control loop]
```

**This three-layer pattern IS PyFARS's substrate / harness / external-runtime split** (per the [federation-resilience question's industrial three-layer section](federation-resilience-and-degradation.md)) applied to embodied autonomous agents.
The substrate-resident closure-rule layer carries the certified safety shields; the harness layer carries the optimization/control; the foreign-runtime layer carries the foundation model. **PyFARS's [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) substrate-as-supervisor-of-layered-control IS this layered architecture.**

The survey's open learning problems become the predicated-drone-swarm theory's research-question records:

- Convincing guarantees for partially-observed MARL with communication dropouts.
- Reliable behavior under spectrum denial and GPS loss.
- Certification methods for learned perception inside closed flight loops.
- Robust sim-to-real transfer across airframes and weather.
- Benchmark suites stressing communications + aerodynamics + sensing + legal compliance simultaneously.

## Communications-as-control-plant: the protocol-family taxonomy

The survey's central architectural claim: **communication is not a support function in swarms; it is part of the control plant.** The most important co-design question is whether state exchange should be periodic, event-triggered, summarized, or omitted.
ROS 2 documentation makes this explicit: DDS/ROS 2 can be tuned between *best effort* and *reliable* QoS profiles, with **incompatible QoS profiles causing message loss by construction**.

The communications-protocol-family table (raw data rates from public specifications):

| Protocol family | Publicly stated nominal data rate | Typical role | Caveat |
|---|---|---|---|
| **LoRaWAN** | 250 bit/s to 50 kbit/s (regional parameter table) | Long-range telemetry; sparse alerts; low-duty-cycle coordination | Very low throughput; poor fit for dense high-rate state exchange |
| **IEEE 802.15.4** | 250 kbit/s target over the air | Low-power local sensing; mesh control | Short range; bandwidth-limited |
| **Bluetooth LE** | 1 Mb/s mandatory LE 1M; optional 2 Mb/s; coded 125/500 kbit/s | Nearby pairing; setup; local coordination | Short-range; topology-limited |
| **MAVLink** | Transport-dependent | Telemetry; commands; mission exchange | Not a physical link standard |
| **DDS / ROS 2** | Transport-dependent; configurable QoS | High-rate middleware in autonomy stacks | QoS incompatibility + IP fragmentation can break field performance |
| **Wi-Fi 6** | 9.6 Gb/s theoretical aggregate maximum | Broadband local networking; video; rich state exchange | Real-world far lower; contention-sensitive |
| **5G NR UAV** | Unspecified on cited UAV page | Wide-area C2; backhaul; UTM/airspace integration | Carrier-coverage-dependent |

The substrate-algebraic statement: **communications protocol choice is itself a substrate-resident predicate** (per the [federation-resilience question's communications-as-control-plant section](federation-resilience-and-degradation.md)).
Closure rules over the protocol-family choice determine which event-triggered-sync triggers fire (per Tabuada/HJT), which W-MSR Byzantine filters apply, and which graceful-degradation lifecycle-state activates when a protocol's reliability boundary is exceeded.

## Civil and defense regulatory anchors

The May 2026 surveys catalog the regulatory anchors that bind embodied-participant operation; each is a substrate-resident charter authority (per the [governance question](governance-charter-and-accountability.md)).

**Civil regulation converges on three pillars**:

1. **Performance-based flight authorization for routine BVLOS** + UTM-like services.
  FAA BVLOS NPRM names central integration targets: package delivery, agriculture, aerial surveying, civic-interest uses, training, recreation, flight testing.
2. **Remote identification + operator traceability**.
  FAA Remote ID requires most registered drones to comply with three compliance pathways:
   - **Standard Remote ID drones** (built-in broadcast).
   - **Remote ID broadcast modules** (retrofit).
   - **FRIA** (FAA-Recognized Identification Area; operation inside a defined zone).
3. **Structured airspace information + authorization services**.
  EASA U-space (Regulation EU 2021/664) makes mandatory services central: authorization / traffic information / weather support / certified providers / secure interoperable protocols.
  ICAO RPAS and UTM framework guidance continues to emphasize harmonized integration.

**Defense governance** anchors:

- **DoD Directive 3000.09** (2023 update) — appropriate human judgment over use of force; realistic operational testing; cyber survivability; legal review; procedures to avoid unintended engagements or unauthorized interference; senior-level approvals for relevant classes of systems.
- **NATO Autonomy Implementation Plan + Principles of Responsible Use for AI in Defence**: lawfulness / accountability / explainability-traceability / reliability / governability / bias-mitigation.
- **DARPA OFFSET** (large-team human-swarm teaming and interfaces); **AMASS** (multi-domain adaptive swarms-of-swarms).
- **ICRC and UNODA** (international debate on autonomous weapon systems; CCW Group of Governmental Experts continued in 2025; no universal treaty settlement).

**The substrate-algebraic mapping** (extends the [governance question's IEC 61508 section](governance-charter-and-accountability.md) and [federation-resilience question's industrial-three-layer section](federation-resilience-and-degradation.md)):

| Regulatory regime | Substrate charter-authority | Closure-rule enforcement |
|---|---|---|
| FAA Remote ID | Identity-axis substrate cells with `remote-id-pathway:` field | `enforce-remote-id-compliance` |
| EASA U-space | External-surface-record with `u-space-zone:` + `mandatory-services:` fields | `route-via-u-space-services` |
| DoD Directive 3000.09 | Charter hard-core (rules tier; bare $\Pi_1+<$); human-judgment requirement | `verify-meaningful-human-control` (per below) |
| NATO Principles | Charter rules tier; six-principle predicates | `verify-nato-principle-compliance` |
| ICRC / IHL | Charter hard-core; constitutional-amendment-tier authority | `verify-ihl-compliance` |

## Governed autonomy as the predicated-drone-swarm theory's central thesis

The May 2026 surveys converge on a single thesis that should anchor the predicated-drone-swarm theory:

> *A swarm that is mathematically stable but institutionally unaccountable is not a mature technology.
> Conversely, strong governance without robust estimation, networking, and safety proofs will not keep systems reliable in complex airspace or adversarial conditions.
> The field's real frontier is therefore technical–legal integration: proving enough to justify deployment, instrumenting enough to enable audits, and limiting enough to preserve human responsibility.*

**This IS PyFARS's central engineering claim, applied to embodied autonomous agents.** The substrate-algebraic decomposition:

- **"Mathematically stable"** = the substrate's closure 2-monad lax-idempotence + four-regime classification + algebraic-connectivity convergence (per [substrate-algebra question](substrate-algebra-closure-and-replay.md), [federation-resilience question](federation-resilience-and-degradation.md)).
- **"Institutionally accountable"** = the substrate's accountability-projector + audit-witness chain + Mulgan-administrative-and-legal-coverage (per [governance question](governance-charter-and-accountability.md)).
- **"Robust estimation"** = distributed Kalman filtering + W-MSR Byzantine resilience + secure state estimation (per [federation-resilience question](federation-resilience-and-degradation.md)).
- **"Networking"** = communications-as-control-plant + protocol-family-aware substrate-data-pipeline (this section + federation-resilience).
- **"Safety proofs"** = HJ reachability + CBF + neural verification + safety-envelope precheck (per [governance question's HJ/CBF section](governance-charter-and-accountability.md)).
- **"Technical-legal integration"** = the substrate's charter-fragment hierarchy bridges natural-language regulation (FAA/EASA/DoD/NATO/IHL) to substrate-decidable target-valuations (per the [substrate-algebra question's cybernetic-feedback section](substrate-algebra-closure-and-replay.md)).
- **"Auditable instrumentation"** = the substrate's typed-frontmatter discipline + content-addressed cells + replay-byte-identity (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)).
- **"Limited to preserve human responsibility"** = the four-cap stack (bounded-$H_\rho$ + saturation cap + substrate-resident graders + four-regime aperiodic-authorization) plus captain-attestation-required lifecycle state (per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md), [federation-resilience question](federation-resilience-and-degradation.md)).

**The predicated-drone-swarm theory's load-bearing claim**: PyFARS's substrate algebra *provides governed autonomy by construction* — every clause of the survey's "frontier" thesis is realized as a substrate-resident discipline with closure-rule enforcement and audit-projector visibility.
The theory isn't just a research target; it's the substrate-algebraic formalization of what governed autonomy means for embodied participants.

## The definitional problem and meaningful-human-control as charter

The May 2026 surveys identify a *persistent definitional problem*:

> *Autonomy levels, swarm thresholds, and what counts as "meaningful human control" or "appropriate human judgment" are not standardized across all civilian and defense frameworks.
> This definitional gap is one reason benchmark transfer, procurement language, and legal review remain inconsistent across domains.*

PyFARS's substrate addresses this gap by *providing the polity-internal definition mechanically* — the polity authors what counts as "meaningful human control" *for this polity* via the charter-fragment hierarchy.
The substrate-algebraic answer:

- **Autonomy levels** = the formality-layer hierarchy ($F_0$ to $F_3$) per the [skill-composition cost in the dispatch question](dispatch-workitems-plans-and-external-surfaces.md). $F_0$ = LLM-call required; $F_3$ = pure substrate operation.
  The polity declares which formality layer constitutes "autonomous" for which workitem-class.
- **Swarm thresholds** = the saturation cap (~4 agents per MASFT) per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md).
  The polity declares when its multi-agent dispatch crosses into "swarm" via substrate-cell measurement, not external definition.
- **Meaningful human control** = the *captain-attestation-required* lifecycle state plus the safety-envelope precheck plus the conduct-teaching predicates plus the audit-projector-totality.
  The polity declares what counts as meaningful control for *this* polity via charter-tier discipline; substrate-resident closure rules verify it mechanically.

The theorem `meaningful-human-control-as-charter-c3-extension` (per the predicated-drone-swarm theory's authoring task) gives *the substrate-algebraic definition*: meaningful human control over a workitem $w$ holds iff:

1. The workitem's outcome cell carries a witness chain terminating at a captain-attested cell (accountability-totality).
2. The workitem's safety-envelope precheck has fired (HJ/CBF satisfied).
3. The workitem's authorization passes the charter-tier discipline at the appropriate fragment-tier (rules / guidelines / hard-core depending on workitem-class).
4. The workitem's `falsifiable-agency-certificate` (per [substrate-algebra question](substrate-algebra-closure-and-replay.md)) shows persistent-state continuity (Condition 3) — the captain's interrupt-and-resume capability is preserved.

This is the polity-internal mechanical definition; it does not solve the field-wide standardization gap, but it makes the polity's interpretation *substrate-decidable and audit-exportable* — which is more than the regulatory frameworks themselves provide.

## The single hardest unsolved intersection

The May 2026 surveys identify *the hardest unsolved intersection* in the field:

> *Learned, partially observed, communication-constrained, adversarial multi-agent control with certifiable guarantees and realistic airspace compliance.*

This is the **predicated-drone-swarm theory's unique research target** — the intersection where every existing technique in the field is individually limited and the combination remains unsolved.
The substrate-algebraic statement: the predicated-drone-swarm theory is not "just" a lifting of existing drone theory; it is the substrate-algebraic discipline at this specific six-way intersection.
The theory's authoring task is to:

1. Formalize partial observability via the substrate's bilattice $\mathbf{FOUR}$ (paraconsistent reasoning under $\langle \bot, \cdot \rangle$ knowledge-order).
2. Formalize communication constraints via the substrate's protocol-family-aware data-pipeline (per the federation-resilience question + the communications section above).
3. Formalize adversarial conditions via the W-MSR Byzantine filter + secure state estimation + GNSS-spoofing-resilient localization (per [federation-resilience question](federation-resilience-and-degradation.md)).
4. Formalize learned components via foreign-interior cobordism with bounded $H_\rho$ + saturation cap + substrate-resident graders (per [dispatch question](dispatch-workitems-plans-and-external-surfaces.md), [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md), [substrate-algebra question](substrate-algebra-closure-and-replay.md)).
5. Formalize certifiable guarantees via the falsifiable-agency-certificate + replay-byte-identity + four-regime classification + IEC-61508-shaped SIL gating.
6. Formalize airspace compliance via the substrate-resident regulatory-authority records (FAA/EASA/DoD/NATO/IHL).

**The predicated-drone-swarm theory IS the substrate-algebra at this six-way intersection.** No existing drone-theory framework provides this composition; PyFARS's substrate provides each component, and the theory's contribution is *certifying that they compose*.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented; the predicated-drone-swarm theory inherits substrate-algebraic structure directly rather than re-inventing it.

### Seven-axis taxonomy is realized as a predication-fibration index structure

The [predication-fibration object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md) gives the algebraic shape directly: a cloven Grothendieck fibration $p : \mathcal{E} \twoheadrightarrow \mathcal{C}$ where $\mathcal{C}$ is the predicate category and each fiber $\mathcal{E}_q$ is canonically the predication fiber algebra $A_q = \mathbf{L}^{\bowtie E \times E}$.

For Q5 (seven-axis-taxonomy adoption as substrate-cell predicate vs separate ontology): the seven axes (embodiment / control-architecture / homogeneity / interaction-topology / information-structure / decision-model / assurance-class) are the *base coordinates* of the predicate category $\mathcal{C}$ for embodied participants.
The asymmetric resolution (3 on identity, 2 on practice) gives a refined predicate category $\mathcal{C}^\mathrm{drone}$; each refinement is a [predicate-specialization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) morphism in $\mathcal{C}$.
The substrate's predication fibration over $\mathcal{C}^\mathrm{drone}$ inherits BC commutation, closure 2-monad structure, and four-regime classification *automatically* — adoption is structurally cleaner than separate-ontology because the substrate's algebra extends to $\mathcal{C}^\mathrm{drone}$ by construction.

### Hierarchical safety-critical architecture IS the cobordism category

The [settling-cobordism-category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md) and [tqft-structure theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md) realize the three-layer foundation-model + optimization-control + certified-safety-shield architecture algebraically:

- **Layer 1 (foundation-model)** = a cobordism $S_1 : \mathcal{B}_\mathrm{situation} \to \mathcal{B}_\mathrm{intent}$ with non-deterministic bulk (LLM/learned model).
  The bulk is the foreign interior; only the boundary is substrate-resident.
- **Layer 2 (optimization-control)** = a cobordism $S_2 : \mathcal{B}_\mathrm{intent} \to \mathcal{B}_\mathrm{action}$ with deterministic bulk (CBF/MPC/QP solver).
  The bulk is computable; replay-byte-identical via $Z(\mathcal{B})$.
- **Layer 3 (certified-safety-shield)** = a cobordism $S_3 : \mathcal{B}_\mathrm{action} \to \mathcal{B}_\mathrm{actuated}$ with strict-regime bulk (closure-rule check; finite case-enumeration). $H^1 = 0$ structurally.

The three-layer composition $S_3 \circ S_2 \circ S_1 : \mathcal{B}_\mathrm{situation} \to \mathcal{B}_\mathrm{actuated}$ is a settling cobordism whose closure ordinal is the ordinal sum $\kappa_1 + \kappa_2 + \kappa_3$.
Each layer's regime contributes its own ordinal; the strict-regime layer 3 caps the composite at the layer-3 ordinal *if* layers 1 and 2 are bounded.

This decisively answers Q8 (hierarchical safety-critical architecture as M9 deliverable): layer-by-layer aligns with the substrate's algebra because each layer is a cobordism in its own right, composable when ready.
The Klein-four grading $\widehat{K_4}$ on $Z(\mathcal{B})$ supplies the structural taxonomy of layer-types: $e$ (passive layer; identity cobordism), $\sim$ (knowledge-flip layer; situation→intent), $-$ (negation layer; certify-or-reject), $\sim\circ-$ (re-frame layer; full reasoning).

### GCBF+ as foreign-interior cobordism with falsifiable-agency boundary discipline

For Q7 (GCBF+ as substrate-resident closure rule vs foreign-interior cobordism): GCBF+ is structurally a layer-2 cobordism with deterministic bulk (graph-control-barrier-function evaluation is a deterministic computation given the graph + state) and substrate-resident boundary checks (state must be in safety set; output must satisfy CBF inequality).
The substrate-coherent path is foreign-interior cobordism with strict-regime boundary checks — the cohomology functor $Z$ integrates out the GCBF+ bulk while preserving boundary-only replay byte-identity per [tqft-structure](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md).
Authoring a substrate-native graph-CBF closure rule duplicates the algebra without adding structural content.

### Six-way intersection: the theorem decomposes via Cob_settling composition

For Q12 (six-way intersection as mega-theorem vs sub-theorems): the cobordism-category structure of the safety-critical architecture *is* the composition theorem.
Each axis contributes a cobordism:

1. **Learned** = layer-1 cobordism with foreign-interior bulk.
2. **Partial-observability** = $\forall$-block antecedent in closure-rule language; transfinite-bounded regime.
3. **Communication-constrained** = federation-resilience question's protocol-family taxonomy; affects the closure ordinal of inter-agent cobordisms.
4. **Adversarial** = paraconsistent authority $a = \top$ in residuated-restriction; identity-on-payloads, with intrusion detection at the bilattice-network-sheaf-consensus level.
5. **Certifiable** = strict-regime layer-3 cobordism; $H^1 = 0$ structurally; substrate-decidable in bare-$\Pi_1+<$.
6. **Airspace-compliant** = charter-fragment-tier discipline; regulatory-anchor records in the predicate category.

Six sub-theorems with a composition theorem is the substrate-coherent path: the composition theorem is just the cobordism composition $S_6 \circ \ldots \circ S_1$, and the closure ordinal of the composite is the ordinal sum.
Sub-theorems verify each layer's regime; the composition theorem is structural.

### Meaningful-human-control's four conditions are substrate-decidable

For Q11 (MHC formalization commitment): the four conditions 1. captain witness chain; 2. safety-envelope precheck; 3. charter-tier discipline; 4. falsifiable-agency Condition 3 (persistent state)

are all decidable in bare-$\Pi_1+<$ per the [closure-rule-language](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md):

- (1) is a closure-rule check on witness-chain-record cells — finite path enumeration in $\Pi_1$.
- (2) is a closure-rule check on safety-envelope-record cells — predicate evaluation at proposal time, $\Pi_1$.
- (3) is a fragment-tier classifier on charter rules — decidable from frontmatter, $\Pi_1$.
- (4) is a closure-rule check on persistent-state-record cells — finite state enumeration, $\Pi_1$.

Authoring the MHC theorem in the predicated-governance theory (the [governance-charter-and-accountability question's load-bearing target](governance-charter-and-accountability.md)) and citing it from the predicated-drone-swarm theory is the substrate-coherent split.

### Aperiodicity characterization: drones are NOT structurally aperiodic

The [aperiodicity-characterization theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md) gives aperiodic ⟺ non-Scott-continuous AND cofinality $\geq \omega_1$.
For drone swarms:

- The drone-swarm entity-set is *finite or countable* (typically $\leq 10^3$ drones, plus airspace cells, plus ground-station references).
- State-space cofinality is at most $\omega$ in any realistic deployment.
- Therefore drone-swarm settlings are structurally in the strict or Scott-continuous regime — **never aperiodic**.

This decisively bounds the predicated-drone-swarm theory's regime scope: $H^1 = 0$ structurally, $\delta^0 = 0$ from CRDT-via-Mayer-Vietoris, the simplicity cap is automatic.
Certifiability (the theory's central claim) is *structurally available* in drone-swarm scale — the polity does not need to enter the harder regimes to guarantee SIL-rated behavior.
The single hardest unsolved intersection's "certifiable" axis is structurally compatible with the substrate's strict/Scott-continuous discipline.

### Equivariant cohomology decomposition: certifiability sectors

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) refines the drone-swarm safety architecture: the four $\widehat{K_4}$ sectors give independent certifiability channels:

- $H^1_\mathrm{id}$ certifications: symmetric truth-plus-falsity content (drone reports both positive and negative observations on a state).
- $H^1_{\chi_\sim}$ certifications: epistemic-frame disagreements between drones (different drones have different observational frames; resolvable by frame clarification).
- $H^1_{\chi_-}$ certifications: $\top$-firings — paraconsistent inconsistencies between drone observations. **Safety-critical sector** (consistency-failure events directly threaten certifiability).
- $H^1_{\chi_{\sim\circ-}}$ certifications: mixed double-curvature — frame disagreement AND inconsistency. **Worst-case multi-mode failure**.

The certifiable layer (layer 3 of the three-layer architecture) operates strictly on $H^1_{\chi_-} = 0$ AND $H^1_{\chi_{\sim\circ-}} = 0$ — i.e., refuses to certify any action when paraconsistent inconsistencies are present.
The substrate-resident closure rule `verify-certifiability-sectors` fires per-action and refuses dispatch when either of the two safety-critical sectors is non-zero.

For Q5 (seven-axis-taxonomy adoption): the substrate's seven-axis taxonomy refinement should declare per-axis sector decomposition.
The assurance-class axis specifically requires the 4-vector $(|H^1_\mathrm{id}|, |H^1_{\chi_\sim}|, |H^1_{\chi_-}|, |H^1_{\chi_{\sim\circ-}}|)$ as substrate-resident, with the certifiable sectors gated.

### Two internal logics: civil regulators vs substrate-internal

The [two-internal-logics theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md) gives both classical $T_t$ and paraconsistent $T_k$.
For drone-swarm civil compliance:

- FAA Remote ID, EASA U-space, ICAO use *classical* logic — their compliance is checked against $T_t$.
- The substrate's multi-drone consensus is *paraconsistent* — handles disagreement without trivializing.

The polity's certification-readiness statement (Q9) is a $T_t$-projection of $T_k$-internal state.
Per the [truth-knowledge LES](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md), the projection is lossless iff $H^n(\mathcal{F}_U^{(\top)}) = 0$ — i.e., iff the swarm has no $\top$-cells in the certification window. **Civil compliance is structurally a consistency claim** — the polity certifies that the swarm operated *consistently* in the certification window, with the inconsistency-cohomology as the quantitative honesty signal.

### Verdier duality: drone replay primitives

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) gives both sheaf and cosheaf presentations.
For drone swarm:

- **Sheaf cohomology ($H^1$)**: equality testing — "did this swarm execution match the certified-safe MLD-class?"
  Natural for offline post-flight certification audit.
- **Cosheaf homology ($H_1$)**: local-generator construction — "build the swarm state from per-drone, per-event firing data."
  Natural for real-time event-driven certification.

The three-layer safety-critical architecture's layer 2 (optimization-control) naturally fits cosheaf-homology (per-event local generators from sensor reads); layer 3 (certified-safety-shield) naturally fits sheaf-cohomology (cocycle witnesses verify execution against certified MLD-class).
The substrate carries both presentations; Verdier identifies them.

### MLD-equivalence: certifiability is MLD-class

The [mutually-locally-derivable concept](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md) is the equivalence relation classified by $H^1$.
Two swarm executions differing only in *settling-shift* (same content, different time origin) are MLD-equivalent.

This sharpens Q12 (single-hardest-unsolved-intersection mega-theorem vs sub-theorems): the certifiable axis's certification target is an *MLD-class*, not a specific execution. **The polity certifies an MLD-equivalence class of executions; specific instantiations differ by settling-shift but are not separately certified.** This is the structural analogue of regulatory "type certification" vs "individual certification" — the polity does type certification on MLD-classes.

### Realizability cardinality bound: drone polity expressivity

The [realizability-cardinality-bound theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md) caps the substrate's realizable family at $2^{\aleph_0}$ under bare-$\Pi_1+<$ rules and countable-support increments.
The drone-swarm polity, operating in the strict/Scott-continuous regime, has realizable family far smaller — the *one-parameter family of initial segments* per the transfinite-bounded-regime realizability bound (which the polity does not even need, being typically in the strict regime).

The polity's certifiable-by-construction shape is *not* a free design — it is bounded by the cardinality theorem. *Adding richer rule fragments does not give the polity more states; it changes the parametrization.* The substrate's expressivity is the *structural shape* of the realizable family, which is what the seven-axis taxonomy decomposes — the cardinality is fixed.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. Whether the theory-authoring is **one milestone** (M9-precondition) or **several** (one per [M9-M12](../work/milestones/roadmap.md) milestone's theory section). **Theory: cobordism composition.** Each milestone's contribution is a cobordism layer; the theory-authoring naturally tracks per-layer (per-milestone) since the layers compose in the cobordism category.
  Several milestones with a composition meta-theorem is substrate-coherent.
2. **Who authors.** This is research deliverable; the captain or a `theory-researcher` agent under the theory officer's office, not an engineering agent.
  The roadmap-enrichment planner needs to mark this work as theory-officer-tracked, not engineering-tracked.
3. **The cybersecurity-and-Byzantine-resilience scope.** The [`cyber-resilience-frameowkr-for-decentralized-multi-agent-drone-swarms`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/cyber-resilience-frameowkr-for-decentralized-multi-agent-drone-swarms.md) survey is large; the planner needs to scope which threat-model content is lifted into theorems and which stays in references.
4. **The theory's relationship to [`distributed-coordination-platform`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/_index.md).** Much of the multi-host coordination machinery already exists there; the predicated-drone-swarm theory's coordination content reuses it via depends-on edges and authors only the embodied-participant-specific delta.
5. **Seven-axis-taxonomy adoption** as substrate-cell predicate vs separate ontology.
  Adoption integrates the taxonomy with the substrate's typed-frontmatter discipline; separate-ontology keeps the import clean.
  Adoption is more substrate-coherent.
6. **Mathematical-foundations theorem-import scope.** Eight families × distributed-Kalman-filtering = nine substrate-resident theorems to author or import.
  Whether to author all nine in the predicated-drone-swarm theory or split (control-and-distributed-decision in DCP; estimation in a new sub-theory).
  DCP is the natural home for most.
7. **GCBF+ as substrate-resident closure rule.** The strongest current learning-plus-safety option is GCBF+.
  Whether to import GCBF+ as a foreign-interior cobordism (faster) or author a substrate-native graph-control-barrier-function closure rule (substrate-coherent).
  Foreign-interior with substrate-native witness chain is the practical compromise.
8. **Hierarchical safety-critical architecture as M9 deliverable.** The three-layer foundation-model-then-optimization-then-safety-shield pattern is the M9 architectural target.
  Whether to ship M9 with all three layers integrated or layer-by-layer.
  Layer-by-layer aligns with the substrate's incremental-maturation discipline.
9. **Civil regulatory authority publication.** FAA Remote ID + EASA U-space + ICAO are substrate-resident; whether the polity also publishes a *certification-readiness statement* per regulatory regime.
  Per the [governance question's polity-as-comprehensive-method-ontology](governance-charter-and-accountability.md), this is a deliverable to consider.
10. **Defense governance coverage.** DoD 3000.09 + NATO Principles + DARPA OFFSET/AMASS are substrate-resident as charter-authority records.
  Whether the polity engages defense governance directly or only through civil-regulation derivatives.
  Per the polity's mission, civil-only is the conservative default.
11. **Meaningful-human-control formalization commitment.** The four-condition definition (witness chain to captain + safety-envelope precheck + charter-tier discipline + falsifiable-agency-certificate) is a load-bearing theorem.
  Whether to author it in the predicated-drone-swarm theory or in the predicated-governance theory.
  Predicated-governance is the structural home; the predicated-drone-swarm theory cites it.
12. **The single-hardest-unsolved-intersection as research-question-record.** The six-way intersection (learned + partial-observability + communication-constrained + adversarial + certifiable + airspace-compliant) is the theory's unique target.
  Whether to author one mega-theorem covering the intersection or six sub-theorems each addressing one axis.
  Six sub-theorems with a composition theorem is the substrate-coherent path.
