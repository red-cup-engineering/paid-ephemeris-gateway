---
title: "PyFARS Roadmap — Toward Fully Predicated Agentic Computing"
kind: roadmap
status: active
date: "2026-05-08"
---

# PyFARS Roadmap

## The Destination

A *fully predicated agentic computing system* as defined in the [`predicated-agentic-computing`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/predicated-agentic-computing.md) narrative.
The system satisfies all five commitments simultaneously:

1. **Predication substrate** — storage primitive is the four-valued bilattice predication cell; reasoning primitive is the closure-rule system over the predication-graph store.
2. **First-class provenance** — every state change carries a witness recording operator, inputs, outputs, and substrate state.
  Provenance is substrate content, not an annotation layer.
3. **Agential self-generation** — every operative element (agent, skill, runbook, office, governance rule) is a substrate entity.
  The platform's machinery is defined in the substrate it operates on.
4. **Federation by value-domain join** — two systems federating compose through the substrate's value-domain join; the algebra IS the federation protocol.
5. **Practical reasoning as substrate operator schedule** — the tick/dispatch/runbook-execution cycle IS the practical-reasoning loop.

PyFARS today satisfies these commitments partially and unevenly.
Each milestone moves specific commitments forward without breaking what already works.

---

## Milestones

### M1 — Operational Housekeeping

**Status**: Partially landed, partially open.

**Delivers**: A clean substrate that the autonomous loop can run on without tripping over structural debt.

**Theory section**: FARS substrate commit discipline; `event-sourcing`; `source-of-truth`.

**Items**: - [ ] Operations directory structure formalized: `operations/engineering/`, `operations/command/`, `operations/science/` with consistent sub-layout. - [ ] Skill records reformatted as gerunding verb phrases; every skill record has exactly `name:` and `description:` (two sentences: what changes, when to use it). - [ ] `.pyfars/` holds only instance configuration, the event log, and session data.

**Done when**: `pyfars run .
` boots cleanly on a substrate whose operations tree has the three-domain structure; skill records pass the two-sentence-description check.

---

### M2 — Substrate-Driven Dispatch

**Status**: Open.
Closure rules and dispatch scheduler are in place; assignment-cell write-back and a substrate-default selection rule remain.

**Delivers**: Selection and assignment are fully substrate-driven — no Python fallback in the dispatch path.

**Theory section**: FARS `dispatch` morphism; `office-as-fuzzy-cell` concept; `agent-record` and `skill-record` objects.

**Items**: - [ ] **Assignment-as-cell**: the dispatch scheduler (`programs/engine/dispatch.py`) reads existing `type: assignment` records.
Closure rules must produce `(slug, type, assignment) = T` + `(slug, workitem, W) = T` + `(slug, agent, A) = T` cells so assignment subjects emerge from the closed store, not from hand-authored markdown. - [ ] **Selection-by-default-lex substrate rule**: author `objects/selection-by-default-lex.md` as a named-shape closure rule record so the default lex tiebreak is substrate policy, not code.
`selection-by-load` named shape already exists in `kernel/closure.py`.

**Done when**: Adding a polity-authored selection rule record changes dispatch tiebreak without code modification; assignment records emerge from closure rather than hand-authored files.

---

### M3 — Continuous Autonomous Loop

**Status**: Open.

**Delivers**: The system reliably processes work at tick cadence without human intervention, as long as budget and rate limits allow.

**Theory section**: FARS `heartbeat-cycle`; `advance-tick`; `tick-as-iteration` concept; `anomaly-as-contradiction` concept.

**Items**: - [ ] `pyfars run` runs as a systemd service on `vps-mini-cold-red-gate` and restarts on failure. - [ ] Budget records (`type: budget-record`) in the substrate cap total spend per time window; the dispatch graph reads these and skips invocation if budget is exhausted. - [ ] Rate-limit observations from agent invocations feed back into `eligibility-by-rate-limit`'s flag cells: an endpoint whose `rate-limit-remaining` reads `0` is disqualified next tick automatically (the closure rule already exists; the observation→cell write loop is what's pending). - [ ] Completed workitems emit a follow-on intent if their `on-complete:` field names a successor class. - [ ] Anomaly detection: `⊤`-valued cells from contradictory closure rule firings are surfaced as anomalies in the event log and a review-task is queued. - [ ] Idempotent re-runs: replaying the event log produces the same substrate state (per `event-sourcing` and the `rsv_hash` determinism guarantee).

**Done when**: The engine has run for 24 hours on the server with no human intervention, processing at least one workitem per tick when workitems are present, and producing a replay-deterministic event log.

---

### M4 — Memory and Session Feedback

**Status**: Open.

**Delivers**: Agents remember across sessions; agent completions write back to the substrate as observations and instincts; the system improves over time.

**Theory section**: FARS `three-tier-memory` concept; `session-as-entity` concept; `consolidation-as-settlement` concept.

**Items**: - [ ] Session records are opened at the start of each tick and closed at the end (the `session.py` runtime exists; lifecycle wiring is what's pending). - [ ] Observation records from agent invocations (rate-limit observations, cost observations, completion summaries) are projected into substrate cells so subsequent ticks can query them. - [ ] Instinct records (`type: instinct`) are produced by a `consolidate` step: a consolidation agent reads recent observation records and synthesizes summary instincts. - [ ] The dispatch graph's selection step reads instinct cells when evaluating `(workitem, dispatchable)` pairs. - [ ] OpenClaw memory sync: when an OpenClaw session closes, the session's memory file is translated into observation and instinct cells.

**Done when**: Running the same class of workitem twice shows measurably different (improved) selection based on the first run's observations.

---

### M5 — Agential Self-Generation

**Status**: Open.

**Delivers**: The platform's operative machinery (agents, skills, offices, governance) is entirely substrate content; agents can extend the platform's capabilities by editing the substrate.

**Theory section**: FARS `agential-self-generation`; the entire `skills, runbooks, agents, offices` spec section.

**Items**: - [ ] Runbook records as first-class substrate entities: a runbook has a triggering predicate, a context predicate, and a body of skill invocations. - [ ] Office records carry `authority-scope:`, `duty:`, and `right:` fields that the dispatch's authorization check reads. - [ ] New skill records created by a workitem's completion are immediately available to the dispatch graph on the next tick. - [ ] Governance rules are substrate records (`type: governance-rule`) that the closure-rule system applies; breaking a governance rule produces a `⊤` cell that the lifecycle routes to a review task. - [ ] Continuous-learning pipeline: `on-complete:` workitems that produce learning outputs (updated skills, refined runbooks, new instincts) cycle back through dispatch without human intervention.

**Done when**: An agent completing a workitem can write a new skill record to the substrate and that skill is dispatched on the next tick without any Python restart or code change.

---

### M6 — Federation

**Status**: Open.
Substrate scaffolding (`programs/federation.py` envelopes + `kernel/operator/federation.py` cellwise merge) exists; wire transport does not.

**Delivers**: Multiple PyFARS engines can share substrate content and converge on a consistent state under arbitrary message delivery ordering.

**Theory section**: FARS `federation` spec section.

**Items**: - [x] `FederationCell` / `FederationEnvelope` types defined. - [x] Cellwise `∨_k` merge over the Belnap–Fitting FOUR; conflicting cells produce `⊤`. - [x] `rsv_hash` from the closure runner stamps each dispatch run for replay-determinism across peers. - [ ] Content-hash addressing: every substrate note has a canonical content hash; the hash is the stable identifier for federation. - [ ] Peer records (`type: peer`) declare federated nodes with their address, trust level, and sync scope. - [ ] `emit-federation-envelope` / `admit-federation-envelope` over a network transport (HTTP per `wiring-protocols.md` §4.6 once that section settles). - [ ] Federation between `vps-mini-cold-red-gate` and `loc-lap-bare-cedar-fog` for shared operational records. - [ ] FARS federation spec section authored before wire-transport implementation.

**Done when**: A predication added on one host appears on the peer host after the next federation cycle, without data loss or last-write-wins resolution.

---

### M7 — Boundary Handedness and Outbound Endpoint Participation

**Status**: Open.
Closes the FARS [`routable-llm-endpoint-as-swarm-participant`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/routable-llm-endpoint-as-swarm-participant.md) open question.

**Delivers**: The substrate's swarm-participant surface extends beyond fellow sovereign nodes.
Outbound-only endpoints (Cerebras, Groq, Nvidia, OpenRouter, etc.) become substrate-readable: identity, cost, capability, rate-limit availability are first-class predications.
Dispatch routes outbound work by composed-cost-quantale-min.

**Theory section**: FARS [`LLMEndpointRecord`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md); [`swarm-participation-handedness`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md); [`monetary-cost-as-quantale-extension`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension.md).

**Items**: - [ ] Boundary records at `governance/boundaries/<slug>.md` carry an explicit handedness coordinate. - [ ] [`LLMEndpointRecord`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)s substrate-loaded at `governance/endpoints/<provider>--<model>.md` per the FARS spec (identity, handedness, capability, cost, availability, provenance, invariants). - [ ] Cost-discipline as substrate cells: settlement-fuel × dollars × tokens-against-budget product Lawvere quantale. - [ ] Dispatch chooses among endpoint candidates by composed-cost-quantale-min. - [ ] Rate-limit observations (`provider-header`, `self-counted`, `429-forced-zero` evidence-grading) ground availability cells.

**Done when**: A workitem of class `text-generation` arrives.
Multiple [`LLMEndpointRecord`s](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) exist.
Dispatch reads cost cells, composes them across the candidate set, picks the quantale-minimum non-rate-limited endpoint, fires the inference, witnesses the cost.
Rate-limit on the chosen endpoint mid-tick triggers a different choice next tick.

**What [M7](m7-boundary-handedness-and-outbound-endpoints.md) does NOT claim**: Per [`llm-swarms-fail-classical-conditions`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md) and [`swarm-vs-orchestration-dichotomy`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md), PyFARS's swarm is **orchestrated**, not classical-swarm-coordinated.
M7 does not claim the cost-decoupling property of stigmergy, does not claim convergence guarantees from classical swarm theorems, does not claim $O(N)$-scaling.
What it claims is *the substrate algebra reaches across the boundary without losing its discipline*.

---

### M8 — Inbound Participation: MCP/A2A Clients as Swarm Participants

**Status**: Open.
Closes the FARS [`mcp-client-as-swarm-participant`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md) open question.

**Delivers**: External agents (cloud-hosted Claude, ChatGPT plugins, A2A-protocol agents) can call PyFARS's exposed endpoints, authenticate, and operate on the substrate's workitems via dispatch — as **inbound-only swarm participants**.
After [M8](m8-inbound-participation-mcp-clients.md), the three swarm-participant classes the FARS theory identifies are all realized: bidirectional sovereign peers ([M6](m6-federation.md)), outbound-only endpoints ([M7](m7-boundary-handedness-and-outbound-endpoints.md)), inbound-only cloud agents (this milestone).

**Theory section**: FARS [`swarm-participation-handedness`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md); [`office-as-fuzzy-cell`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md).

**Items**: - [ ] Inbound-only boundary records at `governance/boundaries/<slug>.md` with `handedness: inbound-only`. - [ ] FastAPI MCP server sub-app exposes MCP-protocol-compatible endpoints (list-tools, call-tool, list-resources) backed by substrate workitems. - [ ] Cloud-agent admission via dispatch: an authenticated inbound call becomes a `(workitem, dispatchable=cloud-agent)` pair routed via the boundary's office. - [ ] Witness chain bifurcation: actor (the substrate-native admitting office, signing) and via (the cloud agent, named). - [ ] Office-bound admission policies: the boundary's office's [`jural-relations`](../../governance/jural-relations/_index.md) and [`jurisdiction`](../../governance/jurisdictions/) gate the scope of substrate access.

**Done when**: A captain authors `governance/boundaries/mcp-public.md`.
An MCP server starts at `quiescent.
561.group/mcp/...
`.
A cloud-hosted Claude calls `list-tools`; the response enumerates the dispatchable workitems the boundary's office is authorized to expose.
A subsequent `call-tool` produces a substrate-bound result with a witness chain naming both the office (actor) and the cloud agent (via).

---

## Dependency Diagram

```
ENGINE ARC (substrate + boundaries + supervision):
M1 (Operational Housekeeping, in flight)
    └── M2 (Substrate-Driven Dispatch, open — assignment-cell write-back + default-lex rule)
            └── M3 (Continuous Loop)
                    └── M4 (Memory & Session Feedback)
                            └── M5 (Agential Self-Generation)
                                    │
                                    ├── M6 (Federation — content-federation)
                                    │       ├── M6' (Coordination-Federation)        ← added 2026-05-08
                                    │       └── M7 (Outbound Endpoints)
                                    │               └── M8 (Inbound MCP/A2A)
                                    │                       └── M13 (Predicated-Drone-Swarm Theory)  ← added 2026-05-08
                                    │                               └── M9 (Substrate-Precheck for High-Stakes Operations)
                                    │                                       └── M10 (Cost-and-Energy Ledger Extension)
                                    │                                               └── M11 (Assurance Audit Chain Export)
                                    │                                                       └── M12 (Cross-Substrate Handoff Protocol)
                                    │
                                    └── APPLICATION ARC (absorbed from pypredcomp v0.x; added 2026-05-09):
                                            M14 (Application Development Surface — SDK)
                                                ├── M15 (Bundled Userland — daily-driver basics: email, calendar, ledger…)
                                                │       └── M17 (561 Productivity Stack — tasks/knowledge/governance/dispatch/fleet/review)
                                                ├── M16 (Industrial Control Surface — MQTT/Modbus drivers)   ← also depends on M7
                                                │       └── (M9 + M10 compose for safety-critical actuation)
                                                └── M17 (561 Productivity Stack — also depends on M5)
                                                        └── M18 (Publishing & Continuous Learning)   ← also depends on M4
                                                                        └── M19 (Self-Developing PyFARS — capstone)
                                                                                ├── M20 (Algebraic Learning Calculus)   ← also depends on M4
                                                                                └── M21 (Token Economy)   ← also depends on M10, M17
                                                                                        └── M22 (Semioverse Navigation)   ← also depends on M8, M14
                                                                                                └── M23 (Voidskiff — paradigm application)   ← also depends on M15, M19, M21
                                                                                                │
                                                                                                └── DEEP-SPECULATIVE ARC (lifted from engineering archive, cycle-7/8):
                                                                                                        M25 (Stratified Substrate Architecture)   ← also depends on M5
                                                                                                            ├── M24 (Predication-Native Simulation)   ← also depends on M23
                                                                                                            │       └── M28 (Temporal Settlement Dynamics)
                                                                                                            │               └── M29 (Relational Hyperverse/Modal Collapse)
                                                                                                            │                       └── M30 (World Resilience/Ontological Quartet)
                                                                                                            ├── M26 (Zork and Rogue Algebra Proof)   ← feeds M24
                                                                                                            └── M27 (Voidfleet Academy)   ← also depends on M20
```

**Three-arc shape**: After M5 (agential self-generation) the work splits into two initially parallel arcs, with a third speculative arc extending beyond the self-developing capstone. - The **engine arc** extends substrate machinery to non-peer participants (M6/M7/M8), high-stakes operations (M9), embodied deployment (M9–M12), and the boundary-precondition theory (M13). - The **application arc** turns substrate-writability into a platform-grade SDK (M14), ships daily-driver apps (M15), industrial-control drivers (M16), the polity productivity stack (M17), the publishing/learning loop closure (M18), and the self-developing capstone (M19). - The **speculative arc** (M20–M23) extends beyond M19 into full learning theory (M20), economic algebra (M21), substrate-as-traversable-world navigation (M22), and the paradigm application (M23 Voidskiff).
These milestones are `horizon: speculative` — they are authored and planned but depend on the self-developing capstone completing first. - The **deep-speculative arc** (M24–M30) extends beyond M23 into the substrate's algebraic foundations applied to simulation, training, and the theoretical endgame: three-stratum substrate architecture (M25), predication-native simulation (M24), Zork/Rogue as algebra proof (M26), Voidfleet Academy nuclear quartet certification (M27), temporal settlement dynamics (M28), relational hyperverse and modal collapse (M29), and world resilience with the ontological quartet (M30). - The engine and application arcs share the M5 foundation and converge at M9 + M10 (where industrial-control actuation must compose with substrate-precheck and cost-and-energy ledger).
The speculative arc branches off after M19.

The arc is mostly linear: each numbered milestone is a prerequisite for the next. **M6'** (coordination-federation) is a successor to M6 and parallel to M7 — neither blocks the other; both are M6-successors. **M13** (predicated-drone-swarm theory authoring) is a theory-precondition for M9 advancing — without it, M9–M12 rest on survey texts rather than on predicated theory, which the question [`predicated-drone-swarm-theory-as-theory-gap`](../../questions/predicated-drone-swarm-theory-as-theory-gap.md) identifies as a gap.
M13 is theory work, not engineering work; it sits between M8 and M9 in the timeline but in a distinct work-stream.

Each milestone is a prerequisite for the next.
The substrate must be clean before dispatch can be substrate-driven; dispatch must be substrate-driven before the loop is trustworthy; the loop must be trustworthy before memory feedback can be verified; memory feedback must be verified before self-generation is safe; self-generation and federation must both work before extending swarm participation across the boundary; outbound participation lays the handedness framework that inbound participation extends; predicated theory must precede embodied-deployment milestones; substrate-precheck mathematics must precede the layered-control handoff.

## Theoretical arc: which charter commitments each milestone closes

The five hard-core commitments (charter C1–C5) are closed across the milestone arc.
Each milestone's "Theoretical shape" section names the specific theorems/concepts it realizes; the table below summarizes the cross-milestone shape so cross-milestone planning has a unified frame.

| Milestone | Charter commitment(s) closed | Key theorems / concepts realized |
|---|---|---|
| **M1** Operational housekeeping | foundation for C1 (predication substrate) | substrate-purity at the on-disk layer; projector framework's counit law over arbitrary file formats |
| **M2** Substrate-driven dispatch | **C1** (predication substrate) end-to-end; **C2** (first-class provenance) in dispatch | dispatch-as-closure-rule-system, dispatch-monotonicity in $\leq_k$, strict-regime termination; per-firing `RuleFiring` provenance + deterministic `rsv_hash` |
| **M3** Continuous autonomous loop | **C5** (practical reasoning as operator schedule) | regime-of-recurrent-practice; anomaly-as-contradiction made operational; event-sourcing replay correctness as regression test |
| **M4** Memory and session feedback | extends **C2** to operational memory; foundation for **C3** | three-tier-memory; consolidation-as-settlement; session-as-entity |
| **M5** Agential self-generation | **C3** (agential self-generation) | four-layer-rule-architecture; office-as-fuzzy-cell with bilattice-valued authority; closure-driven coordination |
| **M6** Federation | **C4** (federation by value-domain join) | closure-merge commutation lemma ($\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$); multi-agent-work-as-CRDT; sovereign-node + content-hash-addressing |
| **M7** Outbound endpoints | extends C1 to non-peer participants | boundary handedness as fiber coordinate; LLMEndpointRecord; monetary cost as Lawvere-quantale extension |
| **M8** Inbound MCP/A2A | completes the swarm-participation-handedness framework | witness-chain bifurcation (actor vs. via); office-bound admission; office-as-fuzzy-cell extended to inbound |

**Reading the arc:** M2 closes the substrate-as-dispatch-policy commitment (C1, C2 in narrow sense).
M3 makes the dispatch loop a *recurrent practice* rather than a one-shot run (C5).
M4 wires memory feedback so the loop *learns* (extends C2 into operational memory).
M5 makes the system's own operative machinery substrate-writable so agents can extend the system (C3).
M6 lets sovereign engines *converge* on shared substrate state (C4).
[M7](m7-boundary-handedness-and-outbound-endpoints.md) extends substrate dispatch beyond peer nodes to outbound external endpoints (cost-discipline operationalized).
[M8](m8-inbound-participation-mcp-clients.md) extends to inbound external agents (the cloud-Claude case, Android MCP clients).
Together M7 + M8 close the **swarm-participation-handedness framework** the FARS open questions named: bidirectional peers, outbound endpoints, inbound clients — three classes, one boundary algebra.

Each milestone is a separate theorem-realization; M1–M6 close the five charter commitments that constitute "fully predicated agentic computing" per the [predicated-agentic-computing narrative](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/predicated-agentic-computing.md).
M7–M8 extend the participation surface without altering the charter; they realize axes the charter implies but doesn't pin down.

---

## Embodied-deployment arc — M9–M12 (authored; implementation contingent on deployment context)

The following milestones extend the substrate's coverage to **embodied participants** — drones, robots, sensor swarms — operating under a layered control architecture below the substrate.
Each milestone is authored as a substrate record at `work/milestones/m9-...
`–`m12-...
`.
Per [`swarm-vs-orchestration-dichotomy`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md), PyFARS is on the orchestrated side; classical-swarm convergence guarantees do not apply.
PyFARS sits *above* a layered control architecture (graph Laplacian dynamics, ADMM-style distributed optimization, MARL-trained policies) that does the actual physical control.
M9+ codifies how PyFARS-the-substrate interacts with that lower layer.

The **substrate-side machinery is research-actionable today**; the **deployment-side machinery is contingent** on the lower control layer existing in a target deployment context.
A polity could begin M9-related substrate work immediately (authoring boundaries, norms, rule records) against simulated control-layer responses; a captain ready to deploy real drones would hand off to the chosen control framework when ready.

### [M9 — Substrate as Supervisor of Layered Control Architecture](m9-substrate-as-supervisor-of-layered-control.md)

PyFARS workitems include pre-checks against external safety-shield frameworks (Hamilton-Jacobi reachability, Control Barrier Functions).
A workitem is admitted *only if* its parameters fall within a verified safe envelope; the verification result is a substrate cell other rules can read.
This is the substrate's contribution to the three-tiered stack: not the control layer itself, but the **governed admission of every action that reaches the control layer**.

Five goals: safety-shield-verification-as-substrate-precheck; control-barrier-function records bind dispatch; Hamilton-Jacobi-reachability records as admission gate; verified-safe-envelope cells readable by dispatch; control-layer feedback as execution-event class.

### [M10 — Cost and Energy Ledger Extension to Embodied Operation](m10-cost-and-energy-ledger-extension.md)

The cost-quantale extends from `(fuel, dollars, tokens-against-budget)` ([M7](m7-boundary-handedness-and-outbound-endpoints.md)) to `(fuel, dollars, tokens, joules-against-battery, bandwidth-bytes-against-window)` for embodied participants.
Dispatch reads energy and bandwidth budgets like it reads dollar budgets.
The cost-discipline becomes multi-dimensional and physical-constraint-aware.
This closes the [strategic-deployment-roadmap](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md)'s "Energy and Endurance Benchmarking" axis.

Five goals: cost-quantale extends to energy and bandwidth dimensions; battery-budget records; radio-bandwidth-budget records; dispatch reads physical budgets like dollar budgets; physical-cost witnesses on embodied-action dispatch.

### [M11 — Assurance Audit Chain Export](m11-assurance-audit-chain-export.md)

The substrate's witness chain becomes exportable as a *certification artifact*.
The export targets specific frameworks: NIST CSF 2.0, FAA BVLOS demonstration packages, DoD 3000.09 audit reports.
Exporters are projector-framework projectors per counit law — substrate cells project to artifact format and back, satisfying replay-determinism.

Five goals: certification-artifact projector framework; NIST-CSF-2 mapping projector; FAA-BVLOS demonstration package projector; DoD-3000-09 audit package projector; export-format counit-law verified.

### [M12 — Cross-Substrate Handoff Protocol to Physical Control Layer](m12-cross-substrate-handoff-protocol.md)

A "dispatch to a drone" is *not* a flight command; it is an authorization to initiate.
The physical control layer (graph Laplacian, ADMM, MARL policy) operates below.
M12 codifies the handoff: what the substrate sends (an authorization with verified safe envelope), what the control layer guarantees (forward-invariance under GCBF+, byzantine-resilient consensus), how rejections from the control layer become substrate witnesses.

This is also where ["Meaningful Human Control"](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md) becomes a [substrate norm](../../governance/norms/_index.md): dispatch decisions affecting embodied participants pass through a captain's human-witnessed authorization gate.

Five goals: control-layer-handoff as substrate norm; meaningful-human-control as charter-C3-extension norm; control-layer-rejection projector; safe-envelope precondition cell required on embodied dispatch; byzantine-resilient-consensus witness projector.

### Arc-level discipline

M9–M12 are **not** "PyFARS implements drone control".
They are "PyFARS is the substrate-and-governance layer above whatever control architecture the deployment requires."
The captain's commitment to predicated agentic computing extends; what changes is the participant population, not the substrate's algebra.

The honest framing per [`llm-swarms-fail-classical-conditions`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md): for LLM-agent collectives, classical swarm convergence guarantees do not apply.
PyFARS is small (saturation around four agents), orchestrated, expensive, with no convergence guarantees.
M9–M12 inherit this honesty — they describe how the substrate orchestrates a higher-stakes deployment, not how it makes the deployment cheaper or simpler.

---

## Roadmap-extension arc — milestones authored by the [roadmap-enrichment](../../concepts/roadmap-enrichment.md) extension pass

The following milestones were authored by enrichment cycles' extension passes — they did not appear in the original M1–M12 charter but became authorable as the cycle's promotion work matured.

### [M6' — Coordination-Federation Layer](m6prime-coordination-federation.md)

Authored 2026-05-08 (cycle-4 enrichment).
Made authorable by M6's rescope to content-federation-only, which made the *coordination-federation* fiber a separate-shaped work item.
Adds substrate-resident leader-records, quorum-records, distributed-lock-records, cluster-records, and an $H^1$-classification audit closure rule above M6's cellwise-merge algebra.

Five goals: leader-records as substrate-driven tournament; quorum-records for multi-witness decisions; distributed-lock-records as residuated authority gates; cluster-records as replica cover; failure-detection as bilattice-modal suspicion; coordination-cohomologically-bounded-by-$H^1$ audit.

### Application arc (M14 → M19) — absorbed from pypredcomp v0.x on 2026-05-09

Authored as full milestone-records.
After [M5](m5-agential-self-generation.md) makes substrate-writability available, the application arc turns substrate-writability into a platform: SDK, bundled userland, ICS drivers, polity productivity stack, publishing/learning closure, self-developing capstone.

- [**M14** — Application Development Surface](m14-application-development-surface.md).
  Capability API, package format, signing, install flow, fuel-budgeted isolation.
  Sourced from [pypredcomp v0.6](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.6-application-development.md).
- [**M15** — Bundled Userland](m15-bundled-userland.md).
  Calculator, calendar-client, chat-client, email-client, file-browser, **ledger-tool** (the ERP-shaped foundational financial layer), terminal, text-editor.
  Sourced from [pypredcomp v0.3](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.3-bundled-userland.md).
- [**M16** — Industrial Control Surface (ICS)](m16-industrial-control.md).
  MQTT and Modbus drivers; sensor data as substrate cells; bilattice handles partial / contradictory / stale natively; closure rules trigger actuation.
  First physical binding: soil moisture + pump controller.
  Sourced from [pypredcomp v0.5](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.5-industrial-control.md). **Composes with M9 + M10 for safety-critical actuation.**
- [**M17** — 561 Productivity Stack](m17-561-productivity-stack.md).
  Tasks app, **knowledge app (the CMS-shaped surface)**, governance app, dispatch app, fleet app, review app. Captain migrates from Asana/Todoist/Linear/Obsidian.
  Sourced from [pypredcomp v0.7](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.7-561-productivity-stack.md).
- [**M18** — Publishing & Continuous Learning](m18-publishing-and-learning.md).
  Observation → instinct → skill → tool → hook promotion pipeline (each rung captain-reviewed via M17's governance-app); Hugo-style publishing from substrate fibers; persona-agents have publication channels with subscription/feed support.
  Sourced from [pypredcomp v0.9](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.9-publishing-and-learning.md).
- [**M19** — Self-Developing PyFARS](m19-self-developing-pyfars.md).
  Agents inside PyFARS read PyFARS's own source cells, propose modifications, run conformance vectors, submit changes through the governance app for captain review.
  Capstone.
  Sourced from [pypredcomp v1.0](../../../../tools/platform/pypredcomp/docs/dev/milestones/v1.0-self-hosting.md).

### Speculative-applications arc (M20–M23) — lifted from engineering archive 2026-05-09

Authored as full milestone-records.
After [M19](m19-self-developing-pyfars.md) closes the self-development loop, the speculative-applications arc extends PyFARS into paradigm domains: full learning theory, economic algebra, world navigation, and the capstone paradigm application.

- [**M20** — Algebraic Learning Calculus](m20-algebraic-learning-calculus.md).
  Replaces float-confidence instinct scoring with shadow-class barcodes (four-dimensional settlement measure toward H*_t); Padovan-paced formality promotion gates (F5.3 settled+partnered, not observation count); between-session `respond(self, self)` dreams consolidation; abduction as composition gap.
  Sourced from [`engineering-archive/operations/command/ideas/triage/algebraic-learning-calculus.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/algebraic-learning-calculus.md).
- [**M21** — Substrate-Native Token Economy](m21-substrate-native-token-economy.md).
  Operationalizes the convergence: messaging = accounting = gamification = token economics = NFT certification = DAO governance — six domains, one algebra.
  Agent bank accounts, capability inventories, reputation staking with slash conditions, inter-agent capability markets, content-addressed achievement cells.
  Sourced from [`engineering-archive/operations/command/ideas/triage/token-economy-from-predication.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/token-economy-from-predication.md) and [`double-entry-operational-accounting.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/double-entry-operational-accounting.md).
- [**M22** — Semioverse Navigation](m22-semioverse-navigation.md).
  The substrate is a MUD — technically exact.
  `look`/`go`/`find` navigation tools over the predication graph; persona records with location state; role-bounded capability sets; closure-participation witnesses per write; world-consistency-metric in the web UI.
  Also ships the **transcript-watcher office** (async session-transcript → action-item capture) and the **bridge-companion agent** (Jadepol — session-long Haiku-tier anomaly surfacer).
  Sourced from [`engineering-archive/library/triage/from-tech-bucket-2/slop/2026-03-12/big-picture-imagining.md`](../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/slop/2026-03-12/big-picture-imagining.md), [`engineering-archive/ideas/transcript-watcher-office.md`](../../../../work/triage/engineering-archive/ideas/transcript-watcher-office.md), and [`engineering-archive/operations/command/ideas/triage/companion-instead-of-buddy.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/companion-instead-of-buddy.md).
- [**M23** — Voidskiff (Paradigm Application)](m23-voidskiff-paradigm-application.md).
  A multiplayer terminal space-game where the predication substrate IS the game world.
  The Karst (~120 systems, seven lineages); claim-injection combat; spore-respawn with Padovan-ticked persistence; morphism teaching via anastomosis; world clock following the plastic number.
  The paradigm application: every PyFARS commitment exercised simultaneously.
  Sourced from [`engineering-archive/operations/command/ideas/triage/voidskiff-multiplayer-terminal-game.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/voidskiff-multiplayer-terminal-game.md).

### Deep-speculative arc (M24–M30) — lifted from engineering archive 2026-05-09

Authored as full milestone-records after a per-file survey of the engineering archive's speculative material.
These extend the substrate algebra into simulation, training, temporal structure, and the relational hyperverse endgame.

- [**M25** — Stratified Substrate Architecture](m25-stratified-substrate-architecture.md).
  Three-stratum predication fiber A^♭_p (asserted/saturated/settled); separate rule-saturation pass (cl^S) and bilattice-stabilization pass (N_Δ = T_a^*); event log as stratified fiber history; MCP surface applies default projection π₂ to stratum-2 atoms only; stratum-aware dispatch and federation.
  Sourced from [`engineering-archive/operations/command/ideas/triage/dont-flatten-the-tower.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/dont-flatten-the-tower.md).
- [**M24** — Predication-Native Simulation](m24-predication-native-simulation.md).
  All simulated entities are predication fibers with no privileged entity types; settlement-distance-to-H*_t as entity wellbeing; content generation via outer-alternation cascade; predication fiber composition as the universal interaction; bilattice structural quality control (⊥ = honest unknowing, ⊤ = surfaced contradiction); non-player entities tick via the settling endofunctor F_U.
  Sourced from [`predication-native-simulation.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-native-simulation.md) and [`predication-world-sim.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-world-sim.md).
- [**M26** — Zork and Rogue Algebra Proof](m26-zork-and-rogue-algebra-proof.md).
  Minimal Zork (text adventure) and Rogue (dungeon crawl) running entirely through the PyFARS substrate API — no game engine code outside the runtime.
  Proves the algebra handles: spatial navigation (predicate-category morphisms), state machines (Belnap-Fitting FOUR values), inventory (containment cells with fold catamorphism), combat (fiber composition via cl^S firings), procedural generation (outer-alternation cascade), turn sequencing (settling endofunctor pass).
  Sourced from [`zork-and-rogue-on-fars.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/zork-and-rogue-on-fars.md).
- [**M27** — Voidfleet Academy](m27-voidfleet-academy.md).
  Formal officer training and certification system grounded in the nuclear quartet: unbound → Fix(cl^S) = clerk → Fix(N_Δ) = first officer → H*_t = captain.
  Certification is a stratum-2 atom with full provenance.
  Emergency succession is recomposition from persisting cl^S + N_Δ factors.
  ECC learning loop feeds curriculum.
  Sourced from [`voidfleet-academy.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/voidfleet-academy.md), [`captain-as-nuclear-witness.md`](../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/captain-as-nuclear-witness.md), and [`first-officer-as-transfer-nucleus.md`](../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/first-officer-as-transfer-nucleus.md).
- [**M28** — Temporal Settlement Dynamics](m28-temporal-settlement-dynamics.md).
  Temporal defect τ = cl^S-gap minus N_Δ-gap as entity arrow of time; shadow-type classification (SatShadow/TrShadow/FreeShadow/H*_t) as stratum-2 cells; spectral complexity as entity resistance to settlement; Padovan→Fibonacci arithmetic transition as settlement fraction metric.
  Sourced from [`predication-native-simulation.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-native-simulation.md).
- [**M29** — Relational Hyperverse and Modal Collapse](m29-relational-hyperverse-modal-collapse.md).
  The Wood Between Worlds structural identification: relational hyperverse H = colimit of all worlds' H*_t; yellow ring = stabilization projection π₂ (save); green ring = world-specific re-expansion (load); modal collapse (cl^S = N_Δ = id) as endgame; player perception as S4 logic approaching S5 at settlement.
  Sourced from [`predication-world-sim.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-world-sim.md).
- [**M30** — World Resilience and Ontological Quartet](m30-world-resilience-ontological-quartet.md).
  Sheaf erasure code: world data self-corrects via covering families; world resilience = count of covering families.
  Every entity as four simultaneous aspects: data/language/space/process (Baez-Stay Rosetta Stone).
  QUARTERMASTER: player designs entity-fiber loadout before entering world.
  Stabilization-envelope dyad [Env_t(a), π_t(a)] visible in world UI.
  Nuclear depth uncertainty as gameplay mechanic (cl^S-depth vs N_Δ-depth tradeoff).
  Sourced from [`predication-world-sim.md`](../../../../work/triage/engineering-archive/operations/command/ideas/triage/predication-world-sim.md).

### Engineering archive — earlier conceptual prior art (partially lifted; ongoing triage)

[`work/triage/engineering-archive/`](../../../../work/triage/engineering-archive/) (in the 561 superrepo) contains earlier prior art at conceptual-tier — less detailed than pypredcomp v0.x but going further in some directions.

**Items lifted into milestones (cycles 6–8):** algebraic-learning-calculus → M20; token-economy-from-predication + double-entry-operational-accounting → M21; big-picture-imagining + transcript-watcher-office + companion-instead-of-buddy → M22; voidskiff-multiplayer-terminal-game → M23; dont-flatten-the-tower → M25; predication-native-simulation + predication-world-sim → M24, M28, M29, M30; zork-and-rogue-on-fars → M26; voidfleet-academy + captain-as-nuclear-witness + first-officer-as-transfer-nucleus → M27.

**Items not yet folded (ongoing triage):** - [`engineering-archive/library/triage/from-tech-bucket-2/`](../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/) — 80+ concept files including `application.md`, `service.md`, `expert-system.md`, `distributed-agential-relations-system.md`, `relations-system.md`.
These are general-machine-class definitions PyFARS realizes; per CLAUDE.md they require per-file reading before lifting. - `mash/` content (vocabulary/ports/agents/sessions/wire-protocol) — overlaps M5 + M14 + M2 patterns; the mash project is a Rust engine for the same general substrate-tooling shape PyFARS realizes in Python. - `engineering-archive/operations/command/ideas/triage/beyond-language-models-for-agent-computation.md` — formality-grade determines compute shape (F3→script, F2→classifier, F1→LLM); plausibly a M19 extension or a M24 sketch.

These are **enrichment-cycle inputs**.
Per CLAUDE.md "Read each file before moving it out of `triage/`", absorbing them is per-file work — possibly multi-cycle.

### M13 — Predicated-Drone-Swarm Theory (sketch)

Authored 2026-05-08 (cycle-4 enrichment, sketch only).
Made authorable by the question-cluster maturity around drone-swarm theory ([`predicated-drone-swarm-theory-as-theory-gap`](../../questions/predicated-drone-swarm-theory-as-theory-gap.md), [`formation-control-rigidity-as-substrate-shape-invariant`](../../questions/formation-control-rigidity-as-substrate-shape-invariant.md), [`hj-reachability-and-cbf-as-substrate-precheck-primitive`](../../questions/hj-reachability-and-cbf-as-substrate-precheck-primitive.md), [`ctde-as-substrate-snapshot-training-pattern`](../../questions/ctde-as-substrate-snapshot-training-pattern.md), [`federated-learning-model-deltas-vs-raw-data-for-federation`](../../questions/federated-learning-model-deltas-vs-raw-data-for-federation.md)).
The cluster's combined framing argues M9–M12 should rest on a *predicated-drone-swarm theory*, not on the survey-text foundation they currently have.

This is **theory work**, not engineering.
It would author the predicated-drone-swarm theory in [`theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/) — distinct from the engineering arc.
The records officer authors this as a sketch (not a milestone-record) because *the theory work belongs to the theory-officer office, not the records officer*; the captain or theory-officer should advance it from sketch to milestone-record when the theory has been read sufficiently.

Sketch goals (preliminary, captain-revisable): formal predicated-drone-swarm objects (drone, swarm, formation, mission); predicated formation-control via rigidity-theory; predicated safety-shield via HJ/CBF substrate-precheck; predicated multi-agent learning via CTDE; predicated bandwidth-discipline via federated-learning model-deltas; substrate boundaries between predicated and unpredicated layers.

**Position**: between M8 (inbound MCP/A2A) and M9 (substrate-precheck) as a theory-prerequisite work-stream parallel to the engineering arc.
M9 may need to wait on M13 reaching `later` before it itself advances toward `later`.

### Extension log

This section grows as enrichment cycles' extension passes add new milestones.
Each entry: cycle date, what was extended, what made it authorable.

| Cycle date | Extensions added | Made authorable by |
|---|---|---|
| 2026-05-08 (cycle-4) | M6' (full milestone-record), M13 (sketch) | M6 rescope to content-federation-only; question-cluster maturity around drone-swarm theory |
| 2026-05-09 (cycle-5) | M14, M15, M16, M17, M18, M19 (full milestone-records) | Captain identified a gap: prior PyFARS roadmap was engine-only and missed application-layer prior art in pypredcomp v0.x and elsewhere. Cycle-5 absorbed pypredcomp's v0.3/v0.5/v0.6/v0.7/v0.9/v1.0 into PyFARS as M15/M16/M14/M17/M18/M19. Engineering-archive prior art (transcript-watcher-office idea, mash content, library/triage concept fragments) is conceptually-tier and queued for ongoing triage rather than absorbed wholesale this cycle. |
| 2026-05-09 (cycle-6) | M20 (Algebraic Learning Calculus), M21 (Token Economy), M22 (Semioverse Navigation), M23 (Voidskiff — Paradigm Application) — full milestone-records | Engineering-archive speculation survey read per-file and four speculative/fun/far-future items lifted into full milestones: algebraic learning calculus (shadow-class barcodes + Padovan formality), substrate-native token economy (six-domain algebra convergence), semioverse navigation (substrate-as-traversable-world + transcript-watcher + bridge-companion), Voidskiff (the paradigm application). beyond-language-models item left in triage pending M19 dependency analysis. |
| 2026-05-09 (cycle-7) | M24 (Predication-Native Simulation), M25 (Stratified Substrate Architecture), M26 (Zork and Rogue Algebra Proof), M27 (Voidfleet Academy) — full milestone-records; M24 and M25 corrected from prior drafts | Second archive survey round with theory-vocabulary discipline: (a) M24 and M25 revised from prior drafts to remove invented L3 stratum and replace bare σ/Δ prose with correct operator names (rule-saturation closure cl^S via closure 2-monad Cl; bilattice stabilization nucleus N_Δ = T_a^*; three-stratum A^♭_p not four); (b) M26 authored from scratch with correct vocabulary; (c) M27 authored grounding nuclear quartet in actual fixed-point characterizations Fix(cl^S)/Fix(N_Δ)/H*_t. |
| 2026-05-09 (cycle-8) | M28 (Temporal Settlement Dynamics), M29 (Relational Hyperverse/Modal Collapse), M30 (World Resilience/Ontological Quartet) — full milestone-records | Background agent survey batch 2 yielded: temporal defect decomposition (τ = cl^S-gap minus N_Δ-gap as arrow of time); Wood Between Worlds structural identification as relational hyperverse colimit; Padovan→Fibonacci arithmetic transition; spectral complexity; yellow/green ring save/load architecture; S4→S5 modal logic arc; sheaf erasure code world resilience; QUARTERMASTER fiber loadout; ontological quartet (entity as four simultaneous aspects); stabilization-envelope dyad; nuclear depth uncertainty mechanic. All authored with correct three-stratum vocabulary and proper theory citations. |

---

## Related Documents

- [v0.1 Current State](v0.1-current-state.md) — baseline snapshot
- [FARS Theory Index](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) — the normative spec this roadmap implements
- [AgOP Theory Index](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/_index.md) — the parent theory
- [Predicated Agentic Computing Narrative](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/predicated-agentic-computing.md) — the five commitments
- [Charter](../../governance/charter.md) — captain's development commitments
- [PyFARS Overview](../../docs/PyFARS_Overview.md) — technical architecture
- [Wiring Protocols](../../governance/specifications/wiring-protocols.md) — protocol-per-wiring discipline
