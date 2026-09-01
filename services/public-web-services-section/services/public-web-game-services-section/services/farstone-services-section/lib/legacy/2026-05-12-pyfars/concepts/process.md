---
type: concept
class: workitem-subtype
status: draft
depends-on: [workitem, work-status, work-record, scheduling-policy]
---

# Process

A [workitem](workitem.md) subtype: long-running, stateful, scheduling-relevant.
Processes are the workitem kind for which the OS-process analogy applies most cleanly — they have identity, current state, capability requirements, and a lifecycle that may span many heartbeat ticks.

The other workitem subtypes (procedure, derivation, inquiry) are not processes in this sense; they have different shape.
The [`work-records-are-processes`](../claims/work-records-are-processes.md) claim, in its strict form, applies to *process-subtype* workitems specifically.

## What distinguishes a process

A process workitem has:

1. **Long-running structure** — execution may span many heartbeat ticks, often days or weeks.
  Not atomic.
2. **Stateful execution** — at any moment, the process has a *current state* system-tracked beyond just `status:` (e.g., last-progress-cell, current-checkpoint, accumulated-findings).
3. **Suspension-and-resumption** — execution may pause (status `blocked` or `suspended`) and resume later.
  The process's state survives the pause.
4. **Scheduling sensitivity** — capacity, priority, preemption-resistance considerations apply per the scheduling-policy.
  The polity's scheduler decisions matter.

A process is what runs in the polity over time.
Substantively it is the OS-process analog: spawn, run, suspend/resume, terminate.

## Examples

- **The heartbeat itself** — a long-running process tick-firing dispatch (the heartbeat process is one process workitem in the polity's system).
- **A multi-day research engagement** — long-running, stateful, with checkpoints.
- **An ongoing audit** — accumulating findings across ticks; suspendable when the auditing office is on watch elsewhere.
- **The MCP server** — a long-running process serving inbound auth and tool calls.

A one-shot CLI invocation, by contrast, is *not* a process — it's a procedure.
A research question being asked is not yet a process — it's an inquiry until promoted (if it is).

## Why distinguish process from other subtypes

The OS-analogy `work-records-are-processes` claim works without strain for processes.
Apply it to procedures and the analog is shaky — a procedure is more like a *system call* than a process.
Apply it to inquiries and the analog breaks — there's no OS analog of "research."
Apply it to derivations and the closest analog is "build target" — different shape than a process.

Distinguishing the subtypes lets the OS-analogy be precise where it applies (processes) and let other subtypes have their own analogs or none.

## What this concept does not yet specify

- Process priority handling.
  PyFARS's scheduling-policy for processes vs. other workitem subtypes may differ; the discipline is partly settled.
- Long-running process auditing.
  A process that's been running for weeks accumulates substantial state; how to audit a snapshot of its state vs. its full history is a polity-policy choice.
- Process resource accounting.
  Long-running processes consume resources (compute, attention, capacity) over time; accounting these correctly is partly settled.
