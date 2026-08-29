---
type: concept
class: workitem-record
status: draft
depends-on: [workitem, record, substrate, predication-cell, witness, dispatch, task-cell-system]
realizes: [task-cell-system]
---

# Work record

The system's [record](record.md) projecting a [workitem](workitem.md) — the corpus markdown note (or its log entries) carrying the workitem's frontmatter, body, and witness chain.
PyFARS realizes the upstream [task-cell-system](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/task-cell-system.md) and broader work entities (intents, goals, milestones, tasks, dispatched-actions) as work-records.

A work-record is the *resource* projecting a workitem; the workitem is the *act* the record is about.
In casual usage the two are conflated, but the entity hierarchy distinguishes them: workitem is a kind of [act](act.md), an entity that happens; work-record is a kind of [record](record.md), a flatfile resource that projects system state.
Most operational discussion in PyFARS uses "work record" or "task" or "workitem" interchangeably; this concept names the record-side specifically.

## OS analogy, scope of applicability

PyFARS-as-OS treats *process-subtype* workitems' records (work-records of `kind: process` or with process-shape) as analogs of OS processes.
The analogy is load-bearing for that subtype; for [procedure](procedure.md), [derivation](derivation.md), and [inquiry](inquiry.md) workitems, the analogy is approximate or doesn't apply (procedures are more like batch jobs; derivations like build-system actions; inquiries like exploratory debugging).
The [`work-records-are-processes`](../claims/work-records-are-processes.md) claim, in its strict form, is about process-subtype work-records.

| OS concept | PyFARS realization |
|---|---|
| Process | Work record |
| Process control block (PCB) | Work record's frontmatter |
| Process ID | Work record's slug |
| Process state (running, waiting, blocked, ready, zombie) | Work record's [`work-status`](work-status.md) |
| Capability requirement | Work record's `requires-skills:` and `requires-capabilities:` |
| Resource need | Work record's `requires-budget:`, `requires-jurisdiction:`, etc. |
| Process priority | Work record's `priority:` (when present) |
| Process owner | Work record's `assigned-to:` once dispatched, plus the office that holds the relevant skill |
| Scheduler tick | One [heartbeat](heartbeat.md) tick |
| Run queue | Set of work records with `work-status: ready` (the [`work-queue`](../objects/work-queue.md)) |
| Context switch | Reassignment via re-dispatch (rare; assignments are usually durable) |
| IPC (inter-process communication) | Witnesses + queue-intent + cross-record references |

The analogy doesn't trivialize the differences — work records are markdown notes settled in the system, not ephemeral kernel structures; their lifecycle is hours-to-weeks, not microseconds; the "scheduler" is a heartbeat that ticks at human-relevant intervals.
But the structural correspondence is real and informative: dispatch is scheduling, eligibility is capability-checking, blocking is resource-waiting, and the run queue is a system-tracked set.

## What kinds of work records exist

PyFARS distinguishes (using upstream [predicated-work](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/) terms) several kinds:

- **Intent** — externally-originated request to do something.
  Lives in `triage/` until classified.
- **Task** — a single unit of work, possibly small enough for one agent to complete.
- **Goal** — a settling-target spanning multiple tasks; the work is "done" when the goal's settling-cell reaches `t`.
- **Milestone** — a coarse-grained settling target spanning multiple goals.
- **Dispatched-action** — a work record after assignment has fired but before completion.
- **Execution-event** — the witnessed evidence that a dispatched-action's system transition occurred.

These are not separate kinds in the sense of disjoint types — a single substrate entity may pass through several of these as it settles.
They are *roles* the entity plays at different lifecycle stages.

## What the concept commits to

1. **Work records are system-tracked.** A work record exists as a system cell-set (typically projected as a markdown note); its identity, state, requirements live in the substrate, not in agent runtime memory.
2. **Lifecycle changes are witnessed.** A work record's state transition (pending → ready → in-progress → completed) is a system transition; each transition is a witness event in the JSONL log.
3. **Eligibility is computable.** A work record's frontmatter, combined with the [capability-table](capability-table.md), is sufficient to compute which offices/agents are eligible to take it.
  No out-of-substrate eligibility logic is load-bearing.
4. **Independence from runtime.** A work record persists across runtime restarts.
  Killing the heartbeat process does not destroy work records; restarting picks up where it left off, like a kernel resumed from snapshot.

## Distinguishing from related entities

- **Witness vs. work record.** A witness is the *event* of system-state-change; a work record is the *target* (or sometimes the producer) of witnesses.
  A work record's lifecycle is described by its witnesses.
- **Office vs. work record.** An office holds capabilities; a work record carries capability requirements.
  Dispatch matches the two.
- **Skill vs. work record.** A skill is the *procedure* an incumbent runs; a work record is the *invocation* that triggers a skill's execution.
- **Intent vs. work record.** An intent is an unclassified external request; once classified, it becomes (or produces) a work record proper.
  Pre-classification, it's external; post-classification, it's substrate-internal work.

## What this concept does not yet specify

- The complete set of frontmatter fields a work record may carry.
  The realization adds fields as patterns emerge; some fields are unique to specific kinds (e.g., `chapters:` only meaningful for narrative-shaped work records, if those exist).
- The handling of work records that turn out to be ill-formed mid-lifecycle (a task whose blockers are unsettleable, an intent that resists classification).
  Currently triage-bound; the formal abandonment discipline is partly settled.
- The relationship to *recurrent* work — a daily watch, a weekly retrospective.
  These are time-cycled work records; the cyclic-instantiation discipline is upstream in [recurrent-practice](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md), but PyFARS-side specifics for how cycles spawn fresh records aren't yet authored.
