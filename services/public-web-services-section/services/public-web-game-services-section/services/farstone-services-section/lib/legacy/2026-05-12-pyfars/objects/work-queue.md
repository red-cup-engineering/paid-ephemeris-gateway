---
type: definition
class: system-derived-set
status: draft
depends-on: [work-record, work-status, dispatch-closure-rule-system, settling]
---

# Work queue

The substrate-derived set of [work records](../concepts/work-record.md) that are currently `status: ready` — eligible for dispatch on the next [heartbeat](../concepts/heartbeat.md) tick.
Realizes the OS notion of *run queue* in PyFARS-as-OS terms: the run queue is the set of processes ready for the scheduler.

The work queue is *derived*, not independently stored.
It is a view of all work records whose status closure has produced `status: ready` cells.
Implementation may materialize the queue for performance, but the system is the source of truth.

## Data

The work queue $Q$ at time $\tau$ is

$$Q(\tau) \;=\; \{\, W \in \text{WorkRecords}(\tau) \;|\; (W, \text{status}, \text{ready}) = \mathbf{t} \,\}$$

— the set of work records whose `status: ready` cell is at $\mathbf{t}$ in the substrate at time $\tau$.

The queue may be *ordered* by polity-defined preference rules (priority cells, age, dependency chain depth, etc.).
The order is a property of the queue's projection at dispatch time, not of the queue itself; reordering does not require system changes, only re-projection.

## Properties

The queue is:

1. **Open-ended in size**.
  A polity may have one ready work record or thousands.
  The queue is unbounded in principle, bounded in practice by polity size and dispatch throughput.
2. **Snapshot-consistent**.
  Reading the queue at time $\tau$ produces the set of cells that are at $\mathbf{t}$ at $\tau$; cells that change after $\tau$ don't retroactively enter or leave.
3. **Strictly read-only via projection**.
  Adding a record to the queue means producing the `(W, status, ready)` cell via a system transition (typically by closure firing on blocker-completion).
  Removing a record means producing `(W, status, X)` for X ≠ ready (typically `assigned`, `blocked`, `abandoned`).
4. **Partitionable by capability**.
  For dispatch, the queue is often projected through the [capability-table](../concepts/capability-table.md) to produce sub-queues per office: "the work eligible for office X."
  These sub-queues are derived projections of the main queue.

## Construction

Per the [dispatch-closure-rule-system](dispatch-closure-rule-system.md), the queue's contents are produced by:

- Ready-promotion rules: a work record whose blockers have settled and whose requirements are specified gets `status: ready`.
- Externally-settling intents: an intent classified as a task and made ready in the same tick.
- Re-readying after un-blocking: a previously-blocked record whose blocker has settled.

The queue's *order* is produced by:

- Priority cells on individual records (`priority: high|normal|low` or numerical).
- Age (older records preferred to prevent starvation).
- Polity-declared preference rules in the dispatch closure-rule-system.

## OS analogy made explicit

| OS run queue concept | Work-queue analog |
|---|---|
| Run queue | This object |
| Process in ready state | Work record with `status: ready` |
| Add to run queue | Substrate transition producing `status: ready` |
| Remove from run queue | Substrate transition out of `ready` (to `assigned`, `blocked`, etc.) |
| Run queue priority | Priority cells; age weighting per polity policy |
| Multi-level feedback queue | Polity-extension where work records carry `queue-tier:` cells; dispatch reads tier |

## What this object does not yet specify

- The performance discipline.
  A polity with thousands of ready records must read the queue efficiently; the in-memory cache and invalidation discipline is implementation-side.
- Per-domain sub-queues.
  Some polities will want per-domain queues (engineering work in one queue, science work in another); whether to model these as projections of the main queue or as independent objects is a design question.
- Starvation prevention.
  Without explicit rules, a low-priority record could remain in the queue indefinitely while higher-priority records keep arriving.
  The discipline for fairness is partly upstream (dispatch-monotonicity) and partly polity-policy.
- Empty-queue semantics.
  When the queue is empty, the heartbeat tick has nothing to dispatch; whether the heartbeat sleeps, or scans for newly-ready work eagerly, is a polity-config matter.
