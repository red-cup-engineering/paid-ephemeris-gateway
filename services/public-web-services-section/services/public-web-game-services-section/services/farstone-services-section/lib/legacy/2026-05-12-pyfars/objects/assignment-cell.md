---
type: definition
class: system-cell-pattern
status: draft
depends-on: [work-record, work-status, predication-cell, witness, dispatch-closure-rule-system]
---

# Assignment cell

The system cell that records a [work record](../concepts/work-record.md)'s assignment to an office, personnel, agent, or external principal.
Realizes the OS notion of *process-to-CPU binding* in PyFARS-as-OS terms: an assignment cell is what binds a work record to an actor for execution.

The cell pattern is

$$(W,\; \texttt{assigned-to},\; A) \;=\; \mathbf{t}$$

where $W$ is a work record (slug), $A$ is the actor (office, personnel, agent, or principal slug), and the bilattice value is $\mathbf{t}$ when the assignment is asserted.

## When the cell is produced

An assignment cell is the output of a single [dispatch-decision](../morphisms/) — one closure-step in the [dispatch-closure-rule-system](dispatch-closure-rule-system.md) where eligibility, authority, capacity, and selection rules have all settled to a single eligible-and-preferred actor.

Before the cell is produced, the work record's status is `ready`.
After the cell is produced, the closure rule "if `assigned-to` is at $\mathbf{t}$ then status is `assigned`" fires, producing the status transition.
The two cells (`assigned-to` and `status: assigned`) are typically witnessed in the same tick.

## When the cell can be re-produced

In normal flow, an assignment cell once produced is durable — the actor takes the work, settles it, and produces a `settled-by` cell that closes the loop.
Re-assignment (changing $A$) is rare and explicit:

- **Capacity overflow / re-balancing**: a reassignment witness explicitly produces a new `assigned-to` cell, with a witness rationale.
  The old cell remains in history (system cells are append-only via witnesses); the new cell is the current truth.
- **Failure**: if an assigned actor cannot complete the work (resource gone, agent crashed, capability revoked), the work is re-readied (`status: ready`) and the queue re-fires dispatch.
- **Captain override**: the captain or steward may witness a reassignment for governance reasons.
  This is the rare-but-permitted path.

Re-assignment is not silent context-switching; it's a witnessed system transition with a rationale.
This differs from OS context switching — OS schedulers context-switch invisibly; PyFARS reassigns visibly because witnessing is a substrate purity requirement.

## What this cell commits to

1. **Authority chain**: the actor $A$ holds the necessary capabilities (per the [capability-table](../concepts/capability-table.md)), or the assignment was authorized by a higher-authority actor (per delegation chains).
  A cell whose authority chain doesn't validate is a substrate-purity violation.
2. **Mutual exclusion**: a single work record has at most one *current* `assigned-to` cell at $\mathbf{t}$ (the latest witnessed one is the current truth).
  Earlier assignment cells exist in history but are superseded.
3. **Capacity accounting**: producing this cell increments $A$'s current-load counter (a derived system cell or computed value); when $A$ settles the work, the counter decrements.

## Distinguishing from related cells

- **Assignment cell vs. eligibility cell**: an eligibility cell `(W, eligible-office, O) = t` records that $O$ *could* take $W$; an assignment cell records that $O$ *is* taking $W$.
  Eligibility is a precondition; assignment is the act.
- **Assignment cell vs. delegation cell**: delegation `(O', delegated-from, O)` is a governance relation between offices about authority.
  Assignment is a work-record-level cell about a specific work item.
- **Assignment cell vs. witness**: every assignment cell is *produced by* a witness event in the JSONL log.
  The witness is the event; the cell is the resulting system state.
  They're related but distinct.

## OS analogy made explicit

| OS concept | Assignment-cell analog |
|---|---|
| Process-to-CPU binding | Assignment cell `(W, assigned-to, A) = t` |
| Process priority effect | Order of assignment-cell production within a tick |
| Multi-CPU systems | Multiple actors in parallel; per-tick may produce multiple assignments |
| Process migration (rare) | Reassignment with explicit witness |
| Affinity (CPU pinning) | Polity-policy preference cells favoring certain actor-types for certain work-types |
| Idle process | Office with no current assignment cells; capacity counter at 0 |

## Implementation pointers

The assignment cell is currently produced by `pyfars dispatch` and `pyfars work auto_dispatch` Python implementations.
Per the work-orchestration refactor, the cell production is to be driven by closure over the system's dispatch-closure-rule-system, not by hardcoded Python logic.
The cell's *form* (slug, key, value, witness) is unchanged; what changes is *who produces it* — closure runtime instead of hardcoded code.

## What this object does not yet specify

- The witness format for reassignment specifically.
  Is it a separate "reassign" event kind, or a regular assignment witness whose rationale references the prior assignment?
  The discipline is partly settled, partly conventional.
- The handling of multi-actor assignments.
  Some work records may need multiple assignees (a team task, a quorum-required action).
  Whether to model this as multiple assignment cells (one per assignee) or as a composite cell with a list value is open.
- Cross-polity assignment.
  When an actor in another polity takes work in this one, the cell's value crosses a polity boundary; substrate-purity over the boundary is a federation question.
