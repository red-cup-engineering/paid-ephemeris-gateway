---
type: concept
class: process-state
status: draft
depends-on: [work-record, substrate, witness, settling]
---

# Work status

The lifecycle state of a [work record](work-record.md).
Realizes the upstream notion of *task state* in PyFARS terms, with the OS-analog framing made explicit: work-status is to a work record what process-state is to a process.
Each status is a substrate-cell value; transitions between statuses are witnessed system transitions.

## The status set

PyFARS commits at minimum to these statuses; polities and sub-domains may refine further.

| Status | Meaning | OS analog |
|---|---|---|
| `pending` | Created but not yet ready for dispatch — blockers unsettled, requirements not yet specified, or in triage classification. | Created/embryonic process. |
| `ready` | Eligible for dispatch — blockers settled, requirements specified, capability-table can produce eligible candidates. | Ready process (in the run queue). |
| `assigned` | A dispatch decision has fired; an office or agent is identified as the holder. Work has not yet begun. | Process scheduled to a CPU but not yet running. |
| `in-progress` | Work is actively being performed by the assigned agent. | Running process. |
| `blocked` | Was ready or in-progress; now waiting on an external dependency (a sibling task, an external resource, a captain decision). | Blocked process (waiting on I/O or another process). |
| `settled` | Work is complete; its settling-cell is at `t`; the witness chain shows successful completion. | Terminated process (normal exit). |
| `abandoned` | Work has been formally abandoned — no longer worth pursuing. The record is retained for audit but receives no further dispatch. | Killed process. |
| `failed` | Work was attempted but did not produce its settling cell; the failure is itself substrate-recorded for future reference. | Process exited with error. |

Status is a system cell of the form `(work-record, status, <value>) = t`.
At any moment, a work record's current status is the cell with `value` that is settled at `t`; multiple status cells may exist in history (each transition leaves the prior status's cell at `t` for the prior time-window).

## Transitions are witnessed

A work record's status changes only via witness events:

- `pending → ready`: produced by the closure that determines readiness (blockers settled, requirements complete).
  Witnessed automatically by the heartbeat's settling, OR explicitly by an office invoking a "promote to ready" verb.
- `ready → assigned`: produced by [dispatch](dispatch.md).
  Witnessed as an assignment cell.
- `assigned → in-progress`: produced when the assignee begins work.
  Witnessed by an "execution-start" event.
- `in-progress → settled`: produced by the assignee completing the work.
  Witnessed by an "execution-event" or "settling-witness" event with the work's settling-cell at `t`.
- `in-progress → blocked`: produced when the assignee encounters a blocker.
  Witnessed; the blocker's slug is named.
- `blocked → ready`: produced when the blocker settles.
  Witnessed.
- `... → abandoned`: produced by an authorized office (typically captain or steward) deciding to abandon.
  Witnessed.
- `... → failed`: produced when the work is concluded without producing its settling-cell.
  Witnessed with a description of what didn't settle.

The transition graph is an explicit constraint on what transitions are valid.
Closure rules in the [dispatch-closure-rule-system](../objects/dispatch-closure-rule-system.md) enforce the graph; an invalid transition (e.g., `settled → in-progress`) produces a $\top$-cell (paraconsistency surfaced) rather than silently overwriting.

## Distinguishing related concepts

- **Status vs. priority.** Status is the lifecycle state; priority is a separate dimension that affects dispatch order among ready work.
  A high-priority blocked work is still blocked; status doesn't override priority semantics.
- **Status vs. assignment.** Once status is `assigned` or `in-progress`, the assignee is the office or personnel named in the corresponding `assigned-to:` cell.
  Status and assignment are distinct cells; status answers "what stage is this in"; assignment answers "who is doing it."
- **Status vs. dispatch-readiness.** Per upstream [dispatch-readiness](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md), readiness is the *result* of evaluating eligibility cells and blocker cells.
  Status `ready` is the substrate-recorded reflection of that readiness.

## What this concept does not yet specify

- The complete state-transition diagram in formal-verifiable form.
  The transitions above are listed, but the closure rules that enforce them haven't been authored as system-tracked rules yet.
- The handling of *concurrent* status changes.
  If two agents simultaneously witness status transitions (rare but possible), the system's bilattice machinery surfaces the contradiction; the conflict-adjudication discipline is partly settled.
- Sub-domain-specific refinements.
  Some sub-domains (e.g., recurrent practice) may need additional statuses (e.g., `cycle-pending` for a recurring task whose next cycle hasn't yet started).
  These refine the base set; the discipline for refinement is open.
