---
type: concept
class: system-operations-system
status: draft
depends-on: [governance, instance, administrator, dispatching]
---

# Administration

The *operational* application of [governance](governance.md): the live, ongoing work of running a polity-instance under its established authority structure.
Where governance establishes *who can do what*, administration is *what is currently being done, by whom, in what state*.

Administration is the operational counterpart to governance.
A polity needs both: governance without administration is paper-only (no work happens); administration without governance is ad-hoc (work happens but no one can say whether it's authorized).

## What administration covers

Administration encompasses:

1. **Office incumbencies** — who currently holds which office; when each took the office; what their watch-bounds are.
2. **Active workitems** — what's currently in flight: dispatched, executing, blocked, in review.
3. **Service liveness** — which services are running, their last-tick witnesses, their resource use.
4. **Subscription state** — active subscriptions, queue depths, recent fires.
5. **Resource usage** — the polity's actual consumption against capability-table capacity.
6. **Recent governing-acts** — the captain's recent enactments, commands, certifications.

These are *system-cells* — administration is in the system, like governance — but they evolve faster than governance.
A captain's governance amendment is rare; a workitem dispatch is frequent.

## Administration and the engine

The [engine](engine.md) is the executor *of* administration.
The engine's tick → settle → dispatch loop is *administrating in the gerund sense*.
When an instance halts, administration *pauses* (the system-cells reflecting current administrative state freeze on disk); when the polity boots again, administration *resumes* from those cells.

This means administration-state is durable: it survives instance halts.
The captain reading administration-state at any moment sees the polity's *operational truth* — what is currently expected, in flight, blocked.

## Administration vs. governance

The structural-vs-operational distinction:

- **Governance** is structural: rules, offices, duties, powers, charters.
  Static-ish (changes via enacting, with appropriate authority).
- **Administration** is operational: incumbencies, workitems-in-flight, services-running.
  Dynamic (changes constantly, every tick).

Same agents may participate in both: a captain governs (enacting a new rule) and administers (dispatching a workitem under the rule).
But the work-frames are distinct.

## Administration and audit

Auditing administration is reading administrative system-cells against governance-rules.
"Is this dispatch authorized?" → read the workitem-cell, the agent-cell, the agent's office, the office's powers; check the dispatching-rule.
The administration-truth is the cells; the governance-truth is the rules; auditing checks one against the other.

When administration drifts from governance (a workitem dispatched without authority; a service running outside its declared lifetime), [validation](validation.md) surfaces the drift; remediation is a governing-or-administrating-act depending on what fix is needed.

## What this concept does not specify

- The administrative-cell schemas.
  Per-cell-kind currently; uniform schema partly settled.
- Administration archival.
  As administrative cells age (workitems complete, incumbencies end), archival vs. retention discipline is partly settled.
- Cross-polity administration.
  When polities federate, administrative coordination (cross-polity dispatch, cross-polity service liveness) routes through bridge channels and consensus; partly settled.
