---
title: "Close execution loops on all dispatched tasks"
type: jural-relation
kind: duty
active-holder: pyfars-executive-officer
passive-party: pyfars-community
scope-action: track-and-close-dispatched-tasks
triggering-powers:
  - dispatch-task-to-office
required-action: classify-task-outcome
enforcement: substrate-violation
rule-type: N→O
cadence: per-heartbeat-cycle
theory-basis: [normative-operational-layering, jural-relation, task-cell-system, recurrent-practice]
---


Every task the XO dispatches must eventually receive a closure classification: completed, stalled, reassigned, or escalated.
A dispatched task with no closure event is an unfulfilled duty.

## Cadence

At minimum, the XO checks dispatched task status on each heartbeat cycle.
If a task has been dispatched for more than a configured interval without a completion event, the XO must produce one of: - A stall notice (task is in progress but delayed — XO acknowledges and continues watching) - A reassignment (task moved to a different office) - An escalation (task moved to steward or captain with explanation)

## Closure classifications

- **Completed**: the assigned office produced an output; the XO witnesses the completion.
- **Stalled**: no progress in N cycles; the XO flags it.
  Does not discharge the duty — the task still needs eventual closure.
- **Reassigned**: the XO redirects the task to a different office and files a witness.
- **Escalated**: the XO cannot resolve the task at its authority level; it is passed to the steward with a classification record explaining why escalation was required.
  This IS a valid duty discharge for the XO — the steward then owns it.

## Enforcement

Pre-M5: manual.
Reviewing agent or captain checks that every task with `dispatched-by: pyfars-executive-officer` has a closure record.

Post-M5: heartbeat's H¹ obstruction detection surfaces persistent (task, office) pairs with no completion event as anomalies.
