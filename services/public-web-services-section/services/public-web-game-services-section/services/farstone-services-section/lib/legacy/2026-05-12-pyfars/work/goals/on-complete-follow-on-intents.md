---
title: "On-complete follow-on intents"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [operations-loop, recurrent-practice, task-cell-system]
tasks:
  - implement-on-complete-followon-emission
---


After this goal, a workitem that carries `on-complete: <next-class>` (or a richer `on-complete:` block) automatically queues the named follow-on workitem when the original completes.
Multi-step workflows (e.g., the theory-derivation loop's Phase N → Phase N+1 chain) flow through the substrate without a human in the loop for every hand-off.

## Why

Today, when an agent invocation completes, the response is witnessed and the cycle ends.
To advance to the next step in a multi-step workflow, a human or OpenClaw agent has to read the witness and queue the next workitem.
That manual hand-off is the bottleneck for long-running autonomous workflows.

The substrate already supports `on-complete:` semantically (the field appears in workitem records); what's missing is the runtime that honors it.
After this goal, an `on-complete: <next-class>` field on a completed workitem causes the next tick to find a freshly-queued follow-on workitem in the substrate.

## Theory grounding

**1.
Continuous-learning-loop** ([`flatfile-agentic-resource-system/concepts/continuous-learning-loop`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/continuous-learning-loop.md)).
The CL pipeline is the substrate-shaped expression of "completed work begets new work": observations from completed workitems consolidate into instincts; instincts inform new dispatch decisions; new dispatches produce new observations. **`on-complete` is the smallest unit of this loop** — the simplest possible "completed N triggers N+1" relation.
Generative closure rules are how this lives in the substrate without runtime call-chains.

**2.
Workflow-composition** ([`predicated-work/theorems/workflow-composition`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md)).
Workflows compose through the *substrate's* state-passing, not through inline runtime calls.
Each phase reads its input from substrate cells (the predecessor's output) and writes its output to substrate cells (the successor's input). **The runtime never holds state between workitems; the substrate does.** This is what makes workflows resumable across crashes, re-runnable for replay, and federation-portable.

**3.
Generative closure rules** (per [`predication-categories/concepts/closure-rule`](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule.md), and the strict-regime termination property of `pypredcalc.
StoreClosureRuleSystem`).
A standard closure rule's consequents are over the same subjects as its antecedents (eligibility-by-X is "for $W, D$ already in the store, derive `(W, eligible-by-X, D)`").
A *generative* rule emits cells about a new subject not present at antecedent-time: `(W', type, <next-class>) = T` where `W'` is a fresh slug derived from `W`. **`pypredcalc.
StoreRule` requires fully-grounded subjects**, so the runtime instantiator must pre-compute `W'` deterministically (e.g., `<W>-followon-<class>`) and emit the rule with that ground subject.
This is well-defined as long as the slug-construction is total over the carrier — and it is, since `(W, on-complete, C)` cells are finite.

**4.
Settlement-path's parallel arc** (per [`predicated-work/concepts/settlement-path`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/work-regime.md), referenced from `runtime/promote.py`).
The settlement path has two arcs: `observation → instinct → skill → tool` (epistemic) and `idea → plan → workitem → done` (work-flow).
`on-complete` is the work-flow arc's mechanism for chaining: a `done` workitem's `on-complete:` field promotes its successor from idea to plan to workitem. **The follow-on rule is the work-flow arc's continuation** — the same role `runtime/promote.py` plays on the epistemic arc.

### Design constraints from this grounding

- **Slug construction must be deterministic and idempotent.** `W2 = <W>-followon-<class>` (or a hash-based form) so re-running the rule produces the same `W'`, no duplicates.
  The closure rule's consequent emitting on the same `W'` twice is fine — knowledge-join is idempotent — but emitting on different `W'` slugs would create duplicate workitems.
- **The follow-on must reference its predecessor.** `(W2, predecessor, W) = T` is the cell that links the chain.
  Without it, replay can't reconstruct the workflow tree, and consolidation across the chain (M4) can't trace observations back to causes.
- **Don't fire on every workitem with `status: done`.** Fire only on workitems carrying `(W, on-complete, C) = T`.
  A workitem without `on-complete:` shouldn't generate spurious follow-ons.
- **Multiple `on-complete:` classes generate multiple follow-ons.** A workitem listing `on-complete: [phase-2-derivation, phase-2-audit]` generates two follow-ons, each with its own slug.
  The closure rule fires once per `(W, on-complete, C)` cell, naturally giving this behavior.
- **The follow-on's `requires-capabilities` derives from the class, not from the predecessor.** A `phase-2-derivation` workitem requires `derivation`-capability regardless of which predecessor produced it.
  This argues for **a separate, parallel closure rule** that fires on `(W2, type, <class>)` and emits the requirements implied by the class — keep the two rules separate so each is in the strict regime.

## Acceptance

- [ ] When a workitem `W` carrying `on-complete: <next-class>` completes (status transitions to `done`), the next tick contains a freshly-queued workitem of class `<next-class>` referencing `W` as predecessor.
- [ ] The follow-on can be a closure-rule firing (preferred — substrate-pure) or a runtime helper (acceptable as a stop-gap; later promoted to a substrate rule).
- [ ] Workitems without `on-complete:` produce no follow-ons.
- [ ] Tests cover: no on-complete (no follow-on), one on-complete (one follow-on per completion), `on-complete:` with multiple classes (multiple follow-ons), and a chain of three steps end-to-end.
