---
type: definition
class: system-entity
status: draft
realizes: [work-record, derivation]
depends-on: [work-record, work-status, predication-cell, goal-cell-system]
implementation: pyfars.workitem.plan
---

# Plan record

The substrate-cell projection of a *plan* — a multi-task workitem whose constituent tasks have an explicit dependency partial order, presented as a 1-morphism in the [settling cobordism category](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-cobordism-category.md).
Realizes the upstream [plan-as-tensor-of-task-cobordisms](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-as-tensor-of-task-cobordisms.md) theorem at the system level.

A plan record is the system's first-class realization of multi-task work.
Where a workitem's [goal-cell system](goal-cell-system.md) names what counts as completion, a plan record names how completion is reached — through a sequence of constituent tasks composed sequentially ($\circ$) and in parallel ($\otimes$), with composition law guaranteeing that "do independent tasks in different orders" yields equivalent system state.

## Markdown shape

A plan record lives at `work/plans/<slug>.md` and projects:

```markdown
---
type: plan-record
slug: ship-pyfars-engine-arc
constituent-tasks:
  - m1-bootable-engine
  - m2-substrate-dispatch
  - m3-continuous-loop
dependency-poset:
  - (m2-substrate-dispatch, depends-on, m1-bootable-engine)
  - (m3-continuous-loop, depends-on, m2-substrate-dispatch)
plan-source-boundary: [bootable-engine-cells]
plan-target-boundary: [supervised-engine-cells, replay-determinism-gate-cells]
composition-cost-bound: 144 hours
verify-plan-policy: on-quiescence
---
```

## Cells

A plan record's frontmatter projects:

- `(plan, type, "plan-record") = t`
- `(plan, constituent-task, <slug>) = t` — one cell per constituent.
- `(plan, depends-on, <prior-task>, <subsequent-task>) = t` — one cell per dependency edge in the partial order.
- `(plan, plan-source-boundary, <cell-pattern>) = t` — initial-condition cells the plan reads.
- `(plan, plan-target-boundary, <cell-pattern>) = t` — completion cells the plan produces.
- `(plan, composition-cost-bound, <quantity>) = t` — Lawvere-quantale-aggregated upper bound on cost.
- `(plan, plan-shape, <shape>) = t` — `series-parallel` (N-free poset, default) or `general` (admits N-shaped fan-in/fan-out).

## The cobordism structure

Each constituent task is a 1-morphism $T_i : \partial_- T_i \to \partial_+ T_i$ in the settling cobordism category.
The plan composes constituents per the dependency poset $\preceq$:

- **Sequential composition** $T_j \circ T_i$ when $i \preceq j$ and $\partial_+ T_i = \partial_- T_j$ — gluing along the shared boundary.
- **Parallel composition** $T_i \otimes T_j$ when $T_i, T_j$ are incomparable in $\preceq$ and have disjoint source boundaries — disjoint union of cobordisms.

For series-parallel posets (built from singletons by alternating $\circ$ and $\otimes$ — N-free), the plan presents as a single composite 1-morphism:

$$P\colon \bigsqcup_{i \in \min(\preceq)} \partial_- T_i \;\longrightarrow\; \bigsqcup_{i \in \max(\preceq)} \partial_+ T_i$$

For general posets (with N-shaped fan-in or fan-out), the plan requires Frobenius primitives — explicitly authored in the substrate as additional cobordism morphisms.

## The interchange law

Plans satisfy the monoidal 1-category interchange law:

$$(T_2 \circ T_1) \otimes (T_4 \circ T_3) \;=\; (T_2 \otimes T_4) \circ (T_1 \otimes T_3)$$

when both sides are defined.
Substrate-algebraically: dispatching independent tasks in different orders produces equivalent system state.
This is the bedrock of parallel work — the guarantee that the engine may dispatch parallel tasks in any order without producing different end-states.

## Plan completion

A plan completes iff its plan-target-boundary cells reach their target valuation, verified per [`verifying-completion-quiescence`](../morphisms/verifying-completion-quiescence.md) at the plan-bulk closure.
Per [completion-as-quiescence](../questions/substrate-algebra-closure-and-replay.md), the closure of the plan's cells under the polity's closure rules at quiescence is the test.

This is *stronger* than "every constituent task settled" — a plan whose constituents all settled but whose composition produces an unintended cell at $\top$ (contradiction surfaced by the full plan's closure) is *not* complete.

## What this object commits to

1. **Dependency poset is substrate-cell, not natural-language.** Agents reading dependencies read cells, not prose; the engine reads the same cells.
  No interpretation gap.
2. **Composition law is bedrock.** The substrate guarantees the interchange law; parallel dispatch is correct *by construction*.
  Implementations diverging on interchange-law preservation are substrate-purity violations.
3. **Cost composes per Lawvere quantale.** The composition-cost-bound is the quantale-aggregate of constituent costs, computed at plan authoring time and enforced by [`compute-composition-cost-bound`](../morphisms/) (a backing-gap until authored).

## Pipeline interaction

- [`dispatching`](../morphisms/dispatching.md) reads the plan's dependency poset to determine which constituents are ready (source boundary cells are at target).
- [`verifying-completion-quiescence`](../morphisms/verifying-completion-quiescence.md) verifies plan completion at the plan-bulk closure.
- [`queueing-follow-on`](../morphisms/queueing-follow-on.md) reads `on-complete:` edges from the plan's record and materializes follow-ons after the plan-target-boundary settles.

## What this object does not specify

- The discipline for *partial plan execution* — pause after task K, resume from task K+1.
  Currently each constituent is dispatched per the poset; resumption is automatic from the system's cells, not requiring a separate "resume" verb.
- General (non-series-parallel) plan composition.
  Series-parallel covers most operational plans; N-shaped fan-in/fan-out cases (e.g., a task that depends on outputs from two prior tasks AND on a side-channel cell) need Frobenius primitives, which are open work for [M2](../work/milestones/m2-substrate-dispatch.md)'s post-landing phase.
- Cost-quantale cycle handling.
  Currently the composition assumes the dependency poset is acyclic (it must be, by definition); if a plan record encodes a cycle, the substrate emits $\top$ on `guard` and refuses to dispatch.
- Plan-of-plans (a plan whose constituent is itself a plan).
  The cobordism category admits this naturally; the system's representation flattens or recurses depending on `plan-shape`.
