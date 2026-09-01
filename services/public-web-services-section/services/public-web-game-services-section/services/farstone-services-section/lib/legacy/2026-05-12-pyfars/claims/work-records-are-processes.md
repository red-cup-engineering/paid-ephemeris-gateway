---
type: claim
status: draft
depends-on: [work-record, workitem, process, work-status, scheduling-policy, capability-table, work-queue, assignment-cell, dispatch-closure-rule-system, heartbeat]
---

# Process workitems are processes

**Claim.** PyFARS work-records of `kind: process` (process-subtype [workitems](../concepts/workitem.md)) are structurally analogous to processes in a classical operating system.
Their substrate frontmatter is the analog of a process control block; their `work-status` is the analog of process state; the [work-queue](../objects/work-queue.md) is the run queue; the [capability-table](../concepts/capability-table.md) is the capability table; [dispatch](../concepts/dispatch.md) is the scheduler; the [heartbeat](../concepts/heartbeat.md) tick is the scheduler invocation; an [assignment cell](../objects/assignment-cell.md) is a process-to-CPU binding; the [dispatch-closure-rule-system](../objects/dispatch-closure-rule-system.md) is the scheduling policy.
The structural correspondence is load-bearing for process-subtype workitems — it constrains what kind of system PyFARS-as-OS is, what trade-offs apply, and what existing OS theory transfers.

This is *not* a metaphor used for explanatory ease.
It is a structural claim about PyFARS's architecture for process-subtype work specifically.
Other workitem subtypes ([procedure](../concepts/procedure.md), [derivation](../concepts/derivation.md), [inquiry](../concepts/inquiry.md)) have different analogs:

- Procedures ≈ scripted batch jobs / system calls (atomic, deterministic).
- Derivations ≈ build-system actions (input-dependent theory production).
- Inquiries ≈ exploratory debugging sessions (open-ended investigation).

The OS-analogy applies *cleanly* to processes; for other subtypes, the structural correspondence is partial and the OS-analog should be invoked with care.

## Statement

For PyFARS realizing FARS theory, the work-orchestration surface satisfies a structure-preserving correspondence with classical OS process scheduling, formalized as a mapping $\mu$ between PyFARS objects and OS objects:

$$\mu \colon \text{PyFARS-work-objects} \;\longrightarrow\; \text{OS-process-objects}$$

with: - $\mu(\text{work-record}) = \text{process}$ - $\mu(\text{work-record's frontmatter}) = \text{process control block}$ - $\mu(\text{work-status}) = \text{process state}$ - $\mu(\text{work-queue}) = \text{run queue}$ - $\mu(\text{capability-table}) = \text{capability table}$ - $\mu(\text{dispatch}) = \text{scheduler}$ - $\mu(\text{heartbeat}) = \text{scheduler tick}$ - $\mu(\text{dispatch-closure-rule-system}) = \text{scheduling policy}$ - $\mu(\text{assignment-cell}) = \text{process-to-CPU binding}$

The mapping is structure-preserving in the sense that scheduling-relevant properties (eligibility, priority, fairness, starvation, blocking, capacity) carry over from OS theory to PyFARS work-orchestration with their classical structure intact, modulo PyFARS-specific particulars (timescales, durability, witnessing).

## Sketch

The proof is by structural construction.
For each correspondence:

### Process / work-record

A process is an entity with: identity (PID), state (running/waiting/etc.), capability requirements (which syscalls it can make), resource needs (memory, file descriptors), priority, and a lifecycle from fork to exit.
A work record has: identity (slug), state (work-status), capability requirements (`requires-skills:`, `requires-capabilities:`, `requires-jurisdiction:`), resource needs (`requires-budget:`, etc.), priority (`priority:`), and a lifecycle from creation to settled.
Each correspondence is direct.

### Run queue / work-queue

A run queue is the set of ready processes; ordered by scheduling policy; consumed by the scheduler each tick.
The work-queue is the set of work-records with `status: ready`; ordered by polity policy; consumed by dispatch each heartbeat tick.
Direct correspondence.

### Capability table / capability-table

An OS capability table maps subjects (processes) to permitted actions (syscalls + arguments).
The capability-table maps subjects (offices, principals) to permitted actions (skills, powers, jurisdictions).
Both are read by the scheduler/dispatcher to determine eligibility.
Direct correspondence.

### Scheduler / dispatch

An OS scheduler picks the next process to run from the run queue based on policy.
PyFARS dispatch picks which office/agent to assign each ready work record based on the polity's scheduling policy.
Direct correspondence.

### Scheduling policy / dispatch-closure-rule-system

A scheduling policy is the algorithm/parameters that determine scheduler decisions.
PyFARS's dispatch closure-rule-system is the substrate-declared rules that determine dispatch decisions.
Both are *the policy by which scheduling decisions are made*; they differ in form (algorithm vs. closure rules) but in role they coincide.

[Gap: the structural correspondence is *not* an isomorphism.
PyFARS work timescales are seconds-to-weeks, not microseconds.
PyFARS dispatch involves authority chains and witness discipline that classical OS scheduling does not.
The correspondence is at the level of structural roles and trade-offs, not at the level of every operational detail.]

## Discussion

### What this claim does

It transfers OS theory to PyFARS work-orchestration with a clear correspondence.
Specifically:

- **Trade-offs apply.** Classical scheduler trade-offs — throughput vs. latency, fairness vs. priority, work-conservation vs. priority-inversion — apply structurally.
  A polity choosing a scheduling policy can reason about its policy in OS terms (this is round-robin-like; this is priority-based with starvation prevention; this risks priority inversion).
- **Architectures transfer.** The OS analog suggests architectural patterns: separating mechanism from policy (dispatch is mechanism, the rule-system is policy), keeping schedulers fast (heartbeat ticks are bounded), making capability-checks cheap (capability-table cached and read-mostly), surfacing blocking explicitly (status: blocked is first-class).
- **Vocabulary transfers.** When the captain says "this work is starving" or "we have a priority inversion" or "this office is over-allocated," the OS-shaped vocabulary is precise.

### What this claim does not say

- It does not say PyFARS-as-OS is identical to a classical OS.
  Many features of classical OS scheduling (preemption, time slicing at microsecond granularity, hardware interrupts) don't apply or apply differently.
  Work isn't preempted mid-execution; it's reassigned only via explicit re-dispatch.
- It does not say all OS scheduling theory transfers verbatim.
  Some things (real-time scheduling guarantees, multi-CPU cache locality) have no PyFARS analog.
  The correspondence is structural, not exhaustive.
- It does not say work records *are* processes in any literal sense.
  They're not Linux processes.
  They're substrate entities playing the role processes play.

### What would have to change for this claim to fail

- If PyFARS work-orchestration adopted a fundamentally different paradigm (event-driven dataflow, actor model, declarative-only without explicit dispatch, etc.), the OS analogy would weaken or break.
  The realization is currently scheduler-shaped; a radical re-architecture would invalidate.
- If the run queue / capability-table / scheduler structure were dissolved (e.g., dispatch became fully decentralized with peer-to-peer assignment), the analog would no longer hold.
- If work-records lost their first-class identity (became ephemeral artifacts derivable from logs), the process-as-entity analog would weaken.

These are not on the roadmap; the realization is committing to the OS-shape.

## Connection to upstream

The claim is PyFARS's structural commitment about how it realizes upstream [predicated-work](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/).
Upstream predicated-work has dispatch, capability-matching, work-stream classification, and other concepts; PyFARS's specific *realization* of these is process-shaped.
Other realizations of FARS could choose different shapes (event-driven, actor-model); PyFARS picks the OS-shape because it suits the polity-as-running-substrate framing the captain has chosen.
