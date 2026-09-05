---
title: "M7 — Boundary Handedness and Outbound Endpoint Participation"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m6-federation]
goals:
  - boundary-records-with-handedness-coordinate
  - llm-endpoint-record-fully-spec-conformant
  - cost-discipline-as-substrate-cells
  - dispatch-chooses-endpoint-by-cost-quantale
  - rate-limit-observations-ground-availability-cells
theory-basis: [swarm, swarm-participation-handedness, llm-endpoint-record, cost-discipline, monetary-cost-as-quantale-extension]
cites-objects:
  - pyfars/objects/eligibility-by-rate-limit.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/budget-record.md
  - pyfars/objects/observation-cell.md
  - pyfars/objects/anomaly-witness.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/observing.md
cites-claims:
  - pyfars/claims/dispatch-derives-from-governance.md
backing-gaps:
  - pyfars/objects/boundary-record.md (NOT YET AUTHORED — typed boundary with handedness coordinate; load-bearing for M7+M8)
  - pyfars/objects/llm-endpoint-record.md (NOT YET AUTHORED — pyfars realization of upstream LLMEndpointRecord; spec-conformant goal)
  - pyfars/objects/cost-cell.md (NOT YET AUTHORED — product-Lawvere-quantale-valued cost realization)
  - pyfars/morphisms/composing-cost.md (NOT YET AUTHORED — the cost-quantale-min selection composition)
  - pyfars/claims/cost-quantale-product-is-Lawvere.md (NOT YET AUTHORED — verifies the product structure satisfies Lawvere quantale axioms)
acceptance: "An [LLMEndpointRecord](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) at `governance/endpoints/<provider>--<model>.md` is dispatchable: the dispatch graph routes inference work to the cheapest available endpoint by composed-cost-quantale, the rate-limit observations ground availability cells, and every call emits a cost-witness denominated in the product quantale (settlement fuel × dollars × tokens-against-budget)."
---


After [M6 — Federation](m6-federation.md) closes confederation-of-peers, M7 extends the substrate's *swarm-participant* surface beyond fellow sovereign nodes.
The first non-peer participant class — **outbound-only endpoints** like Nvidia cloud, OpenRouter, Cerebras, Groq — becomes substrate-readable: their identity, cost, capability, and rate-limit availability are first-class predications; dispatch routes outbound work to them by composed-cost-quantale-min; cost is witnessed.

The framework that admits this class is **boundary handedness** — making the boundary fiber's directional asymmetry an explicit coordinate so subsequent participant classes (the inbound-only class lands in [M8 — Inbound Participation: MCP/A2A Clients](m8-inbound-participation-mcp-clients.md)) compose into the same algebra.

## What this milestone does NOT claim

Per [LLM swarms fail classical conditions](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md) and [swarm-vs-orchestration dichotomy](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md): a heterogeneous LLM-agent collective like PyFARS's swarm is **not** a classical swarm-coordinated system.
M7 does not claim the cost-decoupling property of stigmergy, does not claim convergence guarantees from classical swarm theorems, does not claim $O(N)$-scaling.

What M7 *does* claim: **the substrate algebra reaches across the boundary to outbound endpoints** without the algebra losing any of its discipline.
Dispatch's eligibility filter, capability match, and cost comparison see endpoints as ordinary swarm participants; the only specialization is that the settle-action is an HTTPS call rather than an in-process invocation.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| [`boundary-records-with-handedness-coordinate`](../goals/boundary-records-with-handedness-coordinate.md) | Boundary records carry an explicit handedness coordinate (`bidirectional` / `inbound-only` / `outbound-only`); the boundary fiber's composition is updated to accept it | open |
| [`llm-endpoint-record-fully-spec-conformant`](../goals/llm-endpoint-record-fully-spec-conformant.md) | Endpoint records at `governance/endpoints/<provider>--<model>.md` carry the full LLMEndpointRecord spec (identity, handedness, capability, cost, availability, provenance, invariants) | open |
| [`cost-discipline-as-substrate-cells`](../goals/cost-discipline-as-substrate-cells.md) | The cost-discipline's product Lawvere quantale (settlement fuel × dollars × tokens-against-budget) is realized as substrate cells; cost-composition by addition; cost-choice by quantale-min | open |
| [`dispatch-chooses-endpoint-by-cost-quantale`](../goals/dispatch-chooses-endpoint-by-cost-quantale.md) | The dispatch graph's selection step composes cost cells across endpoint candidates and chooses the quantale-minimum; lex-tiebreak survives only at quantale-equality | open |
| [`rate-limit-observations-ground-availability-cells`](../goals/rate-limit-observations-ground-availability-cells.md) | Rate-limit-budget observations (per [observation](../observations/_index.md) record) ground availability predications on each endpoint; an endpoint at `requests-used = rate-limit-rpm` produces F on its availability axis | open |

## What lands together

- A new `governance/boundaries/` directory with handedness-coordinate records.
- A new `governance/endpoints/` directory with `LLMEndpointRecord` substrate notes (one per `(provider, model)` pair).
- The cost-discipline operationalized: substrate cells track cost in the product quantale; dispatch reads them.
- The rate-limit feedback loop ([M3](m3-continuous-loop.md)'s [`rate-limit-observations-close-loop`](../goals/rate-limit-observations-close-loop.md)) extends from per-endpoint flag-cells to per-endpoint *budget-tracking observations* with `observed-via` evidence-grading (`provider-header`, `self-counted`, `429-forced-zero`).
- Out-of-process LLM inference becomes first-class dispatch: the same algebra `office ⊙ task-requirement` that routes to in-process agents routes to outbound endpoints via the same `RuleFiring` provenance and `rsv_hash` discipline.

## Done when

A workitem of class `text-generation` arrives.
Three [LLMEndpointRecord](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) records exist (e.g., `cerebras--llama-3.3-70b`, `groq--llama-3.3-70b`, `nvidia--llama-3.3-70b`), each carrying capabilities, costs, rate-limits, and current availability observations.
Dispatch reads cost cells, composes them across the candidate set, picks the quantale-minimum non-rate-limited endpoint, fires the inference, witnesses the cost, projects the response back into substrate cells.

If the chosen endpoint becomes rate-limited mid-tick (a `429-forced-zero` observation is emitted), the next tick's dispatch composes that into the availability axis and selects a different endpoint.
Cost-ledger inspection at any tick boundary shows accurate spend per endpoint, denominated in the product quantale.

## Theoretical shape

M7 closes a non-charter axis the charter's [C1](../../governance/charter.md) (predication substrate) implies but doesn't pin down.
The five charter commitments are agnostic to *which* substrate participants exist; M7 makes one new participant class — outbound-only endpoints — fully algebraic-substrate-conformant.

**1.
Boundary handedness as fiber coordinate** ([`flatfile-agentic-resource-system/questions/swarm-participation-handedness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md)).
The boundary fiber composes from `identity + office + location + mode + scope-policy`; handedness is the open question.
M7 commits to the **third candidate reading from the question record**: handedness is a property of the boundary, not the actor — each boundary substrate-record carries a fixed handedness; an actor's role at that boundary is determined by which boundary they cross.
This is what lets the same dispatch algebra fire across in-process agents (no boundary), inbound boundaries ([M8](m8-inbound-participation-mcp-clients.md)), and outbound boundaries (this milestone).

**2.
LLMEndpointRecord as outbound-only AgentRecord specialization** ([`flatfile-agentic-resource-system/objects/llm-endpoint-record`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)).
The FARS object is fully specified; M7 realizes it.
Endpoints have **no signing key** (cannot sign witnesses; outputs admitted via the dispatcher's signature), are **outbound-only** (cannot initiate, cannot admit envelopes), and are **cost-witnessed** (every settle-action emits a cost cell).
These are invariants the realization must enforce.

**3.
Monetary cost as quantale extension** ([`flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension.md)).
The cost-discipline's Lawvere quantale at $[0, \infty]$ already exists for closure-iteration cost; M7 extends it to a *product* quantale (settlement fuel × dollars × tokens-against-budget).
The arithmetic is the same shape — addition for composition, min for choice — but the dimensions are independent: a free-tier endpoint at $0$ in the dollar dimension still consumes settlement fuel.

## Imminent vagueness — resolved by theory research

The cost-quantale arithmetic is named in the theory-basis but the actual composition/choice operators (and their tie-breaking discipline) need pinning.
Per the [`monetary-cost-as-quantale-extension`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/monetary-cost-as-quantale-extension.md) question's recommended reading (option 2): the cost quantale is a **product Lawvere quantale**, with **Pareto-min** (not scalar quantale-min) as the choice operator.

### The product quantale

For $n$ cost dimensions (settlement fuel, dollars, tokens-against-budget — and at M10 extension: joules-against-battery, bandwidth-bytes-against-window):

$$\mathcal{V} = \prod_{i=1}^{n} ([0, \infty], +, \min)$$

- **Composition** (along causal chains): component-wise addition. $(a_1, \ldots, a_n) \otimes (b_1, \ldots, b_n) = (a_1 + b_1, \ldots, a_n + b_n)$.
- **Choice** among alternatives: **Pareto-min** — the set of options not dominated component-wise.
  An endpoint $E$ Pareto-dominates $E'$ iff $E$'s cost is component-wise $\leq E'$'s cost AND strictly less on at least one component.
- **Identity** for composition: $(0, 0, \ldots, 0)$ — the zero-cost element of every dimension.

Per Lawvere's theorem on closed-monoidal structure of $[0, \infty]$: products of Lawvere quantales are themselves Lawvere quantales.
The cost-composition theorem extends mechanically; the substrate's existing closure-rule machinery handles the product structure as a fiber over the predication-fibration.

### Pareto-min vs scalar min — why Pareto

A scalar quantale-min (collapsing all dimensions into one number via fixed weights) was the alternative reading (option 1 in the cited question).
The product-quantale reading rejects it because:

> The exchange rate is arbitrary; settlement fuel measures closure-iteration work, dollars measure provider-billing-rate.
> Forcing them into one dimension is a calibration the substrate has no principled way to set, and any downstream decision that uses the unified value carries the calibration's arbitrariness.

Pareto-min preserves the structural fact that endpoints are *incomparable* on different cost axes.
A free-tier endpoint at high latency and a paid endpoint at low latency are both on the Pareto frontier — neither dominates the other; the dispatch surfaces both, and a substrate-resident closure rule (a charter-bound predication) breaks the tie based on the workitem's policy.

### Tie-breaking on the Pareto frontier

Multiple Pareto-optimal endpoints is the common case.
Tie-breaking is **closure-rule predications**, not a runtime hardcoded choice:

- A 561-charter rule prefers $\$0$ paths whenever they exist (free-tier first; the captain has named this as the working policy).
- A capability rule prefers higher-grade models when work-type requires precision (e.g., math reasoning prefers `qwen3-235b` over `llama-3.3-70b`).
- A latency rule prefers lower-latency endpoints for interactive work-types.

Each rule is substrate-content (a `governance/dispatch-policy/<rule-slug>.md` record), not a Python branch.
The dispatch is auditable per [`dispatch-as-closure-rule-system`](../../theorems/dispatch-as-closure-rule-system.md).
The closure produces the Pareto frontier; tie-breaker rules apply in declared priority order via named-shape instantiators in `kernel/closure.py`.

### Bridge to M3's budget gate

The cost-quantale residuation in M3's `budget-gated-dispatch` (per M3's "Imminent vagueness" section) operates *within* one dimension of the product quantale.
A budget cell on dimension $i$ uses the right residual $b_i \Rightarrow_\mathcal{V_i} c_i = \max(c_i - b_i, 0)$ on that dimension.
Multi-dimensional budget gating composes residuations across dimensions per the product-quantale structure; admission is pareto-non-violation across all gates.

### Federated cost-aware dispatch

Per [`rate-limiting-as-cost-quantale-residuated-authority-gate`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/rate-limiting-as-cost-quantale-residuated-authority-gate.md) + [federation-fuel-as-tensor-distributivity](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theorems/federation-fuel-as-tensor-distributivity.md): a request fanning out to $k$ federated peers consumes $\sum_i c_i$ from the principal's budget.
Once M6 federation lands, the cost-quantale composition automatically extends to federated dispatch — the Pareto frontier query already carries the federated cost via the cosheaf push.

**No new schema needed beyond the existing backing-gaps** — `cost-cell.md` and `composing-cost.md` are now structurally specified by the product Lawvere quantale and Pareto-min above.
The work is authoring those substrate records with the now-determinate algebra in place.

## Related

- [Roadmap](roadmap.md)
- [LLMEndpointRecord (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)
- [Routable LLM endpoint question (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/routable-llm-endpoint-as-swarm-participant.md)
- [Swarm-participation-handedness question (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md)
- [LLM swarms fail classical conditions theorem](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md) — what M7 does NOT claim
