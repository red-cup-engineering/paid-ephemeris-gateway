---
title: "Instinct cells via consolidation"
type: goal
milestone: m4-memory-feedback
status: open
horizon: later
theory-basis: [consolidation-as-settlement, three-tier-memory, recurrent-practice]
tasks:
  - author-consolidation-cycle-recurrent-practice-record
  - implement-promote-runner-as-consolidation-step
  - emit-instinct-cells-with-provenance-back-to-observations
---


After this goal, a periodic *consolidation cycle* — a [recurrent practice](../recurrent-practices/_index.md) at a coarser cadence than the [tick](../recurrent-practices/tick.md) — reads the recent observation cells and synthesizes **instinct cells** on each dispatchable.
An instinct is a settled judgment about the dispatchable's behavior over many sessions: "endpoint X has 95% success on workitems of class C", "endpoint Y has p99 latency above the budget on tasks longer than 4k tokens".

The settlement-path operator (`runtime/promote.py`, already built for the `observation → instinct → skill → tool` sequence) is the realization mechanism.
This goal wires it into a consolidation cycle.

## Why

[M4 — Memory and Session Feedback](../milestones/m4-memory-feedback.md)'s acceptance criterion is "running the same class of workitem twice shows measurably different (improved) selection based on the first run's observations."
That requires (a) observations exist (the prior goal), (b) something distills them into a form selection can consume cheaply (this goal), and (c) selection actually consumes them ([`selection-reads-instinct-cells`](selection-reads-instinct-cells.md), the next goal).

Instincts are what bridge raw observations to selection.
Selection at tick cadence cannot afford to scan all historical observations per dispatchable per workitem; it consults a settled instinct cell.

## Theory grounding

**1.
Consolidation-as-settlement** ([`flatfile-agentic-resource-system/concepts/consolidation-as-settlement`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/consolidation-as-settlement.md)). **Instinct cells aren't authored, they're *settled* from observation cells via the same closure-rule machinery the dispatch graph uses.** This is structurally important: consolidation is not a new computational paradigm; it's the existing rule-firing machinery applied to a different fiber at a coarser cadence.
The settlement-path operator already built (`runtime/promote.py`) is the realization — wiring it into a recurrent-practice cycle is what this goal does.

**2.
Three-tier memory** ([`flatfile-agentic-resource-system/concepts/three-tier-memory`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)).
Sessions are the bottom tier; **instincts are the middle tier** — one agent, many sessions consolidated.
The consolidation cycle is exactly the mechanism that promotes information from bottom to middle.
Without the middle tier, every selection decision would have to walk the full bottom tier, which violates the practical-bounded-cost reading of [recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) §"Settlement-path".

**3.
Cadence-as-modal-frame** ([`predicated-work/concepts/cadence-as-modal-frame`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/cadence-as-modal-frame.md)).
The consolidation cycle's cadence is itself a modal operator: an instinct cell carries an implicit "this is what we know *so far at consolidation cadence C*".
The cadence isn't a schedule, it's part of the cell's semantics.
Consolidation at hourly cadence and consolidation at weekly cadence produce *different* instinct cells with different modal interpretations; aggregating without respecting the cadence-modality is type-confused.

### Design constraints from this grounding

- **The consolidation cycle is a [recurrent-practice](../recurrent-practices/_index.md) record (`work/recurrent-practices/consolidation-cycle.md`).** Authoring it as a recurrent-practice makes the cycle-boundary semantics explicit: each cycle reads the observation increments since the prior cycle's boundary, plus the prior cycle's instinct cells (Markov aggregation) or a longer history (finite-history if depth-tunable).
- **Instinct cells carry provenance back to observations.** `(instinct-I, derived-from-observations, [O1, O2, ...]) = T`.
  This is what makes [replay-determinism](replay-determinism-verified.md) extend to consolidation: replay of the event log reproduces the observation cells, the consolidation cycle reproduces the instinct cells from the same observations, and the audit chain is intact.
- **The promote.py runner is invoked, not reimplemented.** PyFARS already has the settlement-path operator.
  This goal's tasks bind it to a cadence; they don't rewrite the projection logic.
  Extending the rule set the runner uses is acceptable; replacing the runner is not.
- **Aggregation is finite-history with depth from the consolidation-cycle's frontmatter.** Defaulting to depth 1 (Markov) is safe; raising it requires substrate-witnessed authorization (an [adjustment](../adjustments/_index.md) record).

## Acceptance

- [ ] A `work/recurrent-practices/consolidation-cycle.md` record exists declaring cadence, aggregation structure, and constituent rules.
- [ ] The lifecycle (or a sibling supervisor) fires the consolidation cycle at the declared cadence.
- [ ] On each consolidation firing, `runtime/promote.py` reads observations since the last cycle and emits instinct cells against each affected dispatchable.
- [ ] Instinct cells carry `derived-from-observations`, `derived-at`, `consolidation-cycle-id`, and a `confidence` cell scaled per Stevens.
- [ ] Replay determinism is preserved: re-running the consolidation cycle on the same observation set produces the same instinct cells.
- [ ] No `src/promote.py` rewrite — the existing settlement-path operator is what fires.
