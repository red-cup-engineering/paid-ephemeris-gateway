---
title: "Assignment cells written back to substrate"
type: goal
milestone: m2-substrate-dispatch
status: open
horizon: doing
theory-basis: [dispatch-readiness, assignment, normative-operational-layering]
tasks:
  - design-assignment-closure-rule
  - emit-assignment-cells-from-dispatch-graph
---


After this goal, the dispatch graph's selection step writes `(W, assigned-to, D) = T` cells back into the substrate as part of the closure run, not just as in-memory `(W, D)` tuples in `DispatchState.winners`.
Subsequent ticks can read those cells; downstream queries ("who is doing workitem X?") walk the substrate, not the engine's volatile state.

## Why

The current selection step is correct internally but produces a side-channel result: winners are tuples in `DispatchState`, agent invocation reads them, but they never settle as substrate state.
That breaks two things downstream:

1. **`current-load` cannot be computed** from substrate state alone — necessary for `selection-by-load` and any other load-aware selection rule.
2. **Replay can't reconstruct selection decisions.** The event log carries `agent_invoked` witnesses but not the assignment cells that justified the invocation, so a replay must re-run the dispatch graph rather than consume the recorded decision.

Assignment-as-cell makes selection a substrate-shaped state transition rather than a runtime side effect.

## Theory grounding

**1.
The O→N rule** ([`predicated-work/concepts/normative-operational-layering`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md), as cited from `dispatch-readiness`).
An operational event (assignment) generates a normative consequence (duty): when $\delta(A, T) = \mathbf{t}$ AND `(W, assigned-to, A) = T` settle in the substrate, an O→N closure rule fires producing the duty cell `(R_duty, active-holder, A) = T`. **Without the assignment cell in the substrate, the O→N rule has no antecedent to fire on — the duty never settles, and downstream queries about who is responsible for what return $\bot$.** The current `(W, D)` tuple in `DispatchState` is invisible to closure-rule firing; only substrate cells can serve as antecedents.

**2.
Event-sourcing replay correctness** ([`flatfile-agentic-resource-system/concepts/event-sourcing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/event-sourcing.md), implied by [`event-log-is-jsonl`](../../governance/decisions/event-log-is-jsonl.md)).
Substrate state at time $\tau$ is the closure of the event log up to $\tau$.
If selection produces an in-memory winner that's never witnessed, replay cannot reconstruct that decision — the replay either re-runs the dispatch graph (acceptable but expensive) or skips selection entirely (incorrect).
Writing the assignment cell back makes selection a substrate-shaped state transition, recoverable by replay alone.

**3.
Federation determinism** ([`predicated-computing/theories/.../federation`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)).
Two engines federating must converge.
The `rsv_hash` already stamps the rule-system version; the closed store contributes its cells.
Assignment cells are part of the closed store; without them, federation peers see different stores after dispatch and converge to different rsv_hashes, breaking the convergence theorem.

### Design constraints from this grounding

- **The cell key must be `(W, assigned-to, D)`**, matching the upstream O→N rule's antecedent shape.
  Don't pick a different predicate name.
- **The cell value is $\mathbf{t}$ on assignment, $\mathbf{f}$ on retraction.** Retraction (e.g., a workitem reassigned, an agent withdrawn) writes $\mathbf{f}$; the knowledge-join of $\mathbf{t}$ followed by $\mathbf{f}$ produces $\top$ if they coexist, surfacing a re-dispatch conflict per anomaly-as-contradiction.
- **Per [`predicated-work/theorems/dispatch-monotonicity`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md)**: "A $\mathbf{t}$-readiness can become $\top$ if a contradicting witness arrives, but cannot become $\bot$ or $\mathbf{f}$ silently."
  Assignment cells inherit this monotonicity — once `(W, assigned-to, D) = T` is in the store, subsequent ticks cannot silently retract; retraction must be a witnessed F-emission.
- **The assignment witness's `details` should include the full rule chain that led to the selection** (which eligibility rules fired, which selection rules emitted preferences, the active `rsv_hash`).
  This makes the audit trail self-contained: a captain reading the witness sees the whole basis for the decision without needing to reconstruct the dispatch graph's intermediate state.

## Acceptance

- [ ] After each tick where the dispatch graph selects a winner, the closed store contains a `(W, assigned-to, D) = T` cell for that pair.
- [ ] An `assignment_settled` (or similar) witness is appended to the event log per assignment.
- [ ] `runtime/dispatch_graph.select_winners_node` (or a downstream node) writes the cell via the same closure-rule pathway eligibility uses (so the writeback gets the same provenance discipline).
- [ ] Replaying the event log reproduces the assignment cells in the substrate.
- [ ] Tests cover: one workitem one winner, no eligible dispatchable (no cell written), multiple eligible (one cell written for the selected pair).
