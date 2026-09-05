---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, dispatch, capability-table, scheduling-policy, dispatch-closure-rule-system, assignment-cell]
realizes: [dispatch]
---

# Dispatch decision

A single closure-step that produces an [assignment-cell](../objects/assignment-cell.md) for a `ready` [work-record](../concepts/work-record.md).
The third spoke of the work cycle.
The runtime instance of [dispatch](../concepts/dispatch.md) — the concept names the role; this morphism names *one application* of the role.

## Action

For a ready work-record $W$ and the system state at time $\tau$:

$$\mathrm{dispatch\text{-}decision}(W, S(\tau)) \;\longrightarrow\; (W, \texttt{assigned-to}, A) = \mathbf{t}$$

where $A$ is the eligible-and-preferred actor (office, personnel, agent, or principal) selected by the polity's [scheduling-policy](../concepts/scheduling-policy.md) applied to the [capability-table](../concepts/capability-table.md).
The action is a single closure-step over the [dispatch-closure-rule-system](../objects/dispatch-closure-rule-system.md).

The decision produces: - An assignment cell. - A status-transition cell ($W$, status, assigned). - A capacity-counter update on $A$ (incremented by one).

A witness records the decision in the JSONL log; the cells are derived consequences of the witness.

## Composition

Dispatch-decision composes after plan and before execute:

$$\mathrm{plan} \to \mathrm{dispatch\text{-}decision} \to \mathrm{execute}$$

Dispatch-decision is also the per-work-record unit for the per-tick batch the [heartbeat](../concepts/heartbeat.md) fires; one heartbeat tick may invoke dispatch-decision on multiple ready work-records.

## What this morphism commits to

1. **Decision derives from the system.** Per [`dispatch-derives-from-governance`](../claims/dispatch-derives-from-governance.md), the decision is computable from system state alone.
  No out-of-substrate input is load-bearing.
2. **Authority gate**: the decision fires only if the chosen actor's authority chain admits the assignment.
  Authority-chain validation is part of the closure rules.
3. **Capacity gate**: the decision fires only if the chosen actor has capacity.
  Capacity is derived from existing assignment cells.
4. **Determinism**: given identical system state and policy, repeated invocations produce the same decision.

## What this morphism does not do

- It does not execute the work.
  That's execute.
- It does not modify the work-record's substantive cells (requires-skills, etc.).
  Those are set by plan; dispatch reads them.
- It does not adjudicate among multiple eligible actors via human-in-the-loop.
  Selection is per the polity's scheduling-policy; if the polity wants human-in-the-loop selection, it declares that as a policy rule, not as ad-hoc behavior.

## Implementation pointer

The current `dispatch.py` and `auto_dispatch.py` realize this morphism approximately, with policy hardcoded in Python.
Per the work-orchestration refactor, the morphism's policy moves into system-tracked closure rules, and the Python implementation becomes the closure-rule-engine that runs the rules.

## Open structural questions

- Batched vs. one-at-a-time decisions per tick.
  A heartbeat tick may need to dispatch many ready work-records; whether the closure runs as a single batch (all decisions settled together) or sequentially (each decision affects subsequent ones via capacity updates) is partly an implementation choice, partly a theoretical one (the bilattice's join semantics may determine which is correct).
- The handling of *contention*: when two work-records compete for the same scarce actor, does the closure produce both decisions (over-allocating the actor) and let a downstream rule resolve, or does it sequence them?
  Both are admissible per upstream theory.
- Re-dispatch (the morphism applied to a work-record that's already assigned but being reassigned).
  This is the same morphism with an extra precondition (`reassignment-allowed:` cell or equivalent); the discipline for when re-dispatch is admissible is policy.
