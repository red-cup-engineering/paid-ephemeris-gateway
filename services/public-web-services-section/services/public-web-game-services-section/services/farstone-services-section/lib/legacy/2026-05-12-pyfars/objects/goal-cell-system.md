---
type: definition
class: system-entity
status: draft
realizes: [work-record]
depends-on: [work-record, work-status, predication-cell, closure-rule-record]
implementation: pyfars.workitem.goal_cells
---

# Goal-cell system

The substrate-cell projection of a workitem's *completion specification*: an explicit set of goal cells with target valuations, against which completion is verified by checking quiescence.
Realizes the upstream "task-cell-system-record" pattern from the [substrate-algebra question](../questions/substrate-algebra-closure-and-replay.md).

Where [`work-record`](../concepts/work-record.md) names the *what* (the workitem's intent), the goal-cell system names the *done condition*: the specific cells that must hold specific bilattice values for the workitem to be considered settled.
The settling check is mechanical — quiescence over the goal-cell predicate is the completion witness.

This object lets PyFARS realize completion-as-quiescence at the workitem level, distinct from completion-as-witness-emitted (the prior, looser discipline).
A workitem with a goal-cell system is *self-checkable*: the substrate can verify completion without trusting the agent's "done" assertion.

## Markdown shape

A workitem record carries goal cells in frontmatter:

```markdown
---
type: workitem
slug: m3-supervisor-wiring
goal-cells:
  - target: (m3-supervisor-wiring, supervisor-unit-installed, <value>) = t
  - target: (m3-supervisor-wiring, supervisor-unit-active, <value>) = t
  - target: (m3-supervisor-wiring, replay-determinism-gate-passes, <value>) = t
target-valuation: forall  # forall | exists | weighted-threshold
verify-policy: on-quiescence
---
```

## Cells

A goal-cell system projects:

- `(workitem-slug, goal-cell, <cell-pattern>) = t` — one cell per goal.
- `(workitem-slug, target-valuation, <discipline>) = t` — `forall` (every goal cell must hold target value), `exists` (at least one), or `weighted-threshold` (sum of bilattice-weighted goals exceeds threshold).
- `(workitem-slug, verify-policy, <policy>) = t` — when the [`verifying-completion-quiescence`](../morphisms/verifying-completion-quiescence.md) closure rule should fire.
- `(workitem-slug, completion-witness, <event-id>) = t` — emitted when the goal-cell system reaches its target valuation.

## Quantifier-adjoint semantics

The three target-valuation disciplines correspond to the predication hyperdoctrine's quantifier adjoints (per the [dispatch question](../questions/dispatch-workitems-plans-and-external-surfaces.md)):

- **`forall`** — right-adjoint to substitution; the workitem completes iff *every* goal cell holds the target value.
  The default; corresponds to AND-completion.
- **`exists`** — left-adjoint; the workitem completes iff *some* goal cell holds the target value.
  Corresponds to OR-completion.
- **`weighted-threshold`** — uses bilattice values' truth-order; partial-completion is meaningful (a $\bot$-bearing goal contributes ambiguity rather than blocking).
  Corresponds to fuzzy-completion.

The system's choice among these is per-workitem; aggregate workitems (per [M2](../work/milestones/m2-substrate-dispatch.md)) carry their own quantifier discipline that composes from individual constituents.

## Verification

[`verifying-completion-quiescence`](../morphisms/verifying-completion-quiescence.md) is the closure rule that reads the workitem's goal-cell system, checks current cell values against target, and emits the completion witness when the target valuation is reached.
It runs at the cadence specified by `verify-policy`:

- **`on-quiescence`** — fires when the dispatch-closure-rule-system reaches its fixed point.
  Aligns with substrate-algebra.
- **`per-tick`** — fires every tick regardless of quiescence.
  Cheaper to reason about for time-bounded workitems.
- **`on-witness-arrival`** — fires when an event is recorded against any of the goal-cells' subjects.
  Lazy.

## What this object commits to

1. **Completion is mechanical, not asserted.** An agent reporting "done" without satisfying the goal-cells does not complete the workitem; the substrate refuses the closure.
  This is the gate that makes self-correcting dispatch possible.
2. **Goal cells are first-class system cells.** They appear in projector outputs, audit exports, federation envelopes.
  Two peers can compare workitem completion criteria for federation-shared workitems.
3. **Quantifier discipline is explicit.** Whether a workitem completes by AND, OR, or weighted-threshold is a substrate decision, not a per-runner convention.

## Pipeline interaction

The goal-cell system interacts with several existing pieces:

- [`witnessing-completion`](../morphisms/witnessing-completion.md) emits the completion event when verification fires.
- [`queueing-follow-on`](../morphisms/queueing-follow-on.md) reads `on-complete:` edges and materializes follow-ons.
- [`anomaly-witness`](anomaly-witness.md) is emitted when goal-cells reach $\top$ (contradictory completion claims) — an agent claimed done while another cell asserts a goal-cell at $f$.

## What this object does not specify

- The grammar for goal-cell patterns with substitution variables.
  Currently constrained to explicit cell tuples or simple wildcards; bounded $\Pi_1$ + $<$ fragment is the candidate per substrate-algebra question.
- Goal-cell systems that depend on *future* events (deadlines).
  Currently the substrate has no future-event notion; modeling a deadline as "if `(workitem, status, settled)` does not hold by `deadline-ts`, then `(workitem, status, blocked)`" routes through tick-boundary firing rather than future-events.
- Cross-workitem goal-cell sharing.
  When two workitems target the same cell, completion of one may complete the other; whether to model this as substrate-implicit or require explicit `shares-goal-with:` is open.
