---
title: "Observation cells from agent invocations"
type: goal
milestone: m4-memory-feedback
status: open
horizon: later
theory-basis: [observation, observation-fiber-isolation, normative-operational-layering]
tasks:
  - design-invocation-to-observation-projector
  - emit-observation-cells-on-invoke-completion
  - bind-observations-to-session-and-dispatchable
---


After this goal, each agent invocation produces [observation](../observations/_index.md) cells in the substrate — readings of the invocation's outcome (latency, token usage, success-vs-error, content quality if scoreable) that subsequent ticks can query.
Today, invocations emit witness events but the substrate doesn't carry the readings as queryable cells.

## Why

The dispatch graph already produces execution events; what it doesn't produce is **first-class observation entities** on those events.
The downstream goal [`selection-reads-instinct-cells`](selection-reads-instinct-cells.md) needs observations to consolidate into instincts; without observations, consolidation has nothing to work over.

Observations are also the input to anomaly detection ([`anomaly-surfacing-via-contradiction-cells`](anomaly-surfacing-via-contradiction-cells.md) is in [M3](../milestones/m3-continuous-loop.md), but its anomaly types extend in M4 once observations are available — e.g., a latency spike that's three sigma from baseline becomes a substrate-detectable contradiction).

## Theory grounding

**1.
Observation-fiber-isolation** ([`flatfile-agentic-resource-system/concepts/observation-fiber-isolation`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/observation-fiber-isolation.md)). **Observations live in their own fiber, separate from the entities they observe.** If the dispatcher wrote `(dispatchable-D, last-latency, 850ms)` as a cell on `D`, the metric becomes part of `D`'s fiber and downstream selection composes against `D`-with-metric, not `D`.
The observation fiber discipline cuts that loop.
Observation cells have `(O, observes, D) = T` (a reference) and the metric value lives on `O`, not on `D`.

**2.
Predwork observation-as-cell-system** ([`predicated-work/objects/observation`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md)).
An observation is a triple $O = (G_O, \mathcal{S}_O, v^O_0)$ — its claim cells (observes, observed-at, method, value, baseline, scale), its closure rules (cadence rules tying the observation to a recurrent practice), and its initial valuation. **Stevens' scales are load-bearing**, not metadata: aggregations consult `scale` to refuse type-confused composition (averaging ordinals produces $\top$, not silent misbehavior).

**3.
O→N rule** ([`predicated-work/concepts/normative-operational-layering`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md)).
Operational acts (an invocation completing) generate normative cells (the dispatchable-D's duty to provide accurate observations is satisfied/violated).
The observation cell is the substrate-algebraic proof-of-discharge; **without observation emission, the dispatchable's duty cells stay at $\bot$ — the substrate cannot distinguish "duty discharged silently" from "duty not yet discharged."**

### Design constraints from this grounding

- **Observation records are emitted to a session-bound location, not the dispatchable's fiber.** Per fiber-isolation: the location is something like `<substrate-root>/observations/<session-id>/<observation-id>.md`, and the cell `(observation, observes, dispatchable-D) = T` goes on the observation record.
  The dispatchable record's frontmatter never gains observation-derived cells.
- **The Stevens `scale:` cell is required on every emitted observation.** Latency: `ratio` (zero is a meaningful zero).
  Token-count: `ratio`.
  Success-vs-error: `nominal`.
  Quality-score (if computed): `interval` or `ordinal` per how it's computed.
  Defaulting to `nominal` when uncertain is correct.
- **Observation emission is idempotent on `(invocation-id, observation-method)`.** A given invocation produces at most one latency-observation, one token-observation, etc. — emitting twice is a no-op (or produces $\top$ if values diverge).
  This matches the projector counit law: replay of the same event log produces the same observation cells.

## Acceptance

- [ ] A projector at `runtime/observation_projector.py` (or equivalent) takes an `InvocationResult` and emits observation records under the session.
- [ ] Each emitted observation carries: `observes`, `observed-at`, `method`, `value`, `baseline` (may be ⊥), `scale`, plus binding cells to the session and the dispatchable.
- [ ] The dispatchable record's frontmatter is *not modified* by observation emission — fiber-isolation preserved.
- [ ] Standard observations land on every invoke: `latency-ms`, `tokens-in`, `tokens-out`, `outcome` (success/error/timeout).
  Optional observations land when their measurement methods are configured (e.g., quality-score from a downstream evaluator).
- [ ] A query "all observations of dispatchable D in session S" returns the relevant records via reverse-edges.
- [ ] Replay determinism is preserved: replaying the same event log emits the same observation records (idempotency).
