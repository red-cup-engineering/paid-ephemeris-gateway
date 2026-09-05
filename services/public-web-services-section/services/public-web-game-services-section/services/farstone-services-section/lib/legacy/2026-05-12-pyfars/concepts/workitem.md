---
type: concept
class: act-subtype
status: draft
depends-on: [act, entity, witness, work-status, capability-table]
---

# Workitem

An [act](act.md) framed *as work* — with assignment, lifecycle, capability requirements, accountability, and a settling target.
Workitems are the dispatchable entities of PyFARS's work-orchestration: the system's processes, procedures, derivations, and inquiries are all workitems.

Workitem is the parent concept under which the four canonical work-subtypes ([process](process.md), [procedure](procedure.md), [derivation](derivation.md), [inquiry](inquiry.md)) sit.
Each subtype refines workitem with discipline specific to its kind of work.

## What makes an act a workitem

An act becomes a workitem when:

1. **It can be assigned**.
  The act has system cells naming an actor (office, agent, personnel) responsible for performing it — typically via [assignment-cell](../objects/assignment-cell.md) once dispatched.
2. **It has a lifecycle**.
  The act's [work-status](work-status.md) progresses through pending → ready → assigned → in-progress → settled (or failed/abandoned).
  Other acts may not have such a structured lifecycle (a one-shot observation has no "ready" state).
3. **It has capability requirements**.
  Cells like `requires-skills:`, `requires-capabilities:`, `requires-jurisdiction:` declare what the actor needs.
  Other acts may not require capabilities (a witness fires without a capability check).
4. **It is accountable**.
  Per [`accountability-terminates-at-captain`](../claims/) (forthcoming), every workitem traces to a human principal accountable for its outcome.
  Other acts may not need accountability tracing (a system-generated observation accumulates without a principal owning it).

These four properties are what distinguish workitems from acts-in-general.

## Relation to work-record

A [work-record](work-record.md) is the system-tracked representation of a workitem: the corpus markdown note (or its log entries) carrying the workitem's frontmatter, body, and witness chain.
The workitem is the *act*; the work-record is the *resource* projecting it.

Most operational discussion in PyFARS conflates the two — "the task" usually means both the abstract workitem and its record.
The conflation is fine in casual discussion; this concept and `work-record` separately name the abstract and concrete sides.

## Workitem subtypes

The four canonical subtypes are distinguished by their characteristic disciplines:

- **[process](process.md)** — long-running, stateful workitem; OS-process analog.
- **[procedure](procedure.md)** — scripted, deterministic, often atomic; batch-job analog.
- **[derivation](derivation.md)** — produces theory or claims from upstream; build-system-action analog.
- **[inquiry](inquiry.md)** — asks questions; research, investigation, classification.

A workitem typically belongs to one subtype, declared via its `kind:` frontmatter (or `workitem-subtype:`).
A workitem unable to fit any subtype is either ill-formed or signals a missing subtype the polity should author.

## What this concept does not yet specify

- Whether the four subtypes exhaust workitem.
  Other subtypes may emerge (e.g., `event` for time-triggered work; `coordination` for multi-actor synchronization).
  The four are the captain's current taxonomy; refinement is open.
- The handling of workitems that cross subtype during their lifecycle (e.g., an inquiry that converts to a procedure once its question is settled).
  The discipline is partly settled.
- The interaction with upstream [predicated-work](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/) — predicated-work has task-cell-system, plan, workflow.
  The PyFARS subtypes likely realize specific predicated-work structures; the mapping is partly intuitive, partly to be made precise.
