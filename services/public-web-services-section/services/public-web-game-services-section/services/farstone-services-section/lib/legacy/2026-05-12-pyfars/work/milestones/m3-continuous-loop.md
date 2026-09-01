---
title: "M3 — Continuous Autonomous Loop"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: soon
depends-on: [m2-substrate-dispatch]
goals:
  - engine-runs-as-supervised-service
  - budget-gated-dispatch
  - rate-limit-observations-close-loop
  - anomaly-surfacing-via-contradiction-cells
  - replay-determinism-verified
  - on-complete-follow-on-intents
theory-basis: [operations-loop, recurrent-practice, dispatch-readiness, anomaly-as-contradiction]
cites-objects:
  - pyfars/objects/budget-record.md
  - pyfars/objects/anomaly-witness.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/causal-event-record.md
  - pyfars/objects/closure-state-hash.md
  - pyfars/objects/closure-rule-record.md
  - pyfars/objects/materialized-view-record.md
  - pyfars/objects/goal-cell-system.md
  - pyfars/objects/eligibility-by-rate-limit.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/work-queue.md
  - pyfars/objects/channels/guard.md
cites-morphisms:
  - pyfars/morphisms/supervising.md
  - pyfars/morphisms/queueing-follow-on.md
  - pyfars/morphisms/witnessing-completion.md
  - pyfars/morphisms/verifying-completion-quiescence.md
  - pyfars/morphisms/classifying-regime.md
  - pyfars/morphisms/refreshing-materialized-view.md
  - pyfars/morphisms/ticking.md
  - pyfars/morphisms/running.md
  - pyfars/morphisms/halting.md
  - pyfars/morphisms/observing.md
  - pyfars/morphisms/settling.md
cites-claims:
  - pyfars/claims/replay-determinism.md
  - pyfars/claims/regime-determines-scheduling-discipline.md
  - pyfars/claims/jsonl-is-canonical-state.md
  - pyfars/claims/substrate-purity.md
acceptance: "The engine has run for 24 hours on the server with no human intervention, processing at least one workitem per tick when workitems are present, and producing a replay-deterministic event log."
---


Reliable, unattended operation at tick cadence.
M2 left the dispatch graph correct in principle: closure-rule application is substrate-authorized, agent invocation works, witnesses are emitted with provenance and `rsv_hash`.
M3 makes the loop trustworthy enough to leave running on a server without supervision.

The engine already ticks.
What's missing is the closure of feedback loops, the supervisor wiring, and the failure-handling discipline that distinguishes "runs in dev" from "runs unattended in production."

## Goals

| Slug | One-liner | Status | Backed by |
|---|---|---|---|
| `engine-runs-as-supervised-service` | `pyfars run` runs as a systemd user-service that survives reboot and restarts on failure | open | [`supervising`](../../morphisms/supervising.md), [`running`](../../morphisms/running.md), [`halting`](../../morphisms/halting.md) |
| `budget-gated-dispatch` | A substrate-authored budget-record gates agent invocation per time window | open | [`budget-record`](../../objects/budget-record.md), [`dispatch-closure-rule-system`](../../objects/dispatch-closure-rule-system.md) |
| `rate-limit-observations-close-loop` | Rate-limit headers from agent responses are lifted into substrate cells the next tick reads | open | [`observing`](../../morphisms/observing.md), [`eligibility-by-rate-limit`](../../objects/eligibility-by-rate-limit.md) |
| `anomaly-surfacing-via-contradiction-cells` | `⊤`-valued cells (contradictions) produce anomaly witnesses and queue review workitems | open | [`anomaly-witness`](../../objects/anomaly-witness.md), [`guard` channel](../../objects/channels/guard.md), [`settling`](../../morphisms/settling.md) |
| `replay-determinism-verified` | A replay test confirms the same event log + same rule-system version produces the same store | open | [`replay-determinism`](../../claims/replay-determinism.md), [`regime-determines-scheduling-discipline`](../../claims/regime-determines-scheduling-discipline.md), [`closure-state-hash`](../../objects/closure-state-hash.md), [`causal-event-record`](../../objects/causal-event-record.md), [`closure-rule-record`](../../objects/closure-rule-record.md), [`classifying-regime`](../../morphisms/classifying-regime.md), [`jsonl-event-log`](../../objects/jsonl-event-log.md) |
| `on-complete-follow-on-intents` | Workitems carrying `on-complete:` fields automatically queue follow-on workitems | open | [`queueing-follow-on`](../../morphisms/queueing-follow-on.md), [`witnessing-completion`](../../morphisms/witnessing-completion.md), [`verifying-completion-quiescence`](../../morphisms/verifying-completion-quiescence.md), [`goal-cell-system`](../../objects/goal-cell-system.md), [`work-queue`](../../objects/work-queue.md) |

## What lands together

- The engine survives a host reboot and resumes ticking.
- Budget exhaustion stops further invocations cleanly (with a witness explaining why) rather than silently wedging.
- Rate-limit signals from one tick become substrate state the next tick reads — the existing `eligibility-by-rate-limit` rule starts firing on real data, not just on hand-authored test cells.
- Contradictions in the closed store don't get silently dropped; they surface as anomalies with a queued review-workitem.
- Replay correctness has a regression test that catches drift the moment it appears.
- Multi-step workflows (Phase N → Phase N+1) flow through the substrate without a human in the loop for every hand-off.

## Done when

The engine has run for 24 hours on `vps-mini-cold-red-gate` with no human intervention, processing at least one workitem per tick when workitems are present.
The event log is auditable end-to-end.
Replay from a checkpointed event log reproduces the substrate's state exactly.
Budget and rate-limit gating engage without crashing the engine.

## Theoretical shape

M3 collectively realizes three properties that M2 left as commitments without runtime witnesses:

**1.
Recurrent-practice's regime** ([`predicated-work/theorems/regime-of-recurrent-practice`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/regime-of-recurrent-practice.md)) — work that ticks repeatedly has a different cohomological signature than one-shot tasks.
Until the engine runs unattended, the polity exhibits one-shot-task behavior; M3 is the transition into recurrent practice.
The supervised service is the operational realization; replay-determinism is the correctness witness.

**2.
Anomaly-as-contradiction made operational** ([`flatfile-agentic-resource-system/concepts/anomaly-as-contradiction`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/anomaly-as-contradiction.md)).
The `⊤` cells the closure runner already produces become *actionable*: budget-exhaustion, rate-limit, and rule-conflict all surface as substrate-visible obstructions with paths to repair.
The validation-as-settlement discipline, currently confined to `closure/rule/*` over authored markdown, extends to the operational tier.

**3.
Event-sourcing replay correctness** ([`flatfile-agentic-resource-system/concepts/event-sourcing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/event-sourcing.md)).
Replay-determinism-verified gives the regression test that catches drift in the moment it appears.
Without this test, federation correctness (M6) cannot be soundly tested either; with it, the path from M3 to M6 is open.

## What M3 does NOT need (theory-grounded)

Per [closure-monad-no-non-trivial-periodic-orbits](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md): the closure 2-monad has only period-1 orbits. $T^k(v) = v \implies T(v) = v$ — **the algebra cannot oscillate**.
Three operational consequences:

- **No oscillation guards on closure-rule firing.** The runtime cannot encounter period-2 oscillation in the algebra; if the engine appears to oscillate (e.g., between two dispatch states across ticks), the cause is *external* — observational drift in sensor reads, session-loaded LLM context churn, or external-runtime non-determinism.
  The fix targets transport-layer noise, not the algebra.
- **No flapping detector on heartbeat.** The φ-accrual heartbeat detector ($\Diamond$P, eventually-perfect) is the realistic target ([federation-resilience question](../../questions/federation-resilience-and-degradation.md)); transient false positives are killed *not* by oscillation suppression in the algebra (which has no oscillation to suppress) but by the closure-2-monad's lax-idempotence at the substrate level.
  The detector calibrates to transport-layer noise distribution.
- **Anomaly classification targets ⊤-cells, not oscillation.** Per [equivariant-cohomology-decomposition](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md): substrate disagreement decomposes into four sectors per $\widehat{K_4}$ characters.
  The MASFT 14-failure-mode taxonomy (referenced in [`masft-failure-mode-taxonomy-as-substrate-anomaly-classes`](../../questions/masft-failure-mode-taxonomy-as-substrate-anomaly-classes.md)) maps onto this 4-vector — anomaly-surfacing emits the sector decomposition, not a scalar count.

Per the [four-regime-dichotomy](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md): all active closure rules operate in the strict regime (quantifier-free over finite store), where closure converges in finitely many steps per tick.
Tick cadence at 20s is bounded above by the strict-regime termination guarantee, not by an empirical timeout.

## Imminent vagueness — resolved by theory research

The `budget-gated-dispatch` goal names `budget-record` cells but leaves the *gate algebra* (the closure rule that decides admit/refuse on a request against a budget cell) unspecified.
Per [`rate-limiting-as-cost-quantale-residuated-authority-gate`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/theorems/rate-limiting-as-cost-quantale-residuated-authority-gate.md), the gate algebra IS **residuation in the cost quantale** — a structural transposition (not a literal application) of the [residuated-restriction-as-authority-gate](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md) theorem from $\mathbf{FOUR}$ to the substrate's Lawvere cost quantale.

For budget $b$ and request cost $c$ in cost quantale $\mathcal{V}$:

- $\mathcal{V} = ([0, \infty], +, \min)$ for additive cost: $b \Rightarrow_\mathcal{V} c = \max(c - b, 0)$.
- Admission: $b \Rightarrow_\mathcal{V} c \neq \bot_\mathcal{V}$ (i.e., $b \geq c$).
- Refusal: $b <_\mathcal{V} c$ produces the wire's `429`-class refusal.

Four engineering disciplines per the wire-side projection $\pi_{\mathcal{V} \to \mathbf{FOUR}}$:

| Wire verdict | Algebraic shape | Substrate response |
|---|---|---|
| **Admit ($\mathbf{t}$)** | $b \geq_\mathcal{V} c$ | substrate decrements $b \mapsto b - c$; dispatch proceeds |
| **Refuse ($\mathbf{f}$)** | $b <_\mathcal{V} c$ | dispatch refused; budget unchanged |
| **Queue ($\bot$)** | residuation produces no committed verdict yet | dispatch deferred until next tick when budget refills |
| **Escalate ($\top$)** | budget cell at $\top$ (per-replica disagreement under M6 federation) | resolve via repair before dispatching |

This decisively answers the gate-algebra question:

- The *existing* `eligibility-by-rate-limit` closure rule (currently a direct cell-value check on `rate-limit-remaining = "0"`) is the count-1 specialization.
  The cost-quantale formulation generalizes it to **cost-aware** rate limits where heavy queries cost more than trivial reads.
- M3's `budget-gated-dispatch` rule is structurally the same shape as `eligibility-by-rate-limit`, just over a `budget-record` cell rather than a `rate-limit-remaining` cell.
- The `Retry-After` analog for substrate dispatch is the substrate-clock distance until budget refills: $(c - b) / r$ ticks for refill rate $r$.
  Per [cost-composition-via-lawvere-quantale](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theorems/cost-composition-via-lawvere-quantale.md), this is the cost quantale's *temporal projection* of the residuation.

**The `budget-record` schema (already authored at [`objects/budget-record.md`](../../objects/budget-record.md)) is sufficient** — it carries `bound-value`, `current-consumption`, `exhaustion-policy`, `reset-policy`, `witness-requirements`.
M3's remaining work is the closure rule body that residuates the request cost against the budget per the table above.
No new substrate-record schema is needed; the rule's fragment is bare-$\Pi_1+<$.

## Related self-questions

The following open questions in [`questions/`](../../questions/) explore axes that may shape M3's plan-record or surface goals not yet decomposed.
They are *not* commitments; they are exploration material the next enrichment-cycle can promote into goals if the captain confirms the framing:

- [`operations-causal-settling-and-loop-determinism`](../../questions/operations-causal-settling-and-loop-determinism.md) — replay-determinism under the Lorentzian causal frame: events as causal-set rather than total order, `rsv_hash` as a frame-invariant rather than an order-invariant.
  Bears on `replay-determinism-verified`.
- [`saturation-threshold-and-bounded-entropy-as-runtime-caps`](../../questions/saturation-threshold-and-bounded-entropy-as-runtime-caps.md) — the ~4-agent saturation threshold and bounded-local-rule-entropy $H_\rho$ encoded as substrate-resident runtime caps and regression checks.
  Implicit in M3's "processing at least one workitem per tick"; this question makes the implicit constraint substrate-explicit.
- [`four-regime-classification-as-rule-metadata`](../../questions/four-regime-classification-as-rule-metadata.md) — closure-rule regime classification as substrate metadata for halting prediction and federation safety.
  Bears on M3's rule-firing discipline.
- [`graceful-degradation-as-substrate-resident-lifecycle-policy`](../../questions/graceful-degradation-as-substrate-resident-lifecycle-policy.md) — encoding graceful-degradation states (full-mission / restricted / minimal-trusted-mode / safe-mode) as a substrate-resident lifecycle policy the runtime navigates.
  Bears on the "runs unattended without crashing or silently degrading" axis of M3's "Done when".
- [`masft-failure-mode-taxonomy-as-substrate-anomaly-classes`](../../questions/masft-failure-mode-taxonomy-as-substrate-anomaly-classes.md) — encoding the MASFT 14-failure-mode taxonomy as substrate-resident anomaly classes with detection rules.
  Sharpens `anomaly-surfacing-via-contradiction-cells`: rather than surface raw `⊤` cells, classify them by failure-mode for actionable review.

See [`questions/_themes.md`](../../questions/_themes.md) for the full theme map.

## Related

- [Wiring Protocols](../../governance/specifications/wiring-protocols.md) — the engine's API surface §4.1, §4.5
- [Roadmap](roadmap.md)
- [Substrate-Driven Dispatch implementation guide](../implementation/substrate-driven-dispatch.md)
