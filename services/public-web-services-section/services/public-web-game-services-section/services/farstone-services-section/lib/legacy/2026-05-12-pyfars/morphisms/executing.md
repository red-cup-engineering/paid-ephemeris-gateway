---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, assignment-cell, witness, principal]
realizes: [predicated-work]
---

# Execute

The morphism by which an assigned [work-record](../concepts/work-record.md) is performed — the actor named in the [assignment-cell](../objects/assignment-cell.md) does the substantive work.
The fourth spoke of the work cycle.

Execute is structurally distinctive: it is the spoke where the polity's system is *changed by external action*.
Other spokes are closure-driven (they read substrate and produce system cells via rules); execute brings cells from outside (the actor's actual world — running code, observed events, decisions made by humans, computations performed by agents).

## Action

For an assigned work-record $W$ and its assignee $A$:

$$\mathrm{execute}(W, A) \;\longrightarrow\; \text{Witnesses}(W, A)$$

The actor $A$ performs the work; one or more witnesses are produced recording what happened.
The witnesses' cells modify the system to reflect the work's effects.

The morphism's signature is *partial*: it doesn't always succeed.
Possible outcomes: - **Settled**: the work's settling-cell reaches $\mathbf{t}$; the work is complete; status transitions to `settled`. - **Blocked**: the actor encounters a blocker mid-execution; status transitions to `blocked`; a blocker-cell is witnessed. - **Failed**: the actor cannot complete; status transitions to `failed`; a failure-cell is witnessed with a description. - **Partially completed**: some but not all of the work's cells are produced; the work-record may be re-readied for additional execution, or decomposed further by a re-plan.

## Composition

Execute composes after dispatch-decision and before witness-completion:

$$\mathrm{dispatch\text{-}decision} \to \mathrm{execute} \to \mathrm{witness\text{-}completion}$$

The boundary between execute and witness-completion is partly artificial: every act of executing produces witnesses.
But conceptually distinguishing them helps: execute is *what the actor does*; witness-completion is *the act of recording the work as done* (which closes the loop on the assignment).

## What this morphism commits to

1. **Substrate-purity preserved across execution**: per [`substrate-purity`](../claims/substrate-purity.md), every system-effect of execution is captured by witnesses.
  Executions producing un-witnessed system effects are violations.
2. **Authority bounded**: the actor's actions during execute are bounded by the authority chain that admitted the assignment.
  An actor cannot expand its own authority via execute; expansion requires a separate witness through governance.
3. **Idempotency where applicable**: many executions are idempotent (re-running produces the same witnesses).
  Where not idempotent (an execution that consumes external resources, sends external messages), the witness explicitly notes the side-effect.

## What this morphism does not do

- It does not select among multiple ways to execute a work-record.
  The actor's discretion in *how* to perform the work is up to the actor; the morphism captures the act, not the deliberation.
- It does not validate the work's correctness.
  Whether the work was done well, met its goal, etc. is a review concern.
- It does not run autonomously by default.
  An assignment cell does not magically cause execution — the assigned actor must take action.
  The heartbeat may *prompt* execution by re-dispatching or notifying, but execution is the actor's act.

## Implementation pointer

The current `execute.py` work spoke implements parts of this.
More importantly, much of execution happens *outside pyfars-the-package* — in agent runtimes (Claude Code sessions, OpenClaw sessions, MCP clients), in human action (the captain reading and editing notes), in external code being run.
PyFARS captures the witnesses these external actors produce; the *execution itself* happens in the actors.

## Open structural questions

- The boundary with external systems.
  When an agent in Claude Code performs a multi-step task, are individual steps witnessed, or is only the overall completion witnessed?
  The granularity is partly polity-policy.
- Synchronous vs. asynchronous execution.
  Some executions complete within a heartbeat tick (cheap closure-derivable work); others span many ticks (a multi-day research task).
  The discipline for tracking long-running execution is partly settled.
- Execution-trace fidelity.
  For audit, how much detail of execution should be witnessed?
  Every keystroke is too much; only the final completion is too little.
  Polity-policy.
